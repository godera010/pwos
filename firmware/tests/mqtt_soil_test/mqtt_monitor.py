"""
P-WOS Wireless MQTT Monitor

This script acts as a exact replacement for the Arduino IDE Serial Monitor.
It listens directly to your Mosquitto broker so you can see live data 
streaming from your ESP32 even when it is completely disconnected 
from your PC and running off a power bank/wall plug out in the field.
"""
import paho.mqtt.client as mqtt
import json
import datetime

# --- Settings ---
MQTT_BROKER = "192.168.137.1"
MQTT_PORT = 1883
TOPIC = "pwos/sensor/data"

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"\n[SYSTEM] Successfully connected to local Mosquitto ({MQTT_BROKER})")
        print(f"[SYSTEM] Subscribing wirelessly to '{TOPIC}'...")
        client.subscribe(TOPIC)
        print("\n==========================================================")
        print("              WIRELESS SERIAL MONITOR ACTIVE                 ")
        print("==========================================================")
        print("Waiting for ESP32 pings over the WiFi hotspot...\n")
    else:
        print(f"[ERROR] Connection failed with code {rc}")

# Fallback for older paho-mqtt v1.x standard format
def on_connect_v1(client, userdata, flags, rc):
    on_connect(client, userdata, flags, rc, None)

def on_message(client, userdata, msg):
    timestamp = datetime.datetime.now().strftime('%H:%M:%S')
    payload = msg.payload.decode('utf-8')
    
    try:
        data = json.loads(payload)
        moisture = data.get("soil_moisture", 0)
        
        # Create a visual hash bar identical to the Arduino IDE
        bar_length = int(moisture / 5)
        bar = "#" * bar_length + "." * (20 - bar_length)
        
        print(f"[{timestamp}] Incoming WiFi Data: ")
        print(f"           Real Moisture: {moisture}% \t[{bar}]")
        print(f"           Raw MQTT JSON: {payload}")
        print("-" * 58)
    except json.JSONDecodeError:
        # If it's not JSON, just print it raw like Arduino IDE
        print(f"[{timestamp}] RAW > {payload}")

if __name__ == "__main__":
    print("Initializing Python Wireless Receiver...")
    
    try:
        # Compatability check for paho-mqtt v2.0 vs v1.0
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="PWOS_PC_Monitor")
        client.on_connect = on_connect
    except AttributeError:
        client = mqtt.Client(client_id="PWOS_PC_Monitor")
        client.on_connect = on_connect_v1
        
    client.on_message = on_message
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_forever()  # Keep listening endlessly
    except ConnectionRefusedError:
        print(f"\n[FATAL] Mosquitto blocked the connection at {MQTT_BROKER}")
    except KeyboardInterrupt:
        print("\n[SYSTEM] Wireless monitor shutting down...")
