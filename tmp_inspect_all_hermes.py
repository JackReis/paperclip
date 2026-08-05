import sys, json

data = json.load(sys.stdin)
if isinstance(data, dict):
    agents = data.get('agents', data.get('data', []))
else:
    agents = data

# All hermes_local with full detail
hermes_local = [a for a in agents if a.get('adapterType') == 'hermes_local']
print(f'=== ALL {len(hermes_local)} hermes_local agents ===')
for a in hermes_local:
    cfg = a.get('adapterConfig') or {}
    model = cfg.get('model', '') if isinstance(cfg, dict) else ''
    provider = cfg.get('provider', '') if isinstance(cfg, dict) else ''
    print(json.dumps({
        'name': a.get('name'),
        'id': a.get('id'),
        'status': a.get('status'),
        'adapterType': a.get('adapterType'),
        'adapterConfig': cfg,
        'errorReason': (a.get('errorReason') or '')[:150],
        'lastHeartbeatAt': a.get('lastHeartbeatAt'),
    }, indent=2))
