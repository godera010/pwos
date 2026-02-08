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
log_dir = os.path.join(project_root, "logs")

# Create 'logs' directory if it doesn't exist
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

# Configure file logging
log_file_path = os.path.join(log_dir, 'app.log')
file_handler = RotatingFileHandler(log_file_path, maxBytes=10*1024*1024, backupCount=5)
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
        print("[OK] API Connected to MQTT Broker")
        client.subscribe("pwos/sensor/data")
        client.subscribe("pwos/weather/current")
        print("[INFO] API Subscribed to sensor & weather topics")
    else:
        print(f"[FAIL] API MQTT Connection failed with code {rc}")

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
            
        elif topic == "pwos/weather/current":
            # Update forecast
            latest_sensor_data['forecast_minutes'] = payload.get('forecast_minutes', 0)
            
    except Exception as e:
        print(f"[ERROR] API MQTT Message Error: {e}")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Connect to MQTT broker
try:
    mqtt_client.connect("localhost", 1883, 60)
    mqtt_client.loop_start()
except Exception as e:
    print(f"[WARN] MQTT connection failed: {e}")

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
    limit = request.args.get('limit', 100, type=int)
    readings = db.get_recent_readings(limit=limit)
    
    data = []
    for row in readings:
        data.append({
            'id': row[0],
            'timestamp': row[1],
            'soil_moisture': row[2],
            'temperature': row[3],
            'humidity': row[4],
            'device_id': row[5]
        })
    
    return jsonify(data)

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
            db.insert_watering_event(
                duration=duration,
                trigger_type=trigger_source,
                moisture_before=moisture_before,
                moisture_after=None
            )
        
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
        
        # Update global state for logging
        wind_speed = forecast.get('wind_speed_kmh', 0)
        precipitation = forecast.get('precipitation_chance', 0)
        rain_minutes = forecast.get('rain_forecast_minutes', 0)
        temp = forecast.get('forecast_temp', 25.0)
        humidity = forecast.get('forecast_humidity', 60.0)
        
        # Calculate VPD
        vpd = calculate_vpd(temp, humidity)
        
        latest_sensor_data.update({
            'forecast_minutes': rain_minutes,
            'wind_speed': wind_speed,
            'precipitation_chance': precipitation,
            'vpd': vpd
        })
        
        return jsonify({
            'temperature': temp,
            'humidity': humidity,
            'precipitation_chance': precipitation,
            'wind_speed_kmh': wind_speed,
            'rain_forecast_minutes': rain_minutes,
            'vpd': vpd,
            'condition': 'rainy' if rain_minutes > 0 else 'clear',
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
        # Use real data if available, otherwise use simulated fallback
        if latest_sensor_data and 'soil_moisture' in latest_sensor_data:
            sensor_data = latest_sensor_data
        else:
            # Simulated fallback (Legacy / Safety Net)
            sensor_data = {
                'soil_moisture': 45 + random.uniform(-10, 10),
                'temperature': 28 + random.uniform(-5, 5),
                'humidity': 65 + random.uniform(-10, 10),
                'forecast_minutes': 0,
                'precipitation_chance': 0,
                'timestamp': datetime.now().isoformat()
            }
            
        current_moisture = sensor_data.get('soil_moisture', 50)
        forecast_minutes = sensor_data.get('forecast_minutes', 0)
        precipitation_chance = sensor_data.get('precipitation_chance', 0)
        
        # --- RAIN SAFETY RAIL ---
        # If imminent rain is detected, force system to wait/stall
        if precipitation_chance > 60 or (0 < forecast_minutes < 120):
             return jsonify({
                'timestamp': datetime.now().isoformat(),
                'current_moisture': current_moisture,
                'forecast_minutes': forecast_minutes,
                'sensor_snapshot': sensor_data,
                'recommended_action': 'STALL',
                'recommended_duration': 0,
                'system_status': 'STALL - RAIN IMMINENT',
                'ml_analysis': {'confidence': 100, 'reason': f"Rain expected in {forecast_minutes} mins (Chance: {precipitation_chance}%)"}
            })

        # Run ML Prediction (Includes Rules & Safety Checks)
        ml_result = predictor.predict_next_watering(sensor_data)
        
        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'current_moisture': current_moisture,
            'forecast_minutes': forecast_minutes,
            'sensor_snapshot': {
                'moisture': round(current_moisture, 1),
                'temperature': round(sensor_data.get('temperature', 28), 1),
                'humidity': round(sensor_data.get('humidity', 65), 1)
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
}

@app.route('/api/system/state', methods=['GET', 'POST'])
def get_system_state():
    """Get or update system state"""
    global system_state
    
    if request.method == 'POST':
        data = request.json
        if 'mode' in data:
            system_state['mode'] = data['mode']
            add_log(f"System switched to {data['mode']} mode", type='ACTION')
            
    return jsonify(system_state)

def log_sensor_data():
    """Background task to log sensor data"""
    if latest_sensor_data and 'soil_moisture' in latest_sensor_data:
        try:
            # Use current forecast data if not in latest_sensor_data
            if 'forecast_minutes' not in latest_sensor_data:
                 # Try to get from weather API cache if possible, or default to 0
                 # For now, just default to 0 to avoid circular import or lag
                 pass

            db.insert_sensor_reading({
                'timestamp': datetime.now().isoformat(),
                'soil_moisture': latest_sensor_data.get('soil_moisture'),
                'temperature': latest_sensor_data.get('temperature'),
                'humidity': latest_sensor_data.get('humidity'),
                'device_id': 'esp32_001',
                'forecast_minutes': latest_sensor_data.get('forecast_minutes', 0),
                'wind_speed': latest_sensor_data.get('wind_speed', 0.0),
                'precipitation_chance': latest_sensor_data.get('precipitation_chance', 0),
                'vpd': latest_sensor_data.get('vpd', 0.0)
            })
            # print("[LOG] Sensor data saved to DB")
        except Exception as e:
            print(f"[ERROR] Failed to log sensor data: {e}")
        
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
    limit = request.args.get('limit', 50, type=int)
    events = db.get_watering_events(limit=limit)
    
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


# ============================================================================
# LIVE SIMULATION API
# ============================================================================

import numpy as np

# Simulation State (in-memory)
simulation_state = {
    'running': False,
    'step': 0,
    'scenario': 'mixed_weather',
    'fields': {
        'reactive': {'moisture': 60.0, 'water_used': 0.0, 'pump_events': 0},
        'predictive': {'moisture': 60.0, 'water_used': 0.0, 'pump_events': 0}
    },
    'weather': {
        'temperature': 26.0,
        'humidity': 60.0,
        'is_raining': False,
        'forecast_minutes': 0
    },
    'forecast_queue': [],  # Steps until rain events
    'rain_remaining': 0,
    'rain_events': 0,
    'decision_log': [],
    'hour': 8  # Simulation hour (0-23)
}

# Scenario configurations
SIMULATION_SCENARIOS = {
    'dry_season': {'rain_prob': 0.05, 'decay_mult': 1.5, 'base_temp': 32, 'humidity': 40, 'rain_intensity': 10},
    'rainy_season': {'rain_prob': 0.4, 'decay_mult': 0.6, 'base_temp': 24, 'humidity': 85, 'rain_intensity': 15},
    'mixed_weather': {'rain_prob': 0.2, 'decay_mult': 1.0, 'base_temp': 26, 'humidity': 60, 'rain_intensity': 12},
    'heat_wave': {'rain_prob': 0.02, 'decay_mult': 2.0, 'base_temp': 38, 'humidity': 25, 'rain_intensity': 5},
    'cool_period': {'rain_prob': 0.25, 'decay_mult': 0.5, 'base_temp': 18, 'humidity': 75, 'rain_intensity': 10},
}

@app.route('/api/simulation/reset', methods=['POST'])
def simulation_reset():
    """Reset simulation to initial state."""
    global simulation_state
    
    data = request.json or {}
    scenario = data.get('scenario', 'mixed_weather')
    
    if scenario not in SIMULATION_SCENARIOS:
        scenario = 'mixed_weather'
    
    config = SIMULATION_SCENARIOS[scenario]
    
    simulation_state = {
        'running': False,
        'step': 0,
        'scenario': scenario,
        'fields': {
            'reactive': {'moisture': 60.0, 'water_used': 0.0, 'pump_events': 0},
            'predictive': {'moisture': 60.0, 'water_used': 0.0, 'pump_events': 0}
        },
        'weather': {
            'temperature': config['base_temp'],
            'humidity': config['humidity'],
            'is_raining': False,
            'forecast_minutes': 0
        },
        'forecast_queue': [],
        'rain_remaining': 0,
        'rain_events': 0,
        'decision_log': [],
        'hour': 8
    }
    
    return jsonify({'status': 'reset', 'scenario': scenario, 'state': simulation_state})

@app.route('/api/simulation/step', methods=['POST'])
def simulation_step():
    """Execute one simulation step (15 minutes of simulated time)."""
    global simulation_state
    
    state = simulation_state
    scenario = state['scenario']
    config = SIMULATION_SCENARIOS.get(scenario, SIMULATION_SCENARIOS['mixed_weather'])
    
    state['step'] += 1
    state['hour'] = (state['hour'] + 0.25) % 24  # 15 min = 0.25 hours
    hour = int(state['hour'])
    
    # --- Generate Weather ---
    temp_variance = 6.0
    temp = config['base_temp'] + temp_variance * np.sin((hour - 8) * np.pi / 12)
    temp += random.uniform(-2, 2)
    
    humidity = config['humidity'] - (temp - config['base_temp']) * 1.5
    humidity = max(20, min(100, humidity + random.uniform(-5, 5)))
    
    # Rain logic
    is_raining = False
    forecast_minutes = 0
    
    if state['rain_remaining'] > 0:
        is_raining = True
        state['rain_remaining'] -= 1
    
    # Process forecast queue
    new_queue = []
    for steps_until in state['forecast_queue']:
        if steps_until <= 0:
            is_raining = True
            state['rain_remaining'] = 4
            state['rain_events'] += 1
        else:
            new_queue.append(steps_until - 1)
            if forecast_minutes == 0:
                forecast_minutes = steps_until * 15
    state['forecast_queue'] = new_queue
    
    # Schedule new rain (every 6 hours of sim time = every 24 steps)
    if state['step'] % 24 == 0:
        if random.random() < config['rain_prob']:
            steps_until_rain = random.randint(16, 96)
            state['forecast_queue'].append(steps_until_rain)
            if forecast_minutes == 0:
                forecast_minutes = steps_until_rain * 15
    
    state['weather'] = {
        'temperature': round(temp, 1),
        'humidity': round(humidity, 1),
        'is_raining': is_raining,
        'forecast_minutes': forecast_minutes
    }
    
    # --- Apply Physics ---
    base_decay = 0.4 if not (10 <= hour <= 16) else 0.8
    decay = base_decay * config['decay_mult']
    
    for field in state['fields'].values():
        if is_raining:
            field['moisture'] += config['rain_intensity']
        else:
            field['moisture'] -= decay
        field['moisture'] = max(0, min(100, field['moisture']))
    
    # --- Control Logic ---
    reactive_field = state['fields']['reactive']
    predictive_field = state['fields']['predictive']
    
    reactive_action = 'WAIT'
    predictive_action = 'WAIT'
    predictive_status = 'MONITORING'
    predictive_reason = ''
    
    # Reactive: Simple threshold
    if reactive_field['moisture'] < 30.0:
        reactive_action = 'WATER_NOW'
        reactive_field['moisture'] += 25.0
        reactive_field['moisture'] = min(100, reactive_field['moisture'])
        reactive_field['water_used'] += 15.0
        reactive_field['pump_events'] += 1
    
    # Predictive: Use ML predictor
    ml_result = predictor.predict_next_watering({
        'soil_moisture': predictive_field['moisture'],
        'temperature': temp,
        'humidity': humidity,
        'forecast_minutes': forecast_minutes
    })
    
    predictive_action = ml_result['recommended_action']
    predictive_status = ml_result['system_status']
    predictive_reason = ml_result['reason']
    
    if predictive_action == 'WATER_NOW':
        predictive_field['moisture'] += 25.0
        predictive_field['moisture'] = min(100, predictive_field['moisture'])
        predictive_field['water_used'] += 15.0
        predictive_field['pump_events'] += 1
    
    # Log decision
    decision_entry = {
        'step': state['step'],
        'time': f"{int(hour):02d}:{int((state['hour'] % 1) * 60):02d}",
        'reactive_action': reactive_action,
        'predictive_action': predictive_action,
        'predictive_status': predictive_status,
        'reason': predictive_reason,
        'moisture_reactive': round(reactive_field['moisture'], 1),
        'moisture_predictive': round(predictive_field['moisture'], 1),
        'forecast_minutes': forecast_minutes,
        'is_raining': is_raining
    }
    state['decision_log'].insert(0, decision_entry)
    state['decision_log'] = state['decision_log'][:50]  # Keep last 50
    
    # Calculate savings
    water_saved = reactive_field['water_used'] - predictive_field['water_used']
    savings_percent = (water_saved / reactive_field['water_used'] * 100) if reactive_field['water_used'] > 0 else 0
    
    return jsonify({
        'step': state['step'],
        'hour': round(state['hour'], 2),
        'weather': state['weather'],
        'fields': state['fields'],
        'latest_decision': decision_entry,
        'decision_log': state['decision_log'][:10],
        'rain_events': state['rain_events'],
        'water_saved': round(water_saved, 1),
        'savings_percent': round(savings_percent, 1)
    })

@app.route('/api/simulation/state', methods=['GET'])
def get_simulation_state():
    """Get current simulation state."""
    global simulation_state
    state = simulation_state
    
    water_saved = state['fields']['reactive']['water_used'] - state['fields']['predictive']['water_used']
    savings_percent = (water_saved / state['fields']['reactive']['water_used'] * 100) if state['fields']['reactive']['water_used'] > 0 else 0
    
    return jsonify({
        'step': state['step'],
        'scenario': state['scenario'],
        'hour': round(state['hour'], 2),
        'weather': state['weather'],
        'fields': state['fields'],
        'decision_log': state['decision_log'][:10],
        'rain_events': state['rain_events'],
        'water_saved': round(water_saved, 1),
        'savings_percent': round(savings_percent, 1)
    })


@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    if request.method == 'POST':
        settings_data = request.json
        # Here we would normally save to DB
        # For now, let's log it
        db.insert_log(f"System settings updated: {settings_data}", type='ACTION')
        return jsonify({"status": "success", "message": "Settings saved"})
    
    # Mock settings return
    return jsonify({
        "soil_moisture": {"min": 25, "max": 75},
        "temperature": {"min": 5, "max": 32},
        "humidity": {"min": 40, "max": 90}
    })

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
    
    app.run(debug=True, port=5000, host='0.0.0.0')
