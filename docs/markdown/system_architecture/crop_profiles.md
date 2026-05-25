# Crop Profiles & Regional Adaptation

> **Document:** `system_architecture/crop_profiles.md`
> **System:** P-WOS v2.0
> **Scope:** How the active crop selection and agro-ecological region jointly personalise every irrigation decision — from threshold evaluation through ML feature injection to pump duration calculation.

---

## Table of Contents

1. [Why Crops Matter](#1-why-crops-matter)
2. [The 5 Moisture Thresholds](#2-the-5-moisture-thresholds)
3. [Full Crop Profile Table](#3-full-crop-profile-table)
4. [Seasonal Adjustment](#4-seasonal-adjustment)
5. [Regional Adaptation](#5-regional-adaptation)
6. [How Crop Settings Feed the ML Model](#6-how-crop-settings-feed-the-ml-model)
7. [Pump Duration Per Crop](#7-pump-duration-per-crop)
8. [Worked Scenario: Same Sensor Reading, Different Crops](#8-worked-scenario-same-sensor-reading-different-crops)
9. [How to Switch Crop / Region](#9-how-to-switch-crop--region)

---

## 1. Why Crops Matter

A soil moisture reading is not a universal fact — it is a relative measurement whose meaning depends entirely on the crop growing in that soil. Two sensors reporting **35% volumetric moisture** can simultaneously indicate a dangerous crisis for one crop and a completely safe, well-hydrated state for another.

### The Sorghum vs. Potato Contrast

Consider a single reading of **35% soil moisture** arriving at the decision engine:

| Attribute | Sorghum (*Sorghum bicolor*) | Potato (*Solanum tuberosum*) |
|---|---|---|
| **Root depth** | Deep (90–120 cm) | Shallow (30–40 cm) |
| **Transpiration** | Low | High |
| **CRITICAL threshold** | **20%** | **45%** |
| **LOW threshold** | 30% | 55% |
| **TARGET moisture** | 50% | 70% |
| **Interpretation at 35%** | **Above LOW — no alarm** | **Below CRITICAL — emergency** |
| **System response** | Monitor; no irrigation triggered | Immediate irrigation cycle |

For **sorghum**, 35% sits between its CRITICAL (20%) and LOW (30%) boundaries — the crop's deep root system can access water from lower soil strata, and its low transpiration rate means it is not rapidly depleting the available water. The system continues monitoring and may issue a *proactive* alert only if the reading continues to fall.

For **potato**, 35% is **10 percentage points below its CRITICAL threshold of 45%**. A potato's shallow root system (30–40 cm) cannot access deeper reserves, and its high transpiration demand means water is leaving the system quickly. The agronomic consequence is severe: under-watering at this level results in major tuber size degradation and potential crop failure. The system immediately triggers an emergency irrigation cycle.

This fundamental difference — 35% means safety for one crop and crisis for another — is why the active crop setting is the first parameter evaluated in every decision cycle.

---

## 2. The 5 Moisture Thresholds

Every crop in P-WOS is defined by five soil moisture thresholds. These are evaluated in order from lowest to highest, and each crossing triggers a distinct system action.

All values are expressed as **% volumetric soil moisture (VSM)**.

### Threshold Definitions

```
CRITICAL  <─── system emergency, pump fires immediately regardless of schedule
LOW       <─── below-normal; irrigation queued at next available slot
PROACTIVE <─── pre-emptive warning; smart scheduling begins preparation
TARGET    <─── the optimal maintained moisture level for this crop
HIGH      <─── upper safe bound; irrigation suppressed to prevent waterlogging
```

### System Actions at Each Boundary

| Threshold | Condition | System Behaviour |
|---|---|---|
| **CRITICAL** | `moisture < critical` | Emergency pump activation. All schedule overrides lifted. Alert sent immediately. Dashboard turns red. |
| **LOW** | `critical ≤ moisture < low` | Irrigation request queued. Next available pump slot activated. Amber dashboard alert. |
| **PROACTIVE** | `low ≤ moisture < proactive` | Smart scheduler pre-positions next irrigation slot. Yellow advisory shown. ML decay rate tracked. |
| **TARGET** | `proactive ≤ moisture < high` | Nominal operating zone. No irrigation required. System monitors decay trajectory. |
| **HIGH** | `moisture ≥ high` | All irrigation suppressed. Drainage advisories may be issued. Dashboard shows blue saturation indicator. |

> **Note:** The TARGET threshold is the *goal* the pump refills soil moisture to, not merely a threshold — it is the value used in the deficit formula for duration calculation (see §7).

---

## 3. Full Crop Profile Table

All values sourced directly from `CROP_PARAMS` in `ml_predictor.py` (lines 21–27) and agronomic metadata from `CropSettings.tsx`.

| Crop | Scientific Name | Root Depth | Transpiration | CRITICAL | LOW | PROACTIVE | TARGET | HIGH | Evap Multiplier |
|---|---|---|---|---|---|---|---|---|---|
| **Maize** | *Zea mays* | Medium-Deep (60–90 cm) | Moderate | 30% | 45% | 55% | 60% | 75% | 1.0× |
| **Potato** | *Solanum tuberosum* | Shallow (30–40 cm) | High | 45% | 55% | 65% | 70% | 85% | 1.4× |
| **Tomato** | *Solanum lycopersicum* | Medium (45–60 cm) | High | 35% | 48% | 58% | 62% | 75% | 1.2× |
| **Onion** | *Allium cepa* | Very Shallow (15–20 cm) | Low | 40% | 52% | 60% | 65% | 80% | 0.8× |
| **Sorghum** | *Sorghum bicolor* | Deep (90–120 cm) | Low | 20% | 30% | 40% | 50% | 65% | 0.6× |

### Key Observations

- **Potato** carries the highest thresholds across the board (target 70%) and the largest per-crop evaporation multiplier (1.4×), reflecting its shallow roots and high sensitivity to moisture deficit.
- **Sorghum** carries the lowest thresholds (critical 20%, target 50%) and the smallest multiplier (0.6×), encoding its well-known drought resilience.
- **Onion** has a very shallow root system (15–20 cm) but a relatively low transpiration rate; this is reflected in moderate thresholds but requires frequent *light* irrigation rather than deep infrequent watering.
- **Tomato** sits between maize and potato in sensitivity; its description notes that moisture imbalance causes blossom-end rot and fruit splitting — making the proactive threshold (58%) particularly important for triggering early intervention.

---

## 4. Seasonal Adjustment

Zimbabwe's growing calendar means that the same crop faces very different evaporative demand depending on the month. P-WOS adjusts all five moisture thresholds dynamically via `get_seasonal_thresholds()`.

### Source Code

```python
# ml_predictor.py — lines 70–89
def get_seasonal_thresholds(self, month, active_crop='maize'):
    base = CROP_PARAMS.get(active_crop, CROP_PARAMS['maize']).copy()
    shift = 0
    if month in [11, 12, 1, 2, 3]:  # Summer
        shift = 5
    elif month in [5, 6, 7, 8, 9]:  # Winter
        shift = -5
    return {
        'critical': max(5, base['critical'] + shift),
        'low':      max(10, base['low']      + shift),
        'proactive':max(15, base['proactive']+ shift),
        'high':     max(20, base['high']     + shift),
        'target':   max(25, base['target']   + shift)
    }
```

### Season Definitions

| Season | Months | Shift | Rationale |
|---|---|---|---|
| **Summer** | Nov, Dec, Jan, Feb, Mar | **+5%** | Higher temperature and solar radiation accelerate evapotranspiration; crops need wetter soil to sustain the same internal water balance |
| **Transition** | Apr, Oct | **0%** | Moderate conditions; base thresholds apply unchanged |
| **Winter** | May, Jun, Jul, Aug, Sep | **−5%** | Lower temperatures reduce evapotranspiration; lower soil moisture is sufficient to maintain crop health |

The `max()` guards prevent thresholds from collapsing to physiologically meaningless values:

| Threshold | Floor |
|---|---|
| CRITICAL | 5% minimum |
| LOW | 10% minimum |
| PROACTIVE | 15% minimum |
| HIGH | 20% minimum |
| TARGET | 25% minimum |

### Adjusted Threshold Tables

#### Maize (base: CRITICAL=30, LOW=45, PROACTIVE=55, TARGET=60, HIGH=75)

| Season | Months | CRITICAL | LOW | PROACTIVE | TARGET | HIGH |
|---|---|---|---|---|---|---|
| **Summer** | Nov–Mar | **35%** | **50%** | **60%** | **65%** | **80%** |
| **Transition** | Apr, Oct | 30% | 45% | 55% | 60% | 75% |
| **Winter** | May–Sep | **25%** | **40%** | **50%** | **55%** | **70%** |

#### Potato (base: CRITICAL=45, LOW=55, PROACTIVE=65, TARGET=70, HIGH=85)

| Season | Months | CRITICAL | LOW | PROACTIVE | TARGET | HIGH |
|---|---|---|---|---|---|---|
| **Summer** | Nov–Mar | **50%** | **60%** | **70%** | **75%** | **90%** |
| **Transition** | Apr, Oct | 45% | 55% | 65% | 70% | 85% |
| **Winter** | May–Sep | **40%** | **50%** | **60%** | **65%** | **80%** |

> **Practical impact:** In December (peak summer), a potato field at 48% VSM would be **below its CRITICAL threshold** (50%) and trigger emergency irrigation. In July (winter), the same 48% reading sits safely between LOW (50%) and PROACTIVE (60%) — wait, it would actually be below LOW (50%) but above the winter CRITICAL (40%), meaning irrigation is queued but not emergency. The month of measurement fundamentally changes the urgency classification.

---

## 5. Regional Adaptation

Zimbabwe encompasses three distinct agro-ecological zones, each with a different evaporative demand driven by altitude, rainfall, and temperature. P-WOS maps these to three named regions, each assigned an evaporation multiplier.

### Region Definitions

```python
# ml_predictor.py — lines 202–203
region_multipliers = {'matabeleland': 1.5, 'manicaland': 0.6, 'mashonaland': 1.0}
region_mult = region_multipliers.get(active_region, 1.0)
```

| Region | Representative City | Climate Class | Lat / Lon Bounds | Evap Multiplier | Default? |
|---|---|---|---|---|---|
| **Matabeleland** | Bulawayo | Semi-arid | −22.5 to −19.0 / 25.0 to 30.0 | **1.5×** | No |
| **Mashonaland** | Harare | Sub-humid | — | **1.0×** | **Yes** |
| **Manicaland** | Mutare | Humid-cool | −21.0 to −17.5 / 32.0 to 34.0 | **0.6×** | No |

### What the Multiplier Does

The regional multiplier appears in **two** distinct places within the decision engine:

**1. ML decay rate prediction** — the `region_evap_multiplier` feature is injected directly into the gradient-boosted model (see §6). A higher multiplier tells the model that soil moisture will deplete faster between readings, causing the model to schedule irrigations earlier and more aggressively.

**2. Pump duration calculation** — the multiplier scales the raw deficit-derived duration, ensuring that drier-climate fields receive proportionally longer pump runs to compensate for higher surface evaporation during and after irrigation (see §7).

### Worked Example: Regional Impact on Pump Duration

**Setup:** Maize crop, current moisture = 50%, target moisture = 60%, deficit = 10%.

```
Base duration = (deficit / 0.5) × region_mult
             = (10 / 0.5) × region_mult
             = 20 × region_mult
```

| Region | Multiplier | Calculation | Duration (clamped 5–60 min) |
|---|---|---|---|
| **Matabeleland** | 1.5× | 20 × 1.5 = 30.0 → int(30) | **30 minutes** |
| **Mashonaland** | 1.0× | 20 × 1.0 = 20.0 → int(20) | **20 minutes** |
| **Manicaland** | 0.6× | 20 × 0.6 = 12.0 → int(12) | **12 minutes** |

The semi-arid Bulawayo farmer receives 150% the pump run time of the Mutare farmer for an identical moisture deficit, because Bulawayo's high evaporative demand means a greater volume of water must be delivered to achieve the same net soil moisture gain.

---

## 6. How Crop Settings Feed the ML Model

The gradient-boosted classifier at the core of P-WOS does not merely observe raw sensor data. At inference time, three crop- and region-derived features are injected directly into the feature vector, allowing the model to contextualise every prediction against the active configuration.

### Feature Injection

```python
# ml_predictor.py — lines 215–217
features['crop_target_moisture']   = crop_info['target']
features['crop_critical_moisture'] = crop_info['critical']
features['region_evap_multiplier'] = region_mult
```

### Feature Semantics

| Feature Name | Source | What It Tells the Model |
|---|---|---|
| `crop_target_moisture` | `CROP_PARAMS[crop]['target']` | The moisture level the system is trying to maintain. The model uses this to assess how far current moisture is from the operational goal. |
| `crop_critical_moisture` | `CROP_PARAMS[crop]['critical']` | The crop's stress threshold. The model learns to predict urgency and decay rate relative to how close current moisture is to causing crop damage. |
| `region_evap_multiplier` | `region_multipliers[region]` | The environmental evaporation rate modifier. The model uses this to calibrate how quickly the moisture level will decay between sensor readings, directly influencing next-irrigation timing predictions. |

### Feature Space Illustration

For a **Potato** crop in **Matabeleland**, the injected features would be:

```
crop_target_moisture   = 70.0   # potato's target
crop_critical_moisture = 45.0   # potato's critical
region_evap_multiplier = 1.5    # Matabeleland semi-arid
```

For **Sorghum** in **Manicaland**:

```
crop_target_moisture   = 50.0   # sorghum's target
crop_critical_moisture = 20.0   # sorghum's critical
region_evap_multiplier = 0.6    # Manicaland humid-cool
```

The model was trained with these three features as continuous numeric inputs, so a single model handles all crop-region combinations without retraining — the features communicate the configuration context dynamically at inference time.

---

## 7. Pump Duration Per Crop

### The Deficit Formula

```python
# ml_predictor.py — lines 448–451
def calculate_duration(current_moisture, target_moisture, region_mult):
    deficit = target_moisture - current_moisture
    recommended_duration = max(5, min(60, int((deficit / 0.5) * region_mult)))
```

**Breaking down the formula:**

```
deficit        = target_moisture - current_moisture   (in % VSM)
raw_minutes    = (deficit / 0.5) * region_mult
                 ↑ converts % deficit to minutes:
                   0.5% moisture per minute is the baseline delivery rate
duration       = clamp(raw_minutes, min=5, max=60)
```

The `/0.5` constant represents the system's baseline moisture delivery rate: the pump raises soil moisture by ~0.5% per minute under standard conditions. The regional multiplier then scales total delivery time to account for ambient evaporation losses.

### Duration Table: Matabeleland (1.5×) vs. Manicaland (0.6×)

For each crop the **current moisture** is held at a representative below-TARGET level; target is each crop's standard BASE target (transition season).

#### Matabeleland (region_mult = 1.5)

| Crop | TARGET | Current Moisture | Deficit | Raw Minutes | Duration |
|---|---|---|---|---|---|
| Maize | 60% | 45% | 15% | (15/0.5) × 1.5 = 45.0 | **45 min** |
| Potato | 70% | 50% | 20% | (20/0.5) × 1.5 = 60.0 | **60 min** *(capped)* |
| Tomato | 62% | 45% | 17% | (17/0.5) × 1.5 = 51.0 | **51 min** |
| Onion | 65% | 50% | 15% | (15/0.5) × 1.5 = 45.0 | **45 min** |
| Sorghum | 50% | 35% | 15% | (15/0.5) × 1.5 = 45.0 | **45 min** |

#### Manicaland (region_mult = 0.6)

| Crop | TARGET | Current Moisture | Deficit | Raw Minutes | Duration |
|---|---|---|---|---|---|
| Maize | 60% | 45% | 15% | (15/0.5) × 0.6 = 18.0 | **18 min** |
| Potato | 70% | 50% | 20% | (20/0.5) × 0.6 = 24.0 | **24 min** |
| Tomato | 62% | 45% | 17% | (17/0.5) × 0.6 = 20.4 | **20 min** |
| Onion | 65% | 50% | 15% | (15/0.5) × 0.6 = 18.0 | **18 min** |
| Sorghum | 50% | 35% | 15% | (15/0.5) × 0.6 = 18.0 | **18 min** |

### Key Observations

- **Potato in Matabeleland** hits the 60-minute cap, meaning at severe deficits the system may schedule multiple sequential cycles rather than a single oversized run.
- A farmer switching region from Manicaland to Matabeleland — without changing any other setting — will see pump durations increase by a factor of **2.5×** (1.5 ÷ 0.6) for the same crop and deficit.
- The 5-minute floor ensures the pump always runs long enough to clear priming delays and deliver measurable water even for tiny deficits.

---

## 8. Worked Scenario: Same Sensor Reading, Different Crops

### Conditions

> **Sensor reading:** Soil moisture = **35%**
> **Temperature:** 32°C
> **Relative humidity:** 30%
> **Month:** January (Summer → shift = +5)
> **Region:** Mashonaland (multiplier = 1.0×)

We trace this exact reading through three crops to show how the decision diverges entirely.

---

### Step 1 — Apply Seasonal Adjustment (January = Summer, shift = +5)

| Crop | Base CRITICAL | Base LOW | Base PROACTIVE | Base TARGET | Base HIGH |
|---|---|---|---|---|---|
| Sorghum | 20% | 30% | 40% | 50% | 65% |
| Maize | 30% | 45% | 55% | 60% | 75% |
| Potato | 45% | 55% | 65% | 70% | 85% |

After +5 summer shift:

| Crop | CRITICAL | LOW | PROACTIVE | TARGET | HIGH |
|---|---|---|---|---|---|
| **Sorghum** | 25% | 35% | 45% | 55% | 70% |
| **Maize** | 35% | 50% | 60% | 65% | 80% |
| **Potato** | 50% | 60% | 70% | 75% | 90% |

---

### Step 2 — Classify Reading of 35% Against Adjusted Thresholds

| Crop | Adjusted CRITICAL | Reading vs. CRITICAL | Zone | Alert Level |
|---|---|---|---|---|
| **Sorghum** | 25% | 35% > 25% ✓ | **Between CRITICAL and LOW** | 🟡 Advisory — monitor |
| **Maize** | 35% | 35% = 35% ⚠️ | **At CRITICAL boundary** | 🟠 Emergency threshold reached |
| **Potato** | 50% | 35% < 50% ✗ | **Below CRITICAL** | 🔴 Emergency — immediate pump |

---

### Step 3 — Calculate ML Features Injected

| Feature | Sorghum | Maize | Potato |
|---|---|---|---|
| `crop_target_moisture` | 50.0 | 60.0 | 70.0 |
| `crop_critical_moisture` | 20.0 | 30.0 | 45.0 |
| `region_evap_multiplier` | 1.0 | 1.0 | 1.0 |

The ML model additionally receives temperature (32°C) and humidity (30%) — high temperature and low humidity compound the urgency signal, increasing the predicted moisture decay rate for all three crops, but only breach thresholds where the current reading is already low relative to crop needs.

---

### Step 4 — Calculate Pump Duration (where applicable)

**Formula:** `duration = max(5, min(60, int((deficit / 0.5) * region_mult)))`
**Region mult:** 1.0 (Mashonaland)

| Crop | Current | TARGET (adjusted) | Deficit | Calculation | Duration | Action |
|---|---|---|---|---|---|---|
| **Sorghum** | 35% | 55% | 20% | (20/0.5) × 1.0 = 40 | *Pre-calculated, standby* | Advisory only — no immediate pump |
| **Maize** | 35% | 65% | 30% | (30/0.5) × 1.0 = 60 | **60 min** *(capped)* | Emergency pump, immediate |
| **Potato** | 35% | 75% | 40% | (40/0.5) × 1.0 = 80 → cap | **60 min** *(capped)* | Emergency pump, immediate + follow-up cycle |

---

### Step 5 — Decision Summary

| Crop | Decision | Reasoning |
|---|---|---|
| **Sorghum** | 🟡 **Monitor.** No irrigation yet. | 35% is above its summer CRITICAL (25%). Deep roots can access lower moisture reserves. Next irrigation pre-positioned for when reading approaches 35%→25% decay. |
| **Maize** | 🟠 **Immediate irrigation, 60 min.** | 35% equals the summer CRITICAL (35%). Any further decline risks crop stress. Emergency cycle fires now to restore to target 65%. |
| **Potato** | 🔴 **Emergency irrigation, 60 min + second cycle.** | 35% is 15 points below the summer CRITICAL (50%). Shallow roots have no water access buffer. Tuber degradation is already possible. Maximum duration pumped; second cycle scheduled after reassessment. |

This scenario demonstrates that crop selection is the **primary driver of irrigation urgency** — an identical physical reality (35% moisture, 32°C, 30% humidity) produces three qualitatively different system responses.

---

## 9. How to Switch Crop / Region

### Via the Settings UI

1. Navigate to the **Crop Settings** page (accessible from the main navigation sidebar).
2. Select the desired crop from the crop selector — each option displays the scientific name, root depth, transpiration rating, and a description of agronomic sensitivity.
3. Select the applicable agro-ecological region from the region selector.
4. Tap **Save Settings**.

### Via Configuration File

Settings are persisted in `operational_settings.json`. The relevant fields are:

```json
{
  "active_crop": "maize",
  "active_region": "mashonaland"
}
```

Valid values:
- `active_crop`: `"maize"`, `"potato"`, `"tomato"`, `"onion"`, `"sorghum"`
- `active_region`: `"matabeleland"`, `"mashonaland"`, `"manicaland"`

### Propagation Timing

> **Settings take effect within 5 seconds** of saving. The P-WOS backend polls `operational_settings.json` on a 5-second cycle. On the next poll after a change:
> - `CROP_PARAMS` for the new crop is loaded
> - Seasonal thresholds are recomputed for the current month
> - `region_mult` is updated
> - All three ML features (`crop_target_moisture`, `crop_critical_moisture`, `region_evap_multiplier`) are refreshed
> - The next sensor reading is classified against the new thresholds

No system restart is required. The change is atomic: the system either reads the old configuration or the new one — it never operates in a partially-updated state.

> [!IMPORTANT]
> Changing crop mid-season is supported but should be done with care. If transitioning from a low-threshold crop (e.g., sorghum) to a high-threshold crop (e.g., potato), the system will immediately re-evaluate existing moisture readings against the new thresholds. A reading that was in the SAFE zone for sorghum may immediately trigger an emergency alert for potato. Ensure the field has been prepared and planted with the new crop before changing the setting.

---

*P-WOS v2.0 | System Behaviour — Crop Profiles & Regional Adaptation*
