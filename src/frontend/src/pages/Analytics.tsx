import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    Download,
    TrendingUp,
    Droplets,
    Leaf,
    BarChart3,
    Zap,
    Timer,
    Brain
} from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Local helpers ───────────────────────────────────────────────────────────

function calcVPD(temp: number, humidity: number): number {
    const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    const ea = es * (humidity / 100.0);
    return Math.max(0, es - ea);
}

function fillMissingBuckets(data: any[], intervalStr: string): any[] {
    if (!data || data.length === 0) return [];

    const intervalMsMap: Record<string, number> = {
        '1 minute': 60 * 1000,
        '5 minutes': 5 * 60 * 1000,
        '10 minutes': 10 * 60 * 1000,
        '15 minutes': 15 * 60 * 1000,
        '1 hour': 60 * 60 * 1000,
        '6 hours': 6 * 60 * 60 * 1000
    };

    const intervalMs = intervalMsMap[intervalStr] || 15 * 60 * 1000;
    data.sort((a, b) => a.timestamp - b.timestamp);

    const startMs = data[0].timestamp;
    const endMs = data[data.length - 1].timestamp;

    const dataMap = new Map();
    for (const item of data) {
        dataMap.set(item.timestamp, item);
    }

    const filledData = [];
    for (let currentMs = startMs; currentMs <= endMs; currentMs += intervalMs) {
        if (dataMap.has(currentMs)) {
            filledData.push(dataMap.get(currentMs));
        } else {
            const dateObj = new Date(currentMs);
            filledData.push({
                timestamp: currentMs,
                fullDate: dateObj.toLocaleString(),
                _original_moisture: null,
                soil_moisture: 0,
                temperature: 0,
                humidity: 0,
                vpd: 0,
                water_usage_ai: 0,
                water_usage_standard: 0,
                total_duration_raw: 0,
                ai_decisions_raw: 0
            });
        }
    }
    return filledData;
}

/** Human-readable label for the selected range */
const RANGE_LABELS: Record<string, string> = {
    '1h': 'Last 1h',
    '6h': 'Last 6h',
    '12h': 'Last 12h',
    '24h': 'Last 24h',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days'
};

// Pie chart colours
const PIE_COLORS = ['#6366f1', '#94a3b8']; // AI = indigo, Manual = slate

// Distribution bar colours
const DIST_COLORS: Record<string, string> = {
    'Critical': '#ef4444',
    'Low': '#f59e0b',
    'Optimal': '#10b981',
    'High': '#3b82f6'
};

// ─── Component ───────────────────────────────────────────────────────────────

export const Analytics: React.FC = () => {
    const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | '7d' | '30d'>('24h');
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        total_waterings: 0,
        avg_moisture: 0,
        total_ml_decisions: 0,
        total_water_seconds: 0,
        ai_water_seconds: 0,
        manual_water_seconds: 0,
        manual_event_count: 0
    });

    // ─── Data Fetching ───────────────────────────────────────────────────────

    useEffect(() => {
        const loadData = async () => {
            try {
                const configMap: Record<string, { hours: number, interval: string }> = {
                    '1h': { hours: 1, interval: '1 minute' },
                    '6h': { hours: 6, interval: '5 minutes' },
                    '12h': { hours: 12, interval: '10 minutes' },
                    '24h': { hours: 24, interval: '15 minutes' },
                    '7d': { hours: 168, interval: '1 hour' },
                    '30d': { hours: 720, interval: '6 hours' }
                };

                const { hours, interval } = configMap[timeRange] || { hours: 24, interval: '15 minutes' };
                const aggregatedResp = await api.getAggregatedAnalytics(hours, interval);

                if (aggregatedResp && Array.isArray(aggregatedResp)) {
                    const mergedData = aggregatedResp.map(item => {
                        const dateObj = new Date(item.timestamp);
                        const temp = item.temperature ?? 0;
                        const hum = item.humidity ?? 0;
                        const vpdValue = (item.vpd && item.vpd > 0) ? item.vpd : calcVPD(temp, hum);

                        return {
                            timestamp: dateObj.getTime(),
                            fullDate: dateObj.toLocaleString(),
                            _original_moisture: item.soil_moisture,
                            soil_moisture: item.soil_moisture ?? 0,
                            temperature: item.temperature ?? 0,
                            humidity: item.humidity ?? 0,
                            vpd: vpdValue,
                            water_usage_ai: item.watering?.ai_duration ?? 0,
                            water_usage_standard: (item.watering?.total_duration ?? 0) - (item.watering?.ai_duration ?? 0),
                            total_duration_raw: item.watering?.total_duration ?? 0,
                            ai_decisions_raw: item.watering?.ai_event_count ?? 0
                        };
                    });

                    // ─── Compute Stats ────────────────────────────────────────
                    const totalWaterings = mergedData.filter((d: any) => d.total_duration_raw > 0).length;
                    const totalAIDecisions = mergedData.reduce((sum: number, d: any) => sum + d.ai_decisions_raw, 0);

                    const validMoistures = mergedData.filter((d: any) => d._original_moisture !== null && d._original_moisture !== undefined);
                    const avgMoisture = validMoistures.length > 0
                        ? validMoistures.reduce((sum: number, d: any) => sum + d._original_moisture, 0) / validMoistures.length
                        : 0;

                    const totalWaterSec = mergedData.reduce((s: number, d: any) => s + d.total_duration_raw, 0);
                    const aiWaterSec = mergedData.reduce((s: number, d: any) => s + d.water_usage_ai, 0);
                    const manualWaterSec = totalWaterSec - aiWaterSec;
                    const manualEvents = totalWaterings - totalAIDecisions;

                    const finalData = fillMissingBuckets(mergedData, interval);

                    setStats({
                        total_waterings: totalWaterings,
                        avg_moisture: parseFloat(avgMoisture.toFixed(2)),
                        total_ml_decisions: totalAIDecisions,
                        total_water_seconds: totalWaterSec,
                        ai_water_seconds: aiWaterSec,
                        manual_water_seconds: Math.max(0, manualWaterSec),
                        manual_event_count: Math.max(0, manualEvents)
                    });

                    setData(finalData);
                }
            } catch (err) {
                console.error("Failed to load analytics:", err);
            }
        };

        loadData();
    }, [timeRange]);

    // ─── Derived Data ────────────────────────────────────────────────────────

    /** Pie chart data — AI vs Manual decisions */
    const pieData = useMemo(() => [
        { name: 'AI', value: stats.total_ml_decisions },
        { name: 'Manual', value: Math.max(0, stats.manual_event_count) }
    ], [stats]);

    /** Soil moisture distribution histogram */
    const distributionData = useMemo(() => {
        const buckets = { Critical: 0, Low: 0, Optimal: 0, High: 0 };
        data.forEach(d => {
            if (d._original_moisture === null || d._original_moisture === undefined) return;
            const m = d._original_moisture;
            if (m < 30) buckets.Critical++;
            else if (m < 45) buckets.Low++;
            else if (m < 75) buckets.Optimal++;
            else buckets.High++;
        });
        return [
            { range: 'Critical', label: '0–30%', count: buckets.Critical, fill: DIST_COLORS.Critical },
            { range: 'Low', label: '30–45%', count: buckets.Low, fill: DIST_COLORS.Low },
            { range: 'Optimal', label: '45–75%', count: buckets.Optimal, fill: DIST_COLORS.Optimal },
            { range: 'High', label: '75–100%', count: buckets.High, fill: DIST_COLORS.High },
        ];
    }, [data]);

    /** Cumulative water usage over time */
    const cumulativeData = useMemo(() => {
        let cumTotal = 0, cumAI = 0, cumManual = 0;
        return data.map(d => {
            cumTotal += d.total_duration_raw || 0;
            cumAI += d.water_usage_ai || 0;
            cumManual += d.water_usage_standard || 0;
            return {
                timestamp: d.timestamp,
                cumulative_total: cumTotal,
                cumulative_ai: cumAI,
                cumulative_manual: cumManual
            };
        });
    }, [data]);

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const rangeLabel = RANGE_LABELS[timeRange] || timeRange;
    const aiPct = stats.total_water_seconds > 0
        ? Math.round((stats.ai_water_seconds / stats.total_water_seconds) * 100)
        : 0;

    const exportToCSV = () => {
        if (!data || data.length === 0) return;
        const headers = ["Timestamp", "Full Date", "Soil Moisture (%)", "Temperature (°C)", "Humidity (%)", "VPD (kPa)", "AI Water Usage (s)", "Standard Water Usage (s)"];
        const rows = data.map(d => [
            new Date(d.timestamp).toLocaleString(),
            d.fullDate,
            d.soil_moisture.toFixed(2),
            d.temperature.toFixed(2),
            d.humidity.toFixed(2),
            d.vpd.toFixed(3),
            d.water_usage_ai,
            d.water_usage_standard
        ]);
        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `pwos_analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatXAxis = (timestamp: string | number) => {
        const d = new Date(timestamp);
        if (timeRange === '7d' || timeRange === '30d') {
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // ─── Shared Tooltip ──────────────────────────────────────────────────────

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-white text-xs">
                    <p className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">{new Date(label).toLocaleString()}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={`item-${index}`} style={{ color: entry.color }} className="flex justify-between gap-4 py-0.5">
                            <span>{entry.name}:</span>
                            <span className="font-bold">
                                {Number(entry.value).toFixed(2)} {entry.dataKey === 'soil_moisture' ? '%' : entry.dataKey.includes('usage') || entry.dataKey.includes('duration') || entry.dataKey.includes('cumulative') ? 's' : ''}
                            </span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const PieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const total = pieData.reduce((s, d) => s + d.value, 0);
            const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
            return (
                <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-white text-xs">
                    <p className="font-bold">{payload[0].name}</p>
                    <p>{payload[0].value} events ({pct}%)</p>
                </div>
            );
        }
        return null;
    };

    const DistTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const totalBuckets = distributionData.reduce((s, d) => s + d.count, 0);
            const pct = totalBuckets > 0 ? ((payload[0].value / totalBuckets) * 100).toFixed(1) : '0';
            return (
                <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-white text-xs">
                    <p className="font-bold">{payload[0].payload.range} ({payload[0].payload.label})</p>
                    <p>{payload[0].value} readings ({pct}%)</p>
                </div>
            );
        }
        return null;
    };

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        System Analytics
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 gap-1 font-bold">
                            <BarChart3 className="size-3" />
                            Data Insights
                        </Badge>
                    </h1>
                    <p className="dark:text-neutral-500 text-sm font-medium">
                        Deep dive into historical performance and resource efficiency.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-card border border-border rounded-lg p-1 mr-2 flex-wrap sm:flex-nowrap">
                        {(['1h', '6h', '12h', '24h', '7d', '30d'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${timeRange === range
                                    ? 'bg-slate-900 dark:bg-secondary text-white dark:text-white shadow-sm'
                                    : 'dark:text-neutral-500 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" onClick={exportToCSV}>
                        <Download className="size-4 dark:text-neutral-500" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                </div>
            </div>

            {/* ── Row 1 — KPI Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Waterings */}
                <Card className="shadow-sm dark:bg-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <Droplets className="size-6 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold dark:text-neutral-400 uppercase tracking-wider">Total Waterings</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.total_waterings}</h3>
                                    <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                                        {rangeLabel} <TrendingUp className="size-3 ml-1" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Avg Soil Health */}
                <Card className="shadow-sm dark:bg-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-xl">
                                <Leaf className="size-6 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold dark:text-neutral-400 uppercase tracking-wider">Avg Soil Health</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.avg_moisture}%</h3>
                                    <span className="text-[10px] font-bold dark:text-neutral-500">{rangeLabel}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Decisions */}
                <Card className="shadow-sm dark:bg-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-sky-500/10 rounded-xl">
                                <Brain className="size-6 text-sky-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold dark:text-neutral-400 uppercase tracking-wider">AI Decisions</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.total_ml_decisions}</h3>
                                    <span className="text-[10px] font-bold text-sky-500">{rangeLabel}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Animated Charts Container ────────────────────────────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={timeRange}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                    {/* ── Row 2 — Main Soil Moisture & Irrigation (full-width) ── */}
                    <Card className="shadow-sm dark:bg-card">
                        <CardHeader>
                            <CardTitle className="text-base font-bold uppercase tracking-wide dark:text-neutral-500">Soil Moisture & Irrigation Duration</CardTitle>
                            <CardDescription>Correlation between moisture levels and automated watering cycles (duration in seconds)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="rgba(128,128,128,0.1)" />
                                        <XAxis dataKey="timestamp" type="number" scale="time" domain={['auto', 'auto']} padding={{ left: 0, right: 0 }} tick={{ fontSize: 12 }} stroke="#a3a3a3" axisLine={false} tickLine={false} interval="preserveStartEnd" tickFormatter={formatXAxis} />
                                        <YAxis yAxisId="left" stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} unit="%" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} unit="s" />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Area yAxisId="left" type="monotone" dataKey="soil_moisture" name="Soil Moisture" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMoisture)" connectNulls={true} />
                                        <Bar yAxisId="right" dataKey="water_usage_ai" name="Irrigation (s)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Row 3 — Water Usage + Pie + Distribution (3 cols) ──── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Water Usage Summary Card */}
                        <Card className="shadow-sm dark:bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-bold uppercase tracking-wide dark:text-neutral-500 flex items-center gap-2">
                                    <Timer className="size-4" /> Water Usage
                                </CardTitle>
                                <CardDescription>{rangeLabel}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold dark:text-neutral-400 uppercase">
                                        <span>Total Duration</span>
                                        <span className="text-slate-900 dark:text-white text-sm">{stats.total_water_seconds}s</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-indigo-500/5 rounded-xl space-y-1">
                                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1"><Zap className="size-3" /> AI</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white">{stats.ai_water_seconds}s</p>
                                    </div>
                                    <div className="p-3 bg-slate-500/5 rounded-xl space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Manual</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white">{stats.manual_water_seconds}s</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="dark:text-neutral-400">AI Share</span>
                                        <span className="text-indigo-500">{aiPct}%</span>
                                    </div>
                                    <Progress value={aiPct} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* AI vs Manual Pie Chart */}
                        <Card className="shadow-sm dark:bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-bold uppercase tracking-wide dark:text-neutral-500 flex items-center gap-2">
                                    <Brain className="size-4" /> AI vs Manual
                                </CardTitle>
                                <CardDescription>Watering decision breakdown</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[220px] w-full">
                                    {(pieData[0].value > 0 || pieData[1].value > 0) ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={85}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {pieData.map((_entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<PieTooltip />} />
                                                <Legend iconType="circle" formatter={(value: string) => <span className="text-xs font-bold dark:text-neutral-300">{value}</span>} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full opacity-40">
                                            <p className="text-xs font-bold uppercase tracking-widest">No events in range</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Soil Moisture Distribution */}
                        <Card className="shadow-sm dark:bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-bold uppercase tracking-wide dark:text-neutral-500 flex items-center gap-2">
                                    <BarChart3 className="size-4" /> Moisture Distribution
                                </CardTitle>
                                <CardDescription>Readings by health zone</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[220px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                                            <XAxis dataKey="range" stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                                            <YAxis stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                                            <Tooltip content={<DistTooltip />} />
                                            <Bar dataKey="count" name="Readings" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                                {distributionData.map((entry, index) => (
                                                    <Cell key={`dist-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Row 4 — Cumulative Water Usage (full-width) ────────── */}
                    <Card className="shadow-sm dark:bg-card">
                        <CardHeader>
                            <CardTitle className="text-base font-bold uppercase tracking-wide dark:text-neutral-500">Cumulative Water Usage</CardTitle>
                            <CardDescription>Running total of irrigation duration over time (seconds)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={cumulativeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                                        <XAxis dataKey="timestamp" stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} interval={Math.max(0, Math.floor(cumulativeData.length / 6))} tickFormatter={formatXAxis} />
                                        <YAxis stroke="#a3a3a3" axisLine={false} tickLine={false} unit="s" />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Line type="monotone" dataKey="cumulative_total" name="Total" stroke="#10b981" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="cumulative_ai" name="AI" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                                        <Line type="monotone" dataKey="cumulative_manual" name="Manual" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Row 5 — Resource Efficiency + VPD/Temperature ─────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Efficiency Comparison */}
                        <Card className="shadow-sm dark:bg-card">
                            <CardHeader>
                                <CardTitle className="text-base font-bold uppercase tracking-wide dark:text-neutral-500">Resource Efficiency</CardTitle>
                                <CardDescription>Comparison of AI-Optimized usage vs Standard Schedules</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.filter(d => d.water_usage_ai > 0 || d.water_usage_standard > 0)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                                            <XAxis dataKey="timestamp" stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} interval={Math.max(0, Math.floor(data.filter(d => d.water_usage_ai > 0 || d.water_usage_standard > 0).length / 6))} tickFormatter={formatXAxis} />
                                            <YAxis stroke="#a3a3a3" axisLine={false} tickLine={false} unit="s" />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: 'white' }} />
                                            <Legend />
                                            <Bar dataKey="water_usage_standard" name="Standard Usage" fill="#94a3b8" stackId="a" radius={[0, 0, 4, 4]} />
                                            <Bar dataKey="water_usage_ai" name="AI Optimized Usage" fill="#3b82f6" stackId="b" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Environmental Factors */}
                        <Card className="shadow-sm dark:bg-card">
                            <CardHeader>
                                <CardTitle className="text-base font-bold uppercase tracking-wide dark:text-neutral-500">VPD & Temperature Trends</CardTitle>
                                <CardDescription>Vapor Pressure Deficit analysis for plant transpiration</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                                            <XAxis dataKey="timestamp" stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} interval={Math.max(0, Math.floor(data.length / 6))} tickFormatter={formatXAxis} />
                                            <YAxis yAxisId="left" stroke="#a3a3a3" axisLine={false} tickLine={false} unit="°C" padding={{ top: 20, bottom: 20 }} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#a3a3a3" axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: 'white' }} />
                                            <Legend />
                                            <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#f97316" strokeWidth={2} dot={false} connectNulls={true} />
                                            <Line yAxisId="right" type="monotone" dataKey="vpd" name="VPD (kPa)" stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls={true} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
