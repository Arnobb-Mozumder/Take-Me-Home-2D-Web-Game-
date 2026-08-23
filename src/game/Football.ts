import { Platform, Rect, FootballState, BreakableWall, SandArea } from './types';
import { SaveManager } from './SaveManager';

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
  private retryTimeout: number | null = null;
  private retryCount = 0;
  private maxRetries = 5;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;

    this.loadImage();

    SaveManager.addSpriteChangeListener((type) => {
      if (type === 'football') {
        this.loadImage();
      }
    });
  }

  private loadImage() {
    this.isLoaded = false;
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    const saved = SaveManager.getSavedSprite('football');
    const base = import.meta.env.BASE_URL || '/';
    const defaultSrc = `${base.replace(/\/+$/, '')}/football.png`;
    const src = saved?.dataUrl || defaultSrc;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.image = img;
      this.isLoaded = true;
      this.retryCount = 0;
    };
    img.onerror = () => {
      if (saved?.dataUrl) {
        // Fallback to default if saved sprite failed
        const defImg = new Image();
        defImg.crossOrigin = 'anonymous';
        defImg.onload = () => {
          this.image = defImg;
          this.isLoaded = true;
        };
        defImg.src = defaultSrc;
      } else {
        console.warn(`Failed to load football image from ${src} (attempt ${this.retryCount + 1}/${this.maxRetries})`);
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          const backoff = Math.min(1000 * Math.pow(1.5, this.retryCount), 5000);
          this.retryTimeout = window.setTimeout(() => {
            this.loadImage();
          }, backoff);
        }
      }
    };
    img.src = src;
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

  public applyRotation(deltaRad: number) {
    this.rotation += deltaRad;
  }

  public update(
    dt: number,
    platforms: Platform[],
    breakableWalls: BreakableWall[] = [],
    onWallHit?: (wall: BreakableWall, impactSpeed: number) => void,
    sandAreas: SandArea[] = []
  ) {
    // Physics substepping for fast speeds to prevent tunneling through walls or floors
    const speed = Math.hypot(this.vx, this.vy);
    const maxSubStepDist = 10;
    const subSteps = Math.max(1, Math.min(6, Math.ceil((speed * dt) / maxSubStepDist)));
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.updateSingleStep(subDt, platforms, breakableWalls, onWallHit, sandAreas);
    }
  }

  private updateSingleStep(
    dt: number,
    platforms: Platform[],
    breakableWalls: BreakableWall[] = [],
    onWallHit?: (wall: BreakableWall, impactSpeed: number) => void,
    sandAreas: SandArea[] = []
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

    const ballDiameter = this.radius * 2;
    const footRect: Rect = {
      x: this.x,
      y: this.y,
      width: ballDiameter,
      height: ballDiameter,
    };

    // 1. Check if entering any sand area while airborne to catch immediately
    let isInSandArea = false;
    for (const sand of sandAreas) {
      if (this.checkAABB(footRect, sand)) {
        isInSandArea = true;
        break;
      }
    }

    // 1. Horizontal Movement & Collision
    this.x += this.vx * dt;
    footRect.x = this.x;

    // Check Standard Platforms (only walls with vertical overlap)
    for (const plat of platforms) {
      const hasVerticalOverlap = (this.y + ballDiameter > plat.y + 4) && (this.y < plat.y + plat.height - 4);
      if (hasVerticalOverlap && this.checkAABB(footRect, plat)) {
        if (plat.type === 'ramp') {
          // Sloped launch guide surface: converts horizontal momentum into vertical loft toward high ledge!
          if (this.vx > 0) {
            this.vy = -Math.max(550, Math.abs(this.vx) * 0.95);
            this.vx = Math.max(120, this.vx * 0.7);
            this.isGrounded = false;
            this.state = 'AIRBORNE';
          }
        } else {
          // Check if this is a ledge with sand / ground where ball is close to top lip (within 16px of top)
          const isNearTopLip = this.y + ballDiameter <= plat.y + 16;
          if (isNearTopLip && this.vx > 0) {
            // Ledge Lip Catch: pull smoothly onto the top surface instead of ricocheting back into hazard!
            this.y = plat.y - ballDiameter;
            this.x = plat.x + 8;
            this.vx = 0;
            this.vy = 0;
            this.isGrounded = true;
            this.state = 'RESTING';
          } else if (this.vx > 0) {
            // Moving right -> Hit left wall of platform/wall
            this.x = plat.x - ballDiameter;
            this.vx = -Math.abs(this.vx) * this.bouncinessWall;
          } else if (this.vx < 0) {
            // Moving left -> Hit right wall of platform/wall
            this.x = plat.x + plat.width;
            this.vx = Math.abs(this.vx) * this.bouncinessWall;
          }
        }
        footRect.x = this.x;
      }
    }

    // Check Breakable Walls (if unbroken)
    for (const wall of breakableWalls) {
      if (!wall.isBroken) {
        const hasVerticalOverlap = (this.y + ballDiameter > wall.y + 4) && (this.y < wall.y + wall.height - 4);
        if (hasVerticalOverlap && this.checkAABB(footRect, wall)) {
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
              this.x = wall.x - ballDiameter;
              this.vx = -Math.abs(this.vx) * this.bouncinessWall;
            } else if (this.vx < 0) {
              this.x = wall.x + wall.width;
              this.vx = Math.abs(this.vx) * this.bouncinessWall;
            }
          }
          footRect.x = this.x;
        }
      }
    }

    // 2. Vertical Movement & Collision
    this.y += this.vy * dt;
    footRect.y = this.y;
    this.isGrounded = false;

    for (const plat of platforms) {
      const hasHorizontalOverlap = (this.x + ballDiameter > plat.x + 2) && (this.x < plat.x + plat.width - 2);
      if (hasHorizontalOverlap && this.checkAABB(footRect, plat)) {
        if (this.vy > 0) {
          // Falling down -> Hit top of platform
          this.y = plat.y - ballDiameter;

          // Check if landing spot is inside or above a sticky sand zone
          const isLandingInSand = sandAreas.some(sand => {
            const hOverlap = (footRect.x + footRect.width > sand.x) && (footRect.x < sand.x + sand.width);
            const vOverlap = (plat.y >= sand.y - 15) && (plat.y <= sand.y + sand.height + 40);
            return hOverlap && vOverlap;
          });

          if (isLandingInSand) {
            // STICKY SAND: Absorbs vertical bounce, settling ball softly on sand
            this.vy = 0;
            this.isGrounded = true;
          } else if (this.vy > 45) {
            // Normal ground: Bounce up!
            this.vy = -this.vy * this.bouncinessGround;
          } else {
            // Rest on top
            this.vy = 0;
            this.isGrounded = true;
          }
        } else if (this.vy < 0) {
          // Rising up -> Hit ceiling / platform bottom
          this.y = plat.y + plat.height;
          this.vy = Math.abs(this.vy) * this.bouncinessGround;
        }
        footRect.y = this.y;
      }
    }

    for (const wall of breakableWalls) {
      if (!wall.isBroken) {
        const hasHorizontalOverlap = (this.x + ballDiameter > wall.x + 2) && (this.x < wall.x + wall.width - 2);
        if (hasHorizontalOverlap && this.checkAABB(footRect, wall)) {
          if (this.vy > 0) {
            this.y = wall.y - ballDiameter;
            this.vy = -this.vy * this.bouncinessGround;
          } else if (this.vy < 0) {
            this.y = wall.y + wall.height;
            this.vy = Math.abs(this.vy) * this.bouncinessGround;
          }
          footRect.y = this.y;
        }
      }
    }

    // 3. Ground Friction & State
    if (this.isGrounded) {
      // Tunnel Chute Glide Assist: Ensure ball never stops stuck inside a narrow obstacle
      const isInNarrowTunnel = this.x >= 2440 && this.x <= 2530;
      if (isInNarrowTunnel) {
        // Maintain smooth glide through tunnel
        if (this.vx >= 0) {
          this.vx = Math.max(140, this.vx);
        } else {
          this.vx = Math.min(-140, this.vx);
        }
      } else {
        // Check if football is rolling in a sand zone
        let inStickySand = false;
        for (const sand of sandAreas) {
          if (this.checkAABB(footRect, sand)) {
            inStickySand = true;
            break;
          }
        }

        if (inStickySand) {
          // Heavy sand drag: rolls and decelerates steadily while rotating
          const sandDecel = 650; // px/s² sand resistance
          if (this.vx > 0) {
            this.vx = Math.max(0, this.vx - sandDecel * dt);
          } else if (this.vx < 0) {
            this.vx = Math.min(0, this.vx + sandDecel * dt);
          }
        } else {
          if (this.vx > 0) {
            this.vx = Math.max(0, this.vx - this.groundFriction * dt);
          } else if (this.vx < 0) {
            this.vx = Math.min(0, this.vx + this.groundFriction * dt);
          }
        }
      }

      if (Math.abs(this.vx) > 3) {
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
      this.rotation += (deltaX / this.radius) * 0.7;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number = 0,
    showDebugBoxes: boolean = false
  ) {
    const drawCenterX = Math.floor(this.x + this.radius - cameraX);
    const drawCenterY = Math.floor(this.y + this.radius - cameraY);

    ctx.save();
    ctx.translate(drawCenterX, drawCenterY);
    ctx.rotate(this.rotation);

    if (this.isLoaded && this.image) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        this.image,
        -this.radius,
        -this.radius,
        this.radius * 2,
        this.radius * 2
      );
      ctx.restore();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Authentic vector soccer ball with 3D sphere gradient, leather seams & pentagons
      const r = this.radius;

      // 1. Sphere Base with Subtle 3D Spherical Radial Gradient
      const sphereGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.7, '#e2e8f0');
      sphereGrad.addColorStop(1, '#94a3b8');

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Outer seam border
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 2. Central Black Pentagon Patch
      const pr = r * 0.42;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(angle) * pr;
        const py = Math.sin(angle) * pr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // 3. Seam lines connecting center pentagon to 5 outer perimeter patches
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 5; i++) {
        const innerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const ix = Math.cos(innerAngle) * pr;
        const iy = Math.sin(innerAngle) * pr;

        const outerAngle = ((i + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2;
        const ox = Math.cos(outerAngle) * r;
        const oy = Math.sin(outerAngle) * r;

        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ox, oy);
        ctx.stroke();

        // Perimeter dark patch along the outer edge
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(ox, oy, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }

      // Re-clip outer border to clean edges
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      // Specular highlight gleam
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Debug Box
    if (showDebugBoxes) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        Math.floor(this.x - cameraX),
        Math.floor(this.y - cameraY),
        this.radius * 2,
        this.radius * 2
      );
      ctx.restore();
    }
  }
}
