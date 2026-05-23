import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { View, Text, Pressable } from '../../src/components/ui';
import { useAppStore, actions } from '../../src/store/useAppStore';
import { Svg, Circle, Path, Rect } from 'react-native-svg';

export default function PumpTimerModal() {
  const pumpActive = useAppStore(s => s.pumpActive);
  const pumpTimerLeft = useAppStore(s => s.pumpTimerLeft);
  const recommendedDuration = useAppStore(s => s.recommendedDuration) || 30;

  // Auto-dismiss the modal if the watering cycle ends
  useEffect(() => {
    if (!pumpActive) {
      if (router.canGoBack()) {
        router.back();
      }
    }
  }, [pumpActive]);

  const handleCancelWatering = () => {
    actions.stopPump();
  };

  // Circular progress calculations for the modal
  const size = 200;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(recommendedDuration, pumpTimerLeft) / recommendedDuration) * circumference;

  return (
    <View className="flex-1 bg-black/60 items-center justify-center p-6 backdrop-blur-md">
      {/* Container glassmorphism card */}
      <View className="bg-[#0c1220]/90 border border-emerald-500/20 rounded-3xl p-8 items-center w-full max-w-[340px] shadow-2xl relative">
        <View className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
        
        <Text className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">Irrigation Cycle Active</Text>
        
        {/* COUNTDOWN GAUGE */}
        <View className="items-center justify-center relative mb-8">
          <Svg width={size} height={size}>
            {/* Background Track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#131b2e"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Glowing Emerald progress circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          
          {/* Big number in center */}
          <View className="absolute items-center justify-center">
            <Text className="text-white text-5xl font-black tracking-tighter">
              {pumpTimerLeft}
            </Text>
            <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-1">Seconds Left</Text>
          </View>
        </View>

        {/* FLOW GRAPHICS */}
        <View className="items-center mb-8">
          <Text className="text-slate-300 text-sm font-semibold">Watering Solenoid Opened</Text>
          <Text className="text-slate-500 text-xs mt-1 text-center">
            Physical hardware pin is executing water delivery. Valves will shut off automatically when countdown reaches zero.
          </Text>
        </View>

        {/* STOP BUTTON */}
        <Pressable
          onPress={handleCancelWatering}
          className="bg-rose-600 border border-rose-500 rounded-2xl py-4 px-6 w-full items-center justify-center flex-row active:scale-98 shadow-lg shadow-rose-950/40"
        >
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ marginRight: 8 }}>
            <Rect x="4" y="4" width="16" height="16" rx="2" />
          </Svg>
          <Text className="text-white font-bold uppercase tracking-wider text-xs">Terminate Cycle</Text>
        </Pressable>
      </View>
    </View>
  );
}
