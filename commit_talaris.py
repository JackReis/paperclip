#!/usr/bin/env python3
"""Commit the cloud admission fixes to Talaris."""
import subprocess

result = subprocess.run(
    ["ssh", "talaris", "cd /Users/jack.reis/Projects/agentic-os && "
     "git add tests/ollama-cloud-admission/support.py "
     "tests/ollama-cloud-admission/test_ollama_cloud_admission.py "
     "ops/ollama-cloud-admission/ollama_cloud_admission.py "
     "ops/ollama-admission/ollama_admission.py "
     "tests/ollama-admission/test_ollama_admission.py && "
     "git commit -m 'fix: cloud admission test timestamp bug + passthrough subcommand'"],
    capture_output=True, text=True
)
print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("RC:", result.returncode)
