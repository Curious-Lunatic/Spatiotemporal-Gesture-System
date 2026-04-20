#include "BluetoothSerial.h"

// --- CONFIG ---
BluetoothSerial SerialBT;

uint8_t gloveMAC[6] = {0xCC, 0xDB, 0xA7, 0x2E, 0x1B, 0x8A};

const int trigPin = 5; 
const int echoPin = 18; 

int distanceThreshold = 15; 
bool handInBox = false;
bool connected = false;

// NEW: Grace Period Variables
unsigned long lastHandSeenTime = 0;
const unsigned long EXIT_GRACE_PERIOD = 5000; // 5 seconds of forgiveness

unsigned long lastPrintTime = 0;

void runDiagnostics() {
  Serial.println("\n=== RUNNING HARDWARE DIAGNOSTICS ===");
  Serial.print("[TEST 1] HC-SR04 Ultrasonic... ");
  digitalWrite(trigPin, LOW); delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 30000); 
  if (duration == 0) Serial.println("❌ FAIL");
  else Serial.println("✅ PASS");

  Serial.print("[TEST 2] Bluetooth Radio... ");
  if (!SerialBT.begin("BoxESP", true)) { Serial.println("❌ FAIL"); while(1); } 
  else Serial.println("✅ PASS");
  Serial.println("====================================\n");
}

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  delay(1000); 
  
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  runDiagnostics();

  Serial.println("Attempting to pair with the Glove MAC Address...");
  connected = SerialBT.connect(gloveMAC);
  
  if(connected) {
    Serial.println("🟢 SECURE LINK ESTABLISHED!");
  }
}

void loop() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n'); input.trim();
    if (input.length() > 0 && input.toInt() > 0 && input.toInt() <= 400) {
      distanceThreshold = input.toInt();
      Serial.print("\n⚙️ [UPDATED] Distance Threshold is now: "); Serial.print(distanceThreshold); Serial.println(" cm\n");
    }
  }

  if (!connected) return; 

  long duration; int distance;
  digitalWrite(trigPin, LOW); delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH, 30000); 
  distance = (duration == 0) ? 999 : duration * 0.034 / 2; 

  if (millis() - lastPrintTime > 500) {
    Serial.print("📡 Live Distance: "); Serial.print(distance); Serial.println(" cm");
    lastPrintTime = millis();
  }

  // --- UPGRADED STATE MACHINE (WITH GRACE PERIOD) ---
  if (distance > 0 && distance < distanceThreshold) {
    // Hand is visible! Reset the timer continuously.
    lastHandSeenTime = millis(); 
    
    if (!handInBox) {
      handInBox = true;
      Serial.println("\n[BOX] Hand detected! Sending: HAND_PRESENT\n");
      SerialBT.println("HAND_PRESENT");
    }
  } else {
    // Hand is NOT visible. Has it been gone longer than 5 seconds?
    if (handInBox && (millis() - lastHandSeenTime > EXIT_GRACE_PERIOD)) {
      handInBox = false;
      Serial.println("\n[BOX] Hand officially left (5s timeout). Sending: CLEAR\n");
      SerialBT.println("CLEAR");
    }
  }

  delay(100); 
}