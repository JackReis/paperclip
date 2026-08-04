import json, urllib.request, os

API_URL = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3101")
API_KEY = os.environ.get("PAPERCLIP_API_KEY", "")
COMPANY = "87c32b8e-f131-4df8-ad8e-963d01b458e7"
base = API_URL.rstrip("/")
headers = {"Authorization": f"Bearer {API_KEY}"}

def api(path, method="GET", data=None):
    url = f"{base}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, headers=headers, method=method, data=body)
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()[:500]
        print(f"  HTTP {e.code}: {body_text}")
        return None

JAC4511_UUID = "db205909-2606-4763-89d6-1917b040b6a1"
AEGIS_CODER_X_UUID = "da00de99-f9d0-d93a-45f0-2d0e8c7f8e86"

# Try checkout endpoint - check what it expects
print("=== Checkout JAC-4511 to Aegis Coder X ===")
# The checkout API likely needs {"assigneeAgentId": "...", "runId": "..."} or similar
# Let's try with the agent assignment
result = api(f"/api/issues/{JAC4511_UUID}/checkout", method="POST", data={
    "assigneeAgentId": AEGIS_CODER_X_UUID,
    "runId": "3c501524-e7d4-4b70-b476-504dc9b581a5"
})
if result:
    print(json.dumps(result, indent=2, default=str))
