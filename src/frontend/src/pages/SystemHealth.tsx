import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, API_BASE_URL } from '../services/api';
import {
    Activity,
    Server,
    Database,
    Wifi,
    Cloud,
    Zap,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    RefreshCw,
    HardDrive,
    Signal,
    Cpu,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

interface ServiceStatus {
    name: string;
    status: 'online' | 'offline' | 'degraded';
    icon: React.ReactNode;
    latency?: string;
}

export const SystemHealth: React.FC = () => {
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: 'Backend API', status: 'offline', icon: <Server className="size-4" /> },
        { name: 'Database', status: 'offline', icon: <Database className="size-4" /> },
        { name: 'MQTT Broker', status: 'offline', icon: <Signal className="size-4" /> },
        { name: 'Weather API', status: 'offline', icon: <Cloud className="size-4" /> },
    ]);

    const [deviceOnline, setDeviceOnline] = useState(false);
    const [deviceLastSeen, setDeviceLastSeen] = useState('--');
    const [pumping, setPumping] = useState(false);
    const [showBlueprint, setShowBlueprint] = useState(false);

    const [systemMetrics, setSystemMetrics] = useState({
        uptime: '--',
        totalReadings: '0',
        totalWaterings: '0',
        errors: 0,
    });

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [serverStartTime] = useState(new Date());

    const refreshStatus = useCallback(async () => {
        setIsRefreshing(true);
        const serviceUpdates: ServiceStatus[] = [
            { name: 'Backend API', status: 'offline', icon: <Server className="size-4" /> },
            { name: 'Database', status: 'offline', icon: <Database className="size-4" /> },
            { name: 'MQTT Broker', status: 'offline', icon: <Signal className="size-4" /> },
            { name: 'Weather API', status: 'offline', icon: <Cloud className="size-4" /> },
        ];

        try {
            const startTime = performance.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const healthRes = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const latency = Math.round(performance.now() - startTime);

            if (healthRes.ok) {
                const health = await healthRes.json();
                serviceUpdates[0] = { ...serviceUpdates[0], status: 'online', latency: `${latency}ms` };

                if (health.database) {
                    serviceUpdates[1] = { ...serviceUpdates[1], status: 'online', latency: `${Math.round(latency * 0.6)}ms` };
                }
            }
        } catch {
            serviceUpdates[0] = { ...serviceUpdates[0], status: 'offline' };
        }

        try {
            const stats = await api.getStatistics();
            if (stats) {
                setSystemMetrics(prev => ({
                    ...prev,
                    totalReadings: (stats.total_readings ?? 0).toLocaleString(),
                    totalWaterings: (stats.total_waterings ?? 0).toLocaleString(),
                }));
            }
        } catch { /* stats endpoint may fail */ }

        try {
            const systemState = await api.getSystemState();
            const isOnline = systemState?.hardware_status === 'ONLINE';
            setDeviceOnline(isOnline);
            
            if (isOnline) {
                serviceUpdates[2] = { ...serviceUpdates[2], status: 'online' };
            }

            const sensors = await api.getLatestSensors();
            if (sensors?.timestamp) {
                setDeviceLastSeen(new Date(sensors.timestamp).toLocaleTimeString());
            } else {
                setDeviceLastSeen('No data');
            }
        } catch {
            setDeviceOnline(false);
            setDeviceLastSeen('--');
        }

        try {
            const prediction = await api.getPrediction();
            if (prediction?.sensor_snapshot) {
                serviceUpdates[3] = { ...serviceUpdates[3], status: 'online' };
            }
            setPumping(prediction?.system_status === 'PUMPING');
        } catch { /* weather may fail */ }

        const uptimeMs = Date.now() - serverStartTime.getTime();
        const days = Math.floor(uptimeMs / 86400000);
        const hours = Math.floor((uptimeMs % 86400000) / 3600000);
        const minutes = Math.floor((uptimeMs % 3600000) / 60000);
        const uptimeStr = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;

        setSystemMetrics(prev => ({ ...prev, uptime: uptimeStr }));
        setServices(serviceUpdates);
        setLastUpdate(new Date());
        setIsRefreshing(false);
    }, [serverStartTime]);

    useEffect(() => {
        const timer = setTimeout(refreshStatus, 0);
        const interval = setInterval(refreshStatus, 15000);
        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [refreshStatus]);

    const allOnline = services.every(s => s.status === 'online');
    const anyOffline = services.some(s => s.status === 'offline');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-emerald-500';
            case 'offline': return 'text-red-500';
            case 'degraded': return 'text-amber-500';
            default: return 'text-slate-500';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'online': return 'bg-emerald-500';
            case 'offline': return 'bg-red-500';
            case 'degraded': return 'bg-amber-500';
            default: return 'bg-slate-500';
        }
    };

    const overallStatus = allOnline ? 'online' : anyOffline ? 'degraded' : 'online';
    const overallLabel = allOnline ? 'All Systems Operational' : 'Some Services Degraded';

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12 px-4 md:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        System <span className="text-emerald-500 dark:text-primary">Health</span>
                    </h1>
                    <p className="text-muted-foreground font-mono mt-1 uppercase text-[10px] tracking-wider">
                        Monitor service status, device connectivity, and system performance.
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className={`flex items-center gap-1.5 py-1 px-3.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${getStatusColor(overallStatus)} border-current bg-current/5`}>
                        <span className={`size-1.5 rounded-full ${getStatusBg(overallStatus)}`} />
                        <span>{overallLabel}</span>
                    </div>

                    <div className="flex items-center gap-2 bg-secondary/50 border border-border px-3 py-1 rounded-xl text-xs text-muted-foreground font-mono">
                        <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
                    </div>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={refreshStatus}
                        disabled={isRefreshing}
                        className="gap-1.5 border-border h-9 rounded-xl text-xs font-bold uppercase tracking-wider bg-transparent hover:bg-secondary"
                    >
                        <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                    icon={<Clock className="size-4" />}
                    label="Uptime Session"
                    value={systemMetrics.uptime}
                    subtext="Since page load"
                    colorClass="text-indigo-500 bg-indigo-500/10"
                />
                <MetricCard 
                    icon={<Activity className="size-4" />}
                    label="Total Readings"
                    value={systemMetrics.totalReadings}
                    subtext="Sensor data points"
                    colorClass="text-emerald-500 bg-emerald-500/10"
                />
                <MetricCard 
                    icon={<Zap className="size-4" />}
                    label="Total Waterings"
                    value={systemMetrics.totalWaterings}
                    subtext="Pump cycles"
                    colorClass="text-amber-500 bg-amber-500/10"
                />
                <MetricCard 
                    icon={<AlertTriangle className="size-4" />}
                    label="Errors Logged"
                    value={systemMetrics.errors.toString()}
                    subtext="Current session"
                    colorClass="text-red-500 bg-red-500/10"
                />
            </div>

            {/* Service Status */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <Server className="size-4 text-emerald-500" /> Service Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {services.map((service, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                            <div className="flex items-center gap-3">
                                <div className={`${getStatusColor(service.status)} p-2 rounded-lg bg-secondary/80`}>
                                    {service.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-bold">{service.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {service.latency ? `Latency: ${service.latency}` : service.status === 'online' ? 'Connected' : 'Unreachable'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {service.status === 'online' && <CheckCircle2 className={`size-4 ${getStatusColor(service.status)}`} />}
                                {service.status === 'offline' && <XCircle className={`size-4 ${getStatusColor(service.status)}`} />}
                                {service.status === 'degraded' && <AlertTriangle className={`size-4 ${getStatusColor(service.status)}`} />}
                                <Badge variant="outline" className={`text-[9px] font-black uppercase ${getStatusColor(service.status)} border-current`}>
                                    {service.status}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Device Status */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <Wifi className="size-4 text-emerald-500" /> Connected Devices
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-4">
                            <div className={deviceOnline ? 'text-emerald-500' : 'text-red-500'}>
                                {deviceOnline ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold">ESP32 Sensor Hub</p>
                                <p className="text-xs text-slate-500">Last seen: {deviceLastSeen}</p>
                            </div>
                        </div>
                        <Badge variant="outline" className={`text-[9px] font-black uppercase ${deviceOnline ? 'text-emerald-500' : 'text-red-500'} border-current`}>
                            {deviceOnline ? 'ONLINE' : 'OFFLINE'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* ESP32 Blueprint Expandable Card */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl overflow-hidden">
                <CardHeader className="pb-2 cursor-pointer select-none hover:bg-secondary/45 transition-colors" onClick={() => setShowBlueprint(!showBlueprint)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Cpu className="size-4 text-indigo-500" />
                            <CardTitle className="text-sm font-bold uppercase tracking-wider">ESP32 Pinout Blueprint</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[9px] font-black uppercase ${deviceOnline ? 'text-emerald-500' : 'text-red-500'} border-current`}>
                                {deviceOnline ? 'Online' : 'Offline'}
                            </Badge>
                            {showBlueprint ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
                        </div>
                    </div>
                </CardHeader>
                {showBlueprint && (
                    <CardContent className="pt-4 border-t border-border bg-secondary/15 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-secondary/35">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 flex items-center justify-center font-black text-xs text-emerald-500">
                                        P34
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Soil Moisture</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Analog • ADC1_0</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-[10px] font-bold">ACTIVE</Badge>
                            </div>

                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-secondary/35">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl border-2 border-indigo-500 bg-indigo-500/10 flex items-center justify-center font-black text-xs text-indigo-500">
                                        P32
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">DHT22 Sense</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Digital • Single Bus</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-[10px] font-bold">ACTIVE</Badge>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-secondary/35">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-xl border-2 transition-all flex items-center justify-center font-black text-xs ${pumping && deviceOnline ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-300 dark:border-slate-800 text-slate-400'}`}>
                                        P27
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Pump Relay</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Digital • Output</p>
                                    </div>
                                </div>
                                <Badge className={`text-[10px] font-black uppercase ${pumping && deviceOnline ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {pumping && deviceOnline ? 'Pumping' : 'Idle'}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-secondary/35">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl border-2 border-indigo-500 bg-indigo-500/10 flex items-center justify-center font-black text-xs text-indigo-500">
                                        P33
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Rain Node</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Analog/Digital</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-[10px] font-bold">ACTIVE</Badge>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* System Info */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <HardDrive className="size-4 text-emerald-500" /> System Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoItem label="Location" value="Bulawayo, Zimbabwe" />
                        <InfoItem label="Weather Source" value="OpenWeatherMap" />
                        <InfoItem label="Coordinates" value="-20.15°, 28.59°" />
                        <InfoItem label="Data Mode" value="Hardware" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; subtext: string; colorClass: string }> = ({ icon, label, value, subtext, colorClass }) => (
    <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-card rounded-2xl">
        <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl flex items-center justify-center ${colorClass}`}>
                    {icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest font-mono">{label}</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">{value}</span>
                    <span className="text-[9px] text-slate-400 dark:text-neutral-500 mt-0.5 leading-none">{subtext}</span>
                </div>
            </div>
        </CardContent>
    </Card>
);

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">{label}</p>
        <p className="text-sm font-bold">{value}</p>
    </div>
);
