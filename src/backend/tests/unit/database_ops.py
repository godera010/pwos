import pytest
from unittest.mock import MagicMock, patch
from database import PWOSDatabase

class TestDatabaseOps:
    """
    Tests for Database Operations and Edge Cases.
    Targeting ~10 tests.
    """

    def test_connection_failure_handling(self):
        """Test behavior when DB connection fails."""
        with patch('database.psycopg2.connect') as mock_conn:
            mock_conn.side_effect = Exception("Connection timeout")
            
            db = PWOSDatabase()
            # method should raise or log error, depending on implementation
            # Current impl prints error and raises
            with pytest.raises(Exception):
                db.get_connection()

    def test_get_statistics_empty_db(self):
        """Test statistics return zeros when tables are empty."""
        with patch('database.psycopg2.connect') as mock_conn:
            mock_cursor = MagicMock()
            mock_conn.return_value.cursor.return_value = mock_cursor
            
            # Mocks for 3 counts: readings, waterings, avg_moisture
            mock_cursor.fetchone.side_effect = [[0], [0], [None]]
            
            db = PWOSDatabase()
            stats = db.get_statistics()
            
            assert stats['total_readings'] == 0
            assert stats['total_waterings'] == 0
            assert stats['avg_moisture'] == 0

    def test_insert_log_special_chars(self):
        """Test inserting logs with emojis or special chars."""
        # We assume the driver handles it, but good to test the path
        with patch('database.psycopg2.connect') as mock_conn:
             mock_cursor = MagicMock()
             mock_conn.return_value.cursor.return_value = mock_cursor
             
             db = PWOSDatabase()
             db.insert_log("Error \U0001F525 detected") # Fire emoji
             
             assert mock_cursor.execute.called

    def test_get_recent_readings_limit(self):
        """Ensure limit param is respected in query."""
        with patch('database.psycopg2.connect') as mock_conn:
             mock_cursor = MagicMock()
             mock_conn.return_value.cursor.return_value = mock_cursor
             
             db = PWOSDatabase()
             db.get_recent_readings(limit=5)
             
             call_args = mock_cursor.execute.call_args
             assert call_args[0][1] == (5,)

    def test_insert_watering_event_null_after(self):
        """Test inserting watering event without 'after' moisture."""
        with patch('database.psycopg2.connect') as mock_conn:
             mock_cursor = MagicMock()
             mock_conn.return_value.cursor.return_value = mock_cursor
             
             db = PWOSDatabase()
             db.insert_watering_event(10, 'MANUAL', 40.0)
             
             assert mock_cursor.execute.called

    def test_sql_query_structure_sensors(self):
        """Verify sensor insert query structure."""
        with patch('database.psycopg2.connect') as mock_conn:
             mock_cursor = MagicMock()
             mock_conn.return_value.cursor.return_value = mock_cursor
             
             db = PWOSDatabase()
             data = {
                 'timestamp': '2023-01-01',
                 'soil_moisture': 50, 'temperature': 25, 'humidity': 60,
                 'device_id': 'test'
             }
             db.insert_sensor_reading(data)
             
             query = mock_cursor.execute.call_args[0][0]
             assert "INSERT INTO sensor_readings" in query

    def test_get_logs_error_handling(self):
        """Test graceful failure when fetching logs."""
        with patch('database.psycopg2.connect') as mock_conn:
             mock_conn.side_effect = Exception("DB Down")
             
             db = PWOSDatabase()
             # Should probably default to raising or returning empty in valid app code
             # In current database.py, get_logs doesn't have try/catch block around connect
             # So this verifies it raises
             with pytest.raises(Exception):
                 db.get_logs()
                 
    def test_ml_decision_insert(self):
        """Test that ML decisions are inserted correctly."""
        with patch('database.psycopg2.connect') as mock_conn:
             mock_cursor = MagicMock()
             mock_conn.return_value.cursor.return_value = mock_cursor
             
             db = PWOSDatabase()
             db.insert_ml_decision({
                 'decision': 'MONITOR',
                 'confidence': 0.95,
                 'soil_moisture': 45.0,
                 'temperature': 25.0,
                 'humidity': 60.0,
                 'reason': 'Soil moisture is optimal.'
             })
             
             assert mock_cursor.execute.called
             query = mock_cursor.execute.call_args[0][0]
             assert "INSERT INTO ml_decisions" in query

    def test_init_database_idempotency(self):
        """Test that init_database can run multiple times without error (IF EXISTS checks)."""
        with patch('database.psycopg2.connect') as mock_conn:
             mock_cursor = MagicMock()
             mock_conn.return_value.cursor.return_value = mock_cursor
             
             db = PWOSDatabase()
             db.init_database()
             db.init_database()
             
             assert mock_cursor.execute.call_count >= 8 # 4 tables * 2 calls

    def test_close_connection_called(self):
        """Test that connection is closed after operation."""
        with patch('database.psycopg2.connect') as mock_conn:
             mock_conn_obj = MagicMock()
             mock_conn.return_value = mock_conn_obj
             
             db = PWOSDatabase()
             db.insert_log("test")
             
             mock_conn_obj.close.assert_called()
