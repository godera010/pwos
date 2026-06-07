import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import {
    Brain,
    Cpu,
    Activity,
    GitBranch,
    Zap,
    Sprout,
    Compass,
    ChevronDown
} from 'lucide-react';
import { api, type PredictionData, type SystemSettings } from '../services/api';
import { MLDecisionLog } from '../components/MLDecisionLog';

export const MLInsights: React.FC = () => {
    const [prediction, setPrediction] = useState<PredictionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [switchingCrop, setSwitchingCrop] = useState<string | null>(null);

    const featureImportance = [
        { name: 'Soil Moisture', value: 0.339, color: '#10b981' }, 
        { name: 'Moisture (6h Roll)', value: 0.293, color: '#06b6d4' },
        { name: 'Day of Week', value: 0.113, color: '#f59e0b' },
        { name: 'Time of Day', value: 0.088, color: '#8b5cf6' },
        { name: 'Temp (6h Roll)', value: 0.086, color: '#f97316' },   
        { name: 'Moisture Δ Rate', value: 0.045, color: '#ec4899' },
        { name: 'Daytime Flag', value: 0.016, color: '#eab308' },
        { name: 'Peak Heat Flag', value: 0.008, color: '#ef4444' },
        { name: 'Critical Moisture', value: 0.004, color: '#64748b' },
        { name: 'Target Moisture', value: 0.004, color: '#14b8a6' },
    ];

    const fetchData = async () => {
        try {
            const [pred, sett] = await Promise.all([
                api.getPrediction(),
                api.getSettings()
            ]);
            setPrediction(pred);
            setSettings(sett);
        } catch (error) {
            console.error("Failed to fetch ML data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); 
        return () => clearInterval(interval);
    }, []);

    const getConfidenceColor = (score: number) => {
        if (score > 90) return 'text-emerald-500';
        if (score > 70) return 'text-amber-500';
        return 'text-red-500';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12 px-4 md:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        ML <span className="text-emerald-500 dark:text-primary">Insights</span>
                    </h1>
                    <p className="text-muted-foreground font-mono mt-1 uppercase text-[10px] tracking-wider">
                        Real-time analysis of model decision making and feature weights.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5 py-1 px-3.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                        <Brain className="size-3.5" />
                        <span>Core Intelligence</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 py-1 px-3.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm text-slate-600 border-slate-200 dark:text-slate-400 dark:border-border">
                        <GitBranch className="size-3.5" />
                        <span>v2.4.0-stable</span>
                    </div>

                    <div className="flex items-center gap-1.5 py-1 px-3.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm text-emerald-600 border-emerald-500/20 bg-emerald-500/5">
                        <Activity className="size-3.5" />
                        <span>Online</span>
                    </div>
                </div>
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
                                Active Crop: {settings.active_crop?.toUpperCase() || 'UNKNOWN'}
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
                            <span>Region: {settings.active_region?.toUpperCase() || 'UNKNOWN'}</span>
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
                                            fetchData();
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Confidence Gauge */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5">
                        <Brain className="size-32" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Live Confidence</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <div className="relative flex items-center justify-center">
                            <div className={`absolute inset-0 rounded-full animate-ping opacity-10 ${prediction ? 'bg-emerald-500' : 'bg-slate-500'}`} style={{ animationDuration: '3s' }} />

                            <div className="z-10 text-center">
                                <span className={`text-6xl font-black tracking-tighter ${getConfidenceColor(prediction?.ml_analysis.confidence || 0)}`}>
                                    {loading ? '--' : prediction?.ml_analysis.confidence}%
                                </span>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Certainty Score</p>
                            </div>
                        </div>
                        <div className="w-full mt-8 space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                                <span>Uncertain</span>
                                <span>Optimal</span>
                            </div>
                            <Progress value={prediction?.ml_analysis.confidence || 0} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                {/* Decision Logic "Glass Box" */}
                <Card className="lg:col-span-2 shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl relative z-0">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <Cpu className="size-4" />
                            Decision Logic Trace
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl border border-border bg-secondary text-foreground flex items-center justify-center font-bold text-sm">
                                1
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Input Analysis</h3>
                                <p className="text-muted-foreground text-xs">Processing 12-dimensional feature vector</p>
                            </div>
                            <div className="ml-auto">
                                <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5 text-[9px] font-bold">Success</Badge>
                            </div>
                        </div>

                        {/* Connection Line */}
                        <div className="w-0.5 h-6 bg-border ml-5" />

                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl border border-border bg-secondary text-foreground flex items-center justify-center font-bold text-sm">
                                2
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Feature Weighing</h3>
                                <p className="text-muted-foreground text-xs">Soil Moisture dominates (96.7%). Remaining features represent minor adjustments.</p>
                            </div>
                            <div className="ml-auto">
                                <Zap className="size-4 text-indigo-500 animate-pulse" />
                            </div>
                        </div>

                        <div className="w-0.5 h-6 bg-border ml-5" />

                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl border border-border bg-secondary text-foreground flex items-center justify-center font-bold text-sm">
                                3
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Final Output</h3>
                                <p className="text-muted-foreground text-xs">
                                    Recommended Action: <span className="font-black text-foreground">{prediction?.recommended_action || 'ANALYZING...'}</span>
                                </p>
                            </div>
                            <div className="ml-auto">
                                {prediction?.recommended_action === 'NOW' ? (
                                    <Badge className="bg-blue-600 text-white animate-pulse text-[9px] font-bold">DISPATCH</Badge>
                                ) : prediction?.recommended_action === 'STOP' ? (
                                    <Badge variant="destructive" className="animate-pulse text-[9px] font-bold">STOPPED</Badge>
                                ) : prediction?.recommended_action === 'STALL' ? (
                                    <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-500 text-[9px] font-bold">DELAYED</Badge>
                                ) : (
                                    <Badge variant="outline" className="border-slate-300 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 text-[9px] font-bold">STANDBY</Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Feature Importance Chart */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Feature Importance</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">Relative weight of each variable in the current decision model</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={featureImportance}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(128,128,128,0.1)" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fontSize: 11, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                                    width={100}
                                    stroke="hsl(var(--foreground))"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                    {featureImportance.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* ML Decision History Row */}
            <div className="grid grid-cols-1 gap-6">
                <MLDecisionLog limit={10} />
            </div>
        </div>
    );
};
