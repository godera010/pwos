import React, { useEffect, useState } from 'react';
import { View, Text } from './ui';
import { WeatherForecast } from '../services/api';
import { Svg, Path, Circle, Line } from 'react-native-svg';

// Simple SVG Icons
const CloudIcon = ({ color = '#ffffff' }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-3.87-3.17-7-7-7-3.87 0-6.9 3.17-7 7-2.08.38-4 2.21-4 4.5A4.5 4.5 0 0 0 3 20h14.5" />
  </Svg>
);

const SunIcon = ({ color = '#ffffff' }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Circle cx="12" cy="12" r="5" />
    <Line x1="12" y1="1" x2="12" y2="3" />
    <Line x1="12" y1="21" x2="12" y2="23" />
    <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <Line x1="1" y1="12" x2="3" y2="12" />
    <Line x1="21" y1="12" x2="23" y2="12" />
    <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </Svg>
);

const WindIcon = ({ color = '#ffffff' }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
    <Path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
    <Path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
  </Svg>
);

const DropletsIcon = ({ color = '#ffffff' }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7 2.99 7 2.99s-2.29 6.08-3.29 7.08c-1.14.93-1.71 2.03-1.71 3.19C2 14.47 3.8 16.3 6 16.3Z" />
  </Svg>
);

interface WeatherCardProps {
  weather: WeatherForecast | null;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather }) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    return () => clearInterval(timer);
  }, []);

  const condition = weather?.condition?.toLowerCase() || 'clear';
  const isRainy = ['rain', 'drizzle', 'thunderstorm'].includes(condition);
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 18;

  // Simple gradient fallback using solid color for now as react-native doesn't support linear-gradient natively without expo-linear-gradient
  const bgColor = isDay ? 'bg-sky-500' : 'bg-slate-900';
  const orbColor = isDay ? 'bg-amber-400' : 'bg-slate-600';

  return (
    <View className={`rounded-3xl p-5 mb-5 overflow-hidden ${bgColor}`}>
      <View className="absolute top-10 left-20 w-32 h-32 rounded-full opacity-10 bg-white" />

      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-x-2">
          <CloudIcon color="rgba(255,255,255,0.8)" />
          <Text className="text-white font-bold uppercase tracking-wider text-sm">Bulawayo</Text>
        </View>
        <View className="flex-row items-center space-x-2">
          <Text className="text-white/70 font-mono text-xs">{timeStr}</Text>
          <Text className="text-white/60 font-bold text-[10px] uppercase">{isDay ? 'DAY' : 'NIGHT'}</Text>
        </View>
      </View>

      {weather ? (
        <View className="flex-col">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-x-4">
              <View className={`w-16 h-16 rounded-full items-center justify-center ${orbColor}`}>
                {isDay ? <SunIcon /> : <CloudIcon />}
              </View>
              <View>
                <Text className="text-white text-5xl font-black">{weather.temperature.toFixed(1)}°</Text>
                <Text className="text-white text-lg font-medium capitalize mt-1 opacity-90">{weather.condition || 'Clear'}</Text>
              </View>
            </View>

            <View className="items-end space-y-1">
              <View className="flex-row items-center space-x-1.5">
                <WindIcon color="rgba(255,255,255,0.7)" />
                <Text className="text-white font-bold">{weather.wind_speed_kmh.toFixed(1)}</Text>
              </View>
              <View className="flex-row items-center space-x-1.5">
                <DropletsIcon color="#93c5fd" />
                <Text className="text-white font-bold">{weather.humidity.toFixed(0)}%</Text>
              </View>
            </View>
          </View>

          <View className="border-t border-white/20 pt-3 mt-2 flex-row items-center space-x-3">
            {weather.rain_forecast_minutes > 0 ? (
              <Text className="text-yellow-300 font-black text-lg">Rain in {(weather.rain_forecast_minutes / 60).toFixed(1)}h</Text>
            ) : (
              <Text className="text-white/60 font-black text-lg">No Rain Expected</Text>
            )}
          </View>
        </View>
      ) : (
        <View className="items-center justify-center py-6">
          <CloudIcon color="rgba(255,255,255,0.6)" />
          <Text className="text-white/60 font-bold uppercase text-xs mt-2">Loading Weather...</Text>
        </View>
      )}

      <View className="absolute bottom-3 right-3 flex-row items-center space-x-1">
        <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <Text className="text-[8px] font-bold text-white/50">LIVE</Text>
      </View>
    </View>
  );
};
