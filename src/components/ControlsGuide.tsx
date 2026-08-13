import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Footprints } from 'lucide-react';

interface ControlsGuideProps {
  onVirtualLeftStart?: () => void;
  onVirtualLeftEnd?: () => void;
  onVirtualRightStart?: () => void;
  onVirtualRightEnd?: () => void;
  onVirtualJumpStart?: () => void;
  onVirtualJumpEnd?: () => void;
  onVirtualKickStart?: () => void;
  onVirtualKickEnd?: () => void;
  onVirtualTeleport?: () => void;
}

export const ControlsGuide: React.FC<ControlsGuideProps> = ({
  onVirtualLeftStart,
  onVirtualLeftEnd,
  onVirtualRightStart,
  onVirtualRightEnd,
  onVirtualJumpStart,
  onVirtualJumpEnd,
  onVirtualKickStart,
  onVirtualKickEnd,
  onVirtualTeleport,
}) => {
  return (
    <div id="controls-guide" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 max-w-[95vw]">
      {/* Desktop Keyboard Controls Overlay Badge */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/80 text-xs font-mono text-slate-300 shadow-2xl flex flex-wrap items-center justify-center gap-x-4 gap-y-2 select-none">
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 font-bold">A</span>
          <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 font-bold">D</span>
          <span className="text-slate-400">/</span>
          <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 font-bold">←</span>
          <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 font-bold">→</span>
          <span className="text-slate-400 ml-1">Move</span>
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/50 rounded text-purple-300 font-bold">L-SHIFT</span>
          <span className="text-purple-200 font-semibold ml-1">JUMP 🏃</span>
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded text-amber-300 font-bold">SPACE</span>
          <span className="text-slate-400">/</span>
          <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded text-amber-300 font-bold">E</span>
          <span className="text-amber-200 font-semibold ml-1">KICK ⚽</span>
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-300 font-bold">R</span>
          <span className="text-cyan-200 font-semibold ml-1">AIM MODE 🎯</span>
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-fuchsia-500/20 border border-fuchsia-500/50 rounded text-fuchsia-300 font-bold">Q</span>
          <span className="text-fuchsia-200 font-semibold ml-1">TELEPORT TO BALL ⚡</span>
        </div>
      </div>

      {/* On-Screen Touch / Mouse Controls */}
      <div className="flex items-center gap-3 sm:hidden md:flex opacity-90 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5">
          <button
            onMouseDown={onVirtualLeftStart}
            onMouseUp={onVirtualLeftEnd}
            onTouchStart={onVirtualLeftStart}
            onTouchEnd={onVirtualLeftEnd}
            className="w-11 h-11 rounded-xl bg-slate-800/90 active:bg-amber-600/80 border border-slate-600 text-white flex items-center justify-center shadow-lg active:scale-95 touch-none select-none"
            aria-label="Move Left"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onMouseDown={onVirtualRightStart}
            onMouseUp={onVirtualRightEnd}
            onTouchStart={onVirtualRightStart}
            onTouchEnd={onVirtualRightEnd}
            className="w-11 h-11 rounded-xl bg-slate-800/90 active:bg-amber-600/80 border border-slate-600 text-white flex items-center justify-center shadow-lg active:scale-95 touch-none select-none"
            aria-label="Move Right"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onMouseDown={onVirtualJumpStart}
          onMouseUp={onVirtualJumpEnd}
          onTouchStart={onVirtualJumpStart}
          onTouchEnd={onVirtualJumpEnd}
          className="h-11 px-4 rounded-xl bg-purple-600/90 active:bg-purple-500 border border-purple-400/60 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg active:scale-95 touch-none select-none text-xs"
          aria-label="Jump"
        >
          <ArrowUp className="w-4 h-4" />
          <span>JUMP</span>
        </button>

        <button
          onMouseDown={onVirtualKickStart}
          onMouseUp={onVirtualKickEnd}
          onTouchStart={onVirtualKickStart}
          onTouchEnd={onVirtualKickEnd}
          className="h-11 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 active:from-amber-400 active:to-amber-500 border border-amber-300/70 text-slate-950 font-black flex items-center justify-center gap-1.5 shadow-lg active:scale-95 touch-none select-none text-xs tracking-wide"
          aria-label="Kick"
        >
          <Footprints className="w-4 h-4 text-slate-950" />
          <span>KICK ⚽</span>
        </button>

        <button
          onClick={onVirtualTeleport}
          className="h-11 px-4 rounded-xl bg-fuchsia-600/90 active:bg-fuchsia-500 border border-fuchsia-400/70 text-white font-bold flex items-center justify-center gap-1 shadow-lg active:scale-95 touch-none select-none text-xs"
          aria-label="Teleport"
        >
          <span>TELEPORT ⚡</span>
        </button>
      </div>
    </div>
  );
};

