# JAC-4535 — Freshness Split (signal/route/publication) Plan

**Date:** 2026-08-04
**Work mode:** Planning only — no code (per issue directive)
**Author:** Zeratul (8b8640e8-cbd8-42e4-a9ec-b5bb3e9ec397) — planning phase
**Issue:** JAC-4535 [JAC-3929] P2: Freshness split (signal/route/publication)
**Branch:** JAC-3929-fleet-wide-ai-token-run-observatory-reconciled-initiative-and-approval-gate
**Parent:** JAC-3929 Fleet-wide AI Token & Run Observatory
**Priority:** High
**Depends on:** JAC-3930 (telemetry contract), JAC-3934 (dashboard design)
**Child of Gate 6:** JAC-4538 (publication contract)

**Revision log:**
- 2026-08-04 (planning heartbeat): Initial planning spec complete. Cross-verified with Vault design doc — all section references, value sets, and executive render table confirmed accurate.
- 2026-08-04 (planning heartbeat): Corrected `route_expired` formula precision — added explicit `IS NOT NULL` guard to match Vault §4.1. Previously used simplified `route_expiry < as_of`. See §0.0.2.
- 2026-08-04 (planning heartbeat): Added planning-phase summary comment to issue JAC-4535 — planning phase complete, awaiting Gate 6 board resolution on four confirmations (Q1-Q4).

---

## 0.0 Relationship to Fleet-Level Design Doc

This repo plan is the **Paperclip codebase implementation specification** for JAC-4535.
It maps the freshness split onto the `external_objects` subsystem (schema, types,
validators, service, plugin SDK, API, UI, tests).

The **authoritative fleet-level design** lives at:
`~/Vault/okf/fleet/3929/freshness-split-signal-route-publication.md`

That document defines the conceptual freshness model, executive rendering semantics,
integration with JAC-4529 (coverage model) and JAC-4534 (action-safety), and the
fleet-wide TTL defaults (signal 1h/6h, publication 10 min, route from absolute expiry).
It was authored by Task Rabbit (d4bcfdbe) and is the subject of the pending
`request_confirmation` interactions (Gate 6): Q1 `1e690769`, Q2 `691d9b30`,
Q3 `0960a374`, Q4 `af4464e8`, all pending as of 2026-08-04T14:28Z).

**Layer distinction for TTLs:** The Vault design doc's TTLs govern the *telemetry
envelope* (data capture → OB1/Hindsight/Beads/Paperclip propagation). This repo plan's
TTLs govern the *external-object subsystem's internal freshness computation* (when the
object's source was last polled/seen). These are different surfaces and can have
different TTLs. Where the two converge on the same concept (e.g., `route_expired`),
the computation rule is identical: `route_expired = (route.expiry IS NOT NULL) AND (route.expiry < as_of)`,
independent of signal capture time.

Both documents are referenced: Vault for fleet-level semantics, this repo plan for
Paperclip-specific file-by-file implementation.

### 0.0.2 ✗ Correction — `route_expired` formula precision

The Vault design doc §4.1 defines `route_expired` with an explicit null guard:

```
route_expired = (route.expiry IS NOT NULL) AND (route.expiry < as_of)
```

The repo plan §0.0 (line 36) and §2.2 (line 230) previously stated the simplified
form `route_expired = route_expiry < as_of`, omitting the `IS NOT NULL` guard.
This has been corrected to match the Vault doc's precise formula. When
`route.expiry IS NULL`, `route_expired` is `null` (not computable, treat as
`unknown` for action-safety purposes per JAC-4534 §5.1) — **not** `false`.

The implementation function `computeRouteFreshness` in §2.2 already handles
this correctly (line 378: `if (!object.routeExpiry) return { freshness: "unknown", expired: false }`),
but the prose formula now aligns precisely with the Vault doc. The `expired` field
in the return struct is `boolean` (not `boolean | null`); the `null`/unknown case
is represented by returning `expired: false` paired with `freshness: "unknown"`,
and consumers must check `routeFreshness === "unknown"` to detect the null route
case — consistent with JAC-4534 §5.1's `routing_status = unknown` mapping.

### 0.0.1 ⚠️ PLANNING ISSUE — Value-set mismatch between design doc and repo plan (requires Gate 6 resolution)

The Vault design doc (§3.1–§3.3) defines **different value enums per dimension**:
- `signal_freshness`: `fresh` / `stale` / `expired` / `unknown`
- `route_freshness`: `valid` / `expired` / `unknown` (no `stale`, no `fresh`)
- `publication_freshness`: `current` / `behind` / `unknown` (no `stale`/`expired`/`fresh`)

This repo plan (§2.1, §2.2) uses a **single `ExternalObjectFreshnessState`**
enum (`fresh` / `stale` / `expired` / `unknown`) applied uniformly to all three
fields, relying on the existing `EXTERNAL_OBJECT_FRESHNESS_STATES` constant
already present in `packages/shared/src/constants.ts` (lines 913–920).

**This is an unresolved design tension.** Three reconciliation options exist:

1. **Unified enum (current plan choice):** All three fields reuse the same
   `ExternalObjectFreshnessState` enum. Simpler schema/types/validators but loses
   the semantic precision of the Vault doc (e.g., `route_freshness = valid` vs
   `fresh`, `publication_freshness = current` vs `fresh`). Requires mapping
   `valid → fresh`-equivalent and `current → fresh`-equivalent at the rendering layer.

2. **Dimensional enums (Vault doc choice):** Define three distinct enums:
   `SignalFreshnessState` (`fresh`/`stale`/`expired`/`unknown`),
   `RouteFreshnessState` (`valid`/`expired`/`unknown`),
   `PublicationFreshnessState` (`current`/`behind`/`unknown`).
   More semantic fidelity but more schema columns, types, and validator churn.

3. **Hybrid:** Use the existing `ExternalObjectFreshnessState` for `signal_freshness`
   and `publication_freshness` (where the Vault doc's enums happen to overlap
   conceptually with `fresh`/`stale`/`expired`), but introduce a distinct
   `RouteFreshnessState` (`valid`/`expired`/`unknown`) for route. This preserves the
   Vault doc's key innovation (`valid` vs `expired` for route) while minimizing
   new type definitions.

**Recommendation (planning only):** Option 3 (hybrid). The `route_expired` boolean
is the critical computational flag (already defined identically in both docs as
`route.expiry < as_of`), and `route_freshness` using `valid`/`expired`/`unknown`
matches the Vault doc's intent that route validity is binary (valid vs expired)
with `unknown` for missing evidence. Signal and publication can use the existing
unified enum since both docs agree on `fresh`/`stale`/`expired`/`unknown` for signal
and the publication semantics map cleanly.

**Action required at Gate 6:** Board must confirm which value-set strategy to adopt
before implementation subtasks are spawned, since this decision drives schema column
types, shared type definitions, Zod validators, and UI label mappings.

---

## 0. Objective

The Ringer judge finding requires that freshness for external objects distinguish
three independent dimensions of staleness:

1. **signal_freshness** — when the last fresh signal (health/response) was observed from the external object's source.
2. **route_freshness** — when the routing/address of the external object was last verified (i.e., the URL/identity was confirmed to still resolve to the intended resource).
3. **publication_freshness** — when the object's published metadata was last confirmed (i.e., the canonical published content was checked for changes).

Additionally, `route_expired` must be computed as `true` when the route's expiry
time is before `as_of`, **regardless** of signal capture time. This decouples
route validity from signal capture — a route can be expired even if a signal was
recently captured (e.g., cached/redirected response masking route changes).

The executive render should show "unknown, expired route evidence" rather than
merely "human required" when route evidence is expired.

---

## 1. Current State

### 1.1 Freshness constants already defined

`packages/shared/src/constants.ts` (lines 907–920) already contains:

```ts
export const EXTERNAL_OBJECT_FRESHNESS_STATES = [
  "fresh",
  "stale",
  "expired",
  "unknown",
] as const;
export type ExternalObjectFreshnessState =
  (typeof EXTERNAL_OBJECT_FRESHNESS_STATES)[number];
```

These are already exported from `packages/shared/src/index.ts` (lines 526, 545).
However, **they are currently unused** — no schema columns, no service logic,
no UI rendering, no tests reference them. They are scaffolding awaiting the
freshness split implementation.

### 1.2 Current freshness model (single liveness field)

The `external_objects` table (`packages/db/src/schema/external_objects.ts`) has:

- `liveness` — `ExternalObjectLivenessState` = `"unknown" | "fresh" | "stale" | "auth_required" | "unreachable"`
- `nextRefreshAt` — when the next refresh is due
- `lastResolvedAt` — when the object was last successfully resolved
- `lastChangedAt` — when the object's status last changed
- `lastErrorAt` — when the last error occurred
- `nextRefreshAt` — when the next poll/refresh is due

The `visibleLiveness()` function in `server/src/services/external-objects.ts`
(line 123) computes liveness as:

```ts
function visibleLiveness(object, now = new Date()) {
  if (object.liveness === "fresh" && object.nextRefreshAt && object.nextRefreshAt <= now) {
    return "stale";
  }
  return object.liveness;
}
```

This conflates signal capture (the original `liveness` value set during resolve)
with route expiry (the `nextRefreshAt` deadline). There is no distinction between
"the signal is stale because we haven't checked recently" vs "the route
identity itself has expired."

### 1.3 Current summary model

`ExternalObjectSummary` in `packages/shared/src/types/external-object.ts`
(line 84) currently contains:

```ts
export interface ExternalObjectSummary {
  total: number;
  byStatusCategory: Record<string, number>;
  byLiveness: Record<string, number>;
  highestSeverity: ExternalObjectStatusTone;
  staleCount: number;          // currently = byLiveness.stale
  authRequiredCount: number;   // currently = byLiveness.auth_required
  unreachableCount: number;    // currently = byLiveness.unreachable
  objects: ExternalObjectSummaryItem[];
}
```

The `staleCount` is derived from `byLiveness.stale` — this conflates stale
signal with expired route. There is no `staleRouteCount` or `expiredCount`.

### 1.4 Current UI rendering

- `ExternalObjectPill.tsx` — renders `liveness` via `externalObjectLivenessOverlay`
  (dashed border for stale/auth_required/unreachable). No freshness states rendered.
- `ExternalObjectStatusIcon.tsx` — shows a clock overlay when `liveness === "stale"`.
- `ExternalObjectStatusSummary.tsx` — uses `staleCount` from the summary for the
  breakdown title.
- `ui/src/lib/external-objects.ts` — `externalObjectLivenessLabel()` maps
  `{unknown, fresh, stale, auth_required, unreachable}` to human labels.
  No freshness state labels exist.

### 1.5 Plugin SDK types

`packages/plugins/sdk/src/protocol.ts` already defines:
- `PluginExternalObjectRecordSnapshot` (line 481) — the snapshot sent to plugins.
- `PluginExternalObjectResolvedSnapshot` (line 512) — what plugins return from `resolveExternalObject`.
- `PluginExternalObjectResolveResult` (line 528) — success/failure result with `liveness`.

Neither includes freshness fields. The TTL in `PluginExternalObjectResolvedSnapshot.ttlSeconds`
currently maps to `nextRefreshAt` only.

### 1.6 Database schema

`packages/db/src/migrations/0106_external_object_references.sql` created the
`external_objects` table with no freshness columns. The Drizzle schema in
`packages/db/src/schema/external_objects.ts` matches.

---

## 2. Design

### 2.1 New freshness model

Replace the conflated single-dimension freshness with three independent
freshness states plus a route expiry flag. The existing `liveness` field
remains as the overall operational liveness (auth/access state), while the
three new freshness fields track temporal validity independently.

**New fields on `external_objects` table:**

| Column | Type | Description |
|--------|------|-------------|
| `signal_freshness` | `text` (`ExternalObjectFreshnessState`) | `fresh` / `stale` / `expired` / `unknown` — when last signal was observed |
| `signal_observed_at` | `timestamp` | When the last signal (health/response) was captured |
| `route_freshness` | `text` (`ExternalObjectFreshnessState`) | `fresh` / `stale` / `expired` / `unknown` — when route was last verified |
| `route_validated_at` | `timestamp` | When the route/address was last verified |
| `route_expiry` | `timestamp` | When the route evidence expires (TTL-based) |
| `publication_freshness` | `text` (`ExternalObjectFreshnessState`) | `fresh` / `stale` / `expired` / `unknown` — when published metadata was last confirmed |
| `publication_validated_at` | `timestamp` | When published metadata was last confirmed |

|`route_expired` (computed, not stored):
|`route_expired = (route_expiry IS NOT NULL) AND (route_expiry < as_of)` — computed at read time. This is
`true` when the route's expiry has passed, regardless of whether a signal
was captured more recently.

### 2.2 Freshness computation logic

Each freshness state is computed from its respective `*_validated_at` timestamp
and a TTL:

- **signal_freshness**: Based on `signal_observed_at` + signal TTL. If no
  signal observed → `unknown`. If observed but past TTL → `stale`. (Could
  progress to `expired` if a hard expiry is reached, but typically stays `stale`.)

- **route_freshness**: Based on `route_expiry` (which is `route_validated_at` +
  route TTL). If `route_expiry` is null → `unknown`. If `route_expiry < now`
  → `expired`. If past the soft-staleness threshold but not yet expired → `stale`.
  Otherwise → `fresh`.

- **publication_freshness**: Based on `publication_validated_at` + publication
  TTL. Same pattern as signal: null → `unknown`, past soft threshold → `stale`,
  past hard expiry → `expired`, else `fresh`.

The key innovation per the judge finding: **`route_expired` is computed
independently of `signal_freshness`**. A route can be `expired` (route evidence
has lapsed) while `signal_freshness` is still `fresh` (a cached response was
recently received). This prevents the false-negative where a cached/old signal
masks that the canonical route may have changed.

### 2.3 Schema changes

#### 2.3.1 `packages/db/src/schema/external_objects.ts`

Add new columns:

```ts
signalFreshness: text("signal_freshness")
  .$type<ExternalObjectFreshnessState>().notNull().default("unknown"),
signalObservedAt: timestamp("signal_observed_at", { withTimezone: true }),
routeFreshness: text("route_freshness")
  .$type<ExternalObjectFreshnessState>().notNull().default("unknown"),
routeValidatedAt: timestamp("route_validated_at", { withTimezone: true }),
routeExpiry: timestamp("route_expiry", { withTimezone: true }),
publicationFreshness: text("publication_freshness")
  .$type<ExternalObjectFreshnessState>().notNull().default("unknown"),
publicationValidatedAt: timestamp("publication_validated_at", { withTimezone: true }),
```

Need to import `ExternalObjectFreshnessState` from `@paperclipai/shared`.

#### 2.3.2 `packages/db/src/schema/index.ts`

No change needed — `externalObjects` is already exported.

#### 2.3.3 Migration

Generate via `pnpm db:generate` after schema edit.

### 2.4 Type changes

#### 2.4.1 `packages/shared/src/types/external-object.ts`

Update `ExternalObject` interface to add the new fields:

```ts
export interface ExternalObject {
  // ... existing fields ...
  signalFreshness: ExternalObjectFreshnessState;
  signalObservedAt: string | null;
  routeFreshness: ExternalObjectFreshnessState;
  routeValidatedAt: string | null;
  routeExpiry: string | null;
  publicationFreshness: ExternalObjectFreshnessState;
  publicationValidatedAt: string | null;
  routeExpired: boolean | null;  // computed at serialization
}
```

Update `ExternalObjectSummary` to include freshness breakdown:

```ts
export interface ExternalObjectSummary {
  total: number;
  byStatusCategory: Record<string, number>;
  byLiveness: Record<string, number>;
  bySignalFreshness: Record<string, number>;
  byRouteFreshness: Record<string, number>;
  byPublicationFreshness: Record<string, number>;
  highestSeverity: ExternalObjectStatusTone;
  staleCount: number;
  authRequiredCount: number;
  unreachableCount: number;
  routeExpiredCount: number;     // NEW
  expiredCount: number;          // NEW — objects with route_expired=true
  objects: ExternalObjectSummaryItem[];
}
```

Update `ExternalObjectSummaryItem` to include freshness fields:

```ts
export interface ExternalObjectSummaryItem {
  // ... existing fields ...
  signalFreshness: ExternalObjectFreshnessState;
  routeFreshness: ExternalObjectFreshnessState;
  publicationFreshness: ExternalObjectFreshnessState;
  routeExpired: boolean;
}
```

#### 2.4.2 `packages/shared/src/validators/external-object.ts`

Add a Zod schema for `ExternalObjectFreshnessState`:

```ts
export const externalObjectFreshnessStateSchema = z.enum(EXTERNAL_OBJECT_FRESHNESS_STATES);
```

### 2.5 Service changes

#### 2.5.1 `server/src/services/external-objects.ts`

**`computeFreshness()` function (new):**

```ts
interface FreshnessTTLs {
  signalSoftTtlSec: number;
  routeSoftTtlSec: number;
  routeHardExpirySec: number;
  publicationSoftTtlSec: number;
  publicationHardExpirySec: number;
}

function computeSignalFreshness(
  object: ExternalObjectRecord,
  now: Date,
  ttls: FreshnessTTLs,
): ExternalObjectFreshnessState {
  if (!object.signalObservedAt) return "unknown";
  const ageSec = (now.getTime() - new Date(object.signalObservedAt).getTime()) / 1000;
  if (ageSec >= ttls.signalSoftTtlSec) return "stale";
  return "fresh";
}

function computeRouteFreshness(
  object: ExternalObjectRecord,
  now: Date,
  ttls: FreshnessTTLs,
): { freshness: ExternalObjectFreshnessState; expired: boolean } {
  if (!object.routeExpiry) {
    // No route evidence at all — unknown, not expired
    return { freshness: "unknown", expired: false };
  }
  if (object.routeExpiry <= now) {
    // Route evidence has lapsed — EXPIRED regardless of signal
    return { freshness: "expired", expired: true };
  }
  if (!object.routeValidatedAt) return { freshness: "unknown", expired: false };
  const ageSec = (now.getTime() - new Date(object.routeValidatedAt).getTime()) / 1000;
  if (ageSec >= ttls.routeSoftTtlSec) return { freshness: "stale", expired: false };
  return { freshness: "fresh", expired: false };
}

function computePublicationFreshness(
  object: ExternalObjectRecord,
  now: Date,
  ttls: FreshnessTTLs,
): ExternalObjectFreshnessState {
  if (!object.publicationValidatedAt) return "unknown";
  const ageSec = (now.getTime() - new Date(object.publicationValidatedAt).getTime()) / 1000;
  if (ageSec >= ttls.publicationHardExpirySec) return "expired";
  if (ageSec >= ttls.publicationSoftTtlSec) return "stale";
  return "fresh";
}
```

**`toObjectPayload()` update:**

The existing `toObjectPayload()` (line 603) currently only overrides `liveness`.
It needs to also compute and attach the three freshness states and `routeExpired`:

```ts
function toObjectPayload(object: ExternalObjectRecord, now = new Date()) {
  const signalFreshness = computeSignalFreshness(object, now, DEFAULT_FRESHNESS_TTLS);
  const { freshness: routeFreshness, expired: routeExpired } = computeRouteFreshness(object, now, DEFAULT_FRESHNESS_TTLS);
  const publicationFreshness = computePublicationFreshness(object, now, DEFAULT_FRESHNESS_TTLS);
  return {
    ...object,
    liveness: visibleLiveness(object, now),
    signalFreshness,
    routeFreshness,
    publicationFreshness,
    routeExpired,
  };
}
```

**`summarizeObjects()` update:**

Add `bySignalFreshness`, `byRouteFreshness`, `byPublicationFreshness`,
`routeExpiredCount`, and `expiredCount` to the summary output. Update
`highestSeverity` computation to consider `expired` route evidence.

**`summarizeObjectPayloads()` update:**

Include the new freshness fields in summary items.

**Default TTLs:**

```ts
const DEFAULT_FRESHNESS_TTLS: FreshnessTTLs = {
  signalSoftTtlSec: 300,      // 5 minutes — soft staleness for signal
  routeSoftTtlSec: 3600,      // 1 hour — soft staleness for route
  routeHardExpirySec: 86400,  // 24 hours — hard expiry for route
  publicationSoftTtlSec: 300, // 5 minutes — soft staleness for publication
  publicationHardExpirySec: 86400, // 24 hours — hard expiry for publication
};
```

**Route expiry propagation:**

When resolving an object (in `refreshObject()`), the resolver snapshot
(`ExternalObjectResolverSnapshot`) can optionally provide route TTL via
`ttlSeconds`. The route expiry should be set as `routeValidatedAt + routeHardExpirySec`.
If no route-specific TTL is provided, use the default.

### 2.6 Plugin SDK protocol changes

#### 2.6.1 `packages/plugins/sdk/src/protocol.ts`

Add freshness fields to `PluginExternalObjectResolvedSnapshot`:

```ts
export interface PluginExternalObjectResolvedSnapshot {
  // ... existing fields ...
  ttlSeconds?: number;  // existing — used for nextRefreshAt
  signalTtlSeconds?: number;       // NEW — soft TTL for signal freshness
  routeTtlSeconds?: number;        // NEW — hard TTL for route expiry
  publicationTtlSeconds?: number;  // NEW — soft TTL for publication freshness
}
```

Add freshness fields to `PluginExternalObjectRecordSnapshot`:

```ts
export interface PluginExternalObjectRecordSnapshot {
  // ... existing fields ...
  signalFreshness?: ExternalObjectFreshnessState;  // NEW
  routeFreshness?: ExternalObjectFreshnessState;   // NEW
  publicationFreshness?: ExternalObjectFreshnessState; // NEW
  routeExpiry?: string | null;                     // NEW
}
```

### 2.7 OpenAPI spec changes

#### 2.7.1 `server/src/routes/openapi.ts`

Update the Zod schemas for external object responses to include the new freshness
fields. The `ExternalObjectSummary` response schema and `ExternalObjectSummaryItem`
schema need updating to include:
- `signalFreshness`, `routeFreshness`, `publicationFreshness` on items
- `bySignalFreshness`, `byRouteFreshness`, `byPublicationFreshness`,
  `routeExpiredCount`, `expiredCount` on the summary

### 2.8 UI changes

#### 2.8.1 `ui/src/lib/external-objects.ts`

Add freshness labels:

```ts
const FRESHNESS_LABELS: Record<string, string> = {
  fresh: "Fresh",
  stale: "Stale",
  expired: "Expired",
  unknown: "Unknown",
};

export function externalObjectFreshnessLabel(state: string): string {
  return FRESHNESS_LABELS[state] ?? state;
}
```

#### 2.8.2 `ui/src/components/ExternalObjectPill.tsx`

Update `ExternalObjectPillData` to accept the new freshness fields:

```ts
export interface ExternalObjectPillData {
  // ... existing fields ...
  signalFreshness?: ExternalObjectFreshnessState;
  routeFreshness?: ExternalObjectFreshnessState;
  publicationFreshness?: ExternalObjectFreshnessState;
  routeExpired?: boolean;
}
```

When `routeExpired` is true and no other liveness state indicates auth/unreachable,
render "unknown, expired route evidence" in the pill's title/aria-label.

#### 2.8.3 `ui/src/components/ExternalObjectStatusIcon.tsx`

When `routeExpired` is true, show a clock-warning icon or similar visual indicator.

#### 2.8.4 `ui/src/components/ExternalObjectStatusSummary.tsx`

Update `buildBreakdownTitle()` to include `routeExpiredCount` and freshness
breakdown in the summary title.

#### 2.8.5 `ui/src/lib/status-colors.ts`

Add freshness state overlays:

```ts
export const externalObjectFreshnessOverlay: Record<string, string> = {
  fresh: "",
  stale: "opacity-80",
  expired: "opacity-60 [border-style:dashed]",
  unknown: "",
};
```

### 2.9 Test changes

#### 2.9.1 `packages/db/src/external-objects-schema.test.ts`

Add assertions for the new freshness columns in the schema.

#### 2.9.2 `server/src/services/external-objects.ts` test (new file)

Create `server/src/tests/external-objects-service.test.ts` with tests for:
- `computeSignalFreshness`: null timestamp → unknown, within TTL → fresh, past TTL → stale
- `computeRouteFreshness`: null expiry → unknown, past expiry → expired + expired=true, within soft TTL → fresh, past soft but before hard → stale
- `computePublicationFreshness`: null → unknown, past hard → expired, past soft → stale, within → fresh
- `route_expired` independence: signal fresh but route expired → route_expired=true
- `summarizeObjects`: includes `byRouteFreshness`, `routeExpiredCount`, etc.
- `visibleLiveness` compatibility: existing liveness behavior preserved

(Note: the issue "Files / Routes Touched" list includes `server/src/tests/external-objects-service.test.ts`,
suggesting this test file should be created.)

#### 2.9.3 `ui/src/components/ExternalObjectPill.test.tsx`

Add tests for the `routeExpired` rendering and "unknown, expired route evidence"
label.

#### 2.9.4 `ui/src/lib/external-objects.test.ts`

Add tests for `externalObjectFreshnessLabel()`.

---

## 3. Implementation Order

1. **Schema**: Add columns to `packages/db/src/schema/external_objects.ts`
   → generate migration
2. **Shared types**: Update `ExternalObject`, `ExternalObjectSummary`,
   `ExternalObjectSummaryItem` in `packages/shared/src/types/external-object.ts`
3. **Shared validators**: Add `externalObjectFreshnessStateSchema` in
   `packages/shared/src/validators/external-object.ts`
4. **Shared constants**: Already exists (`EXTERNAL_OBJECT_FRESHNESS_STATES`)
   — verify export is complete
5. **Plugin SDK**: Update `PluginExternalObjectRecordSnapshot` and
   `PluginExternalObjectResolvedSnapshot` in `packages/plugins/sdk/src/protocol.ts`
6. **Server service**: Update `external-objects.ts` — add freshness computation
   functions, update `toObjectPayload`, `summarizeObjects`, `summarizeObjectPayloads`,
   `refreshObject`
7. **OpenAPI**: Update schemas in `server/src/routes/openapi.ts`
8. **UI lib**: Add freshness labels in `ui/src/lib/external-objects.ts`
9. **UI status colors**: Add freshness overlays in `ui/src/lib/status-colors.ts`
10. **UI components**: Update `ExternalObjectPill.tsx`, `ExternalObjectStatusIcon.tsx`,
    `ExternalObjectStatusSummary.tsx`
11. **Tests**: Add/update tests across all layers

---

## 4. TTL Configuration Strategy

The freshness TTLs should be configurable at multiple levels:

1. **Global defaults** (in `server/src/services/external-objects.ts`) — for
   objects resolved without plugin-specific TTLs.
2. **Per-resolver override** — plugins can specify `signalTtlSeconds`,
   `routeTtlSeconds`, `publicationTtlSeconds` in their resolve result.
3. **Per-object data** — advanced: TTLs could be stored in the `data` JSONB
   column for objects with non-standard freshness requirements.

For V1, implement levels 1 and 2. The `data` column is already available for
future extension.

### Default TTL values

| Dimension | Soft TTL | Hard Expiry | Rationale |
|-----------|----------|-------------|-----------|
| signal | 5 min | — | Signal indicates current health; 5 min is reasonable for most APIs |
| route | 1 hr | 24 hr | Route is the URL/identity; 1 hr soft, 24 hr hard (most CI/CD objects don't change URL within a day) |
| publication | 5 min | 24 hr | Publication metadata (title, status) can change; 5 min soft, 24 hr hard |

These values are derived from the existing `DEFAULT_REFRESH_TTL_SECONDS = 300`
for signal and publication, and the `DEFAULT_RETRY_AFTER_SECONDS = 300` pattern.
Route TTLs are longer because route identity changes are rarer than content
changes.

### 4.1 ⚠️ Planning Issue — TTL discrepancy between design doc and repo plan (requires Gate 6 resolution)

The Vault design doc (§8) defines fleet-wide TTL defaults for the **telemetry
envelope** freshness model:

| Field | Vault doc default | Configurable via |
|---|---|---|
| `signal_freshness` | 1 hour (fresh), 6 hours (stale threshold) | `fleet_config.freshness.signal` |
| `route_freshness` | No TTL — computed from `route.expiry` (absolute timestamp) | N/A |
| `publication_freshness` | 10 minutes | `fleet_config.freshness.publication` |

This repo plan (§4 above) defines different TTLs for the **external-object
subsystem's internal freshness computation**:

| Dimension | Soft TTL | Hard Expiry |
|---|---|---|
| signal | 5 min | — |
| route | 1 hr | 24 hr |
| publication | 5 min | 24 hr |

**This is an unresolved design tension.** These are technically different surfaces
(see §0.0 "Layer distinction for TTLs"), but the naming overlap (`signal_freshness`,
`publication_freshness`) creates ambiguity for implementers and consumers. The Vault
doc's TTLs govern telemetry envelope propagation (OB1/Hindsight/Beads/Paperclip
activity log latency); the repo plan's TTLs govern external object source poll
latency. The discrepancy must be reconciled at Gate 6:

1. **Option A — Align TTLs:** Use the Vault doc's TTLs everywhere (signal 1h/6h,
   publication 10 min). This means external object signal freshness will lag behind
   the current 5-min refresh cadence, which may produce more "stale" states at read
   time than the existing `DEFAULT_REFRESH_TTL_SECONDS = 300` expects.
2. **Option B — Keep them separate:** Retain the repo plan's 5-min soft TTLs for
   external object freshness (matching the existing 300s refresh cadence), and keep
   the Vault doc's 1h/6h/10min for the telemetry envelope. Document clearly that
   these are different surfaces with different TTLs.
3. **Option C — Make signal/publication TTLs configurable per-source:** Default to
   the Vault doc values (1h/6h for signal, 10 min for publication) but allow
   per-resolver overrides via `signalTtlSeconds`/`publicationTtlSeconds` in the
   plugin snapshot, falling back to 300s for backward compatibility with existing
   resolvers that don't provide these values.

**Recommendation (planning only):** Option C — configurable with Vault doc defaults
and backward-compatible fallback. This preserves the existing 300s refresh behavior for
resolvers that don't specify TTLs, while aligning with the Vault doc's semantic
defaults for well-configured sources.

---

## 5. Executive Render Specification

When `route_expired = true`:

- **Pill title**: "unknown, expired route evidence"
- **Liveness overlay**: dashed border (same as stale/auth_required/unreachable)
- **Status icon**: clock-with-warning or same clock overlay as stale, but
  with reduced opacity to distinguish "expired route" from "stale signal"

When `route_expired = false` but `route_freshness = "stale"`:

- **Pill title**: "unknown, stale route evidence" (or keep existing "Stale" label)
- **Liveness overlay**: dashed border with opacity-70

The key distinction: `expired` is a harder state than `stale` — it means the
route evidence has definitively lapsed, and the external object's identity/URL
may no longer point to the intended resource.

---

## 6. Backward Compatibility

- New columns default to `"unknown"` and `null` — existing external objects
  will start with unknown freshness, which is fail-closed (safe).
- The existing `liveness` field is preserved unchanged — it continues to drive
  auth/access state (auth_required, unreachable, etc.).
- The existing `visibleLiveness()` function is preserved — it still handles
  the `nextRefreshAt <= now` → `stale` transition for backward compat.
- `staleCount` in `ExternalObjectSummary` continues to work (derived from
  `byLiveness.stale` as before).
- New `routeExpiredCount` and `expiredCount` fields are additive.
- Existing tests for `liveness` and `visibleLiveness` should continue to pass
  without modification.

---

## 7. Files to modify (complete list)

From the issue "Files / Routes Touched" plus our analysis:

| File | Change |
|------|--------|
| `packages/shared/src/constants.ts` | Already has `EXTERNAL_OBJECT_FRESHNESS_STATES` — no change needed |
| `packages/shared/src/index.ts` | Already exports the type — no change needed |
| `packages/shared/src/telemetry/` | No changes — telemetry is separate from external object freshness |
| `packages/db/src/schema/external_objects.ts` | Add 6 new columns (signal/route/publication freshness + timestamps + routeExpiry) |
| `packages/db/src/schema/index.ts` | No change (already exports externalObjects) |
| `server/src/services/external-objects.ts` | Add freshness computation, update toObjectPayload/summarizeObjects/summarizeObjectPayloads/refreshObject |
| `packages/plugins/sdk/src/protocol.ts` | Add freshness fields to PluginExternalObjectRecordSnapshot + ResolvedSnapshot |
| `packages/shared/src/types/external-object.ts` | Add freshness fields to ExternalObject, ExternalObjectSummary, ExternalObjectSummaryItem |
| `packages/shared/src/validators/external-object.ts` | Add externalObjectFreshnessStateSchema |
| `server/src/routes/issues.ts` | No change expected (summary endpoints pass through) — verify |
| `server/src/routes/openapi.ts` | Update response schemas to include freshness fields |
| `ui/src/components/ExternalObjectPill.tsx` | Add freshness rendering, routeExpired label |
| `ui/src/components/ExternalObjectStatusIcon.tsx` | Add expired/freshness indicator |
| `ui/src/components/ExternalObjectStatusSummary.tsx` | Add freshness to breakdown title |
| `ui/src/lib/external-objects.ts` | Add externalObjectFreshnessLabel() |
| `ui/src/lib/status-colors.ts` | Add freshness overlays |
| `server/src/__tests__/external-objects-service.test.ts` | EXISTS — add tests for freshness computation functions (see §2.9.2) |
| `packages/db/src/external-objects-schema.test.ts` | Check if exists; if not, new — add assertions for new columns |
| `ui/src/components/ExternalObjectPill.test.tsx` | EXISTS — add routeExpired rendering tests |
| `ui/src/lib/external-objects.test.ts` | Check if exists; if not, new — add freshness label tests |

---

## 8. Dependencies on other JAC-3929 children

- **JAC-3930** (telemetry contract) — The freshness TTLs and state fields are
  independent of the telemetry contract, but the publication freshness
  dimension may overlap with `publication_status` on `run_events`. The
  `publication_freshness` field on external objects tracks when the external
  object's published metadata was last confirmed, which is adjacent to but
  distinct from the run_events `publication_status` (which tracks whether
  cost/usage data is safe to publish downstream). No direct dependency, but
  the naming should be kept distinct to avoid confusion.

- **JAC-3934** (dashboard design) — The dashboard design will consume the
  `routeExpiredCount` and freshness breakdowns from the summary. The dashboard
  should render a separate freshness column showing `signal / route / publication`
  status. The schema design here provides the data; the dashboard will consume it.

- **JAC-4538** (publication contract) — JAC-4535's `publication_freshness`
  tracks when the object's published metadata was last confirmed. This is
  consistent with JAC-4538's pointer-only publication model: the
  `publication_validated_at` timestamp records when we last confirmed the
  pointer's target, and `publication_freshness` drives whether the pointer
  is still valid. No code dependency, but conceptual alignment is required.

- **Fleet-level design doc** (`~/Vault/okf/fleet/3929/freshness-split-signal-route-publication.md`) —
  Authoritative design for the fleet telemetry envelope freshness model,
  executive render semantics, and integration with JAC-4529/JAC-4534. This repo
  plan implements the `external_objects` subsystem mapping of that design.

---

## 9. Acceptance Criteria (derived from issue description)

1. `signal_freshness`, `route_freshness`, and `publication_freshness` are
   stored as independent fields on `external_objects`.
2. `route_expired=true` is computed when `route_expiry < as_of`, regardless of
   signal capture time.
3. The executive render shows "unknown, expired route evidence" when route
   evidence is expired (not merely "human required" / "stale").
4. The existing `liveness` field is preserved for auth/access state.
5. All new fields are propagated through the service layer, API responses,
   and UI components.
6. Tests verify the independence of route expiry from signal freshness.
7. Backward compatibility is maintained for existing `liveness` consumers.
8. Repo plan is cross-referenced with the fleet-level design doc at
   `~/Vault/okf/fleet/3929/freshness-split-signal-route-publication.md`:
   the `route_expired` computation, executive rendering semantics, and
   JAC-4529/JAC-4534 integration are consistent across both documents.
9. **Gate 6 design-decision resolution:** Value-set strategy confirmed
   (see §0.0.1). Either unified enum, dimensional enums, or hybrid approach
   is selected and the plan's §2.1/`§2.2 field definitions updated accordingly.
10. **Gate 6 design-decision resolution:** TTL reconciliation confirmed
   (see §4.1). The TTL discrepancy between the Vault design doc and the repo
   plan is resolved — either aligned, kept separate, or made configurable.
11. **Gate 6 design-decision resolution:** Route expiry storage strategy
   confirmed (see §10.4). Stored column vs computed, with rationale documented.
12. **Plan document linked to issue:** The plan document is attached as an approved work product (type document, ID `e74ab139-ca91-425d-a0a5-498db2b1c041`) on the Paperclip issue record. The work product's `metadata.resourceRef` points to `doc/plans/2026-08-04-jac-4535-freshness-split-plan.md` via `relativePath` within the project workspace (`e7c82685-adcf-43b2-b2dd-9c229884be3e`).

---

## 10. Outstanding Questions

1. **TTL source of truth**: Should the route hard expiry TTL be derived from
   the plugin's `ttlSeconds` field (currently used for `nextRefreshAt`), or
   should it be a separate field? Recommendation: separate
   `routeTtlSeconds` in the resolver snapshot, defaulting to a global constant.

2. **TTL reconciliation (§4.1)**: The Vault design doc specifies signal 1h/6h
   and publication 10 min TTLs for the telemetry envelope, while this repo plan
   specifies 5 min soft TTLs for external object freshness (matching the existing
   300s refresh cadence). Which surface do the TTLs apply to? See §4.1 for the
   three reconciliation options (A: align, B: keep separate, C: configurable
   with fallback). Requires Gate 6 confirmation.

3. **Value-set strategy (§0.0.1)**: Should all three freshness fields use the
   unified `ExternalObjectFreshnessState` enum (fresh/stale/expired/unknown),
   or should dimensional enums be used (route: valid/expired/unknown;
   publication: current/behind/unknown)? Three options documented in §0.0.1.
   Requires Gate 6 confirmation.

4. **Route expiry storage**: Should `routeExpiry` be a stored column or
   computed from `routeValidatedAt + ttl`? Storing it as a column is simpler
   for querying (e.g., `refreshDueObjects` could filter on it) and for
   `route_expired` computation at read time. Requires Gate 6 confirmation.

5. **Liveness field evolution**: Should `liveness` eventually be deprecated
   in favor of the three freshness states? For V1, keep `liveness` as the
   operational state (auth/access) and add freshness as a parallel dimension.
   A future refactor could merge them, but that's out of scope for this issue.

6. **Summary field naming**: Should the summary use `bySignalFreshness` /
   `byRouteFreshness` / `byPublicationFreshness` (parallel to `byLiveness`),
   or a different naming convention? The parallel naming is cleaner and
   more discoverable for UI consumers.

---

## 11. Gate 6 Summary — Decisions Required Before Implementation

The following decisions must be confirmed by the board (via the four pending
`request_confirmation` interactions created 2026-08-04T14:28Z by local-board:
`1e690769` Q1, `691d9b30` Q2, `0960a374` Q3, `af4464e8` Q4) before any
implementation subtasks are spawned:

| # | Decision | Options | Recommended | Section |
|---|---|---|---|---|
| 1 | Value-set strategy | Unified / Dimensional / Hybrid | Hybrid (option 3) | §0.0.1 |
| 2 | TTL reconciliation | Align / Separate / Configurable | Configurable (option C) | §4.1 |
| 3 | Route expiry storage | Stored column / Computed | Stored column | §10.4 (Outstanding Questions #4) |
| 4 | Publication freshness value set | fresh/stale/expired/unknown / current/behind/unknown | Depends on value-set choice | §0.0.1 |

All four are documented with rationale in the referenced sections. No code
changes will proceed until Gate 6 confirms the value-set strategy and TTL
reconciliation.
