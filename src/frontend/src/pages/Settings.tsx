import React, { useState, useEffect } from 'react';
import { Droplets, Thermometer, ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Threshold {
    min: number;
    max: number;
}

export const Settings: React.FC = () => {
    const navigate = useNavigate();
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
            if (res.ok) alert("✅ Settings synchronized with P-WOS Core");
        } catch {
            alert("❌ Sync Error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tight mb-2">Sensor Thresholds</h2>
                    <p className="text-slate-400">Configure trigger points for the ML model and safety guard rails.</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="glass-card p-8 rounded-3xl dark:text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <Droplets className="size-6 text-blue-400" />
                        <h3 className="text-xl font-bold">Soil Moisture (%)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Min Threshold</label>
                            <input
                                type="number"
                                value={moisture.min}
                                onChange={e => setMoisture({ ...moisture, min: Number(e.target.value) })}
                                className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary transition-all font-bold text-lg"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Max Threshold</label>
                            <input
                                type="number"
                                value={moisture.max}
                                onChange={e => setMoisture({ ...moisture, max: Number(e.target.value) })}
                                className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary transition-all font-bold text-lg"
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-8 rounded-3xl dark:text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <Thermometer className="size-6 text-orange-400" />
                        <h3 className="text-xl font-bold">Ambient Temperature (°C)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Min Operating</label>
                            <input
                                type="number"
                                value={temperature.min}
                                onChange={e => setTemperature({ ...temperature, min: Number(e.target.value) })}
                                className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-500 transition-all font-bold text-lg"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alert Max</label>
                            <input
                                type="number"
                                value={temperature.max}
                                onChange={e => setTemperature({ ...temperature, max: Number(e.target.value) })}
                                className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-orange-500 transition-all font-bold text-lg"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-10">
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 py-4 glass-card rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all dark:text-white"
                    >
                        <ArrowLeft className="size-4" /> Back to Dashboard
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Save className="size-4" /> {isSaving ? 'Synchronizing...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
};
