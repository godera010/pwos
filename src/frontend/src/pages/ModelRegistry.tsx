import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    Circle,
    RefreshCw,
    Cpu,
    GitBranch,
    Database,
    TrendingUp,
    Calendar,
    AlertCircle,
} from 'lucide-react';
import { api, type ModelVersion } from '../services/api';

// ─── Metric Gauge ─────────────────────────────────────────────────────────────

function MetricGauge({ label, value, color }: { label: string; value: number; color: string }) {
    const pct = Math.min(100, Math.max(0, value * 100));
    const strokeDasharray = 2 * Math.PI * 36; // circumference for r=36
    const strokeDashoffset = strokeDasharray * (1 - pct / 100);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative size-20">
                <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--border))" strokeWidth="7" />
                    <circle
                        cx="40" cy="40" r="36"
                        fill="none"
                        stroke={color}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base font-black text-slate-900 dark:text-white">{pct.toFixed(0)}<span className="text-[10px] text-muted-foreground">%</span></span>
                </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">{label}</span>
        </div>
    );
}

// ─── Version Row ──────────────────────────────────────────────────────────────

function VersionRow({ v, index }: { v: ModelVersion; index: number }) {
    const ts = (() => {
        try {
            return new Date(v.timestamp).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        } catch { return v.timestamp; }
    })();

    const metrics = [
        { key: 'Acc', val: v.accuracy },
        { key: 'Prec', val: v.precision },
        { key: 'Rec', val: v.recall },
        { key: 'F1', val: v.f1_score },
    ];

    return (
        <tr className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${index === 0 ? 'bg-emerald-500/3' : ''}`}>
            {/* Active */}
            <td className="py-3 px-4">
                {v.is_active
                    ? <CheckCircle2 className="size-4 text-emerald-500" />
                    : <Circle className="size-4 text-muted-foreground/30" />}
            </td>
            {/* Version */}
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{v.version_tag}</span>
                    {v.is_active && (
                        <Badge className="text-[8px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black">ACTIVE</Badge>
                    )}
                </div>
            </td>
            {/* Timestamp */}
            <td className="py-3 px-4 text-[10px] font-mono text-muted-foreground whitespace-nowrap">{ts}</td>
            {/* Metrics */}
            {metrics.map(m => (
                <td key={m.key} className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden w-12">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${(m.val * 100).toFixed(0)}%`,
                                    background: m.val >= 0.85 ? '#10b981' : m.val >= 0.7 ? '#f59e0b' : '#ef4444',
                                }}
                            />
                        </div>
                        <span className="text-[10px] font-black font-mono text-muted-foreground w-8 text-right">{(m.val * 100).toFixed(1)}%</span>
                    </div>
                </td>
            ))}
            {/* Samples */}
            <td className="py-3 px-4 text-[11px] font-bold font-mono text-muted-foreground">
                {v.training_samples?.toLocaleString() ?? '—'}
            </td>
            {/* Path */}
            <td className="py-3 px-4 text-[9px] font-mono text-muted-foreground/60 max-w-[140px] truncate" title={v.model_path}>
                {v.model_path ? v.model_path.split(/[\\/]/).pop() : '—'}
            </td>
        </tr>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const ModelRegistry: React.FC = () => {
    const [versions, setVersions] = useState<ModelVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVersions = useCallback(async (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        try {
            const data = await api.getModelVersions();
            setVersions(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch model versions:', err);
            setError(err.message || 'Failed to load model registry. Make sure the backend server is running.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchVersions();
    }, [fetchVersions]);

    const active = versions.find(v => v.is_active) ?? versions[0] ?? null;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12 px-4 md:px-0">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        Model <span className="text-purple-500">Registry</span>
                    </h1>
                    <p className="text-muted-foreground font-mono mt-1 uppercase text-[10px] tracking-wider">
                        Trained model version history · {versions.length} version{versions.length !== 1 ? 's' : ''} recorded
                    </p>
                </div>
                <button
                    onClick={() => fetchVersions(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Active model hero card */}
            {loading ? (
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <CardContent className="py-16 text-center text-muted-foreground text-sm">
                        <Cpu className="size-8 mx-auto mb-3 opacity-30 animate-pulse" />
                        Loading registry…
                    </CardContent>
                </Card>
            ) : error ? (
                <Card className="shadow-none border border-dashed border-red-300 dark:border-red-700/50 rounded-2xl bg-red-50/5">
                    <CardContent className="py-16 text-center text-red-500">
                        <AlertCircle className="size-12 mx-auto mb-4 opacity-80" />
                        <p className="text-xs font-black uppercase tracking-widest">Error Loading Registry</p>
                        <p className="text-[10px] text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                            {error}
                        </p>
                    </CardContent>
                </Card>
            ) : active ? (
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 pb-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <Cpu className="size-4 text-emerald-500" />
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Active Model</span>
                                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                                    {active.version_tag}
                                </p>
                            </div>
                        </div>
                        <Badge className="text-[9px] px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black uppercase tracking-wider rounded-full">
                            <CheckCircle2 className="size-3 mr-1" />ACTIVE
                        </Badge>
                    </div>
                    <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row items-center gap-8">
                            {/* Gauges */}
                            <div className="flex items-center gap-6">
                                <MetricGauge label="Accuracy"  value={active.accuracy}  color="#10b981" />
                                <MetricGauge label="Precision" value={active.precision} color="#3b82f6" />
                                <MetricGauge label="Recall"    value={active.recall}    color="#a855f7" />
                                <MetricGauge label="F1 Score"  value={active.f1_score}  color="#f59e0b" />
                            </div>

                            {/* Divider */}
                            <div className="hidden lg:block h-32 w-px bg-border" />

                            {/* Meta */}
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Training Samples</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{active.training_samples?.toLocaleString() ?? '—'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Trained On</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white font-mono">
                                        {(() => { try { return new Date(active.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; } })()}
                                    </p>
                                </div>
                                <div className="col-span-2 space-y-0.5">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Model Path</p>
                                    <p className="text-[10px] font-mono text-muted-foreground truncate">{active.model_path ?? '—'}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="shadow-none border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                    <CardContent className="py-16 text-center">
                        <Cpu className="size-12 mx-auto mb-4 text-muted-foreground/20 animate-pulse" />
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No Models Registered</p>
                        <p className="text-[10px] text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                            Model versions are logged when the ML predictor is trained. Run the training pipeline to populate this registry.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* History Table */}
            {versions.length > 0 && (
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 pb-3 flex items-center justify-between border-b border-border">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <GitBranch className="size-4 text-muted-foreground" />Version History
                        </span>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
                                <Database className="size-3" />
                                <Calendar className="size-3" />
                                model_versions
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-secondary/30">
                                    {['', 'Version', 'Timestamp', 'Accuracy', 'Precision', 'Recall', 'F1', 'Samples', 'Model File'].map(h => (
                                        <th key={h} className="py-2.5 px-4 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {versions.map((v, i) => <VersionRow key={v.id} v={v} index={i} />)}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Info footer */}
            <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/50 uppercase tracking-wider">
                <TrendingUp className="size-3" />
                Model versions are auto-logged by the ML predictor on each training run via{' '}
                <code className="bg-secondary/80 px-1.5 py-0.5 rounded text-[8px]">db.log_model_version()</code>
            </div>
        </div>
    );
};
