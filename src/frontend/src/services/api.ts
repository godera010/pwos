export const API_BASE_URL = 'http://localhost:5000/api';

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
        prob_rain: number;
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

export const api = {
    getLatestSensors: async (): Promise<SensorData> => {
        const res = await fetch(`${API_BASE_URL}/sensor-data/latest`);
        return res.json();
    },
    getPrediction: async (): Promise<PredictionData> => {
        const res = await fetch(`${API_BASE_URL}/predict-next-watering`);
        return res.json();
    },
    getLogs: async (): Promise<SystemLog[]> => {
        const res = await fetch(`${API_BASE_URL}/logs`);
        return res.json();
    },
    getHistory: async (hours = 24): Promise<SensorData[]> => {
        const res = await fetch(`${API_BASE_URL}/sensor-data/history?hours=${hours}`);
        return res.json();
    },
    getAggregatedAnalytics: async (hours = 24, interval = '15 minutes'): Promise<any[]> => {
        const res = await fetch(`${API_BASE_URL}/analytics/aggregated?hours=${hours}&interval=${interval}`);
        return res.json();
    },
    getStatistics: async (): Promise<SystemStats> => {
        const res = await fetch(`${API_BASE_URL}/statistics`);
        return res.json();
    },
    getWateringEvents: async (hours = 24): Promise<WateringEvent[]> => {
        const res = await fetch(`${API_BASE_URL}/watering-events?hours=${hours}`);
        return res.json();
    },
    toggleMode: async (mode: 'AUTO' | 'MANUAL') => {
        return fetch(`${API_BASE_URL}/system/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode })
        });
    },
    controlPump: async (action: 'ON' | 'OFF', duration = 0) => {
        const res = await fetch(`${API_BASE_URL}/control/pump`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, duration, trigger_source: 'MANUAL' })
        });
        return res.json();
    },
    getSystemState: async () => {
        const res = await fetch(`${API_BASE_URL}/system/state`);
        return res.json();
    },
    getWeatherForecast: async (): Promise<WeatherForecast> => {
        const res = await fetch(`${API_BASE_URL}/weather/forecast`);
        return res.json();
    },


    getSettings: async () => {
        const res = await fetch(`${API_BASE_URL}/settings`);
        return res.json();
    },
    saveSettings: async (settings: {
        moisture_threshold?: number;
        moisture_max?: number;
        temp_min?: number;
        temp_max?: number;
        max_duration?: number;
        latitude?: number;
        longitude?: number;
    }) => {
        const res = await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        return res.json();
    }
};
