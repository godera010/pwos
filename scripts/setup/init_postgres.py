import sys
import os

# Add src/backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'backend'))

from database import PWOSDatabase

def init_postgres():
    print("="*50)
    print("INITIALIZING POSTGRESQL DATABASE")
    print("="*50)
    
    try:
        db = PWOSDatabase()
        print("\n[SUCCESS] Database connection successful.")
        print("[SUCCESS] Tables initialized.")
        
        stats = db.get_statistics()
        print(f"\nCurrent Stats:")
        print(f"- Readings: {stats['total_readings']}")
        print(f"- Waterings: {stats['total_waterings']}")
        
    except Exception as e:
        print(f"\n[ERROR] FAILED: {e}")
        print("Please check your .env credentials and ensure Postgres is running.")

if __name__ == "__main__":
    init_postgres()
