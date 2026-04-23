// Minimal P-WOS Serial Test
// Purpose: verify Wokwi serial output works before running full firmware

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== SERIAL TEST OK ===");
  Serial.println("If you see this, Wokwi serial is working.");
}

void loop() {
  Serial.println("[ALIVE] Tick...");
  delay(2000);
}
