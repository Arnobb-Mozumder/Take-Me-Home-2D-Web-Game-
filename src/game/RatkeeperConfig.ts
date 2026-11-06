import { HoleId } from './BossHole';

export type BossState =
  | 'INTRO'
  | 'HOLE_ATTACK'
  | 'AIR_ATTACK'
  | 'HIGH_DAMAGE_METEOR_ATTACK'
  | 'COOLDOWN_IDLE'
  | 'EVADE_LEAP'
  | 'DOG_PHASE'
  | 'FINAL_JUMP_ATTACK'
  | 'EXHAUSTION'
  | 'RAPID_HOLE_FIRE'
  | 'FINAL_PHASE'
  | 'HURT'
  | 'DEAD'
  | 'BLOCK'
  | 'IDLE_STANCE';

export type BossPhase =
  | 'PHASE_1' // 100% - 80% HP: Hole transitions (Hole 1 <-> Hole 2) & Fire Nuts
  | 'PHASE_2' // 80% - 50% HP: Alternating Air Attacks & 4-Step Hole Pattern (Opposite, Opposite, Same, Same)
  | 'PHASE_3' // 50% - 30% HP: Aerial transition, 2 dog enemies, fire rain & 6-step hole sequence
  | 'PHASE_4' // 30% - 15% HP: 5-Jump Heavy Slam Assault, Exhaustion & Rapid Hole Attacks
  | 'PHASE_5'; // Below 15% HP: Final Combat State (Ratkeeper + 2 Dogs simultaneously)

export type HolePatternName =
  | 'PHASE_1_OPPOSITE'
  | 'PHASE_2_EXPLICIT'
  | 'PHASE_3_6_STEP'
  | 'RAPID_HOLE_SEQUENCE'
  | 'OPPOSITE'
  | 'SAME'
  | 'RAPID_ALTERNATE'
  | 'DOUBLE_BURROW';

export interface HoleAttackStep {
  enterHole: HoleId;
  exitHole: HoleId;
  burrowDelay: number;
  fireProjectilesOnExit: number;
  descriptor?: string;
}

// STEP 12: Phase 1 Hole Pattern (Hole 1 <-> Hole 2)
export const PHASE_1_HOLE_STEPS: HoleAttackStep[] = [
  { enterHole: 'HOLE_1', exitHole: 'HOLE_2', burrowDelay: 1.1, fireProjectilesOnExit: 1, descriptor: 'HOLE_1 -> HOLE_2' },
  { enterHole: 'HOLE_2', exitHole: 'HOLE_1', burrowDelay: 1.1, fireProjectilesOnExit: 1, descriptor: 'HOLE_2 -> HOLE_1' },
];

// STEP 14: Phase 2 Explicit 4-Step Pattern:
// 1. Opposite end (Hole 1 -> Hole 2)
// 2. Opposite end (Hole 2 -> Hole 1)
// 3. Same end     (Hole 1 -> Hole 1)
// 4. Same end     (Hole 2 -> Hole 2)
export const PHASE_2_HOLE_STEPS: HoleAttackStep[] = [
  { enterHole: 'HOLE_1', exitHole: 'HOLE_2', burrowDelay: 0.95, fireProjectilesOnExit: 2, descriptor: 'Opposite end (1 -> 2)' },
  { enterHole: 'HOLE_2', exitHole: 'HOLE_1', burrowDelay: 0.95, fireProjectilesOnExit: 2, descriptor: 'Opposite end (2 -> 1)' },
  { enterHole: 'HOLE_1', exitHole: 'HOLE_1', burrowDelay: 0.95, fireProjectilesOnExit: 2, descriptor: 'Same end (1 -> 1)' },
  { enterHole: 'HOLE_2', exitHole: 'HOLE_2', burrowDelay: 0.95, fireProjectilesOnExit: 2, descriptor: 'Same end (2 -> 2)' },
];

// STEP 18: Phase 3 Configurable 6-Step Pattern:
// 1. OPPOSITE (Hole 1 -> Hole 2)
// 2. OPPOSITE (Hole 2 -> Hole 1)
// 3. SAME     (Hole 1 -> Hole 1)
// 4. SAME     (Hole 2 -> Hole 2)
// 5. OPPOSITE (Hole 2 -> Hole 1)
// 6. SAME     (Hole 1 -> Hole 1)
export const PHASE_3_HOLE_STEPS: HoleAttackStep[] = [
  { enterHole: 'HOLE_1', exitHole: 'HOLE_2', burrowDelay: 0.85, fireProjectilesOnExit: 2, descriptor: 'OPPOSITE (1 -> 2)' },
  { enterHole: 'HOLE_2', exitHole: 'HOLE_1', burrowDelay: 0.85, fireProjectilesOnExit: 2, descriptor: 'OPPOSITE (2 -> 1)' },
  { enterHole: 'HOLE_1', exitHole: 'HOLE_1', burrowDelay: 0.85, fireProjectilesOnExit: 2, descriptor: 'SAME (1 -> 1)' },
  { enterHole: 'HOLE_2', exitHole: 'HOLE_2', burrowDelay: 0.85, fireProjectilesOnExit: 2, descriptor: 'SAME (2 -> 2)' },
  { enterHole: 'HOLE_2', exitHole: 'HOLE_1', burrowDelay: 0.85, fireProjectilesOnExit: 2, descriptor: 'OPPOSITE (2 -> 1)' },
  { enterHole: 'HOLE_1', exitHole: 'HOLE_1', burrowDelay: 0.85, fireProjectilesOnExit: 2, descriptor: 'SAME (1 -> 1)' },
];

// STEP 22: Rapid Hole Fire Configurable 8-Step Pattern:
// HOLE_1, HOLE_2, HOLE_2, HOLE_1, HOLE_1, HOLE_2, HOLE_1, HOLE_1
// 5 fire nuts per attack burst, noticeably faster than previous phases!
export const RAPID_HOLE_FIRE_STEPS: HoleAttackStep[] = [
  { enterHole: 'HOLE_1', exitHole: 'HOLE_1', burrowDelay: 0.50, fireProjectilesOnExit: 5, descriptor: 'RAPID HOLE_1' },
  { enterHole: 'HOLE_2', exitHole: 'HOLE_2', burrowDelay: 0.50, fireProjectilesOnExit: 5, descriptor: 'RAPID HOLE_2' },
  { enterHole: 'HOLE_2', exitHole: 'HOLE_2', burrowDelay: 0.50, fireProjectilesOnExit: 5, descriptor: 'RAPID HOLE_2' },
  { enterHole: 'HOLE_1', exitHole: 'HOLE_1', burrowDelay: 0.50, fireProjectilesOnExit: 5, descriptor: 'RAPID HOLE_1' },
  { enterHole: 'HOLE_1', exitHole: 'HOLE_1', burrowDelay: 0.50, fireProjectilesOnExit: 5, descriptor: 'RAPID HOLE_1' },
  { enterHole: 'HOLE_2', exitHole: 'HOLE_2', burrowDelay: 0.50, fireProjectilesOnExit: 5, descriptor: 'RAPID HOLE_2' },
  { enterHole: 'HOLE_1', exitHole: 'HOLE_1', burrowDelay: 0.50, fireProjectilesOnExit: 5, descriptor: 'RAPID HOLE_1' },
  { enterHole: 'HOLE_1', exitHole: 'HOLE_1', burrowDelay: 0.50, fireProjectilesOnExit: 5, descriptor: 'RAPID HOLE_1' },
];

export const RATKEEPER_PATTERNS: Record<HolePatternName, HoleAttackStep[]> = {
  PHASE_1_OPPOSITE: PHASE_1_HOLE_STEPS,
  PHASE_2_EXPLICIT: PHASE_2_HOLE_STEPS,
  PHASE_3_6_STEP: PHASE_3_HOLE_STEPS,
  RAPID_HOLE_SEQUENCE: RAPID_HOLE_FIRE_STEPS,
  OPPOSITE: [
    { enterHole: 'HOLE_1', exitHole: 'HOLE_2', burrowDelay: 1.1, fireProjectilesOnExit: 1 },
    { enterHole: 'HOLE_2', exitHole: 'HOLE_1', burrowDelay: 1.1, fireProjectilesOnExit: 1 },
  ],
  SAME: [
    { enterHole: 'HOLE_1', exitHole: 'HOLE_1', burrowDelay: 1.0, fireProjectilesOnExit: 2 },
    { enterHole: 'HOLE_2', exitHole: 'HOLE_2', burrowDelay: 1.0, fireProjectilesOnExit: 2 },
  ],
  RAPID_ALTERNATE: [
    { enterHole: 'HOLE_1', exitHole: 'HOLE_2', burrowDelay: 0.8, fireProjectilesOnExit: 2 },
    { enterHole: 'HOLE_2', exitHole: 'HOLE_1', burrowDelay: 0.7, fireProjectilesOnExit: 2 },
    { enterHole: 'HOLE_1', exitHole: 'HOLE_2', burrowDelay: 0.6, fireProjectilesOnExit: 3 },
  ],
  DOUBLE_BURROW: [
    { enterHole: 'HOLE_1', exitHole: 'HOLE_1', burrowDelay: 0.9, fireProjectilesOnExit: 1 },
    { enterHole: 'HOLE_1', exitHole: 'HOLE_2', burrowDelay: 0.8, fireProjectilesOnExit: 3 },
  ],
};

export const RATKEEPER_CONFIG = {
  BOSS_NAME: 'RATKEEPER',
  MAX_HEALTH: 320,

  // Hitbox & Physical Body Dimensions (3x scale relative to Player)
  HITBOX_WIDTH: 144,
  HITBOX_HEIGHT: 240,
  RENDER_WIDTH: 360,
  RENDER_HEIGHT: 288,
  SPRITE_OFFSET_X: -108,
  SPRITE_OFFSET_Y: -38,

  // Speed & Physics
  RUN_SPEED: 260,
  ENRAGED_RUN_SPEED: 380,
  JUMP_VELOCITY: -760,
  SLAM_VELOCITY: 980,
  GRAVITY: 1100,

  // Combat Vulnerability & Cooldown Mechanics
  // During 3.0s cooldown mode after high-damage jump/fireball attack, ball deals significant damage
  // During regular times, the boss completely blocks and deflects every attack (0 damage)
  COOLDOWN_VULNERABLE_DURATION: 3.0, // 3-second dazed/idle cooldown window
  VULNERABLE_BALL_DAMAGE: 20, // Satisfying chunk damage when hitting during dizzy cooldown window
  NORMAL_ATTACK_DAMAGE: 0,
  FRONT_BLOCK_ZONE_WIDTH: 110,
  FRONT_BLOCK_ZONE_HEIGHT: 220,
<<<<<<< HEAD
  BLOCK_COOLDOWN: 0.68,
=======
  BLOCK_COOLDOWN: 0.50,
>>>>>>> e8c0cb20009c65fd4cf5f49b27f746153ccc0b72
  BOSS_HIT_COOLDOWN: 0.35, // Prevents repeated collision frames from draining boss health instantly

  // Proximity Evade Mechanics: when player gets too close, boss leaps high and switches sides
  PROXIMITY_EVADE_DISTANCE: 88,
  EVADE_JUMP_VELOCITY: -780,
  EVADE_HORIZONTAL_SPEED: 340,

  // Hole Back Exposure Window
  HOLE_ENTRY_TELEGRAPH_DURATION: 0.60,
  HOLE_EXIT_BURST_DURATION: 0.45,

  // ==============================================================
  // Fire Nut Projectile Configuration (Increased High Damage)
  // ==============================================================
  FIRE_NUT_DAMAGE_PERCENT: 0.30,
  FIRE_NUT_DAMAGE: 30, // 30% of 100 max HP
  FIRE_NUT_SPEED: 520,
  FIRE_NUT_RADIUS: 16,

  // ==============================================================
  // High-Damage Aerial Fireball Barrage & Warning Markers
  // ==============================================================
  AIR_ATTACK_TELEGRAPH_TIME: 0.75, // Duration player sees ground warning marker before impact
  AIR_ATTACK_PROJECTILE_SPEED: 660,
  AIR_ATTACK_FIREBALL_RADIUS: 20,
  AIR_ATTACK_BURST_COUNT: 7, // Produces a lot of fireballs
  AIR_ATTACK_FIREBALL_DAMAGE: 35, // High damage to player

  // ==============================================================
  // STEP 16, 17, 18: Phase 3 Configuration (Below 50% HP)
  // ==============================================================
  PHASE_3_TRANSITION_DURATION: 4.0, // Aerial transition duration
  PHASE_3_FIRE_RAIN_INTERVAL: 0.85, // Falling fire rain frequency
  PHASE_3_MINION_HEALTH: 35, // Dog enemy health (lower than boss, killable with football/player attacks)

  // ==============================================================
  // Phase 4 Five Jump Sequence (Below 30% HP)
  // ==============================================================
  FINAL_SLAM_TOTAL_JUMPS: 5, // Perform exactly 5 jumps
  FINAL_SLAM_DAMAGE_PERCENT: 0.45, // 45% of player's maximum health
  FINAL_SLAM_DAMAGE: 45, // 45 high damage
  FINAL_SLAM_TELEGRAPH_TIME: 0.85, // Warning marker on ground before landing
  FINAL_SLAM_TARGET_OFFSET_RANGE: 60, // Small configurable targeting offset (playerX + randomOffset)
  FINAL_SLAM_AIR_TIME: 1.1,
  FINAL_SLAM_FALL_SPEED: 1200,
  FINAL_SLAM_RECOVERY_TIME: 0.55,
  EXHAUSTION_DURATION: 1.8,

  // ==============================================================
  // Melee / Contact / Bite Damage
  // ==============================================================
  MELEE_CONTACT_DAMAGE: 30, // Contact with boss while charging/leaping
  SHOCKWAVE_DAMAGE: 30,

  // ==============================================================
  // STEP 22: Rapid Hole Fire Attack Configuration
  // ==============================================================
  RAPID_BURST_COUNT: 5, // 5 fire nuts per attack burst
  RAPID_FIRE_INTERVAL: 0.28,
  RAPID_FIRE_SPREAD_ANGLE: 0.18, // Spread angle between consecutive nuts in burst

  // ==============================================================
  // STEP 23: Phase 5 Configuration (Below 15% HP)
  // ==============================================================
  PHASE_5_DOG_HEALTH: 35,

  // ==============================================================
  // Phase Health Thresholds (Step 29 Central Configuration)
  // Phase 1: 100% -> 80% HP
  // Phase 2: 80% -> 50% HP
  // Phase 3: 50% -> 30% HP
  // Phase 4: 30% -> 15% HP
  // Phase 5: Below 15% HP (Final combat state: Ratkeeper + Dog 1 + Dog 2)
  // ==============================================================
  PHASE_THRESHOLDS: {
    PHASE_1: 0.80, // Health >= 80%
    PHASE_2: 0.50, // 50% - 80% HP
    PHASE_3: 0.30, // 30% - 50% HP
    PHASE_4: 0.15, // 15% - 30% HP
    PHASE_5: 0.00, // < 15% HP
  },

  // ==============================================================
  // STEP 15: Second Health Potion Configuration
  // Spawns exactly ONE additional health potion when boss drops to 60% HP
  // ==============================================================
  SECOND_POTION_HEALTH_THRESHOLD: 0.60,
  SECOND_POTION_SPAWN_X: 1200,
  SECOND_POTION_SPAWN_Y: 575,
  SECOND_POTION_HEAL_AMOUNT: 100,

  // State Durations & Cooldowns
  INTRO_DURATION: 3.0,
  HURT_DURATION: 0.65,
  AIR_ATTACK_LEAP_TIME: 1.2,
  DOG_SUMMON_COOLDOWN: 14.0,
};

