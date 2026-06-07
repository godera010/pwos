import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain } from 'lucide-react';
import { api, type MLDecision } from '../services/api';

export const MLDecisionLog: React.FC<{ limit?: number }> = ({ limit = 10 }) => {
    const [decisions, setDecisions] = useState<MLDecision[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDecisions = async () => {
            try {
                const data = await api.getMLDecisions(limit);
                setDecisions(data);
            } catch (err) {
                console.error("Failed to fetch ML decisions", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDecisions();
        const interval = setInterval(fetchDecisions, 5000);
        return () => clearInterval(interval);
    }, [limit]);

    const getDecisionColor = (decision: string) => {
        switch (decision) {
            case 'NOW': return 'bg-rose-500 hover:bg-rose-600 text-white border-transparent';
            case 'STOP': return 'bg-rose-500 hover:bg-rose-600 text-white border-transparent';
            case 'STALL': return 'bg-amber-500 hover:bg-amber-600 text-white border-transparent';
            case 'MONITOR': return 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent';
            default: return 'bg-slate-500 hover:bg-slate-600 text-white border-transparent';
        }
    };

    return (
        <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl overflow-hidden flex flex-col h-full">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="size-4 text-indigo-500" />
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">ML Decision Log</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                        <tr>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Moist</th>
                            <th className="px-4 py-3">Temp</th>
                            <th className="px-4 py-3">Humid</th>
                            <th className="px-4 py-3">VPD</th>
                            <th className="px-4 py-3">Wind</th>
                            <th className="px-4 py-3">Fcst</th>
                            <th className="px-4 py-3">Weather</th>
                            <th className="px-4 py-3">Period</th>
                            <th className="px-4 py-3">Decision</th>
                            <th className="px-4 py-3">Conf</th>
                            <th className="px-4 py-3 w-full">Reason</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading && decisions.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="px-4 py-8 text-center text-slate-500">Loading ML logs...</td>
                            </tr>
                        ) : decisions.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="px-4 py-8 text-center text-slate-500">No ML decisions recorded recently.</td>
                            </tr>
                        ) : (
                            decisions.map((d) => {
                                let weather = "Clear";
                                let period = "Unknown";
                                try {
                                    if (d.features_json) {
                                        const f = JSON.parse(d.features_json);
                                        if (f.is_raining === 1) weather = "Rain";
                                        else if (f.is_high_wind === 1) weather = "High Wind";
                                        else if (f.is_extreme_vpd === 1) weather = "Extreme Heat";

                                        if (f.is_hot_hours === 1) period = "Midday (Hot)";
                                        else if (f.is_daytime === 1) period = "Daytime";
                                        else if (f.is_daytime === 0) period = "Night";
                                    }
                                } catch (e) {}

                                return (
                                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                                        {new Date(d.timestamp.replace(/ GMT$/, '').replace(/Z$/, '')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{d.soil_moisture ?? '--'}%</td>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{d.temperature ?? '--'}°C</td>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{d.humidity ?? '--'}%</td>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{d.vpd !== null ? d.vpd.toFixed(2) + ' kPa' : '--'}</td>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{d.wind_speed ?? '--'} km/h</td>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{d.forecast_minutes}m</td>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{weather}</td>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{period}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant="default" className={`text-[9px] font-black tracking-wider ${getDecisionColor(d.decision)}`}>
                                            {d.decision}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{d.confidence !== null ? `${d.confidence}%` : '--'}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-normal min-w-[250px] max-w-md" title={d.reason || ''}>
                                        {d.reason}
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
};
