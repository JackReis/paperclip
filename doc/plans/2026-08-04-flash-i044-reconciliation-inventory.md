# Flash Executor — Agentic OS Bootstrap Shell & July 14 Ringer Worktrees Reconciliation (hermes-i044)

## Bead Reference
- Bead ID: hermes-i044
- Title: Reconcile Agentic OS bootstrap shell and July 14 Ringer worktrees
- Status: open (priority 1)
- Owner: jackareis@gmail.com

## Acceptance Criteria (from bead)
1. Bootstrap shell content is migrated or explicitly archived with provenance.
2. Integration/provider/judge worktree artifacts are bundled or committed to preservation refs.
3. Aegis dirty Ringer and Agentic OS checkouts are not overwritten.
4. Route /clicky work remains a separate claimed change.
5. Final prune list requires explicit approval.

## Key Constraints
- Do NOT rename Agentic OS repo to "Command Centre"
- Keep the in-flight Clicky route rename separate
- Preserve staged/untracked artifacts
- Prove branch reachability before any prune
- Final prune list requires explicit approval (no deletions performed this cycle)

## Inventory
Inventory started at 2026-08-05T00:16:54Z

## 1. Git Remote Configuration
github	https://github.com/JackReis/agentic-os.git (fetch)
github	https://github.com/JackReis/agentic-os.git (push)
origin	/Users/hermes/git/agentic-os.git (fetch)
origin	/Users/hermes/git/agentic-os.git (push)
talaris	talaris:/Users/jack.reis/Projects/agentic-os (fetch)
talaris	talaris:/Users/jack.reis/Projects/agentic-os (push)

## 2. Current Branch & HEAD
Branch: main
HEAD: 3d5af25ad1ec8bc5af11d7727f0a455d996e8f19

## 3. Uncommitted Changes (Main agentic-os checkout)
### Staged files:

### Modified (unstaged):
M	package.json

### Untracked files:
config/integrations/gas-town.json
debug_sem.py
debug_sem2.py
debug_sem3.py
debug_sem4.py
debug_sem5.py
debug_sem6.py
debug_sem7.py
docs/paperclip/gas-town-routing.md
scripts/gas-town-route.cjs
test_pass_fds.py
tests/integrations/gas-town-route.test.cjs

## 4. Stashes (main checkout)
stash@{0}: WIP on jack-blue-cardinal-gateway-recycle-jac3674: b1283d72 feat(bulletin): add getHouseholdWeek projection + fix stale date fixtures
stash@{1}: On feature/jac-3517-contextforge-dashboard: salvage: uncommitted work from jac-3517-contextforge-dashboard
stash@{2}: WIP on feat/surface-manifest-jac3369: 2ee46ee2 feat(surfaces): JAC-3369 expose Family Bulletin status across Paperclip, Ringside, Bifrost
stash@{3}: On design/fleet-orchestration-architecture: pre-session-scratch
stash@{4}: WIP on main: 405978f fix(kg): replace 'linear-decommissioned' with 'linear-initiatives-point-at-beads' model


## 5. Worktree Inventory (all linked worktrees)

| Worktree Path | Branch | SHA |
|---|---|---|
| /Users/hermes/Projects/agentic-os                                                                                                                                      3d5af25a [main] |
| /Users/hermes/.hermes/worktrees/bn4-token-sweep-20260712                                                                                                               478cf867 [exec/bn4-token-sweep-20260712] |
| /Users/hermes/.paperclip/worktrees/JAC-4081-fable-projection                                                                                                           3735bc17 [JAC-4081-fable-projection] |
| /Users/hermes/Library/Application Support/Clicky/projects/agentic-os-fleet-slug-fix                                                                                    beb47da4 [fix/fleet-slug-audit-20260724] |
| /Users/hermes/Library/Application Support/Clicky/projects/family-bulletin-restoration                                                                                  66253b2c [feature/family-checkins-field-notes-20260722] |
| /Users/hermes/Projects/agentic-os-cloud-reconcile                                                                                                                      6e5ecfcb [jac-3525-human-review-aggregation] |
| /Users/hermes/Projects/agentic-os-jac4011                                                                                                                              2103b331 [jac-4011-gallery-repair] |
| /Users/hermes/Projects/agentic-os-jac4208                                                                                                                              32fe7b95 [JAC-4208-telemetry-privacy-redaction-fixtures] |
| /Users/hermes/Projects/agentic-os-mainline-integration                                                                                                                 72f974a5 [codex/mainline-fleet-integration-20260730] |
| /Users/hermes/Projects/agentic-os-ringer-runs                                                                                                                          c4cefeb3 [feature/hermes-9ad.8-ringer-runs-surface] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3429-backlog-collapse                                                                                       3746e23c [JAC-3429-backlog-collapse] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3439-continuously-improve-filesystem-organization                                                           71e73000 [JAC-3439-continuously-improve-filesystem-organization] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3575-beads-notes-first-ordinary-code-fix                                                                    716ce622 [JAC-3575-beads-notes-first-ordinary-code-fix] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3577-gemini-team-chat-via-herdr-telegram-bridge                                                             716ce622 [JAC-3577-gemini-team-chat-via-herdr-telegram-bridge] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3579-design-declarative-nix-packaging-for-aegis-paperclip-matching-hermes-adapter                           00ca11fd [JAC-3579-design-declarative-nix-packaging-for-aegis-paperclip-matching-hermes-adapter] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3587-review-productivity-for-jac-3577                                                                       716ce622 [JAC-3587-review-productivity-for-jac-3577] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3593-implement-working-transition-and-deadline-before-mutation-gates                                        79925e13 [JAC-3593-implement-working-transition-and-deadline-before-mutation-gates] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3594-implement-initial-modal-cleanup-and-lane-session-continuity-gates                                      64827265 [JAC-3594-implement-initial-modal-cleanup-and-lane-session-continuity-gates] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3595-implement-adjudication-limits-and-correlated-failure-receipt-gates                                     71e73000 [JAC-3595-implement-adjudication-limits-and-correlated-failure-receipt-gates] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3599-jac-3577-independent-exact-sha-ringer-review                                                           716ce622 [JAC-3599-jac-3577-independent-exact-sha-ringer-review] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3601-jac-3577-replacement-exact-sha-ringer-judge                                                            716ce622 [JAC-3601-jac-3577-replacement-exact-sha-ringer-judge] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3609-restore-luna-copilot-identity-entitlement-without-model-policy-drift                                   71e73000 [JAC-3609-restore-luna-copilot-identity-entitlement-without-model-policy-drift] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3612-luna-exact-route-read-only-smoke-v2-for-jac-3595                                                       71e73000 [JAC-3612-luna-exact-route-read-only-smoke-v2-for-jac-3595] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3644-adjudicate-and-recover-jac-3600-timeout-artifact                                                       71e73000 [JAC-3644-adjudicate-and-recover-jac-3600-timeout-artifact] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3645-luna-typist-red-green-recovery-of-jac-3600-exact-base-artifact                                         716ce622 [JAC-3645-luna-typist-red-green-recovery-of-jac-3600-exact-base-artifact] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3671-restore-talaris-anthropic-mistral-credentials                                                          68207621 [JAC-3671-restore-talaris-anthropic-mistral-credentials] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3673-autonomous-paperclip-org-routing-policy-local-first-claude-last                                        100e1f8c [JAC-3673-autonomous-paperclip-org-routing-policy-local-first-claude-last] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3675-stand-up-a-fallback-health-monitor                                                                     716ce622 [JAC-3675-stand-up-a-fallback-health-monitor] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3677-capture-fable-5-sessions-going-forward-corpus-not-persisted                                            2236a204 [JAC-3677-capture-fable-5-sessions-going-forward-corpus-not-persisted] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3678-deep-json-scrape-fable-5-design-tokens                                                                 25a27a0b [JAC-3678-deep-json-scrape-fable-5-design-tokens] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3679-build-reusable-report-kit-template                                                                     980291c6 [JAC-3679-build-reusable-report-kit-template] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3681-claude-first-migration-note                                                                            357da6d2 [JAC-3681-claude-first-migration-note] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3684-build-oai-default-openai-first-profile                                                                 71e73000 [JAC-3684-build-oai-default-openai-first-profile] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3685-build-oai-coordinator-openai-first-profile                                                             71e73000 [JAC-3685-build-oai-coordinator-openai-first-profile] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3713-nix-scoped-adoption-for-fleet-toolchain-reproducibility-aegis-talaris                                  264b7ad8 [JAC-3713-nix-scoped-adoption-for-fleet-toolchain-reproducibility-aegis-talaris] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3715-aegis-add-flake-nix-dev-shell-to-fleet-pinning-node-24                                                 71e73000 [JAC-3715-aegis-add-flake-nix-dev-shell-to-fleet-pinning-node-24] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3716-talaris-baseline-the-existing-nix-install-as-the-parity-reference                                      696dc560 [JAC-3716-talaris-baseline-the-existing-nix-install-as-the-parity-reference] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3874-jac-3577-corrected-ringer-re-run-jac-3601-false-negative-fix                                           716ce622 [JAC-3874-jac-3577-corrected-ringer-re-run-jac-3601-false-negative-fix] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3875-jac-3577-merge-jac-3645-luna-recovery-to-main-pr-ci                                                    716ce622 [JAC-3875-jac-3577-merge-jac-3645-luna-recovery-to-main-pr-ci] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3876-jac-3577-owner-preview-card-gemini-team-chat-merge-approval                                            71e73000 [JAC-3876-jac-3577-owner-preview-card-gemini-team-chat-merge-approval] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3924-unblock-liveness-incident-for-jac-3706                                                                 716ce622 [JAC-3924-unblock-liveness-incident-for-jac-3706] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3926-apply-fleet-config-review-recommendations-agy-panel-2026-07-28                                         1c72b5f0 [JAC-3926-apply-fleet-config-review-recommendations-agy-panel-2026-07-28] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3929-fleet-wide-ai-token-run-observatory-reconciled-initiative-and-approval-gate                            c44512af [JAC-3929-fleet-wide-ai-token-run-observatory-reconciled-initiative-and-approval-gate] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3930-define-fleet-wide-cross-vendor-telemetry-and-lineage-contract                                          0e8fd9fa [JAC-3930-define-fleet-wide-cross-vendor-telemetry-and-lineage-contract] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3931-discover-and-reconcile-fleet-telemetry-source-adapters                                                 7bba87de [JAC-3931-discover-and-reconcile-fleet-telemetry-source-adapters] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3934-design-master-fleet-wide-ai-observability-dashboard                                                    b704cde9 [JAC-3934-design-master-fleet-wide-ai-observability-dashboard] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3937-unblock-liveness-incident-for-jac-3763                                                                 716ce622 [JAC-3937-unblock-liveness-incident-for-jac-3763] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-3960-unblock-liveness-incident-for-jac-3489                                                                 716ce622 [JAC-3960-unblock-liveness-incident-for-jac-3489] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4028-unblock-liveness-incident-for-jac-3708                                                                 71e73000 [JAC-4028-unblock-liveness-incident-for-jac-3708] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4183-unblock-liveness-incident-for-jac-3929                                                                 71e73000 [JAC-4183-unblock-liveness-incident-for-jac-3929] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4186-d2-fleet-dashboard-trust-tier-source-health-component-design                                           71e73000 [JAC-4186-d2-fleet-dashboard-trust-tier-source-health-component-design] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4187-d3-fleet-dashboard-wireframes-for-the-six-v1-views                                                     71e73000 [JAC-4187-d3-fleet-dashboard-wireframes-for-the-six-v1-views] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4190-d5-fleet-dashboard-v1-read-only-build-slice-jac-3934                                                   769d99ec [JAC-4190-d5-fleet-dashboard-v1-read-only-build-slice-jac-3934] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4196-author-cross-vendor-telemetry-contract-spec-v1-0-0-telemetry-contract-md                               9784687f [JAC-4196-author-cross-vendor-telemetry-contract-spec-v1-0-0-telemetry-contract-md] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4197-author-json-schema-files-for-telemetry-envelope-per-event-validation                                   511f0ca2 [JAC-4197-author-json-schema-files-for-telemetry-envelope-per-event-validation] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4202-unblock-liveness-incident-for-jac-4196                                                                 71e73000 [JAC-4202-unblock-liveness-incident-for-jac-4196] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4204-unblock-liveness-incident-for-jac-3929                                                                 71e73000 [JAC-4204-unblock-liveness-incident-for-jac-3929] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4213-unblock-liveness-incident-for-jac-3929                                                                 71e73000 [JAC-4213-unblock-liveness-incident-for-jac-3929] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4214-unblock-liveness-incident-for-jac-3673                                                                 71e73000 [JAC-4214-unblock-liveness-incident-for-jac-3673] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4219-dispatch-telemetry-replay-lineage-spine-design-jac-3932-claude-code-plan-runner                        da3ab300 [JAC-4219-dispatch-telemetry-replay-lineage-spine-design-jac-3932-claude-code-plan-runner] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4220-dispatch-telemetry-detector-specification-jac-3933-claude-code-herald                                  2768e00f [JAC-4220-dispatch-telemetry-detector-specification-jac-3933-claude-code-herald] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4232-unblock-liveness-incident-for-jac-4186                                                                 71e73000 [JAC-4232-unblock-liveness-incident-for-jac-4186] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4250-dispatch-independent-review-telemetry-detector-spec-jac-3933-independent-review-kimi                   35f49712 [JAC-4250-dispatch-independent-review-telemetry-detector-spec-jac-3933-independent-review-kimi] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4252-dispatch-fleet-dashboard-d3-wireframes-jac-4187-claude-code-plan-runner                                234435d3 [JAC-4252-dispatch-fleet-dashboard-d3-wireframes-jac-4187-claude-code-plan-runner] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4270-dispatch-independent-review-telemetry-lineage-contract-jac-3930-independent-review-kimi                71e73000 [JAC-4270-dispatch-independent-review-telemetry-lineage-contract-jac-3930-independent-review-kimi] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4281-update                                                                                                 71e73000 [JAC-4281-update] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4290-dispatch-fleet-dashboard-v1-read-only-build-slice-jac-4190-claude-code-herald                          53946e06 [JAC-4290-dispatch-fleet-dashboard-v1-read-only-build-slice-jac-4190-claude-code-herald] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4291-dispatch-adapter-discovery-tranche-1-first-party-sources-jac-4262-claude-code-plan-runner              9b5fd58f [JAC-4291-dispatch-adapter-discovery-tranche-1-first-party-sources-jac-4262-claude-code-plan-runner] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4292-dispatch-independent-review-claude_local-exit-status-fix-pr-jac-4282-jac-3738-independent-review-kimi  77702b97 [JAC-4292-dispatch-independent-review-claude_local-exit-status-fix-pr-jac-4282-jac-3738-independent-review-kimi] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4295-close-jac-3933-conditional-blockers                                                                    fd0df76a [JAC-4295-close-jac-3933-conditional-blockers] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4304-dispatch-jac-3680-continuous-extraction-routine-claude-code-plan-runner                                ca15dc68 [JAC-4304-dispatch-jac-3680-continuous-extraction-routine-claude-code-plan-runner] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4342-unblock-liveness-incident-for-jac-4262                                                                 71e73000 [JAC-4342-unblock-liveness-incident-for-jac-4262] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4386-unblock-liveness-incident-for-jac-3876                                                                 71e73000 [JAC-4386-unblock-liveness-incident-for-jac-3876] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4491-unblock-liveness-incident-for-jac-4190                                                                 71e73000 [JAC-4491-unblock-liveness-incident-for-jac-4190] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4532-jac-3929-p1-event-identity-and-idempotency-scheme                                                      0e8fd9fa [JAC-4532-jac-3929-p1-event-identity-and-idempotency-scheme] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4550-unblock-liveness-incident-for-jac-3597                                                                 0e8fd9fa [JAC-4550-unblock-liveness-incident-for-jac-3597] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4596-unblock-liveness-incident-for-jac-4534                                                                 68207621 [JAC-4596-unblock-liveness-incident-for-jac-4534] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4644-unblock-liveness-incident-for-jac-4539                                                                 0e8fd9fa [JAC-4644-unblock-liveness-incident-for-jac-4539] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4645-unblock-liveness-incident-for-jac-3930                                                                 0e8fd9fa [JAC-4645-unblock-liveness-incident-for-jac-3930] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4664-unblock-liveness-incident-for-jac-4531                                                                 0e8fd9fa [JAC-4664-unblock-liveness-incident-for-jac-4531] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/JAC-4671-summarize-project-on-2026-08-04-23-00-29-197250-utc                                                    0e8fd9fa [JAC-4671-summarize-project-on-2026-08-04-23-00-29-197250-utc] |
| /Users/hermes/Projects/agentic-os/.paperclip/worktrees/ob1-ingestion-standardization-plan-20260724                                                                     b44c429e [codex/ob1-ingestion-standardization-plan-20260724] |
| /Users/hermes/Projects/agentic-os/.worktrees/hermes-uo2p-gallery-bootstrap                                                                                             e4f394f3 [polly/hermes-uo2p-gallery-bootstrap] |
| /Users/hermes/Projects/agentic-os/.worktrees/hermes-wu4.5-openclaw-decision                                                                                            ac9d07c1 [polly/hermes-wu4.5-openclaw-decision] |
| /Users/hermes/Projects/worktrees/bifrost-artifact-projection-hermes-lell                                                                                               9650c42e [feature/bifrost-artifact-projection-hermes-lell] |
| /Users/hermes/Vault/coordination/agentic-os-fleet-slug-fix-v2                                                                                                          5092faab [fix/fleet-slug-audit-v2-20260724] |

## 6. Branches NOT reachable from origin/main
*(These branches have commits not in main — preservation classification needed)*

```
LOCAL: JAC-3429-backlog-collapse -> 3746e23c
LOCAL: JAC-3579-design-declarative-nix-packaging-for-aegis-paperclip-matching-hermes-adapter -> 00ca11fd
LOCAL: JAC-3593-implement-working-transition-and-deadline-before-mutation-gates -> 79925e13
LOCAL: JAC-3594-implement-initial-modal-cleanup-and-lane-session-continuity-gates -> 64827265
LOCAL: JAC-3673-autonomous-paperclip-org-routing-policy-local-first-claude-last -> 100e1f8c
LOCAL: JAC-3677-capture-fable-5-sessions-going-forward-corpus-not-persisted -> 2236a204
LOCAL: JAC-3678-deep-json-scrape-fable-5-design-tokens -> 25a27a0b
LOCAL: JAC-3679-build-reusable-report-kit-template -> 980291c6
LOCAL: JAC-3681-claude-first-migration-note -> 357da6d2
LOCAL: JAC-3713-nix-scoped-adoption-for-fleet-toolchain-reproducibility-aegis-talaris -> 264b7ad8
LOCAL: JAC-3716-talaris-baseline-the-existing-nix-install-as-the-parity-reference -> 696dc560
LOCAL: JAC-3926-apply-fleet-config-review-recommendations-agy-panel-2026-07-28 -> 1c72b5f0
LOCAL: JAC-3929-fleet-wide-ai-token-run-observatory-reconciled-initiative-and-approval-gate -> c44512af
LOCAL: JAC-3931-discover-and-reconcile-fleet-telemetry-source-adapters -> 7bba87de
LOCAL: JAC-3934-design-master-fleet-wide-ai-observability-dashboard -> b704cde9
LOCAL: JAC-4081-fable-projection -> 3735bc17
LOCAL: JAC-4190-d5-fleet-dashboard-v1-read-only-build-slice-jac-3934 -> 769d99ec
LOCAL: JAC-4196-author-cross-vendor-telemetry-contract-spec-v1-0-0-telemetry-contract-md -> 9784687f
LOCAL: JAC-4197-author-json-schema-files-for-telemetry-envelope-per-event-validation -> 511f0ca2
LOCAL: JAC-4208-telemetry-privacy-redaction-fixtures -> 32fe7b95
LOCAL: JAC-4219-dispatch-telemetry-replay-lineage-spine-design-jac-3932-claude-code-plan-runner -> da3ab300
LOCAL: JAC-4220-dispatch-telemetry-detector-specification-jac-3933-claude-code-herald -> 2768e00f
LOCAL: JAC-4250-dispatch-independent-review-telemetry-detector-spec-jac-3933-independent-review-kimi -> 35f49712
LOCAL: JAC-4252-dispatch-fleet-dashboard-d3-wireframes-jac-4187-claude-code-plan-runner -> 234435d3
LOCAL: JAC-4290-dispatch-fleet-dashboard-v1-read-only-build-slice-jac-4190-claude-code-herald -> 53946e06
LOCAL: JAC-4291-dispatch-adapter-discovery-tranche-1-first-party-sources-jac-4262-claude-code-plan-runner -> 9b5fd58f
LOCAL: JAC-4292-dispatch-independent-review-claude_local-exit-status-fix-pr-jac-4282-jac-3738-independent-review-kimi -> 77702b97
LOCAL: JAC-4295-close-jac-3933-conditional-blockers -> fd0df76a
LOCAL: JAC-4304-dispatch-jac-3680-continuous-extraction-routine-claude-code-plan-runner -> ca15dc68
LOCAL: codex/ob1-ingestion-standardization-plan-20260724 -> b44c429e
LOCAL: dev -> c156b909
LOCAL: exec/session-corpus-jac3669-20260723 -> fbbdb2a6
LOCAL: feat/jac-3595-adjudication-gates -> 4ed0d0bd
LOCAL: feature/bifrost-artifact-projection-hermes-lell -> 9650c42e
LOCAL: feature/hermes-9ad.8-ringer-runs-surface -> c4cefeb3
LOCAL: fix/fleet-slug-audit-v2-20260724 -> 5092faab
LOCAL: fix/fleet-topology-talaris-reconcile -> 72109ff2
LOCAL: fix/honcho-prune-spam -> 0494c861
LOCAL: fix/jac-3974-calendar-sync-stale-lock -> 2d257515
LOCAL: jac-3525-human-review-aggregation -> 6e5ecfcb
LOCAL: jac-3581/fb-reconciled-20260717 -> 9472ca42
LOCAL: jac-4011-gallery-repair -> 2103b331
LOCAL: main -> 3d5af25a
LOCAL: polly/hermes-uo2p-gallery-bootstrap -> e4f394f3
LOCAL: test-jac3593 -> 79925e13
ORIGIN: origin/JAC-3579-design-declarative-nix-packaging-for-aegis-paperclip-matching-hermes-adapter -> 00ca11fd
ORIGIN: origin/JAC-3673-autonomous-paperclip-org-routing-policy-local-first-claude-last -> 100e1f8c
ORIGIN: origin/JAC-3677-capture-fable-5-sessions-going-forward-corpus-not-persisted -> 2236a204
ORIGIN: origin/JAC-3679-build-reusable-report-kit-template -> da7d6f5a
ORIGIN: origin/JAC-3681-claude-first-migration-note -> 357da6d2
ORIGIN: origin/JAC-3713-nix-scoped-adoption-for-fleet-toolchain-reproducibility-aegis-talaris -> 264b7ad8
ORIGIN: origin/JAC-3716-talaris-baseline-the-existing-nix-install-as-the-parity-reference -> 696dc560
ORIGIN: origin/JAC-3926-apply-fleet-config-review-recommendations-agy-panel-2026-07-28 -> 1c72b5f0
ORIGIN: origin/JAC-3929-fleet-wide-ai-token-run-observatory-reconciled-initiative-and-approval-gate -> c44512af
ORIGIN: origin/JAC-3931-discover-and-reconcile-fleet-telemetry-source-adapters -> 7bba87de
ORIGIN: origin/JAC-3934-design-master-fleet-wide-ai-observability-dashboard -> b704cde9
ORIGIN: origin/JAC-4190-d5-fleet-dashboard-v1-read-only-build-slice-jac-3934 -> 769d99ec
ORIGIN: origin/JAC-4196-author-cross-vendor-telemetry-contract-spec-v1-0-0-telemetry-contract-md -> 9784687f
ORIGIN: origin/JAC-4197-author-json-schema-files-for-telemetry-envelope-per-event-validation -> 511f0ca2
ORIGIN: origin/JAC-4219-dispatch-telemetry-replay-lineage-spine-design-jac-3932-claude-code-plan-runner -> da3ab300
ORIGIN: origin/JAC-4220-dispatch-telemetry-detector-specification-jac-3933-claude-code-herald -> 2768e00f
ORIGIN: origin/JAC-4252-dispatch-fleet-dashboard-d3-wireframes-jac-4187-claude-code-plan-runner -> 234435d3
ORIGIN: origin/JAC-4290-dispatch-fleet-dashboard-v1-read-only-build-slice-jac-4190-claude-code-herald -> 53946e06
ORIGIN: origin/JAC-4291-dispatch-adapter-discovery-tranche-1-first-party-sources-jac-4262-claude-code-plan-runner -> 9b5fd58f
ORIGIN: origin/JAC-4295-close-jac-3933-conditional-blockers -> fd0df76a
ORIGIN: origin/JAC-4304-dispatch-jac-3680-continuous-extraction-routine-claude-code-plan-runner -> ca15dc68
ORIGIN: origin/__dolt_remote_info__ -> 28af18b8
ORIGIN: origin/archive/haiku-afb2906e-20260723 -> afb2906e
ORIGIN: origin/chore/clean-runtime-artifacts -> 05ba9c52
ORIGIN: origin/chore/session-wrap-2026-08-01 -> fbca4164
ORIGIN: origin/codex/jac-3938-recipe-command-centre-deploy -> dfe3e254
ORIGIN: origin/codex/merge-retire-portal-passcode -> 499d923a
ORIGIN: origin/deploy/sandy-tailnet-timed-sploot-20260713 -> ffce4de2
ORIGIN: origin/dev -> c156b909
ORIGIN: origin/exec/family-bulletin-phase0-20260711 -> bbd52166
ORIGIN: origin/exec/sandy-privacy-jac3345-20260712 -> 94a51213
ORIGIN: origin/exec/sandy-sploot-jac3341-20260712 -> 94a51213
ORIGIN: origin/exec/session-corpus-jac3669-20260723 -> 2c67515b
ORIGIN: origin/feature/bifrost-artifact-projection-hermes-lell -> 9650c42e
ORIGIN: origin/feature/hermes-9ad.8-ringer-runs-surface -> c4cefeb3
ORIGIN: origin/feature/perplexity-session-corpus-20260723 -> 2c67515b
ORIGIN: origin/fix/fleet-knowledge-graph-20260724 -> 76ecd0d0
ORIGIN: origin/fix/fleet-topology-talaris-reconcile -> 72109ff2
ORIGIN: origin/fix/full-registry-refresh-20260724 -> 5092faab
ORIGIN: origin/fix/honcho-prune-spam -> 0494c861
ORIGIN: origin/fix/jac-3974-calendar-sync-stale-lock -> 2d257515
ORIGIN: origin/fix/launchd-domain-20260721 -> 80eac104
ORIGIN: origin/fix/ollama-brain-stability-20260721 -> 9d24fae1
ORIGIN: origin/fix/retire-portal-passcode -> 1f65041f
ORIGIN: origin/jac-3525-human-review-aggregation -> 6e5ecfcb
ORIGIN: origin/jac-3581/fb-reconciled-20260717 -> 9472ca42
ORIGIN: origin/jac-4011-gallery-repair -> 2103b331
ORIGIN: origin/plan/agentic-os-shape1-20260718 -> 8b064272
ORIGIN: origin/plan/family-bulletin-ledger-20260711 -> 1c1937c3
ORIGIN: origin/polly/hermes-uo2p-gallery-bootstrap -> e4f394f3
ORIGIN: origin/salvage/fb-aegis-deploy-executor-v3-20260717 -> 5128b3a0
ORIGIN: origin/salvage/fb-private-prefix-server-web-v3-20260717 -> af3c360c
ORIGIN: origin/salvage/fb-private-web-client-20260717 -> 9f0a13d9
ORIGIN: origin/salvage/fb-public-synthetic-boundary-20260717 -> c8464c45
ORIGIN: origin/salvage/fb-refinement-continuity-20260717 -> 37222cd4
ORIGIN: origin/salvage/fb-refinement-field-notes-20260717 -> 575ba723
ORIGIN: origin/salvage/fb-refinement-sandy-20260717 -> 2860921f
ORIGIN: origin/spine-federation -> 24c3794e
```

Inventory complete at 2026-08-05T00:17:45Z
