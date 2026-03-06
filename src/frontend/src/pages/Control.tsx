import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
    Settings2,
    Gauge,
    Timer,
    Lock,
    Info,
    Wifi,
    WifiOff,
    Loader2,
    CheckCircle2,
    XCircle,
    RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

// ── Types ──────────────────────────────────────────────────────
interface SensorSnapshot {
    moisture: number;
    temperature: number;
    humidity: number;
    timestamp: string;
    pumpActive: boolean;
    connected: boolean;
}

// ── Component ──────────────────────────────────────────────────
export const Control: React.FC = () => {
    // Notification
    const [notification, setNotification] = useState<{ title: string; description: string; variant: 'default' | 'destructive' | 'success' } | null>(null);

    // System
    const [systemMode, setSystemMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    // Sensor monitor
    const [sensor, setSensor] = useState<SensorSnapshot>({
        moisture: 0, temperature: 0, humidity: 0,
        timestamp: '--', pumpActive: false, connected: false,
    });

    // Operations
    const [moistureThreshold, setMoistureThreshold] = useState(30);
    const [maxDuration, setMaxDuration] = useState(45);

    // Emergency
    const [emergencyStop, setEmergencyStop] = useState(false);

    // ── Notifications ────────────────────────────────────────
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const toast = (title: string, description: string, variant: 'default' | 'destructive' | 'success' = 'default') => {
        setNotification({ title, description, variant });
    };

    // ── Loading helpers ──────────────────────────────────────
    const setLoadingKey = (key: string, value: boolean) =>
        setLoading(prev => ({ ...prev, [key]: value }));

    // ── Initial fetch ────────────────────────────────────────
    const fetchState = useCallback(async () => {
        try {
            const [stateRes, sensorRes] = await Promise.all([
                api.getSystemState(),
                api.getLatestSensors(),
            ]);
            if (stateRes?.mode) setSystemMode(stateRes.mode);
            if (sensorRes) {
                setSensor({
                    moisture: sensorRes.soil_moisture ?? 0,
                    temperature: sensorRes.temperature ?? 0,
                    humidity: sensorRes.humidity ?? 0,
                    timestamp: sensorRes.timestamp ?? '--',
                    pumpActive: false,
                    connected: true,
                });
            }
        } catch {
            setSensor(prev => ({ ...prev, connected: false }));
        }
    }, []);

    useEffect(() => {
        fetchState();
        const interval = setInterval(fetchState, 10_000);
        return () => clearInterval(interval);
    }, [fetchState]);

    // ── Handlers ─────────────────────────────────────────────
    const handleModeToggle = async (checked: boolean) => {
        const newMode = checked ? 'MANUAL' : 'AUTO';
        setLoadingKey('mode', true);
        try {
            await api.toggleMode(newMode);
            setSystemMode(newMode);
            toast(
                `Switched to ${newMode}`,
                newMode === 'AUTO'
                    ? 'AI is now controlling irrigation. Manual controls locked.'
                    : 'Manual controls enabled. AI disabled.',
                newMode === 'AUTO' ? 'success' : 'default',
            );
        } catch {
            toast('Mode switch failed', 'Check your network connection.', 'destructive');
        } finally {
            setLoadingKey('mode', false);
        }
    };

    const handlePump = async (action: 'ON' | 'OFF') => {
        setLoadingKey('pump', true);
        try {
            await api.controlPump(action, maxDuration);
            setSensor(prev => ({ ...prev, pumpActive: action === 'ON' }));
            toast(
                `Pump ${action === 'ON' ? 'Activated' : 'Stopped'}`,
                action === 'ON' ? `Running for ${maxDuration}s.` : 'Pump halted.',
                action === 'ON' ? 'success' : 'default',
            );
        } catch {
            toast('Pump command failed', 'Could not reach the backend.', 'destructive');
        } finally {
            setLoadingKey('pump', false);
        }
    };

    const handleSaveSettings = async () => {
        setLoadingKey('settings', true);
        try {
            await api.saveSettings({ moisture_threshold: moistureThreshold, max_duration: maxDuration });
            toast('Settings Saved', 'Thresholds updated successfully.', 'success');
        } catch {
            toast('Save failed', 'Could not save settings.', 'destructive');
        } finally {
            setLoadingKey('settings', false);
        }
    };

    const handleEmergencyStop = async () => {
        setEmergencyStop(true);
        setLoadingKey('pump', true);
        try {
            await api.controlPump('OFF', 0);
            await api.toggleMode('MANUAL');
            setSystemMode('MANUAL');
            setSensor(prev => ({ ...prev, pumpActive: false }));
        } catch { /* best effort */ }
        setLoadingKey('pump', false);
        toast('EMERGENCY STOP', 'All outputs halted. System forced to Manual.', 'destructive');
    };

    const isLocked = systemMode === 'AUTO';

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">

            {/* ── Toast ─────────────────────────────────────── */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border backdrop-blur-md animate-in slide-in-from-top-2 fade-in duration-300 max-w-sm ${notification.variant === 'destructive'
                        ? 'bg-red-500/90 text-white border-red-600'
                        : notification.variant === 'success'
                            ? 'bg-emerald-500/90 text-white border-emerald-600'
                            : 'bg-white/90 dark:bg-secondary/90 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                    }`}>
                    <div className="flex items-center gap-3">
                        {notification.variant === 'destructive' ? <AlertTriangle className="size-5 shrink-0" />
                            : notification.variant === 'success' ? <CheckCircle2 className="size-5 shrink-0" />
                                : <Info className="size-5 text-blue-500 shrink-0" />}
                        <div>
                            <h4 className="font-bold text-sm">{notification.title}</h4>
                            <p className="text-xs opacity-90">{notification.description}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        Control Center
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 gap-1 font-bold">
                            <Settings2 className="size-3" />
                            {systemMode}
                        </Badge>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Monitor sensors, control the pump, and configure thresholds.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {emergencyStop && (
                        <div className="flex items-center gap-2 animate-pulse text-red-600 font-bold bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-full text-sm">
                            <AlertTriangle className="size-4" />
                            ESTOP ACTIVE
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchState}
                        className="gap-1.5"
                    >
                        <RefreshCw className="size-3.5" /> Refresh
                    </Button>
                </div>
            </div>

            {/* ── Mode Switch ───────────────────────────────── */}
            <Card className={`shadow-sm transition-colors duration-500 ${systemMode === 'MANUAL' ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-card'}`}>
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-1">System Mode</h2>
                        <p className={`text-sm ${systemMode === 'MANUAL' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {systemMode === 'AUTO'
                                ? 'AI Predictive Model is fully autonomous. Manual controls locked.'
                                : 'Manual controls enabled. AI safeties bypassed.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`font-bold tracking-widest text-xs ${systemMode === 'AUTO' ? 'text-emerald-500' : 'text-slate-500'}`}>AUTO</span>
                        <Switch
                            checked={systemMode === 'MANUAL'}
                            onCheckedChange={handleModeToggle}
                            disabled={loading['mode']}
                            className="scale-125 data-[state=checked]:bg-orange-500"
                        />
                        <span className={`font-bold tracking-widest text-xs ${systemMode === 'MANUAL' ? 'text-orange-500' : 'text-slate-500'}`}>MANUAL</span>
                    </div>
                </CardContent>
            </Card>

            {/* ── Monitor Cards ─────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MonitorCard
                    icon={<Droplets className="size-5" />}
                    label="Soil Moisture"
                    value={`${sensor.moisture.toFixed(1)}%`}
                    color="text-blue-500"
                    bgColor="bg-blue-500/10"
                />
                <MonitorCard
                    icon={<Thermometer className="size-5" />}
                    label="Temperature"
                    value={`${sensor.temperature.toFixed(1)}°C`}
                    color="text-orange-500"
                    bgColor="bg-orange-500/10"
                />
                <MonitorCard
                    icon={<Wind className="size-5" />}
                    label="Humidity"
                    value={`${sensor.humidity.toFixed(1)}%`}
                    color="text-teal-500"
                    bgColor="bg-teal-500/10"
                />
                <MonitorCard
                    icon={sensor.connected ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}
                    label="ESP32 Status"
                    value={sensor.connected ? 'Connected' : 'Offline'}
                    color={sensor.connected ? 'text-emerald-500' : 'text-red-500'}
                    bgColor={sensor.connected ? 'bg-emerald-500/10' : 'bg-red-500/10'}
                />
            </div>

            {/* ── Operations Card ───────────────────────────── */}
            <Card className="shadow-sm dark:bg-card relative overflow-hidden">
                {/* Lock overlay */}
                {isLocked && (
                    <div className="absolute inset-0 bg-slate-100/50 dark:bg-black/60 z-10 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-neutral-900 text-white px-5 py-2.5 rounded-full flex items-center gap-2 shadow-xl font-bold text-sm">
                            <Lock className="size-4" /> Locked — Switch to Manual
                        </div>
                    </div>
                )}

                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="size-5 text-indigo-500" />
                        Operations
                    </CardTitle>
                    <CardDescription>Pump control and threshold configuration for Auto Mode</CardDescription>
                </CardHeader>

                <CardContent className="space-y-8">
                    {/* ── Pump Control ────────────────────── */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                            <Activity className="size-4 text-indigo-500" />
                            Pump Control
                        </label>
                        <div className="flex items-center gap-3">
                            <div className={`flex-1 flex items-center gap-3 p-4 rounded-xl border ${sensor.pumpActive
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                    : 'bg-slate-50 dark:bg-card border-border'
                                }`}>
                                <div className={`p-2.5 rounded-full ${sensor.pumpActive
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                        : 'bg-slate-200 dark:bg-secondary text-slate-400'
                                    }`}>
                                    <Activity className="size-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Main Pump</h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {sensor.pumpActive ? 'Running' : 'Idle'} · Relay #1 (GPIO 17)
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        disabled={loading['pump'] || sensor.pumpActive}
                                        onClick={() => handlePump('ON')}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                                    >
                                        {loading['pump'] ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
                                        ON
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={loading['pump'] || !sensor.pumpActive}
                                        onClick={() => handlePump('OFF')}
                                        className="font-bold gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                    >
                                        {loading['pump'] ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                                        OFF
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-border" />

                    {/* ── Thresholds ──────────────────────── */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                                <Gauge className="size-4 text-emerald-500" /> Min. Moisture Trigger
                            </label>
                            <span className="font-mono font-bold bg-slate-100 dark:bg-secondary px-2 py-1 rounded text-sm">{moistureThreshold}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="100" step="1"
                            value={moistureThreshold}
                            onChange={(e) => setMoistureThreshold(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-500"
                        />
                        <p className="text-[10px] text-slate-500">
                            System triggers watering when soil moisture falls below this percentage.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                                <Timer className="size-4 text-orange-500" /> Max. Cycle Duration
                            </label>
                            <span className="font-mono font-bold bg-slate-100 dark:bg-secondary px-2 py-1 rounded text-sm">{maxDuration}s</span>
                        </div>
                        <input
                            type="range"
                            min="5" max="120" step="5"
                            value={maxDuration}
                            onChange={(e) => setMaxDuration(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-500"
                        />
                        <p className="text-[10px] text-slate-500">
                            Hard safety limit for maximum continuous pump operation.
                        </p>
                    </div>
                </CardContent>

                <CardFooter>
                    <Button
                        className="w-full bg-neutral-900 dark:bg-white text-white dark:text-slate-900 font-bold gap-2"
                        onClick={handleSaveSettings}
                        disabled={loading['settings']}
                    >
                        {loading['settings'] ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Save Configuration
                    </Button>
                </CardFooter>
            </Card>

            {/* ── Emergency Stop ─────────────────────────────── */}
            <Card className="border-red-500/20 bg-red-50/50 dark:bg-red-900/10 shadow-none">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full text-red-600">
                            <AlertTriangle className="size-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-red-700 dark:text-red-400 uppercase tracking-tight">Emergency Zone</h3>
                            <p className="text-red-600/70 dark:text-red-400/70 text-sm font-medium">Immediately halts all outputs and forces Manual mode.</p>
                        </div>
                    </div>
                    <Button
                        variant="destructive"
                        size="lg"
                        className="h-14 px-8 text-lg font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-105 transition-transform"
                        onClick={handleEmergencyStop}
                    >
                        <Power className="size-6 mr-2" /> Stop System
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

// ── Monitor Card Sub-Component ─────────────────────────────────
interface MonitorCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    bgColor: string;
}

const MonitorCard: React.FC<MonitorCardProps> = ({ icon, label, value, color, bgColor }) => (
    <Card className="shadow-sm dark:bg-card">
        <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${bgColor} ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p className={`text-lg font-black ${color}`}>{value}</p>
            </div>
        </CardContent>
    </Card>
);
