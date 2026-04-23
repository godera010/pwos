import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { api } from '@/services/api';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [time, setTime] = useState(new Date());
    const [mode, setMode] = useState<string>('AUTO');
    const [isOnline, setIsOnline] = useState<boolean>(true);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);

        const fetchState = async () => {
            try {
                const [state, sensors] = await Promise.all([
                    api.getSystemState(),
                    api.getLatestSensors()
                ]);

                setMode(state.mode);

                // Connection heartbeat: Online if data received in last 2 minutes
                const lastSeen = new Date(sensors.timestamp).getTime();
                const now = new Date().getTime();
                setIsOnline((now - lastSeen) < 120000);
            } catch (error) {
                console.error("Layout Fetch Error:", error);
                setIsOnline(false);
            }
        };

        fetchState();
        const statePoller = setInterval(fetchState, 10000);

        return () => {
            clearInterval(timer);
            clearInterval(statePoller);
        };
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
            {/* Sidebar (Fixed Left) */}
            <div className="hidden lg:block shrink-0">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative flex flex-col bg-background">
                {/* Global Header */}
                <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 shrink-0 flex items-center justify-between text-[11px] font-bold tracking-tight">
                    {/* Date */}
                    <span className="text-slate-600 dark:text-slate-400 uppercase">
                        {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>

                    {/* Time */}
                    <span className="text-slate-900 dark:text-white font-mono">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </span>

                    {/* Status: Mode */}
                    <span className={`uppercase tracking-widest ${mode === 'AUTO' ? 'text-emerald-600 dark:text-emerald-500' : 'text-orange-600 dark:text-orange-500'}`}>
                        System {mode}
                    </span>

                    {/* System Connectivity */}
                    <span className={`uppercase flex items-center gap-1.5 ${isOnline ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500'}`}>
                        <div className={`size-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        {isOnline ? 'Online' : 'Offline'}
                    </span>

                    {/* Theme Toggle */}
                    <div className="flex items-center">
                        <ThemeToggle />
                    </div>
                </header>

                <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-24 lg:pb-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
};
