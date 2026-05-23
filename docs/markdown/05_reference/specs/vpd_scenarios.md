# VPD & Weather Scenarios Reference

**Vapor Pressure Deficit (VPD) - The Physics of Soil Drying**

---

## What is VPD?

**VPD (Vapor Pressure Deficit)** measures the "drying power" of the air. It's the difference between how much water vapor the air *could* hold (at saturation) and how much it *actually* holds.

```
VPD = Saturation Pressure - Actual Pressure
VPD = es - ea (in kPa)
```

**Higher VPD = Faster evaporation = Faster soil drying**

---

## VPD Classification

| VPD Range | Category | Decay Rate | Time 60%→30% | Watering Strategy |
|-----------|----------|------------|--------------|-------------------|
| **> 3.0 kPa** | EXTREME DRY | 20-50%/hr | 0.5-1.5 hrs | ⛔ NIGHT ONLY |
| **2.0 - 3.0 kPa** | HIGH DRY | 10-20%/hr | 1.5-3 hrs | ⚠️ WAIT COOL |
| **1.0 - 2.0 kPa** | MODERATE | 5-10%/hr | 3-6 hrs | ⏳ OK |
| **0.5 - 1.0 kPa** | LOW | 2-5%/hr | 6-15 hrs | ✅ GOOD |
| **0.2 - 0.5 kPa** | HUMID | 0.5-2%/hr | 15-60 hrs | ✅ OPTIMAL |
| **< 0.2 kPa** | SATURATED | <0.5%/hr | >60 hrs | 🌧️ SKIP |

---

## Weather Type vs VPD

### By Temperature + Humidity

| Weather Type | Temp | Humid | VPD (kPa) | Decay/hr | Strategy |
|--------------|------|-------|-----------|----------|----------|
| **HOT DRY** | 40°C | 15% | 6.27 | 43.5% | ⛔ NIGHT ONLY |
| HOT MODERATE | 35°C | 40% | 3.37 | 19.4% | ⛔ NIGHT ONLY |
| HOT HUMID | 35°C | 70% | 1.69 | 7.9% | ⚠️ WAIT COOL |
| **WARM DRY** | 28°C | 25% | 2.83 | 15.5% | ⛔ NIGHT ONLY |
| WARM MODERATE | 28°C | 50% | 1.89 | 9.2% | ⚠️ WAIT COOL |
| WARM HUMID | 28°C | 75% | 0.94 | 3.7% | ✅ OK |
| MILD DRY | 22°C | 30% | 1.85 | 8.9% | ⚠️ WAIT COOL |
| MILD MODERATE | 22°C | 55% | 1.19 | 5.0% | ✅ OK |
| MILD HUMID | 22°C | 80% | 0.53 | 1.8% | ✅ GOOD |
| COOL DRY | 15°C | 40% | 1.02 | 4.1% | ✅ OK |
| COOL HUMID | 15°C | 85% | 0.26 | 0.7% | ✅ OPTIMAL |
| **RAINING** | 18°C | 95% | 0.10 | 0.2% | 🌧️ SKIP |

---

## Night & Rain Scenarios

| Scenario | Temp | Humid | VPD | Decay/hr | Effect |
|----------|------|-------|-----|----------|--------|
| NIGHT CLEAR DRY | 12°C | 45% | 0.77 | 2.85% | SLOW |
| NIGHT CLEAR HUMID | 14°C | 75% | 0.40 | 1.21% | SLOW |
| NIGHT CLOUDY | 16°C | 80% | 0.36 | 1.07% | SLOW |
| **NIGHT RAINING LIGHT** | 15°C | 92% | 0.14 | 0.30% | MINIMAL |
| **NIGHT RAINING HEAVY** | 14°C | 98% | 0.03 | 0.05% | ZERO |
| DAY RAINING WARM | 22°C | 90% | 0.26 | 0.71% | MINIMAL |
| DAY AFTER RAIN | 20°C | 85% | 0.35 | 1.02% | SLOW |

---

## Bulawayo, Zimbabwe Scenarios

| Scenario | Temp | Humid | VPD | Decay/hr | Strategy |
|----------|------|-------|-----|----------|----------|
| **SUMMER HOT DRY** | 36°C | 20% | 4.75 | 30.4% | ⛔ NIGHT ONLY |
| SUMMER HOT HUMID | 32°C | 65% | 1.66 | 7.8% | ⚠️ WAIT COOL |
| SUMMER STORM | 25°C | 95% | 0.16 | 0.4% | 🌧️ SKIP |
| SUMMER NIGHT | 22°C | 80% | 0.53 | 1.8% | ✅ OK |
| AUTUMN WARM | 28°C | 45% | 2.08 | 10.4% | ⚠️ WAIT COOL |
| AUTUMN NIGHT | 14°C | 65% | 0.56 | 1.9% | ✅ OK |
| WINTER COLD DRY | 10°C | 30% | 0.86 | 3.3% | ✅ OK |
| WINTER SUNNY | 22°C | 35% | 1.72 | 8.1% | ⚠️ WAIT COOL |
| WINTER NIGHT | 4°C | 55% | 0.37 | 1.1% | ✅ GOOD |
| **SPRING HOT DRY** | 35°C | 15% | 4.78 | 30.6% | ⛔ NIGHT ONLY |
| SPRING WINDY | 30°C | 25% | 3.18 | 18.0% | ⛔ NIGHT ONLY |

---

## Optimal Watering Times

### For Hot Days (VPD > 2.0 kPa predicted)

| Time Window | VPD | Strategy |
|-------------|-----|----------|
| **04:00-06:00** | 0.3-0.5 | ✅ BEST - Water soaks in before heat |
| 06:00-08:00 | 0.5-1.0 | ✅ GOOD - Still cool |
| 08:00-10:00 | 1.0-2.0 | ⚠️ OK - Starting to dry |
| 10:00-16:00 | 2.0-5.0+ | ⛔ AVOID - Rapid evaporation |
| 16:00-18:00 | 2.0-3.0 | ⚠️ CAUTION - Still hot |
| **18:00-20:00** | 1.0-2.0 | ✅ GOOD - Cooling down |
| 20:00-04:00 | 0.3-0.8 | ✅ OPTIMAL - All night to absorb |

---

## ML Decision Rules

### Rule 1: Hot Day Ahead
```python
IF forecast['temp'] > 32 AND forecast['humidity'] < 40:
    # VPD will be > 3.0 kPa = EXTREME DRY
    action = "WATER_NOW" if hour in [4,5,6,19,20] else "STALL"
```

### Rule 2: Rain Forecast
```python
IF forecast['rain_probability'] > 60 OR forecast['condition'] == 'Raining':
    action = "STALL"  # Wait for free rain
```

### Rule 3: Cold Period
```python
IF forecast['temp'] < 15 AND forecast['humidity'] > 60:
    # VPD < 0.5 = minimal evaporation
    action = "REDUCE_FREQUENCY"
```

### Rule 4: Extreme Heat + Wind
```python
IF forecast['temp'] > 35 AND forecast['wind_speed'] > 20 AND forecast['humidity'] < 25:
    # EXTREME evaporation risk
    action = "DEEP_WATER" if hour in [4,5] else "WAIT"
```

---

## Key Insight: HOT ≠ DRY

**Temperature alone doesn't determine drying rate!**

| Scenario | Temp | Humid | VPD | Result |
|----------|------|-------|-----|--------|
| Hot & Humid | 35°C | 70% | 1.69 | **8%/hr** - Slower |
| Warm & Dry | 28°C | 25% | 2.83 | **15%/hr** - Faster! |

**Humidity matters more than temperature for evaporation.**

---

## Formula Reference

### VPD Calculation (Tetens)
```python
es = 0.6108 * exp((17.27 * T) / (T + 237.3))  # Saturation pressure
ea = es * (RH / 100)                           # Actual pressure
VPD = es - ea                                  # In kPa
```

### Decay Rate Calculation
```python
DECAY_BASE = 4.0      # % per hour at VPD=1.0
VPD_POWER = 1.3       # Amplification factor
TICKS_PER_HOUR = 720  # 5-second intervals

vpd_factor = VPD ** VPD_POWER
decay_per_hour = DECAY_BASE * vpd_factor
decay_per_tick = decay_per_hour / TICKS_PER_HOUR
```

---

**P-WOS v2.0 | VPD Reference Document**
