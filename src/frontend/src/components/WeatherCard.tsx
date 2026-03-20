import React, { useEffect, useState } from 'react';
import type { WeatherForecast } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Cloud,
    CloudRain,
    CloudLightning,
    CloudSnow,
    CloudFog,
    Sun,
    Moon,
    Wind,
    Droplets,
    Umbrella
} from 'lucide-react';

// ============================================================================
// WEATHER CONDITION → VISUAL MAPPING
// ============================================================================

interface WeatherVisuals {
    icon: React.ElementType;
    gradient: string;
    orbBg: string;
    orbShadow: string;
}

const WEATHER_MAP: Record<string, { day: WeatherVisuals; night: WeatherVisuals }> = {
    clear: {
        day: {
            icon: Sun,
            gradient: 'from-sky-400 via-blue-500 to-amber-400',
            orbBg: 'bg-amber-400',
            orbShadow: 'shadow-[0_0_50px_rgba(251,191,36,0.7)]',
        },
        night: {
            icon: Cloud,
            gradient: 'from-slate-900 via-indigo-950 to-slate-800',
            orbBg: 'bg-slate-600',
            orbShadow: 'shadow-[0_0_30px_rgba(100,116,139,0.5)]',
        },
    },
    clouds: {
        day: {
            icon: Cloud,
            gradient: 'from-slate-400 via-blue-400 to-gray-500',
            orbBg: 'bg-gray-300',
            orbShadow: 'shadow-[0_0_30px_rgba(203,213,225,0.5)]',
        },
        night: {
            icon: Cloud,
            gradient: 'from-slate-700 via-slate-800 to-gray-900',
            orbBg: 'bg-slate-500',
            orbShadow: 'shadow-[0_0_25px_rgba(71,85,105,0.5)]',
        },
    },
    rain: {
        day: {
            icon: CloudRain,
            gradient: 'from-slate-500 via-blue-600 to-indigo-700',
            orbBg: 'bg-blue-500',
            orbShadow: 'shadow-[0_0_35px_rgba(59,130,246,0.6)]',
        },
        night: {
            icon: CloudRain,
            gradient: 'from-slate-800 via-blue-900 to-indigo-950',
            orbBg: 'bg-blue-700',
            orbShadow: 'shadow-[0_0_30px_rgba(30,64,175,0.6)]',
        },
    },
    drizzle: {
        day: {
            icon: CloudRain,
            gradient: 'from-slate-400 via-blue-500 to-cyan-600',
            orbBg: 'bg-cyan-400',
            orbShadow: 'shadow-[0_0_30px_rgba(34,211,238,0.5)]',
        },
        night: {
            icon: CloudRain,
            gradient: 'from-slate-600 via-blue-800 to-cyan-950',
            orbBg: 'bg-cyan-600',
            orbShadow: 'shadow-[0_0_25px_rgba(22,78,99,0.6)]',
        },
    },
    thunderstorm: {
        day: {
            icon: CloudLightning,
            gradient: 'from-gray-600 via-purple-700 to-slate-800',
            orbBg: 'bg-purple-500',
            orbShadow: 'shadow-[0_0_40px_rgba(168,85,247,0.7)]',
        },
        night: {
            icon: CloudLightning,
            gradient: 'from-slate-900 via-purple-950 to-gray-950',
            orbBg: 'bg-purple-700',
            orbShadow: 'shadow-[0_0_35px_rgba(126,34,206,0.7)]',
        },
    },
    snow: {
        day: {
            icon: CloudSnow,
            gradient: 'from-blue-200 via-cyan-300 to-blue-400',
            orbBg: 'bg-white',
            orbShadow: 'shadow-[0_0_30px_rgba(255,255,255,0.8)]',
        },
        night: {
            icon: CloudSnow,
            gradient: 'from-slate-700 via-blue-800 to-indigo-900',
            orbBg: 'bg-blue-200',
            orbShadow: 'shadow-[0_0_25px_rgba(191,219,254,0.6)]',
        },
    },
    mist: {
        day: {
            icon: CloudFog,
            gradient: 'from-gray-300 via-slate-400 to-gray-500',
            orbBg: 'bg-gray-200',
            orbShadow: 'shadow-[0_0_20px_rgba(226,232,240,0.5)]',
        },
        night: {
            icon: CloudFog,
            gradient: 'from-slate-600 via-gray-700 to-slate-800',
            orbBg: 'bg-gray-400',
            orbShadow: 'shadow-[0_0_20px_rgba(156,163,175,0.4)]',
        },
    },
    fog: {
        day: {
            icon: CloudFog,
            gradient: 'from-gray-300 via-slate-400 to-gray-500',
            orbBg: 'bg-gray-200',
            orbShadow: 'shadow-[0_0_20px_rgba(226,232,240,0.5)]',
        },
        night: {
            icon: CloudFog,
            gradient: 'from-slate-600 via-gray-700 to-slate-800',
            orbBg: 'bg-gray-400',
            orbShadow: 'shadow-[0_0_20px_rgba(156,163,175,0.4)]',
        },
    },
    haze: {
        day: {
            icon: CloudFog,
            gradient: 'from-amber-300 via-orange-400 to-yellow-500',
            orbBg: 'bg-orange-300',
            orbShadow: 'shadow-[0_0_25px_rgba(251,146,60,0.5)]',
        },
        night: {
            icon: CloudFog,
            gradient: 'from-amber-900 via-orange-950 to-yellow-950',
            orbBg: 'bg-orange-600',
            orbShadow: 'shadow-[0_0_20px_rgba(194,65,12,0.5)]',
        },
    },
};

const DEFAULT_VISUALS: WeatherVisuals = {
    icon: Sun,
    gradient: 'from-sky-400 to-indigo-500',
    orbBg: 'bg-yellow-400',
    orbShadow: 'shadow-[0_0_40px_rgba(250,204,21,0.6)]',
};

function isDaytime(): boolean {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
}

function getVisuals(condition: string | undefined): WeatherVisuals {
    if (!condition) return DEFAULT_VISUALS;
    const key = condition.toLowerCase();
    const weatherData = WEATHER_MAP[key];
    if (!weatherData) return DEFAULT_VISUALS;
    return isDaytime() ? weatherData.day : weatherData.night;
}

// ============================================================================
// ANIMATED EFFECTS
// ============================================================================

const RainDrops = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
            <div
                key={i}
                className="absolute w-0.5 bg-gradient-to-b from-transparent via-blue-300/50 to-blue-200/70 rounded-full animate-rain"
                style={{
                    left: `${8 + (i * 8)}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${0.6 + Math.random() * 0.4}s`,
                    height: '20px',
                }}
            />
        ))}
    </div>
);

const LightningFlash = () => {
    const [flash, setFlash] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => {
            setFlash(true);
            setTimeout(() => setFlash(false), 100);
        }, 4000 + Math.random() * 3000);
        return () => clearInterval(interval);
    }, []);
    return flash ? <div className="absolute inset-0 bg-white/30 animate-flash" /> : null;
};

const SnowFlakes = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
            <div
                key={i}
                className="absolute w-1.5 h-1.5 bg-white rounded-full animate-snow"
                style={{
                    left: `${5 + (i * 6.5)}%`,
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                    opacity: 0.6 + Math.random() * 0.4,
                }}
            />
        ))}
    </div>
);

// ============================================================================
// COMPONENT
// ============================================================================

interface WeatherCardProps {
    weather: WeatherForecast | null;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather }) => {
    const visuals = getVisuals(weather?.condition);
    const IconComponent = visuals.icon;
    const isDay = isDaytime();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const condition = weather?.condition?.toLowerCase() || 'clear';
    const isRainy = ['rain', 'drizzle', 'thunderstorm'].includes(condition);
    const isSnowy = condition === 'snow';
    const isStormy = condition === 'thunderstorm';

    return (
        <Card className={`shadow-none border-0 overflow-hidden bg-gradient-to-br ${visuals.gradient} relative h-full`}>
            {/* Animated Weather Effects */}
            {isRainy && <RainDrops />}
            {isSnowy && <SnowFlakes />}
            {isStormy && <LightningFlash />}

            {/* Pulsing Glow Behind Orb */}
            <div className={`absolute top-1/3 left-[120px] -translate-y-1/2 w-28 h-28 ${visuals.orbBg} blur-3xl opacity-40 animate-pulse`} />

            <CardContent className="relative z-10 flex flex-col h-full p-4">
                {/* Header as part of flex layout */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Cloud className="size-4 text-white/80 animate-float" />
                        <span className="text-sm font-bold uppercase tracking-wider text-white/90">Bulawayo</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/70 animate-pulse">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-white/60">{isDay ? 'DAY' : 'NIGHT'}</span>
                            {isDay ? <Sun className="size-3 text-amber-300 animate-spin-slow" /> : <Moon className="size-3 text-slate-300" />}
                        </div>
                    </div>
                </div>

                {weather ? (
                    <div className="flex flex-col flex-1">
                        {/* Top Section - 75% */}
                        <div className="flex items-center justify-between flex-[3]">
                            <div className="flex items-center gap-6">
                                <div className={`relative size-20 ${visuals.orbBg} ${visuals.orbShadow} rounded-full flex items-center justify-center animate-breathe`}>
                                    <IconComponent className={`size-10 text-white ${isRainy ? 'animate-bounce' : ''}`} />
                                    {isRainy && (
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className="w-0.5 h-2 bg-blue-200/80 rounded-full animate-rain-drop" style={{ animationDelay: `${i * 0.2}s` }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-5xl font-black tracking-tighter text-white drop-shadow-md animate-live-temp">
                                        {weather.temperature.toFixed(1)}°
                                    </h2>
                                    <p className="text-xl font-medium tracking-wide opacity-90 capitalize mt-1 text-white animate-live-condition">
                                        {weather.condition || 'Clear'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                <div className="flex items-center gap-2 text-white/70">
                                    <Cloud className="size-4" />
                                    <span className="text-sm font-semibold">Bulawayo</span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1.5 text-white">
                                        <Wind className="size-3.5 opacity-70 animate-wind" />
                                        <span className="text-xs text-white/50">Wind</span>
                                        <span className="text-sm font-bold">{weather.wind_speed_kmh.toFixed(1)}<span className="text-xs font-normal opacity-70"> km/h</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-white">
                                        <Droplets className="size-3.5 text-blue-300" />
                                        <span className="text-xs text-white/50">Humidity</span>
                                        <span className="text-sm font-bold">{weather.humidity.toFixed(0)}<span className="text-xs font-normal opacity-70">%</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-white">
                                        <CloudRain className="size-3.5 opacity-70" />
                                        <span className="text-xs text-white/50">Precip</span>
                                        <span className="text-sm font-bold">{weather.precipitation_chance}<span className="text-xs font-normal opacity-70">%</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section - 25% */}
                        <div className="flex items-center pt-3 mt-3 border-t border-white/20 flex-1">
                            <div className="flex items-center gap-3 text-white">
                                {weather.rain_forecast_minutes > 0 ? (
                                    <>
                                        <Umbrella className="size-6 text-yellow-300" />
                                        <p className="text-xl font-black">Rain Expected in {(weather.rain_forecast_minutes / 60).toFixed(1)}h</p>
                                    </>
                                ) : (
                                    <>
                                        <CloudRain className="size-6 text-white/50" />
                                        <p className="text-xl font-black text-white/60">No Rain Expected</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Live Data Pulse Indicator - Only One */}
                        <div className="absolute bottom-2 right-2 flex items-center gap-1">
                            <div className="size-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-[8px] font-bold text-white/50">LIVE</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-center text-white/60">
                        <Cloud className="size-12 mb-2 animate-pulse" />
                        <p className="text-xs font-bold uppercase tracking-widest">Loading Weather Data...</p>
                    </div>
                )}

                {/* Live Data Pulse Indicator */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    <div className="size-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[8px] font-bold text-white/50">LIVE</span>
                </div>
            </CardContent>

            {/* Custom CSS Animations */}
            <style>{`
                @keyframes breathe {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes wind {
                    0%, 100% { transform: translateX(0); opacity: 0.8; }
                    50% { transform: translateX(2px); opacity: 1; }
                }
                @keyframes droplet {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(2px); }
                }
                @keyframes rain {
                    0% { transform: translateY(-20px); opacity: 0; }
                    20% { opacity: 1; }
                    100% { transform: translateY(100px); opacity: 0; }
                }
                @keyframes rain-drop {
                    0% { transform: translateY(0); opacity: 1; }
                    100% { transform: translateY(6px); opacity: 0; }
                }
                @keyframes snow {
                    0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.8; }
                    100% { transform: translateY(100px) rotate(360deg); opacity: 0; }
                }
                @keyframes flash {
                    0% { opacity: 0.3; }
                    50% { opacity: 0.4; }
                    100% { opacity: 0; }
                }
                @keyframes live-temp {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.85; }
                }
                .animate-breathe { animation: breathe 3s ease-in-out infinite; }
                .animate-float { animation: float 2s ease-in-out infinite; }
                .animate-spin-slow { animation: spin-slow 10s linear infinite; }
                .animate-wind { animation: wind 1.5s ease-in-out infinite; }
                .animate-droplet { animation: droplet 1.5s ease-in-out infinite; }
                .animate-rain { animation: rain 1s linear infinite; }
                .animate-rain-drop { animation: rain-drop 0.6s ease-in-out infinite; }
                .animate-snow { animation: snow 4s linear infinite; }
                .animate-flash { animation: flash 0.2s ease-out; }
                .animate-live-temp { animation: live-temp 2s ease-in-out infinite; }
            `}</style>
        </Card>
    );
};
