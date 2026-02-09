import React, { useState, useEffect } from 'react';
import { Droplets, Thermometer, Save, Sliders, Info, ShieldCheck, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Threshold {
    min: number;
    max: number;
}

export const Settings: React.FC = () => {
    const [moisture, setMoisture] = useState<Threshold>({ min: 25, max: 75 });
    const [temperature, setTemperature] = useState<Threshold>({ min: 5, max: 32 });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch('http://localhost:5000/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.soil_moisture) setMoisture(data.soil_moisture);
                if (data.temperature) setTemperature(data.temperature);
            });
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('http://localhost:5000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    soil_moisture: moisture,
                    temperature: temperature
                })
            });
            if (res.ok) {
                // We could use a toast here if we had one
                console.log("Settings synced");
            }
        } catch {
            console.error("Sync Error");
        } finally {
            setTimeout(() => setIsSaving(false), 800);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                        <Sliders className="size-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">System Configuration</h1>
                        <p className="text-slate-500 text-sm font-medium italic">Fine-tune ML thresholds and environmental guard rails.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Soil Moisture Thresholds */}
                <Card className="border-none shadow-sm dark:bg-slate-900/50 overflow-hidden">
                    <div className="h-1.5 w-full bg-blue-500" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Droplets className="size-4 text-blue-500" />
                                Soil Moisture (%)
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] font-black uppercase text-blue-500 border-blue-500/20">Critical Unit</Badge>
                        </div>
                        <CardDescription>Determine trigger points for pump activation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Min (Trigger)</label>
                                <input
                                    type="number"
                                    value={moisture.min}
                                    onChange={e => setMoisture({ ...moisture, min: Number(e.target.value) })}
                                    className="w-full h-12 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 font-black transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Max (Target)</label>
                                <input
                                    type="number"
                                    value={moisture.max}
                                    onChange={e => setMoisture({ ...moisture, max: Number(e.target.value) })}
                                    className="w-full h-12 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 font-black transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                            <Info className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 leading-tight italic font-medium">
                                Recommended for Bulawayo sandy soil: Min 25% to prevent permanent wilting point.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Thermal Guard Rails */}
                <Card className="border-none shadow-sm dark:bg-slate-900/50 overflow-hidden">
                    <div className="h-1.5 w-full bg-orange-500" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Thermometer className="size-4 text-orange-500" />
                                Thermal Guard Rails
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] font-black uppercase text-orange-500 border-orange-500/20">Safety</Badge>
                        </div>
                        <CardDescription>Safe operating range for hardware & plants.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Operating Min</label>
                                <input
                                    type="number"
                                    value={temperature.min}
                                    onChange={e => setTemperature({ ...temperature, min: Number(e.target.value) })}
                                    className="w-full h-12 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 font-black transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Alert Max</label>
                                <input
                                    type="number"
                                    value={temperature.max}
                                    onChange={e => setTemperature({ ...temperature, max: Number(e.target.value) })}
                                    className="w-full h-12 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 font-black transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-orange-50/50 dark:bg-orange-500/5 rounded-lg border border-orange-100 dark:border-orange-500/20">
                            <Info className="size-4 text-orange-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-orange-700 dark:text-orange-400 leading-tight">
                                High temp stall: ML engine will delay watering if ambient temp exceeds 32°C to minimize Evaporative loss.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Save & Footer */}
            <div className="pt-4 space-y-4">
                <Separator className="bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 text-slate-500">
                        <ShieldCheck className="size-5 text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-tight">Configuration Sync Protocol: ACTIVE</span>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <Button
                            variant="default"
                            className="flex-1 md:w-64 bg-primary hover:bg-primary/90 h-12 font-black uppercase tracking-widest gap-2 shadow-lg shadow-emerald-500/20"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            <Save className="size-4" />
                            {isSaving ? "Synchronizing..." : "Commit Changes"}
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-sm bg-slate-900 text-white p-6">
                <div className="flex items-center gap-6">
                    <div className="size-16 rounded-3xl bg-secondary flex items-center justify-center shrink-0">
                        <Brain className="size-8 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-1">ML Model Persistence</h3>
                        <p className="text-indigo-100/70 text-sm max-w-xl italic leading-relaxed">
                            Changes to thresholds are immediately pushed to the XGBoost inference engine. The model will recalibrate its decision tree for Bulawayo-specific scenarios.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};
