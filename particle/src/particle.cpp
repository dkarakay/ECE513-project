#include "Particle.h"

#include <HttpClient.h>
#include <Wire.h>

#include "JsonParserGeneratorRK.h"
#include "MAX30105.h"
#include "algorithm_by_RF.h"

enum State { IDLE, REQUEST_MEASUREMENT, SEND, WAIT, SAVE_TO_EEPROM, EMPTY };
SYSTEM_THREAD(ENABLED);  // uncomment this to use your particle device without
                         // WIFI connection

MAX30105 sensor;

int LED = D7;

uint32_t aun_ir_buffer[RFA_BUFFER_SIZE];   // infrared LED sensor data
uint32_t aun_red_buffer[RFA_BUFFER_SIZE];  // red LED sensor data
int32_t n_heart_rate;
float n_spo2;
int numSamples;

// float SPO2_LOWER_BOUNDRY = 94;

State currentState = REQUEST_MEASUREMENT;
bool dataSent = false;
unsigned long previousMillis = 0;
unsigned long stateStartMillis = 0;
const long interval = 500;  // interval at which to blink (milliseconds)
// const long requestTimeout = 300000;                       // 5 1 minute
// timeout for taking measurement const long waitDuration = 60000;  // 1 2
// minutes wait duration
const long requestTimeout = 300000;  // 5 minutes timeout for taking measurement
unsigned long measurementInterval = 1800000;  // 30 minutes wait
bool ledState = false;
int dataSentCount = 0;

unsigned long firstSaveTimestamp = 0;
String startTime = "06:00";
String endTime = "22:00";
int eepromDataCount = 0;

HttpClient http;
http_request_t request;
http_response_t response;
JsonParserStatic<1024, 20> parser1;

bool useParticlePublish = false;  // Settings variable to determine the method

int timeToMinutes(const char *time) {
  int hours = (time[0] - '0') * 10 + (time[1] - '0');
  int minutes = (time[3] - '0') * 10 + (time[4] - '0');
  return hours * 60 + minutes;
}

int getCurrentTimeInMinutes() {
  int currentHour = Time.hour();
  int currentMinute = Time.minute();
  return currentHour * 60 + currentMinute;
}

void getConfigFromServer() {
  if (Particle.connected()) {
    // Configure the request
    request.hostname = "ec2-3-143-111-57.us-east-2.compute.amazonaws.com";
    request.port = 3000;  // Your server's port
    request.path = "/users/device/" + System.deviceID();
    // Send the GET request
    http.get(request, response);

    // Check response status
    if (response.status == 200) {
      parser1.clear();
      parser1.addString(response.body);
      // Parse the JSON response
      if (parser1.parse()) {
        // Print measurementInterval, startTime, and endTime
        measurementInterval =
            parser1.getReference().key("measurementInterval").valueInt() *
            60000;
        startTime = parser1.getReference().key("startTime").valueString();
        endTime = parser1.getReference().key("endTime").valueString();
        /*Serial.println("--------------------");
        Serial.print("Measurement Interval: ");
        Serial.println(measurementInterval);
        Serial.print("Start Time: ");
        Serial.println(startTime);
        Serial.print("End Time: ");
        Serial.println(endTime);
        Serial.println("--------------------");*/

      } else {
        Serial.println("Failed to parse JSON response.");
      }
    } else {
      Serial.print("Status code: ");
      Serial.println(response.status);
    }
  } else {
    Serial.println("Not connected to the cloud");
  }
}

void configUpdateHandler(const char *event, const char *data) {
  Serial.println("Received configuration update event");
  getConfigFromServer();
}

void printCurrentTime() {
  Serial.print("Current time: ");
  Serial.println(Time.format(Time.now(), "%Y-%m-%d %H:%M:%S"));
}

// Save data to EEPROM
void saveDataToEEPROM(float averageBPM, float averageSPO2) {
  int address = eepromDataCount * sizeof(float) * 2;
  EEPROM.put(address, averageBPM);
  EEPROM.put(address + sizeof(float), averageSPO2);
  eepromDataCount++;
  Serial.println("DATA SAVED to EEPROM");
}

// Send data to the server
void sendDataParticle(float averageBPM, float averageSPO2) {
  if (useParticlePublish) {
    if (Particle.connected()) {
      Particle.publish("bpm", String(averageBPM), PRIVATE);
      Particle.publish("spo2", String(averageSPO2), PRIVATE);
      Particle.publish("bpm_spo2",
                       "{\"bpm\": " + String(averageBPM) +
                           ", \"spo2\": " + String(averageSPO2) + "}",
                       PRIVATE);

      Serial.println("DATA SENT to Particle Cloud");
      dataSent = true;
      dataSentCount++;

      if (dataSentCount >= 2) {
        currentState = WAIT;
        stateStartMillis = millis();
        dataSentCount = 0;
        dataSent = false;
      } else {
        currentState = EMPTY;
      }

    } else {
      currentState = SAVE_TO_EEPROM;
    }
  } else {
    if (dataSentCount == 0) {
      // Send direct POST request
      request.hostname = "ec2-3-143-111-57.us-east-2.compute.amazonaws.com";
      request.port = 3000;
      request.path = "/sensor";
      request.body = "{\"device_id\":\"" + System.deviceID() +
                     "\",\"data\":{\"bpm\":" + String(averageBPM) +
                     ",\"spo2\":" + String(averageSPO2) + "}}";

      http_header_t headers[] = {
          {"Content-Type", "application/json"},
          {"x-api-key", "3786bc99-d8f4-428c-80a3-33fd7afaf5de"},
          {NULL, NULL}  // Terminate the headers array with NULL
      };

      http.post(request, response, headers);

      if (response.status == 201) {
        Serial.println("DATA SENT to server");
        dataSent = true;
        dataSentCount++;

        currentState = EMPTY;

      } else {
        Serial.print("Failed to send data. Status code: ");
        Serial.println(response.status);
        currentState = SAVE_TO_EEPROM;
      }
    } else if (dataSentCount >= 2) {
      currentState = WAIT;
      stateStartMillis = millis();
      dataSentCount = 0;
      dataSent = false;
    } else {
      dataSentCount += 1;
    }
  }
}
// Submit stored data to the server from EEPROM
void submitStoredData() {
  for (int i = 0; i < eepromDataCount; i++) {
    int address = i * sizeof(float) * 2;
    float storedBPM, storedSPO2;
    EEPROM.get(address, storedBPM);
    EEPROM.get(address + sizeof(float), storedSPO2);

    if (useParticlePublish) {
      Particle.publish("bpm", String(storedBPM), PRIVATE);
      Particle.publish("spo2", String(storedSPO2), PRIVATE);
      Particle.publish("bpm_spo2",
                       "{\"bpm\": " + String(storedBPM) +
                           ", \"spo2\": " + String(storedSPO2) + "}",
                       PRIVATE);

      Serial.println("STORED DATA SENT to Particle Cloud");
    } else {
      // Send direct POST request
      request.hostname = "ec2-3-143-111-57.us-east-2.compute.amazonaws.com";
      request.port = 3000;
      request.path = "/sensor";
      request.body = "{\"device_id\":\"" + System.deviceID() +
                     "\",\"data\":{\"bpm\":" + String(storedBPM) +
                     ",\"spo2\":" + String(storedSPO2) + "}}";
      http_header_t headers[] = {
          {"Content-Type", "application/json"},
          {"x-api-key", "3786bc99-d8f4-428c-80a3-33fd7afaf5de"},
          {NULL, NULL}  // Terminate the headers array with NULL
      };

      http.post(request, response, headers);

      if (response.status == 201) {
        Serial.println("STORED DATA SENT to server");
      } else {
        Serial.print("Failed to send stored data. Status code: ");
        Serial.println(response.status);
      }
    }
  }
  eepromDataCount = 0;  // Reset the count after submitting all data
}

// Check and reset EEPROM data after 24 hours
void checkAndResetEEPROM() {
  unsigned long currentMillis = millis();
  if (firstSaveTimestamp != 0 &&
      (currentMillis - firstSaveTimestamp >=
       86400000)) {  // 24 hours = 86400000 milliseconds
    eepromDataCount = 0;
    firstSaveTimestamp = 0;
    Serial.println("24 hours passed. EEPROM data reset.");
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("SPO2/Pulse meter");
  Time.zone(-7);  // Set time zone to MST (UTC-7)
  pinMode(LED, OUTPUT);
  RGB.control(true);  // take control of the RGB LED

  // Print the device ID
  Serial.print("Device ID: ");
  Serial.println(System.deviceID());

  if (sensor.begin(Wire, I2C_SPEED_FAST) == false) {
    Serial.println(
        "Error: MAX30102 not found, try cycling power to the board...");
    while (1) {
      delay(100);
    }
  }

  byte ledBrightness = 30;  // 0 = off,  255 = 50mA
  byte sampleAverage = 4;   // 1, 2, 4, 8, 16, 32
  byte ledMode =
      2;  // 1 = Red only, 2 = Red + IR, 3 = Red + IR + Green (MAX30105 only)
  int sampleRate = 200;  // 50, 100, 200, 400, 800, 1000, 1600, 3200
  int pulseWidth = 411;  // 69, 118, 215, 411
  int adcRange = 2048;   // 2048, 4096, 8192, 16384

  sensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth,
               adcRange);
  sensor.getINT1();  // clear the status registers by reading
  sensor.getINT2();
  numSamples = 0;
  stateStartMillis = millis();
}

void loop() {
  float ratio, correl;
  int8_t ch_spo2_valid;
  int8_t ch_hr_valid;

  sensor.check();
  while (sensor.available()) {
    aun_red_buffer[numSamples] = sensor.getFIFOIR();
    aun_ir_buffer[numSamples] = sensor.getFIFORed();

    numSamples++;
    sensor.nextSample();

    if (numSamples == RFA_BUFFER_SIZE) {
      // calculate heart rate and SpO2 after RFA_BUFFER_SIZE samples (ST
      // seconds of samples) using Robert's method
      rf_heart_rate_and_oxygen_saturation(
          aun_ir_buffer, RFA_BUFFER_SIZE, aun_red_buffer, &n_spo2,
          &ch_spo2_valid, &n_heart_rate, &ch_hr_valid, &ratio, &correl);

      // If spo2_valid and hr_valid are true, then we have a valid result
      if (ch_spo2_valid && ch_hr_valid && currentState != WAIT) {
        currentState = SEND;
      }
      printCurrentTime();

      Serial.print("SP02 ");
      if (ch_spo2_valid && dataSentCount != 1)
        Serial.print(n_spo2);
      else
        Serial.print("x");
      Serial.print(", Pulse ");
      if (ch_hr_valid && dataSentCount != 1)
        Serial.print(n_heart_rate);
      else
        Serial.print("x");
      Serial.println();
      getConfigFromServer();
      numSamples = 0;
      // toggle the board LED. This should happen every ST (= 4) seconds if
      // MAX30102 has been configured correctly
    }
  }

  // Non-blocking LED flashing
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    ledState = !ledState;

    int currentTimeInMinutes = getCurrentTimeInMinutes();
    int startTimeInMinutes = timeToMinutes(startTime);
    int endTimeInMinutes = timeToMinutes(endTime);

    if (currentTimeInMinutes >= startTimeInMinutes &&
        currentTimeInMinutes <= endTimeInMinutes) {
      switch (currentState) {
        // Request measurement state
        case REQUEST_MEASUREMENT:
          if (currentMillis - stateStartMillis >= requestTimeout) {
            currentState = WAIT;
            stateStartMillis = millis();
          } else {
            if (ledState) {
              RGB.color(0, 0, 255);  // blue
            } else {
              RGB.color(0, 0, 0);  // off
            }
          }
          break;
        // Send state
        case SEND:
          sendDataParticle(n_heart_rate, n_spo2);
          if (ledState) {
            RGB.color(0, 255, 0);  // green
          } else {
            RGB.color(0, 0, 0);  // off
          }
          break;
        // Wait state
        case WAIT:
          if (currentMillis - stateStartMillis >= measurementInterval) {
            currentState = REQUEST_MEASUREMENT;
            stateStartMillis = millis();
          } else {
            if (ledState) {
              RGB.color(0, 0, 0);  // off
            } else {
              RGB.color(0, 0, 0);  // off
            }
          }
          break;
        // Save data to EEPROM state
        case SAVE_TO_EEPROM:
          saveDataToEEPROM(n_heart_rate, n_spo2);
          if (ledState) {
            RGB.color(255, 255, 0);  // yellow
          } else {
            RGB.color(0, 0, 0);  // off
          }
          currentState = WAIT;
          stateStartMillis = millis();
          break;
        // Empty state
        case EMPTY:
          if (ledState) {
            RGB.color(0, 255, 0);  // green
          } else {
            RGB.color(0, 0, 0);  // off
          }
          break;
      }
    } else {
      // Turn off the LED outside of the configured time
      RGB.color(255, 0, 255);
    }
  }
  // Check for Wi-Fi connection and submit stored data if connected
  if (Particle.connected() && eepromDataCount > 0) {
    submitStoredData();
  }

  checkAndResetEEPROM();
}