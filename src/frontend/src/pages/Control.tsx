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
    Wifi,
    WifiOff,
    RefreshCw,
    Gauge,
    Zap,
    X
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

export const Control: React.FC = () => {
    const [systemMode, setSystemMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
    const [loading, setLoading] = useState(false);
    const [pumpActive, setPumpActive] = useState(false);
    const [emergencyStop, setEmergencyStop] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);

    const [sensors, setSensors] = useState({
        soil_moisture: 0,
        temperature: 0,
        humidity: 0,
        timestamp: '--',
        device_id: null
    });

    const fetchState = useCallback(async () => {
        try {
            const [stateRes, sensorRes] = await Promise.all([
                api.getSystemState(),
                api.getLatestSensors(),
            ]);
            if (stateRes?.mode) setSystemMode(stateRes.mode);
            if (sensorRes) {
                setSensors(sensorRes);
                setPumpActive(stateRes.pump_active || false);
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

    const handleModeToggle = async () => {
        const newMode = systemMode === 'AUTO' ? 'MANUAL' : 'AUTO';
        setLoading(true);
        try {
            await api.toggleMode(newMode);
            setSystemMode(newMode);
            toast.success(`Mode: ${newMode}`, {
                description: newMode === 'AUTO' ? 'AI controlling irrigation.' : 'Manual mode enabled.',
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
            await api.controlPump(action, action === 'ON' ? 60 : undefined);
            setPumpActive(action === 'ON');
            toast.success(`Pump ${action === 'ON' ? 'Activated' : 'Stopped'}`);
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
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        Hardware Control
                        <Badge variant="outline" className={`${systemMode === 'AUTO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'} border-current gap-1 font-bold`}>
                            {systemMode}
                        </Badge>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Monitor sensors, control pump, and manage hardware status.
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
                            sensor="DHT22"
                        />
                        <SensorCard
                            icon={<Wind className="size-5 text-teal-500" />}
                            label="Humidity"
                            value={`${sensors.humidity.toFixed(1)}%`}
                            status="normal"
                            sensor="DHT22"
                        />
                        <SensorCard
                            icon={<Zap className="size-5 text-yellow-500" />}
                            label="Relay Module"
                            value={isOnline ? 'Active' : 'Offline'}
                            status={isOnline ? 'normal' : 'critical'}
                            sensor="4-Channel"
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
                                    {systemMode === 'AUTO' ? 'AI controls irrigation automatically' : 'Manual pump control enabled'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400">AUTO</span>
                            <Switch checked={systemMode === 'MANUAL'} onCheckedChange={handleModeToggle} disabled={loading} />
                            <span className="text-xs font-bold text-slate-400">MANUAL</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Pump Control */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                    {isLocked && (
                        <div className="absolute inset-0 bg-slate-100/80 dark:bg-black/80 z-10 backdrop-blur-sm flex items-center justify-center">
                            <div className="bg-neutral-900 text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold">
                                <Lock className="size-4" /> Switch to Manual to control pump
                            </div>
                        </div>
                    )}
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Activity className={`size-10 ${pumpActive ? 'text-emerald-500 trigger-active' : 'text-slate-400'}`} />
                            <div>
                                <p className="text-xl font-black">{pumpActive ? 'Pump Running' : 'Pump Idle'}</p>
                                <p className="text-sm text-slate-500">Relay #1 · GPIO 17</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                size="lg"
                                onClick={() => handlePump('ON')}
                                disabled={loading || pumpActive || isLocked}
                                className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2"
                            >
                                <Power className="size-5" /> ON
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => handlePump('OFF')}
                                disabled={loading || !pumpActive}
                                className="font-bold gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                            >
                                <Power className="size-5" /> OFF
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

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
