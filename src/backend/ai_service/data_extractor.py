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

# Removed static CROP_PARAMS, using Database directly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

def load_zimbabwe_weather_data(region):
    """Loads and cleans real Visual Crossing historical weather data for Zimbabwe regions."""
    logger.info(f"Ingesting real weather data for region: {region}...")
    filename_map = {
        'matabeleland': 'data/Bulawayo, Zimbabwe last15days.csv',
        'manicaland': 'data/Mutare, Zimbabwe last15days.csv',
        'mashonaland': 'data/Harare, Zimbabwe last15days.csv'
    }
    rel_path = filename_map.get(region)
    if not rel_path:
        return None
    filepath = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(filepath):
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

def add_temporal_features(df, timestamp_col='timestamp'):
    """Calculates temporal features safely while preserving time-series order."""
    if timestamp_col not in df.columns:
        return df
        
    df = df.copy()
    df[timestamp_col] = pd.to_datetime(df[timestamp_col], errors='coerce')
    df = df.dropna(subset=[timestamp_col])
    df = df.sort_values(timestamp_col).reset_index(drop=True)
    
    df['hour'] = df[timestamp_col].dt.hour
    df['day_of_week'] = df[timestamp_col].dt.dayofweek
    df['is_daytime'] = ((df['hour'] >= 6) & (df['hour'] <= 18)).astype(int)
    df['is_hot_hours'] = ((df['hour'] >= 10) & (df['hour'] <= 16)).astype(int)
    df['forecast_minutes'] = 0
    
    time_diff_hours = df[timestamp_col].diff().dt.total_seconds() / 3600.0
    time_diff_hours = time_diff_hours.replace(0, np.nan)
    moisture_diff = df['soil_moisture'].diff()
    df['moisture_change_rate'] = (moisture_diff / time_diff_hours).fillna(0)
    
    df['moisture_rolling_6'] = df['soil_moisture'].rolling(window=6, min_periods=1).mean()
    df['temp_rolling_6'] = df['temperature'].rolling(window=6, min_periods=1).mean()
    
    df.bfill(inplace=True)
    return df

# Outcome-based labeling: a row is positive when the *observed* soil moisture drops
# below the crop's critical threshold within the next LOOKAHEAD_HOURS. The future
# window feeds only the label, never the features, so the model learns to predict
# outcomes instead of re-encoding the rule engine (which inflated accuracy to 100%).
# 6h horizon: chosen empirically. 3h makes the label depend almost entirely on
# current moisture (weather never decides the future minimum); 24h degenerates to
# ~80% positive because fast local pump cycles always cross the threshold within
# a day (model collapses to always-water: recall 1.0, AUC 0.65).
LOOKAHEAD_HOURS = 6.0
LABEL_MARGIN = 5.0  # water shortly *before* the wilting point is crossed

def compute_future_min_moisture(df, timestamp_col='timestamp', hours=LOOKAHEAD_HOURS):
    """Minimum observed soil moisture within the next `hours` for each row.
    Requires df sorted ascending by timestamp_col (add_temporal_features guarantees this)."""
    ts = pd.to_datetime(df[timestamp_col])
    # Mirror time so a backwards-looking rolling window becomes forwards-looking
    mirrored = pd.Timestamp('2000-01-01') + (ts.max() - ts)
    rev = pd.Series(df['soil_moisture'].values[::-1],
                    index=pd.DatetimeIndex(mirrored.values[::-1]))
    future_min = rev.rolling(f'{int(hours * 60)}min').min()
    return pd.Series(future_min.values[::-1], index=df.index)

def load_mendeley_tomato_data():
    """Loads and cleans real Mendeley Tomato IoT sensor logs."""
    logger.info("Ingesting real Mendeley Tomato Cultivation IoT dataset...")
    try:
        soil_path = os.path.join(BASE_DIR, "data/raw/tomato_mendeley/stuard_soil_data.csv")
        env_path = os.path.join(BASE_DIR, "data/raw/tomato_mendeley/stuard_environmental_data.csv")
        if not os.path.exists(soil_path) or not os.path.exists(env_path):
            logger.warning(f"Mendeley Tomato dataset files not found. Skipping. Paths checked: {soil_path}, {env_path}")
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
        
        # Biological thresholds (Tomato Defaults)
        df_out['crop_type_id'] = 1
        df_out['root_depth_cm'] = 60.0
        df_out['wilting_point_threshold'] = 35.0
        df_out['growth_stage'] = 2
        df_out['optimal_vpd_min'] = 0.8
        df_out['optimal_vpd_max'] = 1.2
        
        # Keep timestamp to add temporal features
        df_out['timestamp'] = pd.to_datetime(df_merged['ts_round'], unit='ms')
        df_out = add_temporal_features(df_out, 'timestamp')

        # Outcome-based label: moisture drops below wilting+margin within lookahead window
        future_min = compute_future_min_moisture(df_out)
        df_out['needs_watering_soon'] = (future_min < (35.0 + LABEL_MARGIN)).astype(int)
        
        df_out = df_out.dropna().sample(n=min(len(df_out), 15000), random_state=42)
        logger.info(f"Loaded {len(df_out)} real Tomato IoT readings")
        return df_out
    except Exception as e:
        logger.error(f"Failed to load Mendeley Tomato data: {e}")
        return None

def load_zenodo_maize_data(max_rows=120000):
    """Loads real Zenodo Maize-Cowpea arid farming sensor logs (all 5 dataloggers,
    every 10cm moisture probe). This is the only source where weather and soil
    moisture were CO-OBSERVED in the field (rain correlates ~+0.25 with future
    moisture change), so it carries the weather signal for the model."""
    logger.info("Ingesting real Zenodo Maize Arid farming dataset (all loggers)...")
    try:
        weather_path = os.path.join(BASE_DIR, "data/raw/maize_cowpea/weatherData.txt")
        if not os.path.exists(weather_path):
            logger.warning(f"Zenodo Maize weather file not found. Skipping. Path checked: {weather_path}")
            return None
        df_weather = pd.read_csv(weather_path)

        probe_frames = []
        for i in range(1, 6):
            logger_path = os.path.join(BASE_DIR, f"data/raw/maize_cowpea/datalogger{i}_Raw.txt")
            if not os.path.exists(logger_path):
                continue
            df_log = pd.read_csv(logger_path)
            df_merged = pd.merge(df_log, df_weather, on='Time')

            # Each logger has one or more 10cm volumetric moisture probes
            theta_cols = [c for c in df_log.columns if c.startswith('Theta_') and c.endswith('_10cm')]
            for theta_col in theta_cols:
                df_out = pd.DataFrame()
                # Volumetric water content -> system moisture %, anchored to
                # sandy-soil agronomy: wilting ~0.05 v/v, field capacity ~0.25 v/v,
                # mapped to the system scale where 30% = wilting, 90% = field
                # capacity. (The previous ad-hoc x200 scaling put the median arid
                # reading at 21% — below every crop threshold — which made ~90%
                # of this stratum's labels positive.)
                theta = df_merged[theta_col]
                df_out['soil_moisture'] = (30.0 + (theta - 0.05) / (0.25 - 0.05) * 60.0).clip(0, 100)
                df_out['temperature'] = df_merged['AirTC']
                df_out['humidity'] = df_merged['RH']
                df_out['wind_speed'] = df_merged['WS'] * 3.6  # m/s to km/h
                df_out['rain_intensity'] = df_merged['Rain']

                # Calculate VPD
                es = 0.6108 * np.exp((17.27 * df_out['temperature']) / (df_out['temperature'] + 237.3))
                ea = es * (df_out['humidity'] / 100.0)
                df_out['vpd'] = (es - ea).clip(lower=0)

                # Biological thresholds (Maize Defaults)
                df_out['crop_type_id'] = 2
                df_out['root_depth_cm'] = 40.0
                df_out['wilting_point_threshold'] = 30.0
                df_out['growth_stage'] = 2
                df_out['optimal_vpd_min'] = 1.0
                df_out['optimal_vpd_max'] = 1.5

                df_out['timestamp'] = pd.to_datetime(df_merged['Time'])
                # Drop pre-installation period where the probe reads ~0
                df_out = df_out[df_out['soil_moisture'] > 1.0]
                if df_out.empty:
                    continue
                df_out = add_temporal_features(df_out, 'timestamp')

                # Outcome-based label: moisture drops below wilting+margin within lookahead window
                future_min = compute_future_min_moisture(df_out)
                df_out['needs_watering_soon'] = (future_min < (30.0 + LABEL_MARGIN)).astype(int)
                probe_frames.append(df_out.dropna())

        if not probe_frames:
            logger.warning("No Zenodo Maize datalogger files found. Skipping.")
            return None

        df_all = pd.concat(probe_frames, ignore_index=True)
        if len(df_all) > max_rows:
            df_all = df_all.sample(n=max_rows, random_state=42)
        logger.info(f"Loaded {len(df_all)} real Maize Arid readings from {len(probe_frames)} probes")
        return df_all
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
                   wind_speed, rain_intensity, vpd,
                   precipitation_chance, forecast_temp
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
        # REMOVED: Legacy logic that labeled based on watering events.
        # We now rely purely on agronomic thresholds later in the pipeline.
            
        # Calculate temporal features for local readings before modifying
        df_readings = add_temporal_features(df_readings, 'timestamp')

        # Outcome basis for labels — computed BEFORE any sampling shuffles time order.
        # Feeds only the label downstream, never the feature matrix.
        df_readings['future_min_moisture'] = compute_future_min_moisture(df_readings)

        # Clean local dataframe
        export_cols = ['timestamp', 'soil_moisture', 'temperature', 'humidity', 'wind_speed',
                       'rain_intensity', 'vpd', 'precipitation_chance', 'forecast_temp',
                       'needs_watering_soon',
                       'hour', 'day_of_week', 'is_daytime', 'is_hot_hours',
                       'forecast_minutes', 'moisture_change_rate',
                       'moisture_rolling_6', 'temp_rolling_6', 'future_min_moisture']
        df_local = df_readings[export_cols].dropna()
        
        if len(df_local) > 40000:
            df_local = df_local.sample(n=40000, random_state=42)
        
        # 4. Multi-crop expansion — replicate local telemetry per crop profile so the
        # model learns crop-threshold conditioning. Weather columns keep the values
        # that were actually recorded alongside each reading: randomly injected
        # weather (previous approach) is uncorrelated with the moisture outcome by
        # construction and teaches the model to ignore weather entirely.
        logger.info("Performing multi-crop expansion (recorded weather preserved)...")
        df_expanded_list = []

        crops = db.get_crops()
        if not crops:
            logger.error("No crops found in DB.")
            return None

        for crop in crops:
            df_crop = df_local.copy()

            # Biological features
            df_crop['crop_type_id'] = crop['id']
            df_crop['root_depth_cm'] = crop['root_depth_cm']
            df_crop['wilting_point_threshold'] = crop['wilting_point_threshold']
            df_crop['growth_stage'] = crop['growth_stage']
            df_crop['optimal_vpd_min'] = crop['optimal_vpd_min']
            df_crop['optimal_vpd_max'] = crop['optimal_vpd_max']

            # Outcome-based label: the observed moisture actually drops below this
            # crop's wilting threshold (+ margin) within the lookahead window.
            # Environmental suppression is NOT applied here — it stays an
            # inference-time safety gate in ml_predictor.py, so the model learns
            # outcomes rather than a copy of the rule engine.
            critical_limit = crop['wilting_point_threshold']
            df_crop['needs_watering_soon'] = (
                df_crop['future_min_moisture'] < critical_limit + LABEL_MARGIN
            ).astype(int)

            df_expanded_list.append(df_crop)

        df_multi_crop = pd.concat(df_expanded_list, ignore_index=True)
        logger.info(f"Replicated local telemetry into {len(df_multi_crop)} crop-aware samples")
        
        # 5. Ingest and merge Mendeley Tomato & Zenodo Maize sensor data
        df_tomato = load_mendeley_tomato_data()
        df_maize = load_zenodo_maize_data()
        
        merge_list = [df_multi_crop]
        if df_tomato is not None:
            if 'precipitation_chance' not in df_tomato.columns: df_tomato['precipitation_chance'] = 0
            if 'forecast_temp' not in df_tomato.columns: df_tomato['forecast_temp'] = df_tomato['temperature']
            merge_list.append(df_tomato)
        if df_maize is not None:
            if 'precipitation_chance' not in df_maize.columns: df_maize['precipitation_chance'] = 0
            if 'forecast_temp' not in df_maize.columns: df_maize['forecast_temp'] = df_maize['temperature']
            merge_list.append(df_maize)
            
        df_final = pd.concat(merge_list, ignore_index=True)
        
        # Ensure exactly the 17 specified features + target + timestamp
        required_cols = [
            'timestamp',
            'soil_moisture', 'temperature', 'humidity', 'vpd', 
            'precipitation_chance', 'forecast_temp', 'wind_speed',
            'crop_type_id', 'root_depth_cm', 'wilting_point_threshold', 
            'growth_stage', 'optimal_vpd_min', 'optimal_vpd_max',
            'hour', 'is_daytime', 'moisture_change_rate', 'moisture_rolling_6',
            'needs_watering_soon'
        ]
        df_final = df_final[required_cols].dropna()

        # Normalize timestamps to one format: mixed formats (DB microseconds vs.
        # dataset-native strings) make pd.to_datetime silently coerce most rows
        # to NaT downstream in train_model.py.
        df_final['timestamp'] = pd.to_datetime(df_final['timestamp']).dt.strftime('%Y-%m-%d %H:%M:%S')

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
