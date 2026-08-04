# Recommended: Hermes-Based Paperclip Agent via Ollama Cloud

## Better Approach (Supersedes Toolsets Gotcha)

Instead of patching existing Paperclip agents (Bright, Ringsmith, Wings) with brain search access, create a **new dedicated Hermes agent** that already has everything wired correctly.

### Why This Is Better
- ✅ No toolsets allowlist complexity
- ✅ Uses existing Hermes + Ollama Cloud infrastructure (already deployed)
- ✅ Hermes is fully configured with fallback chains
- ✅ Paperclip already supports hermes adapter
- ✅ One clean, purpose-built agent vs patching three existing ones

### Configuration

```json
{
  "name": "Hermes Paperclip Agent",
  "adapter": "hermes",
  "adapterConfig": {
    "env": "aegis",
    "profile": "paperclip-compact",
    "model": "deepseek-v4-pro",
    "provider": "ollama-cloud",
    "gateway_timeout": 600,
    "max_turns": 25,
    "toolsets": ["hermes-cli", "web"],
    "compression": {
      "enabled": true,
      "threshold": 0.3,
      "target_ratio": 0.15
    }
  }
}
```

### Model Route (Ollama Cloud)
- **Primary:** `deepseek-v4-pro` (strong, proven)
- **Fallback 1:** `gpt-5.1` (via OpenAI)
- **Fallback 2:** `gpt-5.4` (via Copilot)
- **Local fallback:** `qwen3:8b` (via ollama-launch)

### Deployment
1. Create agent via Paperclip API: `POST /api/agents` with config above
2. Assign to issues that need Paperclip task automation
3. Use instead of (or alongside) Wings/Bright/Ringsmith for Ollama-backed work

### Why Hermes + deepseek-v4-pro is ideal for Paperclip
- Hermes is already running the Paperclip canaries (proven track record)
- deepseek-v4-pro is strong enough for complex tasks
- Ollama Cloud avoids OpenAI quota constraints
- paperclip-compact profile is optimized for these runs

---

**Next step for human:** Create this agent in Paperclip UI or via API.
