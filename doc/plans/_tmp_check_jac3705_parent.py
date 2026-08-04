import json, urllib.request, os

API_URL = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3101")
API_KEY = os.environ.get("PAPERCLIP_API_KEY", "")
COMPANY = "87c32b8e-f131-4df8-ad8e-963d01b458e7"
base = API_URL.rstrip("/")
headers = {"Authorization": f"Bearer {API_KEY}"}

def api(path):
    url = f"{base}{path}"
    req = urllib.request.Request(url, headers=headers)
    resp = urllib.request.urlopen(req, timeout=15)
    return json.loads(resp.read())

# Try fetching the parent issue directly by UUID
parent_uuid = "12a5f63c-fa77-4c18-8949-6d826d7ca815"
try:
    parent = api(f"/api/issues/{parent_uuid}")
    print(f"=== Parent issue {parent_uuid} (direct fetch) ===")
    print(json.dumps({k: parent.get(k) for k in ['id','identifier','title','status','assigneeAgentId','assigneeUserId','parentId','blockerAttention']}, indent=2, default=str))
except Exception as e:
    print(f"Error fetching parent by UUID: {e}")

# Also check JAC-3705's children
print("\n=== Issues with parentId = JAC-3705's UUID ===")
all_issues = []
for status in ["todo","in_progress","blocked","in_review","done","cancelled","backlog"]:
    issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status}")
    if isinstance(issues, list):
        all_issues.extend(issues)

for i in all_issues:
    pid = i.get("parentId", "")
    if str(pid)[:8] == "4eda180d":
        print(f"  {i.get('identifier','?')}: {i.get('title','?')[:60]} status={i.get('status','?')} assignee={i.get('assigneeAgentId') or i.get('assigneeUserId') or 'null'}")

# Check if there are any active runs on Aegis Coder X
print("\n=== Active runs / executionRunId on Aegis Coder X's issues ===")
for i in all_issues:
    if i.get("assigneeAgentId") == "da00de99-f9d0-d93a-45f0-2d0e8c7f8e86":
        print(f"  {i.get('identifier','?')}: status={i.get('status','?')} execRunId={i.get('executionRunId','?')[:8] if i.get('executionRunId') else 'null'} started={i.get('startedAt','?')}")

# Check JAC-3705 description for plan-backed nature
print("\n=== JAC-3705 full details ===")
j3705 = api(f"/api/issues/4eda180d-baa8")
print(f"  title: {j3705.get('title','?')}")
print(f"  description (first 500): {str(j3705.get('description',''))[:500]}")
print(f"  executionPolicy: {j3705.get('executionPolicy','?')}")
print(f"  executionState: {j3705.get('executionState','?')}")

# Check the 09:47Z evidence file to compare
print("\n=== Current time ===")
import datetime
print(datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'))
