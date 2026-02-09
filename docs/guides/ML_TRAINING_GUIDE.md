# 🧠 P-WOS ML Training Guide

This guide explains how to retrain the Predictive Water Optimization System (P-WOS) machine learning model.

---

## 1. Prerequisites

Ensure your environment is set up:
```batch
setup.bat
```

## 2. Data Preparation

The trainer looks for CSV files in `data/` in this priority order:

1.  `data/real_training_data.csv` (Real-world sensor logs)
2.  `data/synthetic_training_data.csv` (Generated simulation data)

**Required Columns:**
- `soil_moisture` (0-100)
- `temperature` (Celsius)
- `humidity` (0-100)
- `needs_watering_soon` (0 or 1) - **Target Variable**

*Note: The trainer automatically engineers features like `vpd`, `is_raining`, etc.*

---

## 3. How to Train

### Option A: One-Click Script (Recommended)
Run the batch file in the project root:
```batch
train_model.bat
```

### Option B: Manual Command
Activate the environment and run the python script:
```batch
call .venv\Scripts\activate
python src/backend/models/train_model.py
```

---

## 4. Expected Output

The script will:
1.  Load data and engineer 17 features.
2.  Split data (80% train / 20% test).
3.  Train a **Random Forest Classifier** (using Intel Acceleration if available).
4.  Evaluate accuracy and print a report.
5.  Save the model to `src/backend/models/artifacts/rf_model.pkl`.

**Sample Output:**
```
============================================================
P-WOS MODEL TRAINER
============================================================
[INFO] Intel Extension for Scikit-learn enabled!
[LOAD] Loading training data from .../data/synthetic_training_data.csv...
   [OK] Loaded 1000 samples

[FEATURE] Engineering new features...
   [OK] Added VPD feature
   [OK] Added is_extreme_vpd flag (heatwave)
   ...

[TRAIN] Training Random Forest Classifier...
   [OK] Model trained

[EVAL] Evaluating performance...
   [RESULT] Accuracy: 94.50%
   [RESULT] F1-Score (Class 1):  0.93

[SAVE] Saving model to .../src/backend/models/artifacts/rf_model.pkl...
   [OK] Metadata saved
============================================================
TRAINING COMPLETE
============================================================
```

---

## 5. Troubleshooting

- **"No data file found"**: Ensure `data/synthetic_training_data.csv` exists. You can generate it by running the simulation for a while or using `scripts/data/generate_data.py` (if available).
- **"Intel Extension not found"**: This is normal on non-Intel systems. The trainer will print `[WARNING]` and proceed with standard CPU training safe mode.
