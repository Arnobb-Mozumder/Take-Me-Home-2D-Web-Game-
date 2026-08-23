import { Platform, Rect, BreakableWall } from './types';
import { Player } from './Player';
import { Football } from './Football';
import { Crate } from './Crate';
import { DOG_CONFIG, DogState } from './DogConfig';
import { SaveManager, DogSpriteType, RatSpriteType } from './SaveManager';

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
  public growlSoundTimer = 0;

  // Obstacle & Blockage State
  public isBlockedByObstacle = false;
  public unreachableTimer = 0;
  public pacingTimer = 0;
  public pacingDir = 1;

  // Animation State
  public animTime = 0;
  public currentFrame = 0;
  public hasDealtBiteDamage = false;
  public isDefeated = false;
  public visibility = 1.0;

  // Visual offsets for drawing
  public renderWidth = DOG_CONFIG.RENDER_WIDTH;
  public renderHeight = DOG_CONFIG.RENDER_HEIGHT;
  public spriteOffsetX = DOG_CONFIG.SPRITE_OFFSET_X;
  public spriteOffsetY = DOG_CONFIG.SPRITE_OFFSET_Y;

  // Global Shared Sprite Image Assets & Loading Status Cache
  private static globalImages: { [key: string]: HTMLImageElement } = {};
  private static globalLoaded: { [key: string]: boolean } = {};
  private static isInitialized = false;

  // Precise frame definitions for all standard animations
  private static defaultFrameDefs: { [key: string]: FrameCrop[] } = {
    sleep: [
      { sx: 48, sy: 212, sw: 466, sh: 310 },
      { sx: 587, sy: 212, sw: 471, sh: 310 },
      { sx: 1115, sy: 212, sw: 493, sh: 310 },
      { sx: 1681, sy: 212, sw: 450, sh: 310 },
    ],
    wakeup: [
      { sx: 48, sy: 212, sw: 466, sh: 310 },
      { sx: 587, sy: 212, sw: 471, sh: 310 },
      { sx: 1115, sy: 212, sw: 493, sh: 310 },
      { sx: 1681, sy: 212, sw: 450, sh: 310 },
    ],
    alert: [
      { sx: 18, sy: 236, sw: 348, sh: 322 },
      { sx: 389, sy: 236, sw: 339, sh: 322 },
      { sx: 753, sy: 236, sw: 325, sh: 322 },
      { sx: 1091, sy: 236, sw: 334, sh: 322 },
      { sx: 1442, sy: 236, sw: 368, sh: 322 },
      { sx: 1812, sy: 236, sw: 328, sh: 322 },
    ],
    run: [
      { sx: 30, sy: 27, sw: 466, sh: 322 },
      { sx: 542, sy: 91, sw: 470, sh: 265 },
      { sx: 1036, sy: 91, sw: 525, sh: 265 },
      { sx: 1589, sy: 91, sw: 471, sh: 265 },
      { sx: 15, sy: 391, sw: 460, sh: 309 },
      { sx: 537, sy: 413, sw: 476, sh: 287 },
      { sx: 1041, sy: 413, sw: 514, sh: 287 },
      { sx: 1581, sy: 413, sw: 481, sh: 287 },
    ],
    bite: [
      { sx: 12, sy: 173, sw: 215, sh: 270 },
      { sx: 235, sy: 173, sw: 228, sh: 270 },
      { sx: 465, sy: 173, sw: 215, sh: 270 },
      { sx: 675, sy: 173, sw: 220, sh: 270 },
      { sx: 882, sy: 173, sw: 220, sh: 270 },
      { sx: 1084, sy: 173, sw: 235, sh: 270 },
      { sx: 1325, sy: 173, sw: 228, sh: 270 },
      { sx: 1555, sy: 173, sw: 215, sh: 270 },
      { sx: 10, sy: 545, sw: 224, sh: 255 },
      { sx: 229, sy: 545, sw: 227, sh: 255 },
      { sx: 460, sy: 545, sw: 225, sh: 255 },
      { sx: 682, sy: 545, sw: 220, sh: 255 },
      { sx: 908, sy: 545, sw: 205, sh: 255 },
      { sx: 1116, sy: 545, sw: 225, sh: 255 },
      { sx: 1342, sy: 545, sw: 210, sh: 255 },
      { sx: 1555, sy: 545, sw: 212, sh: 255 },
    ],
    damage: [
      { sx: 17, sy: 143, sw: 350, sh: 300 },
      { sx: 572, sy: 143, sw: 298, sh: 300 },
      { sx: 906, sy: 143, sw: 411, sh: 300 },
      { sx: 1354, sy: 143, sw: 397, sh: 300 },
      { sx: 17, sy: 500, sw: 423, sh: 320 },
      { sx: 477, sy: 500, sw: 390, sh: 320 },
      { sx: 909, sy: 500, sw: 390, sh: 320 },
      { sx: 1349, sy: 500, sw: 385, sh: 320 },
    ],
    enemy: [{ sx: 149, sy: 247, sw: 1248, sh: 544 }],
    rat_idle: [
      { sx: 85, sy: 25, sw: 624, sh: 441 },
      { sx: 845, sy: 23, sw: 633, sh: 444 },
      { sx: 86, sy: 520, sw: 624, sh: 444 },
      { sx: 850, sy: 519, sw: 628, sh: 446 },
    ],
    rat_run: [
      { sx: 16, sy: 162, sw: 409, sh: 284 },
      { sx: 392, sy: 171, sw: 423, sh: 275 },
      { sx: 799, sy: 190, sw: 383, sh: 257 },
      { sx: 1164, sy: 186, sw: 361, sh: 263 },
    ],
    rat_jump: [
      { sx: 32, sy: 184, sw: 453, sh: 264 },
      { sx: 513, sy: 131, sw: 514, sh: 303 },
      { sx: 1059, sy: 30, sw: 455, sh: 386 },
      { sx: 487, sy: 630, sw: 505, sh: 295 },
    ],
    rat_attack: [
      { sx: 109, sy: 9, sw: 633, sh: 454 },
      { sx: 809, sy: 48, sw: 823, sh: 405 },
      { sx: 35, sy: 441, sw: 824, sh: 490 },
      { sx: 964, sy: 495, sw: 674, sh: 422 },
    ],
    rat_block: [
      { sx: 91, sy: 58, sw: 618, sh: 413 },
      { sx: 857, sy: 16, sw: 611, sh: 464 },
      { sx: 0, sy: 463, sw: 767, sh: 511 },
      { sx: 868, sy: 496, sw: 628, sh: 480 },
    ],
    rat_boss: [{ sx: 0, sy: 0, sw: 1402, sh: 1122 }],
  };

  public static initAssetCache() {
    if (DogEnemy.isInitialized) return;
    DogEnemy.isInitialized = true;

    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.replace(/\/+$/, '');

    const assetList: { key: string; saveKey: DogSpriteType | RatSpriteType; defaultSrc: string }[] = [
      // Dog Sprites
      { key: 'sleep', saveKey: 'dog_sleep', defaultSrc: `${cleanBase}/dog_sleep.png` },
      { key: 'wakeup', saveKey: 'dog_wakeup', defaultSrc: `${cleanBase}/dog_wakeup.png` },
      { key: 'alert', saveKey: 'dog_alert', defaultSrc: `${cleanBase}/dog_alert.png` },
      { key: 'run', saveKey: 'dog_run', defaultSrc: `${cleanBase}/dog_run.png` },
      { key: 'bite', saveKey: 'dog_bite', defaultSrc: `${cleanBase}/dog_bite.png` },
      { key: 'damage', saveKey: 'dog_damage', defaultSrc: `${cleanBase}/dog_damage.png` },
      { key: 'enemy', saveKey: 'dog_enemy', defaultSrc: `${cleanBase}/dog_enemy.png` },
      // Rat Sprites
      { key: 'rat_idle', saveKey: 'rat_idle', defaultSrc: `${cleanBase}/rat_idle.png` },
      { key: 'rat_run', saveKey: 'rat_run', defaultSrc: `${cleanBase}/rat_run.png` },
      { key: 'rat_jump', saveKey: 'rat_jump', defaultSrc: `${cleanBase}/rat_jump.png` },
      { key: 'rat_attack', saveKey: 'rat_attack', defaultSrc: `${cleanBase}/rat_attack.png` },
      { key: 'rat_block', saveKey: 'rat_block', defaultSrc: `${cleanBase}/rat_block.png` },
      { key: 'rat_boss', saveKey: 'rat_boss', defaultSrc: `${cleanBase}/rat_boss.png` },
    ];

    assetList.forEach(item => {
      DogEnemy.loadSingleAsset(item.key, item.saveKey, item.defaultSrc);
    });

    // Listen for real-time SaveManager updates
    SaveManager.addSpriteChangeListener((type) => {
      if (type.startsWith('dog_') || type.startsWith('rat_')) {
        const item = assetList.find(a => a.saveKey === type);
        if (item) {
          DogEnemy.loadSingleAsset(item.key, item.saveKey, item.defaultSrc);
        }
      }
    });
  }

  private static loadSingleAsset(key: string, saveKey: DogSpriteType | RatSpriteType, defaultSrc: string) {
    const saved = SaveManager.getSavedSprite(saveKey);
    const src = saved?.dataUrl || defaultSrc;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      DogEnemy.globalImages[key] = img;
      DogEnemy.globalLoaded[key] = true;
    };
    img.onerror = () => {
      // If custom failed or default wakeup failed, fallback gracefully
      if (saved?.dataUrl) {
        console.warn(`Saved sprite ${saveKey} failed to load, falling back to default.`);
        DogEnemy.globalLoaded[key] = false;
        // Retry with default
        const defImg = new Image();
        defImg.crossOrigin = 'anonymous';
        defImg.onload = () => {
          DogEnemy.globalImages[key] = defImg;
          DogEnemy.globalLoaded[key] = true;
        };
        defImg.src = defaultSrc;
      } else if (key === 'wakeup') {
        DogEnemy.globalImages[key] = DogEnemy.globalImages['sleep'];
        DogEnemy.globalLoaded[key] = true;
      }
    };
    img.src = src;
    DogEnemy.globalImages[key] = img;
  }

  public static getLoadedImage(key: string): HTMLImageElement | null {
    const img = DogEnemy.globalImages[key] || DogEnemy.globalImages['rat_boss'] || DogEnemy.globalImages['enemy'];
    if (img && img.complete && img.naturalWidth > 0) {
      return img;
    }
    return null;
  }

  public isBoss: boolean = false;
  public bossTitle: string = '';
  public enemyType: 'dog' | 'rat' = 'dog';
  public isInBossRoom: boolean = false;

  constructor(
    id: string,
    spawnX: number,
    spawnY: number,
    customMaxHealth?: number,
    isBoss: boolean = false,
    bossTitle: string = '',
    enemyType?: 'dog' | 'rat',
    isInBossRoom: boolean = false
  ) {
    this.id = id;
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.x = spawnX;
    this.y = spawnY;
    this.isBoss = isBoss;
    this.bossTitle = bossTitle;
    this.enemyType = enemyType || (isBoss || id.includes('rat') ? 'rat' : 'dog');
    this.isInBossRoom = isInBossRoom || isBoss;

    if (customMaxHealth) {
      this.maxHealth = customMaxHealth;
      this.health = customMaxHealth;
    }

    if (this.isInBossRoom) {
      // In the boss room, dogs never sleep or idle - they start in aggressive chase
      this.state = 'CHASING';
    }

    if (isBoss) {
      // 3 times bigger than player (Player: 48w x 96h)
      this.width = 144; // 48 * 3
      this.height = 250;
      this.renderHeight = 288; // 96 * 3
      this.renderWidth = 360; // 288 * (1402 / 1122) = 360
      this.spriteOffsetX = Math.round((this.width - this.renderWidth) / 2);
      this.spriteOffsetY = -34;
      this.maxHealth = customMaxHealth || 180;
      this.health = this.maxHealth;
    }

    DogEnemy.initAssetCache();
  }

  public reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.state = this.isInBossRoom ? 'CHASING' : 'SLEEPING';
    this.health = this.maxHealth;
    this.wakeupTimer = 0;
    this.alertTimer = 0;
    this.attackCooldownTimer = 0;
    this.damageCooldownTimer = 0;
    this.deathTimer = 0;
    this.growlSoundTimer = 0;
    this.isBlockedByObstacle = false;
    this.unreachableTimer = 0;
    this.pacingTimer = 0;
    this.pacingDir = 1;
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
    cratesOrOnDefeated?: Crate[] | ((dog: DogEnemy) => void),
    onDefeated?: (dog: DogEnemy) => void
  ) {
    if (this.isDefeated) return;

    let crates: Crate[] = [];
    let onDefeatedCallback = onDefeated;

    if (typeof cratesOrOnDefeated === 'function') {
      onDefeatedCallback = cratesOrOnDefeated;
      crates = [];
    } else if (Array.isArray(cratesOrOnDefeated)) {
      crates = cratesOrOnDefeated;
    }

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

    // Collect solid obstacle bounding boxes (crates, breakable walls, static walls)
    const solidObstacles = this.getSolidObstacles(platforms, breakableWalls, crates);

    // Check if player is on an elevated platform/crate or high above dog
    const playerFeetY = player.y + player.height;
    const dogFeetY = this.y + this.height;
    const isPlayerElevatedUnreachable =
      (dogFeetY - playerFeetY > 38) ||
      (playerFeetY - dogFeetY > 80) ||
      (player.y < this.y - 60);

    // Check if path is blocked by solid obstacle/wall/crate
    const isObstacleBlocked = this.checkIsPathBlocked(dx, player, solidObstacles);
    const isUnreachable = isPlayerElevatedUnreachable || isObstacleBlocked;

    // Check if player is too far away from dog territory
    const isPlayerTooFar = distanceToPlayer > DOG_CONFIG.DETECTION_RANGE * 1.6;

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
          if (onDefeatedCallback) onDefeatedCallback(this);
        }
        break;
      }

      // ------------------------------------------------------------
      // 2. DAMAGED STATE (Recoil, play damage animation)
      // ------------------------------------------------------------
      case 'DAMAGED': {
        this.animTime += dt;
        const damageFrames = DogEnemy.defaultFrameDefs.damage.length;
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
            // Recover from hit: face player and enter ALERT (or CHASING in boss room)
            this.facingRight = dx > 0;
            if (this.isInBossRoom) {
              this.state = 'CHASING';
            } else {
              this.state = 'ALERT';
              this.alertTimer = DOG_CONFIG.ALERT_DURATION;
            }
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
        // Dogs inside the boss room NEVER sleep or stay idle
        if (this.isInBossRoom) {
          this.state = 'CHASING';
          this.animTime = 0;
          this.currentFrame = 0;
          break;
        }

        this.vx = 0;
        this.animTime += dt;
        const sleepFrames = DogEnemy.defaultFrameDefs.sleep.length;
        this.currentFrame = Math.floor(this.animTime / 0.18) % sleepFrames;

        // Check if player entered detection radius OR if football rolled/flew nearby
        const ballDist = Math.hypot(football.x - dogCenterX, football.y - dogCenterY);
        const isBallNearAndMoving =
          ballDist <= DOG_CONFIG.DETECTION_RANGE * 0.85 && Math.hypot(football.vx, football.vy) > 60;

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
        if (this.isInBossRoom) {
          this.state = 'CHASING';
          this.animTime = 0;
          this.currentFrame = 0;
          break;
        }

        this.vx = 0;
        this.wakeupTimer -= dt;
        this.animTime += dt;
        const wakeupFrames = DogEnemy.defaultFrameDefs.wakeup.length;
        this.currentFrame = Math.min(
          wakeupFrames - 1,
          Math.floor((this.animTime / DOG_CONFIG.WAKEUP_DURATION) * wakeupFrames)
        );

        if (this.wakeupTimer <= 0) {
          this.facingRight = dx > 0;
          this.state = 'ALERT';
          this.alertTimer = DOG_CONFIG.ALERT_DURATION;
          this.animTime = 0;
          this.currentFrame = 0;
        }
        break;
      }

      // ------------------------------------------------------------
      // 5. ALERT STATE (Alert stance, growling, watching player on loop)
      // ------------------------------------------------------------
      case 'ALERT': {
        this.facingRight = dx > 0;
        this.vx = 0;
        this.animTime += dt;
        const alertFrames = DogEnemy.defaultFrameDefs.alert.length;
        this.currentFrame = Math.floor(this.animTime / 0.12) % alertFrames;

        // In boss room, dogs never linger in alert or sleep: immediately chase or bite!
        if (this.isInBossRoom) {
          if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE && Math.abs(dy) < 55) {
            this.startBiteAttack();
          } else {
            this.state = 'CHASING';
            this.animTime = 0;
            this.currentFrame = 0;
          }
          break;
        }

        // Periodic menacing growl while in alert mode
        this.growlSoundTimer += dt;
        if (this.growlSoundTimer >= 2.8) {
          this.growlSoundTimer = 0;
          this.playSound('growl');
        }

        // 1. Dog only returns to sleep when player is too far away
        if (isPlayerTooFar) {
          this.state = 'RETURNING';
          this.animTime = 0;
          this.currentFrame = 0;
          break;
        }

        // 2. If player is close but unreachable (high platform or blocked by obstacle):
        // PLAY ALERT MODE ON CONTINUOUS LOOP!
        if (isUnreachable) {
          // Maintain alert stance facing player
          this.vx = 0;
          break;
        }

        // 3. Player is within range, on the SAME ground, with a clear path:
        // Transition to chase (run) or bite attack
        this.alertTimer -= dt;
        if (this.alertTimer <= 0) {
          if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE && Math.abs(dy) < 45) {
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
      // 6. CHASING STATE (Runs towards player when on same ground)
      // ------------------------------------------------------------
      case 'CHASING': {
        this.facingRight = dx > 0;

        // If outside boss room and player moves too far away: return to spawn and sleep
        if (!this.isInBossRoom && isPlayerTooFar) {
          this.state = 'RETURNING';
          this.animTime = 0;
          this.currentFrame = 0;
          break;
        }

        // If outside boss room and player climbs high platform or path becomes blocked:
        if (!this.isInBossRoom && isUnreachable) {
          this.state = 'ALERT';
          this.alertTimer = DOG_CONFIG.ALERT_DURATION;
          this.vx = 0;
          this.animTime = 0;
          this.currentFrame = 0;
          break;
        }

        // Check if close enough to bite
        const biteReachY = this.isInBossRoom ? 55 : 45;
        if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE && Math.abs(dy) < biteReachY) {
          if (this.attackCooldownTimer <= 0) {
            this.startBiteAttack();
          } else {
            this.state = 'ATTACK_COOLDOWN';
          }
          break;
        }

        // If directly facing a low jumpable obstacle (e.g. low crate <= 54px):
        const lowObstacle = this.findLowObstacleInFront(dx, solidObstacles);
        if (lowObstacle && this.isGrounded) {
          this.vy = -380;
          this.isGrounded = false;
        }

        // Run horizontally towards player relentlessly
        const moveDir = dx > 0 ? 1 : -1;
        this.vx = moveDir * DOG_CONFIG.MOVE_SPEED;

        // Loop running animation
        this.animTime += dt;
        const runFrames = DogEnemy.defaultFrameDefs.run.length;
        this.currentFrame = Math.floor(this.animTime / 0.08) % runFrames;
        break;
      }

      // ------------------------------------------------------------
      // 7. ATTACKING STATE (Bite lunge with hit window)
      // ------------------------------------------------------------
      case 'ATTACKING': {
        this.vx = 0;
        this.animTime += dt;
        const biteFrames = DogEnemy.defaultFrameDefs.bite.length;
        const biteDuration = 0.52; // Total bite animation time
        this.currentFrame = Math.min(
          biteFrames - 1,
          Math.floor((this.animTime / biteDuration) * biteFrames)
        );

        // Active Bite Hit Window (Frames 3 through 6)
        if (this.currentFrame >= 3 && this.currentFrame <= 6 && !this.hasDealtBiteDamage) {
          if (!isObstacleBlocked || this.isInBossRoom) {
            const biteBox = this.getBiteHitbox();
            const playerBox: Rect = {
              x: player.x,
              y: player.y,
              width: player.width,
              height: player.height,
            };

            if (this.checkAABB(biteBox, playerBox)) {
              const damageAmount = this.enemyType === 'rat' ? 35 : 28; // Increased rat attack damage
              const knockDir = this.facingRight ? 300 : -300;
              player.takeDamage(damageAmount, knockDir);
              this.hasDealtBiteDamage = true;
              this.playSound('bite');
            }
          }
        }

        // Finish bite animation
        if (this.animTime >= biteDuration) {
          this.attackCooldownTimer = DOG_CONFIG.BITE_COOLDOWN;
          if (this.isInBossRoom) {
            if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE) {
              this.state = 'ATTACK_COOLDOWN';
            } else {
              this.state = 'CHASING';
            }
          } else {
            if (isUnreachable) {
              this.state = 'ALERT';
              this.alertTimer = DOG_CONFIG.ALERT_DURATION;
            } else if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE) {
              this.state = 'ATTACK_COOLDOWN';
            } else {
              this.state = 'CHASING';
            }
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
        const alertFrames = DogEnemy.defaultFrameDefs.alert.length;
        this.currentFrame = Math.floor(this.animTime / 0.14) % alertFrames;

        if (!this.isInBossRoom) {
          if (isPlayerTooFar) {
            this.state = 'RETURNING';
            this.animTime = 0;
            this.currentFrame = 0;
            break;
          }

          if (isUnreachable) {
            this.state = 'ALERT';
            this.alertTimer = DOG_CONFIG.ALERT_DURATION;
            break;
          }
        }

        if (this.attackCooldownTimer <= 0) {
          const biteReachY = this.isInBossRoom ? 55 : 45;
          if (distanceToPlayer <= DOG_CONFIG.ATTACK_RANGE && Math.abs(dy) < biteReachY) {
            this.startBiteAttack();
          } else {
            this.state = 'CHASING';
          }
        }
        break;
      }

      // ------------------------------------------------------------
      // 9. RETURNING STATE (Returns to local territory and rests)
      // ------------------------------------------------------------
      case 'RETURNING': {
        // Dogs inside boss room never return to spawn or sleep
        if (this.isInBossRoom) {
          this.state = 'CHASING';
          this.animTime = 0;
          this.currentFrame = 0;
          break;
        }
        // If dog has moved to a new floor or area, establish new local home anchor
        if (Math.abs(this.y - this.spawnY) > 60 || Math.abs(this.x - this.spawnX) > 300) {
          this.spawnX = this.x;
          this.spawnY = this.y;
        }

        const distToSpawn = this.spawnX - this.x;
        if (Math.abs(distToSpawn) < 14 || this.isBlockedByObstacle) {
          // Reached resting position: go back to sleep on current ground
          this.spawnX = this.x;
          this.spawnY = this.y;
          this.vx = 0;
          this.state = 'SLEEPING';
          this.animTime = 0;
          this.currentFrame = 0;
          break;
        }

        // If player enters detection radius again while returning:
        if (distanceToPlayer <= DOG_CONFIG.DETECTION_RANGE) {
          if (isUnreachable) {
            this.facingRight = dx > 0;
            this.state = 'ALERT';
            this.alertTimer = DOG_CONFIG.ALERT_DURATION;
            this.vx = 0;
            this.animTime = 0;
            this.currentFrame = 0;
            break;
          } else {
            this.facingRight = dx > 0;
            this.state = 'CHASING';
            this.animTime = 0;
            this.currentFrame = 0;
            break;
          }
        }

        // Run back toward local home anchor
        const returnDir = distToSpawn > 0 ? 1 : -1;
        this.facingRight = returnDir > 0;
        this.vx = returnDir * DOG_CONFIG.RETURN_SPEED;

        this.animTime += dt;
        const runFrames = DogEnemy.defaultFrameDefs.run.length;
        this.currentFrame = Math.floor(this.animTime / 0.09) % runFrames;
        break;
      }
    }

    // ============================================================
    // PHYSICS, GEOMETRY COLLISION & GRAVITY
    // ============================================================
    this.updatePhysics(dt, platforms, breakableWalls, crates);
  }

  private startBiteAttack() {
    this.state = 'ATTACKING';
    this.animTime = 0;
    this.currentFrame = 0;
    this.hasDealtBiteDamage = false;
    this.vx = 0;
  }

  // Get active bite attack hitbox in front of the dog / rat boss
  public getBiteHitbox(): Rect {
    const biteWidth = this.isBoss ? 70 : 36;
    const biteHeight = this.isBoss ? 160 : 44;
    const biteX = this.facingRight
      ? this.x + this.width - 10
      : this.x - biteWidth + 10;
    const biteY = this.y + (this.isBoss ? 40 : 6);

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

  // Collect all solid obstacle bounding boxes (crates, breakable walls, static walls)
  private getSolidObstacles(
    platforms: Platform[],
    breakableWalls: BreakableWall[] = [],
    crates: Crate[] = []
  ): Rect[] {
    const obstacles: Rect[] = [];

    // 1. Crates
    for (const crate of crates) {
      obstacles.push(crate.getRect());
    }

    // 2. Unbroken breakable walls
    for (const wall of breakableWalls) {
      if (!wall.isBroken) {
        obstacles.push({
          x: wall.x,
          y: wall.y,
          width: wall.width,
          height: wall.height,
        });
      }
    }

    // 3. Platform walls and solid ground steps that block movement
    for (const plat of platforms) {
      if (plat.type === 'wall') {
        obstacles.push({
          x: plat.x,
          y: plat.y,
          width: plat.width,
          height: plat.height,
        });
      } else if (plat.type === 'ground' || plat.type === 'platform') {
        if (plat.y < this.y + this.height - 10 && plat.y + plat.height > this.y + 8) {
          obstacles.push({
            x: plat.x,
            y: plat.y,
            width: plat.width,
            height: plat.height,
          });
        }
      }
    }

    return obstacles;
  }

  // Check if an impassable obstacle is between the dog and the player horizontally,
  // or if the dog is directly facing/blocked by a solid obstacle
  private checkIsPathBlocked(
    dx: number,
    player: Player,
    obstacles: Rect[]
  ): boolean {
    if (this.isBlockedByObstacle) return true;

    // Check direct proximity sensor in front of dog
    if (this.checkIsDirectlyBlocked(dx, obstacles)) {
      // If it's a jumpable low obstacle, path isn't blocked
      if (!this.findLowObstacleInFront(dx, obstacles)) {
        return true;
      }
    }

    // Check if there is a solid wall/obstacle between dog and player horizontally
    const minX = Math.min(this.x + this.width / 2, player.x + player.width / 2);
    const maxX = Math.max(this.x + this.width / 2, player.x + player.width / 2);
    const dogFeetY = this.y + this.height;

    for (const obs of obstacles) {
      const obsCenterX = obs.x + obs.width / 2;
      if (obsCenterX > minX && obsCenterX < maxX) {
        // Check if obstacle spans the vertical area between dog and player
        if (obs.y < dogFeetY - 14 && obs.y + obs.height > this.y + 10) {
          // If height is taller than 54px or is a solid/breakable wall
          if (obs.height > 54) {
            return true;
          }
        }
      }
    }

    return false;
  }

  // Check if dog's immediate path in player's direction is blocked by a solid obstacle/crate/wall
  private checkIsDirectlyBlocked(
    dx: number,
    obstacles: Rect[]
  ): boolean {
    const dir = dx > 0 ? 1 : -1;
    const sensorDist = 20;
    const frontSensorBox: Rect = {
      x: dir > 0 ? this.x + this.width - 2 : this.x - sensorDist + 2,
      y: this.y + 8,
      width: sensorDist,
      height: this.height - 16,
    };

    for (const obs of obstacles) {
      if (this.checkAABB(frontSensorBox, obs)) {
        return true;
      }
    }

    return this.isBlockedByObstacle;
  }

  // Check if the obstacle directly in front is jumpable (e.g. low crate or step <= 54px high)
  private findLowObstacleInFront(
    dx: number,
    obstacles: Rect[]
  ): boolean {
    const dir = dx > 0 ? 1 : -1;
    const sensorDist = 24;
    const frontSensorBox: Rect = {
      x: dir > 0 ? this.x + this.width - 2 : this.x - sensorDist + 2,
      y: this.y + 8,
      width: sensorDist,
      height: this.height - 16,
    };

    for (const obs of obstacles) {
      if (this.checkAABB(frontSensorBox, obs)) {
        const dogFeetY = this.y + this.height;
        const obstacleTopY = obs.y;
        // If the top of obstacle is within low jump height (< 54px above dog feet)
        if (dogFeetY - obstacleTopY <= 54 && obs.height <= 64) {
          return true;
        }
      }
    }

    return false;
  }

  // Physics, solid wall, crate & platform floor resolution
  private updatePhysics(
    dt: number,
    platforms: Platform[],
    breakableWalls: BreakableWall[] = [],
    crates: Crate[] = []
  ) {
    // 1. Horizontal movement & solid wall / crate collision
    this.isBlockedByObstacle = false;
    this.x += this.vx * dt;

    const allObstacles = this.getSolidObstacles(platforms, breakableWalls, crates);

    for (const obs of allObstacles) {
      const dogBox: Rect = { x: this.x, y: this.y + 6, width: this.width, height: this.height - 12 };
      if (this.checkAABB(dogBox, obs)) {
        if (this.vx > 0) {
          this.x = obs.x - this.width;
          this.vx = 0;
          this.isBlockedByObstacle = true;
        } else if (this.vx < 0) {
          this.x = obs.x + obs.width;
          this.vx = 0;
          this.isBlockedByObstacle = true;
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

    // Landing on top of crates
    if (!this.isGrounded) {
      for (const crate of crates) {
        const isHorizontallyAligned =
          this.x + this.width > crate.x + 2 && this.x < crate.x + crate.width - 2;

        if (isHorizontallyAligned) {
          const dogFeet = this.y + this.height;
          if (this.vy >= 0 && dogFeet >= crate.y && dogFeet <= crate.y + 24) {
            this.y = crate.y - this.height;
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
    if (this.visibility <= 0.01) return;

    ctx.save();
    if (this.visibility < 0.99) {
      ctx.globalAlpha = this.visibility;
    }

    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);

    // Pick sprite key corresponding to current AI state and enemy type
    let animKey = 'sleep';
    if (this.isBoss) {
      // Main Boss Character strictly uses rat_boss.png
      animKey = 'rat_boss';
    } else if (this.enemyType === 'rat') {
      if (Math.abs(this.vy) > 80 && !this.isGrounded) {
        animKey = 'rat_jump';
      } else {
        switch (this.state) {
          case 'SLEEPING':
          case 'WAKING_UP':
          case 'ALERT':
          case 'ATTACK_COOLDOWN':
            animKey = 'rat_idle';
            break;
          case 'CHASING':
          case 'RETURNING':
            animKey = 'rat_run';
            break;
          case 'ATTACKING':
            animKey = 'rat_attack';
            break;
          case 'DAMAGED':
            animKey = 'rat_block';
            break;
          case 'DEAD':
            animKey = 'rat_boss';
            break;
          default:
            animKey = 'rat_idle';
        }
      }
    } else {
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
    }

    const img = DogEnemy.getLoadedImage(animKey);
    const crop = this.getFrameCrop(img, animKey, this.currentFrame);

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
      } else {
        this.drawVectorDogFallback(ctx, this.state, this.currentFrame, this.renderWidth, this.renderHeight);
      }
    } else {
      ctx.translate(destX, destY);
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
      } else {
        this.drawVectorDogFallback(ctx, this.state, this.currentFrame, this.renderWidth, this.renderHeight);
      }
    }

    ctx.restore();

    // Health Bar & State Indicator Badge Above Dog / Boss
    if (this.state !== 'SLEEPING' && this.state !== 'DEAD' && this.health > 0) {
      ctx.save();

      if (this.isBoss) {
        // Grand Boss Health Bar & Title
        const barW = 140;
        const barH = 10;
        const barX = drawX + this.width / 2 - barW / 2;
        const barY = drawY - 26;

        // Glowing outer frame
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#e11d48';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Health Fill
        const healthPct = Math.max(0, this.health / this.maxHealth);
        const fillW = Math.round(barW * healthPct);
        const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        grad.addColorStop(0, '#f43f5e');
        grad.addColorStop(1, '#fb7185');
        ctx.fillStyle = grad;
        ctx.fillRect(barX, barY, fillW, barH);

        // Segments
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
        ctx.lineWidth = 1.5;
        for (let seg = 1; seg < this.maxHealth; seg++) {
          const sx = barX + (barW / this.maxHealth) * seg;
          ctx.beginPath();
          ctx.moveTo(sx, barY);
          ctx.lineTo(sx, barY + barH);
          ctx.stroke();
        }

        // Boss Title Badge
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        const label = this.bossTitle || '👑 THE RATKEEPER';
        ctx.fillText(label, drawX + this.width / 2, barY - 8);
      } else {
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
      }

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

  private getFrameCrop(img: HTMLImageElement | null, animKey: string, frameIndex: number): FrameCrop {
    if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      return { sx: 0, sy: 0, sw: 100, sh: 100 };
    }

    const defaultFrames = DogEnemy.defaultFrameDefs[animKey] || DogEnemy.defaultFrameDefs['enemy'];
    const def = defaultFrames[Math.min(defaultFrames.length - 1, Math.max(0, frameIndex))];

    // If the image matches the expected original dimensions (~2100+ px), use default definition
    if (def && (def.sx + def.sw) <= img.naturalWidth && (def.sy + def.sh) <= img.naturalHeight) {
      return def;
    }

    // Expected frame count per animation type
    let expectedCount = 4;
    if (animKey === 'alert') expectedCount = 6;
    else if (animKey === 'run') expectedCount = 8;
    else if (animKey === 'bite') expectedCount = 8;
    else if (animKey === 'damage') expectedCount = 6;
    else if (animKey === 'enemy') expectedCount = 1;
    else if (animKey === 'rat_idle') expectedCount = 4;
    else if (animKey === 'rat_run') expectedCount = 8;
    else if (animKey === 'rat_jump') expectedCount = 6;
    else if (animKey === 'rat_attack') expectedCount = 4;
    else if (animKey === 'rat_block') expectedCount = 4;
    else if (animKey === 'rat_boss') expectedCount = 1;

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const aspect = imgW / imgH;

    // 1. Single frame image
    if (expectedCount === 1 || (aspect >= 0.8 && aspect <= 1.2 && expectedCount <= 2)) {
      return { sx: 0, sy: 0, sw: imgW, sh: imgH };
    }

    // 2. Wide horizontal strip (e.g. aspect > 2.0)
    if (aspect > 2.0) {
      const cols = expectedCount;
      const col = Math.min(cols - 1, Math.max(0, frameIndex % cols));
      const sw = imgW / cols;
      const sh = imgH;
      return { sx: Math.round(col * sw), sy: 0, sw: Math.round(sw), sh: Math.round(sh) };
    }

    // 3. Grid layout (2 rows)
    const rows = 2;
    const cols = Math.ceil(expectedCount / rows);
    const safeIdx = Math.min(expectedCount - 1, Math.max(0, frameIndex));
    const row = Math.floor(safeIdx / cols) % rows;
    const col = Math.floor(safeIdx % cols);
    const sw = imgW / cols;
    const sh = imgH / rows;
    return {
      sx: Math.round(col * sw),
      sy: Math.round(row * sh),
      sw: Math.round(sw),
      sh: Math.round(sh),
    };
  }

  // Robust procedural vector fallback rendering when sprite image is loading or missing
  private drawVectorDogFallback(
    ctx: CanvasRenderingContext2D,
    state: DogState,
    frame: number,
    w: number,
    h: number
  ) {
    ctx.save();

    const scaleX = w / 108;
    const scaleY = h / 78;
    ctx.scale(scaleX, scaleY);

    const isSleeping = state === 'SLEEPING';
    const isWaking = state === 'WAKING_UP';
    const isAlert = state === 'ALERT' || state === 'ATTACK_COOLDOWN';
    const isRunning = state === 'CHASING' || state === 'RETURNING';
    const isAttacking = state === 'ATTACKING';
    const isDamaged = state === 'DAMAGED' || state === 'DEAD';

    // Tail motion
    const time = performance.now() / 1000;
    const tailWag = isRunning ? Math.sin(time * 18) * 12 : isAlert ? Math.sin(time * 10) * 8 : isSleeping ? 0 : Math.sin(time * 4) * 4;

    // Body Colors
    const coatColor = isDamaged ? '#ef4444' : '#78350f'; // Dark amber/brown coat
    const bellyColor = isDamaged ? '#fca5a5' : '#b45309'; // Warm amber underbelly
    const darkFur = isDamaged ? '#991b1b' : '#451a03'; // Muzzle/ear dark tips
    const collarColor = '#dc2626'; // Red spiked collar
    const tagColor = '#facc15'; // Gold dog tag

    if (isSleeping) {
      // Curled sleeping dog
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(54, 72, 38, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curled Body
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.ellipse(54, 52, 34, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Belly patch
      ctx.fillStyle = bellyColor;
      ctx.beginPath();
      ctx.ellipse(52, 54, 24, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail curled
      ctx.strokeStyle = coatColor;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(84, 50, 14, Math.PI * 0.2, Math.PI * 1.1);
      ctx.stroke();

      // Curled Head resting on paws
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.arc(36, 52, 16, 0, Math.PI * 2);
      ctx.fill();

      // Snout
      ctx.fillStyle = darkFur;
      ctx.beginPath();
      ctx.ellipse(26, 56, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nose
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(19, 55, 3, 0, Math.PI * 2);
      ctx.fill();

      // Drooping Ear
      ctx.fillStyle = darkFur;
      ctx.beginPath();
      ctx.ellipse(40, 43, 7, 12, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Sleeping Closed Eye (Curve)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(32, 48, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Collar
      ctx.fillStyle = collarColor;
      ctx.fillRect(36, 56, 6, 6);
    } else {
      // Active Dog (Alert, Running, Attacking, Damaged)
      const legPhase = (frame % 8) / 8;
      const legStride = Math.sin(legPhase * Math.PI * 2) * 16;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(54, 72, 40, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.strokeStyle = coatColor;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(86, 36);
      ctx.quadraticCurveTo(98, 22 + tailWag, 104, 18 + tailWag * 1.2);
      ctx.stroke();

      // Back Legs
      ctx.fillStyle = darkFur;
      if (isRunning) {
        ctx.fillRect(72 - legStride * 0.6, 46, 9, 26);
        ctx.fillRect(62 + legStride * 0.6, 46, 9, 26);
      } else {
        ctx.fillRect(74, 46, 9, 26);
        ctx.fillRect(66, 48, 9, 24);
      }

      // Main Torso Body
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.roundRect(36, 28, 52, 28, 12);
      ctx.fill();

      // Chest / Belly Fur
      ctx.fillStyle = bellyColor;
      ctx.beginPath();
      ctx.ellipse(50, 44, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Front Legs
      ctx.fillStyle = coatColor;
      if (isRunning) {
        ctx.fillRect(38 + legStride, 44, 9, 28);
        ctx.fillRect(48 - legStride, 44, 9, 28);
      } else if (isAttacking) {
        ctx.fillRect(32, 46, 9, 24);
        ctx.fillRect(44, 44, 9, 26);
      } else {
        ctx.fillRect(36, 44, 9, 28);
        ctx.fillRect(46, 44, 9, 28);
      }

      // Head position
      const headX = isAttacking ? 22 : 28;
      const headY = isAttacking ? 28 : isAlert ? 18 : 22;

      // Head
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.arc(headX, headY, 16, 0, Math.PI * 2);
      ctx.fill();

      // Collar
      ctx.fillStyle = collarColor;
      ctx.fillRect(headX + 4, headY + 8, 7, 12);
      ctx.fillStyle = tagColor;
      ctx.beginPath();
      ctx.arc(headX + 7, headY + 16, 3, 0, Math.PI * 2);
      ctx.fill();

      // Perked Ears
      ctx.fillStyle = darkFur;
      ctx.beginPath();
      ctx.moveTo(headX + 2, headY - 10);
      ctx.lineTo(headX + 9, headY - 26);
      ctx.lineTo(headX + 16, headY - 8);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(headX - 6, headY - 8);
      ctx.lineTo(headX - 1, headY - 24);
      ctx.lineTo(headX + 6, headY - 8);
      ctx.closePath();
      ctx.fill();

      // Muzzle & Snout
      ctx.fillStyle = darkFur;
      if (isAttacking) {
        // Open Jaws
        ctx.beginPath();
        ctx.moveTo(headX - 4, headY - 2);
        ctx.lineTo(headX - 22, headY - 6);
        ctx.lineTo(headX - 8, headY + 2);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(headX - 4, headY + 4);
        ctx.lineTo(headX - 18, headY + 14);
        ctx.lineTo(headX - 6, headY + 8);
        ctx.closePath();
        ctx.fill();

        // White Fangs
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(headX - 18, headY - 5);
        ctx.lineTo(headX - 15, headY - 1);
        ctx.lineTo(headX - 12, headY - 4);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(headX - 15, headY + 11);
        ctx.lineTo(headX - 13, headY + 6);
        ctx.lineTo(headX - 10, headY + 9);
        ctx.closePath();
        ctx.fill();
      } else {
        // Closed Muzzle
        ctx.beginPath();
        ctx.ellipse(headX - 10, headY + 3, 11, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Black Nose
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(headX - 18, headY + 1, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyes
      if (isDamaged) {
        // Wincing X Eyes
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(headX - 4, headY - 6);
        ctx.lineTo(headX + 2, headY);
        ctx.moveTo(headX + 2, headY - 6);
        ctx.lineTo(headX - 4, headY);
        ctx.stroke();
      } else if (isAlert || isRunning || isAttacking) {
        // Wide Glowing Alert Eyes
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(headX - 1, headY - 4, 4.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(headX - 2, headY - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // White Glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(headX - 3, headY - 5, 1, 0, Math.PI * 2);
        ctx.fill();
      } else if (isWaking) {
        // Half Open Drowsy Eyes
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(headX - 1, headY - 3, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(headX - 1, headY - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
