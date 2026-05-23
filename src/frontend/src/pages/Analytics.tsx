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
    Legend,
    LineChart,
    Line,
    BarChart,
    Bar,
    Cell,
} from 'recharts';
import {
    Download,
    Droplets,
    Leaf,
    BarChart3,
    Thermometer,
    Droplet
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

    // Snap each data point's timestamp to the nearest bucket boundary
    // This ensures real data matches the generated grid even if there are
    // millisecond-level differences from PostgreSQL's to_timestamp()
    const snappedData = data.map(item => ({
        ...item,
        timestamp: Math.round(item.timestamp / intervalMs) * intervalMs
    }));
    snappedData.sort((a, b) => a.timestamp - b.timestamp);

    const startMs = snappedData[0].timestamp;
    const endMs = snappedData[snappedData.length - 1].timestamp;

    // Build lookup by snapped timestamp
    const dataMap = new Map<number, any>();
    for (const item of snappedData) {
        dataMap.set(item.timestamp, item);
    }

    const filledData = [];
    for (let currentMs = startMs; currentMs <= endMs; currentMs += intervalMs) {
        if (dataMap.has(currentMs)) {
            filledData.push(dataMap.get(currentMs));
        } else {
            // Gap entry: use null for sensor values so they are excluded
            // from KPI averages and render as chart gaps instead of drops to 0
            const dateObj = new Date(currentMs);
            filledData.push({
                timestamp: currentMs,
                fullDate: dateObj.toLocaleString(),
                _isGap: true,
                _original_moisture: null,
                soil_moisture: null,
                temperature: null,
                humidity: null,
                vpd: null,
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
        manual_event_count: 0,
        water_saved_seconds: 0,
        efficiency_pct: 0
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

                    // Calculate water saved (AI typically uses less than manual)
                    const standardUsage = manualEvents * 45; // Assume 45s avg manual
                    const waterSavedSec = Math.max(0, standardUsage - aiWaterSec);
                    const efficiencyPct = totalWaterSec > 0 ? Math.round((aiWaterSec / totalWaterSec) * 100) : 0;

                    const finalData = fillMissingBuckets(mergedData, interval);

                    setStats({
                        total_waterings: totalWaterings,
                        avg_moisture: parseFloat(avgMoisture.toFixed(2)),
                        total_ml_decisions: totalAIDecisions,
                        total_water_seconds: totalWaterSec,
                        ai_water_seconds: aiWaterSec,
                        manual_water_seconds: Math.max(0, manualWaterSec),
                        manual_event_count: Math.max(0, manualEvents),
                        water_saved_seconds: waterSavedSec,
                        efficiency_pct: efficiencyPct
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

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const rangeLabel = RANGE_LABELS[timeRange] || timeRange;

    const exportToCSV = () => {
        if (!data || data.length === 0) return;
        const headers = ["Timestamp", "Full Date", "Soil Moisture (%)", "Temperature (°C)", "Humidity (%)", "VPD (kPa)", "AI Water Usage (s)", "Standard Water Usage (s)"];
        const rows = data.filter(d => !d._isGap).map(d => [
            new Date(d.timestamp).toLocaleString(),
            d.fullDate,
            d.soil_moisture != null ? d.soil_moisture.toFixed(2) : '',
            d.temperature != null ? d.temperature.toFixed(2) : '',
            d.humidity != null ? d.humidity.toFixed(2) : '',
            d.vpd != null ? d.vpd.toFixed(3) : '',
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
            // Filter out entries with null values (gap-filled buckets)
            const validEntries = payload.filter((entry: any) => entry.value !== null && entry.value !== undefined);
            if (validEntries.length === 0) return null;
            return (
                <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-white text-xs">
                    <p className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">{new Date(label).toLocaleString()}</p>
                    {validEntries.map((entry: any, index: number) => (
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

    const DistTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const total = distributionData.reduce((s, d) => s + d.count, 0);
            const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
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
                        <Badge variant="outline" className="text-indigo-600 dark:text-indigo-400 border-indigo-500/20 gap-1 font-bold">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Avg Moisture */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Leaf className="size-5 text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Moisture</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.avg_moisture}%</p>
                        <p className="text-[10px] text-slate-400 mt-1">{rangeLabel}</p>
                    </CardContent>
                </Card>

                {/* Avg Temperature */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Thermometer className="size-5 text-orange-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Temp</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                            {(() => {
                                const valid = data.filter(d => !d._isGap && d.temperature !== null && d.temperature !== undefined);
                                return valid.length > 0 ? (valid.reduce((s, d) => s + d.temperature, 0) / valid.length).toFixed(1) : '0';
                            })()}°C
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{rangeLabel}</p>
                    </CardContent>
                </Card>

                {/* Avg Humidity */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Droplet className="size-5 text-sky-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Humidity</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                            {(() => {
                                const valid = data.filter(d => !d._isGap && d.humidity !== null && d.humidity !== undefined);
                                return valid.length > 0 ? (valid.reduce((s, d) => s + d.humidity, 0) / valid.length).toFixed(1) : '0';
                            })()}%
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{rangeLabel}</p>
                    </CardContent>
                </Card>

                {/* Data Points */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <BarChart3 className="size-5 text-indigo-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Readings</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{data.filter(d => !d._isGap).length}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{rangeLabel}</p>
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
                    {/* ── Row 2 — Weather Historical Trends (full-width) ── */}
                    <Card className="shadow-sm dark:bg-card">
                        <CardHeader>
                            <CardTitle className="text-base font-bold uppercase tracking-wide dark:text-neutral-500">Weather & Soil Trends</CardTitle>
                            <CardDescription>Historical comparison of soil moisture, temperature, and humidity over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="rgba(128,128,128,0.1)" />
                                        <XAxis dataKey="timestamp" type="number" scale="time" domain={['auto', 'auto']} padding={{ left: 0, right: 0 }} tick={{ fontSize: 12 }} stroke="#a3a3a3" axisLine={false} tickLine={false} interval="preserveStartEnd" tickFormatter={formatXAxis} />
                                        <YAxis yAxisId="left" stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 'auto']} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 100]} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="soil_moisture" name="Soil Moisture (%)" stroke="#10b981" strokeWidth={2.5} dot={false} connectNulls />
                                        <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
                                        <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Row 3 — Moisture Distribution ──── */}
                    <Card className="shadow-sm dark:bg-card">
                        <CardHeader>
                            <CardTitle className="text-base font-bold uppercase tracking-wide dark:text-neutral-500">Moisture Distribution</CardTitle>
                            <CardDescription>Readings by health zone over {rangeLabel.toLowerCase()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={distributionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                                        <XAxis dataKey="range" stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                                        <YAxis stroke="#a3a3a3" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                                        <Tooltip content={<DistTooltip />} />
                                        <Bar dataKey="count" name="Readings" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                            {distributionData.map((entry, index) => (
                                                <Cell key={`dist-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    </motion.div>
            </AnimatePresence>
        </div>
    );
};
