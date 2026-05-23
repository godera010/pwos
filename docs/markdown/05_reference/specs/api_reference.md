# P-WOS API Reference

**Base URL:** `http://localhost:5000`  
**API Version:** `3.0`  
**Last Updated:** 2026-05-23  

The P-WOS REST API provides endpoints for retrieving sensor readings, querying analytical aggregations, running Machine Learning predictions, managing operational crop thresholds, publishing pump triggers, and checking system logs.

---

## 1. Introduction & Architecture

P-WOS operates on a **decentralized IoT feedback loop** consisting of:
1. **ESP32 Edge Device:** Collects physical parameters and publishes to the MQTT broker.
2. **MQTT Broker:** Relays sensor data and receives system triggers.
3. **Flask Backend:** Consumes MQTT events, executes the Random Forest ML prediction model, persists readings to PostgreSQL, and provides this REST API.
4. **React Frontend:** Visualizes analytics and configures system settings.

### Authentication & Authorization
By design, all endpoints are **open and unauthenticated** to facilitate low-latency local communication with microcontrollers. If deployed to public cloud instances, standard reverse-proxies (e.g., Nginx) or VPN tunnels (e.g., WireGuard) should be used to secure access.

---

## 2. API Status & Diagnostics

### API Metadata
Retrieves baseline API details.

* **Endpoint:** `GET /api`
* **Authentication:** None
* **Success Response (200 OK):**
  ```json
  {
      "name": "P-WOS API",
      "version": "1.0",
      "status": "online",
      "endpoints": {
          "health": "/api/health",
          "latest_data": "/api/sensor-data/latest",
          "history": "/api/sensor-data/history",
          "statistics": "/api/statistics",
          "pump_control": "/api/control/pump",
          "prediction": "/api/predict-next-watering",
          "watering_events": "/api/watering-events"
      }
  }
  ```

### Health Check
Evaluates service health and returns database diagnostics.

* **Endpoint:** `GET /api/health`
* **Authentication:** None
* **Success Response (200 OK):**
  ```json
  {
      "status": "online",
      "timestamp": "2026-02-08T10:00:00.123456",
      "database": {
          "total_readings": 2041,
          "total_waterings": 5,
          "avg_moisture": 55.2
      }
  }
  ```

---

## 3. Sensor Data & Analytics

### Latest Sensor Reading
Retrieves the most recent data point stored in the database.

* **Endpoint:** `GET /api/sensor-data/latest`
* **Authentication:** None
* **Success Response (200 OK):**
  ```json
  {
      "id": 582,
      "timestamp": "2026-02-08T10:00:00",
      "soil_moisture": 45.5,
      "temperature": 23.1,
      "humidity": 60.2,
      "forecast_minutes": 0,
      "device_id": "esp32_001"
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  {
      "error": "No data available"
  }
  ```

### Historical Sensor Data
Fetches historical data points from the database filtered by time range.

* **Endpoint:** `GET /api/sensor-data/history`
* **HTTP Method:** `GET`
* **Query Parameters:**
  * `hours` (integer, optional, default: `24`): Time window to retrieve.
* **Success Response (200 OK):**
  ```json
  [
      {
          "id": 581,
          "timestamp": "2026-02-08T09:45:00",
          "soil_moisture": 46.2,
          "temperature": 22.8,
          "humidity": 61.0,
          "device_id": "esp32_001",
          "vpd": 1.05
      }
  ]
  ```

### Aggregated Analytics
Retrieves sensor data and watering events grouped into time-bucketed intervals using PostgreSQL window functions.

* **Endpoint:** `GET /api/analytics/aggregated`
* **HTTP Method:** `GET`
* **Query Parameters:**
  * `hours` (integer, optional, default: `24`): Backwards time window.
  * `interval` (string, optional, default: `"15 minutes"`): Grouping step. Supported values:
    * `"1 minute"`, `"5 minutes"`, `"10 minutes"`, `"15 minutes"`, `"1 hour"`, `"6 hours"`
* **Success Response (200 OK):**
  ```json
  [
      {
          "timestamp": "2026-02-08T10:00:00",
          "soil_moisture": 45.5,
          "temperature": 23.1,
          "humidity": 60.2,
          "vpd": 1.1,
          "watering": {
              "total_duration": 120,
              "ai_duration": 90,
              "ai_event_count": 2
          }
      }
  ]
  ```

### System Statistics
Returns lifetime metrics from the database.

* **Endpoint:** `GET /api/statistics`
* **Authentication:** None
* **Success Response (200 OK):**
  ```json
  {
      "total_readings": 2041,
      "total_waterings": 5,
      "avg_moisture": 55.2
  }
  ```

---

## 4. Machine Learning & Predictions

### Predict Next Watering
Executes a 17-feature Random Forest ML prediction using live sensor readings, dynamic crop criteria, and historical trends.

* **Endpoint:** `GET /api/predict-next-watering`
* **Authentication:** None
* **Hardware Offline Safety Check:**
  If the ESP32 hardware status is `OFFLINE` (monitored via MQTT LWT), the system bypasses prediction logic and engages a safety override:
  ```json
  {
      "timestamp": "2026-02-08T10:00:00.000",
      "current_moisture": 0.0,
      "forecast_minutes": 0,
      "sensor_snapshot": {
          "moisture": 0.0,
          "temperature": 0.0,
          "humidity": 0.0
      },
      "recommended_action": "STOP",
      "recommended_duration": 0,
      "system_status": "HARDWARE_OFFLINE",
      "ml_analysis": {
          "reason": "Hardware disconnected. Safety interlock engaged."
      }
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
      "timestamp": "2026-02-08T10:00:00.000",
      "current_moisture": 49.4,
      "forecast_minutes": 0,
      "sensor_snapshot": {
          "moisture": 49.4,
          "temperature": 24.3,
          "humidity": 65.0
      },
      "recommended_action": "WAIT",
      "recommended_duration": 0,
      "system_status": "OPTIMAL",
      "ml_analysis": {
          "confidence": 97.0,
          "prediction": 0,
          "reason": "Moisture at 49.4%. System optimal.",
          "features_used": {
              "soil_moisture": 49.4,
              "temperature": 24.3,
              "humidity": 65.0,
              "vpd": 1.07,
              "is_extreme_vpd": 0,
              "wind_speed": 0.0,
              "rain_intensity": 0.0,
              "is_raining": 0,
              "is_high_wind": 0,
              "forecast_minutes": 0,
              "hour": 10,
              "day_of_week": 6,
              "is_daytime": 1,
              "is_hot_hours": 0,
              "moisture_change_rate": 0.0,
              "moisture_rolling_6": 49.4,
              "temp_rolling_6": 24.3
          }
      }
  }
  ```
* **Actions Returned:**
  * `NOW`: Irrigate immediately.
  * `STALL`: Postpone due to negative weather or high-VPD environmental stressors.
  * `WAIT`: No irrigation needed; moisture levels are satisfactory.
  * `STOP`: Safety halt triggered.
* **System Status Values:**
  * `CRITICAL`, `LOW`, `OPTIMAL`, `PUMPING`, `STOP`, `HARDWARE_OFFLINE`
* **Error Response (503 Service Unavailable):**
  ```json
  {
      "error": "No active sensor data available for prediction"
  }
  ```

---

## 5. Crop Settings & State Control

### Retrieve Operational Settings
Returns the active configuration parameters and computed crop thresholds.

* **Endpoint:** `GET /api/settings`
* **Authentication:** None
* **Success Response (200 OK):**
  ```json
  {
      "moisture_threshold": 30,
      "moisture_max": 75,
      "temp_min": 5,
      "temp_max": 32,
      "max_duration": 45,
      "latitude": -20.1492,
      "longitude": 28.5833,
      "active_crop": "maize",
      "active_region": "matabeleland",
      "crop_critical_moisture": 30,
      "crop_target_moisture": 60,
      "crop_high_threshold": 75
  }
  ```

### Update Operational Settings
Updates configuration variables and saves them persistently to `src/backend/operational_settings.json`.

* **Endpoint:** `POST /api/settings`
* **HTTP Method:** `POST`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
      "moisture_threshold": 30,
      "moisture_max": 75,
      "temp_min": 5,
      "temp_max": 32,
      "max_duration": 45,
      "latitude": -17.8252,
      "longitude": 31.0335,
      "active_crop": "tomatoes"
  }
  ```
* **Geographical Region Resolution:**
  When coordinates are updated, the system evaluates bounding boxes to resolve the agro-ecological region and evaporation scale factor:
  * Bulawayo coordinate ranges $\rightarrow$ `matabeleland` region (1.5× multiplier).
  * Mutare coordinate ranges $\rightarrow$ `manicaland` region (0.6× multiplier).
  * Default fallback $\rightarrow$ `mashonaland` region (1.0× multiplier).
* **Success Response (200 OK):**
  ```json
  {
      "status": "success",
      "settings": {
          "moisture_threshold": 30,
          "moisture_max": 75,
          "temp_min": 5,
          "temp_max": 32,
          "max_duration": 45,
          "latitude": -17.8252,
          "longitude": 31.0335,
          "active_crop": "tomatoes",
          "active_region": "mashonaland",
          "crop_critical_moisture": 40,
          "crop_target_moisture": 70,
          "crop_high_threshold": 85
      }
  }
  ```
* **Error Response (400 Bad Request):**
  Returned on invalid GPS coordinates or mismatched data types.
  ```json
  {
      "error": "Latitude must be between -90 and 90"
  }
  ```

### System Mode State
Fetches or configures system autopilot settings.

* **Endpoint:** `GET /api/system/state`
* **Endpoint:** `POST /api/system/state`
* **Headers (for POST):** `Content-Type: application/json`
* **Request Body (for POST):**
  ```json
  {
      "mode": "AUTO"
  }
  ```
  *(Supported modes: `AUTO`, `MANUAL`)*
* **Success Response (200 OK):**
  ```json
  {
      "mode": "AUTO",
      "pump_active": false,
      "hardware_status": "ONLINE"
  }
  ```

---

## 6. Pump Control & Irrigation Events

### Control Pump Relay
Triggers a pump relay action by publishing to MQTT.

* **Endpoint:** `POST /api/control/pump`
* **HTTP Method:** `POST`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
      "action": "ON",
      "duration": 30,
      "trigger_source": "MANUAL"
  }
  ```
  *(Valid actions: `ON`, `OFF`. `trigger_source` options: `MANUAL`, `AUTO`)*
* **Success Response (200 OK):**
  ```json
  {
      "status": "success",
      "message": "Pump ON",
      "duration": 30,
      "mqtt_result": 0,
      "pump_active": true
  }
  ```

### Watering Events Log
Returns historical watering events.

* **Endpoint:** `GET /api/watering-events`
* **Query Parameters:**
  * `hours` (integer, optional, default: `24`): History window.
* **Success Response (200 OK):**
  ```json
  [
      {
          "id": 45,
          "timestamp": "2026-02-08T09:00:00Z",
          "duration_seconds": 30,
          "trigger_type": "AUTO",
          "moisture_before": 28.5,
          "moisture_after": 35.2
      }
  ]
  ```

---

## 7. Logs & Weather

### System Logs
Manages the application logs generated by autopilot, model updates, and MQTT activities.

* **Endpoint:** `GET /api/logs`
* **Success Response (200 OK):** Returns last 50 log records.
  ```json
  [
      {
          "id": 104,
          "timestamp": "10:30:15",
          "level": "INFO",
          "source": "SYSTEM",
          "message": "Automation Controller Started",
          "type": "SYSTEM"
      }
  ]
  ```

* **Endpoint:** `POST /api/logs`
* **Request Body:**
  ```json
  {
      "message": "Autopilot cycle checking prediction...",
      "type": "SYSTEM"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
      "status": "logged"
  }
  ```

### Weather Forecast
Fetches weather details (live from OpenWeatherMap or fallback simulation).

* **Endpoint:** `GET /api/weather/forecast`
* **Success Response (200 OK):**
  ```json
  {
      "temperature": 24.3,
      "humidity": 65.0,
      "precipitation_chance": 20,
      "wind_speed_kmh": 8.5,
      "rain_forecast_minutes": 0,
      "cloud_cover": 12,
      "vpd": 1.07,
      "condition": "Clear",
      "source": "openweathermap",
      "timestamp": "2026-02-08T10:00:00"
  }
  ```

---

## 8. Simulation Endpoints Note

> [!WARNING]
> While `POST /api/simulation/reset` and `POST /api/simulation/step` are documented in guide folders for A/B testing and Digital Twin models, they are currently **not implemented** in the Flask app codebase (`src/backend/app.py`). 
> 
> Because the backend implements a catch-all route to deliver React assets, hitting these simulation POST endpoints from client-side script yields a `200 OK` HTML shell instead of JSON data.

---

## 9. MQTT Topic Specification

MQTT communication handles real-time sensors telemetry and control command relays.

| Topic | Publisher | Subscriber | QoS | Retained | Payload Format / Schema |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pwos/sensor/data` | ESP32 | Flask API | 1 | No | `{"soil_moisture": 60.0, "temperature": 25.0, "humidity": 55.0}` |
| `pwos/control/pump` | Flask API | ESP32 | 1 | No | `{"action": "ON", "duration": 30}` |
| `pwos/system/hardware` | ESP32 | Flask API | 1 | Yes | `ONLINE` (on init) / `OFFLINE` (published by broker LWT on loss) |
| `pwos/system/mode` | Bidirectional | Both | 1 | Yes | `AUTO` / `MANUAL` |
| `pwos/weather/current` | Simulator / Weather API | ESP32 | 0 | No | `{"temperature": 22.5, "humidity": 60.0, "condition": "Cloudy", "forecast_minutes": 0, "rain_intensity": 0.0}` |
| `pwos/device/status` | ESP32 | Flask API | 0 | No | `{"uptime": 3600, "free_heap": 128440, "rssi": -65, "pump_state": 0}` |

---

## 10. Code Execution Examples

### cURL (Create Pump Trigger)
```bash
curl -X POST http://localhost:5000/api/control/pump \
  -H "Content-Type: application/json" \
  -d '{"action": "ON", "duration": 30, "trigger_source": "MANUAL"}'
```

### JavaScript Fetch (Update Crop Coordinates)
```javascript
async function updateCoordinates(lat, lon) {
    const response = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            latitude: lat,
            longitude: lon
        })
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update coordinates');
    }
    
    return await response.json();
}
```

### Python Requests (Query History)
```python
import requests

def fetch_sensor_history(hours=24):
    url = "http://localhost:5000/api/sensor-data/history"
    params = {"hours": hours}
    
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch history: {e}")
        return []
```
