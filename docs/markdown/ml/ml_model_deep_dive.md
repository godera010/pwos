# ML Model Deep Dive

> **P-WOS Technical Reference** | Machine Learning Core Layer  
> Scope: Target label definitions, class imbalance weights, self-retraining, and model drift indicators

---

## 1. What the Model Is Predicting

The P-WOS ML model solves a **binary classification** problem. Its sole output is a single integer:

| Value | Label | Meaning |
|-------|-------|---------|
| `1`   | `needs_watering_soon = True`  | Conditions indicate the crop will require irrigation within the next ~2 hours |
| `0`   | `needs_watering_soon = False` | Current soil and environmental conditions do not indicate imminent water stress |

### Why "soon" and not "now"?
The target variable is intentionally predictive, not reactive. A reading of `1` means the system has detected the **early-warning signature** that precedes a watering event — not that the soil is already critically dry. This gives the Decision Engine time to schedule irrigation proactively, ahead of VPD peaks, before midday heat, or before forecast rain makes it unnecessary.

---

## 2. The Labeling Strategy

### Dataset Scale
*   **Training Set**: 504,480 samples (80%)
*   **Testing Set**: 126,120 samples (20%)
*   **Total Labeled Records**: 630,600 (630,000 hybrid real/augmented + 600 synthetic)

These records are compiled by `data_extractor.py` matching PostgreSQL historical sensor reading timestamps with logged watering events.

### Production Labeling — 2-Hour Lookback
```
For each watering event at time T:
  Label all sensor readings in the window [T − 2h, T) as needs_watering_soon = 1
  All other readings → 0
```
This lookback captures the environmental signature that *immediately precedes* a watering decision, generating highly precise positive labels.

---

## 3. Class Imbalance Correction

In continuous crop monitoring, the pump only runs occasionally. Over **90%** of historical readings represent wet or optimal soil states (`Class 0`), creating a severe class imbalance:
*   **Class 0**: ~88% of samples
*   **Class 1**: ~12% of samples

### The Correction: `class_weight='balanced'`
To prevent the model from always predicting Class 0 to achieve cheap accuracy, we weight each training classification error inversely proportional to class frequency:

$$\text{Weight}_c = \frac{n_{\text{samples}}}{n_{\text{classes}} \times n_{\text{samples\_c}}}$$

This forces the optimizer to penalize false negatives (missing dry soil) more heavily, yielding **100% Precision** and **100% Recall** for Class 1 on held-out chronological test data.

---

## 4. Reading the Confidence Score

At inference time, `RandomForestClassifier.predict_proba()` returns a float in $[0, 1]$ representing the probability that the soil needs water.
*   **High Confidence (≥ 75%)**: Autopilot prioritizes the command immediately.
*   **Low Confidence (50–74%)**: Evaluated alongside weather forecasts; if wind or heat stalling rules are active, irrigation stalls.

---

## 5. Self-Retraining Pipeline

The system is equipped with an automated self-retraining daemon:

```
┌─────────────────────────────────────────────────────────┐
│  data_extractor.py                                      │
│  → Query PostgreSQL sensor_readings + watering_events   │
│  → Apply 2-hour lookback labeling strategy              │
│  → Export labeled CSV                                   │
└──────────────────────┬──────────────────────────────────┘
                       │
                 ┌──────▼──────┐
                 │  ≥ 100      │
                 │  samples?   │
                 └──────┬──────┘
               Yes │         │ No
                   │         └──→  ABORT (insufficient data)
                   │
┌─────────────────▼───────────────────────────────────────┐
│  train_model.py                                         │
│  → Feature engineering (all 17 features)                │
│  → RandomForestClassifier(n_estimators=100, …)          │
│  → Evaluate on held-out 20% chronological test split    │
│  → Assert accuracy ≥ threshold before saving            │
└──────────────────────┬──────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────┐
│  Save artifacts                                         │
│  rf_model.pkl          (~2.3 MB)                        │
│  model_metadata.json   (feature list, thresholds, date) │
└──────────────────────┬──────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────┐
│  Version log → model_versions table (PostgreSQL)        │
│  Version tag format:  v{YYYYMMDD}_{HHMMSS}              │
└─────────────────────────────────────────────────────────┘
```

A hard floor of **≥ 100 labeled samples** is enforced. Training on fewer samples would lead to unstable tree structures and erratic predictions.

---

## 6. Model Drift Indicators

Data distributions shift over seasons due to weather changes, sensor decay, or soil composition adjustments. Operators should monitor for these warning signs:

### Prediction Shifts
*   **Average Prediction Probability Shift**: The 7-day rolling average probability of Class 1 shifts by more than $\pm15\%$ from baseline.
*   **Prediction Rate Collapse**: The model starts predicting Class 1 zero times over a 7-day period.

### Outcome Mismatches
*   **Dry Wilting**: Crop exhibits signs of drought stress, but the model output is stuck on `MONITOR / OPTIMAL`.
*   **Flooded Soil**: Autopilot triggers watering events back-to-back, saturating the field.

If any of these indicators trigger, run:
```bash
python src/backend/ai_service/retrain_pipeline.py
```
This pulls the latest historical sensor logs from PostgreSQL, retrains the Random Forest, and deploys the new `rf_model.pkl` in-memory.
