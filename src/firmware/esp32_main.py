"""
P-WOS ESP32 Firmware Template (MicroPython)
Flash this to your ESP32 for production use.

Hardware Requirements:
- ESP32 DevKit
- DHT22 (Temperature + Humidity) on GPIO 4
- Capacitive Soil Moisture Sensor on GPIO 34 (ADC)
- Relay Module on GPIO 5 (Pump Control)

Setup:
1. Flash MicroPython to ESP32
2. Upload this file as main.py
3. Create config.py with your WiFi and MQTT credentials
"""

import machine
import time
import json
import network
from umqtt.simple import MQTTClient

# ============================================================================
# CONFIGURATION - Edit these values
# ============================================================================
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASS = "YOUR_WIFI_PASSWORD"

# MQTT Settings (HiveMQ Cloud)
MQTT_BROKER = "your-cluster.s1.eu.hivemq.cloud"
MQTT_PORT = 8883
MQTT_USER = "your-username"
MQTT_PASS = "your-password"
MQTT_CLIENT_ID = "ESP32_PWOS_001"

# MQTT Topics
TOPIC_SENSOR = b"pwos/sensor/data"
TOPIC_CONTROL = b"pwos/control/pump"

# Pin Configuration
DHT_PIN = 4
SOIL_PIN = 34
RELAY_PIN = 5

# Sampling Interval (seconds)
SAMPLE_INTERVAL = 60

# ============================================================================
# HARDWARE SETUP
# ============================================================================
import dht

dht_sensor = dht.DHT22(machine.Pin(DHT_PIN))
soil_adc = machine.ADC(machine.Pin(SOIL_PIN))
soil_adc.atten(machine.ADC.ATTN_11DB)  # Full range: 0-3.3V
relay = machine.Pin(RELAY_PIN, machine.Pin.OUT)
relay.value(0)  # Start with pump OFF

# ============================================================================
# WIFI CONNECTION
# ============================================================================
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if not wlan.isconnected():
        print(f"Connecting to WiFi: {WIFI_SSID}")
        wlan.connect(WIFI_SSID, WIFI_PASS)
        
        timeout = 30
        while not wlan.isconnected() and timeout > 0:
            time.sleep(1)
            timeout -= 1
            print(".", end="")
        
        if wlan.isconnected():
            print(f"\n[OK] Connected! IP: {wlan.ifconfig()[0]}")
        else:
            print("\n[ERROR] WiFi connection failed!")
            machine.reset()
    
    return wlan

# ============================================================================
# MQTT CONNECTION
# ============================================================================
def connect_mqtt():
    """Connect to MQTT broker with TLS."""
    import ssl
    
    print(f"Connecting to MQTT: {MQTT_BROKER}")
    
    client = MQTTClient(
        MQTT_CLIENT_ID,
        MQTT_BROKER,
        port=MQTT_PORT,
        user=MQTT_USER,
        password=MQTT_PASS,
        ssl=True,
        ssl_params={"server_hostname": MQTT_BROKER}
    )
    
    client.set_callback(on_message)
    client.connect()
    client.subscribe(TOPIC_CONTROL)
    
    print("[OK] MQTT Connected!")
    return client

def on_message(topic, msg):
    """Handle incoming MQTT messages (pump commands)."""
    try:
        cmd = json.loads(msg.decode())
        action = cmd.get("action", "OFF")
        duration = cmd.get("duration", 30)
        
        if action == "ON":
            print(f"[PUMP] ON for {duration}s")
            relay.value(1)
            time.sleep(duration)
            relay.value(0)
            print("[PUMP] OFF")
        elif action == "OFF":
            relay.value(0)
            print("[PUMP] OFF (manual)")
    except Exception as e:
        print(f"[ERROR] Message Error: {e}")

# ============================================================================
# SENSOR READING
# ============================================================================
def read_sensors():
    """Read all sensors and return data dict."""
    try:
        # Read DHT22
        dht_sensor.measure()
        temp = dht_sensor.temperature()
        hum = dht_sensor.humidity()
    except OSError:
        temp = 25.0
        hum = 60.0
        print("[WARN] DHT22 read error")
    
    # Read Soil Moisture (ADC)
    # Calibration: Dry ~3500, Wet ~1500 (adjust for your sensor)
    raw = soil_adc.read()
    moisture = max(0, min(100, (3500 - raw) / 20))  # Convert to 0-100%
    
    return {
        "timestamp": time.time(),
        "soil_moisture": round(moisture, 2),
        "temperature": round(temp, 2),
        "humidity": round(hum, 2),
        "pump_status": "ON" if relay.value() else "OFF",
        "device_id": MQTT_CLIENT_ID
    }

# ============================================================================
# MAIN LOOP
# ============================================================================
def main():
    print("=" * 50)
    print("P-WOS ESP32 Starting...")
    print("=" * 50)
    
    # Connect to WiFi
    wlan = connect_wifi()
    
    # Connect to MQTT
    mqtt = connect_mqtt()
    
    print(f"[INFO] Publishing every {SAMPLE_INTERVAL}s")
    print("-" * 50)
    
    while True:
        try:
            # Check for incoming messages
            mqtt.check_msg()
            
            # Read sensors
            data = read_sensors()
            
            # Publish to MQTT
            mqtt.publish(TOPIC_SENSOR, json.dumps(data))
            print(f"[DATA] M:{data['soil_moisture']}% T:{data['temperature']}C H:{data['humidity']}%")
            
            # Wait for next sample
            time.sleep(SAMPLE_INTERVAL)
            
        except OSError as e:
            print(f"[ERROR] Connection Error: {e}")
            time.sleep(5)
            mqtt = connect_mqtt()
        except KeyboardInterrupt:
            print("\n[STOP] Stopping...")
            relay.value(0)
            mqtt.disconnect()
            break

if __name__ == "__main__":
    main()
