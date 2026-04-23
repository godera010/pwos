#include <DHT.h>
#include <ArduinoJson.h>

// Pin assignments
#define DHT_PIN       25    // DHT22 data
#define SOIL_PIN      34    // Potentiometer (soil sensor)
#define RELAY_PIN     26    // Relay IN (pump control)
#define LED_PIN       2     // Onboard status LED

// Soil calibration (potentiometer: left = dry, right = wet)
#define SOIL_DRY      100
#define SOIL_WET      3900

#define SAMPLE_INTERVAL  5000   // Print sensor data every 5s

DHT dht(DHT_PIN, DHT22);

bool          pumpActive     = false;
unsigned long pumpStartMs    = 0;
unsigned long pumpDurationMs = 0;
unsigned long lastSample     = 0;
unsigned long lastLedToggle  = 0;
bool          ledState       = false;
String        serialBuffer   = "";

// ─── SETUP ───────────────────────────────────────────────────────────────────

void setup() {
    pinMode(LED_PIN, OUTPUT);
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH);
    digitalWrite(RELAY_PIN, LOW);

    Serial.begin(115200);
    delay(100);

    Serial.println("\n============================================");
    Serial.println("  P-WOS ESP32 — WOKWI SIMULATION");
    Serial.println("  Commands: STATUS | READ | PUMP ON | PUMP OFF");
    Serial.println("============================================\n");

    dht.begin();
    Serial.println("[READY] Publishing every 5s\n");
    readAndPrint();   // immediate first reading
}

// ─── LOOP ────────────────────────────────────────────────────────────────────

void loop() {
    unsigned long now = millis();

    if (now - lastSample >= SAMPLE_INTERVAL) {
        lastSample = now;
        readAndPrint();
    }

    if (pumpActive && (now - pumpStartMs >= pumpDurationMs)) {
        stopPump();
    }

    checkSerial();
    updateLED(now);
    delay(10);
}

// ─── SENSORS ─────────────────────────────────────────────────────────────────

float readSoil() {
    long total = 0;
    for (int i = 0; i < 5; i++) { total += analogRead(SOIL_PIN); delay(5); }
    float pct = (float)((total / 5) - SOIL_DRY) / (SOIL_WET - SOIL_DRY) * 100.0;
    return constrain(pct, 0.0, 100.0);
}

void readAndPrint() {
    float soil = readSoil();
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();

    if (isnan(temp)) { temp = 25.0; hum = 60.0; }  // fallback if sensor fails

    Serial.printf("[DATA] Soil:%.1f%%  Temp:%.1f°C  Hum:%.1f%%  Pump:%s\n",
                  soil, temp, hum, pumpActive ? "ON" : "OFF");

    // JSON — identical format to real firmware and backend
    StaticJsonDocument<256> doc;
    doc["device_id"]     = "ESP32_PWOS_WOKWI";
    doc["soil_moisture"] = (int)(soil * 10) / 10.0;
    doc["temperature"]   = (int)(temp * 10) / 10.0;
    doc["humidity"]      = (int)(hum  * 10) / 10.0;
    doc["pump_active"]   = pumpActive;
    doc["source"]        = "wokwi_sim";

    char buf[256];
    serializeJson(doc, buf);
    Serial.print("[SERIAL] ");
    Serial.println(buf);
}

// ─── SERIAL COMMANDS ─────────────────────────────────────────────────────────

void checkSerial() {
    while (Serial.available()) {
        char c = Serial.read();
        if (c == '\n' || c == '\r') {
            if (serialBuffer.length() > 0) { handleCmd(serialBuffer); serialBuffer = ""; }
        } else {
            if (serialBuffer.length() < 128) serialBuffer += c;
        }
    }
}

void handleCmd(String raw) {
    String cmd = raw; cmd.trim(); cmd.toUpperCase();

    if      (cmd == "STATUS")   { Serial.printf("[STATUS] Pump:%s | Soil:%.1f%% | Temp:%.1f°C\n",
                                    pumpActive?"ON":"OFF", readSoil(), dht.readTemperature()); }
    else if (cmd == "READ")     { readAndPrint(); }
    else if (cmd == "PUMP ON")  { startPump(30); }
    else if (cmd == "PUMP OFF") { stopPump(); }
    else if (cmd == "HELP")     { Serial.println("[HELP] STATUS | READ | PUMP ON | PUMP OFF | {\"action\":\"ON\",\"duration\":15}"); }
    else if (cmd.startsWith("{")) {
        StaticJsonDocument<128> doc;
        if (!deserializeJson(doc, raw)) {
            if (strcmp(doc["action"] | "OFF", "ON") == 0) startPump(doc["duration"] | 30);
            else stopPump();
        }
    }
    else { Serial.printf("[CMD] Unknown: %s\n", cmd.c_str()); }
}

// ─── PUMP ─────────────────────────────────────────────────────────────────────

void startPump(int seconds) {
    pumpActive = true; pumpStartMs = millis(); pumpDurationMs = (unsigned long)seconds * 1000;
    digitalWrite(RELAY_PIN, HIGH);
    Serial.printf("[PUMP] ON for %ds\n", seconds);
}

void stopPump() {
    if (!pumpActive) return;
    pumpActive = false;
    digitalWrite(RELAY_PIN, LOW);
    Serial.printf("[PUMP] OFF (ran %lus)\n", (millis() - pumpStartMs) / 1000);
}

// ─── LED ──────────────────────────────────────────────────────────────────────

void updateLED(unsigned long now) {
    unsigned long interval = pumpActive ? 150 : 1000;  // fast = pump on, slow = normal
    if (now - lastLedToggle >= interval) {
        lastLedToggle = now;
        digitalWrite(LED_PIN, ledState = !ledState);
    }
}
