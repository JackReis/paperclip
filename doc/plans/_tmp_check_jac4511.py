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

# Get JAC-4511 full details
j4511 = None
j4505 = None
all_issues = []
for status in ["todo","in_progress","blocked","in_review","done","cancelled","backlog"]:
    issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status}")
    if isinstance(issues, list):
        all_issues.extend(issues)

for i in all_issues:
    if i.get("identifier") == "JAC-4511":
        j4511 = i
        full = api(f"/api/issues/{i.get('id','')}")
        print("=== JAC-4511 full ===")
        for k in sorted(full.keys()):
            v = full.get(k)
            if v is not None and k not in ('description','blockingIssues','terminalBlockers'):
                print(f"  {k}: {v}")
        print(f"\n  description: {str(full.get('description',''))[:500]}")
        break

# Also check JAC-4505 (the parent completion that JAC-4511 follows up)
for i in all_issues:
    if i.get("identifier") == "JAC-4505":
        print(f"\n=== JAC-4505 (parent completion) ===")
        print(f"  status: {i.get('status','?')}")
        print(f"  title: {i.get('title','?')[:80]}")
        break

# Check if JAC-4511 has a workspace
if j4511:
    uid = j4511.get("id","")
    ws = j4511.get("executionWorkspaceId","?")
    print(f"\n  executionWorkspaceId: {ws}")
    print(f"  executionRunId: {j4511.get('executionRunId','?')}")
    print(f"  checkoutRunId: {j4511.get('checkoutRunId','?')}")
    print(f"  executionLockedAt: {j4511.get('executionLockedAt','?')}")
