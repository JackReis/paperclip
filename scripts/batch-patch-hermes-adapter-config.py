#!/usr/bin/env python3
"""
Batch-patch adapterConfig for hermes_local agents.

JAC-4565-4: Fix: Batch-patch adapterConfig for all hermes_local agents with
explicit provider+model values rather than relying on model="auto" defaults.

This script:
  1. Fetches all hermes_local agents via the Paperclip API
  2. Determines the correct provider/model for each from:
     a. executionLane metadata.model / executionLane metadata.provider
     b. Special-case fleet overrides (known agent model assignments)
     c. Agent name-based inference for known patterns
     d. The Aegis profile default: provider=nous, model=poolside/laguna-s-2.1:free
  3. PATCHes each agent's adapterConfig with explicit provider/model
  4. Verifies the PATCHes succeeded

Usage:
  export PAPERCLIP_API_URL=http://127.0.0.1:3101/api
  export PAPERCLIP_API_KEY=<board-api-key>
  export PAPERCLIP_COMPANY_ID=<company-id>
  python3 scripts/batch-patch-hermes-adapter-config.py [--dry-run] [--verbose] [--only-errored]
"""
import argparse
import json
import os
import subprocess
import sys

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

API_URL = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3101/api")
# Ensure /api suffix is present
if not API_URL.endswith("/api"):
    API_URL = API_URL.rstrip("/") + "/api"
API_KEY = os.environ.get("PAPERCLIP_API_KEY", "")
COMPANY_ID = os.environ.get("PAPERCLIP_COMPANY_ID", "")
ADAPTER_TYPE = "hermes_local"

# Default for Aegis-host agents (the fleet's primary runtime).
# All hermes_local agents on Aegis use profiles that default to provider=nous
# with OAuth authentication (not NOUS_API_KEY — the profiles use oauth auth_mode).
# The model is poolside/laguna-s-2.1:free, accessible via the Nous inference API
# using OAuth bearer tokens (see JAC-4565-2).
DEFAULT_PROVIDER = "nous"
DEFAULT_MODEL = "poolside/laguna-s-2.1:free"

# Agents with specific executionLane overrides (from their metadata).
# These take priority over the default and are also discoverable via
# executionLane metadata in the Paperclip API.
SPECIAL_CASE_OVERRIDES = {
    "Luna High Planner": ("xai-oauth", "grok-4-fast-reasoning"),
    "Klaude Pi": ("kimi-coding", "k2p7"),
    "Flash": ("ollama-cloud", "deepseek-v4-flash"),
    "Hermes Mistral": ("ollama-cloud", "deepseek-v4-pro"),
    "Watchdog": ("ollama-launch", "qwen3-coder:30b"),
    "Analyst-Sonnet": ("nous", "poolside/laguna-s-2.1:free"),
    "Analyst-Opus": ("nous", "poolside/laguna-s-2.1:free"),
    "Flash Executor": ("nous", "poolside/laguna-s-2.1:free"),
}

# ---------------------------------------------------------------------------
# API helpers (using curl for reliability)
# ---------------------------------------------------------------------------

def api_get(path):
    """Make a GET request to the Paperclip API using curl."""
    url = f"{API_URL}{path}"
    cmd = [
        "curl", "-sS", url,
        "-H", f"Authorization: Bearer {API_KEY}",
    ]
    run_id = os.environ.get("PAPERCLIP_RUN_ID", "")
    if run_id:
        cmd.extend(["-H", f"X-Paperclip-Run-Id: {run_id}"])
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            print(f"  ERROR GET {path}: curl exit {result.returncode} — {result.stderr[:200]}")
            return None
        return json.loads(result.stdout) if result.stdout else None
    except Exception as e:
        print(f"  ERROR GET {path}: {e}")
        return None

def api_patch(path, data):
    """Make a PATCH request to the Paperclip API using curl."""
    url = f"{API_URL}{path}"
    body = json.dumps(data)
    cmd = [
        "curl", "-sS", "-X", "PATCH", url,
        "-H", f"Authorization: Bearer {API_KEY}",
        "-H", "Content-Type: application/json",
        "--data-binary", body,
    ]
    run_id = os.environ.get("PAPERCLIP_RUN_ID", "")
    if run_id:
        cmd.extend(["-H", f"X-Paperclip-Run-Id: {run_id}"])
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            return {"_error": f"curl exit {result.returncode}", "_body": result.stderr[:200]}
        return json.loads(result.stdout) if result.stdout else {}
    except Exception as e:
        return {"_error": str(e)}

# ---------------------------------------------------------------------------
# Provider/model resolution
# ---------------------------------------------------------------------------

def infer_config_from_agent(agent):
    """
    Determine the correct provider/model for a hermes_local agent based on
    its metadata and known fleet assignments.

    Priority:
      1. executionLane metadata (authoritative, set by Wings/Luna)
      2. Special-case overrides (known fleet model assignments)
      3. Agent name-based inference (klaude/sonnet -> kimi-coding)
      4. Aegis profile default (nous/poolside/laguna-s-2.1:free)
    """
    name = agent.get("name", "")
    meta = agent.get("metadata") or {}

    # 1. Check executionLane metadata first (authoritative)
    lane = meta.get("executionLane") if isinstance(meta, dict) else None
    if lane and isinstance(lane, dict):
        model = lane.get("model")
        provider = lane.get("provider")
        if model and provider:
            return provider, model, "executionLane"

    # 2. Check special-case overrides (known fleet assignments)
    if name in SPECIAL_CASE_OVERRIDES:
        provider, model = SPECIAL_CASE_OVERRIDES[name]
        return provider, model, "fleet-override"

    # 3. Agent name-based inference for known patterns
    name_lower = name.lower()
    if "sonnet" in name_lower:
        return ("kimi-coding", "k2p7", "name-inference")
    if "opus" in name_lower:
        return (DEFAULT_PROVIDER, DEFAULT_MODEL, "name-inference")

    # 4. Fall back to Aegis profile default
    return (DEFAULT_PROVIDER, DEFAULT_MODEL, "default")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Batch-patch hermes_local adapterConfig")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--only-errored", action="store_true", help="Only patch agents in error state")
    args = parser.parse_args()

    if not API_KEY or not COMPANY_ID:
        print("ERROR: PAPERCLIP_API_KEY and PAPERCLIP_COMPANY_ID must be set", file=sys.stderr)
        sys.exit(1)

    print(f"=== Batch-patch hermes_local adapterConfig ===")
    print(f"  API: {API_URL}")
    print(f"  Company: {COMPANY_ID}")
    print(f"  Dry run: {args.dry_run}")
    print(f"  Only errored: {args.only_errored}")
    print()

    # Step 1: Fetch all agents
    print("[1] Fetching agents...")
    agents = api_get(f"/companies/{COMPANY_ID}/agents")
    if agents is None:
        print("ERROR: Failed to fetch agents")
        sys.exit(1)

    hermes_agents = [a for a in agents if a.get("adapterType") == ADAPTER_TYPE]
    if args.only_errored:
        hermes_agents = [a for a in hermes_agents if a.get("status") == "error"]
    print(f"    Found {len(hermes_agents)} hermes_local agents" + (" (errored only)" if args.only_errored else ""))
    print(f"    Of those, {len([a for a in hermes_agents if not a.get('adapterConfig') or len(a.get('adapterConfig', {})) == 0])} have empty adapterConfig")
    print()

    # Step 2: Determine config for each and build patch list
    patches = []
    for agent in hermes_agents:
        agent_id = agent["id"]
        agent_name = agent.get("name", "?")
        existing_config = agent.get("adapterConfig") or {}

        provider, model, source = infer_config_from_agent(agent)

        # Check if the agent already has the correct config
        already_set = (
            existing_config.get("provider") == provider
            and existing_config.get("model") == model
        )

        new_config = {
            "provider": provider,
            "model": model,
            "timeoutSec": 1800,
            "graceSec": 10,
        }

        # Preserve any existing env or cwd config
        if existing_config.get("env"):
            new_config["env"] = existing_config["env"]
        if existing_config.get("cwd"):
            new_config["cwd"] = existing_config["cwd"]
        if existing_config.get("instructionsFilePath"):
            new_config["instructionsFilePath"] = existing_config["instructionsFilePath"]

        if already_set:
            status = "OK (already set)"
        else:
            status = "NEEDS PATCH"

        patches.append({
            "agent_id": agent_id,
            "agent_name": agent_name,
            "status": agent.get("status", "?"),
            "provider": provider,
            "model": model,
            "source": source,
            "new_config": new_config,
            "already_set": already_set,
            "status_str": status,
        })

        if args.verbose or (not already_set):
            print(f"    [{status}] {agent_name} ({agent_id[:8]}) [status={agent.get('status','?')}] -> provider={provider}, model={model} (from {source})")

    needs_patch = [p for p in patches if not p["already_set"]]
    already_ok = [p for p in patches if p["already_set"]]
    print()
    print(f"  Summary: {len(already_ok)} already set, {len(needs_patch)} need patching")
    print()

    if args.dry_run:
        print("[DRY RUN — no changes made]")
        for p in needs_patch:
            print(f"  Would PATCH {p['agent_name']} ({p['agent_id'][:8]}) [status={p['status']}] with adapterConfig:")
            print(f"    {json.dumps(p['new_config'])}")
        print()
        print(f"Total patches (dry run): {len(needs_patch)}")
        return 0

    # Step 3: Apply patches
    print("[3] Applying patches...")
    success = 0
    failed = 0

    for p in needs_patch:
        agent_path = f"/agents/{p['agent_id']}"
        result = api_patch(agent_path, {"adapterConfig": p["new_config"]})

        if result and "_error" in result:
            print(f"    FAILED: {p['agent_name']} ({p['agent_id'][:8]}) — {result['_error']}")
            failed += 1
        elif result and result.get("id"):
            # Verify the patch was applied
            updated = result.get("adapterConfig", {})
            if updated.get("provider") == p["provider"] and updated.get("model") == p["model"]:
                print(f"    OK: {p['agent_name']} ({p['agent_id'][:8]}) [status={p['status']}] — adapterConfig patched")
                success += 1
            else:
                print(f"    PARTIAL: {p['agent_name']} ({p['agent_id'][:8]}) — PATCH returned but config mismatch")
                print(f"      Expected: provider={p['provider']}, model={p['model']}")
                print(f"      Got: provider={updated.get('provider')}, model={updated.get('model')}")
                failed += 1
        else:
            print(f"    UNKNOWN: {p['agent_name']} ({p['agent_id'][:8]}) — unexpected response: {json.dumps(result)[:200]}")
            failed += 1

    print()
    print(f"Results: {success} patched, {failed} failed, {len(already_ok)} already set")
    print()

    # Step 4: Verification — re-fetch and confirm
    print("[4] Verifying...")
    agents_after = api_get(f"/companies/{COMPANY_ID}/agents")
    if agents_after:
        hermes_after = [a for a in agents_after if a.get("adapterType") == ADAPTER_TYPE]
        if args.only_errored:
            hermes_after = [a for a in hermes_after if a.get("status") == "error"]
        empty_after = [a for a in hermes_after if not a.get("adapterConfig") or len(a.get("adapterConfig", {})) == 0]
        nonempty_after = [a for a in hermes_after if a.get("adapterConfig") and len(a.get("adapterConfig", {})) > 0]

        print(f"    hermes_local agents: {len(hermes_after)}")
        print(f"    With empty adapterConfig: {len(empty_after)}")
        print(f"    With populated adapterConfig: {len(nonempty_after)}")

        if empty_after:
            print(f"    Still empty:")
            for a in empty_after:
                print(f"      {a['name']} ({a['id'][:8]}) [status={a.get('status','?')}]")

        # Verify no agent uses model="auto"
        auto_agents = [a for a in nonempty_after if a.get("adapterConfig", {}).get("model") == "auto"]
        if auto_agents:
            print(f"    WARNING: {len(auto_agents)} agents still use model=\"auto\":")
            for a in auto_agents:
                print(f"      {a['name']} ({a['id'][:8]})")

        if len(empty_after) == 0 and len(auto_agents) == 0:
            print()
            print("    VERIFICATION PASSED: All hermes_local agents have explicit provider+model")
            return 0
        else:
            print()
            print("    VERIFICATION FAILED: See warnings above")
            return 1

    print()
    print("    VERIFICATION: Could not re-fetch agents for verification")
    return 1

if __name__ == "__main__":
    sys.exit(main())
