# 📐 System Architectures & Development Process

The Predictive Water Optimization System (P-WOS) was designed and implemented using a phased transition from virtual simulation to physical edge devices. The system architecture supports three distinct environments depending on the development and production stage.

---

## 🔄 The System Development Process

The project evolved through a structured six-stage pipeline, ensuring all software pipelines and control logic were fully tested before physical assembly:

```mermaid
graph TD
    A["Phase 1: Soil Physics & VPD Simulation"] --> B["Phase 2: Database Schema & Edge-Case Testing"]
    B --> C["Phase 3: Training the ML Brain (630,000 Samples)"]
    C --> D["Phase 4: Software Autopilot Control Loop Validation"]
    D --> E["Phase 5: ESP32 & Sensors Breadboard Integration"]
    E --> F["Phase 6: Cloud Deployment & Production Autopilot"]
    style A fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    style B fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    style C fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    style D fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    style E fill:#fef08a,stroke:#ca8a04,stroke-width:2px
    style F fill:#bfdbfe,stroke:#2563eb,stroke-width:2px
```

1. **Simulation Phase**: Developed a math-based digital twin of the soil and plants to simulate moisture depletion and evaporation.
2. **Database Verification**: Pre-populated PostgreSQL tables with simulated data to test connection pooling and queries.
3. **ML Training**: Generated a dataset of 630,000 samples to train a Random Forest model.
4. **Control Loop Validation**: Verified the 5-second control loop, 15-minute cooldown, and weather delay rules entirely in software.
5. **Hardware Integration**: Built physical breadboard hardware and loaded C++ firmware to replace the simulated signals.
6. **Cloud Production**: Deployed the Flask API, PostgreSQL, and MQTT broker to cloud servers for remote field operation.

---

## 📐 System Architectures

### 1. Development Architecture (Simulation-First)
Used during initial development. All hardware, telemetry, and atmospheric weather updates are fully simulated in local processes.

```mermaid
graph TB
    subgraph "Local Development Machine (Simulation)"
        SIM["🔌 ESP32 Simulator<br/><i>esp32_simulator.py</i>"]
        WX["🌦️ Weather Simulator<br/><i>weather_simulator.py</i>"]
        MQTT["📡 Mosquitto Broker<br/>Port: 1883"]
        API["⚙️ Flask Backend API<br/><i>app.py</i> (Port 5000)"]
        DB["🗄️ PostgreSQL Database<br/>Port: 5432"]
        AUTO["🤖 Automation Controller<br/><i>automation_controller.py</i>"]
        ML["🧠 ML Predictor (Crop-Aware)<br/><i>rf_model.pkl</i>"]
        FE["🖥️ React Dashboard UI<br/>Vite (Port 5173)"]
    end

    SIM -- "MQTT: pwos/sensor/data" --> MQTT
    WX -- "MQTT: pwos/weather/current" --> MQTT
    MQTT -- "Subscribe" --> API
    MQTT -- "pwos/control/pump" --> SIM
    API -- "Read/Write Queries" --> DB
    API -- "In-Memory Prediction" --> ML
    AUTO -- "Poll /api/predict" --> API
    AUTO -- "MQTT: Pump CMD" --> MQTT
    FE -- "HTTP REST Request" --> API

    style SIM fill:#bfdbfe,stroke:#2563eb,stroke-width:2px
    style WX fill:#ffedd5,stroke:#ea580c,stroke-width:2px
    style MQTT fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    style API fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
    style DB fill:#f1f5f9,stroke:#475569,stroke-width:2px
    style AUTO fill:#fef08a,stroke:#ca8a04,stroke-width:2px
    style ML fill:#fce7f3,stroke:#db2777,stroke-width:2px
    style FE fill:#ccfbf1,stroke:#0d9488,stroke-width:2px
```

### 2. Development Architecture (Real Hardware)
Used for physical breadboard assembly verification. The ESP32 simulator is replaced by the real physical ESP32 micro-controller, transmitting sensor readings over local WiFi to the Mosquitto broker.

```mermaid
graph TB
    subgraph "Edge Field Devices (Local WiFi)"
        ESP["🔌 Physical ESP32 Hardware<br/><i>C++ Firmware</i>"]
        DHT["🌡️ DHT11 Sensor"]
        SOIL["🌱 Moisture Probe"]
        RELAY["⚡ 5V Relay Switch"]
        PUMP["💧 5V Water Pump"]
    end

    subgraph "Local Development Machine"
        MQTT["📡 Mosquitto Broker<br/>Port: 1883"]
        API["⚙️ Flask Backend API<br/>Port: 5000"]
        DB["🗄️ PostgreSQL Database"]
        AUTO["🤖 Automation Controller"]
        ML["🧠 ML Predictor"]
    end

    ESP -- "Reads" --> DHT
    ESP -- "Reads" --> SOIL
    ESP -- "WiFi: pwos/sensor/data" --> MQTT
    MQTT -- "pwos/control/pump" --> ESP
    ESP -- "Triggers" --> RELAY
    RELAY -- "Switches" --> PUMP

    MQTT -- "Subscribe" --> API
    API -- "Read/Write" --> DB
    API -- "In-Memory Prediction" --> ML
    AUTO -- "Poll /api/predict" --> API
    AUTO -- "MQTT: Pump CMD" --> MQTT

    style ESP fill:#bfdbfe,stroke:#2563eb,stroke-width:2px
    style DHT fill:#f1f5f9,stroke:#475569,stroke-width:1px
    style SOIL fill:#f1f5f9,stroke:#475569,stroke-width:1px
    style RELAY fill:#fef08a,stroke:#ca8a04,stroke-width:1px
    style PUMP fill:#fef08a,stroke:#ca8a04,stroke-width:1px
    style MQTT fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    style API fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
```

### 3. Production Architecture (Cloud Deployment)
The final production architecture. The backend, database, and broker are deployed to cloud infrastructure (such as Railway or Render). The physical ESP32 communicates securely with the cloud broker over WAN (cellular/router WiFi), and the user accesses the live React interface and mobile application remotely.

```mermaid
graph TB
    subgraph "Edge (Physical Irrigation Site)"
        ESP["🔌 Physical ESP32 Edge<br/><i>Direct Internet Connection</i>"]
        PUMP["💧 Water Pump & Relay"]
    end

    subgraph "Cloud Hosting (Railway / Render)"
        CMQTT["📡 Cloud MQTT Broker<br/><i>HiveMQ Cloud</i>"]
        CAPI["⚙️ Cloud Flask API<br/><i>Gunicorn Server</i>"]
        CDB["🗄️ Managed PostgreSQL<br/><i>Pooled Connections</i>"]
        CML["🧠 Cloud ML Model"]
    end

    subgraph "External Integration"
        OWAPI["🌦️ OpenWeatherMap API"]
    end

    subgraph "User Applications"
        FE["🖥️ React Web App<br/><i>Vercel / Netlify</i>"]
        MOB["📱 React Native Mobile App<br/><i>Expo Client</i>"]
    end

    ESP -- "WAN WiFi: pwos/sensor/data" --> CMQTT
    CMQTT -- "Subscribe" --> CAPI
    CMQTT -- "pwos/control/pump" --> ESP
    ESP -- "Switches" --> PUMP

    CAPI -- "Queries" --> CDB
    CAPI -- "Predicts" --> CML
    CAPI -- "HTTP Request" --> OWAPI
    
    FE -- "HTTPS REST" --> CAPI
    MOB -- "HTTPS REST" --> CAPI

    style ESP fill:#bfdbfe,stroke:#2563eb,stroke-width:2px
    style PUMP fill:#fef08a,stroke:#ca8a04,stroke-width:1px
    style CMQTT fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    style CAPI fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
    style CDB fill:#f1f5f9,stroke:#475569,stroke-width:2px
    style CML fill:#fce7f3,stroke:#db2777,stroke-width:2px
    style OWAPI fill:#ffedd5,stroke:#ea580c,stroke-width:2px
    style FE fill:#ccfbf1,stroke:#0d9488,stroke-width:2px
    style MOB fill:#ccfbf1,stroke:#0d9488,stroke-width:2px
```
