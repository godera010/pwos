import { Platform } from 'react-native';

// Dynamic host resolver with custom network overrides support
let cachedBaseUrl = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:5000/api`;

export const getApiBaseUrl = () => {
  return cachedBaseUrl;
};

export const updateApiBaseUrl = (customIp: string) => {
  if (customIp && customIp.trim() !== '') {
    cachedBaseUrl = `http://${customIp}:5000/api`;
  } else {
    cachedBaseUrl = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:5000/api`;
  }
};

export interface SensorData {
  temperature: number;
  humidity: number;
  soil_moisture: number;
  timestamp: string;
  forecast_minutes?: number;
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

export const api = {
  getLatestSensors: async (): Promise<SensorData> => {
    const res = await fetch(`${getApiBaseUrl()}/sensor-data/latest`);
    return res.json();
  },
  getPrediction: async (): Promise<PredictionData> => {
    const res = await fetch(`${getApiBaseUrl()}/predict-next-watering`);
    return res.json();
  },
  getLogs: async (): Promise<SystemLog[]> => {
    const res = await fetch(`${getApiBaseUrl()}/logs`);
    return res.json();
  },
  getHistory: async (hours = 24): Promise<SensorData[]> => {
    const res = await fetch(`${getApiBaseUrl()}/sensor-data/history?hours=${hours}`);
    return res.json();
  },
  getAggregatedAnalytics: async (hours = 24, interval = '15 minutes'): Promise<any[]> => {
    const res = await fetch(`${getApiBaseUrl()}/analytics/aggregated?hours=${hours}&interval=${encodeURIComponent(interval)}`);
    return res.json();
  },
  getStatistics: async (): Promise<SystemStats> => {
    const res = await fetch(`${getApiBaseUrl()}/statistics`);
    return res.json();
  },
  getWateringEvents: async (hours = 24): Promise<WateringEvent[]> => {
    const res = await fetch(`${getApiBaseUrl()}/watering-events?hours=${hours}`);
    return res.json();
  },
  toggleMode: async (mode: 'AUTO' | 'MANUAL') => {
    return fetch(`${getApiBaseUrl()}/system/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
  },
  controlPump: async (action: 'ON' | 'OFF', duration = 60) => {
    const res = await fetch(`${getApiBaseUrl()}/control/pump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, duration, trigger_source: 'MANUAL' })
    });
    return res.json();
  },
  getSystemState: async (): Promise<SystemState> => {
    const res = await fetch(`${getApiBaseUrl()}/system/state`);
    return res.json();
  },
  getWeatherForecast: async (): Promise<WeatherForecast> => {
    const res = await fetch(`${getApiBaseUrl()}/weather/forecast`);
    return res.json();
  },
  getSettings: async () => {
    const res = await fetch(`${getApiBaseUrl()}/settings`);
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
    const res = await fetch(`${getApiBaseUrl()}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  }
};
