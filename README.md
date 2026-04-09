# Temporal Spatial Gesture Authentication Engine

A 100% serverless, edge-based IoT project that captures and visualizes real-time spatio-temporal data for gesture-based authentication. This system tracks 3D linear acceleration and maps it directly to a web dashboard without requiring any backend infrastructure.

**Author:** Soubhagya Ranjan Biswal  
**Location:** Built at IIIT Hyderabad (Room N125)

## 🚀 How It Works
Traditional passwords rely on static text. This engine explores the concept of a "dynamic password"—a physical movement in 3D space performed with a specific, unique rhythm over time. 

Currently, the system uses an ESP32 edge node to capture high-fidelity acceleration data and streams it directly to a local web browser using the **Web Serial API**. No database, no cloud server, and no backend hosting required.

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
3.  **Connect & Track:**
    * Click the **"Connect to ESP32"** button on the web page.
    * Select your ESP32's COM port from the browser popup.
    * Move the IMU sensor to see real-time spatial data mapped on the chart!

## 🔮 Future Roadmap
* Integrate Gyroscope (Pitch, Roll, Yaw) data for complete 6-degree-of-freedom tracking.
* Implement Dynamic Time Warping (DTW) algorithms on the frontend to compare live gestures against a saved "password" template.
* Add environmental context using Ultrasonic/IR sensors to verify user proximity.
