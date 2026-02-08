import sqlite3
import pandas as pd
from datetime import datetime, timedelta
import os
import sys

# Ensure we can find the DB
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'data', 'pwos_simulation.db')

class DataCollector:
    """Prepare simulation data for ML training."""
    
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
    
    def load_sensor_data(self):
        """Load all sensor readings."""
        print(f"   Connecting to: {self.db_path}")
        conn = sqlite3.connect(self.db_path)
        # Check if forecast_minutes exists
        try:
            query = "SELECT timestamp, soil_moisture, temperature, humidity, forecast_minutes FROM sensor_readings ORDER BY timestamp ASC"
            df = pd.read_sql_query(query, conn)
        except Exception as e:
            print(f"   [WARN] forecast_minutes not found, filling with 0. Error: {e}")
            query = "SELECT timestamp, soil_moisture, temperature, humidity FROM sensor_readings ORDER BY timestamp ASC"
            df = pd.read_sql_query(query, conn)
            df['forecast_minutes'] = 0
            
        conn.close()
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        return df
    
    def load_watering_events(self):
        """Load watering events."""
        conn = sqlite3.connect(self.db_path)
        query = "SELECT timestamp, moisture_before FROM watering_events ORDER BY timestamp ASC"
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        return df
    
    def create_labels(self, sensor_df, watering_df, hours_ahead=24):
        """
        Label: Will watering be needed in next 24 hours?
        
        Logic: If a watering event happened within 24 hours after 
               this reading, label = 1 (needs water soon)
        """
        sensor_df = sensor_df.copy()
        sensor_df['needs_watering_soon'] = 0
        
        print(f"Creating labels for {len(sensor_df)} readings...")
        
        # Sort both by time to optimize optimization?
        # For now, simplistic loop (can be slow for millions of rows, fine for 10k)
        
        # Optimized approach: fast forward search
        # Convert to numpy for speed if needed, but 10k rows is near instant logic
        
        for idx, row in sensor_df.iterrows():
            sensor_time = row['timestamp']
            
            # Check if watering happened in next 24 hours
            future_waterings = watering_df[
                (watering_df['timestamp'] > sensor_time) &
                (watering_df['timestamp'] <= sensor_time + timedelta(hours=hours_ahead))
            ]
            
            if len(future_waterings) > 0:
                sensor_df.at[idx, 'needs_watering_soon'] = 1
            
            if idx % 2000 == 0:
                print(f"  Processed {idx}/{len(sensor_df)}...")
        
        return sensor_df
    
    def add_features(self, df):
        """Add time and derivative features."""
        
        # Time features
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['is_daytime'] = ((df['hour'] >= 6) & (df['hour'] <= 18)).astype(int)
        df['is_hot_hours'] = ((df['hour'] >= 10) & (df['hour'] <= 16)).astype(int)
        
        # Sort by time for rolling calculations
        df = df.sort_values('timestamp').reset_index(drop=True)
        
        # Moisture change rate (per hour)
        time_diff_hours = df['timestamp'].diff().dt.total_seconds() / 3600
        moisture_diff = df['soil_moisture'].diff()
        df['moisture_change_rate'] = moisture_diff / time_diff_hours
        df['moisture_change_rate'].fillna(0, inplace=True)
        
        # Rolling averages (last 6 readings ≈ 1.5 hours)
        df['moisture_rolling_6'] = df['soil_moisture'].rolling(window=6, min_periods=1).mean()
        df['temp_rolling_6'] = df['temperature'].rolling(window=6, min_periods=1).mean()
        
        # Fill first few rows
        df.bfill(inplace=True)
        
        return df
    
    def export_training_data(self, output_file='training_data.csv'):
        """Main export function."""
        
        print("="*60)
        print("P-WOS DATA COLLECTOR")
        print("="*60)
        print(f"DB Path: {self.db_path}")
        
        # Load data
        print("\\n[LOAD] Loading sensor data...")
        sensor_df = self.load_sensor_data()
        print(f"   [OK] Loaded {len(sensor_df)} sensor readings")
        
        print("\\n[LOAD] Loading watering events...")
        watering_df = self.load_watering_events()
        print(f"   [OK] Loaded {len(watering_df)} watering events")
        
        # Create labels
        print("\\n[PROC] Creating training labels...")
        df = self.create_labels(sensor_df, watering_df, hours_ahead=24)
        positive = df['needs_watering_soon'].sum()
        print(f"   [OK] Labels created:")
        print(f"      Positive (needs water): {positive}")
        print(f"      Negative (no water):    {len(df) - positive}")
        print(f"      Class balance:          {positive/len(df)*100:.1f}% positive")
        
        # Add features
        print("\\n[PROC] Engineering features...")
        df = self.add_features(df)
        print("   [OK] Features added")
        
        # Select columns for training
        feature_cols = [
            'soil_moisture',
            'temperature', 
            'humidity',
            'forecast_minutes', # NEW: Forecast logic
            'hour',
            'day_of_week',
            'is_daytime',
            'is_hot_hours',
            'moisture_change_rate',
            'moisture_rolling_6',
            'temp_rolling_6',
            'needs_watering_soon'  # Label (target)
        ]
        
        training_df = df[feature_cols].copy()
        training_df = training_df.dropna()  # Remove any NaN rows
        
        # Save
        print(f"\\n[SAVE] Saving to {output_file}...")
        training_df.to_csv(output_file, index=False)
        
        # Statistics
        print("\\n" + "="*60)
        print("EXPORT COMPLETE")
        print("="*60)
        print(f"File:            {output_file}")
        print(f"Total samples:   {len(training_df)}")
        print(f"Features:        {len(feature_cols) - 1}")
        
        # Feature correlations
        print("\\n[INFO] Feature Correlations with Target:")
        corr = training_df.corr()['needs_watering_soon'].sort_values(ascending=False)
        for feature, value in corr.items():
            if feature != 'needs_watering_soon':
                print(f"   {feature:25s}: {value:+.3f}")
        
        return training_df


# Run this script
if __name__ == "__main__":
    collector = DataCollector()
    df = collector.export_training_data()
    
    print("\\n[DONE] Ready for training!")
    print("   Next step: Run train_model.py")
