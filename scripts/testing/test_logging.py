
import requests
import time
import sys

API_URL = "http://localhost:5000/api"

def test_logging():
    print("--- Testing Persistent Logging ---")
    
    # 1. Post a Log
    msg = f"Test Log Entry {int(time.time())}"
    print(f"Posting: {msg}")
    try:
        r = requests.post(f"{API_URL}/logs", json={"message": msg, "type": "TEST"})
        if r.status_code == 200:
            print("[OK] Log Posted")
        else:
            print(f"[FAIL] Post failed: {r.status_code}")
            return
    except Exception as e:
        print(f"[FAIL] Connection error: {e}")
        return

    # 2. Get Logs
    print("Fetching Logs...")
    try:
        r = requests.get(f"{API_URL}/logs")
        logs = r.json()
        
        found = False
        for log in logs:
            print(f" - [{log['timestamp']}] {log['type']}: {log['message']}")
            if log['message'] == msg:
                found = True
        
        if found:
            print("\n[SUCCESS] Test Log Found in Database Retrieval!")
        else:
            print("\n[FAIL] Test Log NOT found.")
            
    except Exception as e:
        print(f"[FAIL] {e}")

if __name__ == "__main__":
    test_logging()
