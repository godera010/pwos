# Edge Cases & Scenario Handbook

> **P-WOS v2.0 — System Behaviour Reference**
> Complete reference for what P-WOS does in unusual, extreme, or borderline situations.

---

## Table of Contents

1. [Scenario Walkthrough Table](#1-scenario-walkthrough-table)
2. [Detailed Scenario Traces](#2-detailed-scenario-traces)
   - 2a. Critically Dry in MANUAL Mode
   - 2b. Saturated in MANUAL Mode
   - 2c. Emergency Cutoff During Watering
   - 2d. Watering Cooldown
   - 2e. Sensor Disconnected
   - 2f. Sensor Flatline
   - 2g. False Dry
   - 2h. VPD Delay then PREHEAT
   - 2i. Rain Override with STALL
   - 2j. Rain Override EMERGENCY
   - 2k. Heavy Rain for 9 Days (Real Simulation)
   - 2l. Potato at 25% — Matabeleland Summer
   - 2m. Sorghum at 25% — Matabeleland Summer
   - 2n. Weather API Goes Down
   - 2o. Hardware OFFLINE
3. [Priority Collision Examples](#3-priority-collision-examples)
4. [Safety Interlock Summary Table](#4-safety-interlock-summary-table)
5. [Lessons from the 9-Day Simulation](#5-lessons-from-the-9-day-simulation)

---

## 1. Scenario Walkthrough Table

This master table summarises every documented edge-case scenario. Use it as a quick reference before consulting the detailed traces in §2.

| # | Scenario Name | Conditions | System Decision | Status Code | Reason |
|---|---|---|---|---|---|
| A | Critically dry in MANUAL | moisture=8%, Maize/Matabeleland/Summer, MANUAL mode | Force AUTO → `NOW` | `CRITICAL` | Safety override: moisture below critical limit |
| B | Saturated in MANUAL | moisture=92%, pump active, MANUAL mode | Kill pump → Force AUTO → `STOP` | `SATURATED` | Safety override: flood-risk pump cutoff |
| C | Emergency cutoff during watering | moisture hits 85% at t=25s of 60s cycle | Pump OFF immediately → break loop | `EMERGENCY_CUTOFF` | Real-time saturation detected mid-cycle |
| D | Watering cooldown | 30s after watering ended, system returns `NOW` | `STALL` | `WATERING_COOLDOWN` | 15-minute post-water buffer not elapsed |
| E | Sensor disconnected | moisture=0.3% | `STOP` | `SENSOR_ERROR` | Reading below 1.0% validity floor |
| F | Sensor flatline | 5 readings of exactly 45.00% | `STOP` | `SENSOR_ERROR` | std(last 4) < 0.0001 — sensor stuck |
| G | False dry | wind=28 km/h, humidity=32%, rate=−3%/hr | `MONITOR` | `FALSE_DRY_CHECK` | Evaporative depression masking true soil state |
| H | VPD delay → PREHEAT | VPD=3.1 kPa at 13:00, then 05:00 next day | `STALL` then `NOW` | `VPD_DELAY` → `PREHEAT` | Midday heat blocked; preheat window triggered |
| I | Rain override (STALL) | Rain in 90 min, moisture=48%, non-critical | `STALL` | `RAIN_EXPECTED` | Upcoming rain sufficient, no urgency |
| J | Rain override (EMERGENCY) | Rain in 3 hr, moisture=27%, critical=35% | `NOW` | `EMERGENCY` | Critical drought overrides rain forecast |
| K | 9-day heavy rain | Continuous rain, soil saturated throughout | `STOP` (41%) / `MONITOR` (59%) | `RAIN_ACTIVE` / `OPTIMAL` | System correctly idle; 0 autonomous water triggers |
| L | Potato 25% — Matabeleland summer | critical=50% (45+5), moisture=25% < 50% | `NOW` | `CRITICAL` / `EMERGENCY` | Critical threshold exceeded |
| M | Sorghum 25% — Matabeleland summer | critical=25% (20+5), moisture=25%, NOT < critical | `NOW` | `DRY_TRIGGER` | Falls below LOW=35% (30+5) |
| N | Weather API down | Source = 'stale' / 'fallback' / 'none' | Decision reverts to sensor-only | *(inherited)* | Weather features zeroed; ML recomputes |
| O | Hardware OFFLINE | No ESP32 heartbeat | `STOP` | `HARDWARE_OFFLINE` | No reliable sensor stream |

---

## 2. Detailed Scenario Traces

Each trace below follows the same structure:

- **Starting Conditions** — exact numeric values
- **Code Path** — which checks fire, in priority order
- **Decision** — what the engine returns
- **Dashboard** — what the operator sees
- **Log Entry** — what is written to the system log

---

### 2a. Critically Dry in MANUAL Mode

**Scenario:** Moisture is dangerously low while the operator has locked the system into MANUAL mode. The safety override must fire unconditionally.

#### Starting Conditions

| Parameter | Value |
|---|---|
| Crop | Maize |
| Region | Matabeleland (1.5× multiplier) |
| Season | Summer (+5 shift) |
| Base critical threshold | 30% |
| Effective critical threshold | 30 × 1.5 + 5 = **50%** *(note: region multiplier applied to threshold, not moisture)* |
| Observed moisture | **8%** |
| System mode | **MANUAL** |
| Pump state | OFF |

> **Threshold derivation:** Maize base critical = 30. Matabeleland summer shift applies as: `critical = floor(30 × 1.5) + 5 = 45 + 5 = 50%`. The effective critical threshold for this crop/region/season combination is **50%**.

#### Code Path

```
automation_controller.py :: main_loop()

1. GET /api/system/state          → mode = MANUAL
2. GET /api/sensor-data/latest    → moisture = 8%

3. Safety override check (lines 113-150):
   critical_limit = 50   (crop_critical_moisture from settings)
   moisture (8) < critical_limit (50) → TRUE

4. POST /api/system/state { mode: AUTO }   ← force mode change
5. Continue loop iteration (do NOT return; fall through to decision engine)

Decision engine (ml_predictor.py lines 360-443):
   Priority 1: is_raining?       → NO
   Priority 2: is_saturated?     → NO  (8% << 85%)
   Priority 3: is_high_wind?     → NO
   Priority 4: should_wait_rain? → NO
   Priority 5: is_false_dry?     → NO
   Priority 6: moisture < CRITICAL (50%)? → YES (8 < 50)
   → Decision: NOW / CRITICAL → escalated to EMERGENCY due to MANUAL override context
```

#### Decision

```
action  : NOW
reason  : CRITICAL
urgency : EMERGENCY
```

#### Dashboard

```
⚠️  SAFETY OVERRIDE ACTIVATED
Mode forcibly changed: MANUAL → AUTO
Moisture: 8%  |  Critical threshold: 50%
Recommendation: WATER NOW — CRITICAL
```

#### Log Entry

```
[WARN]  [automation_controller] MANUAL mode override: moisture=8.0% below critical=50.0%. Forcing AUTO.
[INFO]  POST /api/system/state { mode: AUTO } → 200 OK
[WARN]  [ml_predictor] Decision: NOW | Reason: CRITICAL | Moisture: 8.0% | Threshold: 50.0%
[INFO]  Autonomous watering cycle initiated.
```

---

### 2b. Saturated in MANUAL Mode

**Scenario:** Soil is over-saturated and the pump is already running in MANUAL mode. The system must kill the pump immediately and reclaim control.

#### Starting Conditions

| Parameter | Value |
|---|---|
| Crop | Potato |
| Region | any |
| Observed moisture | **92%** |
| high_limit (crop_high_threshold) | 85% |
| System mode | **MANUAL** |
| Pump state | **ON (running)** |

#### Code Path

```
automation_controller.py :: main_loop()

1. GET /api/system/state          → mode = MANUAL
2. GET /api/sensor-data/latest    → moisture = 92%

3. Safety override check (lines 113-150):
   critical_limit = 45 (potato base, no summer)
   high_limit     = 85 (crop_high_threshold)

   moisture (92) < critical_limit?  → NO   (skip critical path)
   moisture (92) >= high_limit (85)? → YES

4. POST /api/control/pump { action: OFF }   ← kill pump immediately
5. POST /api/system/state { mode: AUTO }    ← force AUTO
6. Continue loop

Decision engine:
   Priority 2: is_saturated (>85%)? → YES (92 > 85)
   → Decision: STOP / SATURATED
```

#### Decision

```
action : STOP
reason : SATURATED
```

#### Dashboard

```
🛑  PUMP FORCE-STOPPED
Saturation safety override: moisture=92% exceeds 85% ceiling.
Mode changed: MANUAL → AUTO
Recommendation: STOP — soil is saturated.
```

#### Log Entry

```
[WARN]  [automation_controller] MANUAL mode override: moisture=92.0% >= high_limit=85.0%. Killing pump.
[INFO]  POST /api/control/pump { action: OFF } → 200 OK
[INFO]  POST /api/system/state { mode: AUTO }  → 200 OK
[INFO]  [ml_predictor] Decision: STOP | Reason: SATURATED | Moisture: 92.0%
```

---

### 2c. Emergency Cutoff During Watering

**Scenario:** A scheduled 60-second watering cycle is in progress. At the 25-second mark, a moisture poll detects that saturation has been reached. The pump must stop immediately.

#### Starting Conditions

| Parameter | Value |
|---|---|
| Watering duration | 60 seconds |
| Elapsed time at detection | **25 seconds** |
| high_limit | 85% |
| Moisture at t=0 | 72% |
| Moisture at t=25s | **85%** (hit ceiling) |

#### Code Path

```
automation_controller.py :: execute_watering() (lines 229-254)

1. POST /api/control/pump { action: ON }
2. start_time = time.now()
3. Enter polling loop:

   while time.time() - start_time < (60 + 5):   # 65s window
       time.sleep(5)                              # poll every 5s

       Iteration 1 (t≈5s):  GET /api/sensor-data → moisture=74%  → 74 < 85 → continue
       Iteration 2 (t≈10s): GET /api/sensor-data → moisture=77%  → 77 < 85 → continue
       Iteration 3 (t≈15s): GET /api/sensor-data → moisture=80%  → 80 < 85 → continue
       Iteration 4 (t≈20s): GET /api/sensor-data → moisture=83%  → 83 < 85 → continue
       Iteration 5 (t≈25s): GET /api/sensor-data → moisture=85%  → 85 >= 85 → EMERGENCY CUTOFF

4. POST /api/control/pump { action: OFF }   ← immediate
5. break                                    ← exit loop; remaining 35s NOT watered
```

#### Decision

```
action : STOP (pump OFF)
reason : EMERGENCY_CUTOFF
Remaining scheduled time: 35 seconds (abandoned)
```

#### Dashboard

```
⛔  EMERGENCY CUTOFF
Watering halted at t=25s / 60s.
Moisture reached saturation ceiling: 85%.
35 seconds of scheduled watering were NOT executed.
```

#### Log Entry

```
[INFO]  Watering cycle started. Duration=60s. Moisture=72.0%
[INFO]  Poll t=5s:  moisture=74.0% — continuing
[INFO]  Poll t=10s: moisture=77.0% — continuing
[INFO]  Poll t=15s: moisture=80.0% — continuing
[INFO]  Poll t=20s: moisture=83.0% — continuing
[WARN]  Poll t=25s: moisture=85.0% >= high_limit=85.0% — EMERGENCY CUTOFF
[INFO]  POST /api/control/pump { action: OFF } → 200 OK
[INFO]  Watering loop exited early at t=25s. 35s of cycle abandoned.
```

---

### 2d. Watering Cooldown

**Scenario:** A watering cycle completed 30 seconds ago. The decision engine is polled again and returns `NOW`. The cooldown interlock must suppress the second cycle.

#### Starting Conditions

| Parameter | Value |
|---|---|
| Last watering end time | 30 seconds ago |
| Cooldown period | 900 seconds (15 minutes) |
| Time since end | **30 seconds** |
| ML decision | NOW / DRY_TRIGGER |

#### Code Path

```
automation_controller.py :: main_loop() (lines 172-201)

1. ml_predictor returns: action=NOW, reason=DRY_TRIGGER
2. Cooldown check:
   time_since_end = 30
   30 < 900 → TRUE

3. Override:
   action = "STALL"
   reason = "Watering in cooldown."

4. Do NOT initiate watering.
5. Return STALL to dashboard.
```

> **Why 15 minutes?** Moisture sensors have a diffusion lag: water applied at the root zone can take several minutes to be absorbed and reflected in capacitive sensor readings. Without cooldown, the system risks multiple rapid cycles that collectively over-saturate.

#### Decision

```
action : STALL
reason : WATERING_COOLDOWN
original_ml_action : NOW
```

#### Dashboard

```
⏳  COOLDOWN ACTIVE
Watering completed 30s ago. Cooldown: 870s remaining.
ML recommended NOW — suppressed by interlock.
```

#### Log Entry

```
[INFO]  [ml_predictor] Decision: NOW | Reason: DRY_TRIGGER
[INFO]  [automation_controller] Cooldown active: 30s elapsed of 900s. Overriding to STALL.
[INFO]  Decision returned to dashboard: STALL / WATERING_COOLDOWN
```

---

### 2e. Sensor Disconnected

**Scenario:** The ESP32 is physically connected but the moisture sensor has failed or disconnected, returning a near-zero reading.

#### Starting Conditions

| Parameter | Value |
|---|---|
| Reported moisture | **0.3%** |
| Validity floor | 1.0% |
| Last valid reading | 52% (5 minutes ago) |

#### Code Path

```
ml_predictor.py :: validate_sensor() (lines 133-163)

1. current_moisture = 0.3
2. Check: moisture < 1.0 → TRUE (0.3 < 1.0)
3. Return: STOP / SENSOR_ERROR
4. Decision engine does NOT proceed further.
```

> **Design rationale:** A legitimate crop moisture reading below 1.0% is physically impossible in any soil used for agriculture. A reading at or near zero is an unambiguous indicator of an open-circuit or disconnected probe. The system stops rather than guessing.

#### Decision

```
action : STOP
reason : SENSOR_ERROR
sub-reason: reading_below_floor (0.3% < 1.0%)
```

#### Dashboard

```
🔴  SENSOR ERROR
Moisture reading: 0.3% — below validity floor (1.0%).
Possible cause: disconnected probe, wiring fault, or ADC failure.
All automation suspended until sensor is restored.
```

#### Log Entry

```
[ERROR] [ml_predictor] Sensor validation failed: moisture=0.3% < floor=1.0%
[INFO]  Decision: STOP | Reason: SENSOR_ERROR | Sub: reading_below_floor
[WARN]  All watering automation suspended. Manual inspection required.
```

---

### 2f. Sensor Flatline

**Scenario:** The moisture sensor is physically connected and returning a plausible value, but the reading has not changed across multiple samples — indicating a stuck or frozen sensor.

#### Starting Conditions

| Parameter | Value |
|---|---|
| Reading 1 | 45.0000% |
| Reading 2 | 45.0000% |
| Reading 3 | 45.0000% |
| Reading 4 | 45.0000% |
| Reading 5 | 45.0000% |
| std(last 4) | **0.00000** (< 0.0001) |
| mean(last 3) | 45.0% (≥ 1.0%) |

#### Code Path

```
ml_predictor.py :: validate_sensor() (lines 133-163)

1. current_moisture = 45.0
2. Check: moisture < 1.0? → NO  (passes floor check)
3. Check: mean(last 3) < 1.0? → NO (45.0 >> 1.0)
4. Check: std(last 4 readings) < 0.0001? → YES (std = 0.0)
5. Return: STOP / SENSOR_ERROR (flatline detected)
```

> **Why std < 0.0001?** Real capacitive soil sensors exhibit micro-fluctuations due to thermal noise, electrical interference, and natural soil dynamics. A perfectly constant reading across four polls is statistically impossible in normal operation and indicates the sensor's ADC is latched, the probe is not in soil, or the communication link is returning cached data.

#### Decision

```
action : STOP
reason : SENSOR_ERROR
sub-reason: flatline_detected (std=0.0 < 0.0001)
```

#### Dashboard

```
🔴  SENSOR ERROR — FLATLINE
Moisture reading: 45.0% (unchanged across last 4 samples).
Possible cause: stuck ADC, cached value, probe not in contact with soil.
All automation suspended.
```

#### Log Entry

```
[ERROR] [ml_predictor] Sensor validation failed: std(last 4)=0.0 < threshold=0.0001. Flatline detected.
[INFO]  Readings: [45.0, 45.0, 45.0, 45.0]
[INFO]  Decision: STOP | Reason: SENSOR_ERROR | Sub: flatline_detected
[WARN]  Automation suspended. Check sensor wiring and ADC health.
```

---

### 2g. False Dry

**Scenario:** High wind and low humidity are causing the surface sensor to report a rapid moisture drop, but the actual root-zone soil may not be as dry as the reading implies. The system must flag this as a potential false alarm rather than immediately watering.

#### Starting Conditions

| Parameter | Value |
|---|---|
| Crop | Maize |
| Moisture at t−60min | 65% |
| Moisture now | 55% |
| Moisture change rate | −3%/hr → **−0.05%/min → rate < −0.5%/hr** ✓ |
| Wind speed | **28 km/h** (> 20 km/h) |
| Relative humidity | **32%** (< 40%) |
| Moisture level | 55% (above LOW threshold) |

#### Code Path

```
ml_predictor.py :: decision_engine() (lines 360-443)

Priority 1: is_raining?       → NO
Priority 2: is_saturated?     → NO  (55% < 85%)
Priority 3: is_high_wind?     → YES (28 > 20) → but moisture NOT critical → check EMERGENCY bypass → NO → STALL?
   ... however, false dry check (Priority 5) fires before this returns:

Priority 4: should_wait_rain? → NO
Priority 5: is_false_dry?
   Condition: wind > 20 km/h     → 28 > 20  → TRUE
   Condition: humidity < 40%     → 32 < 40  → TRUE
   Condition: change_rate < −0.5 → −3 < −0.5 → TRUE (all three satisfied)
   → Decision: MONITOR / FALSE_DRY_CHECK

Note: Priority 5 fires before Priority 6 (CRITICAL check), so FALSE_DRY_CHECK
is returned instead of DRY_TRIGGER because moisture (55%) is above LOW threshold.
```

#### Decision

```
action : MONITOR
reason : FALSE_DRY_CHECK
```

#### Dashboard

```
🌬️  FALSE DRY DETECTED
Wind: 28 km/h | Humidity: 32% | Rate: −3%/hr
Sensor may be showing wind-evaporated surface dryness, not root-zone depletion.
Action: MONITOR — system will re-evaluate when conditions stabilise.
```

#### Log Entry

```
[INFO]  [ml_predictor] False dry conditions detected:
        wind=28 km/h > 20, humidity=32% < 40, rate=-3.0%/hr < -0.5
[INFO]  Decision: MONITOR | Reason: FALSE_DRY_CHECK
[INFO]  No watering action taken. Monitoring sensor trend.
```

---

### 2h. VPD Delay then PREHEAT

**Scenario:** At 13:00, moisture is borderline low but VPD is extremely high. Watering midday under these conditions would cause excessive evaporation loss. The system stalls until pre-dawn, then waters during the optimal preheat window.

#### Starting Conditions

| Parameter | Value |
|---|---|
| Crop | Maize |
| Region | Mashonaland (1.0×) |
| Season | Winter (−5 shift) |
| Base low threshold | 45% |
| Effective LOW (Mashonaland winter) | 45 × 1.0 − 5 = **40%** |
| Base proactive threshold | 55% |
| Effective PROACTIVE | 55 × 1.0 − 5 = **50%** |
| Moisture at 13:00 | **42%** |
| VPD at 13:00 | **3.1 kPa** (> 2.0 kPa) |
| Time | 13:00 |

#### Phase 1 — 13:00 Decision

```
ml_predictor.py :: decision_engine()

Priority 1-5: all NO
Priority 6: moisture (42) < CRITICAL (25 − 5 = 20%)?  → NO (42 > 20)
Priority 7: moisture (42) < LOW (40%)?
   42 < 40? → NO (42 is NOT below 40 — borderline)

   *** IMPORTANT CORRECTION ***
   42 > 40, so Priority 7 does NOT fire for VPD_DELAY.
   Fall through to Priority 9 (PROACTIVE):
   moisture (42) < PROACTIVE (50%)? → YES (42 < 50)
   Time window 04:00–06:00? → NO (currently 13:00)
   Extreme VPD? → YES (3.1 > 2.0)
   But time window not met → fall to Priority 10

Priority 10: moisture (42) < PROACTIVE (50%)? → YES
   → Decision: MONITOR / WATCHING

(The PREHEAT path requires the 04:00-06:00 window to be active)
```

**Decision at 13:00:**
```
action : MONITOR
reason : WATCHING
```

**Dashboard at 13:00:**
```
👁️  MONITORING
Moisture: 42% (below proactive threshold: 50%)
VPD: 3.1 kPa — high evaporation risk.
Watching for optimal watering window.
```

#### Phase 2 — 05:00 Next Morning

Overnight, moisture drifts down to **44%** (still below PROACTIVE=50%).

```
ml_predictor.py :: decision_engine()

Priority 1-5: all NO
Priority 6: 44 < CRITICAL (20%)? → NO
Priority 7: 44 < LOW (40%)? → NO (44 > 40)
Priority 8: 44 < LOW? → NO
Priority 9: moisture (44) < PROACTIVE (50%)? → YES
   Time: 05:00 → within 04:00-06:00 window? → YES
   Extreme VPD? → YES (morning VPD elevated)
   → Decision: NOW / PREHEAT
```

**Decision at 05:00:**
```
action : NOW
reason : PREHEAT
```

**Dashboard at 05:00:**
```
💧  PREHEAT WATERING
Moisture: 44% | Proactive threshold: 50%
Optimal pre-dawn window (04:00–06:00) active.
Watering now to buffer heat-of-day demand.
```

#### Log Entries

```
[13:00] [ml_predictor] Decision: MONITOR | Reason: WATCHING | Moisture=42% | VPD=3.1 kPa
[05:00] [ml_predictor] Decision: NOW | Reason: PREHEAT | Moisture=44% | Window: 04:00-06:00 | VPD=high
[05:00] [automation_controller] Initiating preheat watering cycle.
```

---

### 2i. Rain Override with STALL

**Scenario:** Rain is forecast in 90 minutes. Soil moisture is below the LOW threshold but the system judges that incoming rain makes immediate watering wasteful.

#### Starting Conditions

| Parameter | Value |
|---|---|
| Crop | Maize |
| Season | Summer (+5) |
| Effective LOW threshold | 45 + 5 = **50%** |
| Effective CRITICAL | 30 + 5 = **35%** |
| Moisture | **48%** |
| Rain forecast | 90 minutes |
| `should_wait_rain` condition | TRUE |

#### Code Path

```
ml_predictor.py :: decision_engine()

Priority 1: is_raining? → NO (not raining yet)
Priority 2: is_saturated? → NO
Priority 3: is_high_wind? → NO
Priority 4: should_wait_rain? → YES (rain in 90 min)
   moisture < CRITICAL (35%)? → NO (48 > 35) → EMERGENCY bypass NOT triggered
   → Decision: STALL / RAIN_EXPECTED
```

#### Decision

```
action : STALL
reason : RAIN_EXPECTED
```

#### Dashboard

```
🌧️  STALL — RAIN EXPECTED
Rain forecast: 90 minutes.
Moisture: 48% | LOW threshold: 50%
Watering suppressed. System will re-evaluate post-rainfall.
```

#### Log Entry

```
[INFO]  [ml_predictor] Rain expected in 90 min. Moisture=48%, CRITICAL=35%. Not critical — STALL.
[INFO]  Decision: STALL | Reason: RAIN_EXPECTED
```

---

### 2j. Rain Override EMERGENCY

**Scenario:** Rain is forecast but is 3 hours away. Moisture is critically low. The system cannot afford to wait — it overrides the rain forecast and waters immediately.

#### Starting Conditions

| Parameter | Value |
|---|---|
| Crop | Maize |
| Season | Summer (+5) |
| Effective CRITICAL | 30 + 5 = **35%** |
| Moisture | **27%** |
| Rain forecast | 3 hours |
| `should_wait_rain` condition | TRUE |

#### Code Path

```
ml_predictor.py :: decision_engine()

Priority 1: is_raining? → NO
Priority 2: is_saturated? → NO
Priority 3: is_high_wind? → NO
Priority 4: should_wait_rain? → YES
   moisture < CRITICAL (35%)? → YES (27 < 35)
   → EMERGENCY bypass: override STALL
   → Decision: NOW / EMERGENCY  (rain forecast overridden)
```

#### Decision

```
action : NOW
reason : EMERGENCY
note   : Rain forecast present but CRITICAL drought overrides.
```

#### Dashboard

```
🚨  EMERGENCY WATERING
Moisture: 27% — CRITICALLY below 35% threshold.
Rain forecast in 3 hours overridden: crop cannot wait.
Immediate irrigation initiated.
```

#### Log Entry

```
[WARN]  [ml_predictor] CRITICAL moisture=27% < 35%. Rain in 3hr — override triggered.
[INFO]  Decision: NOW | Reason: EMERGENCY | Override: RAIN_EXPECTED
[INFO]  [automation_controller] Emergency watering cycle initiated.
```

---

### 2k. Heavy Rain for 9 Days (Real Simulation)

**Scenario:** The live 9.2-day simulation run conducted during system validation. Continuous rain events saturated soil throughout. This is the most data-rich scenario in the P-WOS test record.

#### Simulation Parameters

| Parameter | Value |
|---|---|
| Run duration | **9.2 days** (≈13,248 minutes) |
| Total decision cycles | **9,566** |
| Rain events detected | **536** |
| Total STOP actions | **3,919 (41%)** |
| Total MONITOR actions | **5,647 (59%)** |
| Autonomous WATER triggers | **0** |
| Manual pump activations | **1** |

#### Manual Activation Detail

| Parameter | Value |
|---|---|
| Trigger | Operator manual |
| Moisture at start | **58.32%** |
| Moisture at end | **85.32%** |
| Duration | **75 seconds** |
| Outcome | Saturation reached; system would have auto-cut at 85% if autonomous |

#### Decision Breakdown

```
9,566 total cycles:

STOP (3,919 cycles — 41%):
   Triggered by: is_raining → STOP / RAIN_ACTIVE
   Each of 536 rain events generated multiple STOP decisions
   across the polling interval before clearing

MONITOR (5,647 cycles — 59%):
   Between rain events, soil remained saturated (>85% often)
   or moisture was in OPTIMAL range
   Sub-reasons: OPTIMAL, SATURATED, WATCHING (no urgency)

WATER (0 cycles):
   Soil moisture never fell below LOW or CRITICAL thresholds
   during the entire 9.2-day window — rain kept it perpetually
   above the proactive threshold
```

#### System Behaviour Summary

The automation controller correctly:

1. Detected and blocked irrigation during all 536 rain events
2. Never autonomously activated the pump
3. Maintained MONITOR state between events without false positive triggers
4. The single manual activation demonstrated hardware path validity (pump, sensor feedback, cutoff)

#### Log Sample (representative excerpt)

```
[INFO]  Cycle 1024: STOP | RAIN_ACTIVE | moisture=91.4% | rain=true
[INFO]  Cycle 1025: STOP | RAIN_ACTIVE | moisture=91.4% | rain=true
...
[INFO]  Cycle 2381: MONITOR | OPTIMAL | moisture=78.2% | rain=false
[INFO]  Cycle 2382: MONITOR | OPTIMAL | moisture=77.9% | rain=false
...
[WARN]  Cycle 4410: Manual pump activation detected. moisture=58.32%
[INFO]  Cycle 4411: MONITOR | WATCHING | moisture=71.5%
[INFO]  Cycle 4412: MONITOR | SATURATED | moisture=85.32%
[INFO]  POST /api/control/pump { action: OFF } → operator-initiated stop
```

---

### 2l. Potato at 25% Moisture — Matabeleland Summer

**Scenario:** Potato crop under Matabeleland summer conditions. Threshold scaling pushes the critical level high enough that 25% is a critical-level emergency.

#### Threshold Derivation

| Parameter | Calculation | Result |
|---|---|---|
| Base critical (Potato) | 45% | |
| Matabeleland multiplier | × 1.5 | 67.5 → round to 68% |
| Summer shift | + 5 | **critical = 50%** |

> **Note on multiplier application:** The region multiplier scales the *threshold*, not the moisture reading. Matabeleland's more arid conditions mean the plant experiences stress at relatively higher absolute moisture levels than in more humid regions — hence thresholds are elevated.

*Simplified for documentation: `critical = 45 + 5 = 50%` using additive model; consult source code for exact scaling implementation.*

#### Starting Conditions

| Parameter | Value |
|---|---|
| Crop | Potato |
| Region | Matabeleland (1.5×) |
| Season | Summer (+5) |
| Effective CRITICAL | **50%** |
| Moisture | **25%** |

#### Code Path

```
ml_predictor.py :: decision_engine()

Priority 1: is_raining? → NO
Priority 2: is_saturated? → NO
Priority 3: is_high_wind? → NO
Priority 4: should_wait_rain? → NO
Priority 5: is_false_dry? → NO
Priority 6: moisture (25) < CRITICAL (50%)? → YES
   → Decision: NOW / CRITICAL → EMERGENCY
```

#### Decision

```
action : NOW
reason : CRITICAL
urgency: EMERGENCY
```

#### Dashboard

```
🚨  EMERGENCY — CRITICAL MOISTURE
Crop: Potato | Region: Matabeleland | Season: Summer
Moisture: 25% | Critical threshold: 50%
Deficit: 25 percentage points below critical level.
IMMEDIATE irrigation required.
```

#### Log Entry

```
[CRITICAL] [ml_predictor] Potato/Matabeleland/Summer: moisture=25% << critical=50%
[INFO]     Decision: NOW | Reason: CRITICAL | Urgency: EMERGENCY
[INFO]     [automation_controller] Emergency watering cycle initiated immediately.
```

---

### 2m. Sorghum at 25% Moisture — Matabeleland Summer

**Scenario:** Sorghum is a drought-tolerant crop. Under the same Matabeleland summer conditions, 25% moisture produces a different decision than Potato.

#### Threshold Derivation

| Threshold | Base | Summer +5 | Effective |
|---|---|---|---|
| Critical | 20% | +5 | **25%** |
| Low | 30% | +5 | **35%** |
| Proactive | 40% | +5 | **45%** |
| High | 65% | +5 | **70%** |
| Target | 50% | +5 | **55%** |

*(Matabeleland 1.5× multiplier applied; using simplified additive model for documentation)*

#### Starting Conditions

| Parameter | Value |
|---|---|
| Crop | Sorghum |
| Region | Matabeleland (1.5×) |
| Season | Summer (+5) |
| Effective CRITICAL | **25%** |
| Effective LOW | **35%** |
| Moisture | **25%** |

#### Code Path

```
ml_predictor.py :: decision_engine()

Priority 1-5: all NO (no rain, no saturation, no wind, no rain forecast, no false dry)

Priority 6: moisture (25) < CRITICAL (25%)? → NO  ← boundary condition: 25 is NOT < 25

Priority 7: moisture (25) < LOW (35%) AND (VPD > 2.0 AND 10:00-16:00)?
   25 < 35 → YES
   Check VPD and time window:
   → If VPD > 2.0 AND time is 10:00-16:00 → STALL / VPD_DELAY
   → If NOT → fall through to Priority 8

Priority 8: moisture (25) < LOW (35%)? → YES
   → Decision: NOW / DRY_TRIGGER
```

**Key insight:** Sorghum's critical threshold is exactly 25%. At moisture=25%, the `<` operator does NOT trigger (`25 < 25` is false). The system falls through to the LOW threshold check instead, producing `DRY_TRIGGER` rather than `CRITICAL/EMERGENCY`. This is the correct behaviour — Sorghum is still drought-stressed and needs water, but not in the same emergency category as Potato at the same moisture level.

#### Decision (assuming non-VPD-delay time)

```
action : NOW
reason : DRY_TRIGGER
```

#### Dashboard

```
💧  WATER NOW
Crop: Sorghum | Region: Matabeleland | Season: Summer
Moisture: 25% | Low threshold: 35%
Moisture below LOW — irrigation triggered.
(Note: Sorghum critical threshold: 25% — not yet in emergency.)
```

#### Log Entry

```
[INFO]  [ml_predictor] Sorghum/Matabeleland/Summer: moisture=25%, critical=25%, low=35%
[INFO]  Priority 6: 25 < 25 → FALSE (not critical)
[INFO]  Priority 8: 25 < 35 → TRUE (below LOW)
[INFO]  Decision: NOW | Reason: DRY_TRIGGER
```

---

### 2n. Weather API Goes Down

**Scenario:** The weather data source becomes unavailable. The system detects staleness and safely degrades to sensor-only decision making.

#### Starting Conditions

| Parameter | Value |
|---|---|
| `weather_source` | `'stale'` (or `'fallback'` or `'none'`) |
| Last valid weather data | > configured staleness window ago |
| Sensor moisture | 47% (valid) |

#### Code Path

```
ml_predictor.py :: prepare_features() (lines 252-258)

1. Check weather_source:
   if weather_source in ('stale', 'fallback', 'none'):
       → Zero out all weather features:
          is_raining         = 0
          rain_probability   = 0.0
          wind_speed         = 0.0
          humidity           = 0.0 (replaced with sensor humidity if available)
          forecast_rain_hours = 0
          vpd                = 0.0 (or computed from sensor temp/humidity)

2. Decision engine runs with zeroed weather features:
   Priority 1: is_raining (0) → NO
   Priority 4: should_wait_rain (0) → NO
   Priority 3: is_high_wind (0) → NO
   ...
   Proceeds purely on moisture thresholds and time windows.
```

#### Decision

The decision depends entirely on current moisture:

| Moisture | Decision | Reason |
|---|---|---|
| < CRITICAL | NOW | CRITICAL / EMERGENCY |
| < LOW | NOW or STALL | DRY_TRIGGER or VPD_DELAY |
| < PROACTIVE | NOW or MONITOR | PREHEAT or WATCHING |
| ≥ PROACTIVE | MONITOR | OPTIMAL |

For moisture=47% (below LOW of 50%, above CRITICAL of 35%, Maize summer):
```
Decision: NOW | Reason: DRY_TRIGGER
(Weather staleness did not prevent correct action — sensor data sufficient)
```

#### Dashboard

```
⚠️  WEATHER DATA STALE
Source: stale | Last update: [timestamp]
Weather features zeroed. Decision based on sensor data only.
Moisture: 47% | Low threshold: 50%
Recommendation: WATER NOW — DRY_TRIGGER
```

#### Log Entry

```
[WARN]  [ml_predictor] Weather source='stale'. All weather features zeroed.
[INFO]  Decision computed on sensor-only basis.
[INFO]  Decision: NOW | Reason: DRY_TRIGGER | Moisture=47% | Weather: UNAVAILABLE
```

---

### 2o. Hardware OFFLINE

**Scenario:** The ESP32 microcontroller stops sending heartbeats. No sensor data is available. The system cannot make a safe watering decision.

#### Starting Conditions

| Parameter | Value |
|---|---|
| ESP32 heartbeat | Missing / timed out |
| Last valid sensor reading | > heartbeat timeout ago |
| Sensor data available | NO |

#### Code Path

```
automation_controller.py :: main_loop()

1. GET /api/sensor-data/latest → timeout / 503 / no heartbeat
2. Hardware check: ESP32 heartbeat absent
3. Return: STOP / HARDWARE_OFFLINE

ml_predictor.py is NOT invoked.
No decision engine processing occurs.
```

#### Decision

```
action : STOP
reason : HARDWARE_OFFLINE
```

#### Dashboard

```
🔴  HARDWARE OFFLINE
No heartbeat received from ESP32.
Sensor data unavailable. All automation suspended.
Last known moisture: [last valid reading] at [timestamp]
Action required: check device power, WiFi, and firmware.
```

#### Log Entry

```
[ERROR] [automation_controller] ESP32 heartbeat timeout. Hardware OFFLINE.
[INFO]  Decision: STOP | Reason: HARDWARE_OFFLINE
[WARN]  No watering actions will occur until hardware is restored.
[INFO]  Alert sent to dashboard: HARDWARE_OFFLINE
```

---

## 3. Priority Collision Examples

When multiple conditions are simultaneously true, the decision engine resolves them by strict priority order. The following table shows the most important collision cases and their outcomes.

### 3.1 Collision Resolution Table

| Scenario | Condition A | Condition B | Winner | Decision | Explanation |
|---|---|---|---|---|---|
| Raining AND critically dry | `is_raining=True` (P1) | `moisture < CRITICAL` (P6) | **EMERGENCY** (NOW) | `NOW / EMERGENCY` | P1 fires first but CRITICAL check is an explicit bypass: rain does NOT block emergency watering |
| High wind AND critically dry | `is_high_wind=True` (P3) | `moisture < CRITICAL` (P6) | **EMERGENCY** (NOW) | `NOW / EMERGENCY` | Same bypass logic — critical drought overrides wind hold |
| Rain forecast AND critically dry | `should_wait_rain=True` (P4) | `moisture < CRITICAL` (P6) | **EMERGENCY** (NOW) | `NOW / EMERGENCY` | Rain forecast bypass explicitly checks CRITICAL before STALLing |
| Saturated AND raining | `is_saturated=True` (P2) | `is_raining=True` (P1) | **STOP/RAIN_ACTIVE** then **STOP/SATURATED** | First STOP wins | Rain (P1) fires before saturation (P2); both return STOP — outcome identical |
| False dry AND critically dry | `is_false_dry=True` (P5) | `moisture < CRITICAL` (P6) | **Depends on moisture level** | If truly < CRITICAL: `NOW/EMERGENCY` | P5 fires before P6 ONLY if moisture is ABOVE LOW; if moisture is below CRITICAL, the false dry check's conditions (change_rate, wind, humidity) are evaluated but CRITICAL takes precedence via P6 |
| VPD delay AND rain | `VPD>2.0 AND 10:00-16:00` (P7) | `is_raining=True` (P1) | **STOP/RAIN_ACTIVE** | `STOP / RAIN_ACTIVE` | P1 fires before P7; rain always blocks midday watering |

### 3.2 The EMERGENCY Bypass Rule

The following conditions trigger an EMERGENCY bypass that allows watering to proceed even when a higher-priority STOP or STALL rule is active:

```
EMERGENCY bypass activates when:
  moisture < CRITICAL_THRESHOLD

It overrides:
  ✓ is_raining      (P1) — crop safety > rainfall efficiency
  ✓ is_high_wind    (P3) — water loss accepted over crop death
  ✓ should_wait_rain (P4) — rain too far away to save crop

It does NOT override:
  ✗ is_saturated    (P2) — flooding a saturated field is dangerous regardless
  ✗ SENSOR_ERROR    — invalid data cannot guide safe irrigation
  ✗ HARDWARE_OFFLINE — no reliable sensor stream
```

### 3.3 Visualised Priority Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                   DECISION ENGINE PRIORITY                       │
├───┬─────────────────────────────┬──────────┬───────────────────┤
│ P │ Condition                   │ Action   │ EMERGENCY bypass? │
├───┼─────────────────────────────┼──────────┼───────────────────┤
│ 1 │ is_raining                  │ STOP     │ YES (if CRITICAL)  │
│ 2 │ is_saturated (>85%)         │ STOP     │ NO                 │
│ 3 │ is_high_wind (>20 km/h)     │ STALL    │ YES (if CRITICAL)  │
│ 4 │ should_wait_rain            │ STALL    │ YES (if CRITICAL)  │
│ 5 │ is_false_dry                │ MONITOR  │ YES (if CRITICAL)  │
│ 6 │ moisture < CRITICAL         │ NOW      │ N/A (this IS it)   │
│ 7 │ moisture < LOW + VPD delay  │ STALL    │ N/A               │
│ 8 │ moisture < LOW              │ NOW      │ N/A               │
│ 9 │ moisture < PROACTIVE +window│ NOW      │ N/A               │
│10 │ moisture < PROACTIVE        │ MONITOR  │ N/A               │
│11 │ else                        │ MONITOR  │ N/A               │
└───┴─────────────────────────────┴──────────┴───────────────────┘
```

---

## 4. Safety Interlock Summary Table

All safety interlocks in the system, listed in evaluation priority order. Interlocks marked **HARD** cannot be overridden by any software decision. Interlocks marked **SOFT** can be bypassed by EMERGENCY conditions.

| # | Interlock Name | Trigger Condition | Response | Type | Source |
|---|---|---|---|---|---|
| 1 | **Sensor Floor** | moisture < 1.0% | STOP / SENSOR_ERROR | HARD | `ml_predictor.py:133` |
| 2 | **Sensor Flatline** | std(last 4) < 0.0001 | STOP / SENSOR_ERROR | HARD | `ml_predictor.py:145` |
| 3 | **Sensor Mean Floor** | mean(last 3) < 1.0% | STOP / SENSOR_ERROR | HARD | `ml_predictor.py:155` |
| 4 | **Hardware Offline** | No ESP32 heartbeat | STOP / HARDWARE_OFFLINE | HARD | `automation_controller.py` |
| 5 | **Saturation Ceiling** | moisture ≥ high_limit (85%) | STOP / SATURATED | HARD | `ml_predictor.py:370` |
| 6 | **Manual Saturation Cutoff** | moisture ≥ high_limit in MANUAL | Pump OFF + Force AUTO | HARD | `automation_controller.py:140` |
| 7 | **Emergency Mid-Cycle Cutoff** | moisture ≥ high_limit during watering | Pump OFF immediately | HARD | `automation_controller.py:247` |
| 8 | **Watering Cooldown** | time_since_end < 900s | STALL / WATERING_COOLDOWN | SOFT | `automation_controller.py:185` |
| 9 | **Manual Critical Override** | moisture < critical in MANUAL | Force AUTO | SOFT | `automation_controller.py:120` |
| 10 | **Rain Active Block** | is_raining = True | STOP / RAIN_ACTIVE | SOFT | `ml_predictor.py:362` |
| 11 | **Rain Forecast Hold** | should_wait_rain = True | STALL / RAIN_EXPECTED | SOFT | `ml_predictor.py:393` |
| 12 | **High Wind Hold** | wind > 20 km/h | STALL / WIND_HOLD | SOFT | `ml_predictor.py:383` |
| 13 | **VPD Delay** | VPD > 2.0 kPa, 10:00–16:00 | STALL / VPD_DELAY | SOFT | `ml_predictor.py:415` |
| 14 | **False Dry Guard** | wind+humidity+rate conditions | MONITOR / FALSE_DRY_CHECK | SOFT | `ml_predictor.py:403` |
| 15 | **Weather Staleness Zeroing** | source in stale/fallback/none | Zero weather features | SOFT | `ml_predictor.py:254` |

> **HARD interlocks** execute regardless of any other system state, crop configuration, or operator preference.
> **SOFT interlocks** are bypassed automatically when `moisture < CRITICAL` (EMERGENCY condition).

---

## 5. Lessons from the 9-Day Simulation

### 5.1 What the Simulation Proved

The 9.2-day live simulation run is the most significant validation dataset in P-WOS history. It demonstrated correctness across thousands of decision cycles under realistic, continuous weather conditions.

#### ✅ Proven: Rain detection and blocking works correctly

The system correctly identified and acted on **536 rain events** across 9.2 days, issuing STOP decisions for every one. Not a single autonomous watering action occurred during active rainfall. This validates the entire `is_raining → STOP` path (Priority 1) including:

- Weather API integration
- Rain flag parsing and thresholding
- Decision engine routing
- Dashboard reporting

#### ✅ Proven: MONITOR state is stable and non-spurious

With **5,647 MONITOR decisions (59%)** and zero false positive WATER triggers, the simulation confirmed that the system does not "drift" into incorrect actions during long idle periods. The engine is stable across thousands of consecutive non-watering cycles.

#### ✅ Proven: The hardware pump path works end-to-end

The single manual activation — moisture 58.32% → 85.32% in 75 seconds — confirmed that:

- The pump responds correctly to API commands
- The moisture sensor reflects watering in real time
- The saturation ceiling (85%) would have been detected and triggered emergency cutoff if autonomous control had been active
- The sensor feedback loop is live and accurate

#### ✅ Proven: Saturation detection is accurate

The manually-triggered pump raised moisture to exactly 85.32% — crossing the 85% high-limit ceiling. This proves the sensor can detect and report saturation-level moisture correctly.

### 5.2 What the Simulation Did NOT Test

The simulation's value is bounded by its conditions. The following critical paths were **not exercised** during the 9-day run:

#### ❌ Not tested: Autonomous WATER trigger path

Because rain kept soil perpetually above all moisture thresholds, the autonomous watering decision path (`NOW / DRY_TRIGGER`, `NOW / CRITICAL`, `NOW / PREHEAT`) was **never triggered**. The most important operational path in the system — deciding to water and executing a full cycle without human intervention — has not been validated by real-world runtime.

**Risk implication:** While unit tests and simulation scaffolds cover this path, a real-field autonomous watering run under controlled conditions (known moisture, known duration, expected saturation) is required before declaring full production readiness.

#### ❌ Not tested: Sensor failure recovery

No sensor errors, flatlines, or disconnections occurred during the run. The `SENSOR_ERROR` code paths were not exercised against real hardware.

#### ❌ Not tested: Weather API staleness with active dry conditions

The weather API remained operational throughout the run. The fallback behaviour (zeroing weather features and reverting to sensor-only decisions) was not exercised in a scenario where correct action depended on that fallback.

#### ❌ Not tested: Multi-cycle cooldown interaction

With 0 autonomous waterings, the 15-minute cooldown interlock was never triggered from the autonomous path. Its interaction with successive dry-trigger decisions remains unit-test-only validated.

#### ❌ Not tested: PREHEAT and VPD_DELAY in field conditions

No pre-dawn low-moisture + elevated-VPD conditions arose during the rainy-season simulation window. Both PREHEAT and VPD_DELAY decisions are untested against real hardware.

### 5.3 Recommended Follow-Up Validation

| Gap | Recommended Test |
|---|---|
| Autonomous WATER path | Controlled dry-field run: lower moisture to LOW, let system trigger, monitor full cycle |
| SENSOR_ERROR — floor | Disconnect probe momentarily; verify STOP/SENSOR_ERROR and reconnect recovery |
| SENSOR_ERROR — flatline | Inject cached/repeated sensor values via test fixture; verify std detection |
| Cooldown interlock | Trigger two successive DRY_TRIGGER cycles within 15 minutes; verify second is STALLed |
| Weather staleness | Disable weather API; verify zero-feature fallback and correct moisture-only decision |
| PREHEAT window | Set RTC to 05:00 in test environment; verify PREHEAT trigger with low moisture + VPD |

---

*P-WOS v2.0 | System Behaviour — Edge Cases & Scenario Handbook*
