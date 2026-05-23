import { useState, useEffect } from 'react';
import { api, SensorData, PredictionData, SystemLog, SystemState, updateApiBaseUrl } from '../services/api';
import { mqttClient, updateMqttBrokerUrl } from '../services/mqtt';

export interface AppState {
  // Real-time sensor telemetry
  soilMoisture: number;
  temperature: number;
  humidity: number;
  vpd: number;
  
  // System states
  systemMode: 'AUTO' | 'MANUAL';
  pumpActive: boolean;
  pumpTimerLeft: number; // for UI manual watering countdown
  
  // AI Decisions
  predictedAction: 'NOW' | 'STALL' | 'STOP' | 'MONITOR';
  predictedConfidence: number;
  predictionReason: string;
  recommendedDuration: number;
  
  // Weather Info
  weatherTemp: number;
  weatherHumidity: number;
  weatherPrecipitation: number;
  weatherWindSpeed: number;
  weatherCondition: string;

  // Logs & Console logs
  logs: SystemLog[];
  mqttLogs: string[];
  
  // Connection states
  mqttConnected: boolean;
  apiConnected: boolean;
  
  // Configuration
  customServerIp: string;
  isFetching: boolean;
}

const initialState: AppState = {
  soilMoisture: 35.0,
  temperature: 24.5,
  humidity: 55.0,
  vpd: 1.2,
  systemMode: 'AUTO',
  pumpActive: false,
  pumpTimerLeft: 0,
  predictedAction: 'MONITOR',
  predictedConfidence: 85.0,
  predictionReason: 'Moisture stable, moderate VPD, watching forecast',
  recommendedDuration: 0,
  weatherTemp: 22.0,
  weatherHumidity: 60.0,
  weatherPrecipitation: 10,
  weatherWindSpeed: 12.0,
  weatherCondition: 'unknown',
  logs: [],
  mqttLogs: [],
  mqttConnected: false,
  apiConnected: false,
  customServerIp: '',
  isFetching: false,
};

type Listener = () => void;

class StateStore<T> {
  private state: T;
  private listeners = new Set<Listener>();

  constructor(initial: T) {
    this.state = initial;
  }

  getState = (): T => {
    return this.state;
  };

  setState = (nextState: Partial<T> | ((s: T) => Partial<T>)) => {
    const partial = typeof nextState === 'function' ? nextState(this.state) : nextState;
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(l => l());
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

const store = new StateStore<AppState>(initialState);

// Reusable hook mimicking Zustand API signature
export function useAppStore<U>(selector: (state: AppState) => U): U {
  const [value, setValue] = useState(() => selector(store.getState()));

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setValue(selector(store.getState()));
    });
    return unsubscribe;
  }, [selector]);

  return value;
}

useAppStore.getState = store.getState;
useAppStore.setState = store.setState;

// Helpers to trigger actions and handle logic
export const actions = {
  init: () => {
    // 1. Sync from current custom server IP if any
    const ip = store.getState().customServerIp;
    if (ip) {
      updateApiBaseUrl(ip);
      updateMqttBrokerUrl(ip);
    }
    
    // 2. Fetch initial payload
    actions.fetchDashboardData();

    // 3. Connect to MQTT WebSocket broker
    mqttClient.onConnectionChange((status) => {
      useAppStore.setState({ mqttConnected: status });
      actions.addMqttLog(`System: MQTT connection status changed to: ${status ? 'CONNECTED' : 'DISCONNECTED'}`);
    });

    mqttClient.connect();

    // 4. Subscribe to default MQTT channels for real-time live overlays
    mqttClient.subscribe('pwos/sensor/data', (msg) => {
      actions.addMqttLog(`[MQTT Received] Topic: pwos/sensor/data, Payload: ${JSON.stringify(msg)}`);
      if (msg && typeof msg === 'object') {
        useAppStore.setState({
          soilMoisture: typeof msg.soil_moisture === 'number' ? msg.soil_moisture : store.getState().soilMoisture,
          temperature: typeof msg.temperature === 'number' ? msg.temperature : store.getState().temperature,
          humidity: typeof msg.humidity === 'number' ? msg.humidity : store.getState().humidity,
          vpd: typeof msg.vpd === 'number' ? msg.vpd : store.getState().vpd,
          apiConnected: true
        });
      }
    });

    mqttClient.subscribe('pwos/system/hardware', (msg) => {
      actions.addMqttLog(`[MQTT Received] Topic: pwos/system/hardware, Payload: ${JSON.stringify(msg)}`);
      if (msg && typeof msg === 'object') {
        const active = msg.pump_active === true || msg.pump === 'ON';
        useAppStore.setState({ pumpActive: active });
      }
    });

    mqttClient.subscribe('pwos/system/mode', (msg) => {
      actions.addMqttLog(`[MQTT Received] Topic: pwos/system/mode, Payload: ${JSON.stringify(msg)}`);
      if (msg && typeof msg === 'object') {
        useAppStore.setState({ systemMode: msg.mode === 'MANUAL' ? 'MANUAL' : 'AUTO' });
      }
    });

    // 5. Start background poller interval (runs every 5 seconds to sync data if sockets drop)
    const pollInterval = setInterval(() => {
      actions.fetchDashboardData(true);
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      mqttClient.disconnect();
    };
  },

  fetchDashboardData: async (silent = false) => {
    if (!silent) useAppStore.setState({ isFetching: true });
    
    try {
      // Parallel fetches for speed and premium responsive UI
      const [sensorsRes, stateRes, predictRes, logsRes, weatherRes] = await Promise.allSettled([
        api.getLatestSensors(),
        api.getSystemState(),
        api.getPrediction(),
        api.getLogs(),
        api.getWeatherForecast()
      ]);

      const updates: Partial<AppState> = { apiConnected: true };

      if (sensorsRes.status === 'fulfilled') {
        updates.soilMoisture = sensorsRes.value.soil_moisture;
        updates.temperature = sensorsRes.value.temperature;
        updates.humidity = sensorsRes.value.humidity;
        updates.vpd = sensorsRes.value.vpd ?? 0;
      }
      
      if (stateRes.status === 'fulfilled') {
        updates.systemMode = stateRes.value.mode;
        updates.pumpActive = stateRes.value.pump_active;
      }

      if (predictRes.status === 'fulfilled') {
        updates.predictedAction = predictRes.value.recommended_action;
        updates.predictedConfidence = predictRes.value.ml_analysis?.confidence ?? 0;
        updates.predictionReason = predictRes.value.ml_analysis?.reason ?? '';
        updates.recommendedDuration = predictRes.value.recommended_duration;
      }

      if (logsRes.status === 'fulfilled') {
        updates.logs = logsRes.value.slice(0, 30); // show last 30 logs in console
      }

      if (weatherRes.status === 'fulfilled') {
        updates.weatherTemp = weatherRes.value.temperature;
        updates.weatherHumidity = weatherRes.value.humidity;
        updates.weatherPrecipitation = weatherRes.value.precipitation_chance;
        updates.weatherWindSpeed = weatherRes.value.wind_speed_kmh;
        updates.weatherCondition = weatherRes.value.condition;
      }

      useAppStore.setState(updates);
    } catch (e) {
      console.error('Mobile Store Error fetching data', e);
      useAppStore.setState({ apiConnected: false });
    } finally {
      if (!silent) useAppStore.setState({ isFetching: false });
    }
  },

  toggleSystemMode: async () => {
    const currentMode = store.getState().systemMode;
    const targetMode = currentMode === 'AUTO' ? 'MANUAL' : 'AUTO';
    
    // Optimistic UI updates
    useAppStore.setState({ systemMode: targetMode });
    actions.addMqttLog(`System Action: Changing system mode to ${targetMode}`);

    try {
      await api.toggleMode(targetMode);
      
      // Also publish via MQTT for instantaneous multi-device updates
      mqttClient.publish('pwos/system/mode', { mode: targetMode });
      
      await actions.fetchDashboardData(true);
    } catch (e) {
      console.error('Failed to change mode', e);
      useAppStore.setState({ systemMode: currentMode }); // Rollback
    }
  },

  triggerManualPump: async (seconds: number) => {
    // Check if system is in MANUAL mode first
    if (store.getState().systemMode !== 'MANUAL') {
      actions.addMqttLog('System Alert: Please switch system to MANUAL mode to trigger watering.');
      return false;
    }

    useAppStore.setState({ pumpActive: true, pumpTimerLeft: seconds });
    actions.addMqttLog(`System Action: Triggering pump for ${seconds} seconds`);

    try {
      await api.controlPump('ON', seconds);
      mqttClient.publish('pwos/system/hardware', { pump_active: true, pump: 'ON', duration: seconds });

      // Start the local countdown timer
      const timer = setInterval(() => {
        const currentLeft = store.getState().pumpTimerLeft;
        if (currentLeft <= 1) {
          clearInterval(timer);
          useAppStore.setState({ pumpActive: false, pumpTimerLeft: 0 });
          actions.addMqttLog('System Action: Pump watering cycle completed');
          actions.fetchDashboardData(true);
        } else {
          useAppStore.setState({ pumpTimerLeft: currentLeft - 1 });
        }
      }, 1000);

      return true;
    } catch (e) {
      console.error('Failed to start pump', e);
      useAppStore.setState({ pumpActive: false, pumpTimerLeft: 0 }); // Rollback
      return false;
    }
  },

  stopPump: async () => {
    useAppStore.setState({ pumpActive: false, pumpTimerLeft: 0 });
    actions.addMqttLog('System Action: Manually stopping pump');

    try {
      await api.controlPump('OFF', 0);
      mqttClient.publish('pwos/system/hardware', { pump_active: false, pump: 'OFF' });
      await actions.fetchDashboardData(true);
    } catch (e) {
      console.error('Failed to stop pump', e);
    }
  },

  saveCustomIp: (ip: string) => {
    useAppStore.setState({ customServerIp: ip });
    updateApiBaseUrl(ip);
    updateMqttBrokerUrl(ip);
    actions.addMqttLog(`Config Updated: Server IP set to: ${ip || 'Default Loopback'}`);
    
    // Disconnect and reconnect MQTT with new endpoint
    mqttClient.disconnect();
    setTimeout(() => {
      mqttClient.connect();
      actions.fetchDashboardData();
    }, 500);
  },

  addMqttLog: (log: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${log}`;
    useAppStore.setState((s) => ({
      mqttLogs: [formatted, ...s.mqttLogs].slice(0, 100) // keep last 100 entries
    }));
  }
};
