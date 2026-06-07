import React from 'react';
import { View, Text, Pressable } from './ui';
import { Svg, Path, Circle, Line, Polyline } from 'react-native-svg';

const PowerIcon = ({ color = '#94a3b8' }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <Line x1="12" y1="2" x2="12" y2="12" />
  </Svg>
);

const DropletsIcon = ({ color = '#ffffff' }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7 2.99 7 2.99s-2.29 6.08-3.29 7.08c-1.14.93-1.71 2.03-1.71 3.19C2 14.47 3.8 16.3 6 16.3Z" />
  </Svg>
);

interface QuickActionsProps {
  isAuto: boolean;
  isPumpOn: boolean;
  isApiOffline: boolean;
  isHardwareOnline: boolean;
  connected: boolean;
  moisture: number;
  isMoistureSaturated: boolean;
  onToggleMode: () => void;
  onTogglePump: (checked: boolean) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  isAuto,
  isPumpOn,
  isApiOffline,
  isHardwareOnline,
  connected,
  isMoistureSaturated,
  onToggleMode,
  onTogglePump
}) => {
  const isSystemDown = !connected || !isHardwareOnline;

  return (
    <View className={`w-full rounded-2xl shadow-lg border mb-5 overflow-hidden ${
      isSystemDown ? 'border-red-500/50 bg-[#000000]' : 'border-[#1f1f23] bg-[#09090b]'
    }`}>
      {/* Header Section */}
      <View className={`px-4 py-3 flex-row items-center justify-between border-b border-[#1f1f23] ${isSystemDown ? 'bg-red-500/5' : ''}`}>
        <Text className="text-[11px] font-black text-white uppercase tracking-widest">
          Quick Actions
        </Text>
        <View className="flex-row space-x-1">
          {!connected && <View className="bg-red-500 px-1.5 py-0.5 rounded"><Text className="text-[8px] text-white font-bold uppercase">Broker Offline</Text></View>}
          {connected && !isHardwareOnline && <View className="bg-red-500 px-1.5 py-0.5 rounded"><Text className="text-[8px] text-white font-bold uppercase">Hardware Offline</Text></View>}
        </View>
      </View>
      
      {/* Main Content Area */}
      <View className="p-4 flex-row justify-around">
        
        {/* AI Autopilot Toggle */}
        <View className="items-center justify-center">
          <Pressable
            disabled={!connected || !isHardwareOnline}
            onPress={onToggleMode}
            className={`w-20 h-10 rounded-full border-2 justify-center px-1 ${
              isAuto ? 'bg-emerald-900/40 border-emerald-500' : 'bg-zinc-800 border-zinc-700'
            } ${(!connected || !isHardwareOnline) ? 'opacity-30' : ''}`}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center shadow-md ${
              isAuto ? 'bg-emerald-500 ml-auto' : 'bg-zinc-500'
            }`}>
              <View className="w-1.5 h-1.5 rounded-full bg-white/40" />
            </View>
          </Pressable>
          <View className="mt-3 items-center">
            <Text className={`text-sm font-bold uppercase ${isAuto ? 'text-emerald-500' : 'text-white'}`}>
              Autopilot {isAuto ? 'ON' : 'OFF'}
            </Text>
            <Text className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isAuto ? 'text-emerald-600' : 'text-zinc-500'}`}>
              {isAuto ? 'AI ACTIVE' : 'MANUAL'}
            </Text>
          </View>
        </View>

        {/* Pump Control Toggle */}
        <View className="items-center justify-center">
          <Pressable
            disabled={isAuto || !isHardwareOnline || (isMoistureSaturated && !isPumpOn)}
            onPress={() => onTogglePump(!isPumpOn)}
            className={`w-20 h-20 rounded-full border-4 items-center justify-center ${
              isPumpOn ? 'bg-emerald-500 border-emerald-600 shadow-lg' : 'bg-zinc-800 border-zinc-700'
            } ${(isAuto || !isHardwareOnline || (isMoistureSaturated && !isPumpOn)) ? 'opacity-50' : ''}`}
          >
            {isPumpOn ? <DropletsIcon /> : <PowerIcon />}
          </Pressable>
          <View className="mt-3 items-center">
            <Text className={`text-sm font-black uppercase ${isPumpOn ? 'text-emerald-500' : 'text-slate-400'}`}>
              {isPumpOn ? 'RUNNING' : 'STOPPED'}
            </Text>
            {isMoistureSaturated && !isPumpOn ? (
              <View className="bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded mt-1">
                <Text className="text-[7px] text-red-500 font-bold uppercase">Saturated</Text>
              </View>
            ) : (
              <Text className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Pump Relay</Text>
            )}
          </View>
        </View>

      </View>
    </View>
  );
};
