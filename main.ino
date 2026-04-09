/*
 * Temporal Spatial Gesture Authentication Engine - Sensor Node
 * Reads 3-axis acceleration data from an MPU6050 IMU and streams
 * it over Serial as comma-separated values (CSV) for web tracking.
 */
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
Adafruit_MPU6050 mpu;
void setup() {
  // 115200 baud rate is required for the Web Serial API to sync properly
  Serial.begin(115200);
  // Wait for serial connection
  while (!Serial) {
    delay(10); 
  }
  // Initialize the IMU on default I2C pins (SDA: 21, SCL: 22)
  if (!mpu.begin()) {
    Serial.println("Error: Failed to find MPU6050 chip!");
    while (1) {
      delay(10); // Halt execution
    }
  }
  
  // Configure sensor ranges for human hand gesture tracking
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  delay(500);
}

void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  // Output format: X,Y,Z
  Serial.print(a.acceleration.x);
  Serial.print(",");
  Serial.print(a.acceleration.y);
  Serial.print(",");
  Serial.println(a.acceleration.z);
  // Send data 10 times per second (100ms delay) for smooth web charting
  delay(100); 
}
