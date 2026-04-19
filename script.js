// ==========================================
// 1. THREE.JS 3D SKELETAL HAND SETUP
// ==========================================
const threeContainer = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505); 

const camera = new THREE.PerspectiveCamera(45, threeContainer.clientWidth / threeContainer.clientHeight, 0.1, 100);
camera.position.set(0, 8, 8); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
threeContainer.appendChild(renderer.domElement);

// --- VISUAL UPGRADE: CYLINDER BONES & SPHERE JOINTS ---
function createBone(colorHex, length) {
    const pivot = new THREE.Group(); 
    
    // 1. The Joint Node (Knuckle)
    const nodeGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    
    // 2. The Vector Line
    const boneGeo = new THREE.CylinderGeometry(0.08, 0.02, length, 8);
    boneGeo.translate(0, -length / 2, 0);
    boneGeo.rotateX(-Math.PI / 2);
    
    const boneMat = new THREE.MeshBasicMaterial({ color: colorHex }); 
    const bone = new THREE.Mesh(boneGeo, boneMat);
    
    pivot.add(node);
    pivot.add(bone);
    
    return pivot;
}

// 1. The Palm Frame
const palmPoints = [
    new THREE.Vector3(-1.5, 0, -2), new THREE.Vector3(1.5, 0, -2),
    new THREE.Vector3(1.5, 0, 2), new THREE.Vector3(-1.5, 0, 2),
    new THREE.Vector3(-1.5, 0, -2)
];
const palmGeo = new THREE.BufferGeometry().setFromPoints(palmPoints);
const palmFrame = new THREE.Line(palmGeo, new THREE.LineBasicMaterial({ color: 0x444444 }));
scene.add(palmFrame);

// 2. The Fingers
const indexJoint = createBone(0xff5252, 3.5); // Red
indexJoint.position.set(-0.8, 0, -2);
palmFrame.add(indexJoint);

const middleJoint = createBone(0x4caf50, 3.5); // Green
middleJoint.position.set(0.8, 0, -2);
palmFrame.add(middleJoint);

const thumbJoint = createBone(0x448aff, 2.5); // Blue
thumbJoint.position.set(-1.6, 0, 0);
thumbJoint.rotation.y = -Math.PI / 4; 
thumbJoint.rotation.order = "YXZ"; // CRITICAL FIX
palmFrame.add(thumbJoint);

window.addEventListener('resize', () => {
    camera.aspect = threeContainer.clientWidth / threeContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
});


// ==========================================
// 2. CHART.JS 2D SETUP
// ==========================================
function createChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
            { borderColor: '#ff5252', data: [], tension: 0.2, pointRadius: 0, borderWidth: 2 },
            { borderColor: '#4caf50', data: [], tension: 0.2, pointRadius: 0, borderWidth: 2 },
            { borderColor: '#448aff', data: [], tension: 0.2, pointRadius: 0, borderWidth: 2 }
        ]},
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            animation: false, 
            scales: { 
                y: { suggestedMin: -15, suggestedMax: 15, grid: { color: '#282828' }, ticks: { color: '#555' } }, 
                x: { display: false } 
            }, 
            plugins: { legend: { display: false } } 
        }
    });
}

const handChart = createChart('handChart');
const indexChart = createChart('indexChart');
const middleChart = createChart('middleChart');
const thumbChart = createChart('thumbChart');


// ==========================================
// 3. AUTH LOGIC & 12-D DTW ENGINE
// ==========================================
let savedTemplate = [], currentTest = [];
let isRecordingTemplate = false, isTesting = false;

const statusText = document.getElementById('statusText');
const recordBtn = document.getElementById('recordTemplateBtn');
const testBtn = document.getElementById('testGestureBtn');
const connectBtn = document.getElementById('connectBtn');

recordBtn.addEventListener('click', () => {
    savedTemplate = []; isRecordingTemplate = true;
    recordBtn.disabled = true; testBtn.disabled = true;
    statusText.innerText = "RECORDING GLOVE PASSWORD... (5 sec)"; 
    statusText.style.color = "#ff5252";
    setTimeout(() => {
        isRecordingTemplate = false; recordBtn.disabled = false; testBtn.disabled = false;
        statusText.innerText = `Password Saved! (${savedTemplate.length} points)`; 
        statusText.style.color = "#4caf50";
    }, 5000); 
});

testBtn.addEventListener('click', () => {
    if (savedTemplate.length === 0) return alert("Record a password first!");
    currentTest = []; isTesting = true;
    recordBtn.disabled = true; testBtn.disabled = true;
    statusText.innerText = "TESTING LOGIN... Do the gesture!"; 
    statusText.style.color = "#ffb74d";
    
    setTimeout(() => {
        isTesting = false; recordBtn.disabled = false; testBtn.disabled = false;
        const dtwScore = calculateMultiDTW(savedTemplate, currentTest);
        
        // --- NEW THRESHOLD TRIGGER ---
        if (dtwScore < 30.0) { 
            statusText.innerText = `✅ AUTHENTICATED! (Score: ${dtwScore.toFixed(2)})`; 
            statusText.style.color = "#4caf50";
        } else {
            statusText.innerText = `❌ ACCESS DENIED (Score: ${dtwScore.toFixed(2)})`; 
            statusText.style.color = "#ff5252";
        }
    }, 5000); 
});

function calculateMultiDTW(template, liveGesture) {
    const n = template.length, m = liveGesture.length;
    if (n === 0 || m === 0) return Infinity;
    const dtw = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const t = template[i-1], l = liveGesture[j-1];
            const cost = Math.sqrt(
                Math.pow(t[0]-l[0],2) + Math.pow(t[1]-l[1],2) + Math.pow(t[2]-l[2],2) +
                Math.pow(t[3]-l[3],2) + Math.pow(t[4]-l[4],2) + Math.pow(t[5]-l[5],2) +
                Math.pow(t[6]-l[6],2) + Math.pow(t[7]-l[7],2) + Math.pow(t[8]-l[8],2) +
                Math.pow(t[9]-l[9],2) + Math.pow(t[10]-l[10],2) + Math.pow(t[11]-l[11],2)
            );
            dtw[i][j] = cost + Math.min(dtw[i-1][j], dtw[i][j-1], dtw[i-1][j-1]);
        }
    }
    return dtw[n][m] / Math.max(n, m);
}


// ==========================================
// 4. BULLETPROOF WEB SERIAL & 3D MATH
// ==========================================
let port, reader, timeCount = 0;

// Auto-Calibration Memory
let isCalibrated = false;
let offsetPitch = [0, 0, 0, 0];
let offsetRoll = [0, 0, 0, 0];

function calcPitch(y, z) { return Math.atan2(y, z); }
function calcRoll(x, y, z) { return Math.atan2(-x, Math.sqrt(y * y + z * z)); }

async function connectSerial() {
    if (port) {
        alert("Port is already open. Refresh the page to reset.");
        return;
    }

    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        
        connectBtn.innerText = "Connected!"; connectBtn.style.backgroundColor = "#4caf50";
        recordBtn.disabled = false; testBtn.disabled = false;
        statusText.innerText = "Keep hand flat. Waiting for valid data to calibrate..."; 
        statusText.style.color = "#bb86fc";

        const textDecoder = new TextDecoderStream();
        port.readable.pipeTo(textDecoder.writable);
        reader = textDecoder.readable.getReader();
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += value;
            let lines = buffer.split(/\r?\n/);
            buffer = lines.pop(); // Save incomplete chunk

            for (let line of lines) {
                line = line.trim();
                
                // FILTER GARBAGE
                if (!line || /[a-zA-Z]/.test(line)) continue; 

                const vals = line.split(',').map(Number);
                
                // DATA INTEGRITY CHECK
                if (vals.length !== 12 || vals.some(isNaN)) continue; 
                
                // AUTHENTICATION LOGIC
                if (isRecordingTemplate) savedTemplate.push(vals);
                if (isTesting) currentTest.push(vals);

                // ABSOLUTE ANGLES
                const p0 = calcPitch(vals[1], vals[2]); const r0 = calcRoll(vals[0], vals[1], vals[2]); // Hand
                const p1 = calcPitch(vals[4], vals[5]); const r1 = calcRoll(vals[3], vals[4], vals[5]); // Index
                const p2 = calcPitch(vals[7], vals[8]); const r2 = calcRoll(vals[6], vals[7], vals[8]); // Middle
                const p3 = calcPitch(vals[10], vals[11]); const r3 = calcRoll(vals[9], vals[10], vals[11]); // Thumb

                // AUTO-CALIBRATION TRIGGER
                if (!isCalibrated) {
                    offsetPitch = [p0, p1, p2, p3];
                    offsetRoll = [r0, r1, r2, r3];
                    isCalibrated = true;
                    statusText.innerText = "✅ Calibrated! Ready to Record.";
                }

                // APPLY CALIBRATION OFFSETS
                const calibHandP = p0 - offsetPitch[0];     const calibHandR = r0 - offsetRoll[0];
                const calibIndexP = p1 - offsetPitch[1];    const calibIndexR = r1 - offsetRoll[1];
                const calibMiddleP = p2 - offsetPitch[2];   const calibMiddleR = r2 - offsetRoll[2];
                const calibThumbP = p3 - offsetPitch[3];    const calibThumbR = r3 - offsetRoll[3];

                // UPDATE 3D BASE
                palmFrame.rotation.x = calibHandP;
                palmFrame.rotation.z = calibHandR;

                // UPDATE 3D FINGERS (Relative to Hand Base)
                indexJoint.rotation.x = calibIndexP - calibHandP;
                indexJoint.rotation.z = calibIndexR - calibHandR;
                
                middleJoint.rotation.x = calibMiddleP - calibHandP;
                middleJoint.rotation.z = calibMiddleR - calibHandR;

                thumbJoint.rotation.x = calibThumbP - calibHandP;
                thumbJoint.rotation.z = calibThumbR - calibHandR;
                
                renderer.render(scene, camera);

                // UPDATE 2D CHARTS
                [handChart, indexChart, middleChart, thumbChart].forEach((chart, idx) => {
                    const offset = idx * 3;
                    chart.data.labels.push(timeCount);
                    chart.data.datasets[0].data.push(vals[offset]);
                    chart.data.datasets[1].data.push(vals[offset+1]);
                    chart.data.datasets[2].data.push(vals[offset+2]);
                    
                    if (chart.data.labels.length > 50) {
                        chart.data.labels.shift();
                        chart.data.datasets.forEach(d => d.data.shift());
                    }
                    chart.update();
                });
                timeCount++;
            }
        }
    } catch (error) {
        console.error(error);
        statusText.innerText = "Error: Port Locked or Browser Denied Access."; 
        statusText.style.color = "#ff5252";
    }
}

connectBtn.addEventListener('click', connectSerial);
renderer.render(scene, camera);