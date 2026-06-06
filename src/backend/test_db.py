import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath("database.py")))
from database import PWOSDatabase
db = PWOSDatabase()
try:
    db.record_watering_event(1.7, "AUTO", 0.0, 50.0)
    print("SUCCESS")
except Exception as e:
    print("ERROR:", e)
