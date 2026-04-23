import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../services/api';
import type { SensorData, PredictionData, SystemLog, WeatherForecast } from '../services/api';
import { CircularGauge } from '../components/CircularGauge';
import { WeatherCard } from '../components/WeatherCard';
import {
    Activity,
    AlertTriangle,
    Terminal,
    Droplets,
    Thermometer,
    CheckCircle2,
    Brain,
} from 'lucide-react';
import { LoadChart } from '../components/LoadChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useMqtt } from '../hooks/useMqtt';
import { QuickActions } from '../components/QuickActions';

const MOISTURE_SAFETY_THRESHOLD = 95;

export const Dashboard: React.FC = () => {
    const { connected, hardwareStatus, sensorData: mqttSensorData, systemMode: mqttSystemMode, publishPumpControl, publishSystemMode } = useMqtt();

    const [weather, setWeather] = useState<WeatherForecast | null>(null);
    const [prediction, setPrediction] = useState<PredictionData | null>(null);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [history, setHistory] = useState<SensorData[]>([]);
    const [backendOffline, setBackendOffline] = useState(false);

    // Provide default fallbacks for sensors. 
    const sensors = mqttSensorData || {
        soil_moisture: 0,
        temperature: 0,
        humidity: 0,
        timestamp: '--',
        pump_active: false
    };

    const isAuto = (mqttSystemMode || 'AUTO') === 'AUTO';
    const isHardwareOnline = hardwareStatus === 'ONLINE';

    // Ref to track if the pump was manually turned ON by the user.
    const pumpManuallyOn = useRef(false);

    const fetchApiData = useCallback(async () => {
        try {
            const [w, p, l, h] = await Promise.all([
                api.getWeatherForecast(),
                api.getPrediction(),
                api.getLogs(),
                api.getHistory(1)
            ]);
            setWeather(w);
            setPrediction(p);
            setLogs(l);
            setHistory(h.reverse());
            setBackendOffline(false);
        } catch (e) {
            console.error("Dashboard Fetch Error:", e);
            setBackendOffline(true);
        }
    }, []);

    useEffect(() => {
        fetchApiData();
        const interval = setInterval(fetchApiData, 10000);
        return () => clearInterval(interval);
    }, [fetchApiData]);

    // =================================================================
    // CRITICAL MOISTURE SAFETY OVERRIDES
    // =================================================================
    const MOISTURE_CRITICAL_LOW = 15;

    useEffect(() => {
        const moisture = sensors.soil_moisture ?? 50;

        // OVERRIDE 1: Critically DRY (< 15%) while in Manual
        if (!isAuto && moisture < MOISTURE_CRITICAL_LOW && !backendOffline) {
            pumpManuallyOn.current = false;
            publishSystemMode('AUTO');
            toast.error('🚨 Critical Override: Soil Too Dry', {
                description: `Moisture dropped to ${moisture.toFixed(0)}%. System switched to AUTO.`,
                duration: 10000,
            });
            return;
        }

        // OVERRIDE 2: Saturated (>= 95%) while pump is manually ON
        if (pumpManuallyOn.current && moisture >= MOISTURE_SAFETY_THRESHOLD) {
            pumpManuallyOn.current = false;
            publishPumpControl('OFF', 0);
            publishSystemMode('AUTO');
            toast.error('🚨 Critical Override: Soil Saturated', {
                description: `Moisture reached ${moisture.toFixed(0)}% (≥ ${MOISTURE_SAFETY_THRESHOLD}%). Pump stopped and system switched to AUTO.`,
                duration: 10000,
            });
        }
    }, [sensors.soil_moisture, isAuto, backendOffline, publishPumpControl, publishSystemMode]);

    // =================================================================
    // MODE TOGGLE (Auto ↔ Manual)
    // =================================================================
    const toggleMode = () => {
        const newMode = isAuto ? 'MANUAL' : 'AUTO';
        if (newMode === 'AUTO' && backendOffline) {
            toast.error('Cannot enable AI Autopilot while backend API is offline.');
            return;
        }

        publishSystemMode(newMode);

        if (newMode === 'AUTO' && pumpManuallyOn.current) {
            pumpManuallyOn.current = false;
            publishPumpControl('OFF', 0);
        }

        toast.info(`Mode: ${newMode}`);
    };

    // =================================================================
    // PUMP TOGGLE (Manual Mode Only)
    // =================================================================
    const handlePumpToggle = (checked: boolean) => {
        const moisture = sensors.soil_moisture ?? 0;

        if (checked) {
            if (moisture >= MOISTURE_SAFETY_THRESHOLD) {
                toast.error('Cannot Turn On Pump', {
                    description: `Soil is already saturated at ${moisture.toFixed(0)}%.`,
                });
                return;
            }

            if (isAuto) {
                publishSystemMode('MANUAL');
            }

            pumpManuallyOn.current = true;
            publishPumpControl('ON', 60);

            toast.success('Pump ON', {
                description: 'Pump is now running. Hardware failsafe limits runtime to 60s.',
            });
        } else {
            pumpManuallyOn.current = false;
            publishPumpControl('OFF', 0);

            toast.success('Pump OFF');
        }
    };

    const moisture = sensors.soil_moisture ?? 0;
    const isMoistureSaturated = moisture >= MOISTURE_SAFETY_THRESHOLD;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        Dashboard
                    </h1>
                    <p className="text-slate-900 dark:text-white text-sm font-medium">
                        Real-time plant monitoring and predictive watering optimization.
                    </p>
                </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Soil Moisture */}
                <Card className={`overflow-hidden shadow-none border transition-all ${!isHardwareOnline ? 'grayscale opacity-50 border-red-500/50' : 'border-slate-200 dark:border-slate-800'}`}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Soil Moisture</CardTitle>
                            <Droplets className="size-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pt-2 pb-6">
                        <CircularGauge
                            value={sensors.soil_moisture}
                            unit="%"
                            size={180}
                            thickness={14}
                        />
                        <div className="mt-4 flex items-center gap-2">
                            <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${sensors.soil_moisture < 30 ? 'bg-red-500/10 text-red-500' :
                                sensors.soil_moisture < 50 ? 'bg-orange-500/10 text-orange-500' :
                                    sensors.soil_moisture < 70 ? 'bg-yellow-500/10 text-yellow-500' :
                                        'bg-green-500/10 text-green-500'
                                }`}>
                                {sensors.soil_moisture < 30 ? 'Critical' :
                                    sensors.soil_moisture < 50 ? 'Low' :
                                        sensors.soil_moisture < 70 ? 'Moderate' : 'Optimal'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Ambient Conditions */}
                <Card className={`shadow-none border transition-all ${!isHardwareOnline ? 'grayscale opacity-50 border-red-500/50' : 'border-slate-200 dark:border-slate-800'}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Ambient Conditions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Thermometer className="size-5 text-orange-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase">Temperature</p>
                                    <p className="text-2xl font-black">{sensors.temperature.toFixed(1)}°C</p>
                                </div>
                            </div>
                            <Progress value={sensors.temperature * 2} className="w-24 h-1.5" />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity className="size-5 text-blue-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase">Humidity</p>
                                    <p className="text-2xl font-black">{sensors.humidity.toFixed(1)}%</p>
                                </div>
                            </div>
                            <Progress value={sensors.humidity} className="w-24 h-1.5" />
                        </div>
                    </CardContent>
                </Card>

                {/* System Health */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">System Health</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="space-y-3">
                            {[
                                {
                                    label: 'Message Broker',
                                    status: connected ? 'Connected' : 'Offline',
                                    icon: Activity,
                                    color: connected ? 'text-emerald-500' : 'text-red-500'
                                },
                                {
                                    label: 'Database / API',
                                    status: backendOffline ? 'Error' : 'Connected',
                                    icon: CheckCircle2,
                                    color: backendOffline ? 'text-red-500' : 'text-emerald-500'
                                },
                                {
                                    label: 'Sensor Hub',
                                    status: isHardwareOnline ? 'Online' : 'Offline',
                                    icon: Activity,
                                    color: isHardwareOnline ? 'text-emerald-500' : 'text-red-500'
                                },
                                {
                                    label: 'ML Engine',
                                    status: backendOffline ? 'Offline' : (prediction ? 'Predicting' : 'Idle'),
                                    icon: Brain,
                                    color: backendOffline ? 'text-red-500' : (prediction ? 'text-indigo-500' : 'text-slate-400')
                                },
                                {
                                    label: 'Pump System',
                                    status: sensors.pump_active ? 'Watering' : 'Standby',
                                    icon: Droplets,
                                    color: sensors.pump_active ? 'text-blue-500' : 'text-slate-400'
                                }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                    <div className="flex items-center gap-2">
                                        <item.icon className={`size-4 ${item.color}`} />
                                        <span className="text-xs font-bold text-slate-900 dark:text-neutral-300">{item.label}</span>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-tight ${item.color}`}>
                                        {item.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Weather Forecast + Quick Actions Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <WeatherCard weather={weather} />

                <QuickActions
                    isAuto={isAuto}
                    isPumpOn={sensors.pump_active}
                    isApiOffline={backendOffline}
                    isHardwareOnline={isHardwareOnline}
                    connected={connected}
                    moisture={moisture}
                    isMoistureSaturated={isMoistureSaturated}
                    onToggleMode={toggleMode}
                    onTogglePump={handlePumpToggle}
                />
            </div>

            {/* Live Sensor Feed Chart */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                {backendOffline && (
                    <div className="absolute inset-0 bg-transparent flex flex-col justify-end p-2 pointer-events-none">
                        <Badge variant="destructive" className="self-end text-[10px] uppercase font-bold tracking-wider opacity-80 z-10 w-fit">
                            History Tracking Offline
                        </Badge>
                    </div>
                )}
                <CardHeader className="flex flex-row items-baseline justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Live Telemetry</CardTitle>
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Soil Moisture Data Stream {backendOffline && '(STALE)'}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 overflow-hidden">
                    <div className="w-full h-[300px] min-h-[300px]">
                        <LoadChart
                            data={history
                                .filter(h => {
                                    const cleanTimestamp = h.timestamp.replace(/ GMT$/, '').replace(/Z$/, '');
                                    const ts = new Date(cleanTimestamp).getTime();
                                    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
                                    return ts >= thirtyMinutesAgo;
                                })
                                .map((h) => {
                                    const cleanTimestamp = h.timestamp.replace(/ GMT$/, '').replace(/Z$/, '');
                                    const dateObj = new Date(cleanTimestamp);

                                    return {
                                        time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                                        value: h.soil_moisture,
                                        timestamp: dateObj.getTime()
                                    };
                                }).sort((a, b) => a.timestamp - b.timestamp)}
                            color="#6366f1"
                            yDomain={[0, 100]}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* AI Prediction + Recent System Events Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Prediction Engine Card */}
                <Card className={`shadow-none border transition-colors ${backendOffline ? 'bg-amber-500/10 border-amber-500/20' : 'bg-card text-card-foreground border-slate-200 dark:border-slate-800'}`}>
                    <CardContent className="p-8">
                        <div className="flex flex-col gap-6">
                            <div className="flex-1 space-y-4">
                                <Badge className={`uppercase tracking-widest text-[10px] ${backendOffline ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20'}`}>
                                    {backendOffline ? 'AI Engine Disconnected' : 'AI Prediction Engine'}
                                </Badge>
                                
                                {backendOffline ? (
                                    <div className="py-2">
                                        <h2 className="text-xl font-black text-amber-700 dark:text-amber-500">Database API Offline</h2>
                                        <p className="text-sm mt-2 text-slate-500 dark:text-slate-400 font-medium">Machine learning inference is temporarily unavailable. System is running exclusively on raw hardware logic over MQTT. Manual interaction may be required.</p>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-3xl font-black leading-tight text-slate-900 dark:text-white">
                                            {prediction?.recommended_action === 'NOW' ?
                                                "🚨 Watering recommended within 24 hours" :
                                                prediction?.recommended_action === 'STOP' ?
                                                    "⛔ System Halted (Safety Interlock)" :
                                                    "✓ No watering needed for 24+ hours"}
                                        </h2>
                                        <p className="text-slate-500 dark:text-neutral-400 text-sm leading-relaxed">
                                            {prediction?.recommended_action === 'STALL' ?
                                                "Strategy: STALL. Environmental conditions (Rain/Wind/VPD) require a delay to save resources." :
                                                (prediction?.recommended_action === 'NOW' ?
                                                    "Strategy: DISPATCH. Soil moisture levels are trending below threshold. ML model suggests immediate hydration." :
                                                    (prediction?.recommended_action === 'STOP' ?
                                                        "Strategy: STOP. Hazardous condition detected (Rain/Saturation). Prevention mode active." :
                                                        "Strategy: MONITOR. System is currently optimal based on environmental factors and moisture levels."))}
                                        </p>
                                    </>
                                )}
                            </div>
                            
                            {!backendOffline && (
                                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Confidence</p>
                                    <Progress value={prediction?.ml_analysis.confidence || 94} className="flex-1 h-2 bg-slate-200 dark:bg-white/20" />
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{prediction?.ml_analysis.confidence || 94}%</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent System Events Card */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <Terminal className="size-4" /> Recent System Events
                        </CardTitle>
                        {backendOffline && <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10">STALE</Badge>}
                    </CardHeader>
                    <CardContent className="max-h-[300px] overflow-y-auto scrollbar-hide">
                        <div className="space-y-4">
                            {logs.slice(0, 8).map((log, i) => (
                                <div key={log.id} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className={`size-3 rounded-full mt-1 ${log.type === 'ACTION' ? 'bg-indigo-500' :
                                            log.type === 'ERROR' ? 'bg-red-500' : 'bg-slate-300'
                                            }`} />
                                        {i < (logs.slice(0, 8).length - 1) && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-800 my-1" />}
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-xs font-bold text-slate-700 dark:text-neutral-300">{log.message}</p>
                                        <p className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 mt-0.5">
                                            {isNaN(new Date(log.timestamp).getTime()) ? log.timestamp : new Date(log.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <p className="text-sm text-slate-500 font-medium text-center pt-8">No recent events logged.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
