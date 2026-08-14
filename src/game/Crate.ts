import { Platform, Rect } from './types';

export class Crate {
  public id: string;
  public x: number;
  public y: number;
  public width = 44;
  public height = 44;
  public vx = 0;
  public vy = 0;
  public isGrounded = false;

  private gravity = 1350;
  private friction = 1000;

  constructor(id: string, startX: number, startY: number) {
    this.id = id;
    this.x = startX;
    this.y = startY;
  }

  public getRect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  // Convert to Platform interface so Player and Football physics treat crate as solid ground/platform
  public toPlatform(): Platform {
    return {
      id: `crate-plat-${this.id}`,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      type: 'platform',
      color: '#85562e',
      topColor: '#a87343',
    };
  }

  private checkAABB(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  public push(pushVx: number) {
    // Player pushes crate
    this.vx = pushVx * 0.75;
  }

  public update(dt: number, platforms: Platform[]) {
    // 1. Horizontal Physics & Friction
    if (Math.abs(this.vx) > 0) {
      this.x += this.vx * dt;

      if (this.isGrounded) {
        if (this.vx > 0) {
          this.vx = Math.max(0, this.vx - this.friction * dt);
        } else if (this.vx < 0) {
          this.vx = Math.min(0, this.vx + this.friction * dt);
        }
      } else {
        // Air resistance
        this.vx *= Math.pow(0.95, dt * 60);
      }
    }

    // Horizontal Collisions with Static Platforms
    const box: Rect = this.getRect();
    for (const plat of platforms) {
      if (this.checkAABB(box, plat)) {
        if (this.vx > 0) {
          this.x = plat.x - this.width;
          this.vx = 0;
        } else if (this.vx < 0) {
          this.x = plat.x + plat.width;
          this.vx = 0;
        }
        box.x = this.x;
      }
    }

    // 2. Vertical Physics & Gravity
    if (!this.isGrounded) {
      this.vy += this.gravity * dt;
      if (this.vy > 800) this.vy = 800;
    }

    this.y += this.vy * dt;
    box.y = this.y;
    this.isGrounded = false;

    for (const plat of platforms) {
      if (this.checkAABB(box, plat)) {
        if (this.vy > 0) {
          this.y = plat.y - this.height;
          this.vy = 0;
          this.isGrounded = true;
        } else if (this.vy < 0) {
          this.y = plat.y + plat.height;
          this.vy = 0;
        }
        box.y = this.y;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0, showDebugBoxes: boolean = false) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);

    ctx.save();

    // Wooden Crate Body
    ctx.fillStyle = '#85562e'; // Medium wood brown
    ctx.fillRect(drawX, drawY, this.width, this.height);

    // Inner Bevel / Planks
    ctx.fillStyle = '#a87343';
    ctx.fillRect(drawX + 3, drawY + 3, this.width - 6, this.height - 6);

    ctx.fillStyle = '#6e4423';
    ctx.fillRect(drawX + 6, drawY + 6, this.width - 12, this.height - 12);

    // Diagonal Cross Brace (Classic Wooden Crate)
    ctx.strokeStyle = '#a87343';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(drawX + 4, drawY + 4);
    ctx.lineTo(drawX + this.width - 4, drawY + this.height - 4);
    ctx.moveTo(drawX + this.width - 4, drawY + 4);
    ctx.lineTo(drawX + 4, drawY + this.height - 4);
    ctx.stroke();

    // Outer Border Frame
    ctx.strokeStyle = '#452611';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(drawX, drawY, this.width, this.height);

    // Iron Corner Brackets
    ctx.fillStyle = '#475569';
    const s = 6;
    ctx.fillRect(drawX, drawY, s, s); // top-left
    ctx.fillRect(drawX + this.width - s, drawY, s, s); // top-right
    ctx.fillRect(drawX, drawY + this.height - s, s, s); // bottom-left
    ctx.fillRect(drawX + this.width - s, drawY + this.height - s, s, s); // bottom-right

    ctx.restore();

    if (showDebugBoxes) {
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX, drawY, this.width, this.height);
      ctx.restore();
    }
  }
}
