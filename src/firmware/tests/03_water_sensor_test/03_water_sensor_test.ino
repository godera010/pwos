/*
 * ============================================================================
 * P-WOS Test 03: Water Level Sensor Test
 * ============================================================================
 * 
 * PURPOSE:
 *   Verify that the water level sensor is wired correctly and producing
 *   valid analog readings on the ESP32's ADC.
 *
 * WIRING (from breadboard_assembly.html):
 *   Sensor Pin    Wire Color    Breadboard
 *   ──────────    ──────────    ──────────
 *   S (Signal)    Blue (W8)     → Col 15, Row A (GPIO 34)
 *   + (VCC)       Red  (W6)     → (+) inner strip (3.3V)
 *   − (GND)       Purple (W7)   → (−) outer strip (GND)
 *
 * WHAT TO EXPECT:
 *   ✅ Dry sensor: Raw ADC 0–100 (near zero)
 *   ✅ Wet finger on pads: Raw ADC 500–2500
 *   ✅ Submerged in water: Raw ADC 2000–4000
 *   ✅ Values change when you touch/wet the sensor
 *
 * IF IT FAILS:
 *   ❌ Always 0        → VCC not connected or wrong signal pin
 *   ❌ Always 4095     → GND not connected or pin floating
 *   ❌ Erratic values  → Loose signal wire connection
 *
 * LIBRARIES NEEDED: None (uses built-in analogRead)
 * ============================================================================
 */

// ── Pin Configuration (matches P-WOS hardware) ──
#define WATER_PIN  34     // GPIO 34 = Col 15 on breadboard (ADC1_CH6)
#define LED_PIN    2      // Onboard LED for status

// ── Test Settings ──
#define READ_INTERVAL    2000   // Read every 2 seconds
#define NUM_SAMPLES      10     // Average this many samples per reading
#define MAX_READINGS     100    // Stop after this many (0 = forever)

// ── Thresholds for display ──
#define THRESHOLD_DRY    100    // Below this = definitely dry
#define THRESHOLD_WET    500    // Above this = water detected
#define THRESHOLD_SUBMERGED 2000 // Above this = heavily submerged

int  readCount    = 0;
int  minReading   = 4095;
int  maxReading   = 0;
long totalReading = 0;
bool rangeChanged = false;   // Tracks if we've seen both dry and wet

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    // Configure ADC
    analogReadResolution(12);        // 12-bit: 0-4095
    analogSetAttenuation(ADC_11db);  // Full range: 0-3.3V

    Serial.println();
    Serial.println("============================================");
    Serial.println("  P-WOS Test 03: Water Level Sensor");
    Serial.println("============================================");
    Serial.println();
    Serial.printf("[INFO] Sensor on GPIO %d (ADC)\n", WATER_PIN);
    Serial.println("[INFO] ADC Resolution: 12-bit (0-4095)");
    Serial.println("[INFO] ADC Range: 0-3.3V");
    Serial.printf("[INFO] Samples per reading: %d\n", NUM_SAMPLES);
    Serial.printf("[INFO] Reading every %d seconds\n", READ_INTERVAL / 1000);
    Serial.println();
    Serial.println("[TIP] Try these during the test:");
    Serial.println("  1. Leave sensor DRY for a few readings");
    Serial.println("  2. Touch the sensor pads with a WET finger");
    Serial.println("  3. Dip the sensor tip in water");
    Serial.println("  4. Watch the values change!");
    Serial.println();
    Serial.println("--------------------------------------------");
    Serial.println();
}

void loop() {
    readCount++;

    // Take multiple samples and average
    long total = 0;
    int  validSamples = 0;
    int  rawMin = 4095;
    int  rawMax = 0;

    for (int i = 0; i < NUM_SAMPLES; i++) {
        int raw = analogRead(WATER_PIN);
        total += raw;
        validSamples++;
        if (raw < rawMin) rawMin = raw;
        if (raw > rawMax) rawMax = raw;
        delay(10);  // Small delay between samples
    }

    int avgRaw = (validSamples > 0) ? (total / validSamples) : 0;
    float voltage = avgRaw * 3.3 / 4095.0;

    // Track min/max across all readings
    if (avgRaw < minReading) minReading = avgRaw;
    if (avgRaw > maxReading) maxReading = avgRaw;
    totalReading += avgRaw;

    // Check if we've seen both dry and wet
    if (minReading < THRESHOLD_DRY && maxReading > THRESHOLD_WET) {
        rangeChanged = true;
    }

    // Determine water level category
    const char* level;
    const char* icon;
    if (avgRaw < THRESHOLD_DRY) {
        level = "DRY (no water)";
        icon = "🏜️";
    } else if (avgRaw < THRESHOLD_WET) {
        level = "TRACE (barely damp)";
        icon = "💧";
    } else if (avgRaw < THRESHOLD_SUBMERGED) {
        level = "WET (water detected)";
        icon = "🌊";
    } else {
        level = "SUBMERGED (heavy water)";
        icon = "🌊🌊";
    }

    // Print reading
    Serial.printf("[READ #%d]\n", readCount);
    Serial.printf("  Raw ADC (avg):  %d", avgRaw);

    // Status indicator
    if (avgRaw == 0 && readCount > 3) {
        Serial.println("     ⚠️  (always zero — check VCC)");
    } else if (avgRaw >= 4090 && readCount > 3) {
        Serial.println("     ⚠️  (maxed out — check GND)");
    } else {
        Serial.println("     ✅");
    }

    Serial.printf("  Raw range:      %d – %d (this sample)\n", rawMin, rawMax);
    Serial.printf("  Voltage:        %.3f V\n", voltage);
    Serial.printf("  Level:          %s %s\n", icon, level);
    Serial.printf("  All-time range: %d – %d\n", minReading, maxReading);
    Serial.println();

    // LED feedback based on water level
    if (avgRaw < THRESHOLD_DRY) {
        // Slow blink = dry
        digitalWrite(LED_PIN, HIGH); delay(100);
        digitalWrite(LED_PIN, LOW);
    } else if (avgRaw < THRESHOLD_SUBMERGED) {
        // Double flash = wet
        digitalWrite(LED_PIN, HIGH); delay(100);
        digitalWrite(LED_PIN, LOW);  delay(100);
        digitalWrite(LED_PIN, HIGH); delay(100);
        digitalWrite(LED_PIN, LOW);
    } else {
        // Triple flash = submerged
        for (int i = 0; i < 3; i++) {
            digitalWrite(LED_PIN, HIGH); delay(80);
            digitalWrite(LED_PIN, LOW);  delay(80);
        }
    }

    // Summary every 10 readings
    if (readCount > 0 && readCount % 10 == 0) {
        float avgOverall = (float)totalReading / readCount;
        Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        Serial.printf("  SUMMARY after %d readings:\n", readCount);
        Serial.printf("  Overall average: %.0f\n", avgOverall);
        Serial.printf("  Min seen: %d / Max seen: %d\n", minReading, maxReading);
        Serial.printf("  Range delta: %d\n", maxReading - minReading);

        if (rangeChanged) {
            Serial.println("  ✅ SENSOR WORKING — saw both DRY and WET values!");
        } else if (maxReading - minReading > 50) {
            Serial.println("  ✅ Sensor responding — values are changing.");
            Serial.println("     Try wetting the sensor to verify full range.");
        } else if (maxReading < THRESHOLD_DRY) {
            Serial.println("  ⚠️  All readings are near zero.");
            Serial.println("     Sensor may work — try touching with wet finger.");
            Serial.println("     If still zero: check VCC (Red wire) connection.");
        } else if (minReading > 4000) {
            Serial.println("  ❌ All readings are maxed out (4095).");
            Serial.println("     Likely issue: GND (Purple wire) not connected.");
        } else {
            Serial.println("  ℹ️  Values are stable. Try dipping in water.");
        }
        Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        Serial.println();
    }

    // Stop after MAX_READINGS if set
    if (MAX_READINGS > 0 && readCount >= MAX_READINGS) {
        Serial.println("============================================");
        Serial.println("  TEST COMPLETE");
        Serial.println("============================================");
        Serial.printf("  Total readings: %d\n", readCount);
        Serial.printf("  Min ADC: %d / Max ADC: %d\n", minReading, maxReading);
        Serial.printf("  Overall avg: %.0f\n", (float)totalReading / readCount);
        
        if (rangeChanged) {
            Serial.println("  ✅ PASS — Sensor responded to water!");
        } else {
            Serial.println("  ⚠️  Could not confirm water detection.");
            Serial.println("     Sensor may still be OK if you didn't wet it.");
        }
        Serial.println("============================================");
        
        while (true) {
            digitalWrite(LED_PIN, HIGH); delay(2000);
            digitalWrite(LED_PIN, LOW);  delay(2000);
        }
    }

    delay(READ_INTERVAL);
}
