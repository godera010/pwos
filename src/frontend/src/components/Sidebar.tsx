import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home,
    BarChart3,
    Brain,
    Settings,
    Activity,
    Sliders,
    Droplets
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Brain, label: "ML Insights", path: "/ml-insights" },
    { icon: Sliders, label: "Control", path: "/control" },
    { icon: Activity, label: "System Health", path: "/system" },
    { icon: Settings, label: "Settings", path: "/settings" }
];

export const Sidebar: React.FC = () => {
    return (
        <aside className="w-64 h-screen bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300">
            {/* Logo Area */}
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-lg shadow-lg shadow-emerald-500/20">
                        <Droplets className="text-white size-5" />
                    </div>
                    <div>
                        <h1 className="font-black text-xl tracking-tighter text-slate-900 dark:text-white">P-WOS</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Admin Panel</p>
                    </div>
                </div>
            </div>

            <div className="px-6 mb-4">
                <Separator className="bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
              flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group
              ${isActive
                                ? 'bg-primary text-white shadow-sm font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}
            `}
                    >
                        <item.icon className="size-4 transition-transform group-hover:scale-110" />
                        <span className="text-sm">{item.label}</span>
                    </NavLink>
                ))}
            </ScrollArea>

            {/* Bottom Profile */}
            <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer">
                    <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-700">
                        <img src="https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff" alt="Admin" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Administrator</p>
                        <p className="text-[10px] text-slate-500 truncate uppercase tracking-wide">System Owner</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
