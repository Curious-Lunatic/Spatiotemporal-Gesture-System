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
    
    // 2. The Vector Line (Cylinder instead of 1px Line for actual thickness)
    const boneGeo = new THREE.CylinderGeometry(0.08, 0.02, length, 8);
    // Shift geometry so the top is at the origin (pivot point), then point it along -Z
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
// CRITICAL FIX: Change rotation order so Pitch/Roll apply cleanly after the Y base angle
thumbJoint.rotation.order = "YXZ"; 
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
        options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { y: { suggestedMin: -15, suggestedMax: 15, grid: { color: '#282828' }, ticks: { color: '#555' } }, x: { display: false } }, plugins: { legend: { display: false } } }
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
    statusText.innerText = "RECORDING GLOVE PASSWORD... (5 sec)"; statusText.style.color = "#ff5252";
    setTimeout(() => {
        isRecordingTemplate = false; recordBtn.disabled = false; testBtn.disabled = false;
        statusText.innerText = `Password Saved! (${savedTemplate.length} points)`; statusText.style.color = "#4caf50";
    }, 5000); 
});

testBtn.addEventListener('click', () => {
    if (savedTemplate.length === 0) return alert("Record a password first!");
    currentTest = []; isTesting = true;
    recordBtn.disabled = true; testBtn.disabled = true;
    statusText.innerText = "TESTING LOGIN... Do the gesture!"; statusText.style.color = "#ffb74d";
    
    setTimeout(() => {
        isTesting = false; recordBtn.disabled = false; testBtn.disabled = false;
        const dtwScore = calculateMultiDTW(savedTemplate, currentTest);
        if (dtwScore < 8.0) { 
            statusText.innerText = `✅ AUTHENTICATED! (Score: ${dtwScore.toFixed(2)})`; statusText.style.color = "#4caf50";
        } else {
            statusText.innerText = `❌ ACCESS DENIED (Score: ${dtwScore.toFixed(2)})`; statusText.style.color = "#ff5252";
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
// 4. WEB SERIAL & 3D RELATIVE MATH
// ==========================================
let port, reader, timeCount = 0;

function calcPitch(y, z) { return Math.atan2(y, z); }
function calcRoll(x, y, z) { return Math.atan2(-x, Math.sqrt(y * y + z * z)); }

async function connectSerial() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        
        connectBtn.innerText = "Connected!"; connectBtn.style.backgroundColor = "#4caf50";
        recordBtn.disabled = false; statusText.innerText = "Ready to Record."; statusText.style.color = "#bb86fc";

        const textDecoder = new TextDecoderStream();
        port.readable.pipeTo(textDecoder.writable);
        reader = textDecoder.readable.getReader();
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += value;
            let lines = buffer.split(/\r?\n/);
            buffer = lines.pop(); 

            for (let line of lines) {
                line = line.trim();
                if (line) {
                    const vals = line.split(',').map(Number);
                    if (vals.length !== 12 || vals.includes(NaN)) continue; 
                    
                    if (isRecordingTemplate) savedTemplate.push(vals);
                    if (isTesting) currentTest.push(vals);

                    const palmPitch = calcPitch(vals[1], vals[2]);
                    const palmRoll = calcRoll(vals[0], vals[1], vals[2]);
                    
                    palmFrame.rotation.x = palmPitch;
                    palmFrame.rotation.z = palmRoll;

                    indexJoint.rotation.x = calcPitch(vals[4], vals[5]) - palmPitch;
                    indexJoint.rotation.z = calcRoll(vals[3], vals[4], vals[5]) - palmRoll;
                    
                    middleJoint.rotation.x = calcPitch(vals[7], vals[8]) - palmPitch;
                    middleJoint.rotation.z = calcRoll(vals[6], vals[7], vals[8]) - palmRoll;

                    // With the "YXZ" order fixed above, this math will now act like a natural hinge
                    thumbJoint.rotation.x = calcPitch(vals[10], vals[11]) - palmPitch;
                    thumbJoint.rotation.z = calcRoll(vals[9], vals[10], vals[11]) - palmRoll;
                    
                    renderer.render(scene, camera);

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
        }
    } catch (error) {
        statusText.innerText = "Error: Could not connect to serial port."; statusText.style.color = "#ff5252";
    }
}

connectBtn.addEventListener('click', connectSerial);
renderer.render(scene, camera);