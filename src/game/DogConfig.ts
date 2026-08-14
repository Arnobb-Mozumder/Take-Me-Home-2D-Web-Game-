// Centralized Configuration for Dog Enemy AI, Combat, and Physics
export const DOG_CONFIG = {
  // Health & Durability
  MAX_HEALTH: 120, // 120 HP base

  // Football Damage Tiers (2 High, 4 Medium, 6 Low)
  HIGH_DAMAGE: 60,   // 60 * 2 = 120 HP (2 hits)
  MEDIUM_DAMAGE: 30, // 30 * 4 = 120 HP (4 hits)
  LOW_DAMAGE: 20,    // 20 * 6 = 120 HP (6 hits)

  // Football Impact Velocity Thresholds (px/s)
  HIT_SPEED_HIGH: 550,
  HIT_SPEED_MEDIUM: 320,
  HIT_SPEED_LOW: 120,

  // Detection & Territory Ranges (px)
  DETECTION_RANGE: 520,      // Significantly larger detection range from dog at which it wakes up
  ATTACK_RANGE: 75,          // Range at which dog lunges to bite
  MAX_CHASE_DISTANCE: 950,   // Expanded maximum chase territory from original spawn before giving up

  // Movement Speeds (px/s)
  MOVE_SPEED: 210,           // Chasing run speed (fast pursuit)
  RETURN_SPEED: 160,         // Return to spawn speed
  GRAVITY: 1500,             // Vertical gravity
  KNOCKBACK_FORCE: 240,      // Recoil velocity when struck by football

  // Bite Attack Combat & Damage
  BITE_DAMAGE_PERCENT: 25,   // 25% of player's maximum health per bite (25 HP out of 100)
  BITE_COOLDOWN: 0.85,       // Seconds between bite attempts
  DAMAGE_COOLDOWN: 0.40,     // Invulnerability / hit-protection window against continuous football collision

  // State Timers (seconds)
  WAKEUP_DURATION: 0.48,     // Duration to play wake-up animation before becoming alert
  ALERT_DURATION: 0.35,      // Brief alert window before chasing
  DAMAGE_ANIM_DURATION: 0.45,// Duration of hurt/recoil animation
  DEATH_FADE_DURATION: 0.35, // Quick fade/collapse before body is removed from level

  // Visual Render Box
  HITBOX_WIDTH: 72,
  HITBOX_HEIGHT: 54,
  RENDER_WIDTH: 108,
  RENDER_HEIGHT: 78,
  SPRITE_OFFSET_X: -18,
  SPRITE_OFFSET_Y: -24,
};

export type DogState =
  | 'SLEEPING'
  | 'WAKING_UP'
  | 'ALERT'
  | 'CHASING'
  | 'ATTACKING'
  | 'ATTACK_COOLDOWN'
  | 'RETURNING'
  | 'DAMAGED'
  | 'DEAD';
