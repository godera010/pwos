import React from 'react';
import { Moon, Sun } from "lucide-react";

export const ThemeToggle = () => {
    const [theme, setTheme] = React.useState<"light" | "dark">("dark");

    React.useEffect(() => {
        const isDark = document.documentElement.classList.contains("dark");
        setTheme(isDark ? "dark" : "light");
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    };

    return (
        <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
            {theme === "light" ? (
                <Moon className="h-[18px] w-[18px] text-slate-600" strokeWidth={2.5} />
            ) : (
                <Sun className="h-[18px] w-[18px] text-slate-300" strokeWidth={2.5} />
            )}
        </button>
    );
};
