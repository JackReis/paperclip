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

# Get all issues
all_issues = []
for status in ["todo","in_progress","blocked","in_review","done"]:
    issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status}")
    if isinstance(issues, list):
        all_issues.extend(issues)

issue_map_by_uuid = {i.get("id"): i for i in all_issues}
issue_map_by_id = {i.get("identifier",""): i for i in all_issues}

# Check JAC-3705's parent
j3705 = issue_map_by_id.get("JAC-3705")
if j3705:
    parent_uuid = j3705.get("parentId")
    print(f"JAC-3705 parentId: {parent_uuid}")
    parent = issue_map_by_uuid.get(parent_uuid)
    if parent:
        print(f"  Parent: {parent.get('identifier','?')} - {parent.get('title','?')[:80]} status={parent.get('status','?')}")
        print(f"  Parent assignee: {parent.get('assigneeAgentId') or parent.get('assigneeUserId') or 'null'}")
        print(f"  Parent blockerAttention: {parent.get('blockerAttention',{}).get('state','?') if isinstance(parent.get('blockerAttention'),dict) else '?'}")
        # Check parent's description for plan-backed nature
        print(f"  Parent description (first 200 chars): {str(parent.get('description',''))[:200]}")
    else:
        print(f"  Parent issue NOT found in issue list")

# Check JAC-3596's parent
j3596 = issue_map_by_id.get("JAC-3596")
if j3596:
    parent_uuid = j3596.get("parentId")
    print(f"\nJAC-3596 parentId: {parent_uuid}")
    parent = issue_map_by_uuid.get(parent_uuid)
    if parent:
        print(f"  Parent: {parent.get('identifier','?')} - {parent.get('title','?')[:80]} status={parent.get('status','?')}")
        print(f"  Parent assignee: {parent.get('assigneeAgentId') or parent.get('assigneeUserId') or 'null'}")
    else:
        print(f"  Parent NOT found")

# Check JAC-3593's parent
j3593 = issue_map_by_id.get("JAC-3593")
if j3593:
    parent_uuid = j3593.get("parentId")
    print(f"\nJAC-3593 parentId: {parent_uuid}")
    parent = issue_map_by_uuid.get(parent_uuid)
    if parent:
        print(f"  Parent: {parent.get('identifier','?')} - {parent.get('title','?')[:80]} status={parent.get('status','?')}")
        print(f"  Parent assignee: {parent.get('assigneeAgentId') or parent.get('assigneeUserId') or 'null'}")

# Check what issues JAC-3592 blocks (children)
print("\n=== Issues with JAC-3592 as parent ===")
for i in all_issues:
    if str(i.get("parentId",""))[:8] == "bd78b074":
        print(f"  {i.get('identifier','?')}: {i.get('title','?')[:60]} status={i.get('status','?')} assignee={i.get('assigneeAgentId') or i.get('assigneeUserId') or 'null'}")

# Check if JAC-3705 has a plan/phase - check documents
print("\n=== JAC-3705 documents ===")
try:
    docs = api(f"/api/issues/{j3705.get('id','')}/documents")
    if isinstance(docs, list):
        for d in docs:
            print(f"  {d.get('key','?')}: {d.get('title','?')[:50]} v{d.get('version','?')}")
except Exception as e:
    print(f"  Error: {e}")

# Check JAC-4139's latest comment (the wake comment)
print("\n=== JAC-4139 latest comment ===")
try:
    comments = api(f"/api/issues/6fdb3b88-6786-4a4c-a2be-883d92acc155/comments?limit=2")
    if isinstance(comments, list) and len(comments) > 0:
        c = comments[0]
        print(f"  id: {c.get('id','?')[:8]}")
        print(f"  created: {c.get('createdAt','?')}")
        print(f"  body (first 500): {str(c.get('body',''))[:500]}")
except Exception as e:
    print(f"  Error: {e}")
