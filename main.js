// --- Application Global State Management ---
const STATE = {
    currentView: 'OUTSIDE', // 'OUTSIDE' | 'TRANSITIONING' | 'INSIDE'
    targetMouse: { x: 0, y: 0 },
    currentMouse: { x: 0, y: 0 },
    characters: {},
    activeBubbles: [],
    hoveredObj: null,
    radio: {
        isPlaying: true,
        currentStation: 0,
        // UPDATED: New radio station names
        stations: [
            "Groupies FM", 
            "mzika ajmi", 
            "mzika dl makla", 
            "chilling o sf hh", 
            "chwya dyal fetah"
        ]
    }
};

const DIALOGUES = {
    sarah: "hiiii ana sara o safi sero thowaw rawr",
    power: "wa khoti ash had l7wi",
    hakim: "3afak a mehdzi khlini nzid gha dghma",
    mehdzi: "wa baraka azobey ra ghadi n3yt lik 3la wadie",
    dxio: "t7wina bkri",
    bahae: "waa kanbghi shabeey"
};

// --- Viewport Stage Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbae4fc);
scene.fog = new THREE.FogExp2(0xbae4fc, 0.012);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5.5, 15);
camera.lookAt(0, 1.8, 0);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('webgl-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- Ambient Cartoon Light Rig ---
const ambientLight = new THREE.HemisphereLight(0xffffff, 0x73a1e6, 0.65);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e3, 1.35);
sunLight.position.set(15, 22, 12);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 40;
const d = 16;
sunLight.shadow.camera.left = -d; sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d; sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.0004;
scene.add(sunLight);

// --- High-Fidelity Outdoor Environment ---
const worldGroup = new THREE.Group();
scene.add(worldGroup);

// Rolling Stylized Landscape Hill Ground
const groundMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 27, 4, 40), 
    new THREE.MeshStandardMaterial({ color: 0x7cc255, roughness: 0.95 })
);
groundMesh.position.y = -2;
groundMesh.receiveShadow = true;
worldGroup.add(groundMesh);

// Cobblestone Pathway Layers
for(let i = 0; i < 7; i++) {
    const stone = new THREE.Mesh(
        new THREE.BoxGeometry(1.5 - (i*0.08), 0.08, 0.85), 
        new THREE.MeshStandardMaterial({ color: 0xded4c5, roughness: 0.9 })
    );
    stone.position.set(Math.sin(i * 1.2) * 0.25, -0.01, 3.6 + (i * 1.15));
    stone.rotation.y = Math.sin(i) * 0.15;
    stone.receiveShadow = true;
    worldGroup.add(stone);
}

// Background Mountain Geometry Peak Rows
const mountainMat = new THREE.MeshStandardMaterial({ color: 0x98b8c6, roughness: 0.95, flatShading: true });
function createMountainMesh(x, z, h, r) {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), mountainMat);
    mesh.position.set(x, h/2 - 2, z);
    worldGroup.add(mesh);
}
createMountainMesh(-18, -14, 10, 6);
createMountainMesh(19, -15, 9, 5.5);
createMountainMesh(-10, -22, 14, 8);

// --- Cartoon Architectural Shell ---
const houseGroup = new THREE.Group();
worldGroup.add(houseGroup);

const houseWallMat = new THREE.MeshStandardMaterial({ color: 0xfffcf2, roughness: 0.65 });
const baseBox = new THREE.Mesh(new THREE.BoxGeometry(7.6, 4.8, 7.6), houseWallMat);
baseBox.position.y = 2.4;
baseBox.castShadow = true;
baseBox.receiveShadow = true;
houseGroup.add(baseBox);

const roofMesh = new THREE.Mesh(
    new THREE.ConeGeometry(6.3, 2.9, 4), 
    new THREE.MeshStandardMaterial({ color: 0xdf4e36, roughness: 0.55 })
);
roofMesh.position.y = 6.25;
roofMesh.rotation.y = Math.PI / 4;
roofMesh.castShadow = true;
houseGroup.add(roofMesh);

// Fixed Custom Hinge Framing Mechanism
const doorHingeAssembly = new THREE.Group();
doorHingeAssembly.position.set(-0.8, 0, 3.81); 
houseGroup.add(doorHingeAssembly);

const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0x995331, roughness: 0.6 });
const doorPanelMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.5, 0.16), doorPanelMat);
doorPanelMesh.position.set(0.8, 1.25, 0); 
doorPanelMesh.castShadow = true;
doorPanelMesh.name = "DOOR_CLICKABLE_TARGET";
doorHingeAssembly.add(doorPanelMesh);

const knobMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffcb4c, metalness: 0.85 }));
knobMesh.position.set(1.35, 1.25, 0.1);
doorPanelMesh.add(knobMesh);

// Environment Tree Layout Engine Spawner
function spawnPoplarTree(x, z, s) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 2), new THREE.MeshStandardMaterial({ color: 0x694236 }));
    trunk.position.y = 1; trunk.castShadow = true; tree.add(trunk);

    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), new THREE.MeshStandardMaterial({ color: 0x66b054, roughness: 0.85 }));
    leaves.position.y = 2.3; leaves.scale.set(1, 1.5, 1); leaves.castShadow = true; tree.add(leaves);

    tree.scale.setScalar(s);
    worldGroup.add(tree);
}
spawnPoplarTree(-6.5, -4, 1.2); spawnPoplarTree(6.5, -5, 1.1);
spawnPoplarTree(-7.5, 2, 0.9); spawnPoplarTree(8, 3, 1.25);

// --- Interior Scene Elements Architecture ---
const interiorGroup = new THREE.Group();
scene.add(interiorGroup);

const intFloor = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.05, 7.3), new THREE.MeshStandardMaterial({ color: 0xebd3a0, roughness: 0.85 }));
intFloor.position.y = 0.02; intFloor.receiveShadow = true; interiorGroup.add(intFloor);

const wallpaperWall = new THREE.Mesh(new THREE.BoxGeometry(7.3, 4.4, 0.05), new THREE.MeshStandardMaterial({ color: 0xf5f0e1 }));
wallpaperWall.position.set(0, 2.2, -3.65); interiorGroup.add(wallpaperWall);

// Living Room Section Sofa Couch Set
const couchGroup = new THREE.Group();
couchGroup.position.set(-1.9, 0, -1.3);
interiorGroup.add(couchGroup);

const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.6, 1.3), new THREE.MeshStandardMaterial({ color: 0x4ecdc4, roughness: 0.6 }));
sofaBase.position.y = 0.3; sofaBase.castShadow = true; couchGroup.add(sofaBase);

const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.1, 0.35), new THREE.MeshStandardMaterial({ color: 0x3abbbb, roughness: 0.6 }));
sofaBack.position.set(0, 0.85, -0.45); sofaBack.castShadow = true; couchGroup.add(sofaBack);

const rugMesh = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.02, 1.6), new THREE.MeshStandardMaterial({ color: 0xff868e, roughness: 1.0 }));
rugMesh.position.set(-1.9, 0.03, 0.5); interiorGroup.add(rugMesh);

// Kitchen Setup
const kitchenGroup = new THREE.Group();
kitchenGroup.position.set(2.1, 0, -1.7);
interiorGroup.add(kitchenGroup);

const counterUnit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 3.2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }));
counterUnit.position.y = 0.55; counterUnit.castShadow = true; kitchenGroup.add(counterUnit);

const tableUnit = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 1.3), new THREE.MeshStandardMaterial({ color: 0xd69965, roughness: 0.6 }));
tableUnit.position.set(-1.1, 0.42, 0.2); tableUnit.castShadow = true; kitchenGroup.add(tableUnit);

// Radio Mesh Assembly
const radioMesh = new THREE.Group();
radioMesh.position.set(2.0, 1.1, -1.1);
radioMesh.name = "RADIO_OBJECT";

const radioBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.38), new THREE.MeshStandardMaterial({ color: 0xffbd66, roughness: 0.3 }));
radioBox.castShadow = true; radioMesh.add(radioBox);

const antennaMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45), new THREE.MeshStandardMaterial({ color: 0x333333 }));
antennaMesh.position.set(0.12, 0.35, 0); antennaMesh.rotation.z = 0.35; radioMesh.add(antennaMesh);
interiorGroup.add(radioMesh);

// --- High-Fidelity Chibi Figurine Character Engine ---
function createFallbackFace(label) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffdbb5'; ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#2e221f'; ctx.lineWidth = 6; ctx.strokeRect(4, 4, 120, 120);
    
    // Large Anime/Chibi Eye Circles
    ctx.fillStyle = '#2e221f';
    ctx.beginPath(); ctx.arc(38, 52, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(90, 52, 11, 0, Math.PI * 2); ctx.fill();
    
    // Catchlight dots
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(41, 49, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(93, 49, 3, 0, Math.PI * 2); ctx.fill();
    
    // Cute smile vector arc
    ctx.strokeStyle = '#2e221f'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(64, 76, 22, 0, Math.PI); ctx.stroke();
    
    // Dynamic Bottom Text Name Tag Layer
    ctx.fillStyle = '#ff6f59'; ctx.fillRect(4, 100, 120, 24);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(label.toUpperCase(), 64, 117);
    
    return new THREE.CanvasTexture(canvas);
}

const textureLoader = new THREE.TextureLoader();

function spawnChibiCharacter(id, name, filename, shirtColor) {
    const rootGroup = new THREE.Group();
    rootGroup.name = `CHAR_${id}`;
    rootGroup.userData = { id, name };

    // 1. Stylized Weighted Chibi Hoodie Body Shape (Tapered cone + rounded bottom rim)
    const bodyGroup = new THREE.Group();
    rootGroup.add(bodyGroup);

    const torsoMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.48, 1.1, 16), 
        new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.5, flatShading: false })
    );
    torsoMesh.position.y = 0.55;
    torsoMesh.castShadow = true; torsoMesh.receiveShadow = true;
    bodyGroup.add(torsoMesh);

    const baseWeightRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.1, 8, 24),
        new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.5 })
    );
    baseWeightRing.rotation.x = Math.PI / 2;
    baseWeightRing.position.y = 0.1;
    bodyGroup.add(baseWeightRing);

    // Dynamic Pop Collar Ring Rim
    const collarMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.05, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    );
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.y = 1.08;
    bodyGroup.add(collarMesh);

    // 2. High-Fidelity Structured Head Shell Assembly Framework
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.48;
    headPivot.name = "HEAD_PIVOT";

    // Back Designer Cap Helmet Shell
    const backCapShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x2e221f, roughness: 0.7 }) 
    );
    backCapShell.rotation.x = -Math.PI / 2;
    headPivot.add(backCapShell);

    const headBackFill = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.15, 24),
        new THREE.MeshStandardMaterial({ color: 0xffdbb5 })
    );
    headBackFill.rotation.x = Math.PI / 2;
    headBackFill.position.z = -0.05;
    headPivot.add(headBackFill);

    // Face Canvas Texture Binding Core
    let faceTex = createFallbackFace(name);
    const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, side: THREE.FrontSide });

    textureLoader.load(`assets/faces/${filename}`, 
        (loadedTex) => {
            loadedTex.minFilter = THREE.LinearFilter;
            faceMat.map = loadedTex; faceMat.needsUpdate = true;
        },
        undefined,
        () => { console.log(`Configured system profile textures framework fallback node for actor: [${name}]`); }
    );

    const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72), faceMat);
    facePlane.position.z = 0.085;
    headPivot.add(facePlane);

    rootGroup.add(headPivot);
    scene.add(rootGroup);

    STATE.characters[id] = {
        group: rootGroup,
        pivot: headPivot,
        initialPos: new THREE.Vector3(),
        seed: Math.random() * 200
    };
    return rootGroup;
}

// Generate the high-fidelity characters
const cSarah  = spawnChibiCharacter('sarah', 'Sarah', 'sarah.png', 0xffb3c1);
const cPower  = spawnChibiCharacter('power', 'Power', 'power.png', 0x8a70db);
const cHakim  = spawnChibiCharacter('hakim', 'Hakim', 'hakim.png', 0x1eb2aa);
const cMehdzi = spawnChibiCharacter('mehdzi', 'Mehdzi', 'mehdzi.png', 0xff7c4d);
const cDxio   = spawnChibiCharacter('dxio', 'DXIO', 'dxio.png', 0xffcc00);
const cBahae  = spawnChibiCharacter('bahae', 'Bahae', 'bahae.png', 0xb355d3);

// Assign Positional Bounds Inside Interior Zone Coordinates
cSarah.position.set(-2.3, 0.45, -1.2);   cSarah.rotation.y = 0.35;
cPower.position.set(-1.2, 0.32, -1.2);   cPower.rotation.y = -0.35; cPower.rotation.z = 0.25;

// FIXED ANGLES: Facing outward towards the camera / room center
cHakim.position.set(0.9, 0.45, -1.4);    cHakim.rotation.y = -0.35;
cMehdzi.position.set(0.9, 0.45, -0.6);   cMehdzi.rotation.y = -0.15;

cDxio.position.set(-1.4, 0, 1.4);        cDxio.rotation.y = 2.4;
cBahae.position.set(1.7, 0, 1.2);

Object.keys(STATE.characters).forEach(k => {
    STATE.characters[k].initialPos.copy(STATE.characters[k].group.position);
});

// Minimalist stylized pet cat
const catGroup = new THREE.Group(); catGroup.position.set(-2.0, 0.12, 1.6);
const catBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.44), new THREE.MeshStandardMaterial({ color: 0x3d312e }));
catBody.castShadow = true; catGroup.add(catBody);
const catHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x2b2220 }));
catHead.position.set(0, 0.18, -0.16); catGroup.add(catHead);
interiorGroup.add(catGroup);

// Hide inside assets until entry sequence call execution
interiorGroup.visible = false;
Object.keys(STATE.characters).forEach(k => STATE.characters[k].group.visible = false);

// --- User Interface Overlay Interaction Engines ---
function triggerSpeechBubble(charId, message) {
    const list = [];
    STATE.activeBubbles.forEach(b => {
        if(b.charId === charId) { b.element.remove(); } else { list.push(b); }
    });
    STATE.activeBubbles = list;

    const div = document.createElement('div');
    div.className = 'speech-bubble';
    div.innerText = message;
    document.getElementById('dialogue-container').appendChild(div);

    const bubbleRef = { charId, element: div, targetMesh: STATE.characters[charId].group };
    STATE.activeBubbles.push(bubbleRef);
    positionOverlayBubble(bubbleRef);

    gsap.fromTo(div, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.6)" });

    setTimeout(() => {
        gsap.to(div, { scale: 0, opacity: 0, duration: 0.25, onComplete: () => {
            div.remove();
            STATE.activeBubbles = STATE.activeBubbles.filter(b => b.element !== div);
        }});
    }, 4500);
}

function positionOverlayBubble(b) {
    const pos = new THREE.Vector3();
    b.targetMesh.getWorldPosition(pos);
    pos.y += 2.3; 

    const vector = pos.project(camera);
    const x = (vector.x * .5 + .5) * window.innerWidth;
    const y = (vector.y * -.5 + .5) * window.innerHeight;

    b.element.style.left = `${x}px`;
    b.element.style.top = `${y}px`;
}

// --- Cinematic Navigation Transitions ---
function runInsideTransition() {
    if (STATE.currentView !== 'OUTSIDE') return;
    STATE.currentView = 'TRANSITIONING';
    document.getElementById('interaction-hint').style.display = 'none';

    const overlay = document.getElementById('portal-overlay');
    
    // Swing door open cleanly, then drive camera into threshold bounds
    gsap.timeline()
        .to(doorHingeAssembly.rotation, { y: 1.6, duration: 0.5, ease: "power2.out" })
        .to(camera.position, { x: 0, y: 1.6, z: 3.8, duration: 1.0, ease: "power2.in" }, "-=0.15")
        .to(overlay, { opacity: 1, duration: 0.3 }, "-=0.2")
        .call(() => {
            worldGroup.visible = false;
            interiorGroup.visible = true;
            Object.keys(STATE.characters).forEach(k => STATE.characters[k].group.visible = true);
            
            camera.position.set(0, 2.8, 4.8);
            camera.lookAt(0, 0.9, -1);
            
            document.getElementById('btn-outside').classList.remove('hidden');
            document.getElementById('radio-panel').classList.remove('hidden');
            STATE.currentView = 'INSIDE';
        })
        .to(overlay, { opacity: 0, duration: 0.45 });
}

function runOutsideTransition() {
    if (STATE.currentView !== 'INSIDE') return;
    STATE.currentView = 'TRANSITIONING';
    document.getElementById('btn-outside').classList.add('hidden');
    document.getElementById('radio-panel').classList.add('hidden');
    
    const overlay = document.getElementById('portal-overlay');

    gsap.timeline()
        .to(overlay, { opacity: 1, duration: 0.35 })
        .call(() => {
            worldGroup.visible = true;
            interiorGroup.visible = false;
            Object.keys(STATE.characters).forEach(k => STATE.characters[k].group.visible = false);
            
            doorHingeAssembly.rotation.y = 0;
            camera.position.set(0, 2, 4.4);
            camera.lookAt(0, 1.8, 0);
            
            document.getElementById('interaction-hint').style.display = 'block';
            STATE.currentView = 'OUTSIDE';
        })
        .to(camera.position, { x: 0, y: 5.5, z: 15, duration: 1.2, ease: "power2.out" })
        .to(overlay, { opacity: 0, duration: 0.35 }, "-=0.75");
}

// --- Interaction Input Logic Handling ---
window.addEventListener('mousemove', (e) => {
    STATE.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    STATE.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    // Hover Highlight Tracking Mechanics
    if (STATE.currentView === 'OUTSIDE' || STATE.currentView === 'INSIDE') {
        mouse.x = STATE.targetMouse.x;
        mouse.y = STATE.targetMouse.y;
        raycaster.setFromCamera(mouse, camera);

        let targets = [];
        if (STATE.currentView === 'OUTSIDE') {
            targets.push(doorPanelMesh);
        } else {
            targets.push(radioMesh.children[0]);
            Object.keys(STATE.characters).forEach(k => targets.push(STATE.characters[k].group.children[0].children[0]));
        }

        const hits = raycaster.intersectObjects(targets, true);
        if (hits.length > 0) {
            document.body.style.cursor = 'pointer';
            let matched = hits[0].object;
            if (matched.name === "DOOR_CLICKABLE_TARGET") {
                // Glow effect on hover
                matched.material.emissive.setHex(0x331105);
            }
            STATE.hoveredObj = matched;
        } else {
            document.body.style.cursor = 'default';
            if (STATE.hoveredObj && STATE.hoveredObj.name === "DOOR_CLICKABLE_TARGET") {
                STATE.hoveredObj.material.emissive.setHex(0x000000);
            }
            STATE.hoveredObj = null;
        }
    }
});

window.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (STATE.currentView === 'OUTSIDE') {
        const hits = raycaster.intersectObject(doorPanelMesh);
        if (hits.length > 0) {
            doorPanelMesh.material.emissive.setHex(0x000000);
            runInsideTransition();
        }
    } else if (STATE.currentView === 'INSIDE') {
        const interactivePool = [radioMesh.children[0]];
        Object.keys(STATE.characters).forEach(k => {
            interactivePool.push(STATE.characters[k].group.children[0].children[0]); // Target core torso mesh components
        });

        const hits = raycaster.intersectObjects(interactivePool, true);
        if (hits.length > 0) {
            let node = hits[0].object;
            while (node.parent && !node.name.startsWith('CHAR_') && node.name !== 'RADIO_OBJECT') {
                node = node.parent;
            }

            if (node.name.startsWith('CHAR_')) {
                const id = node.userData.id;
                triggerSpeechBubble(id, DIALOGUES[id]);
                // Animated hop bounce reaction trigger
                gsap.to(node.position, { y: STATE.characters[id].initialPos.y + 0.4, duration: 0.12, yoyo: true, repeat: 1 });
            } else if (node.name === 'RADIO_OBJECT') {
                document.getElementById('radio-panel').classList.toggle('hidden');
            }
        }
    }
});

// UI Controls Hook Wireups
document.getElementById('btn-outside').addEventListener('click', runOutsideTransition);
document.getElementById('close-radio').addEventListener('click', () => document.getElementById('radio-panel').classList.add('hidden'));

const playBtn = document.getElementById('rad-play');
playBtn.addEventListener('click', () => {
    STATE.radio.isPlaying = !STATE.radio.isPlaying;
    playBtn.innerText = STATE.radio.isPlaying ? "PAUSE" : "PLAY";
    document.getElementById('track-status').innerText = STATE.radio.isPlaying ? "Status: Playing Live Visualizer" : "Status: Paused";
});

const stationBtns = document.querySelectorAll('.station-btn');
stationBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        stationBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const stId = parseInt(e.target.dataset.station);
        STATE.radio.currentStation = stId;
        document.getElementById('current-station').innerText = `Station: ${STATE.radio.stations[stId]}`;
    });
});

// --- Core Frame Loop Animation Engine ---
const frameClock = new THREE.Clock();

function sceneRenderLoop() {
    requestAnimationFrame(sceneRenderLoop);
    const elapsed = frameClock.getElapsedTime();

    // Mouse Parallax Calculation Matrix Interpolation
    STATE.currentMouse.x += (STATE.targetMouse.x - STATE.currentMouse.x) * 0.05;
    STATE.currentMouse.y += (STATE.targetMouse.y - STATE.currentMouse.y) * 0.05;

    if (STATE.currentView === 'OUTSIDE') {
        camera.position.x = STATE.currentMouse.x * 3.5;
        camera.position.y = 5.5 + (STATE.currentMouse.y * 1.8);
        camera.lookAt(0, 1.8, 0);
    } else if (STATE.currentView === 'INSIDE') {
        camera.position.x = STATE.currentMouse.x * 1.2;
        camera.position.y = 2.8 + (STATE.currentMouse.y * 0.5);
        camera.lookAt(0, 0.9, -1);
    }

    // Character Continuous Procedural Breathing Animation
    if (STATE.currentView === 'INSIDE') {
        Object.keys(STATE.characters).forEach(k => {
            const actor = STATE.characters[k];
            const offset = actor.seed;

            // Breathing expansion
            actor.group.position.y = actor.initialPos.y + (Math.sin(elapsed * 2.4 + offset) * 0.015);
            
            // Subtle casual head swivels tracking toward scene view matrix perspective
            actor.pivot.rotation.y = (Math.sin(elapsed * 1.1 + offset) * 0.05);
            actor.pivot.rotation.x = (Math.cos(elapsed * 1.4 + offset) * 0.02);

            // Special explicit dance macro assigned loops for Bahae
            if(k === 'bahae') {
                actor.group.position.x = actor.initialPos.x + (Math.sin(elapsed * 6.5) * 0.22);
                actor.group.position.y = actor.initialPos.y + Math.abs(Math.cos(elapsed * 6.5) * 0.32);
                actor.pivot.rotation.z = (Math.sin(elapsed * 6.5) * 0.15);
            }
        });

        // Continuous Radio bounce rhythm sync animation pulse when playing
        if(STATE.radio.isPlaying) {
            radioMesh.scale.setScalar(1 + Math.abs(Math.sin(elapsed * 8.5) * 0.06));
        } else {
            radioMesh.scale.setScalar(1);
        }

        STATE.activeBubbles.forEach(positionOverlayBubble);
    }

    renderer.render(scene, camera);
}

// Start application engine pipeline
sceneRenderLoop();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
