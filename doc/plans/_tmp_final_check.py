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

# Get ALL issues across all statuses
all_issues = []
for status in ["todo","in_progress","blocked","in_review","done","cancelled","backlog"]:
    issues = api(f"/api/companies/{COMPANY}/issues?limit=5000&status={status}")
    if isinstance(issues, list):
        all_issues.extend(issues)

# Get verified-idle lanes
verified_idle = []
verified_lane_uuids = {
    'aegis_coder_x': 'da00de99-f9d0-d93a-45f0-2d0e8c7f8e86',
    'herald': 'a1e8cb0d-9132-4b3b-b7a3-8b53cdb10708',
    'plan_runner': '2c6b1cc9-aad2-431b-93ea-e31f0612be65',
    'kimi': '3f1712eb-7b43-40fa-b893-f36e92bb9ac3',
}

# Get all agents
agents = api(f"/api/companies/{COMPANY}/agents")
agent_map = {a.get('id',''): a.get('name','?') for a in agents}

# Find all unassigned todos (assigneeAgentId is None AND assigneeUserId is None or local-board)
unassigned_todos = []
for i in all_issues:
    if i.get("status") == "todo":
        asga = i.get("assigneeAgentId")
        asgu = i.get("assigneeUserId")
        if asga is None and (asgu is None or asgu == "local-board"):
            unassigned_todos.append(i)

print(f"=== All unassigned todos ({len(unassigned_todos)}) ===")
for i in sorted(unassigned_todos, key=lambda x: x.get("identifier","")):
    iid = i.get("identifier","?")
    title = i.get("title","?")[:60]
    priority = i.get("priority","?")
    blk = i.get("blockerAttention",{})
    blk_s = blk.get("state","?") if isinstance(blk,dict) else "?"
    print(f"  {iid}: {title} priority={priority} blk={blk_s}")

# Now check: are any of these unassigned todos independently dispatchable?
# Check if they have blockers
print(f"\n=== Detailed blocker check for unassigned todos ===")
for i in sorted(unassigned_todos, key=lambda x: x.get("identifier","")):
    uid = i.get("id","")
    iid = i.get("identifier","?")
    # Fetch full issue to check blocks/blockedBy
    full = api(f"/api/issues/{uid}")
    blocked_by = full.get("blockedBy", [])
    blocks = full.get("blocks", [])
    parent_id = full.get("parentId")
    parent = api(f"/api/issues/{parent_id}") if parent_id else None
    parent_status = parent.get("status","?") if parent else "no-parent"
    parent_id_short = str(parent_id)[:8] if parent_id else "none"
    print(f"  {iid}: blk_by={len(blocked_by)} blocks={len(blocks)} parent={parent_id_short}({parent.get('identifier','?') if parent else '?'}/{parent_status})")

# Check active runs on verified-idle lanes
print(f"\n=== Active runs on verified-idle lanes ===")
for lane_name, uuid in verified_lane_uuids.items():
    ag = next((a for a in agents if a.get("id") == uuid), None)
    if ag:
        print(f"  {agent_map.get(uuid,'?')}: status={ag.get('status','?')} execRun={ag.get('executionRunId','?')}")
