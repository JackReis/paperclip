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

# Get all todos
all_todos = []
for status in ["todo","in_progress","blocked","in_review"]:
    try:
        issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status}")
        if isinstance(issues, list):
            all_todos.extend(issues)
    except Exception as e:
        print(f"Error fetching {status}: {e}")

# Find unassigned todos (assigneeAgentId is null AND assigneeUserId is null/b-none)
unassigned = []
for i in all_todos:
    asga = i.get("assigneeAgentId")
    asgu = i.get("assigneeUserId")
    if asga is None and (asgu is None or asgu == "local-board"):
        iid = i.get("identifier","")
        if iid.startswith("JAC-"):
            unassigned.append(i)

print(f"=== Unassigned/LOCAL-BOARD todos ({len(unassigned)}) ===")
for i in sorted(unassigned, key=lambda x: x.get("identifier","")):
    iid = i.get("identifier","")
    print(f"  {iid}: {i.get('title','?')[:70]} status={i.get('status','?')} priority={i.get('priority','?')} created={i.get('createdAt','?')[:10]}")

# Find issues assigned to Aegis Coder X (da00de99)
coder_x_issues = [i for i in all_todos if i.get("assigneeAgentId") == "da00de99-f9d0-d93a-45f0-2d0e8c7f8e86"]
print(f"\n=== Issues assigned to Aegis Coder X ({len(coder_x_issues)}) ===")
for i in sorted(coder_x_issues, key=lambda x: x.get("identifier","")):
    print(f"  {i.get('identifier','?')}: {i.get('title','?')[:60]} status={i.get('status','?')}")

# Find issues assigned to Herald
herald_issues = [i for i in all_todos if i.get("assigneeAgentId") == "a1e8cb0d-9a3f-4f0d-9a3e-9e9d8c7b6a5f"]
print(f"\n=== Issues assigned to Herald ({len(herald_issues)}) ===")
for i in sorted(herald_issues, key=lambda x: x.get("identifier","")):
    print(f"  {i.get('identifier','?')}: {i.get('title','?')[:60]} status={i.get('status','?')}")

# Find issues assigned to Plan Runner
plan_issues = [i for i in all_todos if i.get("assigneeAgentId") == "2c6b1cc9-39d2-4e6e-bd2e-1e9d3c7a8b9f"]
print(f"\n=== Issues assigned to Plan Runner ({len(plan_issues)}) ===")
for i in sorted(plan_issues, key=lambda x: x.get("identifier","")):
    print(f"  {i.get('identifier','?')}: {i.get('title','?')[:60]} status={i.get('status','?')}")
