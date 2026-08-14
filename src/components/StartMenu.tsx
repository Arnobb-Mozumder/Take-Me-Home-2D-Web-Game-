import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Settings, LogOut, Volume2, VolumeX, Shield, Sparkles, Check, X } from 'lucide-react';
import { SaveManager } from '../game/SaveManager';

interface StartMenuProps {
  isOpen: boolean;
  onNewGame: () => void;
  onLoadGame: () => void;
  onResumeGame?: () => void;
  hasActiveGame?: boolean;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  isOpen,
  onNewGame,
  onLoadGame,
  onResumeGame,
  hasActiveGame = false,
}) => {
  const [hasSave, setHasSave] = useState(false);
  const [savedCheckpointName, setSavedCheckpointName] = useState<string>('');
  const [savedLevel, setSavedLevel] = useState<number>(1);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);

  // Settings State
  const [musicVolume, setMusicVolume] = useState(80);
  const [sfxVolume, setSfxVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = SaveManager.loadGameState();
      if (saved && saved.checkpointName) {
        setHasSave(true);
        setSavedCheckpointName(saved.checkpointName);
        setSavedLevel(saved.level || 1);
      } else {
        setHasSave(false);
      }
    }
  }, [isOpen]);

  const playClickSound = () => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime((sfxVolume / 100) * 0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  const handleNewGame = () => {
    playClickSound();
    onNewGame();
  };

  const handleLoadGame = () => {
    playClickSound();
    onLoadGame();
  };

  const handleOptions = () => {
    playClickSound();
    setShowOptionsModal(true);
  };

  const handleQuit = () => {
    playClickSound();
    setShowQuitModal(true);
  };

  if (!isOpen) return null;

  return (
    <div
      id="start-menu-container"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md select-none overflow-hidden"
    >
      {/* 1. Main Menu Aspect Container (matches 1536 x 1024 native image ratio) */}
      <div className="relative w-full max-w-[1280px] max-h-[853px] aspect-[1536/1024] bg-slate-900 shadow-2xl rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
        {/* Background Menu Image */}
        <img
          src="/start_menue.png"
          alt="Football Game Start Menu"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* Subtle Ambient Scanline Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-500/5 to-black/30 pointer-events-none" />

        {/* Top Bar Indicators */}
        <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-300 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold tracking-wide">PRECISION FOOTBALL PLATFORMER</span>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveGame && onResumeGame && (
              <button
                id="btn-resume-game"
                onClick={onResumeGame}
                className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/50 transition-all border border-emerald-400/40 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Game</span>
              </button>
            )}

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* 2. Interactive Button Hotspots placed precisely over start_menue.png options */}
        {/* Button 1: NEW GAME */}
        <div
          id="btn-hotspot-new-game"
          style={{
            position: 'absolute',
            left: '58.6%',
            top: '44.5%',
            width: '26.4%',
            height: '9.8%',
          }}
          className="cursor-pointer group flex items-center justify-center rounded-2xl"
          onMouseEnter={() => setHoveredButton('new_game')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={handleNewGame}
        >
          {/* Subtle Glow on Hover */}
          <div className="absolute inset-0 rounded-xl bg-lime-400/20 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-150 border-2 border-lime-400 shadow-[0_0_25px_rgba(163,230,53,0.6)]" />
          <span className="sr-only">New Game</span>
        </div>

        {/* Button 2: LOAD GAME */}
        <div
          id="btn-hotspot-load-game"
          style={{
            position: 'absolute',
            left: '58.6%',
            top: '55.7%',
            width: '26.4%',
            height: '9.8%',
          }}
          className="cursor-pointer group flex items-center justify-center rounded-2xl"
          onMouseEnter={() => setHoveredButton('load_game')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={handleLoadGame}
        >
          {/* Subtle Glow on Hover */}
          <div className="absolute inset-0 rounded-xl bg-sky-400/20 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-150 border-2 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.6)]" />
          <span className="sr-only">Load Game</span>

          {/* Saved Game Status Badge */}
          {hasSave && (
            <div className="absolute -top-3 right-2 bg-emerald-950/90 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500 shadow-md flex items-center gap-1">
              <Check className="w-2.5 h-2.5" />
              <span>Ch {savedLevel}: {savedCheckpointName}</span>
            </div>
          )}
        </div>

        {/* Button 3: OPTION */}
        <div
          id="btn-hotspot-option"
          style={{
            position: 'absolute',
            left: '58.6%',
            top: '66.6%',
            width: '26.4%',
            height: '9.8%',
          }}
          className="cursor-pointer group flex items-center justify-center rounded-2xl"
          onMouseEnter={() => setHoveredButton('option')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={handleOptions}
        >
          {/* Subtle Glow on Hover */}
          <div className="absolute inset-0 rounded-xl bg-amber-400/20 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-150 border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)]" />
          <span className="sr-only">Option</span>
        </div>

        {/* Button 4: QUIT */}
        <div
          id="btn-hotspot-quit"
          style={{
            position: 'absolute',
            left: '58.6%',
            top: '77.3%',
            width: '26.4%',
            height: '9.8%',
          }}
          className="cursor-pointer group flex items-center justify-center rounded-2xl"
          onMouseEnter={() => setHoveredButton('quit')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={handleQuit}
        >
          {/* Subtle Glow on Hover */}
          <div className="absolute inset-0 rounded-xl bg-rose-500/20 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-150 border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.6)]" />
          <span className="sr-only">Quit</span>
        </div>

        {/* Bottom Helper Info */}
        <div className="absolute bottom-3 left-6 text-[11px] text-slate-400/80 flex items-center gap-4 pointer-events-none">
          <span>Click any option or press key to interact</span>
          {hoveredButton && (
            <span className="text-amber-300 font-bold uppercase tracking-wider">
              ✦ Selected: {hoveredButton.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* 3. Options / Settings Modal */}
      <AnimatePresence>
        {showOptionsModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold">Game Options & Settings</h3>
                </div>
                <button
                  onClick={() => setShowOptionsModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Volume Sliders */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                    <span>Sound Effects Volume</span>
                    <span className="text-amber-400">{sfxVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sfxVolume}
                    onChange={(e) => setSfxVolume(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                    <span>Music Volume</span>
                    <span className="text-amber-400">{musicVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Key Controls Quick Reference */}
                <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-3.5 space-y-2">
                  <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>CONTROLS OVERVIEW</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div><span className="font-mono text-amber-300">A / D</span>: Move Left/Right</div>
                    <div><span className="font-mono text-amber-300">W / Space</span>: Jump</div>
                    <div><span className="font-mono text-amber-300">K / Click</span>: Kick / Aim Ball</div>
                    <div><span className="font-mono text-amber-300">T / L</span>: Teleport to Ball</div>
                    <div><span className="font-mono text-amber-300">R</span>: Recall Ball</div>
                    <div><span className="font-mono text-amber-300">S / Down</span>: Slide / Crouch</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowOptionsModal(false)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all cursor-pointer"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Quit Confirmation Modal */}
      <AnimatePresence>
        {showQuitModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center space-y-4 text-white">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold">Quit Game</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your progress is automatically saved to your last checkpoint. Are you sure you want to exit?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowQuitModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowQuitModal(false);
                    // Return to start menu clean state
                  }}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Exit to Menu
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
