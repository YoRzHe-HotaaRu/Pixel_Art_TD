import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';
import GameEngine from './GameEngine.js';
import ModelGenerator from './ModelGenerator.js';
import Map from './Map.js';
import Particles from './Particles.js';
import AudioSynth from './AudioSynth.js';
import TextureGenerator from './TextureGenerator.js';


// Game UI Elements
const preloader = document.getElementById('preloader');
const loaderBar = document.getElementById('loader-bar');
const loaderTip = document.getElementById('loader-tip');
const mainMenu = document.getElementById('main-menu');
const hudTop = document.getElementById('hud-top');
const hudBottom = document.getElementById('hud-bottom');
const endScreen = document.getElementById('end-screen');

// HUD Top
const hudGold = document.getElementById('hud-gold');
const hudLives = document.getElementById('hud-lives');
const hudWave = document.getElementById('hud-wave');
const waveProgress = document.getElementById('wave-progress');
const btnNextWave = document.getElementById('btn-next-wave');
const btnPauseToggle = document.getElementById('btn-pause-toggle');

// Tower Context
const towerContext = document.getElementById('tower-context');
const contextTitle = document.getElementById('context-title');
const contextLevel = document.getElementById('context-level');
const contextDamage = document.getElementById('context-damage');
const contextFireRate = document.getElementById('context-firerate');
const contextRange = document.getElementById('context-range');
const contextKills = document.getElementById('context-kills');
const contextTargetMode = document.getElementById('context-target-mode');
const btnUpgrade = document.getElementById('btn-upgrade');
const upgradeCostSpan = document.getElementById('upgrade-cost');
const btnSell = document.getElementById('btn-sell');
const sellRefundSpan = document.getElementById('sell-refund');
const btnContextClose = document.getElementById('btn-context-close');

// Settings & Codex Modal
const modalSettings = document.getElementById('modal-settings');
const modalCodex = document.getElementById('modal-codex');
const btnSettings = document.getElementById('btn-settings');
const btnCodex = document.getElementById('btn-codex');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnCloseCodex = document.getElementById('btn-close-codex');
const volumeBgm = document.getElementById('volume-bgm');
const volumeSfx = document.getElementById('volume-sfx');
const settingGraphics = document.getElementById('setting-graphics');
const btnMute = document.getElementById('btn-mute');

// Main Menu Buttons & World Selection
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const btnMenu = document.getElementById('btn-menu');
const worldCards = document.querySelectorAll('.world-card');

// Diagnostics & Cheat Input
const logScroll = document.getElementById('log-scroll');
const cheatInput = document.getElementById('cheat-input');

// Selected Levels State
let selectedWorld = 1;
let selectedDifficulty = 1.0; // Easy: 0.8, Normal: 1.0, Hard: 1.4
let selectedShopTower = null; // archer, cannon, frost, laser

// Cinematic Timer State
let cinematicTimer = 0;
const CINEMATIC_DURATION = 1.5;


// Three.js State variables
let scene, camera, renderer, controls;
let ambientLight, dirLight;
let hoverHelper;
const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// Graphics Settings Cache
let shadowsEnabled = true;

// Preloader Progress Simulation (Premium retro experience)
function runPreloader() {
  const loaderTips = [
    "Procedural sound waves compiling...",
    "Voxel meshes synthesizing...",
    "Grid pathways building...",
    "Cyberspace links establishing...",
    "Ready for core download."
  ];
  let progress = 0;
  const loadInterval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 4;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadInterval);
      setTimeout(() => {
        preloader.style.opacity = 0;
        setTimeout(() => {
          preloader.style.display = 'none';
          mainMenu.style.display = 'flex';
        }, 500);
      }, 400);
    }
    loaderBar.style.width = progress + '%';
    const tipIdx = Math.min(loaderTips.length - 1, Math.floor(progress / 20));
    loaderTip.innerText = loaderTips[tipIdx];
  }, 40);
}

// ----------------------------------------------------
// THREE.JS INITIALIZATION
// ----------------------------------------------------
function initThree() {
  // Create Scene & Fog
  scene = new THREE.Scene();
  
  // Create Perspective Camera
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 12, 16);

  // Link camera to GameEngine & Particles for NDC billboarding
  GameEngine.camera = camera;
  Particles.camera = camera;

  // Create Renderer
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = shadowsEnabled;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.body.appendChild(renderer.domElement);

  // Create OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 6.0;
  controls.maxDistance = 22.0;
  // Limit rotation so we cannot look underneath the world
  controls.maxPolarAngle = Math.PI / 2 - 0.08;
  controls.minPolarAngle = 0.1;
  controls.target.set(0, 0, 0);

  // Set up Ambient Light
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Set up Directional Light (Dynamic Shadows)
  dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(8, 16, 6);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 40;
  
  const d = 11;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // Compile Voxel Textures & Materials
  ModelGenerator.init();

  // Create a transparent hover indicator box
  const hoverGeo = new THREE.BoxGeometry(1.58, 0.78, 1.58);
  const hoverMat = new THREE.MeshBasicMaterial({
    color: 0x39ff14,
    transparent: true,
    opacity: 0.35,
    wireframe: false
  });
  hoverHelper = new THREE.Mesh(hoverGeo, hoverMat);
  hoverHelper.position.set(0, -100, 0); // Hide initially below ground
  scene.add(hoverHelper);

  // Event listener for screen size adjustments
  window.addEventListener('resize', onWindowResize);
  
  // Event listener for raycast placement
  window.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onCanvasClick);
}

function updateEnvironment(worldTheme) {
  let clearColor, ambientColor, dirColor;
  let ambientInt, dirInt;

  if (worldTheme === 1) {
    clearColor = 0x050510; // Dark cyber blue
    ambientColor = 0x00f0ff; // Cyan ambient
    dirColor = 0xff007f; // Neon Pink sun
    ambientInt = 0.5;
    dirInt = 1.3;
  } else if (worldTheme === 2) {
    clearColor = 0x0a0302; // Volcanic dark charcoal
    ambientColor = 0xff5500; // Deep orange ambient
    dirColor = 0xffaa00; // Gold molten sun
    ambientInt = 0.4;
    dirInt = 1.5;
  } else {
    clearColor = 0x0a101b; // Frozen glitch white-blue
    ambientColor = 0xbbe3ff; // Cool white ambient
    dirColor = 0x00f0ff; // High-cyber cyan sun
    ambientInt = 0.55;
    dirInt = 1.25;
  }

  renderer.setClearColor(clearColor);
  scene.background = new THREE.Color(clearColor);
  scene.fog = new THREE.FogExp2(clearColor, 0.045);

  ambientLight.color.setHex(ambientColor);
  ambientLight.intensity = ambientInt;

  dirLight.color.setHex(dirColor);
  dirLight.intensity = dirInt;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----------------------------------------------------
// GRID RAYCASTING HOVERS & CLICKS
// ----------------------------------------------------
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (!GameEngine.gameActive || GameEngine.isPaused || GameEngine.isAttractMode) {
    hoverHelper.position.y = -100;
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const intersectPoint = new THREE.Vector3();
  
  if (raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
    const { col, row } = Map.worldToGrid(intersectPoint);
    
    // Bounds verify
    if (col >= 0 && col < Map.gridSize && row >= 0 && row < Map.gridSize) {
      const cell = GameEngine.grid[row][col];
      
      if (selectedShopTower) {
        // We have a tower selected in the shop deck
        hoverHelper.position.set(cell.worldPos.x, 0.4, cell.worldPos.z);
        
        // Green if empty grass buildable, red if occupied or path/river
        if (cell.type === 'grass' && cell.tower === null) {
          hoverHelper.material.color.setHex(0x39ff14); // neon green
        } else {
          hoverHelper.material.color.setHex(0xff0055); // neon red
        }
      } else {
        // No tower selected, hide hover helper
        hoverHelper.position.y = -100;
      }
    } else {
      hoverHelper.position.y = -100;
    }
  }
}

function onCanvasClick(event) {
  if (!GameEngine.gameActive || GameEngine.isPaused || GameEngine.isAttractMode) return;

  // Let UI elements block clicks (e.g. if we are clicking context menu or shop)
  if (event.target.tagName !== 'CANVAS') return;

  raycaster.setFromCamera(mouse, camera);
  const intersectPoint = new THREE.Vector3();

  if (raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
    const { col, row } = Map.worldToGrid(intersectPoint);
    
    if (col >= 0 && col < Map.gridSize && row >= 0 && row < Map.gridSize) {
      const cell = GameEngine.grid[row][col];

      if (selectedShopTower) {
        // Try building selected shop tower
        const success = GameEngine.buildTower(selectedShopTower, col, row);
        if (success) {
          deselectShopCard();
          updateHUD();
        }
      } else {
        // Select existing tower or deselect
        const tower = GameEngine.selectTowerAt(col, row);
        if (tower) {
          showTowerContext(tower);
        } else {
          hideTowerContext();
        }
      }
    } else {
      hideTowerContext();
    }
  }
}

// ----------------------------------------------------
// UI HUD & CONTEXT MENU MANAGEMENT
// ----------------------------------------------------
function updateHUD() {
  hudGold.innerText = GameEngine.gold + 'g';
  hudLives.innerText = `${GameEngine.lives} / 20`;
  hudWave.innerText = `WAVE ${GameEngine.wave}`;

  // Wave completion ratio progress
  if (GameEngine.isWaveInProgress && GameEngine.waveTotalCount > 0) {
    const ratio = (GameEngine.waveSpawnedCount / GameEngine.waveTotalCount) * 100;
    waveProgress.style.width = ratio + '%';
  } else {
    waveProgress.style.width = '0%';
  }

  // Update shop card disable states based on Gold availability
  const shopCards = document.querySelectorAll('.shop-card');
  shopCards.forEach(card => {
    const towerType = card.dataset.tower;
    const cost = GameEngine.getTowerCost(towerType);
    if (GameEngine.gold < cost) {
      card.classList.add('disabled');
    } else {
      card.classList.remove('disabled');
    }
  });

  // Enable/disable Send Wave button
  if (GameEngine.isWaveInProgress) {
    btnNextWave.classList.add('disabled');
    btnNextWave.innerText = "WAVE RUNNING";
  } else {
    btnNextWave.classList.remove('disabled');
    btnNextWave.innerText = "SEND WAVE";
  }
}

function showTowerContext(tower) {
  contextTitle.innerText = `${tower.type.toUpperCase()} TOWER`;
  contextLevel.innerText = tower.level;
  contextDamage.innerText = Math.floor(tower.stats.damage);
  contextFireRate.innerText = `${tower.stats.fireRate.toFixed(1)}/s`;
  contextRange.innerText = tower.stats.range.toFixed(1);
  contextKills.innerText = tower.kills;
  contextTargetMode.value = tower.targetingMode;

  const cost = Math.floor(tower.stats.cost * 1.4 * tower.level);
  const refund = Math.floor(tower.stats.cost * 0.7 * tower.level);

  upgradeCostSpan.innerText = cost;
  sellRefundSpan.innerText = refund;

  if (tower.level >= 3) {
    btnUpgrade.classList.add('disabled');
    btnUpgrade.innerText = "MAX LEVEL";
  } else {
    btnUpgrade.classList.remove('disabled');
    btnUpgrade.innerText = `UPGRADE (${cost}g)`;
  }

  if (GameEngine.gold < cost && tower.level < 3) {
    btnUpgrade.classList.add('disabled');
  }

  towerContext.classList.add('active');
}

function hideTowerContext() {
  towerContext.classList.remove('active');
  GameEngine.deselect();
}

function selectShopCard(type, element) {
  deselectShopCard();
  selectedShopTower = type;
  element.classList.add('selected');
  hideTowerContext();
  
  // Spark SFX
  AudioSynth.playHit(0);
}

function deselectShopCard() {
  selectedShopTower = null;
  const cards = document.querySelectorAll('.shop-card');
  cards.forEach(c => c.classList.remove('selected'));
  hoverHelper.position.y = -100;
}

// Bind Diagnostics Console Logs directly to UI logs
function setupDiagnostics() {
  GameEngine.setLogCallback((msg, type) => {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    
    // timestamp formatting
    const d = new Date();
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    entry.innerHTML = `<span style="color: #666">[${timeStr}]</span> [${type.toUpperCase()}] ${msg}`;
    
    logScroll.appendChild(entry);
    
    // Limit console length to avoid leak
    if (logScroll.childNodes.length > 50) {
      logScroll.removeChild(logScroll.firstChild);
    }
    
    // Scroll down automatically
    logScroll.scrollTop = logScroll.scrollHeight;
  });
}

// ----------------------------------------------------
// CHEAT CODES EVENT HANDLERS
// ----------------------------------------------------
cheatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const code = cheatInput.value.trim();
    if (code.startsWith('/')) {
      GameEngine.executeCheat(code);
      cheatInput.value = '';
      updateHUD();
      
      // Unfocus input to return hotkey controls
      cheatInput.blur();
    }
  }
});

// ----------------------------------------------------
// TOWER UPGRADE & SELL CONTEXT HANDLERS
// ----------------------------------------------------
btnUpgrade.addEventListener('click', () => {
  if (GameEngine.selectedTower) {
    const tower = GameEngine.selectedTower;
    GameEngine.upgradeTower(tower);
    showTowerContext(tower);
    updateHUD();
  }
});

btnSell.addEventListener('click', () => {
  if (GameEngine.selectedTower) {
    GameEngine.sellTower(GameEngine.selectedTower);
    hideTowerContext();
    updateHUD();
  }
});

contextTargetMode.addEventListener('change', (e) => {
  if (GameEngine.selectedTower) {
    GameEngine.selectedTower.targetingMode = e.target.value;
    GameEngine.log(`Tower target mode modified: ${e.target.value}`, "system");
  }
});

btnContextClose.addEventListener('click', hideTowerContext);

// ----------------------------------------------------
// HUD TOP CONTROLS BINDINGS
// ----------------------------------------------------
btnNextWave.addEventListener('click', () => {
  if (!GameEngine.isWaveInProgress) {
    GameEngine.startNextWave();
    updateHUD();
  }
});

// Speed multipliers
const speedBtns = document.querySelectorAll('.btn-speed');
speedBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const spd = parseFloat(btn.dataset.speed);
    GameEngine.speedMultiplier = spd;
    
    speedBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    GameEngine.log(`Game speed modified to: ${spd}X`, "system");
  });
});

// Pause button
btnPauseToggle.addEventListener('click', () => {
  GameEngine.isPaused = !GameEngine.isPaused;
  btnPauseToggle.innerText = GameEngine.isPaused ? "RESUME" : "PAUSE";
  btnPauseToggle.classList.toggle('active', GameEngine.isPaused);
  GameEngine.log(GameEngine.isPaused ? "Game paused." : "Game resumed.", "system");
});

// ----------------------------------------------------
// LEVEL TRANSITION / MAIN MENU CONTROL FLOW
// ----------------------------------------------------
worldCards.forEach(card => {
  card.addEventListener('click', () => {
    worldCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectedWorld = parseInt(card.dataset.world);
    
    // Play quick feedback beep
    AudioSynth.init();
    AudioSynth.playHit(0);
  });
});

btnStart.addEventListener('click', () => {
  // 1. Initialize Web Audio API on click
  AudioSynth.init();
  
  // 2. Clear existing three entities and rebuild grid
  GameEngine.startLevel(scene, selectedWorld, selectedDifficulty);

  // 3. Reset camera and orbit controls target
  // 3. Reset camera and start cinematic zoom-in
  cinematicTimer = CINEMATIC_DURATION;
  camera.position.set(0, 30, 40);
  controls.target.set(0, 0, 0);
  controls.enabled = false;

  // 4. Update HUD values and toggle screens
  updateHUD();
  mainMenu.style.opacity = 0;
  setTimeout(() => {
    mainMenu.style.display = 'none';
    hudTop.style.display = 'flex';
    hudBottom.style.display = 'flex';
  }, 500);
});

// Restart handler
btnRestart.addEventListener('click', () => {
  endScreen.classList.remove('active');
  GameEngine.startLevel(scene, selectedWorld, selectedDifficulty);
  
  // Reset camera and start cinematic zoom-in on restart
  cinematicTimer = CINEMATIC_DURATION;
  camera.position.set(0, 30, 40);
  controls.target.set(0, 0, 0);
  controls.enabled = false;

  updateHUD();
});

// Back to menu handler
btnMenu.addEventListener('click', () => {
  endScreen.classList.remove('active');
  hudTop.style.display = 'none';
  hudBottom.style.display = 'none';
  mainMenu.style.display = 'flex';
  setTimeout(() => {
    mainMenu.style.opacity = 1;
  }, 10);
  
  // Start Attract Mode again
  GameEngine.startAttractMode(scene);
});

// Hook GameEngine Game Over callback
GameEngine.onGameOver = () => {
  document.getElementById('end-title').innerText = "SYSTEM CRASHED";
  document.getElementById('end-title').className = "end-title defeat";
  document.getElementById('end-stat-waves').innerText = GameEngine.wave;
  document.getElementById('end-stat-kills').innerText = GameEngine.enemiesKilled;
  document.getElementById('end-stat-score').innerText = GameEngine.score;
  
  endScreen.classList.add('active');
};

// Hook GameEngine Victory checker (if players survive wave 6, or custom criteria)
// For this TD game, let's trigger victory if player survives Wave 6 boss wave and all enemies die
const originalResolveWaveEnd = GameEngine.resolveWaveEnd;
GameEngine.resolveWaveEnd = function() {
  originalResolveWaveEnd.apply(this);
  updateHUD();
  
  if (GameEngine.wave === 6) {
    // VICTORY! Completed wave 6 boss
    GameEngine.gameActive = false;
    AudioSynth.playVictory();
    
    document.getElementById('end-title').innerText = "SESSION SECURED";
    document.getElementById('end-title').className = "end-title victory";
    document.getElementById('end-stat-waves').innerText = GameEngine.wave;
    document.getElementById('end-stat-kills').innerText = GameEngine.enemiesKilled;
    document.getElementById('end-stat-score').innerText = GameEngine.score;
    
    // Save high score
    const highestWave = localStorage.getItem(`high_wave_w${GameEngine.worldTheme}`) || 0;
    if (GameEngine.wave > highestWave) {
      localStorage.setItem(`high_wave_w${GameEngine.worldTheme}`, GameEngine.wave);
    }
    
    endScreen.classList.add('active');
  }
};

// ----------------------------------------------------
// SETTINGS & CODEX MODAL CONTROLS
// ----------------------------------------------------
btnSettings.addEventListener('click', () => {
  modalSettings.classList.add('active');
});

btnCloseSettings.addEventListener('click', () => {
  modalSettings.classList.remove('active');
});

btnCodex.addEventListener('click', () => {
  modalCodex.classList.add('active');
});

btnCloseCodex.addEventListener('click', () => {
  modalCodex.classList.remove('active');
});

volumeBgm.addEventListener('input', (e) => {
  AudioSynth.setBgmVolume(e.target.value);
});

volumeSfx.addEventListener('input', (e) => {
  AudioSynth.setSfxVolume(e.target.value);
});

btnMute.addEventListener('click', () => {
  const isMuted = AudioSynth.toggleMute();
  btnMute.innerText = isMuted ? "UNMUTE" : "MUTE";
  btnMute.classList.toggle('active', isMuted);
});

settingGraphics.addEventListener('change', (e) => {
  const val = e.target.value;
  if (val === 'high') {
    shadowsEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    dirLight.castShadow = true;
  } else if (val === 'medium') {
    shadowsEnabled = false;
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(window.devicePixelRatio * 0.75);
    dirLight.castShadow = false;
  } else {
    // Low preset (Cool pixelation + high performance)
    shadowsEnabled = false;
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(0.45); // heavy pixelation
    dirLight.castShadow = false;
  }
  
  // Traverse scene to toggle shadow properties on meshes
  scene.traverse(child => {
    if (child.isMesh) {
      child.castShadow = shadowsEnabled;
      child.receiveShadow = shadowsEnabled;
    }
  });

  GameEngine.log(`Graphics preset updated to: ${val.toUpperCase()}`, "system");
});

// Close modals when clicking outside modal content
window.addEventListener('click', (e) => {
  if (e.target === modalSettings) modalSettings.classList.remove('active');
  if (e.target === modalCodex) modalCodex.classList.remove('active');
});

// ----------------------------------------------------
// HOTKEY BINDS (1-4, Esc, Space, M, U, S)
// ----------------------------------------------------
window.addEventListener('keydown', (e) => {
  // Ignore hotkeys if user is writing in the cheat code console or in attract mode
  if (document.activeElement === cheatInput || GameEngine.isAttractMode) return;

  const key = e.key.toLowerCase();
  
  if (key === '1') {
    const card = document.querySelector('.shop-card[data-tower="archer"]');
    if (card) selectShopCard('archer', card);
  } else if (key === '2') {
    const card = document.querySelector('.shop-card[data-tower="cannon"]');
    if (card) selectShopCard('cannon', card);
  } else if (key === '3') {
    const card = document.querySelector('.shop-card[data-tower="frost"]');
    if (card) selectShopCard('frost', card);
  } else if (key === '4') {
    const card = document.querySelector('.shop-card[data-tower="laser"]');
    if (card) selectShopCard('laser', card);
  } else if (e.key === 'Escape') {
    deselectShopCard();
    hideTowerContext();
  } else if (key === ' ' || key === 'p') {
    e.preventDefault();
    btnPauseToggle.click();
  } else if (key === 'm') {
    btnMute.click();
  } else if (key === 'u') {
    if (GameEngine.selectedTower) btnUpgrade.click();
  } else if (key === 's') {
    if (GameEngine.selectedTower) btnSell.click();
  }
});

// Hook Shop click event listeners
const shopCards = document.querySelectorAll('.shop-card');
shopCards.forEach(card => {
  card.addEventListener('click', () => {
    const type = card.dataset.tower;
    if (selectedShopTower === type) {
      deselectShopCard();
    } else {
      selectShopCard(type, card);
    }
  });
});

// ----------------------------------------------------
// ANIMATE / TICK RENDER LOOP
// ----------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  if (GameEngine.gameActive && !GameEngine.isPaused) {
    // 1. Update Game Engine
    GameEngine.update(dt);
    
    // 2. Update WebGL Particles & NDC floating labels
    Particles.update(dt, GameEngine.speedMultiplier, GameEngine.worldTheme, GameEngine.gameActive && !GameEngine.isPaused);

    // Scroll water and lava textures
    const waterTex = TextureGenerator.get('water');
    if (waterTex) {
      waterTex.offset.y += 0.08 * dt * GameEngine.speedMultiplier;
    }
    const lavaTex = TextureGenerator.get('lava');
    if (lavaTex) {
      lavaTex.offset.y += 0.05 * dt * GameEngine.speedMultiplier;
    }

    // 3. Animate Scenery & Visuals
    const time = Date.now() * 0.0015;
    scene.traverse(child => {
      // Rotate spawning portal torus
      if (child.name === 'portal_ring') {
        child.rotation.z += dt * 1.8 * GameEngine.speedMultiplier;
      }
      
      // Floating Castle Core crystal
      if (child.name === 'castle_crystal') {
        child.rotation.y += dt * 1.4 * GameEngine.speedMultiplier;
        child.position.y = 1.4 + Math.sin(time * 3) * 0.08;
      }

      // Volcanic crystal hover rotate
      if (child.name === 'crystal') {
        child.rotation.x += dt * 0.4 * GameEngine.speedMultiplier;
        child.rotation.y += dt * 0.6 * GameEngine.speedMultiplier;
      }
    });

    // 4. Rotate Frost Tower orbit shards in weapon group
    GameEngine.towers.forEach(t => {
      if (t.type === 'frost') {
        const weapon = t.mesh.getObjectByName("weapon");
        if (weapon) {
          weapon.rotation.y += dt * 1.6 * GameEngine.speedMultiplier;
        }
      }
      // Rotate Laser Tower ring node surrounding core
      if (t.type === 'laser') {
        const ring = t.mesh.getObjectByName("laser_ring");
        if (ring) {
          ring.rotation.x += dt * 2.0 * GameEngine.speedMultiplier;
          ring.rotation.y += dt * 1.0 * GameEngine.speedMultiplier;
        }
        // Bob laser core
        const core = t.mesh.getObjectByName("laser_core");
        if (core) {
          core.position.y = Math.sin(time * 6) * 0.06;
        }
      }
    });

    // 5. Update HUD Wave details dynamically
    updateHUD();
  }

  if (cinematicTimer > 0) {
    controls.enabled = false;
    cinematicTimer -= dt;
    if (cinematicTimer < 0) cinematicTimer = 0;

    const t = 1.0 - (cinematicTimer / CINEMATIC_DURATION);
    const ease = 1 - Math.pow(1 - t, 3);

    camera.position.set(
      THREE.MathUtils.lerp(0, 0, ease),
      THREE.MathUtils.lerp(30, 12, ease),
      THREE.MathUtils.lerp(40, 16, ease)
    );
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
  } else if (GameEngine.isAttractMode) {
    controls.enabled = false;
    const time = Date.now() * 0.00015;
    camera.position.x = 15 * Math.sin(time);
    camera.position.z = 15 * Math.cos(time);
    camera.position.y = 8 + Math.sin(time * 0.5) * 2;
    controls.target.set(0, 0.5, 0);
  } else {
    controls.enabled = true;
  }

  // OrbitControls damping update
  controls.update();

  // Apply Screen Shake right before rendering
  let originalCamPos = null;
  if (GameEngine.screenShakeTimer > 0) {
    originalCamPos = camera.position.clone();
    const intensity = GameEngine.screenShakeIntensity;
    camera.position.x += (Math.random() - 0.5) * intensity;
    camera.position.y += (Math.random() - 0.5) * intensity;
    camera.position.z += (Math.random() - 0.5) * intensity;
  }

  // Render Scene
  renderer.render(scene, camera);

  // Restore camera position if shaken
  if (originalCamPos) {
    camera.position.copy(originalCamPos);
  }
}

// ----------------------------------------------------
// START PROGRAM FLOW
// ----------------------------------------------------
GameEngine.onThemeChange = updateEnvironment;

runPreloader();
initThree();
setupDiagnostics();

// Start Attract Mode (autoplay) on main menu immediately in the background
GameEngine.startAttractMode(scene);

animate();
GameEngine.log("Space Defense matrix fully operational. Awaiting session spawn.", "system");
