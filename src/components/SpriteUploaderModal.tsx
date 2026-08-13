import React, { useState } from 'react';
import { Player } from '../game/Player';
import { X, Upload, Layers, CheckCircle2, RotateCcw } from 'lucide-react';

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
  const [selectedType, setSelectedType] = useState<'idle' | 'run' | 'jump' | 'kick'>('idle');
  const [customFrameCount, setCustomFrameCount] = useState<number>(1);

  if (!isOpen || !player) return null;

  const currentSprite =
    selectedType === 'idle'
      ? player.idleSprite
      : selectedType === 'run'
      ? player.runSprite
      : selectedType === 'jump'
      ? player.jumpSprite
      : player.kickSprite;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    player.setCustomSprite(selectedType, url, customFrameCount || undefined);
  };

  const handleResetDefault = () => {
    const defaultUrl = `/${selectedType}.png`;
    const defaultCount =
      selectedType === 'idle' ? 1 : selectedType === 'run' ? 8 : selectedType === 'jump' ? 6 : 6;
    player.setCustomSprite(selectedType, defaultUrl, defaultCount);
    setCustomFrameCount(defaultCount);
  };

  return (
    <div id="sprite-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 text-slate-100 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Sprite Sheet Inspector & Uploader</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
          {(['idle', 'run', 'jump', 'kick'] as const).map(type => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                const count = type === 'idle' ? 1 : type === 'run' ? 8 : type === 'jump' ? 6 : 6;
                setCustomFrameCount(count);
              }}
              className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg uppercase transition-all ${
                selectedType === type
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type}.png
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
              <span className="text-slate-400">Status: </span>
              <span className={`font-bold ${currentSprite.isLoaded ? 'text-emerald-400' : 'text-amber-400'}`}>
                {currentSprite.isLoaded ? 'LOADED & ACTIVE' : 'LOADING...'}
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
                <span>Choose {selectedType}.png File</span>
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
        <div className="pt-2 border-t border-slate-800 flex justify-end">
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
