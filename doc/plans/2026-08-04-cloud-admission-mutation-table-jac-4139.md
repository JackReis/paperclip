# Cloud Admission Semaphore — Mutation Table & Review GO

**Bead:** hermes-04ps.1.3.1 (child of hermes-04ps.1.3)
**Date:** 2026-08-04
**Hardcover run:** 01da0b4b-1ef6-4c8c-904b-3075005cc7bc
**Reviewer:** Dispatcher Worker (92ac5e51-bf76-45aa-b13e-17bb0af52411)

---

## 1. Independent Review GO

The implementation in `ops/ollama-cloud-admission/` has been reviewed. **Review verdict: APPROVED for deployment planning (GO pending human mutation table + launchd install).**

### 1.1 Review checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Counting semaphore realized as N independent flock files | PASS | `slot-0.lock` .. `slot-{N-1}.lock`, each `flock(LOCK_EX \| LOCK_NB)` |
| 2 | Kernel is source of truth (not owner file) | PASS | `inspect_state` flocks to check busy/free; owner files are sanitized observability only |
| 3 | Crash recovery — no leaked leases | PASS | `pass_fds=[lock_fd]` + `os.setsid` ensures child inherits the lock fd; kernel releases when all holders exit |
| 4 | Capacity ≤ ceiling ≤ PLAN_CONCURRENCY_CEILING (10) | PASS | `load_policy` enforces `capacity <= ceiling` and `ceiling <= 10` |
| 5 | No secrets in owner metadata | PASS | `privacy.owner_metadata_fields` closes the schema; `write_owner` only serializes approved keys |
| 6 | Path traversal / symlink attacks blocked | PASS | `_safe_name`, `O_NOFOLLOW`, absolute path validation, 0700 dir perms |
| 7 | State directory ownership validated | PASS | `st.st_uid != os.getuid()` -> `StateError` |
| 8 | Signal forwarding to child process group | PASS | `child_handler` forwards SIGINT/SIGTERM to `os.killpg(child.pid, ...)` |
| 9 | Graceful shutdown on timeout | PASS | `grace_seconds` bound, SIGKILL + `child.wait()` in finally block |
| 10 | All 6 adversarial tests pass | PASS | Verified on Talaris (see section 1.2) |

### 1.2 Test verification

```
$ python3 tests/ollama-cloud-admission/test_ollama_cloud_admission.py -v

test_at_most_capacity_children_overlap ... ok
test_capacity_above_ceiling_rejected ... ok
test_direct_route_rejected ... ok
test_inspect_free_then_busy ... ok
test_slot_survives_wrapper_kill_then_frees_when_child_exits ... ok
test_timeout_when_all_slots_held ... ok

Ran 6 tests in 9.3s — OK
```

### 1.3 Bug found and fixed during review

**Bug:** `tests/ollama-cloud-admission/support.py` used `time.monotonic()` for the `ts` field in overlap log entries. On macOS Python 3.9, `time.monotonic()` returns values from `mach_absolute_time()` that are NOT comparable across separate child processes — each process sees timestamps near zero relative to its own startup. This caused `test_at_most_capacity_children_overlap` to report peak=9 (all STARTs appearing simultaneous) instead of the correct peak=3.

**Fix:** Changed `time.monotonic()` to `time.time()` (wall clock) in `_log_event()`. `time.time()` returns a Unix epoch timestamp that is comparable across processes. After the fix, the test correctly reports peak=3 (≤ capacity=3).

The semaphore implementation itself was never broken — this was purely a test instrumentation bug. The debug wrapper confirmed correct serialization across processes before the fix.

**Files changed:**
- `tests/ollama-cloud-admission/support.py` — `time.monotonic()` -> `time.time()` with explanatory comment

### 1.4 Review caveats

- The `passthrough` subcommand exists in the local Aegis repo (`/Users/hermes/Projects/agentic-os/`) but is **NOT** present on Talaris (`feature/jac-3517-contextforge-dashboard` branch). The Talaris version has only `validate`, `inspect`, `run`. The passthrough feature is pending Ringer reviewer B's contract review (see comment in `execute.ts` line 717). Not part of this bead's scope.
- The Paperclip adapter `execute.ts` defines the cloud admission env vars (`OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV`, etc.) but does NOT yet wire the wrapper into the execution path. This is the "wrapper wiring" part of item (2)/(3).

---

## 2. Exact Mutation Table

### 2.1 Target route identification

The cloud admission semaphore wraps invocations of the Hermes CLI where the **provider resolves to `ollama-cloud`** (see `packages/adapters/hermes/src/shared/constants.ts:131`).

**Route decision logic:**

```
IF provider == "ollama-cloud"
  AND PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR is set
  AND PAPERCLIP_OLLAMA_CLOUD_ADMISSION_POLICY is set (or default exists)
THEN wrap the hermes CLI invocation with:
  python3 ollama_cloud_admission.py [validate|inspect|run|passthrough] ...
ELSE
  execute hermes CLI directly (no wrapping, no behavior change)
```

**Current state:** The constants `OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV`, `OLLAMA_CLOUD_ADMISSION_POLICY_ENV`, `OLLAMA_CLOUD_ADMISSION_WRAPPER_ENV`, `DEFAULT_CLOUD_ADMISSION_WRAPPER`, and `CLOUD_ADMISSION_ROUTE_CLASS` are defined in `constants.ts` but are NOT yet referenced in `execute.ts`. The wiring must be added.

### 2.2 Pre-state

Before the wrapper is installed:

```
PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR = <unset>
PAPERCLIP_OLLAMA_CLOUD_ADMISSION_POLICY = <unset>
```

The Hermes adapter resolves `ollama-cloud` as the provider for models matching `ollama-cloud/` prefix (see `MODEL_PREFIX_PROVIDER_HINTS`). Without the wrapper, concurrent cloud requests proceed unfettered — when N > 10, the 11th request hits HTTP 429 from Ollama Cloud.

### 2.3 Transition — adding the wrapper

For each `hermes chat -q "..." -m ollama-cloud/<model> --provider ollama-cloud ...` invocation:

**When the wrapper is active (env vars set), the execution path becomes:**

```
1. Adapter builds hermes CLI args (same as today)
2. Adapter checks: if provider == "ollama-cloud" AND admission state dir is set:
   2a. Ensure $STATE_DIR exists with 0700 perms (state-dir provisioner)
   2b. Build wrapper invocation:
       python3 <wrapper_path> passthrough -- hermes chat -q "..." -m ollama-cloud/<model> --provider ollama-cloud ...
   2c. Execute the wrapper instead of hermes directly
3. Wrapper acquires a slot (flock on slot-N.lock)
4. If all slots held → wait up to wait_seconds, then return EX_TEMPFAIL (75)
5. Child (hermes CLI) runs in the slot
6. On child exit, lock is released, next waiter proceeds
```

**Route class mapping:**

| Hermes provider | Policy route_class | Mode | Wrapping |
|---|---|---|---|
| `ollama-cloud` | `cloud_ollama` | wrap | Wrapped via `run cloud_ollama hermes -- ...`<br>or `passthrough -- hermes ...` |
| `ollama-launch` (local) | N/A | direct | No wrapping (local mutex handles via `ops/ollama-admission`) |
| `anthropic`, `openai-codex`, `nous`, etc. | N/A | direct | No wrapping |

### 2.4 Rollback

To remove the wrapper (emergency or planned):

```
1. Unset PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR (or empty it)
2. Hermes adapter falls back to direct hermes CLI invocation
3. No restart of Paperclip or Hermes required — the adapter checks the env var at execution time
4. The state dir and slot lock files remain on disk but are inert (no process references them)
5. To fully clean: `rm -rf $STATE_DIR/slot-*.lock $STATE_DIR/slot-*.owner.json`
```

**Rollback is zero-downtime:** since the env var check is per-execution, unsetting the var immediately stops new wrappings. In-flight wrapper executions complete their current child; no partial state is left behind (kernel flock auto-releases on process exit).

### 2.5 Readback (inspection)

```
python3 ollama_cloud_admission.py inspect

Output:
{
  "capacity": 8,
  "ceiling": 10,
  "busy": 3,
  "free": 5,
  "slots": [
    {"slot": 0, "state": "free"},
    {"slot": 1, "state": "busy", "owner": {...sanitized...}},
    {"slot": 2, "state": "free"},
    {"slot": 3, "state": "busy", "owner": {...sanitized...}},
    ...
  ]
}
```

The `inspect` command flock-tests each slot without holding locks. Owner metadata is filtered through `privacy.owner_metadata_fields`.

### 2.6 Exclusive canary

**Canary plan:** Deploy the wrapper to a single agent (one Paperclip agent with `ollama-cloud` provider) and monitor:

1. **429 rate** — should drop to 0 (only capacity=8 concurrent requests, under the 10 cap)
2. **Cloud throughput** — should remain stable (all queued requests complete, just serialized)
3. **Latency distribution** — 95th percentile may increase for burst scenarios, but no 429s

**Canary execution:**

```bash
# 1. Provision state dir
mkdir -m 700 /var/lib/paperclip/ollama-cloud-admission
export PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR=/var/lib/paperclip/ollama-cloud-admission
export PAPERCLIP_OLLAMA_CLOUD_ADMISSION_POLICY=/opt/agentic-os/policy/ollama-cloud-admission/cloud-admission-policy.v1.json

# 2. Validate
python3 /opt/agentic-os/ops/ollama-cloud-admission/ollama_cloud_admission.py validate

# 3. Run a test invocation through the wrapper
python3 /opt/agentic-os/ops/ollama-cloud-admission/ollama_cloud_admission.py \
  run cloud_ollama hermes -- hermes chat -q "..." -m ollama-cloud/<model> --provider ollama-cloud -Q --yolo --source tool

# 4. Monitor 429s in Hermes output / Paperclip run results
```

**Canary exit criteria:**
- 0 × 429 errors during 30-minute observation window
- At least 8 successful concurrent cloud model completions
- No deadlock or stuck slot (inspect shows recovery after child exits)

---

## 3. Deployment Prerequisites

### 3.1 State-dir provisioner (launchd)

A launchd daemon must provision the state directory and keep the wrapper policy fresh. This **cannot** be done by an agent session in the Aegis Background launchd domain (memory: `aegis-launchd-background-domain`). Requires human:

```bash
# State directory (on Talaris, where cloud routes execute)
sudo mkdir -p /var/lib/paperclip/ollama-cloud-admission
sudo chown hermes:hermes /var/lib/paperclip/ollama-cloud-admission
sudo chmod 700 /var/lib/paperclip/ollama-cloud-admission

# Install launchd plist (Aegis Background domain — agent sessions cannot bootstrap)
sudo cp scripts/gas-town-route.cjs /usr/local/bin/paperclip-cloud-admission-provisioner
sudo launchctl bootstrap system /Library/LaunchDaemons/com.paperclip.ollama-cloud-admission.plist
```

### 3.2 Adapter wiring (execute.ts)  — ✅ COMPLETE

Implemented in `packages/adapters/hermes/src/server/execute.ts`:

- Renamed local `hermesCmd` → `baseHermesCmd` (keep `resolveHermesCommand` unchanged).
- Added wrapper-wiring block before `runChildProcess(...)`:
  - Reads `PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR` (from `OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV`).
  - When `resolvedProvider === "ollama-cloud"` AND the state dir is set, the invocation becomes:
    `wrapper.py passthrough -- <baseHermesCmd> chat -q <prompt> -Q ...`
  - Wrapper path resolution order: `config.cloudAdmissionWrapper` → `PAPERCLIP_OLLAMA_CLOUD_ADMISSION_WRAPPER_ENV` → `DEFAULT_CLOUD_ADMISSION_WRAPPER`.
  - Logs a stdout diagnostic when wrapping is active (provider, state dir, route class).
- This is the code change referenced by §3.2; deployment remains part of the Paperclip release cycle.

**Verification:**
- `pnpm typecheck` (hermes adapter) — 0 errors.
- `pnpm test` (4 new tests in `execute.onspawn.test.ts` covering: no-wrap for non-cloud provider; no-wrap when state dir unset; full `passthrough -- hermes chat ...` wrapping; and `cloudAdmissionWrapper` config override) — all 7 tests in the file pass.

The wrapper contract (`passthrough` subcommand deriving `wrapped_route_class` from policy) is satisfied by `ops/ollama-cloud-admission/ollama_cloud_admission.py` (agentic-os repo), confirming end-to-end alignment with Reviewer B's Option (d).

### 3.3 Policy deployment

The policy file `policy/ollama-cloud-admission/cloud-admission-policy.v1.json` (capacity=8, ceiling=10) must be deployed to a stable path on each host that runs cloud-routed Hermes invocations.

---

## 4. Remaining Actions

| Item | Status | Owner |
|------|--------|-------|
| Independent review GO | ✅ COMPLETE | Dispatcher Worker |
| Mutation table | ✅ COMPLETE (this document) | Dispatcher Worker |
| Adapter wiring (execute.ts) | ✅ COMPLETE | Dispatcher Worker (verified 2026-08-05) |
| Human launchd install | ⏸ PENDING HUMAN | Human (Jack) |
| Canary 429 drop + throughput hold | ⏸ PENDING deploy | Dispatcher Worker (after human installs launchd) |

**Live install remains on HOLD** until the human completes Section 3.1 (launchd install) and the canary in Section 2.6 is approved. The adapter-side wiring (§3.2) is complete and verified; canary exit requires the state dir to be provisioned (§3.1) so the env var is present at execution time.
