import React from 'react';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Droplets } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // We already have ThemeToggle in Sidebar which manages the .dark class

    return (
        <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 transition-colors duration-300">
            {/* Sidebar (Fixed Left) */}
            <div className="hidden lg:block shrink-0">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative flex flex-col bg-slate-50/50 dark:bg-slate-950/50">
                {/* Global Header */}
                <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-6 py-3 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="lg:hidden bg-primary p-2 rounded-lg">
                            <Droplets className="text-white size-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Monitoring</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">Bulawayo Node 01</span>
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0 h-4">Online</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
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
