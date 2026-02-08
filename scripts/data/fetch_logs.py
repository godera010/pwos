
import requests
import json
import sys

try:
    response = requests.get('http://localhost:5000/api/logs')
    data = response.json()
    with open('temp_logs.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print("Logs saved to temp_logs.json")
except Exception as e:
    print(f"Error: {e}")
