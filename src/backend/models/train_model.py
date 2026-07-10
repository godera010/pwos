"""
P-WOS Model Trainer — v2
=========================
Trains a Random Forest on the 17-feature synthetic dataset.

Improvements over v1:
  - Chronological train/test split (no future leakage)
  - TimeSeriesSplit cross-validation (5-fold) for honest variance estimate
  - Full per-class metrics: precision, recall, F1, confusion matrix
  - Feature importance logged — shows model actually uses all 17 features
  - Warns loudly if accuracy > 95% (likely still-leaky data)
  - Saves extended metadata including CV scores and feature importances
  - Hyperparameter tuning via RandomizedSearchCV (optional, flag below)
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit, cross_val_score, RandomizedSearchCV
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (classification_report, accuracy_score,
                             confusion_matrix, roc_auc_score, brier_score_loss)
import joblib, json, os, sys, warnings

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from log_config import setup_logger
logger = setup_logger("ModelTrainer", "train_model.log", "app")

# ─────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA_REAL      = os.path.join(BASE_DIR, 'data', 'processed', 'real_training_data.csv')
DATA_SYNTHETIC = os.path.join(BASE_DIR, 'data', 'processed', 'synthetic_training_data.csv')
MODEL_DIR      = os.path.join(BASE_DIR, 'src', 'backend', 'models', 'artifacts')
MODEL_PATH     = os.path.join(MODEL_DIR, 'rf_model.pkl')
METADATA_PATH  = os.path.join(MODEL_DIR, 'model_metadata.json')
os.makedirs(MODEL_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────
# FEATURE LIST — single source of truth shared with ml_predictor
# ─────────────────────────────────────────────────────────────────
# growth_stage removed: constant (always 2) in all data sources — importance 0.0
FEATURES = [
    'soil_moisture', 'temperature', 'humidity', 'vpd',
    'precipitation_chance', 'forecast_temp', 'wind_speed',
    'crop_type_id', 'root_depth_cm', 'wilting_point_threshold',
    'optimal_vpd_min', 'optimal_vpd_max',
    'hour', 'is_daytime', 'moisture_change_rate', 'moisture_rolling_6',
]
TARGET = 'needs_watering_soon'

# Set True to run RandomizedSearchCV for better hyperparameters (slower)
RUN_HYPERPARAM_SEARCH = False


def train_model():
    logger.info("=" * 65)
    logger.info("P-WOS MODEL TRAINER  v2")
    logger.info("=" * 65)

    # ── 1. Load data ────────────────────────────────────────────
    # Synthetic CSV intentionally excluded: its labels use the legacy rule-based
    # (suppression) scheme, which contradicts the outcome-based labels produced
    # by data_extractor.py and would reintroduce rule-encoding into the model.
    dfs = []
    for path, label in [(DATA_REAL, 'real')]:
        if os.path.exists(path):
            df_tmp = pd.read_csv(path)
            logger.info(f"Loaded {len(df_tmp):,} {label} rows from {path}")
            dfs.append(df_tmp)

    if not dfs:
        logger.error("No training data found. Run ai_service/data_extractor.py first.")
        return None

    df = pd.concat(dfs, ignore_index=True)
    logger.info(f"Combined dataset: {len(df):,} rows")

    # ── 2. Chronological sort ────────────────────────────────────
    if 'timestamp' in df.columns:
        n_before = len(df)
        # format='mixed' parses per-element; a single inferred format silently
        # coerces rows from other data sources to NaT and drops them
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce', format='mixed')
        df = df.dropna(subset=['timestamp']).sort_values('timestamp').reset_index(drop=True)
        dropped = n_before - len(df)
        if dropped > 0:
            logger.warning(f"Dropped {dropped:,} rows with unparseable timestamps.")
        logger.info("Sorted chronologically by timestamp.")
    else:
        logger.warning("No timestamp column — cannot guarantee chronological order.")

    # ── 3. Feature validation ────────────────────────────────────
    missing_cols = [f for f in FEATURES if f not in df.columns]
    if missing_cols:
        logger.error(f"MISSING FEATURES in CSV: {missing_cols}")
        logger.error("Re-run generate_synthetic_history.py (v2) to fix this.")
        return None

    df = df.dropna(subset=FEATURES + [TARGET])
    X = df[FEATURES]
    y = df[TARGET]

    pos_rate = y.mean() * 100
    logger.info(f"Label balance: {pos_rate:.1f}% positive (water), {100-pos_rate:.1f}% negative (wait)")
    if pos_rate > 85 or pos_rate < 15:
        logger.warning(f"Severe class imbalance ({pos_rate:.1f}%). Check labelling logic.")

    # ── 4. Chronological train / calibration / test split (70/10/20) ──
    cal_idx   = int(len(df) * 0.70)
    split_idx = int(len(df) * 0.80)
    X_train, X_cal, X_test = X.iloc[:cal_idx], X.iloc[cal_idx:split_idx], X.iloc[split_idx:]
    y_train, y_cal, y_test = y.iloc[:cal_idx], y.iloc[cal_idx:split_idx], y.iloc[split_idx:]
    logger.info(f"Train: {len(X_train):,} | Calibration: {len(X_cal):,} | Test: {len(X_test):,} (chronological)")

    # ── 5. Hyperparameter search (optional) ─────────────────────
    if RUN_HYPERPARAM_SEARCH:
        logger.info("Running RandomizedSearchCV (this may take a few minutes)...")
        param_dist = {
            'n_estimators':      [100, 200, 300],
            'max_depth':         [8, 10, 15, None],
            'min_samples_split': [2, 5, 10],
            'min_samples_leaf':  [1, 2, 4],
            'max_features':      ['sqrt', 'log2'],
        }
        base_clf = RandomForestClassifier(class_weight='balanced', random_state=42, n_jobs=-1)
        search = RandomizedSearchCV(base_clf, param_dist, n_iter=20,
                                    cv=TimeSeriesSplit(n_splits=3),
                                    scoring='f1', random_state=42, n_jobs=-1)
        search.fit(X_train, y_train)
        best_params = search.best_params_
        logger.info(f"Best params found: {best_params}")
    else:
        best_params = {
            'n_estimators': 200,
            'max_depth': 12,
            'min_samples_split': 5,
            'min_samples_leaf': 2,
            'max_features': 'sqrt',
        }

    # ── 6. Train model ───────────────────────────────────────────
    logger.info("Training Random Forest Classifier...")
    clf = RandomForestClassifier(
        **best_params,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)
    logger.info("Training complete.")

    # ── 6b. Probability calibration ──────────────────────────────
    # The decision logic gates on predict_proba thresholds (0.55/0.70/0.80);
    # raw Random Forest probabilities are poorly calibrated, so calibrate on a
    # chronologically later slice the forest never saw.
    logger.info("Calibrating probabilities (isotonic) on held-out calibration slice...")
    try:
        from sklearn.frozen import FrozenEstimator
        model = CalibratedClassifierCV(FrozenEstimator(clf), method='isotonic')
    except ImportError:  # sklearn < 1.6
        model = CalibratedClassifierCV(clf, method='isotonic', cv='prefit')
    model.fit(X_cal, y_cal)

    # ── 7. Time-series cross-validation (honest variance) ────────
    logger.info("Running 5-fold TimeSeriesSplit cross-validation...")
    tscv = TimeSeriesSplit(n_splits=5)
    cv_f1  = cross_val_score(clf, X, y, cv=tscv, scoring='f1',        n_jobs=-1)
    cv_acc = cross_val_score(clf, X, y, cv=tscv, scoring='accuracy',  n_jobs=-1)
    cv_auc = cross_val_score(clf, X, y, cv=tscv, scoring='roc_auc',   n_jobs=-1)
    logger.info(f"CV F1  : {cv_f1.mean():.4f}  ±{cv_f1.std():.4f}  (folds: {[round(v,3) for v in cv_f1]})")
    logger.info(f"CV Acc : {cv_acc.mean():.4f}  ±{cv_acc.std():.4f}")
    logger.info(f"CV AUC : {cv_auc.mean():.4f}  ±{cv_auc.std():.4f}")

    # ── 8. Held-out test evaluation (calibrated model) ───────────
    logger.info("Evaluating on held-out chronological test set...")
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    acc    = accuracy_score(y_test, y_pred)
    auc    = roc_auc_score(y_test, y_proba)
    report = classification_report(y_test, y_pred, output_dict=True)
    cm     = confusion_matrix(y_test, y_pred).tolist()

    brier_raw = brier_score_loss(y_test, clf.predict_proba(X_test)[:, 1])
    brier_cal = brier_score_loss(y_test, y_proba)
    logger.info(f"Brier score: raw={brier_raw:.4f} -> calibrated={brier_cal:.4f} (lower is better)")

    logger.info(f"Accuracy  : {acc*100:.2f}%")
    logger.info(f"ROC-AUC   : {auc:.4f}")
    logger.info(f"Precision (water=1) : {report['1']['precision']:.4f}")
    logger.info(f"Recall    (water=1) : {report['1']['recall']:.4f}")
    logger.info(f"F1-Score  (water=1) : {report['1']['f1-score']:.4f}")
    logger.info(f"Confusion matrix    : {cm}")

    # Warn on suspiciously perfect scores
    if acc > 0.95:
        logger.warning(
            f"Accuracy {acc*100:.2f}% is suspiciously high. "
            "Verify no data leakage in generate_synthetic_history.py."
        )

    # ── 9. Feature importances ───────────────────────────────────
    importances = dict(zip(FEATURES, clf.feature_importances_.tolist()))
    sorted_imp  = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    logger.info("Feature importances (descending):")
    for feat, imp in sorted_imp:
        bar = "█" * int(imp * 40)
        logger.info(f"  {feat:30s} {imp:.4f}  {bar}")

    # Warn if soil_moisture dominates (>60%) — sign that other features aren't contributing
    sm_imp = importances.get('soil_moisture', 0)
    if sm_imp > 0.60:
        logger.warning(
            f"soil_moisture accounts for {sm_imp*100:.1f}% of importance. "
            "Model may still be moisture-only. Check suppression logic."
        )
    else:
        logger.info(f"soil_moisture importance: {sm_imp*100:.1f}% — multi-feature learning confirmed.")

    # ── 10. Save artefacts (calibrated wrapper around the forest) ─
    joblib.dump(model, MODEL_PATH)
    logger.info(f"Model saved: {MODEL_PATH}")

    metadata = {
        'model_type':          'RandomForestClassifier',
        'timestamp':           pd.Timestamp.now().isoformat(),
        'features':            FEATURES,
        'n_features':          len(FEATURES),
        'hyperparameters':     best_params,
        'training_samples':    len(X_train),
        'test_samples':        len(X_test),
        # Held-out test metrics
        'accuracy':            round(acc, 6),
        'roc_auc':             round(auc, 6),
        'metrics': {
            'precision':       round(report['1']['precision'], 6),
            'recall':          round(report['1']['recall'], 6),
            'f1_score':        round(report['1']['f1-score'], 6),
            'support':         int(report['1']['support']),
        },
        'confusion_matrix':    cm,
        # Cross-validation results
        'cv': {
            'n_splits':        5,
            'method':          'TimeSeriesSplit',
            'f1_mean':         round(float(cv_f1.mean()), 6),
            'f1_std':          round(float(cv_f1.std()), 6),
            'f1_folds':        [round(v, 4) for v in cv_f1.tolist()],
            'accuracy_mean':   round(float(cv_acc.mean()), 6),
            'auc_mean':        round(float(cv_auc.mean()), 6),
        },
        # Probability calibration
        'calibration': {
            'method':           'isotonic',
            'brier_raw':        round(float(brier_raw), 6),
            'brier_calibrated': round(float(brier_cal), 6),
        },
        # Feature importances for XAI panel
        'feature_importances': {k: round(v, 6) for k, v in sorted_imp},
    }

    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=4)
    logger.info(f"Metadata saved: {METADATA_PATH}")

    logger.info("=" * 65)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 65)
    return model


if __name__ == "__main__":
    train_model()
