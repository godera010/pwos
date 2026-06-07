"""
P-WOS Synthetic Training Data Generator — v2
=============================================
Generates synthetic_training_data.csv with exactly the 17 features
train_model.py expects, using physics-based simulation across:
  5 crops × 3 regions × 3 soil types × all weather history points

Key design decisions:
  - Two-stage labelling: physics lookahead + environmental suppression
  - Night, winter, high humidity, rain forecast, low VPD all suppress watering
  - All 17 model features are explicitly populated (no zero-filled columns)
  - Scenario injection: heatwaves, storms, sensor faults for robustness
  - Balanced classes: suppression is tuned to produce ~40-60% positive labels
"""

import json, os, math, random
import pandas as pd
from datetime import datetime

# ─────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INPUT_FILE  = os.path.join(BASE_DIR, "data", "raw", "raw_weather_history.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "processed", "synthetic_training_data.csv")

# ─────────────────────────────────────────────────────────────────
# CROP PARAMETERS  — matches train_model.py feature list exactly
# ─────────────────────────────────────────────────────────────────
CROP_PARAMS = {
    'maize':   {'crop_type_id': 1, 'target': 60.0, 'wilting_point_threshold': 30.0,
                'root_depth_cm': 80.0,  'growth_stage': 2,
                'optimal_vpd_min': 0.8, 'optimal_vpd_max': 2.0, 'evap_mult': 1.0},
    'potato':  {'crop_type_id': 2, 'target': 70.0, 'wilting_point_threshold': 45.0,
                'root_depth_cm': 40.0,  'growth_stage': 2,
                'optimal_vpd_min': 0.6, 'optimal_vpd_max': 1.5, 'evap_mult': 1.4},
    'tomato':  {'crop_type_id': 3, 'target': 62.0, 'wilting_point_threshold': 35.0,
                'root_depth_cm': 60.0,  'growth_stage': 2,
                'optimal_vpd_min': 0.8, 'optimal_vpd_max': 1.8, 'evap_mult': 1.2},
    'onion':   {'crop_type_id': 4, 'target': 65.0, 'wilting_point_threshold': 40.0,
                'root_depth_cm': 30.0,  'growth_stage': 2,
                'optimal_vpd_min': 0.5, 'optimal_vpd_max': 1.4, 'evap_mult': 0.8},
    'sorghum': {'crop_type_id': 5, 'target': 50.0, 'wilting_point_threshold': 20.0,
                'root_depth_cm': 120.0, 'growth_stage': 2,
                'optimal_vpd_min': 1.0, 'optimal_vpd_max': 2.5, 'evap_mult': 0.6},
}

# ─────────────────────────────────────────────────────────────────
# REGION PARAMETERS — Zimbabwe agro-ecological zones
# ─────────────────────────────────────────────────────────────────
REGION_MULT = {
    'matabeleland': 1.2,   # hot, dry lowveld
    'mashonaland':  1.0,   # central plateau baseline
    'manicaland':   0.8,   # cooler, wetter eastern highlands
}

SOIL_DRAINAGE = {'sandy': 1.2, 'loam': 0.5, 'clay': 0.2}  # % moisture lost per hour

# ─────────────────────────────────────────────────────────────────
# PHYSICS HELPERS
# ─────────────────────────────────────────────────────────────────
def calc_vpd(temp, humidity):
    """Tetens formula — identical to ml_predictor.py."""
    es = 0.6108 * math.exp((17.27 * temp) / (temp + 237.3))
    return max(0.0, es - es * (humidity / 100.0))

def season(month):
    """Southern Hemisphere Zimbabwe seasons."""
    if month in [11, 12, 1, 2, 3]:  return 'summer'
    if month in [5, 6, 7, 8, 9]:    return 'winter'
    return 'shoulder'

# ─────────────────────────────────────────────────────────────────
# TWO-STAGE LABELLING
# ─────────────────────────────────────────────────────────────────
def compute_label(will_drop_critical, hour, humidity, vpd,
                  precip_chance, month, current_moisture, wilting_point):
    """
    Stage 1 — physics: will moisture fall below wilting point in 12h?
    Stage 2 — suppression: is this the right time for the SYSTEM to act?

    Suppression factors teach the model that context matters:
      night-time, high humidity, rain forecast, winter, low VPD → wait
    Emergency override: critically dry plant ignores all suppression.
    """
    if not will_drop_critical:
        return 0  # plant is physiologically fine

    suppression = 0.0
    s = season(month)

    # Time of day
    if hour >= 21 or hour <= 4:    suppression += 0.50   # deep night — never water
    elif hour >= 18 or hour <= 6:  suppression += 0.20   # evening/dawn — mild delay

    # Atmospheric humidity
    if humidity >= 85:   suppression += 0.40
    elif humidity >= 70: suppression += 0.20
    elif humidity >= 55: suppression += 0.08

    # Rain forecast
    if precip_chance >= 70:   suppression += 0.50
    elif precip_chance >= 45: suppression += 0.28
    elif precip_chance >= 25: suppression += 0.12

    # Season
    if s == 'winter':   suppression += 0.22
    elif s == 'summer': suppression -= 0.08   # more urgent in hot summer

    # VPD — low VPD means atmosphere not pulling moisture
    if vpd < 0.25:   suppression += 0.30
    elif vpd < 0.50: suppression += 0.12
    elif vpd > 2.0:  suppression -= 0.10   # heatwave urgency boost

    # Emergency override — critically dry regardless of conditions
    if current_moisture < wilting_point * 0.65:
        suppression -= 0.90

    # Label = 1 only if suppression is low (favourable irrigation window)
    return 1 if suppression < 0.42 else 0


# ─────────────────────────────────────────────────────────────────
# MAIN GENERATOR
# ─────────────────────────────────────────────────────────────────
def generate_synthetic_data():
    print("=" * 65)
    print("P-WOS SYNTHETIC HISTORY GENERATOR  v2")
    print("=" * 65)

    if os.path.exists(INPUT_FILE):
        with open(INPUT_FILE) as f:
            weather = json.load(f)
        weather.sort(key=lambda x: x['dt'])
    else:
        print(f"  [WARN] {INPUT_FILE} not found — using generated fallback weather.")
        weather = _fake_weather(1000)

    n_w = len(weather)
    combos = len(CROP_PARAMS) * len(REGION_MULT) * len(SOIL_DRAINAGE)
    print(f"  Weather points : {n_w:,}")
    print(f"  Combinations   : {combos}  (5 crops × 3 regions × 3 soils)")
    print(f"  Expected rows  : {n_w * combos:,}")
    print()

    TRAIN_FEATURES = [
        'soil_moisture', 'temperature', 'humidity', 'vpd',
        'precipitation_chance', 'forecast_temp', 'wind_speed',
        'crop_type_id', 'root_depth_cm', 'wilting_point_threshold',
        'growth_stage', 'optimal_vpd_min', 'optimal_vpd_max',
        'hour', 'is_daytime', 'moisture_change_rate', 'moisture_rolling_6',
    ]

    dataset = []

    for crop_name, crop in CROP_PARAMS.items():
        for region_name, r_mult in REGION_MULT.items():
            for soil_name, drain in SOIL_DRAINAGE.items():
                tag = f"{crop_name}/{region_name}/{soil_name}"
                print(f"  Simulating: {tag} ...")

                moisture      = crop['target']
                moist_buf     = [moisture] * 6   # rolling 6-reading buffer

                for i, wp in enumerate(weather):
                    dt       = datetime.fromtimestamp(wp['dt'])
                    temp     = wp['temp']
                    hum      = wp['humidity']
                    rain_1h  = wp.get('rain_1h', 0.0)
                    wind     = wp.get('wind_speed', random.uniform(0, 10))

                    # ── Scenario injection ──────────────────────────────
                    if random.random() < 0.018:          # heatwave (1.8%)
                        temp += random.uniform(5, 10)
                        hum   = max(10.0, hum - 22)
                    if random.random() < 0.018:          # storm (1.8%)
                        rain_1h += random.uniform(12, 35)
                        wind    += random.uniform(25, 55)
                    if random.random() < 0.005:          # sensor glitch (0.5%)
                        moisture = max(0, moisture - random.uniform(10, 20))

                    vpd = calc_vpd(temp, hum)

                    # ── Physics step  (3-hour timestep from weather API) ─
                    evap         = vpd * 2.5 * crop['evap_mult'] * r_mult * 3.0
                    drain_loss   = drain * 3.0
                    rain_gain    = rain_1h * 5.0
                    moisture_bef = moisture
                    moisture     = max(0.0, min(100.0, moisture - evap - drain_loss + rain_gain))

                    moist_buf.append(moisture)
                    if len(moist_buf) > 6:
                        moist_buf.pop(0)

                    moisture_rolling_6  = sum(moist_buf) / len(moist_buf)
                    moisture_change_rate = (moisture - moisture_bef) / 3.0  # %/hour

                    # ── Rain forecast lookahead (next 12 h) ─────────────
                    precip_chance = 0
                    for j in range(i + 1, min(i + 5, n_w)):
                        if weather[j].get('rain_1h', 0) > 1.0:
                            precip_chance = min(90, 25 + (j - i) * 15)
                            break

                    forecast_temp = weather[min(i + 1, n_w - 1)]['temp']

                    # ── Physics lookahead: will moisture hit wilting point?
                    fut_moist = moisture
                    will_crit = False
                    for j in range(i + 1, min(i + 5, n_w)):
                        fp      = weather[j]
                        fvpd    = calc_vpd(fp['temp'], fp['humidity'])
                        f_loss  = (fvpd * 2.5 * crop['evap_mult'] * r_mult + drain) * 3.0
                        f_gain  = fp.get('rain_1h', 0) * 5.0
                        fut_moist = max(0.0, fut_moist - f_loss + f_gain)
                        if fut_moist < crop['wilting_point_threshold']:
                            will_crit = True
                            break

                    # ── Two-stage label ─────────────────────────────────
                    label = compute_label(
                        will_drop_critical=will_crit,
                        hour=dt.hour,
                        humidity=hum,
                        vpd=vpd,
                        precip_chance=precip_chance,
                        month=dt.month,
                        current_moisture=moisture,
                        wilting_point=crop['wilting_point_threshold'],
                    )

                    # ── Build row — exactly 17 training features + metadata
                    dataset.append({
                        'timestamp':               dt.isoformat(),
                        # Core sensor
                        'soil_moisture':           round(moisture, 2),
                        'temperature':             round(temp, 1),
                        'humidity':                round(hum, 1),
                        'vpd':                     round(vpd, 3),
                        # Weather
                        'precipitation_chance':    precip_chance,
                        'forecast_temp':           round(forecast_temp, 1),
                        'wind_speed':              round(wind, 1),
                        # Crop identity (were MISSING in old version)
                        'crop_type_id':            crop['crop_type_id'],
                        'root_depth_cm':           crop['root_depth_cm'],
                        'wilting_point_threshold': crop['wilting_point_threshold'],
                        'growth_stage':            crop['growth_stage'],
                        'optimal_vpd_min':         crop['optimal_vpd_min'],
                        'optimal_vpd_max':         crop['optimal_vpd_max'],
                        # Time
                        'hour':                    dt.hour,
                        'is_daytime':              1 if 6 <= dt.hour <= 18 else 0,
                        # Derived sensor
                        'moisture_change_rate':    round(moisture_change_rate, 3),
                        'moisture_rolling_6':      round(moisture_rolling_6, 2),
                        # Label
                        'needs_watering_soon':     label,
                    })

    df = pd.DataFrame(dataset)

    # Verify all 17 features present
    missing = [f for f in TRAIN_FEATURES if f not in df.columns]
    if missing:
        print(f"\n[ERROR] Missing features: {missing}")
    else:
        print(f"\n  [OK]  All 17 training features confirmed in output.")

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)

    pos = int(df['needs_watering_soon'].sum())
    neg = len(df) - pos
    print(f"\n{'='*65}")
    print(f"  Output : {OUTPUT_FILE}")
    print(f"  Rows   : {len(df):,}")
    print(f"  Label=1 (water) : {pos:,}  ({pos/len(df)*100:.1f}%)")
    print(f"  Label=0 (wait)  : {neg:,}  ({neg/len(df)*100:.1f}%)")
    print(f"{'='*65}")
    print("\n  Next step: python train_model.py")
    return df


def _fake_weather(n):
    """Fallback Zimbabwe-style weather when raw file is absent."""
    history = []
    base = int(datetime.now().timestamp()) - (n * 3 * 3600)
    for i in range(n):
        ts   = base + (i * 3 * 3600)
        hour = datetime.fromtimestamp(ts).hour
        month = datetime.fromtimestamp(ts).month
        # Temperature: diurnal cycle, cooler in winter months
        base_temp = 18 if month in [5, 6, 7] else 26
        temp = base_temp + 10 * math.sin(math.pi * (hour - 6) / 12) + random.uniform(-3, 3)
        history.append({
            'dt':         ts,
            'temp':       max(5.0, temp),
            'humidity':   max(20.0, min(95.0, 85 - temp * 1.8 + random.uniform(-12, 12))),
            'wind_speed': max(0.0, random.uniform(0, 22)),
            'rain_1h':    random.uniform(0, 18) if random.random() < 0.09 else 0.0,
        })
    return history


if __name__ == "__main__":
    generate_synthetic_data()
