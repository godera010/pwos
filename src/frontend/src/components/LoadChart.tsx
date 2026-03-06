import React, { useRef } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';

export interface DataPoint {
    time: string;
    value: number;
    timestamp: number;
}

interface LoadChartProps {
    data: DataPoint[];
    color?: string;
    yDomain?: [number, number];
    title?: string;
    isLive?: boolean;
}

const getDynamicColor = (value: number | undefined, defaultColor: string) => {
    if (value === undefined) return defaultColor;
    if (value < 30) return '#ef4444'; // Red for Critical
    if (value < 45) return '#f59e0b'; // Orange for Low
    return '#10b981'; // Emerald for Optimal/Good
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        if (!dataPoint) return null;
        const date = new Date(dataPoint.timestamp);
        const timeLabel = date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        return (
            <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                    {timeLabel}
                </p>
                <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-indigo-500 animate-pulse" />
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                        {typeof dataPoint.value === 'number' ? dataPoint.value.toFixed(1) : dataPoint.value}%
                    </p>
                </div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                    Soil Moisture
                </p>
            </div>
        );
    }
    return null;
};



export const LoadChart: React.FC<LoadChartProps> = ({
    data,
    color = "#6366f1",
    yDomain = [0, 100],
    isLive = true
}) => {
    const chartRef = useRef<HTMLDivElement>(null);

    // Generate exactly 3 ticks spaced 10 minutes apart
    const generateTicks = () => {
        if (!data.length) return [];
        const timestamps = data.map(d => d.timestamp);
        const min = Math.min(...timestamps);
        const max = Math.max(...timestamps);
        const intervalMs = 10 * 60 * 1000;
        const firstTick = Math.ceil(min / intervalMs) * intervalMs;
        const ticks = [];
        for (let t = firstTick; t <= max; t += intervalMs) {
            ticks.push(t);
        }
        return ticks;
    };

    // Format X-axis labels to enforce strict timezone parsing
    const formatXAxis = (timestamp: number) => {
        const date = new Date(timestamp);
        // Fallback safety to ensure we output stable HH:MM
        if (isNaN(date.getTime())) return '';
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Get critical threshold lines
    const getCriticalThresholds = () => {
        return [
            { value: 30, color: '#ef4444', label: 'Critical', opacity: 0.3 },
            { value: 45, color: '#f59e0b', label: 'Low', opacity: 0.2 },
            { value: 75, color: '#10b981', label: 'Optimal', opacity: 0.1 },
        ];
    };

    // Get the dynamic color for gradients and strokes based on latest value
    const latestValue = data.length > 0 ? data[data.length - 1].value : undefined;
    const activeColor = getDynamicColor(latestValue, color);

    return (
        <div className="relative h-[300px] w-full bg-transparent" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 10,
                        left: -20,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={activeColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={activeColor} stopOpacity={0} />
                        </linearGradient>

                        {/* Animated gradient for live data */}
                        <linearGradient id="liveGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={activeColor} stopOpacity={0.1}>
                                <animate
                                    attributeName="stop-opacity"
                                    values="0.1;0.3;0.1"
                                    dur="2s"
                                    repeatCount="indefinite"
                                />
                            </stop>
                            <stop offset="50%" stopColor={activeColor} stopOpacity={0.3}>
                                <animate
                                    attributeName="stop-opacity"
                                    values="0.3;0.5;0.3"
                                    dur="2s"
                                    repeatCount="indefinite"
                                />
                            </stop>
                            <stop offset="100%" stopColor={activeColor} stopOpacity={0.1}>
                                <animate
                                    attributeName="stop-opacity"
                                    values="0.1;0.3;0.1"
                                    dur="2s"
                                    repeatCount="indefinite"
                                />
                            </stop>
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                        strokeOpacity={0.1}
                        className="dark:stroke-slate-700"
                    />

                    {/* Critical threshold lines */}
                    {getCriticalThresholds().map((threshold) => (
                        <ReferenceLine
                            key={threshold.value}
                            y={threshold.value}
                            stroke={threshold.color}
                            strokeDasharray="5 5"
                            strokeOpacity={threshold.opacity}
                            strokeWidth={1}
                        />
                    ))}

                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        scale="time"
                        domain={['auto', 'auto']}
                        ticks={generateTicks()}
                        tickFormatter={formatXAxis}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                            fill: '#94a3b8',
                            fontSize: 11,
                            fontWeight: 600,
                            className: 'dark:fill-slate-500'
                        }}
                        dy={10}
                    />

                    <YAxis
                        domain={yDomain}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                            fill: '#94a3b8',
                            fontSize: 11,
                            fontWeight: 600,
                            className: 'dark:fill-slate-500'
                        }}
                        tickFormatter={(value) => `${value}%`}
                        dx={-5}
                    />

                    <Tooltip
                        content={<CustomTooltip />}
                    />

                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={activeColor}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={isLive ? "url(#liveGradient)" : "url(#colorValue)"}
                        activeDot={{
                            r: 6,
                            fill: activeColor,
                            stroke: '#fff',
                            strokeWidth: 3,
                            className: "shadow-lg dark:stroke-slate-900"
                        }}
                        dot={false}
                        isAnimationActive={false}
                    />

                    {/* Highlight the latest data point with pulsing dot */}
                    {isLive && data.length > 0 && (
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="none"
                            fill="none"
                            isAnimationActive={false}
                            dot={(props: any) => {
                                const { cx, cy, index } = props;
                                // Only show dot for the last point
                                if (index === data.length - 1) {
                                    return (
                                        <g>
                                            {/* Pulsing ring */}
                                            <circle
                                                cx={cx}
                                                cy={cy}
                                                r={10}
                                                fill={activeColor}
                                                fillOpacity={0.2}
                                                className="animate-ping"
                                            />
                                            {/* Main dot */}
                                            <circle
                                                cx={cx}
                                                cy={cy}
                                                r={5}
                                                fill={activeColor}
                                                stroke="#fff"
                                                strokeWidth={2}
                                                className="dark:stroke-slate-900"
                                            />
                                        </g>
                                    );
                                }
                                return null;
                            }}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
