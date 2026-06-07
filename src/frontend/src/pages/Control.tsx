import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Gauge,
    Zap,
    Settings2,
    Timer,
    Database,
    Wifi,
    WifiOff,
    MapPin
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
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    const prevBackendOffline = useRef(isBackendOffline);
    const isFirstBackend = useRef(true);

    useEffect(() => {
        if (isFirstBackend.current) {
            isFirstBackend.current = false;
            prevBackendOffline.current = isBackendOffline;
            return;
        }

        if (isBackendOffline !== prevBackendOffline.current) {
            if (isBackendOffline) {
                toast.warning('Backend API Offline', {
                    description: 'Predictive intelligence and settings databases are unavailable. Operating in local telemetry mode.',
                    duration: 8000
                });
            } else if (!isBackendOffline && prevBackendOffline.current === true) {
                toast.success('Backend API Connected', {
                    description: 'Predictive models and live settings databases are fully synchronized.',
                    duration: 4000
                });
            }
            prevBackendOffline.current = isBackendOffline;
        }
    }, [isBackendOffline]);

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
            toast.error('Autopilot Activation Blocked', {
                description: 'Cannot enable AI Autopilot while backend API service is offline.',
                duration: 6000,
            });
            return;
        }
        publishSystemMode(newMode);
        toast.info('System Mode Changed', {
            description: `System operation mode set to ${newMode === 'AUTO' ? 'AI Autopilot' : 'Manual Control'}.`,
            duration: 4000,
        });
    };

    const handleModeChange = (targetMode: 'AUTO' | 'MANUAL') => {
        if (systemMode === targetMode) return;
        if (targetMode === 'AUTO' && isBackendOffline) {
            toast.error('Autopilot Activation Blocked', {
                description: 'Cannot enable AI Autopilot while backend API service is offline.',
                duration: 6000,
            });
            return;
        }
        publishSystemMode(targetMode);
        toast.info('System Mode Changed', {
            description: `System operation mode set to ${targetMode === 'AUTO' ? 'AI Autopilot' : 'Manual Control'}.`,
            duration: 4000,
        });
    };

    const handlePump = (action: 'ON' | 'OFF') => {
        publishPumpControl(action, settings.maxDuration);
        toast.info('Pump Command Sent', {
            description: `Manual instruction to turn the pump ${action} was transmitted successfully.`,
            duration: 4000,
        });
    };

    const handleEmergencyStop = () => {
        setShowEmergencyModal(false);
        publishPumpControl('OFF', 0);
        publishSystemMode('MANUAL');
        toast.error('Emergency Stop Activated', {
            description: 'Submersible water pump immediately deactivated. Autopilot disabled.',
            duration: 10000,
        });
    };

    const handleSaveSettings = async () => {
        if (isBackendOffline) {
            toast.error('Database Offline', {
                description: 'Cannot save settings. The local API server is unreachable.',
                duration: 6000,
            });
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
            toast.success('Settings Saved', {
                description: 'Configuration metrics were successfully saved to the database.',
                duration: 4000,
            });
        } catch {
            toast.error('Save Failed', {
                description: 'An unexpected database writing error occurred. Please try again.',
                duration: 6000,
            });
        } finally {
            setSavingSettings(false);
        }
    };

    const isAuto = systemMode === 'AUTO';
    const isSystemDown = !connected || !isHardwareOnline;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12 px-4 md:px-0">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        Control <span className="text-emerald-500 dark:text-primary">Center</span>
                    </h1>
                    <p className="text-muted-foreground font-mono mt-1 uppercase text-[10px] tracking-wider">
                        Hardware Node Telemetry: {sensors.timestamp}
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-2.5">
                    {/* Broker Badge */}
                    <div className={`flex items-center gap-1.5 py-1 px-3.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${
                        connected 
                            ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5' 
                            : 'text-red-500 border-red-500/20 bg-red-500/5 animate-pulse'
                    }`}>
                        <Wifi className="size-3.5" />
                        <span>{connected ? 'Broker Connected' : 'Broker Offline'}</span>
                    </div>

                    {/* Node Badge */}
                    <div className={`flex items-center gap-1.5 py-1 px-3.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${
                        isHardwareOnline 
                            ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5' 
                            : 'text-red-500 border-red-500/20 bg-red-500/5 animate-pulse'
                    }`}>
                        <Zap className="size-3.5" />
                        <span>{isHardwareOnline ? 'ESP32 Active' : 'ESP32 Offline'}</span>
                    </div>

                    {/* API Badge */}
                    <div className={`flex items-center gap-1.5 py-1 px-3.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${
                        isBackendOffline 
                            ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' 
                            : 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5'
                    }`}>
                        <Database className="size-3.5" />
                        <span>{isBackendOffline ? 'Local API Offline' : 'AI Engine Ready'}</span>
                    </div>
                </div>
            </div>

            {/* Sensor Quick Glance Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MiniSensorCard 
                    label="Soil Moisture" 
                    value={`${sensors.soil_moisture.toFixed(0)}%`} 
                    icon={<Droplets className="size-4" />} 
                    active={isHardwareOnline}
                    colorClass="text-blue-500 bg-blue-500/10"
                />
                <MiniSensorCard 
                    label="Air Temp" 
                    value={`${sensors.temperature.toFixed(1)}°C`} 
                    icon={<Thermometer className="size-4" />} 
                    active={isHardwareOnline}
                    colorClass="text-orange-500 bg-orange-500/10"
                />
                <MiniSensorCard 
                    label="Humidity" 
                    value={`${sensors.humidity.toFixed(0)}%`} 
                    icon={<Wind className="size-4" />} 
                    active={isHardwareOnline}
                    colorClass="text-teal-500 bg-teal-500/10"
                />
                <MiniSensorCard 
                    label="Relay Status" 
                    value={pumpActive ? 'ACTIVE' : 'IDLE'} 
                    icon={<Activity className="size-4" />} 
                    active={isHardwareOnline}
                    colorClass={pumpActive ? "text-emerald-500 bg-emerald-500/15 animate-pulse" : "text-muted-foreground bg-secondary/80"}
                />
            </div>

            {/* Main Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* System Operation Switcher */}
                <Card className="shadow-none overflow-hidden border border-slate-200 dark:border-slate-800 bg-card rounded-2xl flex flex-col h-full">
                    <div className="p-4 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            System Operation
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                            Configure predictive automation parameters vs physical override
                        </p>
                    </div>

                    <CardContent className="flex-1 p-4 pt-2">
                        <div className="grid grid-cols-2 gap-3 h-full relative">
                            
                            {/* Partition 1: AI Autopilot */}
                            <div 
                                onClick={() => handleModeChange('AUTO')}
                                className={`rounded-2xl border p-3 sm:p-6 flex flex-col items-center justify-center min-h-[130px] sm:min-h-[180px] transition-all duration-500 cursor-pointer ${
                                    isAuto 
                                        ? 'bg-emerald-950/20 dark:bg-emerald-950/40 border-emerald-500/20 shadow-[inset_0_1px_0_rgba(16,185,129,0.1)]' 
                                        : 'bg-secondary/20 dark:bg-secondary/40 border-border hover:bg-secondary/40'
                                }`}
                            >
                                <div className={`p-2 sm:p-4 rounded-full border mb-2 sm:mb-4 transition-all duration-500 ${
                                    isAuto 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-110' 
                                        : 'bg-secondary border-border text-muted-foreground'
                                }`}>
                                    <Gauge className="size-6 sm:size-8" />
                                </div>
                                <div className="text-center">
                                    <h4 className={`text-xs sm:text-sm font-bold tracking-tight uppercase transition-colors ${isAuto ? 'text-emerald-500' : 'text-foreground'}`}>
                                        AI Autopilot
                                    </h4>
                                    <p className={`text-[9px] mt-0.5 font-bold uppercase tracking-wider transition-colors ${isAuto ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                        {isAuto ? 'AI MODE ACTIVE' : 'STANDBY'}
                                    </p>
                                </div>
                            </div>

                            {/* Partition 2: Manual Control */}
                            <div 
                                onClick={() => handleModeChange('MANUAL')}
                                className={`rounded-2xl border p-3 sm:p-6 flex flex-col items-center justify-center min-h-[130px] sm:min-h-[180px] transition-all duration-500 cursor-pointer ${
                                    !isAuto 
                                        ? 'bg-amber-950/20 dark:bg-amber-950/40 border-amber-500/20 shadow-[inset_0_1px_0_rgba(245,158,11,0.1)]' 
                                        : 'bg-secondary/20 dark:bg-secondary/40 border-border hover:bg-secondary/40'
                                }`}
                            >
                                <div className={`p-2 sm:p-4 rounded-full border mb-2 sm:mb-4 transition-all duration-500 ${
                                    !isAuto 
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-110' 
                                        : 'bg-secondary border-border text-muted-foreground'
                                }`}>
                                    <Settings2 className="size-6 sm:size-8" />
                                </div>
                                <div className="text-center">
                                    <h4 className={`text-xs sm:text-sm font-bold tracking-tight uppercase transition-colors ${!isAuto ? 'text-amber-500' : 'text-foreground'}`}>
                                        Manual Override
                                    </h4>
                                    <p className={`text-[9px] mt-0.5 font-bold uppercase tracking-wider transition-colors ${!isAuto ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                        {!isAuto ? 'DIRECT ACCESS' : 'STANDBY'}
                                    </p>
                                </div>
                            </div>

                        </div>
                    </CardContent>

                    {/* Mode Toggle Button Switch Bottom Pill */}
                    <div className="px-4 pb-4 pt-0">
                        <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border border-border rounded-xl">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Toggle Mode</span>
                            <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-black uppercase ${isAuto ? 'text-emerald-500' : 'text-muted-foreground/50'}`}>AI AUTO</span>
                                <Switch 
                                    checked={!isAuto} 
                                    onCheckedChange={handleModeToggle}
                                    className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-emerald-500 border-none h-5 w-9 [&_span]:h-4 [&_span]:w-4 [&_span]:data-[state=checked]:translate-x-4"
                                />
                                <span className={`text-[9px] font-black uppercase ${!isAuto ? 'text-amber-500' : 'text-muted-foreground/50'}`}>MANUAL</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Physical Pump Actuator */}
                <Card className="shadow-none overflow-hidden border border-slate-200 dark:border-slate-800 bg-card rounded-2xl flex flex-col h-full relative">
                    
                    {/* Autopilot Lock Overlay */}
                    {isAuto && isHardwareOnline && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-black/85 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 text-center transition-all duration-500 rounded-2xl">
                            <div className="flex flex-col items-center gap-3 max-w-xs animate-in zoom-in-95 duration-300">
                                <div className="p-3.5 bg-secondary border border-border text-foreground rounded-2xl shadow-sm">
                                    <Lock className="size-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-foreground uppercase tracking-widest leading-relaxed">
                                        Autopilot Lock Active
                                    </p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 leading-relaxed">
                                        Disable AI Mode above to manual actuate the direct relay water pump
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Node Offline Overlay */}
                    {!isHardwareOnline && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-black/95 backdrop-blur-[4px] z-20 flex items-center justify-center transition-all duration-500 rounded-2xl">
                            <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full animate-bounce">
                                    <WifiOff className="size-8" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-red-600 dark:text-red-500 uppercase tracking-widest">
                                        Telemetry Link Severed
                                    </p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                                        ESP32 terminal node offline. Relay controls unavailable.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Physical Pump Actuator
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                            Direct GPIO relay state trigger command
                        </p>
                    </div>

                    <CardContent className="flex-1 p-6 flex flex-col items-center justify-center">
                        <button
                            disabled={isAuto || isSystemDown}
                            onClick={() => handlePump(pumpActive ? 'OFF' : 'ON')}
                            className={`w-36 aspect-square rounded-full flex flex-col items-center justify-center transition-all duration-500 border-4 outline-none relative active:scale-95 ${
                                pumpActive 
                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.35)] dark:shadow-[0_0_40px_rgba(16,185,129,0.25)]' 
                                    : 'bg-secondary hover:bg-secondary/80 border-border text-muted-foreground/60 hover:text-foreground'
                            } ${isAuto || isSystemDown ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                        >
                            {/* Dial Accents */}
                            <div className="absolute inset-2.5 rounded-full border border-dashed border-current opacity-20 animate-spin" style={{ animationDuration: '20s' }}></div>

                            <Power className={`size-12 transition-transform duration-700 ${pumpActive ? 'rotate-0 scale-105' : 'rotate-12'}`} />
                            <span className="text-[9px] font-black uppercase tracking-[0.25em] mt-2.5 font-mono">
                                {pumpActive ? 'Running' : 'Offline'}
                            </span>
                        </button>
                        
                        <div className="mt-6 text-center">
                            <h3 className={`text-base font-black uppercase tracking-wider transition-colors ${pumpActive ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                Pump relay: {pumpActive ? 'HIGH' : 'LOW'}
                            </h3>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                Submersible Pump GPIO pin state
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Emergency & Settings Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Emergency Stop Panel */}
                <Card className="lg:col-span-1 border border-red-500/20 bg-red-950/5 dark:bg-red-950/10 rounded-2xl flex flex-col justify-between">
                    <div className="p-4 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-500">
                            Emergency Failsafe
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                            Instant hardware level override trigger
                        </p>
                    </div>

                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-5 flex-1">
                        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 animate-pulse">
                            <AlertTriangle className="size-9" />
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white tracking-tight">Emergency Halt</h3>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1 max-w-[200px] leading-relaxed mx-auto">
                                Forces pump OFF immediately and locks the system in manual mode.
                            </p>
                        </div>
                    </CardContent>

                    <div className="p-4 pt-0">
                        <Button 
                            variant="destructive" 
                            size="lg" 
                            className="w-full font-bold uppercase text-xs tracking-wider rounded-xl h-12 shadow-sm border border-red-600 hover:bg-red-600/90 active:scale-[0.98] transition-all"
                            disabled={!connected || !isHardwareOnline}
                            onClick={() => setShowEmergencyModal(true)}
                        >
                            STOP SYSTEM NOW
                        </Button>
                    </div>
                </Card>

                {/* Configuration Panel */}
                <Card className="lg:col-span-2 shadow-none overflow-hidden border border-slate-200 dark:border-slate-800 bg-card rounded-2xl flex flex-col relative">
                    
                    {/* Consistent Lock Overlay */}
                    {isAuto && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-black/85 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 text-center transition-all duration-500 rounded-2xl">
                            <div className="flex flex-col items-center gap-3 max-w-xs animate-in zoom-in-95 duration-300">
                                <div className="p-3.5 bg-secondary border border-border text-foreground rounded-2xl shadow-sm">
                                    <Lock className="size-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-foreground uppercase tracking-widest leading-relaxed">
                                        Autopilot Parameter Lock
                                    </p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 leading-relaxed">
                                        Configuration modifications locked while AI mode is active. Disable Autopilot to modify boundaries.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 pb-2 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                Database Thresholds
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                                Configure model boundaries and coordinate system boundaries
                            </p>
                        </div>
                        {isBackendOffline && (
                            <Badge variant="outline" className="text-[8px] font-mono font-bold text-amber-500 border-amber-500/20 bg-amber-500/5 px-2 py-0.5">
                                READ-ONLY
                            </Badge>
                        )}
                    </div>

                    <CardContent className="p-4 pt-2 flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Moisture Trigger Input */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Trigger Moisture (%)
                                </label>
                                <div className="relative group">
                                    <Droplets className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-blue-500 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                                    <input 
                                        type="number" 
                                        value={settings.moistureMin} 
                                        disabled={isBackendOffline || isAuto}
                                        onChange={e => setSettings(s => ({...s, moistureMin: Number(e.target.value)}))}
                                        className="w-full bg-secondary/35 border border-border h-11 pl-10 pr-3 rounded-xl font-black text-sm focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Min %"
                                    />
                                </div>
                            </div>

                            {/* Max Duration Input */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Max Duration (S)
                                </label>
                                <div className="relative group">
                                    <Timer className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-emerald-500 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                                    <input 
                                        type="number" 
                                        value={settings.maxDuration} 
                                        disabled={isBackendOffline || isAuto}
                                        onChange={e => setSettings(s => ({...s, maxDuration: Number(e.target.value)}))}
                                        className="w-full bg-secondary/35 border border-border h-11 pl-10 pr-3 rounded-xl font-black text-sm focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Seconds"
                                    />
                                </div>
                            </div>

                            {/* Moisture Max Limit Input */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Saturate Limit (%)
                                </label>
                                <div className="relative group">
                                    <Droplets className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-blue-400 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                                    <input 
                                        type="number" 
                                        value={settings.moistureMax} 
                                        disabled={isBackendOffline || isAuto}
                                        onChange={e => setSettings(s => ({...s, moistureMax: Number(e.target.value)}))}
                                        className="w-full bg-secondary/35 border border-border h-11 pl-10 pr-3 rounded-xl font-black text-sm focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Max %"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
                            {/* Temp Min Input */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Min Temp (°C)
                                </label>
                                <div className="relative group">
                                    <Thermometer className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-orange-400 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                                    <input 
                                        type="number" 
                                        value={settings.tempMin} 
                                        disabled={isBackendOffline || isAuto}
                                        onChange={e => setSettings(s => ({...s, tempMin: Number(e.target.value)}))}
                                        className="w-full bg-secondary/35 border border-border h-11 pl-10 pr-3 rounded-xl font-black text-sm focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Min °C"
                                    />
                                </div>
                            </div>

                            {/* Temp Max Input */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Max Temp (°C)
                                </label>
                                <div className="relative group">
                                    <Thermometer className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-red-500 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                                    <input 
                                        type="number" 
                                        value={settings.tempMax} 
                                        disabled={isBackendOffline || isAuto}
                                        onChange={e => setSettings(s => ({...s, tempMax: Number(e.target.value)}))}
                                        className="w-full bg-secondary/35 border border-border h-11 pl-10 pr-3 rounded-xl font-black text-sm focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Max °C"
                                    />
                                </div>
                            </div>

                            {/* Latitude Input */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Latitude
                                </label>
                                <div className="relative group">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                                    <input 
                                        type="number" 
                                        step="0.0001"
                                        value={settings.latitude} 
                                        disabled={isBackendOffline || isAuto}
                                        onChange={e => setSettings(s => ({...s, latitude: Number(e.target.value)}))}
                                        className="w-full bg-secondary/35 border border-border h-11 pl-10 pr-3 rounded-xl font-black text-sm focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Lat"
                                    />
                                </div>
                            </div>

                            {/* Longitude Input */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Longitude
                                </label>
                                <div className="relative group">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                                    <input 
                                        type="number" 
                                        step="0.0001"
                                        value={settings.longitude} 
                                        disabled={isBackendOffline || isAuto}
                                        onChange={e => setSettings(s => ({...s, longitude: Number(e.target.value)}))}
                                        className="w-full bg-secondary/35 border border-border h-11 pl-10 pr-3 rounded-xl font-black text-sm focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Lng"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    {/* Sync Actions Footer */}
                    <div className="px-4 pb-4 pt-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-secondary/50 border border-border rounded-xl">
                            <div className="flex items-center gap-2">
                                <Database className="size-3.5 text-muted-foreground/60" />
                                <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                                    {isBackendOffline 
                                        ? 'DATABASE DISCONNECTED — CHANGES TEMPORARILY LOCKED' 
                                        : 'ACTIVE LIVE TRANSACTION: PostgreSQL DATABASE SYNC'}
                                </span>
                            </div>

                            <Button 
                                size="sm"
                                disabled={isBackendOffline || isAuto || savingSettings}
                                onClick={handleSaveSettings}
                                className={`font-bold uppercase text-[10px] tracking-wider rounded-lg h-8 px-5 transition-all shadow-sm ${
                                    isBackendOffline || isAuto 
                                        ? 'bg-secondary text-muted-foreground cursor-not-allowed' 
                                        : 'bg-emerald-500 border border-emerald-600 hover:bg-emerald-500/90 text-white active:scale-95'
                                }`}
                            >
                                {savingSettings ? 'Saving...' : 'Save Parameters'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Emergency Halt Confirmation Modal */}
            {showEmergencyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-md border border-red-500/20 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden bg-black/90 backdrop-blur-md">
                        <div className="p-8 text-center space-y-6">
                            <div className="size-20 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                <AlertTriangle className="size-10" />
                            </div>
                            
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                                    Confirm System Halt
                                </h2>
                                <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                                    This forces the submersible pump relay <span className="text-red-500 font-bold">OFF</span> and locks the system parameters into <span className="text-amber-500 font-bold">MANUAL MODE</span> for immediate local operator safety inspect.
                                </p>
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <Button 
                                    variant="outline" 
                                    className="flex-1 h-12 rounded-xl font-bold border border-border bg-transparent hover:bg-secondary/40 text-xs tracking-wider" 
                                    onClick={() => setShowEmergencyModal(false)}
                                >
                                    CANCEL
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    className="flex-1 h-12 rounded-xl font-bold uppercase text-xs tracking-wider shadow-md bg-red-600 border border-red-700 hover:bg-red-500 active:scale-95" 
                                    onClick={handleEmergencyStop}
                                >
                                    HALT RELAY
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

// Mini Sensor Card Sub-component
const MiniSensorCard: React.FC<{
    label: string;
    value: string;
    icon: React.ReactNode;
    active: boolean;
    colorClass: string;
}> = ({ label, value, icon, active, colorClass }) => (
    <Card className={`shadow-none border rounded-2xl transition-all duration-500 ${
        !active 
            ? 'opacity-25 grayscale' 
            : 'border-slate-200 dark:border-slate-800 bg-card hover:border-emerald-500/20'
    }`}>
        <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl flex items-center justify-center ${colorClass}`}>
                    {icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest font-mono">
                        {label}
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                        {value}
                    </span>
                </div>
            </div>
        </CardContent>
    </Card>
);
