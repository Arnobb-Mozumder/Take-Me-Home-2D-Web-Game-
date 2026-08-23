import { Rect } from './types';

export type HoleId = 'HOLE_1' | 'HOLE_2';

export interface HoleWorldPosition {
  id: HoleId;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  groundX: number;
  groundY: number;
  enterPosition: { x: number; y: number };
  exitPosition: { x: number; y: number };
}

interface MudBubble {
  relX: number; // 0 to 1
  relY: number; // 0 to 1
  radius: number;
  maxRadius: number;
  speed: number;
  popTimer: number;
  alpha: number;
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
}

export class BossHole implements Rect {
  public id: HoleId;
  public label: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public groundY: number;

  public isActive: boolean = true;
  public isOccupied: boolean = false;

  private pulseTimer: number = 0;
  private rippleTimer: number = 0;
  private bubbles: MudBubble[] = [];
  private dustParticles: DustParticle[] = [];
  private rimPoints: { angle: number; rOffset: number }[] = [];

  constructor(
    id: HoleId,
    centerX: number,
    groundY: number = 1020,
    width: number = 180,
    height: number = 44,
    label: string = id === 'HOLE_1' ? 'West Mud Burrow' : 'East Mud Burrow'
  ) {
    this.id = id;
    this.width = width;
    this.height = height;
    this.groundY = groundY;
    this.x = centerX - width / 2;
    // Sit directly centered on the ground line (partially recessed into the floor)
    this.y = groundY - height * 0.45;
    this.label = label;

    // Generate irregular, distorted organic rim contour
    const numPoints = 18;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const rOffset = (Math.random() - 0.5) * 0.22; // +/- 11% distortion
      this.rimPoints.push({ angle, rOffset });
    }

    // Initialize mud bubbles
    for (let i = 0; i < 7; i++) {
      this.bubbles.push(this.createBubble(Math.random()));
    }

    // Initialize floating dust & dirt spores
    for (let i = 0; i < 14; i++) {
      this.dustParticles.push(this.createDustParticle(true));
    }
  }

  private createBubble(progress: number = 0): MudBubble {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 0.72; // Keep within elliptical pool
    const relX = 0.5 + Math.cos(angle) * dist * 0.44;
    const relY = 0.5 + Math.sin(angle) * dist * 0.38;
    const maxRadius = 3.5 + Math.random() * 5.5;

    return {
      relX,
      relY,
      radius: progress * maxRadius,
      maxRadius,
      speed: 0.6 + Math.random() * 1.0,
      popTimer: 0,
      alpha: 0.7 + Math.random() * 0.3,
    };
  }

  private createDustParticle(randomLife: boolean = false): DustParticle {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (this.width * 0.55);
    const px = this.x + this.width / 2 + Math.cos(angle) * dist;
    const py = this.groundY + Math.sin(angle) * (this.height * 0.35) - Math.random() * 12;
    const maxLife = 2.0 + Math.random() * 2.5;

    return {
      x: px,
      y: py,
      vx: (Math.random() - 0.5) * 16,
      vy: -6 - Math.random() * 14,
      size: 1.8 + Math.random() * 3.2,
      alpha: 0,
      maxAlpha: 0.25 + Math.random() * 0.35,
      life: randomLife ? Math.random() * maxLife : 0,
      maxLife,
    };
  }

  // Returns world position interface for Ratkeeper AI boss transitions
  public get worldPosition(): HoleWorldPosition {
    const centerX = this.x + this.width / 2;
    const centerY = this.groundY;
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      centerX,
      centerY,
      groundX: centerX,
      groundY: this.groundY,
      enterPosition: { x: centerX, y: this.groundY },
      exitPosition: { x: centerX, y: this.groundY - 10 },
    };
  }

  public get enterPosition(): { x: number; y: number } {
    return { x: this.x + this.width / 2, y: this.groundY };
  }

  public get exitPosition(): { x: number; y: number } {
    return { x: this.x + this.width / 2, y: this.groundY - 10 };
  }

  public update(dt: number) {
    this.pulseTimer += dt * 2.5;
    this.rippleTimer += dt * 3.0;

    // Update mud bubbles
    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];
      if (b.popTimer > 0) {
        b.popTimer -= dt * 4;
        b.alpha -= dt * 3;
        if (b.popTimer <= 0 || b.alpha <= 0) {
          this.bubbles[i] = this.createBubble(0);
        }
      } else {
        b.radius += b.speed * dt * 5;
        if (b.radius >= b.maxRadius) {
          b.popTimer = 0.25; // Trigger pop
        }
      }
    }

    // Update ambient dust and dirt particles
    for (let i = 0; i < this.dustParticles.length; i++) {
      const p = this.dustParticles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Fade in then out
      const progress = p.life / p.maxLife;
      if (progress < 0.25) {
        p.alpha = (progress / 0.25) * p.maxAlpha;
      } else {
        p.alpha = (1 - (progress - 0.25) / 0.75) * p.maxAlpha;
      }

      if (p.life >= p.maxLife) {
        this.dustParticles[i] = this.createDustParticle(false);
      }
    }
  }

  // Render a big, dusty, distorted circular hole filled with mud on the ground
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);
    const centerX = drawX + this.width / 2;
    const centerY = Math.floor(this.groundY - cameraY);
    const rx = this.width / 2;
    const ry = this.height / 2;

    if (drawX < -220 || drawX > 1365 + 220) return;

    ctx.save();

    // 1. Outer Dusty Distorted Earth Mound & Broken Stone Rim
    ctx.fillStyle = '#1c150c';
    ctx.beginPath();
    for (let i = 0; i <= this.rimPoints.length; i++) {
      const pt = this.rimPoints[i % this.rimPoints.length];
      const r = (1 + pt.rOffset * 1.3);
      const px = centerX + Math.cos(pt.angle) * (rx + 10) * r;
      const py = centerY + Math.sin(pt.angle) * (ry + 8) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Moss & Cracked Dirt Rim Trim
    ctx.strokeStyle = '#272015';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. Mud Crater Interior Cavity (Deep viscous murky mud pool)
    const mudGrad = ctx.createRadialGradient(
      centerX,
      centerY,
      4,
      centerX,
      centerY,
      rx
    );
    mudGrad.addColorStop(0, '#0c0703'); // Deep pitch abyss center
    mudGrad.addColorStop(0.55, '#1e1108'); // Murky brown sludge
    mudGrad.addColorStop(0.85, '#2f1c0e'); // Wet mud banks
    mudGrad.addColorStop(1, '#452c1a'); // Dusty clay edge

    ctx.fillStyle = mudGrad;
    ctx.beginPath();
    for (let i = 0; i <= this.rimPoints.length; i++) {
      const pt = this.rimPoints[i % this.rimPoints.length];
      const r = (1 + pt.rOffset);
      const px = centerX + Math.cos(pt.angle) * rx * r;
      const py = centerY + Math.sin(pt.angle) * ry * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // 3. Mud Surface Ripples & Sludge Waves
    ctx.strokeStyle = 'rgba(74, 45, 23, 0.4)';
    ctx.lineWidth = 1.5;
    for (let ring = 1; ring <= 3; ring++) {
      const wavePulse = (this.rippleTimer + ring * 1.2) % 3;
      const waveRx = (rx * 0.25 * ring) + wavePulse * 4;
      const waveRy = (ry * 0.25 * ring) + wavePulse * 1.5;
      if (waveRx < rx * 0.85) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, waveRx, waveRy, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 4. Bubbling Mud Spheres & Splatters
    for (const b of this.bubbles) {
      const bx = drawX + b.relX * this.width;
      const by = drawY + b.relY * this.height;

      if (b.popTimer > 0) {
        // Pop Splatter Ring
        ctx.strokeStyle = `rgba(146, 92, 53, ${Math.max(0, b.alpha)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(bx, by, b.radius * 1.4, 0, Math.PI * 2);
        ctx.stroke();

        // Droplets
        ctx.fillStyle = `rgba(180, 115, 68, ${Math.max(0, b.alpha)})`;
        for (let d = 0; d < 4; d++) {
          const dAng = (d * Math.PI) / 2 + 0.3;
          ctx.beginPath();
          ctx.arc(
            bx + Math.cos(dAng) * (b.radius + 4),
            by + Math.sin(dAng) * (b.radius + 2),
            1.2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      } else {
        // Inflating Mud Bubble with Specular Highlight
        const bubGrad = ctx.createRadialGradient(
          bx - b.radius * 0.3,
          by - b.radius * 0.3,
          b.radius * 0.2,
          bx,
          by,
          b.radius
        );
        bubGrad.addColorStop(0, '#5a381f');
        bubGrad.addColorStop(0.6, '#311a0c');
        bubGrad.addColorStop(1, '#170b04');

        ctx.fillStyle = bubGrad;
        ctx.beginPath();
        ctx.ellipse(bx, by, b.radius, b.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Specular Slime Highlight
        ctx.fillStyle = 'rgba(255, 220, 180, 0.45)';
        ctx.beginPath();
        ctx.arc(bx - b.radius * 0.3, by - b.radius * 0.25, b.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Scattered Dirt Clods, Moss Tufts & Pebbles around Rim
    ctx.fillStyle = '#3a2b1b';
    const pebbles = [
      { x: centerX - rx * 0.85, y: centerY + ry * 0.3, s: 3 },
      { x: centerX - rx * 0.4, y: centerY + ry * 0.8, s: 4 },
      { x: centerX + rx * 0.6, y: centerY + ry * 0.75, s: 3.5 },
      { x: centerX + rx * 0.88, y: centerY - ry * 0.2, s: 2.5 },
      { x: centerX - rx * 0.65, y: centerY - ry * 0.7, s: 3 },
    ];
    pebbles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fill();
    });

    // Moss patches on rim
    ctx.fillStyle = '#166534';
    const mosses = [
      { x: centerX - rx * 0.9, y: centerY, w: 14, h: 5 },
      { x: centerX + rx * 0.75, y: centerY + 4, w: 16, h: 6 },
      { x: centerX - rx * 0.2, y: centerY + ry * 0.85, w: 20, h: 5 },
    ];
    mosses.forEach(m => {
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.w / 2, m.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Floating Dusty Dirt & Spore Motes
    for (const p of this.dustParticles) {
      if (p.alpha > 0.01) {
        const px = Math.floor(p.x - cameraX);
        const py = Math.floor(p.y - cameraY);
        ctx.fillStyle = `rgba(180, 140, 95, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Trigger aggressive mud splash when Ratkeeper burrows into this hole
  public triggerEnterSplash() {
    for (let i = 0; i < 20; i++) {
      const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const speed = 80 + Math.random() * 220;
      this.dustParticles.push({
        x: this.x + this.width / 2 + (Math.random() - 0.5) * 40,
        y: this.groundY - 5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        alpha: 0.9,
        maxAlpha: 0.95,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
      });
    }
  }

  // Trigger explosive mud eruption when Ratkeeper bursts out of this hole
  public triggerExitBurst() {
    for (let i = 0; i < 30; i++) {
      const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
      const speed = 120 + Math.random() * 320;
      this.dustParticles.push({
        x: this.x + this.width / 2 + (Math.random() - 0.5) * 60,
        y: this.groundY - 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 7,
        alpha: 1.0,
        maxAlpha: 1.0,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.5,
      });
    }
  }
}
