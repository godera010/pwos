"""
P-WOS Automation Controller — v2
==================================
"The Hand of the Brain" — executes ML decisions and manages pump safety.

Improvements over v1:
  - Adaptive poll interval: fast (1s) during active pump, slow (5s) when stable
  - Per-action cooldown: prevents repeated NOW triggers on noisy sensor readings
  - Model reload check: picks up newly trained models without restart
  - Richer status reporting to API for dashboard visibility
  - Safety thresholds fetched once per cycle (not per-second in inner loop)
  - Emergency STOP if consecutive API errors exceed threshold
  - Clean state machine with explicit transitions
"""

import requests, time, sys, os, logging
from datetime import datetime, timedelta

API_URL = "http://localhost:5000/api"

# ─────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────
POLL_IDLE_S       = 5      # seconds between polls when moisture is stable
POLL_ACTIVE_S     = 2      # seconds between polls when decision is NOW/STALL
POLL_PUMP_S       = 1      # seconds between safety checks during pump cycle
NOW_COOLDOWN_S    = 90     # minimum seconds between consecutive NOW triggers
MAX_API_ERRORS    = 10     # consecutive errors before emergency stop


def run_autopilot():

    # ── Logging ──────────────────────────────────────────────────
    current_dir  = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
    log_dir      = os.path.join(project_root, "logs", "app")
    os.makedirs(log_dir, exist_ok=True)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s  [%(levelname)s]  %(message)s',
        handlers=[
            logging.FileHandler(os.path.join(log_dir, "autopilot.log"), encoding='utf-8'),
            logging.StreamHandler(),
        ]
    )
    logger = logging.getLogger("Autopilot")
    logger.info("=" * 55)
    logger.info("P-WOS AUTOPILOT  v2")
    logger.info("=" * 55)

    # ── Wait for backend ──────────────────────────────────────────
    if not _wait_for_backend(logger):
        sys.exit(1)

    _post_log(logger, "Automation Controller v2 started.", "SYSTEM")

    # ── State ─────────────────────────────────────────────────────
    last_action        = None
    last_system_status = None
    last_now_time      = datetime.min     # when we last triggered a pump cycle
    consecutive_errs   = 0
    settings_cache     = {}
    settings_ts        = datetime.min

    # Seed last known state from recent logs (avoids duplicate logs on restart)
    last_action, last_system_status = _seed_state(logger)

    # ── Main loop ─────────────────────────────────────────────────
    try:
        while True:
            try:
                # ── Check for newly trained model ─────────────────
                _check_model_reload(logger)

                # ── Refresh settings cache every 60s ──────────────
                if (datetime.now() - settings_ts).total_seconds() > 60:
                    settings_cache = _fetch_settings(logger)
                    settings_ts    = datetime.now()

                critical_limit = settings_cache.get('crop_critical_moisture', 15)
                high_limit     = settings_cache.get('crop_high_threshold', 85)

                # ── Check system mode ─────────────────────────────
                mode = _get_mode(logger)

                if mode == 'MANUAL':
                    # Safety overrides even in manual mode
                    moisture = _get_moisture(logger)
                    if moisture is not None:
                        # If sensor is broken (moisture < 1.0), do not trigger safety override for critical low.
                        # We let the user manually operate the pump, or we rely on other safety mechanisms.
                        if moisture >= 1.0 and moisture < critical_limit:
                            logger.warning(f"SAFETY: Manual mode but moisture {moisture:.1f}% critically low. Forcing AUTO.")
                            _set_mode('AUTO', logger)
                            _post_log(logger, f"Safety Override: moisture {moisture:.1f}% below critical {critical_limit}%. Forced AUTO.", "ERROR")
                            continue
                        if moisture >= high_limit:
                            logger.warning(f"SAFETY: Manual mode but moisture {moisture:.1f}% saturated. Forcing AUTO + pump OFF.")
                            _pump_off(logger)
                            _set_mode('AUTO', logger)
                            _post_log(logger, f"Safety Override: moisture {moisture:.1f}% saturated. Forced AUTO.", "ERROR")
                            continue
                    time.sleep(POLL_IDLE_S)
                    continue

                # ── Ask the brain ─────────────────────────────────
                decision = _get_decision(logger)
                if decision is None:
                    consecutive_errs += 1
                    if consecutive_errs >= MAX_API_ERRORS:
                        logger.error(f"[{MAX_API_ERRORS}] consecutive API errors. Turning pump OFF as precaution.")
                        _pump_off(logger)
                        _post_log(logger, f"Emergency stop: {MAX_API_ERRORS} consecutive API errors.", "ERROR")
                        consecutive_errs = 0
                    time.sleep(POLL_ACTIVE_S)
                    continue

                consecutive_errs = 0
                action        = decision.get('recommended_action', 'MONITOR')
                system_status = decision.get('system_status', 'OPTIMAL')
                duration      = float(decision.get('recommended_duration', 0))
                reason        = decision.get('ml_analysis', {}).get('reason', '')
                moisture      = float(decision.get('current_moisture', 50))

                state_changed = (action != last_action) or (system_status != last_system_status)
                logger.info(f"M:{moisture:.1f}%  Action:{action}  |  {reason[:80]}")

                # ── Execute ───────────────────────────────────────
                if action == 'NOW' and duration > 0:
                    now_dt = datetime.now()
                    since_last = (now_dt - last_now_time).total_seconds()

                    if since_last < NOW_COOLDOWN_S:
                        wait_remaining = int(NOW_COOLDOWN_S - since_last)
                        logger.info(f"NOW cooldown active — {wait_remaining}s remaining. Holding.")
                        time.sleep(POLL_ACTIVE_S)
                        continue

                    last_now_time = now_dt
                    _post_log(logger, f"Moisture {moisture:.1f}%. Triggering pump for {duration:.0f}s.", "ACTION")
                    success = _run_pump_cycle(logger, duration, high_limit)
                    if success:
                        _post_log(logger, "Pump cycle completed successfully.", "SUCCESS")
                    else:
                        _post_log(logger, "Pump cycle ended early (saturation or error).", "INFO")

                elif action == 'STOP' and state_changed:
                    _post_log(logger, f"STOP: {reason}", "ERROR")
                    _pump_off(logger)   # ensure pump is definitely off

                elif action == 'STALL' and state_changed:
                    _post_log(logger, f"STALL: {reason}", "INFO")

                elif action == 'MONITOR' and state_changed:
                    _post_log(logger, f"Monitoring [{system_status}]: Moisture {moisture:.1f}% — {reason[:120]}", "INFO")

                last_action = action
                last_system_status = system_status

                # Adaptive sleep: faster when something is happening
                poll = POLL_IDLE_S if action == 'MONITOR' else POLL_ACTIVE_S
                time.sleep(poll)

            except requests.exceptions.ConnectionError:
                logger.error("Connection refused. Is the API server running?")
                consecutive_errs += 1
                time.sleep(10)
            except requests.exceptions.ReadTimeout:
                logger.warning("API timeout (prediction may be slow).")
                time.sleep(POLL_ACTIVE_S)
            except Exception as e:
                logger.error(f"Unexpected error: {e}", exc_info=True)
                time.sleep(POLL_ACTIVE_S)

    except KeyboardInterrupt:
        logger.info("Autopilot disengaged by user.")
        print("\n[STOP] Autopilot disengaged.")


# ─────────────────────────────────────────────────────────────────
# PUMP CYCLE — with active safety polling
# ─────────────────────────────────────────────────────────────────
def _run_pump_cycle(logger, duration: float, high_limit: float) -> bool:
    """
    Activates pump for `duration` seconds.
    Polls moisture every POLL_PUMP_S seconds; cuts off early if saturated.
    Returns True on clean completion, False on early cutoff.
    """
    resp = requests.post(f"{API_URL}/control/pump",
                         json={"action": "ON", "duration": int(round(duration)), "trigger_source": "AUTO"},
                         timeout=10)
    if resp.status_code != 200:
        logger.error(f"Pump activation failed: {resp.status_code}")
        return False

    logger.info(f"Pump ON for {duration:.0f}s. Safety polling every {POLL_PUMP_S}s ...")
    start = time.time()
    deadline = start + duration + 5   # small buffer

    while time.time() < deadline:
        time.sleep(POLL_PUMP_S)
        try:
            # Check if user manually turned the pump off
            state_resp = requests.get(f"{API_URL}/system/state", timeout=3)
            if state_resp.status_code == 200 and not state_resp.json().get('pump_active', True):
                logger.info("Pump was turned off manually during cycle. Aborting early.")
                return False

            s_resp = requests.get(f"{API_URL}/sensor-data/latest", timeout=3)
            if s_resp.status_code == 200:
                current_m = s_resp.json().get('soil_moisture', 50)
                if float(current_m) >= high_limit:
                    logger.warning(f"EMERGENCY CUTOFF: Moisture {current_m}% >= {high_limit}% during cycle.")
                    requests.post(f"{API_URL}/control/pump", json={"action": "OFF"}, timeout=5)
                    return False
        except Exception as ex:
            logger.error(f"Safety poll error: {ex}")

    return True


# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────
def _wait_for_backend(logger, max_retries=30, delay=2):
    for attempt in range(max_retries):
        try:
            r = requests.get(f"{API_URL}/health", timeout=5)
            if r.status_code == 200:
                logger.info("Backend is online.")
                return True
        except requests.exceptions.ConnectionError:
            pass
        if attempt % 5 == 0:
            logger.info(f"Waiting for backend ... ({attempt}/{max_retries})")
        time.sleep(delay)
    logger.error("Backend never became available.")
    return False


def _seed_state(logger):
    """Read last action/status from log endpoint to prevent duplicate logs on restart."""
    try:
        r = requests.get(f"{API_URL}/logs?limit=20", timeout=5)
        if r.status_code == 200:
            for entry in r.json():
                msg = entry.get('message', '')
                if 'STOP:' in msg:      return 'STOP',    'STOP'
                if 'STALL:' in msg:     return 'STALL',   'STALL'
                if 'Monitoring' in msg:
                    if '[' in msg and ']' in msg:
                        status = msg.split('[')[1].split(']')[0]
                        return 'MONITOR', status
                    return 'MONITOR', 'OPTIMAL'
    except Exception as e:
        logger.warning(f"Could not seed state: {e}")
    return None, None


def _check_model_reload(logger):
    """If retrain pipeline flagged a new model, signal via API."""
    try:
        r = requests.get(f"{API_URL}/model/reload-check", timeout=3)
        if r.status_code == 200 and r.json().get('reload_needed'):
            requests.post(f"{API_URL}/model/reload", timeout=5)
            logger.info("New model detected and reload triggered.")
    except Exception:
        pass   # endpoint may not exist in all deployments


def _fetch_settings(logger):
    try:
        r = requests.get(f"{API_URL}/settings", timeout=5)
        if r.status_code == 200:
            data = r.json()
            return data.get('settings', data)
    except Exception as e:
        logger.error(f"Failed to fetch settings: {e}")
    return {}


def _get_mode(logger):
    try:
        r = requests.get(f"{API_URL}/system/state", timeout=10)
        if r.status_code == 200:
            return r.json().get('mode', 'AUTO')
    except Exception:
        pass
    return 'AUTO'


def _set_mode(mode: str, logger):
    try:
        requests.post(f"{API_URL}/system/state", json={'mode': mode}, timeout=5)
    except Exception as e:
        logger.error(f"Failed to set mode {mode}: {e}")


def _get_moisture(logger):
    try:
        r = requests.get(f"{API_URL}/sensor-data/latest", timeout=5)
        if r.status_code == 200:
            return float(r.json().get('soil_moisture', 50))
    except Exception:
        pass
    return None


def _get_decision(logger):
    try:
        r = requests.get(f"{API_URL}/predict-next-watering", timeout=15)
        if r.status_code == 200:
            return r.json()
        logger.warning(f"Predict endpoint returned {r.status_code}")
    except Exception as e:
        logger.error(f"Decision fetch error: {e}")
    return None


def _pump_off(logger):
    try:
        requests.post(f"{API_URL}/control/pump", json={"action": "OFF"}, timeout=5)
    except Exception as e:
        logger.error(f"Pump OFF command failed: {e}")


def _post_log(logger, message: str, log_type: str = "INFO"):
    safe = message.encode('ascii', 'ignore').decode('ascii').strip()
    try:
        requests.post(f"{API_URL}/logs", json={"message": safe, "type": log_type}, timeout=5)
    except Exception:
        pass
    logger.info(f"[{log_type}] {safe}")


if __name__ == "__main__":
    run_autopilot()
