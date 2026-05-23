/*
 * P-WOS: The Anchor Test (Single Pin Verification)
 * Proves that the ESP32 can accurately read a direct physical connection.
 */

#define TEST_PIN 34  // We are testing GPIO 34 (Column 15)

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    // Set to pure input (no internal pull-up) so it floats freely when empty
    pinMode(TEST_PIN, INPUT); 
    
    Serial.println("====================================");
    Serial.println("   P-WOS Single-Pin Anchor Test     ");
    Serial.println("====================================");
}

void loop() {
    // Read both the raw voltage and the digital state
    int rawValue = analogRead(TEST_PIN);
    float volts = rawValue * (3.3 / 4095.0);
    int digitalState = digitalRead(TEST_PIN);

    Serial.printf("GPIO %d | Voltage: %4.2fV | State: %s", TEST_PIN, volts, digitalState ? "HIGH" : "LOW ");

    // Determine the physical state of the wire
    if (volts >= 3.0) {
        Serial.println("  --> 🟢 ANCHORED TO 3.3V (PERFECT!)");
    } 
    else if (volts <= 0.2) {
        Serial.println("  --> 🔵 ANCHORED TO GND (PERFECT!)");
    } 
    else {
        Serial.println("  --> ⚠️ FLOATING (Not connected to power or ground)");
    }

    delay(200); // Read 5 times a second
}