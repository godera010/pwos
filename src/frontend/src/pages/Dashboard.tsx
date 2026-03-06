import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { SensorData, PredictionData, SystemLog, WeatherForecast, SystemState } from '../services/api';
import { CircularGauge } from '../components/CircularGauge';
import {
    Activity,
    AlertTriangle,
    Terminal,
    Droplets,
    Thermometer,
    CheckCircle2,
    Zap,
    Brain,
    Cloud,
    CloudRain,
    Wind,
    Umbrella
} from 'lucide-react';
import { LoadChart } from '../components/LoadChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
    const [sensors, setSensors] = useState<SensorData | null>(null);
    const [weather, setWeather] = useState<WeatherForecast | null>(null);
    const [prediction, setPrediction] = useState<PredictionData | null>(null);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [history, setHistory] = useState<SensorData[]>([]);
    const [systemState, setSystemState] = useState<SystemState | null>(null);
    const [isAuto, setIsAuto] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [s, w, p, l, h, state] = await Promise.all([
                api.getLatestSensors(),
                api.getWeatherForecast(),
                api.getPrediction(),
                api.getLogs(),
                api.getHistory(1), // Fetch 1 hour, filter down to 30 min in UI
                api.getSystemState()
            ]);
            setSensors(s);
            setWeather(w);
            setPrediction(p);
            setLogs(l);
            setHistory(h.reverse());
            setIsAuto(state.mode === 'AUTO');
            setSystemState(state);

            setError(null);
        } catch (e) {
            console.error("Dashboard Fetch Error:", e);
            setError("Cannot connect to backend. Make sure the API server is running on port 5000.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s as per brief
        return () => clearInterval(interval);
    }, []);

    const toggleMode = async () => {
        const newMode = isAuto ? 'MANUAL' : 'AUTO';
        await api.toggleMode(newMode);
        setIsAuto(!isAuto);
    };

    if (loading && !sensors) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-slate-900 dark:text-white font-medium font-display uppercase tracking-widest text-[10px]">Initializing P-WOS Dashboard...</p>
            </div>
        );
    }

    if (error && !sensors) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <AlertTriangle className="size-12 text-amber-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Connection Lost</h2>
                <p className="text-slate-900 dark:text-white max-w-md mb-6">{error}</p>
                <Button onClick={() => { setLoading(true); fetchData(); }}>
                    Retry Connection
                </Button>
            </div>
        );
    }

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
                <Card className="overflow-hidden  shadow-none border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Soil Moisture</CardTitle>
                            <Droplets className="size-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pt-2 pb-6">
                        <CircularGauge
                            value={sensors?.soil_moisture || 0}
                            unit="%"
                            size={180}
                            thickness={14}
                        />
                        <div className="mt-4 flex items-center gap-2">
                            <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${(sensors?.soil_moisture || 0) < 30 ? 'bg-red-500/10 text-red-500' :
                                (sensors?.soil_moisture || 0) < 50 ? 'bg-orange-500/10 text-orange-500' :
                                    (sensors?.soil_moisture || 0) < 70 ? 'bg-yellow-500/10 text-yellow-500' :
                                        'bg-green-500/10 text-green-500'
                                }`}>
                                {(sensors?.soil_moisture || 0) < 30 ? 'Critical' :
                                    (sensors?.soil_moisture || 0) < 50 ? 'Low' :
                                        (sensors?.soil_moisture || 0) < 70 ? 'Moderate' : 'Optimal'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Ambient Conditions */}
                <Card className=" shadow-none border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Ambient Conditions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Thermometer className="size-5 text-orange-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase">Temperature</p>
                                    <p className="text-2xl font-black">{sensors?.temperature.toFixed(1)}°C</p>
                                </div>
                            </div>
                            <Progress value={(sensors?.temperature || 0) * 2} className="w-24 h-1.5" />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity className="size-5 text-blue-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase">Humidity</p>
                                    <p className="text-2xl font-black">{sensors?.humidity.toFixed(1)}%</p>
                                </div>
                            </div>
                            <Progress value={sensors?.humidity || 0} className="w-24 h-1.5" />
                        </div>
                    </CardContent>
                </Card>

                {/* System Health */}
                <Card className=" shadow-none border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">System Health</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="space-y-3">
                            {[
                                {
                                    label: 'Database',
                                    status: error ? 'Error' : 'Connected',
                                    icon: CheckCircle2,
                                    color: error ? 'text-red-500' : 'text-emerald-500'
                                },
                                {
                                    label: 'ESP Device (Sim)',
                                    status: (sensors?.device_id) ? 'Online' : 'Offline',
                                    icon: Activity,
                                    color: (sensors?.device_id) ? 'text-emerald-500' : 'text-red-500'
                                },
                                {
                                    label: 'Sensor Hub',
                                    status: (sensors && (new Date().getTime() - new Date(sensors.timestamp).getTime() < 120000)) ? 'Online' : 'Offline',
                                    icon: Zap,
                                    color: (sensors && (new Date().getTime() - new Date(sensors.timestamp).getTime() < 120000)) ? 'text-emerald-500' : 'text-red-500'
                                },
                                {
                                    label: 'ML Engine',
                                    status: prediction ? 'Predicting' : 'Idle',
                                    icon: Brain,
                                    color: prediction ? 'text-indigo-500' : 'text-slate-400'
                                },
                                {
                                    label: 'Pump System',
                                    status: systemState?.pump_active ? 'Watering' : 'Standby',
                                    icon: Droplets,
                                    color: systemState?.pump_active ? 'text-blue-500' : 'text-slate-400'
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
                {/* Weather Forecast Card */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                <Cloud className="size-4 text-sky-500" /> Weather Forecast
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] font-black uppercase text-sky-500 border-sky-500/20">
                                {weather?.source || 'OpenWeather'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {weather ? (
                            <div className="bg-gradient-to-br from-sky-400 to-indigo-500 rounded-b-xl p-6 text-white flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="size-20 bg-yellow-400 rounded-full shadow-[0_0_40px_rgba(250,204,21,0.6)] flex items-center justify-center">
                                        {weather.condition?.toLowerCase().includes('cloud') || weather.cloud_cover > 50 ? (
                                            <Cloud className="size-10 text-white" />
                                        ) : weather.rain_forecast_minutes > 0 || weather.condition?.toLowerCase().includes('rain') ? (
                                            <CloudRain className="size-10 text-white" />
                                        ) : (
                                            <div className="size-10 rounded-full bg-yellow-300"></div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-5xl font-black tracking-tighter shadow-black/10 drop-shadow-md">
                                            {weather.temperature.toFixed(1)}°
                                        </h2>
                                        <p className="text-xl font-medium tracking-wide opacity-90 capitalize mt-1">
                                            {weather.condition || 'Clear'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <span className="text-xl font-bold">{weather.wind_speed_kmh.toFixed(1)} <span className="text-sm opacity-70">km/h</span></span>
                                        <Wind className="size-5 opacity-80" />
                                    </div>
                                    <div className="flex items-center justify-end gap-3">
                                        <span className="text-xl font-bold">{weather.humidity.toFixed(0)} <span className="text-sm opacity-70">%</span></span>
                                        <Droplets className="size-5 opacity-80" />
                                    </div>
                                    <div className="flex items-center justify-end gap-3">
                                        <span className="text-xl font-bold">
                                            {weather.rain_forecast_minutes > 0 ? (
                                                <span className="text-yellow-300">{(weather.rain_forecast_minutes / 60).toFixed(1)}h</span>
                                            ) : (
                                                <span className="opacity-90">{weather.precipitation_chance}%</span>
                                            )}
                                        </span>
                                        {weather.rain_forecast_minutes > 0 ? <Umbrella className="size-5 text-yellow-300" /> : <CloudRain className="size-5 opacity-80" />}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                                <Cloud className="size-12 mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Loading Weather Data...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions Card */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">AI Autopilot</h4>
                                <p className="text-xs text-slate-500 dark:text-neutral-400">Automated moisture tracking</p>
                            </div>
                            <Switch checked={isAuto} onCheckedChange={toggleMode} />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                                    Pump Override
                                    {isAuto && <Badge variant="outline" className="text-[8px] uppercase font-black bg-slate-100 text-slate-400 border-none px-1 py-0 h-4">Blocked</Badge>}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-neutral-400">Force water ON/OFF</p>
                            </div>
                            <Switch
                                checked={systemState?.pump_active || false}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        if (isAuto) toggleMode(); // Disable AI if they manually trigger
                                        api.controlPump('ON', 30); // Default to 30s override

                                        // Optioanlly update local state optimistically
                                        if (systemState) setSystemState({ ...systemState, pump_active: true });
                                    } else {
                                        api.controlPump('OFF');
                                        if (systemState) setSystemState({ ...systemState, pump_active: false });
                                    }
                                }}
                                disabled={isAuto}
                            />
                        </div>

                        <Separator />

                        <div className="pt-2">
                            <Link to="/control" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1 transition-colors">
                                Advanced Controls Menu →
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Sensor Feed Chart */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-row items-baseline justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Live Telemetry</CardTitle>
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Soil Moisture Data Stream (Last 30m)</CardDescription>
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
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card text-card-foreground">
                    <CardContent className="p-8">
                        <div className="flex flex-col gap-6">
                            <div className="flex-1 space-y-4">
                                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 uppercase tracking-widest text-[10px]">AI Prediction Engine</Badge>
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
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Confidence</p>
                                <Progress value={prediction?.ml_analysis.confidence || 94} className="flex-1 h-2 bg-white/20" />
                                <p className="text-2xl font-black">{prediction?.ml_analysis.confidence || 94}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent System Events Card */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <Terminal className="size-4" /> Recent System Events
                        </CardTitle>
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
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
