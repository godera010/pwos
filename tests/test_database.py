import pytest
import sqlite3
from datetime import datetime

def test_database_init(db):
    """Test that tables are created on initialization"""
    conn = sqlite3.connect(db.db_file)
    cursor = conn.cursor()
    
    # Check tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cursor.fetchall()]
    
    assert 'sensor_readings' in tables
    assert 'watering_events' in tables
    assert 'predictions' in tables
    
    conn.close()

def test_insert_sensor_reading(db):
    """Test inserting and retrieving sensor data"""
    data = {
        'timestamp': datetime.now().isoformat(),
        'soil_moisture': 45.5,
        'temperature': 22.0,
        'humidity': 60.0,
        'device_id': 'TEST_ESP32'
    }
    
    db.insert_sensor_reading(data)
    
    readings = db.get_recent_readings(limit=1)
    assert len(readings) == 1
    
    row = readings[0]
    # Row structure: (id, timestamp, soil, temp, humid, device_id)
    assert row[2] == 45.5
    assert row[5] == 'TEST_ESP32'

def test_watering_event(db):
    """Test logging watering events"""
    db.insert_watering_event(
        duration=30,
        trigger_type='MANUAL',
        moisture_before=20.0,
        moisture_after=None
    )
    
    events = db.get_watering_events(limit=1)
    assert len(events) == 1
    assert events[0][2] == 30
    assert events[0][3] == 'MANUAL'

def test_statistics(db):
    """Test statistics calculation"""
    # Insert 2 readings
    db.insert_sensor_reading({
        'timestamp': datetime.now().isoformat(),
        'soil_moisture': 10.0,
        'temperature': 20,
        'humidity': 50,
        'device_id': 'A'
    })
    db.insert_sensor_reading({
        'timestamp': datetime.now().isoformat(),
        'soil_moisture': 30.0,
        'temperature': 20,
        'humidity': 50,
        'device_id': 'A'
    })
    
    # Insert 1 watering
    db.insert_watering_event(10, 'TEST', 10)
    
    stats = db.get_statistics()
    
    assert stats['total_readings'] == 2
    assert stats['total_waterings'] == 1
    assert stats['avg_moisture'] == 20.0 # (10+30)/2
