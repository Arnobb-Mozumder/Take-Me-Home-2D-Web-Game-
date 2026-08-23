import { Rect, Platform } from './types';
import { Player } from './Player';
import { DogEnemy } from './DogEnemy';
import { RATKEEPER_CONFIG } from './RatkeeperConfig';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export type BossProjectileType = 'fire_nut' | 'falling_fireball' | 'shockwave' | 'mud_splatter';

export class BossProjectile implements Rect {
  public id: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public radius: number;

  public vx: number;
  public vy: number;
  public damage: number;
  public type: BossProjectileType;

  public isActive: boolean = true;
  public lifeTimer: number = 0;
  public maxLife: number = 4.0; // Auto-destroy to prevent memory leaks
  public rotation: number = 0;
  public rotationSpeed: number = 8;

  public particles: Particle[] = [];

  constructor(
    id: string,
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number = RATKEEPER_CONFIG.FIRE_NUT_DAMAGE,
    type: BossProjectileType = 'fire_nut',
    radius: number = RATKEEPER_CONFIG.FIRE_NUT_RADIUS
  ) {
    this.id = id;
    this.x = x - radius;
    this.y = y - radius;
    this.width = radius * 2;
    this.height = radius * 2;
    this.radius = radius;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.type = type;
    this.rotationSpeed = (Math.random() > 0.5 ? 1 : -1) * (7 + Math.random() * 6);
  }

  public update(dt: number, player: Player, platforms: Platform[] = [], dogs: DogEnemy[] = []): boolean {
    if (!this.isActive) return false;

    this.lifeTimer += dt;
    if (this.lifeTimer >= this.maxLife) {
      this.explode();
      return false;
    }

    this.rotation += this.rotationSpeed * dt;

    if (this.type === 'fire_nut') {
      // Gentle arcing trajectory
      this.vy += 220 * dt;
    } else if (this.type === 'falling_fireball') {
      // Rapid downward acceleration
      this.vy += 380 * dt;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Spawn trail particles
    const centerX = this.x + this.radius;
    const centerY = this.y + this.radius;

    if (this.type === 'fire_nut' || this.type === 'falling_fireball') {
      const isFalling = this.type === 'falling_fireball';
      for (let i = 0; i < (isFalling ? 3 : 2); i++) {
        this.particles.push({
          x: centerX + (Math.random() - 0.5) * (this.radius * 0.8),
          y: centerY + (Math.random() - 0.5) * (this.radius * 0.8),
          vx: -this.vx * 0.2 + (Math.random() - 0.5) * 35,
          vy: -this.vy * 0.2 + (Math.random() - 0.5) * 35 - 15,
          size: 3 + Math.random() * 5,
          color: Math.random() > 0.4 ? '#f97316' : (Math.random() > 0.5 ? '#fbbf24' : '#ef4444'),
          alpha: 0.95,
          life: 0,
          maxLife: 0.3 + Math.random() * 0.25,
        });
      }
    } else if (this.type === 'mud_splatter') {
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        size: 2 + Math.random() * 3,
        color: '#451a03',
        alpha: 0.8,
        life: 0,
        maxLife: 0.3,
      });
    }

    // Update existing particles
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

    const projBox: Rect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };

    // 1. Dog collision check (Dogs take the exact same damage as the player!)
    if (dogs && dogs.length > 0) {
      for (const dog of dogs) {
        if (!dog.isDefeated && dog.state !== 'DEAD' && dog.damageCooldownTimer <= 0) {
          const dogBox: Rect = {
            x: dog.x,
            y: dog.y,
            width: dog.width,
            height: dog.height,
          };
          if (this.checkAABB(dogBox, projBox)) {
            const hitDir = this.vx !== 0 ? (this.vx > 0 ? 1 : -1) : (dog.x < centerX ? -1 : 1);
            dog.takeDamage(this.damage, hitDir * 240);

            // Explosive projectiles detonate on impact with a dog
            if (this.type !== 'shockwave') {
              this.explode();
              return false;
            }
          }
        }
      }
    }

    // 2. Player collision check
    // Player can dodge through movement, jumping, or teleportation (invincibility/dash)
    const playerBox: Rect = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
    };

    if (this.checkAABB(playerBox, projBox)) {
      if (!player.isInvincible && player.state !== 'CLIMB') {
        const hitDir = this.vx !== 0 ? (this.vx > 0 ? 1 : -1) : (player.x < centerX ? -1 : 1);
        player.takeDamage(this.damage, hitDir * 180);
      }
      this.explode();
      return false;
    }

    // 3. Floor / Platform collision check
    for (const plat of platforms) {
      if (plat.type === 'wall' || plat.type === 'ground' || !plat.type) {
        if (this.checkAABB(projBox, plat)) {
          this.explode();
          return false;
        }
      }
    }

    return true;
  }

  private checkAABB(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  public explode() {
    this.isActive = false;
    const centerX = this.x + this.radius;
    const centerY = this.y + this.radius;

    // Burst of fiery sparks and embers
    const count = this.type === 'falling_fireball' ? 18 : 14;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 150;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: Math.random() > 0.5 ? '#ef4444' : (Math.random() > 0.5 ? '#f59e0b' : '#fef08a'),
        alpha: 1.0,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.35,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0) {
    // Render trailing & burst particles
    for (const p of this.particles) {
      const px = Math.floor(p.x - cameraX);
      const py = Math.floor(p.y - cameraY);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!this.isActive) return;

    const drawX = Math.floor(this.x + this.radius - cameraX);
    const drawY = Math.floor(this.y + this.radius - cameraY);

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(this.rotation);

    if (this.type === 'fire_nut' || this.type === 'falling_fireball') {
      const isFalling = this.type === 'falling_fireball';
      const auraMultiplier = isFalling ? 2.2 : 1.9;

      // 1. Glowing Fiery Aura
      const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius * auraMultiplier);
      aura.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      aura.addColorStop(0.35, 'rgba(249, 115, 22, 0.8)');
      aura.addColorStop(0.75, 'rgba(225, 29, 72, 0.4)');
      aura.addColorStop(1, 'rgba(225, 29, 72, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * auraMultiplier, 0, Math.PI * 2);
      ctx.fill();

      // 2. Roasted Core Nut Shape
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 0.95, this.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Glowing Fiery Veins / Magma Cracks
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.7, 0);
      ctx.lineTo(this.radius * 0.7, 0);
      ctx.moveTo(0, -this.radius * 0.5);
      ctx.lineTo(0, this.radius * 0.5);
      ctx.stroke();

      // 4. Burning Ember Edge
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 0.95, this.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 5. White-Hot Center Flare
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'shockwave') {
      ctx.fillStyle = 'rgba(52, 211, 153, 0.6)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 1.6, this.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

