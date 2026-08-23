import { Rect } from './types';
import { Player } from './Player';

export interface WarningParticle {
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

export class WarningMarker implements Rect {
  public id: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public radius: number;
  public groundY: number;

  public timer: number = 0;
  public duration: number = 0.85; // Configured reaction time before impact
  public isActive: boolean = true;
  public hasTriggered: boolean = false;

  public onTrigger?: (marker: WarningMarker) => void;
  public particles: WarningParticle[] = [];

  constructor(
    id: string,
    targetX: number,
    groundY: number,
    duration: number = 0.85,
    radius: number = 42,
    onTrigger?: (marker: WarningMarker) => void
  ) {
    this.id = id;
    this.radius = radius;
    this.groundY = groundY;
    this.x = targetX - radius;
    this.y = groundY - 12;
    this.width = radius * 2;
    this.height = 24;
    this.duration = duration;
    this.onTrigger = onTrigger;
  }

  public update(dt: number): boolean {
    if (!this.isActive) return false;

    this.timer += dt;

    // Ambient warning embers rising from the danger zone
    if (Math.random() < 0.45) {
      const centerX = this.x + this.radius;
      this.particles.push({
        x: centerX + (Math.random() - 0.5) * this.radius * 1.5,
        y: this.groundY - 2,
        vx: (Math.random() - 0.5) * 20,
        vy: -40 - Math.random() * 60,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        color: Math.random() > 0.4 ? '#ef4444' : '#f59e0b',
      });
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    if (this.timer >= this.duration && !this.hasTriggered) {
      this.hasTriggered = true;
      if (this.onTrigger) {
        this.onTrigger(this);
      }
      this.isActive = false;
      return false;
    }

    return true;
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const centerX = Math.floor(this.x + this.radius - cameraX);
    const centerY = Math.floor(this.groundY - cameraY);

    ctx.save();

    // Render rising warning embers
    for (const p of this.particles) {
      const px = Math.floor(p.x - cameraX);
      const py = Math.floor(p.y - cameraY);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!this.isActive) {
      ctx.restore();
      return;
    }

    const progress = Math.min(1, this.timer / this.duration);
    const pulse = 0.8 + Math.sin(this.timer * 16) * 0.2;

    // 1. Vertical Targeting Laser / Light Shaft from Ceiling to Ground
    const shaftGrad = ctx.createLinearGradient(0, centerY - 600, 0, centerY);
    shaftGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
    shaftGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.08)');
    shaftGrad.addColorStop(1, `rgba(239, 68, 68, ${0.25 * pulse})`);

    ctx.fillStyle = shaftGrad;
    ctx.beginPath();
    ctx.moveTo(centerX - this.radius * 0.75, centerY - 600);
    ctx.lineTo(centerX + this.radius * 0.75, centerY - 600);
    ctx.lineTo(centerX + this.radius, centerY);
    ctx.lineTo(centerX - this.radius, centerY);
    ctx.closePath();
    ctx.fill();

    // 2. Outer Warning Aura on Floor
    const floorAura = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, this.radius * 1.3);
    floorAura.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
    floorAura.addColorStop(0.6, 'rgba(249, 115, 22, 0.35)');
    floorAura.addColorStop(1, 'rgba(239, 68, 68, 0)');

    ctx.fillStyle = floorAura;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, this.radius * 1.3, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Pulsing Outer Danger Ring
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.7 + pulse * 0.3})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, this.radius * pulse, this.radius * 0.35 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Shrinking Countdown Target Ring (Reaches center exactly at impact!)
    const shrinkRadius = this.radius * (1 - progress * 0.85);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, shrinkRadius, shrinkRadius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Center Danger Reticle / Crosshair
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Horizontal tick
    ctx.moveTo(centerX - 14, centerY);
    ctx.lineTo(centerX + 14, centerY);
    // Vertical tick
    ctx.moveTo(centerX, centerY - 6);
    ctx.lineTo(centerX, centerY + 6);
    ctx.stroke();

    // 6. Danger Warning Pill
    const pillY = centerY - 28;
    ctx.font = '900 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText('⚠️ DANGER', centerX, pillY);

    ctx.restore();
  }
}
