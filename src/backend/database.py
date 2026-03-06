"""
Database Manager for P-WOS
Handles all database operations using PostgreSQL
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import json
import logging
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from log_config import setup_logger
logger = setup_logger("Database", "database.log", "app")

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
            logger.critical(f"Database connection failed: {e}")
            raise e

    def init_database(self):
        """Create tables if they don't exist"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Sensor readings table (with weather columns)
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
                    vpd REAL DEFAULT 0.0,
                    rain_intensity REAL DEFAULT 0.0,
                    cloud_cover REAL DEFAULT 0.0,
                    forecast_temp REAL DEFAULT 0.0,
                    forecast_humidity REAL DEFAULT 0.0,
                    weather_condition TEXT DEFAULT 'unknown',
                    weather_source TEXT DEFAULT 'none'
                );
            ''')

            # Migrate: add new columns to existing sensor_readings table
            for col_def in [
                "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS rain_intensity REAL DEFAULT 0.0",
                "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS cloud_cover REAL DEFAULT 0.0",
                "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS forecast_temp REAL DEFAULT 0.0",
                "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS forecast_humidity REAL DEFAULT 0.0",
                "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS weather_condition TEXT DEFAULT 'unknown'",
                "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS weather_source TEXT DEFAULT 'none'",
            ]:
                try:
                    cursor.execute(col_def)
                except Exception:
                    pass  # Column already exists
            
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

            # ML decisions table (NEW - audit trail for ML predictions)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ml_decisions (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    soil_moisture REAL,
                    temperature REAL,
                    humidity REAL,
                    vpd REAL,
                    forecast_minutes INTEGER DEFAULT 0,
                    precipitation_chance INTEGER DEFAULT 0,
                    wind_speed REAL DEFAULT 0.0,
                    rain_intensity REAL DEFAULT 0.0,
                    decay_rate REAL,
                    decision TEXT,
                    confidence REAL,
                    reason TEXT,
                    recommended_duration INTEGER DEFAULT 0,
                    features_json TEXT
                );
            ''')

            # Model Versions Table (New)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS model_versions (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    version_tag TEXT,
                    accuracy REAL,
                    precision REAL,
                    recall REAL,
                    f1_score REAL,
                    training_samples INTEGER,
                    model_path TEXT,
                    is_active BOOLEAN
                );
            ''')
            
            conn.commit()
            conn.close()
            logger.info("PostgreSQL Database initialized")
        except Exception as e:
            logger.error(f"Failed to init database: {e}")

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
            logger.error(f"Log insert failed: {e}")

    def get_logs(self, limit=100):
        """Get recent logs"""
        conn = self.get_connection()
        # Return as dicts for easier consumption
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM system_logs ORDER BY id DESC LIMIT %s', (limit,))
        rows = cursor.fetchall()
        conn.close()
        return rows
    
    @staticmethod
    def calculate_vpd(temp, humidity):
        """Calculate Vapor Pressure Deficit from temperature and humidity (Tetens formula)"""
        try:
            es = 0.6108 * math.exp((17.27 * temp) / (temp + 237.3))
            ea = es * (humidity / 100.0)
            return round(max(0, es - ea), 4)
        except Exception:
            return 0.0

    def insert_sensor_reading(self, data):
        """Insert sensor data with auto-calculated VPD"""
        conn = self.get_connection()
        cursor = conn.cursor()

        temp = data.get('temperature', 25.0)
        humidity = data.get('humidity', 60.0)
        vpd = data.get('vpd') or self.calculate_vpd(temp, humidity)
        rain_intensity = data.get('rain_intensity', 0.0)
        cloud_cover = data.get('cloud_cover', 0.0)
        
        cursor.execute('''
            INSERT INTO sensor_readings 
            (timestamp, soil_moisture, temperature, humidity, device_id,
             forecast_minutes, wind_speed, precipitation_chance, vpd,
             rain_intensity, cloud_cover, forecast_temp, forecast_humidity,
             weather_condition, weather_source)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            data['timestamp'],
            data['soil_moisture'],
            temp,
            humidity,
            data['device_id'],
            data.get('forecast_minutes', 0),
            data.get('wind_speed', 0.0),
            data.get('precipitation_chance', 0),
            vpd,
            rain_intensity,
            cloud_cover,
            data.get('forecast_temp', 0.0),
            data.get('forecast_humidity', 0.0),
            data.get('weather_condition', 'unknown'),
            data.get('weather_source', 'none')
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
        """Log watering event. Returns the new event ID."""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO watering_events 
            (timestamp, duration_seconds, trigger_type, moisture_before, moisture_after)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            datetime.now(),
            duration,
            trigger_type,
            moisture_before,
            moisture_after
        ))
        
        event_id = cursor.fetchone()[0]
        conn.commit()
        conn.close()
        return event_id
    
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
    
    def get_watering_events_by_timerange(self, hours=24):
        """Get watering events from last N hours"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM watering_events 
            WHERE timestamp > NOW() - INTERVAL '%s hours'
            ORDER BY timestamp DESC
        ''', (hours,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return rows
    
    def get_aggregated_data(self, hours, interval_seconds):
        """Get aggregated sensor data and watering events grouped by interval"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Sensor data
        cursor.execute(f'''
            SELECT 
                to_timestamp(floor((extract('epoch' from timestamp) / %s)) * %s) as bucket,
                AVG(soil_moisture) as avg_moisture,
                AVG(temperature) as avg_temp,
                AVG(humidity) as avg_humidity,
                AVG(vpd) as avg_vpd
            FROM sensor_readings 
            WHERE timestamp > NOW() - INTERVAL '{hours} hours'
            GROUP BY bucket
            ORDER BY bucket ASC
        ''', (interval_seconds, interval_seconds))
        sensors = cursor.fetchall()
        
        # Watering events
        cursor.execute(f'''
            SELECT 
                to_timestamp(floor((extract('epoch' from timestamp) / %s)) * %s) as bucket,
                SUM(duration_seconds) as total_duration,
                SUM(CASE WHEN trigger_type != 'MANUAL' THEN duration_seconds ELSE 0 END) as ai_duration,
                COUNT(CASE WHEN trigger_type != 'MANUAL' THEN 1 END) as ai_event_count,
                COUNT(*) as event_count
            FROM watering_events 
            WHERE timestamp > NOW() - INTERVAL '{hours} hours'
            GROUP BY bucket
            ORDER BY bucket ASC
        ''', (interval_seconds, interval_seconds))
        events = cursor.fetchall()
        
        conn.close()
        return sensors, events


    def update_moisture_after(self, event_id, moisture_after):
        """Update moisture_after for a watering event (called after pump stops)"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE watering_events SET moisture_after = %s WHERE id = %s
            ''', (moisture_after, event_id))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to update moisture_after: {e}")

    def insert_ml_decision(self, data):
        """Log an ML decision for audit/training purposes"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO ml_decisions
                (timestamp, soil_moisture, temperature, humidity, vpd,
                 forecast_minutes, precipitation_chance, wind_speed, rain_intensity,
                 decay_rate, decision, confidence, reason, recommended_duration, features_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                datetime.now(),
                data.get('soil_moisture'),
                data.get('temperature'),
                data.get('humidity'),
                data.get('vpd', 0.0),
                data.get('forecast_minutes', 0),
                data.get('precipitation_chance', 0),
                data.get('wind_speed', 0.0),
                data.get('rain_intensity', 0.0),
                data.get('decay_rate'),
                data.get('decision'),
                data.get('confidence'),
                data.get('reason'),
                data.get('recommended_duration', 0),
                json.dumps(data.get('features', {}))
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"ML decision insert failed: {e}")

    def get_ml_decisions(self, limit=50):
        """Get recent ML decisions"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM ml_decisions ORDER BY id DESC LIMIT %s', (limit,))
        rows = cursor.fetchall()
        conn.close()
        return rows

    def log_model_version(self, version_tag, metrics, samples, path):
        """Log a new model version"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Deactivate previous active models?
            # For now, just log. Logic to set active can be separate.
            
            cursor.execute('''
                INSERT INTO model_versions
                (timestamp, version_tag, accuracy, precision, recall, f1_score, 
                 training_samples, model_path, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                datetime.now(),
                version_tag,
                metrics.get('accuracy', 0.0),
                metrics.get('precision', 0.0),
                metrics.get('recall', 0.0),
                metrics.get('f1_score', 0.0),
                samples,
                path,
                True 
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"Logged model version {version_tag}")
        except Exception as e:
            logger.error(f"Failed to log model version: {e}")

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

            # Count ML decisions
            cursor.execute('SELECT COUNT(*) FROM ml_decisions')
            ml_count = cursor.fetchone()[0]
            
            # Get average moisture
            cursor.execute('SELECT AVG(soil_moisture) FROM sensor_readings')
            result = cursor.fetchone()[0]
            avg_moisture = result if result is not None else 0
            
            conn.close()
            
            return {
                'total_readings': sensor_count,
                'total_waterings': watering_count,
                'total_ml_decisions': ml_count,
                'avg_moisture': round(avg_moisture, 2)
            }
        except Exception as e:
            logger.warning(f"Failed to get stats: {e}")
            return {'total_readings': 0, 'total_waterings': 0, 'total_ml_decisions': 0, 'avg_moisture': 0}

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
