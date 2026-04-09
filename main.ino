#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// I2C Buses
TwoWire I2C_Bus1 = TwoWire(0);
TwoWire I2C_Bus2 = TwoWire(1);

// IMUs
Adafruit_MPU6050 imu1, imu2, imu3, imu4;

// Environmental Sensor Pins
const int TRIG1 = 5;  const int ECHO1 = 18;
const int TRIG2 = 19; const int ECHO2 = 23;
const int IR1_PIN = 25;
const int IR2_PIN = 26;

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  // Initialize IMUs
  I2C_Bus1.begin(21, 22, 400000); 
  I2C_Bus2.begin(33, 32, 400000); 
  imu1.begin(0x68, &I2C_Bus1, 0); imu2.begin(0x69, &I2C_Bus1, 0);
  imu3.begin(0x68, &I2C_Bus2, 0); imu4.begin(0x69, &I2C_Bus2, 0);

  // Initialize Environmental Pins
  pinMode(TRIG1, OUTPUT); pinMode(ECHO1, INPUT);
  pinMode(TRIG2, OUTPUT); pinMode(ECHO2, INPUT);
  pinMode(IR1_PIN, INPUT);
  pinMode(IR2_PIN, INPUT);
}

// Helper function to read Ultrasonic distance (in cm) with a timeout
long readUltrasonic(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  // 10000us timeout prevents loop from hanging if nothing is detected
  long duration = pulseIn(echo, HIGH, 10000); 
  if (duration == 0) return 999; // Out of range flag
  return duration * 0.034 / 2;
}

void loop() {
  // 1. Read IMUs (12 Variables)
  sensors_event_t a1, g1, t1, a2, g2, t2, a3, g3, t3, a4, g4, t4;
  imu1.getEvent(&a1, &g1, &t1); imu2.getEvent(&a2, &g2, &t2);
  imu3.getEvent(&a3, &g3, &t3); imu4.getEvent(&a4, &g4, &t4);

  // 2. Read Environmental (4 Variables)
  long dist1 = readUltrasonic(TRIG1, ECHO1);
  long dist2 = readUltrasonic(TRIG2, ECHO2);
  int ir1State = digitalRead(IR1_PIN); // Usually 0 is triggered, 1 is clear
  int ir2State = digitalRead(IR2_PIN);

  // 3. Print the massive 16-variable CSV string
  Serial.print(a1.acceleration.x); Serial.print(","); Serial.print(a1.acceleration.y); Serial.print(","); Serial.print(a1.acceleration.z); Serial.print(",");
  Serial.print(a2.acceleration.x); Serial.print(","); Serial.print(a2.acceleration.y); Serial.print(","); Serial.print(a2.acceleration.z); Serial.print(",");
  Serial.print(a3.acceleration.x); Serial.print(","); Serial.print(a3.acceleration.y); Serial.print(","); Serial.print(a3.acceleration.z); Serial.print(",");
  Serial.print(a4.acceleration.x); Serial.print(","); Serial.print(a4.acceleration.y); Serial.print(","); Serial.print(a4.acceleration.z); Serial.print(",");
  
  // Append Environment: US1, US2, IR1, IR2
  Serial.print(dist1); Serial.print(",");
  Serial.print(dist2); Serial.print(",");
  Serial.print(ir1State); Serial.print(",");
  Serial.println(ir2State);

  delay(100); // Maintain ~10Hz sample rate
}
