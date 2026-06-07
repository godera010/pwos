import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home,
    BarChart3,
    Brain,
    Activity,
    Sliders,
    Droplets,
    Sprout,
    ClipboardList,
    Package,
    Leaf,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
 
const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Brain, label: "ML Insights", path: "/ml-insights" },
    { icon: Sprout, label: "Crop Manager", path: "/crop-settings" },
    { icon: Sliders, label: "Control", path: "/control" },
    { icon: Activity, label: "System Health", path: "/system" },
];
 
const analyticsItems = [
    { icon: ClipboardList, label: "ML Audit", path: "/ml-audit" },
    { icon: Package, label: "Model Registry", path: "/model-registry" },
    { icon: Leaf, label: "Efficiency", path: "/irrigation-efficiency" },
];

interface SidebarProps {
    onLinkClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLinkClick }) => {
    return (
        <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300">
            {/* Logo Area */}
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="bg-sidebar-primary p-2 rounded-lg shadow-lg shadow-emerald-500/20">
                        <Droplets className="text-sidebar-primary-foreground size-5" />
                    </div>
                    <div>
                        <h1 className="font-black text-xl tracking-tighter text-sidebar-foreground">P-WOS</h1>
                        <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/70 font-black">Admin Panel</p>
                    </div>
                </div>
            </div>

            <div className="px-6 mb-4">
                <Separator className="bg-sidebar-border" />
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onLinkClick}
                        className={({ isActive }) => `
              flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group
              ${isActive
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-semibold'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
            `}
                    >
                        <item.icon className="size-4 transition-transform group-hover:scale-110" />
                        <span className="text-sm">{item.label}</span>
                    </NavLink>
                ))}

                {/* Analytics Section */}
                <div className="pt-3 pb-1 px-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-sidebar-foreground/40">Intelligence</p>
                </div>
                {analyticsItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onLinkClick}
                        className={({ isActive }) => `
              flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group
              ${isActive
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-semibold'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
            `}
                    >
                        <item.icon className="size-4 transition-transform group-hover:scale-110" />
                        <span className="text-sm">{item.label}</span>
                    </NavLink>
                ))}
            </ScrollArea>


            {/* Bottom Profile */}
            <div className="p-4 mt-auto border-t border-sidebar-border">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer group">
                    <div className="size-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-sidebar-border font-black text-xs">
                        AD
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-sidebar-foreground group-hover:text-sidebar-accent-foreground truncate">Administrator</p>
                        <p className="text-[10px] text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground/70 truncate uppercase tracking-widest font-bold">System Owner</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
