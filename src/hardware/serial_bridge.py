"""
P-WOS Serial Bridge
Reads JSON sensor data from ESP32 serial port and republishes to local MQTT.

Use this when:
  - ESP32 is connected via USB but not on WiFi
  - You want to test sensor hardware without WiFi setup
  - You want to monitor raw serial output alongside MQTT

Usage:
  python src/hardware/serial_bridge.py              # Auto-detect COM port
  python src/hardware/serial_bridge.py --port COM3  # Specific port
  python src/hardware/serial_bridge.py --baud 115200
"""

import serial
import serial.tools.list_ports
import paho.mqtt.client as mqtt
import json
import time
import sys
import os
import logging
import argparse

# Setup logging
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
log_dir = os.path.join(project_root, "logs", "hardware")
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, "serial_bridge.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("SerialBridge")

# MQTT topics
TOPIC_SENSOR_DATA = "pwos/sensor/data"
TOPIC_CONTROL_PUMP = "pwos/control/pump"


def find_esp32_port():
    """Auto-detect ESP32 serial port."""
    ports = serial.tools.list_ports.comports()
    
    esp32_identifiers = [
        "CP210",     # CP2102/CP2104 USB-to-UART (most common ESP32)
        "CH340",     # CH340 USB-to-UART (cheap ESP32 boards)
        "FTDI",      # FTDI chips
        "Silicon",   # Silicon Labs
        "USB Serial",
        "USB-SERIAL",
    ]
    
    logger.info(f"Scanning {len(ports)} serial ports...")
    
    for port in ports:
        desc = f"{port.description} {port.manufacturer or ''}"
        logger.info(f"  {port.device}: {port.description} [{port.manufacturer}]")
        
        for identifier in esp32_identifiers:
            if identifier.lower() in desc.lower():
                logger.info(f"  → ESP32 detected: {port.device}")
                return port.device
    
    return None


def parse_serial_line(line):
    """
    Parse a serial line from ESP32.
    The firmware outputs: [SERIAL] {"device_id": "...", ...}
    """
    line = line.strip()
    
    # Skip non-data lines
    if not line:
        return None
    
    # Extract JSON from [SERIAL] prefix
    if line.startswith("[SERIAL]"):
        json_str = line[len("[SERIAL]"):].strip()
    elif line.startswith("{"):
        json_str = line
    else:
        # Log other serial output for debugging
        if line.startswith("["):
            logger.debug(f"ESP32: {line}")
        return None
    
    try:
        data = json.loads(json_str)
        # Validate required fields
        required = ["device_id", "soil_moisture", "temperature", "humidity"]
        if all(key in data for key in required):
            return data
        else:
            logger.warning(f"Incomplete sensor data: {data}")
            return None
    except json.JSONDecodeError:
        return None


def run_bridge(port, baud, mqtt_broker, mqtt_port):
    """Main bridge loop: Serial → MQTT."""
    
    # Connect to MQTT
    logger.info(f"Connecting to MQTT broker: {mqtt_broker}:{mqtt_port}")
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "PWOS_SerialBridge")
    
    try:
        mqtt_client.connect(mqtt_broker, mqtt_port, 60)
        mqtt_client.loop_start()
        logger.info("MQTT connected")
    except Exception as e:
        logger.error(f"MQTT connection failed: {e}")
        logger.error("Make sure Mosquitto is running: mosquitto -v")
        return
    
    # Open serial port
    logger.info(f"Opening serial port: {port} @ {baud} baud")
    
    try:
        ser = serial.Serial(port, baud, timeout=2)
        logger.info(f"Serial port opened: {port}")
    except serial.SerialException as e:
        logger.error(f"Cannot open serial port {port}: {e}")
        logger.error("Check: Is the port correct? Is another program using it?")
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        return
    
    # Subscribe to pump commands (MQTT → Serial → ESP32)
    def on_pump_command(client, userdata, msg):
        try:
            cmd = msg.payload.decode('utf-8')
            logger.info(f"[PUMP CMD] MQTT → Serial: {cmd}")
            ser.write((cmd + '\n').encode('utf-8'))
        except Exception as e:
            logger.error(f"Failed to forward pump command: {e}")
    
    mqtt_client.subscribe(TOPIC_CONTROL_PUMP)
    mqtt_client.message_callback_add(TOPIC_CONTROL_PUMP, on_pump_command)
    logger.info(f"Subscribed to {TOPIC_CONTROL_PUMP} (MQTT → Serial forwarding)")
    
    # Bridge loop
    publish_count = 0
    error_count = 0
    
    try:
        logger.info("Bridge running — reading serial data...")
        logger.info("Press Ctrl+C to stop\n")
        
        while True:
            try:
                raw_line = ser.readline().decode('utf-8', errors='replace')
                
                if not raw_line:
                    continue
                
                data = parse_serial_line(raw_line)
                
                if data:
                    # Add ISO timestamp (ESP32 sends millis, we need real time)
                    from datetime import datetime
                    data['timestamp'] = datetime.now().isoformat()
                    
                    # Publish to MQTT
                    payload = json.dumps(data)
                    result = mqtt_client.publish(TOPIC_SENSOR_DATA, payload, qos=1)
                    
                    if result.rc == mqtt.MQTT_ERR_SUCCESS:
                        publish_count += 1
                        logger.info(
                            f"[#{publish_count}] M:{data['soil_moisture']:.1f}% "
                            f"T:{data['temperature']:.1f}C "
                            f"H:{data['humidity']:.1f}% "
                            f"→ MQTT"
                        )
                    else:
                        logger.warning(f"MQTT publish failed (rc={result.rc})")
                    
                    error_count = 0  # Reset on success
                    
            except serial.SerialException as e:
                error_count += 1
                logger.error(f"Serial error: {e}")
                if error_count > 10:
                    logger.error("Too many serial errors, stopping bridge")
                    break
                time.sleep(1)
                
    except KeyboardInterrupt:
        logger.info(f"\nStopping bridge. Published {publish_count} readings.")
    finally:
        ser.close()
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        logger.info("Bridge stopped")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="P-WOS Serial-to-MQTT Bridge")
    parser.add_argument("--port", default="auto", help="Serial port (default: auto-detect)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default: 115200)")
    parser.add_argument("--mqtt-broker", default="localhost", help="MQTT broker (default: localhost)")
    parser.add_argument("--mqtt-port", type=int, default=1883, help="MQTT port (default: 1883)")
    args = parser.parse_args()
    
    print("=" * 60)
    print("P-WOS Serial Bridge (ESP32 → MQTT)")
    print("=" * 60)
    
    # Resolve port
    port = args.port
    if port == "auto":
        port = find_esp32_port()
        if not port:
            print("\n[ERROR] No ESP32 detected!")
            print("  - Is the ESP32 connected via USB?")
            print("  - Do you have CP2102/CH340 drivers installed?")
            print("  - Try specifying manually: --port COM3")
            sys.exit(1)
    
    print(f"\n  Serial Port:  {port}")
    print(f"  Baud Rate:    {args.baud}")
    print(f"  MQTT Broker:  {args.mqtt_broker}:{args.mqtt_port}")
    print(f"\n  Press Ctrl+C to stop\n")
    print("=" * 60 + "\n")
    
    run_bridge(port, args.baud, args.mqtt_broker, args.mqtt_port)
