
import sys
import os
import json
import time
import paho.mqtt.client as mqtt

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'src', 'backend'))

from models.ml_predictor import MLPredictor

class MLMonitor:
    def __init__(self):
        # Setup Logging
        import logging
        import os
        
        # Get project root (3 levels up from scripts/analysis/ml_monitor.py)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
        log_dir = os.path.join(project_root, "logs")
        
        if not os.path.exists(log_dir):
            try:
                os.makedirs(log_dir)
            except:
                pass
            
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(os.path.join(log_dir, "ml_monitor.log")),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger("ML_Monitor")

        self.predictor = MLPredictor()
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "MLMonitor_CLI")
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        
        self.latest_weather = {"forecast_minutes": 0}

    def on_connect(self, client, userdata, flags, rc, properties):
        self.logger.info("Connected to MQTT Broker")
        client.subscribe("pwos/sensor/data")
        client.subscribe("pwos/weather/current")

    def on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            
            if topic == "pwos/weather/current":
                self.latest_weather = payload
                
            elif topic == "pwos/sensor/data":
                self.analyze(payload)
                
        except Exception as e:
            self.logger.error(f"Error processing message: {e}")

    def analyze(self, sensor_data):
        # Merge weather
        sensor_data['forecast_minutes'] = self.latest_weather.get('forecast_minutes', 0)
        
        # Predict (Now includes full logic)
        result = self.predictor.predict_next_watering(sensor_data)
        
        # Print
        self.print_row(sensor_data, result)

    def print_header(self):
        print("\n" + "="*120)
        print(f"{'TIME':<10} | {'MOIST':<6} | {'TEMP':<6} | {'FCST':<6} | {'DECISION':<12} | {'CONF':<6} | {'REASON & ACTION':<50}")
        print("="*120)

    def print_row(self, inputs, output):
        t = inputs.get('timestamp', '00:00').split('T')[-1][:8]
        m = f"{inputs.get('soil_moisture',0)}%"
        tmp = f"{inputs.get('temperature',0)}C"
        fcst = f"{inputs.get('forecast_minutes',0)}m"
        
        # New Centralized Logic Fields
        decision = output.get('recommended_action', 'WAIT')
        conf = f"{output.get('confidence', 0)}%"
        reason = output.get('reason', '')
        
        # Truncate reason for display
        if len(reason) > 48: reason = reason[:45] + "..."
        
        # Color codes (Basic ANSI)
        RESET = "\033[0m"
        RED = "\033[91m"
        GREEN = "\033[92m"
        YELLOW = "\033[93m" # Orange-ish
        
        color = GREEN
        if decision == "WATER_NOW": color = RED
        elif decision == "STALL": color = YELLOW
        
        log_entry = f"{t:<10} | {m:<6} | {tmp:<6} | {fcst:<6} | {color}{decision:<12}{RESET} | {conf:<6} | {reason:<50}"
        self.logger.info(log_entry)
        # Also print to console for CLI usage (StreamHandler does this, but we want the colors for console only if possible, but logging handles it)
        # For this script, we'll let the logger handle it, but raw print might be preferred for color preservation in console if running interactively.
        # However, file logs shouldn't have ANSI codes ideally.
        # Let's keep the print for console but log a clean version to file.
        
        clean_entry = f"{t:<10} | {m:<6} | {tmp:<6} | {fcst:<6} | {decision:<12} | {conf:<6} | {reason:<50}"
        self.logger.info(f"ANALYSIS: {clean_entry}")

    def run(self):
        print("="*60)
        print("   P-WOS ML BRAIN MONITOR   ")
        print("="*60)
        self.logger.info("Starting ML Brain Monitor...")
        print("Waiting for sensor data...")
        
        self.print_header()
        
        try:
            self.client.connect("localhost", 1883, 60)
            self.client.loop_forever()
        except KeyboardInterrupt:
            self.logger.info("Monitor stopped.")
            print("\n[STOP] Monitor stopped.")
        except Exception as e:
            print(f"\n[ERROR] Connection failed: {e}")

if __name__ == "__main__":
    monitor = MLMonitor()
    monitor.run()
