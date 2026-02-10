import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    Line
} from 'recharts';
import {
    Calendar,
    Download,
    TrendingUp,
    Droplets,
    Leaf,
    BarChart3
} from 'lucide-react';
import { api } from '../services/api';

// Mock data generator for historical views if API returns limited data
const generateMockHistory = (points: number) => {
    const data = [];
    const now = new Date();
    for (let i = points; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 3600000); // Hourly points
        data.push({
            timestamp: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: t.toISOString(),
            soil_moisture: 40 + Math.random() * 40,
            temperature: 20 + Math.random() * 10,
            humidity: 30 + Math.random() * 50,
            vpd: 0.5 + Math.random() * 1.5,
            water_usage_ai: Math.random() > 0.8 ? 5 : 0,
            water_usage_standard: Math.random() > 0.7 ? 15 : 0,
        });
    }
    return data;
};

export const Analytics: React.FC = () => {
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
    const [data, setData] = useState<any[]>([]);
    const [stats] = useState({
        totalWaterSaved: 1240,
        avgMoisture: 62,
        aiAccuracy: 94.5
    });

    useEffect(() => {
        // practical mock for UI development
        setData(generateMockHistory(24));
        try {
            // Attempt to pre-fetch real history if available
            api.getHistory(50).then(h => {
                if (h && h.length > 10) {
                    console.log("Loaded real history points:", h.length);
                }
            }).catch(() => { });
        } catch (e) { console.error(e); }
    }, [timeRange]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        System Analytics
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 gap-1 font-bold">
                            <BarChart3 className="size-3" />
                            Data Insights
                        </Badge>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Deep dive into historical performance and resource efficiency.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 mr-2">
                        {(['24h', '7d', '30d'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeRange === range
                                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Calendar className="size-4 text-slate-500" />
                        <span className="hidden sm:inline">Select Dates</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="size-4 text-slate-500" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <Droplets className="size-6 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Water Saved</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalWaterSaved}L</h3>
                                    <span className="text-xs font-bold text-emerald-500 flex items-center">
                                        +12% <TrendingUp className="size-3 ml-1" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-xl">
                                <Leaf className="size-6 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Soil Health</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.avgMoisture}%</h3>
                                    <span className="text-xs font-bold text-slate-400">Optimal Range</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-sky-500/10 rounded-xl">
                                <BarChart3 className="size-6 text-sky-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Accuracy</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.aiAccuracy}%</h3>
                                    <span className="text-xs font-bold text-emerald-500">High Confidence</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Soil & Water Correlation */}
                <Card className="border-none shadow-sm dark:bg-slate-900/50 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-bold uppercase tracking-wide text-slate-500">Soil Moisture & Irrigation Events</CardTitle>
                        <CardDescription>Correlation between moisture levels and automated watering cycles</CardDescription>
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
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tick={{ fontSize: 12 }}
                                        stroke="#94a3b8"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        stroke="#94a3b8"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12 }}
                                        unit="%"
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="#94a3b8"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12 }}
                                        unit="L"
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Legend />
                                    <Area
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="soil_moisture"
                                        name="Soil Moisture"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorMoisture)"
                                    />
                                    <Bar
                                        yAxisId="right"
                                        dataKey="water_usage_ai"
                                        name="Irrigation (L)"
                                        fill="#3b82f6"
                                        radius={[4, 4, 0, 0]}
                                        barSize={20}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Efficiency Comparison */}
                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardHeader>
                        <CardTitle className="text-base font-bold uppercase tracking-wide text-slate-500">Resource Efficiency</CardTitle>
                        <CardDescription>Comparison of AI-Optimized usage vs Standard Schedules</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                                    <XAxis dataKey="timestamp" hide />
                                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white'
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="water_usage_standard" name="Standard Usage" fill="#94a3b8" stackId="a" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="water_usage_ai" name="AI Optimized Usage" fill="#3b82f6" stackId="b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Environmental Factors */}
                <Card className="border-none shadow-sm dark:bg-slate-900/50">
                    <CardHeader>
                        <CardTitle className="text-base font-bold uppercase tracking-wide text-slate-500">VPD & Temperature Trends</CardTitle>
                        <CardDescription>Vapor Pressure Deficit analysis for plant transpiration</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                                    <XAxis dataKey="timestamp" hide />
                                    <YAxis yAxisId="left" stroke="#94a3b8" axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white'
                                        }}
                                    />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="vpd" name="VPD (kPa)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
