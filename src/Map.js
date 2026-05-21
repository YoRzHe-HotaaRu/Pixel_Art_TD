import * as THREE from 'three';

class Map {
  constructor() {
    this.gridSize = 12;
    this.spacing = 1.6; // Scale of each tile block
    this.halfSize = (this.gridSize - 1) / 2;

    // Define Level Key Coordinates (Row, Col)
    this.levelPaths = {
      1: [
        { r: 2, c: 0 },
        { r: 2, c: 3 },
        { r: 8, c: 3 },
        { r: 8, c: 8 },
        { r: 3, c: 8 },
        { r: 3, c: 11 }
      ],
      2: [
        { r: 0, c: 0 },
        { r: 11, c: 0 },
        { r: 11, c: 11 },
        { r: 2, c: 11 },
        { r: 2, c: 3 },
        { r: 9, c: 3 },
        { r: 9, c: 8 },
        { r: 5, c: 8 },
        { r: 5, c: 6 }
      ],
      3: [
        { r: 5, c: 0 },
        { r: 5, c: 2 },
        { r: 2, c: 2 },
        { r: 2, c: 9 },
        { r: 9, c: 9 },
        { r: 9, c: 2 },
        { r: 6, c: 2 },
        { r: 6, c: 11 }
      ]
    };
  }

  // Translate grid coordinates to 3D positions
  gridToWorld(col, row, heightOffset = 0.4) {
    const x = (col - this.halfSize) * this.spacing;
    const z = (row - this.halfSize) * this.spacing;
    return new THREE.Vector3(x, heightOffset, z);
  }

  // Reverse translate from 3D world coordinate to grid indices
  worldToGrid(pos) {
    const col = Math.round(pos.x / this.spacing + this.halfSize);
    const row = Math.round(pos.z / this.spacing + this.halfSize);
    return { col, row };
  }

  // Generate 2D array representing grid tile states
  generateGrid(worldTheme) {
    const grid = [];
    for (let r = 0; r < this.gridSize; r++) {
      grid[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        grid[r][c] = {
          row: r,
          col: c,
          type: 'grass', // Default buildable tile
          tower: null,
          worldPos: this.gridToWorld(c, r, 0) // baseline position
        };
      }
    }

    // 1. Trace Pathway tiles by interpolating nodes
    const nodes = this.levelPaths[worldTheme];
    const pathTiles = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      const start = nodes[i];
      const end = nodes[i + 1];
      
      const dr = Math.sign(end.r - start.r);
      const dc = Math.sign(end.c - start.c);

      let currR = start.r;
      let currC = start.c;

      while (currR !== end.r || currC !== end.c) {
        pathTiles.push({ r: currR, c: currC });
        if (currR !== end.r) currR += dr;
        if (currC !== end.c) currC += dc;
      }
    }
    // Push the final node
    pathTiles.push(nodes[nodes.length - 1]);

    // Apply path tile type
    pathTiles.forEach(tile => {
      grid[tile.r][tile.c].type = 'path';
    });

    // Mark Start & End base portals
    const startNode = nodes[0];
    const endNode = nodes[nodes.length - 1];
    grid[startNode.r][startNode.c].type = 'start';
    grid[endNode.r][endNode.c].type = 'end';

    // 2. Add World-specific Details (Rivers, Obstacles)
    if (worldTheme === 1) {
      // Draw a vertical cyan neon river at col = 6
      const riverCol = 6;
      for (let r = 0; r < this.gridSize; r++) {
        const cell = grid[r][riverCol];
        if (cell.type === 'grass') {
          cell.type = 'river';
        } else if (cell.type === 'path') {
          cell.type = 'bridge'; // Wood bridge where path intersects river
        }
      }
    }

    return { grid, pathTiles };
  }

  // Compute 3D waypoints list for ground units
  calculateWaypoints(worldTheme) {
    const nodes = this.levelPaths[worldTheme];
    const waypoints = [];
    
    // Trace step-by-step tile coordinates to create waypoint centers
    const { pathTiles } = this.generateGrid(worldTheme);
    
    pathTiles.forEach(tile => {
      // Create 3D waypoint centered on path tile, slightly above ground (y=0.4)
      waypoints.push(this.gridToWorld(tile.c, tile.r, 0.45));
    });

    return waypoints;
  }

  // Get spawn and castle coordinates for flying air units
  calculateAirPath(worldTheme) {
    const nodes = this.levelPaths[worldTheme];
    const spawnNode = nodes[0];
    const castleNode = nodes[nodes.length - 1];

    const spawn3D = this.gridToWorld(spawnNode.c, spawnNode.r, 1.8);
    const castle3D = this.gridToWorld(castleNode.c, castleNode.r, 1.8);

    return { spawn3D, castle3D };
  }

  // Determine positions to procedurally place trees or rocks
  getSceneryPositions(grid, worldTheme) {
    const positions = [];
    // Place scenery on non-buildable, empty grass tiles
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = grid[r][c];
        if (cell.type === 'grass') {
          // Check proximity to path. Don't place next to path to avoid blocking tower spots
          let nextToPath = false;
          const neighbors = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
          ];
          for (const [dr, dc] of neighbors) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
              const type = grid[nr][nc].type;
              if (type === 'path' || type === 'start' || type === 'end') {
                nextToPath = true;
                break;
              }
            }
          }

          // Random placement criteria
          if (!nextToPath && Math.random() < 0.22) {
            positions.push({
              col: c,
              row: r,
              worldPos: this.gridToWorld(c, r, 0.4) // sit scenery on top
            });
            // Mark cell as occupied so players can't place towers here
            cell.tower = 'scenery';
          }
        }
      }
    }
    return positions;
  }
}

export default new Map();
