/* ============================================================
   GROUPIES — Interactive Cartoon House
   main.js — Full Three.js + GSAP Interactive Experience
   ============================================================ */

'use strict';

// ─── GLOBALS ─────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

let currentScene = 'outside'; // 'outside' | 'inside'
let outsideScene, insideScene;
let outsideCamera, insideCamera;
let activeCamera;
let doorMesh, radioProp;
let doorHovered = false;
let animFrameId;

// Character refs for interaction
const characters = [];
const interactables = []; // clickable meshes

// Audio engine
const AudioEngine = createAudioEngine();

// ─── LOADING ─────────────────────────────────────────────────
const loadingScreen = document.getElementById('loading-screen');
const loaderFill = document.querySelector('.loader-fill');

function finishLoading() {
  setTimeout(() => {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      document.getElementById('hint').classList.remove('hidden');
    }, 800);
  }, 2800);
}

// ─── OUTSIDE SCENE ───────────────────────────────────────────
function buildOutsideScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 30, 80);

  // Camera
  const cam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  cam.position.set(0, 4, 16);
  cam.lookAt(0, 2, 0);

  // ── Lighting ──
  const ambient = new THREE.AmbientLight(0xFFE4B5, 0.8);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xFFF0C0, 1.4);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xB0E0FF, 0.4);
  fill.position.set(-10, 5, -5);
  scene.add(fill);

  // ── Ground ──
  const groundGeo = new THREE.PlaneGeometry(80, 80, 8, 8);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x7EC850 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Path ──
  const pathGeo = new THREE.PlaneGeometry(2.5, 8);
  const pathMat = new THREE.MeshLambertMaterial({ color: 0xD4A96A });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, 6);
  scene.add(path);

  // ── Main House ──
  const houseGroup = buildHouse(scene);
  scene.add(houseGroup);

  // ── Trees ──
  addTree(scene, -8, 0, -2, 0xC0392B);
  addTree(scene, 8, 0, -2, 0x27AE60);
  addTree(scene, -11, 0, 4, 0xE67E22);
  addTree(scene, 11, 0, 5, 0x8E44AD);
  addTree(scene, -6, 0, 8, 0x16A085);

  // ── Clouds ──
  const cloudGroup = buildClouds();
  scene.add(cloudGroup);

  // ── Fence ──
  addFence(scene);

  // ── Flowers ──
  addFlowers(scene);

  // ── Stars/fireflies at night (ambient particles) ──
  addParticles(scene);

  return { scene, cam, cloudGroup };
}

function buildHouse(parentScene) {
  const group = new THREE.Group();

  // ── Walls ──
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xF5E6C8 });
  const wallGeo = new THREE.BoxGeometry(8, 5, 7);
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 2.5, 0);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // ── Roof ──
  const roofGeo = new THREE.ConeGeometry(6.5, 3.5, 4);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xC0392B });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 6.5, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Roof edge trim
  const trimGeo = new THREE.TorusGeometry(6.2, 0.15, 6, 4);
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
  const trim = new THREE.Mesh(trimGeo, trimMat);
  trim.position.set(0, 4.95, 0);
  trim.rotation.x = Math.PI / 2;
  trim.rotation.z = Math.PI / 4;
  group.add(trim);

  // ── Chimney ──
  const chimGeo = new THREE.BoxGeometry(0.8, 2, 0.8);
  const chimMat = new THREE.MeshLambertMaterial({ color: 0xA04030 });
  const chim = new THREE.Mesh(chimGeo, chimMat);
  chim.position.set(2, 7.5, -1);
  chim.castShadow = true;
  group.add(chim);

  // Smoke particles from chimney
  addSmokeToGroup(group, 2, 8.5, -1);

  // ── Door ──
  const doorGeo = new THREE.BoxGeometry(1.4, 2.5, 0.15);
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x6B3A2A });
  doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set(0, 1.25, 3.58);
  doorMesh.castShadow = true;
  doorMesh.userData.type = 'door';
  group.add(doorMesh);
  interactables.push(doorMesh);

  // Door knob
  const knobGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const knobMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
  const knob = new THREE.Mesh(knobGeo, knobMat);
  knob.position.set(0.5, 1.2, 3.66);
  group.add(knob);

  // Door frame
  const frameGeo = new THREE.BoxGeometry(1.8, 2.8, 0.1);
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x4A2512 });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(0, 1.4, 3.56);
  group.add(frame);

  // ── Windows ──
  addWindow(group, -2.5, 3, 3.6);
  addWindow(group, 2.5, 3, 3.6);
  addWindow(group, 4.1, 3, 0);
  addWindow(group, -4.1, 3, 0);

  // ── Porch / steps ──
  const pStepMat = new THREE.MeshLambertMaterial({ color: 0xC8A97A });
  for (let i = 0; i < 3; i++) {
    const sg = new THREE.BoxGeometry(2.5 - i * 0.2, 0.2, 0.5 - i * 0.05);
    const sm = new THREE.Mesh(sg, pStepMat);
    sm.position.set(0, i * 0.2, 3.8 + (2 - i) * 0.5);
    sm.receiveShadow = true;
    group.add(sm);
  }

  // ── Sign above door ──
  addSign(group);

  // ── Mailbox ──
  addMailbox(group);

  return group;
}

function addWindow(parent, x, y, z) {
  const wGeo = new THREE.BoxGeometry(1.2, 1.2, 0.15);
  const wMat = new THREE.MeshLambertMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.8 });
  const win = new THREE.Mesh(wGeo, wMat);
  win.position.set(x, y, z);
  parent.add(win);

  // Window cross
  const crossMat = new THREE.MeshLambertMaterial({ color: 0xF5E6C8 });
  const hBarGeo = new THREE.BoxGeometry(1.2, 0.1, 0.2);
  const hBar = new THREE.Mesh(hBarGeo, crossMat);
  hBar.position.set(x, y, z + 0.05);
  parent.add(hBar);

  const vBarGeo = new THREE.BoxGeometry(0.1, 1.2, 0.2);
  const vBar = new THREE.Mesh(vBarGeo, crossMat);
  vBar.position.set(x, y, z + 0.05);
  parent.add(vBar);

  // Glow from window
  const light = new THREE.PointLight(0xFFE4B5, 0.5, 3);
  light.position.set(x, y, z - 0.5);
  parent.add(light);
}

function addSign(parent) {
  const signGeo = new THREE.BoxGeometry(3, 0.6, 0.1);
  const signMat = new THREE.MeshLambertMaterial({ color: 0x6B3A2A });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 5.3, 3.55);
  parent.add(sign);

  // Create canvas texture for sign
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#6B3A2A';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 28px Fredoka One, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GROUPIES', 128, 32);
  const texture = new THREE.CanvasTexture(canvas);

  const textGeo = new THREE.PlaneGeometry(2.9, 0.58);
  const textMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const textMesh = new THREE.Mesh(textGeo, textMat);
  textMesh.position.set(0, 5.3, 3.61);
  parent.add(textMesh);
}

function addMailbox(parent) {
  const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.7);
  const boxMat = new THREE.MeshLambertMaterial({ color: 0xE74C3C });
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(-4.5, 1, 4.5);
  parent.add(box);

  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 8);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x555 });
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(-4.5, 0.5, 4.5);
  parent.add(post);
}

function addTree(scene, x, y, z, color) {
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6B4226 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(x, 0.75 + y, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const leafGeo = new THREE.SphereGeometry(1.4, 8, 6);
  const leafMat = new THREE.MeshLambertMaterial({ color });
  const leaves = new THREE.Mesh(leafGeo, leafMat);
  leaves.position.set(x, 2.9 + y, z);
  leaves.castShadow = true;
  scene.add(leaves);

  const leaf2Geo = new THREE.SphereGeometry(1.0, 8, 6);
  const leaves2 = new THREE.Mesh(leaf2Geo, leafMat);
  leaves2.position.set(x + 0.5, 3.8 + y, z - 0.3);
  scene.add(leaves2);
}

function buildClouds() {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });

  function makeCloud(x, y, z) {
    const cloud = new THREE.Group();
    const parts = [
      [0, 0, 0, 1.2],
      [1.2, 0.2, 0, 1.0],
      [-1.2, 0.1, 0, 0.9],
      [0.5, 0.6, 0, 0.8],
      [-0.5, 0.5, 0.2, 0.75],
    ];
    parts.forEach(([px, py, pz, r]) => {
      const geo = new THREE.SphereGeometry(r, 7, 5);
      const m = new THREE.Mesh(geo, cloudMat);
      m.position.set(px, py, pz);
      cloud.add(m);
    });
    cloud.position.set(x, y, z);
    return cloud;
  }

  group.add(makeCloud(-15, 12, -10));
  group.add(makeCloud(12, 15, -12));
  group.add(makeCloud(5, 13, -15));
  group.add(makeCloud(-8, 14, -8));
  group.add(makeCloud(20, 11, -5));

  return group;
}

function addFence(scene) {
  const postMat = new THREE.MeshLambertMaterial({ color: 0xF0E0C0 });
  const railMat = new THREE.MeshLambertMaterial({ color: 0xE8D4AA });

  const positions = [];
  for (let i = -12; i <= 12; i += 1.5) {
    if (Math.abs(i) > 1.8) { // Gap for path
      positions.push([i, 0, 10]);
    }
  }
  for (let i = 0; i < 8; i++) {
    positions.push([-12, 0, 10 - i * 1.5]);
    positions.push([12, 0, 10 - i * 1.5]);
  }

  positions.forEach(([x, y, z]) => {
    const postGeo = new THREE.BoxGeometry(0.15, 1, 0.15);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 0.5, z);
    scene.add(post);
  });
}

function addFlowers(scene) {
  const colors = [0xFF6B6B, 0xFFD166, 0xFF8FAB, 0x6C63FF, 0x4ECDC4];
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 15 + 2;
    if (Math.abs(x) < 2 && z > 3 && z < 11) continue;

    const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x27AE60 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(x, 0.25, z);
    scene.add(stem);

    const flGeo = new THREE.SphereGeometry(0.15, 6, 4);
    const flMat = new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
    const fl = new THREE.Mesh(flGeo, flMat);
    fl.position.set(x, 0.55, z);
    scene.add(fl);
  }
}

function addParticles(scene) {
  const geo = new THREE.BufferGeometry();
  const count = 200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = Math.random() * 20 + 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xFFFFAA, size: 0.15, transparent: true, opacity: 0.6 });
  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
}

function addSmokeToGroup(group, x, y, z) {
  // Simple smoke puffs using small spheres that animate up
  for (let i = 0; i < 5; i++) {
    const geo = new THREE.SphereGeometry(0.2 + i * 0.05, 6, 4);
    const mat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC, transparent: true, opacity: 0.5 - i * 0.07 });
    const puff = new THREE.Mesh(geo, mat);
    puff.position.set(x + (Math.random() - 0.5) * 0.3, y + i * 0.5, z);
    puff.userData.smoke = true;
    puff.userData.baseY = y + i * 0.5;
    puff.userData.phase = i * 0.4;
    group.add(puff);
  }
}

// ─── INSIDE SCENE ────────────────────────────────────────────
function buildInsideScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2C1810);
  scene.fog = new THREE.FogExp2(0x2C1810, 0.04);

  const cam = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
  cam.position.set(0, 4, 12);
  cam.lookAt(0, 2, 0);

  // ── Lighting ──
  const ambient = new THREE.AmbientLight(0xFFE4B5, 0.5);
  scene.add(ambient);

  const ceilLight = new THREE.PointLight(0xFFD59E, 1.2, 20);
  ceilLight.position.set(0, 6, 0);
  ceilLight.castShadow = true;
  scene.add(ceilLight);

  // Warm lamp in corner
  const lampLight = new THREE.PointLight(0xFF8C42, 1.5, 8);
  lampLight.position.set(-5, 3, -3);
  scene.add(lampLight);

  // Kitchen light
  const kitchenLight = new THREE.PointLight(0xFFFFE0, 1.0, 10);
  kitchenLight.position.set(5, 5, -4);
  scene.add(kitchenLight);

  // ── Floor ──
  const floorGeo = new THREE.PlaneGeometry(20, 18);
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x8B5E3C });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Floor rug
  const rugGeo = new THREE.PlaneGeometry(8, 6);
  const rugMat = new THREE.MeshLambertMaterial({ color: 0x8B2252 });
  const rug = new THREE.Mesh(rugGeo, rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-2, 0.01, 2);
  scene.add(rug);

  // ── Ceiling ──
  const ceilGeo = new THREE.PlaneGeometry(20, 18);
  const ceilMat = new THREE.MeshLambertMaterial({ color: 0xF5E6C8 });
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 7;
  scene.add(ceil);

  // ── Walls ──
  buildInteriorWalls(scene);

  // ── Living Room Zone ──
  buildLivingRoom(scene);

  // ── Kitchen Zone ──
  buildKitchen(scene);

  // ── Dance Area ──
  buildDanceArea(scene);

  // ── Cat Play Area ──
  buildCatArea(scene);

  // ── Radio ──
  radioProp = buildRadioProp(scene);

  // ── Decorations ──
  addInteriorDecorations(scene);

  return { scene, cam, ceilLight };
}

function buildInteriorWalls(scene) {
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xF5E6C8 });
  const wallMatAlt = new THREE.MeshLambertMaterial({ color: 0xEDD9A3 });

  // Back wall
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMat);
  bw.position.set(0, 4, -9);
  scene.add(bw);

  // Left wall
  const lw = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), wallMatAlt);
  lw.position.set(-10, 4, 0);
  lw.rotation.y = Math.PI / 2;
  scene.add(lw);

  // Right wall
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), wallMatAlt);
  rw.position.set(10, 4, 0);
  rw.rotation.y = -Math.PI / 2;
  scene.add(rw);

  // Kitchen divider wall
  const div = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 8), wallMat);
  div.position.set(2, 2.5, -5);
  scene.add(div);

  // Wallpaper pattern stripes on back wall
  for (let i = -9; i <= 9; i += 1.5) {
    const stripeGeo = new THREE.PlaneGeometry(0.1, 7.5);
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xE8C97A, transparent: true, opacity: 0.4 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(i, 4, -8.9);
    scene.add(stripe);
  }
}

function buildLivingRoom(scene) {
  // ── Couch ──
  const couchMat = new THREE.MeshLambertMaterial({ color: 0x7B5EA7 });
  const couchBase = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 2), couchMat);
  couchBase.position.set(-3.5, 0.3, -1);
  couchBase.castShadow = true;
  scene.add(couchBase);

  const couchBack = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 0.4), couchMat);
  couchBack.position.set(-3.5, 1.2, -2);
  scene.add(couchBack);

  // Couch armrests
  const armGeo = new THREE.BoxGeometry(0.4, 0.8, 2);
  [-6, -1].forEach(x => {
    const arm = new THREE.Mesh(armGeo, couchMat);
    arm.position.set(x, 0.7, -1);
    scene.add(arm);
  });

  // Cushions
  const cushionMat = new THREE.MeshLambertMaterial({ color: 0xFFD166 });
  [-4.5, -2.5].forEach(x => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.5), cushionMat);
    c.position.set(x, 0.75, -1);
    scene.add(c);
  });

  // ── Coffee Table ──
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 1.2), new THREE.MeshLambertMaterial({ color: 0xA0522D }));
  tableTop.position.set(-3.5, 0.9, 0.8);
  tableTop.castShadow = true;
  scene.add(tableTop);

  // Table legs
  [[-4.5, -1.6, 0.3], [-4.5, -1.6, 1.3], [-2.5, -1.6, 0.3], [-2.5, -1.6, 1.3]].forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.88, 6), new THREE.MeshLambertMaterial({ color: 0x6B4226 }));
    leg.position.set(x, 0.44, z);
    scene.add(leg);
  });

  // ── TV ──
  const tvStand = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 0.8), new THREE.MeshLambertMaterial({ color: 0x333 }));
  tvStand.position.set(-3.5, 0.15, -8.5);
  scene.add(tvStand);

  const tvBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2, 0.15), new THREE.MeshLambertMaterial({ color: 0x222 }));
  tvBody.position.set(-3.5, 1.5, -8.5);
  scene.add(tvBody);

  // TV Screen (glowing)
  const tvScreenCanvas = document.createElement('canvas');
  tvScreenCanvas.width = 256; tvScreenCanvas.height = 144;
  const tvCtx = tvScreenCanvas.getContext('2d');
  const tvGrad = tvCtx.createLinearGradient(0, 0, 256, 144);
  tvGrad.addColorStop(0, '#1a0a4e');
  tvGrad.addColorStop(1, '#0d3366');
  tvCtx.fillStyle = tvGrad;
  tvCtx.fillRect(0, 0, 256, 144);
  tvCtx.fillStyle = 'rgba(255,255,255,0.8)';
  tvCtx.font = 'bold 20px Arial';
  tvCtx.textAlign = 'center';
  tvCtx.fillText('📺 GROUPIES TV', 128, 72);
  const tvTex = new THREE.CanvasTexture(tvScreenCanvas);
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.7), new THREE.MeshBasicMaterial({ map: tvTex }));
  tvScreen.position.set(-3.5, 1.5, -8.43);
  scene.add(tvScreen);

  const tvLight = new THREE.PointLight(0x4499FF, 0.8, 5);
  tvLight.position.set(-3.5, 1.5, -7.5);
  scene.add(tvLight);

  // ── Floor Lamp ──
  const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 8), new THREE.MeshLambertMaterial({ color: 0x888 }));
  lampPost.position.set(-8, 2, -7);
  scene.add(lampPost);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 8, 1, true), new THREE.MeshLambertMaterial({ color: 0xFFE4A0, side: THREE.DoubleSide }));
  lampShade.position.set(-8, 4.3, -7);
  scene.add(lampShade);

  // ── Characters: Sarah & Power ──
  const sarah = buildCharacter(scene, 'sarah', '#FF8FAB', -4.5, 0.6, -1, 'couch');
  const power = buildCharacter(scene, 'power', '#6C63FF', -2.5, 0.6, -0.8, 'couch');
  power.mesh.rotation.y = 0.4;

  // Power lying lazily - tilt the mesh
  power.mesh.children.forEach(c => {
    if (c.userData.isBody) {
      c.rotation.z = 0.3;
    }
  });
}

function buildKitchen(scene) {
  // ── Counter ──
  const counterMat = new THREE.MeshLambertMaterial({ color: 0xD2B48C });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 1.5), counterMat);
  counter.position.set(6.5, 0.5, -7.5);
  counter.castShadow = true;
  scene.add(counter);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(8.1, 0.15, 1.6), new THREE.MeshLambertMaterial({ color: 0xE8E0D0 }));
  counterTop.position.set(6.5, 1.08, -7.5);
  scene.add(counterTop);

  // Cabinet doors
  for (let i = 0; i < 4; i++) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.08), new THREE.MeshLambertMaterial({ color: 0xBFA88A }));
    cab.position.set(3 + i * 2, 0.5, -6.77);
    scene.add(cab);
  }

  // Upper cabinets
  for (let i = 0; i < 4; i++) {
    const ucab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.6), new THREE.MeshLambertMaterial({ color: 0xC8A97A }));
    ucab.position.set(3 + i * 2, 4, -8.7);
    scene.add(ucab);
  }

  // ── Stove ──
  const stove = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), new THREE.MeshLambertMaterial({ color: 0x666 }));
  stove.position.set(9, 1.23, -7.5);
  scene.add(stove);

  // Burners
  [[8.5, -7.2], [9.5, -7.2], [8.5, -7.8], [9.5, -7.8]].forEach(([x, z]) => {
    const bGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16);
    const bMat = new THREE.MeshLambertMaterial({ color: 0x333 });
    const burner = new THREE.Mesh(bGeo, bMat);
    burner.position.set(x, 1.39, z);
    scene.add(burner);
  });

  // ── Pot ──
  const potGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 12);
  const potMat = new THREE.MeshLambertMaterial({ color: 0x888 });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.set(9, 1.7, -7.3);
  scene.add(pot);

  // Steam from pot
  addSteam(scene, 9, 2, -7.3);

  // ── Kitchen Table ──
  const ktTop = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.12, 16), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
  ktTop.position.set(6, 0.9, -4);
  scene.add(ktTop);
  const ktLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.88, 8), new THREE.MeshLambertMaterial({ color: 0x6B3410 }));
  ktLeg.position.set(6, 0.44, -4);
  scene.add(ktLeg);

  // Food on table
  addFood(scene, 6, 1.05, -4);

  // ── Characters: Hakim & Mehdzi ──
  const hakim = buildCharacter(scene, 'hakim', '#FF6B35', 5, 0.9, -3.5, 'kitchen');
  hakim.mesh.rotation.y = 0.8;
  const mehdzi = buildCharacter(scene, 'mehdzi', '#4CAF50', 7.2, 0.9, -3.8, 'kitchen');
  mehdzi.mesh.rotation.y = -0.6;
}

function addFood(scene, x, y, z) {
  // Plate
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16), new THREE.MeshLambertMaterial({ color: 0xfff }));
  plate.position.set(x, y, z);
  scene.add(plate);

  // Food blobs
  const foods = [[0xE74C3C, 0.1, 0], [0xF39C12, -0.1, 0.1], [0x27AE60, 0.08, -0.1]];
  foods.forEach(([color, dx, dz]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshLambertMaterial({ color }));
    f.position.set(x + dx, y + 0.08, z + dz);
    scene.add(f);
  });
}

function addSteam(scene, x, y, z) {
  for (let i = 0; i < 4; i++) {
    const steamGeo = new THREE.SphereGeometry(0.08 + i * 0.02, 5, 4);
    const steamMat = new THREE.MeshLambertMaterial({ color: 0xDDDDDD, transparent: true, opacity: 0.4 - i * 0.07 });
    const s = new THREE.Mesh(steamGeo, steamMat);
    s.position.set(x + (Math.random() - 0.5) * 0.2, y + i * 0.3, z);
    s.userData.steam = true;
    s.userData.baseY = y + i * 0.3;
    s.userData.phase = i * 0.5 + Math.random();
    scene.add(s);
  }
}

function buildDanceArea(scene) {
  // ── Speaker / Sound System ──
  const spk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.4), new THREE.MeshLambertMaterial({ color: 0x222 }));
  spk.position.set(-8.5, 0.6, 5);
  scene.add(spk);
  const spkCone = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshLambertMaterial({ color: 0x444 }));
  spkCone.position.set(-8.5, 0.7, 5.21);
  scene.add(spkCone);

  const spk2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.4), new THREE.MeshLambertMaterial({ color: 0x222 }));
  spk2.position.set(-8.5, 0.6, 3);
  scene.add(spk2);
  const spkCone2 = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshLambertMaterial({ color: 0x444 }));
  spkCone2.position.set(-8.5, 0.7, 3.21);
  scene.add(spkCone2);

  // Light beams (disco effect)
  const discoBall = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshLambertMaterial({ color: 0xDDDDDD, wireframe: true }));
  discoBall.position.set(-5, 6, 4);
  discoBall.userData.discoBall = true;
  scene.add(discoBall);

  // Colored floor lights
  [[0xFF4081, -7, 3], [0x00BCD4, -5, 5], [0xFFD166, -6, 4]].forEach(([color, x, z]) => {
    const light = new THREE.PointLight(color, 0.8, 4);
    light.position.set(x, 0.5, z);
    light.userData.discoLight = true;
    scene.add(light);
  });

  // ── Bahae ──
  const bahae = buildCharacter(scene, 'bahae', '#FF4081', -5.5, 0, 4, 'dance');
}

function buildCatArea(scene) {
  // ── Cat toy (ball of yarn) ──
  const yarn = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshLambertMaterial({ color: 0xFF6B35 }));
  yarn.position.set(3, 0.25, 4);
  yarn.userData.catToy = true;
  scene.add(yarn);

  // Cat house / bed
  const catBed = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.2, 16), new THREE.MeshLambertMaterial({ color: 0xC8A97A }));
  catBed.position.set(4, 0.1, 5.5);
  scene.add(catBed);

  // The Cat 🐱
  buildCat(scene, 3.5, 0.2, 4.5);

  // ── DXIO ──
  const dxio = buildCharacter(scene, 'dxio', '#00BCD4', 2.5, 0, 5, 'cat');
  dxio.mesh.rotation.y = -0.8;
}

function buildCat(scene, x, y, z) {
  const catMat = new THREE.MeshLambertMaterial({ color: 0xF4A460 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), catMat);
  body.position.set(x, y + 0.35, z);
  body.scale.set(1, 0.8, 1.4);
  scene.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), catMat);
  head.position.set(x + 0.3, y + 0.6, z);
  scene.add(head);
  head.userData.catHead = true;

  // Ears
  const earGeo = new THREE.ConeGeometry(0.1, 0.2, 4);
  const earL = new THREE.Mesh(earGeo, catMat);
  earL.position.set(x + 0.25, y + 0.88, z - 0.1);
  scene.add(earL);
  const earR = new THREE.Mesh(earGeo, catMat);
  earR.position.set(x + 0.25, y + 0.88, z + 0.1);
  scene.add(earR);

  // Tail
  const tailGeo = new THREE.TorusGeometry(0.25, 0.05, 5, 10, Math.PI);
  const tail = new THREE.Mesh(tailGeo, catMat);
  tail.position.set(x - 0.3, y + 0.25, z);
  tail.rotation.x = Math.PI / 2;
  tail.userData.catTail = true;
  scene.add(tail);

  // Eyes
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
  [-0.08, 0.08].forEach(dz => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), eyeMat);
    eye.position.set(x + 0.56, y + 0.65, z + dz);
    scene.add(eye);
  });
}

function buildRadioProp(scene) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.4), new THREE.MeshLambertMaterial({ color: 0x2C1810 }));
  group.add(body);

  // Speaker grill
  const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshLambertMaterial({ color: 0x444 }));
  grill.position.set(-0.15, 0, 0.21);
  group.add(grill);

  // Dial
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), new THREE.MeshLambertMaterial({ color: 0xFF8C42 }));
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.3, 0.1, 0.22);
  group.add(dial);

  // Antenna
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5), new THREE.MeshLambertMaterial({ color: 0x888 }));
  ant.position.set(0.4, 0.7, 0);
  ant.rotation.z = 0.2;
  group.add(ant);

  // LED
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshLambertMaterial({ color: 0x00FF00, emissive: 0x00FF00, emissiveIntensity: 0.5 }));
  led.position.set(0.3, -0.1, 0.22);
  group.add(led);

  group.position.set(-1, 1.1, -8.4);
  group.userData.type = 'radio';
  group.userData.isGroup = true;

  // Invisible hitbox for clicking
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 0.6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.userData.type = 'radio';
  hitbox.userData.parentGroup = group;
  group.add(hitbox);
  interactables.push(hitbox);

  scene.add(group);
  return group;
}

function addInteriorDecorations(scene) {
  // ── Bookshelf ──
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.4), new THREE.MeshLambertMaterial({ color: 0x8B5E3C }));
  shelf.position.set(-8.5, 1.5, -6);
  scene.add(shelf);

  const bookColors = [0xE74C3C, 0x3498DB, 0xF1C40F, 0x2ECC71, 0x9B59B6, 0xE67E22];
  for (let i = 0; i < 6; i++) {
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.7 + Math.random() * 0.3, 0.3),
      new THREE.MeshLambertMaterial({ color: bookColors[i] })
    );
    book.position.set(-8.9 + i * 0.35, 1.2 + Math.random() * 0.2, -6);
    scene.add(book);
  }
  for (let i = 0; i < 6; i++) {
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.6 + Math.random() * 0.4, 0.3),
      new THREE.MeshLambertMaterial({ color: bookColors[(i + 3) % 6] })
    );
    book.position.set(-8.9 + i * 0.35, 2.3 + Math.random() * 0.15, -6);
    scene.add(book);
  }

  // ── Picture frames on wall ──
  const framePositions = [[-5, 4, -8.85], [-2, 4.5, -8.85], [1, 4, -8.85]];
  const frameColors = [0xFF8FAB, 0xFFD166, 0x6C63FF];
  framePositions.forEach(([x, y, z], i) => {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.08), new THREE.MeshLambertMaterial({ color: 0x6B4226 }));
    fr.position.set(x, y, z);
    scene.add(fr);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.65), new THREE.MeshLambertMaterial({ color: frameColors[i] }));
    pic.position.set(x, y, z + 0.05);
    scene.add(pic);
  });

  // ── Plant ──
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.4, 8), new THREE.MeshLambertMaterial({ color: 0xC8A97A }));
  pot.position.set(9, 0.2, 0);
  scene.add(pot);
  const plant = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 5), new THREE.MeshLambertMaterial({ color: 0x27AE60 }));
  plant.position.set(9, 0.85, 0);
  scene.add(plant);

  // ── Clock on wall ──
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 16), new THREE.MeshLambertMaterial({ color: 0xfff }));
  clock.rotation.x = Math.PI / 2;
  clock.position.set(9.9, 4, 0);
  clock.rotation.y = -Math.PI / 2;
  scene.add(clock);

  // ── Carpet under dance area ──
  const danceCarpet = new THREE.Mesh(new THREE.CircleGeometry(2, 16), new THREE.MeshLambertMaterial({ color: 0x1A0A2E }));
  danceCarpet.rotation.x = -Math.PI / 2;
  danceCarpet.position.set(-5.5, 0.01, 4);
  scene.add(danceCarpet);

  // ── Throw pillows on couch ──
  const pillowColors = [0xFF6B6B, 0xFFD166, 0x4ECDC4];
  pillowColors.forEach((color, i) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), new THREE.MeshLambertMaterial({ color }));
    p.scale.y = 0.5;
    p.position.set(-5 + i * 1.2, 1.1, -1.8);
    scene.add(p);
  });
}


// ─── CHARACTER BUILDER ───────────────────────────────────────
function buildCharacter(scene, name, color, x, y, z, zone) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const bodyColor = new THREE.Color(color);

  // ── Body ──
  const bodyGeo = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.28, 0.6, 4, 8) : new THREE.CylinderGeometry(0.28, 0.24, 0.9, 8);
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  body.userData.isBody = true;
  group.add(body);

  // ── Legs ──
  const legMat = new THREE.MeshLambertMaterial({ color: 0x333366 });
  [-0.14, 0.14].forEach(dx => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.5, 8), legMat);
    leg.position.set(dx, 0.25, 0);
    leg.userData.isLeg = true;
    group.add(leg);
  });

  // ── Arms ──
  const armMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  [-0.38, 0.38].forEach((dx, i) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 8), armMat);
    arm.position.set(dx, 0.85, 0);
    arm.rotation.z = (i === 0 ? 1 : -1) * 0.4;
    arm.userData.isArm = true;
    arm.userData.armSide = i === 0 ? 'left' : 'right';
    group.add(arm);
  });

  // ── Neck ──
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 6), new THREE.MeshLambertMaterial({ color: 0xFFD5A8 }));
  neck.position.y = 1.27;
  group.add(neck);

  // ── Head (photo frame) ──
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.55;

  // Head sphere (base shape)
  const headGeo = new THREE.SphereGeometry(0.32, 10, 8);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xFFD5A8 });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headGroup.add(headMesh);

  // Face plane (texture slot)
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 128; faceCanvas.height = 128;
  const faceCtx = faceCanvas.getContext('2d');

  // Default face placeholder
  faceCtx.fillStyle = color;
  faceCtx.beginPath();
  faceCtx.arc(64, 64, 60, 0, Math.PI * 2);
  faceCtx.fill();
  faceCtx.strokeStyle = 'rgba(255,255,255,0.5)';
  faceCtx.lineWidth = 3;
  faceCtx.stroke();
  faceCtx.fillStyle = 'rgba(255,255,255,0.9)';
  faceCtx.font = 'bold 40px Arial';
  faceCtx.textAlign = 'center';
  faceCtx.textBaseline = 'middle';
  faceCtx.fillText(name[0].toUpperCase(), 64, 64);
  faceCtx.font = 'bold 14px Arial';
  faceCtx.fillStyle = 'rgba(255,255,255,0.7)';
  faceCtx.fillText(name, 64, 100);

  const faceTex = new THREE.CanvasTexture(faceCanvas);
  const facePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.55),
    new THREE.MeshBasicMaterial({ map: faceTex, transparent: true })
  );
  facePlane.position.z = 0.32;
  headGroup.add(facePlane);

  // Try to load real image
  const texLoader = new THREE.TextureLoader();
  // Try PNG first, fallback to SVG
  texLoader.load(
    `assets/faces/${name}.png`,
    (tex) => { facePlane.material.map = tex; facePlane.material.needsUpdate = true; },
    undefined,
    () => {
      texLoader.load(
        `assets/faces/${name}.svg`,
        (tex) => { facePlane.material.map = tex; facePlane.material.needsUpdate = true; },
        undefined,
        () => {} // silently fail, use canvas fallback
      );
    }
  );

  group.add(headGroup);

  // ── Hitbox for clicking ──
  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 6, 4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.position.y = 1.0;
  hitbox.userData.type = 'character';
  hitbox.userData.characterName = name;
  hitbox.userData.zone = zone;
  group.add(hitbox);
  interactables.push(hitbox);

  // Store animation data
  group.userData = {
    name, zone,
    headGroup,
    body,
    baseY: y,
    phase: Math.random() * Math.PI * 2,
    idleTimer: 0,
    idleDelay: 2 + Math.random() * 3,
  };

  scene.add(group);

  characters.push({
    name,
    mesh: group,
    headGroup,
    zone,
    basePos: { x, y, z },
    phase: group.userData.phase,
  });

  return { mesh: group, headGroup };
}

// ─── DIALOGUE SYSTEM ─────────────────────────────────────────
const dialogues = {
  sarah:  { idle: 'hiiii ana sara o safi sero thowaw rawr 🐾', click: 'hiiii ana sara o safi sero thowaw rawr 🐾' },
  power:  { idle: 'wa khoti ra makin gha l7wi 😴', click: 'wa khoti ra makin gha l7wi 😴' },
  hakim:  { idle: '3afak a mehdzi khlini nzid gha dghma 😋', click: '3afak a mehdzi khlini nzid gha dghma 😋' },
  mehdzi: { idle: 'wa baraka azobey ra ghadi n3yt lik 3la wadie 😤', click: 'wa baraka azobey ra ghadi n3yt lik 3la wadie 😤' },
  dxio:   { idle: 't7wina bkri 🐱', click: 't7wina bkri 🐱' },
  bahae:  { idle: 'waa kanbghi shabeey 🎵🎶', click: 'waa kanbghi shabeey 🎵🎶' },
};

let dialogueTimeout = null;
const bubbleEl = document.getElementById('dialogue-bubble');
const bubbleText = document.getElementById('dialogue-text');
const bubbleName = document.getElementById('dialogue-name');

function showDialogue(charName, type = 'click') {
  if (dialogueTimeout) clearTimeout(dialogueTimeout);

  const text = dialogues[charName]?.[type] || '...';
  bubbleText.textContent = `"${text}"`;
  bubbleName.textContent = charName.toUpperCase();

  bubbleEl.classList.remove('hidden');
  gsap.fromTo(bubbleEl, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });

  // Position bubble above character head in world space
  positionDialogueAboveChar(charName);

  dialogueTimeout = setTimeout(() => {
    gsap.to(bubbleEl, { opacity: 0, scale: 0.8, duration: 0.3, onComplete: () => bubbleEl.classList.add('hidden') });
  }, 3500);
}

function positionDialogueAboveChar(charName) {
  const char = characters.find(c => c.name === charName);
  if (!char) return;

  const pos = new THREE.Vector3();
  char.mesh.getWorldPosition(pos);
  pos.y += 2.2;

  const projected = pos.clone().project(activeCamera);
  const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

  bubbleEl.style.left = x + 'px';
  bubbleEl.style.top = y + 'px';
}

// ─── AUDIO ENGINE ─────────────────────────────────────────────
function createAudioEngine() {
  let ctx = null;
  let masterGain = null;
  let currentOscillators = [];
  let isPlaying = false;
  let currentStation = 0;

  const stations = [
    { name: 'Groupies FM', artist: 'Chaotic Mix', freq: [261, 330, 392, 523], rhythm: 0.3 },
    { name: 'Kitchen Radio', artist: 'Calm Beats', freq: [220, 277, 330, 440], rhythm: 0.6 },
    { name: 'DXIO Cat Freq', artist: 'Playful/Glitch', freq: [440, 554, 659, 880], rhythm: 0.15 },
    { name: 'Night Mode', artist: 'Ambient', freq: [110, 138, 165, 220], rhythm: 1.2 },
  ];

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);
  }

  function stopAll() {
    currentOscillators.forEach(o => { try { o.stop(); } catch(e) {} });
    currentOscillators = [];
    isPlaying = false;
  }

  function playStation(index) {
    init();
    stopAll();
    currentStation = index;
    const station = stations[index];

    // Create ambient melody
    station.freq.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;

      // Rhythmic modulation
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = station.rhythm;
      lfoGain.gain.value = 0.4;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();

      gain.gain.value = 0.08 / station.freq.length;
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      currentOscillators.push(osc, lfo);
    });

    isPlaying = true;
    return station;
  }

  function pause() {
    if (ctx) ctx.suspend();
    isPlaying = false;
  }

  function resume() {
    if (ctx) ctx.resume();
    isPlaying = true;
  }

  function setVolume(v) {
    if (masterGain) masterGain.gain.value = v / 100 * 0.8;
  }

  function next() {
    currentStation = (currentStation + 1) % stations.length;
    return playStation(currentStation);
  }

  function prev() {
    currentStation = (currentStation - 1 + stations.length) % stations.length;
    return playStation(currentStation);
  }

  return { playStation, pause, resume, setVolume, next, prev, stations, get isPlaying() { return isPlaying; }, get currentStation() { return currentStation; } };
}


// ─── RADIO UI SYSTEM ─────────────────────────────────────────
const radioPanel = document.getElementById('radio-panel');
const radioOverlay = document.getElementById('overlay');
const radioPlay = document.getElementById('radio-play');
const radioClose = document.getElementById('radio-close');
const volSlider = document.getElementById('vol-slider');
const npTitle = document.getElementById('np-title');
const npArtist = document.getElementById('np-artist');
const stationBtns = document.querySelectorAll('.station-btn');

function openRadio() {
  radioOverlay.classList.remove('hidden');
  radioPanel.classList.remove('hidden');
  requestAnimationFrame(() => radioPanel.classList.add('open'));
}

function closeRadio() {
  radioPanel.classList.remove('open');
  setTimeout(() => {
    radioPanel.classList.add('hidden');
    radioOverlay.classList.add('hidden');
  }, 300);
}

function updateRadioUI(station) {
  if (!station) return;
  npTitle.textContent = station.name;
  npArtist.textContent = station.artist;
  radioPlay.textContent = '⏸';
  stationBtns.forEach((btn, i) => {
    btn.classList.toggle('active', i === AudioEngine.currentStation);
  });
}

radioClose.addEventListener('click', closeRadio);
radioOverlay.addEventListener('click', closeRadio);

radioPlay.addEventListener('click', () => {
  if (AudioEngine.isPlaying) {
    AudioEngine.pause();
    radioPlay.textContent = '▶';
  } else {
    AudioEngine.resume();
    radioPlay.textContent = '⏸';
  }
});

document.getElementById('radio-next').addEventListener('click', () => {
  const station = AudioEngine.next();
  updateRadioUI(station);
  stationBtns.forEach((btn, i) => btn.classList.toggle('active', i === AudioEngine.currentStation));
});

document.getElementById('radio-prev').addEventListener('click', () => {
  const station = AudioEngine.prev();
  updateRadioUI(station);
  stationBtns.forEach((btn, i) => btn.classList.toggle('active', i === AudioEngine.currentStation));
});

stationBtns.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    const station = AudioEngine.playStation(i);
    updateRadioUI(station);
  });
});

volSlider.addEventListener('input', (e) => {
  AudioEngine.setVolume(parseInt(e.target.value));
  const pct = e.target.value + '%';
  e.target.style.background = `linear-gradient(to right, var(--accent) ${pct}, rgba(255,255,255,0.15) ${pct})`;
});

// HUD buttons
document.getElementById('btn-exit').addEventListener('click', () => {
  if (currentScene === 'inside') exitHouse();
});

document.getElementById('btn-radio').addEventListener('click', () => {
  if (currentScene === 'inside') openRadio();
});

document.getElementById('btn-help').addEventListener('click', () => {
  const hint = document.getElementById('hint');
  if (hint.classList.contains('hidden')) {
    hint.classList.remove('hidden');
    gsap.fromTo(hint, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
    setTimeout(() => {
      gsap.to(hint, { opacity: 0, duration: 0.3, onComplete: () => hint.classList.add('hidden') });
    }, 3000);
  }
});

// ─── SCENE TRANSITIONS ────────────────────────────────────────
let transitionOverlay = null;

function createTransitionOverlay() {
  const div = document.createElement('div');
  div.id = 'transition-overlay';
  div.style.cssText = 'position:fixed;inset:0;background:#1a0a2e;z-index:500;pointer-events:none;opacity:0;';
  document.body.appendChild(div);
  return div;
}

function enterHouse() {
  if (currentScene === 'inside') return;

  if (!transitionOverlay) transitionOverlay = createTransitionOverlay();

  // Cinematic door push animation
  gsap.to(doorMesh.rotation, { y: -1.3, duration: 0.5, ease: 'power2.out' });
  gsap.to(outsideCamera.position, { z: outsideCamera.position.z - 4, duration: 0.8, ease: 'power2.in' });

  gsap.to(transitionOverlay, {
    opacity: 1,
    duration: 0.6,
    delay: 0.4,
    ease: 'power2.inOut',
    onComplete: () => {
      currentScene = 'inside';
      activeCamera = insideCamera;
      renderer.render(insideData.scene, insideCamera);

      // Animate camera in from door
      insideCamera.position.set(0, 3, 14);
      insideCamera.lookAt(0, 2, 0);

      gsap.to(transitionOverlay, { opacity: 0, duration: 0.6, ease: 'power2.out' });
      gsap.to(insideCamera.position, { z: 12, duration: 1.0, ease: 'power2.out' });

      // Update HUD
      document.getElementById('btn-exit').classList.remove('hidden');
      document.getElementById('btn-radio').classList.remove('hidden');
      document.getElementById('hint').classList.add('hidden');

      // Show inside hint
      showTemporaryHint('👆 Click characters to hear them speak • 📻 Radio for music');
    }
  });
}

function exitHouse() {
  if (currentScene === 'outside') return;
  if (!transitionOverlay) transitionOverlay = createTransitionOverlay();

  gsap.to(transitionOverlay, {
    opacity: 1,
    duration: 0.5,
    ease: 'power2.inOut',
    onComplete: () => {
      currentScene = 'outside';
      activeCamera = outsideCamera;

      // Reset door
      gsap.to(doorMesh.rotation, { y: 0, duration: 0.5, ease: 'power2.out' });
      outsideCamera.position.set(0, 4, 16);
      outsideCamera.lookAt(0, 2, 0);

      gsap.to(transitionOverlay, { opacity: 0, duration: 0.5, ease: 'power2.out' });

      document.getElementById('hint').classList.remove('hidden');
    }
  });
}

function showTemporaryHint(text) {
  const hint = document.getElementById('hint');
  hint.querySelector('span').innerHTML = text;
  hint.classList.remove('hidden');
  gsap.fromTo(hint, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
  setTimeout(() => {
    gsap.to(hint, { opacity: 0, duration: 0.4, onComplete: () => hint.classList.add('hidden') });
  }, 4000);
}

// ─── MOUSE / INTERACTION ──────────────────────────────────────
let hoveredObject = null;
const doorGlowColor = new THREE.Color(0xFFD166);
const doorNormalColor = new THREE.Color(0x6B3A2A);

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Parallax effect
  if (currentScene === 'outside') {
    const targetX = mouse.x * 1.5;
    const targetY = 4 + mouse.y * 0.5;
    gsap.to(outsideCamera.position, { x: targetX, y: targetY, duration: 1.5, ease: 'power1.out', overwrite: true });
    outsideCamera.lookAt(0, 2, 0);
  } else {
    const targetX = mouse.x * 2;
    const targetY = 3 + mouse.y * 0.8;
    gsap.to(insideCamera.position, { x: targetX, y: targetY, duration: 1.5, ease: 'power1.out', overwrite: true });
    insideCamera.lookAt(0, 2, 0);
  }

  // Raycasting
  raycaster.setFromCamera(mouse, activeCamera);
  const hits = raycaster.intersectObjects(interactables, true);

  if (hits.length > 0) {
    const obj = hits[0].object;
    document.body.style.cursor = 'pointer';

    if (obj.userData.type === 'door' && !doorHovered) {
      doorHovered = true;
      gsap.to(doorMesh.material.color, { r: doorGlowColor.r, g: doorGlowColor.g, b: doorGlowColor.b, duration: 0.3 });
      gsap.to(doorMesh.position, { y: 1.35, duration: 0.15, yoyo: true, repeat: 3, ease: 'power1.inOut' });
    }

    hoveredObject = obj;
  } else {
    document.body.style.cursor = 'default';
    if (doorHovered) {
      doorHovered = false;
      gsap.to(doorMesh.material.color, { r: doorNormalColor.r, g: doorNormalColor.g, b: doorNormalColor.b, duration: 0.3 });
      gsap.to(doorMesh.position, { y: 1.25, duration: 0.2 });
    }
    hoveredObject = null;
  }
});

window.addEventListener('click', (e) => {
  if (e.target.closest('#radio-panel') || e.target.closest('#hud')) return;

  raycaster.setFromCamera(mouse, activeCamera);
  const hits = raycaster.intersectObjects(interactables, true);

  if (hits.length > 0) {
    const obj = hits[0].object;
    const type = obj.userData.type;

    if (type === 'door' && currentScene === 'outside') {
      enterHouse();
    } else if (type === 'character') {
      const name = obj.userData.characterName;
      showDialogue(name, 'click');
      // Bounce character
      const char = characters.find(c => c.name === name);
      if (char) {
        gsap.to(char.mesh.position, {
          y: char.basePos.y + 0.4, duration: 0.2, ease: 'power2.out',
          onComplete: () => gsap.to(char.mesh.position, { y: char.basePos.y, duration: 0.4, ease: 'bounce.out' })
        });
      }
    } else if (type === 'radio') {
      openRadio();
      gsap.to(radioProp.position, { y: radioProp.position.y + 0.1, duration: 0.1, yoyo: true, repeat: 3 });
    }
  }
});

// Touch support
window.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
}, { passive: true });

// Resize
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  outsideCamera.aspect = w / h;
  outsideCamera.updateProjectionMatrix();
  insideCamera.aspect = w / h;
  insideCamera.updateProjectionMatrix();
});


// ─── ANIMATION LOOP ───────────────────────────────────────────
function animate() {
  animFrameId = requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const delta = clock.getDelta ? 0.016 : 0.016;

  // ── Outside scene updates ──
  if (outsideData) {
    // Clouds drift
    if (outsideData.cloudGroup) {
      outsideData.cloudGroup.position.x = Math.sin(t * 0.05) * 2;
      outsideData.cloudGroup.children.forEach((cloud, i) => {
        cloud.position.x += Math.sin(t * 0.03 + i) * 0.003;
      });
    }

    // Smoke/puffs animate
    outsideData.scene.traverse(obj => {
      if (obj.userData.smoke) {
        obj.position.y = obj.userData.baseY + Math.sin(t * 0.8 + obj.userData.phase) * 0.15;
        obj.material.opacity = (0.4 - obj.userData.phase * 0.06) * (0.5 + 0.5 * Math.sin(t + obj.userData.phase));
      }
    });
  }

  // ── Inside scene updates ──
  if (insideData) {
    // Ceiling light flicker (subtle)
    if (insideData.ceilLight) {
      insideData.ceilLight.intensity = 1.2 + Math.sin(t * 2.3) * 0.05;
    }

    // Disco ball spin
    insideData.scene.traverse(obj => {
      if (obj.userData.discoBall) obj.rotation.y += 0.02;
      if (obj.userData.discoLight) {
        obj.intensity = 0.6 + Math.sin(t * 3 + obj.position.x) * 0.4;
      }
      if (obj.userData.steam) {
        obj.position.y = obj.userData.baseY + Math.sin(t + obj.userData.phase) * 0.12 + t * 0.02 % 0.5;
        obj.material.opacity = Math.max(0, 0.35 - (t * 0.05 % 0.35));
      }
      if (obj.userData.catHead) {
        obj.rotation.z = Math.sin(t * 1.5) * 0.15;
      }
      if (obj.userData.catTail) {
        obj.rotation.z = Math.sin(t * 2) * 0.3;
      }
    });

    // Update dialogue position if visible
    if (!bubbleEl.classList.contains('hidden')) {
      const activeName = bubbleName.textContent.toLowerCase();
      positionDialogueAboveChar(activeName);
    }
  }

  // ── Character animations ──
  characters.forEach(char => {
    const mesh = char.mesh;
    const ph = char.phase;

    // Breathing / idle bob
    mesh.position.y = char.basePos.y + Math.sin(t * 1.2 + ph) * 0.04;

    // Head sway
    if (char.headGroup) {
      char.headGroup.rotation.y = Math.sin(t * 0.7 + ph) * 0.15;
      char.headGroup.rotation.x = Math.sin(t * 0.5 + ph + 1) * 0.05;
    }

    // Special per-character animations
    if (char.name === 'bahae') {
      // Dancing! More vigorous movement
      mesh.rotation.y = Math.sin(t * 3) * 0.5;
      mesh.position.y = char.basePos.y + Math.abs(Math.sin(t * 3)) * 0.2;

      // Arm wave
      mesh.children.forEach(c => {
        if (c.userData.isArm) {
          c.rotation.z = (c.userData.armSide === 'left' ? 1 : -1) * (0.4 + Math.sin(t * 3 + (c.userData.armSide === 'left' ? 0 : Math.PI)) * 0.6);
        }
      });
    }

    if (char.name === 'power') {
      // Lazy, slower breathing
      mesh.position.y = char.basePos.y + Math.sin(t * 0.5 + ph) * 0.06;
      if (char.headGroup) {
        char.headGroup.rotation.x = 0.3; // Head drooping
      }
    }

    if (char.name === 'hakim') {
      // Eating motion - arm bob
      mesh.children.forEach(c => {
        if (c.userData.isArm && c.userData.armSide === 'right') {
          c.rotation.z = -0.8 + Math.sin(t * 2.5) * 0.4;
        }
      });
    }

    if (char.name === 'dxio') {
      // Playing with cat - reaching down
      mesh.children.forEach(c => {
        if (c.userData.isArm && c.userData.armSide === 'right') {
          c.rotation.z = -0.4 + Math.sin(t * 1.8) * 0.3;
          c.rotation.x = 0.4;
        }
      });
    }
  });

  // Render current scene
  if (currentScene === 'outside' && outsideData) {
    renderer.render(outsideData.scene, activeCamera);
  } else if (currentScene === 'inside' && insideData) {
    renderer.render(insideData.scene, activeCamera);
  }
}

// ─── INIT ─────────────────────────────────────────────────────
let outsideData = null;
let insideData = null;

function init() {
  // Build scenes
  outsideData = buildOutsideScene();
  outsideCamera = outsideData.cam;

  insideData = buildInsideScene();
  insideCamera = insideData.cam;

  // Default to outside
  activeCamera = outsideCamera;
  currentScene = 'outside';

  // Start animation
  animate();

  // Finish loading
  finishLoading();

  // Idle dialogue triggers
  setInterval(() => {
    if (currentScene === 'inside' && !radioPanel.classList.contains('open')) {
      const randomChar = characters[Math.floor(Math.random() * characters.length)];
      if (randomChar) showDialogue(randomChar.name, 'idle');
    }
  }, 6000);
}

// Start when DOM ready
init();

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (radioPanel.classList.contains('open')) {
      closeRadio();
    } else if (currentScene === 'inside') {
      exitHouse();
    }
  }
  if (e.key === 'r' || e.key === 'R') {
    if (currentScene === 'inside') openRadio();
  }
  if (e.key === 'Enter' && currentScene === 'outside') {
    enterHouse();
  }
});

console.log('%c🏠 GROUPIES — Interactive Cartoon House', 'color:#FFD166;font-size:20px;font-weight:bold;');
console.log('%c📁 To use real photos: put images in assets/faces/', 'color:#4ECDC4;font-size:13px;');
console.log('%cFiles needed: sarah.png, power.png, hakim.png, mehdzi.png, dxio.png, bahae.png', 'color:#aaa;font-size:11px;');

