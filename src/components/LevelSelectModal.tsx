import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Map,
  Sparkles,
  Swords,
  Play,
  Flag,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  X,
  Compass,
  Trees,
  Home,
  Crown,
  ShieldAlert,
  Info
} from 'lucide-react';
import { SaveManager } from '../game/SaveManager';

export interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (levelNumber: number, checkpointId?: string, forceBossReplay?: boolean) => void;
  currentLevel?: number;
}

interface CheckpointInfo {
  id: string;
  name: string;
  desc: string;
  xPos: number;
}

interface ChapterData {
  levelNumber: number;
  title: string;
  subtitle: string;
  themeColor: string;
  borderColor: string;
  bgColor: string;
  icon: React.ReactNode;
  tags: string[];
  description: string;
  checkpoints: CheckpointInfo[];
  isBossChapter?: boolean;
}

const CHAPTERS: ChapterData[] = [
  {
    levelNumber: 1,
    title: 'Chapter 1: The Suburbia Run',
    subtitle: 'Tutorial & Precision Groundwork',
    themeColor: 'text-amber-400',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    bgColor: 'bg-amber-950/20',
    icon: <Home className="w-5 h-5 text-amber-400" />,
    tags: ['Wall Rebound', 'Guard Dogs', 'Crates & Bricks', 'Sunset Cliffs'],
    description: 'Master movement, football kicking physics, trick rebounds, slide crouches, and navigating sleeping dog guards.',
    checkpoints: [
      { id: 'cp-school-entry', name: 'School Entrance', desc: 'Starting road & tutorial kicks', xPos: 200 },
      { id: 'cp-residential', name: 'Suburban Gardens', desc: 'Rooftops, crates & guard dogs', xPos: 3000 },
      { id: 'cp-cliff-approach', name: 'Sunset Ridge Approach', desc: 'Water fountains & breakable walls', xPos: 4700 },
      { id: 'cp-sunset-ridge', name: 'Sunset Ridge Overlook', desc: 'Cliff heights & cave entrance', xPos: 6200 },
    ],
  },
  {
    levelNumber: 2,
    title: 'Chapter 2: The Jungle Rush',
    subtitle: 'Canopy Exploration & Ancient Catacombs',
    themeColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    bgColor: 'bg-emerald-950/20',
    icon: <Trees className="w-5 h-5 text-emerald-400" />,
    tags: ['Waterfalls', 'Vines', 'Elevator', 'Stone Gate Puzzle'],
    description: 'Vast multi-tier jungle canopy with waterfall chasms, moving platforms, working elevator shaft, and the stone gate.',
    checkpoints: [
      { id: 'jungle-cp-entrance', name: 'Jungle Canopy Entrance', desc: 'Lush tree platforms & ruins', xPos: 180 },
      { id: 'jungle-cp-waterfall', name: 'Ancient Waterfall Basin', desc: 'Deep water chasm & precision ball jumps', xPos: 2200 },
      { id: 'jungle-cp-canyon', name: 'Overgrown Canopy Canyon', desc: 'Midway canopy cliffs & guards', xPos: 4300 },
      { id: 'jungle-cp-ruins', name: 'Catacomb Ruins Outpost', desc: 'Ancient stone grounds & health potions', xPos: 6300 },
      { id: 'jungle-cp-elevator-top', name: 'Catacomb Elevator Top', desc: 'Elevator control shaft & stone gate', xPos: 7920 },
      { id: 'jungle-cp-ratkeeper-antechamber', name: 'Ratkeeper Antechamber', desc: 'Subterranean tunnel to boss lair', xPos: 8850 },
    ],
  },
  {
    levelNumber: 3,
    title: 'Chapter 3: Lair of the Ratkeeper',
    subtitle: 'Grand Boss Arena & Subterranean Combat',
    themeColor: 'text-rose-400',
    borderColor: 'border-rose-500/50 hover:border-rose-400',
    bgColor: 'bg-rose-950/20',
    icon: <Crown className="w-5 h-5 text-rose-400" />,
    tags: ['Boss Battle', 'Multi-Phase', 'Back-Attack Mechanics', 'Burrow Attack'],
    description: 'Confront the towering Ratkeeper boss with dynamic 3-phase AI, football interceptions, front catch zones, and shockwave slams.',
    isBossChapter: true,
    checkpoints: [
      { id: 'boss-cp-entrance', name: "Ratkeeper's Tomb", desc: 'Grand vaulted arena entrance', xPos: 240 },
    ],
  },
];

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectLevel,
  currentLevel = 1,
}) => {
  const [selectedChapterTab, setSelectedChapterTab] = useState<number>(currentLevel);
  const isBossDefeatedInSave = SaveManager.isBossDefeated();

  if (!isOpen) return null;

  const currentChapter = CHAPTERS.find(c => c.levelNumber === selectedChapterTab) || CHAPTERS[0];

  const handleWarp = (levelNumber: number, checkpointId?: string, forceBossReplay: boolean = false) => {
    onSelectLevel(levelNumber, checkpointId, forceBossReplay);
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        id="level-select-modal-backdrop"
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-inner">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white">LEVEL SELECT & TEST SUITE</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                    Dev / QA Mode
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Select any Chapter or Checkpoint to test level design, mechanics, and fight the boss anytime.
                </p>
              </div>
            </div>

            <button
              id="btn-close-level-select"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer"
              title="Close Level Select"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Test Mode Note Banner */}
          <div className="px-6 py-2.5 bg-indigo-950/40 border-b border-indigo-900/40 flex items-center justify-between text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>Boss Replay Feature:</strong> Entering Chapter 3 via this menu spawns the Ratkeeper boss for infinite replays. In normal story gameplay, defeated bosses remain destroyed.
              </span>
            </div>
            {isBossDefeatedInSave && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[11px] font-semibold border border-emerald-700/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Story Boss Defeated
              </span>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Chapter List / Selector Tabs */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-4 space-y-2.5 overflow-y-auto">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                Select Chapter
              </div>

              {CHAPTERS.map(ch => {
                const isSelected = ch.levelNumber === selectedChapterTab;
                return (
                  <button
                    key={ch.levelNumber}
                    onClick={() => setSelectedChapterTab(ch.levelNumber)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? `${ch.bgColor} ${ch.borderColor} shadow-lg shadow-black/40 ring-1 ring-white/10`
                        : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 shrink-0">
                      {ch.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black truncate ${isSelected ? ch.themeColor : 'text-white'}`}>
                          {ch.title.split(':')[0]}
                        </span>
                        {ch.isBossChapter && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold border border-rose-500/40">
                            BOSS
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-200 truncate">
                        {ch.title.split(':')[1] || ch.title}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {ch.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Detailed Chapter View & Checkpoint Launchers */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5">
              {/* Selected Chapter Banner */}
              <div className={`p-4 rounded-xl border ${currentChapter.bgColor} ${currentChapter.borderColor} space-y-3`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {currentChapter.subtitle}
                      </span>
                    </div>
                    <h3 className={`text-xl font-black ${currentChapter.themeColor}`}>
                      {currentChapter.title}
                    </h3>
                  </div>

                  {/* Primary Quick Start Button */}
                  {!currentChapter.isBossChapter ? (
                    <button
                      id={`btn-play-chapter-${currentChapter.levelNumber}-start`}
                      onClick={() => handleWarp(currentChapter.levelNumber)}
                      className="px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-lime-950/50 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Chapter {currentChapter.levelNumber}</span>
                    </button>
                  ) : null}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentChapter.description}
                </p>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentChapter.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/80 text-[10px] text-slate-300 font-medium"
                    >
                      ✦ {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Special Chapter 3 Boss Battle Launch Controls */}
              {currentChapter.isBossChapter && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Swords className="w-4 h-4 text-rose-400" />
                    <span>Boss Battle Launch Options (Infinite Replays)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option A: Fight Boss Fresh (Always replayable from menu) */}
                    <button
                      id="btn-warp-boss-fight-replay"
                      onClick={() => handleWarp(3, 'boss-cp-entrance', true)}
                      className="p-4 rounded-xl bg-gradient-to-br from-rose-950/60 to-slate-900 hover:from-rose-900/70 hover:to-slate-800 border-2 border-rose-500 text-left shadow-lg transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-rose-500 text-slate-950 text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                          <Swords className="w-3 h-3" />
                          Combat Ready
                        </span>
                        <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <h4 className="text-sm font-black text-white group-hover:text-rose-200">
                        ⚔️ Fight Ratkeeper Boss
                      </h4>
                      <p className="text-[11px] text-rose-200/80 mt-1">
                        Spawns a fresh active boss fight with full 100% HP, burrow attacks, shockwaves, and back-vulnerability mechanics.
                      </p>
                    </button>

                    {/* Option B: Enter Cleared Arena (Post-Defeat Peaceful Mode) */}
                    <button
                      id="btn-warp-boss-cleared-arena"
                      onClick={() => handleWarp(3, 'boss-cp-entrance', false)}
                      className="p-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-left shadow-md transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase tracking-wide">
                          Exploration Mode
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 group-hover:text-white">
                        🏰 Enter Arena (Normal Story State)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Inspect the boss room in your story state ({isBossDefeatedInSave ? 'Boss Defeated, Tunnel Open' : 'Active Boss'}).
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Checkpoints List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Warp to Specific Checkpoint</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {currentChapter.checkpoints.length} Available Point{currentChapter.checkpoints.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentChapter.checkpoints.map(cp => (
                    <button
                      key={cp.id}
                      id={`btn-warp-cp-${cp.id}`}
                      onClick={() => handleWarp(currentChapter.levelNumber, cp.id, currentChapter.isBossChapter)}
                      className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 text-left transition-all group flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <Flag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 truncate">
                            {cp.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {cp.desc}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          World X: {cp.xPos}px
                        </div>
                      </div>

                      <div className="p-1.5 rounded-lg bg-slate-900 group-hover:bg-amber-500 text-slate-400 group-hover:text-slate-950 shrink-0 transition-colors">
                        <Play className="w-3 h-3 fill-current" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All 3 Chapters Loaded & Verified</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-close-modal-bottom"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
