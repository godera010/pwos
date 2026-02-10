import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Power,
    Zap,
    Droplets,
    Activity,
    AlertTriangle,
    Settings2,
    Gauge,
    Timer,
    Lock,
    Info
} from 'lucide-react';
import { api } from '../services/api';

export const Control: React.FC = () => {
    const [notification, setNotification] = useState<{ title: string, description: string, variant: 'default' | 'destructive' } | null>(null);
    const [systemMode, setSystemMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
    const [pumpActive, setPumpActive] = useState(false);
    const [valveOpen, setValveOpen] = useState(false);
    const [moistureThreshold, setMoistureThreshold] = useState([30]);
    const [maxDuration, setMaxDuration] = useState([45]);
    const [emergencyStop, setEmergencyStop] = useState(false);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const showNotification = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
        setNotification({ title, description, variant });
    };

    useEffect(() => {
        // Poll for system state logic would go here
    }, []);

    const handleModeToggle = async (checked: boolean) => {
        const newMode = checked ? 'MANUAL' : 'AUTO';
        try {
            await api.toggleMode(newMode);
            setSystemMode(newMode);
            showNotification(
                `System Switched to ${newMode}`,
                newMode === 'AUTO' ? "AI is now in control of irrigation." : "Manual controls enabled. AI disabled.",
                newMode === 'AUTO' ? "default" : "destructive",
            );
        } catch (error) {
            showNotification(
                "Failed to switch mode",
                "Check network connection.",
                "destructive",
            );
        }
    };

    const handleEmergencyStop = () => {
        setEmergencyStop(true);
        setSystemMode('MANUAL');
        setPumpActive(false);
        setValveOpen(false);
        showNotification(
            "EMERGENCY STOP ACTIVATED",
            "All outputs halted. System forced to Manual.",
            "destructive"
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            {/* Notification Toast Replacement */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border backdrop-blur-md animate-in slide-in-from-top-2 fade-in duration-300 ${notification.variant === 'destructive'
                        ? 'bg-red-500/90 text-white border-red-600'
                        : 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                    }`}>
                    <div className="flex items-center gap-3">
                        {notification.variant === 'destructive' ? <AlertTriangle className="size-5" /> : <Info className="size-5 text-blue-500" />}
                        <div>
                            <h4 className="font-bold text-sm">{notification.title}</h4>
                            <p className="text-xs opacity-90">{notification.description}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        Control Center
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 gap-1 font-bold">
                            <Settings2 className="size-3" />
                            Hardware Config
                        </Badge>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Manual overrides, threshold configuration, and safety interlocks.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {emergencyStop && (
                        <div className="flex items-center gap-2 animate-pulse text-red-600 font-bold bg-red-100 px-4 py-2 rounded-full">
                            <AlertTriangle className="size-5" />
                            ESTOP ACTIVE
                        </div>
                    )}
                </div>
            </div>

            {/* Main Mode Switch */}
            <Card className={`border-none shadow-sm transition-colors duration-500 ${systemMode === 'MANUAL' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900/50'}`}>
                <CardContent className="p-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-2">System Operation Mode</h2>
                        <p className={`text-sm ${systemMode === 'MANUAL' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {systemMode === 'AUTO'
                                ? "AI Predictive Model is fully autonomous. Manual controls are locked."
                                : "User has full manual control. AI safeties are bypassed."}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`font-bold tracking-widest text-sm ${systemMode === 'AUTO' ? 'text-emerald-500' : 'text-slate-500'}`}>AUTO</span>
                        <Switch
                            checked={systemMode === 'MANUAL'}
                            onCheckedChange={handleModeToggle}
                            className="scale-150 data-[state=checked]:bg-orange-500"
                        />
                        <span className={`font-bold tracking-widest text-sm ${systemMode === 'MANUAL' ? 'text-orange-500' : 'text-slate-500'}`}>MANUAL</span>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hardware Overrides */}
                <Card className="border-none shadow-sm dark:bg-slate-900/50 relative overflow-hidden">
                    {systemMode === 'AUTO' && (
                        <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-950/60 z-10 backdrop-blur-[2px] flex items-center justify-center">
                            <div className="bg-slate-900 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-xl font-bold">
                                <Lock className="size-4" /> Controls Locked by AI
                            </div>
                        </div>
                    )}
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="size-5 text-indigo-500" />
                            Hardware Overrides
                        </CardTitle>
                        <CardDescription>Direct relay control for field devices</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${pumpActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                                    <Activity className="size-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Main Pump</h3>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Relay #1 (GPIO 17)</p>
                                </div>
                            </div>
                            <Switch checked={pumpActive} onCheckedChange={setPumpActive} />
                        </div>

                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${valveOpen ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                                    <Droplets className="size-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Zone 1 Valve</h3>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Relay #2 (GPIO 27)</p>
                                </div>
                            </div>
                            <Switch checked={valveOpen} onCheckedChange={setValveOpen} />
                        </div>
                    </CardContent>
                </Card>

                {/* Configuration Thresholds */}
                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="size-5 text-indigo-500" />
                            Operational Parameters
                        </CardTitle>
                        <CardDescription>Adjust trigger thresholds for Auto Mode</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Gauge className="size-4 text-emerald-500" /> Min. Moisture Trigger
                                </label>
                                <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{moistureThreshold}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={moistureThreshold[0]}
                                onChange={(e) => setMoistureThreshold([parseInt(e.target.value)])}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-500"
                            />
                            <p className="text-[10px] text-slate-500">
                                System will trigger watering when soil moisture falls below this specific percentage.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Timer className="size-4 text-orange-500" /> Max. Cycle Duration
                                </label>
                                <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{maxDuration} min</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="120"
                                step="5"
                                value={maxDuration[0]}
                                onChange={(e) => setMaxDuration([parseInt(e.target.value)])}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-500"
                            />
                            <p className="text-[10px] text-slate-500">
                                Hard safety limit for maximum continuous pump operation to prevent flooding.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold">
                            Save Configuration
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Emergency Controls */}
            <Card className="border-red-500/20 bg-red-50/50 dark:bg-red-900/10 shadow-none">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full text-red-600">
                            <AlertTriangle className="size-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-red-700 dark:text-red-400 uppercase tracking-tight">Emergency Zone</h3>
                            <p className="text-red-600/70 dark:text-red-400/70 text-sm font-medium">Immediate halt of all system operations. Physical reset required.</p>
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
