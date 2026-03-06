"""
Data Extractor for P-WOS Self-Retraining
Extracts sensor readings and watering events from PostgreSQL to create a labeled dataset.
"""

import logging
import os
import sys
import pandas as pd
import numpy as np
from datetime import timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from log_config import setup_logger
logger = setup_logger("DataExtractor", "data_extractor.log", "app")

# Add parent directory to path to import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import PWOSDatabase

def extract_and_label_data(output_path=None):
    logger.info("=" * 60)
    logger.info("DATA EXTRACTOR - DATABASE TO CSV")
    logger.info("=" * 60)
    
    db = PWOSDatabase()
    
    try:
        conn = db.get_connection()
        
        # 1. Fetch Sensor Readings
        logger.info("Retrieving sensor readings...")
        query_readings = """
            SELECT timestamp, soil_moisture, temperature, humidity, 
                   wind_speed, rain_intensity, vpd
            FROM sensor_readings
            ORDER BY timestamp ASC
        """
        df_readings = pd.read_sql(query_readings, conn)
        logger.info(f"{len(df_readings)} reading samples")
        
        # 2. Fetch Watering Events
        logger.info("Retrieving watering events...")
        query_events = """
            SELECT timestamp as water_time, duration_seconds, trigger_type
            FROM watering_events
            ORDER BY timestamp ASC
        """
        df_events = pd.read_sql(query_events, conn)
        logger.info(f"{len(df_events)} watering events")
        
        conn.close()
        
        if len(df_readings) == 0:
            logger.error("No sensor readings found. Cannot proceed.")
            return None

        # 3. Label Data
        # Logic: If a reading is within X minutes BEFORE a watering event, Label = 1.
        # Otherwise Label = 0.
        
        logger.info("Labeling data based on watering history...")
        
        # Convert timestamps to datetime
        df_readings['timestamp'] = pd.to_datetime(df_readings['timestamp'])
        df_events['water_time'] = pd.to_datetime(df_events['water_time'])
        
        # Sort just in case
        df_readings = df_readings.sort_values('timestamp')
        df_events = df_events.sort_values('water_time')
        
        # Initialize target
        df_readings['needs_watering_soon'] = 0
        
        # Labeling Window (e.g., readings 2 hours before watering are "critical")
        LOOKBACK_WINDOW = timedelta(hours=2)
        
        count_positives = 0
        
        for _, event in df_events.iterrows():
            water_time = event['water_time']
            start_time = water_time - LOOKBACK_WINDOW
            
            # Find readings in this window
            mask = (df_readings['timestamp'] >= start_time) & (df_readings['timestamp'] <= water_time)
            
            # Apply label 1
            df_readings.loc[mask, 'needs_watering_soon'] = 1
            
        count_positives = df_readings['needs_watering_soon'].sum()
        logger.info(f"Labeled {count_positives} samples as Positive (Needs Watering)")
        logger.info(f"Labeled {len(df_readings) - count_positives} samples as Negative")
        
        # 4. Clean and Export
        # Drop timestamps if not needed for training, or keep for splitting?
        # For Random Forest, we usually drop timestamp. But let's keep features + target.
        
        export_cols = ['soil_moisture', 'temperature', 'humidity', 'wind_speed', 
                       'rain_intensity', 'vpd', 'needs_watering_soon']
        
        df_export = df_readings[export_cols].dropna()
        
        if output_path:
            # Ensure directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            df_export.to_csv(output_path, index=False)
            logger.info(f"Saved labeled data to {output_path}")
            
        return df_export
        
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        return None

if __name__ == "__main__":
    # Default path compatible with train_model.py
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    output_file = os.path.join(base_dir, 'data', 'processed', 'real_training_data.csv')
    
    extract_and_label_data(output_file)
