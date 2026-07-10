"""
P-WOS End-to-End Latency Probe
================================
Measures every hop of the decision pipeline against the LIVE system:

  1. API round-trip times (health, state, latest reading, prediction)
  2. Ingest latency: MQTT sensor publish -> visible in /api/sensor-data/latest
     (covers broker -> on_message -> DB insert -> DB read)
  3. Pump command path: POST /api/control/pump (action OFF — safe, no watering)

Run with the backend (and Mosquitto) running:
  cd src/backend
  py latency_probe.py

Note: step 2 publishes one synthetic sensor reading (current moisture +0.37%),
which is stored in the database like any real reading.
"""

import json
import statistics
import time

import requests

API = "http://localhost:5000/api"
MQTT_HOST = "localhost"
N_RTT = 20


def rtt(label, fn, n=N_RTT):
    ts = []
    for _ in range(n):
        t0 = time.perf_counter()
        try:
            fn()
        except Exception as e:
            print(f"  {label:42s} FAILED: {e}")
            return None
        ts.append((time.perf_counter() - t0) * 1000)
    p50 = statistics.median(ts)
    p95 = sorted(ts)[int(len(ts) * 0.95)]
    print(f"  {label:42s} p50={p50:7.1f} ms   p95={p95:7.1f} ms   max={max(ts):7.1f} ms")
    return p50


def measure_ingest_latency():
    """Publish a marked sensor reading via MQTT and time until the API serves it."""
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        print("  ingest: paho-mqtt not installed — skipped")
        return

    try:
        r = requests.get(f"{API}/sensor-data/latest", timeout=5)
        base = float(r.json().get("soil_moisture", 50.0)) if r.status_code == 200 else 50.0
        temp = float(r.json().get("temperature", 25.0)) if r.status_code == 200 else 25.0
        hum = float(r.json().get("humidity", 60.0)) if r.status_code == 200 else 60.0
    except Exception:
        base, temp, hum = 50.0, 25.0, 60.0

    marker = round(base + 0.37, 2)  # close to current value: safe, but identifiable
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "PWOS_LatencyProbe")
    try:
        client.connect(MQTT_HOST, 1883, 60)
    except Exception as e:
        print(f"  ingest: MQTT broker unreachable ({e}) — skipped")
        return
    client.loop_start()

    payload = json.dumps({"soil_moisture": marker, "temperature": temp, "humidity": hum})
    t0 = time.perf_counter()
    client.publish("pwos/sensor/data", payload)

    deadline = t0 + 10.0
    seen_ms = None
    while time.perf_counter() < deadline:
        try:
            r = requests.get(f"{API}/sensor-data/latest", timeout=3)
            if r.status_code == 200 and abs(float(r.json().get("soil_moisture", -1)) - marker) < 0.001:
                seen_ms = (time.perf_counter() - t0) * 1000
                break
        except Exception:
            pass
        time.sleep(0.02)

    client.loop_stop()
    client.disconnect()

    if seen_ms is not None:
        print(f"  {'MQTT publish -> API serves new reading':42s} {seen_ms:7.1f} ms")
    else:
        print(f"  {'MQTT publish -> API serves new reading':42s} NOT SEEN within 10s "
              f"(is the backend's MQTT connected?)")


def main():
    print("=" * 74)
    print("P-WOS END-TO-END LATENCY PROBE")
    print("=" * 74)

    try:
        requests.get(f"{API}/health", timeout=5)
    except Exception as e:
        print(f"Backend not reachable at {API} ({e}). Start it first.")
        return

    print("\n[1] API round-trips (includes Flask + DB):")
    rtt("GET /api/health", lambda: requests.get(f"{API}/health", timeout=10))
    rtt("GET /api/system/state", lambda: requests.get(f"{API}/system/state", timeout=10))
    rtt("GET /api/sensor-data/latest", lambda: requests.get(f"{API}/sensor-data/latest", timeout=10))
    rtt("GET /api/predict-next-watering", lambda: requests.get(f"{API}/predict-next-watering", timeout=15))

    print("\n[2] Sensor ingest path (MQTT -> memory/DB -> API):")
    measure_ingest_latency()

    print("\n[3] Pump command path (safe OFF command):")
    rtt("POST /api/control/pump {OFF}",
        lambda: requests.post(f"{API}/control/pump", json={"action": "OFF"}, timeout=10), n=5)

    print("\n[4] Fixed pipeline delays (by design, not measurable above):")
    print("  ESP32 sensor publish interval               1000 ms (config.h SAMPLE_INTERVAL)")
    print("  Autopilot poll: idle / active               5000 / 2000 ms")
    print("    -> interrupted immediately by moisture jumps >= 2% (sensor listener)")
    print("  NOW-trigger cooldown                        90 s between pump cycles")
    print("  Weather refresh (cache miss)                background thread, never blocks ingest")
    print("=" * 74)


if __name__ == "__main__":
    main()
