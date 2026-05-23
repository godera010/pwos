import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { useMqtt } from '../hooks/useMqtt';
import { api } from '@/services/api';
import {
    AlertTriangle,
    WifiOff,
    ServerOff,
    CloudOff,
    Shield,
    Menu,
    X,
} from 'lucide-react';

// ============================================================================
// SYSTEM STATUS LOGIC
// ============================================================================

interface SystemStatus {
    label: string;
    color: string;         // text color class
    dotColor: string;      // dot bg class
    icon: React.ElementType;
    pulse: boolean;
}

function deriveSystemStatus(
    mqttConnected: boolean,
    hardwareOnline: boolean,
    apiOffline: boolean,
    weatherOffline: boolean,
): SystemStatus {
    // Priority 1: MQTT broker down — nothing works
    if (!mqttConnected) {
        return {
            label: 'Broker Offline',
            color: 'text-red-500',
            dotColor: 'bg-red-500',
            icon: WifiOff,
            pulse: false,
        };
    }

    // Priority 2: Hardware / ESP32 offline
    if (!hardwareOnline) {
        return {
            label: 'ESP32 Offline',
            color: 'text-red-500',
            dotColor: 'bg-red-500',
            icon: AlertTriangle,
            pulse: false,
        };
    }

    // Priority 3: Backend API offline
    if (apiOffline) {
        return {
            label: 'API Offline',
            color: 'text-amber-500',
            dotColor: 'bg-amber-500',
            icon: ServerOff,
            pulse: false,
        };
    }

    // Priority 4: Weather service offline
    if (weatherOffline) {
        return {
            label: 'Weather Unavailable',
            color: 'text-amber-500',
            dotColor: 'bg-amber-500',
            icon: CloudOff,
            pulse: false,
        };
    }

    // All systems nominal
    return {
        label: 'Monitoring',
        color: 'text-emerald-600 dark:text-emerald-500',
        dotColor: 'bg-emerald-500',
        icon: Shield,
        pulse: true,
    };
}

// ============================================================================
// LAYOUT
// ============================================================================

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [time, setTime] = useState(new Date());
    const { connected, hardwareStatus, systemMode } = useMqtt();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [apiOffline, setApiOffline] = useState(false);
    const [weatherOffline, setWeatherOffline] = useState(false);

    const mode = systemMode || 'AUTO';
    const isHardwareOnline = hardwareStatus === 'ONLINE';

    // Lightweight health check for API & weather
    const checkServices = useCallback(async () => {
        try {
            await api.getSystemState();
            setApiOffline(false);
        } catch {
            setApiOffline(true);
        }

        try {
            await api.getWeatherForecast();
            setWeatherOffline(false);
        } catch {
            setWeatherOffline(true);
        }
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        checkServices();
        const servicePoller = setInterval(checkServices, 15000);

        return () => {
            clearInterval(timer);
            clearInterval(servicePoller);
        };
    }, [checkServices]);

    const status = deriveSystemStatus(connected, isHardwareOnline, apiOffline, weatherOffline);
    const StatusIcon = status.icon;

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
            {/* Sidebar (Fixed Left on desktop) */}
            <div className="hidden lg:block shrink-0">
                <Sidebar />
            </div>

            {/* Mobile Sidebar overlay menu */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden">
                    {/* Backdrop overlay (clickable to close, blurred background) */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    
                    {/* Drawer container (Solid Sidebar) */}
                    <div className="relative w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col z-50 animate-in slide-in-from-left duration-300">
                        <Sidebar onLinkClick={() => setIsMobileMenuOpen(false)} />
                        {/* Close Button */}
                        <button 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="absolute top-4 right-4 z-50 p-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
                            aria-label="Close menu"
                        >
                            <X className="size-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative flex flex-col bg-background">
                {/* Global Header */}
                <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 shrink-0 flex items-center justify-between text-[11px] font-bold tracking-tight">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Toggle button */}
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-1.5 rounded-lg border border-border bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
                        >
                            <Menu className="size-4" />
                        </button>

                        {/* Date (hidden on mobile) */}
                        <span className="hidden md:inline-block text-slate-600 dark:text-slate-400 uppercase">
                            {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                    </div>

                    {/* Time (hidden on extra small) */}
                    <span className="hidden sm:inline-block text-slate-900 dark:text-white font-mono">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </span>

                    {/* Status: Mode */}
                    <span className={`uppercase tracking-widest ${mode === 'AUTO' ? 'text-emerald-600 dark:text-emerald-500' : 'text-orange-600 dark:text-orange-500'}`}>
                        <span className="hidden sm:inline">System </span>{mode}
                    </span>

                    {/* System Status — Dynamic */}
                    <span className={`uppercase flex items-center gap-1.5 ${status.color}`}>
                        <div className={`size-1.5 rounded-full ${status.dotColor} ${status.pulse ? 'animate-pulse' : ''}`} />
                        <StatusIcon className="size-3" />
                        {status.label}
                    </span>

                    {/* Theme Toggle */}
                    <div className="flex items-center">
                        <ThemeToggle />
                    </div>
                </header>

                <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-24 lg:pb-8 flex-1 w-full">
                    {children}
                </div>
            </main>
        </div>
    );
};
