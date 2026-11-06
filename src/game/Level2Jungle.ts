import { Platform, BreakableWall, WaterZone, ThornHazard, Checkpoint, SandArea, CavePortal } from './types';
import { Crate } from './Crate';
import { DogEnemy } from './DogEnemy';
import { HealthPotion } from './HealthPotion';
import { StoneGate } from './StoneGate';
import { Elevator } from './Elevator';
import { BossArena } from './BossArena';
import { SaveManager } from './SaveManager';

export interface JunglePalm {
  x: number;
  y: number;
  height: number;
  scale: number;
  tilt: number;
}

export interface JungleVine {
  x: number;
  y: number;
  length: number;
  swingSpeed: number;
  swingOffset: number;
}

export interface JungleRuin {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'pillar' | 'monolith' | 'arch' | 'totem';
}

export interface JungleFirefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  timer: number;
}

// Helper function to safely convert hex color string to rgba
function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export class Level2Jungle {
  public static initLevel(env: {
    currentLevel: number;
    chapterTitle: string;
    levelWidth: number;
    levelHeight: number;
    deathBoundaryY: number;
    platforms: Platform[];
    crates: Crate[];
    breakableWalls: BreakableWall[];
    waterZones: WaterZone[];
    thornHazards: ThornHazard[];
    sandAreas: SandArea[];
    checkpoints: Checkpoint[];
    cavePortals: CavePortal[];
    dogs: DogEnemy[];
    healthPotions: HealthPotion[];
    collectedPotionIds?: string[];
    stoneGate: StoneGate | null;
    elevator: Elevator | null;
    bossArena: BossArena | null;
    isBossDefeated?: boolean;
    junglePalms: JunglePalm[];
    jungleVines: JungleVine[];
    jungleRuins: JungleRuin[];
    jungleFireflies: JungleFirefly[];
    getTerrainHeightAt: (x: number) => number;
  }) {
    env.currentLevel = 2;
    env.chapterTitle = 'Chapter 2: The Jungle Rush';
    env.levelWidth = 9800;
    env.levelHeight = 1400;
    env.deathBoundaryY = 1350;

    env.platforms = [];
    env.crates = [];
    env.breakableWalls = [];
    env.waterZones = [];
    env.thornHazards = [];
    env.sandAreas = [];
    env.checkpoints = [];
    env.cavePortals = [];
    env.dogs = [];
    env.healthPotions = [];
    env.stoneGate = new StoneGate(8180, 110, 80, 520);
    if (SaveManager.isBossDefeated() || SaveManager.isStoneGateOpen() || env.isBossDefeated) {
      env.stoneGate.state = 'GATE_OPEN';
      env.stoneGate.openProgress = 1;
    }
    env.elevator = new Elevator(7920, 110, 620);
    env.bossArena = null;
    (env as { ratkeeperBoss?: unknown }).ratkeeperBoss = null;
    env.junglePalms = [];
    env.jungleVines = [];
    env.jungleRuins = [];
    env.jungleFireflies = [];

    // =========================================================
    // SPAWN SLEEPING DOG ENEMIES (Independent AI Instances)
    // =========================================================
    // Dog 1: Overgrown Ruins Guard (Introduced AFTER breaking jungle-wall-1 at x:1560)
    env.dogs.push(new DogEnemy('jungle-dog-ruins-1', 1740, 526, 120, false, '', 'dog'));

    // Dog 2: River Outpost Guard
    env.dogs.push(new DogEnemy('jungle-dog-river', 3850, 526, 120, false, '', 'dog'));

    // Dog 3: Canopy Approach Guard
    env.dogs.push(new DogEnemy('jungle-dog-canopy', 4520, 526, 120, false, '', 'dog'));

    // Dogs 4 & 5: Summit Arena Guardians (2 Dogs Together to fight after Ascent!)
    env.dogs.push(new DogEnemy('jungle-dog-summit-1', 7180, 66, 120, false, '', 'dog'));
    env.dogs.push(new DogEnemy('jungle-dog-summit-2', 7340, 66, 120, false, '', 'dog'));

    // =========================================================
    // TUNNEL PORTAL BACK TO CHAPTER 1 (At starting cave mouth)
    // =========================================================
    env.cavePortals.push({
      id: 'tunnel-back-to-level-1',
      x: 0,
      y: 440,
      width: 140,
      height: 140,
      targetLevel: 1,
      title: 'CHAPTER 1: THE SUBURBIA RUN',
      subtitle: 'Returning to the Suburbia Grounds...',
      signText: 'MOUNTAIN TUNNEL ➔ CHAPTER 1',
      spawnAtEnd: true,
    });

    // =========================================================
    // ZONE 1: JUNGLE THRESHOLD & CAVE EXIT (0 to 1400)
    // =========================================================
    env.platforms.push({
      id: 'jungle-ground-1',
      x: 0,
      y: 580,
      width: 1400,
      height: 188,
      type: 'ground',
      color: '#24140b', // Deep rich jungle loam soil
      topColor: '#15803d', // Lush emerald moss
    });

    // Checkpoint 1 (Jungle Canopy Entrance)
    env.checkpoints.push({
      id: 'jungle-cp-1',
      name: 'Jungle Canopy Entrance',
      x: 320,
      y: 580,
      width: 32,
      height: 60,
      playerSpawnX: 340,
      playerSpawnY: 484, // Standing on ground Y=580
      ballSpawnX: 420,
      ballSpawnY: 548,
      isActive: true,
    });

    // =========================================================
    // ZONE 2: OVERGROWN RUINS & BREAKABLE VINE WALL (1400 to 2650)
    // =========================================================
    env.platforms.push({
      id: 'jungle-ground-2',
      x: 1400,
      y: 580,
      width: 1250,
      height: 188,
      type: 'ground',
      color: '#24140b',
      topColor: '#15803d',
    });

    // Breakable Overgrown Ruin Wall (Requires strong kick to shatter!)
    env.breakableWalls.push({
      id: 'jungle-wall-1',
      x: 1560,
      y: 420,
      width: 52,
      height: 160,
      isBroken: false,
      breakThreshold: 550,
      shakeTimer: 0,
      shakeOffset: 0,
    });

    // Pushable Ancient Moss Crate
    env.crates.push(new Crate('jungle-crate-1', 1780, 520));

    // Stepped Mossy Ruin Stone Slabs
    env.platforms.push({
      id: 'jungle-ruin-step-1',
      x: 1940,
      y: 470,
      width: 240,
      height: 30,
      type: 'platform',
      color: '#1e293b',
      topColor: '#22c55e',
    });

    env.platforms.push({
      id: 'jungle-ruin-step-2',
      x: 2260,
      y: 370,
      width: 260,
      height: 30,
      type: 'platform',
      color: '#1e293b',
      topColor: '#22c55e',
    });

    // Checkpoint 2 (Mossy Ruins)
    env.checkpoints.push({
      id: 'jungle-cp-2',
      name: 'Mossy Ruins',
      x: 2000,
      y: 470,
      width: 32,
      height: 60,
      playerSpawnX: 1980,
      playerSpawnY: 374,
      ballSpawnX: 2060,
      ballSpawnY: 438,
      isActive: false,
    });

    // =========================================================
    // ZONE 3: THE JUNGLE RIVER BASIN & ROPE BRIDGE (2650 to 4200)
    // =========================================================
    env.platforms.push({
      id: 'jungle-ground-3a',
      x: 2650,
      y: 580,
      width: 200,
      height: 188,
      type: 'ground',
      color: '#24140b',
      topColor: '#15803d',
    });

    // Sticky Sand Bank
    env.sandAreas.push({
      id: 'jungle-sand-river-bank',
      x: 2720,
      y: 576,
      width: 130,
      height: 25,
      frictionMultiplier: 9.0,
    });

    // Deep Jungle River (Water Hazard)
    env.waterZones.push({
      id: 'jungle-river-water',
      x: 2850,
      y: 630,
      width: 600,
      height: 120,
      label: 'Jungle River',
    });

    // Poisonous Brambles in riverbed
    env.thornHazards.push({
      id: 'jungle-thorns-river',
      x: 2850,
      y: 615,
      width: 600,
      height: 25,
    });

    // Suspended Wooden Rope Bridge across river
    env.platforms.push({
      id: 'jungle-bridge-river',
      x: 2880,
      y: 480,
      width: 480,
      height: 18,
      type: 'bridge',
      color: '#78350f',
      topColor: '#a16207',
    });

    env.platforms.push({
      id: 'jungle-ground-3b',
      x: 3450,
      y: 580,
      width: 750,
      height: 188,
      type: 'ground',
      color: '#24140b',
      topColor: '#15803d',
    });

    // Checkpoint 3 (River Outpost)
    env.checkpoints.push({
      id: 'jungle-cp-3',
      name: 'River Outpost',
      x: 3550,
      y: 580,
      width: 32,
      height: 60,
      playerSpawnX: 3570,
      playerSpawnY: 484,
      ballSpawnX: 3650,
      ballSpawnY: 548,
      isActive: false,
    });

    // =========================================================
    // ZONE 4: CANOPY VINE APPROACH (4200 to 5300)
    // =========================================================
    env.platforms.push({
      id: 'jungle-ground-4',
      x: 4200,
      y: 580,
      width: 1100,
      height: 188,
      type: 'ground',
      color: '#24140b',
      topColor: '#15803d',
    });

    // Elevated Temple Approach Platforms
    env.platforms.push({
      id: 'jungle-canopy-1',
      x: 4380,
      y: 450,
      width: 280,
      height: 25,
      type: 'platform',
      color: '#1e293b',
      topColor: '#22c55e',
    });

    env.platforms.push({
      id: 'jungle-canopy-2',
      x: 4780,
      y: 330,
      width: 340,
      height: 25,
      type: 'platform',
      color: '#1e293b',
      topColor: '#22c55e',
    });

    // Checkpoint 4 (Ancient Canopy Heights)
    env.checkpoints.push({
      id: 'jungle-cp-4',
      name: 'Canopy Heights',
      x: 4880,
      y: 330,
      width: 32,
      height: 60,
      playerSpawnX: 4900,
      playerSpawnY: 234,
      ballSpawnX: 4980,
      ballSpawnY: 298,
      isActive: false,
    });

    // =========================================================
    // ZONE 5: 6 PROGRESSIVE VERTICAL ASCENT PLATFORMS (5300 to 6680)
    // Players kick ball high onto platforms and teleport up!
    // Platform 3 holds a full Health Refill Potion!
    // =========================================================
    // Platform 1 (Y: 490)
    env.platforms.push({
      id: 'jungle-ascent-1',
      x: 5400,
      y: 490,
      width: 130,
      height: 24,
      type: 'platform',
      color: '#1e293b',
      topColor: '#22c55e',
    });

    // Platform 2 (Y: 410)
    env.platforms.push({
      id: 'jungle-ascent-2',
      x: 5610,
      y: 410,
      width: 120,
      height: 24,
      type: 'platform',
      color: '#1e293b',
      topColor: '#22c55e',
    });

    // Platform 3 (Y: 330) -> CONTAINS HEALTH REFILL POTION!
    env.platforms.push({
      id: 'jungle-ascent-3',
      x: 5820,
      y: 330,
      width: 130,
      height: 24,
      type: 'platform',
      color: '#1e293b',
      topColor: '#22c55e',
    });
    // Health Potion on 3rd platform (recovers 100 HP)
    env.healthPotions.push(new HealthPotion('jungle-potion-platform-3', 5875, 288, 100));

    // Platform 4 (Y: 250)
    env.platforms.push({
      id: 'jungle-ascent-4',
      x: 6040,
      y: 250,
      width: 120,
      height: 24,
      type: 'platform',
      color: '#1e293b',
      topColor: '#22c55e',
    });

    // Platform 5 (Y: 170)
    env.platforms.push({
      id: 'jungle-ascent-5',
      x: 6260,
      y: 170,
      width: 120,
      height: 24,
      type: 'platform',
      color: '#1e293b',
      topColor: '#22c55e',
    });

    // Platform 6 (Highest Ascent Platform, Y: 110)
    env.platforms.push({
      id: 'jungle-ascent-6',
      x: 6480,
      y: 110,
      width: 130,
      height: 24,
      type: 'platform',
      color: '#1e293b',
      topColor: '#22c55e',
    });

    // Stepping Floating Grounds between ascent platforms and cliff wall
    const ascentStepGrounds = [
      { id: 'jungle-step-1', x: 5530, y: 450, width: 85, height: 20 },
      { id: 'jungle-step-2', x: 5740, y: 370, width: 85, height: 20 },
      { id: 'jungle-step-3', x: 5950, y: 290, width: 85, height: 20 },
      { id: 'jungle-step-4', x: 6170, y: 210, width: 85, height: 20 },
      { id: 'jungle-step-5', x: 6390, y: 140, width: 85, height: 20 },
      { id: 'jungle-step-6', x: 6600, y: 110, width: 85, height: 20 },
      // Stepping platforms on the vertical cliff wall
      { id: 'jungle-cliff-step-bot', x: 6540, y: 430, width: 110, height: 20 },
      { id: 'jungle-cliff-step-mid', x: 6590, y: 300, width: 100, height: 20 },
      { id: 'jungle-cliff-step-high', x: 6550, y: 190, width: 100, height: 20 },
    ];
    ascentStepGrounds.forEach(p => {
      env.platforms.push({
        ...p,
        type: 'platform',
        color: '#1e293b',
        topColor: '#22c55e',
      });
    });

    // Bottom Hazards under Ascent Platforms (Strictly under surface Ascent Zone at Y: 530, ends before subterranean cavern at 5760)
    env.thornHazards.push({
      id: 'jungle-ascent-thorns',
      x: 5300,
      y: 530,
      width: 460,
      height: 25,
      type: 'ground',
    });

    env.waterZones.push({
      id: 'jungle-ascent-water',
      x: 5300,
      y: 545,
      width: 460,
      height: 35,
      label: 'Chasm Rapids',
    });

    // =========================================================
    // ZONE 6: ANCIENT SUMMIT PLATEAU (6680 to 8200)
    // Surface Summit with 2 Dogs fighting together!
    // At X: 7920 -> Underground Elevator Shaft (Open Vacant Chasm)
    // At X: 8180 -> Ancient Stone Gate (blocks surface progression)
    // =========================================================
    // Left summit ground leading up to Elevator Shaft (6680 to 7920)
    env.platforms.push({
      id: 'jungle-summit-ground-left',
      x: 6680,
      y: 110,
      width: 1240, // 6680 to 7920 (Left ledge of elevator shaft)
      height: 60,
      type: 'ground',
      color: '#24140b',
      topColor: '#15803d',
    });

    // Right summit ground between Elevator Shaft and Stone Gate (8050 to 8180)
    env.platforms.push({
      id: 'jungle-summit-ground-right',
      x: 8050,
      y: 110,
      width: 130, // 8050 to 8180 (Right ledge of elevator shaft to Gate)
      height: 60,
      type: 'ground',
      color: '#24140b',
      topColor: '#15803d',
    });

    // Surface Terrain beyond Stone Gate (Post-Boss Area)
    env.platforms.push({
      id: 'jungle-summit-beyond-gate',
      x: 8260,
      y: 110,
      width: 1540, // 8260 to 9800
      height: 60,
      type: 'ground',
      color: '#24140b',
      topColor: '#15803d',
    });

    // Checkpoint 5 (Ancient Summit Arena)
    env.checkpoints.push({
      id: 'jungle-cp-5',
      name: 'Ancient Summit Arena',
      x: 6760,
      y: 110,
      width: 32,
      height: 60,
      playerSpawnX: 6780,
      playerSpawnY: 14,
      ballSpawnX: 6860,
      ballSpawnY: 78,
      isActive: false,
    });

    // =========================================================
    // ZONE 7: SUBTERRANEAN CATACOMBS & HOLLOW TUNNEL (7160 to 9680, Y: 620)
    // Reached via the Underground Elevator at X: 7920!
    // Left Wing: Hollow Terrifying Tunnel leading to Chapter 3 (7280 to 7480)
    // Center Hub: Elevator Landing (7620 to 8060)
    // Right Wing: Ancient Sanctuary & Advisor Resting Hall (8060 to 9680)
    // =========================================================

    // 1. Unified Underground Floor (extends continuously from X: 7160 to X: 9680 at Y: 620)
    env.platforms.push({
      id: 'jungle-underground-landing-floor',
      x: 7160,
      y: 620,
      width: 2520, // Continuous solid floor across the basement
      height: 380,
      type: 'ground',
      color: '#041610',
      topColor: '#0d3829',
    });

    // Underground Far Left Boundary Wall (at X: 7160)
    env.platforms.push({
      id: 'jungle-underground-left-boundary-wall',
      x: 7160,
      y: 180,
      width: 60,
      height: 820,
      type: 'wall',
      color: '#020e0a',
      topColor: '#06261c',
    });

    // Underground Far Right Boundary Wall (Protects edge of the world at X: 9680)
    env.platforms.push({
      id: 'jungle-underground-sanctuary-far-wall',
      x: 9680,
      y: 180,
      width: 60,
      height: 820,
      type: 'wall',
      color: '#020e0a',
      topColor: '#06261c',
    });

    // 2. Health Potion Station near Elevator Landing
    if (!env.collectedPotionIds?.includes('jungle-potion-ratkeeper-antechamber')) {
      env.healthPotions.push(
        new HealthPotion('jungle-potion-ratkeeper-antechamber', 8060, 575, 100, 32, 42)
      );
    }

    // 3. Hollow, Terrifying Tunnel to Chapter 3 (Ratkeeper Boss Room Scene)
    env.cavePortals.push({
      id: 'tunnel-to-ratkeeper-boss',
      x: 7280,
      y: 460,
      width: 200,
      height: 160,
      targetLevel: 3,
      title: 'CHAPTER 3: LAIR OF THE RATKEEPER',
      subtitle: 'Descending into the Hollow Catacombs... Defeat the beast to escape!',
      spawnCheckpointId: 'boss-cp-entrance',
      signText: '💀 HOLLOW TUNNEL ➔ RATKEEPER',
    });

    // 4. Checkpoint 6: Catacombs Landing (Right outside the Hollow Tunnel mouth)
    env.checkpoints.push({
      id: 'jungle-cp-ratkeeper-antechamber',
      name: "Catacombs Landing",
      x: 7520,
      y: 620,
      width: 32,
      height: 60,
      playerSpawnX: 7520,
      playerSpawnY: 524, // On subterranean floor Y=620 right outside tunnel
      ballSpawnX: 7570,
      ballSpawnY: 588,
      isActive: false,
    });

    // Spawn Tropical Palm Trees along the terrain (grounded only on solid ground zones)
    const palmXPos = [
      160, 480, 780, 1120, 1420, 1720, 2180, 2580, 3620, 3950, 4300, 4700, 5100, 6800, 7050, 7450, 7800, 8150,
    ];
    palmXPos.forEach(x => {
      const terrainY = env.getTerrainHeightAt(x);
      env.junglePalms.push({
        x,
        y: terrainY,
        height: 80 + Math.random() * 40,
        scale: 0.85 + Math.random() * 0.4,
        tilt: (Math.random() - 0.5) * 0.25,
      });
    });

    // Hanging Jungle Vines
    for (let x = 200; x < 8300; x += 140) {
      env.jungleVines.push({
        x,
        y: 30 + Math.random() * 60,
        length: 90 + Math.random() * 140,
        swingSpeed: 1.2 + Math.random() * 1.5,
        swingOffset: Math.random() * Math.PI * 2,
      });
    }

    // Ancient Stone Ruin Totems & Monoliths (properly grounded on solid ground)
    const ruinXPos = [260, 920, 1480, 2220, 3700, 4420, 5050, 6900, 7600, 8050];
    ruinXPos.forEach((rx, idx) => {
      const ry = env.getTerrainHeightAt(rx);
      env.jungleRuins.push({
        x: rx,
        y: ry,
        width: 48 + Math.random() * 24,
        height: 65 + Math.random() * 35,
        type: idx % 3 === 0 ? 'monolith' : idx % 3 === 1 ? 'pillar' : 'totem',
      });
    });

    // Floating Ambient Fireflies
    for (let i = 0; i < 40; i++) {
      env.jungleFireflies.push({
        x: Math.random() * env.levelWidth,
        y: 120 + Math.random() * 480,
        vx: (Math.random() - 0.5) * 25,
        vy: (Math.random() - 0.5) * 20,
        size: 2.2 + Math.random() * 3,
        alpha: 0.5 + Math.random() * 0.5,
        timer: Math.random() * Math.PI * 2,
      });
    }
  }

  // =============================================================
  // RENDER JUNGLE PARALLAX BACKGROUND
  // =============================================================
  public static renderBackground(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    viewWidth: number,
    viewHeight: number
  ) {
    // 1. Emerald Jungle Canopy Gradient (Twilight/Dawn)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, viewHeight);
    skyGrad.addColorStop(0, '#022c22'); // Deep jungle emerald night
    skyGrad.addColorStop(0.35, '#064e3b'); // Dark rainforest green
    skyGrad.addColorStop(0.7, '#047857'); // Vibrant canopy glow
    skyGrad.addColorStop(0.9, '#059669'); // Sunlit lower canopy
    skyGrad.addColorStop(1, '#10b981'); // Tropical horizon mist
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // 2. Giant Tropical Jungle Sun with Canopy Light Shafts
    const sunX = 350 - cameraX * 0.02;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(sunX, 100, 42, 0, Math.PI * 2);
    ctx.fill();

    const sunGlow = ctx.createRadialGradient(sunX, 100, 20, sunX, 100, 140);
    sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
    sunGlow.addColorStop(0.6, 'rgba(52, 211, 153, 0.2)');
    sunGlow.addColorStop(1, 'rgba(6, 78, 59, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, 100, 140, 0, Math.PI * 2);
    ctx.fill();

    // 3. Piercing Sun Rays / God Rays through Canopy
    ctx.save();
    ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
    for (let r = -2; r <= 3; r++) {
      ctx.beginPath();
      ctx.moveTo(sunX, 100);
      ctx.lineTo(sunX + r * 220 - 80, viewHeight);
      ctx.lineTo(sunX + r * 220 + 80, viewHeight);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 4. Distant Rainforest Mountain Ridge (Parallax 0.10)
    const mtnParallax = cameraX * 0.10;
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.moveTo(-300, viewHeight);
    for (let x = -300; x < viewWidth + 600; x += 220) {
      const realX = x - (mtnParallax % 220);
      const peakY = 260 + Math.sin(x * 0.007) * 70;
      ctx.lineTo(realX, peakY);
      ctx.lineTo(realX + 110, viewHeight);
    }
    ctx.fill();

    // 5. Midground Jungle Canopy Silhouettes (Parallax 0.25)
    const canopyParallax = cameraX * 0.25;
    ctx.fillStyle = '#022c22';
    ctx.beginPath();
    ctx.moveTo(-200, viewHeight);
    for (let x = -200; x < viewWidth + 400; x += 120) {
      const realX = x - (canopyParallax % 240);
      const cY = 320 + Math.sin((x + canopyParallax) * 0.006) * 45;
      ctx.arc(realX + 60, cY, 65, Math.PI, 0, false);
      ctx.lineTo(realX + 120, viewHeight);
    }
    ctx.fill();

    // 6. Jungle Mist Layer
    const mistGrad = ctx.createLinearGradient(0, 360, 0, 500);
    mistGrad.addColorStop(0, 'rgba(5, 150, 105, 0)');
    mistGrad.addColorStop(0.5, 'rgba(5, 150, 105, 0.25)');
    mistGrad.addColorStop(1, 'rgba(4, 120, 87, 0.45)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, 360, viewWidth, 140);
  }

  // =============================================================
  // RENDER JUNGLE FOREGROUND SCENERY
  // =============================================================
  public static renderForeground(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    viewWidth: number,
    junglePalms: JunglePalm[],
    jungleVines: JungleVine[],
    jungleRuins: JungleRuin[],
    jungleFireflies: JungleFirefly[]
  ) {
    ctx.save();

    // 1. Starting Cave Exit (Left edge X: 0 to 220)
    this.drawJungleCaveExit(ctx, cameraX, cameraY);

    // 2. Chapter 2 Welcome Totem Signpost (X: 380)
    this.drawJungleWelcomeSign(ctx, cameraX, cameraY);

    // 2.5. Zone 5 Ascent Guide Signpost (X: 5220) & Zone 6 Summit Arena Signpost (X: 6780)
    this.drawAscentGuideSign(ctx, cameraX, cameraY);
    this.drawSummitArenaSign(ctx, cameraX, cameraY);
    this.drawSubterraneanAtmosphere(ctx, cameraX, cameraY);
    this.drawTerrifyingBossTunnel(ctx, cameraX, cameraY);
    this.drawJungleGoalShrine(ctx, cameraX, cameraY);

    // 3. Ancient Monoliths & Totem Ruins
    jungleRuins.forEach(ruin => {
      const drawX = ruin.x - cameraX;
      const drawY = ruin.y - cameraY;
      if (drawX + ruin.width > -100 && drawX < viewWidth + 100) {
        this.drawRuinPiece(ctx, drawX, drawY, ruin.width, ruin.height, ruin.type);
      }
    });

    // 4. Hanging Jungle Creepers & Vines
    const now = performance.now();
    jungleVines.forEach(vine => {
      const drawX = vine.x - cameraX;
      const drawY = vine.y - cameraY;
      if (drawX > -50 && drawX < viewWidth + 50) {
        const swing = Math.sin(now * 0.002 * vine.swingSpeed + vine.swingOffset) * 14;
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(drawX, drawY);
        ctx.quadraticCurveTo(drawX + swing * 0.6, drawY + vine.length * 0.5, drawX + swing, drawY + vine.length);
        ctx.stroke();

        // Vine leaves
        ctx.fillStyle = '#22c55e';
        for (let l = 20; l < vine.length - 10; l += 25) {
          const ly = drawY + l;
          const lx = drawX + swing * (l / vine.length);
          ctx.beginPath();
          ctx.ellipse(lx + 5, ly, 7, 4, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // 5. Tropical Giant Palm Trees
    junglePalms.forEach(palm => {
      const drawX = palm.x - cameraX;
      const drawY = palm.y - cameraY;
      if (drawX > -120 && drawX < viewWidth + 120) {
        this.drawJunglePalm(ctx, drawX, drawY, palm.height, palm.scale, palm.tilt);
      }
    });

    // 6. Floating Bioluminescent Fireflies
    jungleFireflies.forEach(f => {
      const drawX = f.x - cameraX;
      const drawY = f.y - cameraY;
      if (drawX > -30 && drawX < viewWidth + 30) {
        const flicker = Math.sin(now * 0.004 + f.timer) * 0.4 + 0.6;
        ctx.fillStyle = `rgba(167, 243, 208, ${f.alpha * flicker})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, f.size * flicker, 0, Math.PI * 2);
        ctx.fill();

        // Soft outer glow
        ctx.fillStyle = `rgba(52, 211, 153, ${f.alpha * flicker * 0.4})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, f.size * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  // =============================================================
  // JUNGLE SCENERY DRAWING HELPERS
  // =============================================================
  private static drawJungleCaveExit(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const drawX = 0 - cameraX;
    const groundY = 580 - cameraY;
    const archH = 140;

    if (drawX + 220 > -50 && drawX < 1365 + 50) {
      ctx.save();

      // Cave interior darkness
      const caveGrad = ctx.createLinearGradient(drawX, 0, drawX + 160, 0);
      caveGrad.addColorStop(0, '#000000');
      caveGrad.addColorStop(0.5, '#020617');
      caveGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = caveGrad;
      ctx.fillRect(drawX, groundY - archH, 160, archH);

      // Overgrown Rocky Cave Arch
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(drawX - 10, groundY);
      ctx.lineTo(drawX + 20, groundY - archH + 20);
      ctx.quadraticCurveTo(drawX + 90, groundY - archH - 30, drawX + 160, groundY);
      ctx.stroke();

      // Lush hanging vines covering cave entrance
      ctx.fillStyle = '#16a34a';
      for (let vx = drawX + 10; vx <= drawX + 150; vx += 20) {
        ctx.fillRect(vx, groundY - archH + 10, 6, 40 + (vx % 30));
      }

      // Cave Exit Sign
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(drawX + 40, groundY - archH - 45, 120, 24);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX + 40, groundY - archH - 45, 120, 24);

      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('◀ CHAPTER 1 EXIT', drawX + 100, groundY - archH - 29);

      ctx.restore();
    }
  }

  private static drawJungleWelcomeSign(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const signX = 480 - cameraX;
    const groundY = 580 - cameraY;

    if (signX > -150 && signX < 1365 + 150) {
      ctx.save();

      // Wooden Post
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(signX + 65, groundY - 60, 8, 60);

      // Wooden Plank Signboard
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(signX - 40, groundY - 110, 220, 52);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(signX - 40, groundY - 110, 220, 52);

      // Carved Sign text
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌴 CHAPTER 2: THE JUNGLE RUSH', signX + 70, groundY - 90);

      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.fillText('Watch out for overgrown ruins & river hazards! ⚽', signX + 70, groundY - 72);

      ctx.restore();
    }
  }

  private static drawJunglePalm(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    height: number,
    scale: number,
    tilt: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(tilt);

    // Curved Trunk
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(15, -height * 0.5, 0, -height);
    ctx.stroke();

    // Trunk Rings / Bark Segments
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    for (let h = 15; h < height; h += 18) {
      const ringY = -h;
      ctx.beginPath();
      ctx.moveTo(-6, ringY);
      ctx.lineTo(6, ringY);
      ctx.stroke();
    }

    // Palm Fronds / Leaves (6-way radiating tropical leaves)
    const leafAngles = [-0.9, -0.5, -0.1, 0.3, 0.7, 1.1];
    leafAngles.forEach(ang => {
      ctx.save();
      ctx.translate(0, -height);
      ctx.rotate(ang);

      // Frond stem
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(25, -15, 60, 10);
      ctx.stroke();

      // Leaf body
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(25, -22, 60, 10);
      ctx.quadraticCurveTo(25, -4, 0, 0);
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
  }

  private static drawRuinPiece(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    type: 'pillar' | 'monolith' | 'arch' | 'totem'
  ) {
    ctx.save();
    const topY = y - height;

    // Ancient mossy stone fill
    ctx.fillStyle = '#334155';
    ctx.fillRect(x, topY, width, height);

    // Moss top and sides
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(x, topY, width, 8);

    // Carved hieroglyph / totem grooves
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;

    if (type === 'totem') {
      // Carved eyes and mouth
      ctx.strokeRect(x + 8, topY + 14, 12, 10);
      ctx.strokeRect(x + width - 20, topY + 14, 12, 10);
      ctx.beginPath();
      ctx.moveTo(x + 12, topY + 36);
      ctx.lineTo(x + width - 12, topY + 36);
      ctx.stroke();
    } else {
      // Ancient stone bricks seams
      for (let ry = topY + 16; ry < y; ry += 20) {
        ctx.beginPath();
        ctx.moveTo(x, ry);
        ctx.lineTo(x + width, ry);
        ctx.stroke();
      }
    }

    // Outer edge
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, topY, width, height);

    ctx.restore();
  }

  private static drawAscentGuideSign(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const signX = 5220 - cameraX;
    const groundY = 580 - cameraY;

    if (signX > -150 && signX < 1365 + 150) {
      ctx.save();

      // Wooden Post
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(signX + 65, groundY - 60, 8, 60);

      // Wooden Plank Signboard
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(signX - 40, groundY - 120, 240, 62);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(signX - 40, groundY - 120, 240, 62);

      // Carved Sign text
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🧗 VERTICAL ASCENT CHASM', signX + 80, groundY - 100);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.fillText('Kick ball upward onto high platforms ⚽', signX + 80, groundY - 84);
      ctx.fillText('Teleport [Q]/[T] to climb higher! (HP Refill on P3)', signX + 80, groundY - 69);

      ctx.restore();
    }
  }

  private static drawSummitArenaSign(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const signX = 6780 - cameraX;
    const groundY = 110 - cameraY;

    if (signX > -150 && signX < 1365 + 150) {
      ctx.save();

      // Wooden Post
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(signX + 65, groundY - 60, 8, 60);

      // Wooden Plank Signboard
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(signX - 40, groundY - 110, 230, 52);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(signX - 40, groundY - 110, 230, 52);

      // Carved Sign text
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚔️ ANCIENT SUMMIT ARENA', signX + 75, groundY - 90);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.fillText('WARNING: 2 DOG GUARDIANS PATROLLING! 🐕🐕', signX + 75, groundY - 72);

      ctx.restore();
    }
  }

  private static drawSubterraneanAtmosphere(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const now = performance.now();

    // 1. Ancient Stone Pillars in the Subterranean Hall & Right Sanctuary (X: 8150, 8450, 8750, 9050, 9350)
    const pillarPositions = [8150, 8450, 8750, 9050, 9350];
    pillarPositions.forEach(px => {
      const drawX = px - cameraX;
      const groundY = 620 - cameraY;
      const ceilY = 240 - cameraY;
      const pillarW = 44;

      if (drawX + pillarW > -50 && drawX < 1365 + 50) {
        ctx.save();
        // Pillar Shaft
        const pGrad = ctx.createLinearGradient(drawX, 0, drawX + pillarW, 0);
        pGrad.addColorStop(0, '#062017');
        pGrad.addColorStop(0.5, '#0b3829');
        pGrad.addColorStop(1, '#041610');
        ctx.fillStyle = pGrad;
        ctx.fillRect(drawX, ceilY, pillarW, groundY - ceilY);

        ctx.strokeStyle = '#0f4d38';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(drawX, ceilY, pillarW, groundY - ceilY);

        // Capital and Base
        ctx.fillStyle = '#062017';
        ctx.fillRect(drawX - 8, ceilY, pillarW + 16, 20);
        ctx.fillRect(drawX - 8, groundY - 24, pillarW + 16, 24);
        ctx.strokeRect(drawX - 8, ceilY, pillarW + 16, 20);
        ctx.strokeRect(drawX - 8, groundY - 24, pillarW + 16, 24);

        // Carved glowing rune
        const runeGlow = 0.5 + 0.5 * Math.sin(now * 0.002 + px);
        ctx.fillStyle = `rgba(52, 211, 153, ${0.45 * runeGlow})`;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ᛟ', drawX + pillarW / 2, groundY - 70);

        ctx.restore();
      }
    });

    // 2. Warm Amber Lantern Sconces along the Hall (X: 7980, 8250, 8550, 8850, 9150, 9450)
    const torchXs = [7980, 8250, 8550, 8850, 9150, 9450];
    for (const tx of torchXs) {
      const drawX = tx - cameraX;
      const torchY = 520 - cameraY;
      if (drawX > -50 && drawX < 1365 + 50) {
        ctx.save();
        // Iron Sconce Bracket
        ctx.fillStyle = '#475569';
        ctx.fillRect(drawX - 3, torchY, 6, 20);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(drawX - 8, torchY + 6, 16, 6);

        // Torch Flame Flicker
        const flicker = Math.sin(now * 0.012 + tx) * 2;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.ellipse(drawX, torchY - 6 + flicker * 0.5, 6 + flicker * 0.4, 10 + flicker, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(drawX, torchY - 4 + flicker * 0.2, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Warm radial light
        const glow = ctx.createRadialGradient(drawX, torchY - 6, 2, drawX, torchY - 6, 60);
        glow.addColorStop(0, 'rgba(249, 115, 22, 0.30)');
        glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(drawX, torchY - 6, 60, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // 3. Ancient Stone Altar & Dais for Advisor Character (X: 8900 to 9020)
    const daisX = 8900 - cameraX;
    const daisGroundY = 620 - cameraY;
    if (daisX > -200 && daisX < 1365 + 200) {
      ctx.save();
      // Tiered Stone Platform
      ctx.fillStyle = '#062017';
      ctx.fillRect(daisX - 20, daisGroundY - 14, 160, 14);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(daisX - 20, daisGroundY - 14, 160, 14);

      ctx.fillStyle = '#0a2e22';
      ctx.fillRect(daisX, daisGroundY - 26, 120, 12);
      ctx.strokeRect(daisX, daisGroundY - 26, 120, 12);

      // Resting Cushion / Ancient Stone Throne
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(daisX + 30, daisGroundY - 50, 60, 24);
      ctx.strokeStyle = '#34d399';
      ctx.strokeRect(daisX + 30, daisGroundY - 50, 60, 24);

      // Sanctuary Guidance Tablet
      ctx.fillStyle = '#022c22';
      ctx.fillRect(daisX + 180, daisGroundY - 80, 160, 48);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(daisX + 180, daisGroundY - 80, 160, 48);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🏛️ SANCTUARY OF ELDERS', daisX + 260, daisGroundY - 62);
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('SAFE GROUND • ADVISOR CHAMBER', daisX + 260, daisGroundY - 46);

      ctx.restore();
    }
  }

  // =============================================================
  // HOLLOW TERRIFYING TUNNEL ENTRANCE (X: 7280, Y: 620)
  // Leads to Chapter 3: Ratkeeper Boss Room
  // =============================================================
  private static drawTerrifyingBossTunnel(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const tunnelX = 7280 - cameraX;
    const groundY = 620 - cameraY;
    const tunnelW = 200;
    const tunnelH = 160;
    const now = performance.now();

    if (tunnelX + tunnelW < -100 || tunnelX > 1365 + 100) return;

    ctx.save();

    // 1. Massive Jagged Obsidian Cave Mouth Silhouette
    ctx.fillStyle = '#020b08';
    ctx.beginPath();
    ctx.moveTo(tunnelX - 30, groundY);
    ctx.lineTo(tunnelX - 20, groundY - tunnelH - 40);
    ctx.lineTo(tunnelX + tunnelW / 2, groundY - tunnelH - 60);
    ctx.lineTo(tunnelX + tunnelW + 20, groundY - tunnelH - 40);
    ctx.lineTo(tunnelX + tunnelW + 30, groundY);
    ctx.closePath();
    ctx.fill();

    // 2. Ominous Void Darkness & Swirling Crimson-Purple Fog Interior
    const voidGrad = ctx.createLinearGradient(tunnelX, 0, tunnelX + tunnelW, 0);
    voidGrad.addColorStop(0, '#020617');
    voidGrad.addColorStop(0.25, '#1e1b4b');
    voidGrad.addColorStop(0.5, '#450a0a');
    voidGrad.addColorStop(0.75, '#1e1b4b');
    voidGrad.addColorStop(1, '#020617');

    ctx.fillStyle = voidGrad;
    ctx.beginPath();
    ctx.moveTo(tunnelX, groundY);
    ctx.lineTo(tunnelX + 10, groundY - tunnelH + 20);
    ctx.quadraticCurveTo(tunnelX + tunnelW / 2, groundY - tunnelH - 30, tunnelX + tunnelW - 10, groundY - tunnelH + 20);
    ctx.lineTo(tunnelX + tunnelW, groundY);
    ctx.closePath();
    ctx.fill();

    // Swirling Dark Smoke / Mist Particles inside tunnel mouth
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.003);
    ctx.fillStyle = `rgba(239, 68, 68, ${0.15 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(tunnelX + tunnelW / 2, groundY - tunnelH * 0.4, tunnelW * 0.4, tunnelH * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sinister Glowing Red Beast Eyes in the Tunnel Depths
    const eyeBlink = Math.sin(now * 0.002) > 0.95 ? 0 : 1;
    if (eyeBlink) {
      const eyeGlow = 0.7 + 0.3 * Math.sin(now * 0.006);
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(239, 68, 68, ${eyeGlow})`;

      // Left Eye Pair
      ctx.beginPath();
      ctx.arc(tunnelX + tunnelW / 2 - 25, groundY - 70, 3.5, 0, Math.PI * 2);
      ctx.arc(tunnelX + tunnelW / 2 - 15, groundY - 70, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Right Shadow Eye Pair
      ctx.beginPath();
      ctx.arc(tunnelX + tunnelW / 2 + 18, groundY - 55, 3, 0, Math.PI * 2);
      ctx.arc(tunnelX + tunnelW / 2 + 28, groundY - 55, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }

    // 3. Jagged Rocky Stalactites (Teeth-like Archway)
    ctx.fillStyle = '#062018';
    ctx.strokeStyle = '#020e0a';
    ctx.lineWidth = 2;

    const teethCount = 7;
    const toothStep = tunnelW / teethCount;
    for (let i = 0; i < teethCount; i++) {
      const tx = tunnelX + i * toothStep;
      const tLen = 25 + Math.sin(i * 1.8) * 16;
      ctx.beginPath();
      ctx.moveTo(tx, groundY - tunnelH + 15);
      ctx.lineTo(tx + toothStep / 2, groundY - tunnelH + 15 + tLen);
      ctx.lineTo(tx + toothStep, groundY - tunnelH + 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Heavy Stone Arch Border
    ctx.strokeStyle = '#0f382c';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(tunnelX - 4, groundY);
    ctx.lineTo(tunnelX + 10, groundY - tunnelH + 20);
    ctx.quadraticCurveTo(tunnelX + tunnelW / 2, groundY - tunnelH - 30, tunnelX + tunnelW - 10, groundY - tunnelH + 20);
    ctx.lineTo(tunnelX + tunnelW + 4, groundY);
    ctx.stroke();

    // 4. Skull Totems on Spikes on Left and Right of Tunnel Mouth
    [tunnelX - 22, tunnelX + tunnelW + 14].forEach(sx => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(sx, groundY - 110, 8, 110);

      // Skull Totem
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(sx + 4, groundY - 118, 12, 0, Math.PI * 2);
      ctx.fill();

      // Skull Jaw
      ctx.fillRect(sx - 1, groundY - 112, 10, 8);

      // Skull Eye Sockets
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(sx + 1, groundY - 120, 3, 0, Math.PI * 2);
      ctx.arc(sx + 7, groundY - 120, 3, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Green Eerie Candle Flame atop Skull
      const flameFlicker = Math.sin(now * 0.01 + sx) * 2;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(sx + 4, groundY - 134 + flameFlicker * 0.5, 4, 7 + flameFlicker, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Ominous Warning Signboard Overhead
    ctx.fillStyle = '#020b08';
    ctx.fillRect(tunnelX - 20, groundY - tunnelH - 95, tunnelW + 40, 48);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(tunnelX - 20, groundY - tunnelH - 95, tunnelW + 40, 48);

    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💀 HOLLOW TUNNEL 💀', tunnelX + tunnelW / 2, groundY - tunnelH - 74);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('LAIR OF THE RATKEEPER • POINT OF NO RETURN', tunnelX + tunnelW / 2, groundY - tunnelH - 58);

    ctx.restore();
  }

  // =============================================================
  // JUNGLE SUMMIT SANCTUARY & VICTORY SHRINE (X: 9400 to 9750, Y: 110)
  // =============================================================
  private static drawJungleGoalShrine(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const goalX = 9420 - cameraX;
    const groundY = 110 - cameraY;
    const now = performance.now();

    if (goalX > -300 && goalX < 1365 + 300) {
      ctx.save();

      // 1. Ancient Gold & Emerald Goal Posts
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Left post, Crossbar, Back supports
      ctx.beginPath();
      ctx.moveTo(goalX, groundY);
      ctx.lineTo(goalX, groundY - 130);
      ctx.lineTo(goalX + 130, groundY - 130);
      ctx.lineTo(goalX + 130, groundY);
      ctx.stroke();

      // Golden Net Depth Frame
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(goalX, groundY - 130);
      ctx.lineTo(goalX + 45, groundY - 110);
      ctx.lineTo(goalX + 175, groundY - 110);
      ctx.lineTo(goalX + 130, groundY - 130);
      ctx.stroke();

      // Golden Mesh Netting
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.lineWidth = 1.2;
      for (let nx = goalX; nx <= goalX + 130; nx += 14) {
        ctx.beginPath();
        ctx.moveTo(nx, groundY - 130);
        ctx.lineTo(nx + 25, groundY);
        ctx.stroke();
      }
      for (let ny = groundY - 130; ny <= groundY; ny += 16) {
        ctx.beginPath();
        ctx.moveTo(goalX, ny);
        ctx.lineTo(goalX + 130, ny);
        ctx.stroke();
      }

      // 2. Glowing Golden Championship Trophy on Altar
      const trophyX = goalX + 65;
      const trophyY = groundY - 45;
      const pulse = Math.sin(now * 0.004) * 0.2 + 0.8;

      // Altar Base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(trophyX - 22, groundY - 16, 44, 16);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(trophyX - 22, groundY - 16, 44, 16);

      // Trophy Cup
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(trophyX - 16, trophyY - 20);
      ctx.lineTo(trophyX + 16, trophyY - 20);
      ctx.lineTo(trophyX + 10, trophyY);
      ctx.lineTo(trophyX - 10, trophyY);
      ctx.closePath();
      ctx.fill();

      // Trophy Base Stem
      ctx.fillRect(trophyX - 4, trophyY, 8, 14);
      ctx.fillRect(trophyX - 12, trophyY + 14, 24, 6);

      // Golden Trophy Glow Halo
      const trophyGlow = ctx.createRadialGradient(trophyX, trophyY - 10, 4, trophyX, trophyY - 10, 50);
      trophyGlow.addColorStop(0, `rgba(250, 204, 21, ${0.45 * pulse})`);
      trophyGlow.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = trophyGlow;
      ctx.beginPath();
      ctx.arc(trophyX, trophyY - 10, 50, 0, Math.PI * 2);
      ctx.fill();

      // 3. Floating Grand Victory Shrine Header
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(goalX - 55, groundY - 195, 240, 50);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(goalX - 55, groundY - 195, 240, 50);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 JUNGLE SUMMIT SANCTUARY 🏆', goalX + 65, groundY - 174);

      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('CHAPTER 2 COMPLETE! ⚽✨', goalX + 65, groundY - 156);

      ctx.restore();
    }
  }
}
