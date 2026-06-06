import React, { useState, useEffect } from 'react';
import { RefreshControl } from 'react-native';
import { View, Text, ScrollView, SafeAreaView, Pressable } from '../../src/components/ui';
import { api, ModelVersion } from '../../src/services/api';
import { actions } from '../../src/store/useAppStore';
import { Svg, Circle, Path, Line } from 'react-native-svg';

export default function ModelRegistryScreen() {
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await api.getModelVersions();
      // Sort to show active first or latest first
      setVersions(data.sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0)));
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load model registry. Ensure backend is online.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const handleRefresh = () => {
    fetchVersions(true);
  };

  const handleRetrain = async () => {
    setRefreshing(true);
    const success = await actions.retrainModel();
    if (success) {
      // Allow some time for training script to write to db, then fetch
      setTimeout(() => {
        fetchVersions(true);
      }, 2000);
    } else {
      setRefreshing(false);
    }
  };

  const formatPercent = (val: number) => {
    return `${(val * 100).toFixed(1)}%`;
  };

  const formatDate = (tsStr: string) => {
    try {
      const date = new Date(tsStr);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return tsStr;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#000000]" edges={['top']}>
      {/* HEADER */}
      <View className="px-6 py-4 border-b border-[#1f1f23] bg-[#09090b] flex-row items-center justify-between">
        <View>
          <Text className="text-white text-xl font-bold tracking-tight">MODEL REGISTRY</Text>
          <Text className="text-slate-400 text-xs mt-0.5 uppercase">AI Inference Engines</Text>
        </View>

        <Pressable
          onPress={handleRetrain}
          disabled={refreshing || loading}
          className="bg-purple-600 border border-purple-500 rounded-xl px-3 py-2 flex-row items-center active:scale-98 disabled:opacity-50"
        >
          <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ marginRight: 6 }}>
            <Path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </Svg>
          <Text className="text-white font-bold uppercase tracking-wider text-[10px]">Retrain</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400 font-bold tracking-wider animate-pulse">LOADING REGISTRY...</Text>
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
            <Text className="text-rose-400 font-black tracking-widest text-xs uppercase mb-2">Registry Offline</Text>
            <Text className="text-slate-400 text-[10px] text-center leading-relaxed">{error}</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
        >
          {versions.map((model) => (
            <View
              key={model.id}
              className={`bg-[#09090b] border ${
                model.is_active ? 'border-emerald-500/50 shadow-emerald-500/5' : 'border-[#1f1f23]'
              } rounded-3xl p-5 mb-5 shadow-lg`}
            >
              {/* Card Title */}
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white font-bold text-base font-mono">{model.version_tag}</Text>
                {model.is_active && (
                  <View className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    <Text className="text-emerald-400 text-[9px] font-black uppercase tracking-wider">Active</Text>
                  </View>
                )}
              </View>

              {/* Sub-meta details */}
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-[#1f1f23]">
                <Text className="text-slate-400 text-xs font-mono">{formatDate(model.timestamp)}</Text>
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  Samples: {model.training_samples?.toLocaleString() || '0'}
                </Text>
              </View>

              {/* Metrics grid progress bars */}
              <View className="space-y-3 mb-4">
                {[
                  { label: 'Accuracy', val: model.accuracy, color: 'bg-emerald-500' },
                  { label: 'Precision', val: model.precision, color: 'bg-blue-500' },
                  { label: 'Recall', val: model.recall, color: 'bg-purple-500' },
                  { label: 'F1 Score', val: model.f1_score, color: 'bg-amber-500' },
                ].map((metric) => (
                  <View key={metric.label}>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{metric.label}</Text>
                      <Text className="text-white text-[11px] font-mono font-bold">{formatPercent(metric.val)}</Text>
                    </View>
                    <View className="w-full h-1.5 bg-[#1f1f23] rounded-full overflow-hidden">
                      <View className={`h-full rounded-full ${metric.color}`} style={{ width: `${metric.val * 100}%` }} />
                    </View>
                  </View>
                ))}
              </View>

              {/* Model File Path */}
              {model.model_path && (
                <View className="bg-[#09090b] border border-[#1f1f23] p-2.5 rounded-xl">
                  <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-wider mb-1">Model File</Text>
                  <Text className="text-slate-400 text-[9px] font-mono truncate">{model.model_path.split(/[\\/]/).pop()}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
