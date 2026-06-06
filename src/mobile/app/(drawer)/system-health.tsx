import React from 'react';
import { View, Text, ScrollView, SafeAreaView } from '../../src/components/ui';
import { useAppStore } from '../../src/store/useAppStore';

export default function SystemHealthScreen() {
  const apiConnected = useAppStore(s => s.apiConnected);
  const mqttConnected = useAppStore(s => s.mqttConnected);

  const checks = [
    { name: 'API Server', status: apiConnected ? 'Online' : 'Offline', color: apiConnected ? 'text-emerald-400' : 'text-rose-400', bg: apiConnected ? 'bg-emerald-500/10' : 'bg-rose-500/10' },
    { name: 'MQTT Broker', status: mqttConnected ? 'Online' : 'Offline', color: mqttConnected ? 'text-emerald-400' : 'text-rose-400', bg: mqttConnected ? 'bg-emerald-500/10' : 'bg-rose-500/10' },
    { name: 'Sensor Array', status: 'Online', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { name: 'Pump Controller', status: 'Online', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { name: 'ML Inference Engine', status: 'Online', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#000000]" edges={['top']}>
      <View className="px-6 py-4 border-b border-[#1f1f23] bg-[#09090b] flex-row items-center justify-between">
        <View>
          <Text className="text-white text-xl font-bold tracking-tight">SYSTEM HEALTH</Text>
          <Text className="text-slate-400 text-xs mt-0.5 uppercase">Service Diagnostic</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 20 }}>
        <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 shadow-lg mb-5">
          <Text className="text-white font-bold text-base mb-4 border-b border-[#1f1f23] pb-3">Service Diagnostics</Text>
          {checks.map((check, idx) => (
            <View key={idx} className="flex-row items-center justify-between mb-4 last:mb-0">
              <Text className="text-slate-300 font-bold">{check.name}</Text>
              <View className={`${check.bg} px-3 py-1 rounded-lg`}>
                <Text className={`${check.color} font-bold text-[10px] uppercase`}>{check.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 shadow-lg mb-5">
          <Text className="text-white font-bold text-base mb-4 border-b border-[#1f1f23] pb-3">System Resources</Text>
          <View className="mb-4">
            <View className="flex-row justify-between mb-1">
              <Text className="text-slate-400 text-xs">CPU Usage</Text>
              <Text className="text-white text-xs">12%</Text>
            </View>
            <View className="w-full h-1.5 bg-[#1f1f23] rounded-full overflow-hidden">
              <View className="h-full rounded-full bg-emerald-500" style={{ width: '12%' }} />
            </View>
          </View>
          <View className="mb-4">
            <View className="flex-row justify-between mb-1">
              <Text className="text-slate-400 text-xs">Memory Usage</Text>
              <Text className="text-white text-xs">48%</Text>
            </View>
            <View className="w-full h-1.5 bg-[#1f1f23] rounded-full overflow-hidden">
              <View className="h-full rounded-full bg-blue-500" style={{ width: '48%' }} />
            </View>
          </View>
          <View className="">
            <View className="flex-row justify-between mb-1">
              <Text className="text-slate-400 text-xs">Storage</Text>
              <Text className="text-white text-xs">62%</Text>
            </View>
            <View className="w-full h-1.5 bg-[#1f1f23] rounded-full overflow-hidden">
              <View className="h-full rounded-full bg-amber-500" style={{ width: '62%' }} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
