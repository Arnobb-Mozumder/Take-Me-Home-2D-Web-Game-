import { Rect } from './types';
import { Player } from './Player';
import { Football } from './Football';

export interface PotionSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
}

export class HealthPotion implements Rect {
  public id: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public healAmount: number;
  public isCollected: boolean = false;

  private bobTimer: number = 0;
  private glowPulse: number = 0;
  private sparkles: PotionSparkle[] = [];
  private spawnX: number;
  private spawnY: number;

  constructor(id: string, x: number, y: number, healAmount: number = 100, width: number = 32, height: number = 42) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.width = width;
    this.height = height;
    this.healAmount = healAmount;
    this.bobTimer = Math.random() * Math.PI * 2;
  }

  public reset() {
    this.isCollected = false;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.sparkles = [];
  }

  public update(
    dt: number,
    player: Player,
    football: Football,
    onCollect?: (potion: HealthPotion) => void
  ) {
    if (this.isCollected) return;

    this.bobTimer += dt * 3.2;
    this.glowPulse += dt * 4;

    // Ambient floating sparkle motes
    if (Math.random() < 0.35) {
      this.sparkles.push({
        x: this.x + 6 + Math.random() * (this.width - 12),
        y: this.y + this.height - 4,
        vx: (Math.random() - 0.5) * 18,
        vy: -20 - Math.random() * 30,
        size: 2 + Math.random() * 3,
        alpha: 0.9,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.5,
        color: Math.random() > 0.5 ? '#4ade80' : '#86efac',
      });
    }

    // Update Sparkles
    this.sparkles.forEach(s => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life += dt;
      s.alpha = Math.max(0, 1 - s.life / s.maxLife);
    });
    this.sparkles = this.sparkles.filter(s => s.life < s.maxLife);

    // Current floating bob Y
    const currentY = this.y + Math.sin(this.bobTimer) * 5;

    // Check Player Collision
    const playerTouches =
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < currentY + this.height &&
      player.y + player.height > currentY;

    // Check Football Collision (in case player kicks ball through it)
    const ballTouches =
      football.x - football.radius < this.x + this.width &&
      football.x + football.radius > this.x &&
      football.y - football.radius < currentY + this.height &&
      football.y + football.radius > currentY;

    if (playerTouches || ballTouches) {
      this.isCollected = true;
      player.heal(this.healAmount);

      if (onCollect) {
        onCollect(this);
      }
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    showDebugBoxes: boolean = false
  ) {
    if (this.isCollected) return;

    const drawX = this.x - cameraX;
    const drawY = this.y + Math.sin(this.bobTimer) * 5 - cameraY;

    ctx.save();

    // 1. Ambient Sparkle Motes
    this.sparkles.forEach(s => {
      const sx = s.x - cameraX;
      const sy = s.y - cameraY;
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Glowing Emerald Aura
    const pulseFactor = 0.85 + Math.sin(this.glowPulse) * 0.15;
    const auraRadius = (this.width + 16) * pulseFactor;
    const centerX = drawX + this.width / 2;
    const centerY = drawY + this.height / 2 + 2;

    const auraGrad = ctx.createRadialGradient(
      centerX,
      centerY,
      4,
      centerX,
      centerY,
      auraRadius
    );
    auraGrad.addColorStop(0, 'rgba(74, 222, 128, 0.45)');
    auraGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.2)');
    auraGrad.addColorStop(1, 'rgba(22, 101, 52, 0)');

    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Potion Flask Shadow on Platform
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(centerX, this.y + this.height + 6 - cameraY, this.width / 2 + 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1.0;

    // 4. Wooden Stopper Cork
    const corkW = 10;
    const corkH = 6;
    ctx.fillStyle = '#92400e';
    ctx.fillRect(centerX - corkW / 2, drawY, corkW, corkH);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(centerX - corkW / 2 + 1, drawY, corkW - 2, 2);

    // Glass Neck / Collar
    const neckW = 14;
    const neckH = 5;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
    ctx.fillRect(centerX - neckW / 2, drawY + corkH, neckW, neckH);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - neckW / 2, drawY + corkH, neckW, neckH);

    // 5. Rounded Glass Flask Body
    const bodyW = this.width;
    const bodyH = this.height - corkH - neckH;
    const bodyY = drawY + corkH + neckH;

    // Glass Backing
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.roundRect(drawX, bodyY, bodyW, bodyH, 12);
    ctx.fill();

    // Emerald Liquid Gradient
    const liquidGrad = ctx.createLinearGradient(0, bodyY + 4, 0, bodyY + bodyH);
    liquidGrad.addColorStop(0, '#86efac'); // Bright emerald surface
    liquidGrad.addColorStop(0.3, '#22c55e'); // Rich magic green
    liquidGrad.addColorStop(1, '#14532d'); // Deep dark potion depth

    ctx.fillStyle = liquidGrad;
    ctx.beginPath();
    ctx.roundRect(drawX + 2, bodyY + 4, bodyW - 4, bodyH - 6, 10);
    ctx.fill();

    // Liquid Surface Wave / Meniscus
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(centerX, bodyY + 6, bodyW / 2 - 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Golden Heart / Cross Emblem in Flask Center
    const emblemSize = 12;
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;

    // Cross shape
    ctx.fillRect(centerX - 2, centerY - 5, 4, 10);
    ctx.fillRect(centerX - 5, centerY - 2, 10, 4);

    // Glass Reflection Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.roundRect(drawX + 4, bodyY + 6, 4, bodyH - 14, 2);
    ctx.fill();

    // Glass Outer Outline
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(drawX, bodyY, bodyW, bodyH, 12);
    ctx.stroke();

    // 6. Floating Stylized Pill Header Label
    const textY = drawY - 14;
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';

    const labelText = '+100 HP REFILL';
    const textMetrics = ctx.measureText(labelText);
    const pillW = textMetrics.width + 12;
    const pillH = 15;

    ctx.fillStyle = 'rgba(2, 44, 34, 0.85)';
    ctx.beginPath();
    ctx.roundRect(centerX - pillW / 2, textY - 10, pillW, pillH, 7);
    ctx.fill();

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#86efac';
    ctx.fillText(labelText, centerX, textY + 1);

    // Debug Bounding Box
    if (showDebugBoxes) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX, drawY, this.width, this.height);
    }

    ctx.restore();
  }
}
