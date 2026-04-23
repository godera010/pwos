/*
 * ============================================================================
 * P-WOS ESP32 Firmware (C++ / Arduino Framework)
 * ============================================================================
 * 
 * Reads sensors, publishes to MQTT, listens for pump commands.
 * Supports two local modes:
 *   USB MODE  (WIFI_ENABLED false) — Serial JSON only, PC bridge handles MQTT
 *   WiFi MODE (WIFI_ENABLED true)  — ESP32 publishes directly to MQTT broker
 *
 * Hardware:
 *   - ESP32-WROOM-32 DevKit V1
 *   - DHT11 (Temp + Humidity)       → GPIO 14
 *   - Resistive Soil Moisture       → GPIO 34 (ADC)
 *   - 5V Relay Module (Pump)        → GPIO 27
 *   - Status LED                    → GPIO 2 (onboard)
 *
 * Libraries (install via Arduino Library Manager):
 *   - WiFi            (built-in)
 *   - PubSubClient    (by Nick O'Leary)
 *   - DHT sensor library (by Adafruit)
 *   - ArduinoJson     (by Benoit Blanchon)
 *
 * Setup:
 *   1. Copy config.h.example → config.h
 *   2. Fill in your WiFi + MQTT credentials
 *   3. Set WIFI_ENABLED to true (WiFi) or false (USB only)
 *   4. Calibrate soil sensor (SOIL_DRY / SOIL_WET)
 *   5. Upload to ESP32 via Arduino IDE
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include "config.h"

// ============================================================================
// MQTT Topics (must match Python backend)
// ============================================================================
#define TOPIC_SENSOR_DATA   "pwos/sensor/data"
#define TOPIC_CONTROL_PUMP  "pwos/control/pump"
#define TOPIC_DEVICE_STATUS "pwos/device/status"
#define TOPIC_WEATHER       "pwos/weather/current"
#define TOPIC_HARDWARE      "pwos/system/hardware"

// ============================================================================
// Hardware Objects
// ============================================================================
DHT dht(DHT_PIN, DHT11);

WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);

// ============================================================================
// Sensor Data Struct (forward declaration for Arduino compiler)
// ============================================================================
struct SensorData {
    float soilMoisture;
    float temperature;
    float humidity;
    bool  pumpActive;
    bool  valid;
};

// ============================================================================
// State Variables
// ============================================================================

// Pump control (non-blocking)
bool     pumpActive       = false;
unsigned long pumpStartMs = 0;
unsigned long pumpDurationMs = 0;

// Timing
unsigned long lastSensorPublish  = 0;
unsigned long lastHeartbeat      = 0;
unsigned long lastWifiCheck      = 0;

// WiFi reconnect backoff
unsigned long wifiReconnectDelay = 1000;
const unsigned long WIFI_MAX_BACKOFF = 30000;

// MQTT reconnect backoff
unsigned long mqttReconnectDelay = 1000;
const unsigned long MQTT_MAX_BACKOFF = 30000;
unsigned long lastMqttReconnect  = 0;

// LED blink patterns
unsigned long lastLedToggle = 0;
bool ledState = false;

// Sensor error tracking
int dhtErrors  = 0;
int soilErrors = 0;

// Serial command buffer (for USB pump commands)
String serialBuffer = "";

// ============================================================================
// SETUP
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println();
    Serial.println("============================================");
    Serial.println("  P-WOS ESP32 Firmware v1.1");
    Serial.println("============================================");

    #if WIFI_ENABLED
        Serial.println("  Mode: WiFi (MQTT direct)");
    #else
        Serial.println("  Mode: USB (Serial bridge)");
    #endif

    Serial.println();

    // Pin setup
    pinMode(RELAY_PIN, OUTPUT);
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);   // Pump OFF
    digitalWrite(LED_PIN, LOW);

    // Initialize DHT sensor
    dht.begin();
    Serial.println("[INIT] DHT11 initialized");

    #if WIFI_ENABLED
        // Initialize WiFi
        connectWiFi();

        // Initialize MQTT
        mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
        mqttClient.setCallback(mqttCallback);
        mqttClient.setBufferSize(512);
        connectMQTT();
    #else
        Serial.println("[INIT] WiFi DISABLED — USB serial mode");
        Serial.println("[INIT] Sensor data will be output on serial");
        Serial.println("[INIT] Use serial_bridge.py on PC to forward to MQTT");
        Serial.println("[INIT] Send JSON pump commands via serial:");
        Serial.println("[INIT]   {\"action\":\"ON\",\"duration\":30}");
    #endif

    // Enable watchdog timer (30 second timeout) — ESP32 Core 3.x API
    esp_task_wdt_config_t wdt_config = {
        .timeout_ms = 30000,
        .idle_core_mask = (1 << 0),
        .trigger_panic = true
    };
    esp_task_wdt_init(&wdt_config);
    esp_task_wdt_add(NULL);

    Serial.println();
    Serial.println("[READY] P-WOS ESP32 Running");
    Serial.printf("[INFO]  Publish interval: %ds\n", SAMPLE_INTERVAL / 1000);
    Serial.println("============================================");
    Serial.println();
}

// ============================================================================
// MAIN LOOP
// ============================================================================
void loop() {
    unsigned long now = millis();

    // Reset watchdog
    esp_task_wdt_reset();

    #if WIFI_ENABLED
        // --- WiFi Check (every 10s) ---
        if (now - lastWifiCheck > 10000) {
            lastWifiCheck = now;
            if (WiFi.status() != WL_CONNECTED) {
                Serial.println("[WARN] WiFi disconnected, reconnecting...");
                connectWiFi();
            }
        }

        // --- MQTT Check ---
        if (!mqttClient.connected()) {
            if (now - lastMqttReconnect > mqttReconnectDelay) {
                lastMqttReconnect = now;
                connectMQTT();
            }
        } else {
            mqttClient.loop();
            mqttReconnectDelay = 1000; // Reset backoff on success
        }
    #else
        // --- USB Mode: Check for serial commands ---
        checkSerialCommands();
    #endif

    // --- Pump Timer (non-blocking) ---
    // IMPORTANT: Use fresh millis(), NOT cached 'now', because pumpStartMs
    // is set inside mqttClient.loop() callback. Using stale 'now' causes
    // unsigned underflow (now < pumpStartMs → wraps to huge number → instant stop).
    if (pumpActive) {
        if (millis() - pumpStartMs >= pumpDurationMs) {
            stopPump();
        }
    }

    // --- Sensor Publish ---
    if (now - lastSensorPublish >= SAMPLE_INTERVAL) {
        lastSensorPublish = now;
        publishSensorData();
    }

    // --- Heartbeat (every 60s) ---
    if (now - lastHeartbeat >= 60000) {
        lastHeartbeat = now;
        publishHeartbeat();
    }

    // --- Status LED ---
    updateStatusLED(now);

    delay(10); // Small yield
}

// ============================================================================
// SERIAL COMMAND HANDLER (USB Mode)
// ============================================================================
void checkSerialCommands() {
    while (Serial.available()) {
        char c = Serial.read();
        if (c == '\n' || c == '\r') {
            if (serialBuffer.length() > 0) {
                processSerialCommand(serialBuffer);
                serialBuffer = "";
            }
        } else {
            serialBuffer += c;
            // Prevent buffer overflow
            if (serialBuffer.length() > 256) {
                serialBuffer = "";
            }
        }
    }
}

void processSerialCommand(String cmd) {
    cmd.trim();

    // Expect JSON: {"action":"ON","duration":30}
    if (cmd.startsWith("{")) {
        Serial.printf("[CMD] Received: %s\n", cmd.c_str());
        handlePumpCommand(cmd.c_str());
        return;
    }

    // Simple text commands for debugging
    if (cmd == "STATUS") {
        Serial.printf("[STATUS] Pump:%s Moisture:%.1f Temp:%.1f Hum:%.1f\n",
                      pumpActive ? "ON" : "OFF",
                      readSoilMoisture(),
                      dht.readTemperature(),
                      dht.readHumidity());
    } else if (cmd == "PUMP ON") {
        startPump(30);
    } else if (cmd == "PUMP OFF") {
        stopPump();
    } else if (cmd == "READ") {
        publishSensorData();
    } else {
        Serial.printf("[CMD] Unknown command: %s\n", cmd.c_str());
        Serial.println("[CMD] Available: STATUS, PUMP ON, PUMP OFF, READ, or JSON");
    }
}

// ============================================================================
// WiFi CONNECTION
// ============================================================================
void connectWiFi() {
    #if !WIFI_ENABLED
        return;
    #endif

    Serial.printf("[WiFi] Connecting to: %s", WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    int timeout = 30; // 30 seconds
    while (WiFi.status() != WL_CONNECTED && timeout > 0) {
        delay(1000);
        Serial.print(".");
        timeout--;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("[WiFi] RSSI: %d dBm\n", WiFi.RSSI());
        wifiReconnectDelay = 1000; // Reset backoff
    } else {
        Serial.println();
        Serial.println("[WiFi] Connection FAILED!");
        Serial.printf("[WiFi] Retrying in %lus...\n", wifiReconnectDelay / 1000);

        // Exponential backoff
        wifiReconnectDelay = min(wifiReconnectDelay * 2, WIFI_MAX_BACKOFF);
    }
}

// ============================================================================
// MQTT CONNECTION
// ============================================================================
void connectMQTT() {
    #if !WIFI_ENABLED
        return;
    #endif

    if (WiFi.status() != WL_CONNECTED) return;

    Serial.printf("[MQTT] Connecting to %s:%d...\n", MQTT_BROKER, MQTT_PORT);

    // Set Last Will and Testament (LWT) — broker publishes OFFLINE if ESP32
    // disconnects unexpectedly (power loss, WiFi drop, crash).
    // willRetain=true ensures new subscribers see the last status.
    bool connected;
    if (strlen(MQTT_USER) > 0) {
        connected = mqttClient.connect(DEVICE_ID, MQTT_USER, MQTT_PASS,
                                       TOPIC_HARDWARE, 1, true, "OFFLINE");
    } else {
        connected = mqttClient.connect(DEVICE_ID,
                                       NULL, NULL,
                                       TOPIC_HARDWARE, 1, true, "OFFLINE");
    }

    if (connected) {
        Serial.println("[MQTT] Connected!");

        // Publish ONLINE status (retained so backend knows immediately)
        mqttClient.publish(TOPIC_HARDWARE, "ONLINE", true);
        Serial.printf("[MQTT] Published ONLINE to %s\n", TOPIC_HARDWARE);

        // Subscribe to pump control
        bool sub1 = mqttClient.subscribe(TOPIC_CONTROL_PUMP);
        Serial.printf("[MQTT] Subscribe to %s: %s\n", TOPIC_CONTROL_PUMP, sub1 ? "OK" : "FAILED");

        // Subscribe to weather updates
        bool sub2 = mqttClient.subscribe(TOPIC_WEATHER);
        Serial.printf("[MQTT] Subscribe to %s: %s\n", TOPIC_WEATHER, sub2 ? "OK" : "FAILED");

        mqttReconnectDelay = 1000;
    } else {
        Serial.printf("[MQTT] Failed! State=%d\n", mqttClient.state());
        Serial.printf("[MQTT] Retrying in %lus...\n", mqttReconnectDelay / 1000);
        mqttReconnectDelay = min(mqttReconnectDelay * 2, MQTT_MAX_BACKOFF);
    }
}

// ============================================================================
// MQTT CALLBACK (Incoming Messages — WiFi mode only)
// ============================================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    // Parse payload
    char message[length + 1];
    memcpy(message, payload, length);
    message[length] = '\0';

    Serial.printf("[MQTT] Received on %s: %s\n", topic, message);

    // Handle pump commands
    if (strcmp(topic, TOPIC_CONTROL_PUMP) == 0) {
        handlePumpCommand(message);
    }
}

// ============================================================================
// PUMP CONTROL (Non-blocking)
// ============================================================================
void handlePumpCommand(const char* message) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
        Serial.printf("[PUMP] JSON parse error: %s\n", error.c_str());
        return;
    }

    const char* action = doc["action"] | "OFF";
    int duration = doc["duration"] | 30;

    if (strcmp(action, "ON") == 0) {
        if (duration <= 0) {
            stopPump();
            return;
        }
        startPump(duration);
    } else {
        stopPump();
    }
}

void startPump(int durationSeconds) {
    if (pumpActive) {
        // Extend current run
        pumpDurationMs += (unsigned long)durationSeconds * 1000;
        Serial.printf("[PUMP] Extended by %ds (total: %lus)\n",
                      durationSeconds, pumpDurationMs / 1000);
    } else {
        pumpActive    = true;
        pumpStartMs   = millis();
        pumpDurationMs = (unsigned long)durationSeconds * 1000;
        digitalWrite(RELAY_PIN, HIGH);
        Serial.printf("[PUMP] ON for %ds\n", durationSeconds);
    }
}

void stopPump() {
    if (pumpActive) {
        pumpActive = false;
        digitalWrite(RELAY_PIN, LOW);
        unsigned long ranFor = (millis() - pumpStartMs) / 1000;
        Serial.printf("[PUMP] OFF (ran for %lus)\n", ranFor);
    }
}

// ============================================================================
// SENSOR READING
// ============================================================================
float readSoilMoisture() {
    // Take 10 readings and average for stability
    long total = 0;

    for (int i = 0; i < 10; i++) {
        total += analogRead(SOIL_PIN);
        delay(10);
    }

    int avgRaw = total / 10;

    // Map ADC to percentage using custom Galvanic Inversion safe math
    if (avgRaw > SOIL_WET) return 100.0;
    if (avgRaw <= SOIL_DRY) return 0.0;
    
    float moisture = map(avgRaw, SOIL_DRY, SOIL_WET, 0, 100);
    if (moisture > 100.0) return 100.0;
    if (moisture < 0.0) return 0.0;

    soilErrors = 0; // Reset error counter
    return moisture;
}

// SensorData struct declared at top of file for Arduino compiler

SensorData readAllSensors() {
    SensorData data;

    // Read soil moisture
    data.soilMoisture = readSoilMoisture();

    // Read DHT11 (temperature + humidity)
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();

    if (isnan(temp) || isnan(hum)) {
        dhtErrors++;
        Serial.println("[WARN] DHT11 read failed!");

        if (dhtErrors > 3) {
            // Too many consecutive failures
            data.temperature = -999.0;
            data.humidity    = -999.0;
            data.valid = false;
        } else {
            // Use last known values (sensor may recover)
            data.temperature = temp;
            data.humidity    = hum;
            data.valid = false;
        }
    } else {
        data.temperature = temp;
        data.humidity    = hum;
        dhtErrors = 0;
        data.valid = true;
    }

    data.pumpActive = pumpActive;

    // Also valid if soil is OK even though DHT failed
    if (data.soilMoisture >= 0) {
        data.valid = true;
    }

    return data;
}

// ============================================================================
// PUBLISH SENSOR DATA
// ============================================================================
void publishSensorData() {
    SensorData data = readAllSensors();

    // Build JSON payload (matches simulator format for backend compatibility)
    StaticJsonDocument<384> doc;
    doc["device_id"]     = DEVICE_ID;
    doc["timestamp"]     = millis(); // Backend will use server time
    doc["soil_moisture"]  = round2(data.soilMoisture);
    doc["temperature"]    = round2(data.temperature);
    doc["humidity"]       = round2(data.humidity);
    doc["pump_active"]    = data.pumpActive;

    char payload[384];
    serializeJson(doc, payload);

    #if WIFI_ENABLED
        // Publish to MQTT (WiFi mode)
        if (mqttClient.connected()) {
            bool sent = mqttClient.publish(TOPIC_SENSOR_DATA, payload, true);
            if (sent) {
                Serial.printf("[DATA] M:%.1f%% T:%.1fC H:%.1f%% Pump:%s\n",
                              data.soilMoisture, data.temperature, data.humidity,
                              data.pumpActive ? "ON" : "OFF");
            } else {
                Serial.println("[ERROR] MQTT publish failed!");
            }
        } else {
            Serial.println("[WARN] MQTT not connected, data on serial only");
        }
    #endif

    // ALWAYS output on serial (works in both USB and WiFi mode)
    // serial_bridge.py on PC picks this up in USB mode
    Serial.print("[SERIAL] ");
    Serial.println(payload);
}

// ============================================================================
// HEARTBEAT
// ============================================================================
void publishHeartbeat() {
    StaticJsonDocument<256> doc;
    doc["device_id"]   = DEVICE_ID;
    doc["uptime_ms"]   = millis();
    doc["free_heap"]   = ESP.getFreeHeap();
    doc["pump_active"] = pumpActive;
    doc["dht_errors"]  = dhtErrors;
    doc["soil_errors"] = soilErrors;

    #if WIFI_ENABLED
        doc["wifi_rssi"] = WiFi.RSSI();
        doc["mode"]      = "wifi";
    #else
        doc["wifi_rssi"] = 0;
        doc["mode"]      = "usb";
    #endif

    char payload[256];
    serializeJson(doc, payload);

    #if WIFI_ENABLED
        if (mqttClient.connected()) {
            mqttClient.publish(TOPIC_DEVICE_STATUS, payload);
        }
    #endif

    // Always print heartbeat on serial
    Serial.print("[HEARTBEAT] ");
    Serial.println(payload);
}

// ============================================================================
// STATUS LED
// ============================================================================
void updateStatusLED(unsigned long now) {
    unsigned long interval;

    #if WIFI_ENABLED
        if (WiFi.status() != WL_CONNECTED) {
            interval = 100;       // Fast blink = no WiFi
        } else if (!mqttClient.connected()) {
            interval = 500;       // Medium blink = no MQTT
        } else if (pumpActive) {
            interval = 200;       // Quick pulse = pump running
        } else {
            // Solid ON = all good
            digitalWrite(LED_PIN, HIGH);
            return;
        }
    #else
        // USB mode LED patterns
        if (pumpActive) {
            interval = 200;       // Quick pulse = pump running
        } else {
            // Slow breathe = USB mode, running normally
            interval = 1000;
        }
    #endif

    if (now - lastLedToggle >= interval) {
        lastLedToggle = now;
        ledState = !ledState;
        digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    }
}

// ============================================================================
// UTILITY
// ============================================================================
float round2(float value) {
    return (int)(value * 100 + 0.5) / 100.0;
}
