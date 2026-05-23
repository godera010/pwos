import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import {
    ClipboardList,
    Brain,
    TrendingUp,
    Filter,
    RefreshCw,
    Droplets,
    CloudRain,
    AlertCircle,
    Eye,
} from 'lucide-react';
import { api, type MLDecision } from '../services/api';

// ─── Decision Config ──────────────────────────────────────────────────────────

const DECISION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
    NOW:     { label: 'WATER NOW',  color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Droplets },
    STALL:   { label: 'STALL',      color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: Eye },
    STOP:    { label: 'STOP',       color: 'text-red-500',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: AlertCircle },
    MONITOR: { label: 'MONITOR',    color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: Eye },
};

const CHART_COLORS: Record<string, string> = {
    NOW: '#10b981',
    STALL: '#f59e0b',
    STOP: '#ef4444',
    MONITOR: '#3b82f6',
};

const FILTER_OPTIONS = ['ALL', 'NOW', 'STALL', 'STOP', 'MONITOR'] as const;
type FilterOption = typeof FILTER_OPTIONS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
    try {
        const d = new Date(ts);
        return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
        return ts;
    }
}

function fmtPct(v: number | null): string {
    if (v === null || v === undefined) return '—';
    return `${(v * 100).toFixed(1)}%`;
}

function fmtNum(v: number | null, decimals = 1): string {
    if (v === null || v === undefined) return '—';
    return v.toFixed(decimals);
}

// ─── Distribution Chart ───────────────────────────────────────────────────────

function DecisionDistributionChart({ decisions }: { decisions: MLDecision[] }) {
    const counts: Record<string, number> = { NOW: 0, STALL: 0, STOP: 0, MONITOR: 0 };
    for (const d of decisions) {
        const key = d.decision?.toUpperCase();
        if (key && key in counts) counts[key]++;
    }
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

    return (
        <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: 'currentColor' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }}
                    formatter={(value: any) => [value, 'Decisions']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.map((entry) => (
                        <Cell key={entry.name} fill={CHART_COLORS[entry.name] ?? '#64748b'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function DecisionRow({ d }: { d: MLDecision }) {
    const cfg = DECISION_CONFIG[d.decision?.toUpperCase()] ?? {
        label: d.decision,
        color: 'text-slate-400',
        bg: 'bg-secondary/50',
        border: 'border-border',
        icon: Brain,
    };
    const conf = d.confidence !== null ? d.confidence : 0;
    const confPct = (conf * 100).toFixed(0);

    return (
        <tr className="border-b border-border/50 hover:bg-secondary/30 transition-colors group">
            {/* Timestamp */}
            <td className="py-3 px-4 text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                {formatTimestamp(d.timestamp)}
            </td>

            {/* Decision badge */}
            <td className="py-3 px-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                    <cfg.icon className="size-3" />
                    {cfg.label}
                </span>
            </td>

            {/* Confidence */}
            <td className="py-3 px-4">
                <div className="flex items-center gap-2 w-24">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${confPct}%`,
                                background: conf >= 0.8 ? '#10b981' : conf >= 0.6 ? '#f59e0b' : '#ef4444',
                            }}
                        />
                    </div>
                    <span className="text-[10px] font-black font-mono text-muted-foreground w-8 text-right">{confPct}%</span>
                </div>
            </td>

            {/* Soil moisture */}
            <td className="py-3 px-4 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {fmtNum(d.soil_moisture)}%
            </td>

            {/* Temperature */}
            <td className="py-3 px-4 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {fmtNum(d.temperature)}°C
            </td>

            {/* VPD */}
            <td className="py-3 px-4 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {fmtNum(d.vpd, 2)}
            </td>

            {/* Rain forecast */}
            <td className="py-3 px-4 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {d.forecast_minutes > 0
                    ? <span className="flex items-center gap-1 text-blue-500"><CloudRain className="size-3" />{d.forecast_minutes}m</span>
                    : <span className="text-muted-foreground">—</span>}
            </td>

            {/* Reason */}
            <td className="py-3 px-4 text-[10px] text-muted-foreground max-w-[200px] truncate">
                {d.reason ?? '—'}
            </td>
        </tr>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const MLAudit: React.FC = () => {
    const [decisions, setDecisions] = useState<MLDecision[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterOption>('ALL');
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDecisions = useCallback(async (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        try {
            const data = await api.getMLDecisions(200);
            setDecisions(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch ML decisions:', err);
            setError(err.message || 'Failed to load decisions. Make sure the backend server is running.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDecisions();
        const interval = setInterval(() => fetchDecisions(), 30000);
        return () => clearInterval(interval);
    }, [fetchDecisions]);

    const filtered = filter === 'ALL' ? decisions : decisions.filter(d => d.decision?.toUpperCase() === filter);

    // Stats
    const total = decisions.length;
    const nowCount = decisions.filter(d => d.decision?.toUpperCase() === 'NOW').length;
    const avgConf = total > 0
        ? decisions.reduce((acc, d) => acc + (d.confidence ?? 0), 0) / total
        : 0;

    const stats = [
        { label: 'Total Decisions', value: total.toString(), color: 'text-slate-900 dark:text-white' },
        { label: 'Water Commands', value: nowCount.toString(), color: 'text-emerald-500' },
        { label: 'Avg Confidence', value: fmtPct(avgConf), color: 'text-blue-500' },
        { label: 'Showing', value: filtered.length.toString(), color: 'text-purple-500' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12 px-4 md:px-0">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        ML <span className="text-blue-500">Audit</span>
                    </h1>
                    <p className="text-muted-foreground font-mono mt-1 uppercase text-[10px] tracking-wider">
                        Historical decision audit trail · Last {total} predictions
                    </p>
                </div>
                <button
                    onClick={() => fetchDecisions(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stat Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(s => (
                    <Card key={s.label} className="shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <CardContent className="p-5">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground font-mono">{s.label}</p>
                            <p className={`text-3xl font-black mt-1 tracking-tight ${s.color}`}>{loading ? '—' : error ? 'ERR' : s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Chart + Filter Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Distribution Chart */}
                <Card className="lg:col-span-2 shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="p-4 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <Brain className="size-4 text-blue-500" />Decision Distribution
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Count of each decision type in loaded records</p>
                    </div>
                    <CardContent className="p-4 pt-2">
                        {loading ? (
                            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-xs">Loading...</div>
                        ) : error ? (
                            <div className="h-[180px] flex items-center justify-center text-red-500 text-xs">Failed to load distribution data.</div>
                        ) : (
                            <DecisionDistributionChart decisions={decisions} />
                        )}
                    </CardContent>
                </Card>

                {/* Filter Panel */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="p-4 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <Filter className="size-4 text-purple-500" />Filter
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Narrow by decision type</p>
                    </div>
                    <CardContent className="p-4 pt-2 flex flex-col gap-2">
                        {FILTER_OPTIONS.map(opt => {
                            const cfg = opt !== 'ALL' ? DECISION_CONFIG[opt] : null;
                            const count = opt === 'ALL' ? total : decisions.filter(d => d.decision?.toUpperCase() === opt).length;
                            return (
                                <button
                                    key={opt}
                                    onClick={() => setFilter(opt)}
                                    className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border text-left transition-all text-[10px] font-black uppercase tracking-wider ${
                                        filter === opt
                                            ? cfg
                                                ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                                                : 'bg-secondary border-border text-foreground'
                                            : 'bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/60'
                                    }`}
                                >
                                    <span>{opt === 'ALL' ? 'All Decisions' : cfg?.label}</span>
                                    <Badge variant="outline" className={`text-[9px] font-mono font-black px-1.5 py-0 ${filter === opt && cfg ? `${cfg.color} ${cfg.border}` : ''}`}>
                                        {count}
                                    </Badge>
                                </button>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 pb-3 flex items-center justify-between border-b border-border">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="size-4 text-muted-foreground" />Audit Log
                    </span>
                    <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                        {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="py-20 text-center text-muted-foreground text-sm">
                            <TrendingUp className="size-8 mx-auto mb-3 opacity-30 animate-pulse" />
                            Loading audit records…
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center text-red-500 text-sm">
                            <AlertCircle className="size-10 mx-auto mb-3 opacity-80" />
                            <p className="font-bold text-xs uppercase tracking-wider">Error Fetching Decisions</p>
                            <p className="text-[10px] mt-1 max-w-xs mx-auto text-muted-foreground">
                                {error}
                            </p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground text-sm">
                            <ClipboardList className="size-10 mx-auto mb-3 opacity-20" />
                            <p className="font-bold text-xs uppercase tracking-wider">No Decisions Found</p>
                            <p className="text-[10px] mt-1 max-w-xs mx-auto">
                                {filter !== 'ALL' ? `No "${filter}" decisions in the log. Try a different filter.` : 'The ML predictor has not logged any decisions yet. Ensure the system is running in AUTO mode.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-secondary/30">
                                    {['Timestamp', 'Decision', 'Confidence', 'Moisture', 'Temp', 'VPD', 'Rain', 'Reason'].map(h => (
                                        <th key={h} className="py-2.5 px-4 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(d => <DecisionRow key={d.id} d={d} />)}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
};
