// --- 1. Set up the Chart ---
const ctx = document.getElementById('imuChart').getContext('2d');
const imuChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], 
        datasets: [
            { label: 'Accel X', borderColor: '#ff5252', data: [], tension: 0.2 },
            { label: 'Accel Y', borderColor: '#4caf50', data: [], tension: 0.2 },
            { label: 'Accel Z', borderColor: '#448aff', data: [], tension: 0.2 }
        ]
    },
    options: { 
        responsive: true, 
        animation: false, 
        scales: { y: { min: -20, max: 20 } },
        plugins: { legend: { labels: { color: 'white' } } }
    }
});

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

recordBtn.addEventListener('click', () => {
    savedTemplate = []; 
    isRecordingTemplate = true;
    recordBtn.disabled = true;
    testBtn.disabled = true;
    statusText.innerText = "Status: RECORDING PASSWORD... Move your hand! (Takes 5 seconds)";
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
        
        // Run DTW Algorithm
        const dtwScore = calculateDTW(savedTemplate, currentTest);
        
        // Security Threshold (Tune this based on testing)
        const THRESHOLD = 15.0; 
        
        if (dtwScore < THRESHOLD) {
            statusText.innerText = `✅ AUTHENTICATED! (Score: ${dtwScore.toFixed(2)})`;
            statusText.style.color = "#4caf50";
        } else {
            statusText.innerText = `❌ ACCESS DENIED! (Score: ${dtwScore.toFixed(2)})`;
            statusText.style.color = "#ff5252";
        }
    }, 5000); 
});

// --- 3. The DTW Engine ---
function calculateDTW(template, liveGesture) {
    const n = template.length;
    const m = liveGesture.length;
    if (n === 0 || m === 0) return Infinity;

    const dtw = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const dx = template[i-1].x - liveGesture[j-1].x;
            const dy = template[i-1].y - liveGesture[j-1].y;
            const dz = template[i-1].z - liveGesture[j-1].z;
            const cost = Math.sqrt(dx*dx + dy*dy + dz*dz);

            dtw[i][j] = cost + Math.min(dtw[i-1][j], dtw[i][j-1], dtw[i-1][j-1]);
        }
    }
    return dtw[n][m] / Math.max(n, m);
}

// --- 4. Web Serial API & Data Processing ---
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
                    const values = line.split(',');
                    if (values.length !== 3) continue; 
                    
                    const x = parseFloat(values[0]);
                    const y = parseFloat(values[1]);
                    const z = parseFloat(values[2]);
                    const dataPoint = { x: x, y: y, z: z };

                    if (isRecordingTemplate) savedTemplate.push(dataPoint);
                    if (isTesting) currentTest.push(dataPoint);

                    imuChart.data.labels.push(timeCount++);
                    imuChart.data.datasets[0].data.push(x);
                    imuChart.data.datasets[1].data.push(y);
                    imuChart.data.datasets[2].data.push(z);
                    
                    if (imuChart.data.labels.length > 50) {
                        imuChart.data.labels.shift();
                        imuChart.data.datasets[0].data.shift();
                        imuChart.data.datasets[1].data.shift();
                        imuChart.data.datasets[2].data.shift();
                    }
                    imuChart.update();
                }
            }
        }
    } catch (error) {
        console.error("Error connecting to serial port:", error);
        statusText.innerText = "Error: Could not connect to serial port.";
        statusText.style.color = "#ff5252";
    }
}

connectBtn.addEventListener('click', connectSerial);
