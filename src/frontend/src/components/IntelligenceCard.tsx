import React from 'react';
import { Brain, Droplets, Wind, Leaf, Clock } from 'lucide-react';

// ─── Custom Premium Brain Icon with Neural Network Nodes ────────────────────────
const PremiumBrainIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-3.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2Z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-3.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2Z" />
        <circle cx="12" cy="7" r="1.2" fill="currentColor" className="animate-pulse" />
        <circle cx="8" cy="11" r="0.8" fill="currentColor" />
        <circle cx="16" cy="11" r="0.8" fill="currentColor" />
        <circle cx="7" cy="15" r="1.0" fill="currentColor" />
        <circle cx="17" cy="15" r="1.0" fill="currentColor" />
        <circle cx="12" cy="18" r="1.2" fill="currentColor" className="animate-pulse" />
        <line x1="8" y1="11" x2="12" y2="7" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        <line x1="16" y1="11" x2="12" y2="7" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        <line x1="8" y1="11" x2="7" y2="15" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        <line x1="16" y1="11" x2="17" y2="15" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        <line x1="7" y1="15" x2="12" y2="18" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        <line x1="17" y1="15" x2="12" y2="18" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
    </svg>
);

// ─── Custom Four Point Star Icon ────────────────────────────────────────────────
const FourPointStar: React.FC = () => (
    <svg 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="size-4 text-slate-600 dark:text-neutral-600 hover:text-emerald-400 transition-colors duration-300 cursor-pointer"
    >
        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
    </svg>
);

// ─── GPU-Accelerated Responsive Sparkline ───────────────────────────────────────
interface SparklineProps {
    data: number[];
    color: string;
}

const Sparkline: React.FC<SparklineProps> = ({ data, color }) => {
    if (data.length === 0) return null;
    const width = 160;
    const height = 28;
    const padding = 2;
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;

    const points = data.map((val, index) => {
        const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((val - minVal) / range) * (height - padding * 2) - padding;
        return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        const cpX1 = curr.x + (next.x - curr.x) / 3;
        const cpY1 = curr.y;
        const cpX2 = curr.x + 2 * (next.x - curr.x) / 3;
        const cpY2 = next.y;
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    const lastPoint = points[points.length - 1];

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 overflow-visible select-none">
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-500"
            />
            <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="2.5"
                fill={color}
                className="animate-pulse"
            />
        </svg>
    );
};

// ─── Component ──────────────────────────────────────────────────────────────────
interface IntelligenceCardProps {
    soilMoisture?: number;
    vpd?: number;
    confidence?: number;
    statusText?: string;
    subtitleText?: string;
    lastUpdateText?: string;
    moistureHistory?: number[];
    vpdHistory?: number[];
}

export const IntelligenceCard: React.FC<IntelligenceCardProps> = ({
    soilMoisture = 58.2,
    vpd = 1.08,
    confidence = 100,
    statusText = 'Active',
    subtitleText = 'Soil values balanced',
    lastUpdateText = '2 min ago',
    moistureHistory = [53, 50, 52, 48, 51, 54, 52, 55, 58.2],
    vpdHistory = [1.14, 1.10, 1.13, 1.05, 1.09, 1.12, 1.06, 1.07, 1.08]
}) => {
    return (
        <div className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#070d14] text-slate-900 dark:text-white p-6 shadow-xl dark:shadow-2xl overflow-hidden card-hover-effect flex flex-col justify-between h-full group">
            
            {/* Soft Ambient Inner Radial Glow */}
            <div className="absolute -inset-px rounded-2xl pointer-events-none opacity-20 border border-emerald-500/10 dark:border-emerald-500/20" />
            <div className="absolute top-[-30%] right-[-10%] w-72 h-72 rounded-full blur-[100px] bg-emerald-500/5 dark:bg-emerald-500/10 pointer-events-none mix-blend-normal dark:mix-blend-screen" />

            <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                {/* 1. HEADER ROW */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Brain className="size-4 text-emerald-500 dark:text-emerald-400 dark:filter dark:drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        <span className="text-[10px] font-bold tracking-[0.25em] font-display uppercase">P-WOS Intelligence</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-black tracking-widest text-emerald-500 dark:text-emerald-400 font-display uppercase">System Optimal</span>
                    </div>
                </div>

                {/* 2. MAIN GRID CONTENT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch flex-1">
                    
                    {/* LEFT & MID MAIN AREA (2/3 width) */}
                    <div className="lg:col-span-2 flex flex-col justify-between gap-6 lg:border-r border-slate-200 dark:border-slate-800/60 lg:pr-6">
                        
                        {/* Status & Confidence row (Top) */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-1 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-500/10">
                                    <PremiumBrainIcon className="size-16 text-emerald-500 dark:text-emerald-400 dark:filter dark:drop-shadow-[0_0_15px_rgba(52,211,153,0.6)] animate-pulse" />
                                </div>
                                <div className="space-y-0.5">
                                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
                                        Surveillance <span className="text-emerald-600 dark:text-emerald-400 dark:filter dark:drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]">{statusText}</span>
                                    </h1>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        {subtitleText}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="text-right space-y-0.5 min-w-[70px]">
                                <p className="text-[8px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">Confidence</p>
                                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight dark:filter dark:drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                                    {confidence}%
                                </p>
                            </div>
                        </div>

                        {/* Thin Subtle Divider */}
                        <div className="h-px bg-slate-200 dark:bg-slate-800/60 w-full" />

                        {/* Live Metrics Grid (Bottom) */}
                        <div className="grid grid-cols-2 gap-6">
                            
                            {/* Column 1 (Moisture) */}
                            <div className="space-y-2 flex flex-col justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-blue-500/10 dark:bg-blue-950/20 border border-blue-500/20 dark:border-blue-500/10">
                                        <Droplets className="size-3.5 text-blue-500 dark:text-blue-400" />
                                    </div>
                                    <span className="text-[9px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">Moisture</span>
                                </div>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{soilMoisture.toFixed(1)}</span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">%</span>
                                </div>
                                <div className="pt-2">
                                    <Sparkline data={moistureHistory} color="#3b82f6" />
                                </div>
                            </div>

                            {/* Column 2 (Atmosphere VPD) */}
                            <div className="space-y-2 flex flex-col justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 dark:border-amber-500/10">
                                        <Wind className="size-3.5 text-amber-500" />
                                    </div>
                                    <span className="text-[9px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">Atmosphere VPD</span>
                                </div>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{vpd.toFixed(2)}</span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">kPa</span>
                                </div>
                                <div className="pt-2">
                                    <Sparkline data={vpdHistory} color="#f59e0b" />
                                </div>
                            </div>

                        </div>

                    </div>

                    {/* RIGHT SIDEBAR (1/3 width) */}
                    <div className="flex flex-col justify-between gap-4">
                        <div className="space-y-3">
                            <span className="text-[9px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase block">Key Drivers</span>
                            
                            <div className="space-y-2.5">
                                {/* Moisture Row */}
                                <div className="flex items-center gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/30">
                                    <div className="p-2 rounded-full bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.1)]">
                                        <Droplets className="size-3.5" />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Moisture</span>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">{soilMoisture.toFixed(1)}%</span>
                                    </div>
                                </div>

                                {/* Atmosphere Row */}
                                <div className="flex items-center gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/30">
                                    <div className="p-2 rounded-full bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.1)]">
                                        <Wind className="size-3.5" />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Atmosphere</span>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">{vpd.toFixed(2)} kPa</span>
                                    </div>
                                </div>

                                {/* System Status Row */}
                                <div className="flex items-center gap-3 py-2">
                                    <div className="p-2 rounded-full bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.1)]">
                                        <Leaf className="size-3.5" />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">System Status</span>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Optimal</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* 3. FOOTER ROW */}
                <div className="h-px bg-slate-200 dark:bg-slate-800/60 w-full" />
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-wide">
                    <div className="flex items-center gap-1.5 uppercase">
                        <Clock className="size-3.5 text-slate-400 dark:text-slate-600" />
                        <span>Last update: {lastUpdateText}</span>
                    </div>
                    <div>
                        <FourPointStar />
                    </div>
                </div>

            </div>

        </div>
    );
};
