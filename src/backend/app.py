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

import pandas as pd
from src.config import CORS_ORIGINS, FLASK_DEBUG
from src.backend.models.ml_predictor import MLPredictor
from src.backend.utils.vpd_calculator import calculate_vpd

import logging
import time
import threading
from collections import deque

app = Flask(__name__)
if FLASK_DEBUG:
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
else:
    CORS(app, origins=CORS_ORIGINS)

# --- Logging Setup ---
# Get project root (2 levels up from src/backend/app.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
log_dir = os.path.join(project_root, "logs", "app")

# Create 'logs/app' directory if it doesn't exist
os.makedirs(log_dir, exist_ok=True)

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

# Global state shared between the MQTT thread and Flask request threads.
# All mutations and multi-key reads must hold state_lock.
state_lock = threading.Lock()
latest_sensor_data = {'weather_source': 'initializing'}

# In-memory history cache to avoid database latency on ML predictions
sensor_history_cache = deque(maxlen=5)

system_state = {
    'mode': 'AUTO',
    'pump_active': False,
    'hardware_status': 'OFFLINE',
}

# Single background worker for ML decision logging (avoids one thread per request)
import queue
ml_decision_queue = queue.Queue(maxsize=1000)

def _ml_decision_log_worker():
    while True:
        record = ml_decision_queue.get()
        try:
            db.insert_ml_decision(record)
        except Exception as e:
            app.logger.error(f"[ML LOG] Failed to log decision: {e}")
        finally:
            ml_decision_queue.task_done()

threading.Thread(target=_ml_decision_log_worker, daemon=True).start()

client_id = f"PWOS_API_{random.randint(1000, 9999)}"
mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id)

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        app.logger.info("API Connected to MQTT Broker")
        client.subscribe("pwos/sensor/data")
        client.subscribe("pwos/weather/current")
        client.subscribe("pwos/system/mode")
        client.subscribe("pwos/system/hardware")
        app.logger.info("API Subscribed to sensor, weather, mode, & hardware topics")
    else:
        app.logger.error(f"API MQTT Connection failed with code {rc}")

from src.config import WEATHER_API_MODE
from src.backend.weather_api import weather_api

def _merge_weather_forecast(forecast):
    """Merge a weather forecast into latest_sensor_data (thread-safe)."""
    weather_update = {
        'forecast_minutes': forecast.get('forecast_minutes', 0),
        'rain_intensity': forecast.get('rain_intensity', 0.0),
        'cloud_cover': forecast.get('cloud_cover', 0.0),
        'weather_condition': forecast.get('condition', 'unknown'),
        'precipitation_chance': forecast.get('precipitation_chance', 0),
        'wind_speed': forecast.get('wind_speed', 0.0),
        'forecast_temp': forecast.get('forecast_temp', 0.0),
        'forecast_humidity': forecast.get('forecast_humidity', 0.0),
        'weather_source': forecast.get('source', 'openweathermap'),
        'weather_updated_at': datetime.now().isoformat()
    }
    with state_lock:
        latest_sensor_data.update(weather_update)

# Single-flight guard so at most one background weather refresh runs at a time
_weather_refresh_inflight = threading.Event()

def _refresh_weather_async():
    """Fetch weather on a background thread so the MQTT ingest thread never
    blocks on HTTP (a cache-miss fetch costs up to 2x5s timeouts)."""
    if _weather_refresh_inflight.is_set():
        return
    _weather_refresh_inflight.set()

    def _job():
        try:
            _merge_weather_forecast(weather_api.get_forecast())
        except Exception as e:
            app.logger.warning(f"Async weather refresh failed: {e}")
        finally:
            _weather_refresh_inflight.clear()

    threading.Thread(target=_job, daemon=True).start()

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        raw = msg.payload.decode('utf-8', 'ignore')
        
        # ── Plain-text topics (no JSON) ──────────────────────────────
        if topic == "pwos/system/mode":
            mode = raw.upper().strip().strip('"')
            if mode in ["AUTO", "MANUAL"]:
                with state_lock:
                    system_state['mode'] = mode
                app.logger.info(f"[MQTT] System mode synchronized to {mode}")
            return

        if topic == "pwos/system/hardware":
            status = raw.upper().strip().strip('"')
            with state_lock:
                system_state['hardware_status'] = status
            app.logger.info(f"[MQTT] Hardware status: {status}")
            return
            
        # ── JSON topics ──────────────────────────────────────────────
        payload = json.loads(raw)
        
        if topic == "pwos/sensor/data":
            # Update sensor values (use server time — ESP32 sends millis())
            with state_lock:
                latest_sensor_data.update({
                    'soil_moisture': payload.get('soil_moisture'),
                    'temperature': payload.get('temperature'),
                    'humidity': payload.get('humidity'),
                    'timestamp': datetime.now().isoformat()
                })

            # If in Real Weather Mode, merge the current forecast.
            # Inline only when the answer is already cached (sub-ms); a cache
            # miss goes to a background thread so this MQTT callback — which
            # every subsequent sensor message queues behind — never blocks on HTTP.
            if WEATHER_API_MODE == 'openweathermap':
                if getattr(weather_api, 'has_fresh_cache', lambda: False)():
                    try:
                        _merge_weather_forecast(weather_api.get_forecast())
                    except Exception as e:
                        app.logger.warning(f"Failed to fetch real weather on sensor update: {e}")
                else:
                    _refresh_weather_async()
            
            # Persist the latest reading to the database
            log_sensor_data()
            
        elif topic == "pwos/weather/current":
            # Update from simulator if:
            # 1. We are in simulation mode, OR
            # 2. We are in openweathermap mode but API is down (fallback active)
            api_is_down = getattr(weather_api, '_api_was_down', False)
            if WEATHER_API_MODE == 'simulation' or api_is_down:
                source_label = 'simulation' if WEATHER_API_MODE == 'simulation' else 'simulation_fallback'
                with state_lock:
                    latest_sensor_data.update({
                        'forecast_minutes': payload.get('forecast_minutes', 0),
                        'rain_intensity': payload.get('rain_intensity', 0.0),
                        'cloud_cover': payload.get('cloud_cover', 0.0),
                        'weather_condition': payload.get('condition', 'unknown'),
                        'precipitation_chance': payload.get('precipitation_chance', 0),
                        'wind_speed': payload.get('wind_speed', 0.0),
                        'forecast_temp': payload.get('temperature') or payload.get('forecast_temp', 0.0),
                        'forecast_humidity': payload.get('humidity') or payload.get('forecast_humidity', 0.0),
                        'weather_source': source_label,
                        'weather_updated_at': datetime.now().isoformat()
                    })
            
    except Exception as e:
        app.logger.error(f"API MQTT Message Error: {e}")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Connect to MQTT broker.
# Skipped under pytest: a live broker feeding on_message during a test run does
# DB writes and weather fetches inside the test process, skewing benchmarks.
if 'pytest' not in sys.modules:
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
    global system_state
    try:
        data = request.json
        action = data.get('action', 'OFF')
        duration = data.get('duration', 0)
        
        # Get current moisture before watering
        readings = db.get_recent_readings(limit=1)
        moisture_before = readings[0][2] if readings else None
        
        # Send MQTT command
        # Convert duration to integer because ESP32 ArduinoJson parsing expects an int
        # and may default to 30 seconds if it fails to parse a float.
        payload = json.dumps({
            'action': action,
            'duration': int(round(float(duration)))
        })
        
        result = mqtt_client.publish('pwos/control/pump', payload)
        mqtt_ok = (result.rc == mqtt.MQTT_ERR_SUCCESS)
        if not mqtt_ok:
            app.logger.warning(f"MQTT publish of pump command failed (rc={result.rc}); hardware may not have received it")

        # Determine trigger type (Default to MANUAL if not specified)
        trigger_source = data.get('trigger_source', 'MANUAL')
        
        # Log watering event
        if action == 'ON' and moisture_before is not None:
            event_id = db.insert_watering_event(
                duration=duration,
                trigger_type=trigger_source,
                moisture_before=moisture_before,
                moisture_after=None
            )
            
            # Schedule moisture_after capture (read 60s after watering completes)
            def capture_moisture_after(eid):
                try:
                    readings = db.get_recent_readings(limit=1)
                    if readings:
                        moisture_after = readings[0][2]
                        db.update_moisture_after(eid, moisture_after)
                        app.logger.info(f"Updated moisture_after={moisture_after:.1f}% for event {eid}")
                except Exception as ex:
                    app.logger.error(f"moisture_after capture failed: {ex}")
            
            # Wait for pump duration + 60s settling time using a lightweight Timer thread
            total_delay = duration + 60
            t = threading.Timer(total_delay, capture_moisture_after, args=[event_id])
            t.daemon = True
            t.start()
        
        # Update in-memory pump state
        with state_lock:
            system_state['pump_active'] = (action == 'ON')
            pump_active = system_state['pump_active']

        return jsonify({
            'status': 'success',
            'message': f'Pump {action}',
            'duration': duration,
            'mqtt_result': result.rc,
            'mqtt_ok': mqtt_ok,
            'pump_active': pump_active
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
        with state_lock:
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
        # Snapshot shared state once so the MQTT thread can't mutate it mid-request
        with state_lock:
            sensor_data = dict(latest_sensor_data)
            hardware_status = system_state.get('hardware_status', 'OFFLINE')

        # 1. HARDWARE ALIVE CHECK
        if hardware_status == 'OFFLINE':
            return jsonify({
                'timestamp': datetime.now().isoformat(),
                'current_moisture': sensor_data.get('soil_moisture', 0.0),
                'forecast_minutes': sensor_data.get('forecast_minutes', 0),
                'sensor_snapshot': {
                    'moisture': float(sensor_data.get('soil_moisture') or 0.0),
                    'temperature': float(sensor_data.get('temperature') or 0.0),
                    'humidity': float(sensor_data.get('humidity') or 0.0)
                },
                'recommended_action': 'STOP',
                'recommended_duration': 0,
                'system_status': 'HARDWARE_OFFLINE',
                'ml_analysis': {'reason': 'Hardware disconnected. Safety interlock engaged.'}
            })

        # Use real data if available, otherwise return error
        if 'soil_moisture' not in sensor_data:
            return jsonify({'error': 'No active sensor data available for prediction'}), 503
            
        current_moisture = float(sensor_data.get('soil_moisture', 50))
        forecast_minutes = int(sensor_data.get('forecast_minutes', 0))
        precipitation_chance = int(sensor_data.get('precipitation_chance', 0))
        


        # Fetch sensor history (last 5 readings) from memory instead of DB
        try:
            if sensor_history_cache:
                # Convert deque to list of dicts, then to DataFrame
                history_df = pd.DataFrame(list(sensor_history_cache))
            else:
                history_df = None
        except Exception as e:
            app.logger.warning(f"Failed to load recent readings for ML prediction history: {e}")
            history_df = None

        # Run ML Prediction (Includes Rules & Safety Checks - bypasses disk reads with cached settings)
        ml_result = predictor.predict_next_watering(sensor_data, history_df=history_df, active_settings=operational_settings)

        # Log ML decision to database asynchronously to eliminate ~20ms write latency
        decision_record = {
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
        }
        try:
            ml_decision_queue.put_nowait(decision_record)
        except queue.Full:
            app.logger.warning("[ML LOG] Decision log queue full — dropping record")
        
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

@app.route('/api/system/state', methods=['GET', 'POST'])
def get_system_state():
    """Get or update system state (mode + pump)."""
    global system_state
    
    if request.method == 'POST':
        data = request.json or {}
        if 'mode' in data:
            new_mode = data['mode'].upper()
            if new_mode in ('AUTO', 'MANUAL'):
                with state_lock:
                    system_state['mode'] = new_mode
                mqtt_client.publish('pwos/system/mode', new_mode, retain=True)
                add_log(f"System mode changed to {new_mode}", category='ACTION')
        if 'pump_active' in data:
            with state_lock:
                system_state['pump_active'] = bool(data['pump_active'])

    with state_lock:
        return jsonify(dict(system_state))

def log_sensor_data():
    """Background task to log sensor data with weather context.
    Includes staleness detection for weather data.
    """
    with state_lock:
        snapshot = dict(latest_sensor_data)

    if snapshot and 'soil_moisture' in snapshot:
        # P3: Weather staleness detection
        weather_source = snapshot.get('weather_source', 'none')
        weather_ts = snapshot.get('weather_updated_at')
        if weather_ts:
            try:
                age = (datetime.now() - datetime.fromisoformat(weather_ts)).total_seconds()
                if age > 600:  # 10 minutes
                    app.logger.warning(f"Weather data is {age/60:.0f}m old — marking as stale")
                    weather_source = 'stale'
                    with state_lock:
                        latest_sensor_data['weather_source'] = 'stale'
            except (ValueError, TypeError):
                pass

        try:
            reading = {
                'timestamp': datetime.now().isoformat(),
                'soil_moisture': snapshot.get('soil_moisture'),
                'temperature': snapshot.get('temperature'),
                'humidity': snapshot.get('humidity'),
                'device_id': 'esp32_001',
                'forecast_minutes': snapshot.get('forecast_minutes', 0),
                'wind_speed': snapshot.get('wind_speed', 0.0),
                'precipitation_chance': snapshot.get('precipitation_chance', 0),
                'vpd': snapshot.get('vpd', 0.0),
                'rain_intensity': snapshot.get('rain_intensity', 0.0),
                'cloud_cover': snapshot.get('cloud_cover', 0.0),
                'forecast_temp': snapshot.get('forecast_temp', 0.0),
                'forecast_humidity': snapshot.get('forecast_humidity', 0.0),
                'weather_condition': snapshot.get('weather_condition', 'unknown'),
                'weather_source': weather_source
            }
            db.insert_sensor_reading(reading)
            sensor_history_cache.append(reading)
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

@app.route('/api/ml-decisions', methods=['GET'])
def get_ml_decisions():
    """Get recent ML decision audit log"""
    limit = request.args.get('limit', 100, type=int)
    limit = max(1, min(limit, 500))  # Clamp between 1 and 500
    try:
        rows = db.get_ml_decisions(limit=limit)
        data = []
        for row in rows:
            data.append({
                'id': row['id'],
                'timestamp': row['timestamp'].isoformat() if hasattr(row['timestamp'], 'isoformat') else str(row['timestamp']),
                'soil_moisture': row['soil_moisture'],
                'temperature': row['temperature'],
                'humidity': row['humidity'],
                'vpd': row['vpd'],
                'forecast_minutes': row['forecast_minutes'],
                'precipitation_chance': row['precipitation_chance'],
                'wind_speed': row['wind_speed'],
                'rain_intensity': row['rain_intensity'],
                'decay_rate': row['decay_rate'],
                'decision': row['decision'],
                'confidence': row['confidence'],
                'reason': row['reason'],
                'recommended_duration': row['recommended_duration'],
                'features_json': row['features_json'],
            })
        return jsonify(data)
    except Exception as e:
        app.logger.error(f"Failed to fetch ML decisions: {e}")
        return jsonify([])


@app.route('/api/model-versions', methods=['GET'])
def get_model_versions():
    """Get model version registry"""
    try:
        conn = db.get_connection()
        from psycopg2.extras import RealDictCursor
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM model_versions ORDER BY id DESC')
        rows = cursor.fetchall()
        conn.close()
        data = []
        for row in rows:
            data.append({
                'id': row['id'],
                'timestamp': row['timestamp'].isoformat() if hasattr(row['timestamp'], 'isoformat') else str(row['timestamp']),
                'version_tag': row['version_tag'],
                'accuracy': row['accuracy'],
                'precision': row['precision'],
                'recall': row['recall'],
                'f1_score': row['f1_score'],
                'training_samples': row['training_samples'],
                'model_path': row['model_path'],
                'is_active': row['is_active'],
            })
        return jsonify(data)
    except Exception as e:
        app.logger.error(f"Failed to fetch model versions: {e}")
        return jsonify([])


@app.route('/api/efficiency/summary', methods=['GET'])
def get_efficiency_summary():
    """Compute irrigation efficiency and water conservation metrics"""
    hours = request.args.get('hours', 168, type=int)  # Default 7 days
    hours = max(1, min(hours, 8760))  # Clamp 1h to 1 year
    try:
        conn = db.get_connection()
        from psycopg2.extras import RealDictCursor
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # --- Watering event stats ---
        cursor.execute('''
            SELECT
                COUNT(*) AS total_events,
                COALESCE(SUM(duration_seconds), 0) AS total_duration,
                COUNT(CASE WHEN trigger_type != 'MANUAL' THEN 1 END) AS ai_events,
                COALESCE(SUM(CASE WHEN trigger_type != 'MANUAL' THEN duration_seconds ELSE 0 END), 0) AS ai_duration,
                COUNT(CASE WHEN trigger_type = 'MANUAL' THEN 1 END) AS manual_events,
                COALESCE(SUM(CASE WHEN trigger_type = 'MANUAL' THEN duration_seconds ELSE 0 END), 0) AS manual_duration,
                COALESCE(AVG(CASE WHEN moisture_before IS NOT NULL THEN moisture_before END), 0) AS avg_moisture_before,
                COALESCE(AVG(CASE WHEN moisture_after IS NOT NULL THEN moisture_after END), 0) AS avg_moisture_after
            FROM watering_events
            WHERE timestamp > NOW() - make_interval(hours => %s)
        ''', (hours,))
        stats = cursor.fetchone()

        # --- Last 20 events for delta chart ---
        cursor.execute('''
            SELECT
                id,
                timestamp,
                duration_seconds,
                trigger_type,
                moisture_before,
                moisture_after
            FROM watering_events
            WHERE timestamp > NOW() - make_interval(hours => %s)
              AND moisture_before IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT 20
        ''', (hours,))
        recent_events = cursor.fetchall()

        conn.close()

        # Convert recent events
        events_list = []
        for e in recent_events:
            events_list.append({
                'id': e['id'],
                'timestamp': e['timestamp'].isoformat() if hasattr(e['timestamp'], 'isoformat') else str(e['timestamp']),
                'duration_seconds': e['duration_seconds'],
                'trigger_type': e['trigger_type'],
                'moisture_before': e['moisture_before'],
                'moisture_after': e['moisture_after'],
                'moisture_delta': round((e['moisture_after'] - e['moisture_before']), 2) if e['moisture_after'] is not None else None,
            })

        # Water saved estimate: assume AI skips ~30s of irrigation per skipped decision
        # (ratio of manual events baseline to AI events, times median duration)
        total_events = int(stats['total_events'])
        ai_events = int(stats['ai_events'])
        manual_events = int(stats['manual_events'])
        total_duration = int(stats['total_duration'])
        ai_duration = int(stats['ai_duration'])
        manual_duration = int(stats['manual_duration'])

        # Estimate: if all events were manual they'd water as frequently as manual ones,
        # water saved = ai_events * median_manual_duration - ai_duration (AI used less)
        median_manual_dur = (manual_duration // manual_events) if manual_events > 0 else 45
        ai_water_saved_seconds = max(0, (ai_events * median_manual_dur) - ai_duration)

        ai_pct = round((ai_events / total_events * 100), 1) if total_events > 0 else 0
        savings_pct = round((ai_water_saved_seconds / (ai_duration + ai_water_saved_seconds) * 100), 1) if (ai_duration + ai_water_saved_seconds) > 0 else 0

        return jsonify({
            'period_hours': hours,
            'total_events': total_events,
            'total_duration_seconds': total_duration,
            'ai_events': ai_events,
            'ai_duration_seconds': ai_duration,
            'manual_events': manual_events,
            'manual_duration_seconds': manual_duration,
            'ai_percentage': ai_pct,
            'avg_moisture_before': round(float(stats['avg_moisture_before']), 2),
            'avg_moisture_after': round(float(stats['avg_moisture_after']), 2),
            'estimated_water_saved_seconds': ai_water_saved_seconds,
            'estimated_savings_percent': savings_pct,
            'recent_events': events_list,
        })
    except Exception as e:
        app.logger.error(f"Failed to compute efficiency summary: {e}")
        return jsonify({'error': str(e)}), 500


# Persistent operational settings path
SETTINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'operational_settings.json')

# Operational settings with defaults
operational_settings = {
    'moisture_threshold': 30,
    'moisture_max': 75,
    'temp_min': 5,
    'temp_max': 32,
    'max_duration': 45,
    'latitude': -20.1492,
    'longitude': 28.5833,
    'active_region': 'matabeleland'
}

def resolve_region_from_coordinates(lat, lon):
    """Geographic bounding boxes for Zimbabwe agricultural regions."""
    # Matabeleland / Bulawayo bounding check
    if -22.5 <= lat <= -19.0 and 25.0 <= lon <= 30.0:
        return 'matabeleland'
    # Manicaland / Eastern Highlands bounding check
    elif -21.0 <= lat <= -17.5 and 32.0 <= lon <= 34.0:
        return 'manicaland'
    # Default: Mashonaland / Harare
    else:
        return 'mashonaland'

def load_settings():
    global operational_settings
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r') as f:
                saved = json.load(f)
                for k, v in saved.items():
                    if k in ('latitude', 'longitude'):
                        operational_settings[k] = float(v)
                    elif k == 'active_region':
                        operational_settings[k] = str(v)
                    else:
                        operational_settings[k] = int(v)
            app.logger.info("Loaded persisted operational settings successfully")
        except Exception as e:
            app.logger.error(f"Failed to load operational settings: {e}")

def save_settings():
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(operational_settings, f, indent=4)
        app.logger.info("Persisted operational settings successfully")
    except Exception as e:
        app.logger.error(f"Failed to persist operational settings: {e}")

# Load settings at startup
load_settings()

@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    global operational_settings
    if request.method == 'POST':
        data = request.json or {}
        updatable_keys = [
            'moisture_threshold', 'moisture_max',
            'temp_min', 'temp_max',
            'max_duration',
            'latitude', 'longitude'
        ]
        for key in updatable_keys:
            if key in data:
                if key in ('latitude', 'longitude'):
                    try:
                        val = float(data[key])
                        if key == 'latitude' and not (-90.0 <= val <= 90.0):
                            return jsonify({"error": "Latitude must be between -90 and 90"}), 400
                        if key == 'longitude' and not (-180.0 <= val <= 180.0):
                            return jsonify({"error": "Longitude must be between -180 and 180"}), 400
                        operational_settings[key] = val
                    except (ValueError, TypeError):
                        return jsonify({"error": f"Invalid format for coordinate: {key}"}), 400
                else:
                    try:
                        operational_settings[key] = int(data[key])
                    except (ValueError, TypeError):
                        return jsonify({"error": f"Invalid integer format for key: {key}"}), 400
        
        # Recalculate and save active region from coordinates
        lat = operational_settings.get('latitude', -20.1492)
        lon = operational_settings.get('longitude', 28.5833)
        operational_settings['active_region'] = resolve_region_from_coordinates(lat, lon)
        
        save_settings()
        
        add_log(
            f"Settings updated: threshold={operational_settings['moisture_threshold']}%, "
            f"max={operational_settings['moisture_max']}%, "
            f"duration={operational_settings['max_duration']}s, "
            f"region={operational_settings['active_region']}",
            category="ACTION"
        )
        
        response_data = operational_settings.copy()
        return jsonify({"status": "success", "settings": response_data})
    
    response_data = operational_settings.copy()
    return jsonify(response_data)

@app.route('/api/crops', methods=['GET'])
def get_crops():
    """Get all available crops"""
    try:
        crops = db.get_crops()
        return jsonify(crops)
    except Exception as e:
        app.logger.error(f"Failed to fetch crops: {e}")
        return jsonify([]), 500

@app.route('/api/crops/active', methods=['GET', 'PUT'])
def active_crop():
    """Get or update active crop"""
    if request.method == 'PUT':
        data = request.json
        crop_id = data.get('crop_id')
        if crop_id:
            try:
                db.set_active_crop(crop_id)
                active = db.get_active_crop()
                add_log(f"Active crop changed to {active.get('name') if active else 'Unknown'}", category="ACTION")
                # Immediately update MLPredictor's active settings in memory if needed
                return jsonify({'status': 'success', 'active_crop': active})
            except Exception as e:
                app.logger.error(f"Failed to set active crop: {e}")
                return jsonify({'error': str(e)}), 500
        return jsonify({'error': 'crop_id is required'}), 400
        
    try:
        active = db.get_active_crop()
        if not active:
            # Fallback to crop 1 if setting is missing
            db.set_active_crop('1')
            active = db.get_active_crop()
        return jsonify(active)
    except Exception as e:
        app.logger.error(f"Failed to fetch active crop: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/model/reload-check', methods=['GET'])
def model_reload_check():
    """Check if the retrain pipeline flagged a new model for reload."""
    try:
        needs_reload = db.get_system_setting('model_needs_reload', 'false')
        return jsonify({'reload_needed': needs_reload == 'true'})
    except Exception as e:
        app.logger.error(f"Model reload check error: {e}")
        return jsonify({'reload_needed': False})

@app.route('/api/model/reload', methods=['POST'])
def model_reload():
    """Reload the ML model in the running MLPredictor instance."""
    try:
        predictor._load_model()
        db.set_system_setting('model_needs_reload', 'false')
        add_log("ML model reloaded via API", category="SYSTEM")
        return jsonify({'status': 'success', 'message': 'Model reloaded.'})
    except Exception as e:
        app.logger.error(f"Model reload error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/models/retrain', methods=['POST'])
def trigger_retrain():
    """Manually trigger the model retraining pipeline"""
    try:
        from ai_service.retrain_pipeline import run_retraining_pipeline
        
        # Run in background to avoid blocking the HTTP request
        thread = threading.Thread(target=run_retraining_pipeline)
        thread.daemon = True
        thread.start()
        
        add_log("Manual model retraining triggered via API", category="SYSTEM")
        return jsonify({
            'status': 'success', 
            'message': 'Retraining pipeline started in the background. Check logs or Model Registry for updates.'
        })
    except Exception as e:
        app.logger.error(f"Failed to trigger retraining: {e}")
        return jsonify({'error': str(e)}), 500

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
