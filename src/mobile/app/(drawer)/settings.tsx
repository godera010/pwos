import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, SafeAreaView } from '../../src/components/ui';
import { useAppStore, actions } from '../../src/store/useAppStore';
import { api } from '../../src/services/api';
import { Svg, Circle, Path, Rect, Polyline } from 'react-native-svg';

export default function SettingsScreen() {
  const storeIp = useAppStore(s => s.customServerIp);

  // Form states
  const [serverIp, setServerIp] = useState(storeIp);
  const [moistureThreshold, setMoistureThreshold] = useState('30');
  const [maxDuration, setMaxDuration] = useState('60');
  const [latitude, setLatitude] = useState('-1.2921');
  const [longitude, setLongitude] = useState('36.8219');
  
  const [savingSettings, setSavingSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data) {
        if (data.moisture_threshold !== undefined) setMoistureThreshold(String(data.moisture_threshold));
        if (data.max_duration !== undefined) setMaxDuration(String(data.max_duration));
        if (data.latitude !== undefined) setLatitude(String(data.latitude));
        if (data.longitude !== undefined) setLongitude(String(data.longitude));
      }
    } catch (e) {
      console.error('Settings fetch error', e);
    }
  };

  useEffect(() => {
    loadSettings();
    setServerIp(storeIp);
  }, [storeIp]);

  const handleSaveNetwork = () => {
    actions.saveCustomIp(serverIp);
    triggerSuccess('Server network configurations successfully updated!');
  };

  const handleSaveParameters = async () => {
    setSavingSettings(true);
    setSuccessMsg('');
    try {
      await api.saveSettings({
        moisture_threshold: parseFloat(moistureThreshold),
        max_duration: parseInt(maxDuration, 10),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });
      triggerSuccess('Solenoid thresholds & geolocation profiles successfully synced!');
    } catch (e) {
      console.error('Failed saving parameters', e);
    } finally {
      setSavingSettings(false);
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090d16]" edges={['top']}>
      {/* HEADER */}
      <View className="px-6 py-4 border-b border-[#131b2e] bg-[#0c1220]">
        <Text className="text-white text-xl font-bold tracking-tight">SYSTEM SETTINGS</Text>
        <Text className="text-slate-400 text-xs mt-0.5">Configuration & Network Profiles</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 20 }}>
        
        {/* TOAST SUCCESS PANEL */}
        {successMsg !== '' && (
          <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 mb-5 flex-row items-center space-x-2">
            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <Polyline points="22 4 12 14.01 9 11.01" />
            </Svg>
            <Text className="text-emerald-400 text-xs font-semibold flex-1">
              {successMsg}
            </Text>
          </View>
        )}

        {/* SERVER HOST NETWORK CONTROLLER */}
        <View className="bg-[#0c1220] border border-[#131b2e] rounded-3xl p-5 mb-5 shadow-lg relative overflow-hidden">
          <Text className="text-white font-bold text-base mb-1">Server Host Configuration</Text>
          <Text className="text-slate-400 text-xs mb-4 leading-relaxed">
            By default, P-WOS maps to simulator loopbacks. Input your computer's local Wi-Fi IP to link physical mobile hardware.
          </Text>

          {/* INPUT FIELD */}
          <View className="mb-4">
            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Wi-Fi Gateway / Host IP</Text>
            <TextInput
              value={serverIp}
              onChangeText={setServerIp}
              placeholder="e.g. 192.168.1.15"
              placeholderTextColor="#475569"
              className="bg-[#070b13] border border-[#131b2e] rounded-2xl p-4 text-white font-semibold font-mono placeholder:text-slate-700"
              keyboardType="numeric"
            />
            <Text className="text-slate-500 text-[10px] mt-1.5 leading-relaxed">
              * Note: MQTT Port (9001) & REST API Port (5000) will be targeted automatically.
            </Text>
          </View>

          <Pressable
            onPress={handleSaveNetwork}
            className="bg-sky-600 border border-sky-500 rounded-2xl py-3.5 items-center justify-center flex-row active:scale-98"
          >
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ marginRight: 8 }}>
              <Path d="M5 12h14M12 5l7 7-7 7" />
            </Svg>
            <Text className="text-white font-bold uppercase tracking-wider text-xs">Link Host Network</Text>
          </Pressable>
        </View>

        {/* THRESHOLD IRRIGATION THRESHOLDS */}
        <View className="bg-[#0c1220] border border-[#131b2e] rounded-3xl p-5 mb-5 shadow-lg relative overflow-hidden">
          <Text className="text-white font-bold text-base mb-1">Irrigation Firing Bounds</Text>
          <Text className="text-slate-400 text-xs mb-4">Autonomous trigger limits governed by the OS</Text>

          {/* Moisture threshold input */}
          <View className="mb-4">
            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Soil Moisture Lower Limit (%)</Text>
            <TextInput
              value={moistureThreshold}
              onChangeText={setMoistureThreshold}
              placeholder="30"
              placeholderTextColor="#475569"
              className="bg-[#070b13] border border-[#131b2e] rounded-2xl p-4 text-white font-semibold font-mono"
              keyboardType="numeric"
            />
          </View>

          {/* Max watering duration input */}
          <View className="mb-5">
            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Max Water Cycle Duration (Seconds)</Text>
            <TextInput
              value={maxDuration}
              onChangeText={setMaxDuration}
              placeholder="60"
              placeholderTextColor="#475569"
              className="bg-[#070b13] border border-[#131b2e] rounded-2xl p-4 text-white font-semibold font-mono"
              keyboardType="numeric"
            />
          </View>

          <Pressable
            onPress={handleSaveParameters}
            disabled={savingSettings}
            className="bg-emerald-600 border border-emerald-500 rounded-2xl py-3.5 items-center justify-center flex-row active:scale-98"
          >
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ marginRight: 8 }}>
              <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <Polyline points="17 21 17 13 7 13 7 21" />
              <Polyline points="7 3 7 8 15 8" />
            </Svg>
            <Text className="text-white font-bold uppercase tracking-wider text-xs">
              {savingSettings ? 'Syncing...' : 'Save Parameters'}
            </Text>
          </Pressable>
        </View>

        {/* WEATHER COORDINATES / GEOLOCATION PROFILE */}
        <View className="bg-[#0c1220] border border-[#131b2e] rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <Text className="text-white font-bold text-base mb-1">Weather Station Coordinates</Text>
          <Text className="text-slate-400 text-xs mb-4">Target GPS coordinate parameters mapping weather calls</Text>

          <View className="flex-row justify-between mb-4">
            <View className="w-[47%]">
              <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Latitude</Text>
              <TextInput
                value={latitude}
                onChangeText={setLatitude}
                placeholder="-1.2921"
                placeholderTextColor="#475569"
                className="bg-[#070b13] border border-[#131b2e] rounded-2xl p-4 text-white font-semibold font-mono"
                keyboardType="numeric"
              />
            </View>
            <View className="w-[47%]">
              <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Longitude</Text>
              <TextInput
                value={longitude}
                onChangeText={setLongitude}
                placeholder="36.8219"
                placeholderTextColor="#475569"
                className="bg-[#070b13] border border-[#131b2e] rounded-2xl p-4 text-white font-semibold font-mono"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Pressable
            onPress={handleSaveParameters}
            className="bg-purple-600 border border-purple-500 rounded-2xl py-3.5 items-center justify-center flex-row active:scale-98"
          >
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ marginRight: 8 }}>
              <Circle cx="12" cy="12" r="10" />
              <Circle cx="12" cy="12" r="3" />
            </Svg>
            <Text className="text-white font-bold uppercase tracking-wider text-xs">Sync Geolocation</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
