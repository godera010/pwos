import { useEffect, useState, useRef, useCallback } from 'react';
import { mqttClient } from '../services/mqttClient';
import { toast } from 'sonner';

export interface MqttSensorData {
    device_id?: string;
    timestamp?: string;
    soil_moisture: number;
    temperature: number;
    humidity: number;
    pump_active: boolean;
    vpc_demo_time?: string;
    vpd?: number;
}

export function useMqtt() {
    const [connected, setConnected] = useState(mqttClient.isConnected());
    const [sensorData, setSensorData] = useState<MqttSensorData | null>(null);
    const [systemMode, setSystemMode] = useState<'AUTO' | 'MANUAL' | null>(null);
    const [hardwareStatus, setHardwareStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');

    const prevConnected = useRef(connected);
    const prevHardwareStatus = useRef(hardwareStatus);
    const isFirstConnected = useRef(true);
    const isFirstHardware = useRef(true);

    // Toast triggers on broker connection changes
    useEffect(() => {
        if (isFirstConnected.current) {
            isFirstConnected.current = false;
            prevConnected.current = connected;
            return;
        }

        if (connected !== prevConnected.current) {
            if (connected && prevConnected.current === false) {
                toast.success('MQTT Broker Connected', {
                    description: 'Real-time telemetry and control feeds have been re-established.',
                    duration: 4000
                });
            } else if (!connected) {
                toast.error('MQTT Broker Disconnected', {
                    description: 'Lost server connection. Sensor telemetry is frozen and commands are disabled.',
                    duration: 10000
                });
            }
            prevConnected.current = connected;
        }
    }, [connected]);

    // Toast triggers on hardware LWT status changes
    useEffect(() => {
        if (isFirstHardware.current) {
            isFirstHardware.current = false;
            prevHardwareStatus.current = hardwareStatus;
            return;
        }

        if (hardwareStatus !== prevHardwareStatus.current) {
            if (hardwareStatus === 'ONLINE' && prevHardwareStatus.current === 'OFFLINE') {
                toast.success('ESP32 Controller Online', {
                    description: 'Physical sensor unit has re-established hardware communication.',
                    duration: 4000
                });
            } else if (hardwareStatus === 'OFFLINE') {
                toast.error('ESP32 Controller Offline', {
                    description: 'The physical controller is currently unreachable. Live signals are stale.',
                    duration: 10000
                });
            }
            prevHardwareStatus.current = hardwareStatus;
        }
    }, [hardwareStatus]);

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
    const publishPumpControl = useCallback((action: 'ON' | 'OFF', duration: number = 60) => {
        const isActive = action === 'ON';
        // Optimistic Update: Update local state immediately so UI is snappy
        setSensorData(prev => prev ? { ...prev, pump_active: isActive } : null);
        
        mqttClient.publish('pwos/control/pump', { action, duration });
    }, []);

    const publishSystemMode = useCallback((mode: 'AUTO' | 'MANUAL') => {
        // Optimistic Update: Update local state immediately
        setSystemMode(mode);
        
        mqttClient.publish('pwos/system/mode', mode, { retain: true });
    }, []);

    return {
        connected, // Is broker reachable?
        hardwareStatus, // Is ESP32 alive?
        sensorData,
        systemMode,
        publishPumpControl,
        publishSystemMode
    };
}
