"""
P-WOS Flask API Server - LOCAL DEVELOPMENT VERSION
Security-improved but optimized for local use
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
from threading import Lock

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.backend.models.ml_predictor import MLPredictor
from src.backend.utils.vpd_calculator import calculate_vpd

import logging
from logging.handlers import RotatingFileHandler

# ============================================================
# CONFIGURATION (Environment Variables with Defaults)
# ============================================================

class Config:
    """Configuration with sensible defaults for local development"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = FLASK_ENV == 'development'
    
    # CORS - Restrict to local frontend
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
    
    # MQTT
    MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
    MQTT_PORT = int(os.getenv('MQTT_PORT', '1883'))
    MQTT_USERNAME = os.getenv('MQTT_USERNAME', '')
    MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', '')
    
    # Database
    DATABASE_PATH = os.getenv('DATABASE_PATH', '../../data/pwos_simulation.db')
    
    # API
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    API_PORT = int(os.getenv('API_PORT', '5000'))

config = Config()

# ============================================================
# FLASK APP INITIALIZATION
# ============================================================

app = Flask(__name__)
app.config.from_object(config)

# CORS - Restricted to local frontend only
CORS(app, 
     origins=config.ALLOWED_ORIGINS,
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'])

# ============================================================
# LOGGING SETUP
# ============================================================

# Get project root
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
log_dir = os.path.join(project_root, "logs")

# Create logs directory if it doesn't exist
os.makedirs(log_dir, exist_ok=True)

# Configure file logging (using FileHandler to avoid Windows file lock issues)
log_file_path = os.path.join(log_dir, 'app.log')
file_handler = logging.FileHandler(log_file_path, mode='a', encoding='utf-8')
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)

# Configure console logging
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

app.logger.addHandler(file_handler)
app.logger.addHandler(console_handler)
app.logger.setLevel(logging.INFO)

# ============================================================
# THREAD-SAFE GLOBAL STATE
# ============================================================

latest_sensor_data = {}
sensor_data_lock = Lock()

system_state = {
    'mode': 'AUTO',  # 'AUTO' or 'MANUAL'
    'pump_active': False,
}
system_state_lock = Lock()

# ============================================================
# INITIALIZE CORE COMPONENTS
# ============================================================

try:
    db = PWOSDatabase()
    app.logger.info("✅ Database connected")
except Exception as e:
    app.logger.error(f"❌ Database connection failed: {e}")
    sys.exit(1)

try:
    predictor = MLPredictor()
    app.logger.info("✅ ML Predictor loaded")
except Exception as e:
    app.logger.warning(f"⚠️  ML Predictor failed to load: {e}")
    predictor = None

# ============================================================
# MQTT CLIENT SETUP
# ============================================================

import uuid
client_id = f"PWOS_API_{uuid.uuid4().hex[:8]}"  # Unique ID to avoid collisions
mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id)

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        app.logger.info(f"✅ MQTT Connected: {config.MQTT_BROKER}:{config.MQTT_PORT}")
        client.subscribe("pwos/sensor/data")
        client.subscribe("pwos/weather/current")
        app.logger.info("📡 Subscribed to sensor & weather topics")
    else:
        app.logger.error(f"❌ MQTT Connection failed with code {rc}")

from src.config import WEATHER_API_MODE
from src.backend.weather_api import weather_api

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        topic = msg.topic
        
        with sensor_data_lock:  # Thread-safe update
            if topic == "pwos/sensor/data":
                # Update sensor values
                latest_sensor_data.update({
                    'soil_moisture': payload.get('soil_moisture'),
                    'temperature': payload.get('temperature'),
                    'humidity': payload.get('humidity'),
                    'timestamp': payload.get('timestamp')
                })

                # If in Real Weather Mode, fetch forecast NOW
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
                        app.logger.warning(f"Failed to fetch real weather: {e}")
                
            elif topic == "pwos/weather/current":
                # ONLY update if in Simulation Mode
                if WEATHER_API_MODE == 'simulation':
                    latest_sensor_data.update({
                        'forecast_minutes': payload.get('forecast_minutes', 0),
                        'rain_intensity': payload.get('rain_intensity', 0.0),
                        'cloud_cover': payload.get('cloud_cover', 0.0),
                        'weather_condition': payload.get('condition', 'unknown'),
                        'precipitation_chance': payload.get('precipitation_chance', 0),
                        'wind_speed': payload.get('wind_speed', 0.0),
                        'weather_source': 'simulation'
                    })
            
    except Exception as e:
        app.logger.error(f"MQTT message error: {e}")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Set credentials if provided
if config.MQTT_USERNAME and config.MQTT_PASSWORD:
    mqtt_client.username_pw_set(config.MQTT_USERNAME, config.MQTT_PASSWORD)
    app.logger.info("🔐 MQTT authentication enabled")

# Connect to MQTT broker
try:
    mqtt_client.connect(config.MQTT_BROKER, config.MQTT_PORT, 60)
    mqtt_client.loop_start()
    app.logger.info(f"✅ MQTT client started")
except Exception as e:
    app.logger.error(f"❌ MQTT connection failed: {e}")
    app.logger.warning("⚠️  API will continue but MQTT features disabled")

# ============================================================
# INPUT VALIDATION HELPERS
# ============================================================

def validate_pump_control(data):
    """Validate pump control request"""
    if not data:
        return None, "Request body is required"
    
    action = data.get('action', '').upper()
    if action not in ['ON', 'OFF']:
        return None, "action must be 'ON' or 'OFF'"
    
    duration = data.get('duration', 30)
    try:
        duration = int(duration)
        if duration < 1 or duration > 120:
            return None, "duration must be between 1 and 120 seconds"
    except (ValueError, TypeError):
        return None, "duration must be a valid number"
    
    return {'action': action, 'duration': duration}, None

def validate_limit(limit, max_limit=1000):
    """Validate limit parameter for history queries"""
    try:
        limit = int(limit)
        return min(max(1, limit), max_limit)
    except (ValueError, TypeError):
        return 100  # Default

# ============================================================
# FRONTEND SERVING
# ============================================================

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

# ============================================================
# API ENDPOINTS
# ============================================================

@app.route('/api')
def api_info():
    """API status info"""
    return jsonify({
        'name': 'P-WOS API',
        'version': '1.0',
        'environment': config.FLASK_ENV,
        'status': 'online',
        'endpoints': {
            'health': '/api/health',
            'latest_data': '/api/sensor-data/latest',
            'history': '/api/sensor-data/history',
            'statistics': '/api/statistics',
            'pump_control': '/api/control/pump',
            'prediction': '/api/predict-next-watering',
            'watering_events': '/api/watering-events',
            'logs': '/api/logs',
            'settings': '/api/settings',
            'system_state': '/api/system/state'
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Comprehensive health check"""
    health = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'components': {}
    }
    
    # Database check
    try:
        stats = db.get_statistics()
        health['components']['database'] = {
            'status': 'up',
            'total_readings': stats.get('total_readings', 0),
            'total_waterings': stats.get('total_waterings', 0)
        }
    except Exception as e:
        health['status'] = 'degraded'
        health['components']['database'] = {'status': 'down', 'error': 'Connection failed'}
        app.logger.error(f"Database health check failed: {e}")
    
    # MQTT check
    health['components']['mqtt'] = {
        'status': 'up' if mqtt_client.is_connected() else 'down',
        'broker': config.MQTT_BROKER
    }
    
    # ML Model check
    health['components']['ml_model'] = {
        'status': 'up' if predictor and predictor.model else 'down'
    }
    
    # Sensor data check
    with sensor_data_lock:
        has_sensor_data = bool(latest_sensor_data.get('soil_moisture'))
    
    health['components']['sensor_data'] = {
        'status': 'up' if has_sensor_data else 'waiting'
    }
    
    status_code = 200 if health['status'] == 'healthy' else 503
    return jsonify(health), status_code

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
            'device_id': row[5] if len(row) > 5 else 'unknown'
        })
    else:
        return jsonify({'error': 'No sensor data available'}), 404

@app.route('/api/sensor-data/history', methods=['GET'])
def get_sensor_history():
    """Get historical sensor data"""
    limit = validate_limit(request.args.get('limit', 100))
    
    try:
        readings = db.get_recent_readings(limit=limit)
        
        data = []
        for row in readings:
            data.append({
                'id': row[0],
                'timestamp': row[1],
                'soil_moisture': row[2],
                'temperature': row[3],
                'humidity': row[4]
            })
        
        return jsonify(data)
    
    except Exception as e:
        app.logger.error(f"Error fetching history: {e}", exc_info=True)
        return jsonify({'error': 'Failed to fetch sensor history'}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get system statistics"""
    try:
        stats = db.get_statistics()
        return jsonify(stats)
    except Exception as e:
        app.logger.error(f"Error fetching statistics: {e}")
        return jsonify({'error': 'Failed to fetch statistics'}), 500

@app.route('/api/control/pump', methods=['POST'])
def control_pump():
    """
    Control water pump
    
    Body:
    {
        "action": "ON" | "OFF",
        "duration": 30  (seconds, 1-120)
    }
    """
    data = request.get_json()
    validated, error = validate_pump_control(data)
    
    if error:
        return jsonify({'error': error}), 400
    
    action = validated['action']
    duration = validated['duration']
    
    # Log the action
    app.logger.info(f"Pump control request: {action} for {duration}s from {request.remote_addr}")
    
    # Publish to MQTT
    try:
        command = {
            'action': action,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        }
        
        result = mqtt_client.publish('pwos/control/pump', json.dumps(command))
        
        if result.rc == 0:
            # Update system state
            with system_state_lock:
                system_state['pump_active'] = (action == 'ON')
            
            # Log to database if pump activated
            if action == 'ON':
                try:
                    with sensor_data_lock:
                        current_moisture = latest_sensor_data.get('soil_moisture', 0)
                    
                    db.log_watering_event({
                        'duration_seconds': duration,
                        'trigger_type': 'manual',
                        'moisture_before': current_moisture
                    })
                except Exception as e:
                    app.logger.error(f"Failed to log watering event: {e}")
            
            return jsonify({
                'status': 'success',
                'action': action,
                'duration': duration,
                'timestamp': command['timestamp']
            })
        else:
            return jsonify({'error': 'MQTT publish failed'}), 500
    
    except Exception as e:
        app.logger.error(f"Pump control error: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/predict-next-watering', methods=['GET'])
def predict_next_watering():
    """Get ML prediction for next watering"""
    if not predictor:
        return jsonify({'error': 'ML model not available'}), 503
    
    try:
        # Get sensor data (thread-safe)
        with sensor_data_lock:
            sensor_data = latest_sensor_data.copy()
        
        if not sensor_data or 'soil_moisture' not in sensor_data:
            return jsonify({'error': 'No sensor data available'}), 404
        
        current_moisture = sensor_data.get('soil_moisture', 50)
        forecast_minutes = sensor_data.get('forecast_minutes', 0)
        precipitation_chance = sensor_data.get('precipitation_chance', 0)
        
        # Safety override: Don't water if it's literally raining right now
        if sensor_data.get('rain_intensity', 0) > 0 and current_moisture > 10:
            return jsonify({
                'timestamp': datetime.now().isoformat(),
                'current_moisture': current_moisture,
                'forecast_minutes': forecast_minutes,
                'sensor_snapshot': sensor_data,
                'recommended_action': 'STALL',
                'recommended_duration': 0,
                'system_status': 'RAINING_NOW',
                'ml_analysis': {
                    'confidence': 100,
                    'reason': f"Currently raining. No watering needed."
                }
            })

        # Safety override: Don't water if rain is imminent (<6h)
        if 0 < forecast_minutes < 360 and precipitation_chance > 70:
            return jsonify({
                'timestamp': datetime.now().isoformat(),
                'current_moisture': current_moisture,
                'forecast_minutes': forecast_minutes,
                'sensor_snapshot': sensor_data,
                'recommended_action': 'STALL',
                'recommended_duration': 0,
                'system_status': 'RAIN_IMMINENT',
                'ml_analysis': {
                    'confidence': 100,
                    'reason': f"Rain expected in {forecast_minutes} mins (Chance: {precipitation_chance}%)"
                }
            })

        # Run ML Prediction
        ml_result = predictor.predict_next_watering(sensor_data)

        # Log ML decision to database
        try:
            db.insert_ml_decision({
                'soil_moisture': current_moisture,
                'temperature': sensor_data.get('temperature', 25),
                'humidity': sensor_data.get('humidity', 60),
                'vpd': ml_result.get('features_used', {}).get('vpd', 0.0),
                'forecast_minutes': forecast_minutes,
                'precipitation_chance': precipitation_chance,
                'wind_speed': sensor_data.get('wind_speed', 0.0),
                'rain_intensity': sensor_data.get('rain_intensity', 0.0),
                'decision': ml_result['recommended_action'],
                'confidence': ml_result.get('confidence', 0),
                'reason': ml_result.get('reason', ''),
                'recommended_duration': ml_result['recommended_duration']
            })
        except Exception as e:
            app.logger.error(f"Failed to log ML decision: {e}")
        
        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'current_moisture': current_moisture,
            'forecast_minutes': forecast_minutes,
            'sensor_snapshot': {
                'moisture': round(current_moisture, 1),
                'temperature': round(sensor_data.get('temperature', 28), 1),
                'humidity': round(sensor_data.get('humidity', 65), 1)
            },
            'recommended_action': ml_result['recommended_action'],
            'recommended_duration': ml_result['recommended_duration'],
            'system_status': ml_result['system_status'],
            'ml_analysis': ml_result
        })
        
    except Exception as e:
        app.logger.error(f"Prediction error: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/system/state', methods=['GET', 'POST'])
def get_system_state():
    """Get or update system state"""
    with system_state_lock:
        if request.method == 'POST':
            data = request.json or {}
            if 'mode' in data:
                system_state['mode'] = data['mode']
                app.logger.info(f"System mode changed to: {data['mode']}")
                add_log(f"System switched to {data['mode']} mode", category='ACTION')
        
        return jsonify(system_state.copy())

@app.route('/api/logs', methods=['GET', 'POST'])
def handle_logs():
    """Get logs or add new log"""
    if request.method == 'POST':
        data = request.json or {}
        message = data.get('message', '')
        log_type = data.get('type', 'INFO')
        add_log(message, log_type)
        return jsonify({'status': 'logged'})
    
    # GET: Return last 50 logs
    try:
        logs = db.get_logs(limit=50)
        formatted_logs = []
        for row in logs:
            formatted_logs.append({
                'id': row.get('id'),
                'timestamp': row.get('timestamp'),
                'level': row.get('level'),
                'source': row.get('source'),
                'message': row.get('message'),
                'type': row.get('source')  # Backward compatibility
            })
        return jsonify(formatted_logs)
    except Exception as e:
        app.logger.error(f"Failed to fetch logs: {e}")
        return jsonify([])

def add_log(message, category="INFO"):
    """Helper to add log with timestamp"""
    try:
        db.insert_log(message, level="INFO", source=category)
    except Exception as e:
        app.logger.error(f"Failed to insert log to DB: {e}")
    
    # Also write to server log
    safe_message = message.encode('ascii', 'ignore').decode('ascii').strip()
    app.logger.info(f"[{category}] {safe_message}")

@app.route('/api/watering-events', methods=['GET'])
def get_watering_events():
    """Get watering event history"""
    limit = validate_limit(request.args.get('limit', 50))
    
    try:
        events = db.get_watering_events(limit=limit)
        
        data = []
        for row in events:
            data.append({
                'id': row[0],
                'timestamp': row[1],
                'duration_seconds': row[2],
                'trigger_type': row[3],
                'moisture_before': row[4],
                'moisture_after': row[5] if len(row) > 5 else None
            })
        
        return jsonify(data)
    except Exception as e:
        app.logger.error(f"Error fetching watering events: {e}")
        return jsonify({'error': 'Failed to fetch watering events'}), 500

# In-memory operational settings
operational_settings = {
    'moisture_threshold': 30,
    'max_duration': 45,
}
settings_lock = Lock()

@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    """Get or update operational settings"""
    with settings_lock:
        if request.method == 'POST':
            data = request.json or {}
            
            if 'moisture_threshold' in data:
                try:
                    threshold = int(data['moisture_threshold'])
                    if 10 <= threshold <= 80:
                        operational_settings['moisture_threshold'] = threshold
                    else:
                        return jsonify({'error': 'moisture_threshold must be 10-80'}), 400
                except (ValueError, TypeError):
                    return jsonify({'error': 'moisture_threshold must be a number'}), 400
            
            if 'max_duration' in data:
                try:
                    duration = int(data['max_duration'])
                    if 5 <= duration <= 120:
                        operational_settings['max_duration'] = duration
                    else:
                        return jsonify({'error': 'max_duration must be 5-120'}), 400
                except (ValueError, TypeError):
                    return jsonify({'error': 'max_duration must be a number'}), 400
            
            app.logger.info(f"Settings updated: {operational_settings}")
            add_log(
                f"Settings updated: threshold={operational_settings['moisture_threshold']}%, "
                f"duration={operational_settings['max_duration']}s",
                category="ACTION"
            )
            return jsonify({"status": "success", "settings": operational_settings})
        
        return jsonify(operational_settings.copy())

# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(400)
def bad_request(e):
    return jsonify({'error': 'Bad request', 'message': str(e)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    app.logger.error(f"Internal server error: {e}", exc_info=True)
    return jsonify({'error': 'Internal server error'}), 500

# ============================================================
# REQUEST/RESPONSE LOGGING (Minimal for local dev)
# ============================================================

@app.before_request
def log_request_info():
    """Log incoming requests"""
    # Only log non-health-check requests to avoid spam
    if request.path != '/api/health':
        app.logger.info(f"{request.method} {request.path} from {request.remote_addr}")

@app.after_request
def log_response_info(response):
    """Log responses"""
    # Only log errors and important endpoints
    if response.status_code >= 400 or request.path.startswith('/api/control'):
        app.logger.info(f"{response.status_code} for {request.path}")
    
    return response

# ============================================================
# STARTUP
# ============================================================

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("P-WOS API SERVER - LOCAL DEVELOPMENT")
    print("=" * 60)
    print(f"Environment:      {config.FLASK_ENV}")
    print(f"Debug Mode:       {config.DEBUG}")
    print(f"API Address:      http://{config.API_HOST}:{config.API_PORT}")
    print(f"CORS Origins:     {', '.join(config.ALLOWED_ORIGINS)}")
    print(f"MQTT Broker:      {config.MQTT_BROKER}:{config.MQTT_PORT}")
    print(f"Database:         {config.DATABASE_PATH}")
    print("\nAvailable Endpoints:")
    print("   GET  /api/health")
    print("   GET  /api/sensor-data/latest")
    print("   GET  /api/sensor-data/history?limit=100")
    print("   GET  /api/statistics")
    print("   GET  /api/predict-next-watering")
    print("   GET  /api/watering-events")
    print("   POST /api/control/pump")
    print("   GET  /api/logs")
    print("   GET  /api/settings")
    print("=" * 60 + "\n")
    
    # Start the Background Scheduler
    try:
        from scheduler import scheduler
        scheduler.start()
        app.logger.info("✅ Background scheduler started")
    except ImportError:
        app.logger.warning("⚠️  Scheduler not found (this is okay)")
    except Exception as e:
        app.logger.warning(f"⚠️  Scheduler failed to start: {e}")
    
    # Run Flask (use_reloader=False to prevent duplicate scheduler)
    app.run(
        debug=config.DEBUG,
        port=config.API_PORT,
        host=config.API_HOST,
        use_reloader=False
    )
