import * as THREE from 'three';

class ParticleSystem {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.container = null; // HTML container for floating text

    // WebGL Voxel Particles Pool
    this.maxParticles = 200;
    this.pool = [];
    this.poolIndex = 0;

    // Floating HTML text labels pool
    this.htmlPool = [];
    this.htmlPoolIndex = 0;
  }

  // Pre-instantiate visual particles in the WebGL scene
  init(scene, camera, htmlContainer) {
    this.scene = scene;
    this.camera = camera;
    this.container = htmlContainer;

    // Clear old elements if any
    this.pool.forEach(p => {
      if (p.mesh.material) p.mesh.material.dispose();
      this.scene.remove(p.mesh);
    });
    if (this.geometries) {
      this.geometries.forEach(g => g.dispose());
    }
    this.pool = [];
    this.poolIndex = 0;

    // Clear old HTML elements if any
    if (this.htmlPool) {
      this.htmlPool.forEach(p => p.element.remove());
    }
    this.htmlPool = [];
    this.htmlPoolIndex = 0;

    // Pre-create HTML elements pool if we have a container
    if (this.container) {
      for (let i = 0; i < 40; i++) {
        const div = document.createElement('div');
        div.style.display = 'none';
        div.className = 'float-label';
        this.container.appendChild(div);
        this.htmlPool.push({
          element: div,
          active: false,
          pos3D: new THREE.Vector3(),
          age: 0,
          maxAge: 45
        });
      }
    }

    // Pre-allocate geometries (Object Pooling)
    const boxGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const coneGeo = new THREE.ConeGeometry(0.08, 0.16, 4);
    const sphereGeo = new THREE.IcosahedronGeometry(0.08, 0);
    this.geometries = [boxGeo, coneGeo, sphereGeo];

    for (let i = 0; i < this.maxParticles; i++) {
      // Basic glowing material
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0
      });

      let geo;
      if (i % 4 === 0) {
        geo = coneGeo;
      } else if (i % 4 === 1) {
        geo = sphereGeo;
      } else {
        geo = boxGeo;
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);

      this.pool.push({
        mesh: mesh,
        material: mat,
        velocity: new THREE.Vector3(),
        rotationVelocity: new THREE.Vector3(),
        gravity: 9.8,
        drag: 0.98,
        life: 0,
        maxLife: 1
      });
    }
  }

  // Trigger a visual burst of voxel particles at a 3D location
  spawnExplosion(pos, count = 12, colorHex = 0xffaa00, sizeScale = 1.0) {
    if (!this.scene) return;

    for (let i = 0; i < count; i++) {
      const p = this.pool[this.poolIndex];
      this.poolIndex = (this.poolIndex + 1) % this.maxParticles;

      p.mesh.position.copy(pos);
      p.mesh.scale.setScalar(sizeScale * (0.6 + Math.random() * 0.8));
      p.mesh.visible = true;

      // Assign dynamic color
      p.material.color.setHex(colorHex);
      p.material.opacity = 1.0;

      // Random radial expansion velocity vector
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 2.0 + Math.random() * 3.5;

      p.velocity.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        (Math.sin(phi) * Math.sin(theta) * speed) + 2.0, // push up slightly
        Math.cos(phi) * speed
      );

      p.rotationVelocity.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );

      p.gravity = 6.0 + Math.random() * 6.0;
      p.drag = 0.96;
      p.maxLife = 0.4 + Math.random() * 0.4;
      p.life = p.maxLife;
    }
  }

  // Spawn a single custom particle (e.g. for trails)
  spawnParticle(pos, velocity, colorHex = 0xffffff, sizeScale = 1.0, maxLife = 0.5, gravity = 0.0, drag = 0.98) {
    if (!this.scene) return;

    const p = this.pool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.maxParticles;

    p.mesh.position.copy(pos);
    p.mesh.scale.setScalar(sizeScale * (0.8 + Math.random() * 0.4));
    p.mesh.visible = true;

    p.material.color.setHex(colorHex);
    p.material.opacity = 1.0;

    p.velocity.copy(velocity);
    p.rotationVelocity.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );

    p.gravity = gravity;
    p.drag = drag;
    p.maxLife = maxLife;
    p.life = maxLife;
    return p;
  }

  // Spawn a spiraling upgrade particle effect around the tower base
  spawnUpgradeEffect(pos, colorHex = 0x00f0ff) {
    if (!this.scene) return;

    const numParticles = 45;
    const radius = 0.55;
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const heightOffset = (i / numParticles) * 1.5;
      
      const pPos = new THREE.Vector3().copy(pos);
      pPos.x += Math.cos(angle) * radius;
      pPos.y += heightOffset;
      pPos.z += Math.sin(angle) * radius;

      // Velocity: spiral outward slightly, and ascend
      const vel = new THREE.Vector3(
        -Math.sin(angle) * 0.4 + (Math.random() - 0.5) * 0.1,
        1.5 + Math.random() * 0.5,
        Math.cos(angle) * 0.4 + (Math.random() - 0.5) * 0.1
      );

      this.spawnParticle(pPos, vel, colorHex, 0.4 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, -0.8, 0.95);
    }

    // Trigger a medium explosion at the mid height
    const midPos = new THREE.Vector3().copy(pos);
    midPos.y += 0.75;
    this.spawnExplosion(midPos, 16, colorHex, 1.2);
  }

  // Spawn atmospheric particles based on current world theme
  spawnAtmospherics(dt, worldTheme) {
    if (!this.scene) return;
    
    if (Math.random() > 12 * dt) return;
    
    const posX = (Math.random() - 0.5) * 16;
    const posZ = (Math.random() - 0.5) * 16;
    
    if (worldTheme === 1) {
      // Cyber-dust (green/cyan, rises slowly)
      const posY = 0.2 + Math.random() * 2.0;
      const pos = new THREE.Vector3(posX, posY, posZ);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.3 + Math.random() * 0.3, (Math.random() - 0.5) * 0.2);
      const color = Math.random() < 0.5 ? 0x00f0ff : 0x39ff14;
      this.spawnParticle(pos, vel, color, 0.3 + Math.random() * 0.3, 1.2 + Math.random() * 0.8, -0.05, 0.98);
    } else if (worldTheme === 2) {
      // Lava embers (red/orange, rises and bobs)
      const posY = 0.2 + Math.random() * 0.5;
      const pos = new THREE.Vector3(posX, posY, posZ);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3);
      const color = Math.random() < 0.5 ? 0xff3c00 : 0xffaa00;
      this.spawnParticle(pos, vel, color, 0.3 + Math.random() * 0.4, 0.8 + Math.random() * 0.6, -0.2, 0.97);
    } else if (worldTheme === 3) {
      // Snowflakes (white/blue, falls and drifts)
      const posY = 6.0 + Math.random() * 2.0;
      const pos = new THREE.Vector3(posX, posY, posZ);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.5 - Math.random() * 0.5, (Math.random() - 0.5) * 0.2);
      const color = Math.random() < 0.3 ? 0xbbe3ff : 0xffffff;
      this.spawnParticle(pos, vel, color, 0.25 + Math.random() * 0.3, 3.0 + Math.random() * 1.5, 0.0, 0.99);
    }
  }

  // ----------------------------------------------------
  // SCREEN BILLBOARD FLOATING TEXTS
  // ----------------------------------------------------
  spawnFloatText(text, pos3D, type = 'damage') {
    if (!this.htmlPool || this.htmlPool.length === 0) return;

    const label = this.htmlPool[this.htmlPoolIndex];
    this.htmlPoolIndex = (this.htmlPoolIndex + 1) % this.htmlPool.length;

    label.active = true;
    label.element.innerText = text;
    label.element.className = `float-label ${type}`;
    label.pos3D.copy(pos3D);
    label.age = 0;
    label.maxAge = 45;
    label.element.style.display = 'block';
  }

  // Update loop for particles and floating text billboarding
  update(deltaTime, speedMultiplier, worldTheme = 1, isActive = true) {
    const dt = Math.min(deltaTime, 0.1) * speedMultiplier;

    // Spawn background atmospherics
    if (isActive) {
      this.spawnAtmospherics(dt, worldTheme);
    }

    // 1. Update WebGL Particles
    this.pool.forEach(p => {
      if (!p.mesh.visible) return;

      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        return;
      }

      // Physics integration
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= p.gravity * dt; // gravity
      p.velocity.multiplyScalar(Math.pow(p.drag, dt * 60)); // drag scaled by frame rate

      // Rotate particle dynamically
      if (p.rotationVelocity) {
        p.mesh.rotation.x += p.rotationVelocity.x * dt;
        p.mesh.rotation.y += p.rotationVelocity.y * dt;
        p.mesh.rotation.z += p.rotationVelocity.z * dt;
      }

      // Fade out and shrink towards end of life
      const ratio = p.life / p.maxLife;
      p.mesh.scale.setScalar(ratio * 1.2);
      p.material.opacity = ratio;
    });

    // 2. Update HTML Text Billboards
    if (!this.camera || !this.htmlPool) return;

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    const tempV = new THREE.Vector3();

    for (let i = 0; i < this.htmlPool.length; i++) {
      const label = this.htmlPool[i];
      if (!label.active) continue;

      label.age += speedMultiplier;

      if (label.age >= label.maxAge) {
        label.active = false;
        label.element.style.display = 'none';
        continue;
      }

      // Drift upward in 3D
      label.pos3D.y += dt * 0.8;

      // Project 3D coordinate to screen NDC
      tempV.copy(label.pos3D).project(this.camera);

      // Hide if behind the camera
      if (tempV.z > 1.0) {
        label.element.style.display = 'none';
        continue;
      }

      label.element.style.display = 'block';

      // Map NDC (-1 to 1) to screen pixels (left/top)
      const x = (tempV.x * widthHalf) + widthHalf;
      const y = -(tempV.y * heightHalf) + heightHalf;

      // CSS absolute positioning offset
      label.element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    }
  }

  // Full clean up of all floating elements
  clearAll() {
    if (this.htmlPool) {
      this.htmlPool.forEach(p => {
        p.active = false;
        p.element.style.display = 'none';
      });
    }
    this.pool.forEach(p => {
      p.mesh.visible = false;
    });
  }
}

export default new ParticleSystem();
