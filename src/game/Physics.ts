import { Platform, Rect } from './types';

export class Physics {
  // Movement parameters
  public accel = 1800; // Horizontal acceleration (px/s²)
  public decel = 2200; // Friction / Deceleration when no key pressed
  public normalSpeed = 220; // Normal running speed (px/s)
  public maxSpeed = 280; // Max horizontal run speed (px/s)
  public gravity = 1500; // Fall gravity (px/s²)
  public jumpImpulse = -500; // Decreased upward jump velocity (px/s)
  public maxFallSpeed = 950; // Terminal fall velocity

  // Check AABB Overlap
  public checkAABB(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  // Horizontal physics pass & collision
  public updateHorizontal(
    entity: { x: number; y: number; vx: number; vy: number; width: number; height: number },
    moveDir: number, // -1, 0, or 1
    dt: number,
    platforms: Platform[],
    isSprinting: boolean = false
  ) {
    const targetCap = isSprinting ? this.maxSpeed : this.normalSpeed;
    if (moveDir !== 0) {
      // Accelerate in move direction
      entity.vx += moveDir * this.accel * dt;
      if (Math.abs(entity.vx) > targetCap) {
        entity.vx = Math.sign(entity.vx) * targetCap;
      }
    } else {
      // Decelerate / Friction
      if (entity.vx > 0) {
        entity.vx = Math.max(0, entity.vx - this.decel * dt);
      } else if (entity.vx < 0) {
        entity.vx = Math.min(0, entity.vx + this.decel * dt);
      }
    }

    // Apply horizontal velocity
    entity.x += entity.vx * dt;

    // Horizontal Platform Collisions
    const box: Rect = { x: entity.x, y: entity.y, width: entity.width, height: entity.height };
    for (const plat of platforms) {
      if (this.checkAABB(box, plat)) {
        if (entity.vx > 0) {
          // Moving right -> hit left wall of platform
          entity.x = plat.x - entity.width;
          entity.vx = 0;
        } else if (entity.vx < 0) {
          // Moving left -> hit right wall of platform
          entity.x = plat.x + plat.width;
          entity.vx = 0;
        }
        box.x = entity.x;
      }
    }
  }

  // Vertical physics pass & collision
  public updateVertical(
    entity: { x: number; y: number; vx: number; vy: number; width: number; height: number },
    dt: number,
    platforms: Platform[]
  ): boolean {
    // Apply Gravity
    entity.vy += this.gravity * dt;
    if (entity.vy > this.maxFallSpeed) {
      entity.vy = this.maxFallSpeed;
    }

    // Apply vertical velocity
    entity.y += entity.vy * dt;

    let wasGrounded = false;
    const box: Rect = { x: entity.x, y: entity.y, width: entity.width, height: entity.height };

    for (const plat of platforms) {
      if (this.checkAABB(box, plat)) {
        if (entity.vy > 0) {
          // Falling down -> Landed on top of platform
          entity.y = plat.y - entity.height;
          entity.vy = 0;
          wasGrounded = true;
        } else if (entity.vy < 0) {
          // Jumping up -> Hit ceiling
          entity.y = plat.y + plat.height;
          entity.vy = 0;
        }
        box.y = entity.y;
      }
    }

    return wasGrounded;
  }
}
