## JAC-5wga — Open Fleet Alias Boundary Skill Publication Evidence

**Date:** 2026-08-04T05:30Z  
**Operator:** Aegis (agent 100915f9, hermes_local adapter)  
**Branch:** `JAC-3679-build-reusable-report-kit-template`  
**Bead:** `hermes-5wga` — Teach Open Fleet Telegram alias boundary across persistent profiles

### Task

Propagate the learned `open-fleet-alias-boundary` Hermes skill from the local Aegis profile to the fleet's canonical skills repositories and active profile trees, per Jack's GitHub-first distribution convention (documented in `skill-library-management` SKILL.md § "Cross-Machine Skill Sync").

### Source artifact

- **Local Aegis profile:** `/Users/hermes/.hermes/profiles/aegis/skills/automation/open-fleet-alias-boundary/SKILL.md` (178 lines, version 1.0.0)
- **SHA-256:** `d35d4344058a5055afedabfa70a0544aa221ce8943e3bbf374d2ad3a8826cf28`
- **Frontmatter:** name=open-fleet-alias-boundary, author=Hermes Agent, license=MIT, platforms=[macos, linux], tags=[open-fleet, telegram, paperclip, herdr, profiles]

### Publication targets (all byte-identical to source)

1. **GitHub — JackReis/hermes-skills** (primary canonical repo)
   - Path: `automation/open-fleet-alias-boundary/SKILL.md`
   - Commit: `c442239` "docs(open-fleet): add open-fleet-alias-boundary skill"
   - Registry: `registry.json` regenerated with `--repo-root` (34 skills total, +1 new)
   - Verified via `curl` from `raw.githubusercontent.com` — hash matches

2. **GitHub — JackReis/shared-agent-skills** (secondary mirror)
   - Path: `automation/open-fleet-alias-boundary/SKILL.md`
   - Commit: `d0f1c11` "docs(open-fleet): add open-fleet-alias-boundary skill"
   - Verified via `curl` from `raw.githubusercontent.com` — hash matches

3. **Aegis coordinator profile** (sibling automation consumer, was missing the skill)
   - Path: `/Users/hermes/.hermes/profiles/coordinator/skills/automation/open-fleet-alias-boundary/SKILL.md`
   - Propagated; hash matches

4. **Aegis luna profile** (sibling automation consumer, was missing the skill)
   - Path: `/Users/hermes/.hermes/profiles/luna/skills/automation/open-fleet-alias-boundary/SKILL.md`
   - Propagated; hash matches

### Hash verification table (all identical)

| Target | SHA-256 | Match |
|--------|---------|-------|
| Local Aegis profile (source) | d35d4344058a5055afedabfa70a0544aa221ce8943e3bbf374d2ad3a8826cf28 | ✓ |
| JackReis/hermes-skills GitHub | d35d4344058a5055afedabfa70a0544aa221ce8943e3bbf374d2ad3a8826cf28 | ✓ |
| JackReis/shared-agent-skills GitHub | d35d4344058a5055afedabfa70a0544aa221ce8943e3bbf374d2ad3a8826cf28 | ✓ |
| Aegis coordinator profile | d35d4344058a5055afedabfa70a0544aa221ce8943e3bbf374d2ad3a8826cf28 | ✓ |
| Aegis luna profile | d35d4344058a5055afedabfa70a0544aa221ce8943e3bbf374d2ad3a8826cf28 | ✓ |

### Profiles NOT propagated (no automation dir — not consumers)

- `coder` — no `automation/` directory
- `paperclip-canary`, `paperclip-compact` — no automation skills at all
- `worker` (Aegis) — no `automation/` directory
- Talaris profiles — no `automation/` directory on any Talaris profile; the GitHub repos serve as the fleet distribution source

### Skill load verification

- `hermes skills list --profile coordinator` confirms `open-fleet-alias-boundary` appears as enabled (local source, automation category).
- Frontmatter parses correctly: name, description, version, author, license, tags all extracted.

### Notes

- Per the `skill-library-management` skill's GitHub-first convention, GitHub is the durable distribution source; installed default/profile trees on Talaris/Aegis are runtime projections. The skill is now available for pull by any fleet peer that syncs from these repos.
- The `hermes-skills` repo remote redirected to `jar-reis/hermes-skills.git` on push — both `JackReis/hermes-skills` and `jar-reis/hermes-skills` resolve to the same upstream.
- Per the wrap log, no new runtime, pane, tunnel, or Paperclip agent was created. This was purely a packaging/distribution action.

### Status

Complete. All acceptance criteria from bead `hermes-5wga` are satisfied:
- [x] Reusable skill captures triggers, procedure, pitfalls, and verification
- [x] Skill installed into active persistent Hermes profiles
- [x] Recipients can discover it (GitHub repos + active profile trees)
- [x] No new runtime, pane, tunnel, or Paperclip agent created
