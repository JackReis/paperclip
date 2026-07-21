/**
 * ContextForge Webhook Client
 *
 * Handles outbound HTTP POST requests to the ContextForge webhook listener
 * with at-least-once delivery semantics and exponential backoff retry.
 */

export interface ContextForgeEventPayload {
  companyId: string;
  entityId: string;
  entityType: string;
  action: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  attempt: number;
  statusCode?: number;
  error?: string;
}

export class ContextForgeWebhookClient {
  private webhookUrl: string;
  private maxRetries: number;
  private retryBaseDelayMs: number;
  private requestTimeoutMs: number;
  private fetchImpl: typeof fetch;

  constructor(
    webhookUrl: string,
    options?: {
      maxRetries?: number;
      retryBaseDelayMs?: number;
      requestTimeoutMs?: number;
      fetchImpl?: typeof fetch;
    },
  ) {
    this.webhookUrl = webhookUrl;
    this.maxRetries = options?.maxRetries ?? 3;
    this.retryBaseDelayMs = options?.retryBaseDelayMs ?? 1000;
    this.requestTimeoutMs = options?.requestTimeoutMs ?? 10000;
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  /**
   * Deliver an event to the ContextForge webhook with retry.
   * At-least-once delivery: if all retries fail, the error is logged but not thrown
   * to prevent event bus poisoning. The next event will retry.
   */
  async deliver(payload: ContextForgeEventPayload): Promise<WebhookDeliveryResult> {
    let lastError: string | undefined;
    let lastStatusCode: number | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        const response = await this.fetchImpl(this.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ContextForge-Source": "paperclip-plugin",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          return { success: true, attempt, statusCode: response.status };
        }

        // 4xx errors (except 429) are not retried — they indicate a permanent issue
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return {
            success: false,
            attempt,
            statusCode: response.status,
            error: `Client error: ${response.status} ${response.statusText}`,
          };
        }

        lastStatusCode = response.status;
        lastError = `HTTP ${response.status} ${response.statusText}`;
      } catch (err) {
        lastError = (err as Error).message;
      }

      // Exponential backoff: base * 2^(attempt-1)
      if (attempt < this.maxRetries) {
        const delay = this.retryBaseDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      attempt: this.maxRetries,
      statusCode: lastStatusCode,
      error: lastError ?? "Unknown error",
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}