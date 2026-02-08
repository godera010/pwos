export const API_BASE_URL = 'http://localhost:5000/api';

export interface SensorData {
    temperature: number;
    humidity: number;
    soil_moisture: number;
    timestamp: string;
    forecast_minutes: number;
}

export interface PredictionData {
    recommended_action: 'WATER_NOW' | 'STALL' | 'WAIT';
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

export interface WeatherForecast {
    temperature: number;
    humidity: number;
    precipitation_chance: number;
    wind_speed_kmh: number;
    rain_forecast_minutes: number;
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
    getHistory: async (limit = 30): Promise<SensorData[]> => {
        const res = await fetch(`${API_BASE_URL}/sensor-data/history?limit=${limit}`);
        return res.json();
    },
    toggleMode: async (mode: 'AUTO' | 'MANUAL') => {
        return fetch(`${API_BASE_URL}/system/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode })
        });
    },
    getSystemState: async () => {
        const res = await fetch(`${API_BASE_URL}/system/state`);
        return res.json();
    },
    getWeatherForecast: async (): Promise<WeatherForecast> => {
        const res = await fetch(`${API_BASE_URL}/weather/forecast`);
        return res.json();
    },

    // Simulation API
    simulationReset: async (scenario: string) => {
        const res = await fetch(`${API_BASE_URL}/simulation/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario })
        });
        return res.json();
    },
    simulationStep: async () => {
        const res = await fetch(`${API_BASE_URL}/simulation/step`, {
            method: 'POST'
        });
        return res.json();
    },
    simulationState: async () => {
        const res = await fetch(`${API_BASE_URL}/simulation/state`);
        return res.json();
    }
};
