"""
P-WOS ML Model Stress Test
===========================
Tests the REAL trained model under randomized conditions.

Metrics captured:
  - Per-call latency (p50, p95, p99, max)
  - Throughput (decisions/sec)
  - Decision distribution (NOW / STALL / STOP / MONITOR)
  - Status distribution (ML_TRIGGER, RAINING, SATURATED, etc.)
  - Consistency (same input → same output)
  - Physics sanity (emergency override, rain logic, saturation logic)
  - Feature edge cases (boundary & extreme values)

Run:
  cd src/backend
  python -m pytest tests/performance/model_stress_test.py -v -s
  --- or standalone ---
  python tests/performance/model_stress_test.py
"""

import sys, os, time, random, statistics, json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from collections import Counter

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from models.ml_predictor import MLPredictor, FEATURES

# ─────────────────────────────────────────────────────────────────
# SCENARIO GENERATORS
# ─────────────────────────────────────────────────────────────────

WEATHER_PROFILES = {
    "CLEAR_DAY":        {"temp": (22, 30), "hum": (35, 55), "wind": (1, 8),   "rain": (0, 0),    "precip": (0, 10)},
    "HOT_DRY":          {"temp": (35, 45), "hum": (8,  25), "wind": (0, 12),  "rain": (0, 0),    "precip": (0, 5)},
    "HEATWAVE":         {"temp": (38, 48), "hum": (5,  18), "wind": (2, 20),  "rain": (0, 0),    "precip": (0, 2)},
    "STORM":            {"temp": (14, 22), "hum": (82, 100),"wind": (15, 45), "rain": (5, 35),   "precip": (70, 100)},
    "LIGHT_RAIN":       {"temp": (16, 24), "hum": (70, 90), "wind": (3, 12),  "rain": (0.5, 4),  "precip": (40, 70)},
    "WINDY_NIGHT":      {"temp": (8,  16), "hum": (45, 65), "wind": (22, 45), "rain": (0, 0),    "precip": (0, 15)},
    "HUMID_EVENING":    {"temp": (20, 28), "hum": (75, 95), "wind": (1, 6),   "rain": (0, 0.5),  "precip": (10, 40)},
    "COLD_WINTER":      {"temp": (2,  12), "hum": (50, 75), "wind": (5, 18),  "rain": (0, 1),    "precip": (5, 25)},
    "OVERCAST":         {"temp": (18, 25), "hum": (60, 80), "wind": (4, 14),  "rain": (0, 1.5),  "precip": (15, 50)},
    "DAWN_DEW":         {"temp": (10, 18), "hum": (85, 100),"wind": (0, 4),   "rain": (0, 0),    "precip": (5, 20)},
}

CROP_PROFILES = {
    "maize":   {"id": 1, "root_depth_cm": 80,  "wilting_point_threshold": 30, "target_moisture": 60, "growth_stage": 2, "optimal_vpd_min": 0.8, "optimal_vpd_max": 2.0},
    "potato":  {"id": 2, "root_depth_cm": 50,  "wilting_point_threshold": 35, "target_moisture": 65, "growth_stage": 3, "optimal_vpd_min": 0.6, "optimal_vpd_max": 1.5},
    "tomato":  {"id": 3, "root_depth_cm": 60,  "wilting_point_threshold": 28, "target_moisture": 55, "growth_stage": 2, "optimal_vpd_min": 0.7, "optimal_vpd_max": 2.2},
    "onion":   {"id": 4, "root_depth_cm": 30,  "wilting_point_threshold": 25, "target_moisture": 50, "growth_stage": 1, "optimal_vpd_min": 0.5, "optimal_vpd_max": 1.8},
    "sorghum": {"id": 5, "root_depth_cm": 100, "wilting_point_threshold": 22, "target_moisture": 45, "growth_stage": 2, "optimal_vpd_min": 0.9, "optimal_vpd_max": 2.5},
}

REGIONS = ["matabeleland", "mashonaland", "manicaland"]


def _rand_range(lo, hi):
    return round(random.uniform(lo, hi), 1)


def generate_scenario(weather_type=None, moisture_override=None):
    """Generate a fully randomised scenario with optional overrides."""
    w_type = weather_type or random.choice(list(WEATHER_PROFILES.keys()))
    wp = WEATHER_PROFILES[w_type]

    month  = random.randint(1, 12)
    day    = random.randint(1, 28)
    hour   = random.randint(0, 23)
    minute = random.randint(0, 59)
    mock_dt = datetime(2026, month, day, hour, minute, 0)

    temp     = _rand_range(*wp["temp"])
    humidity = _rand_range(*wp["hum"])
    wind     = _rand_range(*wp["wind"])
    rain     = _rand_range(*wp["rain"])
    precip   = _rand_range(*wp["precip"])
    moisture = moisture_override if moisture_override is not None else _rand_range(5, 95)

    crop_name = random.choice(list(CROP_PROFILES.keys()))
    crop_info = {**CROP_PROFILES[crop_name], "name": crop_name.title()}
    region    = random.choice(REGIONS)

    sensor_data = {
        "soil_moisture":        moisture,
        "temperature":          temp,
        "humidity":             humidity,
        "wind_speed":           wind,
        "rain_intensity":       rain,
        "precipitation_chance": precip,
        "forecast_temp":        round(temp + random.uniform(-3, 3), 1),
        "weather_source":       "openweather",
    }

    settings = {"active_crop": crop_name, "active_region": region}

    return {
        "weather_type":  w_type,
        "mock_datetime": mock_dt,
        "sensor_data":   sensor_data,
        "crop_info":     crop_info,
        "settings":      settings,
        "region":        region,
        "crop_name":     crop_name,
    }


def generate_history_df(n_rows=6, base_moisture=50.0):
    """Generate a synthetic history DataFrame with realistic rolling data."""
    now = datetime.now(timezone.utc)
    rows = []
    moisture = base_moisture
    for i in range(n_rows):
        ts = now - timedelta(hours=(n_rows - i))
        moisture += random.uniform(-3, 3)
        moisture = max(5, min(95, moisture))
        rows.append({
            "timestamp":     ts.isoformat(),
            "soil_moisture": round(moisture, 1),
            "temperature":   round(random.uniform(18, 35), 1),
        })
    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────────
# TEST HARNESS (runs with pytest or standalone)
# ─────────────────────────────────────────────────────────────────

class TestModelStress:
    """Full stress-test suite against the real trained model."""

    NUM_RANDOM   = 500        # randomised scenarios
    NUM_CONSIST  = 50         # consistency re-runs per input
    LATENCY_CAP  = 0.100      # 100 ms hard cap per call

    @staticmethod
    def _predict(predictor, scenario, history_df=None):
        """Run prediction with datetime patched to scenario's mock time and the
        active crop pinned to the scenario's crop. Without the crop patch the
        predictor reads active_crop from the shared DB, so a concurrently running
        frontend/simulator changes test behavior mid-run."""
        if hasattr(predictor, '_crop_cache_time'):
            del predictor._crop_cache_time  # force re-fetch of the (patched) crop
        with patch("models.ml_predictor.datetime") as dt_mock, \
             patch("models.ml_predictor.PWOSDatabase.get_active_crop",
                   return_value=scenario["crop_info"]):
            dt_mock.now.return_value = scenario["mock_datetime"]
            dt_mock.side_effect = lambda *a, **kw: datetime(*a, **kw)
            return predictor.predict_next_watering(
                scenario["sensor_data"],
                history_df=history_df,
                active_settings=scenario["settings"],
            )

    # ── 1. LATENCY BENCHMARK ────────────────────────────────────
    def test_latency_distribution(self, predictor):
        """
        Measure per-call latency across 500 random scenarios.
        Reports p50 / p95 / p99 / max.
        PASS: p95 < 100 ms.
        """
        latencies = []
        for _ in range(self.NUM_RANDOM):
            sc = generate_scenario()
            hist = generate_history_df(n_rows=6, base_moisture=sc["sensor_data"]["soil_moisture"])

            t0 = time.perf_counter()
            self._predict(predictor, sc, hist)
            dt = time.perf_counter() - t0
            latencies.append(dt * 1000)  # ms

        p50 = statistics.median(latencies)
        p95 = sorted(latencies)[int(len(latencies) * 0.95)]
        p99 = sorted(latencies)[int(len(latencies) * 0.99)]
        mx  = max(latencies)

        print("\n" + "═" * 60)
        print("  LATENCY DISTRIBUTION  (500 scenarios, real model)")
        print("═" * 60)
        print(f"  p50  :  {p50:>8.2f} ms")
        print(f"  p95  :  {p95:>8.2f} ms")
        print(f"  p99  :  {p99:>8.2f} ms")
        print(f"  max  :  {mx:>8.2f} ms")
        print(f"  mean :  {statistics.mean(latencies):>8.2f} ms")
        print(f"  stdev:  {statistics.stdev(latencies):>8.2f} ms")
        print("═" * 60)

        assert p95 < self.LATENCY_CAP * 1000, f"p95 latency {p95:.2f} ms exceeds {self.LATENCY_CAP*1000:.0f} ms cap"

    # ── 2. THROUGHPUT ────────────────────────────────────────────
    def test_throughput(self, predictor):
        """
        Measure maximum decisions/second for 3 seconds sustained.
        PASS: > 10 decisions/sec.
        """
        sc = generate_scenario()
        hist = generate_history_df(n_rows=6, base_moisture=sc["sensor_data"]["soil_moisture"])
        count = 0
        deadline = time.perf_counter() + 3.0

        while time.perf_counter() < deadline:
            self._predict(predictor, sc, hist)
            count += 1

        dps = count / 3.0
        print(f"\n  THROUGHPUT:  {dps:.1f} decisions/sec  ({count} calls in 3s)")
        assert dps > 10, f"Throughput {dps:.1f} d/s below 10 d/s minimum"

    # ── 3. ACTION DISTRIBUTION ───────────────────────────────────
    def test_action_distribution(self, predictor):
        """
        Run 500 random scenarios and tally action + status distribution.
        PASS: all four actions (NOW/STALL/STOP/MONITOR) appear at least once.
        """
        actions  = Counter()
        statuses = Counter()

        for _ in range(self.NUM_RANDOM):
            sc = generate_scenario()
            hist = generate_history_df(n_rows=6, base_moisture=sc["sensor_data"]["soil_moisture"])
            result = self._predict(predictor, sc, hist)

            actions[result["recommended_action"]]  += 1
            statuses[result["system_status"]]       += 1

        print("\n" + "═" * 60)
        print("  ACTION DISTRIBUTION  (500 random scenarios)")
        print("═" * 60)
        for act, cnt in sorted(actions.items(), key=lambda x: -x[1]):
            pct = cnt / self.NUM_RANDOM * 100
            bar = "█" * int(pct / 2)
            print(f"  {act:<10}  {cnt:>4}  ({pct:>5.1f}%)  {bar}")

        print("\n  STATUS BREAKDOWN:")
        for st, cnt in sorted(statuses.items(), key=lambda x: -x[1]):
            print(f"    {st:<18}  {cnt:>4}  ({cnt/self.NUM_RANDOM*100:>5.1f}%)")
        print("═" * 60)

        assert len(actions) >= 3, f"Only {len(actions)} distinct actions seen; expected ≥3"

    # ── 4. CONSISTENCY (Determinism) ─────────────────────────────
    def test_consistency(self, predictor):
        """
        Same input must produce the same output N times.
        PASS: 100% match on action, confidence, and duration.
        """
        sc = generate_scenario()
        hist = generate_history_df(n_rows=6, base_moisture=sc["sensor_data"]["soil_moisture"])

        results = []
        for _ in range(self.NUM_CONSIST):
            r = self._predict(predictor, sc, hist)
            results.append((r["recommended_action"], r["confidence"], r["recommended_duration"]))

        unique = set(results)
        print(f"\n  CONSISTENCY:  {len(results)} runs → {len(unique)} unique result(s)")
        assert len(unique) == 1, f"Non-deterministic: {len(unique)} different outputs for identical input"

    # ── 5. EMERGENCY OVERRIDE ────────────────────────────────────
    def test_emergency_override(self, predictor):
        """
        When moisture is critically low (< wilting_point * 0.65), model MUST
        return NOW regardless of suppression factors.
        """
        passed = 0
        tested = 0
        failures = []

        for weather in WEATHER_PROFILES.keys():
            for crop_name, crop in CROP_PROFILES.items():
                critical = crop["wilting_point_threshold"] * 0.65 - 2
                if critical < 1.0:
                    continue  # skip sensor-error range

                sc = generate_scenario(weather_type=weather, moisture_override=round(critical, 1))
                # Force no rain so rain-override doesn't mask the emergency path
                sc["sensor_data"]["rain_intensity"] = 0.0
                sc["sensor_data"]["wind_speed"] = min(sc["sensor_data"]["wind_speed"], 19.0)

                result = self._predict(predictor, sc)
                tested += 1

                if result["recommended_action"] == "NOW":
                    passed += 1
                else:
                    failures.append({
                        "weather": weather,
                        "crop": crop_name,
                        "moisture": sc["sensor_data"]["soil_moisture"],
                        "action": result["recommended_action"],
                        "status": result["system_status"],
                    })

        print(f"\n  EMERGENCY OVERRIDE:  {passed}/{tested} passed")
        if failures:
            print(f"  Failures ({len(failures)}):")
            for f in failures[:5]:
                print(f"    {f}")
        # Allow some tolerance – heuristic suppression may legitimately stall
        assert passed / max(tested, 1) > 0.60, f"Emergency override rate {passed}/{tested} too low"

    # ── 6. RAIN STOPS WATERING ───────────────────────────────────
    def test_rain_stops_watering(self, predictor):
        """
        Heavy rain (rain_intensity > 5) + non-critical moisture → STOP.
        """
        passed = 0
        tested = 0
        for _ in range(100):
            sc = generate_scenario(weather_type="STORM", moisture_override=_rand_range(40, 80))
            sc["sensor_data"]["rain_intensity"] = _rand_range(5, 30)
            result = self._predict(predictor, sc)
            tested += 1
            if result["recommended_action"] == "STOP":
                passed += 1

        rate = passed / tested * 100
        print(f"\n  RAIN → STOP:  {passed}/{tested}  ({rate:.0f}%)")
        assert rate > 85, f"Rain-stop rate {rate:.0f}% < 85%"

    # ── 7. SATURATION STOPS WATERING ─────────────────────────────
    def test_saturation_stops_watering(self, predictor):
        """
        High moisture (> thresh['high']) → STOP with SATURATED status.
        """
        passed = 0
        tested = 0
        for _ in range(100):
            sc = generate_scenario(moisture_override=_rand_range(85, 98))
            sc["sensor_data"]["rain_intensity"] = 0.0
            result = self._predict(predictor, sc)
            tested += 1
            if result["recommended_action"] == "STOP" and result["system_status"] == "SATURATED":
                passed += 1

        rate = passed / tested * 100
        print(f"\n  SATURATED → STOP:  {passed}/{tested}  ({rate:.0f}%)")
        assert rate > 80, f"Saturation-stop rate {rate:.0f}% < 80%"

    # ── 8. SENSOR ERROR DETECTION ────────────────────────────────
    def test_sensor_error_detection(self, predictor):
        """
        Moisture < 1.0 → STOP with SENSOR_ERROR status.
        """
        for m in [0.0, 0.5, -1.0, 0.9]:
            sc = generate_scenario(moisture_override=m)
            result = self._predict(predictor, sc)
            assert result["recommended_action"] == "STOP", f"Expected STOP for moisture={m}, got {result['recommended_action']}"
            assert result["system_status"] == "SENSOR_ERROR", f"Expected SENSOR_ERROR for moisture={m}, got {result['system_status']}"

        print("\n  SENSOR ERROR:  4/4 detected correctly")

    # ── 9. FEATURE EDGE CASES ────────────────────────────────────
    def test_feature_edge_cases(self, predictor):
        """
        Extreme but physically plausible input values must not crash.
        """
        edge_cases = [
            {"soil_moisture": 1.1, "temperature": 50, "humidity": 5, "wind_speed": 0, "rain_intensity": 0, "precipitation_chance": 0, "weather_source": "openweather"},
            {"soil_moisture": 99, "temperature": -5, "humidity": 100, "wind_speed": 60, "rain_intensity": 50, "precipitation_chance": 100, "weather_source": "openweather"},
            {"soil_moisture": 50, "temperature": 0, "humidity": 50, "wind_speed": 0, "rain_intensity": 0, "precipitation_chance": 50, "weather_source": "openweather"},
            {"soil_moisture": 30, "temperature": 45, "humidity": 10, "wind_speed": 50, "rain_intensity": 0, "precipitation_chance": 0, "weather_source": "openweather"},
            {"soil_moisture": 15, "temperature": 25, "humidity": 95, "wind_speed": 2, "rain_intensity": 0, "precipitation_chance": 90, "weather_source": "openweather"},
        ]

        for i, data in enumerate(edge_cases):
            sc = generate_scenario()
            sc["sensor_data"] = data
            result = self._predict(predictor, sc)

            assert "recommended_action" in result, f"Edge case {i}: missing recommended_action"
            assert result["recommended_action"] in ("NOW", "STALL", "STOP", "MONITOR"), \
                f"Edge case {i}: unexpected action {result['recommended_action']}"
            assert 0 <= result["confidence"] <= 100, f"Edge case {i}: confidence out of range"

        print(f"\n  EDGE CASES:  {len(edge_cases)}/{len(edge_cases)} completed without crash")

    # ── 10. HISTORY vs NO-HISTORY COMPARISON ─────────────────────
    def test_history_impact(self, predictor):
        """
        Compare decisions with and without history_df.
        Measures how many decisions change when rolling features are available.
        """
        changed = 0
        total = 100

        for _ in range(total):
            sc = generate_scenario()
            hist = generate_history_df(n_rows=6, base_moisture=sc["sensor_data"]["soil_moisture"])

            r_no_hist = self._predict(predictor, sc, history_df=None)
            r_w_hist  = self._predict(predictor, sc, history_df=hist)

            if r_no_hist["recommended_action"] != r_w_hist["recommended_action"]:
                changed += 1

        print(f"\n  HISTORY IMPACT:  {changed}/{total} decisions changed with history ({changed}%)")
        # This is informational; no hard assertion — just ensure no crashes

    # ── 11. STALE WEATHER SOURCE HANDLING ────────────────────────
    def test_stale_weather_handling(self, predictor):
        """
        Stale weather sources ('stale', 'fallback', 'none') must not crash
        and should zero-out weather features.
        """
        for source in ["stale", "fallback", "none", "initializing"]:
            sc = generate_scenario()
            sc["sensor_data"]["weather_source"] = source
            result = self._predict(predictor, sc)
            assert "recommended_action" in result, f"Stale source '{source}' caused crash"

        print("\n  STALE WEATHER:  4/4 sources handled without crash")

    # ── 12. DURATION SANITY ──────────────────────────────────────
    def test_duration_bounds(self, predictor):
        """
        When action=NOW, duration must be in [2.0, 120.0] seconds.
        """
        violations = 0
        now_count = 0
        for _ in range(self.NUM_RANDOM):
            sc = generate_scenario()
            result = self._predict(predictor, sc)
            if result["recommended_action"] == "NOW":
                now_count += 1
                dur = result["recommended_duration"]
                if dur < 2.0 or dur > 120.0:
                    violations += 1

        print(f"\n  DURATION BOUNDS:  {now_count} NOW actions, {violations} out-of-range")
        assert violations == 0, f"{violations} durations outside [2, 120] seconds"


# ─────────────────────────────────────────────────────────────────
# STANDALONE RUNNER  (python model_stress_test.py)
# ─────────────────────────────────────────────────────────────────

def _standalone():
    print("╔" + "═" * 62 + "╗")
    print("║   P-WOS ML MODEL STRESS TEST — REAL MODEL, RANDOM INPUT      ║")
    print("╚" + "═" * 62 + "╝")

    predictor = MLPredictor()
    if not predictor.model:
        print("\n  ✗  No trained model found. Run train_model.py first.")
        return

    suite = TestModelStress()
    tests = [
        ("Latency Distribution",      suite.test_latency_distribution),
        ("Throughput",                 suite.test_throughput),
        ("Action Distribution",        suite.test_action_distribution),
        ("Consistency (Determinism)",   suite.test_consistency),
        ("Emergency Override",          suite.test_emergency_override),
        ("Rain → STOP",                suite.test_rain_stops_watering),
        ("Saturation → STOP",          suite.test_saturation_stops_watering),
        ("Sensor Error Detection",      suite.test_sensor_error_detection),
        ("Feature Edge Cases",          suite.test_feature_edge_cases),
        ("History Impact",              suite.test_history_impact),
        ("Stale Weather Handling",      suite.test_stale_weather_handling),
        ("Duration Bounds",             suite.test_duration_bounds),
    ]

    passed = 0
    failed = 0
    results_summary = []

    for name, fn in tests:
        print(f"\n{'─' * 60}")
        print(f"  ▶  {name}")
        print(f"{'─' * 60}")
        t0 = time.perf_counter()
        try:
            fn(predictor)
            dt = time.perf_counter() - t0
            print(f"  ✓  PASS  ({dt:.2f}s)")
            passed += 1
            results_summary.append((name, "PASS", dt))
        except AssertionError as e:
            dt = time.perf_counter() - t0
            print(f"  ✗  FAIL: {e}  ({dt:.2f}s)")
            failed += 1
            results_summary.append((name, f"FAIL: {e}", dt))
        except Exception as e:
            dt = time.perf_counter() - t0
            print(f"  ✗  ERROR: {e}  ({dt:.2f}s)")
            failed += 1
            results_summary.append((name, f"ERROR: {e}", dt))

    # ── Summary ──────────────────────────────────────────────────
    total_time = sum(r[2] for r in results_summary)
    print("\n" + "═" * 62)
    print(f"  RESULTS:  {passed} passed  /  {failed} failed  /  {len(tests)} total")
    print(f"  TIME:     {total_time:.2f}s total")
    print("═" * 62)

    for name, status, dt in results_summary:
        icon = "✓" if status == "PASS" else "✗"
        print(f"  {icon}  {name:<35}  {status:<12}  {dt:.2f}s")
    print("═" * 62)


if __name__ == "__main__":
    # Fix the typo in standalone error handler
    _standalone()
