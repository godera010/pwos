"""
P-WOS Remote Pump Controller 

Run this script to magically send JSON commands wirelessly 
out of your PC, through the Mosquitto broker, and into your ESP32's relay!
"""
import paho.mqtt.client as mqtt
import json
import time

MQTT_BROKER = "192.168.137.1"
MQTT_PORT = 1883
TOPIC_CONTROL_PUMP = "pwos/control/pump"

def send_command(action, duration=5):
    # Setup client
    client = mqtt.Client(client_id="PWOS_CommandLine_Controller")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except ConnectionRefusedError:
        print("[FATAL] Could not connect to Mosquitto.")
        return

    # Build the exact JSON format your firmware expects
    payload = {
        "action": action
    }
    if action == "ON":
        payload["duration"] = duration

    json_str = json.dumps(payload)
    
    print(f"\n[NETWORK] Firing MQTT packet to broker...")
    print(f"   Topic:   {TOPIC_CONTROL_PUMP}")
    print(f"   Payload: {json_str}")
    
    # Publish and instantly disconnect
    client.publish(TOPIC_CONTROL_PUMP, json_str)
    client.disconnect()
    
    print("[SUCCESS] Packet delivered! Check the ESP32 Relay.\n")

if __name__ == "__main__":
    print("=========================================")
    print("      P-WOS PUMP REMOTE CONTROL          ")
    print("=========================================")
    print("Choose an action:")
    print("1. Turn Pump ON for 3 seconds")
    print("2. Turn Pump ON for 10 seconds")
    print("3. STOP PUMP")
    
    choice = input("\nEnter choice (1/2/3): ")
    
    if choice == '1':
        send_command("ON", 3)
    elif choice == '2':
        send_command("ON", 10)
    elif choice == '3':
        send_command("OFF")
    else:
        print("Invalid choice.")
