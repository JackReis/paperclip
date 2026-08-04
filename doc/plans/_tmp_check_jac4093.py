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

all_issues = []
for status in ["todo","in_progress","blocked","in_review","done","cancelled","backlog"]:
    issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status}")
    if isinstance(issues, list):
        all_issues.extend(issues)

issue_map_by_id = {i.get("identifier",""): i for i in all_issues}

# Check JAC-4093 blocker
j4093 = issue_map_by_id.get("JAC-4093")
if j4093:
    print(f"=== JAC-4093 (child of JAC-3705) ===")
    print(f"  title: {j4093.get('title','?')[:80]}")
    print(f"  status: {j4093.get('status','?')}")
    print(f"  assignee: {j4093.get('assigneeAgentId') or j4093.get('assigneeUserId') or 'null'}")
    blk = j4093.get("blockerAttention",{})
    print(f"  blockerAttention: {blk.get('state','?') if isinstance(blk,dict) else blk}")
    # Check for blocker references in the full issue
    full = api(f"/api/issues/{j4093.get('id','')}")
    for k in full.keys():
        if 'block' in k.lower() or 'depend' in k.lower():
            val = full.get(k)
            if val is not None and val != {}:
                print(f"  {k}: {val}")

# Check if JAC-3705 is a dispatch-created child of another issue
j3705 = issue_map_by_id.get("JAC-3705")
if j3705:
    print(f"\n=== JAC-3705 ===")
    print(f"  uuid: {j3705.get('id','?')}")
    print(f"  parentId: {j3705.get('parentId','?')}")
    print(f"  executionRunId: {j3705.get('executionRunId','?')}")
    print(f"  executionLockedAt: {j3705.get('executionLockedAt','?')}")
    print(f"  checkoutRunId: {j3705.get('checkoutRunId','?')}")
    print(f"  executionWorkspaceId: {j3705.get('executionWorkspaceId','?')}")

# Also check the current Paperclip version
print(f"\n=== Paperclip version ===")
try:
    health = api("/api/health")
    print(f"  health: {json.dumps(health, indent=2, default=str)[:300]}")
except:
    pass
