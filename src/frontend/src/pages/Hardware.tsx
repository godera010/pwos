import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle, RefreshCcw } from 'lucide-react';

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-2 glass-card p-10 rounded-[2.5rem] relative overflow-hidden dark:text-white">
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-500/30">
                            <Cpu className="size-8 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black">Node Blueprint</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">ESP32-S3 Core Hub</p>
                        </div>
                    </div>
                    <span className="flex items-center gap-2 text-[10px] font-black text-green-400 bg-green-400/10 px-4 py-2 rounded-full border border-green-400/20">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        SIMULATOR CONNECTED
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-16 relative z-10">
                    <div className="space-y-12">
                        <div className="flex items-center gap-8 group">
                            <div className="size-14 rounded-2xl border-2 border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center font-black text-xs text-primary">
                                P34
                            </div>
                            <div>
                                <p className="text-lg font-bold">Soil Moisture</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Analog • ADC1_0</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 group">
                            <div className="size-14 rounded-2xl border-2 border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center font-black text-xs text-primary">
                                P32
                            </div>
                            <div>
                                <p className="text-lg font-bold">DHT22 Sense</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Digital • Single Bus</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <div className="flex items-center gap-8 group">
                            <div className={`size-14 rounded-2xl border-2 transition-all flex items-center justify-center font-black text-xs ${pumping ? 'border-green-400 bg-green-400/20 text-green-400 shadow-[0_0_25px_rgba(74,222,128,0.5)]' : 'border-slate-700 text-slate-500'}`}>
                                P27
                            </div>
                            <div>
                                <p className="text-lg font-bold">Pump Relay</p>
                                <p className={`text-[10px] font-bold uppercase ${pumping ? 'text-green-400' : 'text-slate-500'}`}>{pumping ? 'ACTIVE' : 'IDLE'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 group">
                            <div className="size-14 rounded-2xl border-2 border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center font-black text-xs text-primary">
                                P33
                            </div>
                            <div>
                                <p className="text-lg font-bold">Rain Node</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Analog/Digital</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute -right-20 -bottom-20 size-80 bg-blue-600/5 rounded-full blur-3xl"></div>
            </div>

            <div className="space-y-6">
                <div className="glass-card p-8 rounded-[2.5rem] dark:text-white">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Quick Diagnostics</h3>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <CheckCircle className="size-5 text-green-400" />
                            <span className="text-sm font-medium">Flash: 16MB QSPI</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <CheckCircle className="size-5 text-green-400" />
                            <span className="text-sm font-medium">SRAM: 512KB Internal</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <CheckCircle className="size-5 text-green-400" />
                            <span className="text-sm font-medium">Volt: 3.3V Stable</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] shadow-xl shadow-blue-900/40 text-white">
                    <h3 className="text-xl font-black mb-2">Controller Reset</h3>
                    <p className="text-xs opacity-70 mb-8 leading-relaxed">Perform a hard reset on the simulation kernel and re-initialize peripheral hooks.</p>
                    <button
                        onClick={resetHardware}
                        className="w-full py-4 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCcw className="size-4" /> Execute Reset
                    </button>
                </div>
            </div>
        </div>
    );
};
