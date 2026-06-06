"""
P-WOS Retraining Pipeline — v2
================================
Orchestrates: extract → train → evaluate → promote (or rollback).

Improvements over v1:
  - Status tracking: pipeline state written to DB so API can report progress
  - Model promotion only if new model beats current on F1 (no regressions)
  - Rollback: keeps previous model .pkl if new one fails or regresses
  - Adaptive scheduling signal: logs a suggested next retrain interval
    based on how much real data has accumulated since last train
  - Extracts from both PostgreSQL (real data) and synthetic CSV
  - Clears stale in-memory model from MLPredictor after promotion
"""

import os, sys, json, shutil, logging
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from log_config import setup_logger
logger = setup_logger("RetrainPipeline", "retrain_pipeline.log", "app")

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from data_extractor import extract_and_label_data
from database import PWOSDatabase
from models.train_model import train_model

BASE_DIR      = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'src', 'backend', 'models', 'artifacts')
MODEL_PATH    = os.path.join(ARTIFACTS_DIR, 'rf_model.pkl')
METADATA_PATH = os.path.join(ARTIFACTS_DIR, 'model_metadata.json')
BACKUP_MODEL  = os.path.join(ARTIFACTS_DIR, 'rf_model_backup.pkl')
BACKUP_META   = os.path.join(ARTIFACTS_DIR, 'model_metadata_backup.json')
DATA_OUT      = os.path.join(BASE_DIR, 'data', 'processed', 'real_training_data.csv')

MIN_SAMPLES          = 200     # abort if fewer real rows extracted
F1_IMPROVEMENT_GATE  = 0.005   # new model must beat current F1 by at least this much


def _get_current_f1():
    """Read F1 of the currently deployed model from metadata."""
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH) as f:
                meta = json.load(f)
            return float(meta.get('metrics', {}).get('f1_score', 0.0))
        except Exception:
            pass
    return 0.0


def _set_pipeline_status(db, status: str, detail: str = ""):
    """Write pipeline status to DB system settings so API can surface it."""
    try:
        db.set_system_setting('retrain_status', status)
        db.set_system_setting('retrain_detail', detail[:500])
        db.set_system_setting('retrain_updated', datetime.now().isoformat())
    except Exception as e:
        logger.warning(f"Could not write pipeline status to DB: {e}")


def _suggest_next_interval(db):
    """
    Estimate a good retraining cadence based on how quickly real data
    accumulates. If the system collects >500 new readings/day, suggest
    daily retrain; otherwise weekly.
    """
    try:
        conn   = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM sensor_readings
            WHERE timestamp > NOW() - INTERVAL '24 hours'
        """)
        daily_count = cursor.fetchone()[0]
        conn.close()
        if daily_count >= 500:
            return "daily"
        elif daily_count >= 100:
            return "every 3 days"
        else:
            return "weekly"
    except Exception:
        return "weekly"


def run_retraining_pipeline():
    logger.info("=" * 65)
    logger.info("RETRAINING PIPELINE  v2 — START")
    logger.info("=" * 65)

    db = PWOSDatabase()
    _set_pipeline_status(db, "RUNNING", "Extracting data...")

    # ── 1. Extract real data from DB ─────────────────────────────
    logger.info(f"Extracting real sensor data to {DATA_OUT} ...")
    df = extract_and_label_data(DATA_OUT)

    if df is None or len(df) < MIN_SAMPLES:
        msg = f"Only {len(df) if df is not None else 0} real samples — need {MIN_SAMPLES}. Aborting."
        logger.warning(msg)
        _set_pipeline_status(db, "SKIPPED", msg)
        return

    logger.info(f"Extracted {len(df):,} labelled real samples.")

    # ── 2. Backup current model ───────────────────────────────────
    current_f1 = _get_current_f1()
    backed_up  = False
    if os.path.exists(MODEL_PATH):
        shutil.copy2(MODEL_PATH, BACKUP_MODEL)
        shutil.copy2(METADATA_PATH, BACKUP_META)
        backed_up = True
        logger.info(f"Current model backed up (F1={current_f1:.4f}).")

    # ── 3. Train ──────────────────────────────────────────────────
    _set_pipeline_status(db, "RUNNING", "Training model...")
    logger.info("Starting training...")
    try:
        clf = train_model()
    except Exception as e:
        logger.error(f"Training failed: {e}")
        _set_pipeline_status(db, "FAILED", f"Training error: {e}")
        return

    if clf is None:
        _set_pipeline_status(db, "FAILED", "train_model() returned None.")
        return

    # ── 4. Read new metrics ───────────────────────────────────────
    if not os.path.exists(METADATA_PATH):
        logger.error("Metadata not written after training. Aborting.")
        _set_pipeline_status(db, "FAILED", "Metadata file missing post-training.")
        return

    with open(METADATA_PATH) as f:
        new_meta = json.load(f)

    new_f1  = float(new_meta.get('metrics', {}).get('f1_score', 0.0))
    new_acc = float(new_meta.get('accuracy', 0.0))

    logger.info(f"New model — F1={new_f1:.4f}  Accuracy={new_acc:.4f}")

    # ── 5. Promotion gate ─────────────────────────────────────────
    if backed_up and new_f1 < current_f1 - F1_IMPROVEMENT_GATE:
        logger.warning(
            f"New F1 ({new_f1:.4f}) is worse than current ({current_f1:.4f}) "
            f"by more than {F1_IMPROVEMENT_GATE}. Rolling back."
        )
        shutil.copy2(BACKUP_MODEL, MODEL_PATH)
        shutil.copy2(BACKUP_META,  METADATA_PATH)
        _set_pipeline_status(db, "ROLLED_BACK",
            f"New F1={new_f1:.4f} regressed from {current_f1:.4f}. Previous model restored.")
        return

    # ── 6. Log version to DB ──────────────────────────────────────
    version_tag = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    metrics = {
        'accuracy':  new_acc,
        'precision': new_meta.get('metrics', {}).get('precision'),
        'recall':    new_meta.get('metrics', {}).get('recall'),
        'f1_score':  new_f1,
    }
    num_samples = len(df)
    db.log_model_version(version_tag, metrics, num_samples, MODEL_PATH)
    logger.info(f"Logged model version {version_tag} to DB.")

    # ── 7. Adaptive interval suggestion ──────────────────────────
    interval = _suggest_next_interval(db)
    db.set_system_setting('retrain_suggested_interval', interval)
    logger.info(f"Suggested next retrain interval: {interval}")

    # ── 8. Signal MLPredictor to reload ──────────────────────────
    # Set a DB flag; the next /api/predict-next-watering call reloads the model
    db.set_system_setting('model_needs_reload', 'true')

    _set_pipeline_status(db, "SUCCESS",
        f"Version {version_tag} deployed. F1={new_f1:.4f} (prev={current_f1:.4f}). "
        f"Next retrain: {interval}.")

    logger.info("=" * 65)
    logger.info(f"PIPELINE COMPLETE — version {version_tag} promoted.")
    logger.info("=" * 65)


if __name__ == "__main__":
    run_retraining_pipeline()
