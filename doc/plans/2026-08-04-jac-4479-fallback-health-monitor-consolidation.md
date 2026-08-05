# JAC-4479 — Consolidate fallback-health-monitor collector: single live target + provider calibration

Completed: 2026-08-04T14:15Z

## Summary

Wiring/calibration fixes to the existing `fallback-health-monitor.py` cron job
(runs every 15 min, job id `eb22f88d765a`). No monitor rebuild.

## D1 — Single live collector + repoint

**Problem:** Two duplicate collector issues existed:
- `JAC-3955` (id `496c08e5-3c2b-4560-b58f-56e1553603f0`, `done`) — duplicate
- `JAC-3956` (id `18d3e70f-6b62-4876-9fbc-6027c41444b8`, `done`) — held history but was `done`

The env var `PAPERCLIP_HEALTH_ALERT_ISSUE=18d3e70f-6b62-4876-9fbc-6027c41444b8`
pointed to JAC-3956, which was `done` — future RECOVERED/WARNING/CRITICAL
alerts would land on a closed, unwatched issue.

**Action taken:**
1. Reopened `JAC-3956` from `done` → `todo` (designated as the single live collector)
2. Confirmed `PAPERCLIP_HEALTH_ALERT_ISSUE` in `~/.hermes/profiles/aegis/.env`
   already points to `18d3e70f-6b62-4876-9fbc-6027c41444b8` (JAC-3956) — no change needed
3. Updated JAC-3956 description to reflect trimmed provider set
4. Posted comment to JAC-3956 documenting the consolidation

JAC-3955 remains `done` (closed as duplicate). No duplicate collector exists.

## D2 — Calibrate provider set

**Problem:** Four providers (`openai`, `gemini`, `mistral`, `openai-codex`) had
been sitting CRITICAL for 237–454 consecutive checks (~52h) with
`last_healthy: null` — they had never authenticated on Aegis. The host holds
working creds only for `ollama-cloud`, `ollama-launch`, and `openrouter`.

**Action taken:**
1. Removed `openai`, `gemini`, `mistral`, and `openai-codex` from the
   `PROVIDERS` list in `fallback-health-monitor.py`
2. Added a calibration comment explaining the exclusion and how to re-add
   providers (configure the key in `.env` + add a PROVIDERS tuple)
3. Reset `fallback-health-state.json` to clear stale failure counts for
   the removed providers (237–454 consecutive failures each)
4. Updated the module docstring to list only the 3 active providers

**Note on .env keys:** The `.env` still contains `OPENAI_API_KEY`,
`GOOGLE_API_KEY`, and `MISTRAL_API_KEY` entries. These are retained because
other Hermes profiles and agents on the host may use them directly (outside
this monitor). `CODEX_API_KEY` was never present in `.env`. The monitor
itself no longer probes these providers.

## Verification

```
Fallback Health Monitor — 2026-08-04T14:15:48Z
Provider         Status           Fail#  Latency  Alerted
------------------------------------------------------------
ollama-cloud     healthy              0                 -
ollama-launch    healthy              0                 -
openrouter       healthy              0                 -

No alerts — all providers within thresholds.
```

- Monitor script: `fallback-health-monitor.py` — 3 providers, all healthy
- State file: `fallback-health-state.json` — 3 providers, all `healthy`
- Alert target: JAC-3956 (id `18d3e70f-6b62-4876-9fbc-6027c41444b8`), status `todo`
- Cron job: `eb22f88d765a`, schedule `*/15 * * * *`, `last_status: ok`, `last_run_at: 2026-08-04T14:12:02Z`

## Files modified

- `~/.hermes/profiles/aegis/scripts/fallback-health-monitor.py` — trimmed PROVIDERS to 3 working providers
- `~/.hermes/profiles/aegis/cron/fallback-health-state.json` — reset to clear stale CRITICAL entries
- Paperclip issue `JAC-3956` (id `18d3e70f-6b62-4876-9fbc-6027c41444b8`) — reopened from `done` → `todo`, description updated, comment posted
