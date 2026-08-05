#!/usr/bin/env python3
"""Fix the ResourceWarning in the test by closing the file properly."""
import os

TESTFILE = "/Users/hermes/Projects/agentic-os/tests/ollama-cloud-admission/test_ollama_cloud_admission.py"

with open(TESTFILE, "r") as f:
    content = f.read()

old = '        # And all workers actually ran (sanity: not serialized to death).\n        starts = sum(1 for line in open(self.log) if \'"START"\' in line)\n        self.assertEqual(starts, workers, "every worker should have entered eventually")'
new = '        # And all workers actually ran (sanity: not serialized to death).\n        with open(self.log) as f:\n            starts = sum(1 for line in f if \'"START"\' in line)\n        self.assertEqual(starts, workers, "every worker should have entered eventually")'

content = content.replace(old, new)

with open(TESTFILE, "w") as f:
    f.write(content)

print("Fixed ResourceWarning in test file")
