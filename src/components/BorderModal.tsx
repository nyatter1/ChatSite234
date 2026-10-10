import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Layers, CircleDot, Globe, Languages, Sparkles } from 'lucide-react';
import { BorderItem } from '../borders';

interface BorderModalProps {
  type: 'profileBorder' | 'pfpBorder';
  borders: BorderItem[];
  currentIndex: number;
  initialThickness?: number;
  username: string;
  avatarUrl: string | null;
  gender?: string;
  country?: string;
  language?: string;
  bio?: string;
  onSave: (index: number, thickness: number) => void;
  onClose: () => void;
}

export default function BorderModal({
  type,
  borders,
  currentIndex,
  initialThickness = 2,
  username,
  avatarUrl,
  gender = 'MALE',
  country = 'United Kingdom',
  language = 'English',
  bio,
  onSave,
  onClose
}: BorderModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [thickness, setThickness] = useState<number>(initialThickness || 2);
  const [activePreviewTab, setActivePreviewTab] = useState<'info' | 'about' | 'friends'>('info');

  const currentBorder = borders[selectedIndex] || borders[0];
  const isProfileBorder = type === 'profileBorder';

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? borders.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === borders.length - 1 ? 0 : prev + 1));
  };

  const handleSave = () => {
    onSave(selectedIndex, thickness);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[75] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 select-none overflow-y-auto"
    >
      {/* Click outside */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Dialog Modal (Clean Screenshot 3 UI, smaller scale & well-spaced) */}
      <div className="w-full max-w-[390px] bg-[#141418] border border-[#24242e] rounded-3xl p-4 sm:p-5 shadow-2xl relative z-10 text-white animate-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[96vh]">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2">
            {isProfileBorder ? (
              <Layers className="w-4 h-4 text-cyan-400" />
            ) : (
              <CircleDot className="w-4 h-4 text-cyan-400" />
            )}
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              {isProfileBorder ? 'Profile Borders' : 'Profile Picture Borders'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STYLE NUMBER & NAME (Centered, Screenshot 3) */}
        <div className="text-center mb-2 shrink-0">
          <span className="text-[11px] font-black text-zinc-300 uppercase tracking-widest block">
            STYLE {selectedIndex + 1}
          </span>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <p className="text-[11px] text-zinc-400 font-semibold truncate max-w-[200px]">
              {currentBorder.name.replace(/^\d+\.\s*/, '')}
            </p>
            {currentBorder.isAnimated && (
              <span className="text-[9px] font-black text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded-full border border-purple-500/30 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                Animated
              </span>
            )}
          </div>
        </div>

        {/* PREVIEW CONTAINER (Smaller & well-spaced, Screenshot 3 layout) */}
        <div className="flex flex-col items-center justify-center py-1 shrink-0">
          <div
            className={`w-full max-w-[310px] bg-[#16161b] rounded-2xl p-3 sm:p-3.5 relative transition-all duration-200 shadow-xl ${
              isProfileBorder
                ? (currentBorder.cardBorderClass || 'border border-red-600')
                : 'border border-[#262633]'
            }`}
            style={
              isProfileBorder
                ? { borderWidth: `${thickness}px` }
                : undefined
            }
          >
            {/* Top Right Mini Red X */}
            <div className="absolute top-2.5 right-2.5 text-red-500">
              <X className="w-3.5 h-3.5" />
            </div>

            {/* Avatar & User Details */}
            <div className="flex items-center gap-2.5">
              {/* Avatar Box (Applies pfpBorderClass + thickness if PFP border mode) */}
              <div
                className={`w-14 h-14 rounded-xl overflow-hidden bg-[#22222b] shrink-0 shadow-md transition-all ${
                  !isProfileBorder
                    ? (currentBorder.pfpBorderClass || '')
                    : ''
                }`}
                style={
                  !isProfileBorder && currentBorder.pfpBorderClass
                    ? { borderWidth: `${thickness}px` }
                    : undefined
                }
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#252530]">
                    <svg viewBox="0 0 40 40" className="w-9 h-9 text-zinc-400 fill-current translate-y-0.5">
                      <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* User details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-black text-red-500 tracking-wide truncate">
                  {username || 'Null'}
                </h3>
                <p className="text-[10px] font-bold text-red-400/90 mt-0.5">
                  Preview Mode
                </p>
              </div>
            </div>

            {/* Tabs: Info / About / Friends */}
            <div className="mt-2 pt-2 border-t border-[#23232c] flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActivePreviewTab('info')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                  activePreviewTab === 'info'
                    ? 'bg-[#262633] text-red-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Info
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('about')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                  activePreviewTab === 'about'
                    ? 'bg-[#262633] text-red-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                About
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('friends')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                  activePreviewTab === 'friends'
                    ? 'bg-[#262633] text-red-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Friends
              </button>
            </div>

            {/* Tab content */}
            {activePreviewTab === 'info' && (
              <div className="mt-1.5 space-y-1 text-[10px] font-bold">
                {/* Country */}
                <div className="flex items-center justify-between text-red-500/90 py-0.5 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />
                    <span>Country</span>
                  </div>
                  <span className="text-red-400 font-semibold">{country}</span>
                </div>

                {/* Gender */}
                <div className="flex items-center justify-between text-red-500/90 py-0.5 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]">⚥</span>
                    <span>Gender</span>
                  </div>
                  <span className="text-red-400 font-semibold">{gender}</span>
                </div>

                {/* Language */}
                <div className="flex items-center justify-between text-red-500/90 py-0.5 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <Languages className="w-3 h-3" />
                    <span>Language</span>
                  </div>
                  <span className="text-red-400 font-semibold">{language}</span>
                </div>
              </div>
            )}

            {/* About Tab: pure text, no box */}
            {activePreviewTab === 'about' && (
              <div className="mt-1.5 max-h-[60px] overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {bio || 'Hey there! Welcome to my chat profile.'}
                </p>
              </div>
            )}

            {/* Friends Tab */}
            {activePreviewTab === 'friends' && (
              <div className="mt-1.5 py-1 text-center">
                <p className="text-[10px] text-zinc-500 italic">No friends listed</p>
              </div>
            )}
          </div>
        </div>

        {/* THICKNESS ADJUSTMENT CONTROL */}
        <div className="mt-2.5 px-1 shrink-0 bg-[#191920] p-2.5 rounded-xl border border-[#23232c]">
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className="text-zinc-300">
              {isProfileBorder ? 'Card Border Thickness' : 'PFP Border Thickness'}
            </span>
            <span className="text-cyan-400 font-extrabold">{thickness}px</span>
          </div>

          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#252530] rounded-lg appearance-none"
          />

          <div className="flex items-center justify-between gap-1 mt-1.5">
            {[1, 2, 3, 4, 6, 8].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setThickness(t)}
                className={`flex-1 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                  thickness === t
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                    : 'bg-[#20202a] text-zinc-400 hover:text-white border border-[#282836]'
                }`}
              >
                {t}px
              </button>
            ))}
          </div>
        </div>

        {/* NAVIGATION CONTROLS (Screenshot 3 layout) */}
        <div className="mt-2.5 flex items-center justify-between gap-3 shrink-0">
          {/* < left arrow button */}
          <button
            type="button"
            onClick={handlePrev}
            title="Previous style"
            className="w-11 h-9 rounded-xl bg-[#1e1e26] hover:bg-[#282834] active:bg-[#181820] flex items-center justify-center text-white transition-colors cursor-pointer border border-[#2b2b38] shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-black text-zinc-300 tracking-wider">
            {selectedIndex + 1} / {borders.length}
          </span>

          {/* > right arrow button */}
          <button
            type="button"
            onClick={handleNext}
            title="Next style"
            className="w-11 h-9 rounded-xl bg-[#1e1e26] hover:bg-[#282834] active:bg-[#181820] flex items-center justify-center text-white transition-colors cursor-pointer border border-[#2b2b38] shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* BOTTOM ACTION ROW: "Next Style ➔" and "✓ Save" (Screenshot 3) */}
        <div className="mt-2.5 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 bg-[#1e1e26] hover:bg-[#282834] text-white font-extrabold py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#2b2b38]"
          >
            <span>Next Style</span>
            <span>➔</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-[#00c2ff] hover:bg-[#00aee6] active:bg-[#0096cc] text-white font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-cyan-500/25"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
