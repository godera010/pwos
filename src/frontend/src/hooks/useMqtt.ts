import { useEffect, useState } from 'react';
import { mqttClient } from '../services/mqttClient';

export interface MqttSensorData {
    device_id?: string;
    timestamp?: string;
    soil_moisture: number;
    temperature: number;
    humidity: number;
    pump_active: boolean;
    vpc_demo_time?: string;
}

export function useMqtt() {
    const [connected, setConnected] = useState(mqttClient.isConnected());
    const [sensorData, setSensorData] = useState<MqttSensorData | null>(null);
    const [systemMode, setSystemMode] = useState<'AUTO' | 'MANUAL' | null>(null);
    const [hardwareStatus, setHardwareStatus] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');

    useEffect(() => {
        // Initialize connection
        mqttClient.connect();

        // Handle connection state changes
        const handleConnectionChange = (status: boolean) => {
            setConnected(status);
        };
        mqttClient.onConnectionChange(handleConnectionChange);

        // Handle incoming sensor data
        const handleSensorData = (data: any) => {
            setSensorData(data as MqttSensorData);
            // Self-healing: If we receive data, we MUST be connected and hardware is online
            setConnected(true);
            setHardwareStatus('ONLINE');
        };
        mqttClient.subscribe('pwos/sensor/data', handleSensorData);

        // Handle hardware LWT / Status
        const handleHardwareStatus = (status: any) => {
            // e.g. payload "ONLINE" or "OFFLINE"
            if (status === 'OFFLINE' || status === 'ONLINE') {
                setHardwareStatus(status);
            }
        };
        mqttClient.subscribe('pwos/system/hardware', handleHardwareStatus);

        // Handle system mode updates
        const handleSystemMode = (mode: any) => {
            if (mode === 'AUTO' || mode === 'MANUAL') {
                setSystemMode(mode);
            }
        };
        mqttClient.subscribe('pwos/system/mode', handleSystemMode);

        return () => {
            mqttClient.unsubscribe('pwos/sensor/data', handleSensorData);
            mqttClient.unsubscribe('pwos/system/hardware', handleHardwareStatus);
            mqttClient.unsubscribe('pwos/system/mode', handleSystemMode);
        };
    }, []);

    // Helper functions for components to use
    const publishPumpControl = (action: 'ON' | 'OFF', duration: number = 60) => {
        const isActive = action === 'ON';
        // Optimistic Update: Update local state immediately so UI is snappy
        setSensorData(prev => prev ? { ...prev, pump_active: isActive } : null);
        
        mqttClient.publish('pwos/control/pump', { action, duration });
    };

    const publishSystemMode = (mode: 'AUTO' | 'MANUAL') => {
        // Optimistic Update: Update local state immediately
        setSystemMode(mode);
        
        mqttClient.publish('pwos/system/mode', mode, { retain: true });
    };

    return {
        connected, // Is broker reachable?
        hardwareStatus, // Is ESP32 alive?
        sensorData,
        systemMode,
        publishPumpControl,
        publishSystemMode
    };
}
