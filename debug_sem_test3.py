#!/usr/bin/env python3
"""Test the debug wrapper with two concurrent processes."""
import json, os, sys, subprocess, time, shutil, tempfile

tmp = tempfile.mkdtemp()
state = os.path.join(tmp, "state")
os.mkdir(state, 0o700)
policy = os.path.join(tmp, "policy.json")
log = os.path.join(tmp, "overlap.jsonl")

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
    "bounds": {
        "wait_seconds": 30,
        "poll_interval_seconds": 0.05,
        "grace_seconds": 30,
    },
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

WRAPPER = "/tmp/debug_wrapper.py"
SUPPORT = "/Users/jack.reis/Projects/agentic-os/tests/ollama-cloud-admission/support.py"

env = dict(os.environ)
env["PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR"] = state
env["PAPERCLIP_OLLAMA_CLOUD_ADMISSION_POLICY"] = policy
env["PAPERCLIP_AGENT_ID"] = "test"
env["PAPERCLIP_RUN_ID"] = "test"
env["TEST_OVERLAP_LOG"] = log

# Launch P1 (holds lock for 3s)
env1 = dict(env)
env1["PAPERCLIP_AGENT_ID"] = "P1"
p1 = subprocess.Popen(
    ["python3", WRAPPER, "run", "cloud_ollama", "support", "--", sys.executable, SUPPORT, "marker", "3.0", "0"],
    env=env1, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
)
time.sleep(1.0)

# Inspect during P1 hold
r_inspect = subprocess.run(["python3", WRAPPER, "inspect"], env=env1, capture_output=True, text=True, timeout=5)
print("\nInspect during P1 hold:", r_inspect.stdout[:500])

# Launch P2 (should be blocked)
env2 = dict(env)
env2["PAPERCLIP_AGENT_ID"] = "P2"
p2 = subprocess.Popen(
    ["python3", WRAPPER, "run", "cloud_ollama", "support", "--", sys.executable, SUPPORT, "marker", "0.1", "0"],
    env=env2, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
)
time.sleep(2.0)

print("\nP1 poll:", p1.poll())
print("P2 poll:", p2.poll())

# Wait for both
p1.wait(timeout=10)
p2.wait(timeout=35)

# Get all debug output
print("\nP1 stderr:")
print(p1.stderr.read()[:3000])
print("\nP2 stderr:")
print(p2.stderr.read()[:3000])

if os.path.exists(log):
    print("\nOverlap log:")
    for l in open(log).readlines():
        d = json.loads(l)
        print("  ts=" + str(round(d["ts"], 4)) + " kind=" + d["kind"] + " agent=" + str(d["agent"]))

shutil.rmtree(tmp, ignore_errors=True)
