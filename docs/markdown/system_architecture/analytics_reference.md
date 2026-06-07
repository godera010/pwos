# Analytics & Dashboard Reference

> **Document:** `system_architecture/analytics_reference.md`
> **System:** P-WOS v2.0 — Predictive Watering & Optimisation System
> **Scope:** All eight frontend pages — what they display, what data they fetch, and what calculations they perform.

---

## Table of Contents

1. [Dashboard Overview](#1-dashboard-overview)
2. [Moisture Gauge Bands](#2-moisture-gauge-bands)
3. [Analytics Page](#3-analytics-page)
4. [Gap-Filling Algorithm](#4-gap-filling-algorithm)
5. [Control Page](#5-control-page)
6. [Crop Settings Page](#6-crop-settings-page)
7. [Irrigation Efficiency Page](#7-irrigation-efficiency-page)
8. [ML Audit Page](#8-ml-audit-page)
9. [ML Insights Page](#9-ml-insights-page)
10. [Model Registry Page](#10-model-registry-page)
11. [System Health Page](#11-system-health-page)
12. [API Endpoints Summary](#12-api-endpoints-summary)

---

## 1. Dashboard Overview

**Source file:** `src/frontend/src/pages/Dashboard.tsx` (55 486 bytes)

The Dashboard is the primary monitoring view for P-WOS. It refreshes **every 5 seconds** via polling and presents a real-time snapshot of the entire irrigation system in a single screen. There is no manual refresh required; the page silently re-fetches all card data on each cycle.

### 1.1 Sensor Status Card

Displays the current state of the ESP32 soil-moisture sensor (or simulator):

| Field | Source | Description |
|---|---|---|
| **Soil Moisture** | `GET /api/sensor-readings/history?hours=0.05` (latest record) | Current volumetric water content expressed as a percentage (0–100 %). Rendered as an arc gauge with colour-coded bands (see §2). |
| **Temperature** | Same sensor reading | Ambient air temperature in °C. |
| **Humidity** | Same sensor reading | Relative humidity in %. |

The gauge needle and background segment colour change in real time according to the thresholds defined in §2.

### 1.2 ML Prediction Card

Displays the output of the most recent inference from the active model:

| Field | Source | Description |
|---|---|---|
| **Recommended Action** | `GET /api/ml-decisions` (latest row) | One of four discrete states: **NOW**, **STALL**, **STOP**, or **MONITOR**. |
| **Confidence %** | Same response | Float 0–100 representing model certainty in the chosen action. |
| **System Status Code** | Same response | Internal numeric code summarising sensor and model health. |
| **Reason Text** | Same response | Human-readable explanation of why the model chose the action (e.g., "Moisture below threshold, VPD high"). |

### 1.3 Weather Card

Rendered by the sub-component `WeatherCard.tsx`. Data comes from the configured weather provider (OpenWeatherMap or the system's internal fallback):

| Field | Description |
|---|---|
| **Temperature** | Current ambient temperature from the weather API (may differ slightly from sensor temperature). |
| **Rain Probability** | Percentage likelihood of precipitation in the next forecast window. |
| **Wind Speed** | Wind speed in m/s. |
| **VPD** | Vapour Pressure Deficit in kPa — calculated client-side from temperature and humidity using the Tetens formula (see §3.2). |
| **Condition Icon** | Weather icon (e.g., sun, cloud, rain) mapped from the API condition code. |

### 1.4 Water Savings Card

Provides a high-level summary of the efficiency gain achieved by the predictive system compared with a simulated reactive baseline:

| Field | Description |
|---|---|
| **Water Saved (L)** | Cumulative litres saved since first system boot, comparing `water_usage_ai` vs `water_usage_standard`. |
| **Efficiency Gain (%)** | `(1 − water_usage_ai / water_usage_standard) × 100`. |
| **Unnecessary Waterings Avoided** | Count of standard-schedule events where the ML model correctly suppressed irrigation. |

### 1.5 System Logs Card

Streams the last *N* entries from the `system_logs` table (configurable; typically the last 20–50 rows). Each log entry shows:

- Timestamp
- Severity level (INFO / WARN / ERROR)
- Component (e.g., `ml_engine`, `mqtt`, `scheduler`)
- Message text

Logs auto-scroll on new entries and are colour-coded by severity.

### 1.6 Quick Actions (QuickActions.tsx)

An inline action panel embedded in the Dashboard:

| Action | Effect |
|---|---|
| **Manual Pump Trigger** | Sends an immediate pump-on command for a user-specified duration (seconds). Writes to the `watering_events` table and publishes to the MQTT topic. |
| **Mode Toggle — AUTO / MANUAL** | Switches the system operating mode. In **AUTO**, the ML engine controls irrigation. In **MANUAL**, the scheduler is paused and only user-initiated commands run the pump. |

---

## 2. Moisture Gauge Bands

**Source:** `src/frontend/details.md`, implemented in `Dashboard.tsx`.

The arc gauge uses four colour bands tied to agronomic soil-moisture thresholds. The thresholds apply to the crop currently configured in Crop Settings (§6); a single threshold table is used for all supported crops unless per-crop overrides are set.

| Band | Range | Colour | Agronomic Meaning |
|---|---|---|---|
| **Critical** | 0 – 30 % | 🔴 Red | Soil is dangerously dry. The ML model is very likely to recommend **NOW** (water immediately). Without irrigation, plant stress is imminent. |
| **Low** | 30 – 50 % | 🟡 Yellow | Soil moisture is below the optimal target range. The model may recommend **MONITOR** or **STALL**, depending on incoming weather data and VPD. |
| **Optimal** | 50 – 80 % | 🟢 Green | Soil is well-hydrated. Normal growing conditions. The model is likely to recommend **STOP** or **MONITOR**. |
| **Saturated** | 80 – 100 % | 🔵 Blue | Soil has excess moisture. Risk of waterlogging or root hypoxia. The model will recommend **STOP** and may flag an anomaly. |

> **Implementation note:** The gauge arc is divided into four fixed segments. The needle position is computed from the raw moisture percentage. The segment and needle colour both update on every 5-second poll cycle.

---

## 3. Analytics Page

**Source file:** `src/frontend/src/pages/Analytics.tsx` (26 859 bytes)

The Analytics page provides historical charts over a user-selected time window. Users choose a **lookback period** (hours) and a **time bucket interval** from the toolbar, then the page fetches pre-aggregated data from the backend and renders four chart panels.

### 3.1 Time Bucket Selector

The interval control maps UI labels to millisecond values for bucket alignment:

| UI Label | Bucket Width |
|---|---|
| 1 minute | 60 000 ms |
| 5 minutes | 300 000 ms |
| 10 minutes | 600 000 ms |
| 15 minutes | 900 000 ms |
| 1 hour | 3 600 000 ms |
| 6 hours | 21 600 000 ms |

The selected interval is passed as a query parameter to `GET /api/analytics/aggregated`.

### 3.2 VPD Calculation (Client-Side, Tetens Formula)

VPD is **not** stored in the database. It is recomputed client-side for every data point returned by the analytics endpoint, using the Tetens formula:

```
es = 0.6108 × exp( (17.27 × T) / (T + 237.3) )   [kPa]
ea = es × (RH / 100)                                [kPa]
VPD = max(0, es − ea)                              [kPa]
```

Where:
- **T** = temperature in °C
- **RH** = relative humidity in %
- **es** = saturation vapour pressure
- **ea** = actual vapour pressure

A `max(0, …)` clamp prevents physically impossible negative VPD values due to rounding in sensor data.

### 3.3 Chart Panel 1 — Soil Moisture Timeline

| Property | Value |
|---|---|
| Chart type | `LineChart` (Recharts) |
| X-axis | UTC timestamp (time bucket start) |
| Y-axis | Soil moisture (%) |
| Gap handling | Breaks in line where data is missing (see §4) |
| Colour bands | Background reference bands matching gauge thresholds (§2): red 0–30, yellow 30–50, green 50–80, blue 80–100 |

This panel shows the moisture trajectory over the selected window, making drying curves and irrigation events visually apparent.

### 3.4 Chart Panel 2 — Temperature & VPD Overlay

| Property | Value |
|---|---|
| Chart type | Dual-axis `LineChart` |
| X-axis | UTC timestamp |
| Left Y-axis | Temperature (°C) |
| Right Y-axis | VPD (kPa), computed client-side per §3.2 |
| Purpose | Shows the relationship between heat stress (temperature) and evapotranspiration demand (VPD) — high VPD with high temperature signals the strongest irrigation need. |

### 3.5 Chart Panel 3 — Water Usage Comparison

| Property | Value |
|---|---|
| Chart type | `BarChart` |
| X-axis | UTC timestamp (time bucket) |
| Y-axis | Volume (litres) or duration (seconds) per bucket |
| Series 1 — `water_usage_ai` | Actual litres used by AI-triggered irrigation events |
| Series 2 — `water_usage_standard` | Simulated litres that a standard fixed-schedule timer would have used |
| Purpose | Visual evidence of water savings per bucket |

The `total_duration_raw` column (seconds of actual pump operation) is used when a per-litre flow-rate calibration is not available, to render the comparison in time units instead.

### 3.6 Chart Panel 4 — Rain & Irrigation Events

| Property | Value |
|---|---|
| Chart type | `BarChart` with rain-intensity line overlay |
| X-axis | UTC timestamp |
| Primary bars | Pump run-time per bucket (seconds) |
| Overlay line | Rain intensity (mm/hour) from the weather API |
| Purpose | Correlates weather events with irrigation decisions — confirms the system suppressed watering during rain. |

---

## 4. Gap-Filling Algorithm

**Source:** `Analytics.tsx` — `fillMissingBuckets(data, intervalStr)` function.

### What it does

After the API returns bucketed data, `fillMissingBuckets` normalises the time series to ensure every expected bucket in the requested range is represented:

1. **Snap to boundary** — Each returned data point's timestamp is snapped to the nearest bucket boundary (i.e., floored to the interval multiple) to eliminate sub-interval drift.
2. **Insert null values** — For every expected bucket that is absent from the API response, a record with `null` sensor values is inserted at the correct timestamp.
3. **Chart rendering** — Recharts interprets `null` as a break in the line, rendering a gap rather than connecting the last known value to the next valid point.

### Why gaps, not interpolation?

P-WOS uses gaps rather than interpolation deliberately:

- **Honest representation** — A straight line between two points 2 hours apart implies the sensor was working and moisture changed linearly, which is misleading. A visible break signals missing data.
- **Agronomic correctness** — Interpolated moisture values could cause the ML model audit trail (§8) to look more complete than it actually is.
- **Debugging aid** — Persistent gaps indicate MQTT connectivity issues, sensor hardware faults, or database write failures that need investigation.

Supported intervals for gap-filling align exactly with the time bucket selector values listed in §3.1.

---

## 5. Control Page

**Source file:** `src/frontend/src/pages/Control.tsx` (43 805 bytes)

The Control page is the operator interface for manual irrigation management. It is available in both AUTO and MANUAL modes, but pump-trigger commands only execute in MANUAL mode (in AUTO mode the button is shown but disabled with an explanatory tooltip).

### 5.1 Manual Pump Trigger

- **Duration Input** — Numeric field for specifying pump run time in seconds (validated: minimum 1 s, maximum configurable per crop profile).
- **Trigger Button** — Sends a `POST /api/pump/trigger` request with `{ duration_seconds: N }`. The backend publishes the command to the MQTT topic `pwos/pump/command` and writes a record to `watering_events` with `trigger_source = "manual"`.
- **Feedback** — A status banner confirms success or failure. The Dashboard's System Logs card will reflect the event within the next 5-second poll cycle.

### 5.2 Mode Switching (AUTO / MANUAL)

| Mode | Behaviour |
|---|---|
| **AUTO** | ML engine is active. Irrigation events are triggered by model decisions. Manual pump commands are blocked. |
| **MANUAL** | ML scheduler is suspended. Only user-initiated commands from the Control page (or Quick Actions on the Dashboard) will activate the pump. |

Mode state is persisted in the backend configuration store and survives system restarts. A mode-change event is written to `system_logs` with the operator's action and timestamp.

### 5.3 Additional Controls

The Control page also exposes:

- **Pump Status Indicator** — live indicator showing whether the pump is currently running (derived from the most recent `watering_events` record and MQTT heartbeat).
- **Recent Manual Events Log** — table of the last manual-trigger events, showing timestamp, duration requested, and whether the pump confirmed activation via MQTT acknowledgement.

---

## 6. Crop Settings Page

**Source file:** `src/frontend/src/pages/CropSettings.tsx` (27 059 bytes)

The Crop Settings page lets operators configure which crop is being grown and which deployment region applies. Changes here propagate to the ML engine **within 5 seconds** via the backend's configuration watcher.

### 6.1 Crop Profile Cards

Five predefined crop profiles are shown as selectable cards:

| Crop | Optimal Moisture Range | Key Characteristics |
|---|---|---|
| **Tomato** | 60–75 % | High water demand; sensitive to drought stress; VPD threshold important. |
| **Lettuce** | 65–80 % | Shallow roots; high moisture retention needed; very sensitive to waterlogging. |
| **Pepper** | 55–70 % | Moderate demand; tolerates short dry periods; disease-prone when overwatered. |
| **Basil** | 60–75 % | Continuous moisture preferred; wilts quickly below 50 %. |
| **Strawberry** | 65–75 % | Sensitive to both deficit and excess; irrigation timing critical for fruit quality. |

Selecting a crop:
- Updates the gauge bands (§2) to reflect that crop's optimal range.
- Adjusts the ML engine's decision thresholds via a `PATCH /api/config/crop` call.
- Re-labels the moisture gauge tooltip with crop-specific advice.

### 6.2 Region Selector

The region dropdown sets the geographical climate zone used by the ML model for weather-feature normalisation:

- Different regions have different evapotranspiration baselines.
- The selected region influences how strongly the VPD and rain-probability features are weighted in model inference.
- Region changes trigger a configuration reload in the ML engine; no model retraining is required.

### 6.3 Propagation to ML Engine

All crop and region changes are persisted immediately to the backend configuration store. The ML engine's configuration watcher polls this store on a 5-second cycle, meaning the new crop profile is active within one polling interval. No page reload or service restart is needed.

---

## 7. Irrigation Efficiency Page

**Source file:** `src/frontend/src/pages/IrrigationEfficiency.tsx` (22 560 bytes)

This page answers the core business question: *How much water does P-WOS save compared with conventional irrigation?*

### 7.1 The Two Hypothetical Systems

| System | Description |
|---|---|
| **Reactive System (Baseline)** | A conventional timer-based irrigation controller that waters on a fixed schedule (e.g., every day at 06:00 for 10 minutes) regardless of actual soil moisture, weather forecasts, or crop state. |
| **Predictive System (P-WOS)** | The ML-driven system that waters only when the model recommends **NOW**, taking into account live sensor data, VPD, rain forecasts, and crop type. |

### 7.2 Water Savings Calculation

For each time bucket in the selected window:

```
saved_per_bucket = water_usage_standard − water_usage_ai
```

Where:
- `water_usage_standard` is the simulated volume the reactive system would have dispensed (derived from the fixed-schedule configuration).
- `water_usage_ai` is the actual volume dispensed by P-WOS (from `watering_events`).

Aggregated metrics:

| Metric | Formula |
|---|---|
| **Total Water Saved (L)** | `Σ saved_per_bucket` over all buckets |
| **Efficiency Gain (%)** | `(1 − Σ water_usage_ai / Σ water_usage_standard) × 100` |
| **Unnecessary Waterings Avoided** | Count of reactive-system schedule windows where `water_usage_ai = 0` (model correctly suppressed irrigation) |

### 7.3 Visualisation

The page renders:
- A **summary KPI row** with the three metrics above.
- A **comparison bar chart** showing AI vs Standard water volume per time bucket.
- A **cumulative savings line chart** showing the accumulating total water saved over the selected period.

---

## 8. ML Audit Page

**Source file:** `src/frontend/src/pages/MLAudit.tsx` (18 480 bytes)

The ML Audit page provides a row-by-row inspection of every inference the model has made. It is the primary tool for verifying that the model is behaving sensibly and for diagnosing unexpected irrigation decisions.

### 8.1 Data Source

Fetches all rows from `GET /api/ml-decisions`, which reads from the `ml_decisions` table. The table is populated in real time by the ML engine after each inference cycle.

### 8.2 Audit Table Columns

| Column | Type | Description |
|---|---|---|
| **Timestamp** | `datetime` | UTC time of inference. |
| **Soil Moisture (%)** | `float` | Raw moisture reading used as input. |
| **Temperature (°C)** | `float` | Temperature reading used as input. |
| **Humidity (%)** | `float` | Relative humidity reading used as input. |
| **VPD (kPa)** | `float` | VPD derived from temperature + humidity at inference time (Tetens formula, same as §3.2). |
| **Decision** | `enum` | Model output: **NOW**, **STALL**, **STOP**, or **MONITOR**. |
| **Confidence (%)** | `float` | Probability assigned to the chosen class by the classifier. |
| **Status Code** | `int` | Numeric code encoding the combined sensor + model health state. |
| **Reason Text** | `string` | Plain-language explanation of the decision. |

### 8.3 How to Use the Audit Trail

| Verification Goal | What to Look For |
|---|---|
| Confirm model irrigates when dry | Rows where moisture < 35 % should show **NOW** with high confidence. |
| Confirm model suppresses during rain | Rows around rain events should show **STOP** or **STALL** even if moisture is moderate. |
| Detect low-confidence drift | Many rows with confidence < 55 % may indicate the model is close to a decision boundary and retraining may help. |
| Diagnose unexpected pump runs | Filter for **NOW** decisions and cross-reference with the weather and moisture at that time. |
| Spot sensor anomalies | Rows with physically implausible inputs (e.g., moisture = 0 % or temperature = 85 °C) indicate sensor faults. |

---

## 9. ML Insights Page

**Source file:** `src/frontend/src/pages/MLInsights.tsx` (18 090 bytes)

The ML Insights page exposes the internal performance characteristics of the active model. Data comes from `model_metadata.json` which is written to disk each time a new model version is trained.

### 9.1 Feature Importance

The model uses up to **12 input features**. The Insights page ranks them by their importance score (typically SHAP values or Gini impurity reduction, depending on the algorithm):

Common features include: soil moisture, temperature, humidity, VPD, rain probability, wind speed, time-of-day, day-of-week, crop type encoding, region encoding, last-irrigation age (hours since last watering), and sensor staleness flag.

Higher importance scores mean the model relies more heavily on that feature when choosing an action. Operators can use this to:
- Confirm the model primarily responds to moisture (expected).
- Identify if an external feature (e.g., day-of-week) has unexpectedly high influence, which may signal overfitting.

### 9.2 Model Performance Metrics

| Metric | Description |
|---|---|
| **Accuracy** | Overall fraction of correct predictions across all classes. |
| **Precision** | Of all times the model predicted a class, how often it was correct (per class). |
| **Recall** | Of all actual instances of a class, how many the model correctly identified (per class). |
| **F1 Score** | Harmonic mean of precision and recall; the primary metric for imbalanced classes. |

These are shown as **per-version curves** (see §10) so operators can track whether retraining has improved or degraded performance.

### 9.3 Confusion Matrix

The confusion matrix is a 4×4 grid (NOW / STALL / STOP / MONITOR) where:
- Rows = actual class
- Columns = predicted class
- Diagonal cells = correct predictions
- Off-diagonal cells = misclassifications

**Interpreting misclassifications:**
- **NOW predicted as MONITOR** — model was too conservative; risk of under-watering.
- **STOP predicted as NOW** — model over-irrigated; wastes water.
- **High off-diagonal counts** — model is confused between adjacent states, possibly needing more training data or feature engineering.

### 9.4 Training Data Statistics

Displays the number of labelled samples used to train the active model, class distribution, and data collection date range. Imbalanced class distribution (e.g., very few STOP examples) may explain poor recall for that class.

---

## 10. Model Registry Page

**Source file:** `src/frontend/src/pages/ModelRegistry.tsx` (16 089 bytes)

The Model Registry is the version-control interface for all trained model artefacts. It fetches from `GET /api/model-versions`, which reads from the `model_versions` table.

### 10.1 Version Tag Format

Each model version is identified by a timestamp-derived tag:

```
v{YYYYMMDD}_{HHMMSS}
```

Example: `v20260319_092225` — trained on 19 March 2026 at 09:22:25.

### 10.2 Registry Table Columns

| Column | Description |
|---|---|
| **Version Tag** | Unique identifier (see format above). |
| **Training Timestamp** | UTC datetime when training completed. |
| **Training Samples** | Number of labelled rows used for this version. |
| **Accuracy** | Overall accuracy on the held-out test split. |
| **Precision** | Macro-averaged precision across all four classes. |
| **Recall** | Macro-averaged recall across all four classes. |
| **F1 Score** | Macro-averaged F1 across all four classes. |
| **Active** | Boolean (`is_active = true`) — only one version is active at a time. |

### 10.3 Identifying the Active Model

The active model row is visually highlighted (e.g., green badge or bold row). Only the active model is used for live inference. Operators can see at a glance whether the latest trained version has been promoted or whether an older version is still serving predictions.

### 10.4 Performance Trends Across Versions

By scrolling through the registry table (ordered chronologically), operators can assess whether:
- Successive retraining cycles are improving F1 scores (expected as more data accumulates).
- A sudden drop in metrics followed a data quality incident.
- Training samples are growing over time (confirms new labelled data is being captured).

---

## 11. System Health Page

**Source file:** `src/frontend/src/pages/SystemHealth.tsx` (21 579 bytes)

The System Health page monitors the operational status of every infrastructure component that P-WOS depends on. It provides an at-a-glance view for diagnosing why the system may not be irrigating or logging data correctly.

### 11.1 Health Indicators

| Component | What is Monitored | Healthy State | Failure Indicator |
|---|---|---|---|
| **MQTT Broker** | TCP connection to the broker; subscribe/publish round-trip | Connected; last heartbeat < 10 s ago | Disconnected; heartbeat timeout |
| **PostgreSQL** | Connection pool availability; query latency | Pool has free connections; latency < 100 ms | Pool exhausted; query timeout or refused connection |
| **Backend API** | Response time to `GET /api/health` | HTTP 200 returned in < 500 ms | HTTP 5xx or timeout |
| **ESP32 / Simulator** | MQTT topic heartbeat from the sensor node | Message received within the expected reporting interval | No message received; `hardware_status = disconnected` |
| **Weather API** | Last successful call to OpenWeatherMap (or fallback) | Data refreshed within the last 15 minutes | Stale data; API key error; fallback active |
| **Sensor Staleness** | Timestamp of the last `sensor_readings` database row | New row within the expected sensor interval (e.g., 60 s) | Last reading more than 2× the expected interval ago |

### 11.2 What a Failure Looks Like

Each indicator is shown as a coloured status badge:

- 🟢 **Green** — component is operating within normal parameters.
- 🟡 **Amber** — degraded; component is operating but latency or staleness is elevated.
- 🔴 **Red** — component is unreachable or has failed; irrigation decisions may be impaired.

When the backend API itself is red, all other indicators may also show as unknown because the health data cannot be fetched. In this case, the page displays a global connectivity warning rather than individual component failures.

---

## 12. API Endpoints Summary

The following table summarises every API endpoint consumed by the frontend, along with accepted parameters and the pages that use them.

| Endpoint | Method | Key Parameters | Data Returned | Used By |
|---|---|---|---|---|
| `/api/analytics/aggregated` | GET | `hours=N`, `interval=<label>` | Bucketed sensor readings, water usage columns, rain data | Analytics |
| `/api/sensor-readings/history` | GET | `hours=N` | Raw time-series of moisture, temperature, humidity | Dashboard, Analytics |
| `/api/watering-events` | GET | `hours=N` | Pump activation records with trigger source, duration | Analytics, Control |
| `/api/ml-decisions` | GET | *(none required)* | Full audit trail from `ml_decisions` table | Dashboard (latest), MLAudit |
| `/api/model-versions` | GET | *(none required)* | All rows from `model_versions` table including `is_active` | ModelRegistry |
| `/api/health` | GET | *(none required)* | Per-component status object | SystemHealth |
| `/api/config/crop` | PATCH | `{ crop, region }` | Updated configuration confirmation | CropSettings |
| `/api/pump/trigger` | POST | `{ duration_seconds }` | Pump command acknowledgement | Control, Dashboard (QuickActions) |
| `/api/config/mode` | PATCH | `{ mode: "AUTO"\|"MANUAL" }` | Mode change confirmation | Control, Dashboard (QuickActions) |

> **Note:** All GET endpoints that accept `hours=N` use the same convention: `hours=0.05` fetches approximately the last 3 minutes (used by the Dashboard for the "latest reading" pattern). Larger values (24, 48, 168) are used by the Analytics and Efficiency pages for historical windows.

---

*P-WOS v2.0 | System Behaviour — Analytics & Dashboard Reference*
