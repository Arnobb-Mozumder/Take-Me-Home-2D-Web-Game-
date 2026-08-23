import { Platform, Rect } from './types';
import { Player } from './Player';
import { Football } from './Football';
import { BossHole, HoleId } from './BossHole';
import { SaveManager } from './SaveManager';

interface CavernSpore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

interface WaterDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  splashTimer: number;
}

export class BossArena {
  public id = 'ratkeeper-boss-arena';

  // Spatial Dimensions (Enclosed underground cavern for Level 3)
  public leftX: number;
  public rightX: number;
  public floorY: number;
  public ceilingY: number;
  public width: number;
  public height: number;

  // Elevated Combat Platforms (Left Perch, Center High Altar, Right Perch)
  public elevatedPlatforms: { id: string; x: number; y: number; width: number; height: number }[] = [];

  // Reusable Ground Mud Holes for Ratkeeper Boss
  public hole1: BossHole;
  public hole2: BossHole;
  public holes: { HOLE_1: BossHole; HOLE_2: BossHole };

  // Arena Lock & Gate State
  public isLocked: boolean = false;
  public encounterStarted: boolean = false;
  public isDefeated: boolean = false;
  public onStartEncounter?: () => void;

  // Visibility (Always 1.0 in dedicated scene)
  public visibility: number = 1.0;

  // Entrance Barrier (Thorny Ancient Roots / Spikes that grow when locked at the cavern entrance)
  public gateX: number = 100;
  public gateY: number = 470;
  public gateWidth: number = 30;
  public gateHeight: number = 150;
  public gateProgress: number = 0; // 0 = open/recessed, 1 = fully grown/locked

  // Scene Intro Title Card ("The Ratkeeper")
  public sceneTitleTimer: number = 0;
  public readonly sceneTitle: string = 'The Ratkeeper';
  public readonly sceneSubtitle: string = 'Master of the Underground Catacombs';

  // Ambient Visual FX
  private spores: CavernSpore[] = [];
  private waterDrops: WaterDrop[] = [];
  private animTimer: number = 0;

  constructor(
    leftX: number = 0,
    rightX: number = 2360,
    floorY: number = 620,
    ceilingY: number = -320
  ) {
    this.leftX = leftX;
    this.rightX = rightX;
    this.floorY = floorY;
    this.ceilingY = ceilingY;
    this.width = this.rightX - this.leftX;
    this.height = this.floorY - this.ceilingY;

    this.gateX = 220;
    this.gateY = floorY - 180;
    this.gateHeight = 180;

    // All floating platforms removed from the boss room for open arena combat
    this.elevatedPlatforms = [];

    // Place HOLE_1 in left combat wing (680), HOLE_2 in right combat wing (1580)
    this.hole1 = new BossHole('HOLE_1', 680, floorY, 190, 46, 'West Mud Hole');
    this.hole2 = new BossHole('HOLE_2', 1580, floorY, 190, 46, 'East Mud Hole');

    this.holes = {
      HOLE_1: this.hole1,
      HOLE_2: this.hole2,
    };

    // Initialize floating glowing spores across the cavern height
    for (let i = 0; i < 50; i++) {
      this.spores.push({
        x: this.leftX + Math.random() * this.width,
        y: this.ceilingY + 40 + Math.random() * (this.height - 60),
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 14,
        size: 1.5 + Math.random() * 2.8,
        alpha: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Initialize dripping water drops
    const dripPositions = [280, 520, 840, 1180, 1520, 1840, 2140];
    dripPositions.forEach(dx => {
      this.waterDrops.push({
        x: dx,
        y: this.ceilingY + 30 + Math.random() * (this.height - 60),
        speed: 160 + Math.random() * 120,
        length: 5 + Math.random() * 5,
        splashTimer: 0,
      });
    });
  }

  // Get a hole by identifier ('HOLE_1' or 'HOLE_2')
  public getHole(id: HoleId): BossHole {
    return this.holes[id];
  }

  // Check if player is inside the arena
  public isPlayerInside(player: Player): boolean {
    return (
      player.x + player.width > this.leftX &&
      player.x < this.rightX &&
      player.y + player.height > this.ceilingY &&
      player.y < this.floorY + 80
    );
  }

  public update(dt: number, player: Player, football: Football) {
    this.animTimer += dt;
    this.visibility = 1.0;

    // Update ambient mud hole animations
    this.hole1.update(dt);
    this.hole2.update(dt);

    if (this.sceneTitleTimer > 0) {
      this.sceneTitleTimer -= dt;
    }

    // Update floating bioluminescent cavern spores
    for (const s of this.spores) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.phase += dt * 1.5;

      // Wrap around within cavern bounds
      if (s.x < this.leftX) s.x = this.rightX - 10;
      if (s.x > this.rightX) s.x = this.leftX + 10;
      if (s.y < this.ceilingY + 20) s.y = this.floorY - 20;
      if (s.y > this.floorY - 10) s.y = this.ceilingY + 30;
    }

    // Update dripping water drops
    for (const d of this.waterDrops) {
      if (d.splashTimer > 0) {
        d.splashTimer -= dt;
        if (d.splashTimer <= 0) {
          d.y = this.ceilingY + 10 + Math.random() * 30;
        }
      } else {
        d.y += d.speed * dt;
        if (d.y >= this.floorY) {
          d.y = this.floorY;
          d.splashTimer = 0.2 + Math.random() * 0.4;
        }
      }
    }

    // 1. Entrance Detection (Triggers when player moves into arena past X=320)
    if (!this.encounterStarted && !this.isDefeated) {
      if (
        player.x > 320 &&
        player.x < this.rightX - 100 &&
        player.y + player.height >= this.floorY - 180 &&
        player.y <= this.floorY + 20
      ) {
        this.startEncounter(player);
      }
    }

    // 2. Animate Thorny Root Barrier Growing / Receding
    const targetGateProgress = this.isLocked ? 1 : 0;
    if (this.gateProgress < targetGateProgress) {
      this.gateProgress = Math.min(targetGateProgress, this.gateProgress + dt * 2.8);
    } else if (this.gateProgress > targetGateProgress) {
      this.gateProgress = Math.max(targetGateProgress, this.gateProgress - dt * 2.0);
    }

    // 3. Physical Arena Lock Enforcement (Keeps player and ball inside during battle)
    if (this.isLocked) {
      // Enforce Left Boundary Wall during battle at X = 240 (sealing the tunnel entrance)
      if (player.x < 240) {
        player.x = 240;
        if (player.vx < 0) player.vx = 0;
      }
      if (football.x < 240 + football.radius) {
        football.x = 240 + football.radius;
        if (football.vx < 0) football.vx = -football.vx * 0.6;
      }

      // Enforce Right Boundary Wall
      if (player.x + player.width > this.rightX - 20) {
        player.x = this.rightX - 20 - player.width;
        if (player.vx > 0) player.vx = 0;
      }
      if (football.x + football.radius > this.rightX - 20) {
        football.x = this.rightX - 20 - football.radius;
        if (football.vx > 0) football.vx = -football.vx * 0.6;
      }
    }
  }

  // Trigger encounter and lock the arena
  public startEncounter(player?: Player) {
    this.isLocked = true;
    this.encounterStarted = true;
    this.sceneTitleTimer = 4.5;

    if (player) {
      player.showFloatingStatus('⚠️ THE RATKEEPER LAIR', '#ef4444', '#7f1d1d');
    }

    if (this.onStartEncounter) {
      this.onStartEncounter();
    }
  }

  // Hook for when Ratkeeper boss is defeated
  public onBossDefeated(player?: Player) {
    this.isLocked = false;
    this.isDefeated = true;
    this.gateProgress = 0;

    SaveManager.setBossDefeated(true);
    SaveManager.setStoneGateOpen(true);

    if (player) {
      player.showFloatingStatus('🏆 RATKEEPER DEFEATED!', '#22c55e', '#14532d');
    }
  }

  // Reset state if player dies before defeating the boss
  public reset() {
    if (SaveManager.isBossDefeated() || this.isDefeated) {
      this.isDefeated = true;
      this.isLocked = false;
      this.gateProgress = 0;
      return;
    }
    this.isLocked = false;
    this.encounterStarted = false;
    this.sceneTitleTimer = 0;
    this.gateProgress = 0;
  }

  // Solid boundary platforms
  public toPlatforms(): Platform[] {
    const platforms: Platform[] = [];

    // Left Boundary Wall
    platforms.push({
      id: 'arena-left-wall',
      x: this.leftX - 40,
      y: this.ceilingY,
      width: 40,
      height: this.height + 400,
      type: 'wall',
      color: '#020e0a',
      topColor: '#06261c',
    });

    // Vaulted Cavern Ceiling Collider
    platforms.push({
      id: 'arena-ceiling',
      x: this.leftX - 40,
      y: this.ceilingY - 20,
      width: this.width + 80,
      height: 20,
      type: 'ground',
      color: '#020e0a',
      topColor: '#06261c',
    });

    // Solid Cavern Floor
    platforms.push({
      id: 'arena-floor',
      x: this.leftX - 40,
      y: this.floorY,
      width: this.width + 80,
      height: 400,
      type: 'ground',
      color: '#041610',
      topColor: '#0d3829',
    });

    return platforms;
  }

  // =============================================================
  // RENDER COMPLETE BOSS CAVERN ENVIRONMENT
  // =============================================================
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawLeftX = Math.floor(this.leftX - cameraX);
    const drawRightX = Math.floor(this.rightX - cameraX);
    const drawCeilY = Math.floor(this.ceilingY - cameraY);
    const drawFloorY = Math.floor(this.floorY - cameraY);
    const arenaW = this.width;
    const arenaH = this.height;

    if (drawRightX < -200 || drawLeftX > 1365 + 200 || drawFloorY < -100 || drawCeilY > 768 + 100) return;

    ctx.save();

    // 1. DEEP EMERALD CATACOMB MIST & CAVERN SKYLINE GRADIENT
    const bgGrad = ctx.createLinearGradient(0, drawCeilY, 0, drawFloorY);
    bgGrad.addColorStop(0, '#010c08');
    bgGrad.addColorStop(0.35, '#031912');
    bgGrad.addColorStop(0.7, '#072a20');
    bgGrad.addColorStop(0.95, '#052219');
    bgGrad.addColorStop(1, '#02120d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(drawLeftX, drawCeilY, arenaW, arenaH);

    // 2. ATMOSPHERIC GREEN LIGHT SHAFTS & MIST BEAMS
    ctx.save();
    ctx.fillStyle = 'rgba(110, 231, 183, 0.04)';
    const shaftPositions = [400, 750, 1200, 1650, 2000];
    shaftPositions.forEach((sx, idx) => {
      const drawSx = sx - cameraX;
      const sway = Math.sin(this.animTimer * 0.8 + idx) * 20;
      ctx.beginPath();
      ctx.moveTo(drawSx - 40 + sway, drawCeilY);
      ctx.lineTo(drawSx + 40 + sway, drawCeilY);
      ctx.lineTo(drawSx + 120 + sway * 1.5, drawFloorY);
      ctx.lineTo(drawSx - 120 + sway * 1.5, drawFloorY);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    // 3. BACKGROUND DISTANT OVERGROWN PILLARS & ARCHES
    this.drawBackgroundRuins(ctx, cameraX, cameraY, drawCeilY, drawFloorY);

    // 4. CENTRAL HORNED ALTAR IDOL STATUE (X: 1200)
    this.drawCentralIdolStatue(ctx, cameraX, cameraY, drawFloorY);

    // 5. FOREGROUND OVERGROWN COLUMNS WITH IVY & MOSS
    this.drawForegroundColumns(ctx, cameraX, cameraY, drawCeilY, drawFloorY);

    // 5.5 ELEVATED TACTICAL COMBAT PLATFORMS
    this.drawElevatedCombatPlatforms(ctx, cameraX, cameraY);

    // 6. BIOLUMINESCENT MUSHROOM CLUSTERS
    this.drawMushroomColonies(ctx, cameraX, cameraY, drawFloorY);

    // 7. RENDER THE 2 DISTORTED GROUND MUD HOLES
    this.hole1.render(ctx, cameraX, cameraY);
    this.hole2.render(ctx, cameraX, cameraY);

    // 8. OVERGROWN CAVERN CEILING (Hanging Roots, Stalactites, Ivy Vines)
    this.drawCavernCeiling(ctx, drawLeftX, drawRightX, drawCeilY);

    // 9. SUBTERRANEAN ABYSS BENEATH THE PLATFORM
    this.drawSubterraneanAbyss(ctx, drawLeftX, drawRightX, drawFloorY);

    // 10. DRIPPING WATER DROPLETS
    ctx.fillStyle = 'rgba(167, 243, 208, 0.7)';
    for (const d of this.waterDrops) {
      const dx = Math.floor(d.x - cameraX);
      const dy = Math.floor(d.y - cameraY);
      if (dx > -20 && dx < 1365 + 20) {
        if (d.splashTimer > 0) {
          ctx.strokeStyle = 'rgba(167, 243, 208, 0.5)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(dx, drawFloorY, 6, 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(dx, dy);
          ctx.lineTo(dx, dy + d.length);
          ctx.stroke();
        }
      }
    }

    // 11. FLOATING BIOLUMINESCENT SPORES & MOTES
    for (const s of this.spores) {
      const sx = Math.floor(s.x - cameraX);
      const sy = Math.floor(s.y - cameraY);
      if (sx > -20 && sx < 1365 + 20) {
        const pulse = 0.5 + 0.5 * Math.sin(s.phase);
        ctx.fillStyle = `rgba(167, 243, 208, ${s.alpha * pulse})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(52, 211, 153, ${s.alpha * pulse * 0.35})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 12. DYNAMIC THORNY VINE BARRIER (Only when combat arena is locked)
    if (this.gateProgress > 0.01) {
      this.drawLockedThornBarrier(ctx, cameraX, cameraY, drawFloorY);
    }

    ctx.restore();
  }

  // Draw Central Horned Altar / Idol Shrine (Center at X: 1200)
  private drawCentralIdolStatue(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    drawFloorY: number
  ) {
    const cx = Math.floor(1200 - cameraX);
    if (cx < -180 || cx > 1365 + 180) return;

    ctx.save();

    const statueBaseY = drawFloorY;

    // Stepped Stone Pedestal
    ctx.fillStyle = '#062018';
    ctx.fillRect(cx - 50, statueBaseY - 24, 100, 24);
    ctx.fillStyle = '#0a2e22';
    ctx.fillRect(cx - 40, statueBaseY - 44, 80, 20);
    ctx.fillStyle = '#0e3a2c';
    ctx.fillRect(cx - 30, statueBaseY - 60, 60, 16);

    // Weathered Stone Altar Column Body
    ctx.fillStyle = '#0a2e22';
    ctx.beginPath();
    ctx.moveTo(cx - 24, statueBaseY - 60);
    ctx.lineTo(cx - 18, statueBaseY - 110);
    ctx.lineTo(cx + 18, statueBaseY - 110);
    ctx.lineTo(cx + 24, statueBaseY - 60);
    ctx.closePath();
    ctx.fill();

    // Ancient Horned Crescent Crown
    ctx.fillStyle = '#0f4030';
    ctx.beginPath();
    // Left Horn
    ctx.moveTo(cx - 16, statueBaseY - 110);
    ctx.quadraticCurveTo(cx - 36, statueBaseY - 135, cx - 22, statueBaseY - 152);
    ctx.quadraticCurveTo(cx - 26, statueBaseY - 130, cx - 8, statueBaseY - 118);
    // Right Horn
    ctx.lineTo(cx + 8, statueBaseY - 118);
    ctx.quadraticCurveTo(cx + 26, statueBaseY - 130, cx + 22, statueBaseY - 152);
    ctx.quadraticCurveTo(cx + 36, statueBaseY - 135, cx + 16, statueBaseY - 110);
    ctx.closePath();
    ctx.fill();

    // Central Glowing Cyclopean Eye / Rune Orb
    const pulse = 0.6 + 0.4 * Math.sin(this.animTimer * 2.0);
    const eyeY = statueBaseY - 112;

    // Glow Halo
    const eyeGrad = ctx.createRadialGradient(cx, eyeY, 2, cx, eyeY, 32);
    eyeGrad.addColorStop(0, `rgba(167, 243, 208, ${pulse * 0.8})`);
    eyeGrad.addColorStop(0.5, `rgba(52, 211, 153, ${pulse * 0.4})`);
    eyeGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');
    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.arc(cx, eyeY, 32, 0, Math.PI * 2);
    ctx.fill();

    // Eye Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, eyeY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Overgrown Moss & Ivy Drooping over Altar
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(cx - 25, statueBaseY - 44, 18, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 22, statueBaseY - 30, 20, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, statueBaseY - 60, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw Background Ruin Columns & Misty Arches
  private drawBackgroundRuins(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    drawCeilY: number,
    drawFloorY: number
  ) {
    const bgCols = [350, 600, 850, 1550, 1800, 2050];

    ctx.save();
    bgCols.forEach(bx => {
      const drawBx = Math.floor(bx - cameraX);
      if (drawBx > -120 && drawBx < 1365 + 120) {
        const pillarH = drawFloorY - drawCeilY;
        ctx.fillStyle = '#041d15';
        ctx.fillRect(drawBx - 16, drawCeilY, 32, pillarH);

        ctx.fillStyle = '#06281e';
        ctx.fillRect(drawBx - 22, drawCeilY, 44, 16);
        ctx.fillRect(drawBx - 22, drawFloorY - 14, 44, 14);

        ctx.strokeStyle = 'rgba(2, 20, 14, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(drawBx - 6, drawCeilY + 16);
        ctx.lineTo(drawBx - 6, drawFloorY - 14);
        ctx.moveTo(drawBx + 6, drawCeilY + 16);
        ctx.lineTo(drawBx + 6, drawFloorY - 14);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // Draw Foreground Columns with Hanging Ivy & Lichen
  private drawForegroundColumns(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    drawCeilY: number,
    drawFloorY: number
  ) {
    const columns = [
      { x: 240, w: 60, h: drawFloorY - drawCeilY },
      { x: 2160, w: 60, h: drawFloorY - drawCeilY },
    ];

    ctx.save();
    columns.forEach(col => {
      const cx = Math.floor(col.x - cameraX);
      if (cx > -140 && cx < 1365 + 140) {
        ctx.fillStyle = '#07241a';
        ctx.fillRect(cx - col.w / 2, drawCeilY, col.w, col.h);

        ctx.fillStyle = '#0a3225';
        ctx.fillRect(cx - col.w / 2 - 12, drawFloorY - 32, col.w + 24, 32);
        ctx.fillRect(cx - col.w / 2 - 6, drawFloorY - 48, col.w + 12, 16);

        ctx.fillRect(cx - col.w / 2 - 12, drawCeilY, col.w + 24, 24);
        ctx.fillRect(cx - col.w / 2 - 6, drawCeilY + 24, col.w + 12, 14);

        ctx.strokeStyle = '#03140e';
        ctx.lineWidth = 3;
        for (let gx = cx - col.w / 2 + 12; gx <= cx + col.w / 2 - 12; gx += 14) {
          ctx.beginPath();
          ctx.moveTo(gx, drawCeilY + 38);
          ctx.lineTo(gx, drawFloorY - 48);
          ctx.stroke();
        }

        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cx - 14, drawCeilY);
        ctx.quadraticCurveTo(cx + 26, drawCeilY + 120, cx - 18, drawCeilY + 220);
        ctx.quadraticCurveTo(cx + 20, drawCeilY + 340, cx - 10, drawFloorY - 40);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        for (let ly = drawCeilY + 30; ly < drawFloorY - 50; ly += 35) {
          const lx = cx + Math.sin(ly * 0.03) * 16;
          ctx.beginPath();
          ctx.ellipse(lx + 6, ly, 8, 4.5, Math.PI / 4, 0, Math.PI * 2);
          ctx.ellipse(lx - 5, ly + 8, 7, 4, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    ctx.restore();
  }

  // Draw Glowing Bioluminescent Mushroom Colonies
  private drawMushroomColonies(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    drawFloorY: number
  ) {
    const patches = [
      { x: 320, count: 6 },
      { x: 520, count: 8 },
      { x: 920, count: 7 },
      { x: 1420, count: 8 },
      { x: 1860, count: 6 },
      { x: 2100, count: 8 },
    ];

    ctx.save();
    patches.forEach(p => {
      const baseX = Math.floor(p.x - cameraX);
      if (baseX > -80 && baseX < 1365 + 80) {
        ctx.fillStyle = '#0a2e22';
        ctx.beginPath();
        ctx.ellipse(baseX, drawFloorY, 32, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < p.count; i++) {
          const mx = baseX - 24 + i * 7 + (i % 2) * 3;
          const stemH = 10 + (i % 3) * 6;
          const my = drawFloorY - 2;
          const capW = 7 + (i % 3) * 4;
          const capH = 5 + (i % 2) * 3;

          ctx.strokeStyle = '#d1fae5';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.quadraticCurveTo(mx + ((i % 2 === 0) ? 2 : -2), my - stemH * 0.5, mx, my - stemH);
          ctx.stroke();

          const pulse = 0.75 + 0.25 * Math.sin(this.animTimer * 3 + p.x + i);
          ctx.fillStyle = `rgba(167, 243, 208, ${pulse})`;
          ctx.shadowColor = '#6ee7b7';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.ellipse(mx, my - stemH, capW / 2, capH / 2, 0, Math.PI, 0, false);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    });
    ctx.restore();
  }

  // Draw Overgrown Cavern Ceiling with Stalactites & Hanging Roots
  private drawCavernCeiling(
    ctx: CanvasRenderingContext2D,
    drawLeftX: number,
    drawRightX: number,
    drawCeilY: number
  ) {
    ctx.save();

    ctx.fillStyle = '#020e0a';
    ctx.fillRect(drawLeftX, drawCeilY - 30, this.width, 30);

    ctx.fillStyle = '#062018';
    for (let x = drawLeftX; x < drawRightX; x += 36) {
      const stalactiteH = 20 + Math.sin(x * 0.05) * 16 + (x % 30);
      ctx.beginPath();
      ctx.moveTo(x, drawCeilY);
      ctx.lineTo(x + 18, drawCeilY + stalactiteH);
      ctx.lineTo(x + 36, drawCeilY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#1e1b18';
    ctx.lineWidth = 2.5;
    for (let rx = drawLeftX + 20; rx < drawRightX; rx += 70) {
      const rootLen = 40 + Math.sin(rx * 0.08) * 35;
      ctx.beginPath();
      ctx.moveTo(rx, drawCeilY);
      ctx.quadraticCurveTo(rx + 10, drawCeilY + rootLen * 0.5, rx - 4, drawCeilY + rootLen);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw Subterranean Abyss Beneath Platform
  private drawSubterraneanAbyss(
    ctx: CanvasRenderingContext2D,
    drawLeftX: number,
    drawRightX: number,
    drawFloorY: number
  ) {
    ctx.save();

    ctx.fillStyle = '#0a2e22';
    ctx.fillRect(drawLeftX, drawFloorY, this.width, 18);

    ctx.fillStyle = '#15803d';
    ctx.fillRect(drawLeftX, drawFloorY, this.width, 4);

    ctx.strokeStyle = '#041710';
    ctx.lineWidth = 2;
    for (let bx = drawLeftX + 40; bx < drawRightX; bx += 55) {
      ctx.beginPath();
      ctx.moveTo(bx, drawFloorY);
      ctx.lineTo(bx, drawFloorY + 18);
      ctx.stroke();
    }

    const underY = drawFloorY + 18;
    ctx.fillStyle = '#03140e';
    for (let sx = drawLeftX; sx < drawRightX; sx += 28) {
      const spikeH = 22 + Math.sin(sx * 0.06) * 18 + (sx % 20);
      ctx.beginPath();
      ctx.moveTo(sx, underY);
      ctx.lineTo(sx + 14, underY + spikeH);
      ctx.lineTo(sx + 28, underY);
      ctx.closePath();
      ctx.fill();
    }

    const abyssGrad = ctx.createLinearGradient(0, underY + 20, 0, underY + 250);
    abyssGrad.addColorStop(0, '#020b08');
    abyssGrad.addColorStop(0.6, '#010604');
    abyssGrad.addColorStop(1, '#000000');
    ctx.fillStyle = abyssGrad;
    ctx.fillRect(drawLeftX, underY + 30, this.width, 250);

    ctx.restore();
  }

  // Draw Locked Thorny Root Barrier at Entrance
  private drawLockedThornBarrier(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    drawFloorY: number
  ) {
    const gateDrawX = Math.floor(this.gateX - cameraX);
    const growthH = Math.round(this.gateHeight * this.gateProgress);
    const topY = drawFloorY - growthH;

    ctx.save();

    ctx.fillStyle = '#1e1022';
    ctx.fillRect(gateDrawX + 4, topY, this.gateWidth - 8, growthH);

    ctx.strokeStyle = '#581c87';
    ctx.lineWidth = 3;
    for (let vx = gateDrawX + 6; vx <= gateDrawX + this.gateWidth - 6; vx += 8) {
      ctx.beginPath();
      ctx.moveTo(vx, drawFloorY);
      ctx.lineTo(vx + ((vx % 2 === 0) ? 4 : -4), topY);
      ctx.stroke();
    }

    ctx.fillStyle = '#c084fc';
    for (let ty = topY + 12; ty < drawFloorY; ty += 18) {
      ctx.beginPath();
      ctx.moveTo(gateDrawX + 4, ty);
      ctx.lineTo(gateDrawX - 6, ty - 4);
      ctx.lineTo(gateDrawX + 4, ty - 8);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(gateDrawX + this.gateWidth - 4, ty + 6);
      ctx.lineTo(gateDrawX + this.gateWidth + 6, ty + 2);
      ctx.lineTo(gateDrawX + this.gateWidth - 4, ty - 2);
      ctx.closePath();
      ctx.fill();
    }

    const runePulse = 0.6 + 0.4 * Math.sin(this.animTimer * 4);
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 12;
    ctx.fillStyle = `rgba(192, 132, 252, ${runePulse})`;
    ctx.beginPath();
    ctx.arc(gateDrawX + this.gateWidth / 2, topY - 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // Draw Elevated Combat Platforms
  private drawElevatedCombatPlatforms(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    ctx.save();

    for (const plat of this.elevatedPlatforms) {
      const drawX = Math.floor(plat.x - cameraX);
      const drawY = Math.floor(plat.y - cameraY);

      if (drawX + plat.width < -50 || drawX > 1365 + 50) continue;

      const corbelW = 20;
      const corbelH = 26;
      [drawX + 16, drawX + plat.width - 36].forEach(cx => {
        ctx.fillStyle = '#062018';
        ctx.strokeStyle = '#02120d';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, drawY + plat.height);
        ctx.lineTo(cx + corbelW, drawY + plat.height);
        ctx.lineTo(cx + corbelW / 2, drawY + plat.height + corbelH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0a2e22';
        ctx.fillRect(cx + 4, drawY + plat.height + 4, corbelW - 8, 6);
      });

      const slabGrad = ctx.createLinearGradient(0, drawY, 0, drawY + plat.height);
      slabGrad.addColorStop(0, '#103f31');
      slabGrad.addColorStop(0.5, '#0a2e22');
      slabGrad.addColorStop(1, '#051c14');
      ctx.fillStyle = slabGrad;
      ctx.fillRect(drawX, drawY, plat.width, plat.height);

      ctx.strokeStyle = '#1b5e48';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX, drawY, plat.width, plat.height);

      ctx.strokeStyle = '#041610';
      ctx.lineWidth = 1.5;
      const brickSpan = 32;
      for (let bx = drawX + brickSpan; bx < drawX + plat.width - 10; bx += brickSpan) {
        ctx.beginPath();
        ctx.moveTo(bx, drawY + 4);
        ctx.lineTo(bx, drawY + plat.height);
        ctx.stroke();
      }

      const runeGlow = 0.5 + 0.5 * Math.sin(this.animTimer * 2.5 + plat.x * 0.01);
      ctx.fillStyle = `rgba(52, 211, 153, ${0.4 * runeGlow})`;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      for (let rx = drawX + 22; rx < drawX + plat.width - 15; rx += 36) {
        ctx.fillText('ᚱ', rx, drawY + plat.height - 6);
      }

      const mossHeight = 7;
      const mossGrad = ctx.createLinearGradient(0, drawY, 0, drawY + mossHeight);
      mossGrad.addColorStop(0, '#4ade80');
      mossGrad.addColorStop(0.6, '#22c55e');
      mossGrad.addColorStop(1, '#15803d');

      ctx.fillStyle = mossGrad;
      ctx.fillRect(drawX - 2, drawY, plat.width + 4, mossHeight);

      ctx.fillStyle = '#22c55e';
      for (let mx = drawX + 4; mx < drawX + plat.width - 4; mx += 10) {
        const tuftH = 4 + ((mx * 7) % 5);
        ctx.beginPath();
        ctx.moveTo(mx, drawY + mossHeight);
        ctx.lineTo(mx + 4, drawY + mossHeight + tuftH);
        ctx.lineTo(mx + 8, drawY + mossHeight);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1.8;
      const vineSpacing = 28;
      for (let vx = drawX + 18; vx < drawX + plat.width - 12; vx += vineSpacing) {
        const vLen = 14 + ((vx * 13) % 18);
        const vSway = Math.sin(this.animTimer * 1.5 + vx) * 3;
        ctx.beginPath();
        ctx.moveTo(vx, drawY + plat.height);
        ctx.quadraticCurveTo(vx + vSway, drawY + plat.height + vLen / 2, vx + vSway * 1.5, drawY + plat.height + vLen);
        ctx.stroke();

        ctx.fillStyle = '#6ee7b7';
        ctx.beginPath();
        ctx.arc(vx + vSway * 1.5, drawY + plat.height + vLen, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#86efac';
      ctx.fillRect(drawX, drawY, plat.width, 2);
    }

    ctx.restore();
  }

  // Render Cinematic "The Ratkeeper" Scene Title Banner Overlay
  public renderSceneBanner(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    if (this.sceneTitleTimer <= 0) return;

    ctx.save();

    let alpha = 1;
    if (this.sceneTitleTimer > 3.8) {
      alpha = (4.5 - this.sceneTitleTimer) / 0.7;
    } else if (this.sceneTitleTimer < 1.0) {
      alpha = this.sceneTitleTimer / 1.0;
    }
    alpha = Math.max(0, Math.min(1, alpha));

    ctx.globalAlpha = alpha;

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight * 0.28;

    const bandH = 86;
    const grad = ctx.createLinearGradient(0, centerY - bandH / 2, 0, centerY + bandH / 2);
    grad.addColorStop(0, 'rgba(2, 14, 10, 0)');
    grad.addColorStop(0.2, 'rgba(2, 14, 10, 0.92)');
    grad.addColorStop(0.8, 'rgba(2, 14, 10, 0.92)');
    grad.addColorStop(1, 'rgba(2, 14, 10, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, centerY - bandH / 2, canvasWidth, bandH);

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 180, centerY - 24);
    ctx.lineTo(centerX + 180, centerY - 24);
    ctx.moveTo(centerX - 120, centerY + 28);
    ctx.lineTo(centerX + 120, centerY + 28);
    ctx.stroke();

    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE RATKEEPER', centerX, centerY + 2);

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('— MASTER OF THE UNDERGROUND CATACOMBS —', centerX, centerY + 22);

    ctx.restore();
  }
}
