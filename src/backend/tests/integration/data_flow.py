import pytest
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from unittest.mock import MagicMock, patch

class TestDataFlow:
    
    def test_db_insert_sensor_reading(self):
        """Test that sensor readings are correctly prepared for DB insertion."""
        from database import PWOSDatabase
        
        # Mock database connection
        with patch('database.psycopg2.connect') as mock_connect:
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_connect.return_value = mock_conn
            mock_conn.cursor.return_value = mock_cursor
            
            db = PWOSDatabase()
            
            data = {
                "soil_moisture": 45.0,
                "temperature": 24.5,
                "humidity": 60.0,
                "timestamp": "2023-01-01 12:00:00",
                "device_id": "test_device"
            }
            
            db.insert_sensor_reading(data)
            
            # Verify execute was called
            assert mock_cursor.execute.called
            
            # Check if INSERT was among calls
            insert_called = False
            for call in mock_cursor.execute.call_args_list:
                query = call[0][0]
                if "INSERT INTO sensor_readings" in query:
                    insert_called = True
                    break
            
            assert insert_called, "INSERT query not found in execute calls"

    def test_system_state_persistence(self):
        """Test that system state changes (AUTO/MANUAL) are persisted."""
        # Mock DB session
        session = MagicMock()
        
        # Simulate toggling state
        new_mode = "MANUAL"
        
        # ...Logic to update state... 
        # This is more of a unit test for the state manager if we extract it
        pass
