import sys
import os
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'backend'))
from database import PWOSDatabase

db = PWOSDatabase()
conn = db.get_connection()
cursor = conn.cursor()

# Get max timestamp
cursor.execute('SELECT MAX(timestamp) FROM ml_decisions')
max_time = cursor.fetchone()[0]
if max_time is None:
    print('No decisions found in the database.')
    sys.exit(0)

six_hours_ago = max_time - timedelta(hours=6)

cursor.execute('''
    SELECT timestamp, soil_moisture, temperature, humidity, vpd, wind_speed, decision, confidence, reason 
    FROM ml_decisions 
    WHERE timestamp >= %s 
    ORDER BY timestamp ASC
''', (six_hours_ago,))

rows = cursor.fetchall()
conn.close()

print(f"=== ML Decisions Log (Last 6 Hours: {six_hours_ago.strftime('%Y-%m-%d %H:%M:%S')} to {max_time.strftime('%Y-%m-%d %H:%M:%S')}) ===")
print(f"Total decisions logged in this window: {len(rows)}")
print("-" * 100)

for timestamp, soil_moisture, temp, hum, vpd, wind, decision, confidence, reason in rows:
    time_str = timestamp.strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{time_str}] Telemetry: Moisture={soil_moisture:.1f}%, Temp={temp:.1f}C, Humidity={hum:.1f}%, VPD={vpd:.2f} kPa, Wind={wind:.1f} km/h")
    print(f"           Decision : {decision} ({confidence:.1f}% confidence)")
    print(f"           Reason   : {reason}")
    print("-" * 100)
