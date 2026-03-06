import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from log_config import setup_logger
logger = setup_logger("ModelTrainer", "train_model.log", "app")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA_FILE_REAL = os.path.join(BASE_DIR, 'data', 'processed', 'real_training_data.csv')
DATA_FILE_SYNTHETIC = os.path.join(BASE_DIR, 'data', 'processed', 'synthetic_training_data.csv')
DATA_FILE = DATA_FILE_REAL if os.path.exists(DATA_FILE_REAL) else DATA_FILE_SYNTHETIC
MODEL_DIR = os.path.join(BASE_DIR, 'src', 'backend', 'models', 'artifacts')
MODEL_PATH = os.path.join(MODEL_DIR, 'rf_model.pkl')
METADATA_PATH = os.path.join(MODEL_DIR, 'model_metadata.json')

# Ensure directory exists
os.makedirs(MODEL_DIR, exist_ok=True)

def train_model():
    logger.info("=" * 60)
    logger.info("P-WOS MODEL TRAINER")
    logger.info("=" * 60)
    
    # 1. Load Data
    if not os.path.exists(DATA_FILE):
        logger.error(f"Data file not found: {DATA_FILE}")
        return
        
    logger.info(f"Loading training data from {DATA_FILE}...")
    df = pd.read_csv(DATA_FILE)
    logger.info(f"Loaded {len(df)} samples")
    
    # ===========================================
    # FEATURE ENGINEERING
    # ===========================================
    logger.info("Engineering new features...")
    
    # 1. Calculate VPD (Vapor Pressure Deficit)
    #    VPD = es - ea (kPa)
    #    es = 0.6108 * exp((17.27 * T) / (T + 237.3))
    #    ea = es * (RH / 100)
    if 'vpd' not in df.columns:
        es = 0.6108 * np.exp((17.27 * df['temperature']) / (df['temperature'] + 237.3))
        ea = es * (df['humidity'] / 100.0)
        df['vpd'] = es - ea
        df['vpd'] = df['vpd'].clip(lower=0)  # VPD can't be negative
        logger.info("Added VPD feature")
    
    # 2. Extreme VPD flag (Heatwave detection)
    df['is_extreme_vpd'] = (df['vpd'] > 2.0).astype(int)
    logger.info("Added is_extreme_vpd flag (heatwave)")
    
    # 3. Wind speed (add default if missing)
    if 'wind_speed' not in df.columns:
        df['wind_speed'] = 0.0  # Default: no wind data
        logger.info("No wind_speed in data, defaulting to 0")
    
    # 4. Rain intensity (add default if missing)
    if 'rain_intensity' not in df.columns:
        df['rain_intensity'] = 0.0  # Default: no rain
        logger.info("No rain_intensity in data, defaulting to 0")
    
    # 5. Is raining flag
    df['is_raining'] = (df['rain_intensity'] > 0).astype(int)
    logger.info("Added is_raining flag")
    
    # 6. High wind flag (False Dry scenario)
    df['is_high_wind'] = (df['wind_speed'] > 20).astype(int)  # >20 km/h
    logger.info("Added is_high_wind flag")
    
    logger.info(f"Total features after engineering: {len(df.columns) - 1}")
    
    # ===========================================
    # PREPARE X and y
    # ===========================================
    target = 'needs_watering_soon'
    features = [c for c in df.columns if c != target]
    
    X = df[features]
    y = df[target]
    
    logger.info(f"Features: {features}")
    
    # 3. Split Data (Stratified to maintain class balance)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    logger.info(f"Training set: {len(X_train)}")
    logger.info(f"Testing set:  {len(X_test)}")
    
    # 4. Train Model
    logger.info("Training Random Forest Classifier...")
    # Use class_weight='balanced' to handle any imbalance
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight='balanced',
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    logger.info("Model trained")
    
    # 5. Evaluate
    logger.info("Evaluating performance...")
    y_pred = clf.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)
    
    logger.info(f"Accuracy: {acc*100:.2f}%")
    logger.info(f"Precision (Class 1): {report['1']['precision']:.2f}")
    logger.info(f"Recall (Class 1):    {report['1']['recall']:.2f}")
    logger.info(f"F1-Score (Class 1):  {report['1']['f1-score']:.2f}")
    
    # 6. Save Artifacts
    logger.info(f"Saving model to {MODEL_PATH}...")
    joblib.dump(clf, MODEL_PATH)
    
    # Save metadata for API
    metadata = {
        'accuracy': acc,
        'features': features,
        'timestamp': pd.Timestamp.now().isoformat(),
        'model_type': 'RandomForestClassifier',
        'metrics': report['1']
    }
    
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=4)
        
    logger.info(f"Metadata saved to {METADATA_PATH}")
    
    logger.info("=" * 60)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 60)

if __name__ == "__main__":
    train_model()
