import pandas as pd
df = pd.read_csv('data/processed/synthetic_training_data.csv')
print('=== SYNTHETIC DATA v2 - 225K ANALYSIS ===')
print(f'Total rows: {len(df):,}')
print(f'\n--- Label Distribution ---')
print(df['needs_watering_soon'].value_counts())
print(f'\n--- Label by Crop ---')
print(df.groupby('crop_type_id')['needs_watering_soon'].value_counts().unstack().fillna(0).to_string())
print(f'\n--- Label by is_daytime ---')
print(df.groupby('is_daytime')['needs_watering_soon'].value_counts().unstack().fillna(0).to_string())
print(f'\n--- Suppression Scenarios (label=0) by hour ---')
l0 = df[df['needs_watering_soon']==0]
print(l0['hour'].value_counts().sort_index().to_string())
l1 = df[df['needs_watering_soon']==1]
print(f'\n--- VPD stats for label=0 vs label=1 ---')
print(f'  Wait (0): VPD mean={l0["vpd"].mean():.3f}, median={l0["vpd"].median():.3f}')
print(f'  Water(1): VPD mean={l1["vpd"].mean():.3f}, median={l1["vpd"].median():.3f}')
print(f'\n--- Humidity stats for label=0 vs label=1 ---')
print(f'  Wait (0): humidity mean={l0["humidity"].mean():.1f}%')
print(f'  Water(1): humidity mean={l1["humidity"].mean():.1f}%')
print(f'\n--- Feature zero/constant check ---')
features = ['soil_moisture','temperature','humidity','vpd','precipitation_chance','forecast_temp',
            'wind_speed','crop_type_id','root_depth_cm','wilting_point_threshold','growth_stage',
            'optimal_vpd_min','optimal_vpd_max','hour','is_daytime','moisture_change_rate','moisture_rolling_6']
for f in features:
    u = df[f].nunique()
    if u <= 1:
        print(f'  WARNING: {f} has {u} unique values')
all_ok = all(df[f].nunique() > 1 for f in features)
print('  All features have variation' if all_ok else '')
