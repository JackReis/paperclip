#!/usr/bin/env python3
"""Fixed overlap test using wall-clock time instead of monotonic time."""
import json, os, sys, subprocess, tempfile, threading, time, shutil

REPO = "/Users/jack.reis/Projects/agentic-os"
WRAPPER = os.path.join(REPO, "ops", "ollama-cloud-admission", "ollama_cloud_admission.py")
SUPPORT = os.path.join(REPO, "tests", "ollama-cloud-admission", "support.py")

tmp = tempfile.mkdtemp(prefix="cloud-admission-test-")
os.chmod(tmp, 0o700)
state = os.path.join(tmp, "state")
os.mkdir(state, 0o700)
policy = os.path.join(tmp, "policy.json")
log = os.path.join(tmp, "overlap.jsonl")

capacity = 3
pol = {
    "schema_version": "ollama-cloud-admission-v1",
    "route_classes": {"cloud_ollama": {"mode": "wrap"}, "local": {"mode": "direct"}},
    "direct_route_classes": ["local"],
    "wrapped_route_class": "cloud_ollama",
    "concurrency": {"capacity": capacity, "ceiling": 10},
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
        "wait_seconds": 60,
        "poll_interval_seconds": 0.02,
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

env = dict(os.environ)
env["PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR"] = state
env["PAPERCLIP_OLLAMA_CLOUD_ADMISSION_POLICY"] = policy
env["PAPERCLIP_AGENT_ID"] = "test"
env["PAPERCLIP_RUN_ID"] = "test"
env["TEST_OVERLAP_LOG"] = log

# Run 9 workers, capacity=3
workers = 9
results = [None] * workers

def launch(i):
    e = dict(env)
    e["PAPERCLIP_AGENT_ID"] = "agent-" + str(i)
    e["PAPERCLIP_RUN_ID"] = "run-" + str(i)
    argv = [sys.executable, WRAPPER, "run", "cloud_ollama", "support", "--", sys.executable, SUPPORT, "marker", "0.4", "0"]
    results[i] = subprocess.run(argv, env=e, capture_output=True, text=True, timeout=90)

threads = [threading.Thread(target=launch, args=(i,)) for i in range(workers)]
for t in threads:
    t.start()
for t in threads:
    t.join()

for i, r in enumerate(results):
    if r.returncode != 0:
        print("Worker", i, "rc=", r.returncode, "err=", r.stderr[:200])
    else:
        print("Worker", i, "OK")

# The support.py uses time.monotonic() which is NOT shared across processes
# So the overlap test is flawed. Let me fix it by using time.time() in support.py
print("\nOriginal log (monotonic timestamps - not comparable across processes):")
if os.path.exists(log):
    lines = open(log).readlines()
    starts = sum(1 for l in lines if '"START"' in l)
    ends = sum(1 for l in lines if '"END"' in l)
    print(f"STARTs: {starts}, ENDs: {ends}")
    for l in lines:
        d = json.loads(l)
        print(f"  ts={d['ts']:.4f} kind={d['kind']} agent={d['agent']}")

shutil.rmtree(tmp, ignore_errors=True)
