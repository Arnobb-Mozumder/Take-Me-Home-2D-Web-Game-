import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../game/Game';
import { GameDebugInfo } from '../game/types';
import { DebugPanel } from './DebugPanel';
import { ControlsGuide } from './ControlsGuide';
import { SpriteUploaderModal } from './SpriteUploaderModal';

export const GameCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [debugInfo, setDebugInfo] = useState<GameDebugInfo | null>(null);
  const [showDebugBoxes, setShowDebugBoxes] = useState(false);
  const [isSpriteModalOpen, setIsSpriteModalOpen] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Initialize Game
    const game = new Game(canvasRef.current);
    gameRef.current = game;

    // Set debug info callback
    game.setDebugCallback(info => {
      setDebugInfo(info);
    });

    // Handle Resize
    const updateSize = () => {
      if (!containerRef.current || !canvasRef.current || !gameRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      gameRef.current.resize(clientWidth, clientHeight);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(containerRef.current);
    updateSize();

    // Start Game Loop
    game.start();

    return () => {
      resizeObserver.disconnect();
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !gameRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 1365 / rect.width;
    const scaleY = 768 / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-slate-950 flex items-center justify-center overflow-hidden select-none focus:outline-none"
      tabIndex={0}
      autoFocus
    >
      {/* Main Canvas with fixed 1365x768 aspect ratio container */}
      <canvas
        ref={canvasRef}
        width={1365}
        height={768}
        className="block max-w-full max-h-full cursor-default touch-none object-contain shadow-2xl rounded-sm"
      />

      {/* Debug Panel in Top Corner */}
      <DebugPanel
        debugInfo={debugInfo}
        showDebugBoxes={showDebugBoxes}
        onToggleDebugBoxes={handleToggleDebugBoxes}
        onOpenSpriteInspector={() => setIsSpriteModalOpen(true)}
      />

      {/* Controls Guide & Touch Buttons */}
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
      />

      {/* Custom Sprite Inspector & Uploader Modal */}
      <SpriteUploaderModal
        isOpen={isSpriteModalOpen}
        onClose={() => setIsSpriteModalOpen(false)}
        player={gameRef.current?.player || null}
      />
    </div>
  );
};

