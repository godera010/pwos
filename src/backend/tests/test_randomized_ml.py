import sys
import os
import random
from datetime import datetime, timedelta
from unittest.mock import patch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.ml_predictor import MLPredictor

def generate_random_scenario():
    # 1. Pick a random day, month, and hour
    random_day = random.randint(1, 28)
    random_month = random.randint(1, 12)
    random_hour = random.randint(0, 23)
    mock_date = datetime(2026, random_month, random_day, random_hour, 0, 0)
    
    # 2. Pick a random weather type to drive realistic sensor bounds
    weather_types = ["CLEAR_DAY", "HEATWAVE", "STORM", "WINDY_NIGHT", "CLOUDY_AFTERNOON"]
    w_type = random.choice(weather_types)
    
    if w_type == "CLEAR_DAY":
        temp = random.uniform(20.0, 28.0)
        humidity = random.uniform(40.0, 60.0)
        wind = random.uniform(2.0, 10.0)
        rain = 0.0
    elif w_type == "HEATWAVE":
        temp = random.uniform(33.0, 42.0)
        humidity = random.uniform(10.0, 30.0)
        wind = random.uniform(0.0, 15.0)
        rain = 0.0
    elif w_type == "STORM":
        temp = random.uniform(15.0, 22.0)
        humidity = random.uniform(80.0, 100.0)
        wind = random.uniform(15.0, 45.0)
        rain = random.uniform(5.0, 30.0)
    elif w_type == "WINDY_NIGHT":
        temp = random.uniform(10.0, 18.0)
        humidity = random.uniform(50.0, 70.0)
        wind = random.uniform(20.0, 40.0)
        rain = 0.0
    else: # CLOUDY_AFTERNOON
        temp = random.uniform(18.0, 24.0)
        humidity = random.uniform(60.0, 80.0)
        wind = random.uniform(5.0, 15.0)
        rain = random.uniform(0.0, 2.0)
        
    # 3. Random soil moisture independent of weather (could be dry or wet)
    moisture = random.uniform(10.0, 95.0)
    
    data = {
        'soil_moisture': round(moisture, 1),
        'temperature': round(temp, 1),
        'humidity': round(humidity, 1),
        'forecast_minutes': 0,
        'wind_speed': round(wind, 1),
        'rain_intensity': round(rain, 1),
        'weather_source': 'openweather'
    }
    
    # 4. Random Crop Type
    crop_types = ['maize', 'potato', 'tomato', 'onion', 'sorghum']
    crop = random.choice(crop_types)
    
    return w_type, mock_date, data, crop

def run_comprehensive_random_tests(num_tests=10):
    print("=" * 70)
    print(f"RUNNING {num_tests} COMPREHENSIVE RANDOM ML TESTS")
    print("=" * 70)
    
    predictor = MLPredictor()
    
    for i in range(1, num_tests + 1):
        w_type, mock_date, data, crop = generate_random_scenario()
        
        # Format the time nicely
        season = "Summer" if 6 <= mock_date.month <= 8 else "Winter" if mock_date.month in (12, 1, 2) else "Spring/Fall"
        time_str = mock_date.strftime("%B %d, %H:00")
        
        print(f"\n[Test {i} - {time_str} ({season}) - Weather: {w_type} | Crop: {crop.upper()}]")
        print(f"Sensors: Moisture {data['soil_moisture']}%, Temp {data['temperature']}C, Hum {data['humidity']}%, Wind {data['wind_speed']}km/h, Rain {data['rain_intensity']}mm")
        
        try:
            # Patch datetime so the ML model thinks it is the mock_date!
            with patch('models.ml_predictor.datetime') as mock_dt:
                mock_dt.now.return_value = mock_date
                
                result = predictor.predict_next_watering(data, active_settings={'active_crop': crop, 'active_region': 'matabeleland'})
                
                decision = result.get('recommended_action', 'UNKNOWN')
                conf = result.get('confidence', 0)
                reason = result.get('reason', '')
                status = result.get('system_status', '')
                
                print(f"-> ML Decision: {decision} ({status}) | Confidence: {conf}%")
                print(f"-> ML Reason:   {reason}")
            
        except Exception as e:
            print(f"-> Error testing scenario: {e}")

if __name__ == "__main__":
    run_comprehensive_random_tests(10)
