import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../game/Game';
import { GameDebugInfo } from '../game/types';
import { DebugPanel } from './DebugPanel';
import { ControlsGuide } from './ControlsGuide';
import { SpriteUploaderModal } from './SpriteUploaderModal';
import { StartMenu } from './StartMenu';

export const GameCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [debugInfo, setDebugInfo] = useState<GameDebugInfo | null>(null);
  const [showDebugBoxes, setShowDebugBoxes] = useState(false);
  const [isSpriteModalOpen, setIsSpriteModalOpen] = useState(false);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(true);
  const [hasActiveGame, setHasActiveGame] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Initialize Game with matched container resolution
    const { clientWidth, clientHeight } = containerRef.current;
    const game = new Game(canvasRef.current, clientWidth || window.innerWidth, clientHeight || window.innerHeight);
    gameRef.current = game;

    // Set debug info callback
    game.setDebugCallback(info => {
      setDebugInfo(info);
    });

    // Handle Resize
    const updateSize = () => {
      if (!containerRef.current || !canvasRef.current || !gameRef.current) return;
      const { clientWidth: w, clientHeight: h } = containerRef.current;
      if (w > 0 && h > 0) {
        gameRef.current.resize(w, h);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(containerRef.current);
    updateSize();

    // Start Game Loop
    game.start();

    // Global Key Listener for Escape (toggle Start Menu)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsStartMenuOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isStartMenuOpen) return;
    if (!canvasRef.current || !gameRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldX = gameRef.current.camera.x + canvasX;
    const worldY = gameRef.current.camera.y + canvasY;

    gameRef.current.handleCanvasClick(worldX, worldY);
  };

  const handleToggleDebugBoxes = () => {
    if (gameRef.current) {
      gameRef.current.showDebugBoxes = !showDebugBoxes;
      setShowDebugBoxes(!showDebugBoxes);
    }
  };

  const handleNewGame = () => {
    if (gameRef.current) {
      gameRef.current.startNewGame();
    }
    setIsStartMenuOpen(false);
    setHasActiveGame(true);
  };

  const handleLoadGame = () => {
    if (gameRef.current) {
      gameRef.current.loadSavedGame();
    }
    setIsStartMenuOpen(false);
    setHasActiveGame(true);
  };

  const handleResumeGame = () => {
    setIsStartMenuOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen bg-slate-950 flex items-center justify-center overflow-hidden select-none focus:outline-none"
      tabIndex={0}
      autoFocus
    >
      {/* Dynamic full-screen canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-default touch-none"
        onClick={handleCanvasClick}
      />

      {/* Interactive Start Menu Overlay using start_menue.png */}
      <StartMenu
        isOpen={isStartMenuOpen}
        onNewGame={handleNewGame}
        onLoadGame={handleLoadGame}
        onResumeGame={handleResumeGame}
        hasActiveGame={hasActiveGame}
      />

      {/* Narrow Minimal Debug Panel in Top-Left Corner */}
      {!isStartMenuOpen && (
        <DebugPanel
          debugInfo={debugInfo}
          showDebugBoxes={showDebugBoxes}
          onToggleDebugBoxes={handleToggleDebugBoxes}
          onOpenSpriteInspector={() => setIsSpriteModalOpen(true)}
          onSaveGame={() => gameRef.current?.saveGameProgress(true, 'Manual Save Complete!')}
          onResetProgress={() => gameRef.current?.resetGameProgress()}
          onSwitchChapter={(chapter) => gameRef.current?.switchLevel(chapter)}
          onWarpToTunnel={() => {
            if (gameRef.current) {
              gameRef.current.player.reset(7880, 360);
              gameRef.current.football.reset(7920, 396);
              gameRef.current.camera.x = 7400;
            }
          }}
          onWarpToJungleEnd={() => {
            if (gameRef.current) {
              if (gameRef.current.environment.currentLevel !== 2) {
                gameRef.current.switchLevel(2);
              }
              gameRef.current.player.reset(7840, 14);
              gameRef.current.football.reset(7880, 78);
              gameRef.current.camera.x = 7400;
            }
          }}
          onOpenStartMenu={() => setIsStartMenuOpen(true)}
        />
      )}

      {/* Slim & Narrow Controls Guide & Bottom Toolbar */}
      {!isStartMenuOpen && (
        <ControlsGuide
          onVirtualLeftStart={() => gameRef.current?.input.setVirtualLeft(true)}
          onVirtualLeftEnd={() => gameRef.current?.input.setVirtualLeft(false)}
          onVirtualRightStart={() => gameRef.current?.input.setVirtualRight(true)}
          onVirtualRightEnd={() => gameRef.current?.input.setVirtualRight(false)}
          onVirtualJumpStart={() => gameRef.current?.input.setVirtualJumpState(true)}
          onVirtualJumpEnd={() => gameRef.current?.input.setVirtualJumpState(false)}
          onVirtualKickStart={() => gameRef.current?.input.setVirtualKickState(true)}
          onVirtualKickEnd={() => gameRef.current?.input.setVirtualKickState(false)}
          onVirtualTeleport={() => gameRef.current?.input.triggerVirtualTeleport()}
          onVirtualRecall={() => gameRef.current?.input.triggerVirtualRecall()}
          onVirtualElevator={() => gameRef.current?.input.triggerVirtualElevator()}
          onOpenStartMenu={() => setIsStartMenuOpen(true)}
        />
      )}

      {/* Custom Sprite Inspector & Uploader Modal */}
      <SpriteUploaderModal
        isOpen={isSpriteModalOpen}
        onClose={() => setIsSpriteModalOpen(false)}
        player={gameRef.current?.player || null}
      />
    </div>
  );
};

