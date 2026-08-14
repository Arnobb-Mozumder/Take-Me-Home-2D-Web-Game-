import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Footprints, RotateCcw } from 'lucide-react';

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
  onVirtualRecall?: () => void;
  onOpenStartMenu?: () => void;
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
  onVirtualRecall,
  onOpenStartMenu,
}) => {
  return (
    <div id="controls-guide" className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-auto select-none">
      {/* Desktop Keyboard Controls Overlay Badge - Ultra-compact & narrow */}
      <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/70 text-[10.5px] font-mono text-slate-300 shadow-xl flex items-center justify-center gap-x-2.5 gap-y-1 select-none">
        <div className="flex items-center gap-1">
          <span className="px-1 py-0.2 bg-slate-800 border border-slate-600 rounded text-amber-300 font-bold text-[10px]">A/D</span>
          <span className="text-slate-400 text-[10px]">Move</span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center gap-1">
          <span className="px-1 py-0.2 bg-purple-500/20 border border-purple-500/50 rounded text-purple-300 font-bold text-[10px]">SHIFT</span>
          <span className="text-purple-200 font-semibold text-[10px]">Jump</span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center gap-1">
          <span className="px-1 py-0.2 bg-amber-500/20 border border-amber-500/50 rounded text-amber-300 font-bold text-[10px]">SPACE/E</span>
          <span className="text-amber-200 font-semibold text-[10px]">Kick</span>
        </div>

        <div className="h-3 w-px bg-slate-700 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-1">
          <span className="px-1 py-0.2 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-300 font-bold text-[10px]">R</span>
          <span className="text-cyan-200 font-semibold text-[10px]">Aim</span>
        </div>

        <div className="h-3 w-px bg-slate-700 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-1">
          <span className="px-1 py-0.2 bg-fuchsia-500/20 border border-fuchsia-500/50 rounded text-fuchsia-300 font-bold text-[10px]">Q</span>
          <span className="text-fuchsia-200 font-semibold text-[10px]">Teleport</span>
        </div>

        <div className="h-3 w-px bg-slate-700 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-1">
          <span className="px-1 py-0.2 bg-emerald-500/20 border border-emerald-500/50 rounded text-emerald-300 font-bold text-[10px]">C</span>
          <span className="text-emerald-200 font-semibold text-[10px]">Recall</span>
        </div>
      </div>

      {/* On-Screen Touch / Mouse Compact Action Bar */}
      <div className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <button
            onMouseDown={onVirtualLeftStart}
            onMouseUp={onVirtualLeftEnd}
            onTouchStart={onVirtualLeftStart}
            onTouchEnd={onVirtualLeftEnd}
            className="w-8 h-8 rounded-lg bg-slate-800/90 active:bg-amber-600/80 border border-slate-600/90 text-white flex items-center justify-center shadow-md active:scale-95 touch-none select-none"
            aria-label="Move Left"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onMouseDown={onVirtualRightStart}
            onMouseUp={onVirtualRightEnd}
            onTouchStart={onVirtualRightStart}
            onTouchEnd={onVirtualRightEnd}
            className="w-8 h-8 rounded-lg bg-slate-800/90 active:bg-amber-600/80 border border-slate-600/90 text-white flex items-center justify-center shadow-md active:scale-95 touch-none select-none"
            aria-label="Move Right"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onMouseDown={onVirtualJumpStart}
          onMouseUp={onVirtualJumpEnd}
          onTouchStart={onVirtualJumpStart}
          onTouchEnd={onVirtualJumpEnd}
          className="h-8 px-2.5 rounded-lg bg-purple-600/90 active:bg-purple-500 border border-purple-400/60 text-white font-bold flex items-center justify-center gap-1 shadow-md active:scale-95 touch-none select-none text-[11px]"
          aria-label="Jump"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>JUMP</span>
        </button>

        <button
          onMouseDown={onVirtualKickStart}
          onMouseUp={onVirtualKickEnd}
          onTouchStart={onVirtualKickStart}
          onTouchEnd={onVirtualKickEnd}
          className="h-8 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 active:from-amber-400 active:to-amber-500 border border-amber-300/70 text-slate-950 font-black flex items-center justify-center gap-1 shadow-md active:scale-95 touch-none select-none text-[11px] tracking-wide"
          aria-label="Kick"
        >
          <Footprints className="w-3.5 h-3.5 text-slate-950" />
          <span>KICK</span>
        </button>

        <button
          onClick={onVirtualTeleport}
          className="h-8 px-2.5 rounded-lg bg-fuchsia-600/90 active:bg-fuchsia-500 border border-fuchsia-400/70 text-white font-bold flex items-center justify-center gap-1 shadow-md active:scale-95 touch-none select-none text-[11px]"
          aria-label="Teleport"
        >
          <span>TELEPORT</span>
        </button>

        <button
          onClick={onVirtualRecall}
          className="h-8 px-2 rounded-lg bg-emerald-700/90 active:bg-emerald-600 border border-emerald-400/70 text-white font-bold flex items-center justify-center gap-1 shadow-md active:scale-95 touch-none select-none text-[11px]"
          aria-label="Recall Ball"
          title="Recall Ball to Player [C]"
        >
          <RotateCcw className="w-3 h-3 text-emerald-300" />
          <span>RECALL</span>
        </button>

        {onOpenStartMenu && (
          <button
            onClick={onOpenStartMenu}
            className="h-8 px-2.5 rounded-lg bg-slate-800/95 active:bg-slate-700 border border-slate-600 text-amber-300 font-bold flex items-center justify-center gap-1 shadow-md active:scale-95 touch-none select-none text-[11px]"
            aria-label="Open Start Menu"
            title="Open Main Menu (Esc)"
          >
            <span>🏠 MENU</span>
          </button>
        )}
      </div>
    </div>
  );
};

