"""
P-WOS Configuration Module
Centralizes all environment variables and settings for cloud deployment.
"""
import os
from dotenv import load_dotenv

# Load .env file if present (development)
load_dotenv()

# ============================================================================
# MQTT Configuration
# ============================================================================
# For LOCAL development: Use Mosquitto on localhost
# For PRODUCTION: Use HiveMQ Cloud or similar

MQTT_MODE = os.getenv("MQTT_MODE", "local")  # "local" or "cloud"

# Local Mosquitto (default)
MQTT_LOCAL_BROKER = "localhost"
MQTT_LOCAL_PORT = 1883

# Cloud MQTT (HiveMQ)
MQTT_CLOUD_BROKER = os.getenv("MQTT_CLOUD_BROKER", "")
MQTT_CLOUD_PORT = int(os.getenv("MQTT_CLOUD_PORT", "8883"))
MQTT_CLOUD_USER = os.getenv("MQTT_CLOUD_USER", "")
MQTT_CLOUD_PASS = os.getenv("MQTT_CLOUD_PASS", "")

# Derived settings
if MQTT_MODE == "cloud":
    MQTT_BROKER = MQTT_CLOUD_BROKER
    MQTT_PORT = MQTT_CLOUD_PORT
    MQTT_USE_TLS = True
else:
    MQTT_BROKER = MQTT_LOCAL_BROKER
    MQTT_PORT = MQTT_LOCAL_PORT
    MQTT_USE_TLS = False

# MQTT Topics
MQTT_TOPIC_SENSOR = "pwos/sensor/data"
MQTT_TOPIC_WEATHER = "pwos/weather/forecast"
MQTT_TOPIC_CONTROL = "pwos/control/pump"

# ============================================================================
# Weather API Configuration
# ============================================================================
WEATHER_API_MODE = os.getenv("WEATHER_API_MODE", "openweathermap")  # "simulation" or "openweathermap"
OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY", "")

if WEATHER_API_MODE == "openweathermap" and not OPENWEATHERMAP_API_KEY:
    print("[WARN] OpenWeatherMap Mode enabled but no API Key found!")
    print("    Please set OPENWEATHERMAP_API_KEY in your .env file.")

WEATHER_LATITUDE = float(os.getenv("WEATHER_LATITUDE", "-26.2041"))  # Default: Johannesburg
WEATHER_LONGITUDE = float(os.getenv("WEATHER_LONGITUDE", "28.0473"))

# ============================================================================
# Database Configuration
# ============================================================================
DATABASE_MODE = os.getenv("DATABASE_MODE", "sqlite")  # "sqlite" or "postgresql"
SQLITE_PATH = os.getenv("SQLITE_PATH", os.path.join("data", "database", "pwos_simulation.db"))
POSTGRESQL_URL = os.getenv("DATABASE_URL", "")  # Railway provides this

# PostgreSQL Locals
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "pwos")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# ============================================================================
# Flask Configuration
# ============================================================================
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"

# ============================================================================
# Hardware / Data Source Configuration
# ============================================================================
# "simulation" = Use esp32_simulator.py (no hardware needed)
# "hardware"   = Expect real ESP32 data via MQTT or serial
# "hybrid"     = Use hardware when available, fall back to simulator
DATA_SOURCE_MODE = os.getenv("DATA_SOURCE_MODE", "simulation")

# Serial port for USB-connected ESP32 ("auto" = auto-detect)
HARDWARE_SERIAL_PORT = os.getenv("HARDWARE_SERIAL_PORT", "auto")

# Expected device ID from real ESP32 (for validation)
HARDWARE_DEVICE_ID = os.getenv("HARDWARE_DEVICE_ID", "ESP32_PWOS_001")

# ============================================================================
# Frontend Configuration
# ============================================================================
FRONTEND_DIST_PATH = os.getenv("FRONTEND_DIST_PATH", "../frontend/dist")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5000").split(",")

# ============================================================================
# Helper function to print current config (for debugging)
# ============================================================================
def print_config():
    print("=" * 60)
    print("P-WOS Configuration")
    print("=" * 60)
    print(f"Data Source:   {DATA_SOURCE_MODE}")
    print(f"MQTT Mode:     {MQTT_MODE}")
    print(f"MQTT Broker:   {MQTT_BROKER}:{MQTT_PORT}")
    print(f"MQTT TLS:      {MQTT_USE_TLS}")
    print(f"Weather Mode:  {WEATHER_API_MODE}")
    print(f"Database Mode: {DATABASE_MODE}")
    if DATA_SOURCE_MODE != "simulation":
        print(f"Serial Port:   {HARDWARE_SERIAL_PORT}")
        print(f"Device ID:     {HARDWARE_DEVICE_ID}")
    print("=" * 60)


if __name__ == "__main__":
    print_config()
