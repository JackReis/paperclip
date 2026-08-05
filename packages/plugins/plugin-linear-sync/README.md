# @paperclipai/plugin-linear-sync

**Linear Read-Only Project Map Plugin for Paperclip**

Projects Paperclip Goals, Projects, and Labels onto Linear as a read-only project map. No write-back from Linear to Paperclip.

## Architecture

Per JAC-3473 §5 (Paperclip Routines/Goals Unification Architecture):

- **Paperclip Project → Linear Project** — direct name mapping with Paperclip UUID in description
- **Paperclip Goal → Linear Label** — goal level (company/project/task) encoded in label name (`goal:{level}:{title}`)
- **Goal status → Label color** — planned=gray, active=blue, achieved=green
- **One-way push** — Paperclip to Linear only, no write-back
- **Event-driven** with 15-minute batch reconciliation

## Configuration

```json
{
  "linearApiTokenRef": "linear-api-token",
  "linearTeamId": "team-uuid-from-linear",
  "syncIntervalMinutes": 15
}
```

Store the Linear API token as a Paperclip company secret and reference it by name in `linearApiTokenRef`.

## Events

Subscribes to:
- `goal.created` — sync new goal to Linear label
- `goal.updated` — update Linear label (status/color change)
- `project.created` — sync new project to Linear project
- `project.updated` — update Linear project

## Jobs

- `full-reconcile` — runs every 15 minutes, syncs all goals and projects

## Rate Limiting

Handles Linear API rate limits (429) and server errors (5xx) with exponential backoff:
- Base delay: 2^attempt seconds (max 30s)
- Jitter: 0-500ms
- Max retries: 5

## Audit Trail

All sync events are logged via Paperclip activity log (`activity.log.write` capability). Each log entry includes:
- Entity IDs (Paperclip + Linear)
- Whether entity was created or updated
- Error details on failure