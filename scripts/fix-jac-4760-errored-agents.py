#!/usr/bin/env python3
"""
JAC-4760: Fix 21 errored agents — stale provider=nous + wrong OpenClaw port.

Remediation plan:
  1. hermes_local agents with provider=nous → change to provider=openrouter.
     NOUS_API_KEY is invalid (401). The model poolside/laguna-s-2.1:free is already
     correct for openrouter; the adapter strips the provider prefix before passing
     to the Hermes CLI, and strips openrouter/ again at runtime.

  2. openclaw_gateway agents (Klaude, Klaw) with url=ws://127.0.0.1:18679
     → change to 18789 (the actual OpenClaw gateway port on Aegis).

  3. Clear stale KeyboardInterrupt errorReason on Klaude Pi, Bright, Zatara,
     Flash Executor, Luna High Planner, Pi Campaign Auditor, Maar.

Usage:
  export PAPERCLIP_API_URL=http://127.0.0.1:3101/api
  export PAPERCLIP_API_KEY=<board-api-key>
  export PAPERCLIP_RUN_ID=<run-id>
  python3 scripts/fix-jac-4760-errored-agents.py [--dry-run] [--clear-errors]
"""

import argparse
import json
import os
import subprocess
import sys

API_URL = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3101/api")
if not API_URL.endswith("/api"):
    API_URL = API_URL.rstrip("/") + "/api"
API_KEY = os.environ.get("PAPERCLIP_API_KEY", "")
RUN_ID = os.environ.get("PAPERCLIP_RUN_ID", "")
COMPANY_ID = "87c32b8e-f131-4df8-ad8e-963d01b458e7"

# Agents that need provider=nous -> openrouter
# All hermes_local agents currently in error state have provider=nos
STALE_PROVIDER = "nous"
CORRECT_PROVIDER = "openrouter"

# OpenClaw gateway is on 18789, not 18679
WRONG_PORT = "18679"
CORRECT_PORT = "18789"

# Agents with stale KeyboardInterrupt tracebacks to clear
KEYBOARD_INTERRUPT_AGENTS = [
    "Klaude Pi",
    "Bright",
    "Zatara",
    "Flash Executor",
    "Luna High Planner",
    "Pi Campaign Auditor",
    "Maar",
]


def api_get(path):
    url = f"{API_URL}{path}"
    cmd = ["curl", "-sS", url, "-H", "X-Paperclip-Local-Board: true",
           "-H", "Accept: application/json"]
    if RUN_ID:
        cmd.extend(["-H", f"X-Paperclip-Run-Id: {RUN_ID}"])
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            print(f"  ERROR GET {path}: curl exit {result.returncode}")
            return None
        return json.loads(result.stdout) if result.stdout else None
    except Exception as e:
        print(f"  ERROR GET {path}: {e}")
        return None


def api_patch_agent(agent_id, data):
    url = f"{API_URL}/agents/{agent_id}"
    body = json.dumps(data)
    cmd = ["curl", "-sS", "-X", "PATCH", url,
           "-H", "X-Paperclip-Local-Board: true",
           "-H", "Content-Type: application/json",
           "-H", "Accept: application/json",
           "--data-binary", body]
    if RUN_ID:
        cmd.extend(["-H", f"X-Paperclip-Run-Id: {RUN_ID}"])
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            return {"_error": f"curl exit {result.returncode}"}
        return json.loads(result.stdout) if result.stdout else {}
    except Exception as e:
        return {"_error": str(e)}


def clear_error_reason(agent_id, agent_name):
    """Clear the errorReason on an agent by setting it to null."""
    result = api_patch_agent(agent_id, {"errorReason": None})
    if not isinstance(result, dict):
        return False, f"unexpected response: {str(result)[:200]}"
    if "_error" in result:
        return False, result["_error"]
    if result.get("id") == agent_id:
        return True, None
    return False, json.dumps(result)[:200] if isinstance(result, dict) else str(result)[:200]


def patch_provider(agent_id, agent_name, config):
    """Patch adapterConfig.provider from 'nous' to 'openrouter'."""
    # Preserve existing config, just change provider
    new_config = dict(config)
    new_config["provider"] = CORRECT_PROVIDER

    result = api_patch_agent(agent_id, {"adapterConfig": new_config})
    if not isinstance(result, dict):
        return False, f"unexpected response: {str(result)[:200]}", new_config
    if "_error" in result:
        return False, result["_error"], new_config
    got_provider = (result.get("adapterConfig") or {}).get("provider")
    if got_provider == CORRECT_PROVIDER:
        return True, None, new_config
    return False, f"provider mismatch: expected {CORRECT_PROVIDER}, got {got_provider}", new_config


def patch_url_port(agent_id, agent_name, config):
    """Patch adapterConfig.url to use port 18789 instead of 18679."""
    old_url = config.get("url", "")
    new_url = old_url.replace(f":{WRONG_PORT}", f":{CORRECT_PORT}")
    if not new_url:
        return False, "no url to patch", config

    new_config = dict(config)
    new_config["url"] = new_url

    result = api_patch_agent(agent_id, {"adapterConfig": new_config})
    if not isinstance(result, dict):
        return False, f"unexpected response: {str(result)[:200]}", new_config
    if "_error" in result:
        return False, result["_error"], new_config
    got_url = (result.get("adapterConfig") or {}).get("url")
    if got_url == new_url:
        return True, None, new_config
    return False, f"url mismatch: expected {new_url}, got {got_url}", new_config


def main():
    parser = argparse.ArgumentParser(description="JAC-4760: Fix errored agents")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be done without making changes")
    parser.add_argument("--clear-errors", action="store_true",
                        help="Also clear stale KeyboardInterrupt errorReason breadcrumbs")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: PAPERCLIP_API_KEY must be set", file=sys.stderr)
        sys.exit(1)

    print(f"=== JAC-4760: Fix errored agents ===")
    print(f"  API: {API_URL}")
    print(f"  Company: {COMPANY_ID}")
    print(f"  Dry run: {args.dry_run}")
    print(f"  Clear errors: {args.clear_errors}")
    print()

    # Step 1: Fetch all agents
    print("[1] Fetching agents...")
    agents = api_get(f"/companies/{COMPANY_ID}/agents")
    if agents is None:
        print("ERROR: Failed to fetch agents")
        sys.exit(1)

    errored = [a for a in agents if a.get("status") == "error"]
    hermes_errored = [a for a in errored if a.get("adapterType") == "hermes_local"]
    openclaw_errored = [a for a in errored if a.get("adapterType") == "openclaw_gateway"]

    print(f"    Total errored: {len(errored)}")
    print(f"    hermes_local errored: {len(hermes_errored)}")
    print(f"    openclaw_gateway errored: {len(openclaw_errored)}")
    print()

    results = {"patched_provider": [], "patched_url": [], "cleared_errors": [], "skipped": [], "failed": []}

    # Step 2: Fix hermes_local agents with provider=nous
    print("[2] Fixing hermes_local agents: provider=nous -> openrouter")
    for agent in hermes_errored:
        name = agent.get("name", "?")
        agent_id = agent["id"]
        config = agent.get("adapterConfig") or {}
        current_provider = config.get("provider", "MISSING")
        current_model = config.get("model", "MISSING")
        error_reason = agent.get("errorReason")

        if current_provider == STALE_PROVIDER:
            if args.dry_run:
                print(f"    [DRY RUN] WOULD PATCH: {name} — provider={current_provider} -> {CORRECT_PROVIDER}")
                results["patched_provider"].append(name)
                continue

            ok, err, new_config = patch_provider(agent_id, name, config)
            if ok:
                print(f"    OK: {name} — provider={current_provider} -> {CORRECT_PROVIDER}")
                results["patched_provider"].append(name)
            else:
                print(f"    FAIL: {name} — {err}")
                results["failed"].append({"name": name, "error": err, "action": "patch_provider"})
        elif current_provider == CORRECT_PROVIDER:
            print(f"    SKIP: {name} — provider already {CORRECT_PROVIDER}")
            results["skipped"].append(name)
        else:
            print(f"    SKIP: {name} — provider={current_provider} (unexpected, not notre)")
            results["skipped"].append(name)

    print()

    # Step 3: Fix openclaw_gateway agents with wrong port in URL
    print("[3] Fixing openclaw_gateway agents: port 18679 -> 18789")
    # Also check idle openclaw agents (Klaw, Pi) — they'll fail when run
    all_openclaw = [a for a in agents if a.get("adapterType") == "openclaw_gateway"]
    for agent in all_openclaw:
        name = agent.get("name", "?")
        agent_id = agent["id"]
        config = agent.get("adapterConfig") or {}
        url = config.get("url", "")

        if WRONG_PORT in url:
            if args.dry_run:
                new_url = url.replace(f":{WRONG_PORT}", f":{CORRECT_PORT}")
                print(f"    [DRY RUN] WOULD PATCH: {name} — url={url} -> {new_url}")
                results["patched_url"].append(name)
                continue

            ok, err, new_config = patch_url_port(agent_id, name, config)
            if ok:
                new_url = new_config["url"]
                print(f"    OK: {name} — url={url} -> {new_url}")
                results["patched_url"].append(name)
            else:
                print(f"    FAIL: {name} — {err}")
                results["failed"].append({"name": name, "error": err, "action": "patch_url"})
        elif url and CORRECT_PORT in url:
            print(f"    SKIP: {name} — url already uses port {CORRECT_PORT}")
            results["skipped"].append(name)
        elif not url:
            print(f"    SKIP: {name} — no url to patch")
            results["skipped"].append(name)

    print()

    # Step 4: Clear stale KeyboardInterrupt errorReason breadcrumbs
    if args.clear_errors:
        print("[4] Clearing stale KeyboardInterrupt errorReason breadcrumbs")
        for agent in errored:
            name = agent.get("name", "?")
            if name not in KEYBOARD_INTERRUPT_AGENTS:
                continue
            agent_id = agent["id"]
            error_reason = agent.get("errorReason", "")

            if not error_reason:
                print(f"    SKIP: {name} — no errorReason")
                continue

            is_keyboard_interrupt = "KeyboardInterrupt" in error_reason

            if is_keyboard_interrupt:
                if args.dry_run:
                    print(f"    [DRY RUN] WOULD CLEAR: {name} — errorReason=KeyboardInterrupt")
                    results["cleared_errors"].append(name)
                    continue

                ok, err = clear_error_reason(agent_id, name)
                if ok:
                    print(f"    OK: {name} — errorReason cleared")
                    results["cleared_errors"].append(name)
                else:
                    print(f"    FAIL: {name} — {err}")
                    results["failed"].append({"name": name, "error": err, "action": "clear_error"})
            else:
                print(f"    SKIP: {name} — errorReason is not KeyboardInterrupt: {str(error_reason)[:60]}...")
    else:
        print("[4] Skipping error clearing (use --clear-errors to enable)")
    print()

    # Step 5: Verification — re-fetch and confirm
    print("[5] Verification...")
    agents_after = api_get(f"/companies/{COMPANY_ID}/agents")
    if agents_after:
        errored_after = [a for a in agents_after if a.get("status") == "error"]
        hermes_errored_after = [a for a in errored_after if a.get("adapterType") == "hermes_local" and (a.get("adapterConfig") or {}).get("provider") == STALE_PROVIDER]
        openclaw_port_after = [a for a in agents_after if a.get("adapterType") == "openclaw_gateway" and WRONG_PORT in ((a.get("adapterConfig") or {}).get("url") or "")]

        print(f"    hermes_local agents still with provider=nos: {len(hermes_errored_after)}")
        print(f"    openclaw_gateway agents still on port {WRONG_PORT}: {len(openclaw_port_after)}")

        if len(hermes_errored_after) == 0 and len(openclaw_port_after) == 0:
            print()
            print("    VERIFICATION PASSED: All stale configs corrected")
            if not args.clear_errors:
                print(f"    NOTE: {len(KEYBOARD_INTERRUPT_AGENTS)} agents have stale KeyboardInterrupt tracebacks — rerun with --clear-errors to clean")
            return 0
        else:
            if hermes_errored_after:
                print(f"    Still stale: {[a['name'] for a in hermes_errored_after]}")
            if openclaw_port_after:
                print(f"    Still wrong port: {[a['name'] for a in openclaw_port_after]}")
            return 1
    else:
        print("    VERIFICATION: Could not re-fetch agents")
        return 1


if __name__ == "__main__":
    sys.exit(main())
