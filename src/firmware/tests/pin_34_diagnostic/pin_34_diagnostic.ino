/*
 * P-WOS Pin 34 Diagnostic Test
 * 
 * This sketch automatically verifies if your ESP32's Pin 34 
 * is successfully receiving a signal from the 'S' (Signal) 
 * pin of your soil moisture sensor.
 */

const int SENSOR_PIN = 34;

void setup() {
  Serial.begin(115200);
  delay(2000); // Give the serial monitor time to open
  
  Serial.println("\n");
  Serial.println("=================================================");
  Serial.println("         PIN 34 HARDWARE CONNECTION TEST         ");
  Serial.println("=================================================");
  Serial.println("This test will verify if the wiring from Pin 34");
  Serial.println("to the 'S' pin on your sensor is actually working.");
  Serial.println("");
  Serial.println("STATUS: Calibrating baseline. Please DO NOT touch");
  Serial.println("the sensor for the next 3 seconds...");
  delay(3000);
  
  int baseline = analogRead(SENSOR_PIN);
  
  if (baseline == 0 || baseline >= 4095) {
    Serial.println("\nWARNING: Pin 34 reading is pegged at an extreme limit.");
    Serial.print("Current reading: "); Serial.println(baseline);
    Serial.println("This could mean the sensor is perfectly dry, OR it means");
    Serial.println("the wires are disconnected/shorted out. Let's test it!");
  } else {
    Serial.println("\nBaseline established.");
  }
  
  Serial.println("\n>>> TEST INSTRUCTIONS <<<");
  Serial.println("1. Grab the metallic prongs of the sensor firmly with your bare hand.");
  Serial.println("   (Or quickly dip the sensor into a glass of water)");
  Serial.println("2. Waiting for a significant change in signal on Pin 34...");
  Serial.println("=================================================");
}

int previousValue = -1;

void loop() {
  int currentValue = analogRead(SENSOR_PIN);
  
  // Initial prime of the state
  if (previousValue == -1) {
    previousValue = currentValue;
  }
  
  // Look for a major jump in the analog reading (difference of 200+ units)
  // When a human hand touches a resistive/capacitive sensor, or it hits water, 
  // the conductivity changes rapidly. A disconnected wire wouldn't do this.
  int difference = abs(currentValue - previousValue);
  
  if (difference > 200) {
    Serial.println("\n=================================================");
    Serial.println("                    SUCCESS!                     ");
    Serial.println("=================================================");
    Serial.println("Huge signal change detected!");
    Serial.print("Reading jumped from ");
    Serial.print(previousValue);
    Serial.print(" to ");
    Serial.println(currentValue);
    Serial.println("");
    Serial.println("CONCLUSION: Pin 34 is DEFINITELY connected to the 'S' pin!");
    Serial.println("The wiring is perfect and data is flowing to the ESP32.");
    Serial.println("You can go back to soil_calibration.ino now.");
    Serial.println("=================================================\n");
    
    // Halt the test permanently upon success
    while(true) { 
      delay(1000); 
    }
  }
  
  // Periodically print the current value every 1 second so you know it's alive
  static unsigned long lastPrintTimer = 0;
  if (millis() - lastPrintTimer > 1000) {
    Serial.print("Monitoring Pin 34... Current raw value: ");
    Serial.println(currentValue);
    lastPrintTimer = millis();
  }
  
  // Only update previousValue very slowly so that gradual changes aren't missed
  // but sudden jumps from touching it still trigger the difference check.
  static unsigned long slowlyUpdateTimer = 0;
  if (millis() - slowlyUpdateTimer > 3000) {
      previousValue = currentValue;
      slowlyUpdateTimer = millis();
  }
  
  delay(50);
}
