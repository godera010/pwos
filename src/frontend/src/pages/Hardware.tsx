import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Hardware: React.FC = () => {
    const [pumping, setPumping] = useState(false);

    useEffect(() => {
        const checkStatus = () => {
            fetch('http://localhost:5000/api/predict-next-watering')
                .then(res => res.json())
                .then(data => setPumping(data.system_status === 'PUMPING'));
        };
        checkStatus();
        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const resetHardware = () => {
        if (confirm("Confirm hardware controller reset?")) {
            alert("Resetting simulation core...");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        Hardware Node
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 font-bold">
                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Simulator Connected
                        </Badge>
                    </h1>
                    <p className="text-slate-950 dark:text-slate-400 text-sm font-medium">
                        Blueprint and real-time pinout status for the ESP32-S3 Core Hub.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2  shadow-sm dark:bg-card relative overflow-hidden">
                    <CardHeader className="pb-8">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20">
                                <Cpu className="size-8 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black italic">Node Blueprint</CardTitle>
                                <p className="text-[10px] text-slate-950 dark:text-slate-400 uppercase tracking-widest font-bold">ESP32-S3 Core Hub • Rev 2.0</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-12 relative z-10 pb-12">
                        <div className="space-y-10">
                            <div className="flex items-center gap-6 group">
                                <div className="size-14 rounded-2xl border-2 border-primary bg-primary/10 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center font-black text-xs text-primary">
                                    P34
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">Soil Moisture</p>
                                    <p className="text-[10px] text-slate-950 dark:text-slate-400 font-bold uppercase tracking-tighter">Analog • ADC1_0</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 group">
                                <div className="size-14 rounded-2xl border-2 border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)] flex items-center justify-center font-black text-xs text-indigo-500">
                                    P32
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">DHT22 Sense</p>
                                    <p className="text-[10px] text-slate-950 dark:text-slate-400 font-bold uppercase tracking-tighter">Digital • Single Bus</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="flex items-center gap-6 group">
                                <div className={`size-14 rounded-2xl border-2 transition-all flex items-center justify-center font-black text-xs ${pumping ? 'border-primary bg-primary/20 text-primary shadow-[0_0_25px_rgba(16,185,129,0.3)]' : 'border-slate-200 dark:border-border text-slate-800'}`}>
                                    P27
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">Pump Relay</p>
                                    <p className={`text-[10px] font-bold uppercase tracking-tighter ${pumping ? 'text-primary' : 'text-slate-800'}`}>{pumping ? 'ACTIVE' : 'IDLE'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 group">
                                <div className="size-14 rounded-2xl border-2 border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)] flex items-center justify-center font-black text-xs text-indigo-500">
                                    P33
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">Rain Node</p>
                                    <p className="text-[10px] text-slate-950 dark:text-slate-400 font-bold uppercase tracking-tighter">Analog/Digital</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <div className="absolute -right-20 -bottom-20 size-80 bg-primary/5 rounded-full blur-3xl"></div>
                </Card>

                <div className="space-y-6">
                    <Card className=" shadow-sm dark:bg-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-[10px] font-black text-slate-950 dark:text-slate-400 uppercase tracking-widest">Quick Diagnostics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { label: 'Flash: 16MB QSPI', icon: CheckCircle },
                                { label: 'SRAM: 512KB Internal', icon: CheckCircle },
                                { label: 'Volt: 3.3V Stable', icon: CheckCircle }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <item.icon className="size-4 text-primary" />
                                    <span className="text-sm font-bold text-slate-900 dark:text-neutral-300">{item.label}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card className=" shadow-sm bg-gradient-to-br from-primary to-emerald-800 text-white overflow-hidden">
                        <CardContent className="p-8 space-y-4">
                            <div className="space-y-2">
                                <h3 className="text-xl font-black tracking-tight">Controller Reset</h3>
                                <p className="text-xs text-white/70 leading-relaxed">
                                    Perform a hard reset on the simulation kernel and re-initialize peripheral hooks.
                                </p>
                            </div>
                            <Button
                                onClick={resetHardware}
                                className="w-full bg-white text-primary hover:bg-slate-50 font-black text-xs uppercase tracking-widest h-12 gap-2 shadow-xl shadow-black/20"
                            >
                                <RefreshCcw className="size-4" /> Execute Reset
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
