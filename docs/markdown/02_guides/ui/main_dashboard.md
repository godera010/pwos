# Main Dashboard Guide

The P-WOS Main Dashboard (`Dashboard.tsx`) provides a premium, high-fidelity monitoring and control console for the Predictive Watering Optimization System. It integrates real-time telemetry, crop-aware limits, and explainable machine learning insights in a responsive, glassmorphic interface.

---

## 🎨 Design System & Visual Highlights

The dashboard adheres to a modern, dark-mode-first aesthetic (with full light-mode compatibility) using HSL color mapping, smooth transition overlays, glassmorphic backdrops, and active-pulse micro-animations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              P-WOS CONSOLE                             │
├────────────────────────────────────────────────────────────────────────┤
│  [🌿 Maize (60%)]                       [● Diagnostics Live] [MONITOR] │
├───────────────────┬───────────────────┬────────────────────────────────┤
│  SOIL MOISTURE    │  AMBIENT          │  SYSTEM HEALTH                 │
│      (54%)        │  Temp: 24.8°C     │  ● Message Broker  [CONNECTED] │
│                   │  Humid: 60.1%     │  ● Database / API  [CONNECTED] │
│  Optimal Range    │  VPD: 1.18 kPa    │  ● Sensor Hub      [   ONLINE] │
│  (35% - 85%)      │  [Optimal Badge]  │  ● ML Engine       [   ACTIVE] │
├───────────────────┴───────────────────┴────────────────────────────────┤
│  🧠 AI PREDICTION ENGINE                                               │
│  ✓ System Optimal (Confidence: 94%)                                    │
│  "Moisture stable and optimal based on live evapotranspiration."      │
│  [▼] ML Diagnostics & Feature Insights                                 │
├────────────────────────────────────────────────────────────────────────┤
│  p-wos://system-events [LIVE FEED]                                     │
│  ● [INF] 09:22:15 Moisture stable. Decay: 0.15%/h.         Just now    │
│  ● [ACT] 09:15:00 Pump deactivated after 30s cycle.        7m ago      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Core Dashboard Components

### 1. Soil Moisture Card (Saturation Overhaul)
* **Visual Gauge:** Renders a high-accuracy circular moisture gauge reflecting live soil humidity.
* **Crop-Aware Boundaries:** Graphically highlights the **85% Saturation Limit** and the crop-specific critical low thresholds dynamically.
* **Dynamic Range Warnings:** Generates localized status blocks below the gauge based on active readings:
  * **Critically Dry (< 15%):** `"Soil critically dry. Failsafe auto-irrigation engaged."` (Rose / Red pulsing alert)
  * **Low Moisture (15% - 35%):** `"Moisture low. Autopilot scheduled to trigger soon."` (Orange alert)
  * **Optimal Moisture (35% - 85%):** `"Moisture optimal for root uptake and growth."` (Emerald Green)
  * **Saturated (≥ 85%):** `"Soil saturated. Pump locked out to prevent root rot."` (Cyan / Teal)

### 2. Ambient Conditions & Vapor Pressure Deficit (VPD)
Vapor Pressure Deficit (VPD) measures the drying power of the air, representing the physical transpiration pressure exerted on the crop.
* **Dynamic Calculation:** VPD is computed using the high-accuracy Tetens formula fallback:
  $$e_s = 0.61078 \times e^{\left(\frac{17.27 \times T}{T + 237.3}\right)}$$
  $$e_a = e_s \times \left(\frac{RH}{100}\right)$$
  $$\text{VPD} = \max(0, e_s - e_a)$$
* **Transpiration Stress Badges:** The UI classifies crop transpiration stress into color-coded indicator badges:
  * **`< 0.4 kPa`:** `Saturated (Fungal Risk)` (sky blue badge)
  * **`0.4 - 0.8 kPa`:** `Low Transpiration` (blue badge)
  * **`0.8 - 1.2 kPa`:** `Optimal Transpiration` (glowing emerald badge)
  * **`1.2 - 2.0 kPa`:** `Moderate Evap Stress` (amber badge)
  * **`> 2.0 kPa`:** `Extreme Vapor Stress` (rose pulsing badge)

### 3. System Health Console
Transforms status listings into a server-health console grids:
* Pulsing glow animations (`animate-pulse-glow`) indicate operational states.
* Monitors five key subsystems concurrently: **Message Broker (MQTT)**, **Database / API**, **ESP32 Sensor Hub**, **ML Prediction Engine**, and the **Physical Pump Relay**.

### 4. AI Prediction Card & Explainable AI (XAI) Drawer
The AI prediction card dynamically shifts its layout styling, border glows, and colors depending on the active ML action recommendations:
* **NOW (Hydration Dispatch):** Indigo-to-violet gradient borders.
* **STALL (Resource Guard Delay):** Amber-to-orange borders.
* **STOP (Safety Cutoff Override):** Pulsing rose-to-pink borders.
* **MONITOR (Continuous Watch):** Emerald-to-teal borders.

#### Collapsible Diagnostics Drawer
An interactive **"ML Diagnostics & Feature Insights"** button opens a detailed features grid exposing the exact telemetry parameters evaluated by the Random Forest model:
* **Moisture Change Rate (%/hr):** Shows soil moisture rate trends with corresponding upward (green) or downward (indigo) indicator arrows.
* **Midday Peak Guard:** Flags whether midday heatwave rules (`is_hot_hours === 1`) are actively stalling or preheating irrigation.
* **Vapor Pressure Deficit (VPD):** Displays the exact kPa value used as model input.
* **High Wind Delay Guard:** Flags if high wind speeds (`wind_speed > 20 km/h`) have triggered evaporation guards.
* **6h Rolling Averages:** Mean moisture and temperature values calculated over the preceding 6 hours.

### 5. Snappy Event Log Terminal
* **Decoupled Polling:** Event logs are fetched from the API on a snappy **3-second interval**, decoupled from the heavy forecast/predict endpoints to ensure instant user visibility when events occur.
* **Client-Side Deduplication:** A contiguous reduction filter suppresses redundant log lines before displaying them.
* **Monospaced Hacker Theme:** Encapsulated in a monospaced terminal environment with colored window controls:
  * `[INF]` (Info - Sky Blue): General monitoring details.
  * `[ACT]` (Action - Violet Glow): Autopilot activations, mode swaps, and pump events.
  * `[ERR]` (Error - Rose Pulsing): Broker timeouts, offline signals, and hardware disconnects.
* **Relative Timestamps:** Uses relative string conversions (`Just now`, `5m ago`, `2d ago`) for rapid reading.

---

## 🛠️ State Mappings & API Contract

The frontend bindings rely on the updated `PredictionData` structure from `api.ts`:

```typescript
export interface PredictionData {
    recommended_action: 'NOW' | 'STALL' | 'STOP' | 'MONITOR';
    ml_analysis: {
        confidence: number;
        probability_class_1: number;
        system_status: string;
        reason: string;
        features_used?: {
            soil_moisture?: number;
            temperature?: number;
            humidity?: number;
            moisture_change_rate?: number;
            is_hot_hours?: number;
            vpd?: number;
            is_high_wind?: number;
            moisture_rolling_6?: number;
            temp_rolling_6?: number;
        };
    };
    recommended_duration: number;
    system_status: string;
}
```
