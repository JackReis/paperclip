# Plan: Establish Luna as the Fleet-Wide Summary Owner

**Date**: 2026-08-03
**Owner**: Bright (8b6ea7f8)
**Parent Bead**: notes-l78ph
**Status**: planning

## Context

Jack directed that Luna produce all fleet-wide summaries. Luna exists as a Paperclip agent
(2f92499a-9b6b-48f3-8319-8657e8fe48de) using hermes_local adapter with grok-4-fast-reasoning via
xai-oauth (board-authorized at 2026-07-31). She has a Telegram bot token and home channel
(7618822262). No summary routing, cron jobs, or delivery contracts currently exist for Luna.

A "Summarizer" built-in Paperclip agent exists but is separate — the goal is to establish Luna
as the authoritative summary owner with a durable, documented contract.

## Decomposition

### Child Beads (notes-l78ph.1 - .7)

| Bead | Title | Type | Priority |
|------|-------|------|----------|
| notes-l78ph.1 | Define Luna summary owner identity, Telegram delivery contract, and input sources | task | P1 |
| notes-l78ph.2 | Configure daily fleet summary cron job routed to Luna | task | P1 |
| notes-l78ph.3 | Configure session/end-of-run summary hook routed to Luna | task | P1 |
| notes-l78ph.4 | Define Luna summary output format, provenance, and rollback receipts | task | P1 |
| notes-l78ph.5 | Migrate old summary lanes to Luna or document fallback ownership | task | P1 |
| notes-l78ph.6 | Wire Luna summary pipeline to Paperclip agent API and verify live | task | P1 |
| notes-l78ph.7 | Validate Luna fleet-wide summary ownership end-to-end | task | P1 |

### Dependency Graph

```
notes-l78ph.1 (identity + Telegram contract)
notes-l78ph.2 (daily cron) -- depends on .1
notes-l78ph.3 (session hook) -- depends on .1, .4
notes-l78ph.4 (output format) -- depends on .1
notes-l78ph.5 (migrate old lanes) -- depends on .1, .4
notes-l78ph.6 (Paperclip API wiring) -- depends on .1
notes-l78ph.7 (end-to-end validation) -- depends on .1, .2, .3, .4, .5, .6
```

## Execution Approach

1. **notes-l78ph.1**: Document Luna's summary identity in `~/.hermes/profiles/luna/SUMMARY_OWNERSHIP.md`,
   define Telegram delivery contract (bot token, allowed channels, Markdown format), list input
   sources (Paperclip agents API, Beads SSOT, memory planes, cron), and document fallback owner
   (Wings, as wake-on-demand backup executive).

2. **notes-l78ph.2**: Create a Hermes cron job (no_agent=True, script-only) in Luna's profile that
   runs at 0 5 * * * daily. Query Paperclip API for agent table, issue queue, active runs, blocked
   issues; query memory plane health; produce Markdown summary with source citations; deliver
   to Telegram channel via `hermes telegram send` or bot API.

3. **notes-l78ph.3**: Create a post-run hook in Luna's profile that fires after each execution run
   (via `local_turn_sync_hook.py` pattern). Summarizes what was accomplished, artifacts produced,
   remaining blockers, next owner. Delivers to Telegram.

4. **notes-l78ph.4**: Define the standard summary Markdown format with structured fields:
   `# Luna Daily Fleet Summary — YYYY-MM-DD`, source freshness timestamp + source URL/UUID,
   author citation (agent name + Paperclip ID), status blocks (agents, issues, memory planes,
   providers), blockers, artifacts, next actions. Rollback receipt template documents how to
   revert (remove cron jobs, restore old summary lanes, revert identity doc).

5. **notes-l78ph.5**: Audit existing summary-producing cron jobs across all profiles
   (aegis, family, worker). Migrate or repoint them to Luna's summary pipeline. Document any
   that cannot be migrated with their fallback owner.

6. **notes-l78ph.6**: Verify Luna can read Paperclip agent table and API via her MCP server
   config (`~/.hermes/profiles/luna/.env` has PAPERCLIP_API_URL=http://127.0.0.1:3100 — needs
   to be :3101). Test a real summary query and deliver a test summary to Telegram as live
   verification.

7. **notes-l78ph.7**: Trigger a daily summary cron run, verify end-to-end: Luna produces summary,
   Telegram delivery succeeds, source citations present, rollback receipt documented. Produce
   Ringer verdict.

## Ringer Manifest

See: `~/.ringer/manifests/establish-luna-summary-owner.json`

## Risks

- Luna's PAPERCLIP_API_URL env points to :3100 but actual API is on :3101 — needs fix
- Luna has no cron jobs directory configured yet — needs creation
- Luna's `fallback_providers: []` means no fallback if xai-oauth fails — summary jobs could
  fail silently if grok is unavailable
- Telegram bot token is in the .env file (already present, no new secrets needed)
- Old summary lanes (aegis cron job) must not be broken during migration

## Verification

- Live: trigger Luna cron job, verify summary delivered to Telegram channel
- Paperclip: verify Luna can read agent table and issue queue via MCP
- Rollback: verify identity doc, cron job, and Telegram delivery can be cleanly removed
