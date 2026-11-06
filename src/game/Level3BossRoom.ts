import { Environment } from './Environment';
import { DogEnemy } from './DogEnemy';
import { BossArena } from './BossArena';
import { RatkeeperBoss } from './RatkeeperBoss';
import { HealthPotion } from './HealthPotion';
import { SaveManager } from './SaveManager';

export class Level3BossRoom {
  public static initLevel(env: Environment, forceBossReplay: boolean = false) {
    env.currentLevel = 3;
    env.chapterTitle = 'Chapter 3: Lair of the Ratkeeper';
    env.levelWidth = 2400;
    env.levelHeight = 1200;
    env.deathBoundaryY = 900;

    // Reset collections
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
    env.stoneGate = null;
    env.elevator = null;
    env.ratkeeperBoss = null;

    // 1. Solid Catacomb Bedrock Floor (Y: 620 from X: 0 to 2400, flat open arena)
    env.platforms.push({
      id: 'boss-room-ground',
      x: 0,
      y: 620,
      width: 2400,
      height: 480,
      type: 'ground',
      color: '#041610',
      topColor: '#0d3829',
    });

    // 2. Left Sealed Boundary Wall (x: -40 to 0, height 1100)
    env.platforms.push({
      id: 'boss-room-left-wall',
      x: -40,
      y: -350,
      width: 40,
      height: 1100,
      type: 'wall',
      color: '#020e0a',
      topColor: '#06261c',
    });

    // 3. Vaulted Cavern Ceiling Collider (at Y: -320, 940px above floor)
    env.platforms.push({
      id: 'boss-room-ceiling',
      x: 0,
      y: -340,
      width: 2400,
      height: 40,
      type: 'ground',
      color: '#020e0a',
      topColor: '#06261c',
    });

    // 4. Far Right Boundary Wall (Protects edge of the arena at X: 2360)
    env.platforms.push({
      id: 'boss-room-right-wall',
      x: 2360,
      y: -350,
      width: 40,
      height: 1100,
      type: 'wall',
      color: '#020e0a',
      topColor: '#06261c',
    });

    // (All floating platforms removed for an unobstructed, wide-open boss battle ground!)

    // 5. Checkpoint 1: The Ratkeeper's Tomb (Player spawns near left entrance facing into the arena)
    env.checkpoints.push({
      id: 'boss-cp-entrance',
      name: "Ratkeeper's Tomb",
      x: 240,
      y: 620,
      width: 32,
      height: 60,
      playerSpawnX: 240,
      playerSpawnY: 524,
      ballSpawnX: 300,
      ballSpawnY: 588,
      isActive: true,
    });

    // 6. Accessible Ground Health Potions on the Arena Floor (Y: 575)
    env.healthPotions.push(
      new HealthPotion('boss-potion-left', 680, 575, 100, 32, 42)
    );
    env.healthPotions.push(
      new HealthPotion('boss-potion-right', 1680, 575, 100, 32, 42)
    );

    // 7. Initialize Boss Arena Manager (Full grand arena bounds X: 0 to 2360, Y: -320 to 620)
    env.bossArena = new BossArena(0, 2360, 620, -320);

    // When entering from the Level Select menu in boss mode, forceBossReplay is true so the player can fight as many times as they want.
    // In normal story mode, if defeated, boss remains destroyed and tunnel is open.
    const isAlreadyDefeated = !forceBossReplay && (env.isBossDefeated || SaveManager.isBossDefeated());

    if (isAlreadyDefeated) {
      // Boss destroyed forever!
      env.isBossDefeated = true;
      env.bossArena.isDefeated = true;
      env.bossArena.isLocked = false;
      env.bossArena.gateProgress = 0;
      env.dogs = [];
      env.ratkeeperBoss = null;

      // Open Exit Hollow Tunnel at the entrance behind the player (X: 40-200)
      env.cavePortals.push({
        id: 'tunnel-return-to-jungle',
        x: 40,
        y: 460,
        width: 160,
        height: 160,
        targetLevel: 2,
        title: 'CHAPTER 2: JUNGLE CANOPY',
        subtitle: 'Returning through the hollow tunnel to the catacombs...',
        spawnCheckpointId: 'jungle-cp-ratkeeper-antechamber',
        signText: '💀 HOLLOW TUNNEL ➔ RETURN TO CATACOMBS',
      });
    } else {
      // 8. Boss Enemy: 👑 THE RATKEEPER (State-machine driven giant rat boss)
      env.isBossDefeated = false;
      env.ratkeeperBoss = new RatkeeperBoss(1200, 380, env.bossArena);
      env.dogs = [];
      env.cavePortals = [];
    }
  }

  // =============================================================
  // BACKGROUND RENDERING (TOWERING EMERALD & OBSIDIAN CATACOMBS)
  // =============================================================
  public static renderBackground(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    viewWidth: number,
    viewHeight: number
  ) {
    // 1. Deep Emerald & Void Black Catacomb Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, viewHeight);
    bgGrad.addColorStop(0, '#010805'); // Pitch black abyss
    bgGrad.addColorStop(0.3, '#02160f'); // Dark emerald mist
    bgGrad.addColorStop(0.65, '#05251c'); // Vibrant catacomb glow
    bgGrad.addColorStop(0.9, '#031a13');
    bgGrad.addColorStop(1, '#010c08');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // 2. Distant Vaulted Gothic Cavern Arches (Towering Grand Scale)
    ctx.save();
    const archParallax = cameraX * 0.15;
    ctx.fillStyle = '#021610';
    for (let x = -200; x < viewWidth + 400; x += 320) {
      const realX = x - (archParallax % 320);
      ctx.beginPath();
      ctx.moveTo(realX, viewHeight);
      ctx.lineTo(realX, 40);
      ctx.quadraticCurveTo(realX + 160, -120, realX + 320, 40);
      ctx.lineTo(realX + 320, viewHeight);
      ctx.fill();
    }
    ctx.restore();
  }

  // =============================================================
  // SCENERY & PROPS RENDERING (ENTRANCE RETURN TUNNEL, ANCIENT MONOLITH, TORCHES)
  // =============================================================
  public static renderSceneryAndProps(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    viewWidth: number,
    viewHeight: number,
    env: Environment
  ) {
    const now = performance.now();

    // 1. Render Left Entrance & Return Tunnel (The same tunnel player entered through!)
    this.drawEntranceReturnTunnel(ctx, cameraX, cameraY, env, now);

    // 2. Render Right Ancient Monolith Relief (Atmospheric lore shrine)
    this.drawAncientMonolithRelief(ctx, cameraX, cameraY, now);

    // 3. Render Flickering Green Skull Torches along the arena walls
    const torchXPositions = [280, 560, 920, 1480, 1840, 2140];
    torchXPositions.forEach(tx => {
      this.drawSkullTorch(ctx, tx - cameraX, 580 - cameraY, now + tx);
    });
  }

  // =============================================================
  // DRAW ENTRANCE / RETURN HOLLOW TUNNEL (X: 40 to 200, Y: 620)
  // The exact same tunnel behind the player, allowing return to Chapter 2 once boss is defeated!
  // =============================================================
  private static drawEntranceReturnTunnel(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    env: Environment,
    now: number
  ) {
    const tunnelX = 40 - cameraX;
    const groundY = 620 - cameraY;
    const tunnelW = 160;
    const tunnelH = 160;
    const isDefeated = env.bossArena?.isDefeated || false;

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

    // 2. Tunnel Maw Interior (Swirling Void / Emerald Mist)
    const voidGrad = ctx.createLinearGradient(tunnelX, 0, tunnelX + tunnelW, 0);
    if (isDefeated) {
      voidGrad.addColorStop(0, '#021c12');
      voidGrad.addColorStop(0.3, '#064e3b');
      voidGrad.addColorStop(0.5, '#10b981');
      voidGrad.addColorStop(0.7, '#064e3b');
      voidGrad.addColorStop(1, '#021c12');
    } else {
      voidGrad.addColorStop(0, '#020617');
      voidGrad.addColorStop(0.3, '#1e1b4b');
      voidGrad.addColorStop(0.5, '#450a0a');
      voidGrad.addColorStop(0.7, '#1e1b4b');
      voidGrad.addColorStop(1, '#020617');
    }

    ctx.fillStyle = voidGrad;
    ctx.beginPath();
    ctx.moveTo(tunnelX, groundY);
    ctx.lineTo(tunnelX + 10, groundY - tunnelH + 20);
    ctx.quadraticCurveTo(tunnelX + tunnelW / 2, groundY - tunnelH - 30, tunnelX + tunnelW - 10, groundY - tunnelH + 20);
    ctx.lineTo(tunnelX + tunnelW, groundY);
    ctx.closePath();
    ctx.fill();

    // Glowing atmospheric mist inside tunnel mouth
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
    if (isDefeated) {
      ctx.fillStyle = `rgba(52, 211, 153, ${0.25 * pulse})`;
    } else {
      ctx.fillStyle = `rgba(239, 68, 68, ${0.15 * pulse})`;
    }
    ctx.beginPath();
    ctx.ellipse(tunnelX + tunnelW / 2, groundY - tunnelH * 0.4, tunnelW * 0.4, tunnelH * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Jagged Stalactites Framing Archway
    ctx.fillStyle = '#062018';
    ctx.strokeStyle = '#020e0a';
    ctx.lineWidth = 2;
    const teethCount = 6;
    const toothStep = tunnelW / teethCount;
    for (let i = 0; i < teethCount; i++) {
      const tx = tunnelX + i * toothStep;
      const tLen = 22 + Math.sin(i * 1.8) * 14;
      ctx.beginPath();
      ctx.moveTo(tx, groundY - tunnelH + 15);
      ctx.lineTo(tx + toothStep / 2, groundY - tunnelH + 15 + tLen);
      ctx.lineTo(tx + toothStep, groundY - tunnelH + 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Heavy Stone Arch Border
    ctx.strokeStyle = isDefeated ? '#15803d' : '#0f382c';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(tunnelX - 4, groundY);
    ctx.lineTo(tunnelX + 10, groundY - tunnelH + 20);
    ctx.quadraticCurveTo(tunnelX + tunnelW / 2, groundY - tunnelH - 30, tunnelX + tunnelW - 10, groundY - tunnelH + 20);
    ctx.lineTo(tunnelX + tunnelW + 4, groundY);
    ctx.stroke();

    // 4. Skull Totems with Candles on Left and Right
    [tunnelX - 20, tunnelX + tunnelW + 12].forEach(sx => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(sx, groundY - 110, 8, 110);

      // Skull
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(sx + 4, groundY - 118, 12, 0, Math.PI * 2);
      ctx.fill();

      // Skull Eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(sx + 1, groundY - 120, 3, 0, Math.PI * 2);
      ctx.arc(sx + 7, groundY - 120, 3, 0, Math.PI * 2);
      ctx.fill();

      // Flame
      const flameFlicker = Math.sin(now * 0.01 + sx) * 2;
      ctx.fillStyle = isDefeated ? '#4ade80' : '#ef4444';
      ctx.beginPath();
      ctx.ellipse(sx + 4, groundY - 134 + flameFlicker * 0.5, 4, 7 + flameFlicker, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!isDefeated) {
      // Iron Portcullis Bars (Sealing the exit while boss is alive)
      ctx.fillStyle = '#1e293b';
      for (let bx = tunnelX + 16; bx <= tunnelX + tunnelW - 16; bx += 16) {
        ctx.fillRect(bx, groundY - tunnelH + 10, 6, tunnelH - 10);
      }
      ctx.fillStyle = '#334155';
      ctx.fillRect(tunnelX + 10, groundY - tunnelH * 0.65, tunnelW - 20, 8);
      ctx.fillRect(tunnelX + 10, groundY - tunnelH * 0.3, tunnelW - 20, 8);

      // Warning Signboard Overhead
      ctx.fillStyle = '#020b08';
      ctx.fillRect(tunnelX - 20, groundY - tunnelH - 85, tunnelW + 40, 42);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(tunnelX - 20, groundY - tunnelH - 85, tunnelW + 40, 42);

      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔒 HOLLOW TUNNEL (SEALED)', tunnelX + tunnelW / 2, groundY - tunnelH - 68);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('DEFEAT RATKEEPER TO ESCAPE', tunnelX + tunnelW / 2, groundY - tunnelH - 53);
    } else {
      // Victory Exit Portal Banner Overhead
      ctx.fillStyle = '#021c12';
      ctx.fillRect(tunnelX - 30, groundY - tunnelH - 95, tunnelW + 60, 48);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(tunnelX - 30, groundY - tunnelH - 95, tunnelW + 60, 48);

      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ HOLLOW TUNNEL OPEN ✨', tunnelX + tunnelW / 2, groundY - tunnelH - 74);

      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('➔ STEP INSIDE TO RETURN TO CATACOMBS', tunnelX + tunnelW / 2, groundY - tunnelH - 58);
    }

    ctx.restore();
  }

  // Draw Ancient Monolith Relief on Far Right (X: 2160, Y: 620)
  private static drawAncientMonolithRelief(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    now: number
  ) {
    const monoX = 2160 - cameraX;
    const floorY = 620 - cameraY;

    if (monoX < -150 || monoX > 1365 + 150) return;

    ctx.save();

    // 1. Stepped Ancient Stone Dias
    ctx.fillStyle = '#062018';
    ctx.fillRect(monoX - 60, floorY - 14, 120, 14);
    ctx.fillStyle = '#0a2e22';
    ctx.fillRect(monoX - 45, floorY - 26, 90, 12);

    // Tall Ancient Obelisk
    ctx.fillStyle = '#07241a';
    ctx.beginPath();
    ctx.moveTo(monoX - 30, floorY - 26);
    ctx.lineTo(monoX - 20, floorY - 240);
    ctx.lineTo(monoX, floorY - 270);
    ctx.lineTo(monoX + 20, floorY - 240);
    ctx.lineTo(monoX + 30, floorY - 26);
    ctx.closePath();
    ctx.fill();

    // Carved Glowing Emerald Runes
    const runeGlow = 0.6 + 0.4 * Math.sin(now * 0.003);
    ctx.fillStyle = `rgba(52, 211, 153, ${runeGlow * 0.7})`;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ᚱ', monoX, floorY - 200);
    ctx.fillText('ᛟ', monoX, floorY - 160);
    ctx.fillText('ᛞ', monoX, floorY - 120);
    ctx.fillText('ᚦ', monoX, floorY - 80);

    ctx.restore();
  }

  // Draw Torch with flickering green toxic flame
  private static drawSkullTorch(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    animTime: number
  ) {
    if (x < -40 || x > 1365 + 40) return;

    ctx.save();

    // Sconce Bracket
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 3, y - 20, 6, 20);
    ctx.fillRect(x - 8, y - 24, 16, 6);

    // Toxic Green Flickering Flame
    const flicker = Math.sin(animTime * 0.01) * 3 + Math.cos(animTime * 0.015) * 2;
    const flameH = 16 + flicker;

    const flameGrad = ctx.createRadialGradient(x, y - 26, 2, x, y - 26, 22);
    flameGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    flameGrad.addColorStop(0.3, 'rgba(110, 231, 183, 0.8)');
    flameGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.4)');
    flameGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');

    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.ellipse(x, y - 26, 14, flameH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Core Flame Spike
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 24);
    ctx.lineTo(x, y - 24 - flameH);
    ctx.lineTo(x + 3, y - 24);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

