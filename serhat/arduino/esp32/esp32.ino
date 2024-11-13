void setup() {
  Serial.begin(9600);  // Start serial communication at 115200 baud
}

void loop() {
  if (Serial.available()) {          // Check if there is incoming data
    String value = Serial.readStringUntil('\n'); // Read the data until newline
    Serial.print("Received: ");
    Serial.println(value);           // Print the received value
  }
}
