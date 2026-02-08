import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { SensorData, PredictionData, SystemLog, WeatherForecast, SimulationState } from '../services/api';
import { Gauge } from '../components/Gauge';
import { Cloud, Activity, AlertTriangle, Terminal, Droplets, TrendingDown } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Show loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
                <p className="text-lg">Connecting to P-WOS...</p>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-white">
                <AlertTriangle className="size-16 text-amber-400 mb-4" />
                <h2 className="text-xl font-bold mb-2">Connection Error</h2>
                <p className="text-gray-400 text-center max-w-md mb-4">{error}</p>
                <button
                    onClick={() => { setLoading(true); fetchData(); }}
                    className="px-6 py-2 bg-blue-500 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    const toggleMode = async () => {
        const newMode = isAuto ? 'MANUAL' : 'AUTO';
        await api.toggleMode(newMode);
        setIsAuto(!isAuto);
    };

    const chartData = {
        labels: history.map(d => new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
        datasets: [{
            label: 'Soil Moisture (%)',
            data: history.map(d => d.soil_moisture),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 2
        }]
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* CLEAN DEFAULT PAGE HEADER */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Dashboard</h1>
                    <p className="text-slate-500 font-medium italic">Predictive Water Optimization System • Bulawayo, Zimbabwe</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Mode Badge */}
                    <button
                        onClick={toggleMode}
                        className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all hover:brightness-125 active:scale-95 ${isAuto ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-orange-500/10 border-orange-500/50 text-orange-400'}`}
                    >
                        Mode: {isAuto ? 'AUTO' : 'MANUAL'}
                    </button>

                    {/* Pump Badge */}
                    <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${prediction?.system_status === 'PUMPING' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-500/10 border-white/20 text-slate-400'}`}>
                        Pump: {prediction?.system_status || 'IDLE'}
                    </div>

                    {/* ML Badge */}
                    <div className="px-4 py-1.5 rounded-full border border-indigo-500/50 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                        Core: {prediction?.recommended_action || 'SCANNING'}
                    </div>
                </div>
            </header>


            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* 1. Sensor Array (Full Width) - Col Span 12 */}
                <div className="lg:col-span-12 glass-card p-5 rounded-2xl dark:text-white flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Activity className="size-4" /> Live Device Metrics
                        </h3>
                        <span className="text-[10px] text-slate-500 font-bold bg-white/5 px-2 py-1 rounded tracking-tighter">NODE ID: ESP32 • ACTIVE</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-center max-w-6xl mx-auto w-full py-2">
                        <div className="text-center">
                            <Gauge value={sensors?.soil_moisture || 0} label="Soil" unit="%" color="#3b82f6" />
                        </div>
                        <div className="text-center">
                            <Gauge value={sensors?.temperature || 0} label="Temp" unit="°C" color="#f97316" max={50} />
                        </div>
                        <div className="text-center">
                            <Gauge value={sensors?.humidity || 0} label="Humidity" unit="%" color="#10b981" />
                        </div>
                    </div>
                </div>

                {/* 2. Main Chart - Col Span 12 */}
                <div className="lg:col-span-12 glass-card p-5 rounded-2xl dark:text-white min-h-[350px]">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">System Telemetry: Moisture Trends (24h)</h3>
                    <div className="h-[300px] w-full">
                        <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }} />
                    </div>
                </div>

                {/* 3. Detailed Weather - Col Span 6 */}
                <div className="lg:col-span-6 glass-card p-5 rounded-2xl dark:text-white">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <Cloud className="size-4" /> Weather Analysis
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                            <p className="text-xs text-slate-400 mb-1">Precipitation Chance</p>
                            <p className="text-2xl font-bold text-white">{weather?.precipitation_chance}%</p>
                            <p className="text-xs text-slate-500 mt-1">OpenWeatherMap API</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                            <p className="text-xs text-slate-400 mb-1">Wind Speed</p>
                            <p className="text-2xl font-bold text-white">{weather?.wind_speed_kmh} km/h</p>
                            <p className="text-xs text-slate-500 mt-1">North-East Direction</p>
                        </div>
                        <div className="col-span-2 p-4 rounded-xl bg-indigo-900/10 border border-indigo-500/20">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-xs text-indigo-300 font-bold uppercase">Rain Forecast</p>
                                {weather?.rain_forecast_minutes ? <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded">INCOMING</span> : <span className="text-xs text-indigo-400/50">CLEAR</span>}
                            </div>
                            {weather?.rain_forecast_minutes ? (
                                <p className="text-sm text-indigo-200">Rain is expected to start in {weather.rain_forecast_minutes} minutes.</p>
                            ) : (
                                <p className="text-sm text-indigo-200/60">No rain expected in the immediate future.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. ML Logs - Col Span 6 */}
                <div className="lg:col-span-6 glass-card p-5 rounded-2xl dark:text-white flex flex-col h-full max-h-[300px]">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <Terminal className="size-4" /> System Logs
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {logs.slice(0, 15).map(log => (
                            <div key={log.id} className="flex gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="shrink-0 mt-1">
                                    {log.type === 'ACTION' ? <div className="size-2 rounded-full bg-emerald-500" /> :
                                        log.type === 'ERROR' ? <div className="size-2 rounded-full bg-rose-500" /> :
                                            <div className="size-2 rounded-full bg-blue-500" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-slate-300 truncate">{log.message}</p>
                                    <p className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Water Savings Comparison - Full Width */}
                {simState && (
                    <div className="lg:col-span-12 glass-card p-5 rounded-2xl dark:text-white">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Droplets className="size-4" /> Water Savings Comparison
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Reactive System */}
                            <div className="p-4 rounded-xl bg-orange-900/20 border border-orange-500/30">
                                <p className="text-xs text-orange-400 font-bold uppercase mb-2">Reactive (Threshold)</p>
                                <p className="text-3xl font-black text-white">{simState.fields.reactive.water_used.toFixed(1)}L</p>
                                <p className="text-xs text-orange-300/70 mt-1">{simState.fields.reactive.pump_events} pump cycles</p>
                            </div>

                            {/* Predictive System */}
                            <div className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30">
                                <p className="text-xs text-emerald-400 font-bold uppercase mb-2">Predictive (ML)</p>
                                <p className="text-3xl font-black text-white">{simState.fields.predictive.water_used.toFixed(1)}L</p>
                                <p className="text-xs text-emerald-300/70 mt-1">{simState.fields.predictive.pump_events} pump cycles</p>
                            </div>

                            {/* Savings */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-500/30">
                                <p className="text-xs text-blue-300 font-bold uppercase mb-2 flex items-center gap-1">
                                    <TrendingDown className="size-3" /> Water Saved
                                </p>
                                <p className="text-4xl font-black text-white">{simState.savings_percent.toFixed(1)}%</p>
                                <p className="text-xs text-blue-200/70 mt-1">{simState.water_saved.toFixed(1)} liters saved</p>
                                {simState.savings_percent >= 15 && (
                                    <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold bg-green-500/30 text-green-300 rounded">TARGET MET</span>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 text-center">
                            Simulation Step: {simState.step} | Scenario: {simState.scenario}
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};
