#include "BluetoothSerial.h"

// --- CONFIG ---
// This ESP32 acts as the physical trigger for the whole system. 
// When you place your hand in the box, it detects it and sends a signal to the Glove over Bluetooth.
// It acts as a simple edge node in our arch.
BluetoothSerial SerialBT;

// We are using a hardcoded MAC address to pair the Box directly to the Glove. 
// While this prevents random devices from connecting, it is not fully secure as it lacks authentication and encryption. 
uint8_t gloveMAC[6] = {0xCC, 0xDB, 0xA7, 0x2E, 0x1B, 0x8A};

// These IR sensors are the primary triggers. 
// Right now, they are checking if an object is blocking their light. 
// The OUT pin goes HIGH when the hand is detected.
const int ir1Pin = 21;
const int ir2Pin = 23;

// The ultrasonic sensor is just monitoring the distance right now. 
// It does not trigger the system; it only prints data for our logs for a saftey check if the hand was there or not. Or a foreign object was used.
const int trigPin = 5;
const int echoPin = 18;
const int distanceThreshold = 15; // container size

bool handInBox = false;
bool connected = false;

// We use this to handle hardware glitches. 
// If your hand moves slightly and the sensor misses it for a second, this 5-second timer stops the system from accidentally resetting. 
// This is because moving the hand constantly can trigger the IR sensor.
unsigned long lastHandSeenTime = 0;
const unsigned long EXIT_GRACE_PERIOD = 5000;
unsigned long lastPrintTime = 0;

// ── SENSOR READS ───────────────────────────────────────────────────────────

// [Polling Mechanism]: The code actively polls (checks) both IR sensors. 
// Both must be triggered together to confirm the hand is actually there.
bool irDetected() {
  // BOTH sensors must be HIGH simultaneously
  return (!digitalRead(ir1Pin) == HIGH);
  // && (digitalRead(ir2Pin) == HIGH)
}

void checkUltrasonic() {
  // Passive only — reads and logs, never used for trigger logic
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 30000);
  int distance = (duration == 0) ? 999 : (int)(duration * 0.034 / 2);

  if (duration == 0 || distance == 999) {
    Serial.println("⚠️  [US_FAILED] Ultrasonic not responding. IR continues as primary.");
  } else {
    Serial.print("📡 [UltraS_OK] Distance: "); Serial.print(distance); Serial.println(" cm");
  }
}

// ── DIAGNOSTICS ────────────────────────────────────────────────────────────

// [Diagnostics]: When the device turns on, it tests the sensors to ensure the hardware is working properly.
void runDiagnostics() {
  Serial.println("\n=== RUNNING HARDWARE DIAGNOSTICS ===");

  Serial.print("[TEST 1] IR Sensor 1 (pin 21)... ");
  Serial.println(digitalRead(ir1Pin) == HIGH ? "TRIGGERED (check if clear)" : "✅ CLEAR");

  Serial.print("[TEST 2] IR Sensor 2 (pin 22)... ");
  Serial.println(digitalRead(ir2Pin) == HIGH ? "TRIGGERED (check if clear)" : "✅ CLEAR");

  Serial.print("[TEST 3] HC-SR04 Ultrasonic (passive)... ");
  digitalWrite(trigPin, LOW);  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long dur = pulseIn(echoPin, HIGH, 30000);
  if (dur == 0) Serial.println("⚠️  FAIL — will warn at runtime, process unaffected");
  else { Serial.print("✅ PASS — ");
  Serial.print((int)(dur * 0.034 / 2)); Serial.println(" cm"); }

  Serial.println("====================================\n");
}

// ── SETUP ──────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  delay(1000);

  pinMode(ir1Pin,  INPUT);
  pinMode(ir2Pin,  INPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  // [Bluetooth Mode]: The Box is set as the 'Master'. It will search for the Glove.
  SerialBT.begin("BoxESP", true);
  // master mode
  delay(500);

  runDiagnostics();

  Serial.println("Attempting to pair with Glove MAC Address...");
  connected = SerialBT.connect(gloveMAC);
  if (connected) {
    Serial.println("🟢 SECURE LINK ESTABLISHED!");
  } else {
    Serial.println("🔴 Bluetooth connection failed.");
  }
}

// ── LOOP ───────────────────────────────────────────────────────────────────

void loop() {
  if (!connected) return;

  bool handPresent = irDetected();
  // Passive ultrasonic log every 500ms
  if (millis() - lastPrintTime > 500) {
    Serial.print("IR1: ");
    Serial.print(digitalRead(ir1Pin) == HIGH ? "DETECT" : "clear");
    Serial.print(" | IR2: "); Serial.print(digitalRead(ir2Pin) == LOW ? "DETECT" : "clear");
    //CHANGE HIGH TO LOW
    Serial.print(" | Hand: "); Serial.println(handPresent ? "✅ PRESENT" : "❌ absent");
    checkUltrasonic();
    lastPrintTime = millis();
  }

  // ── STATE MACHINE WITH GRACE PERIOD ───────────────────────────────────
  if (handPresent) {
    lastHandSeenTime = millis();
    if (!handInBox) {
      handInBox = true;
      // [Command Payload]: Sending a simple string command to the Glove over Bluetooth.
      Serial.println("\n[BOX] Hand detected! Sending: HAND_PRESENT\n");
      SerialBT.println("HAND_PRESENT");
    }
  } else {
    if (handInBox && (millis() - lastHandSeenTime > EXIT_GRACE_PERIOD)) {
      handInBox = false;
      Serial.println("\n[BOX] Hand left (5s timeout). Sending: CLEAR\n");
      SerialBT.println("CLEAR");
    }
  }

  delay(100);
}
