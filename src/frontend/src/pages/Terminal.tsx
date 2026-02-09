import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Send, ShieldCheck } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Terminal: React.FC = () => {
    const [history, setHistory] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const append = (msg: string) => setHistory(prev => [...prev.slice(-49), msg]);

    useEffect(() => {
        append('-- P-WOS Kernel Shell Initialized --');
        append('ESP-ROM: esp32s3-20210211');

        const fetchLogs = () => {
            fetch('http://localhost:5000/api/logs')
                .then(res => res.json())
                .then(data => {
                    data.slice(-3).forEach((l: any) => append(`[${l.timestamp.split(' ')[1]}] ${l.message}`));
                });
        };

        const interval = setInterval(fetchLogs, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history]);

    const handleSend = () => {
        if (!input) return;
        append(`> ${input}`);
        const cmd = input;
        setInput('');
        setTimeout(() => append(`ACK: Command '${cmd}' received by kernel.`), 400);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                        <TerminalIcon className="size-6 text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">System Terminal</h1>
                        <p className="text-slate-500 text-sm font-medium">Low-level kernel access and simulation log stream.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-slate-100 dark:bg-slate-900 font-bold tracking-widest text-[10px] py-1">
                        BAUD: 115200
                    </Badge>
                    <ShieldCheck className="size-6 text-emerald-500 opacity-50" />
                </div>
            </div>

            <Card className="border-none shadow-xl dark:bg-slate-950 overflow-hidden flex flex-col h-[65vh]">
                <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-8 py-3 flex justify-between items-center">
                    <div className="flex gap-2">
                        <div className="size-2.5 rounded-full bg-red-400/50"></div>
                        <div className="size-2.5 rounded-full bg-amber-400/50"></div>
                        <div className="size-2.5 rounded-full bg-emerald-400/50"></div>
                    </div>
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">COM3 • NODE_LINK_STABLE</p>
                </div>

                <div
                    ref={scrollRef}
                    className="flex-1 p-8 font-mono text-sm overflow-y-auto leading-relaxed custom-scrollbar bg-white dark:bg-transparent"
                >
                    {history.map((line, i) => (
                        <div key={i} className={`${line.startsWith('>') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'} mb-1`}>
                            <span className="opacity-30 mr-4 text-[10px] font-bold">{(i + 1).toString().padStart(3, '0')}</span>
                            {line}
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex gap-4 items-center px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-14">
                        <span className="text-indigo-500 font-black text-lg select-none">›</span>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white font-mono placeholder:text-slate-400"
                            placeholder="Execute kernel command..."
                        />
                        <button
                            onClick={handleSend}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-indigo-500"
                        >
                            <Send className="size-4" />
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
