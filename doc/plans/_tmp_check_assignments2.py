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

# Get agents with full UUIDs
agents = api(f"/api/companies/{COMPANY}/agents")
agent_uuids = {}
for a in agents:
    nm = a.get('name','')
    if nm in ('Aegis Coder X','Aegis Coder Y','Herald','Plan Runner','Kimi Code via Ringer','Paperclip Agent Auditor','Hermes Mistral','Flash','Wings','Luna High Planner'):
        agent_uuids[nm] = a.get('id','')

print("=== Agent full UUIDs ===")
for nm, uid in sorted(agent_uuids.items()):
    print(f"  {nm}: {uid}")

# Now get all issues and find assignments
all_issues = []
for status in ["todo","in_progress","blocked","in_review","done"]:
    try:
        issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status}")
        if isinstance(issues, list):
            all_issues.extend(issues)
    except Exception as e:
        print(f"Error fetching {status}: {e}")

print(f"\nTotal issues: {len(all_issues)}")

# For each key agent, find assigned issues
for name, uid in sorted(agent_uuids.items()):
    assigned = [i for i in all_issues if i.get("assigneeAgentId") == uid]
    if assigned:
        print(f"\n=== Issues assigned to {name} ({len(assigned)}) ===")
        for i in sorted(assigned, key=lambda x: x.get("identifier","")):
            blk = i.get("blockerAttention",{})
            blk_state = blk.get("state","?") if isinstance(blk,dict) else "?"
            print(f"  {i.get('identifier','?')}: {i.get('title','?')[:60]} status={i.get('status','?'):<12} blk={blk_state}")
