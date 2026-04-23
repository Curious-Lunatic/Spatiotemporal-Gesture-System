// ==========================================
// 1. THREE.JS 3D SKELETAL HAND SETUP
// ==========================================
const threeContainer = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(45, threeContainer.clientWidth / threeContainer.clientHeight, 0.1, 100);
camera.position.set(0, 9, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
threeContainer.appendChild(renderer.domElement);

// ── MATERIALS — original wireframe/solid aesthetic ─────────
const MAT_INDEX  = new THREE.MeshBasicMaterial({ color: 0xff5252 });
const MAT_MIDDLE = new THREE.MeshBasicMaterial({ color: 0x4caf50 });
const MAT_RING   = new THREE.MeshBasicMaterial({ color: 0x556677 });
const MAT_PINKY  = new THREE.MeshBasicMaterial({ color: 0x3a4a58 });
const MAT_THUMB  = new THREE.MeshBasicMaterial({ color: 0x448aff });
const MAT_JOINT  = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
const MAT_SENSOR = new THREE.MeshBasicMaterial({ color: 0xf0c060, wireframe: true });
const MAT_PALM   = new THREE.LineBasicMaterial({ color: 0x445566 });
const MAT_BRACE  = new THREE.LineBasicMaterial({ color: 0x1e2d3d });

// ── JOINT SPHERE ───────────────────────────────────────────
function makeJoint(r = 0.17) {
    return new THREE.Mesh(new THREE.SphereGeometry(r, 7, 7), MAT_JOINT);
}

// Amber sensor marker
function makeSensor(r = 0.24) {
    return new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), MAT_SENSOR);
}

// Tapered cylinder bone extending in +Z from its origin
function makeBone(mat, length, rBase = 0.10, rTip = 0.055) {
    const g = new THREE.CylinderGeometry(rTip, rBase, length, 7);
    g.translate(0, -length / 2, 0);
    g.rotateX(-Math.PI / 2);
    return new THREE.Mesh(g, mat);
}

// ── FINGER BUILDER ─────────────────────────────────────────
// Returns { root, pip, dip } — all THREE.Group pivots.
// root = MCP knuckle (position on palm, driven by IMU)
// pip  = PIP knuckle (position at end of proximal bone)
// dip  = DIP knuckle (position at end of middle bone)
// By exposing pip & dip we can drive each joint independently
// to distribute the total curl angle anatomically.
function buildFinger(mat, pLen, mLen, dLen, hasSensor) {
    const root = new THREE.Group();   // MCP pivot

    root.add(makeJoint(0.16));
    root.add(makeBone(mat, pLen));

    const pip = new THREE.Group();
    pip.position.z = pLen;
    pip.add(makeJoint(0.13));
    pip.add(makeBone(mat, mLen, 0.08, 0.05));

    const dip = new THREE.Group();
    dip.position.z = mLen;
    dip.add(makeJoint(0.10));
    dip.add(makeBone(mat, dLen, 0.06, 0.03));

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), mat);
    tip.position.z = dLen;
    dip.add(tip);

    if (hasSensor) {
        const s = makeSensor(0.20);
        s.position.z = dLen * 0.5;
        dip.add(s);
    }

    pip.add(dip);
    root.add(pip);
    return { root, pip, dip };
}

// ── THUMB BUILDER ──────────────────────────────────────────
// Thumb has only 2 phalanges visible (metacarpal + proximal + distal)
// and a different natural curl axis due to its CMC orientation.
function buildThumb(mat, pLen, mLen, dLen, hasSensor) {
    const root = new THREE.Group();   // CMC/MCP pivot

    root.add(makeJoint(0.18));
    root.add(makeBone(mat, pLen, 0.12, 0.07));

    const pip = new THREE.Group();
    pip.position.z = pLen;
    pip.add(makeJoint(0.14));
    pip.add(makeBone(mat, mLen, 0.09, 0.055));

    const dip = new THREE.Group();
    dip.position.z = mLen;
    dip.add(makeJoint(0.11));
    dip.add(makeBone(mat, dLen, 0.07, 0.04));

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), mat);
    tip.position.z = dLen;
    dip.add(tip);

    if (hasSensor) {
        const s = makeSensor(0.22);
        s.position.z = dLen * 0.4;
        dip.add(s);
    }

    pip.add(dip);
    root.add(pip);
    return { root, pip, dip };
}

// ── PALM GROUP ─────────────────────────────────────────────
const palmGroup = new THREE.Group();
scene.add(palmGroup);

const palmPts = [
    new THREE.Vector3(-1.35, 0,  1.9),
    new THREE.Vector3( 1.65, 0,  1.9),
    new THREE.Vector3( 1.65, 0, -1.0),
    new THREE.Vector3(-1.35, 0, -1.0),
    new THREE.Vector3(-1.35, 0,  1.9),
];
palmGroup.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(palmPts), MAT_PALM
));

palmGroup.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([palmPts[0], palmPts[2]]), MAT_BRACE
));
palmGroup.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([palmPts[1], palmPts[3]]), MAT_BRACE
));

palmGroup.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.35, 0, 1.9),
        new THREE.Vector3(-0.7,  0, 2.7),
        new THREE.Vector3( 0.7,  0, 2.7),
        new THREE.Vector3( 1.65, 0, 1.9),
    ]), MAT_BRACE
));

// Back-of-hand IMU sensor (sensor 0)
const backSensor = makeSensor(0.28);
backSensor.position.set(0.15, 0, 0.45);
palmGroup.add(backSensor);

// ── FINGERS ────────────────────────────────────────────────
const index  = buildFinger(MAT_INDEX,  1.55, 0.95, 0.75, true);
index.root.position.set(-0.90, 0, -1.0);
palmGroup.add(index.root);

const middle = buildFinger(MAT_MIDDLE, 1.70, 1.05, 0.80, true);
middle.root.position.set(0.05, 0, -1.0);
palmGroup.add(middle.root);

const ring   = buildFinger(MAT_RING,   1.60, 0.98, 0.75, false);
ring.root.position.set(0.95, 0, -1.0);
palmGroup.add(ring.root);

const pinky  = buildFinger(MAT_PINKY,  1.15, 0.72, 0.55, false);
pinky.root.position.set(1.60, 0, -0.75);
pinky.root.rotation.y = 0.14;
palmGroup.add(pinky.root);

const thumb  = buildThumb(MAT_THUMB,   1.20, 0.85, 0.65, true);
thumb.root.position.set(-1.55, 0, 0.55);
thumb.root.rotation.order = "YXZ";
thumb.root.rotation.y = -Math.PI / 3.2;
thumb.root.rotation.z = -0.20;
palmGroup.add(thumb.root);

// ── IDLE ROTATION ──────────────────────────────────────────
let idleRotate = true;
(function animate() {
    requestAnimationFrame(animate);
    if (idleRotate) palmGroup.rotation.y += 0.005;
    renderer.render(scene, camera);
})();

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
        data: {
            labels: [],
            datasets: [
                { label: 'X', borderColor: '#f47575', backgroundColor: 'rgba(244,117,117,0.06)', data: [], tension: 0.3, pointRadius: 0, borderWidth: 1.8, fill: false },
                { label: 'Y', borderColor: '#6eb8f7', backgroundColor: 'rgba(110,184,247,0.06)', data: [], tension: 0.3, pointRadius: 0, borderWidth: 1.8, fill: false },
                { label: 'Z', borderColor: '#7be0a8', backgroundColor: 'rgba(123,224,168,0.06)', data: [], tension: 0.3, pointRadius: 0, borderWidth: 1.8, fill: false }
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
                    grid: { color: '#181e24', drawBorder: false },
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
                        boxWidth: 20,
                        boxHeight: 2,
                        padding: 8,
                        usePointStyle: false
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

const handChart   = createChart('handChart');
const indexChart  = createChart('indexChart');
const middleChart = createChart('middleChart');
const thumbChart  = createChart('thumbChart');


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

// Remove manual button dependencies, keep them for reset purposes if needed
document.getElementById('recordTemplateBtn').addEventListener('click', () => {
    statusText.innerText = "Place hand in box to record new template.";
    statusText.style.color = "var(--blue)";
});
document.getElementById('resetTemplateBtn').addEventListener('click', () => {
    if (savedTemplate.length === 0) {
        statusText.innerText = "No template to reset.";
        statusText.style.color = "var(--muted)";
        return;
    }

    savedTemplate = [];
    currentTest = [];

    isRecordingTemplate = false;
    isTesting = false;
    progressWrap.classList.remove('visible');

    document.getElementById('templatePts').innerText = "0";
    document.getElementById('testPts').innerText = "0";

    scoreValue.innerText = "—";
    scoreValue.className = "score-value";

    statusText.innerText = "🔄 Password reset. Perform new gesture to record.";
    statusText.style.color = "var(--amber)";
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

// ── ANGLE DISTRIBUTION HELPERS ─────────────────────────────
// The IMU sits on the distal phalanx and measures the total
// angle of the whole finger relative to the back of the hand.
// We distribute that total angle across MCP / PIP / DIP in
// anatomically realistic proportions so each joint actually
// bends — making the curl visually convincing.
//
// Curl (flexion) anatomy ratios (approximate from biomechanics):
//   MCP  ~40%   PIP  ~45%   DIP  ~15%
// Abduction (side-spread) lives almost entirely at the MCP:
//   MCP ~100%   PIP/DIP ~0%
//
// We also clamp angles so joints can't hyper-extend.

function distributeFingerCurl(totalCurl, totalSpread) {
    // clamp curl to [-PI/2 .. PI*0.9] (flex range, no hyper-extension)
    const curl = Math.max(-Math.PI / 2, Math.min(Math.PI * 0.9, totalCurl));
    const spread = Math.max(-0.4, Math.min(0.4, totalSpread));
    return {
        mcpCurl:   curl  * 0.40,
        pipCurl:   curl  * 0.45,
        dipCurl:   curl  * 0.15,
        mcpSpread: spread * 1.00,
    };
}

function distributeThumbCurl(totalCurl, totalSpread) {
    // Thumb has a wider natural range and less DIP
    const curl   = Math.max(-0.4, Math.min(Math.PI * 0.75, totalCurl));
    const spread = Math.max(-0.5, Math.min(0.5, totalSpread));
    return {
        mcpCurl:   curl  * 0.50,
        pipCurl:   curl  * 0.40,
        dipCurl:   curl  * 0.10,
        mcpSpread: spread * 0.8,
    };
}

// Apply computed joint angles to a finger's root/pip/dip groups.
// curlAxis = 'x' for fingers (finger extends in +Z, curl rotates around X)
// spreadAxis = 'z' for fingers extending from palm
function applyFingerAngles(finger, curlTotal, spreadTotal, isThumb = false) {
    const dist = isThumb
        ? distributeThumbCurl(curlTotal, spreadTotal)
        : distributeFingerCurl(curlTotal, spreadTotal);

    finger.root.rotation.x = dist.mcpCurl;
    finger.root.rotation.z = dist.mcpSpread;
    finger.pip.rotation.x  = dist.pipCurl;
    finger.dip.rotation.x  = dist.dipCurl;
}

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
            buffer = lines.pop(); // Save incomplete chunk

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

// --- INTERCEPT HARDWARE STATE COMMANDS ---
                if (line === "HAND_DETECTED") {
                    // Start the UI prep phase
                    statusText.innerText = "Hand detected. Arming system...";
                    statusText.style.color = "var(--blue)";
                    continue;
                }
                if (line === "HAND_REMOVED") {
                    // Because of the Box's new grace period, if this triggers, the hand is TRULY gone.
                    statusText.innerText = "Session cleared. Waiting for hand...";
                    statusText.style.color = "var(--muted)";
                    progressWrap.classList.remove('visible');
                    // Reset internal states so it doesn't get stuck waiting for a gesture
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

                // FILTER GARBAGE
                if (/[a-zA-Z]/.test(line)) continue;

                const vals = line.split(',').map(Number);
                if (vals.length !== 12 || vals.some(isNaN)) continue;

                // DATA CAPTURE
                if (isRecordingTemplate) savedTemplate.push(vals);
                if (isTesting) currentTest.push(vals);

                // --- 3D CALIBRATION & RENDERING ---
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

                // Palm driven by back-of-hand IMU
                palmGroup.rotation.x = p0 - offsetPitch[0];
                palmGroup.rotation.z = r0 - offsetRoll[0];

                // Relative angles for each finger sensor vs palm
                const indexCurl   = (p1 - offsetPitch[1]) - palmGroup.rotation.x;
                const indexSpread = (r1 - offsetRoll[1])  - palmGroup.rotation.z;

                const middleCurl   = (p2 - offsetPitch[2]) - palmGroup.rotation.x;
                const middleSpread = (r2 - offsetRoll[2])  - palmGroup.rotation.z;

                const thumbCurl   = (p3 - offsetPitch[3]) - palmGroup.rotation.x;
                const thumbSpread = (r3 - offsetRoll[3])  - palmGroup.rotation.z;

                // Distribute angles across joints for natural-looking bend
                applyFingerAngles(index,  indexCurl,  indexSpread,  false);
                applyFingerAngles(middle, middleCurl, middleSpread, false);
                applyFingerAngles(thumb,  thumbCurl,  thumbSpread,  true);

                // UPDATE 2D CHARTS
                [handChart, indexChart, middleChart, thumbChart].forEach((chart, idx) => {
                    const offset = idx * 3;
                    chart.data.labels.push(timeCount);
                    chart.data.datasets[0].data.push(vals[offset]);
                    chart.data.datasets[1].data.push(vals[offset + 1]);
                    chart.data.datasets[2].data.push(vals[offset + 2]);
                    if (chart.data.labels.length > 60) {
                        chart.data.labels.shift();
                        chart.data.datasets.forEach(d => d.data.shift());
                    }
                    chart.update('none');
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
            const t = template[i-1], l = liveGesture[j-1];

            // Calculate the 12-DOF Euclidean distance between the two frames
            const cost = Math.sqrt(
                Math.pow(t[0]-l[0],2) + Math.pow(t[1]-l[1],2) + Math.pow(t[2]-l[2],2) +
                Math.pow(t[3]-l[3],2) + Math.pow(t[4]-l[4],2) + Math.pow(t[5]-l[5],2) +
                Math.pow(t[6]-l[6],2) + Math.pow(t[7]-l[7],2) + Math.pow(t[8]-l[8],2) +
                Math.pow(t[9]-l[9],2) + Math.pow(t[10]-l[10],2) + Math.pow(t[11]-l[11],2)
            );

            dtw[i][j] = cost + Math.min(dtw[i-1][j], dtw[i][j-1], dtw[i-1][j-1]);
        }
    }

    // Normalize the score based on how long the gesture took
    return dtw[n][m] / Math.max(n, m);
}
