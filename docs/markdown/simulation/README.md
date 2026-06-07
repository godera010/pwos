# 🖥️ P-WOS Simulation (Digital Twin)

Welcome to the **P-WOS Simulation** directory. When physical ESP32 micro-controllers and agricultural sensors are unavailable, this folder provides a complete software "Digital Twin" that models environment physics, sensor communication, and water pump controls.

---

## 📂 Simulation Directory Contents

This directory contains three core components:

1. **[Simulation Runtime Guide](simulation_guide.md)**:
   * How the simulation physics works (Vapor Pressure Deficit, moisture decay).
   * How to start the simulation processes using local brokers and Flask APIs.
   * Switching between simulation and physical hardware mode.
2. **[Data Generation & DB Testing Reference](data_generation.md)**:
   * How bulk historical weather and sensor datasets are generated.
   * The training data extraction pipeline (Simulator ➔ MQTT ➔ DB ➔ CSV ➔ ML Trainer).
   * Database schema validation and connection pooling stress tests.

---

## 🧠 Why Simulation Was Developed First

Building P-WOS required a **simulation-first** strategy for two critical reasons:

*   **Accelerating Time**: Plants grow and soil dries over days and weeks. To gather the **630,000 samples** needed to train a robust crop-aware Random Forest model, we had to run simulated environmental cycles at high speeds.
*   **Preventing Damage**: Before putting software control loops in charge of real pumps, we validated the 5-second Autopilot loop, the 15-minute cooldown rules, and weather delays entirely in simulation. This protected the physical plants from accidental drowning or drought during developer testing.
