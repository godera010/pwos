import React from 'react';

interface GaugeZone {
    max: number;
    color: string;
}

interface CircularGaugeProps {
    value: number;
    min?: number;
    max?: number;
    unit: string;
    label?: string;
    zones?: GaugeZone[];
    size?: number;
    thickness?: number;
    showValue?: boolean;
    showLabel?: boolean;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
    value,
    min = 0,
    max = 100,
    unit,
    label,
    zones = [
        { max: 30, color: 'rgb(239, 68, 68)' },    // red-500
        { max: 50, color: 'rgb(249, 115, 22)' },   // orange-500
        { max: 70, color: 'rgb(234, 179, 8)' },    // yellow-500
        { max: 100, color: 'rgb(34, 197, 94)' }    // green-500
    ],
    size = 160,
    thickness = 12,
    showValue = true,
    showLabel = true,
}) => {
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1) * 100;
    const offset = circumference - (percentage / 100) * circumference;

    // Find color based on zones
    const activeZone = zones.find(z => value <= z.max) || zones[zones.length - 1];
    const color = activeZone.color;

    return (
        <div className="flex flex-col items-center justify-center gap-2" style={{ width: size }}>
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background Circle */}
                <svg className="transform -rotate-90 w-full h-full">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={thickness}
                        fill="transparent"
                        className="text-slate-200 dark:text-slate-800"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={thickness}
                        strokeDasharray={circumference}
                        style={{
                            strokeDashoffset: offset,
                            transition: 'stroke-dashoffset 0.5s ease-in-out, stroke 0.5s ease-in-out'
                        }}
                        strokeLinecap="round"
                        fill="transparent"
                    />
                </svg>

                {/* Center Text */}
                {showValue && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black tracking-tighter">
                            {value.toFixed(1)}
                        </span>
                        <span className="text-[10px] font-bold uppercase opacity-50">
                            {unit}
                        </span>
                    </div>
                )}
            </div>

            {showLabel && label && (
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    {label}
                </span>
            )}
        </div>
    );
};
