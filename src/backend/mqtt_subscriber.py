"""
MQTT Subscriber - Bridges sensor data to database
Listens to MQTT topics and stores data with real weather context
"""

import paho.mqtt.client as mqtt
import json
from database import PWOSDatabase
from weather_api import weather_api
from config import WEATHER_API_MODE

# Initialize database
db = PWOSDatabase()

# Setup Logging
import logging
import os

# Get project root (2 levels up from src/backend/mqtt_subscriber.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
log_dir = os.path.join(project_root, "logs", "app")
os.makedirs(log_dir, exist_ok=True)
    
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, "db_subscriber.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("DB_Service")

def on_connect(client, userdata, flags, rc, properties):
    """Called when connected to MQTT broker"""
    if rc == 0:
        logger.info(f"Connected to MQTT Broker (rc={rc})")
        client.subscribe("pwos/sensor/data")
        logger.info("Subscribed to pwos/sensor/data")
        logger.info(f"Weather Mode: {WEATHER_API_MODE}")
    else:
        logger.error(f"Connection failed with code {rc}")

def on_message(client, userdata, msg):
    """Receive sensor data, fetch weather, and store in database"""
    try:
        data = json.loads(msg.payload.decode())
        logger.info(f"Received: Moisture={data['soil_moisture']}%, "
              f"Temp={data['temperature']}C, "
              f"Humidity={data['humidity']}%")
        
        # Fetch weather from weather_api (respects WEATHER_API_MODE)
        try:
            forecast = weather_api.get_forecast()
            data.update({
                'forecast_minutes': forecast.get('forecast_minutes', 0),
                'wind_speed': forecast.get('wind_speed', 0.0),
                'precipitation_chance': forecast.get('precipitation_chance', 0),
                'rain_intensity': forecast.get('rain_intensity', 0.0),
                'cloud_cover': forecast.get('cloud_cover', 0.0),
                'forecast_temp': forecast.get('forecast_temp', 25.0),
                'forecast_humidity': forecast.get('forecast_humidity', 60.0),
                'weather_condition': forecast.get('condition', 'unknown'),
                'weather_source': forecast.get('source', 'unknown')
            })
            logger.info(f"Weather: {forecast.get('source')} | Wind={forecast.get('wind_speed', 0)} km/h")
        except Exception as e:
            logger.warning(f"Weather fetch failed: {e}. Using defaults.")
        
        # Store in database
        db.insert_sensor_reading(data)
        logger.info("Stored in database")
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON: {e}")
    except KeyError as e:
        logger.error(f"Missing field: {e}")
    except Exception as e:
        logger.error(f"Error: {e}")

def on_disconnect(client, userdata, rc, properties):
    """Called when disconnected from broker"""
    if rc != 0:
        logger.warning(f"Unexpected disconnection (rc={rc})")
        logger.info("Attempting to reconnect...")

if __name__ == "__main__":
    # Configuration
    MQTT_BROKER = "localhost"
    MQTT_PORT = 1883
    
    print("=" * 60)
    print("P-WOS MQTT Subscriber")
    print("=" * 60)
    logger.info("Starting MQTT Subscriber Service...")
    print(f"\nConfiguration:")
    print(f"  MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"  Database: PostgreSQL (Host: {db.get_connection().info.host})")
    print(f"\nPress Ctrl+C to stop\n")
    print("=" * 60)
    
    # Create MQTT client
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "PWOS_Subscriber")
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    
    try:
        # Connect to broker
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        
        print("\n[START] MQTT Subscriber Running...")
        print("Listening for sensor data...\n")
        
        # Start listening loop
        client.loop_forever()
        
    except KeyboardInterrupt:
        print("\n[STOP] Stopping subscriber...")
        client.disconnect()
        
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        print("Make sure Mosquitto is running: mosquitto -v")
