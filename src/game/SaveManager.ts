export interface SavedSpriteConfig {
  dataUrl: string;
  frameCount?: number;
}

export type SpriteType = 'character' | 'idle' | 'run' | 'jump' | 'kick' | 'climb';

export interface SavedSprites {
  character?: SavedSpriteConfig;
  idle?: SavedSpriteConfig;
  run?: SavedSpriteConfig;
  jump?: SavedSpriteConfig;
  kick?: SavedSpriteConfig;
  climb?: SavedSpriteConfig;
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
  timestamp: number;
}

const SPRITES_STORAGE_KEY = 'FOOTBALL_SAVED_SPRITES_V1';
const GAME_STATE_STORAGE_KEY = 'FOOTBALL_GAME_SAVE_V1';

export class SaveManager {
  // ==========================================================
  // SPRITE SHEETS & ANIMATIONS PERSISTENCE
  // ==========================================================

  public static saveSprite(type: SpriteType, dataUrl: string, frameCount?: number): boolean {
    try {
      const existing = this.loadAllSprites();
      existing[type] = { dataUrl, frameCount };
      localStorage.setItem(SPRITES_STORAGE_KEY, JSON.stringify(existing));
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
    } catch (err) {
      console.warn('Failed to remove sprite from localStorage:', err);
    }
  }

  public static clearAllSprites(): void {
    try {
      localStorage.removeItem(SPRITES_STORAGE_KEY);
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
