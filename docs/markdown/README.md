# P-WOS Documentation

<!-- NAV_START -->
<div align="center">
  <a href="..\README.md">🏠 Home (Root)</a> |
  <a href="..\src\README.md">💻 Source Code</a> |
  <a href="README.md">📚 Documentation</a> |
  <a href="03_hardware\README.md">⚙️ Hardware</a> |
  <a href="..\data\README.md">💾 Data</a>
</div>
<hr>
<!-- NAV_END -->


**Predictive Water Optimization System**

---

## Start Here

| Document | Description |
|----------|-------------|
| [**MASTER_SYSTEM_MANUAL.md**](MASTER_SYSTEM_MANUAL.md) | **Definitive Technical Encyclopedia (Start Here for Deep Understanding)** |
| [QUICKSTART.md](01_getting_started/QUICKSTART.md) | Run the system in 5 minutes |
| [PROJECT_OVERVIEW.md](01_getting_started/PROJECT_OVERVIEW.md) | Research background, hypothesis, validated results |
| [PROJECT_ROADMAP.md](01_getting_started/PROJECT_ROADMAP.md) | Development phases and progress |
| [CROP_INTEGRATION_PLAN.md](04_architecture_&_research/planning/crop_integration_plan.md) | Multi-crop & multi-region adaptive ML design (✅ implemented) |
| [Codebase Analysis](04_architecture_&_research/analysis/codebase_analysis.md) | Technical architecture summary |

---

## 🧠 System Behaviour (NEW)

The core of what P-WOS actually *does* — behaviour, intelligence, and inner life of the system. Start here to understand the system, not just install it.

| Document | Description |
|----------|-------------|
| [System Overview](07_system_behaviour/system_overview.md) | Modes, the 5-second control loop, 15 status codes, safety overrides |
| [Dataflow](07_system_behaviour/dataflow.md) | MQTT topics, PostgreSQL schema, full data pipeline from sensor to pump |
| [VPD & Weather Engine](07_system_behaviour/vpd_and_weather_engine.md) | VPD physics, moisture decay model, rain confidence, 11 real scenarios |
| [Crop Profiles](07_system_behaviour/crop_profiles.md) | All 5 crops + 3 regions, thresholds, how crops change every decision |
| [ML Model Deep Dive](07_system_behaviour/ml_model_deep_dive.md) | 12 features, what the model predicts, Decision Engine state machine |
| [Analytics Reference](07_system_behaviour/analytics_reference.md) | All 8 dashboard pages — what they show, how they calculate |
| [Edge Cases & Scenarios](07_system_behaviour/edge_cases_and_scenarios.md) | Complete "what happens when" handbook with 15 traced scenarios |

---

## Guides

Technical how-it-works documentation.

| Guide | Description |
|-------|-------------|
| [Backend Guide](02_guides/technical/backend_guide.md) | Flask API, ML pipeline, MQTT integration, connection pooling, architecture decisions |
| [Database Guide](02_guides/technical/database_guide.md) | PostgreSQL schema, pooling, indexes, queries, setup |
| [Performance Guide](02_guides/operations/performance_guide.md) | v3.0 production optimizations: pooling, indexes, in-memory ML, React memoization |
| [Installation Guide](02_guides/setup/installation_guide.md) | Step-by-step PostgreSQL, Mosquitto, Python, Node.js setup |
| [ML Model Guide](02_guides/ml/ml_model_guide.md) | Multi-crop Random Forest training, decision engine, VPD, crop profiles, retraining pipeline |
| [Firmware Guide](02_guides/technical/firmware_guide.md) | ESP32 firmware: pinout, LWT, calibration, modes |
| [Simulation Guide](02_guides/technical/simulation_guide.md) | ESP32 + weather simulators, scenarios, data gen |
| [Main Dashboard](02_guides/ui/main_dashboard.md) | Premium dashboard UI, explainable AI diagnostics drawer, snappy log terminal, VPD metrics |
| [Analytics Dashboard](02_guides/ui/analytics_dashboard.md) | Gap-aware KPIs, chart rendering, data aggregation |
| [Mobile App Guide](02_guides/ui/mobile_guide.md) | iOS & Android React Native Expo Mobile App Guide |
| [Troubleshooting](02_guides/operations/troubleshooting.md) | Common issues & solutions across all components |
| [Test Suite](02_guides/operations/tests.md) | 116 tests: unit, integration, scenario, performance (all passing ✅) |

---

## Reference

Specifications and standards.

| Reference | Description |
|-----------|-------------|
| [API Reference](05_reference/specs/api_reference.md) | REST endpoints v3.0 — includes /api/settings, crop endpoints |
| [MQTT Topics](05_reference/specs/mqtt_topics.md) | Topic catalog, payload schemas, QoS, routing |
| [Project Structure](05_reference/guidelines/project_structure.md) | Directory layout, file index, tech stack |
| [Coding Guidelines](05_reference/guidelines/coding_guidelines.md) | Code standards and conventions |
| [VPD Scenarios](05_reference/specs/vpd_scenarios.md) | Vapor Pressure Deficit test cases |

---

## Reports

Historical project reports and validation data.

| Report | Description |
|--------|-------------|
| [Final Report](06_reports_&_validation/analysis/final_report.md) | Complete project report + hypothesis validation |
| [Validation Report](06_reports_&_validation/analysis/validation_report.md) | A/B test methodology and results |
| [Phase 01 — Setup](06_reports_&_validation/phases/phase_01_setup_report.md) | Environment & simulator phase |
| [Phase 02 — ML](06_reports_&_validation/phases/phase_05_ml_report.md) | Machine learning model phase |
| [Phase 03 — Frontend](06_reports_&_validation/phases/phase_06_frontend_report.md) | React dashboard phase |
| [Moisture Analysis](06_reports_&_validation/analysis/moisture_analysis.md) | Sensor data trends |
| [Simulation Analysis](06_reports_&_validation/analysis/simulation_analysis.md) | Simulation results data |

---

## Hardware

ESP32 hardware integration.

| Document | Description |
|----------|-------------|
| [Hardware Architecture](03_hardware/architecture/hardware_architecture.md) | System schematic and components |
| [Migration Plan](03_hardware/planning/hardware_migration_plan.md) | Transition from simulation to hardware |
| [Shopping List](03_hardware/planning/hardware_shopping_list.md) | Component list and costs (~$60-80) |
| [Breadboard Assembly](03_hardware/guides/breadboard_assembly.md) | Physical wiring guide |
| [Hardware Setup](03_hardware/guides/hardware_setup.md) | Connections and configuration |

---

## Deployment

Cloud deployment and implementation planning.

| Document | Description |
|----------|-------------|
| [Cloud ML Deployment](02_guides/cloud_ml_deployment.md) | Deploy ML API to cloud |
| [Local Implementation](02_guides/local_implementation.md) | Full local setup guide |
| [ML Implementation Roadmap](02_guides/ml_implementation_roadmap.md) | ML feature roadmap |