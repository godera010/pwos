import sys
import os
import json

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.ml_predictor import MLPredictor

def run_tests():
    print("=" * 60)
    print("TESTING ML PREDICTOR (ON ITS OWN)")
    print("=" * 60)
    
    predictor = MLPredictor()
    
    # Define scenarios to test
    scenarios = [
        {
            "name": "1. Normal Optimal Condition (Maize)",
            "data": {
                'soil_moisture': 65.0, # Above target (60)
                'temperature': 25.0,
                'humidity': 50.0,
                'forecast_minutes': 0,
                'wind_speed': 5.0,
                'rain_intensity': 0.0,
                'weather_source': 'openweather'
            }
        },
        {
            "name": "2. Critically Dry, No Rain (Maize)",
            "data": {
                'soil_moisture': 28.0, # Below critical (30)
                'temperature': 30.0,
                'humidity': 30.0,
                'forecast_minutes': 0,
                'wind_speed': 5.0,
                'rain_intensity': 0.0,
                'weather_source': 'openweather'
            }
        },
        {
            "name": "3. Critically Dry, But Raining NOW (Safety Guard Test)",
            "data": {
                'soil_moisture': 28.0,
                'temperature': 22.0,
                'humidity': 90.0,
                'forecast_minutes': 0,
                'wind_speed': 5.0,
                'rain_intensity': 15.0, # Raining!
                'weather_source': 'openweather'
            }
        },
        {
            "name": "4. Proactive Heatwave Defense (Early Morning, High Temp upcoming)",
            "data": {
                'soil_moisture': 52.0, # Proactive range (below 55)
                'temperature': 35.0, # Extreme heat
                'humidity': 20.0,    # Very dry -> Extreme VPD
                'forecast_minutes': 0,
                'wind_speed': 5.0,
                'rain_intensity': 0.0,
                'weather_source': 'openweather'
            }
        },
        {
            "name": "5. False Dry (High wind, dropping moisture, but soil not critical)",
            "data": {
                'soil_moisture': 40.0, 
                'temperature': 25.0,
                'humidity': 35.0,
                'forecast_minutes': 0,
                'wind_speed': 25.0, # High wind!
                'rain_intensity': 0.0,
                'weather_source': 'openweather'
            }
        },
        {
            "name": "6. Saturated Soil",
            "data": {
                'soil_moisture': 90.0, # Saturated!
                'temperature': 20.0,
                'humidity': 60.0,
                'forecast_minutes': 0,
                'wind_speed': 2.0,
                'rain_intensity': 0.0,
                'weather_source': 'openweather'
            }
        }
    ]
    
    for idx, scenario in enumerate(scenarios):
        print(f"\n[{scenario['name']}]")
        print(f"Inputs: Moisture: {scenario['data']['soil_moisture']}%, Temp: {scenario['data']['temperature']}C, Rain: {scenario['data']['rain_intensity']}mm")
        
        try:
            result = predictor.predict_next_watering(scenario['data'])
            
            # Print important outputs
            decision = result.get('recommended_action', 'UNKNOWN')
            conf = result.get('confidence', 0)
            reason = result.get('reason', '')
            status = result.get('system_status', '')
            
            print(f"-> Decision:   {decision} ({status})")
            print(f"-> Confidence: {conf}%")
            print(f"-> Reason:     {reason}")
            
        except Exception as e:
            print(f"-> Error testing scenario: {e}")

if __name__ == "__main__":
    run_tests()
