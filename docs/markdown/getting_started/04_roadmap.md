# 🗺️ Project Roadmap

The development of the **Predictive Water Optimization System (P-WOS)** is structured into five high-level milestones. These stages trace the system's evolution from a software-based "digital twin" prototype into a cloud-connected physical irrigation controller.

---

## 📍 Where We Are Today

```
[Milestone 1: Simulation] ━━━━━━━━━► 100% Complete
[Milestone 2: ML & Weather] ━━━━━━━► 100% Complete
[Milestone 3: Interfaces] ━━━━━━━━━► 100% Complete
[Milestone 4: Physical Hardware] ━━► 100% Complete (Testing & Firmware Verified)
[Milestone 5: Cloud Production] ━━━► 25% Complete (Database Migrated)
```

---

## 🏁 Milestone Details

### 🌦️ Milestone 1: Soil & Weather Simulation (Complete)
* **Goal:** Create a virtual testing ground ("Digital Twin") for our plant.
* **What we did:** We wrote simulation engines that mimic real-world environment physics. The simulator recreates the daily heating of the sun, changes in humidity, wind speed, moisture absorption by roots, and evaporation. This allowed us to generate data and test the autopilot without risking physical plants.

### 🧠 Milestone 2: Machine Learning & Logic (Complete)
* **Goal:** Train the brain and write the priority rules.
* **What we did:** We collected over 630,000 data points from our simulator and used them to train a Random Forest model. We programmed the autopilot daemon to evaluate weather forecasts, check safety limits, and consult the ML model every 5 seconds to choose the best watering command. We ran tests proving the system achieves a **16.7% water saving**.

### 🖥️ Milestone 3: Web & Mobile Dashboards (Complete)
* **Goal:** Build beautiful, responsive interfaces for user control.
* **What we did:** We designed a premium web dashboard with real-time gauges, historical charts, and an Explainable AI (XAI) drawer that tells the user exactly *why* the autopilot is watering or waiting. We also developed a companion mobile app shell using React Native.

### 🔌 Milestone 4: Physical Hardware Integration (Complete)
* **Goal:** Move from simulation to real-world electronics.
* **What we did:** We purchased and assembled the physical parts (ESP32 microcontroller, soil sensor, air temperature sensor, relay, and miniature water pump). We wrote the C++ firmware, calibrated the soil sensor, and successfully verified that the physical pump turns on and off via MQTT messages.
* **Notes:** All hardware tests have successfully passed. Pin mappings were adjusted to GPIO 14 (DHT11) and GPIO 27 (Relay) to avoid bootstrapping reset conflicts.

### ☁️ Milestone 5: Cloud Production (Planned)
* **Goal:** Deploy the system to the cloud for remote monitoring.
* **What we did:** We migrated the local database structure from SQLite to PostgreSQL to handle production traffic.
* **Next Steps:** Host the API server and database on cloud platforms (like Railway/Render), deploy the web dashboard online, and run a 1-week continuous production test on physical plants.

---

> [!NOTE]
> For a detailed look at the software architectures and the developmental transition from virtual testing to cloud-connected production, see the **[System Architectures & Development Process](../system_architecture/system_architectures.md)** page.
>
> Are you a developer looking to contribute to P-WOS? Refer to the **[Technical Development Roadmap](../technical_reference/development_roadmap.md)** for detailed phase task lists, repository configuration checklists, and hardware schematics.
