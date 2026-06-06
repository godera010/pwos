import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, SafeAreaView } from '../../src/components/ui';
import { useAppStore, actions } from '../../src/store/useAppStore';
import { Svg, Circle, Path, Rect, Line, Polyline } from 'react-native-svg';

export default function ControlsScreen() {
  const systemMode = useAppStore(s => s.systemMode);
  const pumpActive = useAppStore(s => s.pumpActive);
  const pumpTimerLeft = useAppStore(s => s.pumpTimerLeft);
  const mqttLogs = useAppStore(s => s.mqttLogs);

  // Local state for watering duration slider (default 15 seconds)
  const [duration, setDuration] = useState(15);

  const adjustDuration = (amount: number) => {
    setDuration(prev => Math.min(60, Math.max(1, prev + amount)));
  };

  const handleToggleMode = () => {
    actions.toggleSystemMode();
  };

  const handleWaterClick = () => {
    if (pumpActive) {
      actions.stopPump();
    } else {
      actions.triggerManualPump(duration);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#000000]" edges={['top']}>
      {/* HEADER */}
      <View className="px-6 py-4 border-b border-[#1f1f23] bg-[#09090b] flex-row items-center justify-between">
        <View>
          <Text className="text-white text-xl font-bold tracking-tight">SYSTEM CONTROLS</Text>
          <Text className="text-slate-400 text-xs mt-0.5">Watering Override Center</Text>
        </View>

        {/* Dynamic Mode Badge */}
        <View className={`px-3 py-1 rounded-full border ${systemMode === 'AUTO' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
          <Text className={`text-xs font-bold ${systemMode === 'AUTO' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {systemMode} PILOT
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 20 }}>
        
        {/* MODE OVERRIDE CONTROLLER CARD */}
        <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 mb-5 shadow-lg relative overflow-hidden">
          <View className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl" />
          
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-white font-bold text-base">Autopilot Irrigation</Text>
              <Text className="text-slate-400 text-xs mt-1 leading-relaxed">
                When enabled, P-WOS analyzes physical soil humidity, VPD indexes, and live weather conditions to trigger watering cycles automatically.
              </Text>
            </View>

            {/* Custom iOS-style Switch Toggle */}
            <Pressable
              onPress={handleToggleMode}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ${systemMode === 'AUTO' ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <View
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${systemMode === 'AUTO' ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </Pressable>
          </View>

          {systemMode === 'AUTO' ? (
            <View className="bg-[#1f1f23] rounded-2xl p-3 flex-row items-center space-x-2">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Text className="text-emerald-400 text-xs font-semibold flex-1">
                Autopilot Active. Physical valves and solenoids are governed by AI algorithms.
              </Text>
            </View>
          ) : (
            <View className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 flex-row items-center space-x-2">
              <View className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <Text className="text-rose-400 text-xs font-semibold flex-1">
                AUTOPILOT OFF. Automatic watering rules are halted. Direct manual overrides are enabled.
              </Text>
            </View>
          )}
        </View>

        {/* MANUAL VALVE INITIATION CARD */}
        <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 mb-5 shadow-lg relative overflow-hidden">
          <View className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
          
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Manual Solenoid Trigger</Text>

          {/* DURATION SLIDER CONFIG */}
          <View className="items-center mb-6">
            <Text className="text-slate-400 text-sm mb-1">Watering Duration</Text>
            <View className="flex-row items-center space-x-5 mt-2">
              <Pressable
                onPress={() => adjustDuration(-5)}
                className="w-11 h-11 bg-[#1f1f23] border border-slate-700 rounded-full items-center justify-center active:bg-slate-700"
              >
                <Text className="text-white text-2xl font-bold">-</Text>
              </Pressable>
              
              <View className="items-center min-w-[80px]">
                <Text className="text-white text-4xl font-extrabold tracking-tighter">{duration}</Text>
                <Text className="text-slate-500 text-xs uppercase font-bold mt-0.5">seconds</Text>
              </View>

              <Pressable
                onPress={() => adjustDuration(5)}
                className="w-11 h-11 bg-[#1f1f23] border border-slate-700 rounded-full items-center justify-center active:bg-slate-700"
              >
                <Text className="text-white text-2xl font-bold">+</Text>
              </Pressable>
            </View>
          </View>

          {/* WATER TRIGGER BUTTON */}
          {systemMode === 'AUTO' && !pumpActive ? (
            <View className="bg-slate-800 border border-slate-700 rounded-2xl py-4.5 items-center opacity-50">
              <Text className="text-slate-500 font-bold uppercase tracking-wider text-base">Valves Locked in Auto</Text>
              <Text className="text-slate-500 text-xs mt-1">Switch to MANUAL pilot to run manual watering</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleWaterClick}
              className={`rounded-2xl py-4.5 items-center justify-center flex-row space-x-2.5 active:scale-98 shadow-md border ${
                pumpActive 
                  ? 'bg-rose-600 border-rose-500' 
                  : 'bg-emerald-600 border-emerald-500'
              }`}
            >
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                {pumpActive ? (
                  <Rect x="4" y="4" width="16" height="16" rx="2" />
                ) : (
                  <Path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                )}
              </Svg>
              <Text className="text-white font-bold uppercase tracking-wider text-base">
                {pumpActive ? `Stop Irrigation (${pumpTimerLeft}s Left)` : 'Initiate Watering Now'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* MQTT BROADCAST TERMINAL LOG */}
        <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 shadow-lg overflow-hidden">
          <View className="flex-row items-center justify-between border-b border-[#1f1f23] pb-3.5 mb-3">
            <View className="flex-row items-center space-x-2">
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <Polyline points="4 17 10 11 4 5" />
                <Line x1="12" y1="19" x2="20" y2="19" />
              </Svg>
              <Text className="text-white font-bold tracking-tight">MQTT Broadcast Console</Text>
            </View>
            <View className="bg-[#1f1f23] px-2.5 py-0.5 rounded-full border border-slate-700">
              <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-wide">Live Frame Listener</Text>
            </View>
          </View>

          {/* Black Matrix Screen */}
          <View className="bg-[#09090b] border border-[#1f1f23] rounded-2xl p-3 h-64 overflow-hidden relative">
            {mqttLogs.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-emerald-500/40 text-xs font-mono">Listening for MQTT frames...</Text>
                <Text className="text-slate-600 text-[10px] font-mono mt-1">Topic: pwos/#</Text>
              </View>
            ) : (
              <ScrollView 
                ref={(r) => r?.scrollTo({ y: 0, animated: true })} 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {mqttLogs.map((log, index) => (
                  <Text key={index} className="text-emerald-400 text-xs font-mono leading-relaxed mb-1.5 selection:bg-emerald-500/20">
                    {log}
                  </Text>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
