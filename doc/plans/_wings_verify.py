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

# Get agent name map and lane map
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
            "model": el.get("model"),
            "state": el.get("state"),
            "maxParallel": el.get("maxParallel"),
            "verifiedAt": el.get("verifiedAt"),
            "agentStatus": a.get("status", ""),
            "errorReason": err_str,
            "adapterType": a.get("adapterType", "")
        }

# Get all issues
all_issues = get(api_base + "/companies/" + cid + "/issues", {"limit": 1000})
issue_by_id = {}
for issue in all_issues:
    issue_by_id[issue.get("id")] = issue

# Check specific TODO issues on verified lanes
target_idents = ["JAC-3628", "JAC-3705", "JAC-3770", "JAC-3400", "JAC-3634", "JAC-4604", "JAC-4000", "JAC-3714"]

for issue in all_issues:
    ident = issue.get("identifier", "")
    if ident not in target_idents:
        continue
    if ident in ["JAC-4000"] and True:  # skip self
        pass

    detail = get_detail(issue["id"])
    assignee = detail.get("assigneeAgentId") or ""
    a_name = agent_map.get(assignee, "none")

    blocked_by = detail.get("blockedByIds") or []
    blocking = detail.get("blockingIds") or []
    plan = detail.get("plan", "")
    description = (detail.get("description") or "")[:300]

    blocked_strs = []
    for b in blocked_by[:10]:
        if isinstance(b, dict):
            blocked_strs.append(b.get("identifier", "?") + " [" + b.get("status", "") + "]")
        elif isinstance(b, str) and b in issue_by_id:
            bi = issue_by_id[b]
            blocked_strs.append(bi.get("identifier", "?") + " [" + bi.get("status", "") + "]")
        else:
            blocked_strs.append(str(b)[:12])

    print("=== " + ident + " ===")
    print("  status: " + detail.get("status", ""))
    print("  assignee: " + a_name)
    print("  blockedByIds: " + (", ".join(blocked_strs) if blocked_strs else "[]"))
    print("  blockingIds count: " + str(len(blocking)))
    if plan:
        print("  plan: " + plan[:300])
    if description:
        print("  description: " + description)
    print()

# Check active runs
print("\n=== ACTIVE RUNS (in_progress) ===")
in_progress = get(api_base + "/companies/" + cid + "/issues", {"limit": 500, "status": "in_progress"})
for issue in in_progress:
    ident = issue.get("identifier", "")
    detail = get_detail(issue["id"])
    active_run = detail.get("activeRun") or {}
    run_id = detail.get("execRunId") or active_run.get("runId") or ""
    assignee = detail.get("assigneeAgentId") or ""
    a_name = agent_map.get(assignee, "none")
    status = detail.get("status", "")

    if str(run_id):
        lane = active_run.get("executionLane", {}) or {}
        print("  " + ident + " | " + a_name + " | status=" + status + " | run=" + str(run_id)[:12])
        if lane:
            print("    lane: pool=" + str(lane.get("pool")) + ", model=" + str(lane.get("model")) + ", state=" + str(lane.get("state")))
    else:
        print("  " + ident + " | " + a_name + " | status=" + status + " | NO run (idle/in_progress without activeRun)")

# Check JAC-4494
print("\n=== JAC-4494 ===")
for issue in all_issues:
    if issue.get("identifier") == "JAC-4494":
        print("  status: " + issue.get("status", ""))
        print("  title: " + issue.get("title", "")[:80])
        break

# Check JAC-4532 detail
print("\n=== JAC-4532 ===")
for issue in all_issues:
    if issue.get("identifier") == "JAC-4532":
        detail = get_detail(issue["id"])
        print("  status: " + detail.get("status", ""))
        print("  assignee: " + agent_map.get(detail.get("assigneeAgentId"), "none"))
        print("  execRunId: " + str(detail.get("execRunId") or ""))
        active = detail.get("activeRun") or {}
        print("  activeRun keys: " + str(list(active.keys())))
        break
