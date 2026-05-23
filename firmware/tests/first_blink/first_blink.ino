void setup() {
  pinMode(2, OUTPUT);  // Blue LED on GPIO 2
  Serial.begin(115200);
  Serial.println("ESP32 is alive on COM6!");
}

void loop() {
  digitalWrite(2, HIGH);
  delay(500);
  digitalWrite(2, LOW);
  delay(500);
  Serial.println("Blink!");
}
