/**
 * Event mapping: Paperclip PluginEvent → ContextForge webhook payload
 *
 * Maps each subscribed domain event type to a ContextForge-compatible payload
 * with standardized metadata fields.
 */

import type { PluginEvent } from "@paperclipai/plugin-sdk";
import type { ContextForgeEventPayload } from "./webhook-client.js";

/**
 * The set of event types this plugin subscribes to.
 */
export const SUBSCRIBED_EVENTS = [
  "routine.created",
  "routine.updated",
  "routine_run.started",
  "routine_run.completed",
  "goal.created",
  "goal.updated",
  "goal.status_changed",
] as const;

/**
 * Maps a PluginEvent to a ContextForge webhook payload.
 *
 * The payload includes:
 * - companyId: the company context
 * - entityId: the primary entity ID
 * - entityType: the entity type (routine, routine_run, goal)
 * - action: the event type (e.g. "routine.created")
 * - timestamp: when the event occurred
 * - details: the event payload data
 */
export function mapEventToPayload(event: PluginEvent): ContextForgeEventPayload {
  return {
    companyId: event.companyId,
    entityId: event.entityId ?? "",
    entityType: event.entityType ?? inferEntityType(event.eventType),
    action: event.eventType,
    timestamp: event.occurredAt,
    details: {
      ...(event.payload as Record<string, unknown>),
      actorId: event.actorId,
      actorType: event.actorType,
      eventId: event.eventId,
    },
  };
}

/**
 * Infers the entity type from the event type if not explicitly set.
 */
function inferEntityType(eventType: string): string {
  if (eventType.startsWith("routine_run.")) return "routine_run";
  if (eventType.startsWith("routine.")) return "routine";
  if (eventType.startsWith("goal.")) return "goal";
  return "unknown";
}