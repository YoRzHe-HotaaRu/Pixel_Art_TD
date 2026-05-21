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

    // Floating HTML text labels
    this.floatLabels = [];
  }

  // Pre-instantiate visual particles in the WebGL scene
  init(scene, camera, htmlContainer) {
    this.scene = scene;
    this.camera = camera;
    this.container = htmlContainer;

    // Clear old elements if any
    this.pool.forEach(p => {
      if (p.mesh.geometry) p.mesh.geometry.dispose();
      if (p.mesh.material) p.mesh.material.dispose();
      this.scene.remove(p.mesh);
    });
    this.pool = [];
    this.poolIndex = 0;

    // Pre-allocate meshes (Object Pooling)
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let i = 0; i < this.maxParticles; i++) {
      // Basic glowing material
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);

      this.pool.push({
        mesh: mesh,
        material: mat,
        velocity: new THREE.Vector3(),
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

      p.gravity = 6.0 + Math.random() * 6.0;
      p.drag = 0.96;
      p.maxLife = 0.4 + Math.random() * 0.4;
      p.life = p.maxLife;
    }
  }

  // ----------------------------------------------------
  // SCREEN BILLBOARD FLOATING TEXTS
  // ----------------------------------------------------
  spawnFloatText(text, pos3D, type = 'damage') {
    if (!this.container) return;

    const div = document.createElement('div');
    div.className = `float-label ${type}`;
    div.innerText = text;
    this.container.appendChild(div);

    this.floatLabels.push({
      element: div,
      pos3D: pos3D.clone(),
      age: 0,
      maxAge: 45 // frames duration
    });
  }

  // Update loop for particles and floating text billboarding
  update(deltaTime, speedMultiplier) {
    const dt = Math.min(deltaTime, 0.1) * speedMultiplier;

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

      // Fade out and shrink towards end of life
      const ratio = p.life / p.maxLife;
      p.mesh.scale.setScalar(ratio * 1.2);
      p.material.opacity = ratio;
    });

    // 2. Update HTML Text Billboards
    if (!this.camera || !this.container) return;

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    const tempV = new THREE.Vector3();

    for (let i = this.floatLabels.length - 1; i >= 0; i--) {
      const label = this.floatLabels[i];
      label.age += speedMultiplier;

      if (label.age >= label.maxAge) {
        label.element.remove();
        this.floatLabels.splice(i, 1);
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
    this.floatLabels.forEach(label => label.element.remove());
    this.floatLabels = [];
    this.pool.forEach(p => {
      p.mesh.visible = false;
    });
  }
}

export default new ParticleSystem();
