import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Sliders, Cpu, Terminal, Sun, Moon } from 'lucide-react';

interface SidebarProps {
    isDark: boolean;
    toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isDark, toggleTheme }) => {
    const navItems = [
        { icon: LayoutGrid, label: 'Dashboard', path: '/' },
        { icon: Sliders, label: 'Settings', path: '/settings' },
        { icon: Cpu, label: 'Hardware', path: '/hardware' },
        { icon: Terminal, label: 'Terminal', path: '/terminal' },
    ];

    return (
        <aside className="w-64 h-screen bg-white/10 dark:bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all duration-300">
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3">
                <div className="bg-gradient-to-tr from-green-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-green-500/20">
                    <span className="material-icons-round text-white text-xl">eco</span>
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight text-white">P-WOS</h1>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Admin V2.0</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2 mt-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                            ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                        `}
                    >
                        <item.icon className="size-5 transition-transform group-hover:scale-110" />
                        <span className="font-medium text-sm">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 mt-auto border-t border-white/5 space-y-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-slate-300"
                >
                    <span className="text-xs font-medium uppercase tracking-wider">Dark Mode</span>
                    {isDark ? <Moon className="size-4 text-indigo-400" /> : <Sun className="size-4 text-amber-400" />}
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 px-2">
                    <div className="size-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[1px]">
                        <div className="size-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                            <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Administrator</p>
                        <p className="text-xs text-slate-500 truncate">admin@pwos.local</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
