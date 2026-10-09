import React, { useState } from 'react';
import { X, RotateCcw, Save } from 'lucide-react';
import ColorPickerPopup from './ColorPickerPopup';

interface GlowModalProps {
  initialColor: string | null;
  initialThickness?: number;
  username: string;
  avatarUrl: string | null;
  pfpBorderClass?: string;
  pfpBorderThickness?: number;
  onSave: (color: string | null, thickness: number) => void;
  onClose: () => void;
}

export default function GlowModal({
  initialColor,
  initialThickness = 18,
  username,
  avatarUrl,
  pfpBorderClass,
  pfpBorderThickness = 2,
  onSave,
  onClose
}: GlowModalProps) {
  const [tempColor, setTempColor] = useState<string | null>(initialColor || '#00c2ff');
  const [thickness, setThickness] = useState<number>(initialThickness || 18);
  const [showPicker, setShowPicker] = useState(false);

  const handleReset = () => {
    setTempColor(null);
    setThickness(18);
    setShowPicker(false);
  };

  const handleSave = () => {
    onSave(tempColor, thickness);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      {/* Click outside */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="w-full max-w-[420px] bg-[#141418] border border-[#24242e] rounded-3xl p-5 sm:p-6 shadow-2xl relative z-10 text-white animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-wide">
              Userlist background glow
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Pick your userlist glow color and thickness. (Free)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Swatch Button */}
        <div className="flex flex-col items-center justify-center py-2 relative">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            title="Click to open color picker"
            className="w-20 h-20 rounded-2xl shadow-xl border-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer relative"
            style={{
              backgroundColor: tempColor || '#22222b',
              borderColor: tempColor || '#383848',
              boxShadow: tempColor ? `0 0 ${thickness}px ${tempColor}80` : 'none'
            }}
          >
            {!tempColor && (
              <span className="text-xs font-bold text-zinc-400">None</span>
            )}
          </button>

          {/* Color Picker Popup */}
          {showPicker && (
            <div className="absolute top-full mt-2 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPicker(false)}
              />
              <div className="relative z-50">
                <ColorPickerPopup
                  color={tempColor || '#00c2ff'}
                  onChange={(newHex) => setTempColor(newHex)}
                  onClose={() => setShowPicker(false)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Glow Thickness Control */}
        <div className="mt-3 px-1">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-zinc-300">Glow Thickness / Spread</span>
            <span className="text-cyan-400 font-extrabold">{thickness}px</span>
          </div>

          <input
            type="range"
            min="6"
            max="40"
            step="2"
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-[#22222b] rounded-lg appearance-none"
          />

          <div className="flex items-center justify-between gap-1.5 mt-2">
            {[8, 14, 20, 28, 38].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setThickness(val)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer ${
                  thickness === val
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                    : 'bg-[#1c1c24] text-zinc-400 hover:text-white border border-[#272734]'
                }`}
              >
                {val === 8 ? 'Thin' : val === 20 ? 'Normal' : val === 38 ? 'Max' : `${val}px`}
              </button>
            ))}
          </div>
        </div>

        {/* PREVIEW SECTION */}
        <div className="mt-4 mb-5">
          <h3 className="text-xs font-extrabold text-zinc-400 tracking-wide uppercase mb-2">
            Userlist Preview
          </h3>

          <div
            className="bg-[#18181f] rounded-2xl p-3 flex items-center gap-3 transition-all duration-200 border"
            style={{
              borderColor: tempColor || '#2b2b38',
              boxShadow: tempColor
                ? `0 0 ${thickness}px ${tempColor}99, inset 0 0 ${Math.max(4, Math.round(thickness / 3))}px ${tempColor}33`
                : 'none'
            }}
          >
            {/* Avatar */}
            <div
              className={`w-10 h-10 rounded-full overflow-hidden bg-[#24252e] shrink-0 border transition-all ${
                pfpBorderClass || 'border-white/10'
              }`}
              style={{ borderWidth: `${pfpBorderThickness}px` }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <svg
                  viewBox="0 0 40 40"
                  className="w-full h-full text-zinc-400 fill-current translate-y-0.5"
                >
                  <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                </svg>
              )}
            </div>

            {/* Username */}
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-white text-sm tracking-wide truncate block">
                {username || 'Null'}
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center gap-2.5">
          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="bg-[#242430] hover:bg-[#2e2e3d] text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-[#00c2ff] hover:bg-[#00aee6] active:bg-[#0096cc] text-white font-extrabold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-colors cursor-pointer shadow-lg shadow-cyan-500/25"
          >
            <Save className="w-4 h-4" />
            <span>Save Glow</span>
          </button>
        </div>
      </div>
    </div>
  );
}
