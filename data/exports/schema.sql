-- P-WOS Database Schema
-- Exported: 2026-02-08T21:22:02.448636

-- Table: sensor_readings
CREATE TABLE sensor_readings
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      timestamp TEXT,
                      soil_moisture REAL,
                      temperature REAL,
                      humidity REAL,
                      device_id TEXT,
                      forecast_minutes INTEGER DEFAULT 0, wind_speed REAL DEFAULT 0.0, precipitation_chance INTEGER DEFAULT 0);

-- Table: sqlite_sequence
CREATE TABLE sqlite_sequence(name,seq);

-- Table: watering_events
CREATE TABLE watering_events
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      timestamp TEXT,
                      duration_seconds INTEGER,
                      trigger_type TEXT,
                      moisture_before REAL,
                      moisture_after REAL);

-- Table: predictions
CREATE TABLE predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                predicted_next_watering TEXT,
                confidence_score REAL,
                features_used TEXT
            );

-- Table: system_logs
CREATE TABLE system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                level TEXT,
                source TEXT,
                message TEXT
            );

