import * as THREE from 'three';
import Map from './Map.js';
import ModelGenerator from './ModelGenerator.js';
import Particles from './Particles.js';
import AudioSynth from './AudioSynth.js';

function safeDispose(obj) {
  if (!obj) return;
  if (obj.geometry) {
    obj.geometry.dispose();
  }
  if (obj.material) {
    const sharedMats = Object.values(ModelGenerator.materials);
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach(m => {
      if (!sharedMats.includes(m)) {
        m.dispose();
      }
    });
  }
  if (obj.children) {
    obj.children.forEach(safeDispose);
  }
}

class GameEngine {
  constructor() {
    this.scene = null;
    this.worldTheme = 1;
    this.difficulty = 1.0; // 0.8: Easy, 1.0: Normal, 1.4: Hard

    // Game stats
    this.gold = 160;
    this.lives = 20;
    this.score = 0;
    this.wave = 0;
    this.gameActive = false;
    this.isPaused = false;
    this.speedMultiplier = 1.0;
    this.enemiesKilled = 0;
    this.isAttractMode = false;
    this.autoBuildTimer = 0;

    // Entity collections
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.scenery = [];
    this.grid = [];

    // Pathway nodes cached
    this.waypoints = [];
    this.airSpawnPos = null;
    this.airCastlePos = null;

    // Spawning wave state
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnDelay = 0.5;
    this.waveTotalCount = 0;
    this.waveSpawnedCount = 0;
    this.isWaveInProgress = false;

    // Selected tower for range ring visualization
    this.selectedTower = null;

    // Sound alert cooldown
    this.lastAlarmTime = 0;

    // Projectile object pool rings
    this.arrowPool = [];
    this.cannonPool = [];
    this.frostPool = [];
    this.poolIndices = { archer: 0, cannon: 0, frost: 0 };
    this.maxProjPool = 30;

    // Dev cheat lists
    this.cheatCommands = ['/gold', '/heal', '/spawn', '/killall', '/win'];

    // Custom console logger
    this.logCallback = null;
    this.onThemeChange = null;
    
    // Bind materials from ModelGenerator
    this.materials = ModelGenerator.materials;
  }

  // Bind console log trigger to display logs on the screen HUD
  setLogCallback(callback) {
    this.logCallback = callback;
  }

  log(msg, type = 'system') {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    if (this.logCallback) {
      this.logCallback(msg, type);
    }
  }

  // Pre-allocate projectiles for object pooling
  initProjectilePool() {
    // Clear old pool meshes
    const clearPool = (pool) => {
      pool.forEach(p => {
        safeDispose(p.mesh);
        this.scene.remove(p.mesh);
      });
    };
    clearPool(this.arrowPool);
    clearPool(this.cannonPool);
    clearPool(this.frostPool);
    this.arrowPool = [];
    this.cannonPool = [];
    this.frostPool = [];
    this.poolIndices = { archer: 0, cannon: 0, frost: 0 };

    // Fill pool
    for (let i = 0; i < this.maxProjPool; i++) {
      // Archer
      const arrowMesh = ModelGenerator.createProjectileMesh('archer');
      arrowMesh.visible = false;
      this.scene.add(arrowMesh);
      this.arrowPool.push({ mesh: arrowMesh, active: false });

      // Cannon
      const cannonMesh = ModelGenerator.createProjectileMesh('cannon');
      cannonMesh.visible = false;
      this.scene.add(cannonMesh);
      this.cannonPool.push({ mesh: cannonMesh, active: false });

      // Frost
      const frostMesh = ModelGenerator.createProjectileMesh('frost');
      frostMesh.visible = false;
      this.scene.add(frostMesh);
      this.frostPool.push({ mesh: frostMesh, active: false });
    }
  }

  // Initialize a level layout and map variables
  startLevel(scene, worldTheme, diffMultiplier) {
    this.scene = scene;
    this.worldTheme = parseInt(worldTheme);
    this.difficulty = parseFloat(diffMultiplier);

    this.isAttractMode = false;
    AudioSynth.isAttractMode = false;

    if (this.onThemeChange) {
      this.onThemeChange(this.worldTheme);
    }

    // Initial Stats
    this.gold = this.worldTheme === 1 ? 160 : (this.worldTheme === 2 ? 140 : 120);
    this.lives = 20;
    this.score = 0;
    this.wave = 0;
    this.enemiesKilled = 0;
    this.gameActive = true;
    this.isPaused = false;
    this.speedMultiplier = 1.0;
    this.isWaveInProgress = false;
    this.spawnQueue = [];

    // Clear old entities
    this.clearAllEntities();

    // Set BGM theme
    AudioSynth.setWorldTheme(this.worldTheme);

    // Generate Map and calculate vectors
    const mapData = Map.generateGrid(this.worldTheme);
    this.grid = mapData.grid;
    this.waypoints = Map.calculateWaypoints(this.worldTheme);
    const airData = Map.calculateAirPath(this.worldTheme);
    this.airSpawnPos = airData.spawn3D;
    this.airCastlePos = airData.castle3D;

    // Render Tile meshes in 3D
    for (let r = 0; r < Map.gridSize; r++) {
      for (let c = 0; c < Map.gridSize; c++) {
        const cell = this.grid[r][c];
        const tileMesh = ModelGenerator.createTileMesh(cell.type, this.worldTheme);
        tileMesh.position.copy(cell.worldPos);
        this.scene.add(tileMesh);
        cell.mesh = tileMesh; // cache mesh ref
      }
    }

    // Place decorative scenery objects
    const sceneryPlacements = Map.getSceneryPositions(this.grid, this.worldTheme);
    sceneryPlacements.forEach(pos => {
      const type = this.worldTheme === 1 ? 'tree' : (this.worldTheme === 2 ? 'crystal' : 'ice_spire');
      const mesh = ModelGenerator.createSceneryMesh(type);
      mesh.position.copy(pos.worldPos);
      this.scene.add(mesh);
      this.scenery.push(mesh);
    });

    // Setup project pools
    this.initProjectilePool();
    Particles.init(this.scene, null, document.getElementById('billboard-container'));

    this.log(`Started World ${this.worldTheme}: ${this.getWorldName()} (Diff: ${this.difficulty}x)`, 'system');
  }

  startAttractMode(scene) {
    this.scene = scene;
    const randomTheme = Math.floor(Math.random() * 3) + 1;
    AudioSynth.isAttractMode = true;
    this.startLevel(scene, randomTheme, 1.0);
    this.isAttractMode = true;
    this.gold = 10000;
    this.autoBuildTimer = 0;
    this.log(`Started Attract Mode on World ${randomTheme}`, "system");
  }

  performAttractModeAction() {
    if (this.gold < 1000) {
      this.gold = 10000;
    }

    const emptyGrassCells = [];
    const builtTowers = [];
    for (let r = 0; r < Map.gridSize; r++) {
      for (let c = 0; c < Map.gridSize; c++) {
        const cell = this.grid[r][c];
        if (cell.type === 'grass') {
          if (!cell.tower) {
            emptyGrassCells.push(cell);
          } else if (cell.tower !== 'scenery') {
            builtTowers.push(cell.tower);
          }
        }
      }
    }

    const upgradeProbability = builtTowers.length > 0 ? 0.45 : 0.0;
    if (Math.random() < upgradeProbability) {
      const upgradeableTowers = builtTowers.filter(t => t.level < 3);
      if (upgradeableTowers.length > 0) {
        const targetTower = upgradeableTowers[Math.floor(Math.random() * upgradeableTowers.length)];
        this.upgradeTower(targetTower);
        return;
      }
    }

    if (emptyGrassCells.length > 0) {
      const cell = emptyGrassCells[Math.floor(Math.random() * emptyGrassCells.length)];
      const towerTypes = ['archer', 'cannon', 'frost', 'laser'];
      const randomType = towerTypes[Math.floor(Math.random() * towerTypes.length)];
      this.buildTower(randomType, cell.col, cell.row);
    }
  }

  // Clear all meshes from Three scene to avoid memory leaks
  clearAllEntities() {
    // Remove towers
    this.towers.forEach(t => {
      safeDispose(t.mesh);
      this.scene.remove(t.mesh);
      if (t.laserBeam) {
        this.scene.remove(t.laserBeam);
        safeDispose(t.laserBeam);
      }
      if (t.rangeRing) {
        this.scene.remove(t.rangeRing);
        safeDispose(t.rangeRing);
      }
    });
    this.towers = [];

    // Remove enemies
    this.enemies.forEach(e => {
      safeDispose(e.mesh);
      this.scene.remove(e.mesh);
    });
    this.enemies = [];

    // Remove scenery
    this.scenery.forEach(s => {
      safeDispose(s);
      this.scene.remove(s);
    });
    this.scenery = [];

    // Remove grid tiles
    for (let r = 0; r < Map.gridSize; r++) {
      if (this.grid[r]) {
        for (let c = 0; c < Map.gridSize; c++) {
          const cell = this.grid[r][c];
          if (cell && cell.mesh) {
            safeDispose(cell.mesh);
            this.scene.remove(cell.mesh);
          }
        }
      }
    }
    this.grid = [];

    // Reset projectile pools
    const clearPool = (pool) => {
      pool.forEach(p => {
        safeDispose(p.mesh);
        this.scene.remove(p.mesh);
      });
    };
    clearPool(this.arrowPool);
    clearPool(this.cannonPool);
    clearPool(this.frostPool);
    this.arrowPool = [];
    this.cannonPool = [];
    this.frostPool = [];

    this.selectedTower = null;
    Particles.clearAll();
  }

  getWorldName() {
    if (this.worldTheme === 1) return "Cyber-Neon Oasis";
    if (this.worldTheme === 2) return "Volcanic Foundry";
    return "Frozen Glitch Circuit";
  }

  // ----------------------------------------------------
  // TOWER PLACEMENT & ACTIONS
  // ----------------------------------------------------
  getTowerCost(type) {
    if (type === 'archer') return 60;
    if (type === 'cannon') return 100;
    if (type === 'frost') return 90;
    if (type === 'laser') return 140;
    return 0;
  }

  getTowerStats(type, level = 1) {
    const scale = Math.pow(1.5, level - 1);
    if (type === 'archer') {
      return { range: 3.5, damage: 18 * scale, fireRate: 1.2, cost: 60 };
    } else if (type === 'cannon') {
      return { range: 4.2, damage: 35 * scale, fireRate: 0.5, cost: 100, splashRadius: 2.2 };
    } else if (type === 'frost') {
      return { range: 3.0, damage: 4 * scale, fireRate: 0.8, cost: 90, slowFactor: 0.5, slowDuration: 2.5 };
    } else if (type === 'laser') {
      return { range: 3.8, damage: 24 * scale, fireRate: 4.0, cost: 140 }; // laser DPS
    }
  }

  buildTower(type, col, row) {
    if (col < 0 || col >= Map.gridSize || row < 0 || row >= Map.gridSize) return false;
    
    const cell = this.grid[row][col];
    if (cell.type !== 'grass' || cell.tower !== null) {
      this.log("Cannot build here! Grid cell is blocked.", "error");
      return false;
    }

    const cost = this.getTowerCost(type);
    if (this.gold < cost) {
      this.log("Insufficient gold to build this tower!", "error");
      return false;
    }

    this.gold -= cost;
    AudioSynth.playBuild(cell.worldPos.x);

    // Build mesh
    const towerMesh = ModelGenerator.createTowerMesh(type, 1);
    towerMesh.position.copy(cell.worldPos);
    this.scene.add(towerMesh);

    // Build Range Visualizer Circle (hidden initially)
    const stats = this.getTowerStats(type, 1);
    const rangeGeo = new THREE.CylinderGeometry(stats.range, stats.range, 0.08, 32, 1, true);
    const rangeMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const rangeRing = new THREE.Mesh(rangeGeo, rangeMat);
    rangeRing.position.set(cell.worldPos.x, 0.08, cell.worldPos.z);
    rangeRing.visible = false;
    this.scene.add(rangeRing);

    const towerObj = {
      type: type,
      level: 1,
      gridX: col,
      gridZ: row,
      mesh: towerMesh,
      rangeRing: rangeRing,
      stats: stats,
      fireTimer: 0,
      target: null,
      targetingMode: 'first',
      kills: 0,
      laserBeam: null // holds cylinder visual for laser tower
    };

    this.towers.push(towerObj);
    cell.tower = towerObj;

    // Sparkles
    Particles.spawnExplosion(cell.worldPos, 15, 0x00f0ff, 0.8);
    Particles.spawnFloatText("BUILT", cell.worldPos, 'system');

    this.log(`Built ${type.toUpperCase()} tower at Grid (${col}, ${row})`, "build");
    return true;
  }

  upgradeTower(tower) {
    if (tower.level >= 3) {
      this.log("Tower is already at maximum level!", "error");
      return;
    }

    const cost = Math.floor(tower.stats.cost * 1.4 * tower.level);
    if (this.gold < cost) {
      this.log("Insufficient gold to upgrade!", "error");
      return;
    }

    this.gold -= cost;
    tower.level++;
    tower.stats = this.getTowerStats(tower.type, tower.level);
    AudioSynth.playUpgrade(tower.mesh.position.x);

    // Replace 3D Mesh
    const oldPos = tower.mesh.position.clone();
    this.scene.remove(tower.mesh);
    safeDispose(tower.mesh);

    const newMesh = ModelGenerator.createTowerMesh(tower.type, tower.level);
    newMesh.position.copy(oldPos);
    this.scene.add(newMesh);
    tower.mesh = newMesh;

    // Update range ring
    this.scene.remove(tower.rangeRing);
    safeDispose(tower.rangeRing);
    
    const rangeGeo = new THREE.CylinderGeometry(tower.stats.range, tower.stats.range, 0.08, 32, 1, true);
    tower.rangeRing = new THREE.Mesh(rangeGeo, tower.rangeRing.material);
    tower.rangeRing.position.set(oldPos.x, 0.08, oldPos.z);
    tower.rangeRing.visible = (this.selectedTower === tower);
    this.scene.add(tower.rangeRing);

    // Floating text & particles
    Particles.spawnExplosion(oldPos, 20, 0xffaa00, 1.0);
    Particles.spawnFloatText(`LVL ${tower.level}`, oldPos, 'system');

    this.log(`Upgraded ${tower.type.toUpperCase()} tower to Level ${tower.level}`, "build");
  }

  sellTower(tower) {
    const refund = Math.floor(tower.stats.cost * 0.7 * tower.level);
    this.gold += refund;
    AudioSynth.playSell(tower.mesh.position.x);

    // Clean mesh memory
    safeDispose(tower.mesh);
    this.scene.remove(tower.mesh);

    if (tower.laserBeam) {
      this.scene.remove(tower.laserBeam);
      safeDispose(tower.laserBeam);
    }

    this.scene.remove(tower.rangeRing);
    safeDispose(tower.rangeRing);

    // Reset grid cell state
    const cell = this.grid[tower.gridZ][tower.gridX];
    cell.tower = null;

    // Remove from array
    const idx = this.towers.indexOf(tower);
    if (idx !== -1) this.towers.splice(idx, 1);

    if (this.selectedTower === tower) this.selectedTower = null;

    Particles.spawnExplosion(tower.mesh.position, 12, 0xff0055, 0.7);
    Particles.spawnFloatText(`+${refund}g`, tower.mesh.position, 'gold');

    this.log(`Sold tower for +${refund} gold.`, "gold");
  }

  selectTowerAt(col, row) {
    // Hide previous selection range rings
    if (this.selectedTower) {
      this.selectedTower.rangeRing.visible = false;
    }

    const cell = this.grid[row]?.[col];
    if (cell && cell.tower && cell.tower !== 'scenery') {
      this.selectedTower = cell.tower;
      this.selectedTower.rangeRing.visible = true;
      return this.selectedTower;
    }
    this.selectedTower = null;
    return null;
  }

  deselect() {
    if (this.selectedTower) {
      this.selectedTower.rangeRing.visible = false;
      this.selectedTower = null;
    }
  }

  // ----------------------------------------------------
  // WAVE SEQUENCER
  // ----------------------------------------------------
  startNextWave() {
    if (this.isWaveInProgress) return;

    this.wave++;
    this.isWaveInProgress = true;
    this.waveSpawnedCount = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;

    // Setup waves: 1 to 6 are handcrafted, 7+ scales infinitely
    let enemyList = [];
    if (this.wave === 1) {
      enemyList = [
        { type: 'slime', count: 6, delay: 1.8 }
      ];
    } else if (this.wave === 2) {
      enemyList = [
        { type: 'slime', count: 8, delay: 1.4 },
        { type: 'runner', count: 4, delay: 1.6 } // flying bats intro
      ];
    } else if (this.wave === 3) {
      enemyList = [
        { type: 'golem', count: 3, delay: 3.5 }, // slow golems
        { type: 'slime', count: 6, delay: 1.0 }
      ];
    } else if (this.wave === 4) {
      enemyList = [
        { type: 'runner', count: 8, delay: 1.2 },
        { type: 'golem', count: 4, delay: 2.5 }
      ];
    } else if (this.wave === 5) {
      enemyList = [
        { type: 'runner', count: 12, delay: 0.8 } // Anti-air check
      ];
    } else if (this.wave === 6) {
      enemyList = [
        { type: 'boss', count: 1, delay: 1.0 }, // Dragon boss wave!
        { type: 'golem', count: 4, delay: 3.0 },
        { type: 'slime', count: 8, delay: 1.0 }
      ];
    } else {
      // Infinite Waves Scaling
      const scaler = Math.pow(1.22, this.wave - 6);
      const slimeCount = Math.floor(8 * scaler);
      const runnerCount = Math.floor(4 * scaler);
      const golemCount = Math.floor(2 * scaler);
      const bossSpawn = (this.wave % 5 === 0) ? 1 : 0; // Boss every 5 waves

      enemyList = [
        { type: 'slime', count: slimeCount, delay: Math.max(0.4, 1.2 / scaler) },
        { type: 'runner', count: runnerCount, delay: Math.max(0.5, 1.4 / scaler) },
        { type: 'golem', count: golemCount, delay: Math.max(1.0, 3.0 / scaler) }
      ];
      if (bossSpawn > 0) {
        enemyList.unshift({ type: 'boss', count: bossSpawn, delay: 1.5 });
      }
    }

    // Populate Spawn Queue
    enemyList.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({ type: group.type, delay: group.delay });
      }
    });

    this.waveTotalCount = this.spawnQueue.length;
    this.log(`Wave ${this.wave} starting! Spawning ${this.waveTotalCount} entities...`, "system");
  }

  // Spawn single enemy mesh into the active lists
  spawnEnemy(type) {
    const eMesh = ModelGenerator.createEnemyMesh(type);
    
    // Scale and properties based on type and waves
    let hp = 100;
    let speed = 0.8;
    let reward = 10;
    let isAir = false;

    // Apply scaling for infinite mode (wave > 6)
    let scalingFactor = 1.0;
    let speedScaler = 1.0;
    if (this.wave > 6) {
      scalingFactor = Math.pow(1.28, this.wave - 6);
      speedScaler = Math.min(1.8, 1.0 + 0.05 * (this.wave - 6));
    }

    if (type === 'slime') {
      hp = 45 * scalingFactor;
      speed = 0.9 * speedScaler;
      reward = 8 * Math.pow(1.12, Math.max(0, this.wave - 6));
    } else if (type === 'runner') {
      hp = 30 * scalingFactor;
      speed = 1.6 * speedScaler;
      reward = 12 * Math.pow(1.12, Math.max(0, this.wave - 6));
      isAir = true; // Bat flies!
    } else if (type === 'golem') {
      hp = 180 * scalingFactor;
      speed = 0.5 * speedScaler;
      reward = 25 * Math.pow(1.12, Math.max(0, this.wave - 6));
    } else if (type === 'boss') {
      hp = 1200 * scalingFactor;
      speed = 0.45 * speedScaler;
      reward = 150 * Math.pow(1.12, Math.max(0, this.wave - 6));
    }

    // Apply difficulty multiplier
    hp *= this.difficulty;
    speed *= this.difficulty;

    // Setup coordinates
    if (isAir) {
      eMesh.position.copy(this.airSpawnPos);
    } else {
      eMesh.position.copy(this.waypoints[0]);
    }

    this.scene.add(eMesh);

    // Billboarding Floating Health Bar Core
    const hpBarGeo = new THREE.BoxGeometry(0.6, 0.08, 0.02);
    const hpBarMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 }); // green
    const hpBar = new THREE.Mesh(hpBarGeo, hpBarMat);
    hpBar.position.y = type === 'boss' ? 2.5 : 1.1;
    hpBar.name = "hp_bar";
    eMesh.add(hpBar);

    const enemyObj = {
      type: type,
      hp: hp,
      maxHp: hp,
      speed: speed,
      reward: Math.floor(reward),
      isAir: isAir,
      mesh: eMesh,
      hpBar: hpBar,
      waypointIdx: 0,
      slowTimer: 0,
      originalSpeed: speed,
      dragonRoarTimer: 5.0 // specific to Boss roar
    };

    this.enemies.push(enemyObj);
    this.waveSpawnedCount++;
  }

  // ----------------------------------------------------
  // LAUNCH PROJECTILES
  // ----------------------------------------------------
  fireProjectile(tower, enemy) {
    if (tower.type === 'laser') return; // Handled dynamically in update

    const nozzleY = tower.type === 'frost' ? 0.8 : 0.65;
    const startPos = tower.mesh.position.clone().add(new THREE.Vector3(0, nozzleY, 0));

    // Spatial sound panning
    AudioSynth.playShoot(tower.type, tower.mesh.position.x);

    if (tower.type === 'archer') {
      // Find inactive arrow in pool
      const proj = this.arrowPool.find(p => !p.active);
      if (proj) {
        proj.active = true;
        proj.mesh.position.copy(startPos);
        proj.mesh.visible = true;

        proj.data = {
          type: 'archer',
          start: startPos.clone(),
          target: enemy,
          damage: tower.stats.damage,
          t: 0.0,
          speed: 2.2
        };
      }
    } else if (tower.type === 'cannon') {
      const proj = this.cannonPool.find(p => !p.active);
      if (proj) {
        proj.active = true;
        proj.mesh.position.copy(startPos);
        proj.mesh.visible = true;

        // Cannonballs travel in direct fast vectors, aimed at current floor coordinates
        const targetPos = enemy.mesh.position.clone();
        proj.data = {
          type: 'cannon',
          start: startPos.clone(),
          targetPos: targetPos,
          damage: tower.stats.damage,
          splash: tower.stats.splashRadius,
          speed: 6.0
        };
      }
    } else if (tower.type === 'frost') {
      const proj = this.frostPool.find(p => !p.active);
      if (proj) {
        proj.active = true;
        proj.mesh.position.copy(startPos);
        proj.mesh.visible = true;

        proj.data = {
          type: 'frost',
          start: startPos.clone(),
          target: enemy,
          damage: tower.stats.damage,
          slowFactor: tower.stats.slowFactor,
          slowDuration: tower.stats.slowDuration,
          t: 0.0,
          speed: 3.5
        };
      }
    }
  }

  // ----------------------------------------------------
  // ENGINE TICK UPDATES
  // ----------------------------------------------------
  update(deltaTime) {
    if (!this.gameActive || this.isPaused) return;

    const dt = Math.min(deltaTime, 0.1) * this.speedMultiplier;

    if (this.isAttractMode) {
      if (!this.isWaveInProgress && this.spawnQueue.length === 0 && this.enemies.length === 0) {
        this.startNextWave();
      }

      this.autoBuildTimer += dt;
      if (this.autoBuildTimer >= 2.5) {
        this.autoBuildTimer = 0;
        this.performAttractModeAction();
      }
    }

    // 1. Spawning Queue Manager
    if (this.isWaveInProgress && this.spawnQueue.length > 0) {
      this.spawnTimer += dt;
      const nextSpawn = this.spawnQueue[0];
      if (this.spawnTimer >= nextSpawn.delay) {
        this.spawnTimer = 0;
        this.spawnEnemy(nextSpawn.type);
        this.spawnQueue.shift();
      }
    }

    // 2. Update Active Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Handle slow timer decays
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        enemy.speed = enemy.originalSpeed * 0.5; // Apply 50% slow
        if (enemy.slowTimer <= 0) {
          enemy.speed = enemy.originalSpeed;
        }
      }

      // Movement step
      const stepDist = enemy.speed * dt;

      if (enemy.isAir) {
        // Fly straight from Spawn to Castle
        const dir = new THREE.Vector3().subVectors(this.airCastlePos, enemy.mesh.position);
        const dist = dir.length();
        
        if (stepDist >= dist) {
          // Reached Castle! Damage player
          this.damageCastle();
          this.removeEnemy(enemy, i);
          continue;
        } else {
          dir.normalize();
          enemy.mesh.position.addScaledVector(dir, stepDist);
          // Look forward
          enemy.mesh.lookAt(this.airCastlePos);
        }

        // Flap Bat wings
        const leftWing = enemy.mesh.getObjectByName("wing_L");
        const rightWing = enemy.mesh.getObjectByName("wing_R");
        if (leftWing && rightWing) {
          const time = this.scene ? this.scene.parentTime || Date.now() * 0.001 : Date.now() * 0.001;
          leftWing.rotation.z = Math.sin(time * 20) * 0.8;
          rightWing.rotation.z = -Math.sin(time * 20) * 0.8;
          // hover bobbing Y offset
          enemy.mesh.position.y = 1.8 + Math.sin(time * 6) * 0.15;
        }

      } else {
        // Ground unit follow waypoints
        const targetWaypoint = this.waypoints[enemy.waypointIdx];
        const dir = new THREE.Vector3().subVectors(targetWaypoint, enemy.mesh.position);
        const dist = dir.length();

        if (stepDist >= dist) {
          // Snap and advance
          enemy.mesh.position.copy(targetWaypoint);
          enemy.waypointIdx++;
          if (enemy.waypointIdx >= this.waypoints.length) {
            // Reached Castle! Damage player
            this.damageCastle();
            this.removeEnemy(enemy, i);
            continue;
          }
        } else {
          dir.normalize();
          enemy.mesh.position.addScaledVector(dir, stepDist);
          // Look towards next waypoint
          enemy.mesh.lookAt(targetWaypoint);
        }

        const time = this.scene ? this.scene.parentTime || Date.now() * 0.001 : Date.now() * 0.001;
        // Squish Slime jump animation
        if (enemy.type === 'slime') {
          const jelly = enemy.mesh.getObjectByName("jelly");
          if (jelly) {
            const scaleY = 1.0 + 0.22 * Math.sin(time * 12);
            const scaleXZ = 1.0 / Math.sqrt(scaleY);
            jelly.scale.set(scaleXZ, scaleY, scaleXZ);
          }
        }

        // Swing Golem limbs
        if (enemy.type === 'golem') {
          const body = enemy.mesh.getObjectByName("golem_body");
          const legL = enemy.mesh.getObjectByName("leg_L");
          const legR = enemy.mesh.getObjectByName("leg_R");
          const armL = enemy.mesh.getObjectByName("arm_L");
          const armR = enemy.mesh.getObjectByName("arm_R");

          if (legL && legR && armL && armR) {
            legL.rotation.x = Math.sin(time * 8) * 0.45;
            legR.rotation.x = -Math.sin(time * 8) * 0.45;
            armL.rotation.x = -Math.sin(time * 8) * 0.35;
            armR.rotation.x = Math.sin(time * 8) * 0.35;
          }
        }

        // Segmented Dragon Boss Animation & Roar
        if (enemy.type === 'boss') {
          const jaw = enemy.mesh.getObjectByName("jaw");
          const tail1 = enemy.mesh.getObjectByName("tail_1");
          const tail2 = enemy.mesh.getObjectByName("tail_2");
          const tail3 = enemy.mesh.getObjectByName("tail_3");

          // Wag tail
          if (tail1 && tail2 && tail3) {
            tail1.rotation.y = Math.sin(time * 5) * 0.25;
            tail2.rotation.y = Math.sin(time * 5 - 0.5) * 0.25;
            tail3.rotation.y = Math.sin(time * 5 - 1.0) * 0.25;
          }

          // Slow bite loop
          if (jaw) {
            jaw.rotation.x = 0.2 + 0.15 * Math.sin(time * 4);
          }

          // ROAR BUFF MECHANIC: every 8s
          enemy.dragonRoarTimer -= dt;
          if (enemy.dragonRoarTimer <= 0) {
            enemy.dragonRoarTimer = 8.0;
            // Roar visual & sound triggers
            AudioSynth.playWarning(); // roar sound
            Particles.spawnExplosion(enemy.mesh.position, 25, 0xff00ff, 1.5);
            Particles.spawnFloatText("ROAR!", enemy.mesh.position, 'life-lost');

            // Apply speed buff to nearby ground enemies
            this.enemies.forEach(other => {
              if (other !== enemy && !other.isAir) {
                const dist = other.mesh.position.distanceTo(enemy.mesh.position);
                if (dist <= 4.0) {
                  other.speed = other.originalSpeed * 1.5;
                  other.slowTimer = 0; // clear slows
                  other.originalSpeed *= 1.15; // permanent mini buff
                  Particles.spawnFloatText("SPEED UP!", other.mesh.position, 'system');
                }
              }
            });
          }
        }
      }

      // Keep Health Bar billboard facing the camera
      if (enemy.hpBar && this.camera) {
        enemy.hpBar.quaternion.copy(this.camera.quaternion);
      }
    }

    // 3. Update Projectiles
    const updateProjectiles = (pool) => {
      for (let j = pool.length - 1; j >= 0; j--) {
        const p = pool[j];
        if (!p.active) continue;

        const data = p.data;

        if (data.type === 'cannon') {
          // Cannon direct speed lines
          const dir = new THREE.Vector3().subVectors(data.targetPos, p.mesh.position);
          const dist = dir.length();
          const step = data.speed * dt;

          if (step >= dist) {
            // Impact! Resolve Splash damage
            p.mesh.position.copy(data.targetPos);
            this.resolveCannonBlast(data.targetPos, data.damage, data.splash);
            p.mesh.visible = false;
            p.active = false;
          } else {
            dir.normalize();
            p.mesh.position.addScaledVector(dir, step);
          }

        } else {
          // Homing parabola (Archer or Frost)
          data.t += data.speed * dt;
          if (data.t >= 1.0) {
            // Hit enemy
            this.resolveHomingHit(p);
          } else {
            // Update Bezier curve targeting
            const p0 = data.start;
            const p2 = data.target.mesh.position;
            const p1 = new THREE.Vector3().addVectors(p0, p2).multiplyScalar(0.5);
            p1.y += 2.0; // height arch

            // Quadratic bezier formula
            const t = data.t;
            p.mesh.position.set(
              (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x,
              (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y,
              (1-t)*(1-t)*p0.z + 2*(1-t)*t*p1.z + t*t*p2.z
            );

            // Orient forward
            const lookPos = new THREE.Vector3();
            // simple derivative vector to look forward
            const dt_t = t + 0.05;
            lookPos.set(
              (1-dt_t)*(1-dt_t)*p0.x + 2*(1-dt_t)*dt_t*p1.x + dt_t*dt_t*p2.x,
              (1-dt_t)*(1-dt_t)*p0.y + 2*(1-dt_t)*dt_t*p1.y + dt_t*dt_t*p2.y,
              (1-dt_t)*(1-dt_t)*p0.z + 2*(1-dt_t)*dt_t*p1.z + dt_t*dt_t*p2.z
            );
            p.mesh.lookAt(lookPos);
          }
        }
      }
    };

    updateProjectiles(this.arrowPool);
    updateProjectiles(this.cannonPool);
    updateProjectiles(this.frostPool);

    // 4. Update Towers
    this.towers.forEach(t => {
      // Rotate idle breathing
      const time = this.scene ? this.scene.parentTime || Date.now() * 0.001 : Date.now() * 0.001;
      t.mesh.getObjectByName("weapon").position.y = 0.15 + 0.04 * Math.sin(time * 2.5);

      // Decrement cooldown
      if (t.fireTimer > 0) t.fireTimer -= dt;

      // Scanning active targets in range
      let target = t.target;
      if (target && (!this.enemies.includes(target) || target.mesh.position.distanceTo(t.mesh.position) > t.stats.range)) {
        target = null;
        t.target = null;
      }

      if (!target) {
        target = this.findTarget(t);
        t.target = target;
      }

      // Align turret head rotation to look at target
      const turretGroup = t.mesh.getObjectByName("turret");
      if (turretGroup && target) {
        const localTarget = target.mesh.position.clone();
        localTarget.y = turretGroup.parent.position.y + turretGroup.position.y;
        turretGroup.lookAt(localTarget);
        // adjust look vector offsets
      }

      // Handle continuous Laser Tower beam
      if (t.type === 'laser') {
        if (target) {
          // Render glowing Pink cylinder connecting turret core to enemy center
          if (!t.laserBeam) {
            const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6, 1, false);
            t.laserBeam = new THREE.Mesh(beamGeo, this.materials['laser_beam']);
            this.scene.add(t.laserBeam);
          }

          t.laserBeam.visible = true;

          // Account for dynamic laser core bobbing
          const core = t.mesh.getObjectByName("laser_core");
          const bobOffset = core ? core.position.y : 0;
          const startNode = t.mesh.position.clone().add(new THREE.Vector3(0, turretGroup.position.y + 0.25 + bobOffset, 0));

          // Account for enemy hit height offsets (aim for center of mass)
          let heightOffset = 0.05;
          if (target.type === 'golem') {
            heightOffset = 0.65;
          } else if (target.type === 'boss') {
            heightOffset = 1.25;
          } else if (target.type === 'slime') {
            heightOffset = 0.15;
          }
          const endNode = target.mesh.position.clone().add(new THREE.Vector3(0, heightOffset, 0));

          const dir = new THREE.Vector3().subVectors(endNode, startNode);
          const dist = dir.length();
          dir.normalize();

          t.laserBeam.position.addVectors(startNode, endNode).multiplyScalar(0.5);
          t.laserBeam.scale.set(1.0, dist, 1.0);
          
          // Align cylinder (along Y-axis) to vector direction
          const alignAxis = new THREE.Vector3(0, 1, 0);
          t.laserBeam.quaternion.setFromUnitVectors(alignAxis, dir);

          // Apply Continuous damage
          const dmg = t.stats.damage * dt;
          target.hp -= dmg;
          this.updateHealthBar(target);

          // Spawn laser hit spark particles
          if (Math.random() < 0.25) {
            Particles.spawnExplosion(endNode, 2, 0xff007f, 0.4);
            AudioSynth.playShoot('laser', startNode.x);
          }

          if (target.hp <= 0) {
            this.killEnemy(target);
            t.target = null;
            t.laserBeam.visible = false;
          }
        } else {
          if (t.laserBeam) t.laserBeam.visible = false;
        }
      } else {
        // Projectile Towers firing
        if (target && t.fireTimer <= 0) {
          t.fireTimer = 1.0 / t.stats.fireRate;
          this.fireProjectile(t, target);

          // Cannon firing barrel recoil animation
          if (t.type === 'cannon') {
            const weapon = t.mesh.getObjectByName("weapon");
            if (weapon) {
              weapon.position.z = -0.3; // recoil back
              setTimeout(() => { if (weapon) weapon.position.z = 0; }, 100);
            }
          }
        }
      }
    });

    // 5. Update Wave End Checker
    if (this.isWaveInProgress && this.enemies.length === 0 && this.spawnQueue.length === 0) {
      this.isWaveInProgress = false;
      this.resolveWaveEnd();
    }
  }

  // ----------------------------------------------------
  // PROJECTILE COLLISION & RESOLUTION
  // ----------------------------------------------------
  resolveHomingHit(p) {
    p.active = false;
    p.mesh.visible = false;

    const data = p.data;
    const enemy = data.target;

    if (!this.enemies.includes(enemy)) return; // target already died

    // Apply Damage
    let finalDmg = data.damage;
    let isCrit = false;

    // Archer 10% Crit Chance
    if (data.type === 'archer' && Math.random() < 0.12) {
      finalDmg *= 2.0;
      isCrit = true;
    }

    enemy.hp -= finalDmg;
    this.updateHealthBar(enemy);

    // Hit sounds
    AudioSynth.playHit(enemy.mesh.position.x);

    // Hit visual explosion
    const sparkColor = data.type === 'frost' ? 0x00f0ff : 0xe0e0ff;
    Particles.spawnExplosion(enemy.mesh.position, 6, sparkColor, 0.5);

    // Damage numbers popup
    const popupText = isCrit ? `${Math.floor(finalDmg)} CRIT!` : `${Math.floor(finalDmg)}`;
    Particles.spawnFloatText(popupText, enemy.mesh.position, isCrit ? 'crit' : 'damage');

    // Apply slow effects if Frost
    if (data.type === 'frost') {
      enemy.slowTimer = data.slowDuration;
    }

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  resolveCannonBlast(impactPos, damage, radius) {
    // Blast particles & SFX
    Particles.spawnExplosion(impactPos, 22, 0xff5500, 1.2);
    AudioSynth.playHit(impactPos.x);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.isAir) continue; // cannon ignores air units

      const dist = enemy.mesh.position.distanceTo(impactPos);
      if (dist <= radius) {
        // Splash formula (full damage at center, decaying to 50% at edges)
        const factor = 1.0 - (dist / radius) * 0.5;
        const finalDmg = damage * factor;

        enemy.hp -= finalDmg;
        this.updateHealthBar(enemy);

        Particles.spawnFloatText(`${Math.floor(finalDmg)}`, enemy.mesh.position, 'damage');

        if (enemy.hp <= 0) {
          this.killEnemy(enemy);
        }
      }
    }
  }

  updateHealthBar(enemy) {
    if (enemy.hpBar) {
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      enemy.hpBar.scale.x = ratio;
      // Change color based on health remaining
      if (ratio < 0.35) {
        enemy.hpBar.material.color.setHex(0xff0055); // red
      } else if (ratio < 0.65) {
        enemy.hpBar.material.color.setHex(0xffaa00); // orange
      } else {
        enemy.hpBar.material.color.setHex(0x39ff14); // green
      }
    }
  }

  killEnemy(enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }

    this.scene.remove(enemy.mesh);
    safeDispose(enemy.mesh);

    // Economy award
    this.gold += enemy.reward;
    this.enemiesKilled++;
    this.score += enemy.reward * 10;

    Particles.spawnExplosion(enemy.mesh.position, 12, 0x39ff14, 0.7);
    Particles.spawnFloatText(`+${enemy.reward}g`, enemy.mesh.position, 'gold');

    this.log(`Defeated ${enemy.type.toUpperCase()}. +${enemy.reward} gold awarded.`, "gold");
  }

  damageCastle() {
    if (this.isAttractMode) {
      this.lives = 20;
      return;
    }
    this.lives--;
    AudioSynth.playWarning();

    // Red screen flash VFX
    const overlay = document.body;
    overlay.style.backgroundColor = '#ff0033';
    setTimeout(() => { overlay.style.backgroundColor = '#030308'; }, 100);

    this.log(`Castle under attack! Lives remaining: ${this.lives}`, "damage");

    if (this.lives <= 0) {
      this.gameActive = false;
      AudioSynth.playDefeat();
      this.log("GAME OVER! All lives lost.", "error");
      
      // Save high scores to localStorage
      const highestWave = localStorage.getItem(`high_wave_w${this.worldTheme}`) || 0;
      if (this.wave > highestWave) {
        localStorage.setItem(`high_wave_w${this.worldTheme}`, this.wave);
      }
      
      // Trigger game over screen callback in main script
      if (this.onGameOver) this.onGameOver();
    }
  }

  removeEnemy(enemy, idx) {
    this.enemies.splice(idx, 1);
    this.scene.remove(enemy.mesh);
    safeDispose(enemy.mesh);
  }

  resolveWaveEnd() {
    const reward = 50 + this.wave * 10;
    this.gold += reward;
    AudioSynth.playVictory();
    
    Particles.spawnFloatText("WAVE COMPLETE", new THREE.Vector3(0, 3, 0), 'system');

    this.log(`Wave ${this.wave} complete! Clear reward: +${reward} gold.`, "system");
  }

  // ----------------------------------------------------
  // TARGET ACQUISITION (First, Last, Strongest, Weakest)
  // ----------------------------------------------------
  findTarget(tower) {
    let bestTarget = null;
    let bestValue = -Infinity;

    const rangeSq = tower.stats.range * tower.stats.range;
    const towerPos = tower.mesh.position;

    this.enemies.forEach(enemy => {
      // Cannon targets ground only
      if (tower.type === 'cannon' && enemy.isAir) return;

      const distSq = towerPos.distanceToSquared(enemy.mesh.position);
      if (distSq <= rangeSq) {
        let value = 0;

        if (tower.targetingMode === 'first') {
          // Furthest along track
          value = enemy.isAir ? -enemy.mesh.position.distanceTo(this.airCastlePos) : enemy.waypointIdx;
        } else if (tower.targetingMode === 'last') {
          // Closest to spawn
          value = enemy.isAir ? enemy.mesh.position.distanceTo(this.airSpawnPos) : -enemy.waypointIdx;
        } else if (tower.targetingMode === 'strongest') {
          // Highest HP
          value = enemy.hp;
        } else if (tower.targetingMode === 'weakest') {
          // Lowest HP
          value = -enemy.hp;
        }

        if (value > bestValue) {
          bestValue = value;
          bestTarget = enemy;
        }
      }
    });

    return bestTarget;
  }

  // ----------------------------------------------------
  // CHEAT INTERPRETER COMMANDS
  // ----------------------------------------------------
  executeCheat(commandString) {
    const tokens = commandString.trim().toLowerCase().split(' ');
    const command = tokens[0];

    if (!this.cheatCommands.includes(command)) {
      this.log(`Unknown cheat command: ${command}`, "error");
      return;
    }

    if (command === '/gold') {
      const amount = parseInt(tokens[1]) || 500;
      this.gold += amount;
      this.log(`CHEAT: Gold increased by +${amount}g`, "gold");
      Particles.spawnFloatText(`+${amount}g`, new THREE.Vector3(0, 2, 0), 'gold');
      AudioSynth.playVictory();

    } else if (command === '/heal') {
      const amount = parseInt(tokens[1]) || 10;
      this.lives += amount;
      this.log(`CHEAT: Castle lives restored by +${amount}`, "system");
      Particles.spawnFloatText(`+${amount} HP`, new THREE.Vector3(0, 2, 0), 'gold');
      AudioSynth.playVictory();

    } else if (command === '/spawn') {
      const type = tokens[1] || 'slime';
      const validTypes = ['slime', 'runner', 'golem', 'boss'];
      if (!validTypes.includes(type)) {
        this.log(`Invalid enemy type: ${type}. Choose from: slime, runner, golem, boss.`, "error");
        return;
      }
      this.spawnEnemy(type);
      this.log(`CHEAT: Spawning unit ${type.toUpperCase()}`, "system");

    } else if (command === '/killall') {
      const count = this.enemies.length;
      // loop backwards to safely kill
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        this.killEnemy(this.enemies[i]);
      }
      this.log(`CHEAT: Wiped all ${count} active enemies!`, "damage");

    } else if (command === '/win') {
      if (this.isWaveInProgress) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          this.killEnemy(this.enemies[i]);
        }
        this.spawnQueue = [];
        this.log("CHEAT: Instant wave victory!", "system");
      } else {
        this.log("No wave in progress to win.", "error");
      }
    }
  }
}

export default new GameEngine();
