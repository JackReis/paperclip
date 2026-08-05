import sys, json

data = json.load(sys.stdin)
if isinstance(data, dict):
    agents = data.get('agents', data.get('data', []))
else:
    agents = data

print(f'Total: {len(agents)}')
errored = [a for a in agents if a.get('status') == 'error']
hermes_local = [a for a in agents if a.get('adapterType') == 'hermes_local']
errored_hermes_local = [a for a in errored if a.get('adapterType') == 'hermes_local']
print(f'Error status: {len(errored)} | hermes_local total: {len(hermes_local)} | errored hermes_local: {len(errored_hermes_local)}')

for a in errored_hermes_local:
    cfg = a.get('adapterConfig')
    if cfg is None:
        cfg = {}
    model = cfg.get('model', '') if isinstance(cfg, dict) else ''
    provider = cfg.get('provider', '') if isinstance(cfg, dict) else ''
    name = a.get('name', '?')
    aid = a.get('id', '?')
    status = a.get('status', '?')
    err = (a.get('errorReason') or '')[:100]
    print(f"  {name}: id={aid[:8] if aid != '?' else '?'} status={status} cfg_empty={not cfg or not model} model='{model}' provider='{provider}' error='{err}'")
