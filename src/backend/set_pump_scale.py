import sys
import os

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import PWOSDatabase

def set_scale(factor):
    try:
        db = PWOSDatabase()
        db.init_database()  # Ensure tables exist
        success = db.set_system_setting('pump_scale_factor', str(factor))
        if success:
            print(f"Successfully set pump_scale_factor to {factor} in PostgreSQL.")
            print(f"   (e.g., A normal 30-second watering will now run for ~{max(2, int(30 * float(factor)))} seconds)")
        else:
            print(f"Failed to update database. Check logs.")
    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        set_scale(sys.argv[1])
    else:
        print("Usage: python set_pump_scale.py <factor>")
        print("Example for small pot: python set_pump_scale.py 0.1")
        print("Example for full farm: python set_pump_scale.py 1.0")
