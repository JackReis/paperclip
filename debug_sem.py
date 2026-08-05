#!/usr/bin/env python3
"""Trace the cloud admission wrapper to see why flock isn't blocking on macOS."""
import json
import os
import subprocess
import sys
import tempfile
import time

REPO = "/Users/hermes/Projects/agentic-os"
WRAPPER = os.path.join(REPO, "ops", "ollama-cloud-admission", "ollama_cloud_admission.py")
SUPPORT = os.path.join(REPO, "tests", "ollama-cloud-admission", "support.py")

tmp = tempfile.mkdtemp()
state = os.path.join(tmp, "state")
os.mkdir(state, 0o700)
policy = os.path.join(tmp, "policy.json")
pol = {
    "schema_version": "ollama-cloud-admission-v1",
    "route_classes": {"cloud_ollama": {"mode": "wrap"}, "local": {"mode": "direct"}},
    "direct_route_classes": ["local"],
    "wrapped_route_class": "cloud_ollama",
    "concurrency": {"capacity": 1, "ceiling": 10},
    "state": {
        "directory_env": "PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR",
        "slot_lock_pattern": "slot-{slot}.lock",
        "slot_owner_pattern": "slot-{slot}.owner.json",
    },
    "env_refs": {
        "paperclip_run_id": "PAPERCLIP_RUN_ID",
        "paperclip_agent_id": "PAPERCLIP_AGENT_ID",
    },
    "bounds": {"wait_seconds": 5, "poll_interval_seconds": 0.02, "grace_seconds": 30},
    "privacy": {
        "owner_metadata_fields": [
            "schema_version", "lease", "slot", "wrapper_pid",
            "paperclip_run_id", "paperclip_agent_id", "acquired_at_utc",
            "lock_dev", "lock_inode", "command_basename",
        ]
    },
    "exit_codes": {"EX_USAGE": 64, "EX_TEMPFAIL": 75},
}
with open(policy, "w") as f:
    json.dump(pol, f)

env = dict(os.environ)
env["PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR"] = state
env["PAPERCLIP_OLLAMA_CLOUD_ADMISSION_POLICY"] = policy
env["PAPERCLIP_AGENT_ID"] = "test"
env["PAPERCLIP_RUN_ID"] = "test"
env["TEST_OVERLAP_LOG"] = os.path.join(tmp, "overlap.jsonl")

# First, validate and create lock files
r = subprocess.run(
    [sys.executable, WRAPPER, "validate"],
    env=env, capture_output=True, text=True, timeout=10
)
print(f"validate: rc={r.returncode} stderr={r.stderr}")
print(f"state dir contents: {os.listdir(state)}")

# Now launch 2 wrappers with capacity=1 and hold time=2s
procs = []
for i in range(2):
    p = subprocess.Popen(
        [sys.executable, WRAPPER, "run", "cloud_ollama", "support",
         "--", sys.executable, SUPPORT, "marker", "2.0", "0"],
        env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    procs.append(p)
    time.sleep(0.5)  # Stagger starts

start = time.monotonic()
for p in procs:
    out, err = p.communicate(timeout=30)
    print(f"worker rc={p.returncode} stderr={err.decode()[:200]}")

elapsed = time.monotonic() - start
print(f"\nElapsed: {elapsed:.1f}s (expect ~4s if serialized: 2+2)")
print(f"state dir contents: {os.listdir(state)}")
