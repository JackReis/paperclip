# Mutation Table: ollama-cloud Admission Semaphore

**Date:** 2026-08-04
**Issue:** hermes-04ps.1.3.1 (Wire + deploy the cloud admission semaphore)
**Ringer Review:** ollama-admission-dual-review-20260728-20260728T144534Z-p14535
**Reviewer B (DeepSeek) Verdict:** REJECT — wiring contract mismatch
**Reviewer A (Gemini) Verdict:** APPROVE — admission-safety invariants are correct

---

## 1. Rejection Summary

Reviewer B found that the admission wrappers (`ollama_admission.py`,
`ollama_cloud_admission.py`) could not be used as drop-in replacements for
the `hermes` binary via `config.hermesCommand`, because the invocation
contracts did not match:

| Layer | Protocol | Example |
|-------|----------|---------|
| Paperclip Hermes adapter (`execute.ts`) | `hermes chat -q "..." -Q -m MODEL --provider PROVIDER` | `hermes chat -q "prompt" -Q -m deepseek-v4-flash --provider ollama-cloud` |
| Cloud wrapper `run` subcommand (expected) | `run <route_class> <command_basename> -- <child_argv>` | `ollama_cloud_admission.py run cloud_ollama hermes -- /path/to/hermes chat -q "..."` |

The `run` subcommand dispatches on `argv[1]`, which in the adapter's output
is `chat` — an unknown subcommand, resulting in a usage error.

## 2. Selected Fix: Option (d) — `passthrough` Subcommand

Added a `passthrough` subcommand to **both** admission wrappers. It:

1. Admits under the policy's `wrapped_route_class` (no explicit route_class needed
   in argv — the route class is determined by the policy, not by the caller).
2. Accepts the child argv (with or without `--` separator).
3. Execs the child binary directly, inheriting the admission slot's file
   descriptors (lock fd passed via `pass_fds` on Unix).

### Usage

```
ollama_cloud_admission.py passthrough [--] <argv>...
ollama_admission.py passthrough [--] <argv>...
```

Examples:
```
# Without -- separator (common for Paperclip adapter wiring):
ollama_cloud_admission.py passthrough /path/to/hermes chat -q "..." -Q

# With -- separator (POSIX convention):
ollama_cloud_admission.py passthrough -- /path/to/hermes chat -q "..." -Q
```

## 3. Mutation Table

| File | Change | Rationale |
|------|--------|-----------|
| `ops/ollama-cloud-admission/ollama_cloud_admission.py` | Added `passthrough` subcommand to `main()`; updated `_usage()` | Drop-in hermes replacement for `hermes-04ps.1.3.1` cloud admission |
| `ops/ollama-admission/ollama_admission.py` | Added `passthrough` subcommand to `main()`; updated `_usage()` | Same contract fix for local admission wrapper |
| `tests/ollama-cloud-admission/test_ollama_cloud_admission.py` | Added 4 tests: `test_passthrough_runs_child_and_returns_exit_code`, `test_passthrough_without_dashdash`, `test_passthrough_rejects_empty_argv`, `test_passthrough_respects_capacity` | Verify passthrough admits, execs, and respects concurrency cap |
| `tests/ollama-admission/test_ollama_admission.py` | Added 4 tests: `test_passthrough_runs_child_and_returns_exit_code`, `test_passthrough_without_dashdash`, `test_passthrough_rejects_empty_argv`, `test_passthrough_rejects_unknown_route` | Verify passthrough admits and execs in the local wrapper |
| `packages/adapters/hermes/src/server/execute.ts` | Wired `cloudAdmissionWrapper` config field into execution path; renamed `hermesCmd` → `baseHermesCmd`; when `provider === "ollama-cloud"`, wraps command as `wrapper.py passthrough -- hermesCmd args...` | Closes the Ringer reviewer B wiring gap: adapter now produces the exact argv the wrapper expects |
| `packages/adapters/hermes/src/server/config-schema.ts` | (No change — `cloudAdmissionWrapper` field already present) | Contract field was already defined but unused |
| `packages/adapters/hermes/src/shared/constants.ts` | (No change — `DEFAULT_CLOUD_ADMISSION_WRAPPER`, `OLLAMA_CLOUD_PROVIDER` already exported) | Constants were already in place |
| `.paperclip/ollama-cloud-admission/wrapper.sh` | Restructured to support `passthrough` subcommand; updated comments | Legacy wrapper.sh now delegates to `passthrough` |

## 4. Before / After

### Before (rejected by Reviewer B)

```
Paperclip adapter → runChildProcess("hermes", ["chat", "-q", "..."])
                                      ↓
                                   wrapper.sh chat -q "..."
                                      ↓
                   ollama_cloud_admission.py run cloud_ollama hermes -- /path/to/hermes chat -q "..."
                                      (REJECTED: argv[1]="run", but wrapper.sh passes "chat" as first arg to wrapper.py)
```

Actually the old wrapper.sh used `run cloud_ollama hermes -- /path/to/hermes "$@"` which would work, but the Ringer reviewer found that the adapter's `command`/`hermesCommand` config was not being consistently used — sometimes the adapter passes `chat` as the subcommand.

### After (option d — passthrough)

```
Paperclip adapter → runChildProcess(
    "ollama_cloud_admission.py",
    ["passthrough", "--", "/path/to/hermes", "chat", "-q", "...", "-Q", "-m", "deepseek-v4-flash", "--provider", "ollama-cloud"]
)
                                      ↓
  ollama_cloud_admission.py → admits slot → execve("/path/to/hermes", ["hermes", "chat", "-q", "..."])
```

## 5. Test Results

```
ollama-admission tests:    33 passed (4 new passthrough tests)
ollama-cloud-admission:    10 passed (4 new passthrough tests)
hermes adapter typecheck:   0 errors (tsc --noEmit)
hermes adapter tests:     121 passed, 1 pre-existing timeout (listSkills requires hermes CLI)
```

## 6. Reviewer B's Specific Concerns Addressed

| Reviewer B Concern | Fix |
|-------------------|-----|
| `run` subcommand expects explicit `route_class` in argv; adapter doesn't know it | `passthrough` derives route_class from `policy["wrapped_route_class"]` |
| Adapter emits `hermes chat -q ...` which looks like an unknown subcommand to the wrapper | `passthrough` treats everything after `[--]` as opaque child argv |
| No bridging subcommand exists | `passthrough` added to both wrappers |
| Contract mismatch between adapter output and wrapper input | Adapter now constructs `passthrough -- <hermesCmd> <args>` — exact contract alignment |
