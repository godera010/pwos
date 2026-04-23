import mqtt from 'mqtt';

const MQTT_BROKER = 'ws://localhost:9001';

class MqttService {
    client: mqtt.MqttClient | null = null;
    listeners: { [topic: string]: ((message: any) => void)[] } = {};
    connectionStatusListeners: ((status: boolean) => void)[] = [];

    connect() {
        if (this.client) return;

        this.client = mqtt.connect(MQTT_BROKER, {
            protocol: 'ws',
            will: {
                topic: 'pwos/frontend/status',
                payload: 'OFFLINE',
                qos: 1,
                retain: true
            }
        });

        this.client.on('connect', () => {
            console.log('Connected to MQTT via WebSockets');
            // Publish online status
            this.client?.publish('pwos/frontend/status', 'ONLINE', { retain: true });
            
            // Subscribe to relevant topics
            this.client?.subscribe('pwos/sensor/data');
            this.client?.subscribe('pwos/system/hardware'); // ESP32 status (LWT)
            this.client?.subscribe('pwos/system/mode');
            
            this.notifyConnectionListeners(true);
        });

        this.client.on('message', (topic, message) => {
            let parsedMessage = message.toString();
            try {
                parsedMessage = JSON.parse(parsedMessage);
            } catch (e) {
                // Not JSON
            }
            if (this.listeners[topic]) {
                this.listeners[topic].forEach(cb => cb(parsedMessage));
            }
        });

        this.client.on('disconnect', () => this.notifyConnectionListeners(false));
        this.client.on('close', () => this.notifyConnectionListeners(false));
        this.client.on('error', (err) => {
            console.error('MQTT Error:', err);
            this.notifyConnectionListeners(false);
        });
    }

    notifyConnectionListeners(status: boolean) {
        this.connectionStatusListeners.forEach(cb => cb(status));
    }

    onConnectionChange(callback: (status: boolean) => void) {
        this.connectionStatusListeners.push(callback);
        // Immediately notify of current state
        if (this.client) {
            callback(this.client.connected);
        }
    }

    isConnected(): boolean {
        return this.client ? this.client.connected : false;
    }

    subscribe(topic: string, callback: (message: any) => void) {
        if (!this.listeners[topic]) {
            this.listeners[topic] = [];
        }
        this.listeners[topic].push(callback);
    }

    unsubscribe(topic: string, callback: (message: any) => void) {
        if (!this.listeners[topic]) return;
        this.listeners[topic] = this.listeners[topic].filter(cb => cb !== callback);
    }

    publish(topic: string, message: any, options: mqtt.IClientPublishOptions = {}) {
        if (!this.client || !this.client.connected) {
            console.error('Cannot publish, MQTT client disconnected');
            return;
        }
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        this.client.publish(topic, payload, options);
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            this.client = null;
        }
    }
}

export const mqttClient = new MqttService();
