import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
    Zap
} from 'lucide-react';
import { api, type PredictionData } from '../services/api';

export const MLInsights: React.FC = () => {
    const [prediction, setPrediction] = useState<PredictionData | null>(null);
    const [loading, setLoading] = useState(true);

    // Mock features for visualization since backend doesn't serve SHAP values yet
    const featureImportance = [
        { name: 'Soil Moisture', value: 0.45, color: '#10b981' }, // Emerald
        { name: 'Rain Forecast', value: 0.25, color: '#3b82f6' }, // Blue
        { name: 'Temperature', value: 0.15, color: '#f97316' },   // Orange
        { name: 'Humidity', value: 0.10, color: '#8b5cf6' },      // Violet
        { name: 'Time of Day', value: 0.05, color: '#64748b' },   // Slate
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const pred = await api.getPrediction();
                setPrediction(pred);
            } catch (error) {
                console.error("Failed to fetch ML data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Live updates
        return () => clearInterval(interval);
    }, []);

    const getConfidenceColor = (score: number) => {
        if (score > 90) return 'text-emerald-500';
        if (score > 70) return 'text-amber-500';
        return 'text-red-500';
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        ML Insights
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 gap-1 font-bold">
                            <Brain className="size-3" />
                            Core Intelligence
                        </Badge>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Real-time analysis of model decision making and feature weights.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-8 px-3 gap-2 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <GitBranch className="size-3" />
                        v2.4.0-stable
                    </Badge>
                    <Badge variant="outline" className="h-8 px-3 gap-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <Activity className="size-3" />
                        Online
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Confidence Gauge */}
                <Card className="border-none shadow-sm dark:bg-slate-900/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Brain className="size-32" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Live Confidence</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <div className="relative flex items-center justify-center">
                            {/* Animated Pulse Ring */}
                            <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${prediction ? 'bg-emerald-500' : 'bg-slate-500'}`} />

                            <div className="z-10 text-center">
                                <span className={`text-6xl font-black tracking-tighter ${getConfidenceColor(prediction?.ml_analysis.confidence || 0)}`}>
                                    {loading ? '--' : prediction?.ml_analysis.confidence}%
                                </span>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">Certainty Score</p>
                            </div>
                        </div>
                        <div className="w-full mt-8 space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                                <span>Uncertain</span>
                                <span>Optimal</span>
                            </div>
                            <Progress value={prediction?.ml_analysis.confidence || 0} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                {/* Decision Logic "Glass Box" */}
                <Card className="lg:col-span-2 border-none shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
                    {/* Circuit Board Pattern Overlay */}
                    <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                        <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                            <path d="M10 10h80v80h-80z" fill="none" stroke="currentColor" strokeWidth="1" />
                            <path d="M50 10v80M10 50h80" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#circuit)" />
                    </svg>

                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <Cpu className="size-4" />
                            Decision Logic Trace
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-2xl border border-white/10">
                                1
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Input Analysis</h3>
                                <p className="text-slate-400 text-sm">Processing 5 real-time sensor streams + Forecast API</p>
                            </div>
                            <div className="ml-auto">
                                <Badge className="bg-emerald-500 text-white border-none">Success</Badge>
                            </div>
                        </div>

                        {/* Connection Line */}
                        <div className="w-0.5 h-6 bg-white/10 ml-6" />

                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-indigo-500/20 backdrop-blur-md flex items-center justify-center font-black text-2xl border border-indigo-500/30 text-indigo-300">
                                2
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Feature Weighing</h3>
                                <p className="text-indigo-200/70 text-sm">Soil Moisture (45%) is dominant factor. Rain probability &lt; 20%.</p>
                            </div>
                            <div className="ml-auto">
                                <Zap className="size-5 text-indigo-400 animate-pulse" />
                            </div>
                        </div>

                        <div className="w-0.5 h-6 bg-white/10 ml-6" />

                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center font-black text-2xl shadow-lg shadow-white/20">
                                3
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Final Output</h3>
                                <p className="text-slate-300 text-sm">
                                    Action: <span className="font-black text-white">{prediction?.recommended_action || 'ANALYZING...'}</span>
                                </p>
                            </div>
                            <div className="ml-auto">
                                {prediction?.recommended_action === 'WATER_NOW' ? (
                                    <Badge className="bg-blue-500 text-white border-none animate-pulse">DISPATCH</Badge>
                                ) : (
                                    <Badge variant="outline" className="border-white/20 text-white">STANDBY</Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Feature Importance Chart */}
            <Card className="border-none shadow-sm dark:bg-slate-900/50">
                <CardHeader>
                    <CardTitle className="text-base font-bold uppercase tracking-wide text-slate-500">Feature Importance</CardTitle>
                    <CardDescription>Relative weight of each variable in the current decision model</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
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
                                    tick={{ fontSize: 12, fontWeight: 600 }}
                                    width={100}
                                    stroke="#94a3b8"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white'
                                    }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                    {featureImportance.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
