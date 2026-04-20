#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "BluetoothSerial.h"

// --- CONFIG ---
bool DEBUG_MODE = false; // false = CSV for dashboard

BluetoothSerial SerialBT;

TwoWire I2C_Bus1 = TwoWire(0);
TwoWire I2C_Bus2 = TwoWire(1);
Adafruit_MPU6050 imuHand, imuIndex, imuMiddle, imuThumb;

// Auth state machine
enum AuthState { IDLE, ARMED, RECORDING, DONE };
AuthState authState = IDLE;
unsigned long armedAt = 0;
unsigned long recordStart = 0;

#define ARM_DELAY_MS   5000   // wait 5s after hand detected before recording
#define RECORD_DURATION_MS 5000

void setup() {
  Serial.begin(115200);
  
  // Bluetooth: Slave role, connect FROM Box ESP32
  SerialBT.begin("GloveESP");
  Serial.println("[BT] Glove advertising as 'GloveESP'");

  I2C_Bus1.begin(21, 22, 400000);
  I2C_Bus2.begin(33, 32, 400000);

  imuHand.begin(0x68, &I2C_Bus1, 0);
  imuIndex.begin(0x69, &I2C_Bus1, 0);
  imuMiddle.begin(0x68, &I2C_Bus2, 0);
  imuThumb.begin(0x69, &I2C_Bus2, 0);

  Serial.println("[SYS] Glove ready.");
}

void loop() {
  // --- 1. HANDLE INCOMING BLUETOOTH COMMANDS ---
  if (SerialBT.available()) {
    String cmd = SerialBT.readStringUntil('\n');
    cmd.trim();

    if (cmd == "HAND_PRESENT" && authState == IDLE) {
      authState = ARMED;
      armedAt = millis();
      
      // Tell Web Dashboard to show "Arming in 5s..."
      Serial.println("HAND_DETECTED"); 
      
      if(DEBUG_MODE) Serial.println("[AUTH] Hand detected. Arming in 5s...");
    }
    else if (cmd == "CLEAR" && authState == ARMED) {
      authState = IDLE;
      
      // Tell Web Dashboard to cancel the UI countdown
      Serial.println("HAND_REMOVED"); 
      
      if(DEBUG_MODE) Serial.println("[AUTH] Hand removed. Disarmed.");
    }
  }

  // --- 2. AUTHENTICATION STATE TRANSITIONS ---
  if (authState == ARMED && (millis() - armedAt >= ARM_DELAY_MS)) {
    authState = RECORDING;
    recordStart = millis();
    
    // Trigger the Dashboard to start collecting DTW points
    Serial.println("AUTH_START"); 
    
    if(DEBUG_MODE) Serial.println("[AUTH] >>> RECORDING GESTURE <<<");
  }

  if (authState == RECORDING && (millis() - recordStart >= RECORD_DURATION_MS)) {
    authState = DONE;
    
    // Trigger the Dashboard to stop collecting and run the math
    Serial.println("AUTH_STOP"); 
    
    if(DEBUG_MODE) Serial.println("[AUTH] Recording complete.");
    authState = IDLE; // Reset back to IDLE
  }

  // --- 3. READ SENSORS ---
  sensors_event_t aH, gH, tH, aI, gI, tI, aM, gM, tM, aT, gT, tT;
  
  imuHand.getEvent(&aH, &gH, &tH);
  imuIndex.getEvent(&aI, &gI, &tI);
  imuMiddle.getEvent(&aM, &gM, &tM);
  imuThumb.getEvent(&aT, &gT, &tT);

  // --- 4. OUTPUT DATA ---
  if (DEBUG_MODE) {
    Serial.print("HAND["); Serial.print(aH.acceleration.x); Serial.print(","); Serial.print(aH.acceleration.y); Serial.print(","); Serial.print(aH.acceleration.z); Serial.print("] ");
    Serial.print("IDX["); Serial.print(aI.acceleration.x); Serial.print(","); Serial.print(aI.acceleration.y); Serial.print(","); Serial.print(aI.acceleration.z); Serial.print("] ");
    Serial.print("MID["); Serial.print(aM.acceleration.x); Serial.print(","); Serial.print(aM.acceleration.y); Serial.print(","); Serial.print(aM.acceleration.z); Serial.print("] ");
    Serial.print("THM["); Serial.print(aT.acceleration.x); Serial.print(","); Serial.print(aT.acceleration.y); Serial.print(","); Serial.println(aT.acceleration.z);
  } else {
    // Raw 12-value CSV for Web Dashboard
    Serial.print(aH.acceleration.x); Serial.print(","); Serial.print(aH.acceleration.y); Serial.print(","); Serial.print(aH.acceleration.z); Serial.print(",");
    Serial.print(aI.acceleration.x); Serial.print(","); Serial.print(aI.acceleration.y); Serial.print(","); Serial.print(aI.acceleration.z); Serial.print(",");
    Serial.print(aM.acceleration.x); Serial.print(","); Serial.print(aM.acceleration.y); Serial.print(","); Serial.print(aM.acceleration.z); Serial.print(",");
    Serial.print(aT.acceleration.x); Serial.print(","); Serial.print(aT.acceleration.y); Serial.print(","); Serial.println(aT.acceleration.z);
  }

  delay(50); // 20Hz Update Rate
}