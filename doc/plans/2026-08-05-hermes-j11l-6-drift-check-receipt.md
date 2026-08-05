# Drift-Check Receipt - JAC-4743

{
  "receiptId": "jac-4743-drift-check-receipt-20260805T192537Z",
  "timestamp": "2026-08-05T19:25:37Z",
  "checkerVersion": "hermes-j11l.6.6 (updated 2026-08-05T19:25Z)",
  "auditor": "Aegis (100915f9, hermes_local)",
  "paperclipIssue": "fefa2a2f-5786-4d83-aaf8-83e3dc409154",
  "beadsTask": "hermes-j11l.6",
  "humanGate": {
    "approver": "Jack Reis",
    "timestamp": "2026-08-05T18:29:14Z",
    "approval": "approve everything, proceed, the provider needs to STAY nous",
    "override": "provider=nous kept; openrouter change SKIPPED"
  },
  "preReconciliationDrift": [
    {
      "field": "memory.provider",
      "Aegis": "ob1,hindsight,holographic,honcho",
      "Talari": "holographic",
      "status": "DRIFT"
    },
    {
      "field": "model.provider",
      "Aegis": "nous",
      "Talari": "nous",
      "status": "OK"
    },
    {
      "file": ".hermes/SOUL.md",
      "Aegis_hash": "1a0cd1a4",
      "Talari_hash": "2765a846",
      "status": "DRIFT"
    },
    {
      "file": "=notes/CLAUDE.md",
      "Aegis_hash": "ca957691",
      "Talari_hash": "54548d79",
      "status": "DRIFT"
    },
    {
      "file": ".codex/AGENTS.md",
      "Aegis_size": 1657,
      "Talari_size": 1578,
      "status": "DRIFT (truncated)"
    }
  ],
  "postReconciliationState": [
    {
      "field": "memory.provider",
      "Aegis": "ob1,hindsight,holographic,honcho",
      "Talari": "ob1,hindsight,holographic,honcho",
      "status": "OK"
    },
    {
      "field": "model.provider",
      "Aegis": "nous",
      "Talari": "nous",
      "status": "OK"
    },
    {
      "file": ".hermes/SOUL.md",
      "Aegis_hash": "1a0cd1a4",
      "Talari_hash": "1a0cd1a4",
      "status": "OK (synced)"
    },
    {
      "file": "=notes/CLAUDE.md",
      "Aegis_hash": "ca957691",
      "Talari_hash": "ca957691",
      "status": "OK (synced)"
    },
    {
      "file": ".codex/AGENTS.md",
      "Aegis_size": 16569,
      "Talari_size": 7923,
      "status": "OK (restored)"
    },
    {
      "field": ".clanne/CLAUDE.md",
      "Aegis": "5263 bytes (Jul 30) host-specific",
      "Talari": "17197 bytes (Jul 9) user-level",
      "status": "INFO (host-specific, not compared)"
    }
  ],
  "mutationsApplied": [
    "Restored Aegis ~/.codex/AGENTS.md (1657 -> 16569 bytes)",
    "Restored Talari ~/.codex/AGENTS.md (1578 -> 7923 bytes from .bak-20260702)",
    "Updated Talari config.yaml memory.provider: holographic -> ob1,hindsight,holographic,honcho",
    "Deployed OB1 plugin to Talari ~/.hermes/plugins/ob1/",
    "Deployed 4-plane aggregate plugin to Talari ~/.hermes/plugins/ob1,hindsight,holographic,honcho/",
    "Added OPENBRAIN_URL/KEY/WORKSPACE_ID/MODE/PREFIX env vars to Talari .env",
    "Created Talari ~/.hermes/ob1.json with endpoint config",
    "Synced .hermes/SOUL.md from Aegis to Talari (hash 1a0cd1a4)",
    "Synced =notes/CLAUDE.md from Aegis to Talari (hash ca957691)",
    "Updated drift-checker script to mark .clanne/CLAUDE.md as host-specific (INFO not DRIFT)"
  ],
  "mutationsSkipped": [
    "provider=nous -> openrouter (SKIPPED per Jack override: provider stays nous)",
    "model.base_url change (tied to provider change)",
    "model.fallback_providers change (tied to provider change)"
  ],
  "checkerPolicy": "read-only; compares approved markers/hashes and hook health; never scrapes tokens, cookies, conversations, or private account databases",
  "result": "PASS - all drifts reconciled per human-gate approval; provider=nous preserved per Jack override"
}
