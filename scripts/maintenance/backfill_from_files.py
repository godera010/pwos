"""
Fast Batch Backfill Script
Parses logs/ directory files and batch-inserts into PostgreSQL.
Uses a single connection + executemany for speed.
"""

import sys
import os
import re
import math
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
import psycopg2

# =====================================================
# PARSERS
# =====================================================

ML_ANALYSIS = re.compile(
    r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*?ANALYSIS:\s*\d{2}:\d{2}:\d{2}\s*\|\s*([\d.]+)%\s*\|\s*([\d.]+)C\s*\|\s*(\d+)m\s*\|\s*(\w+)\s*\|\s*([\d.]+)%\s*\|\s*(.*?)$'
)

DB_SUBSCRIBER = re.compile(
    r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*?Received: Moisture=([\d.]+)%, Temp=([\d.]+)C, Humidity=([\d.]+)%'
)

def calculate_vpd(temp, humidity):
    try:
        es = 0.6108 * math.exp((17.27 * temp) / (temp + 237.3))
        ea = es * (humidity / 100.0)
        return round(max(0, es - ea), 4)
    except:
        return 0.0

def main():
    print("=" * 70)
    print("P-WOS: Fast Batch Backfill from Log Files")
    print("=" * 70)
    
    logs_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'logs')
    
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)
    cursor = conn.cursor()
    
    # =========================================================
    # PART 1: ml_monitor.log → ml_decisions (batch)
    # =========================================================
    ml_log = os.path.join(logs_dir, 'ml_monitor.log')
    
    if os.path.exists(ml_log):
        print(f"\n[1/2] Parsing ml_monitor.log ({os.path.getsize(ml_log) / 1024 / 1024:.1f} MB)...")
        
        # Get existing timestamps to avoid duplicates
        cursor.execute("SELECT timestamp FROM ml_decisions")
        existing = set(row[0] for row in cursor.fetchall())
        print(f"  Existing ml_decisions: {len(existing)}")
        
        batch = []
        skipped = 0
        
        with open(ml_log, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                m = ML_ANALYSIS.search(line)
                if not m:
                    continue
                    
                ts = datetime.strptime(m.group(1), '%Y-%m-%d %H:%M:%S')
                if ts in existing:
                    skipped += 1
                    continue
                
                moisture = float(m.group(2))
                temp = float(m.group(3))
                forecast = int(m.group(4))
                decision = m.group(5).strip()
                confidence = float(m.group(6)) / 100.0
                reason = m.group(7).strip()
                
                if decision == "WAIT":
                    decision = "MONITOR"
                
                batch.append((
                    ts, moisture, temp, None, 0.0,
                    forecast, 0, 0.0, 0.0, None,
                    decision, confidence, reason, 0, '{}'
                ))
                existing.add(ts)
        
        print(f"  Parsed {len(batch)} new entries (skipped {skipped} duplicates)")
        
        if batch:
            # Batch insert
            BATCH_SIZE = 1000
            total_inserted = 0
            for i in range(0, len(batch), BATCH_SIZE):
                chunk = batch[i:i+BATCH_SIZE]
                psycopg2.extras.execute_batch(cursor, """
                    INSERT INTO ml_decisions 
                    (timestamp, soil_moisture, temperature, humidity, vpd,
                     forecast_minutes, precipitation_chance, wind_speed, rain_intensity,
                     decay_rate, decision, confidence, reason, recommended_duration, features_json)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, chunk, page_size=500)
                conn.commit()
                total_inserted += len(chunk)
                print(f"  Inserted {total_inserted}/{len(batch)}...")
            
            print(f"  DONE: {total_inserted} ml_decisions inserted")
    
    # =========================================================
    # PART 2: db_subscriber.log → sensor_readings (batch)
    # =========================================================
    db_log = os.path.join(logs_dir, 'db_subscriber.log')
    
    if os.path.exists(db_log):
        print(f"\n[2/2] Parsing db_subscriber.log ({os.path.getsize(db_log) / 1024 / 1024:.1f} MB)...")
        
        # Get existing timestamp range to avoid bulk duplicates
        cursor.execute("SELECT MIN(timestamp), MAX(timestamp), COUNT(*) FROM sensor_readings")
        row = cursor.fetchone()
        min_ts, max_ts, existing_count = row
        print(f"  Existing sensor_readings: {existing_count} ({min_ts} to {max_ts})")
        
        batch = []
        
        with open(db_log, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                m = DB_SUBSCRIBER.search(line)
                if not m:
                    continue
                
                ts = datetime.strptime(m.group(1), '%Y-%m-%d %H:%M:%S')
                moisture = float(m.group(2))
                temp = float(m.group(3))
                humidity = float(m.group(4))
                vpd = calculate_vpd(temp, humidity)
                
                batch.append((
                    ts, moisture, temp, humidity, 'SIM_ESP32_001',
                    0, 0.0, 0, vpd,
                    0.0, False, 'unknown', 'log_backfill'
                ))
        
        print(f"  Parsed {len(batch)} sensor readings from log")
        
        if batch:
            BATCH_SIZE = 1000
            total_inserted = 0
            for i in range(0, len(batch), BATCH_SIZE):
                chunk = batch[i:i+BATCH_SIZE]
                psycopg2.extras.execute_batch(cursor, """
                    INSERT INTO sensor_readings 
                    (timestamp, soil_moisture, temperature, humidity, device_id,
                     forecast_minutes, wind_speed, precipitation_chance, vpd,
                     rain_intensity, is_raining, weather_condition, weather_source)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, chunk, page_size=500)
                conn.commit()
                total_inserted += len(chunk)
                print(f"  Inserted {total_inserted}/{len(batch)}...")
            
            print(f"  DONE: {total_inserted} sensor_readings inserted")
    
    # =========================================================
    # SUMMARY
    # =========================================================
    print("\n" + "=" * 70)
    print("FINAL DATABASE STATUS")
    print("=" * 70)
    
    cursor.execute("SELECT COUNT(*) FROM sensor_readings")
    print(f"  sensor_readings: {cursor.fetchone()[0]:,}")
    
    cursor.execute("SELECT COUNT(*) FROM ml_decisions")
    print(f"  ml_decisions:    {cursor.fetchone()[0]:,}")
    
    cursor.execute("SELECT decision, COUNT(*) FROM ml_decisions GROUP BY decision ORDER BY COUNT(*) DESC")
    print(f"\n  ML Decision Breakdown:")
    for decision, count in cursor.fetchall():
        print(f"    {decision:12s}: {count:,}")
    
    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE weather_source = 'log_backfill'")
    print(f"\n  Readings from log backfill: {cursor.fetchone()[0]:,}")
    
    conn.close()
    print("\n[DONE]")

if __name__ == "__main__":
    from psycopg2 import extras
    main()
