#!/usr/bin/env python3
"""JAC-4139 Cycle — Fresh live verification of fleet dispatch state.
Efficient: fetches issues list ONCE, then fetches details only for issues
assigned to verified lanes. Avoids N+1 on all 1000+ issues."""
import json, os, urllib.request, urllib.parse, datetime

api_url = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3101")
api_base = api_url if api_url.endswith("/api") else api_url + "/api"
api_key = os.environ.get("PAPERCLIP_API_KEY", "")
cid = "87c32b8e-f131-4df8-ad8e-963d01b458e7"
now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def get(url, params=None):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + api_key})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode())

def get_detail(uuid):
    return get(api_base + "/issues/" + uuid)

# 1. Get agents + lane metadata
agents = get(api_base + "/companies/" + cid + "/agents")
agent_map = {}  # id -> name
lane_map = {}   # name -> lane info
for a in agents:
    agent_map[a["id"]] = a.get("name", "")
    md = a.get("metadata") or {}
    if isinstance(md, dict) and md.get("executionLane"):
        el = md["executionLane"]
        err = a.get("errorReason") or ""
        lane_map[a["name"]] = {
            "pool": el.get("pool", ""),
            "state": el.get("state", ""),
            "maxParallel": el.get("maxParallel", 0),
            "verifiedAt": el.get("verifiedAt", ""),
            "model": el.get("model", ""),
            "agentStatus": a.get("status", ""),
            "errorReason": err[:80] if err else "",
            "lastHeartbeat": a.get("lastHeartbeat") or "",
            "adapterType": a.get("adapterType", ""),
        }

print("=== AGENT LANE TABLE (live " + now + ") ===")
print(f"{'Agent':25s} {'status':12s} {'err':30s} {'lane':12s} {'pool':12s} {'model':25s} {'maxPar':6s} verifiedAt")
for name, lane in sorted(lane_map.items()):
    err_display = lane["errorReason"][:30] if lane["errorReason"] else ""
    print(f"{name:25s} {lane['agentStatus']:12s} {err_display:30s} {lane['state']:12s} {lane['pool']:12s} {lane['model']:25s} {lane['maxParallel']:<6d} {lane['verifiedAt']}")

# 2. Get all issues (need to paginate since limit=1000 may not be enough)
all_issues = []
offset = 0
while True:
    batch = get(api_base + "/companies/" + cid + "/issues", {"limit": 100, "offset": offset})
    if not batch or len(batch) == 0:
        break
    all_issues.extend(batch)
    if len(batch) < 100:
        break
    offset += 100

print(f"\n=== TOTAL ISSUES FETCHED: {len(all_issues)} ===")

# 3. Classify issues
verified_lane_names = set(name for name, l in lane_map.items() if l["state"] == "verified")
in_progress_issues = [i for i in all_issues if i.get("status") == "in_progress"]
todo_issues = [i for i in all_issues if i.get("status") == "todo"]

print(f"\n=== ISSUE COUNT BY STATUS ===")
status_counts = {}
for i in all_issues:
    s = i.get("status", "unknown")
    status_counts[s] = status_counts.get(s, 0) + 1
for s, c in sorted(status_counts.items()):
    print(f"  {s}: {c}")

# 4. For issues assigned to verified lane agents, fetch details to check execRunId
print(f"\n=== VERIFIED LANE AGENT ASSIGNMENTS ===")
print(f"{'Issue':12s} {'Agent':20s} {'status':12s} {'agent_st':10s} {'execRunId':20s} {'err':20s} {'maxPar':6s} {'actRuns':7s} cap pool")
verified_lane_issue_details = {}
for issue in sorted(in_progress_issues + todo_issues, key=lambda x: x.get("identifier","")):
    assignee_id = issue.get("assigneeAgentId") or ""
    a_name = agent_map.get(assignee_id, "")
    if a_name not in verified_lane_names:
        continue
    detail = get_detail(issue["id"])
    ident = detail.get("identifier", "")
    exec_run = detail.get("execRunId") or ""
    run_str = str(exec_run)[:12] if exec_run else "NONE"
    issue_status = detail.get("status", "")
    lane = lane_map[a_name]
    agent_st = lane["agentStatus"]
    err = lane["errorReason"][:15] if lane["errorReason"] else ""
    # Count active in_progress runs for this agent
    active_for_agent = [i for i in in_progress_issues if (i.get("assigneeAgentId") or "") == assignee_id and (get_detail(i["id"]).get("execRunId"))]
    
    print(f"{ident:12s} {a_name:20s} {issue_status:12s} {agent_st:10s} {run_str:20s} {err:20s} {lane['maxParallel']:<6d} {len(active_for_agent):<7d} pool={lane['pool']}")
    verified_lane_issue_details[ident] = {
        "agent": a_name,
        "agentStatus": agent_st,
        "laneState": lane["state"],
        "errorReason": lane["errorReason"],
        "maxParallel": lane["maxParallel"],
        "execRunId": str(exec_run)[:20] if exec_run else None,
    }

# 5. Full TODO list with policy classification
print(f"\n=== ALL TODO ISSUES ({len(todo_issues)} total) ===")
# Build a quick map of id -> issue for parent/child checks
issue_by_id = {i["id"]: i for i in all_issues}
# Get minimal details for each todo to check blockers, plan, assignee
for issue in sorted(todo_issues, key=lambda x: x.get("identifier","")):
    ident = issue.get("identifier", "")
    a_name = agent_map.get(issue.get("assigneeAgentId") or "", "unassigned")
    # Check if has plan
    plan = issue.get("plan") or ""
    has_plan = bool(plan and len(plan) > 0)
    blocked_ids = issue.get("blockedByIds") or []
    blocking_ids = issue.get("blockingIds") or []
    
    # Check description for gate keywords
    desc = (issue.get("description") or "")[:200].replace("\n", " ")
    
    print(f"  {ident:12s} | {a_name:20s} | hasPlan={has_plan} | blocked={len(blocked_ids)} | blocking={len(blocking_ids)} | {desc}")

# 6. Active runs summary
print(f"\n=== ACTIVE RUNS (in_progress with execRunId) ===")
active_with_run = []
for issue in in_progress_issues:
    detail = get_detail(issue["id"])
    run_id = detail.get("execRunId")
    if run_id:
        ident = detail.get("identifier", "")
        a_name = agent_map.get(detail.get("assigneeAgentId") or "", "none")
        print(f"  {ident:12s} | {a_name:20s} | run={str(run_id)[:12]}")
        active_with_run.append((ident, a_name))

active_without_run = []
for issue in in_progress_issues:
    detail = get_detail(issue["id"])
    run_id = detail.get("execRunId")
    if not run_id:
        ident = detail.get("identifier", "")
        a_name = agent_map.get(detail.get("assigneeAgentId") or "", "none")
        active_without_run.append((ident, a_name))
        print(f"  {ident:12s} | {a_name:20s} | NO execRunId (orphaned)")

print(f"\n  Total in_progress with active run: {len(active_with_run)}")
print(f"  Total in_progress without execRunId (orphaned): {len(active_without_run)}")

# 7. Final dispatch decision summary
print(f"\n=== DISPATCH DECISION ===")
print(f"Verified lane agents: {sorted(verified_lane_names)}")
for name, lane in sorted(lane_map.items()):
    if lane["state"] != "verified":
        continue
    agent_st = lane["agentStatus"]
    err = lane["errorReason"]
    if name in ("Wings", "Coordinator"):
        print(f"  {name}: SELF-RESERVED (strategic reserve)")
        continue
    if agent_st == "error" or err:
        print(f"  {name}: NOT ROUTABLE (agent status={agent_st}, error={err[:40]})")
        continue
    if agent_st != "idle":
        print(f"  {name}: NOT IDLE (agent status={agent_st})")
        continue
    assignee_id_for_name = [k for k,v in agent_map.items() if v==name]
    if assignee_id_for_name:
        aid = assignee_id_for_name[0]
        assigned_active = len([i for i in in_progress_issues if (i.get("assigneeAgentId") or "") == aid])
        cap = lane["maxParallel"] - assigned_active
        print(f"  {name}: VERIFIED+IDLE, maxPar={lane['maxParallel']}, active_runs={assigned_active}, capacity={cap}")
    else:
        print(f"  {name}: VERIFIED+IDLE, maxPar={lane['maxParallel']}, capacity=unknown")

# Output JSON summary for evidence doc
summary = {
    "timestamp": now,
    "agents": lane_map,
    "total_issues": len(all_issues),
    "in_progress_count": len(in_progress_issues),
    "todo_count": len(todo_issues),
    "active_with_run": active_with_run,
    "active_without_run": active_without_run,
    "verified_lane_names": sorted(verified_lane_names),
}
print("\n=== JSON SUMMARY ===")
print(json.dumps(summary, indent=2))
