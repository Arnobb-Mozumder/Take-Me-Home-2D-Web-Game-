import { Platform, Rect } from './types';
import { Player } from './Player';
import { Football } from './Football';

export type GateState = 'GATE_LOCKED' | 'GATE_OPENING' | 'GATE_OPEN';

export class StoneGate implements Rect {
  public id = 'summit-stone-gate';
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public groundY: number;

  public state: GateState = 'GATE_LOCKED';
  public openProgress: number = 0; // 0 (fully closed) to 1 (fully open)
  public runeGlowTimer: number = 0;
  public rumbleTimer: number = 0;
  public messageAlpha: number = 0;

  constructor(x: number = 8200, groundY: number = 110, width: number = 70, height: number = 240) {
    this.x = x;
    this.groundY = groundY;
    this.width = width;
    this.height = height;
    // Spans from high in the sky (groundY - height) down into the ground
    this.y = groundY - height;
  }

  public update(dt: number, player: Player, football: Football) {
    this.runeGlowTimer += dt * 2.5;

    // Check player proximity for warning message
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const gateCenterX = this.x + this.width / 2;
    const gateCenterY = this.y + this.height / 2;

    const distX = Math.abs(playerCenterX - gateCenterX);
    const distY = Math.abs(playerCenterY - gateCenterY);

    if (distX < 150 && distY < 200 && this.state === 'GATE_LOCKED') {
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
    if (currentH <= 16) return null;

    return {
      id: this.id,
      x: this.x,
      y: this.y - this.height * this.openProgress,
      width: this.width,
      height: this.height + 40, // Extend slightly into ground to prevent tunneling
      type: 'wall',
      color: '#1e293b',
      topColor: '#334155',
    };
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);
    const drawGroundY = Math.floor(this.groundY - cameraY);

    if (drawX < -150 || drawX > 1365 + 150) return;

    ctx.save();

    // 1. Heavy Stone Frame Pillars (Left & Right)
    const pillarW = 20;
    const archH = 34;

    // Left Pillar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX - pillarW, drawY - 20, pillarW, this.height + 30);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX - pillarW + 4, drawY - 16, pillarW - 8, this.height + 22);

    // Right Pillar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(drawX + this.width, drawY - 20, pillarW, this.height + 30);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX + this.width + 4, drawY - 16, pillarW - 8, this.height + 22);

    // Top Stone Arch / Lintel
    ctx.fillStyle = '#334155';
    ctx.fillRect(drawX - pillarW - 6, drawY - 32, this.width + pillarW * 2 + 12, archH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(drawX - pillarW - 6, drawY - 32, this.width + pillarW * 2 + 12, archH);

    // Moss / Ivy on Top Lintel
    ctx.fillStyle = '#15803d';
    ctx.fillRect(drawX - pillarW - 6, drawY - 32, this.width + pillarW * 2 + 12, 6);
    ctx.beginPath();
    ctx.arc(drawX + this.width / 2 - 20, drawY - 26, 8, 0, Math.PI);
    ctx.arc(drawX + this.width / 2 + 20, drawY - 26, 10, 0, Math.PI);
    ctx.fill();

    // 2. Sliding Solid Stone Portcullis Slab
    const slideOffset = this.height * this.openProgress;
    const slabY = drawY - slideOffset;

    ctx.save();
    // Clip to arch opening area
    ctx.beginPath();
    ctx.rect(drawX, drawY - 20, this.width, this.height + 30);
    ctx.clip();

    // Dark ancient stone slab body
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX, slabY, this.width, this.height);

    // Stone brick seam lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for (let sy = slabY; sy < slabY + this.height; sy += 28) {
      ctx.beginPath();
      ctx.moveTo(drawX, sy);
      ctx.lineTo(drawX + this.width, sy);
      ctx.stroke();
    }

    // Carved iron braces
    ctx.fillStyle = '#334155';
    ctx.fillRect(drawX + 8, slabY + 12, this.width - 16, 8);
    ctx.fillRect(drawX + 8, slabY + this.height - 40, this.width - 16, 8);
    ctx.fillRect(drawX + 8, slabY + this.height / 2, this.width - 16, 8);

    // Ancient Glowing Runes
    const pulse = 0.55 + 0.45 * Math.sin(this.runeGlowTimer);
    const runeColor = this.state === 'GATE_LOCKED' ? `rgba(239, 68, 68, ${pulse})` : `rgba(74, 222, 128, ${pulse})`;

    ctx.strokeStyle = runeColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = this.state === 'GATE_LOCKED' ? '#ef4444' : '#22c55e';
    ctx.shadowBlur = 12;

    // Center Ancient Rune Sigil (Diamond & Cross)
    const midY = slabY + this.height / 2;
    const midX = drawX + this.width / 2;

    ctx.beginPath();
    ctx.moveTo(midX, midY - 26);
    ctx.lineTo(midX + 16, midY);
    ctx.lineTo(midX, midY + 26);
    ctx.lineTo(midX - 16, midY);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(midX, midY - 34);
    ctx.lineTo(midX, midY + 34);
    ctx.moveTo(midX - 22, midY);
    ctx.lineTo(midX + 22, midY);
    ctx.stroke();

    // Eye Sigil in center
    ctx.fillStyle = runeColor;
    ctx.beginPath();
    ctx.arc(midX, midY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Stone Frame Bevels
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(drawX - pillarW, drawY - 20, pillarW, this.height + 30);
    ctx.strokeRect(drawX + this.width, drawY - 20, pillarW, this.height + 30);

    // 3. Proximity Warning HUD Banner (When player approaches locked gate)
    if (this.messageAlpha > 0.01 && this.state === 'GATE_LOCKED') {
      ctx.save();
      ctx.globalAlpha = this.messageAlpha;

      const badgeW = 260;
      const badgeH = 54;
      const badgeX = drawX + this.width / 2 - badgeW / 2;
      const badgeY = drawGroundY - this.height - 40;

      // Glow Box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Text Warning
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔒 ANCIENT SEAL ACTIVE', badgeX + badgeW / 2, badgeY + 20);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9.5px monospace';
      ctx.fillText('BOSS MUST BE DEFEATED IN CATACOMBS', badgeX + badgeW / 2, badgeY + 38);

      ctx.restore();
    }

    ctx.restore();
  }
}
