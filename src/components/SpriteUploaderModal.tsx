import React, { useState } from 'react';
import { Player } from '../game/Player';
import { SaveManager, SpriteType, PlayerSpriteType, DogSpriteType, RatSpriteType, MenuSpriteType } from '../game/SaveManager';
import { DogEnemy } from '../game/DogEnemy';
import { X, Upload, Layers, CheckCircle2, RotateCcw, Database, ShieldAlert, Image as ImageIcon, User, Skull } from 'lucide-react';

interface SpriteUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

type CategoryType = 'player' | 'dog' | 'rat' | 'menu';

export const SpriteUploaderModal: React.FC<SpriteUploaderModalProps> = ({
  isOpen,
  onClose,
  player,
}) => {
  const [category, setCategory] = useState<CategoryType>('player');
  const [selectedType, setSelectedType] = useState<SpriteType>('character');
  const [customFrameCount, setCustomFrameCount] = useState<number>(1);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const playerSpriteTypes: { id: PlayerSpriteType; label: string; defaultFrames: number }[] = [
    { id: 'character', label: 'Character', defaultFrames: 1 },
    { id: 'football', label: 'Football', defaultFrames: 1 },
    { id: 'idle', label: 'Idle Stance', defaultFrames: 23 },
    { id: 'run', label: 'Run Cycle', defaultFrames: 24 },
    { id: 'jump', label: 'Jump / Air', defaultFrames: 20 },
    { id: 'kick', label: 'Kick Ball', defaultFrames: 8 },
    { id: 'climb', label: 'Climb Wall', defaultFrames: 8 },
  ];

  const dogSpriteTypes: { id: DogSpriteType; label: string; defaultFrames: number }[] = [
    { id: 'dog_sleep', label: 'Sleep', defaultFrames: 4 },
    { id: 'dog_wakeup', label: 'Wake Up', defaultFrames: 10 },
    { id: 'dog_alert', label: 'Alert / Bark', defaultFrames: 6 },
    { id: 'dog_run', label: 'Run / Chase', defaultFrames: 8 },
    { id: 'dog_bite', label: 'Bite Attack', defaultFrames: 10 },
    { id: 'dog_damage', label: 'Hit / Damage', defaultFrames: 8 },
    { id: 'dog_enemy', label: 'Sprite Sheet', defaultFrames: 1 },
  ];

  const ratSpriteTypes: { id: RatSpriteType; label: string; defaultFrames: number }[] = [
    { id: 'rat_idle', label: 'Rat Idle', defaultFrames: 4 },
    { id: 'rat_run', label: 'Rat Run', defaultFrames: 8 },
    { id: 'rat_jump', label: 'Rat Jump', defaultFrames: 6 },
    { id: 'rat_attack', label: 'Rat Attack / Fire Nut', defaultFrames: 4 },
    { id: 'rat_block', label: 'Rat Block', defaultFrames: 4 },
    { id: 'rat_boss', label: 'Rat Boss Vector/Art', defaultFrames: 1 },
  ];

  const menuSpriteTypes: { id: MenuSpriteType; label: string; defaultFrames: number }[] = [
    { id: 'start_menue', label: 'Start Menu BG', defaultFrames: 1 },
    { id: 'background_level1', label: 'Level 1 BG', defaultFrames: 1 },
  ];

  const currentCategoryTypes =
    category === 'player'
      ? playerSpriteTypes
      : category === 'dog'
      ? dogSpriteTypes
      : category === 'rat'
      ? ratSpriteTypes
      : menuSpriteTypes;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        if (category === 'player' && player) {
          player.setCustomSprite(selectedType as PlayerSpriteType, dataUrl, customFrameCount || undefined, true);
        } else {
          SaveManager.saveSprite(selectedType, dataUrl, customFrameCount || undefined);
        }
        setSaveNotification(`Saved & Persisted ${selectedType}.png to Local Storage!`);
        setTimeout(() => setSaveNotification(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefault = () => {
    if (category === 'player' && player) {
      player.resetSpriteToDefault(selectedType as PlayerSpriteType);
    } else {
      SaveManager.removeSprite(selectedType);
    }
    const match = currentCategoryTypes.find(t => t.id === selectedType);
    setCustomFrameCount(match ? match.defaultFrames : 1);
    setSaveNotification(`Reset ${selectedType}.png to default!`);
    setTimeout(() => setSaveNotification(null), 2500);
  };

  const handleResetAll = () => {
    if (player) {
      player.resetAllSpritesToDefault();
    }
    SaveManager.clearAllSprites();
    setSaveNotification('Reset ALL sprites to defaults!');
    setTimeout(() => setSaveNotification(null), 2500);
  };

  const isCustomSaved = !!SaveManager.getSavedSprite(selectedType);

  // Get preview image src
  const getPreviewSrc = (): string | null => {
    const saved = SaveManager.getSavedSprite(selectedType);
    if (saved?.dataUrl) return saved.dataUrl;

    if (category === 'player' && player) {
      const pSprite =
        selectedType === 'character'
          ? player.characterSprite
          : selectedType === 'idle'
          ? player.idleSprite
          : selectedType === 'run'
          ? player.runSprite
          : selectedType === 'jump'
          ? player.jumpSprite
          : selectedType === 'kick'
          ? player.kickSprite
          : player.climbSprite;
      return pSprite?.image?.src || null;
    }

    if (category === 'dog') {
      const baseKey = selectedType.replace('dog_', '');
      const img = DogEnemy.getLoadedImage(baseKey);
      return img?.src || null;
    }

    if (category === 'rat') {
      const img = DogEnemy.getLoadedImage(selectedType);
      return img?.src || null;
    }

    if (category === 'menu') {
      const base = import.meta.env.BASE_URL || '/';
      const cleanBase = base.replace(/\/+$/, '');
      return `${cleanBase}/${selectedType}.png`;
    }

    return null;
  };

  const previewSrc = getPreviewSrc();

  return (
    <div id="sprite-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Sprite Sheets & Asset Manager</h2>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <Database className="w-3 h-3 text-emerald-400" />
                Root Folder & Browser Storage Assets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Switcher Tabs */}
        <div className="grid grid-cols-4 bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs font-bold font-mono">
          <button
            onClick={() => {
              setCategory('player');
              setSelectedType('character');
              setCustomFrameCount(1);
            }}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              category === 'player' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="truncate">Player & Ball</span>
          </button>

          <button
            onClick={() => {
              setCategory('dog');
              setSelectedType('dog_run');
              setCustomFrameCount(8);
            }}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              category === 'dog' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="truncate">Dog Enemies</span>
          </button>

          <button
            onClick={() => {
              setCategory('rat');
              setSelectedType('rat_boss');
              setCustomFrameCount(1);
            }}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              category === 'rat' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            <span className="truncate">Rat / Boss</span>
          </button>

          <button
            onClick={() => {
              setCategory('menu');
              setSelectedType('start_menue');
              setCustomFrameCount(1);
            }}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              category === 'menu' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="truncate">Menu & BG</span>
          </button>
        </div>

        {/* Sprite Item Selector Chips */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
          {currentCategoryTypes.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedType(item.id);
                setCustomFrameCount(item.defaultFrames);
              }}
              className={`py-1.5 px-3 text-xs font-mono font-bold rounded-lg uppercase transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                selectedType === item.id
                  ? category === 'player'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : category === 'dog'
                    ? 'bg-amber-600 text-white shadow-lg'
                    : 'bg-emerald-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>{item.label}</span>
              {SaveManager.getSavedSprite(item.id) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" title="Custom sprite active" />
              )}
            </button>
          ))}
        </div>

        {/* Asset Details & Live Preview */}
        <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-sm">
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-400">Target Asset: </span>
              <span className="text-indigo-300 font-bold">{selectedType}.png</span>
            </div>
            <div>
              <span className="text-slate-400">Persistence Status: </span>
              <span className={`font-bold ${isCustomSaved ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isCustomSaved ? '💾 SAVED IN LOCALSTORAGE' : 'DEFAULT BUILT-IN'}
              </span>
            </div>
          </div>

          {/* Image Strip Preview */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-mono">Asset Preview:</span>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto flex items-center justify-center min-h-[110px] max-h-[180px]">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt={`${selectedType} preview`}
                  className="max-h-28 object-contain image-pixelated border border-slate-700 rounded p-1 bg-slate-950"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span className="text-xs text-slate-500">No custom sprite loaded (using system fallback)</span>
              )}
            </div>
          </div>
        </div>

        {/* Notification Banner */}
        {saveNotification && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{saveNotification}</span>
          </div>
        )}

        {/* Upload & Action Controls */}
        <div className="space-y-3">
          <label className="block text-xs font-mono text-slate-300">
            Upload PNG Asset for <span className="text-indigo-400 font-bold uppercase">{selectedType}</span>:
          </label>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
                id="sprite-file-input"
              />
              <label
                htmlFor="sprite-file-input"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Upload & Persist {selectedType}</span>
              </label>
            </div>

            <button
              onClick={handleResetDefault}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
              title="Reset to default asset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleResetAll}
            className="text-[11px] text-slate-400 hover:text-red-400 font-mono transition-colors cursor-pointer"
          >
            Reset All Custom Assets
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
