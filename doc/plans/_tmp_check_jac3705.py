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
for status in ["todo","in_progress","blocked","in_review","done"]:
    issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status}")
    if isinstance(issues, list):
        all_issues.extend(issues)

issue_map = {i.get("identifier",""): i for i in all_issues}

for tid in ["JAC-3705","JAC-3596","JAC-3593","JAC-3594","JAC-3592","JAC-4193","JAC-3933","JAC-4388","JAC-4139"]:
    i = issue_map.get(tid)
    if i:
        print(f"\n=== {tid} ===")
        print(f"  uuid: {str(i.get('id','?'))[:12]}")
        print(f"  title: {i.get('title','?')[:80]}")
        print(f"  status: {i.get('status','?')}")
        asgn = i.get('assigneeAgentId') or i.get('assigneeUserId') or 'null'
        blk = i.get("blockerAttention",{})
        blk_s = blk.get('state','?') if isinstance(blk,dict) else '?'
        print(f"  assignee: {asgn}")
        print(f"  blockerAttention: {blk_s}")
        keys = [k for k in i.keys() if 'block' in k.lower() or 'depend' in k.lower() or 'parent' in k.lower()]
        print(f"  block/dep keys: {keys}")
        for k in keys:
            val = i.get(k)
            if val is not None:
                print(f"  {k}: {val}")
    else:
        print(f"\n=== {tid} === NOT FOUND")
