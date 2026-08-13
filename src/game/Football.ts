import { Platform, Rect, FootballState, BreakableWall } from './types';

export class Football {
  public x: number;
  public y: number;
  public radius = 16; // 32x32 diameter
  public vx = 0;
  public vy = 0;

  public state: FootballState = 'RESTING';
  public isGrounded = false;
  public rotation = 0; // Visual rotation angle in radians
  public lastImpactSpeed = 0;

  // Physics tuning parameters
  public gravity = 1500; // px/s²
  public bouncinessGround = 0.62; // Restitution coefficient
  public bouncinessWall = 0.68;
  public groundFriction = 380; // px/s² deceleration
  public maxSpeed = 2200;

  private image: HTMLImageElement | null = null;
  private isLoaded = false;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;

    this.image = new Image();
    this.image.src = '/football.png';
    this.image.onload = () => {
      this.isLoaded = true;
    };
  }

  // Check AABB Overlap helper
  private checkAABB(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  public reset(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.state = 'RESTING';
    this.isGrounded = true;
    this.rotation = 0;
    this.lastImpactSpeed = 0;
  }

  public getCenterX(): number {

    return this.x + this.radius;
  }

  public getCenterY(): number {
    return this.y + this.radius;
  }

  public applyKick(kvx: number, kvy: number) {
    this.vx = kvx;
    this.vy = kvy;
    this.isGrounded = false;
    this.state = 'AIRBORNE';
  }

  public applyNudge(nvx: number) {
    if (nvx > 0) {
      if (this.vx < nvx) this.vx = nvx;
    } else if (nvx < 0) {
      if (this.vx > nvx) this.vx = nvx;
    }
  }

  public update(
    dt: number,
    platforms: Platform[],
    breakableWalls: BreakableWall[] = [],
    onWallHit?: (wall: BreakableWall, impactSpeed: number) => void
  ) {
    // Clamp velocity to maxSpeed
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / currentSpeed;
      this.vx *= scale;
      this.vy *= scale;
    }

    // Apply gravity if not grounded
    if (!this.isGrounded) {
      this.vy += this.gravity * dt;
    }

    // Air drag / damping
    this.vx *= Math.pow(0.996, dt * 60);
    this.vy *= Math.pow(0.997, dt * 60);

    // 1. Horizontal Movement & Collision
    this.x += this.vx * dt;
    const footRect: Rect = {
      x: this.x,
      y: this.y,
      width: this.radius * 2,
      height: this.radius * 2,
    };

    // Check Standard Platforms
    for (const plat of platforms) {
      if (this.checkAABB(footRect, plat)) {
        if (this.vx > 0) {
          // Moving right -> Hit left wall of platform/wall
          this.x = plat.x - this.radius * 2;
          this.vx = -this.vx * this.bouncinessWall;
        } else if (this.vx < 0) {
          // Moving left -> Hit right wall of platform/wall
          this.x = plat.x + plat.width;
          this.vx = -this.vx * this.bouncinessWall;
        }
        footRect.x = this.x;
      }
    }

    // Check Breakable Walls (if unbroken)
    for (const wall of breakableWalls) {
      if (!wall.isBroken && this.checkAABB(footRect, wall)) {
        const impactSpeed = Math.hypot(this.vx, this.vy);
        this.lastImpactSpeed = Math.round(impactSpeed);

        if (onWallHit) {
          onWallHit(wall, impactSpeed);
        }

        if (wall.isBroken) {
          // Breakable wall shattered! Allow ball to pass through with light momentum retention
          this.vx *= 0.85;
        } else {
          // Wall survived! Rebound off wall
          if (this.vx > 0) {
            this.x = wall.x - this.radius * 2;
            this.vx = -this.vx * this.bouncinessWall;
          } else if (this.vx < 0) {
            this.x = wall.x + wall.width;
            this.vx = -this.vx * this.bouncinessWall;
          }
        }
        footRect.x = this.x;
      }
    }

    // 2. Vertical Movement & Collision
    this.y += this.vy * dt;
    footRect.y = this.y;
    this.isGrounded = false;

    for (const plat of platforms) {
      if (this.checkAABB(footRect, plat)) {
        if (this.vy > 0) {
          // Falling down -> Hit top of platform
          this.y = plat.y - this.radius * 2;

          if (this.vy > 45) {
            // Bounce up!
            this.vy = -this.vy * this.bouncinessGround;
          } else {
            // Rest on top
            this.vy = 0;
            this.isGrounded = true;
          }
        } else if (this.vy < 0) {
          // Rising up -> Hit ceiling / platform bottom
          this.y = plat.y + plat.height;
          this.vy = -this.vy * this.bouncinessGround;
        }
        footRect.y = this.y;
      }
    }

    for (const wall of breakableWalls) {
      if (!wall.isBroken && this.checkAABB(footRect, wall)) {
        if (this.vy > 0) {
          this.y = wall.y - this.radius * 2;
          this.vy = -this.vy * this.bouncinessGround;
        } else if (this.vy < 0) {
          this.y = wall.y + wall.height;
          this.vy = -this.vy * this.bouncinessGround;
        }
        footRect.y = this.y;
      }
    }


    // 3. Ground Friction & State
    if (this.isGrounded) {
      if (this.vx > 0) {
        this.vx = Math.max(0, this.vx - this.groundFriction * dt);
      } else if (this.vx < 0) {
        this.vx = Math.min(0, this.vx + this.groundFriction * dt);
      }

      if (Math.abs(this.vx) > 5) {
        this.state = 'ROLLING';
      } else {
        this.vx = 0;
        this.state = 'RESTING';
      }
    } else {
      this.state = 'AIRBORNE';
    }

    // 4. Visual Rotation based on horizontal travel
    const deltaX = this.vx * dt;
    if (this.isGrounded) {
      this.rotation += deltaX / this.radius;
    } else {
      this.rotation += (deltaX / this.radius) * 0.5;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    showDebugBoxes: boolean = false
  ) {
    const drawCenterX = Math.floor(this.x + this.radius - cameraX);
    const drawCenterY = Math.floor(this.y + this.radius);

    ctx.save();
    ctx.translate(drawCenterX, drawCenterY);
    ctx.rotate(this.rotation);

    if (this.isLoaded && this.image) {
      ctx.drawImage(
        this.image,
        -this.radius,
        -this.radius,
        this.radius * 2,
        this.radius * 2
      );
    } else {
      // Crisp vector fallback
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Seam line
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.7, 0);
      ctx.lineTo(this.radius * 0.7, 0);
      ctx.stroke();
    }

    ctx.restore();

    // Debug Box
    if (showDebugBoxes) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        Math.floor(this.x - cameraX),
        Math.floor(this.y),
        this.radius * 2,
        this.radius * 2
      );
      ctx.restore();
    }
  }
}
