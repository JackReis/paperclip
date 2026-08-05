#!/usr/bin/env python3
"""Fix the remaining ResourceWarning in the test by closing pipes properly."""
import os

TESTFILE = "/Users/hermes/Projects/agentic-os/tests/ollama-cloud-admission/test_ollama_cloud_admission.py"

with open(TESTFILE, "r") as f:
    content = f.read()

# Fix test_inspect_free_then_busy: close holder pipes
old1 = """        # Hold one slot, inspect shows busy=1.
        holder = subprocess.Popen(
            [sys.executable, WRAPPER, "run", "cloud_ollama", "support",
             "--", sys.executable, SUPPORT, "marker", "2.0", "0"],
            env=self._env(agent="h", run="h"), stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        time.sleep(0.6)
        try:
            r2 = subprocess.run(
                [sys.executable, WRAPPER, "inspect"],
                env=env, capture_output=True, text=True, timeout=30,
            )
            st2 = json.loads(r2.stdout)
            self.assertEqual(st2["busy"], 1, st2)
            self.assertEqual(st2["free"], capacity - 1, st2)
            owners = [s for s in st2["slots"] if s["state"] == "busy"]
            self.assertEqual(len(owners), 1)
            self.assertIn("paperclip_agent_id", owners[0]["owner"])
        finally:
            holder.wait(timeout=30)"""

new1 = """        # Hold one slot, inspect shows busy=1.
        holder = subprocess.Popen(
            [sys.executable, WRAPPER, "run", "cloud_ollama", "support",
             "--", sys.executable, SUPPORT, "marker", "2.0", "0"],
            env=self._env(agent="h", run="h"), stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        time.sleep(0.6)
        try:
            r2 = subprocess.run(
                [sys.executable, WRAPPER, "inspect"],
                env=env, capture_output=True, text=True, timeout=30,
            )
            st2 = json.loads(r2.stdout)
            self.assertEqual(st2["busy"], 1, st2)
            self.assertEqual(st2["free"], capacity - 1, st2)
            owners = [s for s in st2["slots"] if s["state"] == "busy"]
            self.assertEqual(len(owners), 1)
            self.assertIn("paperclip_agent_id", owners[0]["owner"])
        finally:
            holder.communicate(timeout=30)"""

content = content.replace(old1, new1)

# Fix test_slot_survives_wrapper_kill_then_frees_when_child_exits: close pipes
old2 = """    def test_slot_survives_wrapper_kill_then_frees_when_child_exits(self):
        capacity = 1
        _write_policy(self.policy, capacity=capacity, wait_seconds=10, grace_seconds=30)

        holder = subprocess.Popen(
            [sys.executable, WRAPPER, "run", "cloud_ollama", "support",
             "--", sys.executable, SUPPORT, "marker", "2.0", "0"],
            env=self._env(agent="doomed", run="doomed"),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        time.sleep(0.7)  # holder takes the only slot

        # SIGKILL only the wrapper. The orphaned child keeps its short sleep.
        os.kill(holder.pid, signal.SIGKILL)
        holder.wait(timeout=10)
        time.sleep(0.2)"""

new2 = """    def test_slot_survives_wrapper_kill_then_frees_when_child_exits(self):
        capacity = 1
        _write_policy(self.policy, capacity=capacity, wait_seconds=10, grace_seconds=30)

        holder = subprocess.Popen(
            [sys.executable, WRAPPER, "run", "cloud_ollama", "support",
             "--", sys.executable, SUPPORT, "marker", "2.0", "0"],
            env=self._env(agent="doomed", run="doomed"),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        time.sleep(0.7)  # holder takes the only slot

        # SIGKILL only the wrapper. The orphaned child keeps its short sleep.
        os.kill(holder.pid, signal.SIGKILL)
        holder.communicate(timeout=10)
        time.sleep(0.2)"""

content = content.replace(old2, new2)

with open(TESTFILE, "w") as f:
    f.write(content)

print("Fixed remaining ResourceWarnings in test file")
