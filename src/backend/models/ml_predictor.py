import joblib
import pandas as pd
import numpy as np
import os
import json
from datetime import datetime
import warnings

# Suppress sklearn feature name warnings
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODEL_PATH = os.path.join(BASE_DIR, 'src', 'backend', 'models', 'artifacts', 'rf_model.pkl')
METADATA_PATH = os.path.join(BASE_DIR, 'src', 'backend', 'models', 'artifacts', 'model_metadata.json')

class MLPredictor:
    def __init__(self):
        self.model = None
        self.metadata = {}
        self.load_model()
        
    def load_model(self):
        """Load the trained model and metadata"""
        if os.path.exists(MODEL_PATH):
            print(f"[ML] Loading model from {MODEL_PATH}")
            self.model = joblib.load(MODEL_PATH)
            
            with open(METADATA_PATH, 'r') as f:
                self.metadata = json.load(f)
        else:
            print(f"[ML-ERROR] Model not found at {MODEL_PATH}")
            
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
        
        if history_df is not None and not history_df.empty:
            # Calculate real rolling/rate if history provided
            pass
            
        # Convert to DataFrame (ensure column order matches training)
        training_features = self.metadata.get('features', [])
        
        # Fill strictly in order
        input_data = []
        for col in training_features:
            input_data.append(features.get(col, 0))
            
        # Reshape for sklearn
        X = np.array(input_data).reshape(1, -1)
        
        # 2. Predict
        prediction = self.model.predict(X)[0]
        probs = self.model.predict_proba(X)[0]
        confidence = float(np.max(probs))
        
        # 3. Intelligent Control Logic (Centralized)
        
        # Configurable Thresholds
        CRITICAL_THRESHOLD = 10.0    # Emergency - must water regardless
        LOW_THRESHOLD = 30.0         # Standard watering trigger
        PROACTIVE_THRESHOLD = 45.0   # Consider stalling if rain coming
        HIGH_THRESHOLD = 75.0        # No watering needed
        RAIN_WINDOW_MINUTES = 6 * 60 # 6 hours - proactive rain window
        
        # Default State
        decision = "WAIT"
        status = "MONITORING"
        reason = "Soil moisture is stable."

        current_moisture = features['soil_moisture']
        forecast_mins = features['forecast_minutes']
        rain_incoming = 0 < forecast_mins < (12 * 60)  # Rain within 12h
        rain_imminent = 0 < forecast_mins < RAIN_WINDOW_MINUTES  # Rain within 6h
        
        # 3.1 HIGH MOISTURE - No action needed
        if current_moisture > HIGH_THRESHOLD:
            decision = "WAIT"
            status = "OPTIMAL"
            reason = f"Moisture high ({current_moisture:.1f}%). No action needed."
        
        # 3.2 CRITICAL LOW - Emergency override (ignores rain)
        elif current_moisture < CRITICAL_THRESHOLD:
            decision = "WATER_NOW"
            status = "EMERGENCY_OVERRIDE"
            reason = f"CRITICAL: Moisture at {current_moisture:.1f}%. Emergency watering."
        
        # 3.3 LOW MOISTURE (<30%) - Standard trigger with rain check
        elif current_moisture < LOW_THRESHOLD:
            if rain_incoming:
                decision = "STALL"
                status = "RAIN_DELAY"
                reason = f"Moisture low ({current_moisture:.1f}%) but rain in {forecast_mins}m. Stalling."
            else:
                decision = "WATER_NOW"
                status = "DRY_TRIGGER"
                reason = f"Moisture below {LOW_THRESHOLD}%. Watering required."
        
        # 3.4 PROACTIVE ZONE (30-45%) - Only stall if rain is imminent, otherwise wait
        elif current_moisture < PROACTIVE_THRESHOLD:
            if rain_imminent:
                # Rain coming soon, let it do the work
                decision = "STALL"
                status = "PROACTIVE_DELAY"
                reason = f"Moisture at {current_moisture:.1f}%, rain in {forecast_mins}m. Delaying to save water."
            else:
                # No rain coming, just monitor (don't proactively water - wait for <30%)
                decision = "WAIT"
                status = "MONITORING"
                reason = f"Moisture at {current_moisture:.1f}%. Waiting for standard threshold."
        
        # 3.5 COMFORTABLE ZONE (45-75%) - Only act on ML + rain forecast
        else:
            if rain_imminent:
                decision = "WAIT"
                status = "RAIN_EXPECTED"
                reason = f"Rain expected in {forecast_mins}m. No action needed."
            elif prediction == 1 and current_moisture < 55.0:
                # ML thinks we're drying, consider early action
                decision = "WAIT"  # Be conservative, just monitor
                status = "ML_WATCH"
                reason = f"ML detects drying trend. Watching closely."
            else:
                decision = "WAIT"
                status = "OPTIMAL"
                reason = f"Moisture at {current_moisture:.1f}%. System optimal."
        
        # 4. Calculate Duration (Smart Watering)
        # Goal: Rate of 0.5% moisture increase per second (calibrated)
        # Target: 60% moisture
        target_moisture = 60.0
        fill_rate_per_sec = 0.5
        
        recommended_duration = 0
        
        if decision == "WATER_NOW":
            if current_moisture < target_moisture:
                deficit = target_moisture - current_moisture
                raw_duration = deficit / fill_rate_per_sec
                # Clamp duration (Min 5s, Max 60s for safety)
                recommended_duration = max(5, min(60, int(raw_duration)))
                reason += f" Need {recommended_duration}s to reach {target_moisture}%."
            else:
                # Catch-all: If for some reason we decided to water but are above target
                # (e.g. slight logic gap or override), just give 5s burst or 0.
                if status == "EMERGENCY_OVERRIDE":
                     recommended_duration = 10
                     reason += " Emergency Burst."
                else:
                     recommended_duration = 5
                     reason += " (Top-up)"
            
        return {
            'prediction': int(prediction), # Raw ML
            'confidence': round(confidence * 100, 1),
            'probability_class_1': round(float(probs[1]) * 100, 1),
            'features_used': features,
            
            # Final Decision
            'recommended_action': decision,
            'recommended_duration': recommended_duration,
            'system_status': status,
            'reason': reason
        }

if __name__ == "__main__":
    # Test
    predictor = MLPredictor()
    result = predictor.predict_next_watering({
        'soil_moisture': 25,
        'temperature': 30,
        'forecast_minutes': 0
    })
    print(json.dumps(result, indent=2))
