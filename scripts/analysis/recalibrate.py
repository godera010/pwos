
import os
import sys

# Add src to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src'))

from simulation.data_generator import DataGenerator
from backend.models.data_collector import DataCollector
from backend.models.train_model import train_model

import argparse
import pandas as pd

def recalibrate():
    parser = argparse.ArgumentParser(description='Retrain P-WOS ML Model')
    parser.add_argument('--live', action='store_true', help='Train on LIVE simulation data (merges with existing history)')
    args = parser.parse_args()

    print("="*60)
    print(" P-WOS RECALIBRATION ")
    print("="*60)
    
    # Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    TRAINING_DATA_PATH = os.path.join(BASE_DIR, 'training_data.csv')
    
    if args.live:
        print("\n[MODE] LIVE LEARNING TRIGGERED")
        print("   - Skipping synthetic generation")
        print("   - Will merge live history with existing knowledge")
        
        # Use LIVE Database
        live_db = os.path.join(BASE_DIR, 'data', 'pwos_simulation.db')
        if not os.path.exists(live_db):
            print(f"[ERROR] Live database not found at {live_db}")
            return
            
        target_db = live_db
        print(f"   - Source DB: {target_db}")
        
    else:
        print("\n[MODE] FULL RESET (Synthetic)")
        print("   - Generating fresh 3-month history")
        
        # 1. Generate Data (to temp DB)
        print("\n[STEP 1] Generating Synthetic Data...")
        gen = DataGenerator()
        # Override DB Path to a temp file
        temp_db = os.path.join(os.path.dirname(gen.db_path), 'training_sim.db')
        gen.db_path = temp_db
        print(f"   Target DB: {temp_db}")
        gen.run()
        target_db = temp_db
    
    # 2. Collect & Label Data
    print("\n[STEP 2] Processing & Labeling Data...")
    collector = DataCollector(db_path=target_db)
    
    # Define output for this batch
    batch_csv = os.path.join(BASE_DIR, 'training_data_batch.csv')
    collector.export_training_data(output_file=batch_csv)
    
    # 3. Merge Data (If outputting to main file)
    print("\n[STEP 2.5] Merging Datasets...")
    
    if args.live and os.path.exists(TRAINING_DATA_PATH):
        # Load Old
        print("   - Loading existing knowledge...")
        old_df = pd.read_csv(TRAINING_DATA_PATH)
        # Load New
        print("   - Loading new experiences...")
        new_df = pd.read_csv(batch_csv)
        
        # Merge
        combined_df = pd.concat([old_df, new_df], ignore_index=True)
        # Drop duplicates if any (exact match)
        combined_df.drop_duplicates(inplace=True)
        
        print(f"   - Merged: {len(old_df)} + {len(new_df)} -> {len(combined_df)} total samples")
        
        # Save to Main
        combined_df.to_csv(TRAINING_DATA_PATH, index=False)
        # Clean up batch
        if os.path.exists(batch_csv):
            os.remove(batch_csv)
            
    else:
        # Just rename batch to main (Overwrite)
        import shutil
        print(f"   - Overwriting {TRAINING_DATA_PATH}")
        if os.path.exists(TRAINING_DATA_PATH):
            os.remove(TRAINING_DATA_PATH)
        os.rename(batch_csv, TRAINING_DATA_PATH)
    
    # 3. Train Model
    print("\n[STEP 3] Training Model...")
    # train_model() functions reads 'training_data.csv' from root
    train_model()
    
    print("\n[SUCCESS] RECALIBRATION COMPLETE")

if __name__ == "__main__":
    recalibrate()
