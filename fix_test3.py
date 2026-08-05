#!/usr/bin/env python3
"""Fix the test_slot_survives_wrapper_kill_then_frees test.

The communicate() call waits for the child to also exit (since the child
inherits the stdout/stderr pipes), which causes the lock to be released
before we can inspect. Use wait() + manual pipe close instead.
"""
import os

TESTFILE = "/Users/hermes/Projects/agentic-os/tests/ollama-cloud-admission/test_ollama_cloud_admission.py"

with open(TESTFILE, "r") as f:
    content = f.read()

# Fix: use wait() + close pipes instead of communicate() for the kill test
old = """        # SIGKILL only the wrapper. The orphaned child keeps its short sleep.
        os.kill(holder.pid, signal.SIGKILL)
        holder.communicate(timeout=10)
        time.sleep(0.2)"""

new = """        # SIGKILL only the wrapper. The orphaned child keeps its short sleep.
        # Use wait() + manual pipe close instead of communicate() — the child
        # inherits the stdout/stderr pipes, so communicate() would block until
        # the child exits, which would prematurely release the slot.
        os.kill(holder.pid, signal.SIGKILL)
        holder.wait(timeout=10)
        if holder.stdout:
            holder.stdout.close()
        if holder.stderr:
            holder.stderr.close()
        time.sleep(0.2)"""

content = content.replace(old, new)

with open(TESTFILE, "w") as f:
    f.write(content)

print("Fixed test_slot_survives_wrapper_kill_then_frees test")
