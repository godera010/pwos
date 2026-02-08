import React from 'react';
import { Sidebar } from './Sidebar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDark, setIsDark] = React.useState(true);

    React.useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    return (
        <div className="flex h-screen overflow-hidden bg-[#0f172a] text-slate-200 transition-colors duration-300 lg:bg-gradient-to-br lg:from-[#0b0f19] lg:to-[#1a2632]">
            {/* Sidebar (Fixed Left) */}
            <div className="hidden lg:block shrink-0">
                <Sidebar isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
                {/* Mobile Header (Visible only on small screens) */}
                <div className="lg:hidden p-4 flex items-center justify-between border-b border-white/10 bg-[#0b0f19]">
                    <span className="font-bold text-white">P-WOS</span>
                    <button onClick={() => setIsDark(!isDark)} className="p-2">
                        {isDark ? "🌙" : "☀️"}
                    </button>
                </div>

                <div className="p-6 md:p-8 max-w-[1600px] mx-auto pb-20 lg:pb-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
