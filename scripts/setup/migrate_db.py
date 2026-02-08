import sqlite3
import os

DB_PATH = 'data/pwos_simulation.db'

def migrate_database():
    print("=" * 50)
    print("DATABASE MIGRATION: Adding Weather Columns")
    print("=" * 50)
    
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Columns to add
    new_columns = [
        ("forecast_minutes", "INTEGER DEFAULT 0"),
        ("wind_speed", "REAL DEFAULT 0.0"),
        ("precipitation_chance", "INTEGER DEFAULT 0")
    ]
    
    try:
        # Check existing columns
        cursor.execute("PRAGMA table_info(sensor_readings)")
        existing_cols = [row[1] for row in cursor.fetchall()]
        
        for col_name, col_def in new_columns:
            if col_name not in existing_cols:
                print(f"Adding column: {col_name}...")
                cursor.execute(f"ALTER TABLE sensor_readings ADD COLUMN {col_name} {col_def}")
                print(f"   [OK] Added {col_name}")
            else:
                print(f"   [SKIP] Column {col_name} already exists")
                
        conn.commit()
        print("\n[SUCCESS] Migration Complete!")
        
    except Exception as e:
        print(f"[ERROR] Migration Failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
