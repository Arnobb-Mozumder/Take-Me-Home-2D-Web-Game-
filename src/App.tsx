import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Game } from './game/Game';
import { SaveManager } from './game/SaveManager';
import { StartMenu } from './components/StartMenu';
import { SpriteUploaderModal } from './components/SpriteUploaderModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import {
  Sparkles,
  Layers,
  Menu,
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Target,
  Magnet,
  Maximize,
  HelpCircle,
  X,
  Map
} from 'lucide-react';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isStartMenuOpen, setIsStartMenuOpen] = useState<boolean>(true);
  const [isSpriteModalOpen, setIsSpriteModalOpen] = useState<boolean>(false);
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState<boolean>(false);
  const [hasActiveGame, setHasActiveGame] = useState<boolean>(false);
  const [showControlsHelp, setShowControlsHelp] = useState<boolean>(false);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
<<<<<<< HEAD
  const [isBossGameOver, setIsBossGameOver] = useState<boolean>(false);
=======
>>>>>>> e8c0cb20009c65fd4cf5f49b27f746153ccc0b72

  // Initialize or re-initialize game
  const initGame = useCallback((forceNew = false) => {
    if (!canvasRef.current || !containerRef.current) return;

    if (forceNew) {
      SaveManager.clearGameState();
    }

    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.max(800, Math.floor(rect.width));
    const height = Math.max(500, Math.floor(rect.height));

    const game = new Game(canvasRef.current, width, height);
<<<<<<< HEAD
    game.onGameStateChange = (state, level) => {
      if (state === 'PLAYER_DIED' && level === 3) {
        setIsBossGameOver(true);
      } else if (state === 'PLAYING') {
        setIsBossGameOver(false);
      }
    };
=======
>>>>>>> e8c0cb20009c65fd4cf5f49b27f746153ccc0b72
    gameRef.current = game;
    game.start();
    setHasActiveGame(true);
  }, []);

  // Handle Window & Container Resize
  useEffect(() => {
    const handleResize = () => {
      if (gameRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(800, Math.floor(rect.width));
        const height = Math.max(500, Math.floor(rect.height));
        gameRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLevelSelectOpen) {
          setIsLevelSelectOpen(false);
          if (gameRef.current && !isStartMenuOpen) {
            gameRef.current.start();
          }
        } else if (isSpriteModalOpen) {
          setIsSpriteModalOpen(false);
        } else {
          setIsStartMenuOpen((prev) => {
            const next = !prev;
            if (next && gameRef.current) {
              gameRef.current.stop();
            } else if (!next && gameRef.current) {
              gameRef.current.start();
            }
            return next;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpriteModalOpen, isLevelSelectOpen, isStartMenuOpen]);

  // Touch device auto-detect
  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setShowTouchControls(true);
    }
  }, []);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  // Start Menu & Level Select Handlers
  const handleNewGame = () => {
    setIsStartMenuOpen(false);
    initGame(true);
  };

  const handleLoadGame = () => {
    setIsStartMenuOpen(false);
    initGame(false);
  };

  const handleResumeGame = () => {
    setIsStartMenuOpen(false);
    if (!gameRef.current) {
      initGame(false);
    } else {
      gameRef.current.start();
    }
  };

  const handleOpenMenu = () => {
    if (gameRef.current) {
      gameRef.current.stop();
    }
    setIsStartMenuOpen(true);
  };

  const handleSelectLevel = (levelNumber: number, checkpointId?: string, forceBossReplay?: boolean) => {
    setIsStartMenuOpen(false);
    setIsLevelSelectOpen(false);
<<<<<<< HEAD
    setIsBossGameOver(false);
=======
>>>>>>> e8c0cb20009c65fd4cf5f49b27f746153ccc0b72

    if (!gameRef.current) {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(800, Math.floor(rect.width));
      const height = Math.max(500, Math.floor(rect.height));

      const game = new Game(canvasRef.current, width, height);
<<<<<<< HEAD
      game.onGameStateChange = (state, level) => {
        if (state === 'PLAYER_DIED' && level === 3) {
          setIsBossGameOver(true);
        } else if (state === 'PLAYING') {
          setIsBossGameOver(false);
        }
      };
=======
>>>>>>> e8c0cb20009c65fd4cf5f49b27f746153ccc0b72
      gameRef.current = game;
      game.warpToLevel(levelNumber, { checkpointId, forceBossReplay });
      game.start();
      setHasActiveGame(true);
    } else {
      gameRef.current.warpToLevel(levelNumber, { checkpointId, forceBossReplay });
      gameRef.current.start();
      setHasActiveGame(true);
    }
  };

<<<<<<< HEAD
  const handleRetryBossFight = () => {
    setIsBossGameOver(false);
    if (gameRef.current) {
      gameRef.current.retryBossFight();
    }
  };

=======
>>>>>>> e8c0cb20009c65fd4cf5f49b27f746153ccc0b72
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      id="game-viewport-container"
      className="relative w-screen h-screen bg-slate-950 overflow-hidden select-none flex items-center justify-center font-sans text-slate-100"
    >
      {/* 1. Main Game Canvas */}
      <canvas
        ref={canvasRef}
        id="game-canvas"
        className="w-full h-full block bg-slate-950 outline-none cursor-default"
        tabIndex={0}
      />

      {/* 2. Top-Right Quick HUD Bar */}
      {!isStartMenuOpen && (
        <header className="absolute top-3 right-4 z-40 flex items-center gap-2 pointer-events-auto">
          <button
            id="btn-level-select"
            onClick={() => {
              if (gameRef.current) {
                gameRef.current.stop();
              }
              setIsLevelSelectOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all cursor-pointer"
            title="Level Select & Boss Battle Testing"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Levels & Boss</span>
          </button>

          <button
            id="btn-sprite-manager"
            onClick={() => setIsSpriteModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-indigo-300 hover:text-white font-medium text-xs flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all cursor-pointer"
            title="Open Custom Sprites Uploader"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Sprites</span>
          </button>

          <button
            id="btn-controls-help"
            onClick={() => setShowControlsHelp(!showControlsHelp)}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md shadow-lg transition-all cursor-pointer"
            title="Controls & Abilities"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>

          <button
            id="btn-toggle-touch"
            onClick={() => setShowTouchControls(!showTouchControls)}
            className={`p-2 rounded-xl border backdrop-blur-md shadow-lg transition-all cursor-pointer ${
              showTouchControls
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Toggle On-Screen Touch Controls"
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            id="btn-toggle-fullscreen"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md shadow-lg transition-all cursor-pointer hidden md:flex"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>

          <button
            id="btn-pause-menu"
            onClick={handleOpenMenu}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition-all cursor-pointer"
            title="Pause & Open Menu"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Menu</span>
          </button>
        </header>
      )}

      {/* 3. Controls Help Drawer */}
      {showControlsHelp && !isStartMenuOpen && (
        <aside
          id="controls-help-modal"
          className="absolute top-14 right-4 z-40 w-80 bg-slate-900/95 border border-slate-700/90 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>How To Play & Controls</span>
            </div>
            <button
              onClick={() => setShowControlsHelp(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Move Left / Right</span>
              <span className="font-mono text-amber-300 font-bold">A / D or ◀ ▶</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Jump / Ledge Climb</span>
              <span className="font-mono text-amber-300 font-bold">W / Space / ▲</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Kick Football</span>
              <span className="font-mono text-lime-400 font-bold">K / Space / E</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Precision Aiming</span>
              <span className="font-mono text-sky-300 font-bold">R Key</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Teleport to Ball</span>
              <span className="font-mono text-indigo-300 font-bold">T / Q Key</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Recall Ball</span>
              <span className="font-mono text-rose-300 font-bold">C Key</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Operate Elevator</span>
              <span className="font-mono text-amber-300 font-bold">F / E Key</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Slide / Crouch</span>
              <span className="font-mono text-amber-300 font-bold">S / ▼</span>
            </div>
          </div>
        </aside>
      )}

      {/* 4. On-Screen Virtual Touch Controls (Mobile / Tablet Friendly) */}
      {showTouchControls && !isStartMenuOpen && (
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-end p-4">
          <div className="flex items-end justify-between w-full pointer-events-auto">
            {/* Left D-Pad Controls */}
            <div className="flex items-center gap-2 bg-slate-950/70 p-2 rounded-2xl border border-slate-800 backdrop-blur-sm">
              <button
                onTouchStart={() => gameRef.current?.input.setVirtualLeft(true)}
                onTouchEnd={() => gameRef.current?.input.setVirtualLeft(false)}
                onMouseDown={() => gameRef.current?.input.setVirtualLeft(true)}
                onMouseUp={() => gameRef.current?.input.setVirtualLeft(false)}
                className="w-12 h-12 rounded-xl bg-slate-800/90 active:bg-slate-700 flex items-center justify-center text-slate-200 border border-slate-700 select-none touch-manipulation cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              <div className="flex flex-col gap-2">
                <button
                  onTouchStart={() => gameRef.current?.input.setVirtualUp(true)}
                  onTouchEnd={() => gameRef.current?.input.setVirtualUp(false)}
                  onMouseDown={() => gameRef.current?.input.setVirtualUp(true)}
                  onMouseUp={() => gameRef.current?.input.setVirtualUp(false)}
                  className="w-12 h-12 rounded-xl bg-slate-800/90 active:bg-slate-700 flex items-center justify-center text-slate-200 border border-slate-700 select-none touch-manipulation cursor-pointer"
                >
                  <ArrowUp className="w-6 h-6" />
                </button>
                <button
                  onTouchStart={() => gameRef.current?.input.setVirtualDown(true)}
                  onTouchEnd={() => gameRef.current?.input.setVirtualDown(false)}
                  onMouseDown={() => gameRef.current?.input.setVirtualDown(true)}
                  onMouseUp={() => gameRef.current?.input.setVirtualDown(false)}
                  className="w-12 h-12 rounded-xl bg-slate-800/90 active:bg-slate-700 flex items-center justify-center text-slate-200 border border-slate-700 select-none touch-manipulation cursor-pointer"
                >
                  <ArrowDown className="w-6 h-6" />
                </button>
              </div>

              <button
                onTouchStart={() => gameRef.current?.input.setVirtualRight(true)}
                onTouchEnd={() => gameRef.current?.input.setVirtualRight(false)}
                onMouseDown={() => gameRef.current?.input.setVirtualRight(true)}
                onMouseUp={() => gameRef.current?.input.setVirtualRight(false)}
                className="w-12 h-12 rounded-xl bg-slate-800/90 active:bg-slate-700 flex items-center justify-center text-slate-200 border border-slate-700 select-none touch-manipulation cursor-pointer"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>

            {/* Right Action Buttons */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2 rounded-2xl border border-slate-800 backdrop-blur-sm">
              <button
                onClick={() => gameRef.current?.input.triggerVirtualTeleport()}
                className="w-12 h-12 rounded-xl bg-indigo-900/80 active:bg-indigo-700 flex flex-col items-center justify-center text-[10px] font-bold text-indigo-200 border border-indigo-500/50 select-none touch-manipulation cursor-pointer"
                title="Teleport to Ball"
              >
                <Zap className="w-4 h-4 text-indigo-300" />
                <span>TP</span>
              </button>

              <button
                onClick={() => gameRef.current?.input.triggerVirtualRecall()}
                className="w-12 h-12 rounded-xl bg-rose-900/80 active:bg-rose-700 flex flex-col items-center justify-center text-[10px] font-bold text-rose-200 border border-rose-500/50 select-none touch-manipulation cursor-pointer"
                title="Recall Ball"
              >
                <Magnet className="w-4 h-4 text-rose-300" />
                <span>REC</span>
              </button>

              <button
                onTouchStart={() => gameRef.current?.input.triggerVirtualJump()}
                onMouseDown={() => gameRef.current?.input.triggerVirtualJump()}
                className="w-12 h-12 rounded-xl bg-amber-600 active:bg-amber-500 flex flex-col items-center justify-center text-[10px] font-bold text-slate-950 border border-amber-400 select-none touch-manipulation cursor-pointer"
              >
                <ArrowUp className="w-4 h-4 stroke-[3]" />
                <span>JUMP</span>
              </button>

              <button
                onClick={() => gameRef.current?.input.consumeAimRequest()}
                className="w-12 h-12 rounded-xl bg-sky-900/80 active:bg-sky-700 flex flex-col items-center justify-center text-[10px] font-bold text-sky-200 border border-sky-500/50 select-none touch-manipulation cursor-pointer"
                title="Aim Mode"
              >
                <Target className="w-4 h-4 text-sky-300" />
                <span>AIM</span>
              </button>

              <button
                onClick={() => gameRef.current?.input.triggerVirtualElevator()}
                className="w-12 h-12 rounded-xl bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center text-[10px] font-bold text-amber-300 border border-slate-600 select-none touch-manipulation cursor-pointer"
                title="Interact / Elevator"
              >
                <span>F</span>
                <span className="text-[9px] text-slate-400">ACT</span>
              </button>

              <button
                onTouchStart={() => gameRef.current?.input.setVirtualKickState(true)}
                onTouchEnd={() => gameRef.current?.input.setVirtualKickState(false)}
                onMouseDown={() => gameRef.current?.input.setVirtualKickState(true)}
                onMouseUp={() => gameRef.current?.input.setVirtualKickState(false)}
                className="w-12 h-12 rounded-xl bg-lime-600 active:bg-lime-500 flex flex-col items-center justify-center text-[10px] font-bold text-slate-950 border border-lime-400 select-none touch-manipulation cursor-pointer"
              >
                <span>⚽</span>
                <span>KICK</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Custom Sprites Uploader Modal */}
      <SpriteUploaderModal
        isOpen={isSpriteModalOpen}
        onClose={() => setIsSpriteModalOpen(false)}
        player={gameRef.current?.player || null}
      />

      {/* 6. Start Menu Component */}
      <StartMenu
        isOpen={isStartMenuOpen}
        onNewGame={handleNewGame}
        onLoadGame={handleLoadGame}
        onResumeGame={handleResumeGame}
        onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
        hasActiveGame={hasActiveGame}
      />

      {/* 7. Level Select & Boss Replay Modal */}
      <LevelSelectModal
        isOpen={isLevelSelectOpen}
        onClose={() => {
          setIsLevelSelectOpen(false);
          if (gameRef.current && !isStartMenuOpen) {
            gameRef.current.start();
          }
        }}
        onSelectLevel={handleSelectLevel}
        currentLevel={gameRef.current?.environment.currentLevel || 1}
      />
<<<<<<< HEAD

      {/* 8. Boss Battle Retry Modal Overlay */}
      {isBossGameOver && !isStartMenuOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-red-500/50 shadow-2xl text-center flex flex-col items-center">
            <div className="w-14 h-14 mb-3 rounded-full bg-red-950/80 border border-red-500/60 flex items-center justify-center text-2xl shadow-lg shadow-red-900/40">
              👑
            </div>
            <h2 className="text-2xl font-black text-red-400 tracking-wide uppercase">
              The Ratkeeper Prevailed
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-xs">
              You were defeated in the subterranean lair. The Ratkeeper awaits your return at <span className="text-emerald-400 font-bold">100% Full Health</span>.
            </p>

            <div className="mt-6 w-full flex flex-col gap-2.5">
              <button
                id="btn-boss-retry"
                onClick={handleRetryBossFight}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 border border-red-400/40 transition-all cursor-pointer transform active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Fight (Full Health)</span>
              </button>

              <button
                id="btn-boss-level-select"
                onClick={() => {
                  setIsBossGameOver(false);
                  setIsLevelSelectOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4 text-indigo-400" />
                <span>Choose Level / Checkpoint</span>
              </button>
            </div>

            <p className="mt-4 text-[11px] font-mono text-slate-400">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">SPACE</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">ENTER</kbd> to retry
            </p>
          </div>
        </div>
      )}
=======
>>>>>>> e8c0cb20009c65fd4cf5f49b27f746153ccc0b72
    </div>
  );
};

export default App;
