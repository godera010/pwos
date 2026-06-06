import React from 'react';
import { View, Text, ScrollView, SafeAreaView } from '../../src/components/ui';
import { useAppStore } from '../../src/store/useAppStore';
import { Svg, Circle, Path, Polyline, Line, Rect } from 'react-native-svg';

export default function MLInsightsScreen() {
  const predictedAction = useAppStore(s => s.predictedAction);
  const predictedConfidence = useAppStore(s => s.predictedConfidence);
  const activeCrop = useAppStore(s => s.activeCrop);
  const settings = useAppStore(s => s.settings);

  const featureImportance = [
    { name: 'Soil Moisture', value: 0.339, color: '#10b981' }, 
    { name: 'Moisture (6h Roll)', value: 0.293, color: '#06b6d4' },
    { name: 'Day of Week', value: 0.113, color: '#f59e0b' },
    { name: 'Time of Day', value: 0.088, color: '#8b5cf6' },
    { name: 'Temp (6h Roll)', value: 0.086, color: '#f97316' },   
    { name: 'Moisture Δ Rate', value: 0.045, color: '#ec4899' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#000000]" edges={['top']}>
      <View className="px-6 py-4 border-b border-[#1f1f23] bg-[#09090b] flex-row items-center justify-between">
        <View>
          <Text className="text-white text-xl font-bold tracking-tight">ML INSIGHTS</Text>
          <Text className="text-slate-400 text-xs mt-0.5 uppercase">Real-time Analysis</Text>
        </View>
        <View className="px-3 py-1 rounded-full border bg-purple-500/10 border-purple-500/30">
          <Text className="text-xs font-bold text-purple-400">Core Intelligence</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 20 }}>
        
        {/* Active Crop Context */}
        {activeCrop && (
          <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 mb-5 shadow-lg flex-row items-center space-x-4">
            <View className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <Path d="M7 20h10M10 20c5.5-5.5.5-16 .5-16s-5.5 10.5 0 16z" />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-base">Crop: {activeCrop.name.toUpperCase()}</Text>
              <Text className="text-slate-400 text-xs mt-1 leading-relaxed">
                Autopilot safety triggers below <Text className="text-red-400 font-bold">{settings?.crop_critical_moisture ?? 15}%</Text> or above <Text className="text-indigo-400 font-bold">{settings?.crop_high_threshold ?? 85}%</Text> moisture.
              </Text>
            </View>
          </View>
        )}

        {/* Live Confidence Gauge */}
        <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-6 mb-5 items-center shadow-lg relative overflow-hidden">
          <Text className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Live Confidence</Text>
          <Text className={`text-6xl font-black ${predictedConfidence > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {predictedConfidence.toFixed(0)}%
          </Text>
          <Text className="text-slate-500 text-[10px] font-bold uppercase mt-2">Certainty Score</Text>
          
          <View className="w-full h-2 bg-[#1f1f23] rounded-full mt-6 overflow-hidden">
            <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${predictedConfidence}%` }} />
          </View>
          <View className="w-full flex-row justify-between mt-2">
            <Text className="text-slate-500 text-[10px] font-bold uppercase">Uncertain</Text>
            <Text className="text-slate-500 text-[10px] font-bold uppercase">Optimal</Text>
          </View>
        </View>

        {/* Decision Logic Trace */}
        <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 mb-5 shadow-lg">
          <Text className="text-white font-bold text-base mb-4 border-b border-[#1f1f23] pb-3">Decision Logic Trace</Text>
          
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 rounded-xl border border-[#27272a] bg-[#000000] items-center justify-center mr-3">
              <Text className="text-white font-bold">1</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold">Input Analysis</Text>
              <Text className="text-slate-400 text-xs">Processing 12-dim feature vector</Text>
            </View>
            <Text className="text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded">SUCCESS</Text>
          </View>

          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 rounded-xl border border-[#27272a] bg-[#000000] items-center justify-center mr-3">
              <Text className="text-white font-bold">2</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold">Feature Weighing</Text>
              <Text className="text-slate-400 text-xs">Soil moisture dominates (96.7%)</Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-xl border border-[#27272a] bg-[#000000] items-center justify-center mr-3">
              <Text className="text-white font-bold">3</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold">Final Output</Text>
              <Text className="text-slate-400 text-xs">Action: <Text className="font-bold text-white">{predictedAction}</Text></Text>
            </View>
            <Text className="text-blue-400 text-[10px] font-bold bg-blue-500/10 px-2 py-1 rounded">{predictedAction}</Text>
          </View>
        </View>

        {/* Feature Importance */}
        <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 shadow-lg mb-5">
          <Text className="text-white font-bold text-base mb-4 border-b border-[#1f1f23] pb-3">Feature Importance</Text>
          {featureImportance.map((feat, idx) => (
            <View key={idx} className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-slate-300 text-xs">{feat.name}</Text>
                <Text className="text-slate-500 text-xs">{(feat.value * 100).toFixed(1)}%</Text>
              </View>
              <View className="w-full h-1.5 bg-[#1f1f23] rounded-full overflow-hidden">
                <View className="h-full rounded-full" style={{ width: `${feat.value * 100}%`, backgroundColor: feat.color }} />
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
