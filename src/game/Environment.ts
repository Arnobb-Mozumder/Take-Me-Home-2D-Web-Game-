import { Platform, Rect, BreakableWall, WaterZone, ThornHazard, Checkpoint, SandArea, CavePortal } from './types';
import { Crate } from './Crate';
import { DogEnemy } from './DogEnemy';
import { HealthPotion } from './HealthPotion';
import { Level2Jungle, JunglePalm, JungleVine, JungleRuin, JungleFirefly } from './Level2Jungle';

export class Environment {
  public currentLevel = 1;
  public chapterTitle = 'Chapter 1: The Suburbia Run';
  public levelWidth = 8400;
  public levelHeight = 768;
  public deathBoundaryY = 740;

  public platforms: Platform[] = [];
  public crates: Crate[] = [];
  public breakableWalls: BreakableWall[] = [];
  public waterZones: WaterZone[] = [];
  public thornHazards: ThornHazard[] = [];
  public sandAreas: SandArea[] = [];
  public checkpoints: Checkpoint[] = [];
  public cavePortals: CavePortal[] = [];
  public dogs: DogEnemy[] = [];
  public healthPotions: HealthPotion[] = [];

  // Level 2 Jungle Specific Scenery
  public junglePalms: JunglePalm[] = [];
  public jungleVines: JungleVine[] = [];
  public jungleRuins: JungleRuin[] = [];
  public jungleFireflies: JungleFirefly[] = [];

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
  private bgLevel1Image: HTMLImageElement | null = null;

  constructor() {
    if (typeof Image !== 'undefined') {
      this.bgLevel1Image = new Image();
      this.bgLevel1Image.src = '/background_level1.png';
    }
    this.loadLevel(1);
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

  public loadLevel(levelNumber: number) {
    this.currentLevel = levelNumber;
    if (levelNumber === 1) {
      this.initLevel1();
    } else if (levelNumber === 2) {
      Level2Jungle.initLevel(this);
    }
    this.validateLevelReachability();
  }

  public resetLevel() {
    this.loadLevel(this.currentLevel);
  }

  private initLevel1() {
    this.currentLevel = 1;
    this.chapterTitle = 'Chapter 1: The Suburbia Run';
    this.levelWidth = 8400;
    this.levelHeight = 768;
    this.deathBoundaryY = 740;

    this.platforms = [];
    this.crates = [];
    this.breakableWalls = [];
    this.waterZones = [];
    this.thornHazards = [];
    this.sandAreas = [];
    this.checkpoints = [];
    this.cavePortals = [];
    this.dogs = [];
    this.healthPotions = [];

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
      width: 70,
      height: 368,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // Narrow Tunnel Roof Block (Low ceiling: Gap height = 36px between Y=364 and Y=400)
    // Mountain rock roof barrier sitting between Y=180 and Y=364 (width: 70px)
    this.platforms.push({
      id: 'tunnel-4-roof',
      x: 2450,
      y: 180,
      width: 70,
      height: 184, // Y=180 to Y=364
      type: 'platform',
      color: '#475569',
      topColor: '#48a832',
    });

    // Open Ground beyond tunnel
    this.platforms.push({
      id: 'ground-4-exit',
      x: 2520,
      y: 400,
      width: 580,
      height: 368,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // =========================================================
    // ZONE 5 — CANAL (3100 to 3460)
    // Width: 360 px (clear trajectory over water)
    // Physically connected to surrounding terrain. No bridges!
    // Player must aim Forward-Up, kick football over canal,
    // wait for it to land safely, and press T/Q to teleport.
    // =========================================================
    // Canal Bed Platform below water
    this.platforms.push({
      id: 'ground-5-canal-bed',
      x: 3100,
      y: 580,
      width: 360,
      height: 140,
      type: 'ground',
      color: '#2b1b17',
      topColor: '#334155',
    });

    // Deep Canal Water Zone (Hazard zone strictly inside deep water channel)
    this.waterZones.push({
      id: 'water-canal',
      label: 'Canal (360px)',
      x: 3125,
      y: 495,
      width: 310,
      height: 85,
    });

    // Right Canal Bank Ground (Extended 890px Wide Safe Landing Zone from X=3460 to 4350)
    this.platforms.push({
      id: 'ground-5-canalbank-right',
      x: 3460,
      y: 400,
      width: 890,
      height: 368,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#eab308', // Golden sand dune surface
    });

    // Zone 5 Sticky Sand Landing Pad: Upper surface sand layer with smooth rolling & player drag
    this.sandAreas.push({
      id: 'sand-zone-5-landing',
      x: 3460,
      y: 396,
      width: 890,
      height: 25,
      frictionMultiplier: 12.0,
    });

    // =========================================================
    // ZONE 6 — THORN VALLEY (4350 to 4630)
    // Dangerous lower route lined with thick thorn hazards.
    // Football must be sent over the thorn field (280px gap).
    // Football touching thorns -> BALL LOST
    // Player touching thorns -> PLAYER DAMAGE (1 HP with i-frames)
    // =========================================================
    // Sunken Valley Floor Platform
    this.platforms.push({
      id: 'ground-6-thornvalley-floor',
      x: 4350,
      y: 540,
      width: 280,
      height: 180,
      type: 'ground',
      color: '#24140a',
      topColor: '#1a2e16',
    });

    // Dangerous Thorn Hazards spanning the sunken valley floor
    this.thornHazards.push({
      id: 'thorn-hazard-valley-1',
      x: 4350,
      y: 504,
      width: 280,
      height: 36,
      type: 'ground',
    });

    // =========================================================
    // ZONE 7 — CLIFF TELEPORT (4630 to 5800)
    // Opposite cliff bank reachable across 280px thorn valley.
    // Then 330px wide bottomless chasm (4950 to 5280).
    // Principle: "THE FOOTBALL GOES FIRST!"
    // Player kicks ball across gap -> lands in sticky sand -> teleports!
    // =========================================================
    // West Cliff Platform (Opposite ground immediately after sand field & thorns)
    this.platforms.push({
      id: 'ground-7-cliff-west',
      x: 4630,
      y: 400,
      width: 320,
      height: 368,
      type: 'ground',
      color: '#442817',
      topColor: '#48a832',
    });

    // East Cliff Platform across 330px abyss (4950 to 5280 is bottomless void!)
    this.platforms.push({
      id: 'ground-7-cliff-east',
      x: 5280,
      y: 400,
      width: 520,
      height: 368,
      type: 'ground',
      color: '#442817',
      topColor: '#eab308', // Sandy landing pad
    });

    // Safe Sticky Sand Landing Area on opposite side of cliff
    this.sandAreas.push({
      id: 'sand-zone-7-landing',
      x: 5280,
      y: 396,
      width: 400,
      height: 25,
      frictionMultiplier: 12.0,
    });

    this.checkpoints.push({
      id: 'cp-2',
      name: 'Cliff Overlook',
      x: 5400,
      y: 400,
      width: 32,
      height: 60,
      playerSpawnX: 5380,
      playerSpawnY: 320,
      ballSpawnX: 5440,
      ballSpawnY: 370,
      isActive: false,
    });

    // =========================================================
    // ZONE 8 — HIGH LEDGE (5800 to 6850)
    // Platform is 330px above player ground (Floor Y=460, High Ledge Y=130).
    // Sloped ramp guides the football upward into the high platform.
    // Player kicks football upward -> lands on high ledge -> teleports!
    // =========================================================
    // Lower Base Floor
    this.platforms.push({
      id: 'ground-8-lower-floor',
      x: 5800,
      y: 460,
      width: 1050,
      height: 308,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // Sloped Kicker Ramp guiding ball vertically toward High Ledge
    this.platforms.push({
      id: 'ramp-8-sloped-guide',
      x: 6020,
      y: 360,
      width: 100,
      height: 100,
      type: 'ramp',
      color: '#475569',
      topColor: '#94a3b8',
    });

    this.platforms.push({
      id: 'ramp-8-upper-guide',
      x: 6090,
      y: 240,
      width: 60,
      height: 120,
      type: 'ramp',
      color: '#475569',
      topColor: '#94a3b8',
    });

    // High Ledge Platform (Elevated 330px above ground floor!)
    this.platforms.push({
      id: 'ground-8-high-ledge',
      x: 6140,
      y: 130,
      width: 600,
      height: 30,
      type: 'platform',
      color: '#334155',
      topColor: '#38bdf8',
    });

    // Safe sticky sand landing strip on High Ledge
    this.sandAreas.push({
      id: 'sand-zone-8-landing',
      x: 6140,
      y: 126,
      width: 600,
      height: 25,
      frictionMultiplier: 12.0,
    });

    this.checkpoints.push({
      id: 'cp-3',
      name: 'Sky Ledge',
      x: 6280,
      y: 130,
      width: 32,
      height: 60,
      playerSpawnX: 6260,
      playerSpawnY: 50,
      ballSpawnX: 6320,
      ballSpawnY: 100,
      isActive: false,
    });

    // =========================================================
    // ZONE 9 — FORTRESS GOAL & VICTORY STADIUM (6850 to 8400)
    // Goal area beyond fortress brick wall + Mountain Tunnel Entrance
    // =========================================================
    this.platforms.push({
      id: 'ground-9-goal',
      x: 6850,
      y: 420,
      width: 1550,
      height: 348,
      type: 'ground',
      color: '#5c3a21',
      topColor: '#48a832',
    });

    // Level 1 Mountain Tunnel Portal to Level 2
    this.cavePortals.push({
      id: 'tunnel-to-level-2',
      x: 7960,
      y: 280,
      width: 280,
      height: 140,
      targetLevel: 2,
      title: 'CHAPTER 2: THE JUNGLE RUSH',
      subtitle: 'Entering the Wild Canopy...',
      signText: 'MOUNTAIN TUNNEL ➔ CHAPTER 2',
    });

    this.breakableWalls.push({
      id: 'wall-2',
      x: 6900,
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
      3700, 3920, 4120, 4240, 4700, 5320, 5880, 6350, 7000, 7400,
    ];

    treeXPos.forEach((x, idx) => {
      const terrainY = this.getTerrainHeightAt(x);
      this.trees.push({
        x,
        y: terrainY, // Exact terrain top surface match!
        height: 60 + Math.random() * 30,
        scale: 0.8 + Math.random() * 0.4,
        type: idx % 2 === 0 ? 'oak' : 'pine',
        layer: 'fg', // ALL trees strictly grounded on terrain - zero floating trees
      });
    });

    // Bushes grounded on terrain
    const bushXPos = [140, 310, 520, 1020, 1500, 2580, 3220, 3800, 4180, 4750, 5450, 5920, 7050];
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
    const rockXPos = [180, 480, 780, 1100, 1660, 2640, 3260, 3880, 4150, 4800, 5500, 6000, 7150];
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

  public triggerHealBurst(x: number, y: number) {
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 80 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 4 + Math.random() * 5,
        color: Math.random() > 0.4 ? '#22c55e' : Math.random() > 0.5 ? '#4ade80' : '#86efac',
        alpha: 1.0,
        life: 0,
        maxLife: 0.85,
        rot: 0,
        vr: (Math.random() - 0.5) * 6,
        type: 'dust',
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

    // 6. Level 2 Fireflies Update
    if (this.currentLevel === 2) {
      this.jungleFireflies.forEach(f => {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.timer += dt * 3;
        if (f.x < 0) f.x = this.levelWidth;
        if (f.x > this.levelWidth) f.x = 0;
        if (f.y < 100) f.y = 550;
        if (f.y > 600) f.y = 120;
      });
    }
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
    if (this.currentLevel === 2) {
      Level2Jungle.renderBackground(ctx, cameraX, viewWidth, viewHeight);
      return;
    }

    // LEVEL 1: Use background_level1.png image with smooth parallax wrapping
    if (this.bgLevel1Image && this.bgLevel1Image.complete && this.bgLevel1Image.naturalWidth > 0) {
      const img = this.bgLevel1Image;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const drawHeight = viewHeight;
      const drawWidth = drawHeight * imgAspect;
      // Parallax scroll factor
      const parallax = (cameraX * 0.18) % drawWidth;
      const startX = -parallax - (parallax > 0 ? 0 : drawWidth);

      for (let x = startX; x < viewWidth + drawWidth; x += drawWidth) {
        ctx.drawImage(img, x, 0, drawWidth, drawHeight);
      }

      // Gentle animated clouds overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.clouds.forEach(cloud => {
        const drawX = cloud.x - cameraX * 0.08;
        if (drawX > -120 && drawX < viewWidth + 120) {
          this.drawCloud(ctx, drawX, cloud.y, cloud.scale);
        }
      });

      // Flying Birds overlay
      this.birds.forEach(bird => {
        const drawX = bird.x - cameraX * 0.2;
        if (drawX > -50 && drawX < viewWidth + 50) {
          this.drawBird(ctx, drawX, bird.y, bird.wingTimer, bird.scale, bird.vx > 0);
        }
      });
      return;
    }

    // LAYER 1 Fallback: Sky & Atmospheric Horizon Gradient (Parallax 0.02)
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

    // LAYER 5: Midground Forest Hills (Parallax 0.35)
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
    cameraY: number = 0,
    viewWidth: number = 1365,
    showDebugBoxes: boolean = false
  ) {
    ctx.save();

    if (this.currentLevel === 2) {
      // Render Jungle Scenery for Level 2
      Level2Jungle.renderForeground(
        ctx,
        cameraX,
        cameraY,
        viewWidth,
        this.junglePalms,
        this.jungleVines,
        this.jungleRuins,
        this.jungleFireflies
      );
    } else {
      // 0. Level 1 Area 1 Scenery (School Gate, Road, Houses, Benches, Tutorial Sign)
      this.drawHouses(ctx, cameraX, cameraY);
      this.drawSchoolGate(ctx, cameraX, cameraY);
      this.drawSchoolRoad(ctx, cameraX, cameraY);
      this.drawBenches(ctx, cameraX, cameraY);
      this.drawTutorialSign(ctx, cameraX, cameraY);

      // Area 3 & Area 4 Signposts & Tunnel Decorations
      this.drawArea3Sign(ctx, cameraX, cameraY);
      this.drawArea4Sign(ctx, cameraX, cameraY);
      this.drawNarrowTunnelDecoration(ctx, cameraX, cameraY);

      // Zone 5 (Canal) & Zone 6 (Thorn Valley) Signposts & Decorations
      this.drawArea5CanalSign(ctx, cameraX, cameraY);
      this.drawCanalDecorations(ctx, cameraX, cameraY);
      this.drawArea6ThornValleySign(ctx, cameraX, cameraY);
      this.drawThornValleyDecorations(ctx, cameraX, cameraY);

      // Zone 7 (Cliff Teleport), Zone 8 (High Ledge), and Goal Area
      this.drawArea7CliffTeleport(ctx, cameraX, cameraY);
      this.drawArea8HighLedge(ctx, cameraX, cameraY);
      this.drawGoalArea(ctx, cameraX, cameraY);

      // Level 1 Mountain Tunnel Entrance (Grand Archway leading to Chapter 2)
      this.drawMountainTunnelEntrance(ctx, cameraX, cameraY);
    }

    // Sticky Sand Areas (Dunes, sparkle particles, ripples)
    this.drawSandAreas(ctx, cameraX, cameraY);

    // 1. Foreground Trees (Level 1 Suburbia only - strictly zero trees in Level 2 Jungle!)
    if (this.currentLevel === 1) {
      this.trees.forEach(tree => {
        if (tree.layer === 'fg') {
          const drawX = tree.x - cameraX;
          const drawY = tree.y - cameraY;
          if (drawX > -100 && drawX < viewWidth + 100) {
            this.drawTree(ctx, drawX, drawY, tree.height, tree.scale, tree.type);
          }
        }
      });
    }

    // 2. Main Ground & Platforms
    this.platforms.forEach(plat => {
      const drawX = plat.x - cameraX;
      const drawY = plat.y - cameraY;
      if (drawX + plat.width > -50 && drawX < viewWidth + 50) {
        if (plat.type === 'ground') {
          // SOLID DIRT FILL down to level base (y=700 + extra buffer)
          const fillHeight = Math.max(plat.height, this.levelHeight - plat.y + 400);

          // Dark Soil Fill Base
          ctx.fillStyle = plat.color || '#5c3a21';
          ctx.fillRect(drawX, drawY, plat.width, fillHeight);

          // Underground Dirt Texture Pattern
          ctx.fillStyle = '#3d2514';
          for (let dy = drawY + 20; dy < drawY + fillHeight; dy += 24) {
            for (let dx = drawX + ((Math.floor(dy) % 4) * 8); dx < drawX + plat.width - 12; dx += 32) {
              ctx.fillRect(dx, dy, 8, 6);
            }
          }

          // Top Grass / Surface Layer
          ctx.fillStyle = plat.topColor || '#48a832';
          ctx.fillRect(drawX, drawY, plat.width, 8);

          // Overhanging Grass Blade Details (Only for green grass platforms)
          if (plat.topColor !== '#eab308' && plat.topColor !== '#fde047') {
            ctx.fillStyle = '#6ee755';
            for (let gx = drawX + 3; gx < drawX + plat.width - 3; gx += 7) {
              ctx.fillRect(gx, drawY - 3, 3, 5);
            }
          }
        } else if (plat.type === 'bridge') {
          // Wooden Bridge Planks
          ctx.fillStyle = plat.color || '#85562e';
          ctx.fillRect(drawX, drawY, plat.width, plat.height);

          ctx.fillStyle = plat.topColor || '#a87343';
          ctx.fillRect(drawX, drawY, plat.width, 4);

          // Plank seams
          ctx.fillStyle = '#452611';
          for (let bx = drawX + 14; bx < drawX + plat.width; bx += 18) {
            ctx.fillRect(bx, drawY, 2, plat.height);
          }
        } else {
          // Elevated Platform
          ctx.fillStyle = plat.color || '#734927';
          ctx.fillRect(drawX, drawY, plat.width, plat.height);

          ctx.fillStyle = plat.topColor || '#58c73c';
          ctx.fillRect(drawX, drawY, plat.width, 6);

          // Grass blades on top
          ctx.fillStyle = '#6ee755';
          for (let gx = drawX + 4; gx < drawX + plat.width - 4; gx += 8) {
            ctx.fillRect(gx, drawY - 3, 3, 4);
          }

          // Underside Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.fillRect(drawX, drawY + plat.height - 3, plat.width, 3);
        }

        if (showDebugBoxes) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1;
          ctx.strokeRect(drawX, drawY, plat.width, plat.height);
        }
      }
    });

    // 3. Water Areas (RULES 7 & 8: Embedded in riverbed depression!)
    const nowTime = performance.now();
    this.waterZones.forEach(w => {
      const drawX = w.x - cameraX;
      const drawY = w.y - cameraY;
      if (drawX + w.width > -50 && drawX < viewWidth + 50) {
        // Water Body Fill
        ctx.fillStyle = 'rgba(2, 132, 199, 0.8)';
        ctx.fillRect(drawX, drawY, w.width, w.height);

        // Animated Surface Wave
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(drawX, drawY);
        for (let x = 0; x <= w.width; x += 15) {
          const waveY = drawY + Math.sin(nowTime * 0.004 + (w.x + x) * 0.03) * 4;
          ctx.lineTo(drawX + x, waveY);
        }
        ctx.lineTo(drawX + w.width, drawY + w.height);
        ctx.lineTo(drawX, drawY + w.height);
        ctx.fill();

        // Foam Highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let x = 8; x < w.width - 8; x += 24) {
          const foamY = drawY + Math.sin(nowTime * 0.004 + (w.x + x) * 0.03) * 4 - 1;
          ctx.fillRect(drawX + x, foamY, 12, 3);
        }

        if (showDebugBoxes) {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(drawX, drawY, w.width, w.height);
        }
      }
    });

    // 4. Thorn Hazards
    this.thornHazards.forEach(t => {
      const drawX = t.x - cameraX;
      const drawY = t.y - cameraY;
      if (drawX + t.width > -50 && drawX < viewWidth + 50) {
        // Vine Base
        ctx.fillStyle = '#1c3d18';
        ctx.fillRect(drawX, drawY + 12, t.width, t.height - 12);

        // Sharp Thorn Teeth
        ctx.fillStyle = '#ef4444';
        for (let tx = 0; tx < t.width; tx += 12) {
          ctx.beginPath();
          ctx.moveTo(drawX + tx, drawY + 14);
          ctx.lineTo(drawX + tx + 6, drawY);
          ctx.lineTo(drawX + tx + 12, drawY + 14);
          ctx.fill();
        }

        // Glow
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(drawX - 2, drawY - 4, t.width + 4, t.height + 6);
      }
    });

    // 5. Breakable Brick Walls (RULE 19)
    this.breakableWalls.forEach(wall => {
      if (!wall.isBroken) {
        const drawX = wall.x - cameraX + wall.shakeOffset;
        const drawY = wall.y - cameraY;
        if (drawX + wall.width > -50 && drawX < viewWidth + 50) {
          this.drawBrickWall(ctx, drawX, drawY, wall.width, wall.height);
        }
      }
    });

    // 6. Pushable Crates (RULE 5)
    this.crates.forEach(crate => {
      const drawX = crate.x - cameraX;
      if (drawX + crate.width > -50 && drawX < viewWidth + 50) {
        crate.render(ctx, cameraX, cameraY, showDebugBoxes);
      }
    });

    // 7. Checkpoint Flags
    this.checkpoints.forEach(cp => {
      const drawX = cp.x - cameraX;
      const drawY = cp.y - cameraY;
      if (drawX > -50 && drawX < viewWidth + 50) {
        this.drawCheckpointFlag(ctx, drawX, drawY, cp.isActive);
      }
    });

    // 7.5. Health Refill Potions (Pickups)
    this.healthPotions.forEach(potion => {
      const drawX = potion.x - cameraX;
      if (drawX + potion.width > -50 && drawX < viewWidth + 50) {
        potion.render(ctx, cameraX, cameraY, showDebugBoxes);
      }
    });

    // 8. Bushes & Rocks (Level 1 Suburbia only)
    if (this.currentLevel === 1) {
      ctx.fillStyle = '#64748b';
      this.rocks.forEach(rock => {
        const drawX = rock.x - cameraX;
        const drawY = rock.y - cameraY;
        if (drawX > -50 && drawX < viewWidth + 50) {
          ctx.beginPath();
          ctx.ellipse(drawX, drawY - rock.height / 2, rock.width / 2, rock.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      this.bushes.forEach(b => {
        const drawX = b.x - cameraX;
        const drawY = b.y - cameraY;
        if (drawX > -50 && drawX < viewWidth + 50) {
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(drawX, drawY - b.height / 2, b.width / 2, 0, Math.PI * 2);
          ctx.arc(drawX - b.width / 3, drawY - b.height / 2, b.width / 3, 0, Math.PI * 2);
          ctx.arc(drawX + b.width / 3, drawY - b.height / 2, b.width / 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 9. Particles System
    this.particles.forEach(p => {
      const drawX = p.x - cameraX;
      const drawY = p.y - cameraY;
      if (drawX > -50 && drawX < viewWidth + 50) {
        ctx.save();
        ctx.translate(drawX, drawY);
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
  private drawHouses(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    this.houses.forEach(house => {
      const drawX = house.x - cameraX;
      const drawY = house.y - cameraY;
      if (drawX + house.width > -100 && drawX < 1365 + 100) {
        const topY = drawY - house.height;

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
        ctx.fillRect(drawX + 16, drawY - 36, 20, 36);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(drawX + 30, drawY - 18, 3, 3);

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

  private drawSchoolGate(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const gateX1 = 60 - cameraX;
    const gateX2 = 160 - cameraX;
    const groundY = 620 - cameraY;

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

  private drawSchoolRoad(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const roadX = 0 - cameraX;
    const roadW = 900;
    const groundY = 620 - cameraY;

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

  private drawBenches(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    this.benches.forEach(bench => {
      const drawX = bench.x - cameraX;
      const y = bench.y - cameraY;
      if (drawX > -40 && drawX < 1365 + 40) {
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

  private drawTutorialSign(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawX = 285 - cameraX;
    const y = 620 - cameraY;

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

  private drawArea3Sign(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawX = 1580 - cameraX;
    const y = 570 - cameraY;

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

  private drawArea4Sign(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawX = 2340 - cameraX;
    const y = 400 - cameraY;

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

  private drawNarrowTunnelDecoration(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const entranceX = 2450 - cameraX;
    const exitX = 2520 - cameraX;
    const tunnelY = 400 - cameraY;
    const tunnelHeight = 36;
    const roofY = tunnelY - tunnelHeight;

    if (exitX > -100 && entranceX < 1365 + 100) {
      // 1. Dark stone interior corridor (Y=364 to Y=400)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(entranceX, roofY, exitX - entranceX, tunnelHeight);

      // Tunnel brick mortar background details
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let y = roofY + 12; y < tunnelY; y += 12) {
        ctx.beginPath();
        ctx.moveTo(entranceX, y);
        ctx.lineTo(exitX, y);
        ctx.stroke();
      }

      // 2. Ceiling support beam at Y=364
      ctx.fillStyle = '#334155';
      ctx.fillRect(entranceX, roofY, exitX - entranceX, 4);

      // 3. Entrance & Exit Stone Archway Pillars
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(entranceX - 8, roofY - 8, 12, tunnelHeight + 8);
      ctx.fillRect(exitX - 4, roofY - 8, 12, tunnelHeight + 8);

      // Entrance Keystone
      ctx.fillStyle = '#475569';
      ctx.fillRect(entranceX - 10, roofY - 12, 16, 8);
      ctx.fillRect(exitX - 6, roofY - 12, 16, 8);

      // 4. Warning Clearance Badge on Tunnel Entrance
      ctx.save();
      ctx.font = 'bold 10px monospace';
      const text = 'NARROW TUNNEL ⚽';
      const textW = ctx.measureText(text).width;
      const badgeX = entranceX + 35;
      const badgeY = roofY - 20;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
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

  // =============================================================
  // ZONE 5 — CANAL SCENERY & SIGNPOST
  // =============================================================
  private drawArea5CanalSign(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawX = 3030 - cameraX;
    const y = 400 - cameraY;

    if (drawX > -100 && drawX < 1365 + 100) {
      // Signpost Post
      ctx.fillStyle = '#52341b';
      ctx.fillRect(drawX, y - 48, 5, 48);

      // Wooden Sign Board
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(drawX - 70, y - 82, 145, 34);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX - 70, y - 82, 145, 34);

      // Sign Text
      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ZONE 5: CANAL (360px) 🌊', drawX + 3, y - 69);
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('AIM FORWARD-UP [W+D] & KICK ⚽', drawX + 3, y - 58);
      ctx.fillText('LAND SAFELY ➔ TELEPORT [T/Q] ⚡', drawX + 3, y - 48);
    }
  }

  private drawCanalDecorations(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const leftBankX = 3100 - cameraX;
    const rightBankX = 3460 - cameraX;
    const topY = 400 - cameraY;
    const bedY = 580 - cameraY;
    const waterY = 470 - cameraY;
    const canalWidth = 360;

    if (rightBankX > -100 && leftBankX < 1365 + 100) {
      ctx.save();

      // 1. Left Bank Stone Embankment Wall (X=3100, Y=400 to 580)
      ctx.fillStyle = '#334155';
      ctx.fillRect(leftBankX - 14, topY, 14, bedY - topY);

      // Left Wall Stone Courses & Mortar
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.2;
      for (let sy = topY + 12; sy < bedY; sy += 16) {
        ctx.beginPath();
        ctx.moveTo(leftBankX - 14, sy);
        ctx.lineTo(leftBankX, sy);
        ctx.stroke();
      }

      // 2. Right Bank Stone Embankment Wall (X=3460, Y=400 to 580)
      ctx.fillStyle = '#334155';
      ctx.fillRect(rightBankX, topY, 14, bedY - topY);

      for (let sy = topY + 12; sy < bedY; sy += 16) {
        ctx.beginPath();
        ctx.moveTo(rightBankX, sy);
        ctx.lineTo(rightBankX + 14, sy);
        ctx.stroke();
      }

      // 3. Waterline Moss on Embankments (at Y=470)
      ctx.fillStyle = '#15803d';
      ctx.fillRect(leftBankX - 14, waterY - 4, 14, 10);
      ctx.fillRect(rightBankX, waterY - 4, 14, 10);

      // 4. Mooring Bollards on both canal banks
      [leftBankX - 10, rightBankX + 10].forEach(bx => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bx - 3, topY - 12, 6, 12);
        ctx.beginPath();
        ctx.arc(bx, topY - 12, 5, 0, Math.PI * 2);
        ctx.fill();

        // Iron Ring
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, topY - 5, 4, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 5. Depth water gradient shadow along canal bottom
      const waterGrad = ctx.createLinearGradient(0, waterY, 0, bedY);
      waterGrad.addColorStop(0, 'rgba(2, 132, 199, 0.25)');
      waterGrad.addColorStop(1, 'rgba(3, 105, 161, 0.7)');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(leftBankX, waterY, canalWidth, bedY - waterY);

      // 6. Canal Depth Marker / Distance Flag on Left Bank
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('◀ 360px CANAL GAP ▶', leftBankX + canalWidth / 2 - 50, topY + 30);

      ctx.restore();
    }
  }

  // =============================================================
  // ZONE 6 — THORN VALLEY SCENERY & SIGNPOST
  // =============================================================
  private drawArea6ThornValleySign(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawX = 4250 - cameraX;
    const y = 400 - cameraY;

    if (drawX > -100 && drawX < 1365 + 100) {
      // Post
      ctx.fillStyle = '#52341b';
      ctx.fillRect(drawX, y - 48, 5, 48);

      // Danger Sign Board
      ctx.fillStyle = '#fef2f2';
      ctx.fillRect(drawX - 75, y - 84, 155, 36);

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX - 75, y - 84, 155, 36);

      // Sign Text
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ZONE 6: THORN VALLEY 🌵', drawX + 3, y - 70);
      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('DANGEROUS THORNS BELOW! ⚠️', drawX + 3, y - 59);
      ctx.fillText('LOB FOOTBALL OVER VALLEY ➔ [T/Q] ⚡', drawX + 3, y - 49);
    }
  }

  private drawThornValleyDecorations(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const leftCliffX = 4350 - cameraX;
    const rightCliffX = 4630 - cameraX;
    const topY = 400 - cameraY;
    const valleyFloorY = 540 - cameraY;
    const valleyWidth = 280;

    if (rightCliffX > -100 && leftCliffX < 1365 + 100) {
      ctx.save();

      // 1. Cliff drop-off rock textures
      // Left cliff face
      ctx.fillStyle = '#3d2514';
      ctx.fillRect(leftCliffX - 16, topY, 16, valleyFloorY - topY);

      // Right cliff face
      ctx.fillStyle = '#3d2514';
      ctx.fillRect(rightCliffX, 400 - cameraY, 16, valleyFloorY - (400 - cameraY));

      // 2. Creeping thorn roots on cliff faces
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(leftCliffX - 4, topY + 10);
      ctx.lineTo(leftCliffX + 8, topY + 40);
      ctx.lineTo(leftCliffX + 2, topY + 90);
      ctx.lineTo(leftCliffX + 12, valleyFloorY - 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightCliffX + 12, 400 - cameraY + 10);
      ctx.lineTo(rightCliffX - 2, 400 - cameraY + 45);
      ctx.lineTo(rightCliffX + 6, valleyFloorY - 10);
      ctx.stroke();

      // 3. Dense Thorn Brambles in Valley Floor (Y=504 to 540)
      const thornBaseY = 504 - cameraY;
      for (let tx = leftCliffX + 8; tx < leftCliffX + valleyWidth - 8; tx += 20) {
        // Bramble Arch
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(tx + 10, thornBaseY + 22, 12, Math.PI, 0, false);
        ctx.stroke();

        // Sharp crimson thorn spikes
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(tx + 6, thornBaseY + 12);
        ctx.lineTo(tx + 10, thornBaseY - 4);
        ctx.lineTo(tx + 14, thornBaseY + 12);
        ctx.fill();

        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.moveTo(tx, thornBaseY + 20);
        ctx.lineTo(tx + 4, thornBaseY + 5);
        ctx.lineTo(tx + 8, thornBaseY + 20);
        ctx.fill();

        // Purple poison droplets on thorn tips
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(tx + 10, thornBaseY - 4, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Warning Danger Fog Gradient over valley floor
      const fogGrad = ctx.createLinearGradient(0, thornBaseY - 30, 0, valleyFloorY);
      fogGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      fogGrad.addColorStop(1, 'rgba(239, 68, 68, 0.12)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(leftCliffX, thornBaseY - 30, valleyWidth, valleyFloorY - (thornBaseY - 30));

      ctx.restore();
    }
  }

  // =============================================================
  // STICKY SAND AREAS (DUNES, TEXTURE, HIGH VISIBILITY LANDING POLES)
  // =============================================================
  private drawSandAreas(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    this.sandAreas.forEach(sand => {
      const drawX = sand.x - cameraX;
      const drawY = sand.y - cameraY;

      if (drawX + sand.width > -50 && drawX < 1365 + 50) {
        ctx.save();

        const sandLayerHeight = 16;

        // 1. Golden Sand Dune Surface Layer
        const sandGrad = ctx.createLinearGradient(0, drawY, 0, drawY + sandLayerHeight);
        sandGrad.addColorStop(0, '#fef08a'); // Soft bright golden crest
        sandGrad.addColorStop(0.35, '#fde047');
        sandGrad.addColorStop(0.8, '#eab308');
        sandGrad.addColorStop(1, '#ca8a04'); // Amber bottom blending into ground

        ctx.fillStyle = sandGrad;
        ctx.beginPath();
        ctx.moveTo(drawX, drawY + sandLayerHeight);
        ctx.lineTo(drawX, drawY + 2);
        for (let sx = 0; sx <= sand.width; sx += 18) {
          const dy = drawY + 1 + Math.sin(sx * 0.2) * 2;
          ctx.lineTo(drawX + sx, dy);
        }
        ctx.lineTo(drawX + sand.width, drawY + sandLayerHeight);
        ctx.closePath();
        ctx.fill();

        // 2. Sand crest highlight ripples
        ctx.fillStyle = '#fef9c3';
        for (let sx = 0; sx < sand.width - 12; sx += 20) {
          const rippleY = drawY + 1 + Math.sin(sx * 0.2) * 2;
          ctx.fillRect(drawX + sx, rippleY - 0.5, 10, 1.5);
        }

        // 3. High Visibility Striped Landing Flagpoles at Start & End of Sand Bed
        const poleHeight = 44;
        [drawX + 8, drawX + sand.width - 12].forEach((px, idx) => {
          // Flagpole
          ctx.fillStyle = '#334155';
          ctx.fillRect(px, drawY - poleHeight, 4, poleHeight);

          // Alternating yellow/black safety stripes on pole
          for (let s = 0; s < poleHeight; s += 8) {
            ctx.fillStyle = (s % 16 === 0) ? '#facc15' : '#0f172a';
            ctx.fillRect(px, drawY - poleHeight + s, 4, 6);
          }

          // Golden pennant flag fluttering
          const flagDir = (idx === 0) ? 1 : -1;
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.moveTo(px + (flagDir > 0 ? 4 : 0), drawY - poleHeight);
          ctx.lineTo(px + (flagDir > 0 ? 22 : -18), drawY - poleHeight + 8);
          ctx.lineTo(px + (flagDir > 0 ? 4 : 0), drawY - poleHeight + 16);
          ctx.closePath();
          ctx.fill();
        });

        // 4. Sand grains & sparkles
        ctx.fillStyle = '#a16207';
        for (let gx = drawX + 16; gx < drawX + sand.width - 16; gx += 20) {
          const gy = drawY + 6 + ((gx % 5) * 2);
          ctx.fillRect(gx, gy, 2, 2);
        }

        // 5. "STICKY SAND" Floating Zone Indicator
        const badgeWidth = Math.min(240, sand.width - 30);
        const badgeX = drawX + (sand.width - badgeWidth) / 2;
        const badgeY = drawY - 24;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, 18, 4);
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = 'bold 8.5px system-ui, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText('⏳ STICKY SAND • HIGH DRAG & ABSORPTION', drawX + sand.width / 2, badgeY + 12);

        ctx.restore();
      }
    });
  }

  // =============================================================
  // ZONE 7 — CLIFF TELEPORT SCENERY & SIGNPOST
  // =============================================================
  private drawArea7CliffTeleport(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const westCliffX = 4630 - cameraX;
    const eastCliffX = 5280 - cameraX;
    const topY = 400 - cameraY;

    if (eastCliffX > -100 && westCliffX < 1365 + 100) {
      ctx.save();

      // 1. Signpost at West Cliff Edge
      const signX = westCliffX + 150;
      // Wooden Post
      ctx.fillStyle = '#52341b';
      ctx.fillRect(signX, topY - 55, 6, 55);

      // Signboard
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(signX - 90, topY - 96, 185, 42);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(signX - 90, topY - 96, 185, 42);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ZONE 7: CLIFF TELEPORT (330px GAP) ⚡', signX + 2, topY - 82);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('"THE FOOTBALL GOES FIRST!" ⚽💨', signX + 2, topY - 70);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Kick across abyss ➔ Teleport with [T] or [Q]', signX + 2, topY - 59);

      // 2. Sheer rock cliff face textures into the abyss
      ctx.fillStyle = '#29170c';
      ctx.fillRect(westCliffX + 300, topY, 20, 360);
      ctx.fillRect(eastCliffX, topY, 20, 360);

      // 3. Abyss fog gradient below (Depth Void)
      const abyssGrad = ctx.createLinearGradient(0, topY + 120, 0, topY + 360);
      abyssGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
      abyssGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
      ctx.fillStyle = abyssGrad;
      ctx.fillRect(westCliffX + 320, topY + 120, eastCliffX - (westCliffX + 320), 240);

      // 4. Distant wind particles rising from abyss
      const t = performance.now() * 0.002;
      ctx.fillStyle = 'rgba(147, 197, 253, 0.5)';
      for (let i = 0; i < 8; i++) {
        const px = westCliffX + 340 + (i * 35) + Math.sin(t + i) * 15;
        const py = topY + 300 - ((t * 80 + i * 40) % 220);
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // =============================================================
  // ZONE 8 — HIGH LEDGE SCENERY & SIGNPOST
  // =============================================================
  private drawArea8HighLedge(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawX = 5810 - cameraX;
    const groundY = 460 - cameraY;
    const highLedgeY = 130 - cameraY;

    if (drawX > -200 && drawX < 1365 + 600) {
      ctx.save();

      // 1. Signpost on ground before high ledge
      ctx.fillStyle = '#52341b';
      ctx.fillRect(drawX + 80, groundY - 50, 6, 50);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(drawX - 10, groundY - 95, 185, 45);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX - 10, groundY - 95, 185, 45);

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ZONE 8: HIGH LEDGE (330px HIGH) 🏔️', drawX + 82, groundY - 80);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('AIM UP [W / W+D] ➔ LOB ONTO HIGH LEDGE ⚽', drawX + 82, groundY - 68);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('TELEPORT TO HIGH ROOF [T / Q] ⚡', drawX + 82, groundY - 56);

      // 2. High Ledge Support Pillars down to ground
      const ledgeStartX = 6140 - cameraX;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(ledgeStartX + 60, highLedgeY + 30, 24, groundY - (highLedgeY + 30));
      ctx.fillRect(ledgeStartX + 280, highLedgeY + 30, 24, groundY - (highLedgeY + 30));
      ctx.fillRect(ledgeStartX + 500, highLedgeY + 30, 24, groundY - (highLedgeY + 30));

      // Cross braces
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ledgeStartX + 72, highLedgeY + 50);
      ctx.lineTo(ledgeStartX + 292, groundY - 20);
      ctx.moveTo(ledgeStartX + 292, highLedgeY + 50);
      ctx.lineTo(ledgeStartX + 72, groundY - 20);
      ctx.stroke();

      // 3. Height Measurement Marker on Ledge Face
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('▲ 330px ELEVATION ▲', ledgeStartX + 120, highLedgeY + 70);

      // 4. Sloped Kicker Ramp Guides & Glow
      const rampX = 6020 - cameraX;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.beginPath();
      ctx.moveTo(rampX, groundY);
      ctx.lineTo(rampX + 100, groundY - 100);
      ctx.lineTo(rampX + 120, groundY - 100);
      ctx.lineTo(rampX + 120, groundY);
      ctx.closePath();
      ctx.fill();

      // Launch Guidance Arrow
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(rampX + 20, groundY - 10);
      ctx.quadraticCurveTo(rampX + 80, groundY - 140, ledgeStartX + 40, highLedgeY - 10);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }
  }

  // =============================================================
  // ZONE 9 — GOAL AREA & VICTORY STADIUM
  // =============================================================
  private drawGoalArea(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const goalX = 7500 - cameraX;
    const groundY = 420 - cameraY;

    if (goalX > -200 && goalX < 1365 + 300) {
      ctx.save();

      // 1. Goal Posts (White with Shadow)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Left post, Crossbar, Back supports
      ctx.beginPath();
      ctx.moveTo(goalX, groundY);
      ctx.lineTo(goalX, groundY - 120);
      ctx.lineTo(goalX + 100, groundY - 120);
      ctx.lineTo(goalX + 100, groundY);
      ctx.stroke();

      // Depth Back Net Support
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(goalX, groundY - 120);
      ctx.lineTo(goalX + 40, groundY - 100);
      ctx.lineTo(goalX + 140, groundY - 100);
      ctx.lineTo(goalX + 100, groundY - 120);
      ctx.stroke();

      // 2. Net Mesh Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      for (let nx = goalX; nx <= goalX + 100; nx += 12) {
        ctx.beginPath();
        ctx.moveTo(nx, groundY - 120);
        ctx.lineTo(nx + 20, groundY);
        ctx.stroke();
      }
      for (let ny = groundY - 120; ny <= groundY; ny += 14) {
        ctx.beginPath();
        ctx.moveTo(goalX, ny);
        ctx.lineTo(goalX + 100, ny);
        ctx.stroke();
      }

      // 3. Victory Banners Above Goal
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 STADIUM GOAL LINE ⚽', goalX + 50, groundY - 145);

      ctx.restore();
    }
  }

  // =============================================================
  // LEVEL 1 END — MOUNTAIN TUNNEL ENTRANCE TO CHAPTER 2
  // =============================================================
  private drawMountainTunnelEntrance(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const cliffStartX = 7860 - cameraX;
    const tunnelMouthX = 7960 - cameraX;
    const tunnelWidth = 190;
    const tunnelHeight = 140;
    const groundY = 420 - cameraY;
    const tunnelTopY = groundY - tunnelHeight;

    if (tunnelMouthX + tunnelWidth + 350 > -100 && cliffStartX < 1365 + 100) {
      ctx.save();

      // 1. Massive Rocky Mountain Cliff Face ascending upward
      const cliffGrad = ctx.createLinearGradient(cliffStartX, 0, cliffStartX + 500, 0);
      cliffGrad.addColorStop(0, '#1e293b');
      cliffGrad.addColorStop(0.3, '#334155');
      cliffGrad.addColorStop(0.7, '#1e293b');
      cliffGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = cliffGrad;
      ctx.beginPath();
      ctx.moveTo(cliffStartX, groundY + 400);
      ctx.lineTo(cliffStartX, groundY - 60);
      ctx.lineTo(cliffStartX + 30, groundY - 180);
      ctx.lineTo(cliffStartX + 15, groundY - 320);
      ctx.lineTo(cliffStartX + 50, -250);
      ctx.lineTo(cliffStartX + 700, -250);
      ctx.lineTo(cliffStartX + 700, groundY + 400);
      ctx.closePath();
      ctx.fill();

      // Rugged Stone Crags & Chiseled Strata Lines
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      for (let cy = groundY - 40; cy > -200; cy -= 45) {
        ctx.beginPath();
        ctx.moveTo(cliffStartX + 10, cy);
        ctx.lineTo(cliffStartX + 90, cy - 12);
        ctx.lineTo(cliffStartX + 180, cy + 8);
        ctx.lineTo(cliffStartX + 320, cy - 6);
        ctx.stroke();
      }

      // Overhanging Mountain Foliage & Vines
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      for (let fx = cliffStartX + 20; fx < cliffStartX + 500; fx += 35) {
        ctx.arc(fx, groundY - 170 + Math.sin(fx * 0.1) * 15, 18, 0, Math.PI * 2);
      }
      ctx.fill();

      // 2. Pitch Black Cave Interior Void (Depth Gradient)
      const voidGrad = ctx.createLinearGradient(tunnelMouthX, 0, tunnelMouthX + tunnelWidth, 0);
      voidGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
      voidGrad.addColorStop(0.35, '#020617');
      voidGrad.addColorStop(0.7, '#000000');
      voidGrad.addColorStop(1, '#000000');

      ctx.fillStyle = voidGrad;
      ctx.beginPath();
      ctx.moveTo(tunnelMouthX, groundY);
      ctx.lineTo(tunnelMouthX, tunnelTopY + 30);
      ctx.quadraticCurveTo(tunnelMouthX + tunnelWidth / 2, tunnelTopY - 40, tunnelMouthX + tunnelWidth, tunnelTopY + 30);
      ctx.lineTo(tunnelMouthX + tunnelWidth, groundY);
      ctx.closePath();
      ctx.fill();

      // 3. Heavy Stone Arch Border & Keystones
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(tunnelMouthX - 4, groundY);
      ctx.lineTo(tunnelMouthX - 4, tunnelTopY + 30);
      ctx.quadraticCurveTo(tunnelMouthX + tunnelWidth / 2, tunnelTopY - 44, tunnelMouthX + tunnelWidth + 4, tunnelTopY + 30);
      ctx.lineTo(tunnelMouthX + tunnelWidth + 4, groundY);
      ctx.stroke();

      // Inner Stone Arch highlight
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tunnelMouthX + 4, groundY);
      ctx.lineTo(tunnelMouthX + 4, tunnelTopY + 30);
      ctx.quadraticCurveTo(tunnelMouthX + tunnelWidth / 2, tunnelTopY - 32, tunnelMouthX + tunnelWidth - 4, tunnelTopY + 30);
      ctx.lineTo(tunnelMouthX + tunnelWidth - 4, groundY);
      ctx.stroke();

      // Keystone Block at top of arch
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(tunnelMouthX + tunnelWidth / 2 - 16, tunnelTopY - 56, 32, 22);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(tunnelMouthX + tunnelWidth / 2 - 16, tunnelTopY - 56, 32, 22);

      // Keystone Icon ⚽
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚽', tunnelMouthX + tunnelWidth / 2, tunnelTopY - 40);

      // 4. Heavy Wooden Support Beams & Iron Reinforcements
      ctx.fillStyle = '#78350f';
      ctx.fillRect(tunnelMouthX - 16, groundY - tunnelHeight + 20, 14, tunnelHeight - 20);
      ctx.fillRect(tunnelMouthX + tunnelWidth + 2, groundY - tunnelHeight + 20, 14, tunnelHeight - 20);

      // Iron Bracket Bands on Beams
      ctx.fillStyle = '#334155';
      for (let by = groundY - 20; by > tunnelTopY + 25; by -= 32) {
        ctx.fillRect(tunnelMouthX - 18, by, 18, 5);
        ctx.fillRect(tunnelMouthX + tunnelWidth, by, 18, 5);
      }

      // 5. Burning Sconce Wall Torches on Both Sides
      const now = performance.now();
      const torchLeftX = tunnelMouthX - 22;
      const torchRightX = tunnelMouthX + tunnelWidth + 22;
      const torchY = groundY - 70;

      [torchLeftX, torchRightX].forEach((tx, idx) => {
        // Iron Torch Bracket
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(tx - 3, torchY, 6, 24);
        ctx.fillRect(tx - (idx === 0 ? 0 : 8), torchY + 16, 10, 4);

        // Torch Bowl
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(tx - 6, torchY);
        ctx.lineTo(tx + 6, torchY);
        ctx.lineTo(tx + 4, torchY + 8);
        ctx.lineTo(tx - 4, torchY + 8);
        ctx.closePath();
        ctx.fill();

        // Warm Ambient Light Glow Halo
        const flicker = Math.sin(now * 0.01 + idx * 3) * 4;
        const glowRad = 55 + flicker;
        const glowGrad = ctx.createRadialGradient(tx, torchY - 6, 4, tx, torchY - 6, glowRad);
        glowGrad.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
        glowGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.18)');
        glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(tx, torchY - 6, glowRad, 0, Math.PI * 2);
        ctx.fill();

        // Blazing Flame Core
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(tx, torchY - 4, 8 + Math.sin(now * 0.02 + idx) * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(tx, torchY - 7, 5 + Math.cos(now * 0.025 + idx) * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(tx, torchY - 8, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6. Carved Wooden Hanging Signboard above Archway
      const signX = tunnelMouthX + tunnelWidth / 2;
      const signY = tunnelTopY - 85;
      const signW = 280;
      const signH = 48;

      // Chains hanging from cliff
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(signX - signW / 2 + 25, signY - 20);
      ctx.lineTo(signX - signW / 2 + 25, signY);
      ctx.moveTo(signX + signW / 2 - 25, signY - 20);
      ctx.lineTo(signX + signW / 2 - 25, signY);
      ctx.stroke();

      // Sign Plate
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(signX - signW / 2, signY, signW, signH);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(signX - signW / 2, signY, signW, signH);

      // Gold Corners
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(signX - signW / 2, signY, 6, 6);
      ctx.fillRect(signX + signW / 2 - 6, signY, 6, 6);
      ctx.fillRect(signX - signW / 2, signY + signH - 6, 6, 6);
      ctx.fillRect(signX + signW / 2 - 6, signY + signH - 6, 6, 6);

      // Sign Text
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏔️ MOUNTAIN TUNNEL PASSAGE ➔', signX, signY + 18);

      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('CHAPTER 2: THE JUNGLE RUSH 🌴', signX, signY + 34);

      // 7. Ground Level "ENTER TUNNEL" Guidance Prompt
      const promptY = groundY - 15;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(tunnelMouthX + 25, promptY - 14, tunnelWidth - 50, 18, 9);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#7dd3fc';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ENTER TUNNEL ➔', tunnelMouthX + tunnelWidth / 2, promptY);

      ctx.restore();
    }
  }
}
