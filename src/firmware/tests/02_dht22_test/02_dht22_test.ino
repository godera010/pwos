/*
 * ============================================================================
 * P-WOS Test 02: DHT22 Sensor Test — DIAGNOSTIC MODE
 * ============================================================================
 * 
 * This version SCANS MULTIPLE GPIO PINS to find the DHT22.
 * 
 * WHY: The column-to-GPIO mapping on your specific ESP32 board may differ
 *      from what we assumed. Instead of guessing, we try every possible
 *      GPIO pin and report which one (if any) the DHT22 responds on.
 *
 * WHAT IT DOES:
 *   1. First tries GPIO 25 (our expected pin)
 *   2. If that fails, scans GPIO 26, 27, 14, 33, 32, 12, 13, 4, 15, 2
 *   3. Reports which pin gets a valid reading
 *   4. Once found, locks onto that pin for continuous readings
 *
 * ALSO CHECKS:
 *   - Raw digital state of each pin (HIGH/LOW/floating)
 *   - Whether a pull-up resistor is needed
 *
 * WIRING (from breadboard_assembly.html):
 *   DHT22 Pin     Wire Color    Breadboard
 *   ─────────     ──────────    ──────────
 *   S (Signal)    Brown (W4)    → Col 11, Row A
 *   (unlabeled)   Green (W3)    → (+) inner strip (3.3V)
 *   − (GND)       White (W5)    → (−) outer strip (GND)
 *
 * LIBRARIES NEEDED:
 *   1. "DHT sensor library" by Adafruit
 *   2. "Adafruit Unified Sensor"
 * ============================================================================
 */

#include <DHT.h>

// ── LED ──
#define LED_PIN 2

// ── All candidate GPIO pins to scan ──
// These are the GPIOs near Col 11 on a 38-pin ESP32 DevKit
// Ordered by likelihood (pins near Col 8-12 on left side)
const int SCAN_PINS[] = {
    25,   // Our expected pin — Col 8 or 9 depending on board
    27,   // Likely Col 10 or 11
    14,   // Likely Col 11 or 12
    33,   // Col 8 on some boards (between 32 and 25)
    26,   // Col 9 or 10
    32,   // Col 7
    12,   // Likely Col 12 or 13
    13,   // Near Col 13-15
    4,    // Another possibility
    15,   // Another possibility
};
const int NUM_SCAN_PINS = sizeof(SCAN_PINS) / sizeof(SCAN_PINS[0]);

// ── State ──
int  foundPin      = -1;     // Which GPIO the DHT22 was found on (-1 = not found)
DHT* activeDHT     = NULL;   // Pointer to the active DHT instance
int  readCount     = 0;
int  successCount  = 0;
int  scanRound     = 0;

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    Serial.println();
    Serial.println("============================================");
    Serial.println("  P-WOS Test 02: DHT22 Sensor");
    Serial.println("  >>> DIAGNOSTIC / PIN SCAN MODE <<<");
    Serial.println("============================================");
    Serial.println();

    // First: read the raw digital state of all candidate pins
    Serial.println("┌─ STEP 1: Raw Pin State Check ──────────────┐");
    Serial.println("│ Reading digital state of all candidate pins │");
    Serial.println("│ (before initializing DHT library)           │");
    Serial.println("└─────────────────────────────────────────────┘");
    Serial.println();

    for (int i = 0; i < NUM_SCAN_PINS; i++) {
        int pin = SCAN_PINS[i];
        pinMode(pin, INPUT);
        delay(10);
        int state = digitalRead(pin);
        
        Serial.printf("  GPIO %2d: %s", pin, state ? "HIGH" : "LOW ");
        
        if (state == HIGH) {
            Serial.println("  ← has pull-up (good for DHT22)");
        } else {
            Serial.println("  ← LOW (may need external pull-up)");
        }
    }

    Serial.println();
    
    // Now try with internal pull-up enabled
    Serial.println("┌─ STEP 2: With Internal Pull-Up Enabled ────┐");
    Serial.println("│ Enabling INPUT_PULLUP on each pin           │");
    Serial.println("└─────────────────────────────────────────────┘");
    Serial.println();

    for (int i = 0; i < NUM_SCAN_PINS; i++) {
        int pin = SCAN_PINS[i];
        pinMode(pin, INPUT_PULLUP);
        delay(10);
        int state = digitalRead(pin);
        
        Serial.printf("  GPIO %2d: %s", pin, state ? "HIGH" : "LOW ");
        
        if (state == LOW) {
            Serial.println("  ← pulled LOW by something (sensor connected?)");
        } else {
            Serial.println("  ← HIGH (pull-up working, nothing pulling down)");
        }
    }

    Serial.println();
    Serial.println("┌─ STEP 3: Scanning All Pins for DHT22 ──────┐");
    Serial.println("│ Trying each GPIO to find your sensor...     │");
    Serial.println("│ This takes ~30 seconds. Please wait.        │");
    Serial.println("└─────────────────────────────────────────────┘");
    Serial.println();

    // Scan each pin
    for (int i = 0; i < NUM_SCAN_PINS; i++) {
        int pin = SCAN_PINS[i];
        Serial.printf("  Trying GPIO %2d... ", pin);

        DHT testDHT(pin, DHT22);
        testDHT.begin();
        delay(2500);  // DHT22 needs 2s minimum between reads

        // Try 3 times on this pin
        bool found = false;
        for (int attempt = 0; attempt < 3; attempt++) {
            float t = testDHT.readTemperature();
            float h = testDHT.readHumidity();
            
            if (!isnan(t) && !isnan(h)) {
                Serial.printf("✅ FOUND! Temp=%.1f°C Hum=%.1f%%\n", t, h);
                foundPin = pin;
                found = true;
                break;
            }
            delay(2500);
        }

        if (!found) {
            Serial.println("❌ No response");
        }

        if (foundPin >= 0) break;  // Stop scanning once found
    }

    Serial.println();

    if (foundPin >= 0) {
        Serial.println("╔══════════════════════════════════════════╗");
        Serial.printf("║  ✅ DHT22 FOUND on GPIO %d!              \n", foundPin);
        Serial.println("╠══════════════════════════════════════════╣");
        
        if (foundPin != 25) {
            Serial.println("║                                          ║");
            Serial.println("║  ⚠️  NOTE: This is NOT GPIO 25!          ║");
            Serial.printf("║  Your Col 11 = GPIO %d, not GPIO 25     \n", foundPin);
            Serial.println("║                                          ║");
            Serial.println("║  You have TWO options:                   ║");
            Serial.println("║  A) Move the brown wire to the column    ║");
            Serial.println("║     that IS GPIO 25 on your board        ║");
            Serial.println("║  B) Change DHT_PIN in config.h to match ║");
            Serial.printf("║     #define DHT_PIN  %d                  \n", foundPin);
            Serial.println("║                                          ║");
        }
        
        Serial.println("╚══════════════════════════════════════════╝");
        Serial.println();

        // Create permanent DHT instance on the found pin
        activeDHT = new DHT(foundPin, DHT22);
        activeDHT->begin();
        delay(2000);

        Serial.println("[INFO] Now running continuous readings on the found pin...");
        Serial.println();

    } else {
        Serial.println("╔══════════════════════════════════════════╗");
        Serial.println("║  ❌ DHT22 NOT FOUND on ANY pin!          ║");
        Serial.println("╠══════════════════════════════════════════╣");
        Serial.println("║                                          ║");
        Serial.println("║  Possible causes:                        ║");
        Serial.println("║  1. VCC not connected (Green wire)       ║");
        Serial.println("║  2. GND not connected (White wire)       ║");
        Serial.println("║  3. Sensor is dead/damaged                ║");
        Serial.println("║  4. M-F sockets not clipped firmly       ║");
        Serial.println("║  5. Inner/outer power rails swapped      ║");
        Serial.println("║                                          ║");
        Serial.println("║  TRY: Swap green and white wires on the  ║");
        Serial.println("║  breadboard (swap VCC and GND), then     ║");
        Serial.println("║  press RESET on the ESP32 to re-scan.    ║");
        Serial.println("╚══════════════════════════════════════════╝");
        Serial.println();
        Serial.println("[INFO] Will keep retrying GPIO 25 every 5 seconds...");
        Serial.println("       Press RESET after changing wires.");
        Serial.println();

        // Default to GPIO 25 for retry loop
        activeDHT = new DHT(25, DHT22);
        activeDHT->begin();
    }
}

void loop() {
    if (activeDHT == NULL) return;

    readCount++;
    
    float temp = activeDHT->readTemperature();
    float hum  = activeDHT->readHumidity();

    int currentPin = (foundPin >= 0) ? foundPin : 25;

    Serial.printf("[READ #%d] GPIO %d: ", readCount, currentPin);

    if (isnan(temp) || isnan(hum)) {
        Serial.println("❌ NaN");
        
        if (foundPin < 0 && readCount % 5 == 0) {
            // Periodically re-scan if we never found it
            scanRound++;
            Serial.printf("\n[RESCAN #%d] Trying all pins again...\n", scanRound);
            
            for (int i = 0; i < NUM_SCAN_PINS; i++) {
                int pin = SCAN_PINS[i];
                DHT testDHT(pin, DHT22);
                testDHT.begin();
                delay(2500);
                
                float t = testDHT.readTemperature();
                float h = testDHT.readHumidity();
                
                if (!isnan(t) && !isnan(h)) {
                    Serial.printf("  ✅ GPIO %d responded! Temp=%.1f°C\n", pin, t);
                    foundPin = pin;
                    delete activeDHT;
                    activeDHT = new DHT(pin, DHT22);
                    activeDHT->begin();
                    break;
                }
            }
            
            if (foundPin < 0) {
                Serial.println("  ❌ Still no response on any pin.");
                Serial.println("  Check VCC/GND wiring and try RESET.\n");
            }
        }
    } else {
        successCount++;
        Serial.printf("✅ Temp=%.2f°C  Hum=%.2f%%", temp, hum);
        
        if (temp >= 15.0 && temp <= 40.0) {
            Serial.print("  [temp OK]");
        }
        if (hum >= 20.0 && hum <= 90.0) {
            Serial.print("  [hum OK]");
        }
        Serial.println();

        // LED double-flash on success
        digitalWrite(LED_PIN, HIGH); delay(100);
        digitalWrite(LED_PIN, LOW);  delay(100);
        digitalWrite(LED_PIN, HIGH); delay(100);
        digitalWrite(LED_PIN, LOW);
    }

    // Summary every 10 readings
    if (readCount % 10 == 0) {
        float rate = (readCount > 0) ? (float)successCount / readCount * 100 : 0;
        Serial.println();
        Serial.printf("  [SUMMARY] %d/%d OK (%.0f%%) on GPIO %d\n",
                      successCount, readCount, rate, currentPin);
        Serial.println();
    }

    delay(3000);
}
