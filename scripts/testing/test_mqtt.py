import paho.mqtt.client as mqtt
import time
import sys

BROKER = "localhost"
PORT = 1883
TOPIC = "pwos/test"

def on_connect(client, userdata, flags, rc, properties):
    if rc == 0:
        print(f"[SUCCESS] Connected to MQTT Broker at {BROKER}:{PORT}")
        client.subscribe(TOPIC)
        print(f"   Subscribed to {TOPIC}")
        
        # Publish test message
        print("   Publishing test message...")
        client.publish(TOPIC, "Hello MQTT")
    else:
        print(f"[ERROR] Connection failed with code {rc}")
        sys.exit(1)

def on_message(client, userdata, msg):
    print(f"[SUCCESS] Received message on {msg.topic}: {msg.payload.decode()}")
    print("\nMQTT BROKER IS WORKING CORRECTLY!")
    client.disconnect()
    sys.exit(0)

print(f"Testing connection to {BROKER}:{PORT}...")

# Use Paho MQTT 2.x API
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "PWOS_Test")
client.on_connect = on_connect
client.on_message = on_message

try:
    client.connect(BROKER, PORT, 10)
    client.loop_forever()
except Exception as e:
    print(f"[ERROR] Error: {e}")
    print("\nIs Mosquitto running? Try running 'mosquitto -v' in a separate terminal.")
