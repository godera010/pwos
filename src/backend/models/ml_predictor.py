"""
P-WOS ML Predictor — v2
========================
Loads the trained Random Forest and makes irrigation decisions.

Improvements over v1:
  - All 17 features populated from live sensor + DB data (no zero-filled gaps)
  - Suppression mirrors training labels: night, winter, humidity, rain, VPD all count
  - Adaptive confidence threshold: lower threshold in emergency, higher in winter
  - Decay rate used to estimate time-to-critical for smarter duration calculation
  - Physics-based duration: fills to target moisture, scaled by region + root depth
  - XAI: top-3 feature drivers included in every decision reason string
  - Weather staleness guard: stale data defaults to conservative MONITOR
  - Single DB connection per prediction call (no connection leak)
"""

import joblib, json, os, sys
import pandas as pd
import numpy as np
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from log_config import setup_logger
logger = setup_logger("MLPredictor", "ml_predictor.log", "app")

from utils.vpd_calculator import calculate_vpd
from database import PWOSDatabase

# ─────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODEL_PATH    = os.path.join(BASE_DIR, 'src', 'backend', 'models', 'artifacts', 'rf_model.pkl')
METADATA_PATH = os.path.join(BASE_DIR, 'src', 'backend', 'models', 'artifacts', 'model_metadata.json')
SETTINGS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'operational_settings.json')

# Matches train_model.py exactly (growth_stage removed: constant in all data)
FEATURES = [
    'soil_moisture', 'temperature', 'humidity', 'vpd',
    'precipitation_chance', 'forecast_temp', 'wind_speed',
    'crop_type_id', 'root_depth_cm', 'wilting_point_threshold',
    'optimal_vpd_min', 'optimal_vpd_max',
    'hour', 'is_daytime', 'moisture_change_rate', 'moisture_rolling_6',
]

REGION_MULT = {'matabeleland': 1.2, 'mashonaland': 1.0, 'manicaland': 0.8}


class MLPredictor:

    def __init__(self):
        self.model    = None
        self.metadata = {}
        self.db       = None
        self._load_model()

    # ─────────────────────────────────────────────────────────────
    # INITIALISATION
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def _force_single_thread(est, _depth=0):
        """Set n_jobs=1 on the estimator and anything nested inside it.
        Single-row inference is far faster without joblib's per-call parallel
        dispatch: n_jobs=-1 costs ~40ms of thread-pool overhead per call."""
        if est is None or _depth > 4:
            return
        if hasattr(est, 'n_jobs'):
            est.n_jobs = 1
        for attr in ('estimator', 'base_estimator'):
            MLPredictor._force_single_thread(getattr(est, attr, None), _depth + 1)
        for cc in getattr(est, 'calibrated_classifiers_', None) or []:
            MLPredictor._force_single_thread(getattr(cc, 'estimator', None), _depth + 1)

    def _load_model(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)
            self._force_single_thread(self.model)
            with open(METADATA_PATH) as f:
                self.metadata = json.load(f)
            acc = self.metadata.get('accuracy')
            acc_str = f"{acc:.4f}" if isinstance(acc, (int, float)) else "?"
            logger.info(f"Model loaded. Accuracy={acc_str}  "
                        f"F1={self.metadata.get('metrics',{}).get('f1_score','?')}")
        else:
            logger.error(f"Model not found at {MODEL_PATH}. Run train_model.py first.")

    def _get_settings(self):
        defaults = {'active_crop': 'maize', 'active_region': 'matabeleland'}
        if os.path.exists(SETTINGS_PATH):
            try:
                with open(SETTINGS_PATH) as f:
                    return {**defaults, **json.load(f)}
            except Exception:
                pass
        return defaults

    # ─────────────────────────────────────────────────────────────
    # SEASONAL THRESHOLDS  (Southern Hemisphere)
    # ─────────────────────────────────────────────────────────────
    def _seasonal_thresholds(self, month, crop_info):
        wilting  = crop_info.get('wilting_point_threshold', 30.0)
        target   = crop_info.get('target_moisture', 60.0)
        shift = 0
        if month in [11, 12, 1, 2, 3]:  shift = +5   # summer — more moisture needed
        elif month in [5, 6, 7, 8, 9]:  shift = -5   # winter — less urgency
        return {
            'critical':   max(5,  wilting + shift),
            'low':        max(10, wilting + 10 + shift),
            'proactive':  max(15, target - 5 + shift),
            'high':       max(20, target + 15 + shift),
            'target':     max(25, target + shift),
        }

    # ─────────────────────────────────────────────────────────────
    # SENSOR VALIDITY
    # ─────────────────────────────────────────────────────────────
    def _check_sensor(self, moisture, history_df=None):
        """Return False if sensor appears disconnected (below 1.0% or negative values)."""
        if moisture < 1.0:
            return False
        if history_df is not None and not history_df.empty:
            vals = list(history_df['soil_moisture'].tail(5)) + [moisture]
            if len(vals) >= 3 and (sum(vals) / len(vals)) < 1.0:
                return False
        return True

    # ─────────────────────────────────────────────────────────────
    # PHYSICS HELPERS
    # ─────────────────────────────────────────────────────────────
    def _decay_rate(self, temp, humidity, vpd, hour, region_mult):
        """Estimate moisture loss rate (%/hour) — used for duration calc."""
        base        = 0.5
        temp_factor = (1 + (temp - 25) * 0.08) if temp > 25 else 0.7
        vpd_factor  = 1 + (vpd * 0.4)
        time_factor = 1.5 if (10 <= hour <= 16) else (0.3 if (hour >= 22 or hour <= 4) else 1.0)
        return base * temp_factor * vpd_factor * time_factor * region_mult

    def _recommended_duration(self, deficit, decay_rate, root_depth_cm, region_mult, scale_factor):
        """
        Physics-based pump duration:
          - deficit: moisture gap to target (%)
          - larger root depth → more water needed
          - capped at 120s to protect hardware
        """
        root_factor  = max(0.5, root_depth_cm / 60.0)   # normalised around 60cm
        base_seconds = (deficit / 0.5) * region_mult * root_factor
        scaled       = base_seconds * scale_factor
        if scale_factor != 1.0 and base_seconds > 2.0 and scaled < 2.0:
            # Throttled: at bench scales this fires on every prediction cycle
            now = datetime.now()
            last = getattr(self, '_floor_warn_time', None)
            if last is None or (now - last).total_seconds() > 600:
                self._floor_warn_time = now
                logger.warning(
                    f"pump_scale_factor={scale_factor} clamps durations to the 2s "
                    f"floor (unscaled {base_seconds:.0f}s). Duration output is "
                    f"flat at this scale — intentional for bench rigs; use "
                    f"~0.05-0.1 if proportional durations are wanted."
                )
        return round(min(120.0, max(2.0, scaled)), 1)

    # ─────────────────────────────────────────────────────────────
    # XAI: TOP-3 FEATURE DRIVERS
    # ─────────────────────────────────────────────────────────────
    def _top_drivers(self, feature_values: dict, n=3) -> str:
        """Return human-readable top-N feature contributors from metadata."""
        importances = self.metadata.get('feature_importances', {})
        if not importances:
            return ""
        ranked = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:n]
        parts  = []
        for feat, _ in ranked:
            val = feature_values.get(feat)
            if val is not None:
                parts.append(f"{feat.replace('_',' ')}={round(val, 2)}")
        return "  Key drivers: " + ", ".join(parts) if parts else ""

    # ─────────────────────────────────────────────────────────────
    # SUPPRESSION SCORE  (mirrors generate_synthetic_history.py)
    # ─────────────────────────────────────────────────────────────
    def _suppression_score(self, hour, humidity, vpd, precip_chance, month, current_moisture, wilting_point):
        """
        Compute the same environmental suppression used during training.
        Returns a score; high score → system should wait even if ML says water.
        """
        suppression = 0.0

        # Time of day
        if hour >= 21 or hour <= 4:    suppression += 0.50
        elif hour >= 18 or hour <= 6:  suppression += 0.20

        # Humidity
        if humidity >= 85:   suppression += 0.40
        elif humidity >= 70: suppression += 0.20
        elif humidity >= 55: suppression += 0.08

        # Rain forecast
        if precip_chance >= 70:   suppression += 0.50
        elif precip_chance >= 45: suppression += 0.28
        elif precip_chance >= 25: suppression += 0.12

        # Season
        if month in [5, 6, 7, 8, 9]:    suppression += 0.22   # winter
        elif month in [11, 12, 1, 2, 3]: suppression -= 0.08   # summer

        # VPD
        if vpd < 0.25:   suppression += 0.30
        elif vpd < 0.50: suppression += 0.12
        elif vpd > 2.0:  suppression -= 0.10   # heatwave

        # Emergency override
        if current_moisture < wilting_point * 0.65:
            suppression -= 0.90

        return suppression

    # ─────────────────────────────────────────────────────────────
    # MAIN PREDICTION ENTRY POINT
    # ─────────────────────────────────────────────────────────────
    def predict_next_watering(self, current_data: dict, history_df=None, active_settings=None):
        if not self.model:
            return {'error': 'Model not loaded. Run train_model.py first.'}

        now      = datetime.now()
        settings = active_settings or self._get_settings()

        # ── Fetch crop and region from DB (with TTL cache) ─────────
        if self.db is None:
            self.db = PWOSDatabase()
            
        # 60 second TTL cache for crop info
        if not hasattr(self, '_crop_cache_time') or (now - self._crop_cache_time).total_seconds() > 60:
            self._crop_info_cache = self.db.get_active_crop() or {
                'id': 1, 'name': 'Maize', 'target_moisture': 60.0,
                'wilting_point_threshold': 30.0, 'root_depth_cm': 80.0,
                'growth_stage': 2, 'optimal_vpd_min': 0.8, 'optimal_vpd_max': 2.0,
            }
            self._crop_cache_time = now
            
        crop_info = self._crop_info_cache
        region_name = settings.get('active_region', 'matabeleland')
        r_mult      = REGION_MULT.get(region_name, 1.0)

        # ── Raw sensor values ────────────────────────────────────
        moisture  = float(current_data.get('soil_moisture', 50))
        temp      = float(current_data.get('temperature', 25))
        humidity  = float(current_data.get('humidity', 60))
        wind      = float(current_data.get('wind_speed', 0.0))
        rain_int  = float(current_data.get('rain_intensity', 0.0))
        precip    = float(current_data.get('precipitation_chance', 0))
        f_temp    = float(current_data.get('forecast_temp', temp))


        # ── Compute VPD ──────────────────────────────────────────
        vpd = float(calculate_vpd(temp, humidity))

        # ── Weather staleness guard ──────────────────────────────
        weather_source = current_data.get('weather_source', 'simulation')
        stale = weather_source in ('stale', 'fallback', 'none', 'initializing')
        if stale:
            logger.warning(f"Stale weather source '{weather_source}' — zeroing weather features.")
            wind, rain_int, precip, f_temp = 0.0, 0.0, 0.0, temp

        # ── Rolling features from history ────────────────────────
        moisture_rolling_6  = moisture
        moisture_change_rate = 0.0

        if history_df is not None and not history_df.empty:
            df = history_df.copy()
            df['timestamp']   = pd.to_datetime(df['timestamp'], utc=True, errors='coerce')
            latest_ts         = pd.to_datetime(current_data.get('timestamp', now), utc=True, errors='coerce')
            latest_row_df     = pd.DataFrame([{
                'timestamp':    latest_ts,
                'soil_moisture': moisture,
                'temperature':   temp,
            }])
            combined = pd.concat([df, latest_row_df], ignore_index=True).tail(6)

            moisture_rolling_6 = float(combined['soil_moisture'].mean())

            if len(combined) >= 2:
                last, prev = combined.iloc[-1], combined.iloc[-2]
                dt_h = (last['timestamp'] - prev['timestamp']).total_seconds() / 3600.0
                if dt_h > 0.0001:
                    moisture_change_rate = float(
                        (last['soil_moisture'] - prev['soil_moisture']) / dt_h
                    )

        # ── Assemble all 17 features ─────────────────────────────
        features = {
            'soil_moisture':           moisture,
            'temperature':             temp,
            'humidity':                humidity,
            'vpd':                     vpd,
            'precipitation_chance':    precip,
            'forecast_temp':           f_temp,
            'wind_speed':              wind,
            'crop_type_id':            int(crop_info.get('id', 1)),
            'root_depth_cm':           float(crop_info.get('root_depth_cm', 80.0)),
            'wilting_point_threshold': float(crop_info.get('wilting_point_threshold', 30.0)),
            'growth_stage':            int(crop_info.get('growth_stage', 2)),
            'optimal_vpd_min':         float(crop_info.get('optimal_vpd_min', 0.8)),
            'optimal_vpd_max':         float(crop_info.get('optimal_vpd_max', 2.0)),
            'hour':                    now.hour,
            'is_daytime':              1 if 6 <= now.hour <= 18 else 0,
            'moisture_change_rate':    moisture_change_rate,
            'moisture_rolling_6':      moisture_rolling_6,
        }

        # ── ML inference ─────────────────────────────────────────
        # Single predict_proba call; predict() would traverse the forest a
        # second time for information the probabilities already contain.
        X          = pd.DataFrame([[features[f] for f in FEATURES]], columns=FEATURES)
        probs      = self.model.predict_proba(X)[0]
        prediction = int(np.argmax(probs))
        confidence = float(np.max(probs))

        # ── Environmental suppression (same logic as training) ────
        wilting    = features['wilting_point_threshold']
        suppression = self._suppression_score(
            now.hour, humidity, vpd, precip, now.month, moisture, wilting
        )

        # ── Thresholds & decay ───────────────────────────────────
        thresh     = self._seasonal_thresholds(now.month, crop_info)
        decay      = self._decay_rate(temp, humidity, vpd, now.hour, r_mult)
        crop_name  = crop_info.get('name', 'Unknown')
        xai_str    = self._top_drivers(features)

        # ── Scale factor for hardware (pot vs field) ─────────────
        try:
            scale_factor = float(self.db.get_system_setting('pump_scale_factor', '1.0'))
        except Exception:
            scale_factor = 1.0

        # ── Safety checks (run before ML logic) ──────────────────
        is_raining  = rain_int > 0.5
        is_high_wind = wind > 20

        # Currently raining
        if is_raining:
            if moisture < thresh['critical']:
                return self._build('NOW', confidence, probs, features,
                    self._recommended_duration(thresh['target'] - moisture, decay,
                        features['root_depth_cm'], r_mult, scale_factor),
                    'EMERGENCY',
                    f"CRITICAL: Moisture {moisture:.1f}% below {thresh['critical']:.1f}% despite rain. "
                    f"Emergency watering. {xai_str}", moisture)
            return self._build('STOP', 1.0, probs, features, 0, 'RAINING',
                               f"Currently raining ({rain_int:.1f}mm/h). System paused. {xai_str}", moisture)

        # Saturated
        if moisture > thresh['high']:
            return self._build('STOP', 1.0, probs, features, 0, 'SATURATED',
                               f"Soil saturated ({moisture:.1f}%). No watering needed. {xai_str}", moisture)

        # High wind — defer unless critical
        if is_high_wind:
            if moisture < thresh['critical']:
                return self._build('NOW', confidence, probs, features,
                    self._recommended_duration(thresh['target'] - moisture, decay,
                        features['root_depth_cm'], r_mult, scale_factor),
                    'EMERGENCY',
                    f"CRITICAL: Moisture {moisture:.1f}% despite high wind. Emergency watering. {xai_str}", moisture)
            return self._build('STALL', confidence, probs, features, 0, 'WIND_DELAY',
                               f"High wind ({wind:.0f} km/h). Deferring. {xai_str}", moisture)

        # Rain expected — can we wait?
        if precip >= 45 and moisture > thresh['low']:
            return self._build('STALL', confidence, probs, features, 0, 'RAIN_EXPECTED',
                               f"Rain forecast ({precip:.0f}%). Moisture {moisture:.1f}% adequate. Waiting. {xai_str}", moisture)

        # ── ML-driven decision ───────────────────────────────────
        # Adaptive confidence threshold:
        #   lower in emergency (accept uncertain predictions when critical)
        #   higher in winter (require more confidence when suppression is high)
        if moisture < thresh['critical']:
            conf_threshold = 0.55   # emergency: act even on moderate confidence
        elif suppression > 0.30:
            conf_threshold = 0.80   # suppressed environment: require high confidence
        else:
            conf_threshold = 0.70   # normal operating threshold

        if prediction == 1 and confidence >= conf_threshold and suppression < 0.42:
            deficit  = thresh['target'] - moisture
            duration = self._recommended_duration(deficit, decay, features['root_depth_cm'], r_mult, scale_factor)
            reason   = (f"ML: Water {crop_name} now. Moisture {moisture:.1f}% → target {thresh['target']:.1f}%. "
                        f"Conf {confidence*100:.1f}%. Decay {decay:.2f}%/h. {xai_str}")
            return self._build('NOW', confidence, probs, features, duration, 'ML_TRIGGER', reason, moisture)

        if prediction == 1 and confidence >= conf_threshold and suppression >= 0.42:
            reason = (f"ML says water soon but environmental suppression is high "
                      f"(suppression={suppression:.2f}, humidity={humidity:.0f}%, "
                      f"hour={now.hour}, precip={precip:.0f}%). Monitoring. {xai_str}")
            return self._build('STALL', confidence, probs, features, 0, 'ENV_SUPPRESSED', reason, moisture)

        if prediction == 1 and confidence < conf_threshold:
            reason = (f"ML suggests watering {crop_name} (moisture {moisture:.1f}%) "
                      f"but confidence {confidence*100:.1f}% < threshold {conf_threshold*100:.0f}%. "
                      f"Monitoring. {xai_str}")
            return self._build('MONITOR', confidence, probs, features, 0, 'ML_UNCERTAIN', reason, moisture)

        # Default: conditions optimal
        reason = (f"Optimal: {crop_name} moisture {moisture:.1f}% "
                  f"(target {thresh['target']:.1f}%, critical {thresh['critical']:.1f}%). "
                  f"Decay {decay:.2f}%/h. {xai_str}")
        return self._build('MONITOR', confidence, probs, features, 0, 'OPTIMAL', reason, moisture)

    # ─────────────────────────────────────────────────────────────
    # RESPONSE BUILDER
    # ─────────────────────────────────────────────────────────────
    def _build(self, decision, confidence, probs, features, duration, status, reason, moisture):
        return {
            'prediction':             1 if decision == 'NOW' else 0,
            'confidence':             round(confidence * 100, 1),
            'probability_class_1':    round(float(probs[1]) * 100, 1) if probs is not None else 0.0,
            'features_used':          features,
            'recommended_action':     decision,
            'recommended_duration':   round(float(duration), 1),
            'system_status':          status,
            'reason':                 reason,
            'current_moisture':       moisture,
        }


    # ─────────────────────────────────────────────────────────────
    # BACKWARD-COMPATIBLE WRAPPERS — preserve old public API for
    # existing tests (tests/unit/calculations.py, etc.)
    # ─────────────────────────────────────────────────────────────
    def predict_decay_rate(self, temp, humidity, vpd, hour):
        """Backward-compat wrapper → _decay_rate(). Default region_mult=1.0."""
        return self._decay_rate(temp, humidity, vpd, hour, region_mult=1.0)

    def calculate_rain_confidence(self, precipitation_chance, current_moisture):
        """Backward-compat wrapper. Returns (should_wait, confidence, reason)."""
        if precipitation_chance == 0:
            return (False, 0.0, "")
        if precipitation_chance >= 80:
            return (True, 0.95, f"High chance of rain ({precipitation_chance}%).")
        elif precipitation_chance >= 50:
            if current_moisture > 25:
                return (True, 0.75, f"Moderate chance of rain ({precipitation_chance}%). Waiting.")
        elif precipitation_chance >= 30:
            if current_moisture > 40:
                return (True, 0.5, f"Low chance of rain ({precipitation_chance}%). Monitoring.")
        return (False, 0.0, "")

    def check_saturation_risk(self, current_moisture):
        """Backward-compat wrapper. Returns (is_saturated, status, reason)."""
        if current_moisture > 85:
            return (True, "SATURATED", "Soil saturated (>85%).")
        return (False, "", "")

    def detect_false_dry(self, wind_speed, humidity, change_rate):
        """Backward-compat wrapper. Returns (is_false_dry, reason)."""
        if wind_speed > 20 and humidity < 40 and change_rate < -0.5:
            return (True, "False dry suspected (High Wind/Low Hum).")
        return (False, "")

    def check_sensor_validity(self, moisture, history_df=None):
        """Backward-compat wrapper → _check_sensor()."""
        return self._check_sensor(moisture, history_df)

    def get_seasonal_thresholds(self, month, crop_info):
        """Backward-compat wrapper → _seasonal_thresholds()."""
        return self._seasonal_thresholds(month, crop_info)

    def load_model(self):
        """Backward-compat wrapper → _load_model()."""
        return self._load_model()

    def get_active_settings(self):
        """Backward-compat wrapper → _get_settings()."""
        return self._get_settings()

    def _build_response(self, prediction, confidence, probs, features, decision, duration, status, reason):
        """Backward-compat wrapper → _build() with old argument order."""
        return self._build(decision, confidence, probs, features, duration, status, reason,
                           features.get('soil_moisture', 0) if isinstance(features, dict) else 0)


if __name__ == "__main__":
    p      = MLPredictor()
    result = p.predict_next_watering({
        'soil_moisture': 28, 'temperature': 15, 'humidity': 82,
        'wind_speed': 5, 'precipitation_chance': 20,
        'forecast_temp': 14, 'weather_source': 'simulation',
    })
    print(json.dumps({k: v for k, v in result.items() if k != 'features_used'}, indent=2))
