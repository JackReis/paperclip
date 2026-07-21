/**
 * Worker lifecycle for the ContextForge Routine/Goal Event Sync plugin.
 *
 * Subscribes to Routine and Goal domain events via the Paperclip plugin event bus
 * and forwards them as POST requests to a ContextForge webhook listener.
 *
 * Architecture: JAC-3473 §7 — Plugin event bus → ContextForge webhook
 * Parent: JAC-3488 — ContextForge state tracking for Routine/Goal lifecycle
 *
 * Features:
 * - At-least-once delivery with exponential backoff retry
 * - Configurable webhook URL (plugin config or CONTEXTFORGE_WEBHOOK_URL env var)
 * - Configurable retry count, base delay, and request timeout
 * - Activity logging for delivery audit trail
 * - Plugin state tracks last successful delivery and failure count
 */

import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import type { PluginEvent, PluginContext } from "@paperclipai/plugin-sdk";
import { ContextForgeWebhookClient } from "./webhook-client.js";
import { SUBSCRIBED_EVENTS, mapEventToPayload } from "./event-mapping.js";
import manifest from "./manifest.js";

const SYNC_STATE_KEY = "contextforge-sync-state";
const SYNC_STATE_SCOPE = "instance";

const DEFAULT_WEBHOOK_URL = "http://127.0.0.1:8090";

interface PluginConfig {
  webhookUrl?: string;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  requestTimeoutMs?: number;
}

interface SyncState {
  lastSuccessfulDeliveryAt: string | null;
  lastFailedDeliveryAt: string | null;
  totalDelivered: number;
  totalFailed: number;
  consecutiveFailures: number;
  lastError: string | null;
}

function emptySyncState(): SyncState {
  return {
    lastSuccessfulDeliveryAt: null,
    lastFailedDeliveryAt: null,
    totalDelivered: 0,
    totalFailed: 0,
    consecutiveFailures: 0,
    lastError: null,
  };
}

/**
 * Resolve the webhook URL from plugin config or CONTEXTFORGE_WEBHOOK_URL env var.
 */
function resolveWebhookUrl(config: PluginConfig | null): string {
  // Plugin config takes priority, then env var, then default
  if (config?.webhookUrl) return config.webhookUrl;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (globalThis as any).process?.env;
  if (env?.CONTEXTFORGE_WEBHOOK_URL) return env.CONTEXTFORGE_WEBHOOK_URL as string;
  return DEFAULT_WEBHOOK_URL;
}

/**
 * Create a webhook client from config.
 */
function createWebhookClient(config: PluginConfig | null): ContextForgeWebhookClient {
  const webhookUrl = resolveWebhookUrl(config);
  return new ContextForgeWebhookClient(webhookUrl, {
    maxRetries: config?.maxRetries,
    retryBaseDelayMs: config?.retryBaseDelayMs,
    requestTimeoutMs: config?.requestTimeoutMs,
  });
}

/**
 * Load sync state from plugin state store.
 */
async function loadSyncState(ctx: PluginContext): Promise<SyncState> {
  const raw = await ctx.state.get({
    scopeKind: SYNC_STATE_SCOPE as "instance",
    stateKey: SYNC_STATE_KEY,
  });
  if (raw && typeof raw === "object") {
    return { ...emptySyncState(), ...(raw as SyncState) };
  }
  return emptySyncState();
}

/**
 * Persist sync state to plugin state store.
 */
async function saveSyncState(ctx: PluginContext, state: SyncState): Promise<void> {
  await ctx.state.set(
    {
      scopeKind: SYNC_STATE_SCOPE as "instance",
      stateKey: SYNC_STATE_KEY,
    },
    state,
  );
}

/**
 * Log a sync event for audit trail.
 */
async function logSyncEvent(
  ctx: PluginContext,
  summary: string,
  companyId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  ctx.logger.info(`[contextforge-sync] ${summary}`, details ?? {});
  await ctx.activity.log({
    companyId,
    message: summary,
    metadata: details,
  });
}

/**
 * Handle a single domain event: map to payload, deliver to webhook, update state.
 */
async function handleEvent(ctx: PluginContext, event: PluginEvent): Promise<void> {
  const config = (await ctx.config.get()) as PluginConfig | null;
  const client = createWebhookClient(config);

  const payload = mapEventToPayload(event);

  ctx.logger.info(`ContextForge sync: forwarding event ${event.eventType}`, {
    eventId: event.eventId,
    entityType: payload.entityType,
    entityId: payload.entityId,
  });

  const result = await client.deliver(payload);
  const state = await loadSyncState(ctx);

  if (result.success) {
    state.lastSuccessfulDeliveryAt = new Date().toISOString();
    state.totalDelivered += 1;
    state.consecutiveFailures = 0;
    state.lastError = null;
    await saveSyncState(ctx, state);
    await logSyncEvent(ctx, `Event ${event.eventType} → ContextForge delivered (attempt ${result.attempt}, HTTP ${result.statusCode})`, event.companyId, {
      eventId: event.eventId,
      eventType: event.eventType,
      entityId: payload.entityId,
      attempt: result.attempt,
      statusCode: result.statusCode,
    });
  } else {
    state.lastFailedDeliveryAt = new Date().toISOString();
    state.totalFailed += 1;
    state.consecutiveFailures += 1;
    state.lastError = result.error ?? "Unknown error";
    await saveSyncState(ctx, state);
    ctx.logger.error(`ContextForge sync: failed to deliver event ${event.eventType} after ${result.attempt} attempts`, {
      eventId: event.eventId,
      error: result.error,
      statusCode: result.statusCode,
    });
    await logSyncEvent(ctx, `Event ${event.eventType} → ContextForge delivery FAILED (attempt ${result.attempt}: ${result.error})`, event.companyId, {
      eventId: event.eventId,
      eventType: event.eventType,
      entityId: payload.entityId,
      attempt: result.attempt,
      statusCode: result.statusCode,
      error: result.error,
    });
  }
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("ContextForge Routine/Goal Event Sync plugin starting up");

    // Subscribe to all relevant domain events
    for (const eventType of SUBSCRIBED_EVENTS) {
      ctx.events.on(eventType, async (event: PluginEvent) => {
        try {
          await handleEvent(ctx, event);
        } catch (err) {
          ctx.logger.error(`ContextForge sync: unhandled error in event handler for ${eventType}`, {
            eventId: event.eventId,
            error: (err as Error).message,
          });
        }
      });
    }

    ctx.logger.info(`ContextForge sync: subscribed to ${SUBSCRIBED_EVENTS.length} event types`, {
      events: [...SUBSCRIBED_EVENTS],
    });
  },

  async onHealth() {
    return {
      status: "ok" as const,
      message: "ContextForge Routine/Goal Event Sync plugin ready",
      details: {
        manifestId: manifest.id,
        version: manifest.version,
        subscribedEvents: [...SUBSCRIBED_EVENTS],
      },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);