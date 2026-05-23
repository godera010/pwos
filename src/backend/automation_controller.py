"""
P-WOS Autonomous Controller
"The Hand of the Brain"

This script continuously checks the ML Brain's decision and executes it.
"""
import requests
import time
import sys

API_URL = "http://localhost:5000/api"

def run_autopilot():
    # Setup Logging
    import logging
    import os
    
    # Get project root (2 levels up from src/backend/automation_controller.py)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
    log_dir = os.path.join(project_root, "logs", "app")
    os.makedirs(log_dir, exist_ok=True)
        
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(os.path.join(log_dir, "autopilot.log")),
            logging.StreamHandler()
        ]
    )
    logger = logging.getLogger("Autopilot")

    print("="*50)
    logger.info("Starting P-WOS AUTOPILOT")
    print(f"   Listening to Brain at: {API_URL}")
    print("="*50)

    # Wait for backend to be available
    def wait_for_backend(max_retries=30, delay=2):
        """Wait for the backend API to become available."""
        for attempt in range(max_retries):
            try:
                resp = requests.get(f"{API_URL}/health", timeout=5)
                if resp.status_code == 200:
                    logger.info("Backend is online!")
                    return True
            except requests.exceptions.ConnectionError:
                pass
            
            if attempt == 0:
                logger.warning(f"Backend not ready. Waiting... (will retry {max_retries} times)")
            elif attempt % 5 == 0:
                logger.info(f"Still waiting for backend... ({attempt}/{max_retries})")
            
            time.sleep(delay)
        
        logger.error("Backend did not become available. Start it with: python src/backend/app.py")
        return False
    
    if not wait_for_backend():
        print("\n[ERROR] Backend not available. Please start it first:")
        print("        python src/backend/app.py")
        sys.exit(1)

    # Startup Log
    try:
        requests.post(f"{API_URL}/logs", json={"message": "Automation Controller Started", "type": "SYSTEM"})
    except:
        pass  # Log endpoint might not exist
    
    poll_count = 0
    last_action = None
    last_reason = None
    
    # Seeding last state from logs to prevent duplicate logs on daemon restart
    try:
        log_seed_resp = requests.get(f"{API_URL}/logs?limit=5", timeout=5)
        if log_seed_resp.status_code == 200:
            logs = log_seed_resp.json()
            for entry in logs:
                msg = entry.get('message', '')
                if "STOP:" in msg:
                    last_action = "STOP"
                    last_reason = msg.split("STOP:")[1].strip()
                    break
                elif "STALL:" in msg:
                    last_action = "STALL"
                    last_reason = msg.split("STALL:")[1].strip()
                    break
                elif "Monitoring: Moisture" in msg:
                    last_action = "MONITOR"
                    last_reason = "Soil moisture is optimal."
                    break
            if last_action:
                logger.info(f"Seeded startup state from logs: last_action='{last_action}', last_reason='{last_reason}'")
    except Exception as e:
        logger.warning(f"Failed to seed autopilot state on startup: {e}")

    try:
        while True:
            try:
                poll_count += 1

                # 0. Check System Mode
                state_resp = requests.get(f"{API_URL}/system/state", timeout=10)
                if state_resp.status_code == 200:
                    mode = state_resp.json().get('mode', 'AUTO')
                    if mode == 'MANUAL':
                        # === CRITICAL SAFETY OVERRIDES ===
                        # Even in Manual mode, override if moisture is dangerously low or high
                        try:
                            # Fetch dynamic crop safety thresholds
                            critical_limit = 15
                            high_limit = 85
                            try:
                                settings_resp = requests.get(f"{API_URL}/settings", timeout=3)
                                if settings_resp.status_code == 200:
                                    settings_data = settings_resp.json()
                                    # Support merged structure or nested 'settings' key
                                    settings = settings_data.get('settings', settings_data)
                                    critical_limit = settings.get('crop_critical_moisture', 15)
                                    high_limit = settings.get('crop_high_threshold', 85)
                            except Exception as ex:
                                logger.error(f"Failed to fetch dynamic settings: {ex}")

                            sensor_resp = requests.get(f"{API_URL}/sensor-data/latest", timeout=5)
                            if sensor_resp.status_code == 200:
                                moisture = sensor_resp.json().get('soil_moisture', 50)

                                # OVERRIDE: Critically dry (< critical_limit) → force AUTO
                                if moisture < critical_limit:
                                    logger.warning(f"CRITICAL: Moisture {moisture}% < {critical_limit}% (critical limit) in MANUAL mode! Forcing AUTO.")
                                    requests.post(f"{API_URL}/system/state", json={'mode': 'AUTO'}, timeout=5)
                                    requests.post(f"{API_URL}/logs", json={
                                        'message': f'Safety Override: Moisture {moisture}% below {critical_limit}% critically low. Forced AUTO mode.',
                                        'type': 'ERROR'
                                    }, timeout=5)
                                    continue  # Skip sleep, start AUTO cycle immediately

                                # OVERRIDE: Saturated (>= high_limit) → force AUTO + pump OFF (standardized safety limit)
                                if moisture >= high_limit:
                                    logger.warning(f"CRITICAL: Moisture {moisture}% >= {high_limit}% (high limit) in MANUAL mode! Forcing AUTO + pump OFF.")
                                    requests.post(f"{API_URL}/control/pump", json={'action': 'OFF'}, timeout=5)
                                    requests.post(f"{API_URL}/system/state", json={'mode': 'AUTO'}, timeout=5)
                                    requests.post(f"{API_URL}/logs", json={
                                        'message': f'Safety Override: Moisture {moisture}% saturated (>= {high_limit}%). Forced AUTO mode.',
                                        'type': 'ERROR'
                                    }, timeout=5)
                                    continue
                        except Exception as e:
                            logger.error(f"Safety check error: {e}")

                        # Normal Manual mode — stand by
                        time.sleep(5)
                        continue
                
                # 1. Ask the Brain
                response = requests.get(f"{API_URL}/predict-next-watering", timeout=15)
                if response.status_code != 200:
                    logger.warning(f"API Error: {response.status_code}")
                    time.sleep(5)
                    continue

                decision = response.json()
                action = decision['recommended_action']
                duration = decision.get('recommended_duration', 0)
                reason = decision['ml_analysis'].get('reason', '')
                moisture = decision['current_moisture']

                # 1.5 Cooldown Check: if action is NOW, check if last watering ended < 15 mins ago
                if action == "NOW":
                    try:
                        events_resp = requests.get(f"{API_URL}/watering-events?hours=1", timeout=5)
                        if events_resp.status_code == 200:
                            events = events_resp.json()
                            if events:
                                last_event = events[0]
                                last_event_time_str = last_event.get('timestamp')
                                if last_event_time_str:
                                    if last_event_time_str.endswith('Z'):
                                        last_event_time_str = last_event_time_str[:-1] + '+00:00'
                                    
                                    from datetime import datetime, timezone, timedelta
                                    last_start = datetime.fromisoformat(last_event_time_str)
                                    if last_start.tzinfo is None:
                                        last_start = last_start.replace(tzinfo=timezone.utc)
                                    else:
                                        last_start = last_start.astimezone(timezone.utc)
                                        
                                    duration_seconds = last_event.get('duration_seconds') or 0
                                    last_end = last_start + timedelta(seconds=duration_seconds)
                                    now_utc = datetime.now(timezone.utc)
                                    
                                    time_since_end = (now_utc - last_end).total_seconds()
                                    if time_since_end < 900:  # 15 minutes = 900 seconds
                                        action = "STALL"
                                        reason = "Watering in cooldown."
                                        duration = 0
                    except Exception as e:
                        logger.warning(f"Failed to check watering events for cooldown: {e}")
                
                state_changed = (action != last_action) or (reason != last_reason)
                
                logger.info(f"M:{moisture}% | Action: {action} | {reason}")
                print(f"[STATUS] M:{moisture}% | Action: {action} | {reason}")

                # 2. Execute Action (Only if AUTO - verified above)
                if action == "NOW" and duration > 0:
                    log_msg = f"Moisture {moisture}%. Triggering Pump for {duration}s."
                    logger.info(log_msg)
                    
                    # Post Log
                    requests.post(f"{API_URL}/logs", json={"message": log_msg, "type": "ACTION"})

                    # Send control command
                    ctrl_response = requests.post(f"{API_URL}/control/pump", json={
                        "action": "ON",
                        "duration": duration,
                        "trigger_source": "AUTO"
                    })
                    
                    if ctrl_response.status_code == 200:
                        logger.info("Pump activated. Starting active safety polling...")
                        requests.post(f"{API_URL}/logs", json={"message": "Pump cycle started.", "type": "SUCCESS"})
                        
                        start_time = time.time()
                        cutoff_triggered = False
                        while time.time() - start_time < (duration + 5):
                            time.sleep(5)
                            try:
                                # Fetch active safety thresholds on the fly
                                high_limit = 85
                                try:
                                    settings_resp = requests.get(f"{API_URL}/settings", timeout=2)
                                    if settings_resp.status_code == 200:
                                        settings_data = settings_resp.json()
                                        settings = settings_data.get('settings', settings_data)
                                        high_limit = settings.get('crop_high_threshold', 85)
                                except Exception:
                                    pass

                                sensor_resp = requests.get(f"{API_URL}/sensor-data/latest", timeout=3)
                                if sensor_resp.status_code == 200:
                                    current_m = sensor_resp.json().get('soil_moisture', 50)
                                    if current_m >= high_limit:
                                        logger.warning(f"EMERGENCY CUTOFF: Moisture {current_m}% >= {high_limit}% during watering! Shutting pump OFF.")
                                        requests.post(f"{API_URL}/control/pump", json={'action': 'OFF'}, timeout=5)
                                        requests.post(f"{API_URL}/logs", json={
                                            'message': f'EMERGENCY CUTOFF: Moisture {current_m}% reached saturation limit (>= {high_limit}%). Pump deactivated.',
                                            'type': 'ERROR'
                                        }, timeout=5)
                                        cutoff_triggered = True
                                        break
                            except Exception as ex:
                                logger.error(f"Active safety polling error: {ex}")
                        
                        if not cutoff_triggered:
                            logger.info("Watering cycle completed successfully.")
                    else:
                        requests.post(f"{API_URL}/logs", json={"message": "Pump activation failed!", "type": "ERROR"})
                
                elif action == "STOP":
                    if state_changed:
                        requests.post(f"{API_URL}/logs", json={"message": f"STOP: {reason}", "type": "ERROR"})

                elif action == "STALL":
                    if state_changed:
                        requests.post(f"{API_URL}/logs", json={"message": f"STALL: {reason}", "type": "INFO"})

                elif action == "MONITOR":
                    if state_changed:
                        requests.post(f"{API_URL}/logs", json={"message": f"Monitoring: Moisture {moisture}% (Optimal)", "type": "INFO"})

                # Update last state variables
                last_action = action
                last_reason = reason

            except requests.exceptions.ConnectionError:
                logger.error("Connection refused. Is the API server running?")
                time.sleep(10)
            except requests.exceptions.ReadTimeout:
                logger.warning("Backend response timed out (prediction may be slow)")
                time.sleep(5)
            except Exception as e:
                logger.error(f"Unexpected: {e}")
            
            # Poll interval
            time.sleep(5)

    except KeyboardInterrupt:
        logger.info("Autopilot disengaged.")
        print("\n[STOP] Autopilot disengaged.")

if __name__ == "__main__":
    run_autopilot()
