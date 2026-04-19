// ==========================================
// 1. THREE.JS 3D SKELETAL HAND SETUP
// ==========================================
const threeContainer = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a10); // Slight blue/purple cyber tint to the black

// Add a glowing grid to the floor for that "JS Tracker" spatial vibe
const gridHelper = new THREE.GridHelper(20, 20, 0x444455, 0x222233);
gridHelper.position.y = -3;
scene.add(gridHelper);

const camera = new THREE.PerspectiveCamera(45, threeContainer.clientWidth / threeContainer.clientHeight, 0.1, 100);
camera.position.set(0, 8, 8); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
threeContainer.appendChild(renderer.domElement);

// --- VISUAL UPGRADE: NEON GLOW MATERIALS ---
// We use MeshBasicMaterial because it ignores lights and looks like pure, glowing neon
function createBone(colorHex, length) {
    const pivot = new THREE.Group(); 
    
    // The Joint Node (Knuckle) - slightly larger, pure white wireframe
    const nodeGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.8 });
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    
    // The Vector Line (Cylinder)
    const boneGeo = new THREE.CylinderGeometry(0.08, 0.02, length, 12);
    boneGeo.translate(0, -length / 2, 0);
    boneGeo.rotateX(-Math.PI / 2);
    
    const boneMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 }); 
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
const palmFrame = new THREE.Line(palmGeo, new THREE.LineBasicMaterial({ color: 0x666688, transparent: true, opacity: 0.5 }));
scene.add(palmFrame);

// 2. The Fingers
const indexJoint = createBone(0xff2a2a, 3.5); // Neon Red
indexJoint.position.set(-0.8, 0, -2);
palmFrame.add(indexJoint);

const middleJoint = createBone(0x2aff2a, 3.5); // Neon Green
middleJoint.position.set(0.8, 0, -2);
palmFrame.add(middleJoint);

const thumbJoint = createBone(0x2a8aff, 2.5); // Neon Blue
thumbJoint.position.set(-1.6, 0, 0);
thumbJoint.rotation.y = -Math.PI / 4; 
thumbJoint.rotation.order = "YXZ"; 
palmFrame.add(thumbJoint);

window.addEventListener('resize', () => {
    camera.aspect = threeContainer.clientWidth / threeContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
});

// ==========================================
// 2. THE FLUID ANIMATION LOOP (THE SECRET SAUCE)
// ==========================================
// Instead of snapping immediately, we store the "Target" angles here.
const targets = {
    palm: { x: 0, z: 0 },
    index: { x: 0, z: 0 },
    middle: { x: 0, z: 0 },
    thumb: { x: 0, z: 0 }
};

// Controls how "buttery" the movement is. 
// 0.1 means it moves 10% of the distance to the target every frame. (Lower = smoother but laggier. Higher = snappier)
const smoothFactor = 0.15; 

function animate() {
    requestAnimationFrame(animate);

    // Smoothly glide the actual 3D rotations toward the Target rotations
    palmFrame.rotation.x = THREE.MathUtils.lerp(palmFrame.rotation.x, targets.palm.x, smoothFactor);
    palmFrame.rotation.z = THREE.MathUtils.lerp(palmFrame.rotation.z, targets.palm.z, smoothFactor);

    indexJoint.rotation.x = THREE.MathUtils.lerp(indexJoint.rotation.x, targets.index.x, smoothFactor);
    indexJoint.rotation.z = THREE.MathUtils.lerp(indexJoint.rotation.z, targets.index.z, smoothFactor);

    middleJoint.rotation.x = THREE.MathUtils.lerp(middleJoint.rotation.x, targets.middle.x, smoothFactor);
    middleJoint.rotation.z = THREE.MathUtils.lerp(middleJoint.rotation.z, targets.middle.z, smoothFactor);

    thumbJoint.rotation.x = THREE.MathUtils.lerp(thumbJoint.rotation.x, targets.thumb.x, smoothFactor);
    thumbJoint.rotation.z = THREE.MathUtils.lerp(thumbJoint.rotation.z, targets.thumb.z, smoothFactor);

    // Render at a constant 60FPS, completely ignoring the Serial Port speed
    renderer.render(scene, camera);
}
// Start the engine
animate();


// ==========================================
// 3. WEB SERIAL (DATA ONLY, NO RENDERING)
// ==========================================
let port, reader;
const connectBtn = document.getElementById('connectBtn');
const statusText = document.getElementById('statusText');

function calcPitch(y, z) { return Math.atan2(y, z); }
function calcRoll(x, y, z) { return Math.atan2(-x, Math.sqrt(y * y + z * z)); }

async function connectSerial() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        
        connectBtn.innerText = "Connected!"; 
        connectBtn.style.backgroundColor = "#4caf50";

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

                    // 1. Calculate Absolute Palm Rotation
                    const palmPitch = calcPitch(vals[1], vals[2]);
                    const palmRoll = calcRoll(vals[0], vals[1], vals[2]);
                    
                    // 2. UPDATE TARGETS ONLY (Do not touch the Three.js meshes directly here)
                    targets.palm.x = palmPitch;
                    targets.palm.z = palmRoll;

                    targets.index.x = calcPitch(vals[4], vals[5]) - palmPitch;
                    targets.index.z = calcRoll(vals[3], vals[4], vals[5]) - palmRoll;
                    
                    targets.middle.x = calcPitch(vals[7], vals[8]) - palmPitch;
                    targets.middle.z = calcRoll(vals[6], vals[7], vals[8]) - palmRoll;

                    targets.thumb.x = calcPitch(vals[10], vals[11]) - palmPitch;
                    targets.thumb.z = calcRoll(vals[9], vals[10], vals[11]) - palmRoll;
                    
                    // Notice: renderer.render() is GONE from here.
                    
                    // (You can still run your Chart.js and DTW array pushes here as normal)
                }
            }
        }
    } catch (error) {
        statusText.innerText = "Error: Could not connect to serial port."; 
        statusText.style.color = "#ff5252";
    }
}

connectBtn.addEventListener('click', connectSerial);