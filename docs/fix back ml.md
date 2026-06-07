# Implementation Plan - ML Model Calibration and Document Alignment

This plan addresses three critical issues identified in the P-WOS machine learning pipeline before the thesis defence:
1. **Data Leakage & 99.99% Accuracy:** Transition from a random shuffle split to a chronological split to prevent future data from leaking into training.
2. **Feature Discrepancies in Docs:** Align all documentation to correctly list 17 features rather than the outdated 12.
3. **Dataset Size Discrepancy (155k vs 630k):** Identify and fix a pandas index alignment bug in the weather infusion logic that silently dropped ~480,000 samples.

---

## User Review Required

> [!IMPORTANT]
> **Deterministic Labeling vs. Future Lookahead:**
> Currently, the labels are generated deterministically in `data_extractor.py` using `soil_moisture < wilting_point_threshold + 5.0`. Since both variables are features in the Random Forest model, the model easily learns this threshold formula. Even with a chronological split, accuracy will remain extremely high (~99.9%) unless the labeling logic is changed to use a lookahead (predicting if soil moisture *will drop* below the critical threshold in the next 12–24 hours, similar to the synthetic generator). 
> 
> We will implement the chronological split and fix the weather data bug. If the accuracy remains high due to deterministic labeling, we will explain this in the final walkthrough so you can defend it (i.e. the model acts as a highly reliable multi-dimensional threshold evaluator, and we have proven it by evaluating chronological time-series holdouts).

---

## Open Questions

- *Do you want us to adjust the labeling logic in `data_extractor.py` to be predictive (with a future lookahead), or keep the deterministic agronomic threshold formula as currently structured?*
  - **Recommendation:** Keep the current threshold formula but document/verify it correctly. Modifying the labeling logic to be predictive requires complex lookahead steps over non-continuous agricultural data and could alter the system's operational behaviour which is already integrated.

---

## Proposed Changes

### Data Pipeline & Extractor

#### [MODIFY] [data_extractor.py](file:///c:/Users/Godwin/Documents/projects/pwos/src/backend/ai_service/data_extractor.py)
- In `extract_and_label_data`:
  - Retain `timestamp` in `export_cols` and `required_cols` so it is saved in `real_training_data.csv`.
  - Fix the weather data assignment bug. Instead of:
    ```python
    df_crop_region['temperature'] = sampled_weather['temperature']
    ```
    Use `.values` to prevent pandas index alignment from introducing NaNs:
    ```python
    df_crop_region['temperature'] = sampled_weather['temperature'].values
    ```
- In `load_mendeley_tomato_data` and `load_zenodo_maize_data`:
  - Ensure `timestamp` is kept and properly formatted.

#### [MODIFY] [generate_synthetic_history.py](file:///c:/Users/Godwin/Documents/projects/pwos/scripts/data/generate_synthetic_history.py)
- Add `timestamp` column to the generated `synthetic_training_data.csv` to match the format of the real dataset.

### ML Training Pipeline

#### [MODIFY] [train_model.py](file:///c:/Users/Godwin/Documents/projects/pwos/src/backend/models/train_model.py)
- Load `real_training_data.csv` and `synthetic_training_data.csv`.
- Parse the `timestamp` column, sort by it chronologically, and drop it from `X` (so it's not a feature).
- Implement a chronological split (first 80% for training, last 20% for testing) instead of `train_test_split(..., stratify=y)`.

### Documentation

#### [MODIFY] [README.md](file:///c:/Users/Godwin/Documents/projects/pwos/README.md)
- Update occurrences of "12 features" to "17 features".

#### [MODIFY] [backend_guide.md](file:///c:/Users/Godwin/Documents/projects/pwos/docs/markdown/core_guides/technical/backend_guide.md)
- Update occurrences of "12 features" to "17 features".

---

## Verification Plan

### Automated Tests
- Run `data_extractor.py` to regenerate `real_training_data.csv` and verify it contains 630,000+ rows.
- Run `train_model.py` to retrain the model and save the updated metadata.
- Run `debug_ml.py` to verify the predictor works properly with the retrained model.
- Run the system test suite using:
  ```powershell
  .venv\Scripts\pytest
  ```

### Manual Verification
- Review `model_metadata.json` to inspect the final accuracy, precision, recall, and F1-score with the chronological split.
