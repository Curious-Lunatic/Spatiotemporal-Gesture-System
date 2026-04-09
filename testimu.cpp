#include <Wire.h>

const int MPU_ADDR = 0x68; // I2C address of the MPU-6050

void setup() {
  Serial.begin(115200);
  Wire.begin(); // Initializes I2C on standard pins (SDA=21, SCL=22)
  
  // 1. Wake up the sensor
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);  // Target the PWR_MGMT_1 register
  Wire.write(0);     // Write 0 to wake it up
  Wire.endTransmission(true);
  
  Serial.println("Sent Wake-Up Command!");
  delay(100);
}

void loop() {
  // 2. Point to the Accelerometer data registers
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);  // Start with register 0x3B (ACCEL_XOUT_H)
  Wire.endTransmission(false);
  
  // 3. Request 6 bytes of data (X, Y, and Z axes are 2 bytes each)
  Wire.requestFrom(MPU_ADDR, 6, true);  
  
  // 4. Read and combine the bytes
  int16_t AcX = Wire.read()<<8 | Wire.read();
  int16_t AcY = Wire.read()<<8 | Wire.read();
  int16_t AcZ = Wire.read()<<8 | Wire.read();

  // 5. Print the raw values
  Serial.print("Raw X: "); Serial.print(AcX);
  Serial.print(" | Raw Y: "); Serial.print(AcY);
  Serial.print(" | Raw Z: "); Serial.println(AcZ);

  delay(200);
}