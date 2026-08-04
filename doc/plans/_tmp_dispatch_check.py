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
        print(f"  HTTP {e.code}: {e.read().decode()[:300]}")
        return None

# Check if JAC-3705 workspace is valid
print("=== JAC-3705 workspace check ===")
ws = api("/api/issues/4eda180d-baa2-4a50-981f-91a3edbb6a1d/workspace")
if ws:
    print(json.dumps({k: ws.get(k) for k in ['id','projectWorkspaceId','validated','workspaceType','status']}, indent=2, default=str))

# Check if there's a dispatch/checkout endpoint
print("\n=== Issue checkout (dry - just check if endpoint exists) ===")
# We won't actually checkout, just verify the endpoint exists
import urllib.request, urllib.error
url = f"{base}/api/issues/4eda180d-baa2-4a50-981f-91a3edbb6a1d/checkout"
req = urllib.request.Request(url, headers=headers, method="POST")
try:
    resp = urllib.request.urlopen(req, timeout=5)
    print(f"  Checkout endpoint exists, status: {resp.status}")
except urllib.error.HTTPError as e:
    body = e.read().decode()[:300]
    print(f"  HTTP {e.code}: {body}")
    # This tells us about the endpoint
except urllib.error.URLError as e:
    print(f"  URL Error: {e}")

# Check the Paperclip API for dispatch-related endpoints
print("\n=== Check available API routes ===")
# Try to get the OpenAPI spec or routes
for path in ["/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/issues/6fdb3b88-6786-4a4c-a2be-883d92acc155", "/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/issues/6fdb3b88-6786-4a4c-a2be-883d92acc155/comments"]:
    try:
        resp = urllib.request.urlopen(urllib.request.Request(f"{base}{path}", headers=headers), timeout=5)
    except Exception as e:
        print(f"  {path}: {e}")
