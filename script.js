// ==========================================
// 1. THREE.JS 3D SKELETAL HAND SETUP
// ==========================================
const threeContainer = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060809);

// Subtle grid on the floor
const gridHelper = new THREE.GridHelper(20, 20, 0x1a2030, 0x111820);
gridHelper.position.y = -3.5;
scene.add(gridHelper);

// Ambient + directional lighting for depth
const ambientLight = new THREE.AmbientLight(0x223344, 1.2);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0x7be0a8, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);
const rimLight = new THREE.DirectionalLight(0x6eb8f7, 0.4);
rimLight.position.set(-5, 3, -5);
scene.add(rimLight);

const camera = new THREE.PerspectiveCamera(40, threeContainer.clientWidth / threeContainer.clientHeight, 0.1, 100);
camera.position.set(0, 10, 12);
camera.lookAt(0, 1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
threeContainer.appendChild(renderer.domElement);

// ── MATERIALS ──────────────────────────────────────────────
const matPalm    = new THREE.MeshLambertMaterial({ color: 0x1e3040, wireframe: false });
const matPalmWire= new THREE.MeshBasicMaterial({ color: 0x2e4a60, wireframe: true });
const matIndex   = new THREE.MeshLambertMaterial({ color: 0xc0392b }); // red
const matMiddle  = new THREE.MeshLambertMaterial({ color: 0x27ae60 }); // green
const matThumb   = new THREE.MeshLambertMaterial({ color: 0x2980b9 }); // blue
const matJoint   = new THREE.MeshLambertMaterial({ color: 0xecf0f1 });
const matSensor  = new THREE.MeshLambertMaterial({ color: 0xf0c060, emissive: 0x503000 }); // amber = sensor

// ── SENSOR GLOW HELPER ─────────────────────────────────────
function createSensorMarker() {
    const g = new THREE.SphereGeometry(0.22, 10, 10);
    return new THREE.Mesh(g, matSensor);
}

// ── JOINT SPHERE HELPER ────────────────────────────────────
function createJointSphere(r = 0.18) {
    const g = new THREE.SphereGeometry(r, 8, 8);
    return new THREE.Mesh(g, matJoint);
}

// ── BONE CYLINDER HELPER ───────────────────────────────────
// Returns a Group with a cylinder along +Z, pivoting at origin
function createBoneCylinder(mat, length, radiusTop = 0.09, radiusBot = 0.13) {
    const g = new THREE.CylinderGeometry(radiusTop, radiusBot, length, 8);
    g.translate(0, -length / 2, 0); // tip at y=0, base at y=-length
    g.rotateX(-Math.PI / 2);        // now extends in +Z
    return new THREE.Mesh(g, mat);
}

// ── FINGER BUILDER ─────────────────────────────────────────
// Creates a 2-segment finger (proximal + distal phalanx) with joint spheres
// Returns { pivot (THREE.Group), mid (THREE.Group), tip (THREE.Group) }
// pivot goes at knuckle position on the palm group.
// Rotation of pivot.rotation.x/z drives the knuckle (IMU-driven).
function buildFinger(mat, proxLen, distLen) {
    const pivot = new THREE.Group(); // knuckle pivot

    // Proximal knuckle sphere
    const knuckleSphere = createJointSphere(0.17);
    pivot.add(knuckleSphere);

    // Proximal bone
    const proxBone = createBoneCylinder(mat, proxLen);
    pivot.add(proxBone);

    // Mid joint (PIP) — positioned at tip of proximal bone
    const midPivot = new THREE.Group();
    midPivot.position.z = proxLen; // end of proximal bone (along +Z)
    const midSphere = createJointSphere(0.13);
    midPivot.add(midSphere);

    // Distal bone
    const distBone = createBoneCylinder(mat, distLen);
    midPivot.add(distBone);

    // Tip sphere
    const tipSphere = createJointSphere(0.10);
    tipSphere.position.z = distLen;
    midPivot.add(tipSphere);

    pivot.add(midPivot);

    return { pivot, midPivot };
}

// ── PALM ───────────────────────────────────────────────────
// A flat rounded palm box as the base
const palmGeo = new THREE.BoxGeometry(3.2, 0.38, 4.0, 2, 1, 2);
const palmMesh = new THREE.Mesh(palmGeo, matPalm);
const palmWire = new THREE.Mesh(palmGeo, matPalmWire);
const palmGroup = new THREE.Group();
palmGroup.add(palmMesh);
palmGroup.add(palmWire);
scene.add(palmGroup);

// IMU sensor on back of hand
const backSensor = createSensorMarker();
backSensor.position.set(0, 0.32, 0.4);
palmGroup.add(backSensor);

// ── INDEX FINGER ───────────────────────────────────────────
const { pivot: indexPivot, midPivot: indexMid } = buildFinger(matIndex, 1.7, 1.3);
indexPivot.position.set(-0.9, 0.19, -2.0);
// IMU on index fingertip area
const indexSensor = createSensorMarker();
indexSensor.position.z = 1.3; // at distal tip
indexMid.add(indexSensor);
palmGroup.add(indexPivot);

// ── MIDDLE FINGER ──────────────────────────────────────────
const { pivot: middlePivot, midPivot: middleMid } = buildFinger(matMiddle, 1.85, 1.4);
middlePivot.position.set(0.2, 0.19, -2.0);
const middleSensor = createSensorMarker();
middleSensor.position.z = 1.4;
middleMid.add(middleSensor);
palmGroup.add(middlePivot);

// ── RING FINGER (no IMU, decorative) ──────────────────────
const { pivot: ringPivot } = buildFinger(
    new THREE.MeshLambertMaterial({ color: 0x34495e }), 1.75, 1.25
);
ringPivot.position.set(1.1, 0.19, -2.0);
palmGroup.add(ringPivot);

// ── PINKY (no IMU, decorative) ────────────────────────────
const { pivot: pinkyPivot } = buildFinger(
    new THREE.MeshLambertMaterial({ color: 0x2c3e50 }), 1.3, 1.0
);
pinkyPivot.position.set(1.85, 0.19, -1.6);
pinkyPivot.rotation.y = 0.15;
palmGroup.add(pinkyPivot);

// ── THUMB ──────────────────────────────────────────────────
const { pivot: thumbPivot, midPivot: thumbMid } = buildFinger(matThumb, 1.4, 1.1);
thumbPivot.position.set(-1.7, 0.19, 0.6);
thumbPivot.rotation.y = -Math.PI / 3.5;
thumbPivot.rotation.order = "YXZ";
const thumbSensor = createSensorMarker();
thumbSensor.position.z = 1.1;
thumbMid.add(thumbSensor);
palmGroup.add(thumbPivot);

// Slow idle rotate when no data
let idleRotate = true;
function animateIdle() {
    if (idleRotate) {
        palmGroup.rotation.y += 0.004;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animateIdle);
}
animateIdle();

window.addEventListener('resize', () => {
    camera.aspect = threeContainer.clientWidth / threeContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
});


// ==========================================
// 2. CHART.JS 2D SETUP — IMPROVED
// ==========================================
const CHART_WINDOW = 80; // more history visible

function createChart(canvasId, label, colors) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'X',
                    borderColor: colors[0],
                    backgroundColor: colors[0] + '18',
                    data: [],
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 1.8,
                    fill: false,
                },
                {
                    label: 'Y',
                    borderColor: colors[1],
                    backgroundColor: colors[1] + '18',
                    data: [],
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 1.8,
                    fill: false,
                },
                {
                    label: 'Z',
                    borderColor: colors[2],
                    backgroundColor: colors[2] + '18',
                    data: [],
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 1.8,
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    suggestedMin: -18,
                    suggestedMax: 18,
                    grid: { color: 'rgba(46,53,64,0.7)', drawBorder: false },
                    border: { color: '#232830' },
                    ticks: {
                        color: '#445060',
                        font: { family: "'Syne Mono', monospace", size: 9 },
                        maxTicksLimit: 5,
                        callback: v => v.toFixed(0)
                    }
                },
                x: { display: false }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#5a6475',
                        font: { family: "'Syne Mono', monospace", size: 9 },
                        boxWidth: 10,
                        boxHeight: 2,
                        padding: 8,
                        usePointStyle: true,
                        pointStyle: 'line'
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: '#0e1114',
                    borderColor: '#2e3540',
                    borderWidth: 1,
                    titleColor: '#5a6475',
                    bodyColor: '#e8eaed',
                    titleFont: { family: "'Syne Mono', monospace", size: 9 },
                    bodyFont: { family: "'Syne Mono', monospace", size: 10 },
                    padding: 8,
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`
                    }
                }
            }
        }
    });
}

// Sensor color sets: [X, Y, Z]
const handChart   = createChart('handChart',   'Palm',   ['#f47575', '#6eb8f7', '#7be0a8']);
const indexChart  = createChart('indexChart',  'Index',  ['#ff7043', '#42a5f5', '#66bb6a']);
const middleChart = createChart('middleChart', 'Middle', ['#ef5350', '#29b6f6', '#26a69a']);
const thumbChart  = createChart('thumbChart',  'Thumb',  ['#ec407a', '#5c6bc0', '#8d6e63']);


// ==========================================
// 3 & 4. AUTOMATED AUTH LOGIC & WEB SERIAL
// ==========================================
let savedTemplate = [], currentTest = [];
let isRecordingTemplate = false, isTesting = false;

const statusText = document.getElementById('statusText');
const connectBtn = document.getElementById('connectBtn');
const scoreValue = document.getElementById('scoreValue');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');

document.getElementById('recordTemplateBtn').addEventListener('click', () => {
    savedTemplate = [];
    statusText.innerText = "Template cleared. Place hand to record new template.";
    scoreValue.innerText = "—";
});

function startProgressBar() {
    progressWrap.classList.add('visible');
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    setTimeout(() => {
        progressBar.style.transition = 'width 5s linear';
        progressBar.style.width = '100%';
    }, 50);
}

// 3D Math Functions
let isCalibrated = false;
let offsetPitch = [0, 0, 0, 0], offsetRoll = [0, 0, 0, 0];
function calcPitch(y, z) { return Math.atan2(y, z); }
function calcRoll(x, y, z) { return Math.atan2(-x, Math.sqrt(y * y + z * z)); }

let port, reader, timeCount = 0;

async function connectSerial() {
    if (port) { alert("Port is already open."); return; }

    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        idleRotate = false;
        palmGroup.rotation.y = 0;

        connectBtn.innerText = "Connected!";
        connectBtn.classList.add('connected');
        statusText.innerText = "Keep hand flat. Waiting for data to calibrate...";
        statusText.style.color = "var(--blue)";

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
                if (!line) continue;

                if (line === "HAND_DETECTED") {
                    statusText.innerText = "Hand detected. Arming system...";
                    statusText.style.color = "var(--blue)";
                    continue;
                }
                if (line === "HAND_REMOVED") {
                    statusText.innerText = "Session cleared. Waiting for hand...";
                    statusText.style.color = "var(--muted)";
                    progressWrap.classList.remove('visible');
                    isRecordingTemplate = false;
                    isTesting = false;
                    continue;
                }
                if (line === "AUTH_START") {
                    startProgressBar();
                    if (savedTemplate.length === 0) {
                        isRecordingTemplate = true;
                        statusText.innerText = "RECORDING TEMPLATE... Perform gesture!";
                        statusText.style.color = "var(--amber)";
                    } else {
                        currentTest = [];
                        isTesting = true;
                        statusText.innerText = "TESTING GESTURE... Match the template!";
                        statusText.style.color = "var(--amber)";
                    }
                    continue;
                }
                if (line === "AUTH_STOP") {
                    progressWrap.classList.remove('visible');
                    if (isRecordingTemplate) {
                        isRecordingTemplate = false;
                        document.getElementById('templatePts').innerText = savedTemplate.length;
                        statusText.innerText = `Template Saved! Place hand again to test.`;
                        statusText.style.color = "var(--accent2)";
                    } else if (isTesting) {
                        isTesting = false;
                        document.getElementById('testPts').innerText = currentTest.length;
                        const dtwScore = calculateMultiDTW(savedTemplate, currentTest);
                        scoreValue.innerText = dtwScore.toFixed(2);

                        if (dtwScore < 30.0) {
                            statusText.innerText = `✅ ACCESS GRANTED`;
                            statusText.style.color = "var(--accent2)";
                            scoreValue.className = "score-value ok";
                        } else {
                            statusText.innerText = `❌ ACCESS DENIED`;
                            statusText.style.color = "var(--red)";
                            scoreValue.className = "score-value err";
                        }
                    }
                    continue;
                }

                if (/[a-zA-Z]/.test(line)) continue;

                const vals = line.split(',').map(Number);
                if (vals.length !== 12 || vals.some(isNaN)) continue;

                if (isRecordingTemplate) savedTemplate.push(vals);
                if (isTesting) currentTest.push(vals);

                // --- 3D CALIBRATION & RENDERING ---
                // Data layout: [hand(0-2), index(3-5), middle(6-8), thumb(9-11)]
                const p0 = calcPitch(vals[1], vals[2]),  r0 = calcRoll(vals[0], vals[1], vals[2]);
                const p1 = calcPitch(vals[4], vals[5]),  r1 = calcRoll(vals[3], vals[4], vals[5]);
                const p2 = calcPitch(vals[7], vals[8]),  r2 = calcRoll(vals[6], vals[7], vals[8]);
                const p3 = calcPitch(vals[10], vals[11]), r3 = calcRoll(vals[9], vals[10], vals[11]);

                if (!isCalibrated) {
                    offsetPitch = [p0, p1, p2, p3];
                    offsetRoll  = [r0, r1, r2, r3];
                    isCalibrated = true;
                    statusText.innerText = "✅ Calibrated! Place hand in box to begin.";
                    statusText.style.color = "var(--accent2)";
                }

                // Palm rotation (back-of-hand IMU, sensor 0)
                palmGroup.rotation.x = p0 - offsetPitch[0];
                palmGroup.rotation.z = r0 - offsetRoll[0];

                // Index finger — relative to palm
                indexPivot.rotation.x = (p1 - offsetPitch[1]) - palmGroup.rotation.x;
                indexPivot.rotation.z = (r1 - offsetRoll[1])  - palmGroup.rotation.z;

                // Middle finger — relative to palm
                middlePivot.rotation.x = (p2 - offsetPitch[2]) - palmGroup.rotation.x;
                middlePivot.rotation.z = (r2 - offsetRoll[2])  - palmGroup.rotation.z;

                // Thumb — relative to palm
                thumbPivot.rotation.x = (p3 - offsetPitch[3]) - palmGroup.rotation.x;
                thumbPivot.rotation.z = (r3 - offsetRoll[3])  - palmGroup.rotation.z;

                // UPDATE 2D CHARTS
                [handChart, indexChart, middleChart, thumbChart].forEach((chart, idx) => {
                    const offset = idx * 3;
                    chart.data.labels.push(timeCount);
                    chart.data.datasets[0].data.push(vals[offset]);
                    chart.data.datasets[1].data.push(vals[offset + 1]);
                    chart.data.datasets[2].data.push(vals[offset + 2]);
                    if (chart.data.labels.length > CHART_WINDOW) {
                        chart.data.labels.shift();
                        chart.data.datasets.forEach(d => d.data.shift());
                    }
                    chart.update('none'); // skip animation entirely for perf
                });
                timeCount++;
            }
        }
    } catch (error) {
        console.error(error);
        statusText.innerText = "Error: Port Locked or Browser Denied Access.";
        statusText.style.color = "var(--red)";
    }
}

connectBtn.addEventListener('click', connectSerial);

// ==========================================
// THE 12-DIMENSIONAL DTW MATH ENGINE
// ==========================================
function calculateMultiDTW(template, liveGesture) {
    const n = template.length, m = liveGesture.length;
    if (n === 0 || m === 0) return Infinity;

    const dtw = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const t = template[i - 1], l = liveGesture[j - 1];

            const cost = Math.sqrt(
                Math.pow(t[0]-l[0],2)  + Math.pow(t[1]-l[1],2)  + Math.pow(t[2]-l[2],2)  +
                Math.pow(t[3]-l[3],2)  + Math.pow(t[4]-l[4],2)  + Math.pow(t[5]-l[5],2)  +
                Math.pow(t[6]-l[6],2)  + Math.pow(t[7]-l[7],2)  + Math.pow(t[8]-l[8],2)  +
                Math.pow(t[9]-l[9],2)  + Math.pow(t[10]-l[10],2)+ Math.pow(t[11]-l[11],2)
            );

            dtw[i][j] = cost + Math.min(dtw[i-1][j], dtw[i][j-1], dtw[i-1][j-1]);
        }
    }

    return dtw[n][m] / Math.max(n, m);
}
