import React, { useState } from 'react';
import { Player } from '../game/Player';
import { SaveManager } from '../game/SaveManager';
import { X, Upload, Layers, CheckCircle2, RotateCcw, Sparkles, Database } from 'lucide-react';

interface SpriteUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export const SpriteUploaderModal: React.FC<SpriteUploaderModalProps> = ({
  isOpen,
  onClose,
  player,
}) => {
  const [selectedType, setSelectedType] = useState<'character' | 'idle' | 'run' | 'jump' | 'kick' | 'climb'>('idle');
  const [customFrameCount, setCustomFrameCount] = useState<number>(5);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  if (!isOpen || !player) return null;

  const currentSprite =
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        player.setCustomSprite(selectedType, dataUrl, customFrameCount || undefined, true);
        setSaveNotification(`Saved & Persisted ${selectedType}.png to Local Storage!`);
        setTimeout(() => setSaveNotification(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefault = () => {
    player.resetSpriteToDefault(selectedType);
    const defaultCount =
      selectedType === 'character' ? 1 : selectedType === 'idle' ? 5 : selectedType === 'run' ? 5 : selectedType === 'jump' ? 5 : 8;
    setCustomFrameCount(defaultCount);
    setSaveNotification(`Reset ${selectedType}.png to default!`);
    setTimeout(() => setSaveNotification(null), 2500);
  };

  const handleResetAll = () => {
    player.resetAllSpritesToDefault();
    setSaveNotification('Reset ALL sprites to defaults!');
    setTimeout(() => setSaveNotification(null), 2500);
  };

  const isCustomSaved = !!SaveManager.getSavedSprite(selectedType);

  return (
    <div id="sprite-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 text-slate-100 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Sprite Sheets & Animations</h2>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <Database className="w-3 h-3 text-emerald-400" />
                Auto-saved to Browser Storage (Persists on PC Restart)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
          {(['character', 'idle', 'run', 'jump', 'kick', 'climb'] as const).map(type => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                const count = type === 'character' ? 1 : type === 'idle' ? 5 : type === 'run' ? 5 : type === 'jump' ? 5 : 8;
                setCustomFrameCount(count);
              }}
              className={`flex-1 py-2 px-2 text-xs font-mono font-bold rounded-lg uppercase transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                selectedType === type
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{type}.png</span>
              {SaveManager.getSavedSprite(type) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Custom sprite saved in storage" />
              )}
            </button>
          ))}
        </div>

        {/* Sprite Info */}
        <div className="space-y-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 text-sm">
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400">File Name: </span>
              <span className="text-indigo-300 font-bold">{selectedType}.png</span>
            </div>
            <div>
              <span className="text-slate-400">Storage: </span>
              <span className={`font-bold ${isCustomSaved ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isCustomSaved ? '💾 SAVED IN LOCALSTORAGE' : 'DEFAULT BUILT-IN'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Detected Frames: </span>
              <span className="text-white font-bold">{currentSprite.frameCount}</span>
            </div>
            <div>
              <span className="text-slate-400">Frame Size: </span>
              <span className="text-white font-bold">
                {Math.round(currentSprite.frameWidth)} × {currentSprite.frameHeight} px
              </span>
            </div>
          </div>

          {/* Sprite Strip Image Preview */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-mono">Loaded Sprite Strip Preview:</span>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto flex items-center justify-center min-h-[90px]">
              {currentSprite.image ? (
                <img
                  src={currentSprite.image.src}
                  alt={`${selectedType} sprite sheet`}
                  className="max-h-20 object-contain image-pixelated border border-indigo-500/30 rounded p-1 bg-slate-950"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span className="text-xs text-slate-500">No image loaded</span>
              )}
            </div>
          </div>
        </div>

        {/* Save Notification Banner */}
        {saveNotification && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{saveNotification}</span>
          </div>
        )}

        {/* Upload Custom PNG Section */}
        <div className="space-y-3">
          <label className="block text-xs font-mono text-slate-300">
            Upload Custom PNG Sprite Strip for <span className="text-indigo-400 font-bold uppercase">{selectedType}</span>:
          </label>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="file"
                accept="image/png"
                onChange={handleFileUpload}
                className="hidden"
                id="sprite-file-input"
              />
              <label
                htmlFor="sprite-file-input"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Upload & Persist {selectedType}.png</span>
              </label>
            </div>

            <button
              onClick={handleResetDefault}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-2 border border-slate-700 transition-all"
              title="Reset to default generated sprite sheet"
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
            className="text-[11px] text-slate-400 hover:text-red-400 font-mono transition-colors"
          >
            Reset All Custom Sprites
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
