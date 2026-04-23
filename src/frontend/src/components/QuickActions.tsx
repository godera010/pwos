import React from 'react';
import { Settings, ChevronRight, Droplets, Power, AlertTriangle, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";

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
    moisture,
    isMoistureSaturated,
    onToggleMode,
    onTogglePump
}) => {
    const isSystemDown = !connected || !isHardwareOnline;

    return (
        <div className={`w-full rounded-[1.5rem] shadow-lg overflow-hidden border-2 transition-all duration-500 flex flex-col h-full bg-white dark:bg-slate-900 ${
            isSystemDown ? 'border-red-500/50' : 'border-slate-100 dark:border-slate-800'
        }`}>
            {/* Header Section: Always Restored */}
            <div className={`px-4 py-3 shrink-0 border-b flex items-center justify-between ${
                isSystemDown ? 'bg-red-500/5 border-red-500/10' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800/50'
            }`}>
                <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
                    Quick Actions
                </h1>
                <div className="flex gap-1">
                    {!connected && <Badge variant="destructive" className="text-[8px] h-4 animate-pulse">Broker Offline</Badge>}
                    {connected && !isHardwareOnline && <Badge variant="destructive" className="text-[8px] h-4 bg-red-500 hover:bg-red-500 border-none">Hardware Offline</Badge>}
                </div>
            </div>
            
            {/* Main Content Area: Always 2-Column */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800 h-full relative">
                
                {/* Column 1: AI Autopilot - Accessible if MQTT is connected */}
                <div className="p-4 flex flex-col bg-slate-50/30 dark:bg-slate-800/10 min-h-[160px]">
                    <div className={`flex-1 rounded-[1.25rem] border transition-all duration-500 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 shadow-sm p-4 ${isAuto ? 'border-blue-500/30 ring-2 ring-blue-500/5' : 'border-slate-100 dark:border-slate-800'}`}>
                        <button
                            disabled={!connected} // Enabled even if hardware is offline to allow mode escape
                            onClick={onToggleMode}
                            className={`relative inline-flex h-12 w-24 items-center rounded-full transition-all duration-300 border-2 ${isAuto
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                } ${!connected ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                        >
                            <span className="sr-only">Toggle AI Autopilot</span>
                            <span className={`${isAuto ? 'translate-x-[52px] bg-blue-600' : 'translate-x-1.5 bg-slate-400'} inline-block h-8 w-8 transform rounded-full transition-all duration-500 ease-in-out shadow-md flex items-center justify-center`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                            </span>
                        </button>
                        <div className="mt-4">
                            <h4 className={`text-sm font-bold tracking-tight uppercase transition-colors ${isAuto ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                AI Autopilot {isAuto ? 'ON' : 'OFF'}
                            </h4>
                            <p className={`text-[9px] mt-0.5 font-bold uppercase tracking-wider transition-colors ${isAuto ? 'text-blue-400' : 'text-slate-400'}`}>
                                {isAuto ? 'AI ACTIVE' : 'MANUAL MODE'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Column 2: Pump Control - Specifically disabled if Hardware Offline */}
                <div className="p-4 flex flex-col bg-white dark:bg-slate-900 relative overflow-hidden min-h-[160px]">
                    <div className={`flex-1 rounded-[1.25rem] border border-slate-100 dark:border-slate-800 p-4 flex flex-col items-center justify-center text-center shadow-sm transition-all duration-700 ${
                        (isAuto || !isHardwareOnline) ? 'blur-sm opacity-40 pointer-events-none scale-95' : 'blur-0 opacity-100'
                    }`}>
                        <button
                            disabled={isAuto || !isHardwareOnline || (isMoistureSaturated && !isPumpOn)}
                            onClick={() => onTogglePump(!isPumpOn)}
                            className={`relative group flex flex-col items-center justify-center w-28 aspect-square rounded-full transition-all duration-500 border-4 active:scale-95 shadow-lg ${isPumpOn
                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-200/20'
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                                } ${isAuto || !isHardwareOnline || (isMoistureSaturated && !isPumpOn) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                        >
                            <div className={`transition-all duration-500`}>
                                {isPumpOn ? <Droplets size={36} /> : <Power size={36} />}
                            </div>
                        </button>
                        <div className="mt-4">
                            <span className={`block text-sm font-black tracking-tight ${isPumpOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}>
                                {isPumpOn ? 'PUMP RUNNING' : 'PUMP STOPPED'}
                            </span>
                            <div className="flex flex-col items-center mt-0.5">
                                {isMoistureSaturated && !isPumpOn ? (
                                    <div className="bg-red-500/10 text-red-500 text-[7px] px-1.5 py-0.5 rounded font-bold border border-red-500/20 uppercase tracking-tighter">SATURATED</div>
                                ) : (
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hydraulic Control</p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Mode/Status Overlays */}
                    {isAuto && isHardwareOnline && (
                        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-sm rounded-xl p-2 border border-white/20 flex items-center gap-2 shadow-sm">
                                <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300">Disable AI to Control</span>
                            </div>
                        </div>
                    )}

                    {!isHardwareOnline && connected && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none">
                            <div className="bg-red-500/10 dark:bg-red-500/5 backdrop-blur-[2px] rounded-xl p-3 border border-red-500/20 flex flex-col items-center gap-1 shadow-sm">
                                <WifiOff size={16} className="text-red-500 mb-1" />
                                <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 tracking-wider text-center leading-tight">Hardware<br/>Offline</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-800/30 p-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <Link to="/control" className="w-full flex items-center justify-between px-4 py-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all group bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                        <Settings size={14} className="group-hover:rotate-90 transition-transform duration-1000 text-slate-400" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Global Config</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
};
