import * as THREE from 'three';
import TextureGenerator from './TextureGenerator.js';

class ModelGenerator {
  constructor() {
    this.materials = {};
  }

  // Pre-generate standard materials based on compiled textures
  init() {
    TextureGenerator.generateAll();

    // Map texture names to standard and physical materials
    const textNames = [
      'grass', 'path', 'water', 'lava', 'obsidian', 'snow',
      'ice_path', 'dirt', 'wood', 'steel', 'gold', 'portal', 'crystal'
    ];

    textNames.forEach(name => {
      const tex = TextureGenerator.get(name);
      if (name === 'water') {
        this.materials[name] = new THREE.MeshPhysicalMaterial({
          map: tex,
          roughness: 0.08,
          metalness: 0.15,
          transmission: 0.7,
          thickness: 0.8,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          emissive: new THREE.Color('#002244'),
          emissiveIntensity: 0.45,
          transparent: true,
          opacity: 0.9
        });
      } else if (name === 'lava') {
        this.materials[name] = new THREE.MeshPhysicalMaterial({
          map: tex,
          roughness: 0.35,
          metalness: 0.25,
          transmission: 0.4,
          thickness: 1.2,
          clearcoat: 0.85,
          clearcoatRoughness: 0.15,
          emissive: new THREE.Color('#ff3c00'),
          emissiveIntensity: 2.2
        });
      } else if (name === 'crystal') {
        this.materials[name] = new THREE.MeshPhysicalMaterial({
          map: tex,
          roughness: 0.04,
          metalness: 0.95,
          transmission: 0.92,
          thickness: 1.6,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          emissive: new THREE.Color('#00f0ff'),
          emissiveIntensity: 1.6
        });
      } else if (name === 'portal') {
        this.materials[name] = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.12,
          metalness: 0.85,
          emissive: new THREE.Color('#a81eff'),
          emissiveIntensity: 1.5
        });
      } else if (name === 'steel') {
        this.materials[name] = new THREE.MeshPhysicalMaterial({
          map: tex,
          roughness: 0.25,
          metalness: 0.96,
          clearcoat: 0.65,
          clearcoatRoughness: 0.12
        });
      } else if (name === 'gold') {
        this.materials[name] = new THREE.MeshPhysicalMaterial({
          map: tex,
          roughness: 0.16,
          metalness: 0.98,
          clearcoat: 0.85,
          clearcoatRoughness: 0.08
        });
      } else {
        this.materials[name] = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.75,
          metalness: 0.1
        });
      }
    });

    // Special materials
    this.materials['slime_jelly'] = new THREE.MeshPhysicalMaterial({
      color: 0x39ff14,
      transparent: true,
      opacity: 0.65,
      roughness: 0.08,
      transmission: 0.82,
      thickness: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });

    this.materials['slime_core'] = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x39ff14,
      emissiveIntensity: 2.5
    });

    this.materials['laser_beam'] = new THREE.MeshBasicMaterial({
      color: 0xff007f, // hot neon pink
      transparent: true,
      opacity: 0.95
    });

    this.materials['black'] = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.75
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

    const baseGroup = new THREE.Group();
    baseGroup.name = "base_structure";
    
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = baseGeo.parameters.height / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    baseGroup.add(base);

    // Decorate Base based on type
    if (type === 'archer') {
      // Add stone platform crenellations at the top edge of the base
      const wallH = 0.15;
      const wallW = baseGeo.parameters.width;
      const wallT = 0.08;
      const crenGeo = new THREE.BoxGeometry(wallW, wallH, wallT);
      const crenSideGeo = new THREE.BoxGeometry(wallT, wallH, wallW - wallT * 2);
      
      const frontWall = new THREE.Mesh(crenGeo, this.materials['steel']);
      frontWall.position.set(0, baseGeo.parameters.height + wallH/2, wallW/2 - wallT/2);
      frontWall.castShadow = true;
      baseGroup.add(frontWall);

      const backWall = new THREE.Mesh(crenGeo, this.materials['steel']);
      backWall.position.set(0, baseGeo.parameters.height + wallH/2, -wallW/2 + wallT/2);
      backWall.castShadow = true;
      baseGroup.add(backWall);

      const leftWall = new THREE.Mesh(crenSideGeo, this.materials['steel']);
      leftWall.position.set(-wallW/2 + wallT/2, baseGeo.parameters.height + wallH/2, 0);
      leftWall.castShadow = true;
      baseGroup.add(leftWall);

      const rightWall = new THREE.Mesh(crenSideGeo, this.materials['steel']);
      rightWall.position.set(wallW/2 - wallT/2, baseGeo.parameters.height + wallH/2, 0);
      rightWall.castShadow = true;
      baseGroup.add(rightWall);

    } else if (type === 'cannon') {
      // Add industrial tank treads on the left and right sides
      const treadW = 0.18;
      const treadH = baseGeo.parameters.height * 0.95;
      const treadD = baseGeo.parameters.depth * 1.05;
      const treadGeo = new THREE.BoxGeometry(treadW, treadH, treadD);
      
      const treadL = new THREE.Mesh(treadGeo, this.materials['black']);
      treadL.position.set(-baseGeo.parameters.width/2 - treadW/2, treadH/2, 0);
      treadL.castShadow = true;
      baseGroup.add(treadL);

      const treadR = new THREE.Mesh(treadGeo, this.materials['black']);
      treadR.position.set(baseGeo.parameters.width/2 + treadW/2, treadH/2, 0);
      treadR.castShadow = true;
      baseGroup.add(treadR);

      // Hydraulic pistons connecting treads/base to turret platform
      const pistonGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
      const pistonFL = new THREE.Mesh(pistonGeo, this.materials['steel']);
      pistonFL.position.set(-0.3, baseGeo.parameters.height - 0.1, 0.3);
      pistonFL.castShadow = true;
      const pistonFR = new THREE.Mesh(pistonGeo, this.materials['steel']);
      pistonFR.position.set(0.3, baseGeo.parameters.height - 0.1, 0.3);
      pistonFR.castShadow = true;
      baseGroup.add(pistonFL, pistonFR);

    } else if (type === 'frost') {
      // Floating cryo torus base instead of simple box, floating at y=0.1
      base.visible = false; // Hide the standard block base
      const floatH = 0.2;
      const torusRadius = baseGeo.parameters.width * 0.55;
      const cryoBaseGeo = new THREE.TorusGeometry(torusRadius, 0.12, 8, 24);
      const cryoBase = new THREE.Mesh(cryoBaseGeo, level === 3 ? this.materials['gold'] : this.materials['steel']);
      cryoBase.rotation.x = Math.PI / 2;
      cryoBase.position.y = floatH + 0.1;
      cryoBase.castShadow = true;
      baseGroup.add(cryoBase);

      // Orbital support nodes
      const nodeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      for (let i = 0; i < 4; i++) {
        const node = new THREE.Mesh(nodeGeo, this.materials['crystal']);
        const angle = (i / 4) * Math.PI * 2;
        node.position.set(Math.cos(angle) * torusRadius, floatH + 0.1, Math.sin(angle) * torusRadius);
        node.castShadow = true;
        baseGroup.add(node);
      }

    } else if (type === 'laser') {
      // Hexagonal sleek tower base
      base.visible = false;
      const hexBaseGeo = new THREE.CylinderGeometry(baseGeo.parameters.width * 0.55, baseGeo.parameters.width * 0.65, baseGeo.parameters.height, 6);
      const hexBase = new THREE.Mesh(hexBaseGeo, baseMat);
      hexBase.position.y = baseGeo.parameters.height / 2;
      hexBase.castShadow = true;
      hexBase.receiveShadow = true;
      baseGroup.add(hexBase);

      // Dark cooling vents on sides
      const ventGeo = new THREE.BoxGeometry(0.1, 0.3, 0.25);
      for (let i = 0; i < 6; i++) {
        const vent = new THREE.Mesh(ventGeo, this.materials['black']);
        const angle = (i / 6) * Math.PI * 2;
        const radius = baseGeo.parameters.width * 0.58;
        vent.position.set(Math.cos(angle) * radius, baseGeo.parameters.height / 2, Math.sin(angle) * radius);
        vent.rotation.y = -angle;
        baseGroup.add(vent);
      }
    }

    // Add extra armor borders for Level 2 & 3
    if (level >= 2 && type !== 'frost') {
      const cornerGeo = new THREE.BoxGeometry(0.16, baseGeo.parameters.height + 0.08, 0.16);
      const cMat = level === 3 ? this.materials['steel'] : this.materials['wood'];
      const bx = baseGeo.parameters.width / 2;
      const bz = baseGeo.parameters.depth / 2;
      const cornerOffsets = [
        [-bx, -bz], [-bx, bz], [bx, -bz], [bx, bz]
      ];
      cornerOffsets.forEach(([cx, cz]) => {
        const border = new THREE.Mesh(cornerGeo, cMat);
        border.position.set(cx, baseGeo.parameters.height / 2 + 0.04, cz);
        border.castShadow = true;
        baseGroup.add(border);
      });
    }

    group.add(baseGroup);

    // 2. HEAD/SHOOTER TURRET MODULE (Pivoting group)
    const turret = new THREE.Group();
    turret.name = "turret";
    turret.position.y = baseGeo.parameters.height + (type === 'archer' ? 0.15 : 0);

    if (type === 'archer') {
      // Watchtower deck floor
      const deckGeo = new THREE.BoxGeometry(baseGeo.parameters.width * 0.95, 0.1, baseGeo.parameters.depth * 0.95);
      const deck = new THREE.Mesh(deckGeo, this.materials['wood']);
      deck.castShadow = true;
      turret.add(deck);

      // Weapon gimbal mount
      const bowGroup = new THREE.Group();
      bowGroup.name = "weapon";
      bowGroup.position.set(0, 0.18, 0);

      // Crossbow body
      const shooterGeo = new THREE.BoxGeometry(0.24, 0.22, 0.65);
      const shooter = new THREE.Mesh(shooterGeo, this.materials['steel']);
      shooter.castShadow = true;
      bowGroup.add(shooter);

      // Crossbow wings
      const wingGeo = new THREE.BoxGeometry(0.72, 0.08, 0.08);
      const wing = new THREE.Mesh(wingGeo, this.materials['wood']);
      wing.position.set(0, 0.05, 0.24);
      wing.castShadow = true;
      bowGroup.add(wing);

      // Neon cyan bowstrings using high-emissive crystal material
      const stringGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.38, 4);
      
      const stringL = new THREE.Mesh(stringGeo, this.materials['crystal']);
      stringL.rotation.z = Math.PI / 2;
      stringL.rotation.y = 0.5;
      stringL.position.set(-0.18, 0.05, 0.05);
      
      const stringR = new THREE.Mesh(stringGeo, this.materials['crystal']);
      stringR.rotation.z = Math.PI / 2;
      stringR.rotation.y = -0.5;
      stringR.position.set(0.18, 0.05, 0.05);
      bowGroup.add(stringL, stringR);

      // Rotating wind-up gear at the back
      const gearGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 8);
      const gear = new THREE.Mesh(gearGeo, this.materials['steel']);
      gear.name = "gear";
      gear.rotation.x = Math.PI / 2;
      gear.position.set(0, -0.06, -0.22);
      gear.castShadow = true;
      bowGroup.add(gear);

      // Level 3: Triple crossbow heads and floating target lock
      if (level === 3) {
        // Left mini crossbow
        const miniL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.45), this.materials['steel']);
        miniL.position.set(-0.25, 0.02, 0.05);
        miniL.castShadow = true;
        bowGroup.add(miniL);

        // Right mini crossbow
        const miniR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.45), this.materials['steel']);
        miniR.position.set(0.25, 0.02, 0.05);
        miniR.castShadow = true;
        bowGroup.add(miniR);

        // Target Lock - a glowing wireframe/translucent ring hovering above
        const lockGeo = new THREE.TorusGeometry(0.38, 0.03, 6, 16);
        const lockRing = new THREE.Mesh(lockGeo, this.materials['crystal']);
        lockRing.name = "target_lock";
        lockRing.position.set(0, 0.55, 0);
        lockRing.rotation.x = Math.PI / 2;
        bowGroup.add(lockRing);
      }

      turret.add(bowGroup);

    } else if (type === 'cannon') {
      // Rotating turret platform base
      const turretDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.22, 12), this.materials['steel']);
      turretDeck.castShadow = true;
      turret.add(turretDeck);

      // Cannon arm gimbal mount
      const barrelGroup = new THREE.Group();
      barrelGroup.name = "weapon";
      barrelGroup.position.set(0, 0.24, 0);

      // Rotating Ammo Belt / Feed Ring
      const ammoBeltGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10);
      const ammoBelt = new THREE.Mesh(ammoBeltGeo, this.materials['black']);
      ammoBelt.name = "ammo_belt";
      ammoBelt.position.set(0, 0, -0.28);
      ammoBelt.rotation.z = Math.PI / 2;
      ammoBelt.castShadow = true;
      barrelGroup.add(ammoBelt);

      // Add small bullets/shells on the ammo belt
      const bulletGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 6);
      for (let i = 0; i < 6; i++) {
        const bullet = new THREE.Mesh(bulletGeo, this.materials['gold']);
        const angle = (i / 6) * Math.PI * 2;
        bullet.position.set(Math.cos(angle) * 0.28, Math.sin(angle) * 0.28, -0.28);
        bullet.rotation.z = angle + Math.PI / 2;
        barrelGroup.add(bullet);
      }

      // Cannon Barrel
      let barrelGeo;
      if (level === 1) {
        barrelGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.72, 8);
      } else if (level === 2) {
        barrelGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.88, 8);
      } else { // Level 3 Double barrel
        barrelGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.95, 8);
      }

      const barrelMat = level === 3 ? this.materials['gold'] : this.materials['black'];

      if (level < 3) {
        const barrelGroupSingle = new THREE.Group();
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.x = Math.PI / 2; // point forward
        barrel.position.z = 0.35;
        barrel.castShadow = true;
        barrelGroupSingle.add(barrel);

        // Add cooling fins spaced along the barrel
        const finGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 8);
        for (let j = 0; j < 3; j++) {
          const fin = new THREE.Mesh(finGeo, this.materials['steel']);
          fin.rotation.x = Math.PI / 2;
          fin.position.z = 0.2 + j * 0.18;
          barrelGroupSingle.add(fin);
        }
        barrelGroup.add(barrelGroupSingle);
      } else {
        // Double Barrel for Lvl 3 (Rail-cannon style)
        // Rail-barrel L
        const b1 = new THREE.Mesh(barrelGeo, barrelMat);
        b1.rotation.x = Math.PI / 2;
        b1.position.set(-0.16, 0, 0.45);
        b1.castShadow = true;

        // Rail-barrel R
        const b2 = new THREE.Mesh(barrelGeo, barrelMat);
        b2.rotation.x = Math.PI / 2;
        b2.position.set(0.16, 0, 0.45);
        b2.castShadow = true;

        // Glowing electromagnetic coils wrapping around the barrels
        const coilGeo = new THREE.TorusGeometry(0.18, 0.04, 6, 12);
        for (let j = 0; j < 4; j++) {
          const coilL = new THREE.Mesh(coilGeo, this.materials['crystal']);
          coilL.position.set(-0.16, 0, 0.25 + j * 0.18);
          coilL.rotation.x = Math.PI / 2;

          const coilR = new THREE.Mesh(coilGeo, this.materials['crystal']);
          coilR.position.set(0.16, 0, 0.25 + j * 0.18);
          coilR.rotation.x = Math.PI / 2;

          barrelGroup.add(coilL, coilR);
        }

        barrelGroup.add(b1, b2);
      }

      // Back counterweight block
      const weight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.42), this.materials['steel']);
      weight.position.z = -0.15;
      weight.castShadow = true;
      barrelGroup.add(weight);

      turret.add(barrelGroup);

    } else if (type === 'frost') {
      // Levitating emitter platform
      const deckGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.12, 8);
      const deck = new THREE.Mesh(deckGeo, this.materials['steel']);
      deck.castShadow = true;
      turret.add(deck);

      const crystalGroup = new THREE.Group();
      crystalGroup.name = "weapon";
      crystalGroup.position.y = 0.38;

      // Central rotating crystal compound (bobbing & spinning)
      const size = level === 1 ? 0.26 : (level === 2 ? 0.36 : 0.45);
      
      // Multi-part crystal star shape
      const prism1 = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), this.materials['crystal']);
      prism1.castShadow = true;
      prism1.name = "prism1";
      crystalGroup.add(prism1);

      const prism2 = new THREE.Mesh(new THREE.OctahedronGeometry(size * 0.8, 0), this.materials['crystal']);
      prism2.rotation.y = Math.PI / 4;
      prism2.rotation.x = Math.PI / 4;
      prism2.castShadow = true;
      prism2.name = "prism2";
      crystalGroup.add(prism2);

      // Orbiting shards count
      const count = level === 1 ? 2 : (level === 2 ? 4 : 6);
      const orbitRadius = level === 1 ? 0.45 : (level === 2 ? 0.6 : 0.72);
      const shardGeo = new THREE.OctahedronGeometry(0.08, 0);

      for (let i = 0; i < count; i++) {
        const orbit = new THREE.Mesh(shardGeo, this.materials['crystal']);
        const angle = (i / count) * Math.PI * 2;
        orbit.position.set(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);
        orbit.name = `orbit_shard_${i}`;
        orbit.userData = { angle: angle, radius: orbitRadius, speed: (i % 2 === 0 ? 1 : -1) * 1.5 };
        orbit.castShadow = true;
        crystalGroup.add(orbit);
      }

      // Level 3 Blizzard Ring - hovering ice cloud halo
      if (level === 3) {
        const ringGeo = new THREE.TorusGeometry(0.68, 0.05, 8, 24);
        const blizzardRing = new THREE.Mesh(ringGeo, this.materials['slime_jelly']);
        blizzardRing.name = "blizzard_ring";
        blizzardRing.rotation.x = Math.PI / 2;
        blizzardRing.position.y = 0.1;
        crystalGroup.add(blizzardRing);
      }

      turret.add(crystalGroup);

    } else if (type === 'laser') {
      // Turret rotating plate with venting ribs
      const deckGeo = new THREE.BoxGeometry(0.68, 0.16, 0.68);
      const deck = new THREE.Mesh(deckGeo, this.materials['black']);
      deck.castShadow = true;
      turret.add(deck);

      const rig = new THREE.Group();
      rig.name = "weapon";
      rig.position.y = 0.28;

      // Double-hinged robotic arm gimbal (Base joiner + arms)
      const armBaseGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8);
      const armBase = new THREE.Mesh(armBaseGeo, this.materials['steel']);
      armBase.position.y = -0.1;
      armBase.castShadow = true;
      rig.add(armBase);

      // Side mounting arms (curved metallic gantries)
      const sideArmGeo = new THREE.BoxGeometry(0.08, 0.58, 0.22);
      const armL = new THREE.Mesh(sideArmGeo, this.materials['steel']);
      armL.position.x = -0.28;
      armL.castShadow = true;
      
      const armR = new THREE.Mesh(sideArmGeo, this.materials['steel']);
      armR.position.x = 0.28;
      armR.castShadow = true;
      
      rig.add(armL, armR);

      // Rotating focusing lens assembly (cylindrical lens mount holding the core)
      const lensGroup = new THREE.Group();
      lensGroup.name = "lens_assembly";
      
      const lensOuterGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 16);
      const lensOuter = new THREE.Mesh(lensOuterGeo, this.materials['steel']);
      lensOuter.rotation.y = Math.PI / 2;
      lensOuter.castShadow = true;
      lensGroup.add(lensOuter);

      // Floating central plasma core sphere
      const coreSize = level === 1 ? 0.12 : (level === 2 ? 0.18 : 0.24);
      const coreGeo = new THREE.SphereGeometry(coreSize, 12, 12);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xff007f,
        emissive: 0xff007f,
        emissiveIntensity: level * 1.5,
        roughness: 0.05
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.name = "laser_core";
      core.castShadow = true;
      lensGroup.add(core);

      rig.add(lensGroup);

      // Floating rings orbiting at Lvl 3
      if (level === 3) {
        const ringGeo = new THREE.TorusGeometry(0.46, 0.04, 8, 24);
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

      // 2. Beating Core
      const coreGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
      const core = new THREE.Mesh(coreGeo, this.materials['slime_core']);
      core.position.y = 0.05;
      core.name = "core";
      group.add(core);

      // 3. Inner crystal skeleton - small vertical and horizontal structural bars
      const boneMat = this.materials['crystal'];
      const spineGeo = new THREE.BoxGeometry(0.06, 0.5, 0.06);
      const spine = new THREE.Mesh(spineGeo, boneMat);
      spine.position.set(0, 0, 0);
      group.add(spine);

      const crossGeo = new THREE.BoxGeometry(0.4, 0.06, 0.06);
      const cross = new THREE.Mesh(crossGeo, boneMat);
      cross.position.set(0, 0.1, 0);
      group.add(cross);

      // 4. Inner bubbles
      const bubbleGeo = new THREE.SphereGeometry(0.04, 4, 4);
      for (let i = 0; i < 4; i++) {
        const bubble = new THREE.Mesh(bubbleGeo, this.materials['crystal']);
        bubble.name = `bubble_${i}`;
        bubble.position.set(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        );
        group.add(bubble);
      }

      // 5. Cute Voxel Eyes
      const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.08);
      const eyeL = new THREE.Mesh(eyeGeo, this.materials['black']);
      eyeL.position.set(-0.18, 0.14, 0.32);
      const eyeR = new THREE.Mesh(eyeGeo, this.materials['black']);
      eyeR.position.set(0.18, 0.14, 0.32);
      group.add(eyeL, eyeR);

    } else if (type === 'runner') {
      // Mechanical Bat / Glitch Runner
      const bodyGeo = new THREE.BoxGeometry(0.45, 0.45, 0.55);
      const body = new THREE.Mesh(bodyGeo, this.materials['portal']);
      body.castShadow = true;
      body.name = "body";
      group.add(body);

      // Cyber Visor (replacing eyes)
      const visorGeo = new THREE.BoxGeometry(0.38, 0.1, 0.06);
      const visor = new THREE.Mesh(visorGeo, this.materials['laser_beam']); // Glowing hot pink
      visor.position.set(0, 0.08, 0.28);
      body.add(visor);

      // Jet Thruster Nozzle at the back
      const jetGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.18, 6);
      const jet = new THREE.Mesh(jetGeo, this.materials['steel']);
      jet.rotation.x = Math.PI / 2;
      jet.position.set(0, -0.05, -0.32);
      body.add(jet);

      // Thrust Flame (small glowing orange box)
      const flameGeo = new THREE.ConeGeometry(0.08, 0.22, 5);
      const flame = new THREE.Mesh(flameGeo, this.materials['lava']);
      flame.name = "jet_flame";
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(0, -0.05, -0.48);
      body.add(flame);

      // Segmented Blade Wings
      // Left Wing pivoted
      const wingL = new THREE.Group();
      wingL.name = "wing_L";
      wingL.position.set(-0.22, 0.05, 0);

      // Main arm
      const wingMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.04), this.materials['steel']);
      wingMeshL.position.x = -0.27; // pivot offset
      wingMeshL.castShadow = true;
      wingL.add(wingMeshL);

      // Wing feathers/blades
      for (let j = 0; j < 3; j++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.02), this.materials['crystal']);
        blade.position.set(-0.18 - j * 0.14, -0.15, -0.05 + j * 0.04);
        blade.rotation.z = -0.3 + j * 0.15;
        blade.castShadow = true;
        wingL.add(blade);
      }
      group.add(wingL);

      // Right Wing pivoted
      const wingR = new THREE.Group();
      wingR.name = "wing_R";
      wingR.position.set(0.22, 0.05, 0);

      const wingMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.04), this.materials['steel']);
      wingMeshR.position.x = 0.27;
      wingMeshR.castShadow = true;
      wingR.add(wingMeshR);

      for (let j = 0; j < 3; j++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.02), this.materials['crystal']);
        blade.position.set(0.18 + j * 0.14, -0.15, -0.05 + j * 0.04);
        blade.rotation.z = 0.3 - j * 0.15;
        blade.castShadow = true;
        wingR.add(blade);
      }
      group.add(wingR);

    } else if (type === 'golem') {
      const golemGroup = new THREE.Group();
      golemGroup.name = "golem_body";

      // Chest
      const chestGeo = new THREE.BoxGeometry(0.9, 0.7, 0.7);
      const chest = new THREE.Mesh(chestGeo, this.materials['steel']);
      chest.position.y = 0.85;
      chest.castShadow = true;
      golemGroup.add(chest);

      // Magma cracks on the chest (emissive lava details)
      const veinGeo = new THREE.BoxGeometry(0.65, 0.35, 0.05);
      const vein = new THREE.Mesh(veinGeo, this.materials['lava']);
      vein.position.set(0, -0.05, 0.36);
      chest.add(vein);

      // Head
      const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
      const head = new THREE.Mesh(headGeo, this.materials['steel']);
      head.position.set(0, 0.54, 0.08);
      head.castShadow = true;
      chest.add(head);

      // Asymmetric Shoulder spikes
      const spikeGeo = new THREE.ConeGeometry(0.12, 0.3, 4);
      const spikeL = new THREE.Mesh(spikeGeo, this.materials['crystal']);
      spikeL.position.set(-0.4, 0.4, 0);
      spikeL.rotation.z = 0.6;
      spikeL.castShadow = true;
      chest.add(spikeL);

      const spikeR = new THREE.Mesh(spikeGeo, this.materials['crystal']);
      spikeR.position.set(0.4, 0.4, 0);
      spikeR.rotation.z = -0.6;
      spikeR.castShadow = true;
      chest.add(spikeR);

      // Yellow glowing visor slit
      const eyeGeo = new THREE.BoxGeometry(0.24, 0.06, 0.06);
      const eye = new THREE.Mesh(eyeGeo, this.materials['gold']);
      eye.position.set(0, 0.06, 0.18);
      head.add(eye);

      // Arm Pivot Left (Pistons + Spiked fist)
      const armL = new THREE.Group();
      armL.name = "arm_L";
      armL.position.set(-0.62, 0.22, 0);
      
      const shoulderJointL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), this.materials['black']);
      armL.add(shoulderJointL);

      const armMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.24), this.materials['steel']);
      armMeshL.position.y = -0.22;
      armMeshL.castShadow = true;
      armL.add(armMeshL);

      // Spiked Fist
      const fistL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), this.materials['black']);
      fistL.position.y = -0.58;
      fistL.castShadow = true;
      // Spikes
      const fistSpikeL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), this.materials['crystal']);
      fistSpikeL.position.set(0, -0.18, 0);
      fistSpikeL.rotation.x = Math.PI;
      fistL.add(fistSpikeL);
      armL.add(fistL);
      chest.add(armL);

      // Arm Pivot Right
      const armR = new THREE.Group();
      armR.name = "arm_R";
      armR.position.set(0.62, 0.22, 0);
      
      const shoulderJointR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), this.materials['black']);
      armR.add(shoulderJointR);

      const armMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.24), this.materials['steel']);
      armMeshR.position.y = -0.22;
      armMeshR.castShadow = true;
      armR.add(armMeshR);

      const fistR = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), this.materials['black']);
      fistR.position.y = -0.58;
      fistR.castShadow = true;
      const fistSpikeR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), this.materials['crystal']);
      fistSpikeR.position.set(0, -0.18, 0);
      fistSpikeR.rotation.x = Math.PI;
      fistR.add(fistSpikeR);
      armR.add(fistR);
      chest.add(armR);

      // Leg Left
      const legL = new THREE.Group();
      legL.name = "leg_L";
      legL.position.set(-0.28, 0.48, 0);
      const legMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.28), this.materials['black']);
      legMeshL.position.y = -0.26;
      legMeshL.castShadow = true;
      legL.add(legMeshL);
      golemGroup.add(legL);

      // Leg Right
      const legR = new THREE.Group();
      legR.name = "leg_R";
      legR.position.set(0.28, 0.48, 0);
      const legMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.28), this.materials['black']);
      legMeshR.position.y = -0.26;
      legMeshR.castShadow = true;
      legR.add(legMeshR);
      golemGroup.add(legR);

      group.add(golemGroup);

    } else if (type === 'boss') {
      // Glitch Dragon Boss - Massive Segments
      const bossBody = new THREE.Group();
      bossBody.name = "boss_body";

      // Chest Segment
      const chestGeo = new THREE.BoxGeometry(1.7, 1.3, 1.5);
      const chest = new THREE.Mesh(chestGeo, this.materials['portal']);
      chest.position.y = 1.35;
      chest.castShadow = true;
      bossBody.add(chest);

      // Multiple Spine Spikes on chest
      for (let s = 0; s < 3; s++) {
        const spineSpike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 4), this.materials['crystal']);
        spineSpike.position.set(0, 0.85, 0.4 - s * 0.45);
        spineSpike.rotation.x = -0.3;
        spineSpike.castShadow = true;
        chest.add(spineSpike);
      }

      // Neck and Head
      const headGroup = new THREE.Group();
      headGroup.name = "head_group";
      headGroup.position.set(0, 0.65, 0.65);

      const headGeo = new THREE.BoxGeometry(0.95, 0.85, 1.05);
      const head = new THREE.Mesh(headGeo, this.materials['portal']);
      head.position.set(0, 0.45, 0.35);
      head.castShadow = true;
      headGroup.add(head);

      // Visor Eye bar
      const eyeVisor = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.06), this.materials['laser_beam']);
      eyeVisor.position.set(0, 0.18, 0.54);
      head.add(eyeVisor);

      // Jaw (Hinged below head) with voxel teeth
      const jawGroup = new THREE.Group();
      jawGroup.name = "jaw";
      jawGroup.position.set(0, 0.05, 0.35);
      
      const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.75), this.materials['black']);
      jawMesh.position.z = 0.18;
      jawMesh.castShadow = true;
      
      // Voxel teeth (white spikes)
      const toothGeo = new THREE.ConeGeometry(0.05, 0.1, 4);
      for (let t = 0; t < 4; t++) {
        const toothUpper = new THREE.Mesh(toothGeo, this.materials['snow']);
        toothUpper.position.set(-0.3 + t * 0.2, 0.32, 0.5);
        toothUpper.rotation.x = Math.PI;
        head.add(toothUpper);

        const toothLower = new THREE.Mesh(toothGeo, this.materials['snow']);
        toothLower.position.set(-0.3 + t * 0.2, 0.1, 0.35);
        jawMesh.add(toothLower);
      }
      
      jawGroup.add(jawMesh);
      headGroup.add(jawGroup);

      // Glowing Dragon Horns
      const hornGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
      const hornL = new THREE.Mesh(hornGeo, this.materials['crystal']);
      hornL.position.set(-0.38, 0.65, -0.35);
      hornL.rotation.x = -0.6;
      hornL.rotation.z = -0.35;
      
      const hornR = new THREE.Mesh(hornGeo, this.materials['crystal']);
      hornR.position.set(0.38, 0.65, -0.35);
      hornR.rotation.x = -0.6;
      hornR.rotation.z = 0.35;
      head.add(hornL, hornR);

      chest.add(headGroup);

      // Left engine wing
      const wingL = new THREE.Group();
      wingL.name = "wing_L";
      wingL.position.set(-0.85, 0.4, -0.3);
      
      const wingPlatesL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.08), this.materials['steel']);
      wingPlatesL.position.x = -0.7;
      wingPlatesL.castShadow = true;
      wingL.add(wingPlatesL);
      
      // Booster cylinder on wing
      const boosterL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.45, 8), this.materials['black']);
      boosterL.rotation.x = Math.PI / 2;
      boosterL.position.set(-0.6, 0, -0.08);
      wingL.add(boosterL);
      
      const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6), this.materials['lava']);
      flameL.rotation.x = -Math.PI / 2;
      flameL.position.set(-0.6, 0, -0.38);
      flameL.name = "wing_flame_L";
      wingL.add(flameL);
      
      chest.add(wingL);

      // Right engine wing
      const wingR = new THREE.Group();
      wingR.name = "wing_R";
      wingR.position.set(0.85, 0.4, -0.3);
      
      const wingPlatesR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.08), this.materials['steel']);
      wingPlatesR.position.x = 0.7;
      wingPlatesR.castShadow = true;
      wingR.add(wingPlatesR);
      
      const boosterR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.45, 8), this.materials['black']);
      boosterR.rotation.x = Math.PI / 2;
      boosterR.position.set(0.6, 0, -0.08);
      wingR.add(boosterR);

      const flameR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6), this.materials['lava']);
      flameR.rotation.x = -Math.PI / 2;
      flameR.position.set(0.6, 0, -0.38);
      flameR.name = "wing_flame_R";
      wingR.add(flameR);

      chest.add(wingR);

      // Tail Segment 1
      const tail1 = new THREE.Group();
      tail1.name = "tail_1";
      tail1.position.set(0, 0.2, -0.75);
      const tailMesh1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), this.materials['portal']);
      tailMesh1.position.z = -0.38;
      tailMesh1.castShadow = true;
      tail1.add(tailMesh1);
      
      // Spine on tail 1
      const tailSpine1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), this.materials['crystal']);
      tailSpine1.position.set(0, 0.5, -0.38);
      tailSpine1.castShadow = true;
      tailMesh1.add(tailSpine1);
      
      chest.add(tail1);

      // Tail Segment 2 (child of Tail 1)
      const tail2 = new THREE.Group();
      tail2.name = "tail_2";
      tail2.position.set(0, 0, -0.75);
      const tailMesh2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.65), this.materials['black']);
      tailMesh2.position.z = -0.32;
      tailMesh2.castShadow = true;
      tail2.add(tailMesh2);
      
      const tailSpine2 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 4), this.materials['crystal']);
      tailSpine2.position.set(0, 0.38, -0.32);
      tailSpine2.castShadow = true;
      tailMesh2.add(tailSpine2);
      
      tail1.add(tail2);

      // Tail end blade (child of Tail 2) - Plasma Blade tail
      const tail3 = new THREE.Group();
      tail3.name = "tail_3";
      tail3.position.set(0, 0, -0.65);
      
      // Heavy crystal spear tip
      const bladeGeo = new THREE.OctahedronGeometry(0.38, 0);
      const blade = new THREE.Mesh(bladeGeo, this.materials['crystal']);
      blade.name = "tail_blade";
      blade.rotation.y = Math.PI / 4;
      blade.castShadow = true;
      tail3.add(blade);
      
      tail2.add(tail3);

      // Four short heavy mechanical legs
      const legOffsets = [
        [-0.65, -0.65, 0.45], [0.65, -0.65, 0.45],
        [-0.65, -0.65, -0.45], [0.65, -0.65, -0.45]
      ];
      legOffsets.forEach(([lx, ly, lz], i) => {
        const leg = new THREE.Group();
        leg.name = `boss_leg_${i}`;
        leg.position.set(lx, ly, lz);
        
        // Piston thigh
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 0.45), this.materials['steel']);
        thigh.position.y = -0.38;
        thigh.castShadow = true;
        leg.add(thigh);
        
        // Foot
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.55), this.materials['black']);
        foot.position.y = -0.8;
        foot.castShadow = true;
        leg.add(foot);
        
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
      // Detailed Archer Arrow with neon glow tip
      const arrow = new THREE.Group();
      
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.45), this.materials['wood']);
      shaft.castShadow = true;
      arrow.add(shaft);

      // Glowing tip
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), this.materials['crystal']);
      tip.position.z = 0.225;
      tip.rotation.x = Math.PI / 2;
      arrow.add(tip);

      const fletchL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.09, 0.09), this.materials['crystal']);
      fletchL.position.set(0, 0, -0.18);
      arrow.add(fletchL);

      // Wind trail booster at back
      const glowGeo = new THREE.SphereGeometry(0.04, 4, 4);
      const glow = new THREE.Mesh(glowGeo, this.materials['crystal']);
      glow.position.set(0, 0, -0.23);
      arrow.add(glow);

      return arrow;

    } else if (type === 'cannon') {
      // Heavy projectile shell with golden rings
      const group = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), this.materials['black']);
      ball.castShadow = true;
      group.add(ball);

      // Glowing heat core belt
      const ringGeo = new THREE.TorusGeometry(0.16, 0.04, 6, 12);
      const ring = new THREE.Mesh(ringGeo, this.materials['lava']);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      return group;

    } else if (type === 'frost') {
      // Crystalline multi-layered icicle spike
      const spike = new THREE.Group();
      
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 5), this.materials['crystal']);
      body.rotation.x = -Math.PI / 2;
      body.castShadow = true;
      spike.add(body);

      // Shard protrusions
      const shardGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
      for (let i = 0; i < 3; i++) {
        const sideShard = new THREE.Mesh(shardGeo, this.materials['crystal']);
        const angle = (i / 3) * Math.PI * 2;
        sideShard.position.set(Math.cos(angle) * 0.06, Math.sin(angle) * 0.06, -0.1);
        sideShard.rotation.z = angle;
        sideShard.rotation.x = -Math.PI / 3;
        spike.add(sideShard);
      }

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
      // Cyber Grassland Tree - Layered Foliage
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.9, 0.24), this.materials['wood']);
      trunk.position.y = 0.45;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      // 3 overlapping boxes for layered leaves
      const foliage1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.85), this.materials['grass']);
      foliage1.position.y = 0.95;
      foliage1.castShadow = true;
      
      const foliage2 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.45, 0.68), this.materials['grass']);
      foliage2.position.y = 1.35;
      foliage2.castShadow = true;

      const foliage3 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.35, 0.48), this.materials['grass']);
      foliage3.position.y = 1.65;
      foliage3.castShadow = true;

      group.add(foliage1, foliage2, foliage3);

    } else if (type === 'crystal') {
      // Magma glow crystal (world 2) with 2 orbiting embers
      const geo = new THREE.OctahedronGeometry(0.32, 0);
      const crystal = new THREE.Mesh(geo, this.materials['crystal']);
      crystal.position.y = 0.35;
      crystal.name = "crystal"; // Animated rotation
      crystal.castShadow = true;
      group.add(crystal);

      // Floating mini shards
      const shardGeo = new THREE.OctahedronGeometry(0.08, 0);
      const shard1 = new THREE.Mesh(shardGeo, this.materials['lava']);
      shard1.position.set(0.45, 0.45, 0.15);
      shard1.name = "crystal_shard_1";
      
      const shard2 = new THREE.Mesh(shardGeo, this.materials['lava']);
      shard2.position.set(-0.45, 0.25, -0.15);
      shard2.name = "crystal_shard_2";
      
      group.add(shard1, shard2);

    } else if (type === 'ice_spire') {
      // Frozen circuit glacier spike with cyan circuitry bands
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.26, 1.1, 5), this.materials['crystal']);
      base.position.y = 0.55;
      base.castShadow = true;
      group.add(base);

      // Neon collar band
      const ringGeo = new THREE.TorusGeometry(0.18, 0.04, 4, 10);
      const ring = new THREE.Mesh(ringGeo, this.materials['snow']);
      ring.position.y = 0.35;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    return group;
  }
}

export default new ModelGenerator();
