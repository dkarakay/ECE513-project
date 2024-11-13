void setup() {
  Serial.begin(9600); // Initialize serial communication
}

void loop() {
  int sensorValue = analogRead(A0); // Read the analog sensor value
  Serial.println(sensorValue); // Send the sensor value to the laptop
  delay(1000); // Send data every second
}