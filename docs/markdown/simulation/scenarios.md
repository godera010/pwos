# Simulation Scenarios Reference

**P-WOS Digital Twin — Testing Autopilot Decision Logic Under Environmental Stress**

---

## Overview

The simulator includes pre-defined environmental profiles that simulate specific weather events. These scenarios allow developers to test how the P-WOS Decision Engine responds to extreme agricultural conditions (like heatwaves, rain storms, or severe droughts) in real time.

---

## Scenario Profiles

The backend API supports four pre-configured scenarios:

### 1. `mixed_weather` (Default)
*   **Description**: Alternates sunny days, overcast clouds, and periodic light rain showers over a 14-day cycle.
*   **Decay Behavior**: Soil moisture depletes steadily during clear periods and recovers during rain events.
*   **Test Goal**: Verifies standard Autopilot behavior — ensuring the pump executes regular `NOW / DRY_TRIGGER` cycles and switches to `MONITOR / OPTIMAL` when moisture targets are met.

### 2. `dry_season`
*   **Description**: Simulates high temperatures (32–36°C), low relative humidity (<25%), and zero precipitation.
*   **Decay Behavior**: Moisture decays rapidly due to elevated VPD.
*   **Test Goal**: Verifies crop safety overrides. The moisture levels will drop past the Low threshold into the Critical zone. The test checks that the system triggers emergency pump activations (`NOW / CRITICAL`) and ignores weather delay overrides.

### 3. `rainy_season`
*   **Description**: Simulates high cloud cover, sustained high humidity (>85%), and frequent, heavy rain events.
*   **Decay Behavior**: Rain events regularly saturate the soil. Natural moisture decay is extremely slow due to low ambient VPD.
*   **Test Goal**: Verifies water savings logic. The test checks that the system successfully registers current rain (`STOP / RAINING`) and upcoming rain forecasts (`STALL / RAIN_EXPECTED`), suppressing all irrigation and allowing the weather to water the crop.

### 4. `heat_wave`
*   **Description**: Extreme high temperatures (38–42°C), high wind speeds (>25 km/h), and very dry air.
*   **Decay Behavior**: Extremely high VPD rates cause rapid, steep moisture decay.
*   **Test Goal**: Verifies evaporation prevention rules. Watering during peak heat is highly inefficient as water evaporates before reaching the crop roots. The test checks that P-WOS stalls daytime irrigation (`STALL / VPD_DELAY` and `STALL / WIND_DELAY`) and queues watering for early morning preheat hours (`NOW / PREHEAT`).

---

## Executing Scenarios via API

You can trigger a scenario by executing an HTTP POST request to the simulation controller:

```bash
# Reset simulation state to Heat Wave
curl -X POST http://localhost:5000/api/simulation/reset \
  -H "Content-Type: application/json" \
  -d '{"scenario": "heat_wave"}'
```

### Advancing the Simulation Clock
Since real-time monitoring occurs in 5-second intervals, advancing a 2-week scenario in real time is impractical. You can step the simulation time forward by 15-minute intervals:

```bash
# Advance the simulation clock by 15 minutes
curl -X POST http://localhost:5000/api/simulation/step

# View the current simulated state (current temp, humidity, moisture, active scenario)
curl http://localhost:5000/api/simulation/state
```
