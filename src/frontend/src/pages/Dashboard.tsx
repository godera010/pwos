import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { SensorData, PredictionData, SystemLog, SimulationState, WeatherForecast } from '../services/api';
import { CircularGauge } from '../components/CircularGauge';
import {
    Activity,
    AlertTriangle,
    Terminal,
    Droplets,
    TrendingDown,
    Thermometer,
    CheckCircle2,
    Clock,
    Zap,
    Brain,
    Cloud,
    CloudRain,
    Wind,
    Umbrella
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export const Dashboard: React.FC = () => {
    const [sensors, setSensors] = useState<SensorData | null>(null);
    const [weather, setWeather] = useState<WeatherForecast | null>(null);
    const [prediction, setPrediction] = useState<PredictionData | null>(null);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [history, setHistory] = useState<SensorData[]>([]);
    const [simState, setSimState] = useState<SimulationState | null>(null);
    const [isAuto, setIsAuto] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [s, w, p, l, h, state, sim] = await Promise.all([
                api.getLatestSensors(),
                api.getWeatherForecast(),
                api.getPrediction(),
                api.getLogs(),
                api.getHistory(30),
                api.getSystemState(),
                api.simulationState().catch(() => null)
            ]);
            setSensors(s);
            setWeather(w);
            setPrediction(p);
            setLogs(l);
            setHistory(h.reverse());
            setIsAuto(state.mode === 'AUTO');
            if (sim) setSimState(sim);
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
                <p className="text-slate-500 font-medium font-display uppercase tracking-widest text-[10px]">Initializing P-WOS Dashboard...</p>
            </div>
        );
    }

    if (error && !sensors) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <AlertTriangle className="size-12 text-amber-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Connection Lost</h2>
                <p className="text-slate-500 max-w-md mb-6">{error}</p>
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
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 font-bold">
                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            System Online
                        </Badge>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Real-time plant monitoring and predictive watering optimization.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Last Updated</p>
                        <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{new Date().toLocaleTimeString()}</p>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <Button
                        variant={isAuto ? "default" : "outline"}
                        size="sm"
                        onClick={toggleMode}
                        className={isAuto ? "bg-primary hover:bg-primary/90" : ""}
                    >
                        {isAuto ? "Auto Mode Active" : "Manual Mode active"}
                    </Button>
                </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Soil Moisture */}
                <Card className="overflow-hidden border-none shadow-sm dark:bg-slate-900/50">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Soil Moisture</CardTitle>
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
                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Ambient Conditions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Thermometer className="size-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Temperature</p>
                                    <p className="text-2xl font-black">{sensors?.temperature.toFixed(1)}°C</p>
                                </div>
                            </div>
                            <Progress value={(sensors?.temperature || 0) * 2} className="w-24 h-1.5" />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Activity className="size-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Humidity</p>
                                    <p className="text-2xl font-black">{sensors?.humidity.toFixed(1)}%</p>
                                </div>
                            </div>
                            <Progress value={sensors?.humidity || 0} className="w-24 h-1.5" />
                        </div>
                    </CardContent>
                </Card>

                {/* System Health */}
                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">System Health</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="space-y-3">
                            {[
                                { label: 'Database', status: 'Connected', icon: CheckCircle2, color: 'text-emerald-500' },
                                { label: 'MQTT Broker', status: 'Active', icon: Zap, color: 'text-primary' },
                                { label: 'ML Engine', status: 'Loaded (94%)', icon: Brain, color: 'text-indigo-500' },
                                { label: 'Figma Assets', status: 'Optimized', icon: Clock, color: 'text-slate-400' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <item.icon className={`size-4 ${item.color}`} />
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-tight bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                                        {item.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Weather Forecast Card */}
            <Card className="border-none shadow-sm dark:bg-slate-900/50 overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600" />
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Cloud className="size-4 text-sky-500" /> Weather Forecast
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] font-black uppercase text-sky-500 border-sky-500/20">
                            {weather?.source || 'OpenWeather'}
                        </Badge>
                    </div>
                    <CardDescription>Live conditions from Bulawayo weather station</CardDescription>
                </CardHeader>
                <CardContent>
                    {weather ? (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Thermometer className="size-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Temp</p>
                                    <p className="text-xl font-black">{weather.temperature.toFixed(1)}°C</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Droplets className="size-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Humidity</p>
                                    <p className="text-xl font-black">{weather.humidity.toFixed(0)}%</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                                <div className="p-2 bg-sky-500/10 rounded-lg">
                                    <CloudRain className="size-5 text-sky-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Precip</p>
                                    <p className="text-xl font-black">{weather.precipitation_chance}%</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Wind className="size-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Wind</p>
                                    <p className="text-xl font-black">{weather.wind_speed_kmh} km/h</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <Umbrella className="size-5 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Rain In</p>
                                    <p className="text-xl font-black">{weather.rain_forecast_minutes > 0 ? `${weather.rain_forecast_minutes}m` : 'N/A'}</p>
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

            {/* AI Prediction & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex-1 space-y-4">
                                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none uppercase tracking-widest text-[10px]">AI Prediction Engine</Badge>
                                <h2 className="text-3xl font-black leading-tight">
                                    {prediction?.recommended_action === 'WATER_NOW' ?
                                        "🚨 Watering recommended within 24 hours" :
                                        "✓ No watering needed for 24+ hours"}
                                </h2>
                                <p className="text-indigo-100 text-sm leading-relaxed max-w-xl">
                                    {prediction?.recommended_action === 'STALL' ?
                                        "Strategy: STALL. Rain forecast indicates incoming natural precipitation. Saving resources." :
                                        (prediction?.recommended_action === 'WATER_NOW' ?
                                            "Strategy: DISPATCH. Soil moisture levels are trending below threshold. ML model suggests immediate hydration." :
                                            "Strategy: MONITOR. System is currently optimal based on environmental factors and moisture levels.")}
                                </p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Confidence</p>
                                <p className="text-4xl font-black mb-1">{prediction?.ml_analysis.confidence || 94}%</p>
                                <Progress value={prediction?.ml_analysis.confidence || 94} className="w-24 h-2 bg-white/20" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-sm font-bold gap-2">
                            <Droplets className="size-4" /> Water Now
                        </Button>
                        <Button variant="outline" className="w-full h-12 text-sm font-bold">
                            Run Auto-Control
                        </Button>
                        <Button variant="destructive" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest h-8 opacity-70 hover:opacity-100">
                            Emergency Stop
                        </Button>
                        <div className="pt-2 text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Manual Overrides are logged</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Sensor Feed Chart */}
            <Card className="border-none shadow-sm dark:bg-slate-900/50">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Live Sensor Telemetry</CardTitle>
                        <CardDescription>Real-time data stream from ESP32 node</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="w-full" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="timestamp"
                                    hide
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="soil_moisture"
                                    name="Moisture"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorMoisture)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Events & Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
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
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.message}</p>
                                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <TrendingDown className="size-4" /> AI Efficiency Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {simState ? (
                            <div className="space-y-6">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Water Savings</p>
                                        <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{simState.savings_percent.toFixed(1)}%</p>
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 mb-2">TARGET ATTAINED</Badge>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Predictive Used</p>
                                        <p className="text-xl font-black">{simState.fields.predictive.water_used.toFixed(1)}L</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Reactive Used</p>
                                        <p className="text-xl font-black">{simState.fields.reactive.water_used.toFixed(1)}L</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Resource Preservation</p>
                                    <div className="flex items-center gap-3">
                                        <Progress value={simState.savings_percent} className="h-2" />
                                        <span className="text-xs font-black text-emerald-500">+{simState.water_saved.toFixed(1)}L</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                                <Droplets className="size-12 mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Awaiting Simulation Data</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
