"""
P-WOS Hardware Manager
Manages the data source mode: simulation, hardware, or hybrid.

This module checks DATA_SOURCE_MODE from config and manages the correct
data pipeline accordingly. In hybrid mode, it uses hardware when available
and falls back to the simulator.

Usage:
  python src/hardware/hardware_manager.py          # Run with configured mode
  python src/hardware/hardware_manager.py --mode hardware
"""

import sys
import os
import time
import subprocess
import logging

# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
sys.path.insert(0, project_root)

from src.config import DATA_SOURCE_MODE, HARDWARE_SERIAL_PORT, HARDWARE_DEVICE_ID

# Setup logging
log_dir = os.path.join(project_root, "logs", "hardware")
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, "hardware_manager.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("HardwareManager")


def check_mqtt_data(broker="localhost", port=1883, topic="pwos/sensor/data", timeout=10):
    """
    Check if MQTT sensor data is being received.
    Returns True if data arrives within timeout seconds.
    """
    import paho.mqtt.client as mqtt
    
    data_received = {"status": False}
    
    def on_message(client, userdata, msg):
        data_received["status"] = True
        client.disconnect()
    
    def on_connect(client, userdata, flags, rc, properties=None):
        client.subscribe(topic)
    
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "HardwareChecker")
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(broker, port, 60)
        client.loop_start()
        
        start = time.time()
        while not data_received["status"] and (time.time() - start) < timeout:
            time.sleep(0.5)
        
        client.loop_stop()
        client.disconnect()
    except Exception as e:
        logger.warning(f"MQTT check failed: {e}")
        return False
    
    return data_received["status"]


def check_serial_device(port="auto"):
    """Check if an ESP32 is connected via serial."""
    try:
        import serial.tools.list_ports
        from hardware.serial_bridge import find_esp32_port
        
        if port == "auto":
            found = find_esp32_port()
            return found is not None
        else:
            ports = [p.device for p in serial.tools.list_ports.comports()]
            return port in ports
    except ImportError:
        logger.warning("pyserial not installed — cannot check serial devices")
        return False


def start_simulation():
    """Start the ESP32 simulator subprocess."""
    sim_path = os.path.join(project_root, "src", "simulation", "esp32_simulator.py")
    logger.info(f"Starting simulator: {sim_path}")
    
    process = subprocess.Popen(
        [sys.executable, sim_path, "5"],
        cwd=os.path.join(project_root, "src", "simulation"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    return process


def start_serial_bridge(port="auto"):
    """Start the serial bridge subprocess."""
    bridge_path = os.path.join(current_dir, "serial_bridge.py")
    logger.info(f"Starting serial bridge: {bridge_path}")
    
    cmd = [sys.executable, bridge_path]
    if port != "auto":
        cmd.extend(["--port", port])
    
    process = subprocess.Popen(
        cmd,
        cwd=current_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    return process


def run_manager(mode=None):
    """Main hardware manager logic."""
    mode = mode or DATA_SOURCE_MODE
    
    print("=" * 60)
    print("P-WOS Hardware Manager")
    print("=" * 60)
    logger.info(f"Data Source Mode: {mode}")
    
    if mode == "simulation":
        # ---------------------------------------------------------------
        # SIMULATION MODE: Just run the simulator
        # ---------------------------------------------------------------
        logger.info("Mode: SIMULATION — Using esp32_simulator.py")
        logger.info("No hardware required.")
        proc = start_simulation()
        
        try:
            for line in iter(proc.stdout.readline, b''):
                print(line.decode('utf-8', errors='replace'), end='')
        except KeyboardInterrupt:
            proc.terminate()
            logger.info("Simulator stopped")
    
    elif mode == "hardware":
        # ---------------------------------------------------------------
        # HARDWARE MODE: Expect real ESP32 data via MQTT or serial
        # ---------------------------------------------------------------
        logger.info("Mode: HARDWARE — Expecting real ESP32 data")
        
        # First, check if ESP32 is already publishing via WiFi/MQTT
        logger.info("Checking for MQTT sensor data (10s timeout)...")
        if check_mqtt_data(timeout=10):
            logger.info("ESP32 is publishing via MQTT — hardware mode active!")
            logger.info("Monitoring... Press Ctrl+C to stop.")
            
            try:
                while True:
                    time.sleep(60)
                    # Periodic health check
                    if not check_mqtt_data(timeout=15):
                        logger.warning("No data received in 15s — ESP32 may be offline!")
            except KeyboardInterrupt:
                logger.info("Monitoring stopped")
        else:
            # Check for USB serial connection
            logger.info("No MQTT data — checking for USB serial connection...")
            
            if check_serial_device(HARDWARE_SERIAL_PORT):
                logger.info("ESP32 found on serial — starting bridge...")
                proc = start_serial_bridge(HARDWARE_SERIAL_PORT)
                
                try:
                    for line in iter(proc.stdout.readline, b''):
                        print(line.decode('utf-8', errors='replace'), end='')
                except KeyboardInterrupt:
                    proc.terminate()
                    logger.info("Serial bridge stopped")
            else:
                logger.error("No ESP32 detected via MQTT or serial!")
                logger.error("Options:")
                logger.error("  1. Connect ESP32 to WiFi and point it at your Mosquitto")
                logger.error("  2. Connect ESP32 via USB and rerun this script")
                logger.error("  3. Switch to simulation mode: DATA_SOURCE_MODE=simulation")
                sys.exit(1)
    
    elif mode == "hybrid":
        # ---------------------------------------------------------------
        # HYBRID MODE: Use hardware if available, fall back to simulator
        # ---------------------------------------------------------------
        logger.info("Mode: HYBRID — Hardware preferred, simulator fallback")
        
        # Check for hardware first
        logger.info("Checking for hardware data (10s)...")
        
        if check_mqtt_data(timeout=10):
            logger.info("ESP32 detected via MQTT — using hardware data")
            logger.info("Simulator will NOT be started.")
            
            try:
                while True:
                    time.sleep(60)
                    if not check_mqtt_data(timeout=15):
                        logger.warning("Hardware data lost — consider switching to simulator")
            except KeyboardInterrupt:
                pass
        
        elif check_serial_device(HARDWARE_SERIAL_PORT):
            logger.info("ESP32 found on serial — starting bridge...")
            proc = start_serial_bridge(HARDWARE_SERIAL_PORT)
            
            try:
                for line in iter(proc.stdout.readline, b''):
                    print(line.decode('utf-8', errors='replace'), end='')
            except KeyboardInterrupt:
                proc.terminate()
        
        else:
            logger.info("No hardware detected — falling back to simulator")
            proc = start_simulation()
            
            try:
                for line in iter(proc.stdout.readline, b''):
                    print(line.decode('utf-8', errors='replace'), end='')
            except KeyboardInterrupt:
                proc.terminate()
    
    else:
        logger.error(f"Unknown DATA_SOURCE_MODE: {mode}")
        logger.error("Valid options: simulation, hardware, hybrid")
        sys.exit(1)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="P-WOS Hardware Manager")
    parser.add_argument("--mode", choices=["simulation", "hardware", "hybrid"],
                        help="Override DATA_SOURCE_MODE from config")
    args = parser.parse_args()
    
    run_manager(args.mode)
