import sqlite3
import os
import sys

# Path to DB
DB_PATH = 'data/pwos_simulation.db'

def check_forecast_logging():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check for recent entries with non-zero forecast_minutes
        cursor.execute("SELECT count(*) FROM sensor_readings WHERE forecast_minutes > 0")
        count = cursor.fetchone()[0]
        
        cursor.execute("SELECT count(*) FROM sensor_readings")
        total = cursor.fetchone()[0]
        
        print("-" * 50)
        print(f"DATA LOGGING VERIFICATION")
        print("-" * 50)
        print(f"Total Readings:       {total}")
        print(f"Readings with Rain:   {count}")
        print("-" * 50)
        
        if count > 0:
            print("✅ SUCCESS: System is logging rain forecast data!")
            print("   This confirms data is being collected for retraining.")
        else:
            print("⚠️  WARNING: No rain forecast data found yet.")
            print("   (This might be normal if it hasn't rained in simulation/real life yet)")
            
        # Show last 5 entries
        print("\nLast 5 Entries:")
        cursor.execute("SELECT timestamp, soil_moisture, temperature, forecast_minutes FROM sensor_readings ORDER BY timestamp DESC LIMIT 5")
        rows = cursor.fetchall()
        for row in rows:
            print(f"   {row[0]} | Moist: {row[1]:.1f}% | Temp: {row[2]:.1f}C | Rain In: {row[3]}m")
            
    except Exception as e:
        print(f"X Error querying database: {e}")
    finally:
        conn.close()

    # Check Synthetic Data
    SYNTHETIC_FILE = "data/synthetic_training_data.csv"
    if os.path.exists(SYNTHETIC_FILE):
        print("-" * 50)
        print(f"SYNTHETIC TRAINING DATA")
        print("-" * 50)
        with open(SYNTHETIC_FILE, "r") as f:
            lines = f.readlines()
        print(f"File exists:          YES")
        print(f"Total Samples:        {len(lines)-1}")
        print("✅ Ready for model training!")
    else:
        print("\n⚠️  Synthetic training data not found.")


if __name__ == "__main__":
    check_forecast_logging()
