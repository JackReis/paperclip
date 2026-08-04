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

# Get all issues to find JAC-3705's full UUID
all_issues = []
for status in ["todo","in_progress","blocked","in_review","done","cancelled","backlog"]:
    issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status}")
    if isinstance(issues, list):
        all_issues.extend(issues)

for i in all_issues:
    if i.get("identifier") == "JAC-3705":
        uid = i.get("id","")
        print(f"JAC-3705 full UUID: {uid}")
        print(f"  title: {i.get('title','?')}")
        print(f"  status: {i.get('status','?')}")
        print(f"  assignee: {i.get('assigneeAgentId') or i.get('assigneeUserId') or 'null'}")
        print(f"  executionRunId: {i.get('executionRunId','?')}")
        print(f"  startedAt: {i.get('startedAt','?')}")
        blk = i.get("blockerAttention",{})
        print(f"  blockerAttention: {blk.get('state','?') if isinstance(blk,dict) else blk}")
        # Get full issue details
        try:
            full = api(f"/api/issues/{uid}")
            print(f"  description (first 300): {str(full.get('description',''))[:300]}")
        except Exception as e:
            print(f"  Error getting full details: {e}")
        break

# Check if JAC-3705 is a leaf (no children)
has_children = False
for i in all_issues:
    if str(i.get("parentId","")) == uid:
        has_children = True
        print(f"  CHILD: {i.get('identifier','?')}: {i.get('title','?')[:50]} status={i.get('status','?')}")
if not has_children:
    print("  No children — leaf issue")

# Check the parent JAC-3489 status — it's done, so JAC-3705's parent is resolved
# JAC-4093 (child of JAC-3705) is blocked — but that's a dependency, not a blocker for JAC-3705 itself
# JAC-3705 has no blockerAttention, no executionRunId, no startedAt — it's ready to dispatch

# Also check: does JAC-3705 have any documents/plan?
print("\n=== JAC-3705 documents ===")
try:
    docs = api(f"/api/issues/{uid}/documents")
    if isinstance(docs, list):
        for d in docs:
            print(f"  {d.get('key','?')}: {d.get('title', d.get('name','?'))[:50]} v{d.get('version','?')}")
    else:
        print(f"  Response: {docs}")
except Exception as e:
    print(f"  Error: {e}")
