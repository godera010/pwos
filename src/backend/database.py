"""
Database Manager for P-WOS
Handles all database operations using PostgreSQL
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import json
import os
import sys

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC_DIR = os.path.join(BASE_DIR, 'src')
sys.path.insert(0, SRC_DIR)
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

class PWOSDatabase:
    def __init__(self):
        self.init_database()
    
    def get_connection(self):
        """Get a database connection"""
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD
            )
            return conn
        except Exception as e:
            print(f"[CRITICAL] Database connection failed: {e}")
            raise e

    def init_database(self):
        """Create tables if they don't exist"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Sensor readings table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    soil_moisture REAL,
                    temperature REAL,
                    humidity REAL,
                    device_id TEXT,
                    forecast_minutes INTEGER DEFAULT 0,
                    wind_speed REAL DEFAULT 0.0,
                    precipitation_chance INTEGER DEFAULT 0,
                    vpd REAL DEFAULT 0.0
                );
            ''')
            
            # Watering events table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS watering_events (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    duration_seconds INTEGER,
                    trigger_type TEXT,
                    moisture_before REAL,
                    moisture_after REAL
                );
            ''')
            
            # Predictions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS predictions (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    predicted_next_watering TEXT,
                    confidence_score REAL,
                    features_used TEXT
                );
            ''')

            # System logs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS system_logs (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    level TEXT,
                    source TEXT,
                    message TEXT
                );
            ''')
            
            conn.commit()
            conn.close()
            print("[OK] PostgreSQL Database initialized")
        except Exception as e:
            print(f"[ERROR] Failed to init database: {e}")

    def insert_log(self, message, level="INFO", source="SYSTEM"):
        """Insert a system log"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO system_logs (timestamp, level, source, message)
                VALUES (%s, %s, %s, %s)
            ''', (datetime.now(), level, source, message))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[DB ERROR] Log insert failed: {e}")

    def get_logs(self, limit=100):
        """Get recent logs"""
        conn = self.get_connection()
        # Return as dicts for easier consumption
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM system_logs ORDER BY id DESC LIMIT %s', (limit,))
        rows = cursor.fetchall()
        conn.close()
        return rows
    
    def insert_sensor_reading(self, data):
        """Insert sensor data"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sensor_readings 
            (timestamp, soil_moisture, temperature, humidity, device_id, forecast_minutes, wind_speed, precipitation_chance, vpd)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            data['timestamp'],
            data['soil_moisture'],
            data['temperature'],
            data['humidity'],
            data['device_id'],
            data.get('forecast_minutes', 0),
            data.get('wind_speed', 0.0),
            data.get('precipitation_chance', 0),
            data.get('vpd', 0.0)
        ))
        
        conn.commit()
        conn.close()
    
    def get_recent_readings(self, limit=100):
        """Get recent sensor readings"""
        conn = self.get_connection()
        # App.py expects tuples (row[0], row[1]...) so uses default cursor
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, timestamp, soil_moisture, temperature, humidity, device_id, 
                   forecast_minutes, wind_speed, precipitation_chance, vpd 
            FROM sensor_readings 
            ORDER BY timestamp DESC 
            LIMIT %s
        ''', (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return rows
    
    def get_readings_by_timerange(self, hours=24):
        """Get readings from last N hours"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM sensor_readings 
            WHERE timestamp > NOW() - INTERVAL '%s hours'
            ORDER BY timestamp ASC
        ''', (hours,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return rows
    
    def insert_watering_event(self, duration, trigger_type, moisture_before, moisture_after=None):
        """Log watering event"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO watering_events 
            (timestamp, duration_seconds, trigger_type, moisture_before, moisture_after)
            VALUES (%s, %s, %s, %s, %s)
        ''', (
            datetime.now(),
            duration,
            trigger_type,
            moisture_before,
            moisture_after
        ))
        
        conn.commit()
        conn.close()
    
    def get_watering_events(self, limit=50):
        """Get watering event history"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM watering_events 
            ORDER BY timestamp DESC 
            LIMIT %s
        ''', (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return rows
    
    def insert_prediction(self, predicted_time, confidence, features):
        """Store ML prediction"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Convert numpy types if any
        if hasattr(features, 'tolist'):
             features = features.tolist()
        
        cursor.execute('''
            INSERT INTO predictions 
            (timestamp, predicted_next_watering, confidence_score, features_used)
            VALUES (%s, %s, %s, %s)
        ''', (
            datetime.now(),
            predicted_time,
            confidence,
            json.dumps(features)
        ))
        
        conn.commit()
        conn.close()
    
    def get_statistics(self):
        """Get database statistics"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Count sensor readings
            cursor.execute('SELECT COUNT(*) FROM sensor_readings')
            sensor_count = cursor.fetchone()[0]
            
            # Count watering events
            cursor.execute('SELECT COUNT(*) FROM watering_events')
            watering_count = cursor.fetchone()[0]
            
            # Get average moisture
            cursor.execute('SELECT AVG(soil_moisture) FROM sensor_readings')
            result = cursor.fetchone()[0]
            avg_moisture = result if result is not None else 0
            
            conn.close()
            
            return {
                'total_readings': sensor_count,
                'total_waterings': watering_count,
                'avg_moisture': round(avg_moisture, 2)
            }
        except Exception as e:
            print(f"[WARN] Failed to get stats: {e}")
            return {'total_readings': 0, 'total_waterings': 0, 'avg_moisture': 0}

if __name__ == "__main__":
    # Test database
    try:
        db = PWOSDatabase()
        stats = db.get_statistics()
        print("\nDatabase Statistics:")
        print(f"  Total Readings: {stats['total_readings']}")
        print(f"  Total Waterings: {stats['total_waterings']}")
        print(f"  Avg Moisture: {stats['avg_moisture']}%")
    except Exception as e:
        print(f"Failed: {e}")
