## Aldaris infrastructure verification — 2026-08-04T16:05Z

Live verification of the fleet-wide hermes_local empty-adapterConfig incident (JAC-4575). Checking the question JAC-4577 poses: "are remaining errored agents live failures or stale breadcrumbs?"

### Current fleet state (live API readback)

**GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents** at 2026-08-04T16:02Z (Paperclip v2026.722.0):

- Total agents: 83
- Status breakdown: idle=51, running=30, paused=2, **errored=0**
- hermes_local agents: 75, **errored=0**
- Stale errorReason (status != error): 3 agents

### The 3 stale-errorReason agents are STALE BREADCRUMBS, not live failures

All 3 have `orgChainHealth.status = "healthy"` with no invalid ancestors:

1. **Pi Campaign Auditor** (idle, hermes_local, adapterConfig={})
   - errorReason: "Traceback (most recent call last):" (stale, 34-char truncation)
   - lastHeartbeatAt: 2026-08-04T14:54:13Z
   - updatedAt: 2026-08-04T15:04:27Z
   - orgChainHealth: healthy

2. **Dinkelspiel** (running, hermes_local, adapterConfig={})
   - errorReason: "Traceback (most recent call last):" (stale, 34-char truncation)
   - lastHeartbeatAt: 2026-08-04T14:38:14Z
   - updatedAt: 2026-08-04T15:20:46Z
   - orgChainHealth: healthy

3. **Maar** (idle, hermes_local, adapterConfig={})
   - errorReason: "Traceback (most recent call last):" (stale, 34-char truncation)
   - lastHeartbeatAt: 2026-08-04T14:38:14Z
   - updatedAt: 2026-08-04T15:03:26Z
   - orgChainHealth: healthy

### Root cause analysis

The DEFAULT_MODEL fix (commit 2f5ff6345, deployed in running npm server v2026.722.0) changes DEFAULT_MODEL from "auto" to "ollama-launch/qwen3-coder:30b". Confirmed deployed at the running server:

```
grep DEFAULT_MODEL ~/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/shared/constants.js
```
Result: `export const DEFAULT_MODEL = "ollama-launch/qwen3-coder:30b"`

With the fix deployed, agents were pause/resume-cycled (per JAC-4605 verification) and all 75 hermes_local agents cleared their error state (0 errored). However, 3 agents have stale errorReason strings that were not cleared during the cycle — these are breadcrumbs from the pre-fix era, not current failures.

### Disposition

**Verdict: All 3 remaining stale-errorReason agents are stale breadcrumbs, not live failures.** They are operational (idle/running), have healthy org chains, and have recent heartbeats. No runtime repair is needed for these agents.

**Recommended action**: Clear the stale errorReason field on these 3 agents via bearerless PATCH (board-admin context) so the fleet dashboard shows clean state. This is a cosmetic cleanup only.

**Smallest safe remediation**: No runtime change needed. The DEFAULT_MODEL fix + agent cycling fully resolved the incident. JAC-4577 can be marked done with this evidence.