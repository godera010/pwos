import React, { useState, useEffect, useMemo } from 'react';
import { RefreshControl } from 'react-native';
import { View, Text, ScrollView, SafeAreaView, Pressable } from '../../src/components/ui';
import { useAppStore, actions } from '../../src/store/useAppStore';
import { Svg, Circle, Path, Line } from 'react-native-svg';
import { WeatherCard } from '../../src/components/WeatherCard';
import { QuickActions } from '../../src/components/QuickActions';
import { LoadChart } from '../../src/components/LoadChart';
import { mqttClient } from '../../src/services/mqtt';

const MOISTURE_SAFETY_THRESHOLD = 95;

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [switchingCropId, setSwitchingCropId] = useState<number | null>(null);

  // Core Telemetry
  const soilMoisture = useAppStore(s => s.soilMoisture);
  const temperature = useAppStore(s => s.temperature);
  const humidity = useAppStore(s => s.humidity);
  const vpd = useAppStore(s => s.vpd);
  const systemMode = useAppStore(s => s.systemMode);
  const pumpActive = useAppStore(s => s.pumpActive);
  
  // ML Stats
  const predictedAction = useAppStore(s => s.predictedAction);
  const predictedConfidence = useAppStore(s => s.predictedConfidence);
  const predictionReason = useAppStore(s => s.predictionReason);
  
  // Weather
  const weatherTemp = useAppStore(s => s.weatherTemp);
  const weatherPrecipitation = useAppStore(s => s.weatherPrecipitation);
  const weatherWindSpeed = useAppStore(s => s.weatherWindSpeed);
  const weatherCondition = useAppStore(s => s.weatherCondition);

  // Connection & Data
  const mqttConnected = useAppStore(s => s.mqttConnected);
  const apiConnected = useAppStore(s => s.apiConnected);
  const hardwareOnline = useAppStore(s => s.hardwareOnline);
  const history = useAppStore(s => s.history);
  const crops = useAppStore(s => s.crops);
  const activeCrop = useAppStore(s => s.activeCrop);

  // Initial fetch only - background polling is already handled globally by useAppStore
  useEffect(() => {
    actions.fetchDashboardData(true);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await actions.fetchDashboardData();
    setRefreshing(false);
  };

  const getMoistureColor = (val: number) => {
    if (val < 15) return '#f43f5e'; 
    if (val < 35) return '#eab308'; 
    return '#10b981'; 
  };

  const size = 170;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, soilMoisture)) / 100) * circumference;

  const mlConfig = {
    NOW: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', label: 'WATER DISPATCHED', glow: 'bg-indigo-500' },
    STALL: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'STALL IRRIGATION', glow: 'bg-amber-500' },
    STOP: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', label: 'AUTOPILOT LOCKED', glow: 'bg-rose-500' },
    MONITOR: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'SYSTEM OPTIMAL', glow: 'bg-emerald-500' },
  }[predictedAction] || { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', label: 'MONITOR', glow: 'bg-slate-500' };

  const handleToggleMode = () => {
    actions.toggleSystemMode();
  };

  const handleTogglePump = (checked: boolean) => {
    if (checked) {
      actions.triggerManualPump(60);
    } else {
      actions.stopPump();
    }
  };

  const chartData = useMemo(() => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    return history
      .filter(h => {
        const cleanTimestamp = h.timestamp.replace(/ GMT$/, '').replace(/Z$/, '');
        const ts = new Date(cleanTimestamp).getTime();
        return ts >= thirtyMinutesAgo;
      })
      .map(h => {
        const cleanTimestamp = h.timestamp.replace(/ GMT$/, '').replace(/Z$/, '');
        const dateObj = new Date(cleanTimestamp);
        return {
          time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          value: h.soil_moisture,
          timestamp: dateObj.getTime()
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [history]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} className="flex-1 bg-[#000000]" edges={['top']}>
      {/* HEADER */}
      <View className="px-5 py-4 flex-row items-center justify-between border-b border-[#1f1f23] bg-[#09090b] mb-4">
        <View>
          <Text className="text-white text-2xl font-black tracking-tight uppercase">P-WOS Dashboard</Text>
          <Text className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">Real-time Telemetry</Text>
        </View>

        <View className="flex-row items-center space-x-2">
          <View className="flex-row items-center bg-[#1f1f23] px-2 py-1 rounded-full space-x-1.5 mr-1">
            <View className={`w-1.5 h-1.5 rounded-full ${apiConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            <Text className="text-[9px] font-bold text-slate-300">API</Text>
          </View>
          <View className="flex-row items-center bg-[#1f1f23] px-2 py-1 rounded-full space-x-1.5">
            <View className={`w-1.5 h-1.5 rounded-full ${mqttConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            <Text className="text-[9px] font-bold text-slate-300">MQTT</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
      >
        {crops && crops.length > 0 && (
          <View className="mb-6 bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 shadow-lg">
            <View className="flex-row items-center space-x-2.5 mb-3.5">
              <View className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <Path d="M7 20h10M10 20c5.5-5.5.5-16 .5-16s-5.5 10.5 0 16z" />
                </Svg>
              </View>
              <View>
                <Text className="text-white font-bold text-base">Active Crop Profile</Text>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Autopilot Target Calibration</Text>
              </View>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mt-1">
              {crops.map((crop) => {
                const isActive = activeCrop && activeCrop.id === crop.id;
                const isSwitching = switchingCropId === crop.id;
                return (
                  <Pressable
                    key={crop.id}
                    disabled={isSwitching}
                    onPress={async () => {
                      setSwitchingCropId(crop.id);
                      await actions.setActiveCrop(crop.id);
                      setSwitchingCropId(null);
                    }}
                    className={`mr-3 px-4 py-3 rounded-2xl border min-w-[130px] items-center justify-center transition-all ${
                      isActive 
                        ? 'border-emerald-500/50 bg-emerald-500/10' 
                        : 'border-[#1f1f23] bg-[#09090b]'
                    }`}
                  >
                    <Text className={`font-black text-[11px] tracking-wider ${isActive ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {crop.name.toUpperCase()}
                    </Text>
                    <View className="flex-row items-center space-x-1 mt-1">
                      <Text className="text-[9px] font-bold text-slate-500">TARGET:</Text>
                      <Text className={`text-[10px] font-mono font-bold ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {crop.target_moisture}%
                      </Text>
                    </View>
                    {isSwitching && (
                      <Text className="text-[8px] text-emerald-400 mt-1 font-bold animate-pulse">SYNCING...</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-6 items-center shadow-lg relative mb-5">
          <Text className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-5">Soil Moisture</Text>
          
          <View className="items-center justify-center relative mb-4">
            <Svg width={size} height={size}>
              <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#1f1f23" strokeWidth={strokeWidth} fill="transparent" />
              <Circle
                cx={size / 2} cy={size / 2} r={radius} stroke={getMoistureColor(soilMoisture)} strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="transparent" transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <View className="absolute items-center justify-center">
              <Text className="text-white text-4xl font-black">{soilMoisture.toFixed(1)}%</Text>
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                {soilMoisture < 15 ? 'CRITICAL DRY' : soilMoisture < 35 ? 'LOW' : soilMoisture < MOISTURE_SAFETY_THRESHOLD ? 'OPTIMAL' : 'SATURATED'}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row justify-between mb-5">
          <View className="bg-[#09090b] border border-[#1f1f23] rounded-2xl p-4 w-[48%]">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Temperature</Text>
            <Text className="text-white text-2xl font-black">{temperature.toFixed(1)}°C</Text>
          </View>
          <View className="bg-[#09090b] border border-[#1f1f23] rounded-2xl p-4 w-[48%]">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Humidity</Text>
            <Text className="text-white text-2xl font-black">{humidity.toFixed(1)}%</Text>
          </View>
        </View>

        <View className="bg-[#09090b] border border-[#1f1f23] rounded-2xl p-4 mb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">VPD (Crop Stress)</Text>
            <Text className="text-white text-2xl font-black">{vpd.toFixed(2)} kPa</Text>
          </View>
          <View className={`px-2 py-1 rounded border ${vpd > 2.0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
            <Text className={`text-[10px] font-bold uppercase ${vpd > 2.0 ? 'text-rose-500' : 'text-emerald-500'}`}>{vpd > 2.0 ? 'High Transpiration' : 'Optimal'}</Text>
          </View>
        </View>

        <View className={`border ${mlConfig.border} ${mlConfig.bg} rounded-3xl p-5 mb-5 shadow-lg`}>
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-bold tracking-tight">AI Engine Status</Text>
            <Text className="text-white text-[10px] font-bold uppercase bg-white/10 px-2 py-1 rounded">Conf: {predictedConfidence.toFixed(0)}%</Text>
          </View>
          <Text className={`text-2xl font-black ${mlConfig.text} mb-2`}>{mlConfig.label}</Text>
          <Text className="text-slate-300 text-xs mb-3">
            {predictionReason || {
              STALL: "High wind speed detected. Postponing irrigation program to prevent water waste and drift.",
              NOW: "Soil moisture is trending below optimal range. Initiating target crop hydration program.",
              STOP: "Hardware node disconnected. The physical safety interlock has been triggered to prevent pump damage.",
              MONITOR: "Moisture and temperature balances are stable. System continuing passive surveillance loops."
            }[predictedAction] || "System analyzing environmental data..."}
          </Text>
        </View>

        <WeatherCard weather={{
          temperature: weatherTemp,
          humidity: weatherPrecipitation, // Using precip here as fallback 
          precipitation_chance: weatherPrecipitation,
          wind_speed_kmh: weatherWindSpeed,
          condition: weatherCondition,
          rain_forecast_minutes: 0,
          cloud_cover: 0,
          source: 'local',
          timestamp: new Date().toISOString()
        }} />

        <QuickActions
          isAuto={systemMode === 'AUTO'}
          isPumpOn={pumpActive}
          isApiOffline={!apiConnected}
          isHardwareOnline={hardwareOnline}
          connected={mqttConnected}
          moisture={soilMoisture}
          isMoistureSaturated={soilMoisture >= MOISTURE_SAFETY_THRESHOLD}
          onToggleMode={handleToggleMode}
          onTogglePump={handleTogglePump}
        />

        <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-4 mt-2">
          <LoadChart
            data={chartData}
            color="#10b981"
            title="LIVE SOIL MOISTURE"
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
