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

  // Pre-generate all game textures (32x32 resolution)
  generateAll() {
    // 1. NEON GRASS TILE TEXTURE (World 1)
    this.textures['grass'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#092c15'; // deep dark moss base
      ctx.fillRect(0, 0, w, h);
      
      // Draw procedural neon blades
      for (let i = 0; i < 150; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        ctx.fillStyle = Math.random() < 0.65 ? '#10963e' : '#39ff14'; // rich emerald & hot neon green
        ctx.fillRect(x, y, 1 + Math.floor(Math.random() * 2), 1);
      }

      // Faint cyber-circuit board lanes
      ctx.fillStyle = 'rgba(57, 255, 20, 0.14)';
      ctx.fillRect(4, 4, 24, 1);
      ctx.fillRect(4, 4, 1, 24);
      ctx.fillRect(27, 4, 1, 24);
      ctx.fillRect(4, 27, 24, 1);
      ctx.fillRect(16, 4, 1, 24);
      
      // Baked Ambient Occlusion (darker 2-pixel margin)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 0, 2, h);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, h - 2, w, 2);
      ctx.fillRect(w - 2, 0, 2, h);
    });

    // 2. COBBLESTONE PATH TEXTURE
    this.textures['path'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#1b1d22'; // base dark slate
      ctx.fillRect(0, 0, w, h);
      
      // Beveled cobblestone blocks
      for (let r = 0; r < 32; r += 8) {
        for (let c = 0; c < 32; c += 8) {
          ctx.fillStyle = (r + c) % 16 === 0 ? '#2a2e36' : '#14161a';
          ctx.fillRect(c, r, 7, 7);

          // Top-left bevel highlight
          ctx.fillStyle = '#373c47';
          ctx.fillRect(c, r, 7, 1);
          ctx.fillRect(c, r, 1, 7);

          // Bottom-right shadow
          ctx.fillStyle = '#0a0b0d';
          ctx.fillRect(c, r + 6, 7, 1);
          ctx.fillRect(c + 6, r, 1, 7);
        }
      }

      // Bright glowing cyber neon power lines running through path
      ctx.fillStyle = 'rgba(0, 240, 255, 0.65)';
      ctx.fillRect(8, 8, 16, 2);
      ctx.fillRect(8, 22, 16, 2);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(15, 8, 2, 2);
      ctx.fillRect(15, 22, 2, 2);

      // Border shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 0, 2, h);
    });

    // 3. CYBER FLOWING WATER TEXTURE
    this.textures['water'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#001a33'; // deep midnight blue base
      ctx.fillRect(0, 0, w, h);
      
      // Midtone wave bands
      ctx.fillStyle = '#003366';
      ctx.fillRect(0, 0, w, 8);
      ctx.fillRect(0, 16, w, 8);

      ctx.fillStyle = '#004c99';
      ctx.fillRect(4, 3, 12, 3);
      ctx.fillRect(18, 11, 10, 3);
      ctx.fillRect(2, 19, 14, 3);
      ctx.fillRect(18, 27, 12, 3);

      // Light blue ripples
      ctx.fillStyle = '#0073e6';
      ctx.fillRect(6, 4, 8, 1);
      ctx.fillRect(20, 12, 6, 1);
      ctx.fillRect(4, 20, 10, 1);
      ctx.fillRect(20, 28, 8, 1);

      // Neon cyan highlights
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(8, 4, 3, 1);
      ctx.fillRect(22, 12, 2, 1);
      ctx.fillRect(6, 20, 4, 1);
      ctx.fillRect(22, 28, 3, 1);
    });
    // Enable repeat wrapping for water UV animation
    this.textures['water'].wrapS = THREE.RepeatWrapping;
    this.textures['water'].wrapT = THREE.RepeatWrapping;

    // 4. FLOWING LAVA TEXTURE (World 2 path)
    this.textures['lava'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#1c0500'; // dark cooling volcanic crust
      ctx.fillRect(0, 0, w, h);

      // Deep red molten veins
      ctx.fillStyle = '#660c00';
      ctx.fillRect(4, 0, 10, 32);
      ctx.fillRect(18, 0, 10, 32);
      
      ctx.fillStyle = '#b31a00'; // vibrant orange-red
      ctx.fillRect(6, 0, 6, 32);
      ctx.fillRect(20, 0, 6, 32);

      ctx.fillStyle = '#ff6600'; // bright orange
      ctx.fillRect(7, 4, 4, 24);
      ctx.fillRect(21, 6, 4, 20);

      ctx.fillStyle = '#ffcc00'; // yellow hot core
      ctx.fillRect(8, 8, 2, 16);
      ctx.fillRect(22, 10, 2, 12);

      ctx.fillStyle = '#ffffff'; // white-hot critical core
      ctx.fillRect(8, 13, 1, 6);
    });
    // Enable repeat wrapping for lava UV animation
    this.textures['lava'].wrapS = THREE.RepeatWrapping;
    this.textures['lava'].wrapT = THREE.RepeatWrapping;

    // 5. OBSIDIAN VOLCANIC CRUST (World 2 grass block alternative)
    this.textures['obsidian'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#040306'; // charcoal obsidian
      ctx.fillRect(0, 0, w, h);

      // Basalt block divisions
      for (let r = 0; r < 32; r += 16) {
        for (let c = 0; c < 32; c += 16) {
          ctx.fillStyle = '#09080d';
          ctx.fillRect(c, r, 15, 15);

          // Deep magma cracks
          ctx.fillStyle = '#3a0900';
          ctx.fillRect(c + 4, r + 4, 8, 1);
          ctx.fillRect(c + 4, r + 4, 1, 8);
          ctx.fillStyle = '#801b00';
          ctx.fillRect(c + 5, r + 5, 6, 1);
          ctx.fillRect(c + 5, r + 5, 1, 6);

          ctx.fillStyle = '#ff3c00'; // hot magma spots
          ctx.fillRect(c + 7, r + 7, 2, 2);
        }
      }

      // Glow spots scattered
      for (let i = 0; i < 24; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        ctx.fillStyle = Math.random() < 0.75 ? '#300800' : '#d43f00';
        ctx.fillRect(x, y, 1, 1);
      }

      // Baked Ambient Occlusion
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 0, 2, h);
    });

    // 6. SNOWY CIRCUIT BOARD TEXTURE (World 3 grass block alternative)
    this.textures['snow'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#e6f2ff'; // soft snowy white-blue
      ctx.fillRect(0, 0, w, h);

      // Cyber circuit lanes (deep frost blue)
      ctx.fillStyle = '#b0cbe8';
      ctx.fillRect(4, 4, 2, 24);
      ctx.fillRect(4, 12, 24, 2);
      ctx.fillRect(26, 4, 2, 24);
      ctx.fillRect(4, 22, 24, 2);

      ctx.fillStyle = '#00f0ff'; // glowing cyan joints
      ctx.fillRect(4, 12, 2, 2);
      ctx.fillRect(26, 12, 2, 2);
      ctx.fillRect(4, 22, 2, 2);
      ctx.fillRect(26, 22, 2, 2);

      // Crystalline frost details
      for (let i = 0; i < 45; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 1);
      }

      // Baked Ambient Occlusion
      ctx.fillStyle = 'rgba(0, 80, 160, 0.18)';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 0, 2, h);
    });

    // 7. ICY ROAD TEXTURE (World 3 path)
    this.textures['ice_path'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#3b6f99'; // deep glacial blue
      ctx.fillRect(0, 0, w, h);

      // Icy block layers
      ctx.fillStyle = '#2d587c';
      ctx.fillRect(0, 0, w, 16);
      ctx.fillStyle = '#4c87b7';
      ctx.fillRect(0, 16, w, 16);

      // Glacial fractures
      ctx.fillStyle = '#7bc1ed';
      ctx.beginPath();
      ctx.moveTo(2, 8); ctx.lineTo(14, 8); ctx.lineTo(20, 14); ctx.lineTo(30, 14);
      ctx.moveTo(12, 20); ctx.lineTo(24, 20); ctx.lineTo(28, 24);
      ctx.stroke();

      // Frosting shine overlays
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 7, 5, 1);
      ctx.fillRect(22, 13, 3, 1);
      ctx.fillRect(6, 19, 4, 1);
      ctx.fillRect(26, 27, 3, 1);

      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 0, 2, h);
    });

    // 8. DIRT TEXTURE (Used for tile sides)
    this.textures['dirt'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#26150b'; // rich dark chocolate brown
      ctx.fillRect(0, 0, w, h);

      // Textured gravel particles
      for (let i = 0; i < 70; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        ctx.fillStyle = Math.random() < 0.45 ? '#150a04' : (Math.random() < 0.5 ? '#331c0e' : '#452817');
        ctx.fillRect(x, y, 1 + Math.floor(Math.random() * 2), 1 + Math.floor(Math.random() * 2));
      }
    });

    // 9. WOOD TEXTURE
    this.textures['wood'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#482f27'; // deep mahogany wood base
      ctx.fillRect(0, 0, w, h);
      
      // Horizontal wood planks
      for (let r = 0; r < 32; r += 8) {
        ctx.fillStyle = r % 16 === 0 ? '#54382e' : '#422a22';
        ctx.fillRect(0, r, w, 7);

        // Plank joint line
        ctx.fillStyle = '#23130e';
        ctx.fillRect(0, r + 7, w, 1);

        // Wood grains
        ctx.fillStyle = '#311b15';
        ctx.fillRect(4, r + 2, 10, 1);
        ctx.fillRect(18, r + 4, 8, 1);
        ctx.fillRect(10, r + 5, 6, 1);
      }
    });

    // 10. STEEL TEXTURE
    this.textures['steel'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#4b4e54'; // gunmetal base
      ctx.fillRect(0, 0, w, h);

      // Plated metal grid lines
      ctx.fillStyle = '#2c2e32';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 0, 2, h);
      ctx.fillStyle = '#7a818e'; // high bevel shine highlight
      ctx.fillRect(w - 2, 2, 2, h - 2);
      ctx.fillRect(2, h - 2, w - 2, 2);

      // Structural rivets in four corners
      ctx.fillStyle = '#1e2024';
      const offsets = [4, 26];
      offsets.forEach(r => {
        offsets.forEach(c => {
          ctx.fillStyle = '#1a1b1e';
          ctx.fillRect(c, r, 2, 2);
          ctx.fillStyle = '#8e96a5';
          ctx.fillRect(c, r, 1, 1);
        });
      });
    });

    // 11. GOLD SHINEY TEXTURE
    this.textures['gold'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#b8860b'; // golden bronze base
      ctx.fillRect(0, 0, w, h);

      // Outer gold plating bevels
      ctx.fillStyle = '#8b6508';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 0, 2, h);
      ctx.fillStyle = '#ffdf6d'; // bright gold reflection
      ctx.fillRect(w - 2, 2, 2, h - 2);
      ctx.fillRect(2, h - 2, w - 2, 2);

      // Embedded inner panel
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(6, 6, 20, 20);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(10, 10, 12, 12);

      // Twinkles & specular reflections
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(12, 12, 2, 2);
      ctx.fillRect(22, 8, 1, 1);
      ctx.fillRect(8, 22, 1, 1);
      ctx.fillRect(24, 24, 2, 2);
    });

    // 12. PORTAL RIFT TEXTURE
    this.textures['portal'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#06000c'; // abyssal dark void
      ctx.fillRect(0, 0, w, h);

      // Concentric procedurally drawn galaxy spirals (indigo, violet, magenta, white)
      const cx = 16, cy = 16;
      for (let theta = 0; theta < Math.PI * 10; theta += 0.08) {
        const r = theta * 0.48;
        const x = Math.floor(cx + Math.cos(theta) * r);
        const y = Math.floor(cy + Math.sin(theta) * r);
        if (x >= 0 && x < 32 && y >= 0 && y < 32) {
          ctx.fillStyle = theta < Math.PI * 2.5 ? '#ffffff' : 
                          (theta < Math.PI * 5.0 ? '#b026ff' : 
                          (theta < Math.PI * 7.5 ? '#6a009c' : '#2b004c'));
          ctx.fillRect(x, y, 1 + Math.floor(r * 0.04), 1 + Math.floor(r * 0.04));
        }
      }

      // Twinkling galactic embers
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        ctx.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#00f0ff';
        ctx.fillRect(x, y, 1, 1);
      }
    });

    // 13. CRYSTAL GLITCH TEXTURE (For Ice Spire / Boss / Lasers)
    this.textures['crystal'] = this.createPixelTexture(32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#002933'; // deep gem base
      ctx.fillRect(0, 0, w, h);
      
      // Diamond angled crystal facets
      ctx.fillStyle = '#005f73';
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(32, 16); ctx.lineTo(16, 32); ctx.lineTo(0, 16);
      ctx.fill();

      ctx.fillStyle = '#0a9396';
      ctx.beginPath();
      ctx.moveTo(16, 4); ctx.lineTo(28, 16); ctx.lineTo(16, 28); ctx.lineTo(4, 16);
      ctx.fill();

      ctx.fillStyle = '#94d2bd';
      ctx.beginPath();
      ctx.moveTo(16, 8); ctx.lineTo(24, 16); ctx.lineTo(16, 24); ctx.lineTo(8, 16);
      ctx.fill();

      // Hyper cyan core
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(13, 13, 6, 6);

      // Specular reflections
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 14, 2, 2);
    });
  }

  // Getter helper
  get(name) {
    return this.textures[name] || null;
  }
}

export default new TextureGenerator();
