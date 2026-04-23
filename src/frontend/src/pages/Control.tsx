import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Power,
    Droplets,
    Thermometer,
    Wind,
    Activity,
    AlertTriangle,
    Lock,
    RefreshCw,
    Gauge,
    Zap,
    X,
    Settings2,
    Timer,
    Save,
    ChevronDown,
    ChevronUp,
    Database,
    Wifi,
    WifiOff
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useMqtt } from '../hooks/useMqtt';

export const Control: React.FC = () => {
    const { connected, hardwareStatus, sensorData: mqttSensorData, systemMode: mqttSystemMode, publishPumpControl, publishSystemMode } = useMqtt();

    // Fallbacks if sensorData is null
    const sensors = mqttSensorData || {
        soil_moisture: 0,
        temperature: 0,
        humidity: 0,
        timestamp: '--',
        pump_active: false
    };

    const pumpActive = sensors.pump_active;
    const systemMode = mqttSystemMode || 'AUTO';
    const isHardwareOnline = hardwareStatus === 'ONLINE';

    const [isBackendOffline, setIsBackendOffline] = useState(false);
    const [emergencyStop, setEmergencyStop] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    const [settings, setSettings] = useState({
        moistureMin: 25,
        moistureMax: 75,
        tempMin: 5,
        tempMax: 32,
        maxDuration: 45,
        latitude: -20.1492,
        longitude: 28.5833
    });

    const fetchState = useCallback(async () => {
        try {
            const settingsRes = await api.getSettings();
            if (settingsRes) {
                setSettings(prev => ({
                    ...prev,
                    moistureMin: settingsRes.moisture_threshold ?? prev.moistureMin,
                    moistureMax: settingsRes.moisture_max ?? prev.moistureMax,
                    tempMin: settingsRes.temp_min ?? prev.tempMin,
                    tempMax: settingsRes.temp_max ?? prev.tempMax,
                    maxDuration: settingsRes.max_duration ?? prev.maxDuration,
                    latitude: settingsRes.latitude ?? prev.latitude,
                    longitude: settingsRes.longitude ?? prev.longitude,
                }));
            }
            setIsBackendOffline(false);
        } catch (error) {
            setIsBackendOffline(true);
        }
    }, []);

    useEffect(() => {
        fetchState();
        const interval = setInterval(fetchState, 10000);
        return () => clearInterval(interval);
    }, [fetchState]);

    const handleModeToggle = () => {
        const newMode = systemMode === 'AUTO' ? 'MANUAL' : 'AUTO';
        if (newMode === 'AUTO' && isBackendOffline) {
            toast.error('Cannot enable AI Autopilot while backend is offline.');
            return;
        }
        publishSystemMode(newMode);
        toast.info(`System set to ${newMode}`);
    };

    const handlePump = (action: 'ON' | 'OFF') => {
        publishPumpControl(action, settings.maxDuration);
        toast.info(`Pump ${action} command sent`);
    };

    const handleEmergencyStop = () => {
        setShowEmergencyModal(false);
        setEmergencyStop(true);
        publishPumpControl('OFF', 0);
        publishSystemMode('MANUAL');
        toast.error('EMERGENCY STOP ACTIVATED');
    };

    const handleSaveSettings = async () => {
        if (isBackendOffline) {
            toast.error("Database offline. Cannot save settings.");
            return;
        }

        setSavingSettings(true);
        try {
            await api.saveSettings({
                moisture_threshold: settings.moistureMin,
                moisture_max: settings.moistureMax,
                temp_min: settings.tempMin,
                temp_max: settings.tempMax,
                max_duration: settings.maxDuration,
                latitude: settings.latitude,
                longitude: settings.longitude,
            });
            toast.success('Settings Saved');
        } catch {
            toast.error('Save Failed');
        } finally {
            setSavingSettings(false);
        }
    };

    const isAuto = systemMode === 'AUTO';
    const isSystemDown = !connected || !isHardwareOnline;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        Control <span className="text-emerald-500">Center</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">Hardware Node: {sensors.timestamp}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={`gap-1.5 py-1 px-3 ${connected ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}>
                        <Wifi className="size-3" /> {connected ? 'Broker Online' : 'Broker Offline'}
                    </Badge>
                    <Badge variant="outline" className={`gap-1.5 py-1 px-3 ${isHardwareOnline ? 'text-blue-500 border-blue-500/20 bg-blue-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5 animate-pulse'}`}>
                        <Zap className="size-3" /> {isHardwareOnline ? 'ESP32 Active' : 'ESP32 Offline'}
                    </Badge>
                    <Badge variant="outline" className={`gap-1.5 py-1 px-3 ${isBackendOffline ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' : 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'}`}>
                        <Database className="size-3" /> {isBackendOffline ? 'Local API Offline' : 'AI Engine Ready'}
                    </Badge>
                </div>
            </div>

            {/* Sensor Quick Glance */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MiniSensorCard label="Moisture" value={`${sensors.soil_moisture.toFixed(0)}%`} icon={<Droplets className="size-4 text-blue-500" />} active={isHardwareOnline} />
                <MiniSensorCard label="Temp" value={`${sensors.temperature.toFixed(1)}°C`} icon={<Thermometer className="size-4 text-orange-500" />} active={isHardwareOnline} />
                <MiniSensorCard label="Humidity" value={`${sensors.humidity.toFixed(0)}%`} icon={<Wind className="size-4 text-teal-500" />} active={isHardwareOnline} />
                <MiniSensorCard label="Pump Status" value={pumpActive ? 'ACTIVE' : 'IDLE'} icon={<Activity className={`size-4 ${pumpActive ? 'text-emerald-500' : 'text-slate-300'}`} />} active={isHardwareOnline} />
            </div>

            {/* Main Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* System Operation Switcher */}
                <Card className={`relative overflow-hidden border-2 transition-all duration-500 rounded-[2rem] ${isAuto ? 'border-blue-500/20 bg-blue-50/5' : 'border-orange-500/20 bg-orange-50/5'}`}>
                    <CardContent className="p-10 h-full flex flex-col items-center justify-center text-center space-y-8">
                        <div className={`p-5 rounded-[2rem] shadow-sm border ${isAuto ? 'bg-blue-500/10 border-blue-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                            {isAuto ? <Gauge className="size-12 text-blue-500" /> : <Settings2 className="size-12 text-orange-500" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">System Operation</h2>
                            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-2">
                                {isAuto ? 'AI Predictive Autopilot' : 'Manual Hardware Override'}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2.5 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isAuto ? 'text-blue-600' : 'text-slate-400'}`}>AUTO</span>
                            <Switch 
                                checked={!isAuto} 
                                onCheckedChange={handleModeToggle}
                                className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-blue-600"
                            />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${!isAuto ? 'text-orange-600' : 'text-slate-400'}`}>MANUAL</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Physical Pump Actuator */}
                <Card className={`relative overflow-hidden border-2 transition-all duration-500 rounded-[2rem] ${pumpActive ? 'border-emerald-500 bg-emerald-50/10 shadow-xl shadow-emerald-500/5' : 'border-slate-100 dark:border-slate-800'}`}>
                    {isAuto && isHardwareOnline && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/80 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 text-center transition-all duration-500">
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl">
                                    <Lock className="size-6" />
                                </div>
                                <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.2em] leading-relaxed">
                                    Switch to Manual Mode<br/>to control hardware
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {!isHardwareOnline && (
                        <div className="absolute inset-0 bg-red-50/60 dark:bg-slate-950/90 backdrop-blur-[4px] z-20 flex items-center justify-center transition-all duration-500">
                            <div className="flex flex-col items-center gap-3">
                                <WifiOff className="size-10 text-red-500 animate-pulse" />
                                <p className="text-[11px] font-black text-red-600 dark:text-red-500 uppercase tracking-[0.3em]">
                                    Node Offline
                                </p>
                            </div>
                        </div>
                    )}

                    <CardContent className="p-10 h-full flex flex-col items-center justify-center">
                        <button
                            disabled={isAuto || isSystemDown}
                            onClick={() => handlePump(pumpActive ? 'OFF' : 'ON')}
                            className={`w-40 aspect-square rounded-full flex flex-col items-center justify-center transition-all duration-500 border-8 active:scale-95 ${
                                pumpActive 
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-2xl shadow-emerald-500/40' 
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300'
                            } ${isAuto || isSystemDown ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
                        >
                            <Power className={`size-16 transition-transform duration-700 ${pumpActive ? 'rotate-0' : 'rotate-12'}`} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] mt-2">{pumpActive ? 'Running' : 'Idle'}</span>
                        </button>
                        <div className="mt-8 text-center">
                            <h3 className={`text-xl font-black uppercase tracking-tight ${pumpActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                Pump Control
                            </h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Direct Relay Actuator</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Emergency & Settings Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Emergency Stop */}
                <Card className="lg:col-span-1 border-2 border-red-500/20 bg-red-50/5 dark:bg-red-950/10 rounded-[2rem]">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="p-4 bg-red-500 rounded-[1.5rem] text-white shadow-lg shadow-red-500/20">
                            <AlertTriangle className="size-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase text-red-600 tracking-tight">Emergency Halt</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Instant Physical Cutoff</p>
                        </div>
                        <Button 
                            variant="destructive" 
                            size="lg" 
                            className="w-full font-black tracking-widest rounded-2xl h-16 shadow-lg shadow-red-500/10 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition-all"
                            disabled={!connected || !isHardwareOnline}
                            onClick={() => setShowEmergencyModal(true)}
                        >
                            STOP SYSTEM
                        </Button>
                    </CardContent>
                </Card>

                {/* Configuration Panel */}
                <Card className={`lg:col-span-2 relative overflow-hidden border-2 transition-all duration-500 rounded-[2rem] ${isBackendOffline ? 'border-slate-100 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'}`}>
                    
                    {/* Consistent Lock Overlay for Database Card */}
                    {isAuto && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/80 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 text-center transition-all duration-500">
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl">
                                    <Lock className="size-6" />
                                </div>
                                <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.2em] leading-relaxed">
                                    Switch to Manual Mode<br/>to update parameters
                                </p>
                            </div>
                        </div>
                    )}

                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <Settings2 className="size-6 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-tight text-lg">Database Parameters</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ML Thresholds & Fail-safes</p>
                                </div>
                            </div>
                            {isBackendOffline && <Badge variant="outline" className="text-[10px] font-black text-amber-600 border-amber-200 bg-amber-50">READ-ONLY</Badge>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Moisture Trigger (%)</label>
                                    <div className="relative group">
                                        <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-blue-500 opacity-50 group-focus-within:opacity-100 transition-opacity" />
                                        <input 
                                            type="number" 
                                            value={settings.moistureMin} 
                                            disabled={isBackendOffline || isAuto}
                                            onChange={e => setSettings(s => ({...s, moistureMin: Number(e.target.value)}))}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-14 pl-12 pr-4 rounded-2xl font-black text-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pump Duration (S)</label>
                                    <div className="relative group">
                                        <Timer className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-emerald-500 opacity-50 group-focus-within:opacity-100 transition-opacity" />
                                        <input 
                                            type="number" 
                                            value={settings.maxDuration} 
                                            disabled={isBackendOffline || isAuto}
                                            onChange={e => setSettings(s => ({...s, maxDuration: Number(e.target.value)}))}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-14 pl-12 pr-4 rounded-2xl font-black text-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-end space-y-4">
                                <Button 
                                    className={`w-full h-14 rounded-2xl font-black tracking-widest transition-all shadow-lg ${isBackendOffline || isAuto ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-black dark:hover:bg-slate-100 shadow-slate-900/10'}`}
                                    disabled={isBackendOffline || isAuto || savingSettings}
                                    onClick={handleSaveSettings}
                                >
                                    {savingSettings ? 'SYNCING...' : 'UPDATE SETTINGS'}
                                </Button>
                                <p className="text-[9px] text-slate-400 font-bold uppercase text-center tracking-tighter italic">
                                    {isBackendOffline ? 'Requires active API connection' : 'Live update to PostgreSQL Database'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Emergency Modal */}
            {showEmergencyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                    <Card className="w-full max-w-md border-none rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-8 text-center space-y-6 bg-white dark:bg-slate-900">
                            <div className="size-24 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-50 dark:border-red-900/10">
                                <AlertTriangle className="size-12" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight">System Halt</h2>
                                <p className="text-slate-500 text-sm mt-3 font-medium">This forces the pump OFF and locks the system into MANUAL mode for safety.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-2" onClick={() => setShowEmergencyModal(false)}>CANCEL</Button>
                                <Button variant="destructive" className="flex-1 h-14 rounded-2xl font-black tracking-widest shadow-lg shadow-red-500/20" onClick={handleEmergencyStop}>HALT NOW</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

const MiniSensorCard: React.FC<{label: string, value: string, icon: React.ReactNode, active: boolean}> = ({label, value, icon, active}) => (
    <Card className={`border-2 rounded-[1.5rem] shadow-sm transition-all duration-500 ${!active ? 'opacity-20 grayscale' : 'border-slate-100 dark:border-slate-800'}`}>
        <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">{icon}</div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white">{value}</span>
        </CardContent>
    </Card>
);
