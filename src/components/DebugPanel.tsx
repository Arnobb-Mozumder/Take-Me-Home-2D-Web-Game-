import React, { useState } from 'react';
import { GameDebugInfo } from '../game/types';
import { Bug, Eye, EyeOff, Image as ImageIcon, ChevronDown, ChevronUp, Footprints, Shield, Flag, Hammer } from 'lucide-react';

interface DebugPanelProps {
  debugInfo: GameDebugInfo | null;
  showDebugBoxes: boolean;
  onToggleDebugBoxes: () => void;
  onOpenSpriteInspector: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  debugInfo,
  showDebugBoxes,
  onToggleDebugBoxes,
  onOpenSpriteInspector,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!debugInfo) return null;

  const { player, football, environment } = debugInfo;

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
    <div id="debug-panel" className="fixed top-4 left-4 z-30 font-mono text-xs shadow-2xl rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/60 text-slate-200 overflow-hidden min-w-[285px] max-w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700/60 select-none">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Bug className="w-3.5 h-3.5 text-amber-400" />
          <span>DEBUG METRICS</span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* PLAYER SECTION */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-sky-400 border-b border-slate-800 pb-1">
              <span>PLAYER</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPlayerBadge(player.state)}`}>
                {player.state}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
              <div><span className="text-slate-500">Pos: </span><span className="text-slate-200">{player.x}, {player.y}</span></div>
              <div><span className="text-slate-500">Vel: </span><span className="text-slate-200">{player.vx}, {player.vy}</span></div>
              <div><span className="text-slate-500">HP: </span><span className="text-red-400 font-bold">{player.health}/{player.maxHealth}</span></div>
              <div><span className="text-slate-500">Invincible: </span><span className={player.isInvincible ? 'text-amber-400 font-bold' : 'text-slate-400'}>{player.isInvincible ? 'YES' : 'NO'}</span></div>
              <div><span className="text-slate-500">Frame: </span><span className="text-amber-300 font-bold">{player.currentFrame}/{player.totalFrames}</span></div>
              <div><span className="text-slate-500">Grounded: </span><span className={player.isGrounded ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{player.isGrounded ? 'YES' : 'NO'}</span></div>
            </div>
          </div>

          {/* FOOTBALL SECTION */}
          <div className="space-y-1.5 border-t border-slate-800 pt-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 border-b border-slate-800 pb-1">
              <span className="flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-amber-400" />
                FOOTBALL
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getFootballBadge(football.state)}`}>
                {football.state}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
              <div><span className="text-slate-500">Pos: </span><span className="text-slate-200">{football.x}, {football.y}</span></div>
              <div><span className="text-slate-500">Vel: </span><span className="text-slate-200">{football.vx}, {football.vy}</span></div>
              <div><span className="text-slate-500">Grounded: </span><span className={football.isGrounded ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{football.isGrounded ? 'YES' : 'NO'}</span></div>
              <div><span className="text-slate-500">Distance: </span><span className="text-amber-300 font-bold">{football.distanceFromPlayer} px</span></div>
              <div><span className="text-slate-500">Aim: </span><span className="text-amber-200 font-semibold">{football.kickDirection}</span></div>
              <div><span className="text-slate-500">Kick Power: </span><span className="text-emerald-300 font-bold">{football.kickPowerPercent}%</span></div>
              <div><span className="text-slate-500">Launch Speed: </span><span className="text-amber-300 font-bold">{football.estimatedKickSpeed} px/s</span></div>
              <div><span className="text-slate-500">Can Kick: </span><span className={football.canKick ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{football.canKick ? 'READY' : 'OUT RANGE'}</span></div>
            </div>
          </div>

          {/* ENVIRONMENT & HAZARDS SECTION */}
          {environment && (
            <div className="space-y-1.5 border-t border-slate-800 pt-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 border-b border-slate-800 pb-1">
                <span className="flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-emerald-400" />
                  WORLD & HAZARDS
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
                <div><span className="text-slate-500">Checkpoint: </span><span className="text-sky-300 font-bold">{environment.activeCheckpoint}</span></div>
                <div><span className="text-slate-500">Terrain: </span><span className="text-slate-200">{environment.currentTerrain}</span></div>
                <div><span className="text-slate-500">Water: </span><span className={environment.waterCollision ? 'text-cyan-400 font-bold' : 'text-slate-500'}>{environment.waterCollision ? 'TOUCHING' : 'CLEAR'}</span></div>
                <div><span className="text-slate-500">Thorns: </span><span className={environment.thornCollision ? 'text-red-400 font-bold' : 'text-slate-500'}>{environment.thornCollision ? 'TOUCHING' : 'CLEAR'}</span></div>
                <div><span className="text-slate-500">Cliff: </span><span className={environment.cliffStatus !== 'SAFE' ? 'text-amber-400 font-bold' : 'text-slate-500'}>{environment.cliffStatus}</span></div>
                <div><span className="text-slate-500">Wall Dist: </span><span className="text-slate-300">{environment.nearbyWallDistance} px</span></div>
                <div><span className="text-slate-500">Impact V: </span><span className="text-amber-300 font-bold">{environment.wallImpactStrength} px/s</span></div>
                <div><span className="text-slate-500">Break V: </span><span className="text-emerald-400 font-bold">≥ {environment.requiredWallBreakStrength} px/s</span></div>
              </div>
            </div>
          )}

          {/* FPS & Physics Specs */}
          <div className="space-y-1 border-t border-slate-800 pt-2 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Engine Resolution:</span>
              <span className="text-amber-300 font-bold">1365 × 768 px</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Player Physics Size:</span>
              <span className="text-sky-300 font-bold">48 × 96 px</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Gravity / Jump:</span>
              <span className="text-purple-300 font-bold">1500 px/s² | -500 px/s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Kick Range / Loft:</span>
              <span className="text-amber-300 font-bold">High Vertical Loft (550–850 px/s)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Teleport Mode:</span>
              <span className="text-fuchsia-300 font-bold">Q Key (To Football Only) ⚡</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500">Engine Frame Rate:</span>
              <span className="text-emerald-400 font-semibold">{player.fps} FPS</span>
            </div>
          </div>

          {/* Toggle Controls */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
            <button
              onClick={onToggleDebugBoxes}
              className="w-full py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center justify-center gap-2 transition-all"
            >
              {showDebugBoxes ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hide Collision Boxes</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Show Collision Boxes</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenSpriteInspector}
              className="w-full py-1.5 px-2.5 rounded bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 flex items-center justify-center gap-2 transition-all"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sprite Sheet Manager</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
