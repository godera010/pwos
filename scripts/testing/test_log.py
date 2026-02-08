import requests

API_URL = "http://localhost:5000/api"

print(f"Testing POST to {API_URL}/logs...")
try:
    resp = requests.post(f"{API_URL}/logs", json={"message": "Test Log", "type": "TEST"})
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")

print("Testing GET...")
try:
    logs = resp.json()
    print(f"Log Count: {len(logs)}")
    for log in logs:
        try:
            print(f"- {log}")
        except:
            print(f"- [Unprintable Log]")
except Exception as e:
    print(f"Error: {e}")
