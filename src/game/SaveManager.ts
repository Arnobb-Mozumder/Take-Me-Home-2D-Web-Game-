export interface SavedSpriteConfig {
  dataUrl: string;
  frameCount?: number;
}

export type PlayerSpriteType = 'character' | 'idle' | 'run' | 'jump' | 'kick' | 'climb';
export type DogSpriteType = 'dog_sleep' | 'dog_wakeup' | 'dog_alert' | 'dog_run' | 'dog_bite' | 'dog_damage' | 'dog_enemy';
export type MenuSpriteType = 'start_menue' | 'background_level1';

export type SpriteType = PlayerSpriteType | DogSpriteType | MenuSpriteType;

export interface SavedSprites {
  // Player
  character?: SavedSpriteConfig;
  idle?: SavedSpriteConfig;
  run?: SavedSpriteConfig;
  jump?: SavedSpriteConfig;
  kick?: SavedSpriteConfig;
  climb?: SavedSpriteConfig;
  // Dog Enemies
  dog_sleep?: SavedSpriteConfig;
  dog_wakeup?: SavedSpriteConfig;
  dog_alert?: SavedSpriteConfig;
  dog_run?: SavedSpriteConfig;
  dog_bite?: SavedSpriteConfig;
  dog_damage?: SavedSpriteConfig;
  dog_enemy?: SavedSpriteConfig;
  // Menu & Environment
  start_menue?: SavedSpriteConfig;
  background_level1?: SavedSpriteConfig;
}

export interface SavedGameState {
  version: number;
  level?: number;
  checkpointId: string;
  checkpointName: string;
  player: {
    x: number;
    y: number;
    health: number;
    facingRight: boolean;
  };
  football: {
    x: number;
    y: number;
  };
  brokenWallIds: string[];
  crates: { id: string; x: number; y: number }[];
  collectedPotionIds?: string[];
  bossDefeated?: boolean;
  stoneGateOpen?: boolean;
  timestamp: number;
}

const SPRITES_STORAGE_KEY = 'FOOTBALL_SAVED_SPRITES_V1';
const GAME_STATE_STORAGE_KEY = 'FOOTBALL_GAME_SAVE_V1';

type SpriteChangeListener = (type: SpriteType, config?: SavedSpriteConfig) => void;

export class SaveManager {
  private static spriteListeners: SpriteChangeListener[] = [];

  public static addSpriteChangeListener(listener: SpriteChangeListener) {
    this.spriteListeners.push(listener);
    return () => {
      this.spriteListeners = this.spriteListeners.filter(l => l !== listener);
    };
  }

  private static notifySpriteChange(type: SpriteType, config?: SavedSpriteConfig) {
    this.spriteListeners.forEach(listener => {
      try {
        listener(type, config);
      } catch (e) {
        console.warn('Error in sprite change listener:', e);
      }
    });
  }

  // ==========================================================
  // SPRITE SHEETS & ANIMATIONS PERSISTENCE
  // ==========================================================

  public static saveSprite(type: SpriteType, dataUrl: string, frameCount?: number): boolean {
    try {
      const existing = this.loadAllSprites();
      existing[type] = { dataUrl, frameCount };
      localStorage.setItem(SPRITES_STORAGE_KEY, JSON.stringify(existing));
      this.notifySpriteChange(type, existing[type]);
      return true;
    } catch (err) {
      console.warn('Failed to save sprite to localStorage (may be storage limit):', err);
      return false;
    }
  }

  public static removeSprite(type: SpriteType): void {
    try {
      const existing = this.loadAllSprites();
      delete existing[type];
      localStorage.setItem(SPRITES_STORAGE_KEY, JSON.stringify(existing));
      this.notifySpriteChange(type, undefined);
    } catch (err) {
      console.warn('Failed to remove sprite from localStorage:', err);
    }
  }

  public static clearAllSprites(): void {
    try {
      localStorage.removeItem(SPRITES_STORAGE_KEY);
      this.notifySpriteChange('character', undefined);
    } catch (err) {
      console.warn('Failed to clear sprites from localStorage:', err);
    }
  }

  public static loadAllSprites(): SavedSprites {
    try {
      const raw = localStorage.getItem(SPRITES_STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as SavedSprites;
    } catch (err) {
      console.warn('Failed to load sprites from localStorage:', err);
      return {};
    }
  }

  public static getSavedSprite(type: SpriteType): SavedSpriteConfig | undefined {
    const all = this.loadAllSprites();
    return all[type];
  }

  // ==========================================================
  // GAME PROGRESS & STATE PERSISTENCE
  // ==========================================================

  public static saveGameState(state: SavedGameState): boolean {
    try {
      localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn('Failed to save game state to localStorage:', err);
      return false;
    }
  }

  public static loadGameState(): SavedGameState | null {
    try {
      const raw = localStorage.getItem(GAME_STATE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedGameState;
      // Basic sanity check
      if (parsed && typeof parsed.version === 'number' && parsed.checkpointId) {
        return parsed;
      }
      return null;
    } catch (err) {
      console.warn('Failed to load game state from localStorage:', err);
      return null;
    }
  }

  public static clearGameState(): void {
    try {
      localStorage.removeItem(GAME_STATE_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear game state from localStorage:', err);
    }
  }
}
