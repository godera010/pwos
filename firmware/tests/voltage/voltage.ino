void setup() {
  Serial.begin(115200);
  pinMode(25, INPUT);
}

void loop() {
  int val = digitalRead(25);
  Serial.println(val);
  delay(500);
}