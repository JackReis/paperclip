import json, os
api_url = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3101")
if api_url.endswith("/api"):
    api_base = api_url
else:
    api_base = api_url + "/api"
api_key = os.environ.get("PAPERCLIP_API_KEY", "")
cid = "87c32b8e-f131-4df8-ad8e-963d01b458e7"

import urllib.request, urllib.parse

def get(url, params=None):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + api_key})
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e)}

def get_detail(uuid):
    return get(api_base + "/issues/" + uuid)

# Get agents
agents = get(api_base + "/companies/" + cid + "/agents")
agent_map = {}
lane_map = {}
for a in agents:
    agent_map[a["id"]] = a["name"]
    md = a.get("metadata") or {}
    if isinstance(md, dict) and md.get("executionLane"):
        el = md["executionLane"]
        err = a.get("errorReason")
        err_str = (err[:60] if err else "")
        lane_map[a["name"]] = {
            "pool": el.get("pool"),
            "state": el.get("state"),
            "maxParallel": el.get("maxParallel"),
            "agentStatus": a.get("status", ""),
            "errorReason": err_str,
            "adapterType": a.get("adapterType", ""),
        }

all_issues = get(api_base + "/companies/" + cid + "/issues", {"limit": 1000})

# Check all issues assigned to verified lanes
print("=== ISSUES ASSIGNED TO VERIFIED LANE AGENTS ===")
verified_lane_agents = [name for name, l in lane_map.items() if l["state"] == "verified"]
print("Verified lane agents: " + str(verified_lane_agents))

in_progress = [i for i in all_issues if i.get("status") == "in_progress"]
todos = [i for i in all_issues if i.get("status") == "todo"]

for issue in in_progress + todos:
    ident = issue.get("identifier", "")
    assignee = issue.get("assigneeAgentId") or ""
    a_name = agent_map.get(assignee, "")
    
    if a_name in verified_lane_agents:
        detail = get_detail(issue["id"])
        run_id = detail.get("execRunId") or ""
        status = detail.get("status", "")
        
        lane = lane_map[a_name]
        err_str = " | ERROR=" + lane["errorReason"] if lane["errorReason"] else ""
        
        run_str = str(run_id)[:8] if run_id else "NONE"
        print("  {:20s} | {:20s} | status={:12s} | agent={:8s} | pool={} | maxPar={} | run={}{}".format(
            ident, a_name, status, lane["agentStatus"], lane["pool"], lane["maxParallel"], run_str, err_str))

# Summary
print("\n=== DISPATCHABLE LANE SUMMARY ===")
for name, lane in lane_map.items():
    if lane["state"] == "verified":
        assigned = [i for i in in_progress if agent_map.get(i.get("assigneeAgentId"), "") == name]
        assigned_todo = [i for i in todos if agent_map.get(i.get("assigneeAgentId"), "") == name]
        
        if lane["agentStatus"] == "idle":
            cap = lane["maxParallel"] - len(assigned)
            print("  {:20s} | VERIFIED | idle | maxPar={} | active_runs={} | dispatchable_cap={} | todo_assigned={}".format(
                name, lane["maxParallel"], len(assigned), max(0, cap), len(assigned_todo)))
        else:
            err_str = " | ERROR=" + lane["errorReason"] if lane["errorReason"] else ""
            print("  {:20s} | VERIFIED | {} | NOT IDLE | active_runs={} | todo_assigned={}{}".format(
                name, lane["agentStatus"], len(assigned), len(assigned_todo), err_str))
