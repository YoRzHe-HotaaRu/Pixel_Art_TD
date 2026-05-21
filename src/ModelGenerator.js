import * as THREE from 'three';
import TextureGenerator from './TextureGenerator.js';

class ModelGenerator {
  constructor() {
    this.materials = {};
  }

  // Pre-generate standard materials based on compiled textures
  init() {
    TextureGenerator.generateAll();

    // Map texture names to standard materials
    const textNames = [
      'grass', 'path', 'water', 'lava', 'obsidian', 'snow',
      'ice_path', 'dirt', 'wood', 'steel', 'gold', 'portal', 'crystal'
    ];

    textNames.forEach(name => {
      const tex = TextureGenerator.get(name);
      if (name === 'water' || name === 'lava') {
        this.materials[name] = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.2,
          metalness: 0.1,
          emissive: name === 'lava' ? new THREE.Color('#ff3300') : new THREE.Color('#002244'),
          emissiveIntensity: name === 'lava' ? 0.8 : 0.2
        });
      } else if (name === 'crystal' || name === 'portal') {
        this.materials[name] = new THREE.MeshStandardMaterial({
          map: tex,
          emissive: name === 'crystal' ? new THREE.Color('#00f0ff') : new THREE.Color('#8a00d4'),
          emissiveIntensity: 0.6,
          roughness: 0.1,
          metalness: 0.8
        });
      } else {
        this.materials[name] = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.8,
          metalness: name === 'steel' ? 0.6 : (name === 'gold' ? 0.8 : 0.1)
        });
      }
    });

    // Special materials
    this.materials['slime_jelly'] = new THREE.MeshPhysicalMaterial({
      color: 0x39ff14,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      transmission: 0.6,
      thickness: 0.5
    });

    this.materials['slime_core'] = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x39ff14,
      emissiveIntensity: 1.5
    });

    this.materials['laser_beam'] = new THREE.MeshBasicMaterial({
      color: 0xff007f, // hot neon pink
      transparent: true,
      opacity: 0.95
    });

    this.materials['black'] = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.8
    });
  }

  // ----------------------------------------------------
  // GRID MAP TILES
  // ----------------------------------------------------
  createTileMesh(type, worldTheme) {
    const tileGroup = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(1.6, 0.8, 1.6);
    
    // Select textures based on world theme
    let topMatName = 'grass';
    let pathMatName = 'path';
    
    if (worldTheme === 2) {
      topMatName = 'obsidian';
      pathMatName = 'lava';
    } else if (worldTheme === 3) {
      topMatName = 'snow';
      pathMatName = 'ice_path';
    }

    const sideMat = this.materials['dirt'];
    let topMat = this.materials[topMatName];

    if (type === 'path') {
      topMat = this.materials[pathMatName];
    } else if (type === 'river') {
      topMat = this.materials['water'];
    } else if (type === 'start') {
      topMat = this.materials['portal'];
    } else if (type === 'end') {
      topMat = this.materials['steel'];
    } else if (type === 'bridge') {
      topMat = this.materials['wood'];
    }

    const mats = [
      sideMat, // right
      sideMat, // left
      topMat,  // top
      sideMat, // bottom
      sideMat, // front
      sideMat  // back
    ];

    const baseMesh = new THREE.Mesh(boxGeo, mats);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    tileGroup.add(baseMesh);

    // Decorate Start Spawner
    if (type === 'start') {
      const ringGeo = new THREE.TorusGeometry(0.5, 0.1, 8, 24);
      const ring = new THREE.Mesh(ringGeo, this.materials['portal']);
      ring.position.y = 0.55;
      ring.rotation.x = Math.PI / 2;
      ring.name = "portal_ring";
      tileGroup.add(ring);
    }

    // Decorate Castle End
    if (type === 'end') {
      const castle = new THREE.Group();
      
      // Main Keep Base
      const keepGeo = new THREE.BoxGeometry(1.0, 0.8, 1.0);
      const keep = new THREE.Mesh(keepGeo, this.materials['steel']);
      keep.position.y = 0.8;
      keep.castShadow = true;
      castle.add(keep);

      // Four corner towers
      const towerGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
      const offsets = [
        [-0.45, -0.45], [-0.45, 0.45], [0.45, -0.45], [0.45, 0.45]
      ];
      offsets.forEach(([ox, oz]) => {
        const ct = new THREE.Mesh(towerGeo, this.materials['steel']);
        ct.position.set(ox, 1.0, oz);
        ct.castShadow = true;
        castle.add(ct);
      });

      // Neon crystal core in the middle
      const crystalGeo = new THREE.OctahedronGeometry(0.2, 0);
      const core = new THREE.Mesh(crystalGeo, this.materials['crystal']);
      core.position.set(0, 1.4, 0);
      core.name = "castle_crystal";
      castle.add(core);

      tileGroup.add(castle);
    }

    return tileGroup;
  }

  // ----------------------------------------------------
  // TOWERS (Visual Morphing per level)
  // ----------------------------------------------------
  createTowerMesh(type, level) {
    const group = new THREE.Group();
    group.name = "tower";

    // 1. BASE MODULE (Depends on Level)
    let baseGeo, baseMat;
    if (level === 1) {
      baseGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
      baseMat = this.materials['wood'];
    } else if (level === 2) {
      baseGeo = new THREE.BoxGeometry(0.9, 0.8, 0.9);
      baseMat = this.materials['steel'];
    } else { // Level 3 (Max)
      baseGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
      baseMat = this.materials['gold'];
    }

    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.3;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Add extra armor borders for Level 2 & 3
    if (level >= 2) {
      const cornerGeo = new THREE.BoxGeometry(0.2, baseGeo.parameters.height + 0.1, 0.2);
      const cMat = level === 3 ? this.materials['steel'] : this.materials['wood'];
      const bx = baseGeo.parameters.width / 2;
      const bz = baseGeo.parameters.depth / 2;
      const cornerOffsets = [
        [-bx, -bz], [-bx, bz], [bx, -bz], [bx, bz]
      ];
      cornerOffsets.forEach(([cx, cz]) => {
        const border = new THREE.Mesh(cornerGeo, cMat);
        border.position.set(cx, base.position.y + 0.05, cz);
        border.castShadow = true;
        group.add(border);
      });
    }

    // 2. HEAD/SHOOTER TURRET MODULE (Pivoting group)
    const turret = new THREE.Group();
    turret.name = "turret";
    turret.position.y = baseGeo.parameters.height;

    if (type === 'archer') {
      // Archer deck and bow
      const deckGeo = new THREE.BoxGeometry(0.7, 0.15, 0.7);
      const deck = new THREE.Mesh(deckGeo, this.materials['steel']);
      deck.castShadow = true;
      turret.add(deck);

      // Bow shooter model
      const bowGroup = new THREE.Group();
      bowGroup.name = "weapon";
      bowGroup.position.set(0, 0.15, 0);

      const shooterGeo = new THREE.BoxGeometry(0.3, 0.3, 0.4);
      const shooter = new THREE.Mesh(shooterGeo, this.materials['wood']);
      shooter.castShadow = true;
      bowGroup.add(shooter);

      // Bow wings
      const wingGeo = new THREE.BoxGeometry(0.6, 0.08, 0.08);
      const wing = new THREE.Mesh(wingGeo, this.materials['wood']);
      wing.position.set(0, 0, 0.2);
      bowGroup.add(wing);

      // Triple Bow string at Lvl 3
      if (level === 3) {
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), this.materials['crystal']);
        crystal.position.set(0, 0.2, 0);
        bowGroup.add(crystal);
      }

      turret.add(bowGroup);

    } else if (type === 'cannon') {
      const turretDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.2, 8), this.materials['steel']);
      turretDeck.castShadow = true;
      turret.add(turretDeck);

      const barrelGroup = new THREE.Group();
      barrelGroup.name = "weapon";
      barrelGroup.position.set(0, 0.15, 0);

      // Cannon Barrel
      let barrelGeo;
      if (level === 1) {
        barrelGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.6, 8);
      } else if (level === 2) {
        barrelGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.75, 8);
      } else { // Level 3 Double barrel
        barrelGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.85, 8);
      }

      const barrelMat = level === 3 ? this.materials['gold'] : this.materials['black'];

      if (level < 3) {
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.x = Math.PI / 2; // point forward
        barrel.position.z = 0.25;
        barrel.castShadow = true;
        barrelGroup.add(barrel);
      } else {
        // Double Barrel
        const b1 = new THREE.Mesh(barrelGeo, barrelMat);
        b1.rotation.x = Math.PI / 2;
        b1.position.set(-0.16, 0, 0.3);
        b1.castShadow = true;

        const b2 = new THREE.Mesh(barrelGeo, barrelMat);
        b2.rotation.x = Math.PI / 2;
        b2.position.set(0.16, 0, 0.3);
        b2.castShadow = true;

        barrelGroup.add(b1, b2);
      }

      // Back counterweight box
      const weight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), this.materials['steel']);
      weight.position.z = -0.15;
      barrelGroup.add(weight);

      turret.add(barrelGroup);

    } else if (type === 'frost') {
      // Ice crystal spire structure
      const deckGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.15, 6);
      const deck = new THREE.Mesh(deckGeo, this.materials['steel']);
      turret.add(deck);

      const crystalGroup = new THREE.Group();
      crystalGroup.name = "weapon";
      crystalGroup.position.y = 0.3;

      // Floating crystal octahedron
      const size = level === 1 ? 0.3 : (level === 2 ? 0.4 : 0.5);
      const crystalGeo = new THREE.OctahedronGeometry(size, 0);
      const crystal = new THREE.Mesh(crystalGeo, this.materials['crystal']);
      crystal.castShadow = true;
      crystal.name = "frost_crystal";
      crystalGroup.add(crystal);

      // Float orbital mini-crystals for Level 2 & 3
      if (level >= 2) {
        const miniGeo = new THREE.OctahedronGeometry(0.08, 0);
        const count = level === 3 ? 4 : 2;
        for (let i = 0; i < count; i++) {
          const orbit = new THREE.Mesh(miniGeo, this.materials['crystal']);
          const angle = (i / count) * Math.PI * 2;
          orbit.position.set(Math.cos(angle) * 0.55, 0, Math.sin(angle) * 0.55);
          orbit.name = `orbit_shard_${i}`;
          crystalGroup.add(orbit);
        }
      }

      turret.add(crystalGroup);

    } else if (type === 'laser') {
      // Futuristic laser rig
      const deckGeo = new THREE.BoxGeometry(0.6, 0.15, 0.6);
      const deck = new THREE.Mesh(deckGeo, this.materials['black']);
      turret.add(deck);

      const rig = new THREE.Group();
      rig.name = "weapon";
      rig.position.y = 0.25;

      // Side mounting pillars
      const sideArmGeo = new THREE.BoxGeometry(0.1, 0.5, 0.2);
      const armL = new THREE.Mesh(sideArmGeo, this.materials['steel']);
      armL.position.x = -0.25;
      const armR = new THREE.Mesh(sideArmGeo, this.materials['steel']);
      armR.position.x = 0.25;
      rig.add(armL, armR);

      // Floating central core
      const coreSize = level === 1 ? 0.12 : (level === 2 ? 0.18 : 0.24);
      const coreGeo = new THREE.SphereGeometry(coreSize, 8, 8);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xff007f,
        emissive: 0xff007f,
        emissiveIntensity: level * 1.0,
        roughness: 0.1
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.name = "laser_core";
      rig.add(core);

      // Level 3 ring node surrounding core
      if (level === 3) {
        const ringGeo = new THREE.TorusGeometry(0.42, 0.05, 8, 24);
        const ring = new THREE.Mesh(ringGeo, this.materials['gold']);
        ring.rotation.x = Math.PI / 2;
        ring.name = "laser_ring";
        rig.add(ring);
      }

      turret.add(rig);
    }

    group.add(turret);
    return group;
  }

  // ----------------------------------------------------
  // ENEMIES (Structured boxes)
  // ----------------------------------------------------
  createEnemyMesh(type) {
    const group = new THREE.Group();
    group.name = "enemy";

    if (type === 'slime') {
      // 1. Transparent Jelly Body
      const jellyGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      const jelly = new THREE.Mesh(jellyGeo, this.materials['slime_jelly']);
      jelly.castShadow = true;
      jelly.name = "jelly";
      group.add(jelly);

      // 2. Small Glowing Core
      const coreGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
      const core = new THREE.Mesh(coreGeo, this.materials['slime_core']);
      core.position.y = 0.05;
      core.name = "core";
      group.add(core);

      // 3. Cute Voxel Eyes
      const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.08);
      const eyeL = new THREE.Mesh(eyeGeo, this.materials['black']);
      eyeL.position.set(-0.18, 0.14, 0.32);
      const eyeR = new THREE.Mesh(eyeGeo, this.materials['black']);
      eyeR.position.set(0.18, 0.14, 0.32);
      group.add(eyeL, eyeR);

    } else if (type === 'runner') {
      // Bat / Glitch Runner
      const bodyGeo = new THREE.BoxGeometry(0.45, 0.45, 0.55);
      const body = new THREE.Mesh(bodyGeo, this.materials['portal']);
      body.castShadow = true;
      body.name = "body";
      group.add(body);

      // Glowing Eyes
      const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const eyeL = new THREE.Mesh(eyeGeo, this.materials['slime_core']); // glow green
      eyeL.position.set(-0.14, 0.1, 0.25);
      const eyeR = new THREE.Mesh(eyeGeo, this.materials['slime_core']);
      eyeR.position.set(0.14, 0.1, 0.25);
      body.add(eyeL, eyeR);

      // Left Wing pivoted
      const wingL = new THREE.Group();
      wingL.name = "wing_L";
      wingL.position.set(-0.2, 0.05, 0);
      const wingMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 0.05), this.materials['black']);
      wingMeshL.position.x = -0.27; // pivot offset
      wingMeshL.castShadow = true;
      wingL.add(wingMeshL);
      group.add(wingL);

      // Right Wing pivoted
      const wingR = new THREE.Group();
      wingR.name = "wing_R";
      wingR.position.set(0.2, 0.05, 0);
      const wingMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 0.05), this.materials['black']);
      wingMeshR.position.x = 0.27;
      wingMeshR.castShadow = true;
      wingR.add(wingMeshR);
      group.add(wingR);

    } else if (type === 'golem') {
      // Golem components
      const golemGroup = new THREE.Group();
      golemGroup.name = "golem_body";

      // Chest
      const chestGeo = new THREE.BoxGeometry(0.85, 0.65, 0.7);
      const chest = new THREE.Mesh(chestGeo, this.materials['steel']);
      chest.position.y = 0.8;
      chest.castShadow = true;
      golemGroup.add(chest);

      // Head
      const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
      const head = new THREE.Mesh(headGeo, this.materials['steel']);
      head.position.set(0, 0.5, 0.1);
      chest.add(head);

      // Yellow Slit eyes
      const eyeGeo = new THREE.BoxGeometry(0.2, 0.05, 0.05);
      const eye = new THREE.Mesh(eyeGeo, this.materials['gold']);
      eye.position.set(0, 0.05, 0.16);
      head.add(eye);

      // Arm Pivot Left
      const armL = new THREE.Group();
      armL.name = "arm_L";
      armL.position.set(-0.55, 0.15, 0);
      const armMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), this.materials['steel']);
      armMeshL.position.y = -0.25;
      armMeshL.castShadow = true;
      armL.add(armMeshL);
      chest.add(armL);

      // Arm Pivot Right
      const armR = new THREE.Group();
      armR.name = "arm_R";
      armR.position.set(0.55, 0.15, 0);
      const armMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), this.materials['steel']);
      armMeshR.position.y = -0.25;
      armMeshR.castShadow = true;
      armR.add(armMeshR);
      chest.add(armR);

      // Leg Left
      const legL = new THREE.Group();
      legL.name = "leg_L";
      legL.position.set(-0.25, 0.45, 0);
      const legMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), this.materials['black']);
      legMeshL.position.y = -0.25;
      legMeshL.castShadow = true;
      legL.add(legMeshL);
      golemGroup.add(legL);

      // Leg Right
      const legR = new THREE.Group();
      legR.name = "leg_R";
      legR.position.set(0.25, 0.45, 0);
      const legMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), this.materials['black']);
      legMeshR.position.y = -0.25;
      legMeshR.castShadow = true;
      legR.add(legMeshR);
      golemGroup.add(legR);

      group.add(golemGroup);

    } else if (type === 'boss') {
      // Glitch Dragon Boss - Massive Segments
      const bossBody = new THREE.Group();
      bossBody.name = "boss_body";

      // Chest Segment
      const chestGeo = new THREE.BoxGeometry(1.6, 1.2, 1.4);
      const chest = new THREE.Mesh(chestGeo, this.materials['portal']);
      chest.position.y = 1.3;
      chest.castShadow = true;
      bossBody.add(chest);

      // Neck and Head
      const headGroup = new THREE.Group();
      headGroup.name = "head_group";
      headGroup.position.set(0, 0.6, 0.6);

      const headGeo = new THREE.BoxGeometry(0.9, 0.8, 1.0);
      const head = new THREE.Mesh(headGeo, this.materials['portal']);
      head.position.set(0, 0.4, 0.3);
      head.castShadow = true;
      headGroup.add(head);

      // Jaw (Hinged below head)
      const jawGroup = new THREE.Group();
      jawGroup.name = "jaw";
      jawGroup.position.set(0, 0.1, 0.3);
      const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.7), this.materials['black']);
      jawMesh.position.z = 0.15;
      jawGroup.add(jawMesh);
      headGroup.add(jawGroup);

      // Glowing Dragon Horns
      const hornGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
      const hornL = new THREE.Mesh(hornGeo, this.materials['crystal']);
      hornL.position.set(-0.35, 0.6, -0.3);
      hornL.rotation.x = -0.5;
      hornL.rotation.z = -0.2;
      const hornR = new THREE.Mesh(hornGeo, this.materials['crystal']);
      hornR.position.set(0.35, 0.6, -0.3);
      hornR.rotation.x = -0.5;
      hornR.rotation.z = 0.2;
      head.add(hornL, hornR);

      chest.add(headGroup);

      // Tail Segment 1
      const tail1 = new THREE.Group();
      tail1.name = "tail_1";
      tail1.position.set(0, 0.2, -0.7);
      const tailMesh1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), this.materials['portal']);
      tailMesh1.position.z = -0.35;
      tailMesh1.castShadow = true;
      tail1.add(tailMesh1);
      chest.add(tail1);

      // Tail Segment 2 (child of Tail 1)
      const tail2 = new THREE.Group();
      tail2.name = "tail_2";
      tail2.position.set(0, 0, -0.7);
      const tailMesh2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), this.materials['black']);
      tailMesh2.position.z = -0.3;
      tailMesh2.castShadow = true;
      tail2.add(tailMesh2);
      tail1.add(tail2);

      // Tail end blade (child of Tail 2)
      const tail3 = new THREE.Group();
      tail3.name = "tail_3";
      tail3.position.set(0, 0, -0.6);
      const bladeGeo = new THREE.OctahedronGeometry(0.3, 0);
      const blade = new THREE.Mesh(bladeGeo, this.materials['crystal']);
      blade.rotation.y = Math.PI / 4;
      blade.castShadow = true;
      tail3.add(blade);
      tail2.add(tail3);

      // Four short heavy legs
      const legOffsets = [
        [-0.6, -0.6, 0.4], [0.6, -0.6, 0.4],
        [-0.6, -0.6, -0.4], [0.6, -0.6, -0.4]
      ];
      legOffsets.forEach(([lx, ly, lz], i) => {
        const leg = new THREE.Group();
        leg.name = `boss_leg_${i}`;
        leg.position.set(lx, ly, lz);
        const lm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), this.materials['black']);
        lm.position.y = -0.4;
        lm.castShadow = true;
        leg.add(lm);
        chest.add(leg);
      });

      group.add(bossBody);
    }

    return group;
  }

  // ----------------------------------------------------
  // PROJECTILES
  // ----------------------------------------------------
  createProjectileMesh(type) {
    if (type === 'archer') {
      // Detailed Archer Arrow
      const arrow = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.45), this.materials['wood']);
      arrow.add(shaft);

      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), this.materials['steel']);
      tip.position.z = 0.22;
      tip.rotation.x = Math.PI / 2;
      arrow.add(tip);

      const fletchL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.08), this.materials['crystal']);
      fletchL.position.set(0, 0, -0.2);
      arrow.add(fletchL);

      return arrow;

    } else if (type === 'cannon') {
      // Heavy spherical shell
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), this.materials['steel']);
      ball.castShadow = true;
      return ball;

    } else if (type === 'frost') {
      // Icicle spike shape
      const spike = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), this.materials['crystal']);
      body.rotation.x = -Math.PI / 2;
      body.castShadow = true;
      spike.add(body);
      return spike;
    }
    return null;
  }

  // ----------------------------------------------------
  // SCENERY DECORATIONS
  // ----------------------------------------------------
  createSceneryMesh(type) {
    const group = new THREE.Group();

    if (type === 'tree') {
      // Cyber Grassland Tree
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.24), this.materials['wood']);
      trunk.position.y = 0.4;
      trunk.castShadow = true;
      group.add(trunk);

      const leaves = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), this.materials['grass']);
      leaves.position.y = 0.95;
      leaves.castShadow = true;
      group.add(leaves);

    } else if (type === 'crystal') {
      // Volcanic magma glow crystal
      const geo = new THREE.OctahedronGeometry(0.3, 0);
      const crystal = new THREE.Mesh(geo, this.materials['crystal']);
      crystal.position.y = 0.3;
      crystal.castShadow = true;
      
      // Let it rotate slightly
      crystal.rotation.x = Math.random() * Math.PI;
      crystal.rotation.y = Math.random() * Math.PI;
      group.add(crystal);

    } else if (type === 'ice_spire') {
      // Frozen circuit glacier spike
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.25, 0.9, 5), this.materials['crystal']);
      base.position.y = 0.45;
      base.castShadow = true;
      group.add(base);
    }

    return group;
  }
}

export default new ModelGenerator();
