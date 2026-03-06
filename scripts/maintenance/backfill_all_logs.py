"""
Comprehensive Log Backfill Script
Extracts data from ALL log files and inserts into the database.
Handles duplicates by checking existing timestamps.

Log Files Processed:
1. esp32_simulator.log  - Sensor readings (VPD, Temp, Humidity, Moisture, Condition)
2. autopilot.log        - Watering events (pump triggers with duration + moisture)
3. weather_dashboard.log - Weather data (temp, humidity, forecast_minutes)
4. db_subscriber.log    - Already backfilled (sensor readings)
5. ml_monitor.log       - Already backfilled (ML decisions)
6. app.log              - HTTP noise only, skipped
"""

import sys
import os
import re
from datetime import datetime
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))
from backend.database import PWOSDatabase

LOGS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'logs')
db = PWOSDatabase()

# Stats tracking
stats = defaultdict(int)


def parse_timestamp(ts_str):
    """Parse log timestamp like '2026-02-08 14:54:42,626'"""
    try:
        return datetime.strptime(ts_str.split(',')[0], '%Y-%m-%d %H:%M:%S')
    except Exception:
        return None


def get_existing_timestamps(table, limit_hours=None):
    """Get set of existing timestamps from a table to avoid duplicates"""
    conn = db.get_connection()
    cursor = conn.cursor()
    query = f"SELECT timestamp FROM {table}"
    cursor.execute(query)
    timestamps = {row[0] for row in cursor.fetchall()}
    conn.close()
    return timestamps


def batch_insert(table, columns, rows, batch_size=500):
    """Efficient batch insert with duplicate skipping"""
    if not rows:
        return 0
    
    conn = db.get_connection()
    cursor = conn.cursor()
    
    placeholders = ', '.join(['%s'] * len(columns))
    col_names = ', '.join(columns)
    query = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders})"
    
    inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        try:
            cursor.executemany(query, batch)
            conn.commit()
            inserted += len(batch)
        except Exception as e:
            conn.rollback()
            # Fall back to individual inserts
            for row in batch:
                try:
                    cursor.execute(query, row)
                    conn.commit()
                    inserted += 1
                except Exception:
                    conn.rollback()
    
    conn.close()
    return inserted


# ============================================================================
# 1. ESP32 SIMULATOR LOG -> sensor_readings
# Format: 2026-02-08 14:54:42,635 - ESP32_Sim - INFO - [14:54] Sunny | VPD:1.25kPa | T:24.91C H:60.41% | M:59.98%
# ============================================================================
def backfill_esp32_simulator():
    print("\n[STEP 1] Parsing esp32_simulator.log -> sensor_readings...")
    
    log_path = os.path.join(LOGS_DIR, 'esp32_simulator.log')
    if not os.path.exists(log_path):
        print("  [SKIP] esp32_simulator.log not found")
        return
    
    existing = get_existing_timestamps('sensor_readings')
    
    # Pattern: [HH:MM] Condition | VPD:X.XXkPa | T:XX.XXC H:XX.XX% | M:XX.XX%
    pattern = re.compile(
        r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ - ESP32_Sim - INFO - '
        r'\[\d+:\d+\] (\w+) \| VPD:([\d.]+)kPa \| T:([\d.]+)C H:([\d.]+)% \| M:([\d.]+)%'
    )
    
    rows = []
    skipped = 0
    
    with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            match = pattern.match(line.strip())
            if not match:
                continue
            
            ts = parse_timestamp(match.group(1))
            if not ts or ts in existing:
                skipped += 1
                continue
            
            condition = match.group(2)
            vpd = float(match.group(3))
            temp = float(match.group(4))
            humidity = float(match.group(5))
            moisture = float(match.group(6))
            
            rows.append((
                ts,             # timestamp
                moisture,       # soil_moisture
                temp,           # temperature
                humidity,       # humidity
                'esp32_sim',    # device_id
                0,              # forecast_minutes
                0.0,            # wind_speed
                0,              # precipitation_chance
                vpd,            # vpd
                0.0,            # rain_intensity
                0.0,            # cloud_cover
                0.0,            # forecast_temp
                0.0,            # forecast_humidity
                condition,      # weather_condition
                'esp32_log'     # weather_source
            ))
            existing.add(ts)
    
    columns = [
        'timestamp', 'soil_moisture', 'temperature', 'humidity', 'device_id',
        'forecast_minutes', 'wind_speed', 'precipitation_chance', 'vpd',
        'rain_intensity', 'cloud_cover', 'forecast_temp', 'forecast_humidity',
        'weather_condition', 'weather_source'
    ]
    
    inserted = batch_insert('sensor_readings', columns, rows)
    print(f"  Parsed {len(rows) + skipped} sensor lines")
    print(f"  Inserted {inserted} new sensor readings")
    print(f"  Skipped {skipped} (already existed)")
    stats['esp32_inserted'] = inserted


# ============================================================================
# 2. AUTOPILOT LOG -> watering_events
# Trigger: "Moisture XX%. Triggering Pump for XXs."
# (was previously using emojis, now cleaned)
# ============================================================================
def backfill_autopilot():
    print("\n[STEP 2] Parsing autopilot.log -> watering_events...")
    
    log_path = os.path.join(LOGS_DIR, 'autopilot.log')
    if not os.path.exists(log_path):
        print("  [SKIP] autopilot.log not found")
        return
    
    existing = get_existing_timestamps('watering_events')
    
    # Pattern: "M:XX.XX% | Action: WATER_NOW | ... Need XXs to reach XX%"
    trigger_pattern = re.compile(
        r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ - Autopilot - INFO - '
        r'M:([\d.]+)% \| Action: WATER_NOW \|.*?Need (\d+)s'
    )
    
    rows = []
    skipped = 0
    
    with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            match = trigger_pattern.match(line.strip())
            if not match:
                continue
            
            ts = parse_timestamp(match.group(1))
            if not ts or ts in existing:
                skipped += 1
                continue
            
            moisture = float(match.group(2))
            duration = int(match.group(3))
            
            rows.append((
                ts,             # timestamp
                duration,       # duration_seconds
                'AUTO',         # trigger_type
                moisture,       # moisture_before
                None            # moisture_after (never captured in logs)
            ))
            existing.add(ts)
    
    columns = ['timestamp', 'duration_seconds', 'trigger_type', 'moisture_before', 'moisture_after']
    inserted = batch_insert('watering_events', columns, rows)
    print(f"  Found {len(rows) + skipped} pump triggers")
    print(f"  Inserted {inserted} new watering events")
    print(f"  Skipped {skipped} (already existed)")
    stats['autopilot_watering'] = inserted


# ============================================================================
# 3. AUTOPILOT LOG -> system_logs (filtered: only action messages)
# ============================================================================
def backfill_autopilot_logs():
    print("\n[STEP 3] Parsing autopilot.log -> system_logs...")
    
    log_path = os.path.join(LOGS_DIR, 'autopilot.log')
    if not os.path.exists(log_path):
        print("  [SKIP] autopilot.log not found")
        return
    
    existing = get_existing_timestamps('system_logs')
    
    # Only capture meaningful action lines (pump triggers, mode changes, errors)
    action_pattern = re.compile(
        r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ - Autopilot - (\w+) - (.+)$'
    )
    
    # Filter for interesting messages only
    interesting = re.compile(
        r'Triggering|Pump activated|Pump cycle|Starting|Error|CRITICAL|WARNING|Mode|moisture_after',
        re.IGNORECASE
    )
    
    rows = []
    skipped = 0
    
    with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            match = action_pattern.match(line.strip())
            if not match:
                continue
            
            msg = match.group(3)
            if not interesting.search(msg):
                continue
            
            ts = parse_timestamp(match.group(1))
            if not ts or ts in existing:
                skipped += 1
                continue
            
            level = match.group(2)
            
            rows.append((
                ts,              # timestamp
                level,           # level
                'autopilot',     # source
                msg              # message
            ))
            existing.add(ts)
    
    columns = ['timestamp', 'level', 'source', 'message']
    inserted = batch_insert('system_logs', columns, rows)
    print(f"  Inserted {inserted} autopilot action logs")
    print(f"  Skipped {skipped} (already existed)")
    stats['autopilot_logs'] = inserted


# ============================================================================
# 4. WEATHER DASHBOARD LOG -> system_logs (weather snapshots)
# Format: Weather Update: 24.38C, 60%, Rain Forecast: 135m
# ============================================================================
def backfill_weather_dashboard():
    print("\n[STEP 4] Parsing weather_dashboard.log -> system_logs...")
    
    log_path = os.path.join(LOGS_DIR, 'weather_dashboard.log')
    if not os.path.exists(log_path):
        print("  [SKIP] weather_dashboard.log not found")
        return
    
    existing = get_existing_timestamps('system_logs')
    
    pattern = re.compile(
        r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ - WeatherDash - (\w+) - (.+)$'
    )
    
    rows = []
    skipped = 0
    
    with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            match = pattern.match(line.strip())
            if not match:
                continue
            
            ts = parse_timestamp(match.group(1))
            if not ts or ts in existing:
                skipped += 1
                continue
            
            level = match.group(2)
            msg = match.group(3)
            
            rows.append((
                ts,              # timestamp
                level,           # level
                'weather',       # source
                msg              # message
            ))
            existing.add(ts)
    
    columns = ['timestamp', 'level', 'source', 'message']
    inserted = batch_insert('system_logs', columns, rows)
    print(f"  Inserted {inserted} weather logs")
    print(f"  Skipped {skipped} (already existed)")
    stats['weather_logs'] = inserted


# ============================================================================
# 5. FINAL VERIFICATION
# ============================================================================
def verify():
    print("\n[STEP 5] Final verification...")
    
    conn = db.get_connection()
    cursor = conn.cursor()
    
    tables = ['sensor_readings', 'ml_decisions', 'watering_events', 'system_logs']
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  {table}: {count:,} rows")
    
    # Watering events breakdown
    cursor.execute("SELECT trigger_type, COUNT(*) FROM watering_events GROUP BY trigger_type ORDER BY COUNT(*) DESC")
    print("\n  Watering events breakdown:")
    for trigger_type, count in cursor.fetchall():
        print(f"    {trigger_type or 'NULL':12s}: {count}")
    
    # System logs by source
    cursor.execute("SELECT source, COUNT(*) FROM system_logs GROUP BY source ORDER BY COUNT(*) DESC")
    print("\n  System logs by source:")
    for source, count in cursor.fetchall():
        print(f"    {source or 'NULL':12s}: {count}")
    
    # Sensor readings by source
    cursor.execute("SELECT weather_source, COUNT(*) FROM sensor_readings GROUP BY weather_source ORDER BY COUNT(*) DESC")
    print("\n  Sensor readings by source:")
    for source, count in cursor.fetchall():
        print(f"    {source or 'NULL':12s}: {count}")
    
    conn.close()


# ============================================================================
# MAIN
# ============================================================================
if __name__ == '__main__':
    print("=" * 60)
    print("P-WOS Comprehensive Log Backfill")
    print("=" * 60)
    
    backfill_esp32_simulator()
    backfill_autopilot()
    backfill_autopilot_logs()
    backfill_weather_dashboard()
    verify()
    
    print("\n" + "=" * 60)
    print("[DONE] Backfill complete!")
    print("=" * 60)
