/*
 * ============================================================================
 * P-WOS Test 04: All Sensors Combined
 * ============================================================================
 * 
 * PURPOSE:
 *   Final validation — run DHT22 and water sensor simultaneously.
 *   If this test passes, your hardware is ready for the full P-WOS firmware.
 *
 * WIRING SUMMARY:
 *   Component       Pin       Wire Color    Breadboard Location
 *   ─────────       ───       ──────────    ──────────────────
 *   DHT22 Data      GPIO 25   Brown (W4)    Col 11, Row A
 *   DHT22 VCC       3.3V      Green (W3)    (+) inner strip
 *   DHT22 GND       GND       White (W5)    (−) outer strip
 *   Water Signal    GPIO 34   Blue  (W8)    Col 15, Row A
 *   Water VCC       3.3V      Red   (W6)    (+) inner strip
 *   Water GND       GND       Purple(W7)    (−) outer strip
 *   ESP32 3.3V      3.3V      Yellow(W1)    Col 19 A → (+) inner strip
 *   ESP32 GND       GND       Grey  (W2)    Col 6 A  → (−) outer strip
 *
 * WHAT TO EXPECT:
 *   ✅ Temperature + Humidity reading from DHT22
 *   ✅ Water level reading from water sensor
 *   ✅ LED status: slow blink = all OK, fast blink = sensor error
 *   ✅ Summary report every 10 readings with PASS/FAIL verdict
 *
 * LIBRARIES NEEDED:
 *   1. "DHT sensor library" by Adafruit
 *   2. "Adafruit Unified Sensor" 
 * ============================================================================
 */

#include <DHT.h>

// ── Pin Configuration ──
#define DHT_PIN    25     // GPIO 25 = Col 11 (DHT22 data)
#define WATER_PIN  34     // GPIO 34 = Col 15 (Water sensor analog)
#define LED_PIN    2      // Onboard LED

// ── Sensor Setup ──
#define DHT_TYPE   DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// ── Test Settings ──
#define READ_INTERVAL    5000   // Read every 5 seconds
#define WATER_SAMPLES    10     // Analog samples to average
#define MAX_READINGS     50     // Stop after this many (0 = forever)

// ── Water Thresholds ──
#define WATER_DRY        100
#define WATER_WET        500

// ── Tracking Variables ──
int readCount      = 0;
int dhtSuccess     = 0;
int dhtFails       = 0;
int waterMin       = 4095;
int waterMax       = 0;

// Last known good values
float lastTemp     = NAN;
float lastHumidity = NAN;

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    // Configure ADC
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // Initialize DHT
    dht.begin();

    Serial.println();
    Serial.println("============================================");
    Serial.println("  P-WOS Test 04: All Sensors Combined");
    Serial.println("============================================");
    Serial.println();
    Serial.printf("[INFO] DHT22:  GPIO %d (data)\n", DHT_PIN);
    Serial.printf("[INFO] Water:  GPIO %d (analog)\n", WATER_PIN);
    Serial.printf("[INFO] LED:    GPIO %d\n", LED_PIN);
    Serial.printf("[INFO] Free heap: %d bytes\n", ESP.getFreeHeap());
    Serial.println();
    Serial.printf("[INFO] Reading every %d seconds\n", READ_INTERVAL / 1000);
    if (MAX_READINGS > 0) {
        Serial.printf("[INFO] Will run %d readings then show final report\n", MAX_READINGS);
    } else {
        Serial.println("[INFO] Running continuously (no limit)");
    }
    Serial.println();

    // Wait for DHT to stabilize
    Serial.println("[INIT] Waiting 2s for sensors to stabilize...");
    delay(2000);
    Serial.println("[INIT] Starting sensor readings!");
    Serial.println();
}

void loop() {
    readCount++;

    bool dhtOK   = false;
    bool waterOK = false;

    Serial.printf("━━━━━━━━━━━━━━ Reading #%d ━━━━━━━━━━━━━━\n", readCount);

    // ── DHT22 Reading ──
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();

    if (isnan(temp) || isnan(hum)) {
        dhtFails++;
        Serial.printf("  🌡️  Temp:      ❌ FAILED (NaN)\n");
        Serial.printf("  💧 Humidity:  ❌ FAILED (NaN)\n");

        if (dhtFails >= 3) {
            Serial.println("     ⚠️  3+ consecutive DHT fails — check wiring!");
        }
    } else {
        dhtSuccess++;
        dhtFails = 0;  // Reset consecutive fail counter
        dhtOK = true;
        lastTemp = temp;
        lastHumidity = hum;

        // Temperature with range check
        Serial.printf("  🌡️  Temp:      %.2f °C", temp);
        if (temp >= 15.0 && temp <= 40.0) {
            Serial.println("     ✅");
        } else {
            Serial.println("     ⚠️");
        }

        // Humidity with range check
        Serial.printf("  💧 Humidity:  %.2f %%", hum);
        if (hum >= 20.0 && hum <= 90.0) {
            Serial.println("     ✅");
        } else {
            Serial.println("     ⚠️");
        }
    }

    // ── Water Sensor Reading ──
    long waterTotal = 0;
    for (int i = 0; i < WATER_SAMPLES; i++) {
        waterTotal += analogRead(WATER_PIN);
        delay(5);
    }
    int waterAvg = waterTotal / WATER_SAMPLES;
    float waterVoltage = waterAvg * 3.3 / 4095.0;

    // Track range
    if (waterAvg < waterMin) waterMin = waterAvg;
    if (waterAvg > waterMax) waterMax = waterAvg;

    // Determine level
    const char* waterLevel;
    if (waterAvg < WATER_DRY) {
        waterLevel = "DRY";
    } else if (waterAvg < WATER_WET) {
        waterLevel = "DAMP";
    } else {
        waterLevel = "WET";
    }

    Serial.printf("  🌊 Water:     %d (%.2fV)", waterAvg, waterVoltage);
    
    if (waterAvg == 0 && readCount > 3) {
        Serial.println("  ⚠️  (always zero)");
    } else if (waterAvg >= 4090) {
        Serial.println("  ⚠️  (maxed out)");
    } else {
        waterOK = true;
        Serial.printf("  ✅ %s\n", waterLevel);
    }

    // ── LED Status ──
    if (dhtOK && waterOK) {
        Serial.println("  💡 LED:       SLOW BLINK (all OK)");
        // Double flash = all good
        blinkLED(2, 100);
    } else if (dhtOK || waterOK) {
        Serial.println("  💡 LED:       FAST BLINK (partial)");
        blinkLED(4, 80);
    } else {
        Serial.println("  💡 LED:       RAPID BLINK (both failing)");
        blinkLED(6, 50);
    }

    Serial.println();

    // ── Summary every 10 readings ──
    if (readCount > 0 && readCount % 10 == 0) {
        printSummary(false);
    }

    // ── Stop after MAX_READINGS ──
    if (MAX_READINGS > 0 && readCount >= MAX_READINGS) {
        printSummary(true);

        // Halt with slow blink
        while (true) {
            digitalWrite(LED_PIN, HIGH); delay(2000);
            digitalWrite(LED_PIN, LOW);  delay(2000);
        }
    }

    // LED pattern between readings
    if (dhtOK && waterOK) {
        // Slow breathe
        delay(READ_INTERVAL);
    } else {
        // Fast blink to indicate problem
        unsigned long start = millis();
        while (millis() - start < (unsigned long)READ_INTERVAL) {
            digitalWrite(LED_PIN, HIGH); delay(200);
            digitalWrite(LED_PIN, LOW);  delay(200);
        }
    }
}

// ── Helper: Blink LED n times ──
void blinkLED(int times, int ms) {
    for (int i = 0; i < times; i++) {
        digitalWrite(LED_PIN, HIGH); delay(ms);
        digitalWrite(LED_PIN, LOW);  delay(ms);
    }
}

// ── Print Summary Report ──
void printSummary(bool isFinal) {
    float dhtRate = (readCount > 0) ? (float)dhtSuccess / readCount * 100 : 0;
    bool dhtPassed   = dhtRate >= 90;
    bool waterPassed = (waterMax - waterMin > 20) || (waterMax < WATER_DRY);
    // Water passes if: values change OR sensor is dry (means it's responding, just dry)

    Serial.println();
    if (isFinal) {
        Serial.println("╔══════════════════════════════════════════╗");
        Serial.println("║        FINAL TEST REPORT                 ║");
        Serial.println("╠══════════════════════════════════════════╣");
    } else {
        Serial.println("┌──────────────────────────────────────────┐");
        Serial.printf("│  Progress Report (after %d readings)     \n", readCount);
        Serial.println("├──────────────────────────────────────────┤");
    }

    // DHT22 results
    Serial.printf("│  DHT22 success rate:  %d/%d (%.0f%%)", dhtSuccess, readCount, dhtRate);
    if (dhtPassed) {
        Serial.println("  ✅");
    } else {
        Serial.println("  ❌");
    }

    if (!isnan(lastTemp)) {
        Serial.printf("│  Last temp: %.1f°C  Last hum: %.1f%%\n", lastTemp, lastHumidity);
    }

    // Water sensor results
    Serial.printf("│  Water sensor range:  %d – %d", waterMin, waterMax);
    if (waterPassed) {
        Serial.println("       ✅");
    } else {
        Serial.println("       ⚠️");
    }
    Serial.printf("│  Range delta: %d\n", waterMax - waterMin);

    // Overall verdict
    if (isFinal) {
        Serial.println("╠══════════════════════════════════════════╣");
        if (dhtPassed && waterPassed) {
            Serial.println("║  ✅ ALL SENSORS WORKING!                 ║");
            Serial.println("║  Ready for full P-WOS firmware.          ║");
            Serial.println("║                                          ║");
            Serial.println("║  Next step:                              ║");
            Serial.println("║  Flash src/firmware/pwos_esp32/          ║");
            Serial.println("║  with your config.h credentials.         ║");
        } else if (dhtPassed) {
            Serial.println("║  ⚠️  DHT22 OK, Water sensor needs check  ║");
            Serial.println("║  Did you dip the sensor in water?        ║");
        } else if (waterPassed) {
            Serial.println("║  ⚠️  Water OK, DHT22 needs check         ║");
            Serial.println("║  Review DHT22 wiring (W3/W4/W5)         ║");
        } else {
            Serial.println("║  ❌ BOTH SENSORS NEED ATTENTION          ║");
            Serial.println("║  Review wiring in assembly guide.        ║");
        }
        Serial.println("╚══════════════════════════════════════════╝");
    } else {
        Serial.println("└──────────────────────────────────────────┘");
    }
    Serial.println();
}
