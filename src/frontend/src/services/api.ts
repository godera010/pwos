export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface SensorData {
    temperature: number;
    humidity: number;
    soil_moisture: number;
    timestamp: string;
    forecast_minutes: number;
    device_id?: string;
    vpd?: number;
}

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
            forecast_minutes?: number;
            hour?: number;
            day_of_week?: number;
            is_daytime?: number;
            is_hot_hours?: number;
            crop_target_moisture?: number;
            crop_critical_moisture?: number;
            region_evap_multiplier?: number;
            moisture_change_rate?: number;
            moisture_rolling_6?: number;
            temp_rolling_6?: number;
            vpd?: number;
            is_extreme_vpd?: number;
            wind_speed?: number;
            rain_intensity?: number;
            is_raining?: number;
            is_high_wind?: number;
        };
    };
    recommended_duration: number;
    system_status: string;
    sensor_snapshot: {
        moisture: number;
        temp: number;
    };
}

export interface SystemLog {
    id: number;
    timestamp: string;
    message: string;
    type: 'INFO' | 'ACTION' | 'ERROR';
}

export interface SystemState {
    mode: 'AUTO' | 'MANUAL';
    pump_active: boolean;
}

export interface SystemStats {
    total_readings: number;
    total_waterings: number;
    total_ml_decisions: number;
    avg_moisture: number;
}

export interface WateringEvent {
    id: number;
    timestamp: string;
    duration_seconds: number;
    trigger_type: string;
    moisture_before: number;
    moisture_after: number | null;
}

export interface WeatherForecast {
    temperature: number;
    humidity: number;
    precipitation_chance: number;
    wind_speed_kmh: number;
    rain_forecast_minutes: number;
    cloud_cover: number;
    condition: string;
    source: string;
    timestamp: string;
}

export interface SimulationState {
    step: number;
    scenario: string;
    hour: number;
    weather: {
        temperature: number;
        humidity: number;
        is_raining: boolean;
        forecast_minutes: number;
    };
    fields: {
        reactive: {
            moisture: number;
            water_used: number;
            pump_events: number;
        };
        predictive: {
            moisture: number;
            water_used: number;
            pump_events: number;
        };
    };
    water_saved: number;
    savings_percent: number;
}

export interface SystemSettings {
    moisture_threshold: number;
    moisture_max: number;
    temp_min: number;
    temp_max: number;
    max_duration: number;
    latitude: number;
    longitude: number;
    active_crop: string;
    active_region: string;
    crop_critical_moisture?: number;
    crop_target_moisture?: number;
    crop_high_threshold?: number;
}

export interface MLDecision {
    id: number;
    timestamp: string;
    soil_moisture: number | null;
    temperature: number | null;
    humidity: number | null;
    vpd: number | null;
    forecast_minutes: number;
    precipitation_chance: number;
    wind_speed: number;
    rain_intensity: number;
    decay_rate: number | null;
    decision: 'NOW' | 'STALL' | 'STOP' | 'MONITOR' | string;
    confidence: number | null;
    reason: string | null;
    recommended_duration: number;
    features_json: string | null;
}
export interface ModelVersion {
    id: number;
    timestamp: string;
    version_tag: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    training_samples: number;
    model_path: string;
    is_active: boolean;
}

export interface Crop {
    id: number;
    name: string;
    target_moisture: number;
    wilting_point_threshold: number;
    root_depth_cm: number;
    growth_stage: number;
    optimal_vpd_min: number;
    optimal_vpd_max: number;
    created_at?: string;
    is_active?: boolean;
}

export interface EfficiencyRecentEvent {
    id: number;
    timestamp: string;
    duration_seconds: number;
    trigger_type: string;
    moisture_before: number;
    moisture_after: number | null;
    moisture_delta: number | null;
}

export interface EfficiencySummary {
    period_hours: number;
    total_events: number;
    total_duration_seconds: number;
    ai_events: number;
    ai_duration_seconds: number;
    manual_events: number;
    manual_duration_seconds: number;
    ai_percentage: number;
    avg_moisture_before: number;
    avg_moisture_after: number;
    estimated_water_saved_seconds: number;
    estimated_savings_percent: number;
    recent_events: EfficiencyRecentEvent[];
}


export interface RawAggregatedData {
    timestamp: string;
    temperature: number | null;
    humidity: number | null;
    vpd: number | null;
    soil_moisture: number | null;
    watering?: {
        ai_duration?: number;
        total_duration?: number;
        ai_event_count?: number;
    };
}


const handleResponse = async (res: Response) => {
    if (!res.ok) {
        let errMessage = `Request failed with status ${res.status}`;
        try {
            const errData = await res.json();
            if (errData && errData.error) {
                errMessage = errData.error;
            }
        } catch {
            // ignore if not json
        }
        throw new Error(errMessage);
    }
    return res.json();
};

export const api = {
    getLatestSensors: async (): Promise<SensorData> => {
        const res = await fetch(`${API_BASE_URL}/sensor-data/latest`);
        return handleResponse(res);
    },
    getPrediction: async (): Promise<PredictionData> => {
        const res = await fetch(`${API_BASE_URL}/predict-next-watering`);
        return handleResponse(res);
    },
    getLogs: async (): Promise<SystemLog[]> => {
        const res = await fetch(`${API_BASE_URL}/logs`);
        return handleResponse(res);
    },
    getHistory: async (hours = 24): Promise<SensorData[]> => {
        const res = await fetch(`${API_BASE_URL}/sensor-data/history?hours=${hours}`);
        return handleResponse(res);
    },
    getAggregatedAnalytics: async (hours = 24, interval = '15 minutes'): Promise<RawAggregatedData[]> => {
        const res = await fetch(`${API_BASE_URL}/analytics/aggregated?hours=${hours}&interval=${encodeURIComponent(interval)}`);
        return handleResponse(res);
    },
    getStatistics: async (): Promise<SystemStats> => {
        const res = await fetch(`${API_BASE_URL}/statistics`);
        return handleResponse(res);
    },
    getWateringEvents: async (hours = 24): Promise<WateringEvent[]> => {
        const res = await fetch(`${API_BASE_URL}/watering-events?hours=${hours}`);
        return handleResponse(res);
    },
    toggleMode: async (mode: 'AUTO' | 'MANUAL') => {
        const res = await fetch(`${API_BASE_URL}/system/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode })
        });
        return handleResponse(res);
    },
    controlPump: async (action: 'ON' | 'OFF', duration = 60) => {
        const res = await fetch(`${API_BASE_URL}/control/pump`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, duration, trigger_source: 'MANUAL' })
        });
        return handleResponse(res);
    },
    getSystemState: async () => {
        const res = await fetch(`${API_BASE_URL}/system/state`);
        return handleResponse(res);
    },
    getWeatherForecast: async (): Promise<WeatherForecast> => {
        const res = await fetch(`${API_BASE_URL}/weather/forecast`);
        return handleResponse(res);
    },
    getSettings: async (): Promise<SystemSettings> => {
        const res = await fetch(`${API_BASE_URL}/settings`);
        return handleResponse(res);
    },
    saveSettings: async (settings: {
        moisture_threshold?: number;
        moisture_max?: number;
        temp_min?: number;
        temp_max?: number;
        max_duration?: number;
        latitude?: number;
        longitude?: number;
        active_crop?: string;
    }): Promise<{ status: string; settings: SystemSettings }> => {
        const res = await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        return handleResponse(res);
    },
    getMLDecisions: async (limit = 100): Promise<MLDecision[]> => {
        const res = await fetch(`${API_BASE_URL}/ml-decisions?limit=${limit}`);
        return handleResponse(res);
    },
    getModelVersions: async (): Promise<ModelVersion[]> => {
        const res = await fetch(`${API_BASE_URL}/model-versions`);
        return handleResponse(res);
    },
    getEfficiencySummary: async (hours = 168): Promise<EfficiencySummary> => {
        const res = await fetch(`${API_BASE_URL}/efficiency/summary?hours=${hours}`);
        return handleResponse(res);
    },
    getCrops: async (): Promise<Crop[]> => {
        const res = await fetch(`${API_BASE_URL}/crops`);
        return handleResponse(res);
    },
    getActiveCrop: async (): Promise<Crop> => {
        const res = await fetch(`${API_BASE_URL}/crops/active`);
        return handleResponse(res);
    },
    setActiveCrop: async (cropId: number): Promise<{ status: string; active_crop: Crop }> => {
        const res = await fetch(`${API_BASE_URL}/crops/active`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crop_id: cropId })
        });
        return handleResponse(res);
    },
    retrainModel: async (): Promise<{ status: string; message: string }> => {
        const res = await fetch(`${API_BASE_URL}/models/retrain`, {
            method: 'POST'
        });
        return handleResponse(res);
    }
};

