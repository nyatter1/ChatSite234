import React, { useState } from 'react';
import { X, RotateCcw, Save } from 'lucide-react';
import ColorPickerPopup from './ColorPickerPopup';

interface GlowModalProps {
  initialColor: string | null;
  username: string;
  avatarUrl: string | null;
  pfpBorderClass?: string;
  onSave: (color: string | null) => void;
  onClose: () => void;
}

export default function GlowModal({
  initialColor,
  username,
  avatarUrl,
  pfpBorderClass,
  onSave,
  onClose
}: GlowModalProps) {
  const [tempColor, setTempColor] = useState<string | null>(initialColor || '#00c2ff');
  const [showPicker, setShowPicker] = useState(false);

  const handleReset = () => {
    setTempColor(null);
    setShowPicker(false);
  };

  const handleSave = () => {
    onSave(tempColor);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-[420px] bg-[#141418] border border-[#24242e] rounded-3xl p-6 sm:p-7 shadow-2xl relative text-white animate-in zoom-in-95 duration-150 select-none">
        {/* Header (Screenshot 1) */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Userlist background glow
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium">
              Pick your userlist glow color.
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

        {/* Center Swatch Button (Screenshot 1) */}
        <div className="flex flex-col items-center justify-center py-4 relative">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            title="Click to open color picker"
            className="w-24 h-24 rounded-2xl shadow-xl border-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer relative"
            style={{
              backgroundColor: tempColor || '#22222b',
              borderColor: tempColor || '#383848',
              boxShadow: tempColor ? `0 0 25px ${tempColor}80` : 'none'
            }}
          >
            {!tempColor && (
              <span className="text-xs font-bold text-zinc-400">None</span>
            )}
          </button>

          {/* Color Picker Popup (Screenshot 2) */}
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

        {/* PREVIEW SECTION (Screenshot 1) */}
        <div className="mt-4 mb-7">
          <h3 className="text-sm font-extrabold text-white tracking-wide mb-2.5">
            Preview
          </h3>

          <div
            className="bg-[#18181f] rounded-2xl p-3 flex items-center gap-3 transition-all duration-200 border"
            style={{
              borderColor: tempColor || '#2b2b38',
              boxShadow: tempColor
                ? `0 0 18px ${tempColor}99, inset 0 0 6px ${tempColor}33`
                : 'none'
            }}
          >
            {/* Avatar */}
            <div
              className={`w-11 h-11 rounded-full overflow-hidden bg-[#24252e] shrink-0 border transition-all ${
                pfpBorderClass || 'border-white/10'
              }`}
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
              <span className="font-extrabold text-white text-base tracking-wide truncate block">
                {username || 'Null'}
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS (Screenshot 1) */}
        <div className="flex items-center gap-3">
          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="bg-[#282832] hover:bg-[#343440] text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          {/* Save button (Cyan) */}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-[#00c2ff] hover:bg-[#00aee6] active:bg-[#0096cc] text-white font-extrabold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer shadow-lg shadow-cyan-500/25"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
