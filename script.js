// --- 1. Set up the Chart ---
const ctx = document.getElementById('imuChart').getContext('2d');
const imuChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], 
        datasets: [
            { label: 'Hand X', borderColor: '#ff5252', data: [], tension: 0.2 },
            { label: 'Hand Y', borderColor: '#4caf50', data: [], tension: 0.2 },
            { label: 'Hand Z', borderColor: '#448aff', data: [], tension: 0.2 }
        ]
    },
options: { 
        responsive: true, 
        animation: false, 
        scales: { 
            y: { 
                min: -20, max: 20,
                grid: { display: false }, // Hides horizontal lines
                ticks: { font: { family: "'JetBrains Mono', monospace" } }
            },
            x: {
                grid: { display: false }, // Hides vertical lines
                ticks: { display: false } // Hides X-axis numbers for a cleaner look
            }
        },
        plugins: { 
            legend: { 
                labels: { 
                    color: '#B3B3B3',
                    font: { family: "'Inter', sans-serif" }
                } 
            } 
        }
    }

// --- 2. Authentication State Management ---
let savedTemplate = [];
let currentTest = [];
let isRecordingTemplate = false;
let isTesting = false;

// DOM Elements
const statusText = document.getElementById('statusText');
const recordBtn = document.getElementById('recordTemplateBtn');
const testBtn = document.getElementById('testGestureBtn');
const connectBtn = document.getElementById('connectBtn');

// DOM Elements for Environment
const us1Label = document.getElementById('us1Label');
const us2Label = document.getElementById('us2Label');
const ir1Label = document.getElementById('ir1Label');
const ir2Label = document.getElementById('ir2Label');

// Global environment variables
let currentUS1 = 999; 
let currentUS2 = 999;

recordBtn.addEventListener('click', () => {
    savedTemplate = []; 
    isRecordingTemplate = true;
    recordBtn.disabled = true;
    testBtn.disabled = true;
    statusText.innerText = "Status: RECORDING GLOVE PASSWORD... (Takes 5 seconds)";
    statusText.style.color = "#ff5252";
    
    setTimeout(() => {
        isRecordingTemplate = false;
        recordBtn.disabled = false;
        testBtn.disabled = false;
        statusText.innerText = `Status: Password Saved! (${savedTemplate.length} data points)`;
        statusText.style.color = "#4caf50";
    }, 5000); 
});

testBtn.addEventListener('click', () => {
    if (savedTemplate.length === 0) {
        alert("Please record a password first!");
        return;
    }
    
    // --- ENVIRONMENTAL SECURITY GATE ---
    // Deny immediately if the user is standing further than 60cm from Ultrasonic 1
    if (currentUS1 > 60) {
        statusText.innerText = `❌ ACCESS DENIED: User not in secure physical zone (${currentUS1}cm).`;
        statusText.style.color = "#ff5252";
        return; 
    }

    currentTest = []; 
    isTesting = true;
    recordBtn.disabled = true; 
    testBtn.disabled = true;
    statusText.innerText = "Status: TESTING LOGIN... Do the gesture! (Takes 5 seconds)";
    statusText.style.color = "#ffb74d";
    
    setTimeout(() => {
        isTesting = false;
        recordBtn.disabled = false; 
        testBtn.disabled = false;
        
        // Run the 12-variable DTW Algorithm
        const dtwScore = calculateMultiDTW(savedTemplate, currentTest);
        const THRESHOLD = 35.0; // Tune this value!
        
        if (dtwScore < THRESHOLD) {
            statusText.innerText = `✅ AUTHENTICATED! (Score: ${dtwScore.toFixed(2)})`;
            statusText.style.color = "#4caf50";
        } else {
            statusText.innerText = `❌ ACCESS DENIED! Gesture Failed (Score: ${dtwScore.toFixed(2)})`;
            statusText.style.color = "#ff5252";
        }
    }, 5000); 
});

// --- 3. The 12-Dimensional DTW Engine ---
function calculateMultiDTW(template, liveGesture) {
    const n = template.length;
    const m = liveGesture.length;
    if (n === 0 || m === 0) return Infinity;

    const dtw = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const t = template[i-1];
            const l = liveGesture[j-1];
            
            // Euclidean distance across all 12 IMU data points
            const cost = Math.sqrt(
                Math.pow(t.x1 - l.x1, 2) + Math.pow(t.y1 - l.y1, 2) + Math.pow(t.z1 - l.z1, 2) + // Hand
                Math.pow(t.x2 - l.x2, 2) + Math.pow(t.y2 - l.y2, 2) + Math.pow(t.z2 - l.z2, 2) + // Thumb
                Math.pow(t.x3 - l.x3, 2) + Math.pow(t.y3 - l.y3, 2) + Math.pow(t.z3 - l.z3, 2) + // Index
                Math.pow(t.x4 - l.x4, 2) + Math.pow(t.y4 - l.y4, 2) + Math.pow(t.z4 - l.z4, 2)   // Middle
            );

            dtw[i][j] = cost + Math.min(dtw[i-1][j], dtw[i][j-1], dtw[i-1][j-1]);
        }
    }
    return dtw[n][m] / Math.max(n, m);
}

// --- 4. Web Serial API & 16-Variable Parsing ---
let port;
let reader;
let timeCount = 0;

async function connectSerial() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        
        connectBtn.innerText = "Connected!";
        connectBtn.style.backgroundColor = "#4caf50";
        recordBtn.disabled = false;
        statusText.innerText = "Status: Ready to Record.";
        statusText.style.color = "#bb86fc";

        const textDecoder = new TextDecoderStream();
        port.readable.pipeTo(textDecoder.writable);
        reader = textDecoder.readable.getReader();
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += value;
            let lines = buffer.split('\n');
            buffer = lines.pop(); 

            for (let line of lines) {
                line = line.trim();
                if (line) {
                    const vals = line.split(',').map(Number);
                    
                    // We expect exactly 16 values from the ESP32
                    if (vals.length !== 16 || vals.includes(NaN)) continue; 
                    
                    // 1. Extract IMU Data (Indices 0-11)
                    const dataPoint = {
                        x1: vals[0], y1: vals[1], z1: vals[2],
                        x2: vals[3], y2: vals[4], z2: vals[5],
                        x3: vals[6], y3: vals[7], z3: vals[8],
                        x4: vals[9], y4: vals[10], z4: vals[11]
                    };

                    // 2. Extract Environment Data (Indices 12-15)
                    currentUS1 = vals[12];
                    currentUS2 = vals[13];
                    const ir1 = vals[14];
                    const ir2 = vals[15];

                    // 3. Update the UI Dashboard
                    us1Label.innerText = currentUS1 === 999 ? "Out of Range" : currentUS1 + " cm";
                    us2Label.innerText = currentUS2 === 999 ? "Out of Range" : currentUS2 + " cm";
                    ir1Label.innerText = ir1 === 0 ? "⚠️ BLOCKED" : "Clear";
                    ir2Label.innerText = ir2 === 0 ? "⚠️ BLOCKED" : "Clear";
                    ir1Label.style.color = ir1 === 0 ? "#ff5252" : "#4caf50";
                    ir2Label.style.color = ir2 === 0 ? "#ff5252" : "#4caf50";

                    // 4. Save data if recording/testing
                    if (isRecordingTemplate) savedTemplate.push(dataPoint);
                    if (isTesting) currentTest.push(dataPoint);

                    // 5. Update Chart (Plotting IMU 1 X,Y,Z)
                    imuChart.data.labels.push(timeCount++);
                    imuChart.data.datasets[0].data.push(vals[0]);
                    imuChart.data.datasets[1].data.push(vals[1]);
                    imuChart.data.datasets[2].data.push(vals[2]);
                    if (imuChart.data.labels.length > 50) {
                        imuChart.data.labels.shift();
                        imuChart.data.datasets.forEach(dataset => dataset.data.shift());
                    }
                    imuChart.update();
                }
            }
        }
    } catch (error) {
        console.error("Connection error:", error);
        statusText.innerText = "Error: Could not connect to serial port.";
        statusText.style.color = "#ff5252";
    }
}

connectBtn.addEventListener('click', connectSerial);
