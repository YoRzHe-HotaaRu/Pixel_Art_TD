import * as THREE from 'three';

class TextureGenerator {
  constructor() {
    this.textures = {};
  }

  // Helper to compile canvas-based pixel textures with nearest-neighbor filters
  createPixelTexture(width, height, drawCallback) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Ensure sharp edges when drawing inside 2D canvas
    ctx.imageSmoothingEnabled = false;

    // Execute drawing callback
    drawCallback(ctx, width, height);

    // Create Three.js texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Set filters for crisp pixelated rendering (prevent blurring/mipmapping)
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    
    return texture;
  }

  // Pre-generate all game textures
  generateAll() {
    // 1. NEON GRASS TILE TEXTURE (World 1)
    this.textures['grass'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#0f401f'; // dark moss base
      ctx.fillRect(0, 0, w, h);
      
      // Draw procedural neon blades
      for (let i = 0; i < 40; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        ctx.fillStyle = Math.random() < 0.6 ? '#13a83e' : '#39ff14'; // bright emerald & neon green
        ctx.fillRect(x, y, 1 + Math.floor(Math.random() * 2), 1);
      }
      
      // Baked Ambient Occlusion (dark 1-pixel margin)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, w, 1);
      ctx.fillRect(0, 0, 1, h);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, h - 1, w, 1);
      ctx.fillRect(w - 1, 0, 1, h);
    });

    // 2. COBBLESTONE PATH TEXTURE
    this.textures['path'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#22252a'; // dark grey base
      ctx.fillRect(0, 0, w, h);
      
      // Cobble blocks
      for (let i = 0; i < 15; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        const sizeW = 2 + Math.floor(Math.random() * 4);
        const sizeH = 2 + Math.floor(Math.random() * 3);
        ctx.fillStyle = Math.random() < 0.5 ? '#363c46' : '#1b1e22';
        ctx.fillRect(x, y, sizeW, sizeH);
      }

      // Add cyan neon cyber-stripes along paths
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.fillRect(4, 4, 8, 1);
      ctx.fillRect(4, 11, 8, 1);

      // Border shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, 1);
      ctx.fillRect(0, 0, 1, h);
    });

    // 3. CYBER FLOWING WATER TEXTURE
    this.textures['water'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#002b4d'; // deep blue base
      ctx.fillRect(0, 0, w, h);
      
      // Light blue ripples
      ctx.fillStyle = '#005b9f';
      ctx.fillRect(1, 2, 6, 1);
      ctx.fillRect(9, 6, 5, 1);
      ctx.fillRect(3, 10, 8, 1);
      ctx.fillRect(11, 13, 3, 1);

      // Neon cyan highlights
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(3, 3, 2, 1);
      ctx.fillRect(11, 7, 2, 1);
      ctx.fillRect(6, 11, 2, 1);
    });
    // Enable repeat wrapping for water UV animation
    this.textures['water'].wrapS = THREE.RepeatWrapping;
    this.textures['water'].wrapT = THREE.RepeatWrapping;

    // 4. FLOWING LAVA TEXTURE (World 2 path)
    this.textures['lava'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#2d0900'; // dark volcanic crust
      ctx.fillRect(0, 0, w, h);

      // Molten veins
      ctx.fillStyle = '#9e1b00'; // deep red lava
      ctx.fillRect(2, 0, 3, 16);
      ctx.fillRect(10, 0, 4, 16);
      
      ctx.fillStyle = '#e65c00'; // bright orange
      ctx.fillRect(3, 2, 1, 12);
      ctx.fillRect(11, 4, 2, 8);

      ctx.fillStyle = '#ffcc00'; // yellow core
      ctx.fillRect(3, 5, 1, 5);
      ctx.fillRect(12, 6, 1, 4);
    });
    // Enable repeat wrapping for lava UV animation
    this.textures['lava'].wrapS = THREE.RepeatWrapping;
    this.textures['lava'].wrapT = THREE.RepeatWrapping;

    // 5. OBSIDIAN VOLCANIC CRUST (World 2 grass block alternative)
    this.textures['obsidian'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#09080c'; // charcoal obsidian
      ctx.fillRect(0, 0, w, h);

      // Glow spots
      for (let i = 0; i < 12; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        ctx.fillStyle = Math.random() < 0.7 ? '#420b00' : '#882200'; // magma glow
        ctx.fillRect(x, y, 1, 1);
      }

      // Baked Ambient Occlusion
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, w, 1);
      ctx.fillRect(0, 0, 1, h);
    });

    // 6. SNOWY CIRCUIT BOARD TEXTURE (World 3 grass block alternative)
    this.textures['snow'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#dbeeff'; // soft snowy white
      ctx.fillRect(0, 0, w, h);

      // Circuit lanes
      ctx.fillStyle = '#b3cbe6';
      ctx.fillRect(2, 2, 1, 12);
      ctx.fillRect(2, 6, 10, 1);
      ctx.fillRect(10, 6, 1, 8);
      ctx.fillRect(6, 10, 8, 1);

      // Ice crystals
      for (let i = 0; i < 8; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 1);
      }

      // Baked Ambient Occlusion
      ctx.fillStyle = 'rgba(0, 80, 150, 0.15)';
      ctx.fillRect(0, 0, w, 1);
      ctx.fillRect(0, 0, 1, h);
    });

    // 7. ICY ROAD TEXTURE (World 3 path)
    this.textures['ice_path'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#4c86b2'; // icy blue
      ctx.fillRect(0, 0, w, h);

      // Glacial cracks
      ctx.fillStyle = '#7dbde8';
      ctx.fillRect(1, 4, 14, 1);
      ctx.fillRect(4, 1, 1, 14);
      ctx.fillRect(8, 8, 6, 1);

      ctx.fillStyle = '#ffffff'; // frosting shine
      ctx.fillRect(2, 4, 2, 1);
      ctx.fillRect(4, 9, 1, 2);

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, 1);
      ctx.fillRect(0, 0, 1, h);
    });

    // 8. DIRT TEXTURE (Used for tile sides)
    this.textures['dirt'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#3a2215'; // chocolate brown
      ctx.fillRect(0, 0, w, h);

      // Speckles
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        ctx.fillStyle = Math.random() < 0.5 ? '#24140a' : '#4d301f';
        ctx.fillRect(x, y, 1, 1);
      }
    });

    // 9. WOOD TEXTURE
    this.textures['wood'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#6d4c41'; // wood base
      ctx.fillRect(0, 0, w, h);
      
      // Planks borders
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(0, 0, w, 1);
      ctx.fillRect(0, 7, w, 1);
      ctx.fillRect(0, 15, w, 1);
      ctx.fillRect(6, 0, 1, 8);
      ctx.fillRect(12, 8, 1, 8);
    });

    // 10. STEEL TEXTURE
    this.textures['steel'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#616161'; // iron plate
      ctx.fillRect(0, 0, w, h);

      // Plate borders
      ctx.fillStyle = '#424242';
      ctx.fillRect(0, 0, w, 1);
      ctx.fillRect(0, 0, 1, h);
      ctx.fillStyle = '#9e9e9e'; // highlight
      ctx.fillRect(w-1, 1, 1, h-1);
      ctx.fillRect(1, h-1, w-1, 1);

      // Rivets in corners
      ctx.fillStyle = '#212121';
      ctx.fillRect(2, 2, 1, 1);
      ctx.fillRect(13, 2, 1, 1);
      ctx.fillRect(2, 13, 1, 1);
      ctx.fillRect(13, 13, 1, 1);
    });

    // 11. GOLD SHINEY TEXTURE
    this.textures['gold'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#e5a900'; // gold base
      ctx.fillRect(0, 0, w, h);

      // Sparkles
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(2, 4, 3, 2);
      ctx.fillRect(9, 2, 2, 3);
      ctx.fillRect(5, 10, 4, 2);

      ctx.fillStyle = '#ffffff'; // spec highlight
      ctx.fillRect(3, 4, 1, 1);
      ctx.fillRect(10, 3, 1, 1);
    });

    // 12. PORTAL RIFT TEXTURE
    this.textures['portal'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#120024'; // dark void
      ctx.fillRect(0, 0, w, h);

      // Violet swirls
      ctx.fillStyle = '#3a005c';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#6a009c';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#b026ff'; // bright magenta portal core
      ctx.fillRect(6, 6, 4, 4);

      // Twinkle sparks
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 1);
      }
    });

    // 13. CRYSTAL GLITCH TEXTURE (For Ice Spire / Boss / Lasers)
    this.textures['crystal'] = this.createPixelTexture(16, 16, (ctx, w, h) => {
      ctx.fillStyle = '#004a60';
      ctx.fillRect(0, 0, w, h);
      
      ctx.fillStyle = '#00a3c4';
      ctx.fillRect(0, 2, 16, 12);
      
      ctx.fillStyle = '#00f0ff'; // glowing cyan
      ctx.fillRect(4, 4, 8, 8);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 4, 2, 2);
    });
  }

  // Getter helper
  get(name) {
    return this.textures[name] || null;
  }
}

export default new TextureGenerator();
