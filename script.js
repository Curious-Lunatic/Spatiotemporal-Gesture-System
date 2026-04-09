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

// ... (Keep the Chart setup and DTW function from the previous step) ...

// DOM Elements for Environment
const us1Label = document.getElementById('us1Label');
const us2Label = document.getElementById('us2Label');
const ir1Label = document.getElementById('ir1Label');
const ir2Label = document.getElementById('ir2Label');

// Global environment variables to hold the latest readings
let currentUS1 = 999; 
let currentUS2 = 999;

testBtn.addEventListener('click', () => {
    if (savedTemplate.length === 0) return alert("Please record a password first!");
    
    // --- ENVIRONMENTAL SECURITY GATE ---
    // If the user is standing further than 60cm from Ultrasonic 1, deny immediately.
    if (currentUS1 > 60) {
        statusText.innerText = `❌ ACCESS DENIED: User not in secure physical zone (${currentUS1}cm).`;
        statusText.style.color = "#ff5252";
        return; 
    }

    currentTest = []; 
    isTesting = true;
    recordBtn.disabled = true; testBtn.disabled = true;
    statusText.innerText = "Status: TESTING LOGIN... (Takes 5 seconds)";
    statusText.style.color = "#ffb74d";
    
    setTimeout(() => {
        isTesting = false;
        recordBtn.disabled = false; testBtn.disabled = false;
        
        const dtwScore = calculateMultiDTW(savedTemplate, currentTest);
        const THRESHOLD = 35.0; 
        
        if (dtwScore < THRESHOLD) {
            statusText.innerText = `✅ AUTHENTICATED! (Score: ${dtwScore.toFixed(2)})`;
            statusText.style.color = "#4caf50";
        } else {
            statusText.innerText = `❌ ACCESS DENIED! Gesture Failed (Score: ${dtwScore.toFixed(2)})`;
            statusText.style.color = "#ff5252";
        }
    }, 5000); 
});

// --- Web Serial API & 16-Variable Parsing ---
// ... (Inside your connectSerial() while loop) ...
            for (let line of lines) {
                line = line.trim();
                if (line) {
                    const vals = line.split(',').map(Number);
                    // NOW WE EXPECT 16 VALUES!
                    if (vals.length !== 16 || vals.includes(NaN)) continue; 
                    
                    // 1. Extract IMU Data (0-11)
                    const dataPoint = {
                        x1: vals[0], y1: vals[1], z1: vals[2],
                        x2: vals[3], y2: vals[4], z2: vals[5],
                        x3: vals[6], y3: vals[7], z3: vals[8],
                        x4: vals[9], y4: vals[10], z4: vals[11]
                    };

                    // 2. Extract Environment Data (12-15)
                    currentUS1 = vals[12];
                    currentUS2 = vals[13];
                    const ir1 = vals[14];
                    const ir2 = vals[15];

                    // 3. Update the UI Dashboard
                    us1Label.innerText = currentUS1 === 999 ? "Out of Range" : currentUS1 + " cm";
                    us2Label.innerText = currentUS2 === 999 ? "Out of Range" : currentUS2 + " cm";
                    // IR sensors usually read 0 when an object is close, 1 when clear
                    ir1Label.innerText = ir1 === 0 ? "⚠️ BLOCKED" : "Clear";
                    ir2Label.innerText = ir2 === 0 ? "⚠️ BLOCKED" : "Clear";
                    ir1Label.style.color = ir1 === 0 ? "#ff5252" : "#4caf50";
                    ir2Label.style.color = ir2 === 0 ? "#ff5252" : "#4caf50";

                    // 4. Save data if recording/testing
                    if (isRecordingTemplate) savedTemplate.push(dataPoint);
                    if (isTesting) currentTest.push(dataPoint);

                    // 5. Update Chart (Still just plotting IMU 1 X,Y,Z to keep it readable)
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
