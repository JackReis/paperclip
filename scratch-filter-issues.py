#!/usr/bin/env python3
import sys, json

data = json.load(sys.stdin)
MY_AEGIS = "100915f9"
MY_ALARIC = "669b0a85"

issues = [item for item in data if isinstance(item, dict)]

mine = [i for i in issues if (i.get("assigneeAgentId") or "").startswith(MY_AEGIS) or (i.get("assigneeAgentId") or "").startswith(MY_ALARIC)]
print("=== Issues assigned to AEGIS or ALARIC ===")
for i in mine:
    ident = i.get("identifier","?")
    status = i.get("status","?")
    agent = str(i.get("assigneeAgentId","None"))[:8]
    title = i.get("title","?")[:100]
    iid = str(i.get("id",""))[:8]
    updated = i.get("updatedAt","?")[:19]
    print(f"{ident} [{status}] agent={agent} | {title}")
    print(f"  id={iid} updated={updated}")

print()
active = [i for i in issues if i.get("status") in ("in_progress","blocked")]
print("=== IN PROGRESS or BLOCKED ===")
for i in active:
    ident = i.get("identifier","?")
    status = i.get("status","?")
    priority = i.get("priority","?")
    agent = str(i.get("assigneeAgentId","None"))[:8]
    title = i.get("title","?")[:80]
    iid = str(i.get("id",""))[:8]
    updated = i.get("updatedAt","?")[:19]
    print(f"{ident} [{status}] p{priority} agent={agent} | {title}")
    print(f"  id={iid} updated={updated}")
print(f"\nActive (in_progress+blocked): {len(active)}")
