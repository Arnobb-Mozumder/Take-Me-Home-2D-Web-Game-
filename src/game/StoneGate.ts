import { Platform, Rect } from './types';
import { Player } from './Player';
import { Football } from './Football';

export type GateState = 'GATE_LOCKED' | 'GATE_OPENING' | 'GATE_OPEN';

export class StoneGate implements Rect {
  public id = 'summit-stone-gate';
  public x: number;
  public y: number; // Top of gate arch
  public width: number;
  public height: number;
  public groundY: number;

  public state: GateState = 'GATE_LOCKED';
  public openProgress: number = 0; // 0 (fully closed) to 1 (fully open)
  public runeGlowTimer: number = 0;
  public rumbleTimer: number = 0;
  public messageAlpha: number = 0;

  constructor(x: number = 8180, groundY: number = 110, width: number = 80, height: number = 520) {
    this.x = x;
    this.groundY = groundY;
    this.width = width;
    this.height = height;
    // Spans from high in the sky (groundY - height) down to groundY
    this.y = groundY - height;
  }

  public update(dt: number, player: Player, football: Football) {
    this.runeGlowTimer += dt * 2.5;

    // Check player proximity for warning message
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const gateCenterX = this.x + this.width / 2;
    const gateCenterY = this.groundY - 80;

    const distX = Math.abs(playerCenterX - gateCenterX);
    const distY = Math.abs(playerCenterY - gateCenterY);

    if (distX < 180 && distY < 200 && this.state === 'GATE_LOCKED') {
      this.messageAlpha = Math.min(1, this.messageAlpha + dt * 4);
    } else {
      this.messageAlpha = Math.max(0, this.messageAlpha - dt * 3);
    }

    if (this.state === 'GATE_OPENING') {
      this.rumbleTimer += dt;
      this.openProgress += dt * 0.4; // 2.5s to fully open
      if (this.openProgress >= 1) {
        this.openProgress = 1;
        this.state = 'GATE_OPEN';
      }
    }
  }

  public unlock() {
    if (this.state === 'GATE_LOCKED') {
      this.state = 'GATE_OPENING';
      this.rumbleTimer = 0;
    }
  }

  // Returns solid platform collision box if gate is locked or still opening
  public toPlatform(): Platform | null {
    if (this.state === 'GATE_OPEN') return null;

    // Lift collision box upward as it opens
    const currentH = this.height * (1 - this.openProgress);
    if (currentH <= 24) return null;

    return {
      id: this.id,
      x: this.x,
      y: this.y - this.height * this.openProgress,
      width: this.width,
      height: this.height + 60, // Extend into ground to prevent tunneling
      type: 'wall',
      color: '#0f172a',
      topColor: '#1e293b',
    };
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);
    const drawGroundY = Math.floor(this.groundY - cameraY);

    if (drawX < -200 || drawX > 1365 + 200) return;

    ctx.save();

    const pillarW = 24;
    const archH = 42;

    // 1. Heavy Weathered Stone Frame Pillars (Left & Right)
    // Left Frame Pillar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX - pillarW, drawY - 24, pillarW, this.height + 40);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX - pillarW + 4, drawY - 20, pillarW - 8, this.height + 32);

    // Right Frame Pillar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX + this.width, drawY - 24, pillarW, this.height + 40);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX + this.width + 4, drawY - 20, pillarW - 8, this.height + 32);

    // Pillar Carved Inscriptions
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    for (let py = drawY; py < drawGroundY; py += 36) {
      ctx.strokeRect(drawX - pillarW + 4, py, pillarW - 8, 24);
      ctx.strokeRect(drawX + this.width + 4, py, pillarW - 8, 24);
    }

    // Top Heavy Stone Lintel / Archway
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX - pillarW - 8, drawY - archH, this.width + pillarW * 2 + 16, archH);
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3;
    ctx.strokeRect(drawX - pillarW - 8, drawY - archH, this.width + pillarW * 2 + 16, archH);

    // Overgrown Ancient Moss on Top Lintel
    ctx.fillStyle = '#15803d';
    ctx.fillRect(drawX - pillarW - 8, drawY - archH, this.width + pillarW * 2 + 16, 8);
    ctx.beginPath();
    ctx.arc(drawX + this.width / 2 - 24, drawY - archH + 6, 10, 0, Math.PI);
    ctx.arc(drawX + this.width / 2 + 24, drawY - archH + 6, 12, 0, Math.PI);
    ctx.fill();

    // 2. Sliding Solid Heavy Stone Slab Portcullis
    const slideOffset = this.height * this.openProgress;
    const slabY = drawY - slideOffset;

    ctx.save();
    // Clip inside the archway channel
    ctx.beginPath();
    ctx.rect(drawX, drawY - 24, this.width, this.height + 40);
    ctx.clip();

    // Dark ancient stone slab body
    ctx.fillStyle = '#090d16';
    ctx.fillRect(drawX, slabY, this.width, this.height);

    // Horizontal Brick Seam Grooves
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    for (let sy = slabY; sy < slabY + this.height; sy += 32) {
      ctx.beginPath();
      ctx.moveTo(drawX, sy);
      ctx.lineTo(drawX + this.width, sy);
      ctx.stroke();
    }

    // Heavy Forged Dark Iron Reinforcement Bands
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX + 6, slabY + 16, this.width - 12, 10);
    ctx.fillRect(drawX + 6, slabY + this.height - 48, this.width - 12, 10);
    ctx.fillRect(drawX + 6, slabY + this.height - 180, this.width - 12, 10);

    // Iron Rivets on Bands
    ctx.fillStyle = '#475569';
    for (let rx = drawX + 14; rx < drawX + this.width - 10; rx += 18) {
      ctx.fillRect(rx, slabY + 18, 5, 5);
      ctx.fillRect(rx, slabY + this.height - 46, 5, 5);
      ctx.fillRect(rx, slabY + this.height - 178, 5, 5);
    }

    // 3. ANCIENT MYSTIC GLOWING RUNIC LOCK SEAL
    const pulse = 0.6 + 0.4 * Math.sin(this.runeGlowTimer);
    const runeColor = this.state === 'GATE_LOCKED' ? `rgba(239, 68, 68, ${pulse})` : `rgba(74, 222, 128, ${pulse})`;
    const midX = drawX + this.width / 2;
    const midY = slabY + this.height - 100; // Near player eye level

    ctx.strokeStyle = runeColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = this.state === 'GATE_LOCKED' ? '#ef4444' : '#22c55e';
    ctx.shadowBlur = 14;

    // Runic Outer Diamond
    ctx.beginPath();
    ctx.moveTo(midX, midY - 32);
    ctx.lineTo(midX + 22, midY);
    ctx.lineTo(midX, midY + 32);
    ctx.lineTo(midX - 22, midY);
    ctx.closePath();
    ctx.stroke();

    // Runic Inner Cross
    ctx.beginPath();
    ctx.moveTo(midX, midY - 40);
    ctx.lineTo(midX, midY + 40);
    ctx.moveTo(midX - 28, midY);
    ctx.lineTo(midX + 28, midY);
    ctx.stroke();

    // Central Padlock Body Sigil
    ctx.fillStyle = runeColor;
    ctx.beginPath();
    ctx.roundRect(midX - 10, midY - 4, 20, 16, 3);
    ctx.fill();

    // Padlock Shackle Loop
    ctx.strokeStyle = runeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(midX, midY - 4, 7, Math.PI, 0);
    ctx.stroke();

    // Keyhole Dot
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(midX, midY + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 4. Heavy Stone Bevel Outlines
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3;
    ctx.strokeRect(drawX - pillarW, drawY - 24, pillarW, this.height + 40);
    ctx.strokeRect(drawX + this.width, drawY - 24, pillarW, this.height + 40);

    ctx.restore();
  }
}

