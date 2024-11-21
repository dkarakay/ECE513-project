/*****************************************************************
 * Pulse rate and SPO2 meter using the MAX30102
 * This is a mashup of
 * 1. sensor initialization and readout code from Sparkfun
 * https://github.com/sparkfun/SparkFun_MAX3010x_Sensor_Library
 *
 *  2. spo2 & pulse rate analysis from
 * https://github.com/aromring/MAX30102_by_RF
 * (algorithm by  Robert Fraczkiewicz)
 * I tweaked this to use 50Hz sample rate
 *
 ******************************************************************/

#include "Particle.h"

#include <Wire.h>

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
const long requestTimeout =
    300000;                       // 5 1 minute timeout for taking measurement
const long waitDuration = 60000;  // 1 2 minutes wait duration
bool ledState = false;
int dataSentCount = 0;

String processor(const String& var) {
  if (var == "SPO2") {
    return n_spo2 > 0 ? String(n_spo2) : String("00.00");
  } else if (var == "HEARTRATE") {
    return n_heart_rate > 0 ? String(n_heart_rate) : String("00");
  }
  return String();
}

void printCurrentTime() {
  Serial.print("Current time: ");
  Serial.println(Time.format(Time.now(), "%H:%M:%S"));
}

void saveDataToEEPROM(float averageBPM, float averageSPO2) {
  EEPROM.put(0, averageBPM);
  EEPROM.put(sizeof(float), averageSPO2);
  Serial.println("DATA SAVED to EEPROM");
}




void sendDataParticle(float averageBPM, float averageSPO2) {
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
    if (dataSentCount >= 3) {
      currentState = WAIT;
      stateStartMillis = millis();
      dataSentCount = 0;
    } else {
      currentState = EMPTY;
    }

  } else {
    currentState = SAVE_TO_EEPROM;
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("SPO2/Pulse meter");
  pinMode(LED, OUTPUT);
  RGB.control(true);  // take control of the RGB LED

  // Print the device ID
  Serial.print("Device ID: ");
  Serial.println(System.deviceID());

  if (sensor.begin(Wire, I2C_SPEED_FAST) == false) {
    Serial.println(
        "Error: MAX30102 not found, try cycling power to the board...");
    // indicate fault by blinking the board LED rapidly
    while (1) {
      delay(100);
    }
  }
  // ref Maxim AN6409, average dc value of signal should be within 0.25 to 0.75
  // 18-bit range (max value = 262143) You should test this as per the app note
  // depending on application : finger, forehead, earlobe etc. It even depends
  // on skin tone. I found that the optimum combination for my index finger was
  // : ledBrightness=30 and adcRange=2048, to get max dynamic range in the
  // waveform, and a dc level > 100000
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
    /*
     *
     * Its important to swap the variable values since the current MAX30102
     * sensor has a swapped IR & RED LED.
     *
     */
    aun_red_buffer[numSamples] = sensor.getFIFOIR();
    aun_ir_buffer[numSamples] = sensor.getFIFORed();

    numSamples++;
    sensor.nextSample();

    if (numSamples == RFA_BUFFER_SIZE) {
      // calculate heart rate and SpO2 after RFA_BUFFER_SIZE samples (ST seconds
      // of samples) using Robert's method
      rf_heart_rate_and_oxygen_saturation(
          aun_ir_buffer, RFA_BUFFER_SIZE, aun_red_buffer, &n_spo2,
          &ch_spo2_valid, &n_heart_rate, &ch_hr_valid, &ratio, &correl);

      // If spo2_valid and hr_valid are true, then we have a valid result
      if (ch_spo2_valid && ch_hr_valid && currentState != WAIT) {
        currentState = SEND;
      }
      printCurrentTime();

      Serial.print("SP02 ");
      if (ch_spo2_valid)
        Serial.print(n_spo2);
      else
        Serial.print("x");
      Serial.print(", Pulse ");
      if (ch_hr_valid)
        Serial.print(n_heart_rate);
      else
        Serial.print("x");
      Serial.println();
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

    switch (currentState) {
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
      case SEND:
        if (ledState) {
          RGB.color(0, 255, 0);  // green
        } else {
          RGB.color(0, 0, 0);  // off
        }
        sendDataParticle(n_heart_rate, n_spo2);
        break;
      case WAIT:
        if (currentMillis - stateStartMillis >= waitDuration) {
          currentState = REQUEST_MEASUREMENT;
          stateStartMillis = millis();
        } else {
          if (ledState) {
            RGB.color(128, 0, 128);  // purple
          } else {
            RGB.color(0, 0, 0);  // off
          }
          //}
        }
        break;
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
      case EMPTY:
        if (ledState) {
          RGB.color(0, 255, 0);  // green
        } else {
          RGB.color(0, 0, 0);  // off
        }
        break;
    }
  }
}