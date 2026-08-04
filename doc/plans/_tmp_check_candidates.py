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
for status in ["todo","in_progress","blocked","in_review","done","cancelled","backlog"]:
    issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status}")
    if isinstance(issues, list):
        all_issues.extend(issues)

# Check JAC-3970 and JAC-4511 in detail
for tid in ["JAC-3970", "JAC-4511", "JAC-3596", "JAC-3590", "JAC-4093"]:
    for i in all_issues:
        if i.get("identifier") == tid:
            uid = i.get("id","")
            full = api(f"/api/issues/{uid}")
            print(f"\n=== {tid} ===")
            print(f"  uuid: {uid}")
            print(f"  title: {full.get('title','?')}")
            print(f"  status: {full.get('status','?')}")
            print(f"  assignee: {full.get('assigneeAgentId') or full.get('assigneeUserId') or 'null'}")
            print(f"  priority: {full.get('priority','?')}")
            print(f"  executionRunId: {full.get('executionRunId','?')}")
            print(f"  parentId: {full.get('parentId','?')}")
            print(f"  blockedBy: {full.get('blockedBy','?')}")
            print(f"  blocks: [{len(full.get('blocks',[]) or [])} items]")
            for b in (full.get('blocks') or []):
                print(f"    -> {b.get('identifier','?')}: {b.get('title','?')[:50]} status={b.get('status','?')}")
            print(f"  description (first 300): {str(full.get('description',''))[:300]}")
            break

# Check JAC-3970 documents
print("\n=== JAC-3970 documents ===")
for i in all_issues:
    if i.get("identifier") == "JAC-3970":
        docs = api(f"/api/issues/{i.get('id','')}/documents")
        if isinstance(docs, list):
            for d in docs:
                print(f"  {d.get('key','?')}: {str(d.get('title', d.get('name','?')))}"[:80])
        break

# Check JAC-4511 documents
print("\n=== JAC-4511 documents ===")
for i in all_issues:
    if i.get("identifier") == "JAC-4511":
        docs = api(f"/api/issues/{i.get('id','')}/documents")
        if isinstance(docs, list):
            for d in docs:
                print(f"  {d.get('key','?')}: {str(d.get('title', d.get('name','?')))}"[:80])
        break
