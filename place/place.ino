#include "BluetoothSerial.h"

BluetoothSerial SerialBT;

#define TRIG_PIN 5
#define ECHO_PIN 18
#define IR1_PIN  22
#define IR2_PIN  21
#define DIST_THRESHOLD 8.0

bool lastState = false;
bool btConnected = false;

// Replace with your Glove ESP32's BT MAC address
// Find it by printing ESP.getEfuseMac() on the Glove
uint8_t gloveMAC[6] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF}; // <-- CHANGE THIS

void setup() {
  Serial.begin(115200);

  SerialBT.begin("BoxESP", true); // true = Master mode
  Serial.println("[BT] Box in Master mode. Connecting to GloveESP...");

  // Connect by MAC for reliability
  btConnected = SerialBT.connect(gloveMAC);
  if (btConnected) {
    Serial.println("[BT] Connected to Glove!");
  } else {
    Serial.println("[BT] Connection failed. Will retry in loop.");
  }

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(IR1_PIN, INPUT);
  pinMode(IR2_PIN, INPUT);
}

float getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return 999.0; // timeout = no echo
  return duration * 0.034 / 2.0;
}

void sendBT(const char* msg) {
  if (!btConnected) {
    btConnected = SerialBT.connect(gloveMAC); // attempt reconnect
  }
  if (btConnected) {
    SerialBT.println(msg);
    Serial.print("[BT] Sent: "); Serial.println(msg);
  }
}

void loop() {
  float distance = getDistance();
  bool currentState = false;

  if (distance > 0 && distance <= DIST_THRESHOLD) {
    int ir1 = digitalRead(IR1_PIN);
    int ir2 = digitalRead(IR2_PIN);
    if (ir1 == HIGH && ir2 == HIGH) {
      currentState = true;
    }
  }

  if (currentState != lastState) {
    if (currentState) {
      Serial.println("[BOX] Hand DETECTED — sending HAND_PRESENT");
      sendBT("HAND_PRESENT");
    } else {
      Serial.println("[BOX] Hand REMOVED — sending CLEAR");
      sendBT("CLEAR");
    }
    lastState = currentState;
  }

  delay(100);
}
