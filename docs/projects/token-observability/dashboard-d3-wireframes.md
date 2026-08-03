# D3 — Fleet Dashboard: Annotated Wireframes for the Six V1 Views

**Status:** Design-only deliverable for [JAC-4187](/JAC/issues/JAC-4187), decomposing the approved [JAC-4159](/JAC/issues/JAC-4159) plan under [JAC-3934](/JAC/issues/JAC-3934). Delivered via dispatch [JAC-4252](/JAC/issues/JAC-4252).
**Author:** Plan Runner (claude-code lane).
**Binds to (normative inputs):**
- **D1 IA & navigation spec** — `ia-nav-spec` on [JAC-4226](/JAC/issues/JAC-4226) (entity spine §2, six-view IA §4, global states §5.3, trust rule §6, deep-link routes §7, envelope binding §8).
- **D2 trust components** — `trust-source-health-design` on [JAC-4186](/JAC/issues/JAC-4186) (badge §4, source-health strip §5, legend §6, state matrix §9, per-view composition §8).
- **Detector spec** — `detector-spec` on [JAC-3933](/JAC/issues/JAC-3933) (detectors D1–D9, stages `info→warning→review→runaway_high_confidence`, findings, completion-first posture).
- **Source-adapter discovery** — `telemetry-source-adapter-discovery` on [JAC-4211](/JAC/issues/JAC-4211) (per-view feed list + native/estimated/gap/placeholder status).

**Scope:** Annotated layout wireframes for the six V1 views. Each wireframe shows (a) how the D1 navigation spine anchors it, (b) where the D2 trust badge / source-health strip / legend attach, (c) which detector signals render, and (d) which source feeds populate it (with trust status). **No code, no component re-design (D2 owns that), no live build (D5 owns that), no new IA (D1 owns that).**

---

## 0. How to read these wireframes

- Wireframes are **ASCII layout sketches** — they fix *placement, hierarchy, and annotation*, not pixel visuals or final copy. D5 renders them; D2 fixes component appearance.
- Every annotation callout uses a bracketed tag: **`[Bn]`** badge attachment, **`[STRIP]`** source-health strip, **`[LEG]`** trust legend, **`[Dn]`** a detector-spec detector, **`[SRC:…]`** a source feed with its JAC-4211 status, **`[NAV→…]`** a D1 deep-link target (§7 route table), **`[STATE:…]`** a D1 §5.3 global state.
- **Trust tiers** (D2 §3.1 tokens, rendered on every metric): `● Live` · `◐ Stale·est` · `○ Unreachable` · `⊘ Unknown` · `🔒 Gated` · `✕ Error`. Grey = missing (never red); red = genuine failure only. **Cardinal rule: unknown ≠ zero.**
- Numbers in the sketches are **illustrative fixture values** (D4/[JAC-4185](/JAC/issues/JAC-4185) supplies the real fixture set); they exist only to show which tier/badge a cell carries.

---

## 1. Persistent chrome (shared by all six views)

Every view is drawn *inside* this frame. It is specified once here and referenced as `[CHROME]` in each wireframe so the six sketches stay focused on their unique body.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ FLEET OBSERVATORY        Fleet ▸ Pool ▸ Agent ▸ Session ▸ Run ▸ Event      [Trust ⓘ][LEG]│  ← D1 §2 spine breadcrumb + collapsed legend affordance (D2 §6.2)
│  [Health][Utilization][Spend][Active Runs][Blockers]           window:[24h▾]  as of 14:32│  ← view tabs = D1 §4 views 1–5; view 6 is a drill target, not a tab
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [STRIP] Source health  ●Paperclip 14:32  ●Ringer 14:32  ●Hermes 14:31  ◐Claude 14:20·est │  ← D2 §5 source-health strip (persistent band)
│         ○Codex last13:58  ⊘Kimi no-data  ⊘OmniGent  ⊘Pi  ⊘OpenCode      agg: 1○ 1◐ 3⊘ ▸  │     driven by JAC-4211 source registry; agg cap = worst-tier rollup
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**Chrome annotations**

| Tag | Attaches | D2 / D1 / JAC-4211 basis |
|---|---|---|
| `[STRIP]` | Persistent source-health strip, pinned under the nav on every view (slim band on views 2–6; **primary full surface on view 1**). | D2 §5 / §5.3; strip chips driven by the JAC-4211 registry — one chip per adapter with `● live / ◐ stale·est / ○ unreachable / ⊘ unknown` + "as of" + `·est` when derived. |
| `[LEG]` | Collapsed `Trust ⓘ` in global chrome; expands to the four-tier + triplet key. | D2 §6.2 (collapsed by default, consistent placement across views). |
| Breadcrumb | `Fleet ▸ Pool ▸ Agent ▸ Session ▸ Run ▸ Event`; each hop is a deep-link, back-nav pops one spine level. | D1 §2 spine, §5.1 primary drill flow, §7 routes. |
| Chip status (fixture) | Paperclip/Ringer/Hermes = `● live native/`; Claude = `◐ stale·est` (tokens native, USD estimated); Codex = `○ unreachable` (last seen); **Kimi = `⊘ unknown` (JAC-4211 GAP — no on-box rollup)**; OmniGent/Pi/OpenCode = `⊘ unknown` (JAC-4211 placeholders, telemetry unassumed). | JAC-4211 §1–§3 status matrix; D2 §3.1 red-boundary (placeholders grey, not red). |

**Global-state rule (all views):** every view specifies the five D1 §5.3 states — `[STATE:loading]` skeleton, `[STATE:empty]` neutral copy, `[STATE:error]` inline + retry, `[STATE:partial]` render-what-exists + "unknown", `[STATE:gated]` metadata-only. Partial is the **default** multi-source posture (Kimi/OmniGent/Pi/OpenCode are unreachable at V1).

---

## 2. View 1 — Fleet Health (landing)  ·  route `/fleet`

**D1:** primary entity Fleet, rolled up over Pool→Agent; dashboard grain; default route.
**Purpose:** one-glance fleet posture with detector alerts at warning/review — completion-first, no intervention.

```
[CHROME]  (strip rendered as PRIMARY full surface here — D2 §8 view 1)
┌ Fleet Health ─────────────────────────────────────────────────────────────────────────┐
│ Agents  ●24 total   ●18 active   ●4 idle   ◐2 blocked·est      Freshness confidence ◐82%│  ← [B1] per-count badge; rollup = worst constituent tier (D2 §4.6)
│ ─────────────────────────────────────────────────────────────────────────────────────  │
│ POOLS (sorted by attention: unreachable→stale→degraded→healthy — D1 §4 View1)           │
│  ┌ Ollama Cloud ─────┐ ┌ Claude Code ─────┐ ┌ local Aegis ─────┐ ┌ Codex ───────────┐  │
│  │ cap ●2/3  ✓verified│ │ cap ●2/2 ✓verified│ │ cap ◐1/2·est      │ │ cap ○ last 13:58 │  │  ← [B2] capacity badge per tile; Codex tile = ○ unreachable (last-known, NOT 0)
│  │ runs ●2 err ●0%    │ │ runs ●2 err ●0%   │ │ host ◐ green·est   │ │ runs ⊘ unknown   │  │     [NAV→/pool/{poolId}]
│  └────────────────────┘ └───────────────────┘ └───────────────────┘ └──────────────────┘  │
│ ─────────────────────────────────────────────────────────────────────────────────────  │
│ ACTIVE RUNS ●6 ▸        OPEN BLOCKERS ◐3·est ▸        AGG ERROR RATE ●0.4%               │  ← [NAV→/fleet/runs?status=active] · [NAV→/fleet/blockers]
│ ─────────────────────────────────────────────────────────────────────────────────────  │
│ DETECTOR SIGNALS (completion-first: info/warning/review — NO cancel/intervene — D1 §4)   │
│  ⚠ warning  [D1] long-run  run r/4820 open 47m (Plan Runner)          ▸evidence [NAV→run]│  ← [D1] duration; warning@45min; declared-plan chip if any
│  ⚠ review   [D2]+[D5] retry-loop + no-progress  r/4791 (2 axes)       ▸packet  [NAV→run] │  ← [D2]+[D5] 2-axis → review stage (still no action; §2.3)
│  ○ info     [D6] context-pressure  r/4810 util 0.88                   ▸evidence [NAV→run]│  ← [D6] owns context.window_pressure event
│  ⊘ coverage [D9] gap: Kimi run-level-only → span detectors N/A        ▸map              │  ← [D9] coverage-gap map; Kimi/OmniGent gaps shown, not fabricated
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Annotations**

| Region | D2 component | Detector(s) | Source feed (JAC-4211 status) | D1 ref |
|---|---|---|---|---|
| Agent counts + freshness confidence | `[B1]` compact badges, worst-tier rollup | — | Paperclip agent/issue state `● native`; blocked count `◐ est` from issue relations | §4 V1, §8 completeness→partial tiles |
| Per-pool health tiles | `[B2]` compact capacity badge; `·est` when derived | — | Pool/lane verified-state + live runs from Paperclip `● live`; **local Aegis host health `◐ est`**; **Codex `○ unreachable` (JAC-4211 last-seen)** | §4 V1 drill → `/pool/{poolId}` |
| Active-run / blocker / error counts | inline badges | — | Paperclip run+issue `● live`; blockers `◐ est` | §4 V1 → `/fleet/runs`, `/fleet/blockers` |
| Detector signals panel | stage glyphs reuse tier colors (amber=warning/review, grey=info/coverage) | **D1, D2, D5, D6, D8, D9** — findings at `info/warning/review` only | Detector findings computed over Ringer+Hermes+Paperclip event stream; **D9 renders coverage gaps for Kimi/OmniGent/Pi/OpenCode** | §4 V1 "detector signals"; detector-spec §2.3, §3, §5 (no auto-intervention) |
| Source-health strip | `[STRIP]` **primary surface** | — | full JAC-4211 registry | D2 §8 V1 |

**Completion-first guarantee (rendered):** the detector panel tops out at `review`. There is **no cancel/pause/intervene control** anywhere on this view — the highest-severity `runaway_high_confidence` (not shown in fixture) would render a `▸packet` link to a pause-and-approve evidence packet, never an action button (detector-spec §5–§6).

---

## 3. View 2 — Lane / Pool Utilization  ·  route `/fleet/pools`

**D1:** primary entity Pool; dashboard + per-pool drill; sort by saturation.
**Purpose:** capacity & concurrency; surface over-subscription and starvation.

```
[CHROME]  (strip = slim band)
┌ Lane / Pool Utilization ──────────────────────────────────────────  sort:[saturation▾] ┐
│ POOL              CAP   LIVE/ MAX  QUEUE  VERIFIED-STATE      AGENTS (busy/idle)          │
│ ● Claude Code     [B]  ●2 / 2     ●1    ✓ verified           ●2 busy 0 idle   ▸           │  ← [B] capacity badge; saturated → [NAV→/fleet/runs?pool=claude-code]
│ ● Ollama Cloud    [B]  ●2 / 3     ●0    ✓ verified           ●2 busy 1 idle   ▸           │
│ ◐ local Aegis     [B]  ◐1 / 2·est ⊘?    ✓ verified (host◐)   ◐1 busy·est                  │  ← capacity from stale host probe → ◐ stale·est, "as of" shown; never fabricate 0/max
│ ○ Codex           [B]  ○ last13:58 ⊘    ✓ verified           ○ unknown                    │  ← [STATE:partial] source unreachable → last-known + ○, not 0/max
│ ⊘ external fast    [B]  ⊘ unknown  ⊘    pending_canary        ⊘ unknown                    │  ← lane parked → [NAV→ issue/blocker that parked it]
│ ─────────────────────────────────────────────────────────────────────────────────────  │
│ THROUGHPUT (runs/hr, selected window)   ▁▃▅▇▅▃  ● live where sourced, ◐ est where gapped  │  ← trendline tier-coded per bucket
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Annotations**

| Region | D2 component | Detector(s) | Source feed (JAC-4211 status) | D1 ref |
|---|---|---|---|---|
| Capacity gauge / live-vs-max | `[B]` compact badge, `·est` when capacity derived | — (utilization is not a detector axis) | Live runs + lane maxParallel from Paperclip `● live`; Ringer `max_parallel` for fan-out pools `● live`; **local Aegis capacity `◐ est` (host probe)**; **Codex `○ unreachable`** | §4 V2, §8 completeness = agents-reporting/total |
| Verified-state column | inline badge | — | Coordinator/agent-table lane state (`verified / pending_canary / pending_repair / reserved / disabled`) via Paperclip | §4 V2 (verified-state filter) |
| Queue depth | inline badge; `⊘` when source silent (not 0) | — | Paperclip queue/issue-lease state | §4 V2 |
| Throughput trend | per-bucket tier coding | — | Paperclip run history `● live`; gaps `◐ est` | §4 V2 |

**Trust behavior:** a stale capacity source shows "as of" + stale-estimated tier and **never fabricates 0 or max** (D1 §4 V2 state; D2 §9 matrix rows 2–4).

---

## 4. View 3 — Spend / Token Observatory  ·  route `/fleet/spend?window=&by=`

**D1:** metric projection (tokens/cost) over Run→Tool-call, rolled to Agent/Pool/Fleet; dashboard + drill.
**Purpose:** cost & token accounting with **native-vs-estimated visually distinct** (the load-bearing trust distinction here).

```
[CHROME]  (strip = slim band; provider chips cross-highlight spend rows — D2 §8 V3)
┌ Spend / Token Observatory ──────────────  window:[7d▾]  by:[agent▾][pool][model/provider] ┐
│ FLEET TOTAL   $184.20 ◐ est.-blended    ▸provenance          input 42.1M · out 6.8M · cache 118M│ ← [B-standalone] headline; ◐ because blend of native+estimated (worst tier)
│ ─────────────────────────────────────────────────────────────────────────────────────  │
│ BY PROVIDER / MODEL          NATIVE?     SPEND        TOKENS(in/out/cache)                 │
│  ● Hermes gateway (actual)   native ●    $96.40 ●     18.2M / 3.1M / 74M     ▸runs         │  ← [SRC:Hermes state.db] actual_cost_usd → ● Live native (JAC-4211 canonical)
│  ● Paperclip (billed)        native ●    $41.10 ●     — (agent grain)         ▸runs        │  ← [SRC:Paperclip] spentMonthlyCents → ● Live native
│  ◐ Claude Code               est ◐       $28.70 ◐est  9.4M / 1.9M / 40M       ▸runs        │  ← [SRC:Claude] tokens native, USD ESTIMATED → ◐ ·est (dashed underline, D2 §5.2)
│  ◐ Codex/ChatGPT             est ◐       $12.30 ◐est  6.1M / 1.2M / 4M        ▸runs        │  ← [SRC:Codex] tokens native, USD estimated → ◐ ·est
│  ◐ Ringer workers            est ◐       $5.70  ◐est  tasks[].tokens          ▸receipts    │  ← [SRC:Ringer] tokens only → estimated
│  ⊘ Kimi                      unknown ⊘   ⊘ unknown    ⊘ (no rollup)           —            │  ← [SRC:Kimi GAP] never $0 — rendered "unknown" (avoids false "free"); JAC-4211 §6
│  ⊘ OmniGent/Pi/OpenCode      unknown ⊘   ⊘ unknown    ⊘                        —            │  ← placeholders, unassumed telemetry → ⊘, not 0
│ ─────────────────────────────────────────────────────────────────────────────────────  │
│ TREND (spend/day) ▂▄▆▇▆▅  · cache-amplification flag: ●none   top spender: Hermes gw ▸    │  ← trend tier-coded; cache flag ties detector-spec D7
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Annotations**

| Region | D2 component | Detector(s) | Source feed (JAC-4211 status) | D1 ref |
|---|---|---|---|---|
| Fleet total | `[B-standalone]` full anatomy + absolute "as of" + provenance affordance | — | Blend → worst-tier `◐ est.-blended`; provenance popover shows native/estimated split | §4 V3, D2 §4.3 standalone |
| Per-provider rows | inline badges; **`native ●` vs `est ◐` column is always-on** (provenance independent of freshness, D2 §5.2) | **D7 cache-amplification** flag surfaces here (info-level) | **Hermes `session_model_usage.actual_cost_usd` ● native (canonical, JAC-4211 §7 precedence #1)**; Paperclip ● native #2; Claude/Codex/Ringer ◐ estimated #3; **Kimi ⊘ GAP; OmniGent/Pi/OpenCode ⊘ placeholder** | §4 V3, §8 provenance = metered vs estimated |
| Dedup note (design caveat) | — | — | Estimated Claude/Codex/Ringer USD **must not double-count** against Hermes `actual_cost_usd` for the same call — dedupe by session/provider/model/time (JAC-4211 §6) | §4 V3 |
| Drill | any spend bar/row → contributing runs → Run detail (View 6) | — | — | §4 V3 → `/run/{runId}` |

**Trust behavior:** a provider with no telemetry renders **"unknown" spend (never zero)** with a provenance note — the "avoid false free-reads" rule (D1 §4 V3; JAC-4211 Kimi GAP made visible, not hidden).

---

## 5. View 4 — Active Runs  ·  route `/fleet/runs?status=active`

**D1:** primary entity Run (active); live drill list; longest-elapsed first.
**Purpose:** live run monitor with detector badges. **Completion-first, read-only — no cancel/intervene in V1** (explicit IA constraint, D1 §4 V4).

```
[CHROME]  (strip = slim band)
┌ Active Runs ────────────────────────  sort:[elapsed▾]  filter:[pool▾][agent▾][status▾]  ┐
│ RUN     AGENT/POOL        ELAPSED  MODEL         CTX-UTIL  TOOLS/min  RETRY  LIVE $  SIGNALS│
│ r/4820  Plan Runner       ●47m ⚠   opus-4.8      ●0.41     ●3         ●0     ●$0.82  [D1]⚠  │  ← [D1] long-run warning@45m; row action = OPEN/REPLAY only (navigational)
│         claude-code       [B]                                                  ▸detail [NAV→run]
│ r/4791  Herald            ●31m     glm-5.2       ●0.55     ●5         ◐4·⚠    ●$0.40  [D2][D5]│  ← [D2] retry-loop@4/15min + [D5] no-progress → 2 axes → review; ▸packet (evidence, NOT action)
│         ollama-cloud      [B]                                                  ▸packet [NAV→run]
│ r/4810  Coordinator       ●12m     opus-4.8      ●0.88 ⚠   ●2         ●0     ●$0.55  [D6]○  │  ← [D6] context-pressure info@util>0.85 (owns context.window_pressure)
│         claude-code       [B]                                                  ▸detail
│ r/4777  Kimi Code(Ringer) ◐18m·est qwen2.5       ⊘ n/a     ⊘ n/a      ●1     ◐$?·est [D9]⊘  │  ← [SRC:Kimi/Ringer run-level] span fields N/A → [D9] coverage-gap; NOT a fabricated signal
│         independent-review[B]       PLANNED-LONG-RUN ⚑ envelope 60m               ▸detail    │  ← planned-long-run declaration chip suppresses D1/D6/D7 escalation up to envelope (detector-spec §4)
└─────────────────────────────────────────────────────────────────────────────────────────┘
   Row actions: [Open] [Replay] [View issue]   — NO [Cancel]/[Pause]/[Intervene] (D1 §4 V4)
```

**Annotations**

| Region | D2 component | Detector(s) | Source feed (JAC-4211 status) | D1 ref |
|---|---|---|---|---|
| Status / elapsed / live-$ | `[B]` inline badge per run; unreachable-source run shows last-known + `○`, **never "completed"** | — | Active runs from Paperclip `● live`; live tokens/context from Hermes `session_model_usage` `● live`; fan-out workers from Ringer `● live` | §4 V4, §8 provenance = live vs last-known |
| CTX-UTIL / TOOLS/min / RETRY | inline badges | **D6** context-pressure (util), **D4** repeated-tool-sig (span-conformant only), **D2** retry-loop, **D5** no-progress, **D1** long-run, **D7** cache | Hermes + Ringer span/run events; **run-level-only sources (Kimi wrapper) → `⊘ n/a` + [D9] coverage-gap, not a false negative** | detector-spec §3 (D1–D9), §1.2 conformance-tier gating |
| Planned-long-run chip | `⚑` chip | suppresses D1/D6/D7 to envelope; **D2/D4/D5/D8 NOT suppressed** (a planned run stuck in a loop is still a runaway) | Dispatcher `attributes.plan.long_run` | detector-spec §4 |
| Signals column | stage glyph = tier color (amber warning/review, grey info/coverage) | D1/D2/D4/D5/D6/D7/D9 badges; `▸packet` appears only at `runaway_high_confidence` (evidence, not action) | detector findings | detector-spec §2.3–§2.4, §5 |

**Completion-first guarantee (rendered):** row actions are `[Open] [Replay] [View issue]` — **navigational only**. No cancel/pause/intervene control exists in V1. Long-run ≠ bad: planned-long-run declarations are shown and respected (D1 §4 V4; detector-spec §1.1, §4, §5).

---

## 6. View 5 — Blockers  ·  route `/fleet/blockers`

**D1:** blocker relation over Issues/Runs; drill list grouped by blocked target; oldest-blocked first.
**Purpose:** fleet-wide blocked work; ties Paperclip issue state to run state.

```
[CHROME]  (strip = slim band)
┌ Blockers ─────────────────────────────────  group:[blocked-target▾]  filter:[owner▾]    ┐
│ BLOCKED                 BLOCKED BY        OWNER          AGE     UNBLOCK ACTION            │
│ ◐ JAC-4000 Coordinator  JAC-4247 +4       Coordinator    ●2h13m  await children terminal ▸│  ← [B] relation-freshness badge; [NAV→ blocked node Session/Run] + [NAV→ blocking node]
│ ● JAC-3933 detector spec JAC-4250 review   Kimi(review)   ●41m    independent review ▸     │  ← cross-link owner→/agent/{id}; blocking→its detail
│ ─────────────────────────────────────────────────────────────────────────────────────  │
│ [STATE:empty]  →  "No active blockers" (healthy)   ── visually DISTINCT from ──           │  ← D1 §4 V5: empty(healthy) ≠ unreachable(unknown)
│ [STATE:partial] →  ○ "Blocker source unreachable — coverage unknown as of 14:05"          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Annotations**

| Region | D2 component | Detector(s) | Source feed (JAC-4211 status) | D1 ref |
|---|---|---|---|---|
| Blocked/blocking rows | `[B]` inline badge on relation freshness | — (blockers are relation state, not a detector) | Paperclip issue `blockedBy`/`blocks` + issue-lease/run state `● live`; relation `◐ est` when cached | §4 V5, §8 provenance = live relation vs cached |
| Owner / unblock action | inline badge | — | Paperclip issue owner/assignee | §4 V5 → `/agent/{agentId}` |
| Empty vs partial | `[STATE:empty]` distinct from `[STATE:partial/unreachable]` | — | — | **D1 §4 V5: "no active blockers" (healthy) must be visually distinct from "blocker source unreachable" (unknown)** |

**Trust behavior:** the empty (healthy) state and the unreachable (unknown) state are **visually separable** — the core disambiguation this view buys (D1 §5.3 cardinal rule; D2 §9 matrix Empty vs Unknown).

---

## 7. View 6 — Run / Session Detail + Replay  ·  route `/run/{runId}` → `/run/{runId}/replay`

**D1:** primary entity Run (within Session) + tool-call/event timeline; detail + chronological drill.
**Purpose:** per-entity deep view + **redaction-tiered replay — never raw prompts/response content** (IA-level safety rule).

```
[CHROME]  (strip = slim band; provider chip → provenance)
┌ Run r/4791  ▸ Session s/1180 ▸ Herald ▸ ollama-cloud ─────────────────────  [Replay ▶]   ┐  ← breadcrumb = D1 §2 spine up-nav
│ SUMMARY   status ●running  started 14:00  elapsed ●31m  spend ◐$0.40·est  issue JAC-4251 ▸│  ← [B] badges; spend ◐ est (Ringer/estimated); [NAV→ issue]
│ LINEAGE   parent run r/4788 ▸   children: 3 fan-out (Ringer) ▸   retries: 2 ▸  handoffs:1 │  ← Ringer manifest run-tree (parent_run_id); [D2]/[D8] tie via lineage
│ ─────────────────────────────────────────────────────────────────────────────────────  │
│ TIMELINE (tool-calls / events — REDACTION-TIERED POINTERS, never raw content)            │
│  14:00  ● run.dispatched         planned-long-run ⚑                                       │
│  14:03  ● span.tool_call  tool=Grep  args:{keys+sizes only 🔒}   ptr#a1b2 hash:sha256▸    │  ← 🔒 gated: existence+tier shown, VALUE masked (D2 §4.4 gated variant); pointer+hash only
│  14:07  ● span.tool_call  tool=Edit  args:{🔒 restricted}         ptr#c3d4 hash:sha256▸    │  ← [SRC:Claude/Codex transcript] content-bearing → NEVER emitted raw (JAC-4211 §5)
│  14:12  ⚠ [D2] run.retry  attempt=3  reason_class=timeout                                 │  ← detector finding inline on the timeline (class enum only, no raw error string)
│  14:20  ◐ span  (source mid-ingest)  "timeline incomplete as of 14:20" ⊘                  │  ← [STATE:partial] partial timeline marker — does NOT imply run done (D1 §4 V6)
│ ─────────────────────────────────────────────────────────────────────────────────────  │
│ REPLAY ▶  redaction tier: [🔒 content GATED — metadata only]   ▸ open canonical in Vault ▸│  ← replay = redaction-tiered index (JAC-3932); gated deep-link resolves to METADATA tier, not error
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Annotations**

| Region | D2 component | Detector(s) | Source feed (JAC-4211 status) | D1 ref |
|---|---|---|---|---|
| Summary / spend | `[B]` inline badges; spend `◐ est` | — | Run record: Paperclip `● live` (status/issue), Hermes `session_model_usage` (per-session tokens/cost), Ringer receipt (fan-out) | §4 V6 |
| Lineage (parent/children/retries/handoffs) | inline badges | **D2/D8** tie to lineage `retry-loop`/`double-terminal`; **D3** session-reuse via correlation ids | **Ringer manifests + receipts** (`run_id`, `tasks[]`, run-tree) `● live`; Hermes `async_delegations` (handoff chains) | §4 V6; detector-spec §7 lineage ties |
| Timeline events | `🔒` **permission-gated (lock) badge variant** — shows existence + tier, masks value | detector findings render inline as class-enum events (no raw strings) | **Claude/Codex/Kimi transcript bodies are content-bearing → replay stores POINTER + hash tier only, never raw** (JAC-4211 §5 redaction) | §4 V6 replay-redaction rule (IA safety) |
| Partial timeline | `⊘` "timeline incomplete as of T" marker | — | Source mid-ingest | §4 V6 (`[STATE:partial]` ≠ run done) |
| Replay control | redaction-tier chip; gated → metadata-only | — | JAC-3932 replay/lineage spine indexes; Vault/OKF canonical deep-link | §4 V6, §7 deep-link honors permission-gating |

**Safety guarantee (rendered):** no raw prompt or response content appears anywhere — every content cell is a `🔒`-gated pointer+hash (D2 §4.4 gated variant, distinct from `⊘` unknown). An unauthorized replay deep-link **resolves to the metadata tier, not an error** (D1 §7 deep-link contract; plan §5 privacy criterion).

---

## 8. Cross-view trust & source coverage matrix (single reference)

Consolidates D2 §8 composition with the JAC-4211 feed list and detector-spec placement.

| View | Badge variant (D2) | Strip role | Legend | Detectors rendered | Primary source feeds (JAC-4211 status) |
|---|---|---|---|---|---|
| 1 Fleet Health | compact, worst-tier rollup | **primary full** | expanded/available | **D1,D2,D5,D6,D8,D9** (info/warning/review) | Paperclip ●, Ringer ●, Hermes ●; strip = full registry |
| 2 Utilization | compact, `·est` on capacity | slim band | collapsed ⓘ | — | Paperclip ● (runs/lane), Ringer ● (max_parallel); Aegis ◐, Codex ○ |
| 3 Spend/Token | inline + standalone total | slim band; provider cross-highlight | collapsed ⓘ | D7 (cache flag) | **Hermes ● native (canonical)**, Paperclip ● native; Claude/Codex/Ringer ◐ est; **Kimi ⊘ GAP**; OmniGent/Pi/OpenCode ⊘ |
| 4 Active Runs | inline per run | slim band | collapsed ⓘ | **D1,D2,D4,D5,D6,D7,D9** + planned-long-run chip | Paperclip ● (runs), Hermes ● (ctx/tokens), Ringer ● (fan-out); Kimi run-level → D9 gap |
| 5 Blockers | inline on relation freshness | slim band | collapsed ⓘ | — | Paperclip ● (blockedBy/blocks) |
| 6 Run/Session Detail+Replay | inline + **🔒 gated** on content | slim band; provider→provenance | collapsed ⓘ | D2/D8/D3 (lineage ties) inline | Ringer ● (lineage), Hermes ● (session usage/handoffs), Claude/Codex ◐ (pointer-only redacted), JAC-3932 replay spine |

---

## 9. Coverage vs. plan acceptance criteria (JAC-4159 §5)

D3 is a design artifact; it demonstrates the wireframes satisfy the design-relevant V1 criteria (build verification is D5's job).

| Plan §5 criterion | How these wireframes satisfy it |
|---|---|
| 2. Six views present | Views 1–6 each wireframed (§2–§7). |
| 3. Trust-tiering visible everywhere | Every metric wrapped by `[B]` badge; `[STRIP]` + `[LEG]` persistent (§1); unreachable adapters (Kimi/OmniGent/Pi/OpenCode) shown `⊘ unknown`, never 0/live. |
| 4. Drill-down works | Agent→Session→Run→Replay via breadcrumb spine + `[NAV→]` on every rollup (§2, §5, §7); routes = D1 §7. |
| 5. Privacy honored | View 6 replay is `🔒`-gated pointer+hash; no raw prompts anywhere; gated deep-link → metadata tier (§7). |
| 6. Completion-first | Detector panels top out at `review`; **no cancel/intervene control** on views 1 or 4; planned-long-run respected (§2, §5). |
| 7. Graceful degradation | `[STATE:partial]` is the default multi-source posture; each view specifies all five §5.3 states; missing field → "unknown" (§1). |
| 8. Spend correctness | View 3 makes native (Hermes/Paperclip) vs estimated (Claude/Codex/Ringer) visually distinct; dedupe caveat noted; Kimi GAP = unknown not $0 (§4). |
| 9. Design-artifact acceptance | This doc (D3) + D1 IA + D2 components complete the signed-off design set for V1 acceptance of the design layer. |

---

## 10. Handoff, non-goals & caveats

**Handoff to D4 ([JAC-4185](/JAC/issues/JAC-4185)):** the fixture dataset should populate every view above and exercise each D2 §9 state-matrix row (≥1 live/stale/est/unreachable/unknown/gated/error per surface) plus at least one finding per detector D1–D9 and one planned-long-run declaration, so the wireframes are demonstrable with data.
**Handoff to D5 ([JAC-4190](/JAC/issues/JAC-4190)):** implement these layouts against D4 mocks then Paperclip+Ringer live feeds; consume D2 components as specified; honor the completion-first (no-intervention) and replay-redaction constraints as **hard requirements**, not styling. D5 is gated behind the [JAC-3929](/JAC/issues/JAC-3929) approval.

**Non-goals (explicit):** no code/build (D5), no component re-design (D2 owns badge/strip/legend appearance), no new IA/nav or routes (D1 owns the spine + §7 route table), no fixture data (D4), no detector implementation or thresholds change (JAC-3933 owns those), no source-adapter emit code (JAC-3931).

**Caveats:**
- **Provisional envelope binding (carried from D1 §9 / D2 §10):** trust-field bindings assume the [JAC-3930](/JAC/issues/JAC-3930) trust triplet *as currently specified*; JAC-3930 v1 freeze is still pending. If freeze renames completeness/provenance/freshness, the badge/strip placements stay but field labels reconcile.
- **Detector-spec is `in_review` (concurrent independent review [JAC-4250](/JAC/issues/JAC-4250)):** detector placements (§2, §5) consume `detector-contract v1.0.0` as authored; if review changes the detector set/stages, the *panels* stay but the specific `[Dn]` badges reconcile. No detector field beyond names/classes/counts/ids is rendered (detector-spec §2.4 privacy inherits contract §3).
- **Source status is a point-in-time fixture:** the JAC-4211 statuses (Kimi GAP; OmniGent/Pi/OpenCode placeholders; Codex last-seen) are the discovery snapshot. The strip is registry-driven, so status is data at render time — the wireframes fix *how* each status renders, not a frozen adapter set.
- **ASCII fidelity:** these are layout/annotation wireframes, not visual comps. Placement, hierarchy, badge/strip/detector/source attachment points, and states are normative; exact spacing, typography, and responsive breakpoints are D5 with D2 tokens.
```
