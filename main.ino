#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// --- THE MASTER SWITCH ---
// true  = Labeled text for Arduino Serial Monitor
// false = Raw CSV for Web Dashboard
bool DEBUG_MODE = true; 

TwoWire I2C_Bus1 = TwoWire(0);
TwoWire I2C_Bus2 = TwoWire(1);

Adafruit_MPU6050 imuHand, imuIndex, imuMiddle, imuThumb;

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  I2C_Bus1.begin(21, 22, 400000); 
  I2C_Bus2.begin(33, 32, 400000); 

  // Initialize all 4 Sensors
  imuHand.begin(0x68, &I2C_Bus1, 0);
  imuIndex.begin(0x69, &I2C_Bus1, 0);
  imuMiddle.begin(0x68, &I2C_Bus2, 0);
  imuThumb.begin(0x69, &I2C_Bus2, 0);

  if(DEBUG_MODE) Serial.println("SYSTEM READY: 4-IMU DEBUG ACTIVE");
}

void loop() {
  sensors_event_t aH, gH, tH, aI, gI, tI, aM, gM, tM, aT, gT, tT;
  
  // Read All 4 Sensors
  imuHand.getEvent(&aH, &gH, &tH);
  imuIndex.getEvent(&aI, &gI, &tI); 
  imuMiddle.getEvent(&aM, &gM, &tM);
  imuThumb.getEvent(&aT, &gT, &tT);

  if (DEBUG_MODE) {
    // Human-Readable Labels
    Serial.print("HAND["); Serial.print(aH.acceleration.x); Serial.print(","); Serial.print(aH.acceleration.y); Serial.print(","); Serial.print(aH.acceleration.z); Serial.print("] ");
    Serial.print("IDX["); Serial.print(aI.acceleration.x); Serial.print(","); Serial.print(aI.acceleration.y); Serial.print(","); Serial.print(aI.acceleration.z); Serial.print("] ");
    Serial.print("MID["); Serial.print(aM.acceleration.x); Serial.print(","); Serial.print(aM.acceleration.y); Serial.print(","); Serial.print(aM.acceleration.z); Serial.print("] ");
    Serial.print("THM["); Serial.print(aT.acceleration.x); Serial.print(","); Serial.print(aT.acceleration.y); Serial.print(","); Serial.println(aT.acceleration.z);
  } else {
    // Raw CSV for Web Dashboard (Hand -> Index -> Middle -> Thumb)
    Serial.print(aH.acceleration.x); Serial.print(","); Serial.print(aH.acceleration.y); Serial.print(","); Serial.print(aH.acceleration.z); Serial.print(",");
    Serial.print(aI.acceleration.x); Serial.print(","); Serial.print(aI.acceleration.y); Serial.print(","); Serial.print(aI.acceleration.z); Serial.print(",");
    Serial.print(aM.acceleration.x); Serial.print(","); Serial.print(aM.acceleration.y); Serial.print(","); Serial.print(aM.acceleration.z); Serial.print(",");
    Serial.print(aT.acceleration.x); Serial.print(","); Serial.print(aT.acceleration.y); Serial.print(","); Serial.println(aT.acceleration.z);
  }

  delay(50); 
}