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
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

export const Control: React.FC = () => {
    const [systemMode, setSystemMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
    const [loading, setLoading] = useState(false);
    const [pumpActive, setPumpActive] = useState(false);
    const [emergencyStop, setEmergencyStop] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    const [sensors, setSensors] = useState<{
        soil_moisture: number;
        temperature: number;
        humidity: number;
        timestamp: string;
        device_id: string | null;
    }>({
        soil_moisture: 0,
        temperature: 0,
        humidity: 0,
        timestamp: '--',
        device_id: null
    });

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
            const [stateRes, sensorRes, settingsRes] = await Promise.all([
                api.getSystemState(),
                api.getLatestSensors(),
                api.getSettings(),
            ]);
            if (stateRes?.mode) setSystemMode(stateRes.mode);
            if (sensorRes) {
                setSensors({ ...sensorRes, device_id: sensorRes.device_id ?? null });
                setPumpActive(stateRes.pump_active || false);
            }
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
        } catch (error) {
            console.error('Fetch error:', error);
        }
    }, []);

    useEffect(() => {
        fetchState();
        const interval = setInterval(fetchState, 5000);
        return () => clearInterval(interval);
    }, [fetchState]);

    // Auto-expand settings panel when switching to MANUAL
    useEffect(() => {
        if (systemMode === 'MANUAL') {
            setShowSettings(true);
        }
    }, [systemMode]);

    const handleModeToggle = async () => {
        const newMode = systemMode === 'AUTO' ? 'MANUAL' : 'AUTO';
        setLoading(true);
        try {
            await api.toggleMode(newMode);
            setSystemMode(newMode);
            toast.success(`Mode: ${newMode}`, {
                description: newMode === 'AUTO' ? 'AI controlling irrigation.' : 'Manual mode enabled. Configure thresholds below.',
            });
        } catch {
            toast.error('Mode switch failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePump = async (action: 'ON' | 'OFF') => {
        setLoading(true);
        try {
            await api.controlPump(action, action === 'ON' ? settings.maxDuration : undefined);
            setPumpActive(action === 'ON');
            toast.success(`Pump ${action === 'ON' ? 'Activated' : 'Stopped'}`, {
                description: action === 'ON' ? `Running for ${settings.maxDuration}s` : undefined,
            });
        } catch {
            toast.error('Pump command failed');
        } finally {
            setLoading(false);
        }
    };

    const confirmEmergencyStop = () => {
        setShowEmergencyModal(true);
    };

    const handleEmergencyStop = async () => {
        setShowEmergencyModal(false);
        setEmergencyStop(true);
        setLoading(true);
        try {
            await api.controlPump('OFF', 0);
            await api.toggleMode('MANUAL');
            setSystemMode('MANUAL');
            setPumpActive(false);
            toast.error('EMERGENCY STOP', {
                description: 'All outputs halted. System forced to Manual.',
            });
        } catch {
            toast.error('Emergency stop failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
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
                description: 'Configuration updated and applied.',
            });
        } catch {
            toast.error('Save Failed');
        } finally {
            setSavingSettings(false);
        }
    };

    const isOnline = sensors.device_id !== null;
    const isLocked = systemMode === 'AUTO';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Emergency Stop Confirmation Modal */}
            {showEmergencyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md mx-4 border-red-500 shadow-xl shadow-red-500/20">
                        <div className="bg-red-500 text-white p-4 flex items-center justify-between rounded-t-lg">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="size-6" />
                                <h2 className="font-black text-lg">EMERGENCY STOP</h2>
                            </div>
                            <button onClick={() => setShowEmergencyModal(false)} className="hover:bg-red-600 p-1 rounded">
                                <X className="size-5" />
                            </button>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <p className="text-sm">
                                This will immediately halt all outputs and force the system to Manual mode.
                            </p>
                            <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">This action will:</p>
                                <ul className="text-xs text-red-600 dark:text-red-300 space-y-1 list-disc list-inside">
                                    <li>Turn OFF the pump immediately</li>
                                    <li>Disable AI autopilot</li>
                                    <li>Switch to Manual mode</li>
                                </ul>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowEmergencyModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleEmergencyStop}
                                    className="flex-1 font-bold"
                                >
                                    CONFIRM STOP
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">
                        Hardware Control
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Monitor sensors, control pump, and configure system parameters.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {emergencyStop && (
                        <Badge variant="destructive" className="animate-pulse gap-1">
                            <AlertTriangle className="size-3" /> ESTOP
                        </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchState} className="gap-1.5">
                        <RefreshCw className="size-3.5" /> Refresh
                    </Button>
                </div>
            </div>

            {/* Sensor Readings */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="size-4 text-indigo-500" />
                        <h2 className="text-sm font-bold uppercase tracking-wider">Sensor Readings</h2>
                        <Badge variant="outline" className="text-[10px] font-bold ml-auto">
                            {sensors.timestamp}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <SensorCard
                            icon={<Droplets className="size-5 text-blue-500" />}
                            label="Soil Moisture"
                            value={`${sensors.soil_moisture.toFixed(1)}%`}
                            status={sensors.soil_moisture < 30 ? 'critical' : sensors.soil_moisture < 50 ? 'low' : 'normal'}
                            sensor="Capacitive v1.2"
                        />
                        <SensorCard
                            icon={<Thermometer className="size-5 text-orange-500" />}
                            label="Temperature"
                            value={`${sensors.temperature.toFixed(1)}°C`}
                            status="normal"
                            sensor="DHT11"
                        />
                        <SensorCard
                            icon={<Wind className="size-5 text-teal-500" />}
                            label="Humidity"
                            value={`${sensors.humidity.toFixed(1)}%`}
                            status="normal"
                            sensor="DHT11"
                        />
                        <SensorCard
                            icon={<Zap className="size-5 text-yellow-500" />}
                            label="Relay Module"
                            value={isOnline ? 'Active' : 'Offline'}
                            status={isOnline ? 'normal' : 'critical'}
                            sensor="5V Relay"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Mode Toggle & Pump Control - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mode Toggle */}
                <Card className={`border transition-colors ${systemMode === 'MANUAL' ? 'border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20' : 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20'}`}>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {systemMode === 'AUTO' ? (
                                <Gauge className="size-8 text-emerald-500 trigger-success" />
                            ) : (
                                <Lock className="size-8 text-orange-500 trigger-active" />
                            )}
                            <div>
                                <p className="font-bold">
                                    {systemMode === 'AUTO' ? 'Auto Mode' : 'Manual Mode'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {systemMode === 'AUTO' ? 'AI controls irrigation automatically' : 'Manual pump control & settings enabled'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400">AUTO</span>
                            <Switch checked={systemMode === 'MANUAL'} onCheckedChange={handleModeToggle} disabled={loading} className={systemMode === 'MANUAL' ? 'data-[state=checked]:bg-orange-500' : 'data-[state=unchecked]:bg-emerald-500'} />
                            <span className="text-xs font-bold text-slate-400">MANUAL</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Pump Control */}
                <Card className={`shadow-none border relative overflow-hidden transition-colors ${pumpActive ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
                    {isLocked && (
                        <div className="absolute inset-0 bg-slate-100/80 dark:bg-black/80 z-10 backdrop-blur-sm flex items-center justify-center">
                            <div className="bg-neutral-900 text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold">
                                <Lock className="size-4" /> Switch to Manual to control pump
                            </div>
                        </div>
                    )}
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${pumpActive ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                <Droplets className={`size-6 ${pumpActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                            </div>
                            <div>
                                <p className="text-xl font-black">{pumpActive ? 'Pump Running' : 'Pump Idle'}</p>
                                <p className="text-sm text-slate-500">Relay · GPIO 27 · {settings.maxDuration}s cycle</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold ${pumpActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {pumpActive ? 'ON' : 'OFF'}
                            </span>
                            <Switch
                                checked={pumpActive}
                                onCheckedChange={(checked) => handlePump(checked ? 'ON' : 'OFF')}
                                disabled={loading || isLocked}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ============================================================ */}
            {/* MANUAL MODE: Configuration Panel                             */}
            {/* ============================================================ */}
            {systemMode === 'MANUAL' && (
                <Card className="shadow-none border border-orange-200 dark:border-orange-800 overflow-hidden animate-in slide-in-from-top-4 fade-in duration-500">

                    {/* Collapsible Header */}
                    <button onClick={() => setShowSettings(!showSettings)} className="w-full text-left">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                                    <Settings2 className="size-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="font-bold">System Configuration</p>
                                    <p className="text-xs text-slate-500">Thresholds, limits, and location settings</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-bold text-orange-600 border-orange-300 dark:border-orange-700">
                                    MANUAL
                                </Badge>
                                {showSettings ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
                            </div>
                        </CardContent>
                    </button>

                    {showSettings && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                            <div className="border-t border-orange-200 dark:border-orange-800" />
                            <CardContent className="p-5 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Soil Moisture Thresholds */}
                                    <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Droplets className="size-4 text-blue-500" />
                                            <h3 className="text-sm font-bold">Soil Moisture Thresholds</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Min (Trigger)</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number" min="0" max="100"
                                                        value={settings.moistureMin}
                                                        onChange={e => setSettings(s => ({ ...s, moistureMin: Number(e.target.value) }))}
                                                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center"
                                                    />
                                                    <span className="text-sm text-slate-400 font-bold">%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max (Target)</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number" min="0" max="100"
                                                        value={settings.moistureMax}
                                                        onChange={e => setSettings(s => ({ ...s, moistureMax: Number(e.target.value) }))}
                                                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center"
                                                    />
                                                    <span className="text-sm text-slate-400 font-bold">%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Waters below {settings.moistureMin}%, stops at {settings.moistureMax}%.
                                        </p>
                                    </div>

                                    {/* Temperature Limits */}
                                    <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Thermometer className="size-4 text-orange-500" />
                                            <h3 className="text-sm font-bold">Temperature Limits</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Min °C</label>
                                                <input
                                                    type="number"
                                                    value={settings.tempMin}
                                                    onChange={e => setSettings(s => ({ ...s, tempMin: Number(e.target.value) }))}
                                                    className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max °C</label>
                                                <input
                                                    type="number"
                                                    value={settings.tempMax}
                                                    onChange={e => setSettings(s => ({ ...s, tempMax: Number(e.target.value) }))}
                                                    className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            High temps stall watering to minimize evaporation.
                                        </p>
                                    </div>

                                    {/* Pump Configuration */}
                                    <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Timer className="size-4 text-emerald-500" />
                                            <h3 className="text-sm font-bold">Pump Cycle Duration</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500">5s</span>
                                                <span className="font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-lg text-sm">
                                                    {settings.maxDuration}s
                                                </span>
                                                <span className="text-xs text-slate-500">120s</span>
                                            </div>
                                            <input
                                                type="range" min="5" max="120" step="5"
                                                value={settings.maxDuration}
                                                onChange={e => setSettings(s => ({ ...s, maxDuration: Number(e.target.value) }))}
                                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Safety limit for continuous pump operation.
                                        </p>
                                    </div>


                                </div>

                                {/* Save Footer */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <p className="text-xs text-slate-500">Changes are applied after saving</p>
                                    <Button
                                        onClick={handleSaveSettings}
                                        disabled={savingSettings}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2"
                                    >
                                        <Save className="size-4" />
                                        {savingSettings ? 'Saving...' : 'Save Settings'}
                                    </Button>
                                </div>
                            </CardContent>
                        </div>
                    )}
                </Card>
            )}

            {/* Emergency Stop */}
            <Card className="border-red-500/30 bg-red-50/50 dark:bg-red-950/20 shadow-none">
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="size-6 text-red-500" />
                        <div>
                            <p className="font-bold">Emergency Stop</p>
                            <p className="text-xs text-slate-500">Immediately halts all outputs</p>
                        </div>
                    </div>
                    <Button
                        variant="destructive"
                        size="lg"
                        onClick={confirmEmergencyStop}
                        className="font-black gap-2"
                    >
                        <Power className="size-5" /> STOP
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

const SensorCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    status: 'normal' | 'low' | 'critical';
    sensor: string;
}> = ({ icon, label, value, status, sensor }) => {
    const statusColors = {
        normal: 'text-emerald-500',
        low: 'text-orange-500',
        critical: 'text-red-500'
    };
    const statusDot = {
        normal: 'bg-emerald-500',
        low: 'bg-orange-500',
        critical: 'bg-red-500'
    };

    return (
        <Card className="shadow-none border border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className={statusColors[status]}>
                        {icon}
                    </div>
                    <div className="flex-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{sensor}</span>
                    </div>
                    <span className={`size-2 rounded-full ${statusDot[status]}`} />
                </div>
                <span className={`text-2xl font-black ${statusColors[status]}`}>{value}</span>
            </CardContent>
        </Card>
    );
};
