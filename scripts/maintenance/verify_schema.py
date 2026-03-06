"""Verify the database schema after restructuring"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))
from backend.database import PWOSDatabase

db = PWOSDatabase()
conn = db.get_connection()
cur = conn.cursor()

tables = ['sensor_readings', 'watering_events', 'system_logs', 'ml_decisions']

for table in tables:
    cur.execute(
        "SELECT column_name, data_type FROM information_schema.columns "
        "WHERE table_name = %s ORDER BY ordinal_position", (table,)
    )
    cols = cur.fetchall()
    print(f"\n=== {table} ({len(cols)} columns) ===")
    for name, dtype in cols:
        print(f"  {name:30s} {dtype}")

# Quick data check
print("\n=== Data Verification ===")
cur.execute("SELECT COUNT(*) FROM sensor_readings WHERE rain_intensity IS NOT NULL AND rain_intensity > 0")
print(f"  sensor_readings with rain data: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM sensor_readings WHERE weather_source != 'none'")
print(f"  sensor_readings with weather_source: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM ml_decisions")
print(f"  ml_decisions entries: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM watering_events WHERE moisture_after IS NOT NULL")
print(f"  watering_events with moisture_after: {cur.fetchone()[0]}")

conn.close()
