import sys
import os
import psycopg2
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from src.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

def check_logs():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()

        print("\n=== LATEST SENSOR READINGS (Weather Data) ===")
        cursor.execute("""
            SELECT timestamp, forecast_minutes, precipitation_chance, wind_speed 
            FROM sensor_readings 
            ORDER BY timestamp DESC LIMIT 5
        """)
        rows = cursor.fetchall()
        if rows:
            print(f"{'Time':<20} | {'Forecast (min)':<15} | {'Rain Chance (%)':<15} | {'Wind (km/h)':<15}")
            print("-" * 75)
            for row in rows:
                print(f"{str(row[0]):<20} | {str(row[1]):<15} | {str(row[2]):<15} | {str(row[3]):<15}")
        else:
            print("No sensor readings found.")

        print("\n=== LATEST SYSTEM LOGS ===")
        cursor.execute("""
            SELECT timestamp, source, message 
            FROM system_logs 
            ORDER BY timestamp DESC LIMIT 5
        """)
        rows = cursor.fetchall()
        if rows:
            print(f"{'Time':<20} | {'Source':<10} | {'Message'}")
            print("-" * 80)
            for row in rows:
                print(f"{str(row[0]):<20} | {str(row[1]):<10} | {str(row[2])}")
        else:
            print("No system logs found.")

        conn.close()

    except Exception as e:
        print(f"[ERROR] Database Error: {e}")

if __name__ == "__main__":
    check_logs()
