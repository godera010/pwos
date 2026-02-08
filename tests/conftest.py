import pytest
import os
import sys
import sqlite3
from flask import Flask

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Add backend to path specifically so 'import database' works in app.py
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'backend'))

from src.backend.database import PWOSDatabase
from src.backend.app import app as flask_app

@pytest.fixture
def test_db_path(tmp_path):
    """Create a temporary database file"""
    d = tmp_path / "test_pwos.db"
    return str(d)

@pytest.fixture
def db(test_db_path):
    """
    Initialize a test database.
    We patch the class to use our temp file instead of the real one.
    """
    # Initialize DB (creates tables)
    database = PWOSDatabase(db_file=test_db_path)
    yield database
    # Cleanup done by tmp_path

@pytest.fixture
def client(db):
    """Flask test client with mocked database"""
    flask_app.config['TESTING'] = True
    
    # Patch the db instance in the app
    # We must do this before creating the client
    import src.backend.app
    original_db = src.backend.app.db
    src.backend.app.db = db
    
    with flask_app.test_client() as client:
        yield client
        
    # Restore original db (good practice)
    src.backend.app.db = original_db
