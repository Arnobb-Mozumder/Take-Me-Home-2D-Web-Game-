import { Platform, Rect, BreakableWall } from './types';
import { Player } from './Player';
import { Football } from './Football';
import { DOG_CONFIG, DogState } from './DogConfig';

interface FrameCrop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export class DogEnemy {
  public id: string;
  public spawnX: number;
  public spawnY: number;

  public x: number;
  public y: number;
  public width = DOG_CONFIG.HITBOX_WIDTH;
  public height = DOG_CONFIG.HITBOX_HEIGHT;

  public vx = 0;
  public vy = 0;
  public isGrounded = false;
  public facingRight = true;

  public state: DogState = 'SLEEPING';
  public health = DOG_CONFIG.MAX_HEALTH;
  public maxHealth = DOG_CONFIG.MAX_HEALTH;

  // Timers & Cooldowns
  public wakeupTimer = 0;
  public alertTimer = 0;
  public attackCooldownTimer = 0;
  public damageCooldownTimer = 0;
  public deathTimer = 0;

  // Animation State
  public animTime = 0;
  public currentFrame = 0;
  public hasDealtBiteDamage = false;
  public isDefeated = false;

  // Visual offsets for drawing
  public renderWidth = DOG_CONFIG.RENDER_WIDTH;
  public renderHeight = DOG_CONFIG.RENDER_HEIGHT;
  public spriteOffsetX = DOG_CONFIG.SPRITE_OFFSET_X;
  public spriteOffsetY = DOG_CONFIG.SPRITE_OFFSET_Y;

  // Sprite Image Assets
  private images: { [key: string]: HTMLImageElement } = {};
  private loaded: { [key: string]: boolean } = {};

  // Precise frame definitions for all animations
  private frameDefs: { [key: string]: FrameCrop[] } = {
    sleep: [
      { sx: 48, sy: 212, sw: 470, sh: 310 },
      { sx: 587, sy: 212, sw: 471, sh: 310 },
      { sx: 1115, sy: 212, sw: 493, sh: 310 },
      { sx: 1681, sy: 212, sw: 450, sh: 310 },
    ],
    wakeup: [
      { sx: 48, sy: 212, sw: 470, sh: 310 },
      { sx: 587, sy: 212, sw: 471, sh: 310 },
      { sx: 1115, sy: 212, sw: 493, sh: 310 },
      { sx: 1681, sy: 212, sw: 450, sh: 310 },
    ],
    alert: [
      { sx: 18, sy: 236, sw: 525, sh: 322 },
      { sx: 543, sy: 236, sw: 543, sh: 322 },
      { sx: 1086, sy: 236, sw: 543, sh: 322 },
      { sx: 1629, sy: 236, sw: 511, sh: 322 },
    ],
    run: [
      { sx: 30, sy: 27, sw: 466, sh: 322 },
      { sx: 542, sy: 111, sw: 497, sh: 245 },
      { sx: 1039, sy: 98, sw: 520, sh: 224 },
      { sx: 1559, sy: 91, sw: 501, sh: 262 },
      { sx: 15, sy: 391, sw: 460, sh: 309 },
      { sx: 537, sy: 434, sw: 476, sh: 240 },
      { sx: 1041, sy: 431, sw: 514, sh: 225 },
      { sx: 1581, sy: 413, sw: 481, sh: 287 },
    ],
    bite: [
      { sx: 12, sy: 198, sw: 431, sh: 243 },
      { sx: 443, sy: 239, sw: 444, sh: 204 },
      { sx: 887, sy: 206, sw: 443, sh: 237 },
      { sx: 1330, sy: 173, sw: 438, sh: 270 },
      { sx: 10, sy: 555, sw: 433, sh: 236 },
      { sx: 443, sy: 443, sw: 444, sh: 356 },
      { sx: 887, sy: 548, sw: 443, sh: 252 },
      { sx: 1330, sy: 443, sw: 437, sh: 357 },
    ],
    damage: [
      { sx: 19, sy: 166, sw: 347, sh: 277 },
      { sx: 572, sy: 143, sw: 298, sh: 300 },
      { sx: 906, sy: 172, sw: 411, sh: 271 },
      { sx: 1354, sy: 310, sw: 397, sh: 133 },
      { sx: 17, sy: 443, sw: 423, sh: 368 },
      { sx: 477, sy: 443, sw: 393, sh: 361 },
      { sx: 909, sy: 443, sw: 390, sh: 374 },
      { sx: 1349, sy: 443, sw: 399, sh: 374 },
    ],
    enemy: [{ sx: 149, sy: 247, sw: 1248, sh: 544 }],
  };

  constructor(id: string, spawnX: number, spawnY: number) {
    this.id = id;
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.x = spawnX;
    this.y = spawnY;

    this.preloadAssets();
  }

  private preloadAssets() {
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.replace(/\/+$/, '');

    const assetList = [
      { key: 'sleep', src: `${cleanBase}/dog_sleep.png` },
      { key: 'wakeup', src: `${cleanBase}/dog_wakeup.png` },
      { key: 'alert', src: `${cleanBase}/dog_alert.png` },
      { key: 'run', src: `${cleanBase}/dog_run.png` },
      { key: 'bite', src: `${cleanBase}/dog_bite.png` },
      { key: 'damage', src: `${cleanBase}/dog_damage.png` },
      { key: 'enemy', src: `${cleanBase}/dog_enemy.png` },
    ];

    assetList.forEach(item => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.loaded[item.key] = true;
      };
      img.onerror = () => {
        // Fallback to sleep or alert if wakeup/etc is missing
        if (item.key === 'wakeup') {
          this.images[item.key] = this.images['sleep'];
          this.loaded[item.key] = true;
        }
      };
      img.src = item.src;
      this.images[item.key] = img;
    });
  }

  public reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.state = 'SLEEPING';
    this.health = this.maxHealth;
    this.wakeupTimer = 0;
    this.alertTimer = 0;
    this.attackCooldownTimer = 0;
    this.damageCooldownTimer = 0;
    this.deathTimer = 0;
    this.animTime = 0;
    this.currentFrame = 0;
    this.hasDealtBiteDamage = false;
    this.isDefeated = false;
    this.facingRight = true;
  }

  // Play procedural audio feedback
  private playSound(type: 'growl' | 'bite' | 'hurt' | 'whimper') {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'growl') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'bite') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'hurt') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.16, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'whimper') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Audio context may not be initiated yet
    }
  }

  // ==============================================================
  // MAIN DOG ENEMY STATE MACHINE & AI LOOP
  // ==============================================================
  public update(
    dt: number,
    player: Player,
    football: Football,
    platforms: Platform[],
    breakableWalls: BreakableWall[] = [],
    onDefeated?: (dog: DogEnemy) => void
  ) {
    if (this.isDefeated) return;

    // 1. Decrement active cooldown timers
    if (this.damageCooldownTimer > 0) {
      this.damageCooldownTimer = Math.max(0, this.damageCooldownTimer - dt);
    }
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
    }

    // 2. Check Football Collision for damage
    this.checkFootballCollision(football);

    // Calculate Spatial Relations to Player
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const dogCenterX = this.x + this.width / 2;
    const dogCenterY = this.y + this.height / 2;

    const dx = playerCenterX - dogCenterX;
    const dy = playerCenterY - dogCenterY;
    const distanceToPlayer = Math.hypot(dx, dy);
    const distanceFromSpawn = Math.abs(this.x - this.spawnX);

    // Check if player is on an elevated platform that the dog cannot physically reach
    const isPlayerElevatedUnreachable = player.y < this.y - 110;

    // ============================================================
    // STATE MACHINE TRANSITIONS (Priority: DEAD > DAMAGED > ...)
    // ============================================================

    switch (this.state) {
      // ------------------------------------------------------------
      // 1. DEAD STATE (Disable all AI/hitboxes and trigger removal)
      // ------------------------------------------------------------
      case 'DEAD': {
        this.vx = 0;
        this.deathTimer += dt;
        if (this.deathTimer >= DOG_CONFIG.DEATH_FADE_DURATION) {
          this.isDefeated = true;
          if (onDefeated) onDefeated(this);
        }
        break;
      }

      // ------------------------------------------------------------
      // 2. DAMAGED STATE (Recoil, play damage animation)
      // ------------------------------------------------------------
      case 'DAMAGED': {
        this.animTime += dt;
        const damageFrames = this.frameDefs.damage.length;
        const frameDuration = DOG_CONFIG.DAMAGE_ANIM_DURATION / damageFrames;
        this.currentFrame = Math.min(
          damageFrames - 1,
          Math.floor(this.animTime / frameDuration)
        );

        // Apply friction to knockback velocity
        this.vx *= Math.pow(0.1, dt);

        if (this.animTime >= DOG_CONFIG.DAMAGE_ANIM_DURATION) {
          if (this.health <= 0) {
            this.state = 'DEAD';
            this.deathTimer = 0;
            this.playSound('whimper');
          } else {
            // Recover from hit: face player and enter ALERT or CHASING
            this.facingRight = dx > 0;
            this.state = 'ALERT';
            this.alertTimer = DOG_CONFIG.ALERT_DURATION;
            this.animTime = 0;
            this.currentFrame = 0;
          }
        }
        break;
      }

      // ------------------------------------------------------------
      // 3. SLEEPING STATE (Initial resting state at spawn)
      // ------------------------------------------------------------
      case 'SLEEPING': {
        this.vx = 0;
        // Continuous looping sleep animation
        this.animTime += dt;
        const sleepFrames = this.frameDefs.sleep.length;
        this.currentFrame = Math.floor(this.animTime / 0.18) % sleepFrames;

        // Check if player entered detection radius OR if football rolled/flew nearby
        const ballDist = Math.hypot(football.x - dogCenterX, football.y - dogCenterY);
        const isBallNearAndMoving = ballDist <= DOG_CONFIG.DETECTION_RANGE * 0.85 && Math.hypot(football.vx, football.vy) > 60;

        if (distanceToPlayer <= DOG_CONFIG.DETECTION_RANGE || isBallNearAndMoving) {
          this.state = 'WAKING_UP';
          this.wakeupTimer = DOG_CONFIG.WAKEUP_DURATION;
          this.animTime = 0;
          this.currentFrame = 0;
          this.facingRight = dx > 0;
          this.playSound('growl');
        }
        break;
      }

      // ------------------------------------------------------------
      // 4. WAKING_UP STATE (Wake-up animation plays once completely)
      // ------------------------------------------------------------
      case 'WAKING_UP': {
        this.vx = 0;
        this.wakeupTimer -= dt;
        this.animTime += dt;
        const wakeupFrames = this.frameDefs.wakeup.length;
        this.currentFrame = Math.min(
          wakeupFrames - 1,
          Math.floor((this.animTime / DOG_CONFIG.WAKEUP_DURATION) * wakeupFrames)
        );

        if (this.wakeupTimer <= 0) {
          this.facingRight = dx > 0;
          if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE) {
            // Immediate bite if player is already within bite reach
            this.startBiteAttack();
          } else {
            this.state = 'ALERT';
            this.alertTimer = DOG_CONFIG.ALERT_DURATION;
            this.animTime = 0;
            this.currentFrame = 0;
          }
        }
        break;
      }

      // ------------------------------------------------------------
      // 5. ALERT STATE (Brief menacing look toward player)
      // ------------------------------------------------------------
      case 'ALERT': {
        this.vx = 0;
        this.facingRight = dx > 0;
        this.animTime += dt;
        const alertFrames = this.frameDefs.alert.length;
        this.currentFrame = Math.floor(this.animTime / 0.12) % alertFrames;

        // If player is unreachable on high platform, wait patiently underneath
        if (isPlayerElevatedUnreachable) {
          // If player has moved too far away horizontally, return home
          if (Math.abs(dx) > DOG_CONFIG.DETECTION_RANGE * 1.4 || distanceFromSpawn > DOG_CONFIG.MAX_CHASE_DISTANCE) {
            this.state = 'RETURNING';
            this.animTime = 0;
            this.currentFrame = 0;
          }
          break;
        }

        this.alertTimer -= dt;
        if (this.alertTimer <= 0) {
          if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE) {
            this.startBiteAttack();
          } else {
            this.state = 'CHASING';
            this.animTime = 0;
            this.currentFrame = 0;
          }
        }
        break;
      }

      // ------------------------------------------------------------
      // 6. CHASING STATE (Runs toward player within territory limits)
      // ------------------------------------------------------------
      case 'CHASING': {
        this.facingRight = dx > 0;

        // Check if player climbed to an unreachable ledge above
        if (isPlayerElevatedUnreachable && Math.abs(dx) < 60) {
          this.state = 'ALERT';
          this.alertTimer = 1.0;
          this.vx = 0;
          break;
        }

        // Check if dog reached its maximum chase territory from spawn
        if (distanceFromSpawn > DOG_CONFIG.MAX_CHASE_DISTANCE || distanceToPlayer > DOG_CONFIG.DETECTION_RANGE * 1.6) {
          this.state = 'RETURNING';
          this.animTime = 0;
          this.currentFrame = 0;
          break;
        }

        // Check if player is close enough to bite
        if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE && Math.abs(dy) < 55) {
          if (this.attackCooldownTimer <= 0) {
            this.startBiteAttack();
          } else {
            this.state = 'ATTACK_COOLDOWN';
          }
          break;
        }

        // Run horizontally towards player
        const moveDir = dx > 0 ? 1 : -1;
        this.vx = moveDir * DOG_CONFIG.MOVE_SPEED;

        // Loop running animation
        this.animTime += dt;
        const runFrames = this.frameDefs.run.length;
        this.currentFrame = Math.floor(this.animTime / 0.08) % runFrames;
        break;
      }

      // ------------------------------------------------------------
      // 7. ATTACKING STATE (Bite lunge with hit window)
      // ------------------------------------------------------------
      case 'ATTACKING': {
        this.vx = 0;
        this.animTime += dt;
        const biteFrames = this.frameDefs.bite.length;
        const biteDuration = 0.52; // Total bite animation time
        this.currentFrame = Math.min(
          biteFrames - 1,
          Math.floor((this.animTime / biteDuration) * biteFrames)
        );

        // Active Bite Hit Window (Frames 3 through 5)
        if (this.currentFrame >= 3 && this.currentFrame <= 5 && !this.hasDealtBiteDamage) {
          const biteBox = this.getBiteHitbox();
          const playerBox: Rect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height,
          };

          if (this.checkAABB(biteBox, playerBox)) {
            // Apply 25% of player's maximum health damage
            const damageAmount = 25; // 25 HP out of 100
            const knockDir = this.facingRight ? 260 : -260;
            player.takeDamage(damageAmount, knockDir);
            this.hasDealtBiteDamage = true;
            this.playSound('bite');
          }
        }

        // Finish bite animation
        if (this.animTime >= biteDuration) {
          this.attackCooldownTimer = DOG_CONFIG.BITE_COOLDOWN;
          if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE) {
            this.state = 'ATTACK_COOLDOWN';
          } else {
            this.state = 'CHASING';
          }
          this.animTime = 0;
          this.currentFrame = 0;
        }
        break;
      }

      // ------------------------------------------------------------
      // 8. ATTACK_COOLDOWN STATE (Short pause between bites)
      // ------------------------------------------------------------
      case 'ATTACK_COOLDOWN': {
        this.vx = 0;
        this.facingRight = dx > 0;
        this.animTime += dt;
        const alertFrames = this.frameDefs.alert.length;
        this.currentFrame = Math.floor(this.animTime / 0.14) % alertFrames;

        if (this.attackCooldownTimer <= 0) {
          if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE && Math.abs(dy) < 55) {
            this.startBiteAttack();
          } else {
            this.state = 'CHASING';
          }
        }
        break;
      }

      // ------------------------------------------------------------
      // 9. RETURNING STATE (Returns to original spawn position)
      // ------------------------------------------------------------
      case 'RETURNING': {
        const distToSpawn = this.spawnX - this.x;
        if (Math.abs(distToSpawn) < 8) {
          // Reached home spawn position: go back to sleep
          this.x = this.spawnX;
          this.y = this.spawnY;
          this.vx = 0;
          this.state = 'SLEEPING';
          this.animTime = 0;
          this.currentFrame = 0;
          break;
        }

        // If player enters detection radius again while returning, re-engage!
        if (distanceToPlayer <= DOG_CONFIG.DETECTION_RANGE && !isPlayerElevatedUnreachable) {
          this.facingRight = dx > 0;
          this.state = 'CHASING';
          this.animTime = 0;
          this.currentFrame = 0;
          break;
        }

        // Run back toward spawn
        const returnDir = distToSpawn > 0 ? 1 : -1;
        this.facingRight = returnDir > 0;
        this.vx = returnDir * DOG_CONFIG.RETURN_SPEED;

        this.animTime += dt;
        const runFrames = this.frameDefs.run.length;
        this.currentFrame = Math.floor(this.animTime / 0.09) % runFrames;
        break;
      }
    }

    // ============================================================
    // PHYSICS, GEOMETRY COLLISION & GRAVITY
    // ============================================================
    this.updatePhysics(dt, platforms, breakableWalls);
  }

  private startBiteAttack() {
    this.state = 'ATTACKING';
    this.animTime = 0;
    this.currentFrame = 0;
    this.hasDealtBiteDamage = false;
    this.vx = 0;
  }

  // Get active bite attack hitbox in front of the dog
  public getBiteHitbox(): Rect {
    const biteWidth = 36;
    const biteHeight = 44;
    const biteX = this.facingRight
      ? this.x + this.width - 6
      : this.x - biteWidth + 6;
    const biteY = this.y + 6;

    return { x: biteX, y: biteY, width: biteWidth, height: biteHeight };
  }

  // Receive football damage
  public takeDamage(damage: number, impactVx: number) {
    if (this.state === 'DEAD' || this.isDefeated) return;
    if (this.damageCooldownTimer > 0) return; // Prevent multi-hit

    this.health = Math.max(0, this.health - damage);
    this.damageCooldownTimer = DOG_CONFIG.DAMAGE_COOLDOWN;
    this.state = 'DAMAGED';
    this.animTime = 0;
    this.currentFrame = 0;

    // Apply knockback recoil
    const knockDir = impactVx > 0 ? 1 : -1;
    this.vx = knockDir * DOG_CONFIG.KNOCKBACK_FORCE;
    this.vy = -180;
    this.isGrounded = false;
    this.facingRight = knockDir < 0; // Face the direction impact came from

    this.playSound('hurt');
  }

  // Check if football strikes the dog
  public checkFootballCollision(football: Football): boolean {
    if (this.state === 'DEAD' || this.isDefeated || this.damageCooldownTimer > 0) {
      return false;
    }

    const dogBox: Rect = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
    const ballBox: Rect = {
      x: football.x,
      y: football.y,
      width: football.radius * 2,
      height: football.radius * 2,
    };

    if (!this.checkAABB(dogBox, ballBox)) return false;

    const ballSpeed = Math.hypot(football.vx, football.vy);

    // Only moving footballs deal damage
    if (ballSpeed >= DOG_CONFIG.HIT_SPEED_LOW) {
      let damage = DOG_CONFIG.LOW_DAMAGE;
      if (ballSpeed >= DOG_CONFIG.HIT_SPEED_HIGH) {
        damage = DOG_CONFIG.HIGH_DAMAGE;
      } else if (ballSpeed >= DOG_CONFIG.HIT_SPEED_MEDIUM) {
        damage = DOG_CONFIG.MEDIUM_DAMAGE;
      }

      this.takeDamage(damage, football.vx);

      // Deflect the football with bounce reaction
      football.vx = -football.vx * 0.45;
      football.vy = -Math.abs(football.vy) * 0.45 - 140;

      return true;
    }

    return false;
  }

  // Physics, solid wall & platform floor resolution
  private updatePhysics(dt: number, platforms: Platform[], breakableWalls: BreakableWall[] = []) {
    // 1. Horizontal movement & solid wall collision
    this.x += this.vx * dt;

    const allObstacles: Rect[] = [
      ...platforms.filter(p => p.type === 'wall' || p.type === 'ground'),
      ...breakableWalls.filter(w => !w.isBroken),
    ];

    for (const obs of allObstacles) {
      const dogBox: Rect = { x: this.x, y: this.y + 4, width: this.width, height: this.height - 8 };
      if (this.checkAABB(dogBox, obs)) {
        if (this.vx > 0) {
          this.x = obs.x - this.width;
          this.vx = 0;
        } else if (this.vx < 0) {
          this.x = obs.x + obs.width;
          this.vx = 0;
        }
      }
    }

    // 2. Vertical gravity & platform landing
    this.vy += DOG_CONFIG.GRAVITY * dt;
    this.y += this.vy * dt;
    this.isGrounded = false;

    for (const plat of platforms) {
      if (plat.type === 'ground' || plat.type === 'platform' || plat.type === 'bridge') {
        const isHorizontallyAligned =
          this.x + this.width > plat.x + 2 && this.x < plat.x + plat.width - 2;

        if (isHorizontallyAligned) {
          const dogFeet = this.y + this.height;
          // Check landing on top
          if (this.vy >= 0 && dogFeet >= plat.y && dogFeet <= plat.y + 24) {
            this.y = plat.y - this.height;
            this.vy = 0;
            this.isGrounded = true;
            break;
          }
        }
      }
    }
  }

  private checkAABB(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  // ==============================================================
  // RENDER DOG ENEMY CANVAS SPRITE
  // ==============================================================
  public render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number = 0,
    showDebug: boolean = false
  ) {
    if (this.isDefeated) return;

    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);

    // Pick sprite key corresponding to current AI state
    let animKey = 'sleep';
    switch (this.state) {
      case 'SLEEPING':
        animKey = 'sleep';
        break;
      case 'WAKING_UP':
        animKey = 'wakeup';
        break;
      case 'ALERT':
      case 'ATTACK_COOLDOWN':
        animKey = 'alert';
        break;
      case 'CHASING':
      case 'RETURNING':
        animKey = 'run';
        break;
      case 'ATTACKING':
        animKey = 'bite';
        break;
      case 'DAMAGED':
      case 'DEAD':
        animKey = 'damage';
        break;
    }

    const img = this.images[animKey] || this.images['enemy'];
    const frames = this.frameDefs[animKey] || this.frameDefs['enemy'];
    const frameIndex = Math.min(frames.length - 1, Math.max(0, this.currentFrame));
    const crop = frames[frameIndex] || { sx: 0, sy: 0, sw: 100, sh: 100 };

    ctx.save();

    // Death fade-out or damage flashing
    if (this.state === 'DEAD') {
      const alpha = Math.max(0, 1 - this.deathTimer / DOG_CONFIG.DEATH_FADE_DURATION);
      ctx.globalAlpha = alpha;
    } else if (this.damageCooldownTimer > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Ground-anchored sprite rendering
    const destX = drawX + this.spriteOffsetX;
    const destY = drawY + this.height - this.renderHeight - 4;

    if (!this.facingRight) {
      // Horizontal sprite flipping
      ctx.translate(destX + this.renderWidth, destY);
      ctx.scale(-1, 1);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(
          img,
          crop.sx,
          crop.sy,
          crop.sw,
          crop.sh,
          0,
          0,
          this.renderWidth,
          this.renderHeight
        );
      }
    } else {
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(
          img,
          crop.sx,
          crop.sy,
          crop.sw,
          crop.sh,
          destX,
          destY,
          this.renderWidth,
          this.renderHeight
        );
      }
    }

    ctx.restore();

    // Health Bar & State Indicator Badge Above Dog
    if (this.state !== 'SLEEPING' && this.state !== 'DEAD' && this.health > 0) {
      ctx.save();
      const barW = 46;
      const barH = 5;
      const barX = drawX + this.width / 2 - barW / 2;
      const barY = drawY - 14;

      // Background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      // Health Fill (Red to Amber to Green)
      const healthPct = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = healthPct > 0.5 ? '#22c55e' : healthPct > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, Math.round(barW * healthPct), barH);

      // State Label
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      const stateLabel = this.state === 'ATTACKING' ? '⚡ BITE!' : this.state === 'CHASING' ? '🐾 CHASE' : '👀 ALERT';
      ctx.fillText(stateLabel, drawX + this.width / 2, barY - 4);

      ctx.restore();
    } else if (this.state === 'SLEEPING') {
      // Animated Zzz's above sleeping dog
      ctx.save();
      const zTime = (performance.now() / 1000) % 2.5;
      const zY = drawY - 8 - zTime * 12;
      const zAlpha = Math.max(0, 1 - zTime / 2.5);
      ctx.globalAlpha = zAlpha;
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText('Zzz...', drawX + this.width / 2, zY);
      ctx.restore();
    }

    // Debug Bounding Boxes
    if (showDebug) {
      ctx.save();
      // Hitbox (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX, drawY, this.width, this.height);

      // Detection Range (Yellow dashed circle)
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(
        this.spawnX - cameraX + this.width / 2,
        this.spawnY - cameraY + this.height / 2,
        DOG_CONFIG.DETECTION_RANGE,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // Chase Territory Bounds (Orange dashed line)
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
      ctx.beginPath();
      ctx.moveTo(this.spawnX - DOG_CONFIG.MAX_CHASE_DISTANCE - cameraX, this.spawnY - cameraY + this.height);
      ctx.lineTo(this.spawnX + DOG_CONFIG.MAX_CHASE_DISTANCE - cameraX, this.spawnY - cameraY + this.height);
      ctx.stroke();

      // Attack Box if attacking (Cyan)
      if (this.state === 'ATTACKING') {
        const bite = this.getBiteHitbox();
        ctx.strokeStyle = '#06b6d4';
        ctx.setLineDash([]);
        ctx.strokeRect(bite.x - cameraX, bite.y - cameraY, bite.width, bite.height);
      }
      ctx.restore();
    }
  }
}
