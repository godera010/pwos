import React from 'react';

interface GaugeProps {
    value: number;
    label: string;
    unit: string;
    color: string;
    max?: number;
}

export const Gauge: React.FC<GaugeProps> = ({ value, label, unit, color, max = 100 }) => {
    const percentage = Math.min((value / max) * 100, 100);

    return (
        <div className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center dark:text-white">
            <div
                className="relative size-24 rounded-full flex items-center justify-center"
                style={{
                    background: `conic-gradient(${color} ${percentage}%, rgba(229, 231, 235, 0.5) 0deg)`
                }}
            >
                <div className="absolute inset-[8%] bg-white dark:bg-[#1e293b] rounded-full flex flex-col items-center justify-center">
                    <span className="text-xl font-bold">{value.toFixed(1)}</span>
                    <span className="text-[10px] opacity-50 font-bold uppercase">{unit}</span>
                </div>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">{label}</span>
        </div>
    );
};
