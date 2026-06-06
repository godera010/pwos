import React, { useMemo } from 'react';
import { View, Text } from './ui';
import { Svg, Path, Line, Defs, LinearGradient, Stop, Circle, Text as SvgText } from 'react-native-svg';

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

export const LoadChart: React.FC<LoadChartProps> = ({
  data,
  color = "#6366f1",
  yDomain = [0, 100],
  title,
  isLive = true,
}) => {
  const width = 320;
  const height = 180;
  
  const latestValue = data.length > 0 ? data[data.length - 1].value : undefined;
  const activeColor = getDynamicColor(latestValue, color);

  const { pathDef, areaDef, xTicks, yTicks, latestPoint } = useMemo(() => {
    if (data.length === 0) return { pathDef: '', areaDef: '', xTicks: [], yTicks: [], latestPoint: null };

    const minX = Math.min(...data.map(d => d.timestamp));
    const maxX = Math.max(...data.map(d => d.timestamp));
    const xRange = maxX - minX || 1;
    
    const [minY, maxY] = yDomain;
    const yRange = maxY - minY;

    const points = data.map(d => {
      const x = ((d.timestamp - minX) / xRange) * width;
      const y = height - ((d.value - minY) / yRange) * height;
      return { x, y, timestamp: d.timestamp };
    });

    const dStr = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const aStr = `${dStr} L ${width},${height} L 0,${height} Z`;

    const ticksX = [];
    if (data.length > 0) {
      const intervalMs = 10 * 60 * 1000;
      const firstTick = Math.ceil(minX / intervalMs) * intervalMs;
      for (let t = firstTick; t <= maxX; t += intervalMs) {
        ticksX.push({
          x: ((t - minX) / xRange) * width,
          label: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    const ticksY = [
      { y: height - ((0 - minY) / yRange) * height, label: '0%' },
      { y: height - ((50 - minY) / yRange) * height, label: '50%' },
      { y: height - ((100 - minY) / yRange) * height, label: '100%' },
    ];

    return {
      pathDef: dStr,
      areaDef: aStr,
      xTicks: ticksX,
      yTicks: ticksY,
      latestPoint: points[points.length - 1]
    };
  }, [data, yDomain]);

  if (data.length === 0) {
    return (
      <View className="h-48 items-center justify-center bg-transparent border border-[#1a2333] rounded-xl">
        <Text className="text-slate-500 font-bold">Waiting for data...</Text>
      </View>
    );
  }

  return (
    <View className="w-full bg-transparent">
      {title && (
        <Text className="text-white font-bold mb-2 ml-1">{title}</Text>
      )}
      <View style={{ height: height + 20, width: '100%' }}>
        <Svg width="100%" height="100%" viewBox={`-10 -10 ${width + 20} ${height + 30}`}>
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={activeColor} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={activeColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <Line
              key={`grid-y-${i}`}
              x1={0}
              y1={tick.y}
              x2={width}
              y2={tick.y}
              stroke="#334155"
              strokeDasharray="4 4"
              strokeOpacity="0.3"
            />
          ))}

          {/* Threshold lines */}
          <Line x1={0} y1={height - (30 / 100) * height} x2={width} y2={height - (30 / 100) * height} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity="0.3" />
          <Line x1={0} y1={height - (45 / 100) * height} x2={width} y2={height - (45 / 100) * height} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity="0.2" />
          <Line x1={0} y1={height - (75 / 100) * height} x2={width} y2={height - (75 / 100) * height} stroke="#10b981" strokeDasharray="5 5" strokeOpacity="0.1" />

          {/* Area */}
          <Path d={areaDef} fill="url(#grad)" />
          {/* Line */}
          <Path d={pathDef} fill="none" stroke={activeColor} strokeWidth="3" />

          {/* Latest Point */}
          {latestPoint && (
            <>
              <Circle cx={latestPoint.x} cy={latestPoint.y} r="8" fill={activeColor} opacity="0.3" />
              <Circle cx={latestPoint.x} cy={latestPoint.y} r="4" fill={activeColor} stroke="#ffffff" strokeWidth="2" />
            </>
          )}

          {/* X Ticks */}
          {xTicks.map((tick, i) => (
            <React.Fragment key={`x-tick-${i}`}>
              <Line x1={tick.x} y1={height} x2={tick.x} y2={height + 5} stroke="#475569" strokeWidth="1" />
              <SvgText x={tick.x} y={height + 18} fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">
                {tick.label}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </View>
  );
};
