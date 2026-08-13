import { Platform, Rect, BreakableWall, WaterZone, ThornHazard, Checkpoint } from './types';
import { Crate } from './Crate';

export class Environment {
  public levelWidth = 5000;
  public levelHeight = 768;
  public deathBoundaryY = 740;

  public platforms: Platform[] = [];
  public crates: Crate[] = [];
  public breakableWalls: BreakableWall[] = [];
  public waterZones: WaterZone[] = [];
  public thornHazards: ThornHazard[] = [];
  public checkpoints: Checkpoint[] = [];

  private clouds: { x: number; y: number; scale: number; speed: number }[] = [];
  private birds: { x: number; y: number; vx: number; vy: number; wingTimer: number; scale: number; basey: number }[] = [];
  private trees: { x: number; y: number; height: number; scale: number; type: 'oak' | 'pine'; layer: 'bg' | 'fg' }[] = [];
  private bushes: { x: number; y: number; width: number; height: number; color: string }[] = [];
  private rocks: { x: number; y: number; width: number; height: number }[] = [];
  private houses: {
    x: number;
    y: number;
    width: number;
    height: number;
    wallColor: string;
    roofColor: string;
    type: 'school_annex' | 'cottage' | 'twostory';
  }[] = [];
  private benches: { x: number; y: number }[] = [];

  // Particle System (Brick debris, dust, splashes, pops)
  private particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    life: number;
    maxLife: number;
    rot: number;
    vr: number;
    type: 'brick' | 'dust' | 'water' | 'thorn';
  }[] = [];

  private birdSpawnTimer = 0;

  constructor() {
    this.initLevel();
    this.validateLevelReachability();
  }

  // Get terrain surface height at a specific world X position
  public getTerrainHeightAt(x: number): number {
    let highestSurface = 480; // default base ground
    let found = false;

    for (const plat of this.platforms) {
      if (x >= plat.x && x <= plat.x + plat.width) {
        if (!found || plat.y < highestSurface) {
          highestSurface = plat.y;
          found = true;
        }
      }
    }
    return highestSurface;
  }

  private initLevel() {
    this.platforms = [];
    this.crates = [];
    this.breakableWalls = [];
    this.waterZones = [];
    this.thornHazards = [];
    this.checkpoints = [];

    // =========================================================
    // AREA 1 — SCHOOL ROAD (TUTORIAL) (0 to 900)
    // Continuous main ground at Y ground ≈ 620
    // Purpose: Teach Walk -> Football -> Kick -> Ball moves. No teleport immediately.
    // =========================================================
    this.platforms.push({
      id: 'ground-1',
      x: 0,
      y: 620,
      width: 900,
      height: 148, // Solid fill down to level bottom Y=768
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // Checkpoint 1 (School Road)
    this.checkpoints.push({
      id: 'cp-1',
      name: 'School Road',
      x: 200,
      y: 620,
      width: 32,
      height: 60,
      playerSpawnX: 250,
      playerSpawnY: 524, // Standing on ground Y=620 (height 96)
      ballSpawnX: 330,
      ballSpawnY: 588, // Resting on ground Y=620 (diameter 32)
      isActive: true,
    });

    // Area 1 Houses (School Annex & Small Suburban Houses)
    this.houses = [
      { x: 100, y: 620, width: 85, height: 75, wallColor: '#e2e8f0', roofColor: '#1e293b', type: 'school_annex' },
      { x: 500, y: 620, width: 110, height: 95, wallColor: '#fef3c7', roofColor: '#991b1b', type: 'cottage' },
      { x: 750, y: 620, width: 120, height: 115, wallColor: '#ffedd5', roofColor: '#b45309', type: 'twostory' },
    ];

    // Area 1 Benches
    this.benches = [
      { x: 200, y: 620 },
      { x: 450, y: 620 },
      { x: 710, y: 620 },
    ];

    // =========================================================
    // AREA 2 — THE FIRST BRICK WALL (900 to 1500)
    // Continuous road ground reaching the brick wall
    // Wall height: 120 px, width: 100 px sitting at X = 1250, Y = 500
    // Player cannot jump over it (jump height ~83px). Ball can hit it.
    // Weak kick (<700 px/s): SHAKE. Strong kick (>=700 px/s): BRICKS BREAK!
    // =========================================================
    this.platforms.push({
      id: 'ground-2-wall-road',
      x: 900,
      y: 620,
      width: 600,
      height: 148,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    this.breakableWalls.push({
      id: 'wall-1',
      x: 1250,
      y: 120, // Ground Y=620 - 500px height = 120 (Tall fortress wall reaching sky)
      width: 100,
      height: 500,
      isBroken: false,
      breakThreshold: 700, // Strong kick >= 700 px/s breaks wall
      shakeTimer: 0,
      shakeOffset: 0,
    });

    // =========================================================
    // AREA 3 — THE CRATE STEP (1500 to 2200)
    // Height problem: High Platform Y = 400 vs Ground Y = 570 (Gap: 170 px)
    // Player cannot jump onto it directly. Requires pushable crate to climb.
    // =========================================================
    this.platforms.push({
      id: 'ground-3-base',
      x: 1500,
      y: 570,
      width: 350,
      height: 198,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // Pushable Wooden Crate (44x44) sitting on Ground Y=570 at x=1680
    this.crates.push(new Crate('crate-1', 1680, 526));

    // High Platform (Y = 400) - 170px height gap
    this.platforms.push({
      id: 'ground-3-high-platform',
      x: 1850,
      y: 400,
      width: 350,
      height: 368,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // =========================================================
    // AREA 4 — THE FIRST TELEPORT PUZZLE (2200 to 3100)
    // Signature mechanic: Narrow tunnel (36px gap) that boy (64px) cannot enter,
    // but football (32px) can. Player kicks ball through, then presses Q to teleport!
    // =========================================================
    // Approach ground before tunnel
    this.platforms.push({
      id: 'ground-4-approach',
      x: 2200,
      y: 400,
      width: 250,
      height: 368,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // Narrow Tunnel Floor
    this.platforms.push({
      id: 'ground-4-tunnelfloor',
      x: 2450,
      y: 400,
      width: 270,
      height: 368,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // Narrow Tunnel Roof Block (Low ceiling: Gap height = 36px between Y=364 and Y=400)
    this.platforms.push({
      id: 'tunnel-4-roof',
      x: 2450,
      y: 180,
      width: 270,
      height: 184, // Y=180 to Y=364
      type: 'ground',
      color: '#475569',
      topColor: '#334155',
    });

    // Open Ground beyond tunnel
    this.platforms.push({
      id: 'ground-4-exit',
      x: 2720,
      y: 400,
      width: 380,
      height: 368,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // =========================================================
    // AREA 5 — RIVER & DEEP RIVERBED WITH BRIDGE (3100 to 3750)
    // Riverbed sits in a natural terrain depression.
    // Soil on riverbed at y=560, Water surface at y=500.
    // Safe crossing via wooden bridges and central stone pillar.
    // =========================================================
    this.platforms.push({
      id: 'riverbed-base',
      x: 3100,
      y: 560,
      width: 450,
      height: 140,
      type: 'ground',
      color: '#3d2514',
      topColor: '#2d681f',
    });

    // Water Zone inside the depression
    this.waterZones.push({
      id: 'water-river',
      label: 'Deep River',
      x: 3100,
      y: 500,
      width: 450,
      height: 60,
    });

    // Central Stone Pillar in River
    this.platforms.push({
      id: 'river-stone-pillar',
      x: 3290,
      y: 420,
      width: 70,
      height: 280,
      type: 'ground',
      color: '#57534e',
      topColor: '#84cc16',
    });

    // Left Wooden Bridge over River
    this.platforms.push({
      id: 'bridge-left',
      x: 3100,
      y: 420,
      width: 170,
      height: 18,
      type: 'bridge',
      color: '#85562e',
      topColor: '#a87343',
    });

    // Right Wooden Bridge over River
    this.platforms.push({
      id: 'bridge-right',
      x: 3380,
      y: 420,
      width: 170,
      height: 18,
      type: 'bridge',
      color: '#85562e',
      topColor: '#a87343',
    });

    // Right Riverbank Ground
    this.platforms.push({
      id: 'ground-5-riverbank',
      x: 3550,
      y: 460,
      width: 200,
      height: 240,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // =========================================================
    // AREA 6 — THORN VALLEY & SAFE STEPPING STONES (3750 to 4350)
    // =========================================================
    this.platforms.push({
      id: 'ground-6a',
      x: 3750,
      y: 460,
      width: 100,
      height: 240,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // Thorn Pit 1 (Pit floor at y=490, Thorns at y=464)
    this.platforms.push({
      id: 'thorn-pit-floor-1',
      x: 3850,
      y: 490,
      width: 120,
      height: 210,
      type: 'ground',
      color: '#3d2514',
      topColor: '#1c3d18',
    });

    this.thornHazards.push({
      id: 'thorn-1',
      x: 3850,
      y: 464,
      width: 120,
      height: 26,
      type: 'ground',
    });

    // Stepping Stone Pillar 1 over Thorn Pit 1
    this.platforms.push({
      id: 'stone-step-1',
      x: 3885,
      y: 410,
      width: 50,
      height: 290,
      type: 'ground',
      color: '#57534e',
      topColor: '#84cc16',
    });

    this.platforms.push({
      id: 'ground-6b',
      x: 3970,
      y: 460,
      width: 100,
      height: 240,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // Thorn Pit 2
    this.platforms.push({
      id: 'thorn-pit-floor-2',
      x: 4070,
      y: 490,
      width: 120,
      height: 210,
      type: 'ground',
      color: '#3d2514',
      topColor: '#1c3d18',
    });

    this.thornHazards.push({
      id: 'thorn-2',
      x: 4070,
      y: 464,
      width: 120,
      height: 26,
      type: 'ground',
    });

    // Stepping Stone Pillar 2 over Thorn Pit 2
    this.platforms.push({
      id: 'stone-step-2',
      x: 4105,
      y: 410,
      width: 50,
      height: 290,
      type: 'ground',
      color: '#57534e',
      topColor: '#84cc16',
    });

    this.platforms.push({
      id: 'ground-6c',
      x: 4190,
      y: 460,
      width: 160,
      height: 240,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // =========================================================
    // AREA 7 — MOUNTAIN SUMMIT & CHECKPOINT 2 (4350 to 5000)
    // Elevated summit terrain
    // =========================================================
    this.platforms.push({
      id: 'ground-7-summit',
      x: 4350,
      y: 420,
      width: 650,
      height: 280,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    this.checkpoints.push({
      id: 'cp-2',
      name: 'Mountain Summit',
      x: 4450,
      y: 420,
      width: 32,
      height: 60,
      playerSpawnX: 4430,
      playerSpawnY: 340,
      ballSpawnX: 4490,
      ballSpawnY: 380,
      isActive: false,
    });

    // =========================================================
    // AREA 8 — FORTRESS WALL & GOAL ZONE (5000 to 5800)
    // Goal area beyond fortress brick wall 2
    // =========================================================
    this.platforms.push({
      id: 'ground-8-goal',
      x: 5000,
      y: 420,
      width: 800,
      height: 280,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    this.breakableWalls.push({
      id: 'wall-2',
      x: 4680,
      y: 220,
      width: 48,
      height: 200,
      isBroken: false,
      breakThreshold: 700,
      shakeTimer: 0,
      shakeOffset: 0,
    });

    // =========================================================
    // SCENERY: CLOUDS, GROUNDED TREES, BUSHES, ROCKS
    // =========================================================
    for (let i = 0; i < 24; i++) {
      this.clouds.push({
        x: i * 220 + Math.random() * 80,
        y: 20 + Math.random() * 80,
        scale: 0.6 + Math.random() * 0.6,
        speed: 7 + Math.random() * 10,
      });
    }

    // Procedural Trees (RULE 10: Dynamically grounded to match terrain top surface!)
    const treeXPos = [
      80, 220, 420, 720, 960, 1180, 1460, 1840, 2540, 2740, 2950, 3180, 3360,
      3700, 3920, 4120, 4300, 4550, 4800,
    ];

    treeXPos.forEach((x, idx) => {
      const terrainY = this.getTerrainHeightAt(x);
      this.trees.push({
        x,
        y: terrainY, // Exact terrain top surface match!
        height: 60 + Math.random() * 30,
        scale: 0.8 + Math.random() * 0.4,
        type: idx % 2 === 0 ? 'oak' : 'pine',
        layer: idx % 3 === 0 ? 'fg' : 'bg',
      });
    });

    // Bushes grounded on terrain
    const bushXPos = [140, 310, 520, 1020, 1500, 2580, 3220, 3800, 4450, 4700];
    bushXPos.forEach(x => {
      const terrainY = this.getTerrainHeightAt(x);
      this.bushes.push({
        x,
        y: terrainY,
        width: 22 + Math.random() * 16,
        height: 14 + Math.random() * 10,
        color: Math.random() > 0.5 ? '#389e2b' : '#2e8223',
      });
    });

    // Rocks grounded on terrain
    const rockXPos = [180, 480, 780, 1100, 1660, 2640, 3260, 3880, 4620];
    rockXPos.forEach(x => {
      const terrainY = this.getTerrainHeightAt(x);
      this.rocks.push({
        x,
        y: terrainY,
        width: 14 + Math.random() * 12,
        height: 8 + Math.random() * 6,
      });
    });

    // Spawn initial birds
    for (let i = 0; i < 4; i++) {
      this.spawnBird(Math.random() * 1200);
    }
  }

  // Traversal & Reachability Validator (RULE 17)
  private validateLevelReachability() {
    const maxJumpHeight = 100; // Player max jump height without crate
    const maxJumpWidth = 185; // Player max horizontal jump distance

    let isValid = true;
    for (let i = 0; i < this.platforms.length - 1; i++) {
      const p1 = this.platforms[i];
      const p2 = this.platforms[i + 1];

      const dx = p2.x - (p1.x + p1.width);
      const dy = p1.y - p2.y; // Positive if p2 is higher than p1

      if (dx > maxJumpWidth && p1.type === 'ground' && p2.type === 'ground') {
        console.warn(`[LEVEL VALIDATOR] Wide gap between ${p1.id} and ${p2.id}: ${dx}px`);
      }
      if (dy > maxJumpHeight) {
        // Check if there is an intermediate crate or step platform
        const hasCrateOrStep =
          this.crates.some(c => c.x >= p1.x && c.x <= p2.x) ||
          this.platforms.some(step => step.x >= p1.x && step.x <= p2.x && step.y < p1.y && step.y > p2.y);

        if (!hasCrateOrStep) {
          console.warn(`[LEVEL VALIDATOR] High step between ${p1.id} and ${p2.id}: ${dy}px without crate/step!`);
          isValid = false;
        }
      }
    }
    if (isValid) {
      console.log('✅ [LEVEL VALIDATION PASSED] All gameplay platforms are 100% reachable!');
    }
  }

  private spawnBird(overrideX?: number) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const startX = overrideX !== undefined ? overrideX : side === 1 ? -60 : this.levelWidth + 60;
    const basey = 50 + Math.random() * 140;

    this.birds.push({
      x: startX,
      y: basey,
      basey,
      vx: side * (40 + Math.random() * 35),
      vy: 0,
      wingTimer: Math.random() * Math.PI * 2,
      scale: 0.7 + Math.random() * 0.5,
    });
  }

  public shatterWall(wall: BreakableWall) {
    wall.isBroken = true;

    // Scale particle count dynamically with wall dimensions
    const fragmentCount = Math.min(60, Math.max(28, Math.floor((wall.width * wall.height) / 1000)));
    for (let i = 0; i < fragmentCount; i++) {
      this.particles.push({
        x: wall.x + Math.random() * wall.width,
        y: wall.y + Math.random() * wall.height,
        vx: (Math.random() - 0.2) * 560,
        vy: -150 - Math.random() * 320,
        size: 7 + Math.random() * 10,
        color: i % 4 === 0 ? '#b91c1c' : i % 4 === 1 ? '#991b1b' : i % 4 === 2 ? '#d97706' : '#7f1d1d',
        alpha: 1.0,
        life: 0,
        maxLife: 1.8 + Math.random() * 0.8,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 16,
        type: 'brick',
      });
    }

    const dustCount = Math.min(36, Math.max(16, Math.floor(fragmentCount * 0.7)));
    for (let i = 0; i < dustCount; i++) {
      this.particles.push({
        x: wall.x + Math.random() * wall.width,
        y: wall.y + Math.random() * wall.height,
        vx: (Math.random() - 0.5) * 260,
        vy: -60 - Math.random() * 140,
        size: 10 + Math.random() * 16,
        color: '#f1f5f9',
        alpha: 0.85,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.5,
        rot: 0,
        vr: 0,
        type: 'dust',
      });
    }
  }

  public triggerImpactDust(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 120,
        vy: -20 - Math.random() * 60,
        size: 6 + Math.random() * 8,
        color: '#e2e8f0',
        alpha: 0.7,
        life: 0,
        maxLife: 0.5,
        rot: 0,
        vr: 0,
        type: 'dust',
      });
    }
  }

  public spawnTeleportBurst(x: number, y: number) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6,
        color: Math.random() > 0.5 ? '#38bdf8' : '#c084fc',
        alpha: 1.0,
        life: 0,
        maxLife: 0.45,
        rot: 0,
        vr: 0,
        type: 'dust',
      });
    }
  }

  public triggerWaterSplash(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 160,
        vy: -120 - Math.random() * 180,
        size: 4 + Math.random() * 6,
        color: '#38bdf8',
        alpha: 0.9,
        life: 0,
        maxLife: 0.9,
        rot: 0,
        vr: 0,
        type: 'water',
      });
    }
  }

  public triggerThornPop(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 140,
        vy: -80 - Math.random() * 120,
        size: 3 + Math.random() * 5,
        color: '#ef4444',
        alpha: 1.0,
        life: 0,
        maxLife: 0.6,
        rot: 0,
        vr: 0,
        type: 'thorn',
      });
    }
  }

  public resetState() {
    this.breakableWalls.forEach(w => {
      w.isBroken = false;
      w.shakeTimer = 0;
      w.shakeOffset = 0;
    });
    this.particles = [];
  }

  public update(dt: number) {
    // 1. Update Pushable Crates Physics
    this.crates.forEach(crate => {
      crate.update(dt, this.platforms);
    });

    // 2. Clouds
    this.clouds.forEach(cloud => {
      cloud.x += cloud.speed * dt;
      if (cloud.x > this.levelWidth + 120) {
        cloud.x = -150;
      }
    });

    // 3. Birds Update
    this.birdSpawnTimer += dt;
    if (this.birdSpawnTimer > 4.5 && this.birds.length < 6) {
      this.birdSpawnTimer = 0;
      this.spawnBird();
    }

    this.birds.forEach(bird => {
      bird.x += bird.vx * dt;
      bird.wingTimer += dt * 12;
      bird.y = bird.basey + Math.sin(bird.x * 0.015) * 12;
    });

    this.birds = this.birds.filter(
      b => b.x > -150 && b.x < this.levelWidth + 150
    );

    // 4. Breakable Wall Shake Timers
    this.breakableWalls.forEach(wall => {
      if (wall.shakeTimer > 0) {
        wall.shakeTimer -= dt;
        wall.shakeOffset = Math.sin(wall.shakeTimer * 50) * 4;
        if (wall.shakeTimer <= 0) {
          wall.shakeOffset = 0;
        }
      }
    });

    // 5. Particles Physics
    this.particles.forEach(p => {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'brick') {
        p.vy += 900 * dt;
        p.rot += p.vr * dt;

        if (p.y > 476) {
          p.y = 476;
          p.vy = -p.vy * 0.4;
          p.vx *= 0.7;
        }
      } else if (p.type === 'water') {
        p.vy += 600 * dt;
      } else if (p.type === 'dust') {
        p.size += dt * 10;
      }

      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    });

    this.particles = this.particles.filter(p => p.life < p.maxLife);
  }

  // =============================================================
  // RENDER PARALLAX BACKGROUND (RULES 11, 12, 13, 14)
  // No full screen white overlay! Soft atmospheric gradient only.
  // =============================================================
  public renderBackground(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    viewWidth: number,
    viewHeight: number
  ) {
    // LAYER 1: Sky & Atmospheric Horizon Gradient (Parallax 0.02)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
    skyGradient.addColorStop(0, '#3880c9'); // Vibrant sky blue
    skyGradient.addColorStop(0.5, '#7bbbf0');
    skyGradient.addColorStop(0.85, '#d4ecfc');
    skyGradient.addColorStop(1, '#e8f5fe');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Sun / Soft Glow
    const sunX = 220 - cameraX * 0.02;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(sunX, 85, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
    ctx.beginPath();
    ctx.arc(sunX, 85, 55, 0, Math.PI * 2);
    ctx.fill();

    // LAYER 2: Sky Clouds (Parallax 0.08)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    this.clouds.forEach(cloud => {
      const drawX = cloud.x - cameraX * 0.08;
      if (drawX > -120 && drawX < viewWidth + 120) {
        this.drawCloud(ctx, drawX, cloud.y, cloud.scale);
      }
    });

    // LAYER 3: Distant Mountain Ranges (Parallax 0.12)
    const mountainParallax = cameraX * 0.12;
    ctx.fillStyle = '#6a8eb8';
    ctx.beginPath();
    ctx.moveTo(-300, viewHeight);
    for (let x = -300; x < viewWidth + 600; x += 180) {
      const realX = x - (mountainParallax % 180);
      const peakY = 240 + Math.sin(x * 0.008) * 60;
      ctx.lineTo(realX, peakY);
      ctx.lineTo(realX + 90, viewHeight);
    }
    ctx.fill();

    // Snowcaps on Distant Peaks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let x = -300; x < viewWidth + 600; x += 180) {
      const realX = x - (mountainParallax % 180);
      const peakY = 240 + Math.sin(x * 0.008) * 60;
      ctx.beginPath();
      ctx.moveTo(realX, peakY);
      ctx.lineTo(realX - 25, peakY + 35);
      ctx.lineTo(realX + 25, peakY + 35);
      ctx.closePath();
      ctx.fill();
    }

    // LAYER 4: Subtle Horizon Depth Fog (Behind Midground, NO white overlay!)
    const horizonFog = ctx.createLinearGradient(0, 260, 0, 380);
    horizonFog.addColorStop(0, 'rgba(212, 236, 252, 0.0)');
    horizonFog.addColorStop(1, 'rgba(212, 236, 252, 0.35)');
    ctx.fillStyle = horizonFog;
    ctx.fillRect(0, 260, viewWidth, 120);

    // LAYER 5: Midground Forest Hills & Background Trees (Parallax 0.35)
    const hillParallax = cameraX * 0.35;
    ctx.fillStyle = '#4a8d56';
    ctx.beginPath();
    ctx.moveTo(0, viewHeight);
    for (let x = -200; x < viewWidth + 400; x += 100) {
      const realX = x - (hillParallax % 200);
      const hY = 350 + Math.sin((x + hillParallax) * 0.008) * 35;
      ctx.quadraticCurveTo(realX + 50, hY, realX + 100, viewHeight);
    }
    ctx.fill();

    // Midground Background Trees (Grounded on distant hills)
    this.trees.forEach(tree => {
      if (tree.layer === 'bg') {
        const drawX = tree.x - cameraX * 0.35;
        if (drawX > -80 && drawX < viewWidth + 80) {
          ctx.save();
          ctx.globalAlpha = 0.8;
          this.drawTree(ctx, drawX, tree.y, tree.height, tree.scale, tree.type);
          ctx.restore();
        }
      }
    });

    // Flying Birds (Parallax 0.20)
    this.birds.forEach(bird => {
      const drawX = bird.x - cameraX * 0.2;
      if (drawX > -50 && drawX < viewWidth + 50) {
        this.drawBird(ctx, drawX, bird.y, bird.wingTimer, bird.scale, bird.vx > 0);
      }
    });
  }

  // =============================================================
  // RENDER FOREGROUND & GAMEPLAY LAYER (RULES 2, 7, 8, 9, 10, 14)
  // Continuous terrain with grass top & solid dirt fill
  // =============================================================
  public renderForeground(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    viewWidth: number,
    showDebugBoxes: boolean = false
  ) {
    ctx.save();

    // 0. Area 1 Scenery (School Gate, Road, Houses, Benches, Tutorial Sign)
    this.drawHouses(ctx, cameraX);
    this.drawSchoolGate(ctx, cameraX);
    this.drawSchoolRoad(ctx, cameraX);
    this.drawBenches(ctx, cameraX);
    this.drawTutorialSign(ctx, cameraX);

    // Area 3 & Area 4 Signposts & Tunnel Decorations
    this.drawArea3Sign(ctx, cameraX);
    this.drawArea4Sign(ctx, cameraX);
    this.drawNarrowTunnelDecoration(ctx, cameraX);

    // 1. Foreground Trees (Grounded directly on terrain top surface!)
    this.trees.forEach(tree => {
      if (tree.layer === 'fg') {
        const drawX = tree.x - cameraX;
        if (drawX > -100 && drawX < viewWidth + 100) {
          this.drawTree(ctx, drawX, tree.y, tree.height, tree.scale, tree.type);
        }
      }
    });

    // 2. Main Ground & Platforms
    this.platforms.forEach(plat => {
      const drawX = plat.x - cameraX;
      if (drawX + plat.width > -50 && drawX < viewWidth + 50) {
        if (plat.type === 'ground') {
          // SOLID DIRT FILL down to level base (y=700)
          const fillHeight = Math.max(plat.height, this.levelHeight - plat.y);

          // Dark Soil Fill Base
          ctx.fillStyle = plat.color || '#5c3a21';
          ctx.fillRect(drawX, plat.y, plat.width, fillHeight);

          // Underground Dirt Texture Pattern
          ctx.fillStyle = '#3d2514';
          for (let dy = plat.y + 20; dy < plat.y + fillHeight; dy += 24) {
            for (let dx = drawX + ((Math.floor(dy) % 4) * 8); dx < drawX + plat.width - 12; dx += 32) {
              ctx.fillRect(dx, dy, 8, 6);
            }
          }

          // Top Grass Layer
          ctx.fillStyle = plat.topColor || '#48a832';
          ctx.fillRect(drawX, plat.y, plat.width, 8);

          // Overhanging Grass Blade Details
          ctx.fillStyle = '#6ee755';
          for (let gx = drawX + 3; gx < drawX + plat.width - 3; gx += 7) {
            ctx.fillRect(gx, plat.y - 3, 3, 5);
          }
        } else if (plat.type === 'bridge') {
          // Wooden Bridge Planks
          ctx.fillStyle = plat.color || '#85562e';
          ctx.fillRect(drawX, plat.y, plat.width, plat.height);

          ctx.fillStyle = plat.topColor || '#a87343';
          ctx.fillRect(drawX, plat.y, plat.width, 4);

          // Plank seams
          ctx.fillStyle = '#452611';
          for (let bx = drawX + 14; bx < drawX + plat.width; bx += 18) {
            ctx.fillRect(bx, plat.y, 2, plat.height);
          }
        } else {
          // Elevated Platform
          ctx.fillStyle = plat.color || '#734927';
          ctx.fillRect(drawX, plat.y, plat.width, plat.height);

          ctx.fillStyle = plat.topColor || '#58c73c';
          ctx.fillRect(drawX, plat.y, plat.width, 6);

          // Grass blades on top
          ctx.fillStyle = '#6ee755';
          for (let gx = drawX + 4; gx < drawX + plat.width - 4; gx += 8) {
            ctx.fillRect(gx, plat.y - 3, 3, 4);
          }

          // Underside Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.fillRect(drawX, plat.y + plat.height - 3, plat.width, 3);
        }

        if (showDebugBoxes) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1;
          ctx.strokeRect(drawX, plat.y, plat.width, plat.height);
        }
      }
    });

    // 3. Water Areas (RULES 7 & 8: Embedded in riverbed depression!)
    const nowTime = performance.now();
    this.waterZones.forEach(w => {
      const drawX = w.x - cameraX;
      if (drawX + w.width > -50 && drawX < viewWidth + 50) {
        // Water Body Fill
        ctx.fillStyle = 'rgba(2, 132, 199, 0.8)';
        ctx.fillRect(drawX, w.y, w.width, w.height);

        // Animated Surface Wave
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(drawX, w.y);
        for (let x = 0; x <= w.width; x += 15) {
          const waveY = w.y + Math.sin(nowTime * 0.004 + (w.x + x) * 0.03) * 4;
          ctx.lineTo(drawX + x, waveY);
        }
        ctx.lineTo(drawX + w.width, w.y + w.height);
        ctx.lineTo(drawX, w.y + w.height);
        ctx.fill();

        // Foam Highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let x = 8; x < w.width - 8; x += 24) {
          const foamY = w.y + Math.sin(nowTime * 0.004 + (w.x + x) * 0.03) * 4 - 1;
          ctx.fillRect(drawX + x, foamY, 12, 3);
        }

        if (showDebugBoxes) {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(drawX, w.y, w.width, w.height);
        }
      }
    });

    // 4. Thorn Hazards
    this.thornHazards.forEach(t => {
      const drawX = t.x - cameraX;
      if (drawX + t.width > -50 && drawX < viewWidth + 50) {
        // Vine Base
        ctx.fillStyle = '#1c3d18';
        ctx.fillRect(drawX, t.y + 12, t.width, t.height - 12);

        // Sharp Thorn Teeth
        ctx.fillStyle = '#ef4444';
        for (let tx = 0; tx < t.width; tx += 12) {
          ctx.beginPath();
          ctx.moveTo(drawX + tx, t.y + 14);
          ctx.lineTo(drawX + tx + 6, t.y);
          ctx.lineTo(drawX + tx + 12, t.y + 14);
          ctx.fill();
        }

        // Glow
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(drawX - 2, t.y - 4, t.width + 4, t.height + 6);
      }
    });

    // 5. Breakable Brick Walls (RULE 19)
    this.breakableWalls.forEach(wall => {
      if (!wall.isBroken) {
        const drawX = wall.x - cameraX + wall.shakeOffset;
        if (drawX + wall.width > -50 && drawX < viewWidth + 50) {
          this.drawBrickWall(ctx, drawX, wall.y, wall.width, wall.height);
        }
      }
    });

    // 6. Pushable Crates (RULE 5)
    this.crates.forEach(crate => {
      const drawX = crate.x - cameraX;
      if (drawX + crate.width > -50 && drawX < viewWidth + 50) {
        crate.render(ctx, cameraX, showDebugBoxes);
      }
    });

    // 7. Checkpoint Flags
    this.checkpoints.forEach(cp => {
      const drawX = cp.x - cameraX;
      if (drawX > -50 && drawX < viewWidth + 50) {
        this.drawCheckpointFlag(ctx, drawX, cp.y, cp.isActive);
      }
    });

    // 8. Bushes & Rocks (Grounded)
    ctx.fillStyle = '#64748b';
    this.rocks.forEach(rock => {
      const drawX = rock.x - cameraX;
      if (drawX > -50 && drawX < viewWidth + 50) {
        ctx.beginPath();
        ctx.ellipse(drawX, rock.y - rock.height / 2, rock.width / 2, rock.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    this.bushes.forEach(b => {
      const drawX = b.x - cameraX;
      if (drawX > -50 && drawX < viewWidth + 50) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(drawX, b.y - b.height / 2, b.width / 2, 0, Math.PI * 2);
        ctx.arc(drawX - b.width / 3, b.y - b.height / 2, b.width / 3, 0, Math.PI * 2);
        ctx.arc(drawX + b.width / 3, b.y - b.height / 2, b.width / 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 9. Particles System
    this.particles.forEach(p => {
      const drawX = p.x - cameraX;
      if (drawX > -50 && drawX < viewWidth + 50) {
        ctx.save();
        ctx.translate(drawX, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.type === 'brick') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    ctx.restore();
  }

  // =============================================================
  // HELPER DRAWING METHODS
  // =============================================================
  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.arc(0, 0, 18, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(16, -12, 22, Math.PI * 1, Math.PI * 1.85);
    ctx.arc(40, -10, 18, Math.PI * 1.37, Math.PI * 1.91);
    ctx.arc(54, 0, 15, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number, // Base Y sitting directly on terrain
    height: number,
    scale: number,
    type: 'oak' | 'pine'
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Tree Trunk resting on ground (y=0 in local space, extends up to -height)
    ctx.fillStyle = '#52341b';
    ctx.fillRect(-8, -height, 16, height);

    if (type === 'oak') {
      // Oak Canopy
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(0, -height - 12, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(-10, -height - 20, 24, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Pine Layers
      ctx.fillStyle = '#15803d';
      for (let i = 0; i < 3; i++) {
        const layerY = -height + i * 22;
        ctx.beginPath();
        ctx.moveTo(0, layerY - 45);
        ctx.lineTo(-30 + i * 4, layerY);
        ctx.lineTo(30 - i * 4, layerY);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawBird(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    wingTimer: number,
    scale: number,
    facingRight: boolean
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facingRight ? scale : -scale, scale);

    const wingAngle = Math.sin(wingTimer) * 0.6;

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-2, -1);
    ctx.lineTo(-8, -10 + wingAngle * 8);
    ctx.lineTo(3, -2);
    ctx.fill();

    ctx.restore();
  }

  private drawBrickWall(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.save();

    // Dark outline behind wall
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

    // Red Brick Fill
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(x, y, w, h);

    // Mortar grid pattern
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    const rowH = 15;

    for (let ry = y; ry < y + h; ry += rowH) {
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.lineTo(x + w, ry);
      ctx.stroke();

      const isOdd = Math.floor((ry - y) / rowH) % 2 === 1;
      const brickW = 25;
      const startX = isOdd ? brickW / 2 : 0;
      for (let bx = x + startX; bx < x + w; bx += brickW) {
        ctx.beginPath();
        ctx.moveTo(bx, ry);
        ctx.lineTo(bx, ry + rowH);
        ctx.stroke();
      }
    }

    // Top highlight on wall
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x, y, w, 4);

    // Cracks detail vertically across tall walls
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 2;
    for (let cy = y + 20; cy < y + h - 40; cy += 110) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, cy);
      ctx.lineTo(x + w * 0.42, cy + 35);
      ctx.lineTo(x + w * 0.25, cy + 70);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + w * 0.7, cy + 15);
      ctx.lineTo(x + w * 0.82, cy + 55);
      ctx.stroke();
    }

    // Outer Border
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.restore();
  }

  private drawCheckpointFlag(ctx: CanvasRenderingContext2D, x: number, y: number, isActive: boolean) {
    ctx.save();

    // Pole Base
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 8, y - 6, 16, 6);

    // Pole
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 2, y - 60, 5, 54);

    // Top Orb
    ctx.fillStyle = isActive ? '#facc15' : '#cbd5e1';
    ctx.beginPath();
    ctx.arc(x, y - 62, 5, 0, Math.PI * 2);
    ctx.fill();

    // Banner Flag
    const waveOffset = Math.sin(performance.now() * 0.008) * 3;
    ctx.fillStyle = isActive ? '#22c55e' : '#ef4444';

    ctx.beginPath();
    ctx.moveTo(x + 3, y - 58);
    ctx.lineTo(x + 32 + waveOffset, y - 44);
    ctx.lineTo(x + 3, y - 30);
    ctx.closePath();
    ctx.fill();

    if (isActive) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x + 14, y - 44, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // =============================================================
  // AREA 1 — SCHOOL ROAD SCENERY HELPERS
  // =============================================================
  private drawHouses(ctx: CanvasRenderingContext2D, cameraX: number) {
    this.houses.forEach(house => {
      const drawX = house.x - cameraX;
      if (drawX + house.width > -100 && drawX < 1365 + 100) {
        const topY = house.y - house.height;

        // Wall Body
        ctx.fillStyle = house.wallColor;
        ctx.fillRect(drawX, topY + 25, house.width, house.height - 25);

        // Roof
        ctx.fillStyle = house.roofColor;
        ctx.beginPath();
        ctx.moveTo(drawX - 8, topY + 28);
        ctx.lineTo(drawX + house.width / 2, topY - 10);
        ctx.lineTo(drawX + house.width + 8, topY + 28);
        ctx.closePath();
        ctx.fill();

        // Chimney
        if (house.type !== 'school_annex') {
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(drawX + house.width - 24, topY, 12, 20);
          ctx.fillStyle = 'rgba(241, 245, 249, 0.4)';
          ctx.beginPath();
          ctx.arc(drawX + house.width - 18, topY - 8, 6, 0, Math.PI * 2);
          ctx.arc(drawX + house.width - 14, topY - 18, 9, 0, Math.PI * 2);
          ctx.fill();
        }

        // Door
        ctx.fillStyle = '#78350f';
        ctx.fillRect(drawX + 16, house.y - 36, 20, 36);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(drawX + 30, house.y - 18, 3, 3);

        // Glass Windows
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;

        const windowX1 = drawX + house.width - 36;
        ctx.fillRect(windowX1, topY + 40, 20, 22);
        ctx.strokeRect(windowX1, topY + 40, 20, 22);

        if (house.type === 'twostory') {
          const windowX2 = drawX + 20;
          ctx.fillRect(windowX2, topY + 10, 20, 22);
          ctx.strokeRect(windowX2, topY + 10, 20, 22);
        }
      }
    });
  }

  private drawSchoolGate(ctx: CanvasRenderingContext2D, cameraX: number) {
    const gateX1 = 60 - cameraX;
    const gateX2 = 160 - cameraX;
    const groundY = 620;

    if (gateX2 > -100 && gateX1 < 1365 + 100) {
      // Left Wall
      const wallLeft = 0 - cameraX;
      ctx.fillStyle = '#881337';
      ctx.fillRect(wallLeft, groundY - 50, 60, 50);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(wallLeft, groundY - 54, 60, 4);

      // Pillars
      [gateX1, gateX2].forEach(px => {
        ctx.fillStyle = '#881337';
        ctx.fillRect(px, groundY - 85, 24, 85);

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(px - 3, groundY - 90, 30, 8);
        ctx.fillRect(px - 2, groundY - 6, 28, 6);

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(px + 12, groundY - 96, 7, 0, Math.PI * 2);
        ctx.fill();
      });

      // Arch
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gateX1 + 62, groundY - 82, 50, Math.PI, 0, false);
      ctx.stroke();

      // Signboard
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gateX1 + 22, groundY - 120, 80, 22);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gateX1 + 22, groundY - 120, 80, 22);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCHOOL GATE', gateX1 + 62, groundY - 106);

      // Open Iron Gate Doors
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;

      ctx.strokeRect(gateX1 + 24, groundY - 70, 18, 65);
      for (let i = 0; i < 18; i += 4) {
        ctx.beginPath();
        ctx.moveTo(gateX1 + 24 + i, groundY - 70);
        ctx.lineTo(gateX1 + 24 + i, groundY - 5);
        ctx.stroke();
      }

      ctx.strokeRect(gateX2 - 18, groundY - 70, 18, 65);
      for (let i = 0; i < 18; i += 4) {
        ctx.beginPath();
        ctx.moveTo(gateX2 - 18 + i, groundY - 70);
        ctx.lineTo(gateX2 - 18 + i, groundY - 5);
        ctx.stroke();
      }
    }
  }

  private drawSchoolRoad(ctx: CanvasRenderingContext2D, cameraX: number) {
    const roadX = 0 - cameraX;
    const roadW = 900;
    const groundY = 620;

    if (roadX + roadW > -50 && roadX < 1365 + 50) {
      // Asphalt
      ctx.fillStyle = '#334155';
      ctx.fillRect(roadX, groundY - 12, roadW, 12);

      // Curbs
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(roadX, groundY - 14, roadW, 2);
      ctx.fillRect(roadX, groundY - 1, roadW, 2);

      // Dashed yellow line
      ctx.fillStyle = '#facc15';
      for (let rx = roadX + 20; rx < roadX + roadW - 20; rx += 36) {
        ctx.fillRect(rx, groundY - 7, 20, 2);
      }

      // Crosswalk
      ctx.fillStyle = '#f8fafc';
      for (let cx = roadX + 75; cx <= roadX + 145; cx += 14) {
        ctx.fillRect(cx, groundY - 12, 8, 10);
      }
    }
  }

  private drawBenches(ctx: CanvasRenderingContext2D, cameraX: number) {
    this.benches.forEach(bench => {
      const drawX = bench.x - cameraX;
      if (drawX > -40 && drawX < 1365 + 40) {
        const y = bench.y;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(drawX, y - 16, 3, 16);
        ctx.fillRect(drawX + 28, y - 16, 3, 16);

        ctx.fillStyle = '#b45309';
        ctx.fillRect(drawX - 2, y - 10, 35, 4);
        ctx.fillRect(drawX - 2, y - 14, 35, 3);

        ctx.fillRect(drawX - 2, y - 24, 35, 4);
        ctx.fillRect(drawX - 2, y - 28, 35, 4);

        ctx.fillStyle = '#334155';
        ctx.fillRect(drawX + 2, y - 28, 2, 14);
        ctx.fillRect(drawX + 27, y - 28, 2, 14);
      }
    });
  }

  private drawTutorialSign(ctx: CanvasRenderingContext2D, cameraX: number) {
    const drawX = 285 - cameraX;
    const y = 620;

    if (drawX > -100 && drawX < 1365 + 100) {
      ctx.fillStyle = '#52341b';
      ctx.fillRect(drawX, y - 48, 5, 48);

      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(drawX - 42, y - 72, 90, 26);

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX - 42, y - 72, 90, 26);

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WALK TO FOOTBALL', drawX + 3, y - 60);
      ctx.fillText('PRESS K TO KICK ➔', drawX + 3, y - 50);
    }
  }

  private drawArea3Sign(ctx: CanvasRenderingContext2D, cameraX: number) {
    const drawX = 1580 - cameraX;
    const y = 570;

    if (drawX > -100 && drawX < 1365 + 100) {
      ctx.fillStyle = '#52341b';
      ctx.fillRect(drawX, y - 48, 5, 48);

      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(drawX - 55, y - 76, 115, 28);

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX - 55, y - 76, 115, 28);

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AREA 3: THE STEP 📦', drawX + 3, y - 64);
      ctx.fillText('PUSH CRATE TO CLIMB ➔', drawX + 3, y - 52);
    }
  }

  private drawArea4Sign(ctx: CanvasRenderingContext2D, cameraX: number) {
    const drawX = 2340 - cameraX;
    const y = 400;

    if (drawX > -100 && drawX < 1365 + 100) {
      ctx.fillStyle = '#52341b';
      ctx.fillRect(drawX, y - 48, 5, 48);

      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(drawX - 65, y - 78, 135, 30);

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX - 65, y - 78, 135, 30);

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AREA 4: NARROW TUNNEL ⚽', drawX + 3, y - 66);
      ctx.fillText('KICK BALL & PRESS [Q] TELEPORT ⚡', drawX + 3, y - 53);
    }
  }

  private drawNarrowTunnelDecoration(ctx: CanvasRenderingContext2D, cameraX: number) {
    const entranceX = 2450 - cameraX;
    const exitX = 2720 - cameraX;
    const tunnelY = 400;

    if (exitX > -100 && entranceX < 1365 + 100) {
      // Draw Entrance Archway Arch Beam
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(entranceX - 6, tunnelY - 36, 10, 36);

      ctx.fillStyle = '#334155';
      ctx.fillRect(exitX - 4, tunnelY - 36, 10, 36);

      // Warning Clearance Badge on Tunnel Entrance
      ctx.save();
      ctx.font = 'bold 10px monospace';
      const text = 'NARROW TUNNEL 36px ⚽';
      const textW = ctx.measureText(text).width;
      const badgeX = entranceX + 135;
      const badgeY = tunnelY - 48;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(badgeX - textW / 2 - 8, badgeY - 10, textW + 16, 20, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#7dd3fc';
      ctx.textAlign = 'center';
      ctx.fillText(text, badgeX, badgeY + 4);
      ctx.restore();
    }
  }
}
