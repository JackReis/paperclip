# @paperclipai/plugin-contextforge-sync

Forwards Paperclip Routine and Goal domain events to a ContextForge webhook listener for state tracking and lifecycle synchronization.

## Architecture

- **Parent:** JAC-3488 — ContextForge state tracking for Routine/Goal lifecycle
- **Architecture:** JAC-3473 §7

This plugin subscribes to the following Paperclip plugin event bus events:

| Event Type | Trigger |
|---|---|
| `routine.created` | A routine is created |
| `routine.updated` | A routine is updated |
| `routine_run.started` | A routine run is triggered |
| `routine_run.completed` | A routine run completes (success or failure) |
| `goal.created` | A goal is created |
| `goal.updated` | A goal is updated |
| `goal.status_changed` | A goal transitions between statuses |

Each event is mapped to a standardized POST payload:

```json
{
  "companyId": "uuid",
  "entityId": "uuid",
  "entityType": "routine|routine_run|goal",
  "action": "routine.created",
  "timestamp": "2026-07-15T00:00:00.000Z",
  "details": { ...eventPayload, actorId, actorType, eventId }
}
```

## Delivery Semantics

- **At-least-once delivery** with exponential backoff retry
- Configurable max retries (default: 3)
- 4xx errors (except 429) are not retried (permanent client errors)
- 5xx errors and 429 (rate limit) are retried
- Network failures are retried
- Plugin state tracks delivery statistics (total delivered, total failed, consecutive failures)

## Configuration

| Property | Env Var | Default | Description |
|---|---|---|---|
| `webhookUrl` | `CONTEXTFORGE_WEBHOOK_URL` | `http://127.0.0.1:8090` | ContextForge webhook endpoint |
| `maxRetries` | — | `3` | Max delivery retry attempts |
| `retryBaseDelayMs` | — | `1000` | Base delay for exponential backoff |
| `requestTimeoutMs` | — | `10000` | HTTP request timeout |

## Dependencies

- Requires JAC-3512 (ContextForge webhook listener) to be available to receive events

## Installation

```bash
# Install via Paperclip plugin manager
paperclip plugins install @paperclipai/plugin-contextforge-sync
```

## Development

```bash
pnpm install
pnpm --filter @paperclipai/plugin-contextforge-sync typecheck
pnpm --filter @paperclipai/plugin-contextforge-sync build
```