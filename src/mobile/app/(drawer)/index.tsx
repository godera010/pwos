import React, { useState } from 'react';
import { RefreshControl } from 'react-native';
import { View, Text, ScrollView, Pressable, SafeAreaView } from '../../src/components/ui';
import { useAppStore, actions } from '../../src/store/useAppStore';
import { Svg, Circle, Text as SvgText, Path, Line } from 'react-native-svg';

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  // Read telemetry data from centralized store
  const soilMoisture = useAppStore(s => s.soilMoisture);
  const temperature = useAppStore(s => s.temperature);
  const humidity = useAppStore(s => s.humidity);
  const vpd = useAppStore(s => s.vpd);
  const systemMode = useAppStore(s => s.systemMode);
  const pumpActive = useAppStore(s => s.pumpActive);
  
  // Read ML stats from store
  const predictedAction = useAppStore(s => s.predictedAction);
  const predictedConfidence = useAppStore(s => s.predictedConfidence);
  const predictionReason = useAppStore(s => s.predictionReason);
  
  // Read Weather Info
  const weatherTemp = useAppStore(s => s.weatherTemp);
  const weatherPrecipitation = useAppStore(s => s.weatherPrecipitation);
  const weatherWindSpeed = useAppStore(s => s.weatherWindSpeed);
  const weatherCondition = useAppStore(s => s.weatherCondition);

  // Connection states
  const mqttConnected = useAppStore(s => s.mqttConnected);
  const apiConnected = useAppStore(s => s.apiConnected);

  const handleRefresh = async () => {
    setRefreshing(true);
    await actions.fetchDashboardData();
    setRefreshing(false);
  };

  // Determine moisture gauge color
  const getMoistureColor = (val: number) => {
    if (val < 15) return '#f43f5e'; // Red (rose-500)
    if (val < 35) return '#eab308'; // Yellow (yellow-500)
    return '#10b981'; // Green (emerald-500)
  };

  // Circular gauge calculations
  const size = 170;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, soilMoisture)) / 100) * circumference;

  // ML UI mapping
  const mlConfig = {
    NOW: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', label: 'WATER NOW', glow: 'bg-rose-500' },
    STALL: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'STALL IRRIGATION', glow: 'bg-amber-500' },
    STOP: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', label: 'FORCE STOP', glow: 'bg-blue-500' },
    MONITOR: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'MONITOR TELEMETRY', glow: 'bg-emerald-500' },
  }[predictedAction] || { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', label: 'MONITOR', glow: 'bg-slate-500' };

  return (
    <SafeAreaView className="flex-1 bg-[#090d16]" edges={['top']}>
      {/* HEADER PANEL */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-[#131b2e] bg-[#0c1220]">
        <View>
          <Text className="text-white text-xl font-bold tracking-tight">P-WOS MOBILE</Text>
          <Text className="text-slate-400 text-xs mt-0.5">Precision Watering OS</Text>
        </View>

        {/* STATUS PIPES */}
        <View className="flex-row items-center space-x-3">
          {/* API Health indicator */}
          <View className="flex-row items-center bg-[#131b2e] px-2 py-1 rounded-full space-x-1.5 mr-2">
            <View className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-emerald-500 shadow-emerald-500' : 'bg-rose-500'} animate-pulse`} />
            <Text className="text-[10px] font-semibold text-slate-300">API</Text>
          </View>
          
          {/* MQTT Health indicator */}
          <View className="flex-row items-center bg-[#131b2e] px-2 py-1 rounded-full space-x-1.5">
            <View className={`w-2 h-2 rounded-full ${mqttConnected ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
            <Text className="text-[10px] font-semibold text-slate-300">MQTT</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />
        }
      >
        {/* SOIL MOISTURE GAUGE & DECISION HEADER */}
        <View className="bg-[#0c1220] border border-[#131b2e] rounded-3xl p-6 items-center shadow-lg relative overflow-hidden mb-5">
          <View className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
          
          <Text className="text-slate-400 text-sm font-semibold tracking-wider uppercase mb-5">Soil Moisture Level</Text>
          
          {/* GAUGE GRAPHICS */}
          <View className="items-center justify-center relative mb-4">
            <Svg width={size} height={size}>
              {/* Background Track Circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#131b2e"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Primary Glowing Active Ring */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={getMoistureColor(soilMoisture)}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            
            {/* CENTRAL TEXT OVERLAYS */}
            <View className="absolute items-center justify-center">
              <Text className="text-white text-4xl font-extrabold tracking-tighter">
                {soilMoisture.toFixed(1)}%
              </Text>
              <Text className="text-slate-400 text-xs font-semibold uppercase mt-1">
                {soilMoisture < 15 ? 'CRITICAL DRY' : soilMoisture < 35 ? 'DRYING' : 'OPTIMAL'}
              </Text>
            </View>
          </View>

          {/* ACTIVE WATERING STATUS */}
          {pumpActive && (
            <View className="bg-emerald-500/20 border border-emerald-500/40 rounded-full px-4 py-1.5 flex-row items-center space-x-2 animate-bounce">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <Text className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Watering Active</Text>
            </View>
          )}
        </View>

        {/* AI DECISION ENGINE CARD */}
        <View className={`border ${mlConfig.border} ${mlConfig.bg} rounded-3xl p-5 mb-5 overflow-hidden relative shadow-md`}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center space-x-2">
              <View className={`w-2.5 h-2.5 rounded-full ${mlConfig.glow}`} />
              <Text className="text-white font-bold tracking-tight">AI Water Recommendation</Text>
            </View>
            <View className="bg-white/10 px-2.5 py-1 rounded-full">
              <Text className="text-white text-xs font-bold">{predictedConfidence.toFixed(0)}% Conf.</Text>
            </View>
          </View>

          <Text className={`text-2xl font-black ${mlConfig.text} mb-2 tracking-tight`}>
            {mlConfig.label}
          </Text>

          <Text className="text-slate-300 text-sm leading-relaxed mb-1">
            {predictionReason || 'Analysing telemetry physics and real-time models...'}
          </Text>

          {systemMode === 'AUTO' ? (
            <View className="mt-3 bg-white/5 border border-white/10 rounded-xl p-2.5 flex-row items-center">
              <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ marginRight: 8 }}>
                <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <Path d="m9 12 2 2 4-4" />
              </Svg>
              <Text className="text-emerald-400 text-xs font-semibold">OS is in AUTO pilot mode. AI decisions will fire automatically.</Text>
            </View>
          ) : (
            <View className="mt-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 flex-row items-center">
              <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" style={{ marginRight: 8 }}>
                <Circle cx="12" cy="12" r="10" />
                <Line x1="12" y1="8" x2="12" y2="12" />
                <Line x1="12" y1="16" x2="12.01" y2="16" />
              </Svg>
              <Text className="text-rose-400 text-xs font-semibold">OS is in MANUAL override. Decisions must be triggered by hand.</Text>
            </View>
          )}
        </View>

        {/* PRIMARY TELEMETRY GRID */}
        <View className="flex-row flex-wrap justify-between mb-5">
          {/* Temperature */}
          <View className="bg-[#0c1220] border border-[#131b2e] rounded-2xl p-4 w-[47%] mb-4 relative shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Air Temp</Text>
              <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                <Path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
              </Svg>
            </View>
            <Text className="text-white text-2xl font-extrabold">{temperature.toFixed(1)}°C</Text>
            <Text className="text-slate-500 text-[10px] mt-1">Calibrated Sensor Node</Text>
          </View>

          {/* Humidity */}
          <View className="bg-[#0c1220] border border-[#131b2e] rounded-2xl p-4 w-[47%] mb-4 relative shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Humidity</Text>
              <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <Path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </Svg>
            </View>
            <Text className="text-white text-2xl font-extrabold">{humidity.toFixed(1)}%</Text>
            <Text className="text-slate-500 text-[10px] mt-1">Capacitive Sensor Node</Text>
          </View>

          {/* VPD */}
          <View className="bg-[#0c1220] border border-[#131b2e] rounded-2xl p-4 w-full relative shadow-sm flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <View className="bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/20">
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                  <Path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <Path d="M12 12v9" />
                  <Path d="m8 17 4 4 4-4" />
                </Svg>
              </View>
              <View>
                <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vapor Pressure Deficit</Text>
                <Text className="text-slate-500 text-[10px] mt-0.5">Boundary threshold: 2.0 kPa</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-white text-2xl font-extrabold">{vpd.toFixed(2)} kPa</Text>
              <View className={`rounded-full px-2 py-0.5 mt-1 border ${vpd > 2.0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                <Text className={`text-[9px] font-bold ${vpd > 2.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {vpd > 2.0 ? 'HIGH TRANSPIRE' : 'OPTIMAL'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* WEATHER FORECAST CONTEXT */}
        <View className="bg-[#0c1220] border border-[#131b2e] rounded-3xl p-5 shadow-md">
          <View className="flex-row items-center justify-between border-b border-[#131b2e] pb-3 mb-4">
            <Text className="text-white font-bold tracking-tight">External Environment Context</Text>
            <View className="bg-slate-800 rounded-full px-2.5 py-0.5">
              <Text className="text-slate-400 text-[10px] font-semibold uppercase">OpenWeather</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3.5">
              <View className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20">
                {/* Weather cloud icon */}
                <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
                  <Path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-3.87-3.17-7-7-7-3.87 0-6.9 3.17-7 7-2.08.38-4 2.21-4 4.5A4.5 4.5 0 0 0 3 20h14.5" />
                </Svg>
              </View>
              <View>
                <Text className="text-slate-400 text-xs">Local Climate Status</Text>
                <Text className="text-white text-lg font-bold capitalize mt-0.5">{weatherCondition}</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-white text-2xl font-black">{weatherTemp.toFixed(1)}°C</Text>
              <Text className="text-slate-400 text-xs">Real-Time Forecast</Text>
            </View>
          </View>

          <View className="flex-row justify-between border-t border-[#131b2e] mt-4 pt-4">
            <View className="items-center w-[45%]">
              <Text className="text-slate-500 text-xs mb-0.5">Rain Probability</Text>
              <Text className="text-sky-400 text-base font-bold">{weatherPrecipitation}%</Text>
            </View>
            <View className="w-px h-8 bg-[#131b2e]" />
            <View className="items-center w-[45%]">
              <Text className="text-slate-500 text-xs mb-0.5">Wind Velocity</Text>
              <Text className="text-slate-300 text-base font-bold">{weatherWindSpeed.toFixed(1)} km/h</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
