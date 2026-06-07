# 📂 System Structure

The **P-WOS** codebase is organized into clean, dedicated modules that separate the hardware, backend server, frontend dashboard, and simulation testing environments.

---

## 📁 Conceptual Directory Map

Here is where the different parts of the system live:

```
pwos/
├── src/
│   ├── backend/          # The server that hosts the ML "brain" and database.
│   ├── frontend/         # The web dashboard and mobile app interfaces.
│   ├── firmware/         # C++ code that runs on the physical ESP32 device in the field.
│   └── simulation/       # Software models representing virtual plants and weather.
├── docs/                 # Documentation index, guides, and reports.
├── data/                 # PostgreSQL databases and crop configurations.
├── logs/                 # Active log files recording system decisions.
└── scripts/              # Simple startup tools to launch the system with one click.
```

---

## 🔧 High-Level Component Roles

### 💻 1. The Dashboard (Frontend)
Located in `src/frontend/`, this is the user-facing application built using **React**. It displays real-time telemetry from soil sensors, provides historical charts, lets users change crop types, and features an **Explainable AI (XAI)** section that explains the autopilot's decisions in plain English.

### ⚙️ 2. The Control Server (Backend)
Located in `src/backend/`, this is the backend server built in **Python/Flask**. It acts as the coordinator of the system, storing sensor readings in a **PostgreSQL** database and hosting the **autopilot daemon**. The autopilot checks the weather and soil every 5 seconds, consults the ML model, and sends control commands to the pump.

### 🔌 3. The Controller (Firmware)
Located in `src/firmware/`, this is the C++ code written for the **ESP32 microcontroller**. It reads physical data from the temperature, humidity, and soil moisture sensors, and sends that data to the server using the **MQTT** message protocol. It also listens for commands to turn the physical water pump on or off.

### 🌦️ 4. The Digital Twin (Simulation)
Located in `src/simulation/`, these are simulators that generate realistic weather cycles (sun, rain, humidity, wind) and soil physics (how fast water evaporates or drains depending on temperature and root activity). This environment was used to train the ML brain in software before real hardware was built.

---

## 📡 How Data Flows

P-WOS is designed so that each component passes messages to the other in a simple cycle:

```
[Soil & Air Sensors] 
       │ 
       ▼ (Publish data)
  [MQTT Broker] ◄━━━━━━━━━━━━━━━━━━━ [Autopilot Engine]
       │                                     ▲
       ▼ (Receive data)                      │ (Evaluate status)
 [Control Server] ──► [Database] ──► [ML Predictor Brain]
```

1. **Readings:** Sensors (real or simulated) publish soil and air data.
2. **Delivery:** The MQTT broker forwards these readings to the Control Server.
3. **Storage:** The Control Server logs the readings in the PostgreSQL Database.
4. **Decision:** The Autopilot engine reads the database, gets weather forecasts, and calls the ML Predictor Brain to decide if the soil needs moisture.
5. **Action:** If watering is needed, the Autopilot publishes a "Pump ON" message, which the physical water pump receives and executes.

---

> [!NOTE]
> Are you looking for a file-by-file codebase layout or python configuration keys? Refer to the **[Technical Project Structure Guide](../technical_reference/guidelines/project_structure.md)**.
