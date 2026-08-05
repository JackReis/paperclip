#!/usr/bin/env python3
"""Test flock mutual exclusion between separate processes on macOS."""
import fcntl
import os
import sys
import time
import subprocess
import tempfile

tmp = tempfile.mkdtemp()
lockfile = os.path.join(tmp, "slot-0.lock")

# Holder script
holder_code = """
import fcntl, os, sys, time
fd = os.open(sys.argv[1], os.O_RDWR | os.O_CREAT, 0o600)
fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
sys.stderr.write("child1: got lock, holding 3s\\n")
sys.stderr.flush()
time.sleep(3)
fcntl.flock(fd, fcntl.LOCK_UN)
sys.stderr.write("child1: released\\n")
os.close(fd)
"""

holder_path = os.path.join(tmp, "holder.py")
with open(holder_path, "w") as f:
    f.write(holder_code)

p1 = subprocess.Popen(
    [sys.executable, holder_path, lockfile],
    stderr=subprocess.PIPE, stdout=subprocess.PIPE
)
time.sleep(0.3)

# Tryer script
tryer_code = """
import fcntl, os, sys
fd = os.open(sys.argv[1], os.O_RDWR | os.O_CREAT, 0o600)
try:
    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    sys.stderr.write("child2: got lock - CONFLICT!\\n")
    sys.stderr.flush()
except BlockingIOError:
    sys.stderr.write("child2: correctly blocked\\n")
    sys.stderr.flush()
os.close(fd)
"""

tryer_path = os.path.join(tmp, "tryer.py")
with open(tryer_path, "w") as f:
    f.write(tryer_code)

r = subprocess.run(
    [sys.executable, tryer_path, lockfile],
    stderr=subprocess.PIPE, stdout=subprocess.PIPE, timeout=10
)
print(r.stderr.decode())
p1.wait()
