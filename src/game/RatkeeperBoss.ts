import { Platform, Rect } from './types';
import { Player } from './Player';
import { Football } from './Football';
import { BossHole, HoleId } from './BossHole';
import { BossArena } from './BossArena';
import { DogEnemy } from './DogEnemy';
import { BossProjectile } from './BossProjectile';
import { WarningMarker } from './WarningMarker';
import { HealthPotion } from './HealthPotion';
import { SpriteSheet } from './SpriteSheet';
import {
  BossState,
  BossPhase,
  HolePatternName,
  RATKEEPER_CONFIG,
  RATKEEPER_PATTERNS,
} from './RatkeeperConfig';
import { SaveManager } from './SaveManager';

export interface BossParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'flame' | 'steam' | 'spark' | 'smoke' | 'rock';
}

interface FloatingCombatText {
  text: string;
  x: number;
  y: number;
  color: string;
  strokeColor: string;
  alpha: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class RatkeeperBoss implements Rect {
  public id = 'ratkeeper-boss';
  public name = RATKEEPER_CONFIG.BOSS_NAME;

  // Spatial Dimensions & Hitbox
  public x: number;
  public y: number;
  public width = RATKEEPER_CONFIG.HITBOX_WIDTH;
  public height = RATKEEPER_CONFIG.HITBOX_HEIGHT;
  public spawnX: number;
  public spawnY: number;

  public vx = 0;
  public vy = 0;
  public isGrounded = false;
  public facingRight = false; // Initially faces left toward player entrance

  // Boss Stats & Phase System
  public health = RATKEEPER_CONFIG.MAX_HEALTH;
  public maxHealth = RATKEEPER_CONFIG.MAX_HEALTH;
  public currentPhase: BossPhase = 'PHASE_1';
  public state: BossState = 'IDLE_STANCE';
  public isDefeated = false;

  // State Timers
  public stateTimer = 0;
  public attackCooldown = 1.5;
  public hurtTimer = 0;
  public blockTimer = 0;
  public burrowTimer = 0;
  public dogSummonCooldown = RATKEEPER_CONFIG.DOG_SUMMON_COOLDOWN;
  public rapidFireCounter = 0;
  public rapidFireTimer = 0;

  // STEP 13 & 14: Phase 2 Alternation & Hole Transition State
  public phase2NextAttack: 'AIR' | 'HOLE' = 'AIR';
  public activeHolePattern: HolePatternName = 'PHASE_1_OPPOSITE';
  public currentPatternStep = 0;
  public currentEnterHole: HoleId = 'HOLE_1';
  public currentExitHole: HoleId = 'HOLE_2';
  public isUnderground = false;
  public isExposingBackInHole = false;

  // STEP 13: Aerial Attack & Ground Warning Markers
  public airAttackSubState: 'LEAP' | 'BOMBARDMENT' | 'SLAM' = 'LEAP';
  public airBombardmentTimer = 0;
  public airShotsSpawned = 0;
  public airTargetX = 0;
  public shadowTelegraphAlpha = 0;
  public warningMarkers: WarningMarker[] = [];

  // STEP 15: Second Health Potion Flag
  public secondPotionSpawned = false;

  // STEP 16, 17, 18: Phase 3 Minion Pack & Fire Rain Transition
  public hasTriggeredPhase3 = false;
  public phase3FireRainTimer = 0;
  public phase3TransitionTimer = 0;

  // STEP 19 & 20 & 21: Phase 4 Final Jump Slam Assault (5 Repetitions)
  public hasTriggeredPhase4Slam = false;
  public slamSubState: 'ASCEND' | 'PREDICTION' | 'FALL' | 'RECOVER' = 'ASCEND';
  public slamCount = 0;
  public slamTargetX = 0;
  public isAerialDisappeared = false;

  // STEP 23: Phase 5 Enraged Berserk (Below 15% HP)
  public hasTriggeredPhase5 = false;

  // STEP 24: Hit Cooldown (invulnerability frames to prevent rapid multi-frame drain)
  public hitCooldown = 0;

  // Deterministic Frame-Based Projectile Burst Spawner
  public burstRemaining = 0;
  public burstTimer = 0;

  // Active Projectiles & Minions
  public projectiles: BossProjectile[] = [];
  public summonedMinions: DogEnemy[] = [];
  public floatingTexts: FloatingCombatText[] = [];
  public particles: BossParticle[] = [];

  // Sprite Sheets for Animated Rat Boss
  public idleSprite: SpriteSheet;
  public runSprite: SpriteSheet;
  public jumpSprite: SpriteSheet;
  public attackSprite: SpriteSheet;
  public blockSprite: SpriteSheet;
  public currentSprite: SpriteSheet;

  // Visual Offsets & Render Sizing
  public renderWidth = RATKEEPER_CONFIG.RENDER_WIDTH;
  public renderHeight = RATKEEPER_CONFIG.RENDER_HEIGHT;
  public spriteOffsetX = RATKEEPER_CONFIG.SPRITE_OFFSET_X;
  public spriteOffsetY = RATKEEPER_CONFIG.SPRITE_OFFSET_Y;
  public animTime = 0;
  public hitFlashTimer = 0;

  // Shared Reference to Arena
  public arena: BossArena | null = null;

  constructor(spawnX: number = 1200, spawnY: number = 380, arena?: BossArena) {
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.x = spawnX;
    this.y = spawnY;
    this.arena = arena || null;
    this.facingRight = false; // Face left towards player entrance

    const getAssetPath = (file: string) => {
      const base = import.meta.env.BASE_URL || '/';
      return `${base.replace(/\/+$/, '')}/${file.replace(/^\/+/, '')}`;
    };

    // Instantiate modular sprite sheets for crisp, unclipped boss states
    this.idleSprite = new SpriteSheet({
      url: getAssetPath('rat_idle.png'),
      frameCount: 4,
      frameDuration: 0.14,
      loop: true,
    });

    this.runSprite = new SpriteSheet({
      url: getAssetPath('rat_run.png'),
      frameCount: 4,
      frameDuration: 0.1,
      loop: true,
    });

    this.jumpSprite = new SpriteSheet({
      url: getAssetPath('rat_jump.png'),
      frameCount: 4,
      frameDuration: 0.12,
      loop: false,
    });

    this.attackSprite = new SpriteSheet({
      url: getAssetPath('rat_attack.png'),
      frameCount: 4,
      frameDuration: 0.12,
      loop: true,
    });

    this.blockSprite = new SpriteSheet({
      url: getAssetPath('rat_block.png'),
      frameCount: 4,
      frameDuration: 0.1,
      loop: false,
    });

    this.currentSprite = this.idleSprite;

    // Listen for custom asset changes from SaveManager
    SaveManager.addSpriteChangeListener((type) => {
      if (type === 'rat_idle') this.idleSprite.load(getAssetPath('rat_idle.png'), 4);
      if (type === 'rat_run') this.runSprite.load(getAssetPath('rat_run.png'), 4);
      if (type === 'rat_jump') this.jumpSprite.load(getAssetPath('rat_jump.png'), 4);
      if (type === 'rat_attack') this.attackSprite.load(getAssetPath('rat_attack.png'), 4);
      if (type === 'rat_block') this.blockSprite.load(getAssetPath('rat_block.png'), 4);
    });
  }

  // Determine current phase from health percentage
  public updatePhase() {
    const healthRatio = this.health / this.maxHealth;
    if (healthRatio > RATKEEPER_CONFIG.PHASE_THRESHOLDS.PHASE_1) {
      this.currentPhase = 'PHASE_1';
      this.activeHolePattern = 'PHASE_1_OPPOSITE';
    } else if (healthRatio > RATKEEPER_CONFIG.PHASE_THRESHOLDS.PHASE_2) {
      this.currentPhase = 'PHASE_2';
      this.activeHolePattern = 'PHASE_2_EXPLICIT';
    } else if (healthRatio > RATKEEPER_CONFIG.PHASE_THRESHOLDS.PHASE_3) {
      this.currentPhase = 'PHASE_3';
      this.activeHolePattern = 'PHASE_3_6_STEP';
    } else if (healthRatio > RATKEEPER_CONFIG.PHASE_THRESHOLDS.PHASE_4) {
      this.currentPhase = 'PHASE_4';
      this.activeHolePattern = 'PHASE_3_6_STEP';
    } else {
      this.currentPhase = 'PHASE_5';
      this.activeHolePattern = 'RAPID_HOLE_SEQUENCE';
    }
  }

  // Transition state cleanly with timer reset and cleanups
  public setState(newState: BossState) {
    if (this.state === 'DEAD' && newState !== 'DEAD') return;

    this.state = newState;
    this.stateTimer = 0;

    if (newState === 'INTRO') {
      this.vx = 0;
      this.vy = 0;
      this.addFloatingText('⚠️ RATKEEPER AWAKENS!', this.x + this.width / 2, this.y - 20, '#f87171', '#7f1d1d');
    } else if (newState === 'AIR_ATTACK') {
      this.airAttackSubState = 'LEAP';
      this.airBombardmentTimer = 0;
      this.airShotsSpawned = 0;
      this.vx = 0;
      this.vy = RATKEEPER_CONFIG.JUMP_VELOCITY;
      this.playSound('boss_roar');
      this.addFloatingText('🔥 HIGH JUMP METEOR ATTACK!', this.x + this.width / 2, this.y - 20, '#ef4444', '#7f1d1d');
    } else if (newState === 'COOLDOWN_IDLE') {
      this.vx = 0;
      this.vy = 0;
      this.currentSprite = this.idleSprite;
      this.playSound('boss_roar');
      this.addFloatingText('💫 DIZZY COOLDOWN! (VULNERABLE)', this.x + this.width / 2, this.y - 25, '#facc15', '#854d0e');
    } else if (newState === 'EVADE_LEAP') {
      this.currentSprite = this.jumpSprite;
      this.jumpSprite.reset();
    } else if (newState === 'FINAL_JUMP_ATTACK') {
      this.slamSubState = 'ASCEND';
      this.vx = 0;
      this.vy = -860;
      this.playSound('boss_roar');
      this.addFloatingText('⚡ FINAL SLAM ASSAULT!', this.x + this.width / 2, this.y - 20, '#f59e0b', '#78350f');
    } else if (newState === 'EXHAUSTION') {
      this.vx = 0;
      this.vy = 0;
      this.isExposingBackInHole = true;
      this.addFloatingText('💨 EXHAUSTED OPENING!', this.x + this.width / 2, this.y - 20, '#38bdf8', '#0284c7');
    } else if (newState === 'RAPID_HOLE_FIRE') {
      this.activeHolePattern = 'RAPID_HOLE_SEQUENCE';
      this.addFloatingText('⚡ RAPID HOLE BURST!', this.x + this.width / 2, this.y - 20, '#f97316', '#7c2d12');
    } else if (newState === 'BLOCK') {
      this.blockTimer = RATKEEPER_CONFIG.BLOCK_COOLDOWN;
      this.blockSprite.reset();
    } else if (newState === 'HURT') {
      this.hurtTimer = RATKEEPER_CONFIG.HURT_DURATION;
      this.hitFlashTimer = 0.4;
      this.playSound('boss_hurt');
    } else if (newState === 'DEAD') {
      this.isDefeated = true;
      this.vx = 0;
      this.vy = 0;
      // Stop all boss attacks, projectiles, and minions immediately
      this.projectiles = [];
      this.warningMarkers = [];
      this.burstRemaining = 0;
      this.summonedMinions.forEach(m => (m.isDefeated = true));
      this.summonedMinions = [];
      this.playSound('boss_death');
      this.addFloatingText('💀 RATKEEPER SLAIN!', this.x + this.width / 2, this.y - 20, '#4ade80', '#14532d');
    }
  }

  // ==============================================================
  // PROXIMITY EVADE: Jump high and switch sides when player gets too close
  // ==============================================================
  public triggerEvadeLeap(player: Player, arena: BossArena) {
    this.setState('EVADE_LEAP');
    this.vy = RATKEEPER_CONFIG.EVADE_JUMP_VELOCITY;
    this.isGrounded = false;

    // Vault over the player to the other side
    const playerCenterX = player.x + player.width / 2;
    const bossCenterX = this.x + this.width / 2;
    let leapDir = playerCenterX < bossCenterX ? -1 : 1;

    // Guard against arena wall collision
    if (this.x <= arena.leftX + 220 && leapDir === -1) {
      leapDir = 1;
    } else if (this.x >= arena.rightX - this.width - 220 && leapDir === 1) {
      leapDir = -1;
    }

    this.vx = leapDir * RATKEEPER_CONFIG.EVADE_HORIZONTAL_SPEED;
    this.facingRight = this.vx > 0;
    this.playSound('boss_roar');
    this.addFloatingText('💨 HIGH VAULT!', this.x + this.width / 2, this.y - 20, '#38bdf8', '#0369a1');
  }

  // ==============================================================
  // FRONT BLOCK ZONE (DEFLECTION SHIELD)
  // ==============================================================
  public getFrontCatchZone(): Rect {
    const zoneW = RATKEEPER_CONFIG.FRONT_BLOCK_ZONE_WIDTH;
    const zoneH = RATKEEPER_CONFIG.FRONT_BLOCK_ZONE_HEIGHT;
    const zoneY = this.y + 15;

    if (this.facingRight) {
      return {
        x: this.x + this.width - 25,
        y: zoneY,
        width: zoneW,
        height: zoneH,
      };
    } else {
      return {
        x: this.x - zoneW + 25,
        y: zoneY,
        width: zoneW,
        height: zoneH,
      };
    }
  }

  // ==============================================================
  // BACK HITBOX
  // ==============================================================
  public getBackHitbox(): Rect {
    const backW = 52;
    const backH = 210;
    const backY = this.y + 20;

    if (this.facingRight) {
      return {
        x: this.x - 15,
        y: backY,
        width: backW,
        height: backH,
      };
    } else {
      return {
        x: this.x + this.width - backW + 15,
        y: backY,
        width: backW,
        height: backH,
      };
    }
  }

  // Check general collision body
  public getFullCollisionBody(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
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

  // ==============================================================
  // FOOTBALL COMBAT RESOLUTION & VULNERABILITY WINDOW
  // - In COOLDOWN_IDLE mode (3s after high-damage jump/fireball attack):
  //   Player can attack with the football from any angle to deal damage!
  // - In all other times: Ratkeeper blocks and deflects every attack (0 damage).
  // ==============================================================
  public checkFootballInteraction(football: Football, player: Player, onHit?: () => void) {
    if (this.isDefeated || this.isUnderground || this.isAerialDisappeared || this.state === 'DEAD' || this.state === 'INTRO') return;

    const ballBox: Rect = {
      x: football.x - football.radius,
      y: football.y - football.radius,
      width: football.radius * 2,
      height: football.radius * 2,
    };

    const ballSpeed = Math.hypot(football.vx, football.vy);
    const bodyBox = this.getFullCollisionBody();
    const frontBox = this.getFrontCatchZone();
    const isHit = this.checkAABB(ballBox, bodyBox) || this.checkAABB(ballBox, frontBox);

    if (!isHit) return;

    // 1. VULNERABLE COOLDOWN WINDOW:
    // Only during COOLDOWN_IDLE (after high damage aerial fireball leap) can the football deal damage!
    if (this.state === 'COOLDOWN_IDLE') {
      if (this.hitCooldown <= 0 && (ballSpeed > 30 || Math.abs(football.vx) > 25 || Math.abs(football.vy) > 25)) {
        this.hitCooldown = RATKEEPER_CONFIG.BOSS_HIT_COOLDOWN;
        const damage = RATKEEPER_CONFIG.VULNERABLE_BALL_DAMAGE;
        this.health = Math.max(0, this.health - damage);
        this.updatePhase();

        // Bounce football cleanly away from boss
        const bounceDir = football.x < this.x + this.width / 2 ? -1 : 1;
        football.vx = bounceDir * Math.max(280, Math.abs(football.vx) * 0.85);
        football.vy = -200;
        football.state = 'AIRBORNE';

        this.hitFlashTimer = 0.35;
        this.playSound('boss_hurt');
        this.addFloatingText(`💥 DIZZY STRIKE! -${damage} HP`, this.x + this.width / 2, this.y - 20, '#facc15', '#854d0e');

        if (onHit) onHit();

        if (this.health <= 0) {
          this.setState('DEAD');
        }
      }
      return;
    }

    // 2. ALL OTHER TIMES: Boss completely blocks and deflects every attack!
    if (this.hitCooldown <= 0) {
      this.hitCooldown = 0.22;
      this.blockTimer = RATKEEPER_CONFIG.BLOCK_COOLDOWN;
      this.blockSprite.reset();
      this.setState('BLOCK');

      const bounceDir = football.x < this.x + this.width / 2 ? -1 : 1;
      football.vx = bounceDir * Math.max(380, Math.abs(football.vx) * 0.95);
      football.vy = -180;
      football.state = 'AIRBORNE';

      this.playSound('boss_block');
      this.addFloatingText('🛡️ BLOCKED! (0 DMG)', this.x + this.width / 2, this.y - 20, '#38bdf8', '#0369a1');
    }
  }

  // ==============================================================
  // MAIN UPDATE LOOP
  // ==============================================================
  public update(
    dt: number,
    player: Player,
    football: Football,
    platforms: Platform[],
    arena: BossArena,
    onBossDefeated?: () => void,
    onCameraShake?: (intensity: number, duration: number) => void,
    onSpawnHealthPotion?: (potion: HealthPotion) => void
  ) {
    this.arena = arena;
    this.animTime += dt;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }
    if (this.blockTimer > 0) {
      this.blockTimer = Math.max(0, this.blockTimer - dt);
    }

    // Step 15: Second Health Potion Spawn Check (when boss drops to 60% HP)
    if (
      !this.secondPotionSpawned &&
      (this.health / this.maxHealth) <= RATKEEPER_CONFIG.SECOND_POTION_HEALTH_THRESHOLD &&
      !this.isDefeated &&
      this.state !== 'DEAD'
    ) {
      this.secondPotionSpawned = true;
      const newPotion = new HealthPotion(
        'boss-potion-second',
        RATKEEPER_CONFIG.SECOND_POTION_SPAWN_X,
        RATKEEPER_CONFIG.SECOND_POTION_SPAWN_Y,
        RATKEEPER_CONFIG.SECOND_POTION_HEAL_AMOUNT,
        32,
        42
      );
      if (onSpawnHealthPotion) {
        onSpawnHealthPotion(newPotion);
      }
      this.addFloatingText('✨ HEALTH POTION SUMMONED!', RATKEEPER_CONFIG.SECOND_POTION_SPAWN_X, RATKEEPER_CONFIG.SECOND_POTION_SPAWN_Y - 40, '#4ade80', '#065f46');
      this.playSound('boss_burst');
      if (onCameraShake) onCameraShake(5, 0.3);
    }

    // STEP 16: Phase 3 Check (Below 50% HP)
    if (
      this.health / this.maxHealth <= 0.50 &&
      !this.hasTriggeredPhase3 &&
      !this.isDefeated &&
      this.state !== 'DEAD' &&
      this.state !== 'INTRO'
    ) {
      this.hasTriggeredPhase3 = true;
      this.currentPhase = 'PHASE_3';
      this.activeHolePattern = 'PHASE_3_6_STEP';
      this.currentPatternStep = 0;
      this.setState('DOG_PHASE');
    }

    // STEP 19: Phase 4 Check (Below 30% HP)
    if (
      this.health / this.maxHealth <= RATKEEPER_CONFIG.PHASE_THRESHOLDS.PHASE_3 &&
      !this.hasTriggeredPhase4Slam &&
      !this.isDefeated &&
      this.state !== 'DEAD' &&
      this.state !== 'INTRO'
    ) {
      this.hasTriggeredPhase4Slam = true;
      this.currentPhase = 'PHASE_4';
      this.slamCount = 0;
      this.setState('FINAL_JUMP_ATTACK');
    }

    // STEP 23: Phase 5 Check (Below 15% HP - Ratkeeper + Dual Hounds Berserk)
    if (
      this.health / this.maxHealth <= RATKEEPER_CONFIG.PHASE_THRESHOLDS.PHASE_4 &&
      !this.hasTriggeredPhase5 &&
      !this.isDefeated &&
      this.state !== 'DEAD' &&
      this.state !== 'INTRO'
    ) {
      this.hasTriggeredPhase5 = true;
      this.currentPhase = 'PHASE_5';
      this.activeHolePattern = 'RAPID_HOLE_SEQUENCE';
      this.currentPatternStep = 0;

      // Spawn two dogs for the final battle if they are not already alive
      if (this.summonedMinions.length < 2) {
        const dog1 = new DogEnemy('DOG_1', arena.leftX + 360, arena.floorY - 48, RATKEEPER_CONFIG.PHASE_5_DOG_HEALTH, false, 'Shadow Hound 1', 'dog');
        const dog2 = new DogEnemy('DOG_2', arena.rightX - 360, arena.floorY - 48, RATKEEPER_CONFIG.PHASE_5_DOG_HEALTH, false, 'Shadow Hound 2', 'dog');
        dog1.state = 'ALERT';
        dog2.state = 'ALERT';
        this.summonedMinions = [dog1, dog2];
      }

      this.addFloatingText('🔥 FINAL PHASE: RATKEEPER + DUAL HOUNDS!', this.x + this.width / 2, this.y - 20, '#ef4444', '#7f1d1d');
      this.playSound('boss_roar');
      if (onCameraShake) onCameraShake(14, 0.45);
    }

    if (this.hitCooldown > 0) {
      this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    }

    // Deterministic projectile burst firing (frame-driven, no background timeouts)
    if (this.burstRemaining > 0 && !this.isDefeated && this.state !== 'DEAD') {
      this.burstTimer += dt;
      if (this.burstTimer >= 0.16) {
        this.burstTimer = 0;
        this.burstRemaining--;
        this.fireNutAtPlayer(player);
      }
    }

    // Update Floating Text Messages
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y += ft.vy * dt;
      ft.alpha = Math.max(0, 1 - ft.life / ft.maxLife);
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update Warning Markers for Falling Fireballs / Slams
    for (let i = this.warningMarkers.length - 1; i >= 0; i--) {
      const wm = this.warningMarkers[i];
      const isAlive = wm.update(dt);
      if (!isAlive) {
        this.warningMarkers.splice(i, 1);
      }
    }

    // Step 11: Update Projectiles (Auto-destruction & memory safety)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const isAlive = proj.update(dt, player, platforms);
      if (!isAlive) {
        this.projectiles.splice(i, 1);
      }
    }

    // STEP 17: Update Minions using existing DogEnemy framework
    for (let i = this.summonedMinions.length - 1; i >= 0; i--) {
      const minion = this.summonedMinions[i];
      if (minion.isDefeated) {
        this.summonedMinions.splice(i, 1);
      } else {
        minion.update(dt, player, football, platforms);
      }
    }

    if (this.isDefeated && this.state === 'DEAD') {
      this.stateTimer += dt;
      if (this.stateTimer >= 2.5 && onBossDefeated) {
        onBossDefeated();
      }
      return;
    }

    // Update Boss State Machine
    this.updateBossState(dt, player, football, platforms, arena, onCameraShake);

    // Update Sprite Animations
    this.idleSprite.update(dt);
    this.runSprite.update(dt);
    this.jumpSprite.update(dt);
    this.attackSprite.update(dt);
    this.blockSprite.update(dt);

    // Select Active Sprite Sheet cleanly
    if (this.blockTimer > 0 || this.state === 'BLOCK') {
      this.currentSprite = this.blockSprite;
    } else if (
      this.burstRemaining > 0 ||
      this.state === 'RAPID_HOLE_FIRE' ||
      (this.state === 'HOLE_ATTACK' && !this.isUnderground && this.stateTimer < 0.8) ||
      (this.state === 'AIR_ATTACK' && this.airAttackSubState === 'BOMBARDMENT')
    ) {
      this.currentSprite = this.attackSprite;
    } else if (this.state === 'AIR_ATTACK' || this.state === 'FINAL_JUMP_ATTACK' || !this.isGrounded) {
      this.currentSprite = this.jumpSprite;
    } else if (Math.abs(this.vx) > 20 && this.isGrounded) {
      this.currentSprite = this.runSprite;
    } else {
      this.currentSprite = this.idleSprite;
    }

    // Spawn Dynamic Boss Particles
    this.animTime += dt;
    const handX = this.facingRight ? this.x + this.width + 12 : this.x - 12;
    const handY = this.y + this.height * 0.45;

    // 1. Attack Charging & Fire Nut Flame Aura
    if (this.burstRemaining > 0 || this.state === 'RAPID_HOLE_FIRE' || (this.state === 'HOLE_ATTACK' && this.stateTimer < 0.5 && !this.isUnderground)) {
      for (let k = 0; k < 2; k++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * 28 + 8;
        this.particles.push({
          x: handX + Math.cos(ang) * dist,
          y: handY + Math.sin(ang) * dist,
          vx: (this.facingRight ? 1 : -1) * (Math.random() * 80 + 30) - Math.cos(ang) * 40,
          vy: -Math.random() * 70 - 20,
          life: 0,
          maxLife: 0.45 + Math.random() * 0.25,
          size: Math.random() * 7 + 4,
          color: Math.random() > 0.4 ? '#f97316' : Math.random() > 0.5 ? '#ef4444' : '#fbbf24',
          type: 'flame',
        });
      }
    }

    // 2. Steam Vapors on Exhaustion
    if (this.state === 'EXHAUSTION') {
      if (Math.random() < 0.6) {
        const backX = this.facingRight ? this.x + 18 : this.x + this.width - 18;
        this.particles.push({
          x: backX + (Math.random() - 0.5) * 20,
          y: this.y + 40 + Math.random() * 40,
          vx: (Math.random() - 0.5) * 20,
          vy: -Math.random() * 50 - 30,
          life: 0,
          maxLife: 0.8 + Math.random() * 0.4,
          size: Math.random() * 8 + 5,
          color: 'rgba(241, 245, 249, 0.5)',
          type: 'steam',
        });
      }
    }

    // 3. Update active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'rock') {
        p.vy += 800 * dt; // gravity for rock debris
      }
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Check interaction with football
    this.checkFootballInteraction(football, player);

    // ==============================================================
    // PROXIMITY EVADE & ANTI-STUCK SYSTEM:
    // When player is too close / overlapping, boss leaps high and switches to the other side!
    // ==============================================================
    const playerCenterX = player.x + player.width / 2;
    const bossCenterX = this.x + this.width / 2;
    const distX = Math.abs(playerCenterX - bossCenterX);
    const distY = Math.abs(player.y - this.y);

    if (
      this.isGrounded &&
      distX < RATKEEPER_CONFIG.PROXIMITY_EVADE_DISTANCE &&
      distY < 130 &&
      this.state !== 'DEAD' &&
      this.state !== 'INTRO' &&
      this.state !== 'EVADE_LEAP' &&
      this.state !== 'AIR_ATTACK' &&
      this.state !== 'FINAL_JUMP_ATTACK' &&
      this.state !== 'COOLDOWN_IDLE' &&
      this.state !== 'HURT' &&
      this.state !== 'HOLE_ATTACK'
    ) {
      this.triggerEvadeLeap(player, arena);
    } else if (distX < 55 && distY < 80 && this.isGrounded && this.state !== 'EVADE_LEAP' && this.state !== 'AIR_ATTACK') {
      // Gentle separation so player and boss never stick together
      const sepDir = playerCenterX < bossCenterX ? -1 : 1;
      player.x += sepDir * 120 * dt;
    }

    // Direct melee damage if player touches boss while not in dizzy cooldown
    const playerBox: Rect = { x: player.x, y: player.y, width: player.width, height: player.height };
    const bossBox: Rect = this.getFullCollisionBody();
    if (
      this.checkAABB(playerBox, bossBox) &&
      !player.isInvincible &&
      player.state !== 'CLIMB' &&
      this.state !== 'DEAD' &&
      this.state !== 'INTRO' &&
      this.state !== 'COOLDOWN_IDLE' &&
      !this.isUnderground &&
      !this.isAerialDisappeared
    ) {
      const knockDir = playerCenterX < bossCenterX ? -300 : 300;
      player.takeDamage(RATKEEPER_CONFIG.MELEE_CONTACT_DAMAGE, knockDir);
      this.addFloatingText('💥 MELEE HIT! -30 HP', player.x + player.width / 2, player.y - 20, '#ef4444', '#7f1d1d');
    }

    // Apply Physical Gravity & Arena Bounds
    if (!this.isUnderground && this.state !== 'AIR_ATTACK' && this.state !== 'FINAL_JUMP_ATTACK' && !this.isAerialDisappeared) {
      this.vy += RATKEEPER_CONFIG.GRAVITY * dt;
      this.y += this.vy * dt;
      this.x += this.vx * dt;

      if (this.y + this.height >= arena.floorY) {
        this.y = arena.floorY - this.height;
        this.vy = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }

      this.x = Math.max(arena.leftX + 20, Math.min(arena.rightX - this.width - 20, this.x));
    }
  }

  // ==============================================================
  // BOSS STATE MACHINE LOGIC
  // ==============================================================
  private updateBossState(
    dt: number,
    player: Player,
    football: Football,
    platforms: Platform[],
    arena: BossArena,
    onCameraShake?: (intensity: number, duration: number) => void
  ) {
    this.stateTimer += dt;

    switch (this.state) {
      // ------------------------------------------------------------
      // 1. INTRO
      // ------------------------------------------------------------
      case 'INTRO': {
        this.vx = 0;
        if (this.stateTimer >= RATKEEPER_CONFIG.INTRO_DURATION) {
          this.setState('IDLE_STANCE');
          this.attackCooldown = 1.0;
        }
        break;
      }

      // ------------------------------------------------------------
      // 2. IDLE_STANCE (Decision Core)
      // ------------------------------------------------------------
      case 'IDLE_STANCE': {
        this.vx *= Math.pow(0.05, dt);
        this.facingRight = player.x > this.x; // Face toward player
        this.attackCooldown -= dt;

        if (this.attackCooldown <= 0) {
          this.decideNextAttack(player, arena);
        }
        break;
      }

      // ------------------------------------------------------------
      // 3. COOLDOWN_IDLE (3-Second Dazed Vulnerability Window in Idle Mode)
      // ------------------------------------------------------------
      case 'COOLDOWN_IDLE': {
        this.vx = 0;
        this.vy = 0;
        this.facingRight = player.x > this.x; // Face player while dazed

        // Spawn dizzy sparkles around head
        if (Math.random() < 0.35) {
          const headX = this.x + this.width / 2;
          const headY = this.y + 24;
          this.particles.push({
            x: headX + (Math.random() - 0.5) * 60,
            y: headY + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 30,
            vy: -Math.random() * 40 - 20,
            life: 0,
            maxLife: 0.7,
            size: Math.random() * 6 + 4,
            color: Math.random() > 0.5 ? '#facc15' : '#38bdf8',
            type: 'spark',
          });
        }

        if (this.stateTimer >= RATKEEPER_CONFIG.COOLDOWN_VULNERABLE_DURATION) {
          this.setState('IDLE_STANCE');
          this.attackCooldown = 0.8;
          this.playSound('boss_roar');
          this.addFloatingText('⚔️ RATKEEPER RECOVERS!', this.x + this.width / 2, this.y - 20, '#ef4444', '#7f1d1d');
        }
        break;
      }

      // ------------------------------------------------------------
      // 4. EVADE_LEAP (High vault over player when too close)
      // ------------------------------------------------------------
      case 'EVADE_LEAP': {
        this.vy += RATKEEPER_CONFIG.GRAVITY * dt;
        this.y += this.vy * dt;
        this.x += this.vx * dt;

        if (this.stateTimer > 0.2) {
          this.facingRight = player.x > this.x;
        }

        if (this.y + this.height >= arena.floorY) {
          this.y = arena.floorY - this.height;
          this.vy = 0;
          this.vx = 0;
          this.isGrounded = true;
          this.playSound('boss_slam');
          if (onCameraShake) onCameraShake(6, 0.2);
          this.setState('IDLE_STANCE');
          this.attackCooldown = 0.5;
        }
        break;
      }

      // ------------------------------------------------------------
      // 5. BLOCK (Frontal Shield Stance)
      // ------------------------------------------------------------
      case 'BLOCK': {
        this.vx *= Math.pow(0.1, dt);
        if (this.stateTimer >= RATKEEPER_CONFIG.BLOCK_COOLDOWN) {
          this.setState('IDLE_STANCE');
          this.attackCooldown = 0.4;
        }
        break;
      }

      // ------------------------------------------------------------
      // 6. HOLE_ATTACK (Burrow, Expose Back, Emerge & Fire Nuts)
      // ------------------------------------------------------------
      case 'HOLE_ATTACK': {
        const enterHole = arena.getHole(this.currentEnterHole);
        const exitHole = arena.getHole(this.currentExitHole);

        if (!this.isUnderground) {
          // Phase A: Move towards entrance hole
          const targetX = enterHole.x + enterHole.width / 2 - this.width / 2;
          const distToHole = targetX - this.x;

          if (Math.abs(distToHole) > 15 && !this.isExposingBackInHole) {
            this.facingRight = distToHole > 0;
            this.vx = (distToHole > 0 ? 1 : -1) * (this.currentPhase === 'PHASE_4' ? RATKEEPER_CONFIG.ENRAGED_RUN_SPEED : RATKEEPER_CONFIG.RUN_SPEED);
          } else {
            // Arrived at hole: Begin Back Exposure Telegraph!
            this.vx = 0;
            if (!this.isExposingBackInHole) {
              this.isExposingBackInHole = true;
              this.stateTimer = 0;
              enterHole.triggerEnterSplash();
              this.playSound('boss_burrow');
              this.addFloatingText('🎯 BURROWING!', this.x + this.width / 2, this.y - 20, '#38bdf8', '#0369a1');
            }

            // Expose back for readable window (0.60s)
            if (this.stateTimer >= RATKEEPER_CONFIG.HOLE_ENTRY_TELEGRAPH_DURATION) {
              // Subterranean dive!
              this.isExposingBackInHole = false;
              this.isUnderground = true;
              this.stateTimer = 0;
              enterHole.triggerEnterSplash();
              this.burrowTimer = 1.0;
            }
          }
        } else {
          // Phase B: Traveling underground towards exit hole
          this.burrowTimer -= dt;

          if (this.burrowTimer <= 0) {
            // Emerge from exit hole!
            this.isUnderground = false;
            this.x = exitHole.x + exitHole.width / 2 - this.width / 2;
            this.y = exitHole.groundY - this.height;
            this.vy = -340; // Spring up out of mud
            this.facingRight = player.x > this.x;

            exitHole.triggerExitBurst();
            this.playSound('boss_burst');
            if (onCameraShake) onCameraShake(6, 0.25);

            // Fire projectiles on exit based on current pattern step
            const patternData = RATKEEPER_PATTERNS[this.activeHolePattern] || RATKEEPER_PATTERNS.PHASE_1_OPPOSITE;
            const stepData = patternData[this.currentPatternStep % patternData.length];
            const numShots = stepData?.fireProjectilesOnExit || (this.activeHolePattern === 'RAPID_HOLE_SEQUENCE' ? 5 : 1);

            this.burstRemaining = numShots;
            this.burstTimer = 0;

            this.currentPatternStep++;
            this.setState('IDLE_STANCE');
            this.attackCooldown = this.activeHolePattern === 'RAPID_HOLE_SEQUENCE' ? 0.45 : 1.1;
          }
        }
        break;
      }

      // ------------------------------------------------------------
      // 7. AIR_ATTACK / HIGH-DAMAGE METEOR ATTACK
      // High jump + produces a lot of fireballs + ground slam + 3S COOLDOWN
      // ------------------------------------------------------------
      case 'AIR_ATTACK': {
        if (this.airAttackSubState === 'LEAP') {
          // Windup high leap into the upper shadows
          this.vx = 0;
          this.vy = RATKEEPER_CONFIG.JUMP_VELOCITY;
          this.y += this.vy * dt;

          if (this.y <= arena.ceilingY + 40 || this.stateTimer >= 0.5) {
            this.airAttackSubState = 'BOMBARDMENT';
            this.y = arena.ceilingY + 40;
            this.vy = 0;
            this.stateTimer = 0;
            this.airBombardmentTimer = 0.15; // Fast first volley
            this.airShotsSpawned = 0;
            this.playSound('boss_roar');
            this.addFloatingText('🔥 METEOR FIREBALL BARRAGE!', this.x + this.width / 2, arena.floorY - 120, '#ef4444', '#7f1d1d');
          }
        } else if (this.airAttackSubState === 'BOMBARDMENT') {
          // Hover in upper cavern shadows, smoothly tracking player
          this.y = arena.ceilingY + 40;
          const targetHoverX = player.x + player.width / 2 - this.width / 2;
          this.x += (targetHoverX - this.x) * dt * 2.4;
          this.facingRight = player.x > this.x;

          this.airBombardmentTimer += dt;

          // Spawn staggered warning markers for falling fireballs (producing a lot of fireballs: 7 burst count)
          if (
            this.airBombardmentTimer >= 0.32 &&
            this.airShotsSpawned < RATKEEPER_CONFIG.AIR_ATTACK_BURST_COUNT
          ) {
            this.airBombardmentTimer = 0;
            this.airShotsSpawned++;

            const spreadOffsets = [0, 110, -110, 200, -200, 80, -80, 0];
            const targetOffset = spreadOffsets[this.airShotsSpawned % spreadOffsets.length];

            const markerTargetX = Math.max(
              arena.leftX + 160,
              Math.min(arena.rightX - 160, player.x + player.width / 2 + targetOffset + (player.vx * 0.16))
            );

            const markerId = `air-warn-${Date.now()}-${this.airShotsSpawned}`;
            const wm = new WarningMarker(
              markerId,
              markerTargetX,
              arena.floorY,
              RATKEEPER_CONFIG.AIR_ATTACK_TELEGRAPH_TIME,
              46,
              (marker) => {
                const proj = new BossProjectile(
                  `falling-fireball-${Date.now()}`,
                  marker.x + marker.radius,
                  arena.ceilingY + 50,
                  0,
                  RATKEEPER_CONFIG.AIR_ATTACK_PROJECTILE_SPEED,
                  RATKEEPER_CONFIG.AIR_ATTACK_FIREBALL_DAMAGE,
                  'falling_fireball',
                  RATKEEPER_CONFIG.AIR_ATTACK_FIREBALL_RADIUS
                );
                this.projectiles.push(proj);
                this.playSound('boss_fire');
                if (onCameraShake) onCameraShake(5, 0.18);
              }
            );

            this.warningMarkers.push(wm);
            this.playSound('boss_fire');
          }

          if (
            this.airShotsSpawned >= RATKEEPER_CONFIG.AIR_ATTACK_BURST_COUNT &&
            this.warningMarkers.length === 0 &&
            this.stateTimer >= 1.5
          ) {
            this.airAttackSubState = 'SLAM';
            this.airTargetX = player.x + player.width / 2 - this.width / 2;
            this.shadowTelegraphAlpha = 1.0;
          }
        } else {
          // Ground Slam downward back to floor
          this.shadowTelegraphAlpha = 1.0;
          this.vy = RATKEEPER_CONFIG.SLAM_VELOCITY;
          this.y += this.vy * dt;

          if (this.y + this.height >= arena.floorY) {
            this.y = arena.floorY - this.height;
            this.vy = 0;
            this.isGrounded = true;
            this.shadowTelegraphAlpha = 0;

            // Slam Impact Shockwaves (high damage)
            this.playSound('boss_slam');
            if (onCameraShake) onCameraShake(14, 0.5);

            this.projectiles.push(
              new BossProjectile('slam-left', this.x, arena.floorY - 10, -340, 0, RATKEEPER_CONFIG.SHOCKWAVE_DAMAGE, 'shockwave', 20),
              new BossProjectile('slam-right', this.x + this.width, arena.floorY - 10, 340, 0, RATKEEPER_CONFIG.SHOCKWAVE_DAMAGE, 'shockwave', 20)
            );

            // Directly enter 3-second cooldown time in idle mode!
            this.setState('COOLDOWN_IDLE');
          }
        }
        break;
      }

      // ------------------------------------------------------------
      // 8. DOG_PHASE (Step 16, 17, 18: Aerial Transition, 2 Dogs & Fire Rain)
      // ------------------------------------------------------------
      case 'DOG_PHASE': {
        if (this.stateTimer < 0.5) {
          // Upward leap into the ceiling shadows
          this.vx = 0;
          this.vy = RATKEEPER_CONFIG.JUMP_VELOCITY;
          this.y += this.vy * dt;
          if (this.y <= arena.ceilingY + 40) {
            this.y = arena.ceilingY + 30;
            this.vy = 0;
            this.isAerialDisappeared = true;
          }
        } else if (this.stateTimer >= 0.5 && this.isAerialDisappeared) {
          this.y = arena.ceilingY + 30;
          this.vy = 0;

          // Step 16: Spawn DOG_1 and DOG_2 using existing DogEnemy framework!
          if (this.summonedMinions.length === 0) {
            this.playSound('boss_roar');
            this.addFloatingText('🐺 SHADOW HOUNDS SUMMONED & FIRE RAIN!', this.x + this.width / 2, arena.floorY - 120, '#a855f7', '#581c87');

            const dog1 = new DogEnemy(
              'DOG_1',
              arena.leftX + 380,
              arena.floorY - 48,
              RATKEEPER_CONFIG.PHASE_3_MINION_HEALTH,
              false,
              'Shadow Hound 1',
              'dog'
            );
            const dog2 = new DogEnemy(
              'DOG_2',
              arena.rightX - 380,
              arena.floorY - 48,
              RATKEEPER_CONFIG.PHASE_3_MINION_HEALTH,
              false,
              'Shadow Hound 2',
              'dog'
            );
            dog1.state = 'ALERT';
            dog2.state = 'ALERT';
            this.summonedMinions.push(dog1, dog2);
          }

          // Fire rain continues while dogs attack
          this.phase3FireRainTimer += dt;
          if (this.phase3FireRainTimer >= RATKEEPER_CONFIG.PHASE_3_FIRE_RAIN_INTERVAL) {
            this.phase3FireRainTimer = 0;
            const rainX = Math.max(
              arena.leftX + 200,
              Math.min(arena.rightX - 200, player.x + player.width / 2 + (Math.random() - 0.5) * 240)
            );
            const marker = new WarningMarker(
              `rain-warn-${Date.now()}-${Math.random()}`,
              rainX,
              arena.floorY,
              0.75,
              38,
              (wm) => {
                const fireball = new BossProjectile(
                  `rain-ball-${Date.now()}`,
                  wm.x + wm.radius,
                  arena.ceilingY + 40,
                  0,
                  RATKEEPER_CONFIG.AIR_ATTACK_PROJECTILE_SPEED,
                  RATKEEPER_CONFIG.FIRE_NUT_DAMAGE,
                  'falling_fireball',
                  RATKEEPER_CONFIG.AIR_ATTACK_FIREBALL_RADIUS
                );
                this.projectiles.push(fireball);
                this.playSound('boss_fire');
              }
            );
            this.warningMarkers.push(marker);
          }

          // Step 18: After transition, Ratkeeper returns and performs hole attacks
          if (this.stateTimer >= RATKEEPER_CONFIG.PHASE_3_TRANSITION_DURATION) {
            this.isAerialDisappeared = false;
            this.activeHolePattern = 'PHASE_3_6_STEP';
            this.currentPatternStep = 0;
            this.setupHoleAttack(arena);
          }
        }
        break;
      }

      // ------------------------------------------------------------
      // 9. FINAL_JUMP_ATTACK (5-Jump Heavy Slam Assault with Ground Prediction Markers)
      // ------------------------------------------------------------
      case 'FINAL_JUMP_ATTACK': {
        if (this.slamSubState === 'ASCEND') {
          this.vx = 0;
          this.vy = -860;
          this.y += this.vy * dt;

          if (this.y <= arena.ceilingY + 30 || this.stateTimer >= 0.45) {
            this.isAerialDisappeared = true;
            this.y = arena.ceilingY + 30;
            this.vy = 0;
            this.slamSubState = 'PREDICTION';
            this.stateTimer = 0;

            const offset = (Math.random() - 0.5) * RATKEEPER_CONFIG.FINAL_SLAM_TARGET_OFFSET_RANGE * 2;
            this.slamTargetX = Math.max(
              arena.leftX + 180,
              Math.min(arena.rightX - 180, player.x + player.width / 2 + offset)
            );

            // Spawn distinct ground landing prediction marker
            const wm = new WarningMarker(
              `final-slam-warn-${this.slamCount}-${Date.now()}`,
              this.slamTargetX,
              arena.floorY,
              RATKEEPER_CONFIG.FINAL_SLAM_TELEGRAPH_TIME,
              58,
              () => {
                this.slamSubState = 'FALL';
                this.x = this.slamTargetX - this.width / 2;
                this.y = arena.ceilingY + 40;
                this.isAerialDisappeared = false;
                this.vy = RATKEEPER_CONFIG.FINAL_SLAM_FALL_SPEED;
              }
            );
            this.warningMarkers.push(wm);
            this.playSound('boss_roar');
            this.addFloatingText(`⚠️ SLAM [${this.slamCount + 1}/5] PREDICTED!`, this.slamTargetX, arena.floorY - 60, '#ef4444', '#7f1d1d');
          }
        } else if (this.slamSubState === 'PREDICTION') {
          this.isAerialDisappeared = true;
          this.y = arena.ceilingY + 30;
        } else if (this.slamSubState === 'FALL') {
          this.isAerialDisappeared = false;
          this.vy = RATKEEPER_CONFIG.FINAL_SLAM_FALL_SPEED;
          this.y += this.vy * dt;

          // Check direct hit damage on player during descent / landing
          const playerBox: Rect = { x: player.x, y: player.y, width: player.width, height: player.height };
          if (this.checkAABB(playerBox, this.getFullCollisionBody()) && !player.isInvincible && player.state !== 'CLIMB') {
            const knockDir = player.x < this.x + this.width / 2 ? -1 : 1;
            player.takeDamage(RATKEEPER_CONFIG.FINAL_SLAM_DAMAGE, knockDir * 320);
            this.addFloatingText('💥 DIRECT SLAM! -45 HP', player.x + player.width / 2, player.y - 20, '#ef4444', '#7f1d1d');
          }

          if (this.y + this.height >= arena.floorY) {
            this.y = arena.floorY - this.height;
            this.vy = 0;
            this.slamSubState = 'RECOVER';
            this.stateTimer = 0;

            this.playSound('boss_slam');
            if (onCameraShake) onCameraShake(16, 0.5);

            // Ground shockwaves
            this.projectiles.push(
              new BossProjectile(`slam-sw-l-${Date.now()}`, this.x, arena.floorY - 12, -360, 0, RATKEEPER_CONFIG.SHOCKWAVE_DAMAGE, 'shockwave', 20),
              new BossProjectile(`slam-sw-r-${Date.now()}`, this.x + this.width, arena.floorY - 12, 360, 0, RATKEEPER_CONFIG.SHOCKWAVE_DAMAGE, 'shockwave', 20)
            );
          }
        } else if (this.slamSubState === 'RECOVER') {
          this.vx = 0;
          if (this.stateTimer >= RATKEEPER_CONFIG.FINAL_SLAM_RECOVERY_TIME) {
            this.slamCount++;
            if (this.slamCount < RATKEEPER_CONFIG.FINAL_SLAM_TOTAL_JUMPS) {
              this.slamSubState = 'ASCEND';
              this.stateTimer = 0;
            } else {
              // 5 jumps completed! Enter 3s cooldown idle mode
              this.slamCount = 0;
              this.setState('COOLDOWN_IDLE');
            }
          }
        }
        break;
      }

      // ------------------------------------------------------------
      // 10. EXHAUSTION
      // ------------------------------------------------------------
      case 'EXHAUSTION': {
        this.vx = 0;
        this.vy = 0;
        this.isExposingBackInHole = true;

        if (this.stateTimer >= RATKEEPER_CONFIG.EXHAUSTION_DURATION) {
          this.isExposingBackInHole = false;
          this.activeHolePattern = 'RAPID_HOLE_SEQUENCE';
          this.currentPatternStep = 0;
          this.setupHoleAttack(arena);
        }
        break;
      }

      // ------------------------------------------------------------
      // 11. RAPID_HOLE_FIRE
      // ------------------------------------------------------------
      case 'RAPID_HOLE_FIRE': {
        this.activeHolePattern = 'RAPID_HOLE_SEQUENCE';
        this.setupHoleAttack(arena);
        break;
      }

      // ------------------------------------------------------------
      // 12. HURT
      // ------------------------------------------------------------
      case 'HURT': {
        this.vx *= Math.pow(0.1, dt);
        if (this.stateTimer >= RATKEEPER_CONFIG.HURT_DURATION) {
          this.setState('IDLE_STANCE');
          this.attackCooldown = 0.5;
        }
        break;
      }
    }
  }

  // ==============================================================
  // AI DECISION ENGINE
  // ==============================================================
  private phase1AttackCount = 0;

  private decideNextAttack(player: Player, arena: BossArena) {
    this.updatePhase();

    // Minion pack spawn check for Phase 3/5 if all defeated
    if (
      (this.currentPhase === 'PHASE_3' || this.currentPhase === 'PHASE_5') &&
      this.summonedMinions.length === 0 &&
      Math.random() < 0.4
    ) {
      this.setState('DOG_PHASE');
      return;
    }

    if (this.currentPhase === 'PHASE_1') {
      // Phase 1 (100% -> 80% HP):
      // Alternates between Hole Transitions and High-Damage Aerial Fireball Barrage + 3s Cooldown
      this.phase1AttackCount++;
      if (this.phase1AttackCount % 2 === 0) {
        this.setState('AIR_ATTACK');
      } else {
        this.setupHoleAttack(arena);
      }
    } else if (this.currentPhase === 'PHASE_2') {
      // Phase 2 (Below 80% HP):
      // Alternates between AIR ATTACK and HOLE ATTACK
      if (this.phase2NextAttack === 'AIR') {
        this.phase2NextAttack = 'HOLE';
        this.setState('AIR_ATTACK');
      } else {
        this.phase2NextAttack = 'AIR';
        this.setupHoleAttack(arena);
      }
    } else if (this.currentPhase === 'PHASE_3') {
      // Phase 3 (Below 50% HP):
      const roll = Math.random();
      if (roll < 0.55) {
        this.setupHoleAttack(arena);
      } else {
        this.setState('AIR_ATTACK');
      }
    } else if (this.currentPhase === 'PHASE_4') {
      // Phase 4 (Below 30% HP):
      // 5-Jump Heavy Slam Assault -> Cooldown -> Rapid Hole Fire
      const roll = Math.random();
      if (roll < 0.5) {
        this.slamCount = 0;
        this.setState('FINAL_JUMP_ATTACK');
      } else {
        this.setupHoleAttack(arena);
      }
    } else {
      // Phase 5 (Below 15% HP - Berserk):
      const roll = Math.random();
      if (roll < 0.5) {
        this.slamCount = 0;
        this.setState('FINAL_JUMP_ATTACK');
      } else {
        this.activeHolePattern = 'RAPID_HOLE_SEQUENCE';
        this.setupHoleAttack(arena);
      }
    }
  }

  // Setup Hole Attack Pattern Step
  private setupHoleAttack(arena: BossArena) {
    const pattern = RATKEEPER_PATTERNS[this.activeHolePattern] || RATKEEPER_PATTERNS.PHASE_1_OPPOSITE;
    const step = pattern[this.currentPatternStep % pattern.length];

    this.currentEnterHole = step.enterHole;
    this.currentExitHole = step.exitHole;
    this.isUnderground = false;
    this.isExposingBackInHole = false;
    this.setState('HOLE_ATTACK');
  }

  // Launch a Fire Nut Projectile toward Player
  public fireNutAtPlayer(player: Player) {
    const originX = this.facingRight ? this.x + this.width + 10 : this.x - 10;
    const originY = this.y + 70;

    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;

    const dx = targetX - originX;
    const dy = targetY - originY;
    const dist = Math.hypot(dx, dy) || 1;

    const speed = RATKEEPER_CONFIG.FIRE_NUT_SPEED;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed - 60; // slight arc

    this.projectiles.push(
      new BossProjectile(
        `fire-nut-${Date.now()}-${Math.random()}`,
        originX,
        originY,
        vx,
        vy,
        RATKEEPER_CONFIG.FIRE_NUT_DAMAGE,
        'fire_nut',
        RATKEEPER_CONFIG.FIRE_NUT_RADIUS
      )
    );
  }

  public addFloatingText(text: string, x: number, y: number, color: string, strokeColor: string) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      strokeColor,
      alpha: 1.0,
      vy: -35,
      life: 0,
      maxLife: 1.2,
    });
  }

  private playSound(type: 'boss_roar' | 'boss_block' | 'boss_hurt' | 'boss_burrow' | 'boss_burst' | 'boss_slam' | 'boss_fire' | 'boss_death') {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'boss_roar') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'boss_block') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.28, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'boss_hurt') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(360, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'boss_slam') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.42);
      } else if (type === 'boss_burrow' || type === 'boss_burst') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'boss_fire') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      } else if (type === 'boss_death') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.35);
      }
    } catch {
      // Audio context might be restricted
    }
  }

  // ==============================================================
  // RENDERING ENGINE
  // ==============================================================
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number = 0, showDebug: boolean = false) {
    // 0. Render Ground Warning Markers
    this.warningMarkers.forEach(wm => wm.render(ctx, cameraX, cameraY));

    // 1. Render Projectiles
    this.projectiles.forEach(p => p.render(ctx, cameraX, cameraY));

    // 2. Render Minions
    this.summonedMinions.forEach(m => m.render(ctx, cameraX, cameraY, showDebug));

    // 3. Render Aerial Shadow Telegraph
    if (this.state === 'AIR_ATTACK' && this.shadowTelegraphAlpha > 0.05 && this.arena) {
      const sx = Math.floor(this.airTargetX + this.width / 2 - cameraX);
      const sy = Math.floor(this.arena.floorY - cameraY);
      ctx.save();
      ctx.globalAlpha = this.shadowTelegraphAlpha * 0.7;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 80, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ SLAM DANGER ⚠️', sx, sy - 26);
      ctx.restore();
    }

    // 4. Render Dynamic Particles
    for (const p of this.particles) {
      const px = Math.floor(p.x - cameraX);
      const py = Math.floor(p.y - cameraY);
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'flame') {
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, p.size * (1 - p.life / p.maxLife * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'steam') {
        ctx.beginPath();
        ctx.arc(px, py, p.size * (1 + p.life / p.maxLife * 0.8), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'rock') {
        ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.isUnderground || this.isAerialDisappeared) return; // Do not draw body while hidden

    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);

    ctx.save();

    // Flash white/red on hit
    if (this.hitFlashTimer > 0 && Math.floor(performance.now() / 50) % 2 === 0) {
      ctx.globalAlpha = 0.6;
    }

    // Death fade-out
    if (this.state === 'DEAD') {
      const alpha = Math.max(0, 1 - this.stateTimer / 2.5);
      ctx.globalAlpha = alpha;
    }

    // Ground-anchored sprite rendering
    const destX = drawX + this.spriteOffsetX;
    const destY = drawY + this.height - this.renderHeight - 4;
    const flipX = this.facingRight;

    // Center pivot for procedural squash & stretch / tilting
    const pivotX = destX + this.renderWidth / 2;
    const pivotY = destY + this.renderHeight;

    ctx.translate(pivotX, pivotY);

    // Procedural Posture Transforms
    let rot = 0;
    let scaleX = 1;
    let scaleY = 1;

    if (this.state === 'EXHAUSTION') {
      // Panting slouch animation
      const pant = Math.sin(this.animTime * 8);
      rot = (this.facingRight ? 1 : -1) * (0.1 + pant * 0.04);
      scaleY = 0.92 + pant * 0.04;
      scaleX = 1.04;
    } else if (this.burstRemaining > 0 || this.state === 'RAPID_HOLE_FIRE') {
      // Aggressive forward lunge / casting pose
      rot = (this.facingRight ? 1 : -1) * 0.08;
      scaleX = 1.05;
      scaleY = 0.98;
    } else if (this.state === 'AIR_ATTACK' || this.state === 'FINAL_JUMP_ATTACK') {
      // Aerodynamic stretch in air
      scaleX = 0.92;
      scaleY = 1.08;
    } else if (this.isGrounded && Math.abs(this.vx) <= 20) {
      // Gentle breathing idle
      scaleY = 1 + Math.sin(this.animTime * 3) * 0.02;
    }

    ctx.rotate(rot);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-pivotX, -pivotY);

    // Draw active boss sprite
    if (this.currentSprite && this.currentSprite.isLoaded) {
      this.currentSprite.draw(ctx, destX, destY, this.renderWidth, this.renderHeight, flipX);
    } else {
      const img = DogEnemy.getLoadedImage('rat_boss');
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        if (flipX) {
          ctx.translate(destX + this.renderWidth, destY);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, this.renderWidth, this.renderHeight);
        } else {
          ctx.drawImage(img, destX, destY, this.renderWidth, this.renderHeight);
        }
        ctx.restore();
      } else {
        this.drawVectorBossFallback(ctx, destX, destY, this.renderWidth, this.renderHeight, flipX);
      }
    }

    // Dynamic Attack VFX Overlays
    const handWorldX = this.facingRight ? drawX + this.width + 10 : drawX - 10;
    const handWorldY = drawY + this.height * 0.45;
    const eyeWorldX = this.facingRight ? drawX + this.width - 24 : drawX + 24;
    const eyeWorldY = drawY + this.height * 0.28;

    // A. Fiery Eye Glow during combat / attacks
    if (this.state !== 'DEAD' && this.state !== 'EXHAUSTION') {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(eyeWorldX, eyeWorldY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye trail beam
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(eyeWorldX, eyeWorldY);
      ctx.lineTo(eyeWorldX + (this.facingRight ? 16 : -16), eyeWorldY - 2);
      ctx.stroke();
      ctx.restore();
    }

    // B. Custom Fiery Claw Conjuring Animation when shooting Fire Nuts
    if (this.burstRemaining > 0 || this.state === 'RAPID_HOLE_FIRE') {
      ctx.save();
      // Glowing arcane flame ring
      const ringRot = this.animTime * 6;
      ctx.translate(handWorldX, handWorldY);
      ctx.rotate(ringRot);

      ctx.strokeStyle = '#f97316';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 16 + Math.sin(this.animTime * 12) * 3, 0, Math.PI * 2);
      ctx.stroke();

      // Concentric flame burst
      ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // C. Energy Shield Barrier during Block
    if (this.state === 'BLOCK' || this.blockTimer > 0) {
      ctx.save();
      const shieldX = this.facingRight ? drawX + this.width + 12 : drawX - 12;
      const shieldY = drawY + this.height / 2;

      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(shieldX, shieldY, 34, this.facingRight ? -Math.PI / 3 : (2 * Math.PI) / 3, this.facingRight ? Math.PI / 3 : (4 * Math.PI) / 3);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // Weak Point Targeting Reticle on Exposed Back during Exhaustion
    if (this.state === 'EXHAUSTION' || this.isExposingBackInHole) {
      const backHitbox = this.getBackHitbox();
      const bx = Math.floor(backHitbox.x + backHitbox.width / 2 - cameraX);
      const by = Math.floor(backHitbox.y + backHitbox.height / 2 - cameraY);

      ctx.save();
      const pulse = Math.sin(this.animTime * 10) * 4;

      // Outer targeting ring
      ctx.strokeStyle = '#06b6d4';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(bx, by, 22 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(bx - 28, by);
      ctx.lineTo(bx + 28, by);
      ctx.moveTo(bx, by - 28);
      ctx.lineTo(bx, by + 28);
      ctx.stroke();

      // Pulsing center dot
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fill();

      // Tactical prompt banner
      ctx.font = '900 11px monospace';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText('🎯 STRIKE WITH BALL!', bx, by - 36);
      ctx.restore();
    }

    // ==============================================================
    // HEAD SPINNING GRAPHIC (COOLDOWN MODE / VULNERABLE WINDOW)
    // 3D Tilted Golden Orbiting Stars + Spiral Swirl Vortex + Live Countdown
    // ==============================================================
    if (this.state === 'COOLDOWN_IDLE') {
      const headX = Math.floor(drawX + this.width / 2);
      const headY = Math.floor(drawY + 36);

      ctx.save();

      // 1. Swirling Dizzy Spiral Vortex Rings above head
      const spiralRot = this.animTime * 6;
      ctx.save();
      ctx.translate(headX, headY - 14);
      ctx.scale(1, 0.35); // flatten for 3D perspective
      ctx.rotate(spiralRot);

      ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.15) {
        const r = (a / (Math.PI * 4)) * 32;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      // 2. Revolving 3D Orbiting Golden Stars
      const numStars = 4;
      const orbitSpeed = this.animTime * 4.2;
      const rx = 46;
      const ry = 16;

      for (let s = 0; s < numStars; s++) {
        const angle = orbitSpeed + (s * (Math.PI * 2 / numStars));
        const sx = headX + Math.cos(angle) * rx;
        const sy = headY + Math.sin(angle) * ry - 10;
        const depth = (Math.sin(angle) + 1) / 2; // 0 = back, 1 = front
        const starScale = 0.75 + depth * 0.45;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle * 2.5 + this.animTime * 3);
        ctx.scale(starScale, starScale);

        ctx.fillStyle = depth > 0.4 ? '#fef08a' : '#eab308';
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 10;

        // Draw 5-pointed star
        ctx.beginPath();
        for (let p = 0; p < 5; p++) {
          const a = (p * Math.PI * 2) / 5 - Math.PI / 2;
          const rOuter = 9;
          const rInner = 4;
          const ox = Math.cos(a) * rOuter;
          const oy = Math.sin(a) * rOuter;
          const ix = Math.cos(a + Math.PI / 5) * rInner;
          const iy = Math.sin(a + Math.PI / 5) * rInner;
          if (p === 0) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
          ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 3. Tactical Countdown & Vulnerability Indicator Banner
      const timeLeft = Math.max(0, RATKEEPER_CONFIG.COOLDOWN_VULNERABLE_DURATION - this.stateTimer);
      const bannerY = headY - 48;

      ctx.font = '900 12px monospace';
      ctx.textAlign = 'center';

      // Outer pill background
      const pillW = 160;
      const pillH = 22;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(headX - pillW / 2, bannerY - 14, pillW, pillH, 11);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.shadowBlur = 0;
      ctx.fillText(`💫 DIZZY! ${timeLeft.toFixed(1)}s`, headX, bannerY + 2);

      // Subtitle
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('⚽ KICK FOOTBALL TO DAMAGE!', headX, bannerY + 24);

      ctx.restore();
    }

    // 5. Render Floating Combat Text
    for (const ft of this.floatingTexts) {
      const ftx = Math.floor(ft.x - cameraX);
      const fty = Math.floor(ft.y - cameraY);
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = ft.strokeColor;
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ftx, fty);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ftx, fty);
      ctx.restore();
    }

    // 6. Render Debug Hitboxes if debug active
    if (showDebug) {
      const frontZone = this.getFrontCatchZone();
      const backHitbox = this.getBackHitbox();

      ctx.save();
      // Front Block Zone (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(frontZone.x - cameraX, frontZone.y - cameraY, frontZone.width, frontZone.height);

      // Back Hitbox (Yellow/Gold)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.strokeRect(backHitbox.x - cameraX, backHitbox.y - cameraY, backHitbox.width, backHitbox.height);

      // Main Collision Body (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.x - cameraX, this.y - cameraY, this.width, this.height);
      ctx.restore();
    }
  }

  // Vector Fallback for Giant Rat Boss with Heavy Spiked Gloves
  private drawVectorBossFallback(ctx: CanvasRenderingContext2D, destX: number, destY: number, w: number, h: number, flipX: boolean) {
    ctx.save();
    if (flipX) {
      ctx.translate(destX + w, destY);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(destX, destY);
    }

    const cx = w / 2;
    const cy = h / 2;

    // Giant Muscular Silhouette & Dark Fur
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 60, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Spiked Armor / Pauldrons
    ctx.fillStyle = '#44403c';
    ctx.fillRect(cx - 50, cy - 50, 100, 30);

    // Glowing Menacing Red Eyes
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx - 20, cy - 40, 6, 0, Math.PI * 2);
    ctx.fill();

    // Large Heavy Combat Gloves (Left & Right)
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(cx - 45, cy + 30, 24, 0, Math.PI * 2);
    ctx.arc(cx + 35, cy + 30, 20, 0, Math.PI * 2);
    ctx.fill();

    // Glove Spikes / Metal Knuckles
    ctx.fillStyle = '#d6d3d1';
    ctx.fillRect(cx - 65, cy + 20, 12, 6);
    ctx.fillRect(cx - 65, cy + 32, 12, 6);

    ctx.restore();
  }

  // ==============================================================
  // STEP 5: GRAND BOSS HEALTH BAR & UI DISPLAY
  // ==============================================================
  public renderHUD(ctx: CanvasRenderingContext2D, screenWidth: number) {
    if (this.state === 'DEAD' && this.stateTimer >= 2.5) return;

    ctx.save();

    const barW = Math.min(620, screenWidth - 60);
    const barH = 14;
    const barX = screenWidth / 2 - barW / 2;
    const barY = 32;

    // Glowing Outer Frame
    ctx.shadowColor = '#e11d48';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(barX - 4, barY - 4, barW + 8, barH + 8, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Health Fill Bar (Dynamic Color depending on Phase)
    const healthRatio = Math.max(0, this.health / this.maxHealth);
    const fillW = Math.round(barW * healthRatio);

    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    if (this.currentPhase === 'PHASE_4' || this.currentPhase === 'PHASE_5') {
      grad.addColorStop(0, '#dc2626');
      grad.addColorStop(1, '#f97316');
    } else {
      grad.addColorStop(0, '#f43f5e');
      grad.addColorStop(1, '#fb7185');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, fillW, barH);

    // Segment Dividers (20% markers for each Phase)
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      const sx = barX + (barW / 5) * i;
      ctx.beginPath();
      ctx.moveTo(sx, barY);
      ctx.lineTo(sx, barY + barH);
      ctx.stroke();
    }

    // Boss Name Header: "RATKEEPER" (Prominent Display)
    ctx.font = '900 16px system-ui, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'left';
    ctx.fillText('👑 RATKEEPER', barX + 2, barY - 9);

    // Boss Phase Badge & Health Text
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.currentPhase.replace('_', ' ')} • ${this.health} / ${this.maxHealth} HP`, barX + barW - 2, barY - 9);

    // Tactical Reminder Pill
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('⚽ DODGE HIGH-JUMP METEOR BARRAGE • STRIKE DURING 3s DIZZY COOLDOWN TO DAMAGE!', screenWidth / 2, barY + barH + 16);

    ctx.restore();
  }
}
