import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../services/api';
import type { SensorData, PredictionData, SystemLog, WeatherForecast, SystemSettings } from '../services/api';
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
    Shield,
    WifiOff,
    ServerOff,
    CloudOff,
    Sprout,
    Compass,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { LoadChart } from '../components/LoadChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
import { useMqtt } from '../hooks/useMqtt';
import { QuickActions } from '../components/QuickActions';

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
    const [switchingCrop, setSwitchingCrop] = useState<string | null>(null);
    const [isXaiOpen, setIsXaiOpen] = useState(false);
    
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
            } else {
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
            const [w, p, h, s] = await Promise.all([
                api.getWeatherForecast(),
                api.getPrediction(),
                api.getHistory(1),
                api.getSettings()
            ]);
            setWeather(w);
            setPrediction(p);
            setHistory(h.reverse());
            setSettings(s);
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

    const MOISTURE_CRITICAL_LOW = settings?.crop_critical_moisture ?? 15;
    const MOISTURE_SATURATION_HIGH = settings?.crop_high_threshold ?? MOISTURE_SAFETY_THRESHOLD;

    useEffect(() => {
        const moisture = sensors.soil_moisture ?? 50;

        if (!isAuto && moisture < MOISTURE_CRITICAL_LOW) {
            pumpManuallyOn.current = false;
            publishSystemMode('AUTO');
            toast.error('Critical Override: Soil Too Dry', {
                description: `Soil moisture dropped to ${moisture.toFixed(0)}%. System automatically switched to AUTO mode to protect ${settings?.active_crop?.toUpperCase() || 'crop'} roots (critical limit is ${MOISTURE_CRITICAL_LOW}%).`,
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
    }, [sensors.soil_moisture, isAuto, backendOffline, publishPumpControl, publishSystemMode, MOISTURE_CRITICAL_LOW, MOISTURE_SATURATION_HIGH, settings]);

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
    const action = prediction?.recommended_action || 'MONITOR';

    const themeMap: Record<string, {
        cardBg: string;
        border: string;
        badge: string;
        title: string;
        titleText: string;
        descText: string;
        iconColor: string;
        iconBg: string;
    }> = {
        NOW: {
            cardBg: 'bg-gradient-to-br from-indigo-950/10 via-violet-950/5 to-transparent dark:from-indigo-950/30 dark:via-violet-950/10 dark:to-black/30',
            border: 'border-indigo-500/20 dark:border-indigo-500/35 shadow-[0_0_30px_rgba(99,102,241,0.04)]',
            badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20',
            title: 'Watering Recommended Now',
            titleText: 'text-indigo-600 dark:text-indigo-400',
            descText: 'text-indigo-700/80 dark:text-indigo-300/80',
            iconColor: 'text-indigo-500',
            iconBg: 'bg-indigo-500/10 border-indigo-500/20'
        },
        STALL: {
            cardBg: 'bg-gradient-to-br from-amber-950/10 via-orange-950/5 to-transparent dark:from-amber-950/30 dark:via-orange-950/10 dark:to-black/30',
            border: 'border-amber-500/20 dark:border-amber-500/35 shadow-[0_0_30px_rgba(245,158,11,0.04)]',
            badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20',
            title: 'Irrigation Stalled (Delay Active)',
            titleText: 'text-amber-600 dark:text-amber-500',
            descText: 'text-amber-700/80 dark:text-amber-300/80',
            iconColor: 'text-amber-500',
            iconBg: 'bg-amber-500/10 border-amber-500/20'
        },
        STOP: {
            cardBg: 'bg-gradient-to-br from-rose-950/10 via-pink-950/5 to-transparent dark:from-rose-950/30 dark:via-rose-950/10 dark:to-black/30',
            border: 'border-rose-500/20 dark:border-rose-500/35 shadow-[0_0_30px_rgba(244,63,94,0.04)]',
            badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20',
            title: 'Autopilot Halted (Safety Override)',
            titleText: 'text-rose-600 dark:text-rose-400',
            descText: 'text-rose-700/80 dark:text-rose-300/80',
            iconColor: 'text-rose-500',
            iconBg: 'bg-rose-500/10 border-rose-500/20'
        },
        MONITOR: {
            cardBg: 'bg-gradient-to-br from-emerald-950/10 via-teal-950/5 to-transparent dark:from-emerald-950/30 dark:via-teal-950/10 dark:to-black/30',
            border: 'border-emerald-500/20 dark:border-emerald-500/35 shadow-[0_0_30px_rgba(16,185,129,0.04)]',
            badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
            title: 'System Optimal & Monitoring',
            titleText: 'text-emerald-600 dark:text-emerald-400',
            descText: 'text-emerald-700/80 dark:text-emerald-300/80',
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-500/10 border-emerald-500/20'
        }
    };

    const activeTheme = themeMap[action] || themeMap.MONITOR;

    const activeReason = prediction?.ml_analysis?.reason || 
        (action === 'STALL' ? "Environmental conditions require a delay to preserve soil resources." :
         action === 'NOW' ? "Soil moisture trending low. ML model suggests hydration cycle." :
         action === 'STOP' ? "Failsafe condition engaged. Pump operation disabled." :
         "Soil moisture stable and optimal based on live evapotranspiration.");

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
            {settings && (
                <div className="relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                            <Sprout className="size-6 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                                Active Crop: {settings.active_crop.toUpperCase()}
                                <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Target {settings.crop_target_moisture ?? 60}%
                                </span>
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Autopilot safety overrides will trigger below <span className="text-red-400 font-bold">{settings.crop_critical_moisture ?? 15}%</span> or above <span className="text-indigo-400 font-bold">{settings.crop_high_threshold ?? 85}%</span> moisture.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Climate bounding badges */}
                        <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 px-3 py-2 rounded-xl text-sky-400 font-bold text-xs">
                            <Compass className="size-3.5" />
                            <span>Region: {settings.active_region.toUpperCase()}</span>
                        </div>
                        
                        {/* Quick selector dropdown */}
                        <div className="relative">
                            <select
                                value={settings.active_crop}
                                disabled={switchingCrop !== null}
                                onChange={async (e) => {
                                    const nextCrop = e.target.value;
                                    setSwitchingCrop(nextCrop);
                                    try {
                                        const res = await api.saveSettings({ active_crop: nextCrop });
                                        if (res.status === 'success') {
                                            setSettings(res.settings);
                                            toast.success(`Synchronized Active Crop to ${nextCrop.toUpperCase()}`, {
                                                description: `Autopilot controller limits dynamically updated.`
                                            });
                                            fetchApiData();
                                        }
                                    } catch (ex) {
                                        toast.error("Failed to switch crop settings");
                                    } finally {
                                        setSwitchingCrop(null);
                                    }
                                }}
                                className="bg-secondary/35 border border-border focus:border-emerald-500/50 focus:outline-none rounded-xl px-4 py-2 text-xs font-bold tracking-wide text-foreground transition-all cursor-pointer hover:bg-secondary/60 appearance-none pr-8 h-10"
                            >
                                <option value="maize" className="bg-slate-900 text-white">Maize (Zea mays)</option>
                                <option value="potato" className="bg-slate-900 text-white">Potato (Solanum tuberosum)</option>
                                <option value="tomato" className="bg-slate-900 text-white">Tomato (Solanum lycopersicum)</option>
                                <option value="onion" className="bg-slate-900 text-white">Onion (Allium cepa)</option>
                                <option value="sorghum" className="bg-slate-900 text-white">Sorghum (Sorghum bicolor)</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Soil Moisture */}
                <Card className={`overflow-hidden shadow-none border transition-all rounded-2xl ${!isHardwareOnline ? 'grayscale opacity-50 border-red-500/50' : 'border-slate-200 dark:border-slate-800 bg-card'}`}>
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
                        <div className="mt-4 text-center max-w-xs">
                            <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${
                                sensors.soil_moisture < MOISTURE_CRITICAL_LOW
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                    : sensors.soil_moisture < (settings?.moisture_threshold ?? 35)
                                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                                    : sensors.soil_moisture < MOISTURE_SATURATION_HIGH
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 animate-pulse'
                            }`}>
                                {sensors.soil_moisture < MOISTURE_CRITICAL_LOW ? 'Critical Dry' :
                                 sensors.soil_moisture < (settings?.moisture_threshold ?? 35) ? 'Low Moisture' :
                                 sensors.soil_moisture < MOISTURE_SATURATION_HIGH ? 'Optimal' : 'Saturated Limit'}
                            </span>
                            <p className={`text-[10px] mt-3 font-semibold tracking-wide leading-relaxed ${
                                sensors.soil_moisture < MOISTURE_CRITICAL_LOW
                                    ? 'text-rose-500 animate-pulse'
                                    : sensors.soil_moisture < (settings?.moisture_threshold ?? 35)
                                    ? 'text-orange-500'
                                    : sensors.soil_moisture < MOISTURE_SATURATION_HIGH
                                    ? 'text-emerald-500'
                                    : 'text-cyan-500'
                            }`}>
                                {sensors.soil_moisture < MOISTURE_CRITICAL_LOW ? `Soil critically dry (<${MOISTURE_CRITICAL_LOW}%). Failsafe auto-irrigation engaged.` :
                                 sensors.soil_moisture < (settings?.moisture_threshold ?? 35) ? `Moisture low. Autopilot scheduled to trigger soon.` :
                                 sensors.soil_moisture < MOISTURE_SATURATION_HIGH ? `Moisture optimal for ${settings?.active_crop || 'crop'} growth.` :
                                 `Soil saturated (≥${MOISTURE_SATURATION_HIGH}%). Pump locked out to prevent root rot.`}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Ambient Conditions */}
                <Card className={`shadow-none border transition-all rounded-2xl ${!isHardwareOnline ? 'grayscale opacity-50 border-red-500/50' : 'border-slate-200 dark:border-slate-800 bg-card'}`}>
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
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl">
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
            <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl relative overflow-hidden">
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
                            color="hsl(var(--chart-2))"
                            yDomain={[0, 100]}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* AI Prediction + Recent System Events Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Prediction Engine Card */}
                <Card className={`shadow-none border transition-all duration-500 rounded-2xl ${backendOffline ? 'bg-amber-500/10 border-amber-500/20' : `bg-card text-card-foreground ${activeTheme.cardBg} ${activeTheme.border}`}`}>
                    <CardContent className="p-6 md:p-8">
                        <div className="flex flex-col gap-6">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Badge className={`uppercase tracking-widest text-[9px] font-black px-2.5 py-0.5 rounded-full ${backendOffline ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' : activeTheme.badge}`}>
                                        {backendOffline ? 'AI Engine Disconnected' : 'AI Prediction Engine'}
                                    </Badge>
                                    {!backendOffline && (
                                        <div className="flex items-center gap-1">
                                            <div className="size-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                            <span className="text-[9px] font-black uppercase text-indigo-500/80 tracking-wider">Live Inference</span>
                                        </div>
                                    )}
                                </div>
                                
                                {backendOffline ? (
                                    <div className="py-2">
                                        <h2 className="text-xl font-black text-amber-700 dark:text-amber-500">Database API Offline</h2>
                                        <p className="text-sm mt-2 text-slate-500 dark:text-slate-400 font-medium">Machine learning inference is temporarily unavailable. System is running exclusively on raw hardware logic over MQTT. Manual interaction may be required.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <h2 className={`text-2xl md:text-3xl font-black leading-tight tracking-tight ${activeTheme.titleText}`}>
                                            {activeTheme.title}
                                        </h2>
                                        <p className="text-slate-600 dark:text-neutral-300 text-xs md:text-sm font-semibold leading-relaxed p-4 rounded-xl bg-secondary/35 border border-border">
                                            {activeReason}
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            {!backendOffline && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-secondary/35 border border-border rounded-xl">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-neutral-400">Confidence</span>
                                            <span className="text-2xl font-black text-slate-800 dark:text-white">{prediction?.ml_analysis.confidence || 94}%</span>
                                        </div>
                                        <Progress value={prediction?.ml_analysis.confidence || 94} className="flex-1 h-2.5" />
                                    </div>

                                    {/* Collapsible Diagnostics Drawer */}
                                    <div className="pt-2 border-t border-border/40">
                                        <button
                                            onClick={() => setIsXaiOpen(!isXaiOpen)}
                                            className="flex items-center justify-between w-full px-4 py-3 bg-secondary/30 hover:bg-secondary/60 border border-border rounded-xl text-xs font-bold transition-all duration-300 group text-slate-700 dark:text-neutral-300 animate-in"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Brain className={`size-4 ${activeTheme.iconColor} animate-pulse`} />
                                                Explainable ML Telemetry & Features
                                            </span>
                                            {isXaiOpen ? <ChevronUp className="size-4 text-muted-foreground group-hover:text-foreground" /> : <ChevronDown className="size-4 text-muted-foreground group-hover:text-foreground" />}
                                        </button>

                                        {isXaiOpen && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 p-4 rounded-xl bg-secondary/20 dark:bg-secondary/40 border border-border text-xs text-foreground backdrop-blur-md animate-in slide-in-from-top duration-300">
                                                {(() => {
                                                    const features = prediction?.ml_analysis?.features_used || {};
                                                    return (
                                                        <>
                                                            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-secondary/30 border border-border">
                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider">Moisture Rate</span>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    {features.moisture_change_rate !== undefined ? (
                                                                        <>
                                                                            {features.moisture_change_rate > 0 ? (
                                                                                <TrendingUp className="size-4 text-emerald-500" />
                                                                            ) : (
                                                                                <TrendingDown className="size-4 text-indigo-500" />
                                                                            )}
                                                                            <span className="font-mono font-bold text-slate-800 dark:text-neutral-200 text-sm">
                                                                                {features.moisture_change_rate.toFixed(2)} %/h
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="font-mono text-slate-400">N/A</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-secondary/30 border border-border">
                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider">Midday Peak Guard</span>
                                                                <div className="flex items-center gap-1.5 mt-0.5 font-bold text-slate-800 dark:text-neutral-200">
                                                                    {features.is_hot_hours !== undefined ? (
                                                                        <span className={features.is_hot_hours === 1 ? 'text-amber-500 font-bold' : 'text-slate-400'}>
                                                                            {features.is_hot_hours === 1 ? 'ACTIVE (Midday)' : 'INACTIVE (Cool)'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-400">N/A</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-secondary/30 border border-border">
                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider">Vapor Deficit (VPD)</span>
                                                                <span className="font-mono font-bold text-slate-800 dark:text-neutral-200 text-sm mt-0.5">
                                                                    {features.vpd !== undefined ? `${features.vpd.toFixed(2)} kPa` : 'N/A'}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-secondary/30 border border-border">
                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider">High Wind Guard</span>
                                                                <div className="flex items-center gap-1.5 mt-0.5 font-bold text-slate-800 dark:text-neutral-200">
                                                                    {features.is_high_wind !== undefined ? (
                                                                        <span className={features.is_high_wind === 1 ? 'text-red-500 font-black animate-pulse' : 'text-slate-400'}>
                                                                            {features.is_high_wind === 1 ? '⚠️ HIGH WIND DELAY' : '✓ Normal Winds'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-400">N/A</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-secondary/30 border border-border">
                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider">Rolling Moisture (6h)</span>
                                                                <span className="font-mono font-bold text-slate-800 dark:text-neutral-200 text-sm mt-0.5">
                                                                    {features.moisture_rolling_6 !== undefined ? `${features.moisture_rolling_6.toFixed(1)}%` : 'N/A'}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-secondary/30 border border-border">
                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-wider">Rolling Temp (6h)</span>
                                                                <span className="font-mono font-bold text-slate-800 dark:text-neutral-200 text-sm mt-0.5">
                                                                    {features.temp_rolling_6 !== undefined ? `${features.temp_rolling_6.toFixed(1)}°C` : 'N/A'}
                                                                </span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent System Events Card */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl flex flex-col bg-slate-950 text-slate-100 font-mono">
                    <CardHeader className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="size-2.5 rounded-full bg-rose-500" />
                                <div className="size-2.5 rounded-full bg-amber-500" />
                                <div className="size-2.5 rounded-full bg-emerald-500" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 pl-2 border-l border-slate-800">
                                <Terminal className="size-3.5 text-indigo-400" /> p-wos://system-events
                            </span>
                        </div>
                        {backendOffline ? (
                            <Badge variant="outline" className="text-[9px] font-black tracking-widest text-red-500 border-red-500/30 bg-red-500/10">STALE</Badge>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-400 tracking-wider">LIVE FEED</span>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 p-6 max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-track-slate-950 scrollbar-thumb-slate-800">
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
                                    ? 'text-rose-400 font-bold'
                                    : log.type === 'ACTION'
                                        ? 'text-violet-400 font-bold'
                                        : 'text-sky-400 font-bold';

                                return (
                                    <div key={log.id} className="flex items-start justify-between gap-4 p-2 rounded-xl bg-slate-900/30 hover:bg-slate-900/60 border border-transparent hover:border-slate-900 transition-all duration-300 group">
                                        <div className="flex items-start gap-3">
                                            <div className={`size-2 rounded-full mt-1.5 flex-shrink-0 ${bulletColor}`} />
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] ${typeColor} tracking-wide`}>{typeTag}</span>
                                                    <span className="text-[10px] text-slate-500 font-medium">
                                                        {new Date(log.timestamp.replace(/ GMT$/, '').replace(/Z$/, '')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-200 font-medium leading-relaxed tracking-wide group-hover:text-white transition-colors">{log.message}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-400 flex-shrink-0 pt-0.5 font-mono">
                                            {getRelativeTime(log.timestamp)}
                                        </span>
                                    </div>
                                );
                            })}
                            {deduplicatedLogs.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
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
