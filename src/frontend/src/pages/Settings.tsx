import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from '../services/api';
import { toast } from 'sonner';
import {
    Droplets,
    Thermometer,
    Timer,
    MapPin,
    Globe,
    Save,
    Cloud,
    Sliders,
    ShieldCheck,
    Info
} from 'lucide-react';

export const Settings: React.FC = () => {
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        moistureMin: 25,
        moistureMax: 75,
        tempMin: 5,
        tempMax: 32,
        maxDuration: 45,
        latitude: -20.1492,
        longitude: 28.5833
    });

    useEffect(() => {
        api.getSettings().then(data => {
            if (data) {
                setSettings(prev => ({
                    ...prev,
                    moistureMin: data.moisture_threshold ?? prev.moistureMin,
                    moistureMax: data.moisture_max ?? prev.moistureMax,
                    tempMin: data.temp_min ?? prev.tempMin,
                    tempMax: data.temp_max ?? prev.tempMax,
                    maxDuration: data.max_duration ?? prev.maxDuration,
                    latitude: data.latitude ?? prev.latitude,
                    longitude: data.longitude ?? prev.longitude,
                }));
            }
        }).catch(console.error);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.saveSettings({
                moisture_threshold: settings.moistureMin,
                moisture_max: settings.moistureMax,
                temp_min: settings.tempMin,
                temp_max: settings.tempMax,
                max_duration: settings.maxDuration,
                latitude: settings.latitude,
                longitude: settings.longitude
            });
            toast.success('Settings Saved', {
                description: 'Configuration updated successfully.',
            });
        } catch {
            toast.error('Save Failed', {
                description: 'Could not save settings.',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        System Settings
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 gap-1">
                            <Sliders className="size-3" /> Configure
                        </Badge>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Configure thresholds, weather location, and system parameters.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Soil Moisture Thresholds */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Droplets className="size-4 text-blue-500" /> Soil Moisture Thresholds
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Min (Trigger)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={settings.moistureMin}
                                        onChange={e => setSettings(s => ({ ...s, moistureMin: Number(e.target.value) }))}
                                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center"
                                    />
                                    <span className="text-sm text-slate-400">%</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max (Target)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={settings.moistureMax}
                                        onChange={e => setSettings(s => ({ ...s, moistureMax: Number(e.target.value) }))}
                                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center"
                                    />
                                    <span className="text-sm text-slate-400">%</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-blue-50/50 dark:bg-blue-500/5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                            <Info className="size-4 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-700 dark:text-blue-400">
                                System triggers watering when moisture drops below {settings.moistureMin}% and stops at {settings.moistureMax}%.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Temperature Guard Rails */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-orange-500 to-red-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Thermometer className="size-4 text-orange-500" /> Temperature Limits
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Min °C</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={settings.tempMin}
                                        onChange={e => setSettings(s => ({ ...s, tempMin: Number(e.target.value) }))}
                                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max °C</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={settings.tempMax}
                                        onChange={e => setSettings(s => ({ ...s, tempMax: Number(e.target.value) }))}
                                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-orange-50/50 dark:bg-orange-500/5 rounded-lg border border-orange-100 dark:border-orange-500/20">
                            <Info className="size-4 text-orange-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-orange-700 dark:text-orange-400">
                                High temps stall watering to minimize evaporation losses.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Pump Configuration */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Timer className="size-4 text-emerald-500" /> Pump Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max Cycle Duration</label>
                                <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm">
                                    {settings.maxDuration}s
                                </span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="120"
                                step="5"
                                value={settings.maxDuration}
                                onChange={e => setSettings(s => ({ ...s, maxDuration: Number(e.target.value) }))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <p className="text-xs text-slate-500">Safety limit for continuous pump operation.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Weather Location */}
                <Card className="shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <MapPin className="size-4 text-sky-500" /> Weather Location
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latitude</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={settings.latitude}
                                        onChange={e => setSettings(s => ({ ...s, latitude: Number(e.target.value) }))}
                                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Longitude</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={settings.longitude}
                                        onChange={e => setSettings(s => ({ ...s, longitude: Number(e.target.value) }))}
                                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-sky-50/50 dark:bg-sky-500/5 rounded-lg border border-sky-100 dark:border-sky-500/20">
                            <Globe className="size-4 text-sky-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-sky-700 dark:text-sky-400">
                                Current: Bulawayo, Zimbabwe (-20.15°, 28.58°)
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Save Button */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <ShieldCheck className="size-5" />
                        <span className="text-sm font-bold">Configuration changes are immediately applied</span>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-neutral-900 dark:bg-white text-white dark:text-slate-900 font-bold gap-2 hover:bg-neutral-800"
                    >
                        <Save className="size-4" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="shadow-none border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                        <Cloud className="size-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="font-bold text-indigo-900 dark:text-indigo-100">Weather Data Source</p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            Using OpenWeatherMap API for real-time weather and rain forecast data.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
