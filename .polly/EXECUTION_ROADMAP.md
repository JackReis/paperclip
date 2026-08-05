# 🎯 EXECUTION ROADMAP: Clear All Blockers

## Phase 1: JAC-3609 (Wings Heartbeat) — IMMEDIATE

### Step 1a: GitHub Auth Refresh
```bash
gh auth refresh --hostname github.com --scopes copilot
```
**What it does:** Enables Wings to authenticate with GitHub Copilot API  
**Owner:** Jack (terminal)  
**Time:** 2 min

### Step 1b: Create Wings API Key
1. Open http://127.0.0.1:3101
2. Navigate: Agents → Wings → API Keys
3. Click "Generate New Key"
4. Copy and store securely
**Owner:** Jack (browser)  
**Time:** 1 min

### Step 1c: Update Wings to Hermes Ollama Cloud
1. Agents → Wings → Settings
2. Change adapter from current to: `hermes`
3. Paste this adapterConfig:
```json
{
  "env": "aegis",
  "profile": "paperclip-compact",
  "model": "deepseek-v4-pro",
  "provider": "ollama-cloud",
  "gateway_timeout": 600,
  "max_turns": 25,
  "toolsets": ["hermes-cli", "web"],
  "compression": {"enabled": true, "threshold": 0.3},
  "telegram_identity": "W1NG5",
  "model_fallbacks": [
    {"provider": "ollama-cloud", "model": "mistral-large-latest"},
    {"provider": "ollama-launch", "model": "qwen3-coder:30b"}
  ]
}
```
4. Save and test connection
**Owner:** Jack (browser)  
**Time:** 3 min

**After completion:** Coordinator auto-retries Luna smoke test → reassigns JAC-3592/3593/3594/3595 to Luna

---

## Phase 2: Remaining Blockers (After JAC-3609 clears)

### hermes-04ps.1.3 — Board Approval for Admission Semaphore
- **Gate:** Board confirmation needed
- **Action:** Present live deployment readiness (code at origin/main, 29/29 tests pass)
- **Owner:** Jack
- **Unblocks:** hermes-04ps.1.3.1 (cloud semaphore deployment)

### hermes-9ad — Fleet Architecture Decision
- **Gate:** Strategic decision on Sol/Fable/Ringer/Paperclip integration
- **Action:** Review architecture options, approve path forward
- **Owner:** Jack (strategic)
- **Unblocks:** Fleet coordination work

### hermes-aeoc — Merge-Safe Reroutes Approval
- **Gate:** Human approval of agent reroute configuration
- **Action:** Review and approve reroute spec
- **Owner:** Jack
- **Impact:** Configuration governance

### hermes-ti0h — Contract Approval (JAC-3690)
- **Gate:** Approve publication-only contract revision 4
- **Action:** Review contract terms, approve revision
- **Owner:** Jack
- **Impact:** Enables JAC-3690 work

### hermes-jiqi — Git Commit Approval (JAC-3698)
- **Gate:** Approve first local Git commit
- **Action:** Review commit, approve for merge
- **Owner:** Jack
- **Impact:** Enables family-beads work

---

## Summary

| Phase | Action | Owner | Time | Impact |
|---|---|---|---|---|
| 1a | `gh auth refresh` | Jack | 2m | GitHub auth |
| 1b | Create API key | Jack | 1m | Wings credentials |
| 1c | Hermes config | Jack | 3m | Wings → Ollama Cloud |
| 2+ | Board/arch/contract approvals | Jack | — | Unblocks fleet work |

**Total Phase 1 time:** ~6 minutes  
**Trigger:** Luna smoke test retry + reassignment  
**Outcome:** Wings + Luna operational via Ollama Cloud

---

## Files Ready for Use
- `/tmp/wings-hermes-config.json` — Wings adapter config (copy to Paperclip)
- `.polly/registry.json` — Full task tracking
- `.polly/FINAL_SUMMARY.md` — Session summary
- `.polly/HERMES_AGENT_RECOMMENDATION.md` — Hermes Paperclip agent config

