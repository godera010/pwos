/*
 * P-WOS Isolated JSON MQTT Pump & Soil Test
 * 
 * Target ESP32 Pins: 
 *   - GPIO 34 (Soil Sensor)
 *   - GPIO 26 (Pump Relay Module)
 * 
 * Purpose: Tests full two-way MQTT communication. 
 *  1. Publishes soil moisture to mosquitto.
 *  2. Subscribes to mosquitto to listen for incoming pump commands.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================================
// Network Settings 
// ============================================
const char* ssid = "esp32";
const char* password = "12345678";
const char* mqtt_server = "192.168.137.1";
const int mqtt_port = 1883;

// Topics
#define TOPIC_SENSOR_DATA "pwos/sensor/data"
#define TOPIC_CONTROL_PUMP "pwos/control/pump"

// Hardware
const int SOIL_PIN = 34;
const int RELAY_PIN = 27;

// Calibration
const int DRY_CALIBRATION = 0;
const int WET_CALIBRATION = 1840;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastMsg = 0;

// Pump State Tracker
bool pumpActive = false;
unsigned long pumpStartMs = 0;
unsigned long pumpDurationMs = 0;

void setup_wifi() {
  delay(10);
  Serial.print("\n[WiFi] Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] SUCCESS! IP: " + WiFi.localIP().toString());
}

// ---------------------------------------------------------
// INCOMING MESSAGE HANDLER (From python/backend to ESP32)
// ---------------------------------------------------------
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  
  Serial.print("\n[MQTT INCOMING] Topic: ");
  Serial.println(topic);
  Serial.print("[MQTT INCOMING] Payload: ");
  Serial.println(message);

  // If the message came in on the pump topic, trigger the relay!
  if (strcmp(topic, TOPIC_CONTROL_PUMP) == 0) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
      Serial.println("[ERROR] Failed to parse JSON command!");
      return;
    }

    const char* action = doc["action"];
    int duration = doc["duration"] | 5; // Default to 5 seconds if not specified

    if (strcmp(action, "ON") == 0) {
      Serial.print(">>> [PUMP] Turning Relay ON for ");
      Serial.print(duration);
      Serial.println(" seconds!");
      
      digitalWrite(RELAY_PIN, HIGH); // Turn Relay ON (Might be LOW depending on your specific relay module)
      pumpActive = true;
      pumpStartMs = millis();
      pumpDurationMs = duration * 1000;
      
    } else if (strcmp(action, "OFF") == 0) {
      Serial.println(">>> [PUMP] Force stopping Relay!");
      digitalWrite(RELAY_PIN, LOW);
      pumpActive = false;
    }
  }
}

void reconnect_mqtt() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting...");
    if (mqttClient.connect("ESP32_PumpTestClient")) {
      Serial.println(" CONNECTED!");
      
      // CRITICAL: We must subscribe to the pump topic so Mosquitto knows to send us commands
      mqttClient.subscribe(TOPIC_CONTROL_PUMP);
      Serial.println("[MQTT] Now listening for pump commands...");
    } else {
      Serial.print(" FAILED, rc=");
      Serial.print(mqttClient.state());
      delay(5000);
    }
  }
}

int getMoisturePercentage(int rawValue) {
  if (rawValue > WET_CALIBRATION) return 100;
  if (rawValue <= DRY_CALIBRATION) return 0;
  int percentage = map(rawValue, DRY_CALIBRATION, WET_CALIBRATION, 0, 100);
  if (percentage > 100) return 100;
  if (percentage < 0) return 0;
  return percentage;
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  // Set up the physical pin for the relay
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Start off
  
  setup_wifi();
  
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(mqttCallback); // Tell MQTT where to send incoming messages
}

void loop() {
  if (!mqttClient.connected()) {
    reconnect_mqtt();
  }
  mqttClient.loop();

  unsigned long now = millis();
  
  // ---------------------------------------------------------
  // NON-BLOCKING PUMP TIMER
  // ---------------------------------------------------------
  // This automatically shuts the pump off after the requested time ends
  // without pausing the rest of the code!
  if (pumpActive) {
    if (now - pumpStartMs >= pumpDurationMs) {
      Serial.println(">>> [PUMP] Timer finished. Turning Relay OFF.");
      digitalWrite(RELAY_PIN, LOW);
      pumpActive = false;
    }
  }
  
  // ---------------------------------------------------------
  // OUTGOING SENSOR DATA
  // ---------------------------------------------------------
  if (now - lastMsg > 5000) {
    lastMsg = now;
    long sum = 0;
    for(int i = 0; i < 10; i++) { sum += analogRead(SOIL_PIN); delay(10); }
    int moisturePercent = getMoisturePercentage(sum / 10);

    // Build standard JSON payload, dynamically inserting pump_active state!
    String payload = "{";
    payload += "\"device_id\":\"ESP32_PWOS_001\",";
    payload += "\"soil_moisture\":" + String(moisturePercent) + ",";
    payload += "\"temperature\": 24.5,";
    payload += "\"humidity\": 50.0,";
    payload += "\"pump_active\": " + String(pumpActive ? "true" : "false");
    payload += "}";

    // Print a tiny heartbeat to serial instead of spamming 
    Serial.print("[DATA] M:"); Serial.print(moisturePercent); 
    Serial.print("% | Pump:"); Serial.println(pumpActive ? "ON" : "OFF");
    
    mqttClient.publish(TOPIC_SENSOR_DATA, payload.c_str());
  }
}
