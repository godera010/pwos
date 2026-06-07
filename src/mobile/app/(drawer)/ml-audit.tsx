import React, { useState, useEffect } from 'react';
import { RefreshControl } from 'react-native';
import { View, Text, ScrollView, SafeAreaView } from '../../src/components/ui';
import { api, MLDecision } from '../../src/services/api';
import { Svg, Circle, Path, Line } from 'react-native-svg';

export default function MLAuditScreen() {
  const [decisions, setDecisions] = useState<MLDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDecisions = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await api.getMLDecisions(50);
      setDecisions(data);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load model decisions audit trail.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const handleRefresh = () => {
    fetchDecisions(true);
  };

  const getDecisionStyles = (decision: string) => {
    switch (decision) {
      case 'NOW':
        return { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', bullet: 'bg-indigo-500' };
      case 'STALL':
        return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', bullet: 'bg-amber-500' };
      case 'STOP':
        return { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', bullet: 'bg-rose-500' };
      default:
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', bullet: 'bg-emerald-500' };
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts.replace(/ GMT$/, '').replace(/Z$/, ''));
      return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#000000]" edges={['top']}>
      {/* HEADER */}
      <View className="px-6 py-4 border-b border-[#1f1f23] bg-[#09090b] flex-row items-center justify-between">
        <View>
          <Text className="text-white text-xl font-bold tracking-tight">ML AUDIT</Text>
          <Text className="text-slate-400 text-xs mt-0.5 uppercase">Model Decision Log</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400 font-bold tracking-wider animate-pulse">PARSING AUDIT TRAIL...</Text>
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
            <Text className="text-rose-400 font-black tracking-widest text-xs uppercase mb-2">Audit Log Offline</Text>
            <Text className="text-slate-400 text-[10px] text-center leading-relaxed">{error}</Text>
          </View>
        </ScrollView>
      ) : decisions.length === 0 ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
        >
          <Text className="text-slate-500 text-sm font-bold uppercase tracking-wider">No audit logs found</Text>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
        >
          <View className="bg-[#09090b] border border-[#1f1f23] rounded-3xl p-5 shadow-lg">
            <Text className="text-white font-bold text-base mb-5 border-b border-[#1f1f23] pb-3">Audit Trail</Text>
            
            {decisions.map((log, idx) => {
              const style = getDecisionStyles(log.decision);
              return (
                <View key={log.id} className="flex-row mb-6 last:mb-0">
                  <View className="mr-3.5 items-center">
                    <View className={`w-3 h-3 rounded-full ${style.bullet} mt-1`} />
                    {idx !== decisions.length - 1 && <View className="w-0.5 h-full bg-[#1f1f23] mt-1" />}
                  </View>
                  <View className="flex-1 pb-4 border-b border-[#1f1f23]/40 last:border-0 last:pb-0">
                    <View className="flex-row justify-between items-center mb-1.5">
                      <View className="flex-row items-center">
                        <Text className="text-white font-bold text-sm mr-2">Decision Log #{log.id}</Text>
                        <View className={`px-2 py-0.5 rounded-full border ${style.bg} ${style.border}`}>
                          <Text className={`text-[8px] font-black uppercase tracking-wider ${style.color}`}>
                            {log.decision}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-slate-500 text-[10px] font-mono">{formatTimestamp(log.timestamp)}</Text>
                    </View>
                    
                    {/* Snapshots of variables */}
                    <View className="flex-row space-x-3 mb-2 mt-1">
                      {log.soil_moisture !== null && (
                        <View className="bg-[#09090b] border border-[#1f1f23] px-2 py-1 rounded-lg">
                          <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-wide">Moisture</Text>
                          <Text className="text-white text-[10px] font-mono font-bold">{log.soil_moisture.toFixed(1)}%</Text>
                        </View>
                      )}
                      {log.temperature !== null && (
                        <View className="bg-[#09090b] border border-[#1f1f23] px-2 py-1 rounded-lg">
                          <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-wide">Temp</Text>
                          <Text className="text-white text-[10px] font-mono font-bold">{log.temperature.toFixed(1)}°C</Text>
                        </View>
                      )}
                      {log.confidence !== null && (
                        <View className="bg-[#09090b] border border-[#1f1f23] px-2 py-1 rounded-lg">
                          <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-wide">Confidence</Text>
                          <Text className="text-indigo-400 text-[10px] font-mono font-bold">{log.confidence.toFixed(0)}%</Text>
                        </View>
                      )}
                    </View>

                    <Text className="text-slate-300 text-xs leading-relaxed">{log.reason || 'System logged decision process.'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
