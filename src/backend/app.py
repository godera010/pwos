"""
P-WOS Flask API Server
Provides REST API endpoints for the system
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import paho.mqtt.client as mqtt
from database import PWOSDatabase
import json
from datetime import datetime
import os
import sys
import random

# Add project root to Python path so we can import 'src'
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.backend.models.ml_predictor import MLPredictor
from src.backend.utils.vpd_calculator import calculate_vpd

import logging
from logging.handlers import RotatingFileHandler
import time

app = Flask(__name__)
CORS(app)

# --- Logging Setup ---
# Get project root (2 levels up from src/backend/app.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
log_dir = os.path.join(project_root, "logs", "app")

# Create 'logs/app' directory if it doesn't exist
os.makedirs(log_dir, exist_ok=True)

# Configure file logging
# Configure file logging
log_file_path = os.path.join(log_dir, 'app.log')
# Use standard FileHandler instead of RotatingFileHandler to avoid WinError 32 (file lock) on Windows with Flask reloader
file_handler = logging.FileHandler(log_file_path, mode='a', encoding='utf-8')
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)

# Configure console logging
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))

app.logger.addHandler(file_handler)
app.logger.addHandler(console_handler)
app.logger.setLevel(logging.INFO)

@app.before_request
def log_request_info():
    app.logger.info(f"REQUEST: {request.method} {request.path} from {request.remote_addr}")

@app.after_request
def log_response_info(response):
    app.logger.info(f"RESPONSE: {response.status_code} for {request.path}")
    return response


# Initialize core components
db = PWOSDatabase()
predictor = MLPredictor()

# Global state for latest sensor data (thread-safe ideally, but simple dict for now)
latest_sensor_data = {}
client_id = f"PWOS_API_{random.randint(1000, 9999)}"
mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id)

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        app.logger.info("API Connected to MQTT Broker")
        client.subscribe("pwos/sensor/data")
        client.subscribe("pwos/weather/current")
        app.logger.info("API Subscribed to sensor & weather topics")
    else:
        app.logger.error(f"API MQTT Connection failed with code {rc}")

from src.config import WEATHER_API_MODE
from src.backend.weather_api import weather_api

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        topic = msg.topic
        
        if topic == "pwos/sensor/data":
            # Update sensor values
            latest_sensor_data.update({
                'soil_moisture': payload.get('soil_moisture'),
                'temperature': payload.get('temperature'),
                'humidity': payload.get('humidity'),
                'timestamp': payload.get('timestamp')
            })

            # If in Real Weather Mode, fetch forecast NOW and update latest_sensor_data
            if WEATHER_API_MODE == 'openweathermap':
                try:
                    forecast = weather_api.get_forecast()
                    latest_sensor_data.update({
                        'forecast_minutes': forecast.get('forecast_minutes', 0),
                        'rain_intensity': forecast.get('rain_intensity', 0.0),
                        'cloud_cover': forecast.get('cloud_cover', 0.0),
                        'weather_condition': forecast.get('condition', 'unknown'),
                        'precipitation_chance': forecast.get('precipitation_chance', 0),
                        'wind_speed': forecast.get('wind_speed', 0.0),
                        'forecast_temp': forecast.get('forecast_temp', 0.0),
                        'forecast_humidity': forecast.get('forecast_humidity', 0.0),
                        'weather_source': 'openweathermap'
                    })
                except Exception as e:
                    app.logger.warning(f"Failed to fetch real weather on sensor update: {e}")
            
            # Persist the latest reading to the database
            log_sensor_data()
            
        elif topic == "pwos/weather/current":
            # ONLY update if we are in Simulation Mode
            # If we are in OpenWeatherMap mode, we IGNORE the simulator's weather broadcasts
            if WEATHER_API_MODE == 'simulation':
                latest_sensor_data.update({
                    'forecast_minutes': payload.get('forecast_minutes', 0),
                    'rain_intensity': payload.get('rain_intensity', 0.0),
                    'cloud_cover': payload.get('cloud_cover', 0.0),
                    'weather_condition': payload.get('condition', 'unknown'),
                    'precipitation_chance': payload.get('precipitation_chance', 0),
                    'wind_speed': payload.get('wind_speed', 0.0),
                    'forecast_temp': payload.get('temperature') or payload.get('forecast_temp', 0.0),
                    'forecast_humidity': payload.get('humidity') or payload.get('forecast_humidity', 0.0),
                    'weather_source': 'simulation'
                })
            
    except Exception as e:
        app.logger.error(f"API MQTT Message Error: {e}")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Connect to MQTT broker
try:
    mqtt_client.connect("localhost", 1883, 60)
    mqtt_client.loop_start()
except Exception as e:
    app.logger.warning(f"MQTT connection failed: {e}")

# ML Prediction logic is now handled by the MLPredictor class

from flask import send_from_directory

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve the React App and Static Assets"""
    static_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'dist')
    
    if path != "" and os.path.exists(os.path.join(static_folder, path)):
        return send_from_directory(static_folder, path)
    else:
        return send_from_directory(static_folder, 'index.html')

@app.route('/api')
def api_info():
    """API status info"""
    return jsonify({
        'name': 'P-WOS API',
        'version': '1.0',
        'status': 'online',
        'endpoints': {
            'health': '/api/health',
            'latest_data': '/api/sensor-data/latest',
            'history': '/api/sensor-data/history',
            'statistics': '/api/statistics',
            'pump_control': '/api/control/pump',
            'prediction': '/api/predict-next-watering',
            'watering_events': '/api/watering-events'
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if API is running"""
    stats = db.get_statistics()
    return jsonify({
        'status': 'online',
        'timestamp': datetime.now().isoformat(),
        'database': stats
    })

@app.route('/api/sensor-data/latest', methods=['GET'])
def get_latest_sensor_data():
    """Get most recent sensor reading"""
    readings = db.get_recent_readings(limit=1)
    
    if readings:
        row = readings[0]
        return jsonify({
            'id': row[0],
            'timestamp': row[1],
            'soil_moisture': row[2],
            'temperature': row[3],
            'humidity': row[4],
            'forecast_minutes': latest_sensor_data.get('forecast_minutes', 0),
            'device_id': row[5]
        })
    
    return jsonify({'error': 'No data available'}), 404

@app.route('/api/sensor-data/history', methods=['GET'])
def get_sensor_history():
    """Get historical sensor data"""
    hours = request.args.get('hours', 24, type=int)
    readings = db.get_readings_by_timerange(hours=hours)
    
    data = []
    for row in readings:
        data.append({
            'id': row[0],
            'timestamp': row[1],
            'soil_moisture': row[2],
            'temperature': row[3],
            'humidity': row[4],
            'device_id': row[5],
            'vpd': row[9] if len(row) > 9 else 0.0
        })
    
    return jsonify(data)

@app.route('/api/analytics/aggregated', methods=['GET'])
def get_aggregated_analytics():
    """Get bucketed historical sensor data and watering events"""
    hours = request.args.get('hours', 24, type=int)
    interval_str = request.args.get('interval', '15 minutes')
    
    interval_map = {
        '1 minute': 60,
        '5 minutes': 300,
        '10 minutes': 600,
        '15 minutes': 900,
        '1 hour': 3600,
        '6 hours': 21600
    }
    interval_seconds = interval_map.get(interval_str, 900)
    
    try:
        sensors, events = db.get_aggregated_data(hours, interval_seconds)
        merged = {}
        
        for s in sensors:
            if not s['bucket']: continue
            bucket_iso = s['bucket'].isoformat()
            merged[bucket_iso] = {
                'timestamp': bucket_iso,
                'soil_moisture': float(s['avg_moisture']) if s['avg_moisture'] is not None else None,
                'temperature': float(s['avg_temp']) if s['avg_temp'] is not None else None,
                'humidity': float(s['avg_humidity']) if s['avg_humidity'] is not None else None,
                'vpd': float(s['avg_vpd']) if s['avg_vpd'] is not None else None,
                'watering': {
                    'total_duration': 0,
                    'ai_duration': 0,
                    'ai_event_count': 0
                }
            }
            
        for e in events:
            if not e['bucket']: continue
            bucket_iso = e['bucket'].isoformat()
            if bucket_iso not in merged:
                # Bucket with events but no history -> history fields should be null
                merged[bucket_iso] = {
                    'timestamp': bucket_iso,
                    'soil_moisture': None, 
                    'temperature': None,
                    'humidity': None,
                    'vpd': None,
                    'watering': {
                        'total_duration': 0,
                        'ai_duration': 0,
                        'ai_event_count': 0
                    }
                }
            
            merged[bucket_iso]['watering']['total_duration'] = int(e['total_duration']) if e['total_duration'] else 0
            merged[bucket_iso]['watering']['ai_duration'] = int(e['ai_duration']) if e['ai_duration'] else 0
            merged[bucket_iso]['watering']['ai_event_count'] = int(e['ai_event_count']) if e['ai_event_count'] else 0
            
        sorted_merged = sorted(merged.values(), key=lambda x: x['timestamp'])
        return jsonify(sorted_merged)
        
    except Exception as e:
        app.logger.error(f"Aggregation error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get system statistics"""
    stats = db.get_statistics()
    return jsonify(stats)

@app.route('/api/control/pump', methods=['POST'])
def control_pump():
    """Send pump control command via MQTT"""
    try:
        data = request.json
        action = data.get('action', 'OFF')
        duration = data.get('duration', 30)
        
        # Get current moisture before watering
        readings = db.get_recent_readings(limit=1)
        moisture_before = readings[0][2] if readings else None
        
        # Send MQTT command
        payload = json.dumps({
            'action': action,
            'duration': duration
        })
        
        result = mqtt_client.publish('pwos/control/pump', payload)
        
        # Determine trigger type (Default to MANUAL if not specified)
        trigger_source = data.get('trigger_source', 'MANUAL')
        
        # Log watering event
        if action == 'ON' and moisture_before:
            event_id = db.insert_watering_event(
                duration=duration,
                trigger_type=trigger_source,
                moisture_before=moisture_before,
                moisture_after=None
            )
            
            # Schedule moisture_after capture (read 60s after watering completes)
            def capture_moisture_after(eid, delay_s):
                import time as _time
                _time.sleep(delay_s)
                try:
                    readings = db.get_recent_readings(limit=1)
                    if readings:
                        moisture_after = readings[0][2]
                        db.update_moisture_after(eid, moisture_after)
                        app.logger.info(f"Updated moisture_after={moisture_after:.1f}% for event {eid}")
                except Exception as ex:
                    app.logger.error(f"moisture_after capture failed: {ex}")
            
            import threading
            # Wait for pump duration + 60s settling time
            total_delay = duration + 60
            t = threading.Thread(target=capture_moisture_after, args=(event_id, total_delay), daemon=True)
            t.start()
        
        return jsonify({
            'status': 'success',
            'message': f'Pump {action}',
            'duration': duration,
            'mqtt_result': result.rc
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/weather/forecast', methods=['GET'])
def get_weather_forecast():
    """
    Get external weather forecast (simulated or from OpenWeatherMap API).
    This is separate from local ESP32 sensor readings.
    """
    try:
        from weather_api import weather_api
        
        forecast = weather_api.get_forecast()
        
        # Extract values from forecast dict
        wind_speed = forecast.get('wind_speed', 0)
        precipitation = forecast.get('precipitation_chance', 0)
        rain_minutes = forecast.get('forecast_minutes', 0)
        temp = forecast.get('forecast_temp', 25.0)
        humidity = forecast.get('forecast_humidity', 60.0)
        condition = forecast.get('condition', 'unknown')
        cloud_cover = forecast.get('cloud_cover', 0)
        
        # Calculate VPD
        vpd = calculate_vpd(temp, humidity)
        
        # Update global state for logging and predictions
        latest_sensor_data.update({
            'forecast_minutes': rain_minutes,
            'wind_speed': wind_speed,
            'precipitation_chance': precipitation,
            'vpd': vpd,
            'weather_condition': condition,
            'forecast_temp': temp,
            'forecast_humidity': humidity,
            'weather_source': forecast.get('source', 'openweathermap')
        })
        
        return jsonify({
            'temperature': temp,
            'humidity': humidity,
            'precipitation_chance': precipitation,
            'wind_speed_kmh': wind_speed,
            'rain_forecast_minutes': rain_minutes,
            'cloud_cover': cloud_cover,
            'vpd': vpd,
            'condition': condition,
            'source': forecast.get('source', 'simulation'),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        app.logger.error(f"Weather forecast error: {e}")
        # Fallback to basic simulation
        return jsonify({
            'temperature': 25.0 + random.uniform(-5, 10),
            'humidity': 60.0 + random.uniform(-20, 30),
            'precipitation_chance': 0,
            'wind_speed_kmh': random.randint(5, 20),
            'rain_forecast_minutes': 0,
            'condition': 'clear',
            'source': 'fallback',
            'timestamp': datetime.now().isoformat()
        })

@app.route('/api/predict-next-watering', methods=['GET'])
def predict_next_watering():
    """
    Get ML prediction for next watering time.
    Logic is now centralized in MLPredictor class.
    """
    try:
        # Use real data if available, otherwise return error
        if latest_sensor_data and 'soil_moisture' in latest_sensor_data:
            sensor_data = latest_sensor_data
        else:
            return jsonify({'error': 'No active sensor data available for prediction'}), 503
            
        current_moisture = float(sensor_data.get('soil_moisture', 50))
        forecast_minutes = int(sensor_data.get('forecast_minutes', 0))
        precipitation_chance = int(sensor_data.get('precipitation_chance', 0))
        


        # Run ML Prediction (Includes Rules & Safety Checks)
        ml_result = predictor.predict_next_watering(sensor_data)

        # Log ML decision to database
        try:
            db.insert_ml_decision({
                'soil_moisture': current_moisture,
                'temperature': sensor_data.get('temperature', 25),
                'humidity': sensor_data.get('humidity', 60),
                'vpd': ml_result.get('vpd', 0.0),
                'forecast_minutes': forecast_minutes,
                'precipitation_chance': precipitation_chance,
                'wind_speed': sensor_data.get('wind_speed', 0.0),
                'rain_intensity': sensor_data.get('rain_intensity', 0.0),
                'decay_rate': ml_result.get('decay_rate'),
                'decision': ml_result['recommended_action'],
                'confidence': ml_result.get('confidence', 0),
                'reason': ml_result.get('reason', ''),
                'recommended_duration': ml_result['recommended_duration'],
                'features': ml_result.get('features_used', {})
            })
        except Exception as e:
            app.logger.error(f"[ML LOG] Failed to log decision: {e}")
        
        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'current_moisture': current_moisture,
            'forecast_minutes': forecast_minutes,
            'sensor_snapshot': {
                'moisture': float(f"{float(current_moisture):.1f}"),
                'temperature': float(f"{float(sensor_data.get('temperature', 28.0)):.1f}"),
                'humidity': float(f"{float(sensor_data.get('humidity', 65.0)):.1f}")
            },
            
            # Use standardized fields from Predictor
            'recommended_action': ml_result['recommended_action'],
            'recommended_duration': ml_result['recommended_duration'],
            'system_status': ml_result['system_status'],
            'ml_analysis': ml_result
        })
        
    except Exception as e:
        app.logger.error(f"[PREDICT ERROR] {e}")
        return jsonify({'error': str(e)}), 500

system_state = {
    'mode': 'AUTO', # 'AUTO' or 'MANUAL'
    'pump_active': False,
}

@app.route('/api/system/state', methods=['GET', 'POST'])
def get_system_state():
    """Get or update system state"""
    global system_state
    
    if request.method == 'POST':
        data = request.json
        if 'mode' in data:
            system_state['mode'] = data['mode']
            add_log(f"System switched to {data['mode']} mode", category='ACTION')
            
    return jsonify(system_state)

def log_sensor_data():
    """Background task to log sensor data with weather context"""
    if latest_sensor_data and 'soil_moisture' in latest_sensor_data:
        try:
            db.insert_sensor_reading({
                'timestamp': datetime.now().isoformat(),
                'soil_moisture': latest_sensor_data.get('soil_moisture'),
                'temperature': latest_sensor_data.get('temperature'),
                'humidity': latest_sensor_data.get('humidity'),
                'device_id': 'esp32_001',
                'forecast_minutes': latest_sensor_data.get('forecast_minutes', 0),
                'wind_speed': latest_sensor_data.get('wind_speed', 0.0),
                'precipitation_chance': latest_sensor_data.get('precipitation_chance', 0),
                'vpd': latest_sensor_data.get('vpd', 0.0),
                'rain_intensity': latest_sensor_data.get('rain_intensity', 0.0),
                'cloud_cover': latest_sensor_data.get('cloud_cover', 0.0),
                'forecast_temp': latest_sensor_data.get('forecast_temp', 0.0),
                'forecast_humidity': latest_sensor_data.get('forecast_humidity', 0.0),
                'weather_condition': latest_sensor_data.get('weather_condition', 'unknown'),
                'weather_source': latest_sensor_data.get('weather_source', 'none')
            })
        except Exception as e:
            app.logger.error(f"Failed to log sensor data: {e}")
        
@app.route('/api/logs', methods=['GET', 'POST'])
def handle_logs():
    """Get logs or Add new log"""
    if request.method == 'POST':
        data = request.json
        message = data.get('message', '')
        log_type = data.get('type', 'INFO')
        add_log(message, log_type)
        return jsonify({'status': 'logged'})
        
    # GET: Return last 50 logs from DB
    try:
        logs = db.get_logs(limit=50)
        formatted_logs = []
        for row in logs:
            formatted_logs.append({
                'id': row['id'],
                'timestamp': row['timestamp'].strftime('%H:%M:%S') if hasattr(row['timestamp'], 'strftime') else str(row['timestamp']),
                'level': row['level'],
                'source': row['source'],
                'message': row['message'],
                'type': row['source'] # Backward compatibility for frontend
            })
        return jsonify(formatted_logs)
    except Exception as e:
        app.logger.error(f"Failed to fetch logs: {e}")
        return jsonify([])

def add_log(message, category="INFO"):
    """Helper to add log with timestamp"""
    # Write to Database
    try:
        db.insert_log(message, level="INFO", source=category)
    except Exception as e:
        app.logger.error(f"Failed to insert log to DB: {e}")
        
    # Also write to server log file
    # Remove emojis for Windows compatibility
    safe_message = message.encode('ascii', 'ignore').decode('ascii').strip()
    app.logger.info(f"[INTERNAL LOG] [{category}] {safe_message}")

@app.route('/api/watering-events', methods=['GET'])
def get_watering_events():
    """Get watering event history"""
    hours = request.args.get('hours', 24, type=int)
    events = db.get_watering_events_by_timerange(hours=hours)
    
    data = []
    for row in events:
        data.append({
            'id': row[0],
            'timestamp': row[1],
            'duration_seconds': row[2],
            'trigger_type': row[3],
            'moisture_before': row[4],
            'moisture_after': row[5]
        })
    
    return jsonify(data)

# In-memory operational settings (persisted per server session)
operational_settings = {
    'moisture_threshold': 30,
    'max_duration': 45,
}

@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    global operational_settings
    if request.method == 'POST':
        data = request.json or {}
        if 'moisture_threshold' in data:
            operational_settings['moisture_threshold'] = int(data['moisture_threshold'])
        if 'max_duration' in data:
            operational_settings['max_duration'] = int(data['max_duration'])
        add_log(f"Settings updated: threshold={operational_settings['moisture_threshold']}%, duration={operational_settings['max_duration']}s", category="ACTION")
        return jsonify({"status": "success", "settings": operational_settings})
    
    return jsonify(operational_settings)

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("P-WOS API Server")
    print("=" * 60)
    print("\n[START] Starting API Server...")
    print("[INFO] Access at: http://localhost:5000")
    print("\n[INFO] Available Endpoints:")
    print("   GET  /api/health")
    print("   GET  /api/sensor-data/latest")
    print("   GET  /api/sensor-data/history?limit=100")
    print("   GET  /api/statistics")
    print("   GET  /api/predict-next-watering")
    print("   GET  /api/watering-events")
    print("   POST /api/control/pump")
    print("\n" + "=" * 60 + "\n")
    
    # Start the Background Scheduler
    try:
        print("[INFO] Starting Background Scheduler...")
        from scheduler import scheduler
        scheduler.start()
    except Exception as e:
        print(f"[ERROR] Failed to start scheduler: {e}")

    app.run(debug=True, port=5000, host='0.0.0.0', use_reloader=False) # use_reloader=False prevents duplicate scheduler threads
