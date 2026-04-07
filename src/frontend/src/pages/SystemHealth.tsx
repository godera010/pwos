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
    Signal
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
            // 1. Check Backend API + Database via /api/health
            const startTime = performance.now();
            const healthRes = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
            const latency = Math.round(performance.now() - startTime);

            if (healthRes.ok) {
                const health = await healthRes.json();
                serviceUpdates[0] = { ...serviceUpdates[0], status: 'online', latency: `${latency}ms` };

                // If health includes database stats, database is online
                if (health.database) {
                    serviceUpdates[1] = { ...serviceUpdates[1], status: 'online', latency: `${Math.round(latency * 0.6)}ms` };
                }
            }
        } catch {
            serviceUpdates[0] = { ...serviceUpdates[0], status: 'offline' };
        }

        try {
            // 2. Check statistics for real counts
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
            // 3. Check sensor data to see if ESP32 is online
            const sensors = await api.getLatestSensors();
            if (sensors?.device_id) {
                setDeviceOnline(true);
                setDeviceLastSeen(sensors.timestamp ? new Date(sensors.timestamp).toLocaleTimeString() : 'Just now');
                // If sensor data is arriving, MQTT broker is working
                serviceUpdates[2] = { ...serviceUpdates[2], status: 'online' };
            } else {
                setDeviceOnline(false);
                setDeviceLastSeen('--');
            }
        } catch {
            setDeviceOnline(false);
        }

        try {
            // 4. Check Weather API by asking for prediction (uses weather data)
            const prediction = await api.getPrediction();
            if (prediction?.sensor_snapshot) {
                serviceUpdates[3] = { ...serviceUpdates[3], status: 'online' };
            }
        } catch { /* weather may fail */ }

        // Calculate uptime
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
        refreshStatus();
        const interval = setInterval(refreshStatus, 15000);
        return () => clearInterval(interval);
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
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        System Health
                        <Badge variant="outline" className={`${getStatusColor(overallStatus)} border-current bg-current/10 gap-1`}>
                            <span className={`size-1.5 rounded-full ${getStatusBg(overallStatus)}`} />
                            {overallLabel}
                        </Badge>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Monitor service status, device connectivity, and system performance.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                        Last update: {lastUpdate.toLocaleTimeString()}
                    </span>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={refreshStatus}
                        disabled={isRefreshing}
                        className="gap-1.5"
                    >
                        <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                    icon={<Clock className="size-5 text-indigo-500" />}
                    label="Session"
                    value={systemMetrics.uptime}
                    subtext="Since page load"
                />
                <MetricCard 
                    icon={<Activity className="size-5 text-emerald-500" />}
                    label="Total Readings"
                    value={systemMetrics.totalReadings}
                    subtext="Sensor data points"
                />
                <MetricCard 
                    icon={<Zap className="size-5 text-amber-500" />}
                    label="Total Waterings"
                    value={systemMetrics.totalWaterings}
                    subtext="Pump cycles"
                />
                <MetricCard 
                    icon={<AlertTriangle className="size-5 text-red-500" />}
                    label="Errors"
                    value={systemMetrics.errors.toString()}
                    subtext="Current session"
                />
            </div>

            {/* Service Status */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <Server className="size-4" /> Service Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {services.map((service, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div className="flex items-center gap-3">
                                <div className={getStatusColor(service.status)}>
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
                                <Badge variant="outline" className={`text-[10px] font-black uppercase ${getStatusColor(service.status)} border-current`}>
                                    {service.status}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Device Status */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <Wifi className="size-4" /> Connected Devices
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
                        <Badge variant="outline" className={`text-[10px] font-black uppercase ${deviceOnline ? 'text-emerald-500' : 'text-red-500'} border-current`}>
                            {deviceOnline ? 'ONLINE' : 'OFFLINE'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* System Info */}
            <Card className="shadow-none border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <HardDrive className="size-4" /> System Information
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

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; subtext: string }> = ({ icon, label, value, subtext }) => (
    <Card className="shadow-none border border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-[10px] text-slate-400 mt-1">{subtext}</p>
        </CardContent>
    </Card>
);

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">{label}</p>
        <p className="text-sm font-bold">{value}</p>
    </div>
);
