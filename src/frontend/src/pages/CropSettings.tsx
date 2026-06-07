import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Sprout, 
    Compass, 
    Droplets, 
    Flame, 
    ThermometerSun, 
    Check, 
    ChevronRight, 
    CloudRain, 
    Info,
    MapPin
} from 'lucide-react';
import { api } from '../services/api';
import type { SystemSettings, Crop } from '../services/api';
import { toast } from 'sonner';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Agronomic Profiles matching the backend exactly
interface CropProfile {
    id: string;
    name: string;
    scientificName: string;
    description: string;
    critical: number;
    target: number;
    high: number;
    evapMultiplier: number;
    rootDepth: string;
    transpiration: 'Very High' | 'High' | 'Moderate' | 'Low';
    iconColor: string;
    gradient: string;
    borderColorClass: string;
}

const CROP_PROFILES: CropProfile[] = [
    {
        id: 'maize',
        name: 'Maize',
        scientificName: 'Zea mays',
        description: 'Staple grain crop. Requires moderate irrigation during vegetative stages with sensitive flowering phase.',
        critical: 30,
        target: 60,
        high: 75,
        evapMultiplier: 1.0,
        rootDepth: 'Medium-Deep (60-90 cm)',
        transpiration: 'Moderate',
        iconColor: 'text-amber-500',
        gradient: 'from-amber-500/10 to-orange-500/5',
        borderColorClass: 'border-amber-500/30'
    },
    {
        id: 'lettuce',
        name: 'Lettuce',
        scientificName: 'Lactuca sativa',
        description: 'Leafy green highly sensitive to drought. Requires constantly moist upper soil to prevent bolting and bitterness.',
        critical: 50,
        target: 75,
        high: 90,
        evapMultiplier: 1.1,
        rootDepth: 'Very Shallow (15-30 cm)',
        transpiration: 'High',
        iconColor: 'text-green-500',
        gradient: 'from-green-500/10 to-emerald-600/5',
        borderColorClass: 'border-green-500/30'
    },
    {
        id: 'tomato',
        name: 'Tomato',
        scientificName: 'Solanum lycopersicum',
        description: 'Sensitive crop requiring carefully balanced moisture to prevent blossom end rot and fruit splitting.',
        critical: 35,
        target: 62,
        high: 75,
        evapMultiplier: 1.2,
        rootDepth: 'Medium (45-60 cm)',
        transpiration: 'High',
        iconColor: 'text-red-500',
        gradient: 'from-red-500/10 to-rose-600/5',
        borderColorClass: 'border-red-500/30'
    },
    {
        id: 'onion',
        name: 'Onion',
        scientificName: 'Allium cepa',
        description: 'Very shallow root system. Requires frequent light irrigation to keep soil upper layers damp but drained.',
        critical: 40,
        target: 65,
        high: 80,
        evapMultiplier: 0.8,
        rootDepth: 'Very Shallow (15-20 cm)',
        transpiration: 'Low',
        iconColor: 'text-purple-400',
        gradient: 'from-purple-400/10 to-indigo-500/5',
        borderColorClass: 'border-purple-400/30'
    },
    {
        id: 'cabbage',
        name: 'Cabbage',
        scientificName: 'Brassica oleracea',
        description: 'Heavy water feeder especially during head formation. Uneven watering causes head splitting and poor yield.',
        critical: 45,
        target: 70,
        high: 85,
        evapMultiplier: 1.2,
        rootDepth: 'Medium (45-60 cm)',
        transpiration: 'High',
        iconColor: 'text-teal-500',
        gradient: 'from-teal-500/10 to-cyan-600/5',
        borderColorClass: 'border-teal-500/30'
    }
];

const PRESETS = [
    { name: "Bulawayo (Matabeleland - Arid)", lat: -20.1492, lon: 28.5833, region: "matabeleland" },
    { name: "Harare (Mashonaland - Sub-humid)", lat: -17.8244, lon: 31.0530, region: "mashonaland" },
    { name: "Mutare (Manicaland - Humid)", lat: -18.9696, lon: 32.6318, region: "manicaland" }
];

export const CropSettings: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [dbCrops, setDbCrops] = useState<Crop[]>([]);
    const [activeDbCrop, setActiveDbCrop] = useState<Crop | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<string | null>(null);
    
    // Bounding inputs
    const [lat, setLat] = useState<number>(-20.1492);
    const [lon, setLon] = useState<number>(28.5833);

    useEffect(() => {
        loadCurrentSettings();
    }, []);

    const loadCurrentSettings = async () => {
        try {
            setLoading(true);
            const [data, cList, cActive] = await Promise.all([
                api.getSettings(),
                api.getCrops(),
                api.getActiveCrop()
            ]);
            setSettings(data);
            setDbCrops(cList);
            setActiveDbCrop(cActive);
            setLat(data.latitude);
            setLon(data.longitude);
        } catch {
            toast.error("Failed to load settings from server");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCrop = async (cropId: string) => {
        if (!settings) return;
        setSaving(cropId);
        try {
            const uiProfile = CROP_PROFILES.find(c => c.id === cropId);
            const dbCrop = dbCrops.find(c => c.name.toLowerCase() === uiProfile?.name.toLowerCase());
            
            if (dbCrop) {
                const res = await api.setActiveCrop(dbCrop.id);
                if (res.status === 'success') {
                    setActiveDbCrop(res.active_crop);
                    toast.success(`Active crop changed to ${dbCrop.name}`, {
                        description: `Model limits dynamically calibrated for ${dbCrop.name.toUpperCase()}`
                    });
                }
            } else {
                toast.error("Crop not found in database");
            }
        } catch {
            toast.error("Failed to update active crop");
        } finally {
            setSaving(null);
        }
    };

    const handleSaveCoordinates = async (customLat = lat, customLon = lon) => {
        if (!settings) return;
        setSaving('coordinates');
        try {
            const res = await api.saveSettings({
                latitude: customLat,
                longitude: customLon
            });
            if (res.status === 'success') {
                setSettings(res.settings);
                setLat(res.settings.latitude);
                setLon(res.settings.longitude);
                toast.success(`Coordinates updated successfully`, {
                    description: `Climate bound resolved to: ${res.settings.active_region.toUpperCase()}`
                });
            }
        } catch {
            toast.error("Failed to update coordinates");
        } finally {
            setSaving(null);
        }
    };

    const handleApplyPreset = (preset: typeof PRESETS[0]) => {
        setLat(preset.lat);
        setLon(preset.lon);
        handleSaveCoordinates(preset.lat, preset.lon);
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="relative size-16">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
                </div>
            </div>
        );
    }

    const activeCropId = activeDbCrop?.name.toLowerCase() || 'maize';
    const activeCrop = CROP_PROFILES.find(c => c.id === activeCropId) || CROP_PROFILES[0];
    const activeRegion = settings?.active_region || 'matabeleland';

    return (
        <div className="max-w-7xl mx-auto space-y-6 text-foreground pb-20 px-4 md:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        Crop & Climate <span className="text-emerald-500 dark:text-primary">Manager</span>
                    </h1>
                    <p className="text-muted-foreground font-mono mt-1 uppercase text-[10px] tracking-wider">
                        Configure agronomic crop boundaries and resolve georeferenced southern-hemisphere climate multipliers.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-secondary/50 border border-border p-1.5 rounded-xl">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground pl-2 font-mono font-bold">Active Selection:</span>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg text-emerald-500 font-bold text-xs">
                        <Sprout className="size-3.5" />
                        {activeCrop.name}
                    </div>
                    <div className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-lg text-sky-400 font-bold text-xs">
                        <Compass className="size-3.5" />
                        {activeRegion.toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Left: Crop Selector Grid */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl p-6 space-y-6">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                <Sprout className="text-emerald-500 size-5" />
                                Agronomic Crop Directory
                            </h2>
                            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                                Select a plant profile to dynamically load safety overrides and evapotranspiration bounds
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {CROP_PROFILES.map((crop) => {
                                const isActive = crop.id === activeCropId;
                                const isUpdating = saving === crop.id;
                                return (
                                    <motion.button
                                        whileHover={{ scale: 1.01, y: -2 }}
                                        whileTap={{ scale: 0.99 }}
                                        key={crop.id}
                                        onClick={() => handleSelectCrop(crop.id)}
                                        className={`relative text-left rounded-2xl p-5 border flex flex-col justify-between transition-all duration-300 min-h-[15rem] h-auto
                                            ${isActive 
                                                ? `bg-gradient-to-br ${crop.gradient} ${crop.borderColorClass} text-emerald-500 shadow-md shadow-emerald-500/5` 
                                                : 'bg-secondary/20 border-border hover:bg-secondary/40 text-foreground'}`}
                                    >
                                        <div className="flex justify-between items-start w-full">
                                            <div className={`p-3 rounded-xl bg-secondary/80 border border-border ${crop.iconColor}`}>
                                                <Sprout className="size-5 animate-pulse" />
                                            </div>
                                            {isActive && (
                                                <div className="bg-emerald-500 text-black p-1 rounded-full">
                                                    <Check className="size-3 stroke-[3]" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 flex-1">
                                            <h3 className="font-bold text-base flex items-baseline gap-1.5 text-foreground">
                                                {crop.name}
                                                <span className="text-[10px] italic font-normal text-muted-foreground truncate">{crop.scientificName}</span>
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                                                {crop.description}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center w-full">
                                            <div className="flex gap-3 text-[10px] uppercase tracking-wider font-bold">
                                                <span className="text-emerald-500">Target: {crop.target}%</span>
                                                <span className="text-red-500">Critical: {crop.critical}%</span>
                                            </div>
                                            {isUpdating && (
                                                <div className="size-4 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                                            )}
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* 2. Right: Climate & Geofencing Card */}
                <div className="space-y-6">
                    <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl p-6 space-y-6">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                <Compass className="text-sky-500 size-5" />
                                Geographic Coordinates
                            </h2>
                            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                                Enter Weather API coordinates to resolve climate multipliers
                            </p>
                        </div>

                        {/* Coordinates Forms */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Latitude</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                                    <input 
                                        type="number" 
                                        step="any"
                                        value={lat} 
                                        onChange={(e) => setLat(parseFloat(e.target.value))}
                                        className="w-full bg-secondary/35 border border-border h-11 pl-10 pr-3 rounded-xl font-black text-sm focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Longitude</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                                    <input 
                                        type="number" 
                                        step="any"
                                        value={lon} 
                                        onChange={(e) => setLon(parseFloat(e.target.value))}
                                        className="w-full bg-secondary/35 border border-border h-11 pl-10 pr-3 rounded-xl font-black text-sm focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={() => handleSaveCoordinates()}
                            disabled={saving === 'coordinates'}
                            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-bold h-11 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 border-none"
                        >
                            {saving === 'coordinates' ? (
                                <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Compass className="size-4" />
                                    Resolve Location & Save
                                </>
                            )}
                        </Button>

                        <hr className="border-border my-4" />

                        {/* Region Presets */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                                <Info className="size-3.5" />
                                Zimbabwe Region Presets
                            </h3>
                            <div className="flex flex-col gap-2">
                                {PRESETS.map((preset) => {
                                    const isCurrent = settings?.latitude === preset.lat && settings?.longitude === preset.lon;
                                    return (
                                        <button
                                            key={preset.name}
                                            onClick={() => handleApplyPreset(preset)}
                                            className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between text-xs transition-all duration-300
                                                ${isCurrent 
                                                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-500 font-bold' 
                                                    : 'bg-secondary/40 border-border hover:bg-secondary/70 text-foreground'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs">{preset.name}</span>
                                                <span className="text-[10px] text-muted-foreground/80 mt-0.5">Lat: {preset.lat}, Lon: {preset.lon}</span>
                                            </div>
                                            <ChevronRight className="size-4 opacity-50" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </div>

            </div>

            {/* 3. Bottom: Interactive Dynamic Calibrator Visualization */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <Droplets className="text-teal-400 size-5" />
                            Dynamic Threshold Gauge & Calibration ({activeCrop.name})
                        </h2>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                            Values shifted dynamically by Southern Hemisphere seasons (+5% Summer, -5% Winter)
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-semibold bg-secondary/50 border border-border px-4 py-2 rounded-2xl">
                        <div className="flex items-center gap-1.5">
                            <ThermometerSun className="size-3.5 text-orange-400" />
                            <span>Summer: Shift +5%</span>
                        </div>
                        <div className="w-[1px] h-3 bg-border" />
                        <div className="flex items-center gap-1.5">
                            <CloudRain className="size-3.5 text-blue-400" />
                            <span>Winter: Shift -5%</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                    
                    {/* Visual bar meter */}
                    <div className="md:col-span-3 space-y-4">
                        <div className="relative h-10 w-full bg-secondary/40 rounded-2xl overflow-hidden border border-border flex items-center">
                            
                            {/* Critical zone */}
                            <div 
                                style={{ width: `${activeCrop.critical}%` }} 
                                className="h-full bg-gradient-to-r from-red-600 to-red-500/80 flex items-center justify-center text-[10px] font-black uppercase text-white tracking-widest pl-2"
                            >
                                Danger
                            </div>

                            {/* Low zone */}
                            <div 
                                style={{ width: `${activeCrop.target - activeCrop.critical}%` }} 
                                className="h-full bg-gradient-to-r from-amber-500/80 to-teal-600/50 flex items-center justify-center text-[10px] font-black uppercase text-white tracking-widest"
                            >
                                Dry
                            </div>

                            {/* Target zone */}
                            <div 
                                style={{ width: `${activeCrop.high - activeCrop.target}%` }} 
                                className="h-full bg-gradient-to-r from-teal-500/60 to-emerald-500/80 flex items-center justify-center text-[10px] font-black uppercase text-white tracking-widest"
                            >
                                Optimal
                            </div>

                            {/* High zone */}
                            <div 
                                style={{ width: `${100 - activeCrop.high}%` }} 
                                className="h-full bg-gradient-to-r from-indigo-500/80 to-purple-600 flex items-center justify-center text-[10px] font-black uppercase text-white tracking-widest"
                            >
                                Over
                            </div>

                            {/* Dial marker indicator */}
                            <div 
                                style={{ left: `${activeCrop.target}%` }} 
                                className="absolute top-0 bottom-0 w-[3px] bg-white shadow-lg shadow-white/50 animate-pulse"
                            />
                        </div>

                        {/* Labels row */}
                        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold uppercase tracking-wider">
                            <div className="text-red-400 flex flex-col items-center">
                                <span>Critical</span>
                                <span className="text-base font-black mt-0.5">{activeCrop.critical}%</span>
                            </div>
                            <div className="text-amber-400 flex flex-col items-center">
                                <span>Dry Trigger</span>
                                <span className="text-base font-black mt-0.5">{activeCrop.critical + 5}%</span>
                            </div>
                            <div className="text-emerald-400 flex flex-col items-center">
                                <span>Optimal Target</span>
                                <span className="text-base font-black mt-0.5">{activeCrop.target}%</span>
                            </div>
                            <div className="text-indigo-400 flex flex-col items-center">
                                <span>Saturation</span>
                                <span className="text-base font-black mt-0.5">{activeCrop.high}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Evaporative multiplier card */}
                    <div className="bg-secondary/35 border border-border rounded-xl p-5 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Evaporative Drag</span>
                            <Flame className="size-4 text-orange-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-foreground flex items-baseline gap-1.5">
                                {(activeCrop.evapMultiplier * (activeRegion === 'matabeleland' ? 1.5 : activeRegion === 'manicaland' ? 0.6 : 1.0)).toFixed(2)}x
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">factor</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed mt-1.5">
                                Combined scaling based on crop transpiration ({activeCrop.transpiration}) and georeferenced climate zone ({activeRegion.toUpperCase()}: {activeRegion === 'matabeleland' ? '1.5x' : activeRegion === 'manicaland' ? '0.6x' : '1.0x'}).
                            </p>
                        </div>
                    </div>

                </div>
            </Card>
        </div>
    );
};
