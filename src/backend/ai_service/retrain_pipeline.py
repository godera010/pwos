"""
Retraining Pipeline Orchestrator
Automates the process of:
1. Extracting data from DB
2. Training the model
3. Logging the version/metrics to DB
"""

import os
import sys
import json
import logging
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from log_config import setup_logger
logger = setup_logger("RetrainPipeline", "retrain_pipeline.log", "app")

# Add parent directories to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_extractor import extract_and_label_data
from database import PWOSDatabase

# Import training function - we need to modify train_model.py to be importable 
# and return metrics, OR we just run it as a subprocess and parse output/metadata.
# Importing is better, but train_model is currently a script.
# Let's import it if possible.
from models.train_model import train_model

def run_retraining_pipeline():
    logger.info("=" * 60)
    logger.info("STARTING RETRAINING PIPELINE")
    logger.info("=" * 60)
    
    # 1. Extract Data
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    data_file = os.path.join(base_dir, 'data', 'processed', 'real_training_data.csv')
    
    logger.info(f"Extracting data to {data_file}...")
    df = extract_and_label_data(data_file)
    
    if df is None or len(df) < 100:
        logger.warning("Not enough data to retrain. Aborting.")
        return
        
    num_samples = len(df)
    
    # 2. Train Model
    # We need to capture the metrics. train_model writes to model_metadata.json
    logger.info("Training model...")
    try:
        train_model()
    except Exception as e:
        logger.error(f"Training failed: {e}")
        return

    # 3. Read Metadata and Log to DB
    metadata_path = os.path.join(base_dir, 'src', 'backend', 'models', 'artifacts', 'model_metadata.json')
    model_path = os.path.join(base_dir, 'src', 'backend', 'models', 'artifacts', 'rf_model.pkl')
    
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
            
        metrics = {
            'accuracy': metadata.get('accuracy'),
            'precision': metadata.get('metrics', {}).get('precision'),
            'recall': metadata.get('metrics', {}).get('recall'),
            'f1_score': metadata.get('metrics', {}).get('f1-score')
        }
        
        version_tag = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        db = PWOSDatabase()
        db.log_model_version(version_tag, metrics, num_samples, model_path)
        
        logger.info(f"Successfully retrained and logged version {version_tag}")
        logger.info(f"Accuracy: {metrics['accuracy']:.4f}")
    else:
        logger.error("Performance metadata not found.")

if __name__ == "__main__":
    run_retraining_pipeline()
