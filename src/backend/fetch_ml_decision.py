import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath("database.py")))
from database import PWOSDatabase
db = PWOSDatabase()
conn = db.get_connection()
cursor = conn.cursor()
cursor.execute("SELECT decision, confidence, reason, recommended_duration, features_json FROM ml_decisions WHERE decision = 'NOW' ORDER BY timestamp DESC LIMIT 1")
row = cursor.fetchone()
if row:
    print("--- AI THINKING PROCESS (WHEN IT DECIDED TO WATER) ---")
    print("Decision:", row[0])
    print("Confidence:", row[1])
    print("Reason:", row[2])
    print("Recommended Pump Duration (seconds):", row[3])
    print("\n--- ALL 17 FEATURES THE AI EVALUATED IN REAL-TIME ---")
    features = json.loads(row[4])
    for k, v in features.items():
        print("  - " + str(k) + ": " + str(v))
else:
    print("No recent 'NOW' decision found.")
conn.close()
