import React, { useState } from 'react';
import { GameDebugInfo } from '../game/types';
import { Bug, Eye, EyeOff, Image as ImageIcon, ChevronDown, ChevronUp, Footprints, Shield, Flag, Hammer, Save, RotateCcw, Database } from 'lucide-react';

interface DebugPanelProps {
  debugInfo: GameDebugInfo | null;
  showDebugBoxes: boolean;
  onToggleDebugBoxes: () => void;
  onOpenSpriteInspector: () => void;
  onSaveGame?: () => void;
  onResetProgress?: () => void;
  onSwitchChapter?: (chapter: number) => void;
  onWarpToTunnel?: () => void;
  onOpenStartMenu?: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  debugInfo,
  showDebugBoxes,
  onToggleDebugBoxes,
  onOpenSpriteInspector,
  onSaveGame,
  onResetProgress,
  onSwitchChapter,
  onWarpToTunnel,
  onOpenStartMenu,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!debugInfo) return null;

  const { player, football, environment, lastSavedTime, hasSavedGame } = debugInfo;

  const getPlayerBadge = (state: string) => {
    switch (state) {
      case 'KICK':
        return 'bg-amber-500/25 text-amber-300 border-amber-500/50';
      case 'CLIMB':
        return 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50 font-extrabold animate-pulse';
      case 'RUN':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'JUMP':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'IDLE':
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }
  };

  const getFootballBadge = (state: string) => {
    switch (state) {
      case 'AIRBORNE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ROLLING':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'RESTING':
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  return (
    <div id="debug-panel" className="fixed top-3 left-3 z-30 font-mono text-[11px] shadow-xl rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/60 text-slate-200 overflow-hidden w-auto max-w-[250px] transition-all">
      {/* Slim Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 cursor-pointer select-none gap-2 text-slate-300"
      >
        <div className="flex items-center gap-1.5 font-semibold text-[11px]">
          <Bug className="w-3.5 h-3.5 text-amber-400" />
          <span className="truncate">STATS ({Math.round(player.fps)} FPS)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${getPlayerBadge(player.state)}`}>
            {player.state}
          </span>
          <button className="text-slate-400 hover:text-white p-0.5 rounded transition-colors">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-2.5 space-y-2 max-h-[70vh] overflow-y-auto">
          {/* PLAYER SECTION */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-sky-400 border-b border-slate-800 pb-0.5">
              <span>PLAYER</span>
              <span className="text-red-400 font-bold">HP {player.health}/{player.maxHealth}</span>
            </div>

            <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[10px]">
              <div><span className="text-slate-500">Pos: </span><span className="text-slate-200">{Math.round(player.x)}, {Math.round(player.y)}</span></div>
              <div><span className="text-slate-500">Vel: </span><span className="text-slate-200">{Math.round(player.vx)}, {Math.round(player.vy)}</span></div>
              <div><span className="text-slate-500">Ground: </span><span className={player.isGrounded ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{player.isGrounded ? 'YES' : 'NO'}</span></div>
              <div><span className="text-slate-500">Frame: </span><span className="text-amber-300 font-bold">{player.currentFrame}/{player.totalFrames}</span></div>
            </div>
          </div>

          {/* FOOTBALL SECTION */}
          <div className="space-y-1 border-t border-slate-800 pt-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 border-b border-slate-800 pb-0.5">
              <span className="flex items-center gap-1">
                <Footprints className="w-3 h-3 text-amber-400" />
                BALL
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getFootballBadge(football.state)}`}>
                {football.state}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[10px]">
              <div><span className="text-slate-500">Dist: </span><span className="text-amber-300 font-bold">{football.distanceFromPlayer} px</span></div>
              <div><span className="text-slate-500">Power: </span><span className="text-emerald-300 font-bold">{football.kickPowerPercent}%</span></div>
              <div><span className="text-slate-500">Speed: </span><span className="text-amber-300 font-bold">{football.estimatedKickSpeed} px/s</span></div>
              <div><span className="text-slate-500">Kick: </span><span className={football.canKick ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{football.canKick ? 'READY' : 'AWAY'}</span></div>
            </div>
          </div>

          {/* ENVIRONMENT & CHAPTER SECTION */}
          {environment && (
            <div className="space-y-1 border-t border-slate-800 pt-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 border-b border-slate-800 pb-0.5">
                <span className="flex items-center gap-1">
                  <Flag className="w-3 h-3 text-emerald-400" />
                  {environment.currentLevel === 2 ? '🌴 CHAPTER 2' : '⚽ CHAPTER 1'}
                </span>
                <span className="text-sky-300 font-bold truncate max-w-[110px] text-[9px]">{environment.activeCheckpoint}</span>
              </div>

              <div className="text-[9.5px] text-amber-300 font-medium truncate">
                {environment.chapterTitle || 'Chapter 1: The Suburbia Run'}
              </div>

              <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[10px]">
                <div><span className="text-slate-500">Water: </span><span className={environment.waterCollision ? 'text-cyan-400 font-bold' : 'text-slate-500'}>{environment.waterCollision ? 'HIT' : 'CLEAR'}</span></div>
                <div><span className="text-slate-500">Thorns: </span><span className={environment.thornCollision ? 'text-red-400 font-bold' : 'text-slate-500'}>{environment.thornCollision ? 'HIT' : 'CLEAR'}</span></div>
              </div>
              <div className="text-[9.5px] text-slate-400 flex items-center justify-between pt-0.5">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Database className="w-2.5 h-2.5" />
                  Auto-Save:
                </span>
                <span className="text-slate-300">
                  {lastSavedTime ? 'Active (Saved)' : 'Ready'}
                </span>
              </div>
            </div>
          )}

          {/* DOG ENEMIES SECTION (When in Level 2 or dogs present) */}
          {debugInfo.dogs && debugInfo.dogs.length > 0 && (
            <div className="space-y-1 border-t border-slate-800 pt-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-red-400 border-b border-slate-800 pb-0.5">
                <span>🐕 DOG ENEMIES ({debugInfo.dogs.length})</span>
                <span className="text-slate-400 text-[9px]">
                  {debugInfo.dogs.filter(d => d.state !== 'DEAD').length} Alive
                </span>
              </div>
              <div className="space-y-0.5">
                {debugInfo.dogs.map((dog, idx) => (
                  <div key={dog.id} className="flex items-center justify-between text-[9.5px] bg-slate-950/40 px-1 py-0.5 rounded">
                    <span className="text-slate-300">#{idx + 1} {dog.id.replace('jungle-dog-', 'Dog ')}</span>
                    <span className={`font-bold px-1 rounded text-[8.5px] ${
                      dog.state === 'SLEEPING' ? 'bg-indigo-950 text-indigo-300' :
                      dog.state === 'CHASING' || dog.state === 'ATTACKING' ? 'bg-red-950 text-red-300 animate-pulse' :
                      dog.state === 'DEAD' ? 'bg-slate-800 text-slate-500 line-through' :
                      'bg-amber-950 text-amber-300'
                    }`}>
                      {dog.state} ({dog.health}HP)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Controls & Actions */}
          <div className="pt-1.5 border-t border-slate-800 flex flex-col gap-1">
            {/* Quick Level Warp Buttons */}
            {onSwitchChapter && (
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => onSwitchChapter(1)}
                  className={`py-1 px-1 rounded flex items-center justify-center text-[9.5px] font-bold border transition-all ${
                    environment?.currentLevel === 1
                      ? 'bg-sky-950/80 border-sky-500 text-sky-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ⚽ Ch 1: Town
                </button>
                <button
                  onClick={() => onSwitchChapter(2)}
                  className={`py-1 px-1 rounded flex items-center justify-center text-[9.5px] font-bold border transition-all ${
                    environment?.currentLevel === 2
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🌴 Ch 2: Jungle
                </button>
              </div>
            )}

            {onWarpToTunnel && environment?.currentLevel === 1 && (
              <button
                onClick={onWarpToTunnel}
                className="w-full py-1 px-2 rounded bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 border border-amber-700/60 flex items-center justify-center gap-1 text-[10px] transition-all font-bold"
                title="Teleport directly in front of the Mountain Tunnel entrance in Zone 9"
              >
                <span>🏔️ Warp to Tunnel (Zone 9)</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={onSaveGame}
                className="py-1 px-1.5 rounded bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-700/60 flex items-center justify-center gap-1 text-[10px] transition-all font-bold"
                title="Save whole game progress to local storage"
              >
                <Save className="w-3 h-3 text-emerald-400" />
                <span>Save Now</span>
              </button>

              <button
                onClick={onResetProgress}
                className="py-1 px-1.5 rounded bg-slate-800 hover:bg-red-950/70 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-700/60 flex items-center justify-center gap-1 text-[10px] transition-all"
                title="Reset game progress back to Checkpoint 1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Run</span>
              </button>
            </div>

            {onOpenStartMenu && (
              <button
                onClick={onOpenStartMenu}
                className="w-full py-1 px-2 rounded bg-sky-950/70 hover:bg-sky-900/90 text-sky-300 border border-sky-700/60 flex items-center justify-center gap-1.5 text-[10px] transition-all font-bold"
                title="Return to Main Start Menu"
              >
                <span>🏠 Return to Start Menu</span>
              </button>
            )}

            <button
              onClick={onToggleDebugBoxes}
              className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center justify-center gap-1.5 text-[10px] transition-all"
            >
              {showDebugBoxes ? (
                <>
                  <EyeOff className="w-3 h-3 text-amber-400" />
                  <span>Hide Hitboxes</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 text-emerald-400" />
                  <span>Show Hitboxes</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenSpriteInspector}
              className="w-full py-1 px-2 rounded bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 flex items-center justify-center gap-1.5 text-[10px] transition-all"
            >
              <ImageIcon className="w-3 h-3 text-indigo-400" />
              <span>Sprite Sheets & Storage</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
