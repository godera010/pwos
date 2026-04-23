/*
 * P-WOS: Dual-Column Breadboard Assembly Test
 * Watches Column 11 (GPIO 25) and Column 15 (GPIO 34) simultaneously.
 */

#define COL_11_PIN 25  // DHT11 Data
#define COL_15_PIN 34  // Water Sensor Data

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    // Set both to pure inputs so they float when empty
    pinMode(COL_11_PIN, INPUT); 
    pinMode(COL_15_PIN, INPUT); 
    
    Serial.println("=========================================");
    Serial.println("  P-WOS Dual-Column Breadboard Test      ");
    Serial.println("=========================================");
}

void loop() {
    // Read Column 11
    int raw11 = analogRead(COL_11_PIN);
    float volts11 = raw11 * (3.3 / 4095.0);

    // Read Column 15
    int raw15 = analogRead(COL_15_PIN);
    float volts15 = raw15 * (3.3 / 4095.0);

    // Print Column 11 Status
    Serial.print("Col 11 (DHT): ");
    if (volts11 >= 3.0) Serial.print("🟢 ANCHORED 3.3V  |  ");
    else if (volts11 <= 0.2) Serial.print("🔵 ANCHORED GND   |  ");
    else Serial.printf("⚠️ FLOATING (%.2fV) |  ", volts11);

    // Print Column 15 Status
    Serial.print("Col 15 (WATER): ");
    if (volts15 >= 3.0) Serial.println("🟢 ANCHORED 3.3V");
    else if (volts15 <= 0.2) Serial.println("🔵 ANCHORED GND");
    else Serial.printf("⚠️ FLOATING (%.2fV)\n", volts15);

    delay(250); 
}