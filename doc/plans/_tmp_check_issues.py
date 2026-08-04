import json, urllib.request, os, datetime

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

# Get all issues (need to page through)
all_issues = {}
for status_filter in ["todo","in_progress","blocked","in_review","done"]:
    try:
        issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status_filter}")
        if isinstance(issues, list):
            for i in issues:
                iid = i.get("identifier","")
                all_issues[iid] = i
    except Exception as e:
        print(f"Error fetching {status_filter}: {e}")

# Key issues to check
targets = ["JAC-3933","JAC-4388","JAC-3592","JAC-3593","JAC-3594","JAC-3596",
           "JAC-4187","JAC-4422","JAC-3876","JAC-4081","JAC-4069","JAC-4506","JAC-3716",
           "JAC-4190","JAC-4462","JAC-4093","JAC-3665","JAC-4105","JAC-4348",
           "JAC-4193","JAC-3592","JAC-4442","JAC-4444"]

print(f"Total issues in DB: {len(all_issues)}")
print()

for tid in sorted(targets):
    if tid in all_issues:
        i = all_issues[tid]
        blk = i.get("blockerAttention",{})
        blk_state = blk.get("state","?") if isinstance(blk,dict) else "?"
        asgn = i.get("assigneeAgentId") or i.get("assigneeUserId") or "null"
        short_a = str(asgn)[:8]
        print(f"{tid}: uuid={str(i.get('id',''))[:8]} status={i.get('status','?'):<12} asgn={short_a:<10} blk={blk_state}")
    else:
        print(f"{tid}: NOT FOUND")
