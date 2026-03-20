import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from '../services/api';
import {
    Activity,
    Server,
    Database,
    Wifi,
    Cloud,
    Thermometer,
    Droplets,
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
    uptime?: string;
}

interface DeviceInfo {
    name: string;
    status: 'online' | 'offline';
    lastSeen: string;
    battery?: number;
    signal?: number;
}

export const SystemHealth: React.FC = () => {
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: 'Backend API', status: 'online', icon: <Server className="size-4" />, latency: '12ms' },
        { name: 'Database', status: 'online', icon: <Database className="size-4" />, latency: '8ms' },
        { name: 'MQTT Broker', status: 'online', icon: <Signal className="size-4" />, latency: '5ms' },
        { name: 'Weather API', status: 'online', icon: <Cloud className="size-4" /> },
    ]);

    const [devices, setDevices] = useState<DeviceInfo[]>([
        { name: 'ESP32 Sensor Hub', status: 'online', lastSeen: 'Just now', battery: 87, signal: 92 },
    ]);

    const [systemMetrics, setSystemMetrics] = useState({
        uptime: '14d 6h 32m',
        totalReadings: '2,847',
        avgResponse: '24ms',
        errors: 0
    });

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const refreshStatus = async () => {
        setIsRefreshing(true);
        try {
            const state = await api.getSystemState();
            const sensors = await api.getLatestSensors();
            
            setLastUpdate(new Date());
            
            if (sensors) {
                setDevices(prev => prev.map(d => ({
                    ...d,
                    lastSeen: 'Just now',
                    status: sensors.device_id ? 'online' : 'offline'
                })));
            }
        } catch {
            setServices(prev => prev.map(s => ({ ...s, status: 'degraded' })));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        refreshStatus();
        const interval = setInterval(refreshStatus, 30000);
        return () => clearInterval(interval);
    }, []);

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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        System Health
                        <Badge variant="outline" className={`${getStatusColor('online')} border-current bg-current/10 gap-1`}>
                            <span className={`size-1.5 rounded-full ${getStatusBg('online')}`} />
                            All Systems Operational
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
                    label="Uptime"
                    value={systemMetrics.uptime}
                    subtext="Since last restart"
                />
                <MetricCard 
                    icon={<Activity className="size-5 text-emerald-500" />}
                    label="Total Readings"
                    value={systemMetrics.totalReadings}
                    subtext="Sensor data points"
                />
                <MetricCard 
                    icon={<Zap className="size-5 text-amber-500" />}
                    label="Avg Response"
                    value={systemMetrics.avgResponse}
                    subtext="API latency"
                />
                <MetricCard 
                    icon={<AlertTriangle className="size-5 text-red-500" />}
                    label="Errors"
                    value={systemMetrics.errors.toString()}
                    subtext="Last 24 hours"
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
                                        {service.latency ? `Latency: ${service.latency}` : 'Connection stable'}
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
                <CardContent className="space-y-3">
                    {devices.map((device, idx) => (
                        <div key={idx} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                            <div className="flex items-center gap-4">
                                <div className={device.status === 'online' ? 'text-emerald-500' : 'text-red-500'}>
                                    {device.status === 'online' ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold">{device.name}</p>
                                    <p className="text-xs text-slate-500">Last seen: {device.lastSeen}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                {device.battery !== undefined && (
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Battery</p>
                                        <p className={`text-sm font-bold ${device.battery < 20 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {device.battery}%
                                        </p>
                                    </div>
                                )}
                                {device.signal !== undefined && (
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Signal</p>
                                        <p className="text-sm font-bold">{device.signal}%</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
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
                        <InfoItem label="API Mode" value="Real-time" />
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
