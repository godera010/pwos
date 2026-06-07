# 🧠 P-WOS Machine Learning

This section is dedicated to the **Machine Learning (ML)** subsystem of P-WOS. P-WOS uses a crop-aware and region-adaptive Random Forest Classifier to anticipate agricultural irrigation needs before water stress occurs.

---

## 📂 Machine Learning Documentation Index

This directory contains the following detailed technical references:

1. **[ML Model Overview & Architecture](ml_model_guide.md)**:
   * Architecture diagrams of the AI pipeline.
   * Model types, training datasets (630,000 samples), and hyperparameters.
   * Explaining the 4-phase ML Pipeline (Collection, Preparation, Training, Inference).
2. **[Model Deep Dive Specifications](ml_model_deep_dive.md)**:
   * Target prediction definitions (`needs_watering_soon`).
   * Addressing class imbalances using balanced sample weights.
   * Self-retraining pipelines and model drift indicator checklists.
3. **[Feature Engineering & Physics Calculations](feature_engineering.md)**:
   * Detailed breakdown of the 12 base and 8 derived temporal features.
   * The mathematics of Vapour Pressure Deficit (VPD) and the Tetens equation.
   * In-memory settings injection for zero-disk I/O prediction loops.

---

## 📐 The Two-Layer Architecture: ML & Rules

P-WOS couples machine learning with a deterministic physical rule-based engine:

*   **Layer 1: Random Forest Classifier**: Analyzes historical trends, VPD shifts, and forecasts to predict if soil moisture will deplete within the next 2 hours.
*   **Layer 2: Decision Engine**: Evaluates explicit safety interlocks (preventing pump operation during storms, blocking midday watering due to extreme heat evaporation, and triggering emergency cutoffs when soil moisture hits the critical floor).
