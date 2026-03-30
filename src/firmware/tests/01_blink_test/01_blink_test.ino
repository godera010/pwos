/*
 * ============================================================================
 * P-WOS Test 01: Blink Test (ESP32 Sanity Check)
 * ============================================================================
 * 
 * PURPOSE:
 *   Verify that your ESP32 board is alive, USB upload works, and Serial
 *   Monitor is receiving data. This test needs NO external wiring — it
 *   only uses the onboard LED (GPIO 2).
 *
 * WHAT TO EXPECT:
 *   ✅ Onboard blue LED blinks every 1 second
 *   ✅ Serial Monitor shows "[OK] LED ON" / "[OK] LED OFF"
 *
 * IF IT FAILS:
 *   ❌ No serial output  → Wrong COM port or baud rate (use 115200)
 *   ❌ Upload error      → Wrong board (select "ESP32 Dev Module")  
 *   ❌ LED doesn't blink → Try GPIO 2 — some boards use a different pin
 *
 * LIBRARIES NEEDED: None (all built-in)
 * ============================================================================
 */

#define LED_PIN 2     // Onboard LED on most ESP32 DevKit boards

int blinkCount = 0;

void setup() {
    Serial.begin(115200);
    delay(1000);  // Give serial monitor time to connect

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    Serial.println();
    Serial.println("============================================");
    Serial.println("  P-WOS Test 01: Blink");
    Serial.println("============================================");
    Serial.println();
    Serial.println("[INFO] Board: ESP32");
    Serial.printf("[INFO] LED Pin: GPIO %d\n", LED_PIN);
    Serial.printf("[INFO] CPU Freq: %d MHz\n", getCpuFrequencyMhz());
    Serial.printf("[INFO] Free Heap: %d bytes\n", ESP.getFreeHeap());
    Serial.printf("[INFO] Flash Size: %d bytes\n", ESP.getFlashChipSize());
    Serial.printf("[INFO] SDK: %s\n", ESP.getSdkVersion());
    Serial.println();
    Serial.println("[INFO] If you see this, your ESP32 is alive!");
    Serial.println("[INFO] Watch the onboard LED — it should blink.");
    Serial.println();
    Serial.println("--------------------------------------------");
}

void loop() {
    blinkCount++;

    // LED ON
    digitalWrite(LED_PIN, HIGH);
    Serial.printf("[OK] LED ON  (blink #%d)\n", blinkCount);
    delay(1000);

    // LED OFF
    digitalWrite(LED_PIN, LOW);
    Serial.printf("[OK] LED OFF (blink #%d)\n", blinkCount);
    delay(1000);

    // Every 10 blinks, print a summary
    if (blinkCount % 10 == 0) {
        Serial.println();
        Serial.println("--------------------------------------------");
        Serial.printf("[SUMMARY] %d blinks completed\n", blinkCount);
        Serial.printf("[SUMMARY] Uptime: %lu seconds\n", millis() / 1000);
        Serial.printf("[SUMMARY] Free heap: %d bytes\n", ESP.getFreeHeap());
        Serial.println("[SUMMARY] ✅ ESP32 is running normally!");
        Serial.println("--------------------------------------------");
        Serial.println();
    }
}
