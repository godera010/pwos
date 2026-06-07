import React from 'react';
import { Settings, ChevronRight, Droplets, Power, WifiOff } from 'lucide-react';
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
    isHardwareOnline,
    connected,
    isMoistureSaturated,
    onToggleMode,
    onTogglePump
}) => {
    const isSystemDown = !connected || !isHardwareOnline;

    return (
        <div className={`w-full rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-500 flex flex-col h-full bg-card text-card-foreground ${
            isSystemDown ? 'border-red-500/50' : 'border-slate-100 dark:border-slate-800'
        }`}>
            {/* Header Section */}
            <div className={`px-4 py-3 shrink-0 flex items-center justify-between ${
                isSystemDown ? 'bg-red-500/5' : ''
            }`}>
                <h1 className="text-[11px] font-black text-foreground uppercase tracking-[0.2em]">
                    Quick Actions
                </h1>
                <div className="flex gap-1">
                    {!connected && <Badge variant="destructive" className="text-[8px] h-4 animate-pulse">Broker Offline</Badge>}
                    {connected && !isHardwareOnline && <Badge variant="destructive" className="text-[8px] h-4 bg-red-500 hover:bg-red-500 border-none">Hardware Offline</Badge>}
                </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 p-4 pt-2">
                <div className="grid grid-cols-2 gap-3 h-full relative">
                    
                    {/* Column 1: AI Autopilot — No inner panel */}
                    <div className="p-3 sm:p-6 flex flex-col items-center justify-center min-h-[120px] sm:min-h-[160px] transition-all duration-500">
                        <button
                            disabled={!connected || !isHardwareOnline}
                            onClick={onToggleMode}
                            className={`relative inline-flex h-10 sm:h-12 w-20 sm:w-24 items-center rounded-full transition-all duration-300 border-2 ${isAuto
                                    ? 'bg-emerald-900/40 border-emerald-500'
                                    : 'bg-secondary border-border'
                                } ${(!connected || !isHardwareOnline) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                        >
                            <span className="sr-only">Toggle AI Autopilot</span>
                            <span className={`${isAuto ? 'translate-x-[42px] sm:translate-x-[52px] bg-emerald-500' : 'translate-x-1 sm:translate-x-1.5 bg-muted-foreground/40'} inline-block h-6 sm:h-8 w-6 sm:w-8 transform rounded-full transition-all duration-500 ease-in-out shadow-md flex items-center justify-center`}>
                                <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-white/40"></div>
                            </span>
                        </button>
                        <div className="mt-2.5 sm:mt-4 text-center">
                            <h4 className={`text-xs sm:text-sm font-bold tracking-tight uppercase transition-colors ${isAuto ? 'text-emerald-500' : 'text-foreground'}`}>
                                AI Autopilot {isAuto ? 'ON' : 'OFF'}
                            </h4>
                            <p className={`text-[8px] sm:text-[9px] mt-0.5 font-bold uppercase tracking-wider transition-colors ${isAuto ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                {isAuto ? 'AI ACTIVE' : 'MANUAL'}
                            </p>
                        </div>
                    </div>

                    {/* Column 2: Pump Control — No inner panel, sits on card surface */}
                    <div className="flex flex-col items-center justify-center relative overflow-hidden min-h-[120px] sm:min-h-[160px]">
                        <div className={`flex flex-col items-center justify-center text-center transition-all duration-700 ${
                            (isAuto || !isHardwareOnline) ? 'blur-sm opacity-40 pointer-events-none scale-95' : 'blur-0 opacity-100'
                        }`}>
                            <button
                                disabled={isAuto || !isHardwareOnline || (isMoistureSaturated && !isPumpOn)}
                                onClick={() => onTogglePump(!isPumpOn)}
                                className={`relative group flex flex-col items-center justify-center w-20 sm:w-28 aspect-square rounded-full transition-all duration-500 border-4 active:scale-95 ${isPumpOn
                                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                                        : 'bg-secondary border-border text-muted-foreground'
                                    } ${isAuto || !isHardwareOnline || (isMoistureSaturated && !isPumpOn) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                            >
                                <div className={`transition-all duration-500`}>
                                    {isPumpOn ? <Droplets className="size-6 sm:size-9" /> : <Power className="size-6 sm:size-9" />}
                                </div>
                            </button>
                            <div className="mt-2.5 sm:mt-4">
                                <span className={`block text-xs sm:text-sm font-black tracking-tight ${isPumpOn ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                    {isPumpOn ? 'RUNNING' : 'STOPPED'}
                                </span>
                                <div className="flex flex-col items-center mt-0.5">
                                    {isMoistureSaturated && !isPumpOn ? (
                                        <div className="bg-destructive/10 text-destructive text-[7px] px-1.5 py-0.5 rounded font-bold border border-destructive/20 uppercase tracking-tighter">SATURATED</div>
                                    ) : (
                                        <p className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Pump Relay</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Mode/Status Overlays */}
                        {isAuto && isHardwareOnline && (
                            <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                                <div className="bg-background/40 backdrop-blur-sm rounded-xl p-1.5 border border-border flex items-center gap-1.5">
                                    <span className="text-[8px] font-black uppercase text-muted-foreground">Locked by AI</span>
                                </div>
                            </div>
                        )}

                        {!isHardwareOnline && connected && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 pointer-events-none">
                                <div className="flex flex-col items-center gap-1">
                                    <WifiOff className="size-5 sm:size-6 text-muted-foreground/60" />
                                    <span className="text-[8px] font-black uppercase text-muted-foreground tracking-wider text-center leading-tight">Hardware<br/>Offline</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 shrink-0 flex justify-center pb-4">
                <Link to="/control" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
                    <Settings size={12} className="group-hover:rotate-90 transition-transform duration-1000" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">More Settings</span>
                </Link>
            </div>
        </div>
    );
};
