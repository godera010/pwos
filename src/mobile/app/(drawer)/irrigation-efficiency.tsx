import React, { useState, useEffect } from 'react';
import { RefreshControl } from 'react-native';
import { View, Text, ScrollView, SafeAreaView, Pressable } from '../../src/components/ui';
import { api, EfficiencySummary } from '../../src/services/api';
import { Svg, Circle, Path, Line } from 'react-native-svg';

const TIME_RANGES = [
  { label: '24 H', hours: 24 },
  { label: '7 D',  hours: 168 },
  { label: '30 D', hours: 720 },
];

export default function IrrigationEfficiencyScreen() {
  const [selectedHours, setSelectedHours] = useState(168);
  const [summary, setSummary] = useState<EfficiencySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (hours: number, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await api.getEfficiencySummary(hours);
      setSummary(data);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load irrigation efficiency data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary(selectedHours);
  }, [selectedHours]);

  const handleRefresh = () => {
    fetchSummary(selectedHours, true);
  };

  const fmtDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#000000]" edges={['top']}>
      {/* HEADER */}
      <View className="px-6 py-4 border-b border-[#1f1f23] bg-[#09090b] flex-row items-center justify-between">
        <View>
          <Text className="text-white text-xl font-bold tracking-tight">EFFICIENCY</Text>
          <Text className="text-slate-400 text-xs mt-0.5 uppercase">Resource Optimization</Text>
        </View>

        {/* TIME RANGE SELECTOR */}
        <View className="flex-row bg-[#1f1f23] rounded-xl overflow-hidden p-0.5 border border-[#27272a]">
          {TIME_RANGES.map((r) => (
            <Pressable
              key={r.hours}
              onPress={() => setSelectedHours(r.hours)}
              className={`px-3 py-1.5 rounded-lg ${
                selectedHours === r.hours ? 'bg-emerald-600' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-[9px] font-black uppercase tracking-wider ${
                  selectedHours === r.hours ? 'text-white' : 'text-slate-400'
                }`}
              >
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400 font-bold tracking-wider animate-pulse">COMPUTING METRICS...</Text>
        </View>
      ) : error ? (
        <ScrollView
          className="flex-1 px-5 pt-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f43f5e" />}
        >
          <View className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-6 items-center justify-center text-center">
            <Svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" style={{ marginBottom: 12 }}>
              <Circle cx="12" cy="12" r="10" />
              <Line x1="12" y1="8" x2="12" y2="12" />
              <Line x1="12" y1="16" x2="12.01" y2="16" />
            </Svg>
            <Text className="text-rose-400 font-black tracking-widest text-xs uppercase mb-2">Metrics Offline</Text>
            <Text className="text-slate-400 text-[10px] text-center leading-relaxed">{error}</Text>
          </View>
        </ScrollView>
      ) : !summary ? null : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
        >
          {/* OVERALL EFFICIENCY HERO CARD */}
          <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-6 mb-5 items-center shadow-lg relative overflow-hidden">
            <Text className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Overall Water Saved</Text>
            <Text className="text-6xl font-black text-emerald-500">{summary.estimated_savings_percent.toFixed(1)}%</Text>
            <Text className="text-slate-500 text-[10px] font-bold uppercase mt-2 text-center px-4 leading-relaxed">
              Calculated pump runtime saved vs traditional timed irrigation
            </Text>
          </View>

          {/* GRID OF STATS */}
          <View className="flex-row flex-wrap justify-between mb-5">
            {/* Total Events */}
            <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-4 w-[48%] mb-4 shadow-lg">
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Total Cycles</Text>
              <Text className="text-blue-400 text-2xl font-black">{summary.total_events}</Text>
              <Text className="text-slate-400 text-[9px] mt-1 font-mono">{fmtDuration(summary.total_duration_seconds)} active</Text>
            </View>

            {/* AI Percentage */}
            <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-4 w-[48%] mb-4 shadow-lg">
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">AI Autopilot</Text>
              <Text className="text-emerald-400 text-2xl font-black">{summary.ai_percentage.toFixed(0)}%</Text>
              <Text className="text-slate-400 text-[9px] mt-1 font-mono">{summary.ai_events} AI cycles</Text>
            </View>

            {/* Runtime Saved */}
            <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-4 w-[48%] shadow-lg">
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Runtime Saved</Text>
              <Text className="text-purple-400 text-2xl font-black">{fmtDuration(summary.estimated_water_saved_seconds)}</Text>
              <Text className="text-slate-400 text-[9px] mt-1">Water conserved</Text>
            </View>

            {/* Moisture Delta */}
            <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-4 w-[48%] shadow-lg">
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Avg Moisture Δ</Text>
              <Text className="text-amber-400 text-2xl font-black">
                +{(summary.avg_moisture_after - summary.avg_moisture_before).toFixed(1)}%
              </Text>
              <Text className="text-slate-400 text-[9px] mt-1 font-mono">
                {summary.avg_moisture_before.toFixed(0)}% → {summary.avg_moisture_after.toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* RECENT EVENTS SECTION */}
          <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 shadow-lg">
            <Text className="text-white font-bold text-base mb-4 pb-3 border-b border-[#1f1f23]">Recent Cycles</Text>
            {summary.recent_events.length === 0 ? (
              <Text className="text-slate-500 text-xs py-4 text-center">No irrigation cycles recorded in this timeframe.</Text>
            ) : (
              <View className="space-y-4">
                {summary.recent_events.map((e) => (
                  <View key={e.id} className="flex-row items-center justify-between border-b border-[#1f1f23]/40 pb-3">
                    <View className="flex-col">
                      <View className="flex-row items-center mb-1">
                        <View className={`px-2 py-0.5 rounded-full border mr-2 ${
                          e.trigger_type !== 'MANUAL'
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-amber-500/10 border-amber-500/20'
                        }`}>
                          <Text className={`text-[8px] font-black uppercase tracking-wider ${
                            e.trigger_type !== 'MANUAL' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {e.trigger_type}
                          </Text>
                        </View>
                        <Text className="text-white font-bold text-xs">{fmtDuration(e.duration_seconds)}</Text>
                      </View>
                      <Text className="text-slate-500 text-[9px] font-mono">{formatTimestamp(e.timestamp)}</Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-slate-400 text-[10px] mb-0.5">Moisture Impact</Text>
                      {e.moisture_delta !== null ? (
                        <Text className={`text-xs font-black font-mono ${e.moisture_delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {e.moisture_delta >= 0 ? '+' : ''}{e.moisture_delta.toFixed(1)}%
                        </Text>
                      ) : (
                        <Text className="text-slate-500 text-xs font-mono">—</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
