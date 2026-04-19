# Temporal Spatial Gesture Authentication Engine

A 100% serverless, edge-based IoT project that captures and visualizes real-time spatio-temporal data for gesture-based authentication. This system tracks 3D linear acceleration and uses a Dynamic Time Warping (DTW) algorithm to match live gestures against saved templates.

**Author:** Soubhagya Ranjan Biswal  
**Location:** Built at IIIT Hyderabad (Room N125)

## 🚀 How It Works
Traditional passwords rely on static text. This engine explores the concept of a "dynamic password"-a physical movement in 3D space performed with a specific, unique rhythm over time. 

The system uses an ESP32 edge node to capture high-fidelity acceleration data and streams it directly to a local web browser using the **Web Serial API**. The browser runs a 5-second sampling window and processes the mathematical similarity between gestures using DTW. No database, no cloud server, and no backend hosting required.

## 🛠️ Hardware Setup

* **Microcontroller:** ESP32 (NodeMCU or similar)
* **Sensor:** MPU6050 (6-Axis IMU)
* **Wiring:** Standard I2C
    * `VCC` -> ESP32 `3.3V`
    * `GND` -> ESP32 `GND`
    * `SDA` -> ESP32 `GPIO 21`
    * `SCL` -> ESP32 `GPIO 22`

## 💻 Software & Libraries

**For the ESP32 (C++):**
* [Arduino IDE](https://www.arduino.cc/en/software)
* `Adafruit MPU6050` Library
* `Adafruit Unified Sensor` Library

**For the Dashboard (Frontend):**
* Standard HTML/CSS/JavaScript
* [Chart.js](https://www.chartjs.org/) (Loaded via CDN)
* Web Serial API (Requires Google Chrome, Microsoft Edge, or Opera)

## 🏃‍♂️ Getting Started

1.  **Flash the Firmware:**
    * Open `main.ino` in the Arduino IDE.
    * Connect your ESP32 via USB and upload the code.
    * *Important:* Close the Arduino Serial Monitor after uploading.
2.  **Launch the Dashboard:**
    * Open the `index.html` file in a supported web browser (Chrome/Edge).
3.  **Connect & Authenticate:**
    * Click the **"Connect to ESP32"** button.
    * Click **"Record Password"** and perform your gesture for 5 seconds.
    * Click **"Test Login"** and attempt to repeat the exact gesture to see your DTW verification score!

## 🔧 Tuning the System
If the system is too strict or too loose, open `index.html` and locate the `THRESHOLD` variable inside the `testBtn.addEventListener` block. Decrease the number to make security tighter, or increase it to allow for more natural variation in hand movements.
