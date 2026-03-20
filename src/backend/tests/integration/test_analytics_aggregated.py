import pytest
import psycopg2
from datetime import datetime, timedelta, timezone
import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from app import app
from database import PWOSDatabase
from config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD

# Set Flask to testing mode
app.config['TESTING'] = True

TEST_DB_NAME = "pwos_test_db"

def setup_test_db():
    """Create a pristine test database if it doesn't exist."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname="postgres"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(f"DROP DATABASE IF EXISTS {TEST_DB_NAME}")
        cursor.execute(f"CREATE DATABASE {TEST_DB_NAME}")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Make sure PostgreSQL is running. Warning during test DB creation: {e}")

class MockedDatabase(PWOSDatabase):
    """Override get_connection to specifically target the test database."""
    def get_connection(self):
        return psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=TEST_DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )

@pytest.fixture(scope="session", autouse=True)
def init_test_db():
    """Initialize test database tables running before any test starts."""
    setup_test_db()
    
    test_db = MockedDatabase()
    test_db.init_database()
    yield

@pytest.fixture
def db_session():
    """Clear tables before each test to maintain state isolation, then yield the mock DB."""
    test_db = MockedDatabase()
    conn = test_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("TRUNCATE sensor_readings CONTINUE IDENTITY CASCADE")
    cursor.execute("TRUNCATE watering_events CONTINUE IDENTITY CASCADE")
    conn.commit()
    conn.close()
    
    # Patch the global db object inside app.py to point to our test DB connection
    from unittest.mock import patch
    with patch('app.db', test_db):
        yield test_db

@pytest.fixture
def client(db_session):
    """Yield a Flask test client ready to accept HTTP endpoints under the mocked DB state."""
    with app.test_client() as client:
        yield client

# --------------------------------------------------------------------------------------
# TESTS
# --------------------------------------------------------------------------------------

class TestAggregatedAnalytics:
    
    def test_basic_functionality_and_aggregation_correctness(self, client, db_session):
        """
        Test that averages and watering duration summaries resolve exactly as expected 
        using arithmetic date trunc epoch boundaries.
        """
        conn = db_session.get_connection()
        cursor = conn.cursor()
        
        # Base time dynamically calculated right now (UTC timezone) to prevent NOW() exclusions
        now = datetime.now(timezone.utc)
        
        # Snap time to exactly the top of the hour to enforce easy testing on buckets
        base_time = now.replace(minute=0, second=0, microsecond=0)
        
        # 1. Provide Sensor readings at interval locations (.05 and .10 inside a 15 min bucket)
        t_05 = base_time + timedelta(minutes=5)
        t_10 = base_time + timedelta(minutes=10)
        
        cursor.execute('''
            INSERT INTO sensor_readings (timestamp, soil_moisture, temperature, humidity, vpd, device_id)
            VALUES 
            (%s, 50.0, 25.0, 40.0, 1.5, 'test_device'),
            (%s, 60.0, 27.0, 50.0, 2.0, 'test_device')
        ''', (t_05, t_10))
        
        # 2. Provide Watering Events located in the SAME bucket boundary 
        we_07 = base_time + timedelta(minutes=7)
        we_12 = base_time + timedelta(minutes=12)
        
        cursor.execute('''
            INSERT INTO watering_events (timestamp, duration_seconds, trigger_type, moisture_before)
            VALUES 
            (%s, 30, 'MANUAL', 45.0),
            (%s, 45, 'ML_PREDICTION', 48.0)
        ''', (we_07, we_12))
        
        conn.commit()
        conn.close()

        # Execute endpoint fetching within a safe boundary bounds 
        response = client.get('/api/analytics/aggregated?hours=2&interval=15 minutes')
        assert response.status_code == 200
        
        data = response.json
        assert len(data) >= 1
        
        # Find the bucket containing our data
        bucket = next((d for d in data if d['soil_moisture'] == 55.0), None)
        assert bucket is not None, "Failed to aggregate bucket properly"
        
        # Verify the Averages
        assert bucket['soil_moisture'] == 55.0  # (50 + 60) / 2
        assert bucket['temperature'] == 26.0    # (25 + 27) / 2
        assert bucket['humidity'] == 45.0       # (40 + 50) / 2
        assert bucket['vpd'] == 1.75            # (1.5 + 2.0) / 2
        
        # Verify the sums (watering data is nested under 'watering' sub-object)
        assert bucket['watering']['total_duration'] == 75   # 30 + 45
        assert bucket['watering']['ai_duration'] == 45      # ML_PREDICTION duration only
        assert bucket['watering']['ai_event_count'] == 1    # Only ML_PREDICTION counts as AI (MANUAL excluded)


    def test_bucket_alignment(self, client, db_session):
        """Ensure date trunc logic aligns precisely on the Unix Epoch bounds."""
        conn = db_session.get_connection()
        cursor = conn.cursor()
        
        base_time = datetime.now(timezone.utc).replace(minute=2, second=30, microsecond=0)
        
        cursor.execute('''
            INSERT INTO sensor_readings (timestamp, soil_moisture, temperature, humidity, vpd, device_id)
            VALUES (%s, 50.0, 25.0, 40.0, 1.5, 'test_device')
        ''', (base_time,))
        
        conn.commit()
        conn.close()

        response = client.get('/api/analytics/aggregated?hours=2&interval=15 minutes')
        data = response.json
        
        bucket = next((d for d in data if d['soil_moisture'] == 50.0), None)
        assert bucket is not None

        # Bucket should align mathematically to XX:00:00 (since we inserted at XX:02:30)
        dt = datetime.fromisoformat(bucket['timestamp'].replace("Z", "+00:00"))
        assert dt.minute % 15 == 0
        assert dt.second == 0


    def test_edge_cases_empty_and_mismatched(self, client, db_session):
        """Test how the endpoint behaves against completely empty conditions and mismatched bucket sets."""
        # 1. Empty Database
        empty_resp = client.get('/api/analytics/aggregated?hours=24&interval=1 hour')
        assert empty_resp.status_code == 200
        assert empty_resp.json == []

        # 2. Insert Events only (no historic readings in that bucket)
        conn = db_session.get_connection()
        cursor = conn.cursor()
        
        t_base = datetime.now(timezone.utc)
        
        cursor.execute('''
            INSERT INTO watering_events (timestamp, duration_seconds, trigger_type, moisture_before)
            VALUES (%s, 100, 'SCHEDULED', 45.0)
        ''', (t_base,))
        
        conn.commit()
        
        mismatch_resp = client.get('/api/analytics/aggregated?hours=24&interval=15 minutes')
        data = mismatch_resp.json
        
        # Fetch the only bucket we have.
        bucket = data[-1]
        
        # History missing -> fields should be None (no sensor data for this bucket)
        assert bucket['soil_moisture'] is None
        assert bucket['temperature'] is None 
        assert bucket['humidity'] is None
        
        # Events exist -> valid duration (nested under 'watering')
        assert bucket['watering']['total_duration'] == 100
        assert bucket['watering']['ai_duration'] == 100 # Scheduled is != MANUAL

        # 3. Clean and verify the inverse (History exists but no Events)
        cursor.execute("TRUNCATE watering_events CONTINUE IDENTITY CASCADE")
        cursor.execute('''
            INSERT INTO sensor_readings (timestamp, soil_moisture, temperature, humidity, vpd, device_id)
            VALUES (%s, 70.0, 22.0, 30.0, 1.1, 'test_device')
        ''', (t_base,))
        conn.commit()
        conn.close()

        inverse_resp = client.get('/api/analytics/aggregated?hours=24&interval=15 minutes')
        inverse_bucket = inverse_resp.json[-1]
        
        assert inverse_bucket['soil_moisture'] == 70.0
        assert inverse_bucket['watering']['total_duration'] == 0
        assert inverse_bucket['watering']['ai_event_count'] == 0


    def test_parameter_validation(self, client):
        """Test fallback formatting for broken parameters if they bleed into queries."""
        # Flask usually drops failing `type=int` types quietly into defaults, but we should assert this works safely.
        res = client.get('/api/analytics/aggregated?hours=broken&interval=fake_minute')
        assert res.status_code == 200
        
        # When `broken` happens, default `hours=24` and `fake_minute` maps safely fallback to 900 seconds.
        assert isinstance(res.json, list)

