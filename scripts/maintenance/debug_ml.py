
import sys
import os
import pandas as pd
import numpy as np
import json

# Add backend to path (adjusted for scripts/ directory)
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'backend'))

from models.ml_predictor import MLPredictor

def debug():
    predictor = MLPredictor()
    
    print("--- Model Debug ---")
    print(f"Features expected: {predictor.metadata.get('features')}")
    
    # Test Case 1: Needs Water (Dry) but Rain Incoming -> Should STALL
    data = {
        'soil_moisture': 25.0, # Dry (<30)
        'temperature': 25.0,
        'humidity': 50.0,
        'forecast_minutes': 60 # Rain in 1 hour
    }
    
    print(f"\nEvaluating Input: {data}")
    
    result = predictor.predict_next_watering(data)
    
    print("\n--- Result ---")
    print(json.dumps(result, indent=2))
    
    # Inspect internal feature construction (hacky but useful)
    # Re-running the internal logic of predict_next_watering to print features
    
if __name__ == '__main__':
    debug()
