import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys
import os

# Add src to path to import config
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src'))

from config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

def create_database():
    print("="*50)
    print(f"CREATING DATABASE: {DB_NAME}")
    print("="*50)
    
    try:
        # Connect to default 'postgres' database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database='postgres'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if DB exists
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Creating database {DB_NAME}...")
            cursor.execute(f"CREATE DATABASE {DB_NAME}")
            print("[SUCCESS] Database created.")
        else:
            print(f"[SKIP] Database {DB_NAME} already exists.")
            
        conn.close()
        
    except Exception as e:
        print(f"[ERROR] Failed to create database: {e}")

if __name__ == "__main__":
    create_database()
