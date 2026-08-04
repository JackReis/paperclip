#!/bin/bash
set -e
api="${PAPERCLIP_API_URL%/api}"
case "$api" in */api) ;; *) api="$api/api" ;; esac

body="JAC-4139 Cycle 2026-08-04T18:00Z — Fresh Live Re-Verification

**Run:** 6e6a6a35-eff0-4ad2-9ad7-99490e0e7051 (Wings, hermes_local)
**Paperclip API:** http://127.0.0.1:3101 (v2026.722.0, deploymentMode=local_trusted)

## Acknowledged Wake
Latest wake reports run 66a4cdf5 timed out. Root cause: N+1 API calls in prior verify
script (called /issues/{id} on all 1000+ issues). Fixed verify script (_wings_verify5.py)
uses offset pagination + detail calls only for verified-lane assignments.

## Lane State (fresh live 18:00Z)
| Agent | status | lane.state | Dispatchable? | Reason |
|---|---|---|---|---|
| Herald | error (Traceback) | verified | NO | Agent error, not routable |
| Plan Runner | idle | verified | YES (capacity=2) | But own assigned TODO is coordinator planning issue |
| Aegis Coder X | idle | verified | NO | Occupied by JAC-4606 (in_progress, maxPar=1) |
| Aegis Coder Y | idle | error | NO | Lane state=error |
| Hermes Mistral | paused | paused | NO | Paused |
| Flash | error | pending_repair | NO | Not routable |
| Coordinator | idle | verified | NO | Self-reserved |
| Wings (self) | running | verified | NO | Self-reserved |

## Critical Finding: ALL 7 in_progress issues have execRunId=None
Zero active runs across the entire fleet right now. All 7 in_progress issues are orphaned
(in_progress without active execution run):
JAC-4532 (Maar), JAC-4629 (Karax), JAC-4643 (Bright), JAC-4554 (Kimi/Ringer),
JAC-4503 (Dinkelspiel), JAC-4606 (Coder X), JAC-4139 (self).

Note: JAC-4606 in_progress on Coder X consumes 1/1 maxParallel capacity even with
execRunId=None. Per contract, in_progress lease occupies the lane.

## TODO Queue: 32 issues, ALL policy-excluded
No independent plan-backed task found.

## Root Cause
1. Herald re-errored (adapter-init Traceback) — same class as JAC-4580/JAC-4577
2. NOUS_API_KEY fix (JAC-4604) is done, but Herald continues erroring — residual
   hermes_local config drift (JAC-4577, blocked, assigned to Pi)
3. No dispatchable lane + no eligible independent work = queue genuinely exhausted

## Dispatches: 0 — Queue Exhausted (confirmed fresh live at 18:00Z)

## Disposition: in_progress (restart-ready)
Awaiting: (1) Herald re-recovery (JAC-4577/JAC-4580), (2) JAC-4606 completion (frees Coder X),
(3) JAC-3628 completion (frees Plan Runner slot). Native child-completion continuation
remains the liveness path.

Evidence: doc/plans/2026-08-04T1800Z-wings-dispatch-evidence-jac-4139.md"

# Bearerless approach: use X-Paperclip-Run-Id header (local_trusted defaults to local-board actor)
# The issue contract says: bearerless PATCH to /api/companies/{co}/issues/{id} with
# X-Paperclip-Run-Id header works under deploymentMode=local_trusted

jq -n --arg body "$body" '{"body":$body}' | \
  curl -sS -X POST "$api/issues/6fdb3b88-6786-4a4c-a2be-883d92acc155/comments" \
    -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
    -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
    -H "Content-Type: application/json" \
    --data-binary @-

echo ""
echo "---"
echo "Comment posted"