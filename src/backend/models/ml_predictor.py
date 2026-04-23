import joblib
import logging
import pandas as pd
import numpy as np
import os
import json
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from log_config import setup_logger
logger = setup_logger("MLPredictor", "ml_predictor.log", "app")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODEL_PATH = os.path.join(BASE_DIR, 'src', 'backend', 'models', 'artifacts', 'rf_model.pkl')
METADATA_PATH = os.path.join(BASE_DIR, 'src', 'backend', 'models', 'artifacts', 'model_metadata.json')

class MLPredictor:
    def __init__(self):
        self.model = None
        self.metadata = {}
        self.load_model()

    def _build_response(self, prediction, confidence, probs, features, decision, duration, status, reason):
        return {
            'prediction': int(prediction),
            'confidence': round(confidence * 100, 1),
            'probability_class_1': round(float(probs[1]) * 100, 1) if probs is not None else 0,
            'features_used': features,
            'recommended_action': decision,
            'recommended_duration': duration,
            'system_status': status,
            'reason': reason
        }
        
    def load_model(self):
        """Load the trained model and metadata"""
        if os.path.exists(MODEL_PATH):
            logger.info(f"Loading model from {MODEL_PATH}")
            self.model = joblib.load(MODEL_PATH)
            
            with open(METADATA_PATH, 'r') as f:
                self.metadata = json.load(f)
        else:
            logger.error(f"Model not found at {MODEL_PATH}")
    def get_seasonal_thresholds(self, month):
        """
        Adjust moisture thresholds based on season (Southern Hemisphere - Zimbabwe).
        Summer (Nov-Mar): Hot, high evap -> Higher thresholds
        Winter (May-Sep): Cool, low evap -> Lower thresholds
        """
        if month in [11, 12, 1, 2, 3]:  # Summer
            return {'critical': 15, 'low': 35, 'proactive': 50, 'high': 80}
        elif month in [5, 6, 7, 8, 9]:  # Winter
            return {'critical': 10, 'low': 25, 'proactive': 40, 'high': 70}
        else:  # Autumn/Spring
            return {'critical': 12, 'low': 30, 'proactive': 45, 'high': 75}

    def predict_decay_rate(self, temp, humidity, vpd, hour):
        """Predict moisture loss rate (%/hour)."""
        base_decay = 0.5
        temp_factor = 1 + (temp - 25) * 0.08 if temp > 25 else 0.7
        vpd_factor = 1 + (vpd * 0.4)
        
        time_factor = 1.0
        if 10 <= hour <= 16: time_factor = 1.5
        elif 22 <= hour or hour <= 4: time_factor = 0.3
            
        return base_decay * temp_factor * vpd_factor * time_factor

    def calculate_rain_confidence(self, forecast_minutes, current_moisture):
        """Return (should_wait, confidence, reason)"""
        if forecast_minutes == 0: return (False, 0.0, "")
        
        hours_until_rain = forecast_minutes / 60.0
        
        if hours_until_rain < 2:
            return (True, 0.95, f"Rain immiment ({hours_until_rain:.1f}h).")
        elif hours_until_rain < 6:
            # Can we wait?
            if current_moisture > 25:
                return (True, 0.75, f"Rain in {hours_until_rain:.1f}h. Waiting.")
        elif hours_until_rain < 12:
            if current_moisture > 40:
                return (True, 0.5, f"Rain in {hours_until_rain:.1f}h. Monitoring.")
                
        return (False, 0.0, "")

    def check_saturation_risk(self, current_moisture):
        """Prevent overwatering."""
        if current_moisture > 85:
            return (True, "SATURATED", "Soil saturated (>85%).")
        return (False, "", "")

    def detect_false_dry(self, wind_speed, humidity, change_rate):
        """Detect if sensor is drying faster than soil."""
        if wind_speed > 20 and humidity < 40 and change_rate < -0.5:
            return (True, "False dry suspected (High Wind/Low Hum).")
        return (False, "")

    def predict_next_watering(self, current_data, history_df=None):
        """
        Predict if watering is needed in next 24 hours.
        Returns: {
            'prediction': 0 or 1,
            'confidence': float (0-1),
            'reason': str
        }
        """
        if not self.model:
            return {'error': 'Model not loaded'}
            
        # 1. Prepare Features (match training columns)
        # Training cols: ['soil_moisture', 'temperature', 'humidity', 'forecast_minutes', 'hour', 'day_of_week', 'is_daytime', 'is_hot_hours', 'moisture_change_rate', 'moisture_rolling_6', 'temp_rolling_6']
        
        now = datetime.now()
        
        # Base features
        features = {
            'soil_moisture': current_data.get('soil_moisture', 50),
            'temperature': current_data.get('temperature', 25),
            'humidity': current_data.get('humidity', 60),
            'forecast_minutes': current_data.get('forecast_minutes', 0),
            'hour': now.hour,
            'day_of_week': now.weekday(),
            'is_daytime': 1 if 6 <= now.hour <= 18 else 0,
            'is_hot_hours': 1 if 10 <= now.hour <= 16 else 0
        }
        
        # Calculate derived features (Rolling / Rate)
        features['moisture_change_rate'] = 0.0
        features['moisture_rolling_6'] = features['soil_moisture']
        features['temp_rolling_6'] = features['temperature']
        
        # ===================================================
        # NEW: VPD & Extreme Scenario Features
        # ===================================================
        temp = features['temperature']
        humidity = features['humidity']
        
        # VPD Calculation (Tetens formula)
        es = 0.6108 * np.exp((17.27 * temp) / (temp + 237.3))
        ea = es * (humidity / 100.0)
        vpd = max(0, es - ea)
        features['vpd'] = vpd
        
        # Extreme VPD flag (Heatwave: VPD > 2.0 kPa)
        features['is_extreme_vpd'] = 1 if vpd > 2.0 else 0
        
        # Wind speed (from weather data or default 0)
        features['wind_speed'] = current_data.get('wind_speed', 0.0)
        
        # Rain intensity (from weather data or default 0)
        features['rain_intensity'] = current_data.get('rain_intensity', 0.0)
        
        # Is raining flag
        features['is_raining'] = 1 if features['rain_intensity'] > 0 else 0
        
        # High wind flag (False Dry: > 20 km/h)
        features['is_high_wind'] = 1 if features['wind_speed'] > 20 else 0
        
        # P4: Weather staleness guard — zero out weather features if source is stale
        weather_source = current_data.get('weather_source', 'none')
        if weather_source in ('stale', 'fallback', 'none'):
            logger.warning(f"Weather source is '{weather_source}' — zeroing weather features for safety")
            features['forecast_minutes'] = 0
            features['wind_speed'] = 0.0
            features['rain_intensity'] = 0.0
            features['is_raining'] = 0
            features['is_high_wind'] = 0
        
        if history_df is not None and not history_df.empty:
            # Calculate real rolling/rate if history provided
            pass
            
        # Convert to DataFrame (ensure column order matches training)
        training_features = self.metadata.get('features', [])
        
        # Fill strictly in order
        input_data = []
        for col in training_features:
            input_data.append(features.get(col, 0))
            
        # Build DataFrame with feature names to match training data
        try:
            X = pd.DataFrame([input_data], columns=training_features)
        except Exception as e:
            logger.critical(f"Input Data: {input_data}")
            raise e
        
        # 2. Predict
        prediction = self.model.predict(X)[0]
        probs = self.model.predict_proba(X)[0]
        confidence = float(np.max(probs))
        
        # 3. Intelligent Control Logic (Centralized with VPD-Aware Timing)
        
        # =====================================================
        # 1. SETUP & UTILS
        # =====================================================
        current_moisture = features['soil_moisture']
        thresholds = self.get_seasonal_thresholds(now.month)
        CRITICAL_THRESHOLD = thresholds['critical']
        LOW_THRESHOLD = thresholds['low']
        PROACTIVE_THRESHOLD = thresholds['proactive']
        HIGH_THRESHOLD = thresholds['high']
        
        decay_rate = self.predict_decay_rate(features['temperature'], features['humidity'], vpd, now.hour)
        
        # Default State
        decision = "MONITOR"
        status = "STABLE"
        reason = f"Moisture {current_moisture:.1f}%. Decay: {decay_rate:.2f}%/h."

        # Environmental Checks
        is_raining_now = features.get('is_raining', 0) == 1
        is_high_wind = features.get('is_high_wind', 0) == 1
        
        # Saturation Check
        is_saturated, sat_status, sat_reason = self.check_saturation_risk(current_moisture)
        
        # Rain Confidence
        should_wait_rain, rain_conf, rain_reason = self.calculate_rain_confidence(features['forecast_minutes'], current_moisture)
        
        # False Dry Check
        is_false_dry, fd_reason = self.detect_false_dry(features['wind_speed'], features['humidity'], features.get('moisture_change_rate', 0))

        # =====================================================
        # 2. DECISION LOGIC (Standardized: NOW, STALL, STOP, MONITOR)
        # =====================================================
        
        # 2.1 STOP / STALL CONDITIONS (Safety First)
        if is_raining_now:
            if current_moisture < CRITICAL_THRESHOLD:
                decision = "NOW"
                status = "EMERGENCY"
                reason = "Water pump is turned ON (CRITICAL moisture despite rain)."
            else:
                decision = "STOP"
                status = "RAINING"
                reason = "System stopped: Currently raining."
                
        elif is_saturated:
            decision = "STOP"
            status = "SATURATED"
            reason = f"System stopped: {sat_reason}"
            
        elif is_high_wind:
            if current_moisture < CRITICAL_THRESHOLD:
                decision = "NOW"
                status = "EMERGENCY"
                reason = "Water pump is turned ON (CRITICAL moisture despite wind)."
            else:
                decision = "STALL"
                status = "WIND_DELAY"
                reason = f"Wind too high ({features.get('wind_speed')} km/h). Stalling."
                
        elif should_wait_rain:
            if current_moisture < CRITICAL_THRESHOLD:
                decision = "NOW"
                status = "EMERGENCY"
                reason = "Water pump is turned ON (CRITICAL moisture, cannot wait for rain)."
            else:
                decision = "STALL"
                status = "RAIN_EXPECTED"
                reason = rain_reason
                
        elif is_false_dry:
            decision = "MONITOR"
            status = "FALSE_DRY_CHECK"
            reason = f"Monitoring: {fd_reason}"

        # 2.2 WATERING LOGIC
        else:
            # CRITICAL
            if current_moisture < CRITICAL_THRESHOLD:
                decision = "NOW"
                status = "CRITICAL"
                reason = "Water pump is turned ON (Critically low moisture)."
                
            # LOW (Action Needed)
            elif current_moisture < LOW_THRESHOLD:
                # VPD / Time Checks
                is_high_evap = 10 <= now.hour <= 16
                is_extreme_vpd = vpd > 3.0
                
                if is_extreme_vpd and is_high_evap:
                    decision = "STALL"
                    status = "VPD_DELAY"
                    reason = f"VPD extreme ({vpd:.2f}kPa) at midday. Stalling until evening."
                else:
                    decision = "NOW"
                    status = "DRY_TRIGGER"
                    reason = "Water pump is turned ON (Moisture below threshold)."

            # PROACTIVE (Optimizations)
            elif current_moisture < PROACTIVE_THRESHOLD:
                # Pre-heat watering?
                is_morning = 4 <= now.hour <= 6
                if is_morning and features.get('is_extreme_vpd', 0) == 1:
                     decision = "NOW"
                     status = "PREHEAT"
                     reason = "Water pump is turned ON (Proactive morning top-up for hot day)."
                else:
                     decision = "MONITOR"
                     status = "WATCHING"
                     reason = f"Moisture stable. Decay rate {decay_rate:.2f}%/h."
            
            # HIGH
            else:
                decision = "MONITOR"
                status = "OPTIMAL"
                reason = "Soil moisture is optimal."

        # 3. DURATION CALCULATION
        recommended_duration = 0
        target_moisture = 60.0
        if decision == "NOW":
            deficit = target_moisture - current_moisture
            recommended_duration = max(5, min(60, int(deficit / 0.5)))
            # If prompt says "Water pump is turned ON", let's append duration for logging
            # But the UI message is strictly the reason
            pass

            
        return self._build_response(prediction, confidence, probs, features, 
                                   decision, recommended_duration, status, reason)

if __name__ == "__main__":
    # Test
    predictor = MLPredictor()
    result = predictor.predict_next_watering({
        'soil_moisture': 25,
        'temperature': 30,
        'forecast_minutes': 0
    })
    print(json.dumps(result, indent=2))
