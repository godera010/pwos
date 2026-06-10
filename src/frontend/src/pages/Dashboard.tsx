import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../services/api';
import type { SensorData, PredictionData, SystemLog, WeatherForecast, SystemSettings } from '../services/api';
import { CircularGauge } from '../components/CircularGauge';
import { WeatherCard } from '../components/WeatherCard';
import type { Crop } from '../services/api';
import {
    Activity,
    AlertTriangle,
    Terminal,
    Droplets,
    Thermometer,
    CheckCircle2,
    Brain,
    Shield,
    WifiOff,
    ServerOff,
    CloudOff,
    Sprout,
    ChevronDown
} from 'lucide-react';
import { LoadChart } from '../components/LoadChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
import { useMqtt } from '../hooks/useMqtt';
import { QuickActions } from '../components/QuickActions';
import { IntelligenceCard } from '../components/IntelligenceCard';

const MOISTURE_SAFETY_THRESHOLD = 95;

const getRelativeTime = (timestamp: string): string => {
    const cleanTimestamp = timestamp.replace(/ GMT$/, '').replace(/Z$/, '');
    const date = new Date(cleanTimestamp);
    if (isNaN(date.getTime())) return timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
};

export const Dashboard: React.FC = () => {
    const { connected, hardwareStatus, sensorData: mqttSensorData, systemMode: mqttSystemMode, publishPumpControl, publishSystemMode } = useMqtt();

    const [weather, setWeather] = useState<WeatherForecast | null>(null);
    const [prediction, setPrediction] = useState<PredictionData | null>(null);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [history, setHistory] = useState<SensorData[]>([]);
    const [backendOffline, setBackendOffline] = useState(false);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [crops, setCrops] = useState<Crop[]>([]);
    const [activeCrop, setActiveCrop] = useState<Crop | null>(null);
    const [switchingCrop, setSwitchingCrop] = useState<string | null>(null);
    
    const sensors = mqttSensorData || {
        soil_moisture: 0,
        temperature: 0,
        humidity: 0,
        timestamp: '--',
        pump_active: false
    };

    const getVpdValue = () => {
        if (sensors.vpd !== undefined && sensors.vpd > 0) return sensors.vpd;
        if (prediction?.ml_analysis?.features_used?.vpd !== undefined && prediction.ml_analysis.features_used.vpd > 0) return prediction.ml_analysis.features_used.vpd;
        
        const T = sensors.temperature;
        const RH = sensors.humidity;
        if (T <= 0 || RH <= 0) return 0.0;
        const e_s = 0.61078 * Math.exp((17.27 * T) / (T + 237.3));
        const e_a = e_s * (RH / 100);
        return Math.max(0, e_s - e_a);
    };
    
    const vpd = getVpdValue();

    const getVpdStress = (val: number) => {
        if (val < 0.4) return { label: 'Saturated (Fungal Risk)', badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' };
        if (val <= 0.8) return { label: 'Low Transpiration', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
        if (val <= 1.2) return { label: 'Optimal Transpiration', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]' };
        if (val <= 2.0) return { label: 'Moderate Evap Stress', badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' };
        return { label: 'Extreme Vapor Stress', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse' };
    };
    const vpdStress = getVpdStress(vpd);

    const isAuto = (mqttSystemMode || 'AUTO') === 'AUTO';
    const isHardwareOnline = hardwareStatus === 'ONLINE';
    const pumpManuallyOn = useRef(false);
    const prevBackendOffline = useRef(backendOffline);
    const isFirstBackend = useRef(true);

    useEffect(() => {
        if (isFirstBackend.current) {
            isFirstBackend.current = false;
            prevBackendOffline.current = backendOffline;
            return;
        }

        if (backendOffline !== prevBackendOffline.current) {
            if (backendOffline) {
                toast.warning('Backend API Offline', {
                    description: 'Predictive intelligence and history logs are unavailable. Operating in local telemetry mode.',
                    duration: 8000
                });
            } else if (!backendOffline && prevBackendOffline.current === true) {
                toast.success('Backend API Connected', {
                    description: 'Predictive models and operational history logs are fully synchronized.',
                    duration: 4000
                });
            }
            prevBackendOffline.current = backendOffline;
        }
    }, [backendOffline]);

    const fetchApiData = useCallback(async () => {
        try {
            const [w, p, h, s, cList, cActive] = await Promise.all([
                api.getWeatherForecast(),
                api.getPrediction(),
                api.getHistory(1),
                api.getSettings(),
                api.getCrops(),
                api.getActiveCrop()
            ]);
            setWeather(w);
            setPrediction(p);
            setHistory(h.reverse());
            setSettings(s);
            setCrops(cList);
            setActiveCrop(cActive);
            setBackendOffline(false);
        } catch (e) {
            console.error("Dashboard Fetch Error:", e);
            setBackendOffline(true);
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            const l = await api.getLogs();
            setLogs(l);
            setBackendOffline(false);
        } catch (e) {
            console.error("Logs Fetch Error:", e);
        }
    }, []);

    useEffect(() => {
        fetchApiData();
        const mainInterval = setInterval(fetchApiData, 10000);
        
        fetchLogs();
        const logsInterval = setInterval(fetchLogs, 3000);
        
        return () => {
            clearInterval(mainInterval);
            clearInterval(logsInterval);
        };
    }, [fetchApiData, fetchLogs]);

    const MOISTURE_CRITICAL_LOW = activeCrop?.wilting_point_threshold ?? 15;
    const MOISTURE_SATURATION_HIGH = (activeCrop?.target_moisture ?? 60) + 15;

    useEffect(() => {
        if (!isHardwareOnline) return;
        const moisture = Number(sensors.soil_moisture) || 0;

        if (!isAuto && moisture < MOISTURE_CRITICAL_LOW) {
            pumpManuallyOn.current = false;
            publishSystemMode('AUTO');
            toast.error('Critical Override: Soil Too Dry', {
                description: `Soil moisture dropped to ${moisture.toFixed(0)}%. System automatically switched to AUTO mode to protect ${activeCrop?.name.toUpperCase() || 'crop'} roots (critical limit is ${MOISTURE_CRITICAL_LOW}%).`,
                duration: 10000,
            });
            return;
        }

        if (pumpManuallyOn.current && moisture >= MOISTURE_SATURATION_HIGH) {
            pumpManuallyOn.current = false;
            publishPumpControl('OFF', 0);
            publishSystemMode('AUTO');
            toast.error('Critical Override: Soil Saturated', {
                description: `Soil moisture reached saturation limit of ${moisture.toFixed(0)}% (threshold is ${MOISTURE_SATURATION_HIGH}%). Pump deactivated and system switched to AUTO mode.`,
                duration: 10000,
            });
        }
    }, [sensors.soil_moisture, isAuto, backendOffline, publishPumpControl, publishSystemMode, MOISTURE_CRITICAL_LOW, MOISTURE_SATURATION_HIGH, settings, isHardwareOnline, activeCrop?.name]);

    const toggleMode = () => {
        const newMode = isAuto ? 'MANUAL' : 'AUTO';
        if (newMode === 'AUTO' && backendOffline) {
            toast.error('Autopilot Activation Blocked', {
                description: 'Cannot enable AI Autopilot while backend API service is offline.',
                duration: 6000,
            });
            return;
        }

        publishSystemMode(newMode);

        if (newMode === 'AUTO' && pumpManuallyOn.current) {
            pumpManuallyOn.current = false;
            publishPumpControl('OFF', 0);
        }

        toast.info('System Mode Changed', {
            description: `System operation mode set to ${newMode === 'AUTO' ? 'AI Autopilot' : 'Manual Control'}.`,
            duration: 4000,
        });
    };

    const handlePumpToggle = (checked: boolean) => {
        const moisture = sensors.soil_moisture ?? 0;

        if (checked) {
            if (moisture >= MOISTURE_SAFETY_THRESHOLD) {
                toast.error('Pump Activation Blocked', {
                    description: `Soil moisture is already saturated at ${moisture.toFixed(0)}% (limit: ${MOISTURE_SAFETY_THRESHOLD}%).`,
                    duration: 6000,
                });
                return;
            }

            if (isAuto) {
                publishSystemMode('MANUAL');
            }

            pumpManuallyOn.current = true;
            publishPumpControl('ON', 60);

            toast.success('Pump Activated Successfully', {
                description: 'Water pump is now running. Hardware failsafe limits manual runtime to 60 seconds.',
                duration: 4000,
            });
        } else {
            pumpManuallyOn.current = false;
            publishPumpControl('OFF', 0);

            toast.success('Pump Deactivated Successfully', {
                description: 'Water pump has been turned off.',
                duration: 4000,
            });
        }
    };

    const moisture = sensors.soil_moisture ?? 0;
    const isMoistureSaturated = moisture >= MOISTURE_SAFETY_THRESHOLD;

    const deduplicatedLogs = logs.reduce<SystemLog[]>((acc, log) => {
        if (acc.length === 0 || acc[acc.length - 1].message !== log.message) {
            acc.push(log);
        }
        return acc;
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12 px-4 md:px-0">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        Watering <span className="text-emerald-500 dark:text-primary">Dashboard</span>
                    </h1>
                    <p className="text-muted-foreground font-mono mt-1 uppercase text-[10px] tracking-wider">
                        Real-time plant monitoring and predictive watering optimization.
                    </p>
                </div>

                {/* System Status Badge */}
                {(() => {
                    let statusLabel = 'Monitoring';
                    let statusColor = 'text-emerald-600 dark:text-emerald-500';
                    let statusBg = 'bg-emerald-500/10 border-emerald-500/20';
                    let StatusIcon = Shield;

                    if (!connected) {
                        statusLabel = 'Broker Disconnected';
                        statusColor = 'text-red-500';
                        statusBg = 'bg-red-500/10 border-red-500/20';
                        StatusIcon = WifiOff;
                    } else if (!isHardwareOnline) {
                        statusLabel = 'ESP32 Disconnected';
                        statusColor = 'text-red-500';
                        statusBg = 'bg-red-500/10 border-red-500/20';
                        StatusIcon = AlertTriangle;
                    } else if (backendOffline) {
                        statusLabel = 'API Unreachable';
                        statusColor = 'text-amber-500';
                        statusBg = 'bg-amber-500/10 border-amber-500/20';
                        StatusIcon = ServerOff;
                    } else if (!weather) {
                        statusLabel = 'Weather Unavailable';
                        statusColor = 'text-amber-500';
                        statusBg = 'bg-amber-500/10 border-amber-500/20';
                        StatusIcon = CloudOff;
                    }

                    return (
                        <div className={`flex items-center gap-1.5 py-1 px-3.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${statusColor} ${statusBg}`}>
                            <StatusIcon className="size-3.5" />
                            <span>{statusLabel}</span>
                        </div>
                    );
                })()}
            </div>

            {/* Active Crop Context Manager */}
            {activeCrop && (
                <div className="relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 card-hover-effect animate-fade-in-up stagger-1">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                            <Sprout className="size-6 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                                Active Crop: {activeCrop.name.toUpperCase()}
                                <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Target {activeCrop.target_moisture}%
                                </span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Quick selector dropdown */}
                        <div className="relative">
                            <select
                                value={activeCrop.id}
                                disabled={switchingCrop !== null}
                                onChange={async (e) => {
                                    const nextCropId = e.target.value;
                                    setSwitchingCrop(nextCropId);
                                    try {
                                        const res = await api.setActiveCrop(Number(nextCropId));
                                        if (res.status === 'success') {
                                            setActiveCrop(res.active_crop);
                                            toast.success(`Synchronized Active Crop to ${res.active_crop.name.toUpperCase()}`, {
                                                description: `Autopilot controller limits dynamically updated.`
                                            });
                                            fetchApiData();
                                        }
                                    } catch {
                                        toast.error("Failed to switch crop settings");
                                    } finally {
                                        setSwitchingCrop(null);
                                    }
                                }}
                                className="bg-secondary/35 border border-border focus:border-emerald-500/50 focus:outline-none rounded-xl px-4 py-2 text-xs font-bold tracking-wide text-foreground transition-all cursor-pointer hover:bg-secondary/60 appearance-none pr-8 h-10"
                            >
                                {crops.map(crop => (
                                    <option key={crop.id} value={crop.id} className="bg-slate-900 text-white">
                                        {crop.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Soil Moisture */}
                <Card className={`overflow-hidden shadow-none border transition-all rounded-2xl card-hover-effect animate-fade-in-up stagger-2 ${!isHardwareOnline ? 'grayscale opacity-50 border-red-500/50' : 'border-slate-200 dark:border-slate-800 bg-card'}`}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Soil Moisture</CardTitle>
                            <Droplets className="size-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pt-2 pb-6">
                        {(() => {
                            const displayMoisture = Number(sensors.soil_moisture) || 0;
                            return (
                                <>
                                    <CircularGauge
                                        value={displayMoisture}
                                        unit="%"
                                        size={180}
                                        thickness={14}
                                    />
                                    <div className="mt-4 text-center max-w-xs">
                                        <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${
                                            displayMoisture < MOISTURE_CRITICAL_LOW
                                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                : displayMoisture < (settings?.moisture_threshold ?? 35)
                                                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                                                : displayMoisture < MOISTURE_SATURATION_HIGH
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 animate-pulse'
                                        }`}>
                                            {displayMoisture < MOISTURE_CRITICAL_LOW ? 'Critical Dry' :
                                             displayMoisture < (settings?.moisture_threshold ?? 35) ? 'Low Moisture' :
                                             displayMoisture < MOISTURE_SATURATION_HIGH ? 'Optimal' : 'Saturated Limit'}
                                        </span>
                                        <p className={`text-[10px] mt-3 font-semibold tracking-wide leading-relaxed ${
                                            displayMoisture < MOISTURE_CRITICAL_LOW
                                                ? 'text-rose-500 animate-pulse'
                                                : displayMoisture < (settings?.moisture_threshold ?? 35)
                                                ? 'text-orange-500'
                                                : displayMoisture < MOISTURE_SATURATION_HIGH
                                                ? 'text-emerald-500'
                                                : 'text-cyan-500'
                                        }`}>
                                            {displayMoisture < MOISTURE_CRITICAL_LOW ? `Soil critically dry (<${MOISTURE_CRITICAL_LOW}%). Failsafe auto-irrigation engaged.` :
                                             displayMoisture < (settings?.moisture_threshold ?? 35) ? `Moisture low. Autopilot scheduled to trigger soon.` :
                                             displayMoisture < MOISTURE_SATURATION_HIGH ? `Moisture optimal for ${activeCrop?.name || 'crop'} growth.` :
                                             `Soil saturated (≥${MOISTURE_SATURATION_HIGH}%). Pump locked out to prevent root rot.`}
                                        </p>
                                    </div>
                                </>
                            );
                        })()}
                    </CardContent>
                </Card>

                {/* Ambient Conditions */}
                <Card className={`shadow-none border transition-all rounded-2xl card-hover-effect animate-fade-in-up stagger-3 ${!isHardwareOnline ? 'grayscale opacity-50 border-red-500/50' : 'border-slate-200 dark:border-slate-800 bg-card'}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Ambient Conditions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
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
                                <Activity className="size-5 text-blue-500 animate-pulse" />
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase">Humidity</p>
                                    <p className="text-2xl font-black">{sensors.humidity.toFixed(1)}%</p>
                                </div>
                            </div>
                            <Progress value={sensors.humidity} className="w-24 h-1.5" />
                        </div>

                        <div className="flex items-center justify-between border-t border-border/40 pt-4">
                            <div className="flex items-center gap-3">
                                <Activity className="size-5 text-indigo-500 animate-pulse" />
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase">VPD (Crop Stress)</p>
                                    <p className="text-2xl font-black">{vpd.toFixed(2)} kPa</p>
                                </div>
                            </div>
                            <Badge variant="outline" className={`text-[8px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full ${vpdStress.badge}`}>
                                {vpdStress.label}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* System Health */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl card-hover-effect animate-fade-in-up stagger-4">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="size-4 text-emerald-500" /> System Health
                        </CardTitle>
                        <div className="flex items-center gap-1.5">
                            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">Diagnostics Live</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="grid grid-cols-1 gap-2.5">
                            {[
                                {
                                    label: 'Message Broker',
                                    status: connected ? 'CONNECTED' : 'OFFLINE',
                                    icon: Activity,
                                    color: connected ? 'text-emerald-500' : 'text-red-500',
                                    bg: connected ? 'bg-emerald-500/5' : 'bg-red-500/5',
                                    pulse: connected ? 'bg-emerald-500 animate-pulse-glow' : 'bg-red-500'
                                },
                                {
                                    label: 'Database / API',
                                    status: backendOffline ? 'DISCONNECTED' : 'CONNECTED',
                                    icon: CheckCircle2,
                                    color: backendOffline ? 'text-red-500' : 'text-emerald-500',
                                    bg: backendOffline ? 'bg-red-500/5' : 'bg-emerald-500/5',
                                    pulse: backendOffline ? 'bg-red-500' : 'bg-emerald-500 animate-pulse-glow'
                                },
                                {
                                    label: 'Sensor Hub',
                                    status: isHardwareOnline ? 'ONLINE' : 'OFFLINE',
                                    icon: Activity,
                                    color: isHardwareOnline ? 'text-emerald-500' : 'text-red-500',
                                    bg: isHardwareOnline ? 'bg-emerald-500/5' : 'bg-red-500/5',
                                    pulse: isHardwareOnline ? 'bg-emerald-500 animate-pulse-glow' : 'bg-red-500'
                                },
                                {
                                    label: 'ML Engine',
                                    status: backendOffline ? 'OFFLINE' : (prediction ? 'ACTIVE' : 'IDLE'),
                                    icon: Brain,
                                    color: backendOffline ? 'text-red-500' : (prediction ? 'text-indigo-500' : 'text-slate-400'),
                                    bg: backendOffline ? 'bg-red-500/5' : (prediction ? 'bg-indigo-500/5' : 'bg-slate-500/5'),
                                    pulse: backendOffline ? 'bg-red-500' : (prediction ? 'bg-indigo-500 animate-pulse-glow' : 'bg-slate-400')
                                },
                                {
                                    label: 'Pump System',
                                    status: sensors.pump_active ? 'WATERING' : 'STANDBY',
                                    icon: Droplets,
                                    color: sensors.pump_active ? 'text-blue-500 animate-wiggle' : 'text-slate-400',
                                    bg: sensors.pump_active ? 'bg-blue-500/5' : 'bg-slate-500/5',
                                    pulse: sensors.pump_active ? 'bg-blue-500 animate-pulse-glow' : 'bg-slate-400'
                                }
                            ].map((item, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-secondary/40 transition-all duration-300 ${item.bg}`}>
                                    <div className="flex items-center gap-2.5">
                                        <item.icon className={`size-4 ${item.color}`} />
                                        <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black tracking-wider ${item.color}`}>
                                            {item.status}
                                        </span>
                                        <div className={`size-2 rounded-full ${item.pulse}`} />
                                    </div>
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
            <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl relative overflow-hidden card-hover-effect animate-fade-in-up stagger-5">
                {backendOffline ? (
                    <div className="absolute inset-0 bg-transparent flex flex-col justify-end p-2 pointer-events-none">
                        <Badge variant="destructive" className="self-end text-[10px] uppercase font-bold tracking-wider opacity-80 z-10 w-fit">
                            History Tracking Offline
                        </Badge>
                    </div>
                ) : !isHardwareOnline ? (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
                        <Badge variant="secondary" className="border-red-500/50 text-red-500 text-[10px] uppercase font-bold tracking-wider">
                            Sensor Stream Offline
                        </Badge>
                    </div>
                ) : null}
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
                            color="hsl(var(--chart-2))"
                            yDomain={[0, 100]}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* AI Prediction + Recent System Events Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Main Premium AI Prediction Card (Custom IntelligenceCard) ── */}
                <IntelligenceCard
                    soilMoisture={Number(sensors.soil_moisture) || 0}
                    vpd={vpd}
                    confidence={prediction?.ml_analysis?.confidence ?? 0}
                    subtitleText={backendOffline ? 'Backend API unreachable — predictions unavailable' : (prediction?.ml_analysis?.reason || 'Awaiting prediction data...')}
                    lastUpdateText={logs[0] ? getRelativeTime(logs[0].timestamp) : '--'}
                    recommendedAction={prediction?.recommended_action}
                    systemStatus={prediction?.ml_analysis?.system_status}
                    isOffline={backendOffline}
                    moistureHistory={history.length >= 2 ? history.slice(-9).map(h => h.soil_moisture) : undefined}
                    vpdHistory={history.length >= 2 ? history.slice(-9).map(h => {
                        if (h.vpd !== undefined && h.vpd > 0) return h.vpd;
                        const T = h.temperature;
                        const RH = h.humidity;
                        const e_s = 0.61078 * Math.exp((17.27 * T) / (T + 237.3));
                        const e_a = e_s * (RH / 100);
                        const calculatedVpd = e_s - e_a;
                        return calculatedVpd > 0 ? calculatedVpd : 0;
                    }) : undefined}
                />

                {/* Recent System Events Card */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl flex flex-col bg-card text-card-foreground font-mono">
                    <CardHeader className="border-b border-border bg-card/80 backdrop-blur-md px-6 py-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="size-2.5 rounded-full bg-rose-500" />
                                <div className="size-2.5 rounded-full bg-amber-500" />
                                <div className="size-2.5 rounded-full bg-emerald-500" />
                            </div>
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2 pl-2 border-l border-border">
                                <Terminal className="size-3.5 text-indigo-400" /> p-wos://system-events
                            </span>
                        </div>
                        {backendOffline ? (
                            <Badge variant="outline" className="text-[9px] font-black tracking-widest text-red-500 border-red-500/30 bg-red-500/10">STALE</Badge>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-500 tracking-wider">LIVE FEED</span>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 p-6 max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                        <div className="space-y-3.5">
                            {deduplicatedLogs.slice(0, 10).map((log) => {
                                const bulletColor = log.type === 'ERROR'
                                    ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)] animate-pulse'
                                    : log.type === 'ACTION'
                                        ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.7)]'
                                        : 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.7)]';
                                
                                const typeTag = log.type === 'ERROR'
                                    ? '[ERR]'
                                    : log.type === 'ACTION'
                                        ? '[ACT]'
                                        : '[INF]';

                                const typeColor = log.type === 'ERROR'
                                    ? 'text-rose-500 font-bold'
                                    : log.type === 'ACTION'
                                        ? 'text-violet-500 font-bold'
                                        : 'text-sky-500 font-bold';

                                return (
                                    <div key={log.id} className="flex items-start justify-between gap-4 p-2 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border transition-all duration-300 group">
                                        <div className="flex items-start gap-3">
                                            <div className={`size-2 rounded-full mt-1.5 flex-shrink-0 ${bulletColor}`} />
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] ${typeColor} tracking-wide`}>{typeTag}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                        {new Date(log.timestamp.replace(/ GMT$/, '').replace(/Z$/, '')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-foreground font-medium leading-relaxed tracking-wide transition-colors">{log.message}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground flex-shrink-0 pt-0.5 font-mono">
                                            {getRelativeTime(log.timestamp)}
                                        </span>
                                    </div>
                                );
                            })}
                            {deduplicatedLogs.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Terminal className="size-8 mb-2 opacity-30" />
                                    <p className="text-xs font-semibold">No recent system events logged.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
