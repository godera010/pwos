import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import {
    Leaf,
    Droplets,
    Zap,
    BarChart2,
    Clock,
    RefreshCw,
    TrendingDown,
    AlertCircle,
} from 'lucide-react';
import { api, type EfficiencySummary } from '../services/api';

// ─── Time Range Options ───────────────────────────────────────────────────────

const TIME_RANGES = [
    { label: '24 H', hours: 24 },
    { label: '7 D',  hours: 168 },
    { label: '30 D', hours: 720 },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
}

function formatTimestamp(ts: string): string {
    try {
        const d = new Date(ts);
        return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
        return ts;
    }
}

// ─── Custom Pie Label ─────────────────────────────────────────────────────────

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black" fontSize={11} fontWeight={900}>
            {(percent * 100).toFixed(0)}%
        </text>
    );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const IrrigationEfficiency: React.FC = () => {
    const [summary, setSummary] = useState<EfficiencySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedHours, setSelectedHours] = useState(168);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async (hours: number, showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        try {
            const data = await api.getEfficiencySummary(hours);
            setSummary(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch efficiency summary:', err);
            setError(err.message || 'Failed to load efficiency data. Make sure the backend server is running.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSummary(selectedHours);
    }, [fetchSummary, selectedHours]);

    // Pie data
    const pieData = summary
        ? [
            { name: 'AI Triggered', value: summary.ai_events, color: '#10b981' },
            { name: 'Manual',       value: summary.manual_events, color: '#f59e0b' },
          ].filter(d => d.value > 0)
        : [];

    // Delta bar data — last 20 events, reversed to oldest-first
    const deltaData = summary
        ? [...summary.recent_events]
            .reverse()
            .filter(e => e.moisture_delta !== null)
            .map((e, i) => ({
                name: `#${summary.recent_events.length - i}`,
                date: formatTimestamp(e.timestamp),
                delta: e.moisture_delta,
                before: e.moisture_before,
                after: e.moisture_after,
                type: e.trigger_type,
            }))
        : [];

    const kpiCards = summary
        ? [
            {
                label: 'Total Events',
                value: summary.total_events.toString(),
                sub: `${fmtDuration(summary.total_duration_seconds)} total runtime`,
                icon: Droplets,
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
            },
            {
                label: 'AI-Triggered',
                value: `${summary.ai_percentage.toFixed(1)}%`,
                sub: `${summary.ai_events} of ${summary.total_events} events`,
                icon: Zap,
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
            },
            {
                label: 'Est. Water Saved',
                value: fmtDuration(summary.estimated_water_saved_seconds),
                sub: `≈ ${summary.estimated_savings_percent.toFixed(1)}% pump time saved`,
                icon: TrendingDown,
                color: 'text-purple-500',
                bg: 'bg-purple-500/10',
            },
            {
                label: 'Avg Moisture Δ',
                value: `+${(summary.avg_moisture_after - summary.avg_moisture_before).toFixed(1)}%`,
                sub: `${summary.avg_moisture_before.toFixed(1)}% → ${summary.avg_moisture_after.toFixed(1)}%`,
                icon: BarChart2,
                color: 'text-amber-500',
                bg: 'bg-amber-500/10',
            },
        ]
        : [];

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12 px-4 md:px-0">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        Irrigation <span className="text-emerald-500">Efficiency</span>
                    </h1>
                    <p className="text-muted-foreground font-mono mt-1 uppercase text-[10px] tracking-wider">
                        Water conservation · AI vs manual irrigation performance
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Time range selector */}
                    <div className="flex items-center bg-secondary/50 border border-border rounded-xl overflow-hidden">
                        {TIME_RANGES.map(r => (
                            <button
                                key={r.hours}
                                onClick={() => setSelectedHours(r.hours)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                                    selectedHours === r.hours
                                        ? 'bg-emerald-500 text-white'
                                        : 'text-muted-foreground hover:bg-secondary'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => fetchSummary(selectedHours, true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse">
                            <CardContent className="p-5">
                                <div className="h-3 bg-secondary rounded w-2/3 mb-3" />
                                <div className="h-8 bg-secondary rounded w-1/2" />
                            </CardContent>
                        </Card>
                    ))
                ) : error ? (
                    <div className="col-span-2 lg:col-span-4 p-5 text-center text-red-500 bg-red-500/5 border border-dashed border-red-300 dark:border-red-700/50 rounded-2xl">
                        <AlertCircle className="size-8 mx-auto mb-2 opacity-80" />
                        <p className="text-xs font-black uppercase tracking-widest">Error Loading Efficiency Metrics</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{error}</p>
                    </div>
                ) : (
                    kpiCards.map(k => (
                        <Card key={k.label} className="shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500/20 transition-colors">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-1.5 rounded-lg ${k.bg}`}>
                                        <k.icon className={`size-3.5 ${k.color}`} />
                                    </div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                                </div>
                                <p className={`text-3xl font-black tracking-tight ${k.color}`}>{k.value}</p>
                                <p className="text-[9px] font-mono text-muted-foreground mt-1">{k.sub}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Pie Chart */}
                <Card className="lg:col-span-2 shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="p-4 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <Leaf className="size-4 text-emerald-500" />Trigger Share
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">AI vs manual irrigation events</p>
                    </div>
                    <CardContent className="p-4 pt-2">
                        {loading ? (
                            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">Loading…</div>
                        ) : error ? (
                            <div className="h-[220px] flex items-center justify-center text-red-500 text-xs">Failed to load chart data</div>
                        ) : pieData.length === 0 ? (
                            <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                                <Droplets className="size-8 opacity-20" />
                                <span className="font-bold uppercase text-[10px] tracking-wider">No events in period</span>
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderPieLabel}
                                        >
                                            {pieData.map(entry => (
                                                <Cell key={entry.name} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }}
                                            formatter={(v: any) => [v, 'Events']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex items-center justify-center gap-5 mt-1">
                                    {pieData.map(d => (
                                        <div key={d.name} className="flex items-center gap-1.5">
                                            <div className="size-2.5 rounded-full" style={{ background: d.color }} />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Delta Bar Chart */}
                <Card className="lg:col-span-3 shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="p-4 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <BarChart2 className="size-4 text-blue-500" />Moisture Delta
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Moisture increase per watering event (last 20 with complete readings)</p>
                    </div>
                    <CardContent className="p-4 pt-2">
                        {loading ? (
                            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">Loading…</div>
                        ) : error ? (
                            <div className="h-[220px] flex items-center justify-center text-red-500 text-xs">Failed to load chart data</div>
                        ) : deltaData.length === 0 ? (
                            <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                                <BarChart2 className="size-8 opacity-20" />
                                <span className="font-bold uppercase text-[10px] tracking-wider">No complete readings</span>
                                <span className="max-w-[200px] text-center">Events with both before/after moisture readings will appear here.</span>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={deltaData} barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 9, fill: 'currentColor', fontWeight: 700 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        unit="%"
                                        tick={{ fontSize: 9, fill: 'currentColor' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }}
                                        formatter={(value: any, name: any) => [`${value?.toFixed(2)}%`, name === 'delta' ? 'Moisture Δ' : name]}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.date ?? label}
                                    />
                                    <Bar dataKey="delta" name="delta" radius={[4, 4, 0, 0]}>
                                        {deltaData.map((entry, i) => (
                                            <Cell
                                                key={i}
                                                fill={
                                                    entry.type !== 'MANUAL'
                                                        ? '#10b981'
                                                        : '#f59e0b'
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Events Table */}
            {!loading && summary && summary.recent_events.length > 0 && (
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 pb-3 flex items-center justify-between border-b border-border">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <Clock className="size-4 text-muted-foreground" />Recent Events
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                            {summary.recent_events.length} events
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-secondary/30">
                                    {['Timestamp', 'Trigger', 'Duration', 'Before', 'After', 'Delta'].map(h => (
                                        <th key={h} className="py-2.5 px-4 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {summary.recent_events.map(e => (
                                    <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                                        <td className="py-3 px-4 text-[10px] font-mono text-muted-foreground whitespace-nowrap">{formatTimestamp(e.timestamp)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                e.trigger_type !== 'MANUAL'
                                                    ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'
                                                    : 'text-amber-600 bg-amber-500/10 border-amber-500/20'
                                            }`}>
                                                {e.trigger_type !== 'MANUAL' ? <Zap className="size-2.5 mr-1" /> : null}
                                                {e.trigger_type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-[11px] font-bold text-slate-700 dark:text-slate-300">{fmtDuration(e.duration_seconds)}</td>
                                        <td className="py-3 px-4 text-[11px] font-bold text-slate-700 dark:text-slate-300">{e.moisture_before.toFixed(1)}%</td>
                                        <td className="py-3 px-4 text-[11px] font-bold text-slate-700 dark:text-slate-300">{e.moisture_after?.toFixed(1) ?? '—'}%</td>
                                        <td className="py-3 px-4">
                                            {e.moisture_delta !== null ? (
                                                <span className={`text-[11px] font-black ${e.moisture_delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {e.moisture_delta >= 0 ? '+' : ''}{e.moisture_delta.toFixed(2)}%
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-[10px]">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};
