import { Platform } from 'react-native';

const getDefaultIp = () => {
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
};

// Dynamic MQTT host resolver
let cachedMqttUrl = `ws://${getDefaultIp()}:9001`;

export const getMqttBrokerUrl = () => {
  return cachedMqttUrl;
};

export const updateMqttBrokerUrl = (customIp: string) => {
  if (customIp && customIp.trim() !== '') {
    cachedMqttUrl = `ws://${customIp}:9001`;
  } else {
    cachedMqttUrl = `ws://${getDefaultIp()}:9001`;
  }
};

class MqttMobileService {
  private socket: WebSocket | null = null;
  private listeners: { [topic: string]: ((message: any) => void)[] } = {};
  private connectionStatusListeners: ((status: boolean) => void)[] = [];
  private lastMessages: { [topic: string]: any } = {};
  private connected: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect() {
    if (this.socket) return;

    const url = getMqttBrokerUrl();
    console.log(`MQTT: Connecting to Mosquitto WebSocket broker at ${url}`);

    try {
      // Create a standard WebSocket connection to Mosquitto
      // Mosquitto requires the 'mqtt' subprotocol for WebSocket connections
      this.socket = new WebSocket(url, 'mqtt');

      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        console.log('MQTT: WebSocket Connection Opened');
        this.connected = true;
        this.notifyConnectionListeners(true);
        this.sendConnectPacket();
      };

      this.socket.onmessage = (event) => {
        this.handleIncomingData(event.data);
      };

      this.socket.onclose = (event) => {
        console.log('MQTT: WebSocket Connection Closed', event.reason);
        this.handleDisconnect();
      };

      this.socket.onerror = (error) => {
        console.error('MQTT: WebSocket Error', error);
        this.handleDisconnect();
      };
    } catch (e) {
      console.error('MQTT: Init error', e);
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.connected = false;
    this.socket = null;
    this.notifyConnectionListeners(false);

    // Auto-reconnect after 5 seconds
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect();
      }, 5000);
    }
  }

  private sendConnectPacket() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    // Send a standard MQTT Connect request over the WebSocket.
    // Since we are using standard WebSocket, Mosquitto expects standard binary payloads.
    // Standard MQTT CONNECT packet (Protocol: MQTT, ClientID: pwos_mobile_client, CleanSession: true)
    const packet = new Uint8Array([
      0x10, 27, // CONNECT, remaining length 27
      0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, // "MQTT"
      0x04, // Version 4 (MQTT 3.1.1)
      0x02, // Connect flags: Clean Session
      0x00, 0x3c, // Keep alive: 60s
      0x00, 15, // Client ID Length: 15
      0x70, 0x77, 0x6f, 0x73, 0x5f, 0x6d, 0x6f, 0x62, 0x69, 0x6c, 0x65, 0x5f, 0x61, 0x70, 0x70 // "pwos_mobile_app"
    ]);

    this.socket.send(packet.buffer);
    
    // Subscribe to default topics after connecting
    setTimeout(() => {
      this.subscribeToTopic('pwos/sensor/data');
      this.subscribeToTopic('pwos/system/hardware');
      this.subscribeToTopic('pwos/system/mode');
    }, 500);
  }

  private subscribeToTopic(topic: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    // Standard MQTT SUBSCRIBE packet
    const topicBytes = new TextEncoder().encode(topic);
    const remainingLength = 2 + 2 + topicBytes.length + 1; // Packet ID (2) + Topic Length (2) + Topic + Requested QoS (1)
    
    const header = [
      0x82, remainingLength, // SUBSCRIBE, remaining length
      0x00, 0x01, // Packet identifier: 1
      (topicBytes.length >> 8) & 0xff, topicBytes.length & 0xff // Topic length
    ];

    const packet = new Uint8Array(header.length + topicBytes.length + 1);
    packet.set(header, 0);
    packet.set(topicBytes, header.length);
    packet.set([0x00], header.length + topicBytes.length); // QoS 0

    this.socket.send(packet.buffer);
  }

  private handleIncomingData(data: ArrayBuffer) {
    const bytes = new Uint8Array(data);
    const packetType = bytes[0] >> 4;

    if (packetType === 3) {
      // PUBLISH packet
      const varHeaderStart = 2; // skip type and remaining length byte (assuming simple 1-byte length)
      const topicLength = (bytes[varHeaderStart] << 8) | bytes[varHeaderStart + 1];
      const topicBytes = bytes.slice(varHeaderStart + 2, varHeaderStart + 2 + topicLength);
      const topic = new TextDecoder().decode(topicBytes);
      
      const payloadBytes = bytes.slice(varHeaderStart + 2 + topicLength);
      const payloadStr = new TextDecoder().decode(payloadBytes);

      let parsedMessage = payloadStr;
      try {
        parsedMessage = JSON.parse(payloadStr);
      } catch (e) {
        // Not JSON
      }

      this.lastMessages[topic] = parsedMessage;

      if (this.listeners[topic]) {
        this.listeners[topic].forEach(cb => cb(parsedMessage));
      }
    }
  }

  notifyConnectionListeners(status: boolean) {
    this.connectionStatusListeners.forEach(cb => cb(status));
  }

  onConnectionChange(callback: (status: boolean) => void) {
    if (!this.connectionStatusListeners.includes(callback)) {
      this.connectionStatusListeners.push(callback);
    }
    callback(this.connected);
  }

  removeConnectionListener(callback: (status: boolean) => void) {
    this.connectionStatusListeners = this.connectionStatusListeners.filter(cb => cb !== callback);
  }

  isConnected(): boolean {
    return this.connected;
  }

  subscribe(topic: string, callback: (message: any) => void) {
    if (!this.listeners[topic]) {
      this.listeners[topic] = [];
      this.subscribeToTopic(topic);
    }
    this.listeners[topic].push(callback);

    if (topic in this.lastMessages) {
      callback(this.lastMessages[topic]);
    }
  }

  unsubscribe(topic: string, callback: (message: any) => void) {
    if (!this.listeners[topic]) return;
    this.listeners[topic] = this.listeners[topic].filter(cb => cb !== callback);
  }

  publish(topic: string, message: any) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('MQTT: Cannot publish, WebSocket not open');
      return;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    const topicBytes = new TextEncoder().encode(topic);
    const payloadBytes = new TextEncoder().encode(payload);
    
    // Standard MQTT PUBLISH packet (QoS 0)
    const remainingLength = 2 + topicBytes.length + payloadBytes.length; // Topic length (2) + Topic + Payload
    const header = [
      0x30, remainingLength, // PUBLISH QoS 0
      (topicBytes.length >> 8) & 0xff, topicBytes.length & 0xff // Topic length
    ];

    const packet = new Uint8Array(header.length + topicBytes.length + payloadBytes.length);
    packet.set(header, 0);
    packet.set(topicBytes, header.length);
    packet.set(payloadBytes, header.length + topicBytes.length);

    this.socket.send(packet.buffer);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
  }
}

export const mqttClient = new MqttMobileService();
