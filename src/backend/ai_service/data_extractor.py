"""
Data Extractor for P-WOS Self-Retraining
Extracts sensor readings and watering events from PostgreSQL and merges them
with real open-source agricultural datasets for Maize, Potatoes, Tomatoes, Onions, and Sorghum.
"""

import logging
import os
import sys
import pandas as pd
import numpy as np
from datetime import timedelta
import ssl

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from log_config import setup_logger
logger = setup_logger("DataExtractor", "data_extractor.log", "app")

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import PWOSDatabase

# Standard Crop Parameters Dict based on FAO AquaCrop
CROP_PARAMS = {
    'maize': {'target': 60.0, 'critical': 30.0, 'multiplier': 1.0},
    'potato': {'target': 70.0, 'critical': 45.0, 'multiplier': 1.4},
    'tomato': {'target': 62.0, 'critical': 35.0, 'multiplier': 1.2},
    'onion': {'target': 65.0, 'critical': 40.0, 'multiplier': 0.8},
    'sorghum': {'target': 50.0, 'critical': 20.0, 'multiplier': 0.6}
}

def load_zimbabwe_weather_data(region):
    """Loads and cleans real Visual Crossing historical weather data for Zimbabwe regions."""
    logger.info(f"Ingesting real weather data for region: {region}...")
    filename_map = {
        'matabeleland': 'data/Bulawayo, Zimbabwe last15days.csv',
        'manicaland': 'data/Mutare, Zimbabwe last15days.csv',
        'mashonaland': 'data/Harare, Zimbabwe last15days.csv'
    }
    filepath = filename_map.get(region)
    if not filepath or not os.path.exists(filepath):
        logger.warning(f"Weather dataset for {region} not found at {filepath}")
        return None
        
    try:
        df = pd.read_csv(filepath)
        df_out = pd.DataFrame()
        df_out['temperature'] = pd.to_numeric(df['temp'], errors='coerce')
        df_out['humidity'] = pd.to_numeric(df['humidity'], errors='coerce')
        df_out['wind_speed'] = pd.to_numeric(df['windspeed'], errors='coerce')
        df_out['rain_intensity'] = pd.to_numeric(df['precip'], errors='coerce').fillna(0.0)
        
        # Calculate VPD
        es = 0.6108 * np.exp((17.27 * df_out['temperature']) / (df_out['temperature'] + 237.3))
        ea = es * (df_out['humidity'] / 100.0)
        df_out['vpd'] = es - ea
        df_out['vpd'] = df_out['vpd'].clip(lower=0)
        
        df_out = df_out.dropna()
        logger.info(f"Loaded {len(df_out)} weather records for {region}")
        return df_out
    except Exception as e:
        logger.error(f"Failed to load weather data for {region}: {e}")
        return None

def load_mendeley_tomato_data():
    """Loads and cleans real Mendeley Tomato IoT sensor logs."""
    logger.info("Ingesting real Mendeley Tomato Cultivation IoT dataset...")
    try:
        soil_path = "data/raw/tomato_mendeley/stuard_soil_data.csv"
        env_path = "data/raw/tomato_mendeley/stuard_environmental_data.csv"
        if not os.path.exists(soil_path) or not os.path.exists(env_path):
            logger.warning("Mendeley Tomato dataset files not found. Skipping.")
            return None
            
        df_soil = pd.read_csv(soil_path)
        df_env = pd.read_csv(env_path)
        
        # Ensure ts_generation is numeric (drop string/null values if any)
        df_soil['ts_generation'] = pd.to_numeric(df_soil['ts_generation'], errors='coerce')
        df_env['ts_generation'] = pd.to_numeric(df_env['ts_generation'], errors='coerce')
        df_soil = df_soil.dropna(subset=['ts_generation'])
        df_env = df_env.dropna(subset=['ts_generation'])
        
        # Round timestamps to nearest 10 minutes to join them
        df_soil['ts_round'] = (df_soil['ts_generation'].astype(int) // 600000) * 600000
        df_env['ts_round'] = (df_env['ts_generation'].astype(int) // 600000) * 600000
        
        df_merged = pd.merge(df_soil, df_env, on='ts_round', suffixes=('_soil', '_air'))
        
        # Extract and align features, forcing mixed types (like "NULL") to NaN and dropping them
        df_out = pd.DataFrame()
        df_out['soil_moisture'] = pd.to_numeric(df_merged['humidity_soil'], errors='coerce')
        df_out['temperature'] = pd.to_numeric(df_merged['temperature_air'], errors='coerce')
        df_out['humidity'] = pd.to_numeric(df_merged['humidity_air'], errors='coerce')
        df_out['wind_speed'] = 2.5  # Default moderate wind speed for Parma field
        df_out['rain_intensity'] = 0.0
        
        # Calculate VPD
        es = 0.6108 * np.exp((17.27 * df_out['temperature']) / (df_out['temperature'] + 237.3))
        ea = es * (df_out['humidity'] / 100.0)
        df_out['vpd'] = es - ea
        df_out['vpd'] = df_out['vpd'].clip(lower=0)
        
        # Biological thresholds
        df_out['crop_target_moisture'] = 62.0
        df_out['crop_critical_moisture'] = 35.0
        df_out['region_evap_multiplier'] = 1.2
        
        # Determine labels based on Tomato critical threshold
        df_out['needs_watering_soon'] = (df_out['soil_moisture'] < 42.0).astype(int)
        
        df_out = df_out.dropna().sample(n=min(len(df_out), 15000), random_state=42)
        logger.info(f"Loaded {len(df_out)} real Tomato IoT readings")
        return df_out
    except Exception as e:
        logger.error(f"Failed to load Mendeley Tomato data: {e}")
        return None

def load_zenodo_maize_data():
    """Loads and cleans real Zenodo Maize-Cowpea arid farming sensor logs."""
    logger.info("Ingesting real Zenodo Maize Arid farming dataset...")
    try:
        logger_path = "data/raw/maize_cowpea/datalogger1_Raw.txt"
        weather_path = "data/raw/maize_cowpea/weatherData.txt"
        if not os.path.exists(logger_path) or not os.path.exists(weather_path):
            logger.warning("Zenodo Maize dataset files not found. Skipping.")
            return None
            
        df_log = pd.read_csv(logger_path)
        df_weather = pd.read_csv(weather_path)
        
        # Merge on time
        df_merged = pd.merge(df_log, df_weather, on='Time')
        
        df_out = pd.DataFrame()
        # Volumetric moisture to percentage conversion (multiply by 200 to scale typical 0.10-0.45 range to 20-90%)
        df_out['soil_moisture'] = (df_merged['Theta_IC1_10cm'].clip(lower=0) * 200).clip(upper=100)
        df_out['temperature'] = df_merged['AirTC']
        df_out['humidity'] = df_merged['RH']
        df_out['wind_speed'] = df_merged['WS'] * 3.6  # Convert m/s to km/h
        df_out['rain_intensity'] = df_merged['Rain']
        
        # Calculate VPD
        es = 0.6108 * np.exp((17.27 * df_out['temperature']) / (df_out['temperature'] + 237.3))
        ea = es * (df_out['humidity'] / 100.0)
        df_out['vpd'] = es - ea
        df_out['vpd'] = df_out['vpd'].clip(lower=0)
        
        # Biological thresholds
        df_out['crop_target_moisture'] = 60.0
        df_out['crop_critical_moisture'] = 30.0
        df_out['region_evap_multiplier'] = 1.0
        
        # Determine labels based on Maize critical threshold
        df_out['needs_watering_soon'] = (df_out['soil_moisture'] < 38.0).astype(int)
        
        df_out = df_out.dropna().sample(n=min(len(df_out), 15000), random_state=42)
        logger.info(f"Loaded {len(df_out)} real Maize Arid sensor readings")
        return df_out
    except Exception as e:
        logger.error(f"Failed to load Zenodo Maize data: {e}")
        return None

def extract_and_label_data(output_path=None):
    logger.info("=" * 60)
    logger.info("DATA EXTRACTOR - HYBRID DATASET FUSION PIPELINE")
    logger.info("=" * 60)
    
    db = PWOSDatabase()
    
    try:
        conn = db.get_connection()
        
        # 1. Fetch Sensor Readings
        logger.info("Retrieving sensor readings from Postgres...")
        query_readings = """
            SELECT timestamp, soil_moisture, temperature, humidity, 
                   wind_speed, rain_intensity, vpd
            FROM sensor_readings
            ORDER BY timestamp ASC
        """
        df_readings = pd.read_sql(query_readings, conn)
        logger.info(f"Fetched {len(df_readings)} local reading samples")
        
        # 2. Fetch Watering Events
        logger.info("Retrieving watering events from Postgres...")
        query_events = """
            SELECT timestamp as water_time, duration_seconds, trigger_type
            FROM watering_events
            ORDER BY timestamp ASC
        """
        df_events = pd.read_sql(query_events, conn)
        logger.info(f"Fetched {len(df_events)} watering events")
        
        conn.close()
        
        if len(df_readings) == 0:
            logger.error("No sensor readings found. Cannot proceed.")
            return None

        # 3. Label local data based on watering events
        logger.info("Labeling local telemetry based on watering history...")
        df_readings['timestamp'] = pd.to_datetime(df_readings['timestamp'])
        df_events['water_time'] = pd.to_datetime(df_events['water_time'])
        df_readings = df_readings.sort_values('timestamp')
        df_events = df_events.sort_values('water_time')
        
        df_readings['needs_watering_soon'] = 0
        LOOKBACK_WINDOW = timedelta(hours=2)
        
        for _, event in df_events.iterrows():
            water_time = event['water_time']
            start_time = water_time - LOOKBACK_WINDOW
            mask = (df_readings['timestamp'] >= start_time) & (df_readings['timestamp'] <= water_time)
            df_readings.loc[mask, 'needs_watering_soon'] = 1
            
        # Clean local dataframe
        export_cols = ['soil_moisture', 'temperature', 'humidity', 'wind_speed', 
                       'rain_intensity', 'vpd', 'needs_watering_soon']
        df_local = df_readings[export_cols].dropna()
        
        if len(df_local) > 40000:
            df_pos = df_local[df_local['needs_watering_soon'] == 1]
            df_neg = df_local[df_local['needs_watering_soon'] == 0]
            df_pos_sampled = df_pos.sample(n=min(len(df_pos), 20000), random_state=42)
            df_neg_sampled = df_neg.sample(n=min(len(df_neg), 20000), random_state=42)
            df_local = pd.concat([df_pos_sampled, df_neg_sampled], ignore_index=True)
        
        # 4. Multi-Crop & Multi-Region Crop-Region-Weather Infused Expansion
        logger.info("Performing Multi-Crop & Multi-Region crop-aware dataset weather-infusion...")
        df_expanded_list = []
        
        # Load weather datasets for the three regions
        weather_data = {
            'matabeleland': load_zimbabwe_weather_data('matabeleland'),
            'manicaland': load_zimbabwe_weather_data('manicaland'),
            'mashonaland': load_zimbabwe_weather_data('mashonaland')
        }
        
        region_multipliers = {
            'matabeleland': 1.5,
            'manicaland': 0.6,
            'mashonaland': 1.0
        }
        
        for crop_name, params in CROP_PARAMS.items():
            for region, evap_mult in region_multipliers.items():
                df_crop_region = df_local.copy()
                
                # If we have real weather records for this region, inject them!
                w_df = weather_data.get(region)
                if w_df is not None and len(w_df) > 0:
                    # Randomly sample weather rows to match the length of df_crop_region
                    sampled_weather = w_df.sample(n=len(df_crop_region), replace=True, random_state=42).reset_index(drop=True)
                    df_crop_region['temperature'] = sampled_weather['temperature']
                    df_crop_region['humidity'] = sampled_weather['humidity']
                    df_crop_region['wind_speed'] = sampled_weather['wind_speed']
                    df_crop_region['rain_intensity'] = sampled_weather['rain_intensity']
                    df_crop_region['vpd'] = sampled_weather['vpd']
                
                df_crop_region['crop_target_moisture'] = params['target']
                df_crop_region['crop_critical_moisture'] = params['critical']
                df_crop_region['region_evap_multiplier'] = evap_mult
                
                # Re-label the expanded data to be biologically sensitive to this crop's limits
                critical_limit = params['critical']
                df_crop_region['needs_watering_soon'] = (
                    (df_crop_region['soil_moisture'] < critical_limit + 5.0) | 
                    (df_crop_region['needs_watering_soon'] == 1)
                ).astype(int)
                
                df_expanded_list.append(df_crop_region)
            
        df_multi_crop = pd.concat(df_expanded_list, ignore_index=True)
        logger.info(f"Replicated local telemetry into {len(df_multi_crop)} crop-region-weather-aware samples")
        
        # 5. Ingest and merge Mendeley Tomato & Zenodo Maize sensor data
        df_tomato = load_mendeley_tomato_data()
        df_maize = load_zenodo_maize_data()
        
        merge_list = [df_multi_crop]
        if df_tomato is not None:
            merge_list.append(df_tomato)
        if df_maize is not None:
            merge_list.append(df_maize)
            
        df_final = pd.concat(merge_list, ignore_index=True)
        
        # Ensure all required features exist
        required_cols = [
            'soil_moisture', 'temperature', 'humidity', 'wind_speed', 
            'rain_intensity', 'vpd', 'crop_target_moisture', 
            'crop_critical_moisture', 'region_evap_multiplier', 'needs_watering_soon'
        ]
        df_final = df_final[required_cols].dropna()
        
        logger.info(f"Final combined dataset shape: {df_final.shape}")
        
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            df_final.to_csv(output_path, index=False)
            logger.info(f"Saved hybrid crop-aware training dataset to {output_path}")
            
        return df_final
        
    except Exception as e:
        logger.error(f"Extraction and fusion pipeline failed: {e}")
        return None

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    output_file = os.path.join(base_dir, 'data', 'processed', 'real_training_data.csv')
    
    extract_and_label_data(output_file)
