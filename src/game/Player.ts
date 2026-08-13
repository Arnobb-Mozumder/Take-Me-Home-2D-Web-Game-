import { SpriteSheet } from './SpriteSheet';
import { Physics } from './Physics';
import { InputManager } from './InputManager';
import { Football } from './Football';
import { Platform, PlayerState, PlayerDebugInfo, KickDirection, Rect } from './types';

export class Player {
  // Position & Box
  public x = 120;
  public y = 380;
  public width = 48;
  public height = 96;

  // Velocity
  public vx = 0;
  public vy = 0;

  // State
  public state: PlayerState = 'IDLE';
  public isGrounded = false;
  public facingRight = true;

  // Kick system
  public kickRadius = 90;
  public kickCooldown = 0;
  private pendingKickVx = 0;
  private pendingKickVy = 0;
  private hasAppliedKickImpact = false;

  // Visual Sprite render dimensions & offsets (for 96px player box height)
  public renderWidth = 92;
  public renderHeight = 115;
  public spriteOffsetX = -22;
  public spriteOffsetY = -15;

  // Sprite Animations
  public idleSprite: SpriteSheet;
  public runSprite: SpriteSheet;
  public jumpSprite: SpriteSheet;
  public kickSprite: SpriteSheet;
  public climbSprite: SpriteSheet;

  private currentSprite: SpriteSheet;
  private airTime = 0;

  // Health & Invincibility
  public health = 3;
  public maxHealth = 3;
  public invincibilityTimer = 0;

  // Kick Power Charging & Speed Meter
  public kickPower = 0.85; // Power ratio from 0.35 to 1.0
  public isChargingKick = false;
  private chargeSpeed = 1.25;

  // 2-Stage Kick System: 'NONE' -> 'AIM' (WASD direction) -> 'POWER' (Power gauge) -> KICK
  public kickStage: 'NONE' | 'AIM' | 'POWER' = 'NONE';
  public lockedKickDir: KickDirection = 'FORWARD';

  // Ledge Climb System
  public climbLedgeX = 0;
  public climbLedgeY = 0;
  public climbProgress = 0; // 0 to 1
  public climbDuration = 0.46; // Total time in seconds to complete climb
  public climbFacingRight = true;
  private ledgeGrabCooldown = 0;

  // Teleport System
  public teleportCooldown = 0;
  public floatingStatusText: string | null = null;
  public floatingStatusTimer = 0;
  public floatingStatusBorderColor = '#9333ea';
  public floatingStatusBgColor = '#67e8f9';

  constructor(private physics: Physics) {
    // Create sprite animation instances matching clean 1D sprite strips
    this.idleSprite = new SpriteSheet({
      url: '/idle.png',
      frameCount: 1, // Single frame idle character body
      frameDuration: 0.1,
      loop: true,
    });

    this.runSprite = new SpriteSheet({
      url: '/run.png',
      frameCount: 8,
      frameDuration: 0.08,
      loop: true,
    });

    this.jumpSprite = new SpriteSheet({
      url: '/jump.png',
      frameCount: 6,
      frameDuration: 0.08,
      loop: false,
    });

    this.kickSprite = new SpriteSheet({
      url: '/kick.png',
      frameCount: 6,
      frameDuration: 0.06,
      loop: false,
    });

    this.climbSprite = new SpriteSheet({
      url: '/climb.png',
      frameCount: 8,
      frameDuration: 0.06,
      loop: false,
    });

    this.currentSprite = this.idleSprite;
  }

  // Allow replacing sprite sheets dynamically (for debug/custom uploads)
  public setCustomSprite(type: 'idle' | 'run' | 'jump' | 'kick' | 'climb', url: string, frameCount?: number) {
    if (type === 'idle') {
      this.idleSprite.load(url, frameCount);
    } else if (type === 'run') {
      this.runSprite.load(url, frameCount);
    } else if (type === 'jump') {
      this.jumpSprite.load(url, frameCount);
    } else if (type === 'kick') {
      this.kickSprite.load(url, frameCount);
    } else if (type === 'climb') {
      this.climbSprite.load(url, frameCount);
    }
  }

  public getKickDirection(input: InputManager): KickDirection {
    const facingDir = this.facingRight ? 1 : -1;
    const pressingUp = input.isUpPressed();
    const pressingDown = input.isDownPressed();
    const pressingForward = (facingDir === 1 && input.isRightPressed()) || (facingDir === -1 && input.isLeftPressed());

    if (pressingUp && pressingForward) return 'FORWARD_UP';
    if (pressingDown && pressingForward) return 'FORWARD_DOWN';
    if (pressingUp) return 'UP';
    if (pressingDown) return 'DOWNWARD';
    return 'FORWARD';
  }

  public getKickVelocityVector(dir: KickDirection, powerRatio = 1.0): { vx: number; vy: number } {
    const facingDir = this.facingRight ? 1 : -1;
    // Map powerRatio (0.35 to 1.0) to speed range: normal kick ~600 px/s (550-650), strong kick ~850 px/s (800-900)
    const normalizedPower = Math.max(0, Math.min(1.0, (powerRatio - 0.35) / 0.65));
    const speed = 600 + normalizedPower * 250; // 600 px/s -> 850 px/s

    switch (dir) {
      case 'FORWARD':
        // Rocket kick with elevated vertical loft
        return { vx: facingDir * (speed * 0.88), vy: -speed * 0.55 };
      case 'FORWARD_UP':
        // High parabolic arc with high vertical loft
        return { vx: facingDir * (speed * 0.65), vy: -speed * 0.95 };
      case 'UP':
        // Sky rocket kick with maximum vertical height
        return { vx: facingDir * (speed * 0.15), vy: -speed * 1.35 };
      case 'FORWARD_DOWN':
        // Driven ground shot
        return { vx: facingDir * (speed * 0.92), vy: +speed * 0.35 };
      case 'DOWNWARD':
        // Downward slam with ground bounce
        return { vx: facingDir * (speed * 0.25), vy: +speed * 0.95 };
    }
  }

  // Instantaneous Teleport
  public teleportTo(targetX: number, targetY: number) {
    this.x = targetX;
    this.y = targetY;
    this.vx = 0;
    this.vy = 0;
    if (this.state === 'CLIMB') {
      this.state = 'IDLE';
      this.climbSprite.clearCustomFrame();
      this.currentSprite = this.idleSprite;
    }
  }

  public teleportToBall(football: Football) {
    // Instantaneous 0-frame teleport centered on the football
    const targetX = football.x + football.radius - this.width / 2;
    const targetY = football.y + football.radius * 2 - this.height;
    this.teleportTo(targetX, targetY);
    this.isGrounded = true;
  }

  public showFloatingStatus(text: string, textColor = '#67e8f9', borderColor = '#9333ea') {
    this.floatingStatusText = text;
    this.floatingStatusTimer = 1.3;
    this.floatingStatusBorderColor = borderColor;
    this.floatingStatusBgColor = textColor;
  }

  public canKickBall(football: Football): boolean {
    const playerFootX = this.x + this.width / 2;
    const playerFootY = this.y + this.height - 15;
    const dist = Math.hypot(football.getCenterX() - playerFootX, football.getCenterY() - playerFootY);
    return dist <= this.kickRadius;
  }

  public getDistanceFromFootball(football: Football): number {
    const playerFootX = this.x + this.width / 2;
    const playerFootY = this.y + this.height - 15;
    return Math.round(Math.hypot(football.getCenterX() - playerFootX, football.getCenterY() - playerFootY));
  }

  public takeDamage(amount: number, knockbackVx?: number): boolean {
    if (this.invincibilityTimer > 0) return false;

    this.health = Math.max(0, this.health - amount);
    this.invincibilityTimer = 1.2; // 1.2s invincibility period
    this.vy = -280;
    this.vx = knockbackVx !== undefined ? knockbackVx : (this.facingRight ? -240 : 240);
    this.isGrounded = false;

    return this.health <= 0;
  }

  public reset(spawnX: number, spawnY: number) {
    this.x = spawnX;
    this.y = spawnY;
    this.vx = 0;
    this.vy = 0;
    this.health = this.maxHealth;
    this.invincibilityTimer = 0;
    this.kickCooldown = 0;
    this.climbProgress = 0;
    this.ledgeGrabCooldown = 0;
    this.kickStage = 'NONE';
    this.lockedKickDir = 'FORWARD';
    this.isChargingKick = false;
    this.kickPower = 0.85;
    this.state = 'IDLE';
    this.currentSprite = this.idleSprite;
    this.currentSprite.reset();
  }

  private checkLedgeGrab(platforms: Platform[], input: InputManager): boolean {
    if (this.state === 'CLIMB' || this.isGrounded || this.state === 'KICK' || this.ledgeGrabCooldown > 0) {
      return false;
    }
    // Only grab ledges when falling or near top of jump
    if (this.vy < -380) return false;

    for (const plat of platforms) {
      if (plat.width < 12 || plat.height < 12) continue;

      // Facing Right -> Check platform left corner (plat.x, plat.y)
      if (this.facingRight) {
        const ledgeX = plat.x;
        const ledgeY = plat.y;

        const distHoriz = Math.abs((this.x + this.width) - ledgeX);
        const handY = this.y + 12;
        const distVert = handY - ledgeY;
        const isBodyBelow = (this.y + this.height) > (ledgeY + 18);

        if (distHoriz <= 16 && distVert >= -18 && distVert <= 32 && isBodyBelow) {
          this.initiateClimb(ledgeX, ledgeY, true);
          return true;
        }
      } else {
        // Facing Left -> Check platform right corner (plat.x + plat.width, plat.y)
        const ledgeX = plat.x + plat.width;
        const ledgeY = plat.y;

        const distHoriz = Math.abs(this.x - ledgeX);
        const handY = this.y + 12;
        const distVert = handY - ledgeY;
        const isBodyBelow = (this.y + this.height) > (ledgeY + 18);

        if (distHoriz <= 16 && distVert >= -18 && distVert <= 32 && isBodyBelow) {
          this.initiateClimb(ledgeX, ledgeY, false);
          return true;
        }
      }
    }

    return false;
  }

  private initiateClimb(ledgeX: number, ledgeY: number, facingRight: boolean) {
    this.state = 'CLIMB';
    this.climbLedgeX = ledgeX;
    this.climbLedgeY = ledgeY;
    this.climbFacingRight = facingRight;
    this.facingRight = facingRight;
    this.climbProgress = 0;
    this.vx = 0;
    this.vy = 0;
    this.currentSprite = this.climbSprite;
    this.currentSprite.reset();

    // Anchor player in initial hanging position
    if (facingRight) {
      this.x = ledgeX - this.width + 2;
      this.y = ledgeY + 8;
    } else {
      this.x = ledgeX - 2;
      this.y = ledgeY + 8;
    }
  }

  public update(
    dt: number,
    input: InputManager,
    platforms: Platform[],
    levelWidth: number,
    football: Football
  ) {
    // Update invincibility timer
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer = Math.max(0, this.invincibilityTimer - dt);
    }

    // Update kick cooldown
    if (this.kickCooldown > 0) {
      this.kickCooldown = Math.max(0, this.kickCooldown - dt);
    }

    // Update ledge grab cooldown
    if (this.ledgeGrabCooldown > 0) {
      this.ledgeGrabCooldown = Math.max(0, this.ledgeGrabCooldown - dt);
    }

    // Update teleport cooldown
    if (this.teleportCooldown > 0) {
      this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);
    }

    // Update floating status timer
    if (this.floatingStatusTimer > 0) {
      this.floatingStatusTimer -= dt;
      if (this.floatingStatusTimer <= 0) {
        this.floatingStatusText = null;
      }
    }

    // Handle Active CLIMB State
    if (this.state === 'CLIMB') {
      this.climbProgress += dt / this.climbDuration;
      this.vx = 0;
      this.vy = 0;

      this.currentSprite = this.climbSprite;
      const frameIdx = Math.min(7, Math.floor(this.climbProgress * 8));
      this.climbSprite.setCustomFrame(frameIdx);

      // Allow drop down if DOWN key is pressed early during hang
      if (this.climbProgress < 0.35 && input.isDownPressed()) {
        this.state = 'JUMP';
        this.vy = 160;
        this.ledgeGrabCooldown = 0.45; // 0.45s cooldown before re-grabbing
        this.currentSprite = this.jumpSprite;
        this.climbSprite.clearCustomFrame();
        return;
      }

      // Smooth Position Interpolation across 3 climb phases
      if (this.climbProgress < 0.30) {
        // Phase 1: Ledge Hang holding platform top with both hands
        if (this.climbFacingRight) {
          this.x = this.climbLedgeX - this.width + 2;
          this.y = this.climbLedgeY + 8;
        } else {
          this.x = this.climbLedgeX - 2;
          this.y = this.climbLedgeY + 8;
        }
      } else if (this.climbProgress < 0.75) {
        // Phase 2: Muscle up & pull chest/shoulders over the ledge
        const p = (this.climbProgress - 0.30) / 0.45; // 0 -> 1
        const startY = this.climbLedgeY + 8;
        const targetY = this.climbLedgeY - this.height * 0.55;
        this.y = startY + (targetY - startY) * p;

        if (this.climbFacingRight) {
          const startX = this.climbLedgeX - this.width + 2;
          const targetX = this.climbLedgeX - this.width * 0.3;
          this.x = startX + (targetX - startX) * p;
        } else {
          const startX = this.climbLedgeX - 2;
          const targetX = this.climbLedgeX - this.width * 0.7;
          this.x = startX + (targetX - startX) * p;
        }
      } else if (this.climbProgress < 1.0) {
        // Phase 3: Step feet onto top surface of platform
        const p = (this.climbProgress - 0.75) / 0.25; // 0 -> 1
        const startY = this.climbLedgeY - this.height * 0.55;
        const targetY = this.climbLedgeY - this.height;
        this.y = startY + (targetY - startY) * p;

        if (this.climbFacingRight) {
          const startX = this.climbLedgeX - this.width * 0.3;
          const targetX = this.climbLedgeX + 8;
          this.x = startX + (targetX - startX) * p;
        } else {
          const startX = this.climbLedgeX - this.width * 0.7;
          const targetX = this.climbLedgeX - this.width - 8;
          this.x = startX + (targetX - startX) * p;
        }
      } else {
        // Climb Complete! Stand grounded on top of platform
        if (this.climbFacingRight) {
          this.x = this.climbLedgeX + 8;
        } else {
          this.x = this.climbLedgeX - this.width - 8;
        }
        this.y = this.climbLedgeY - this.height;
        this.isGrounded = true;
        this.state = 'IDLE';
        this.climbSprite.clearCustomFrame();
        this.currentSprite = this.idleSprite;
        this.currentSprite.reset();
      }

      return; // Skip standard physics when climbing
    }

    // Determine movement direction
    let moveDir = 0;
    if (input.isLeftPressed()) moveDir -= 1;
    if (input.isRightPressed()) moveDir += 1;

    // Facing direction (preserve facing direction if kicking or still)
    if (this.state !== 'KICK') {
      if (moveDir > 0) this.facingRight = true;
      else if (moveDir < 0) this.facingRight = false;
    }

    // Cancel kick preparation if player becomes too far from ball
    if (this.kickStage !== 'NONE') {
      const dist = this.getDistanceFromFootball(football);
      if (dist > 140) {
        this.kickStage = 'NONE';
        this.isChargingKick = false;
      }
    }

    // --- STAGE 1: AIM MODE (Triggered ONLY by pressing 'R' when static near ball) ---
    if (this.kickStage === 'AIM') {
      this.vx = 0; // Freeze horizontal movement

      // W, A, S, D / Arrows adjust character facing & kick direction
      if (input.isLeftPressed()) this.facingRight = false;
      else if (input.isRightPressed()) this.facingRight = true;

      this.lockedKickDir = this.getKickDirection(input);

      // Pressing Space/E/K or R after locking direction advances to POWER gauge
      const wantsPowerStage = input.consumeKickRequest() || input.consumeAimRequest();
      if (wantsPowerStage) {
        this.kickStage = 'POWER';
        this.isChargingKick = true;
        this.kickPower = 0.35;
        this.chargeSpeed = 1.35;
      }

      // Handle gravity & collision while frozen aiming
      this.isGrounded = this.physics.updateVertical(this, dt, platforms);

      return; // Skip normal movement while aiming
    }

    // --- STAGE 2: POWER SELECTION MODE (Movement frozen, Speed Gauge fills) ---
    if (this.kickStage === 'POWER') {
      this.vx = 0; // Freeze horizontal movement

      // Smooth power gauge oscillation (0.35 to 1.0)
      this.kickPower += dt * this.chargeSpeed;
      if (this.kickPower >= 1.0) {
        this.kickPower = 1.0;
        this.chargeSpeed = -1.35;
      } else if (this.kickPower <= 0.35) {
        this.kickPower = 0.35;
        this.chargeSpeed = 1.35;
      }

      // Pressing Space/E/K or R button executes the kick!
      const wantsToLaunch = input.consumeKickRequest() || input.consumeAimRequest();
      if (wantsToLaunch) {
        const finalPower = this.kickPower;
        const vec = this.getKickVelocityVector(this.lockedKickDir, finalPower);

        this.pendingKickVx = vec.vx;
        this.pendingKickVy = vec.vy;
        this.hasAppliedKickImpact = false;
        this.kickCooldown = 0.45;

        this.state = 'KICK';
        this.currentSprite = this.kickSprite;
        this.currentSprite.reset();

        this.kickStage = 'NONE';
        this.isChargingKick = false;
      }

      // Handle gravity & collision while choosing power
      this.isGrounded = this.physics.updateVertical(this, dt, platforms);

      return; // Skip normal movement while selecting power
    }

    // --- NORMAL PLAY KICK & R-KEY AIM KICK TRIGGERS ---
    const canKickNow = this.canKickBall(football) && this.kickCooldown <= 0 && this.state !== 'KICK';

    // 1. Check 'R' key trigger for Tactical Precision Aim Kick
    const wantsAimMode = input.consumeAimRequest();
    if (wantsAimMode) {
      // STRICT REQUIREMENT: Only triggers if player is near ball AND in static/idle position!
      const isStaticIdle = this.isGrounded && (this.state === 'IDLE' || this.state === 'RUN') && Math.abs(this.vx) < 15 && Math.abs(this.vy) < 15;
      if (canKickNow && isStaticIdle) {
        this.kickStage = 'AIM';
        this.vx = 0;
        this.lockedKickDir = this.getKickDirection(input);
        return;
      }
    }

    // 2. Check Space / E / K for Standard Immediate Kick (NO direction selection screen)
    if (canKickNow) {
      const wantsStandardKick = input.consumeKickRequest();
      if (wantsStandardKick) {
        const kickDir = this.getKickDirection(input);
        const vec = this.getKickVelocityVector(kickDir, 0.85);

        this.pendingKickVx = vec.vx;
        this.pendingKickVy = vec.vy;
        this.hasAppliedKickImpact = false;
        this.kickCooldown = 0.45;

        this.state = 'KICK';
        this.currentSprite = this.kickSprite;
        this.currentSprite.reset();
        return;
      }
    }

    // Horizontal Physics
    this.physics.updateHorizontal(this, moveDir, dt, platforms);

    // Jump Input
    const wantsToJump = input.consumeJumpRequest();
    if (wantsToJump && this.isGrounded && this.state !== 'KICK') {
      this.vy = this.physics.jumpImpulse; // Decreased jump velocity = -500 px/s
      this.isGrounded = false;
      this.airTime = 0;
    }

    // Moderate jump height sustain: holding jump button during early ascent
    if (!this.isGrounded && this.vy < 0 && input.isJumpPressed() && this.airTime < 0.12) {
      this.vy -= 400 * dt;
    }

    // Vertical Physics
    this.isGrounded = this.physics.updateVertical(this, dt, platforms);

    if (!this.isGrounded) {
      this.airTime += dt;

      // Check for Ledge Grab & Climb Trigger!
      if (this.checkLedgeGrab(platforms, input)) {
        return;
      }
    } else {
      this.airTime = 0;
    }

    // Level Boundaries
    if (this.x < 0) {
      this.x = 0;
      this.vx = 0;
    } else if (this.x + this.width > levelWidth) {
      this.x = levelWidth - this.width;
      this.vx = 0;
    }

    // Full physical contact, dribbling & collision resolution with football
    this.handleFootballCollision(football, platforms);

    // Handle KICK state progress and impact timing
    if (this.state === 'KICK') {
      this.currentSprite.update(dt);
      const frameIdx = this.kickSprite.getCurrentFrameIndex();

      // Impact frame (frame 3 out of 8)
      if (frameIdx >= 3 && !this.hasAppliedKickImpact) {
        football.applyKick(this.pendingKickVx, this.pendingKickVy);
        this.hasAppliedKickImpact = true;
      }

      // Finish Kick Animation
      if (frameIdx >= this.kickSprite.frameCount - 1) {
        if (!this.isGrounded) {
          this.state = 'JUMP';
          this.currentSprite = this.jumpSprite;
        } else if (Math.abs(this.vx) > 15) {
          this.state = 'RUN';
          this.currentSprite = this.runSprite;
        } else {
          this.state = 'IDLE';
          this.currentSprite = this.idleSprite;
        }
        this.currentSprite.reset();
      }
    } else {
      // Determine Standard Animation State
      let newState: PlayerState = 'IDLE';
      if (!this.isGrounded) {
        newState = 'JUMP';
      } else if (Math.abs(this.vx) > 15) {
        newState = 'RUN';
      } else {
        newState = 'IDLE';
      }

      // Switch Animation State without continuously resetting
      if (newState !== this.state) {
        this.state = newState;
        if (this.state === 'IDLE') {
          this.currentSprite = this.idleSprite;
          this.currentSprite.reset();
        } else if (this.state === 'RUN') {
          this.currentSprite = this.runSprite;
          this.currentSprite.reset();
        } else if (this.state === 'JUMP') {
          this.currentSprite = this.jumpSprite;
          this.currentSprite.reset();
        }
      }

      // Map Jump animation frames smoothly based on vertical velocity if JUMPing
      if (this.state === 'JUMP') {
        const frameCount = this.jumpSprite.frameCount;
        if (frameCount > 1) {
          const minVy = -520;
          const maxVy = 500;
          const clampedVy = Math.max(minVy, Math.min(maxVy, this.vy));
          const progress = (clampedVy - minVy) / (maxVy - minVy);
          const targetFrame = Math.floor(progress * (frameCount - 1));
          this.jumpSprite.setCustomFrame(targetFrame);
        } else {
          this.jumpSprite.clearCustomFrame();
          this.jumpSprite.update(dt);
        }
      } else {
        this.jumpSprite.clearCustomFrame();
        this.currentSprite.update(dt);
      }
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    showDebugBoxes: boolean = false
  ) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y);

    // Draw Sprite or Custom Animation
    const spriteX = drawX + this.spriteOffsetX;
    const spriteY = drawY + this.spriteOffsetY;
    const flipX = !this.facingRight;

    if (this.state === 'CLIMB') {
      ctx.save();
      // Render climb animation sprite
      this.climbSprite.draw(ctx, spriteX, spriteY, this.renderWidth, this.renderHeight, flipX);

      // Floating Action Text Badge Above Character
      const p = this.climbProgress;
      const bodyCenterX = drawX + this.width / 2;
      const badgeX = bodyCenterX;
      const badgeY = drawY - 22;
      ctx.font = 'bold 11px system-ui, sans-serif';
      const badgeText = p < 0.35 ? 'GRAB! ✊' : p < 0.75 ? 'PULL UP! 💪' : 'CLIMB UP! ⚡';
      const textW = ctx.measureText(badgeText).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(badgeX - textW / 2 - 8, badgeY - 10, textW + 16, 18, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#67e8f9';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, badgeX, badgeY + 3);

      ctx.restore();
    } else if (this.invincibilityTimer > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
      // Flash / flicker opacity during invincibility
      ctx.save();
      ctx.globalAlpha = 0.4;
      this.currentSprite.draw(ctx, spriteX, spriteY, this.renderWidth, this.renderHeight, flipX);
      ctx.restore();
    } else {
      this.currentSprite.draw(ctx, spriteX, spriteY, this.renderWidth, this.renderHeight, flipX);
    }

    // Render Floating Kick Stage Badges
    if (this.kickStage === 'AIM') {
      ctx.save();
      const badgeX = drawX + this.width / 2;
      const badgeY = drawY - 24;
      ctx.font = 'bold 11px system-ui, sans-serif';
      const badgeText = `AIM: ${this.lockedKickDir.replace('_', ' ')} 🎯 (WASD)`;
      const textW = ctx.measureText(badgeText).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(badgeX - textW / 2 - 8, badgeY - 10, textW + 16, 18, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#67e8f9';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, badgeX, badgeY + 3);
      ctx.restore();
    } else if (this.kickStage === 'POWER') {
      ctx.save();
      const badgeX = drawX + this.width / 2;
      const badgeY = drawY - 24;
      ctx.font = 'bold 11px system-ui, sans-serif';
      const powerPct = Math.round(this.kickPower * 100);
      const badgeText = `POWER: ${powerPct}% ⚡ (PRESS KICK)`;
      const textW = ctx.measureText(badgeText).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(badgeX - textW / 2 - 8, badgeY - 10, textW + 16, 18, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, badgeX, badgeY + 3);
      ctx.restore();
    }

    // Floating Notification / Teleport Status Badge
    if (this.floatingStatusText) {
      ctx.save();
      const badgeX = drawX + this.width / 2;
      const badgeY = drawY - 48;
      ctx.font = 'bold 12px system-ui, sans-serif';
      const textW = ctx.measureText(this.floatingStatusText).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = this.floatingStatusBorderColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(badgeX - textW / 2 - 10, badgeY - 12, textW + 20, 22, 11);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.floatingStatusBgColor;
      ctx.textAlign = 'center';
      ctx.fillText(this.floatingStatusText, badgeX, badgeY + 4);
      ctx.restore();
    }


    // Debug Bounding Boxes
    if (showDebugBoxes) {
      // Collision Box (Red)
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX, drawY, this.width, this.height);

      // Kick Radius (Cyan Circle)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(drawX + this.width / 2, drawY + this.height - 15, this.kickRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Feet anchor line (Green)
      ctx.strokeStyle = '#00ff66';
      ctx.beginPath();
      ctx.moveTo(drawX, drawY + this.height);
      ctx.lineTo(drawX + this.width, drawY + this.height);
      ctx.stroke();

      // Sprite Bounds (Yellow Dashed)
      ctx.strokeStyle = '#ffdd00';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(spriteX, spriteY, this.renderWidth, this.renderHeight);
      ctx.setLineDash([]);
    }
  }

  private handleFootballCollision(football: Football, platforms: Platform[]) {
    // Skip if performing active kick execution or climbing
    if (this.state === 'KICK' || this.state === 'CLIMB') return;

    const playerBox: Rect = { x: this.x, y: this.y, width: this.width, height: this.height };
    const footBox: Rect = { x: football.x, y: football.y, width: football.radius * 2, height: football.radius * 2 };

    if (!this.physics.checkAABB(playerBox, footBox)) return;

    const ballDiameter = football.radius * 2;
    const playerCenterX = this.x + this.width / 2;
    const ballCenterX = football.getCenterX();

    // Check if player is falling down onto top of ball from above
    const isFallingOnTop = this.vy > 0 && (this.y + this.height - this.vy * 0.05) <= football.y + football.radius;
    if (isFallingOnTop) {
      this.y = football.y - this.height;
      this.vy = 0;
      this.isGrounded = true;
      return;
    }

    // Check direction player is moving / pushing
    const movingRight = this.vx > 5 || (this.vx >= 0 && this.facingRight && playerCenterX <= ballCenterX);
    const movingLeft = this.vx < -5 || (this.vx <= 0 && !this.facingRight && playerCenterX >= ballCenterX);

    if (movingRight) {
      // Ball sits in front of player's right foot
      let targetBallX = this.x + this.width - 2;

      // Check wall collisions for ball
      let isBlocked = false;
      const testBox: Rect = { x: targetBallX, y: football.y, width: ballDiameter, height: ballDiameter };
      for (const plat of platforms) {
        if (this.physics.checkAABB(testBox, plat)) {
          targetBallX = plat.x - ballDiameter;
          isBlocked = true;
          break;
        }
      }

      if (isBlocked) {
        football.x = targetBallX;
        football.vx = 0;
        this.x = Math.min(this.x, football.x - this.width);
        this.vx = 0;
      } else {
        football.x = Math.max(football.x, targetBallX);
        const pushSpeed = Math.max(this.vx * 1.15, 140);
        football.applyNudge(pushSpeed);
        if (football.isGrounded) {
          football.state = 'ROLLING';
        }
      }
    } else if (movingLeft) {
      // Ball sits in front of player's left foot
      let targetBallX = this.x - ballDiameter + 2;

      let isBlocked = false;
      const testBox: Rect = { x: targetBallX, y: football.y, width: ballDiameter, height: ballDiameter };
      for (const plat of platforms) {
        if (this.physics.checkAABB(testBox, plat)) {
          targetBallX = plat.x + plat.width;
          isBlocked = true;
          break;
        }
      }

      if (isBlocked) {
        football.x = targetBallX;
        football.vx = 0;
        this.x = Math.max(this.x, football.x + ballDiameter);
        this.vx = 0;
      } else {
        football.x = Math.min(football.x, targetBallX);
        const pushSpeed = Math.min(this.vx * 1.15, -140);
        football.applyNudge(pushSpeed);
        if (football.isGrounded) {
          football.state = 'ROLLING';
        }
      }
    } else {
      // Static overlap: separate horizontally
      if (playerCenterX < ballCenterX) {
        football.x = Math.max(football.x, this.x + this.width - 2);
      } else {
        football.x = Math.min(football.x, this.x - ballDiameter + 2);
      }
    }
  }

  public getDebugInfo(fps: number): PlayerDebugInfo {
    return {
      state: this.state,
      x: Math.round(this.x),
      y: Math.round(this.y),
      vx: Math.round(this.vx),
      vy: Math.round(this.vy),
      isGrounded: this.isGrounded,
      currentFrame: this.currentSprite.getCurrentFrameIndex() + 1,
      totalFrames: this.currentSprite.frameCount,
      fps: Math.round(fps),
      facingRight: this.facingRight,
      health: this.health,
      maxHealth: this.maxHealth,
      isInvincible: this.invincibilityTimer > 0,
    };
  }

}

