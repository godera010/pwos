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
    try:
        while True:
            try:
                poll_count += 1

                # 0. Check System Mode
                state_resp = requests.get(f"{API_URL}/system/state", timeout=5)
                if state_resp.status_code == 200:
                    mode = state_resp.json().get('mode', 'AUTO')
                    if mode == 'MANUAL':
                        # In Manual mode, we just stand by
                        # But maybe we still log that we ARE standing by? No, too spammy.
                        time.sleep(5)
                        continue
                
                # 1. Ask the Brain
                response = requests.get(f"{API_URL}/predict-next-watering", timeout=5)
                if response.status_code != 200:
                    logger.warning(f"API Error: {response.status_code}")
                    time.sleep(5)
                    continue

                decision = response.json()
                action = decision['recommended_action']
                duration = decision.get('recommended_duration', 0)
                reason = decision['ml_analysis'].get('reason', '')
                moisture = decision['current_moisture']
                
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
                        logger.info("Pump activated. Waiting for cycle to finish...")
                        requests.post(f"{API_URL}/logs", json={"message": "Pump cycle started.", "type": "SUCCESS"})
                        time.sleep(duration + 5) 
                    else:
                        requests.post(f"{API_URL}/logs", json={"message": "Pump activation failed!", "type": "ERROR"})
                
                elif action == "STOP":
                    if poll_count % 12 == 0: # Every minute
                         requests.post(f"{API_URL}/logs", json={"message": f"STOP: {reason}", "type": "ERROR"})

                elif action == "STALL":
                    if poll_count % 12 == 0: # Every minute
                        requests.post(f"{API_URL}/logs", json={"message": f"STALL: {reason}", "type": "INFO"})

                elif action == "MONITOR":
                    if poll_count % 12 == 0: # Every minute
                        requests.post(f"{API_URL}/logs", json={"message": f"Monitoring: Moisture {moisture}% (Optimal)", "type": "INFO"})

            except requests.exceptions.ConnectionError:
                logger.error("Connection refused. Is the API server running?")
                time.sleep(10)
            except Exception as e:
                logger.error(f"Unexpected: {e}")
            
            # Poll interval
            time.sleep(5)

    except KeyboardInterrupt:
        logger.info("Autopilot disengaged.")
        print("\n[STOP] Autopilot disengaged.")

if __name__ == "__main__":
    run_autopilot()
