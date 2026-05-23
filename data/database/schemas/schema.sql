-- P-WOS Database Schema (PostgreSQL)
-- Auto-generated from database.py init_database()
-- Last Updated: 2026-05-22

-- ============================================================
-- Table 1: sensor_readings — Core telemetry from ESP32/Simulator
-- ============================================================
CREATE TABLE IF NOT EXISTS sensor_readings (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    soil_moisture REAL,
    temperature REAL,
    humidity REAL,
    device_id TEXT,
    forecast_minutes INTEGER DEFAULT 0,
    wind_speed REAL DEFAULT 0.0,
    precipitation_chance INTEGER DEFAULT 0,
    vpd REAL DEFAULT 0.0,
    rain_intensity REAL DEFAULT 0.0,
    cloud_cover REAL DEFAULT 0.0,
    forecast_temp REAL DEFAULT 0.0,
    forecast_humidity REAL DEFAULT 0.0,
    weather_condition TEXT DEFAULT 'unknown',
    weather_source TEXT DEFAULT 'none'
);

-- ============================================================
-- Table 2: watering_events — Pump activation history
-- ============================================================
CREATE TABLE IF NOT EXISTS watering_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    duration_seconds INTEGER,
    trigger_type TEXT,
    moisture_before REAL,
    moisture_after REAL
);

-- ============================================================
-- Table 3: system_logs — Application event log
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    level TEXT,
    source TEXT,
    message TEXT
);

-- ============================================================
-- Table 4: ml_decisions — ML prediction audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS ml_decisions (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    soil_moisture REAL,
    temperature REAL,
    humidity REAL,
    vpd REAL,
    forecast_minutes INTEGER DEFAULT 0,
    precipitation_chance INTEGER DEFAULT 0,
    wind_speed REAL DEFAULT 0.0,
    rain_intensity REAL DEFAULT 0.0,
    decay_rate REAL,
    decision TEXT,
    confidence REAL,
    reason TEXT,
    recommended_duration INTEGER DEFAULT 0,
    features_json TEXT
);

-- ============================================================
-- Table 5: model_versions — ML model version registry
-- ============================================================
CREATE TABLE IF NOT EXISTS model_versions (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    version_tag TEXT,
    accuracy REAL,
    precision REAL,
    recall REAL,
    f1_score REAL,
    training_samples INTEGER,
    model_path TEXT,
    is_active BOOLEAN
);
