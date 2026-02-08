import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Send, ShieldCheck } from 'lucide-react';

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
        <div className="max-w-5xl mx-auto h-[75vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="size-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                        <TerminalIcon className="size-6 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">System Terminal</h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/50 border border-white/5 px-4 py-2 rounded-full backdrop-blur-md">
                        Baud: 115200
                    </span>
                    <ShieldCheck className="size-6 text-emerald-400 opacity-50" />
                </div>
            </header>

            <div className="flex-1 glass-card rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border-white/10">
                <div className="border-b border-white/5 bg-white/5 px-8 py-4 flex justify-between items-center">
                    <div className="flex gap-2">
                        <div className="size-3 rounded-full bg-rose-500/30"></div>
                        <div className="size-3 rounded-full bg-amber-500/30"></div>
                        <div className="size-3 rounded-full bg-emerald-500/30"></div>
                    </div>
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">COM3 • active_link</p>
                </div>

                <div
                    ref={scrollRef}
                    className="flex-1 p-10 font-mono text-sm overflow-y-auto leading-relaxed custom-scrollbar"
                >
                    {history.map((line, i) => (
                        <div key={i} className={`${line.startsWith('>') ? 'text-indigo-400' : 'text-slate-400'} mb-1`}>
                            <span className="opacity-20 mr-4 text-xs">{(i + 1).toString().padStart(3, '0')}</span>
                            {line}
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-black/20 border-t border-white/5">
                    <div className="flex gap-6 items-center px-4">
                        <span className="text-primary font-bold">{'>'}</span>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-white font-mono placeholder:text-slate-700"
                            placeholder="Execute kernel command..."
                        />
                        <button onClick={handleSend} className="text-slate-500 hover:text-white transition-colors">
                            <Send className="size-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
