#define relay1 27  

void setup() {
  Serial.begin(115200);
  delay(1000); 
  // Serial.println("P-WOS: Isolated Relay Test Starting!");
  pinMode(relay1, OUTPUT); 
}

void loop() {
  // Serial.println("--> Sending LOW signal...");
  digitalWrite(relay1, LOW);  
  delay(5000);                

  // Serial.println("--> Sending HIGH signal...");
  digitalWrite(relay1, HIGH); 
  delay(5000);
}