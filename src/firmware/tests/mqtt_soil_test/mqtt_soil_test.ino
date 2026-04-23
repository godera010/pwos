/*
 * P-WOS Isolated MQTT Soil Sensor Test
 * 
 * Target ESP32 Pin: GPIO 34 (Soil)
 * 
 * Purpose: Tests purely the WiFi connection, local MQTT broker link, 
 *          and publishes the accurate soil moisture percentage to mosquitto.
 */

#include <WiFi.h>
#include <PubSubClient.h>

// ============================================
// Network Settings (From your snapshot)
// ============================================
const char* ssid = "esp32";
const char* password = "12345678";
const char* mqtt_server = "192.168.137.1"; // Your PC's IPv4 Mosquitto Broker
const int mqtt_port = 1883;

// ============================================
// P-WOS Topics & Constants
// ============================================
#define TOPIC_SENSOR_DATA "pwos/sensor/data"

const int SOIL_PIN = 34;
const int DRY_CALIBRATION = 0;
const int WET_CALIBRATION = 1840;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastMsg = 0;

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("[WiFi] Connecting to network: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("[WiFi] SUCCESS! ESP32 IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect_mqtt() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Attempting to connect to Mosquitto at ");
    Serial.print(mqtt_server);
    Serial.print(" ...");
    
    // Attempt to connect as an anonymous client
    if (mqttClient.connect("ESP32_SoilTestClient")) {
      Serial.println(" CONNECTED!");
    } else {
      Serial.print(" FAILED, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" -- trying again in 5 seconds");
      delay(5000);
    }
  }
}

int getMoisturePercentage(int rawValue) {
  // Uses our specialized galvanic-inversion fix algorithm
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
  
  Serial.println("=====================================");
  Serial.println("   P-WOS MQTT Soil Moisture Test     ");
  Serial.println("=====================================");
  
  setup_wifi();
  
  mqttClient.setServer(mqtt_server, mqtt_port);
  // Ensure buffer is large enough for our JSON payload
  mqttClient.setBufferSize(256);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnect_mqtt();
  }
  
  // Required to maintain MQTT keep-alive
  mqttClient.loop();

  unsigned long now = millis();
  
  // Publish a new reading every 5 seconds for easy fast testing
  if (now - lastMsg > 5000) {
    lastMsg = now;
    
    // Average 10 readings for stability
    long sum = 0;
    for(int i = 0; i < 10; i++) {
      sum += analogRead(SOIL_PIN);
      delay(10);
    }
    int avgValue = sum / 10;
    int moisturePercent = getMoisturePercentage(avgValue);

    // Build standard PWOS JSON payload
    // Note: We include dummy values for temp/humidity so the Flask backend accepts it cleanly
    String payload = "{";
    payload += "\"device_id\":\"ESP32_PWOS_001\",";
    payload += "\"soil_moisture\":" + String(moisturePercent) + ",";
    payload += "\"temperature\": 99.9,"; // Dummy temperature
    payload += "\"humidity\": 99.9,";    // Dummy humidity
    payload += "\"pump_active\": false";
    payload += "}";

    Serial.print("[MQTT] Publishing to topic -> ");
    Serial.print(TOPIC_SENSOR_DATA);
    Serial.print(" | Payload: ");
    Serial.println(payload);

    mqttClient.publish(TOPIC_SENSOR_DATA, payload.c_str());
  }
}
