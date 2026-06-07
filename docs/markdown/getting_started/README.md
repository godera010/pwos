# 📚 P-WOS Documentation Index

Welcome to the documentation for the **Predictive Watering Optimization System (P-WOS)**. This system is a smart irrigation platform that combines IoT soil sensors, real-time meteorological weather forecasts, and a Machine Learning decision engine to save water while maintaining optimal plant health.

---

## 🚀 Getting Started

If you are new to the P-WOS system, start by reading these introductory guides:

| Guide | Description |
|:---|:---|
| 🏠 **[Project Overview](01_project_overview.md)** | Learn about the thesis background, hypothesis, and validated results. |
| 🌱 **[About P-WOS](02_about.md)** | A conceptual introduction to predictive watering vs. traditional timers. |
| ✨ **[Core Features](03_features.md)** | Explore the smart capabilities of P-WOS, from crop profiles to regional zones. |
| 🗺️ **[Development Roadmap](04_roadmap.md)** | High-level milestones and project progress. |
| 📂 **[System Structure](05_structure.md)** | High-level layout of the directories and tech stack. |
| 🧠 **[Core Logic Summary](06_summary.md)** | A plain-English summary of the ML brain, physics engine, and priorities. |
| ⚙️ **[System Overview & Autopilot](07_architecture.md)** | How the autopilot makes decisions every 5 seconds. |

> [!TIP]
> Ready to run the code? Head straight to the **[Quick Start Guide](../core_guides/setup/QUICKSTART.md)** to launch the simulation or hardware in under 5 minutes.

---

## 🛠️ How-To Guides

Technical guides for configuring, deploying, and operating each part of the system:

* **Setup & Operations:**
  * [Installation Guide](../core_guides/setup/installation_guide.md) — Detailed steps to configure PostgreSQL, Mosquitto MQTT, Python, and Node.js.
  * [Troubleshooting Handbook](../core_guides/operations/troubleshooting.md) — Common issues and fixes.
  * [Test Suite Reference](../core_guides/operations/tests.md) — Overview of the 116 passing unit, integration, and scenario tests.
* **Core Components:**
  * [Database Guide](../core_guides/technical/database_guide.md) — Database design, connection pooling, and indexing strategies.
  * [Backend API Guide](../core_guides/technical/backend_guide.md) — Flask architecture, MQTT pipelines, and caching.
  * [ML Model Guide](../ml/ml_model_guide.md) — Training pipelines, feature lists, and retraining schedules.
  * [Main Dashboard UI](../core_guides/ui/main_dashboard.md) — Premium React dashboard and XAI diagnostics.
  * [Mobile App Guide](../core_guides/ui/mobile_guide.md) — React Native Expo mobile interface.
  * [Simulator Guide](../simulation/simulation_guide.md) — Virtual plant physics, moisture decay, and weather generation.

---

## 🧠 System Inner Workings

For a deeper understanding of the autonomous logic and mathematical models behind P-WOS, read these system design documents:

* [Agro-Ecological Crop Profiles](../system_architecture/crop_profiles.md) — Moisture thresholds, root profiles, and evaporation multipliers for all 5 crops.
* [VPD & Weather Engine](../system_architecture/vpd_and_weather_engine.md) — The physics of Vapor Pressure Deficit and soil moisture decay.
* [ML Predictor Deep Dive](../ml/ml_model_deep_dive.md) — How the Random Forest model is structured and evaluated.
* [Dataflow & Message Pipelines](../system_architecture/dataflow.md) — MQTT topics, JSON payloads, and PostgreSQL interaction paths.
* [Dashboard Analytics Guide](../system_architecture/analytics_reference.md) — KPI calculations, gap-aware data aggregation, and charts.
* [Autopilot Scenarios & Edge Cases](../system_architecture/edge_cases_and_scenarios.md) — Trace logs for 15 extreme watering and weather scenarios.

---

## 📁 Reference & Reports

* [API Reference Specs](../technical_reference/specs/api_reference.md) — Complete REST endpoint documentation.
* [MQTT Topics Catalogue](../technical_reference/specs/mqtt_topics.md) — Message broker topic schemas and QoS configurations.
* [Coding Guidelines](../technical_reference/guidelines/coding_guidelines.md) — Code standards and conventions.
* [Hypothesis Validation Report](../reports_and_validation/analysis/validation_report.md) — A/B simulation methodology and water savings proofs.
* [Final Thesis Report](../reports_and_validation/analysis/final_report.md) — Complete academic thesis document.