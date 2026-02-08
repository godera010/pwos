#!/usr/bin/env python
"""
Database Export Script for P-WOS
Creates SQL exports for contributors to import
"""

import sqlite3
import os
from datetime import datetime

# Paths
DB_PATH = "data/pwos_simulation.db"
EXPORT_DIR = "data/exports"
SCHEMA_FILE = os.path.join(EXPORT_DIR, "schema.sql")
DATA_FILE = os.path.join(EXPORT_DIR, "sample_data.sql")

def export_database():
    # Create exports directory
    os.makedirs(EXPORT_DIR, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Found tables: {tables}")
    
    # Export schema
    with open(SCHEMA_FILE, 'w') as f:
        f.write("-- P-WOS Database Schema\n")
        f.write(f"-- Exported: {datetime.now().isoformat()}\n\n")
        
        for table in tables:
            cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
            schema = cursor.fetchone()
            if schema and schema[0]:
                f.write(f"-- Table: {table}\n")
                f.write(schema[0] + ";\n\n")
    
    print(f"Schema exported to: {SCHEMA_FILE}")
    
    # Export sample data (last 100 readings)
    with open(DATA_FILE, 'w') as f:
        f.write("-- P-WOS Sample Data\n")
        f.write(f"-- Exported: {datetime.now().isoformat()}\n\n")
        
        # Sensor readings (last 100)
        cursor.execute("SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 100")
        rows = cursor.fetchall()
        cursor.execute("PRAGMA table_info(sensor_readings)")
        columns = [col[1] for col in cursor.fetchall()]
        
        f.write(f"-- sensor_readings ({len(rows)} sample rows)\n")
        for row in reversed(rows):
            values = ', '.join([f"'{v}'" if isinstance(v, str) else str(v) for v in row])
            f.write(f"INSERT INTO sensor_readings ({', '.join(columns)}) VALUES ({values});\n")
        
        f.write("\n")
        
        # Watering events (all)
        cursor.execute("SELECT * FROM watering_events")
        rows = cursor.fetchall()
        cursor.execute("PRAGMA table_info(watering_events)")
        columns = [col[1] for col in cursor.fetchall()]
        
        f.write(f"-- watering_events ({len(rows)} rows)\n")
        for row in rows:
            values = ', '.join([f"'{v}'" if isinstance(v, str) else str(v) for v in row])
            f.write(f"INSERT INTO watering_events ({', '.join(columns)}) VALUES ({values});\n")
    
    print(f"Data exported to: {DATA_FILE}")
    
    # Get counts
    cursor.execute("SELECT COUNT(*) FROM sensor_readings")
    readings_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM watering_events")
    events_count = cursor.fetchone()[0]
    
    print(f"\nDatabase Statistics:")
    print(f"  - sensor_readings: {readings_count} rows")
    print(f"  - watering_events: {events_count} rows")
    
    conn.close()
    return readings_count, events_count

if __name__ == "__main__":
    export_database()
