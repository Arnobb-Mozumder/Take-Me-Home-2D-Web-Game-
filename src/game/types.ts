export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Platform extends Rect {
  id: string;
  type?: 'ground' | 'platform' | 'wall' | 'ramp' | 'bridge';
  color?: string;
  topColor?: string;
}

export interface BreakableWall extends Rect {
  id: string;
  isBroken: boolean;
  breakThreshold: number; // Impact speed required to break (e.g. 450)
  shakeTimer: number;
  shakeOffset: number;
}

export interface WaterZone extends Rect {
  id: string;
  label?: string;
}

export interface ThornHazard extends Rect {
  id: string;
  type?: 'ground' | 'wall';
}

export interface Checkpoint extends Rect {
  id: string;
  name: string;
  playerSpawnX: number;
  playerSpawnY: number;
  ballSpawnX: number;
  ballSpawnY: number;
  isActive: boolean;
}

export type PlayerState = 'IDLE' | 'RUN' | 'JUMP' | 'KICK' | 'CLIMB';

export type KickDirection = 'FORWARD' | 'FORWARD_UP' | 'UP' | 'FORWARD_DOWN' | 'DOWNWARD';

export type FootballState = 'RESTING' | 'ROLLING' | 'AIRBORNE';

export interface SpriteConfig {
  url: string;
  frameCount?: number; // Optional override, otherwise calculated
  frameWidth?: number;
  frameHeight?: number;
  frameDuration: number; // Duration in seconds per frame
  loop: boolean;
}

export interface PlayerDebugInfo {
  state: PlayerState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  facingRight: boolean;
  health: number;
  maxHealth: number;
  isInvincible: boolean;
}

export interface FootballDebugInfo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  state: FootballState;
  distanceFromPlayer: number;
  kickDirection: KickDirection;
  canKick: boolean;
  kickCooldown: number;
  lastImpactSpeed: number;
  kickPowerPercent: number;
  estimatedKickSpeed: number;
}

export interface EnvironmentDebugInfo {
  activeCheckpoint: string;
  currentTerrain: string;
  waterCollision: boolean;
  thornCollision: boolean;
  cliffStatus: string;
  nearbyWallDistance: number;
  wallImpactStrength: number;
  requiredWallBreakStrength: number;
}

export interface GameDebugInfo {
  player: PlayerDebugInfo;
  football: FootballDebugInfo;
  environment: EnvironmentDebugInfo;
  gameState: 'PLAYING' | 'BALL_LOST' | 'PLAYER_DIED';
}

