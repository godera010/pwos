import pandas as pd
import numpy as np
import os
import sys

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'real_training_data.csv')

def analyze_data():
    print("="*60)
    print("ANALYZING TRAINING DATASET")
    print("="*60)
    
    if not os.path.exists(DATA_FILE):
        print(f"[ERROR] file not found: {DATA_FILE}")
        return

    df = pd.read_csv(DATA_FILE)
    total_samples = len(df)
    
    print(f"Total Samples: {total_samples} (Hourly checkpoints)")
    print(f"Time Range:    {total_samples} Hours (~{total_samples/24:.1f} Days)")
    
    print("\n--- 1. Class Balance ---")
    counts = df['needs_watering_soon'].value_counts().to_dict()
    water_count = counts.get(1, 0)
    wait_count = counts.get(0, 0)
    
    print(f"WAIT (Class 0):      {wait_count} samples ({wait_count/total_samples*100:.1f}%)")
    print(f"WATER (Class 1):     {water_count} samples ({water_count/total_samples*100:.1f}%)")
    
    print("\n--- 2. Weather Stats ---")
    print(f"Temperature:  Min {df['temperature'].min():.1f}°C | Max {df['temperature'].max():.1f}°C | Avg {df['temperature'].mean():.1f}°C")
    print(f"Humidity:     Min {df['humidity'].min():.1f}%  | Max {df['humidity'].max():.1f}%  | Avg {df['humidity'].mean():.1f}%")
    
    # Analyze situations where we water
    water_df = df[df['needs_watering_soon'] == 1]
    wait_df = df[df['needs_watering_soon'] == 0]
    
    print("\n--- 3. Decision Logic Insights ---")
    print(f"Avg Soil Moisture when Watering: {water_df['soil_moisture'].mean():.1f}%")
    print(f"Avg Soil Moisture when Waiting:  {wait_df['soil_moisture'].mean():.1f}%")
    
    print(f"\nAvg Forecast Rain (Minutes) when Waiting: {wait_df['forecast_minutes'].mean():.1f} min")
    print(f"Avg Forecast Rain (Minutes) when Watering: {water_df['forecast_minutes'].mean():.0f} min (Should be 0!)")
    
    print("\n--- 4. Feature Correlations (Top 3) ---")
    correlations = df.corr()['needs_watering_soon'].abs().sort_values(ascending=False)
    # Filter out the target itself
    correlations = correlations[correlations.index != 'needs_watering_soon']
    for feat, corr in correlations.head(3).items():
        print(f"- {feat}: {corr:.3f}")

    print("\n" + "="*60)

if __name__ == "__main__":
    analyze_data()
