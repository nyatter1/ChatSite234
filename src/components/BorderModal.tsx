import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Layers, CircleDot, Globe, Languages } from 'lucide-react';
import { BorderItem } from '../borders';

interface BorderModalProps {
  type: 'profileBorder' | 'pfpBorder';
  borders: BorderItem[];
  currentIndex: number;
  username: string;
  avatarUrl: string | null;
  gender?: string;
  country?: string;
  language?: string;
  onSave: (index: number) => void;
  onClose: () => void;
}

export default function BorderModal({
  type,
  borders,
  currentIndex,
  username,
  avatarUrl,
  gender = 'MALE',
  country = 'United Kingdom',
  language = 'English',
  onSave,
  onClose
}: BorderModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
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
    onSave(selectedIndex);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 select-none overflow-y-auto"
    >
      <div className="w-full max-w-[430px] bg-[#141418] border border-[#24242e] rounded-3xl p-5 sm:p-6 shadow-2xl relative text-white animate-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[95vh]">
        {/* TOP HEADER (Screenshot 3) */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {isProfileBorder ? (
              <Layers className="w-5 h-5 text-white" />
            ) : (
              <CircleDot className="w-5 h-5 text-white" />
            )}
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide">
              {isProfileBorder ? 'Profile Borders' : 'Profile Picture Borders'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STYLE NUMBER (Centered, Screenshot 3) */}
        <div className="text-center mb-3">
          <span className="text-xs sm:text-sm font-black text-zinc-300 uppercase tracking-widest">
            STYLE {selectedIndex + 1}
          </span>
          <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
            {currentBorder.name.replace(/^\d+\.\s*/, '')} {currentBorder.isAnimated ? '★ Animated' : ''}
          </p>
        </div>

        {/* PREVIEW CONTAINER CARD (Screenshot 3) */}
        <div className="flex-1 flex flex-col items-center justify-center py-1">
          <div
            className={`w-full bg-[#16161b] rounded-3xl p-4 sm:p-5 relative transition-all duration-200 shadow-2xl ${
              isProfileBorder
                ? (currentBorder.cardBorderClass || 'border border-red-600')
                : 'border border-[#262633]'
            }`}
          >
            {/* Top Right Mini Red X in preview card */}
            <div className="absolute top-3.5 right-3.5 text-red-500">
              <X className="w-4 h-4" />
            </div>

            {/* Avatar & User Details */}
            <div className="flex items-start gap-4">
              {/* Avatar Box (Applies pfpBorderClass if PFP border mode) */}
              <div
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#22222b] shrink-0 shadow-lg transition-all ${
                  !isProfileBorder
                    ? (currentBorder.pfpBorderClass || 'border-2 border-white')
                    : 'border border-white/20'
                }`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#252530]">
                    <svg viewBox="0 0 40 40" className="w-14 h-14 text-zinc-400 fill-current translate-y-1">
                      <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* User details (NO Moderator badge, as requested) */}
              <div className="flex-1 min-w-0 pt-2">
                <h3 className="text-xl sm:text-2xl font-black text-red-500 tracking-wide truncate">
                  {username || 'Null'}
                </h3>
                <p className="text-xs font-bold text-red-400/90 mt-0.5">
                  Preview Mode
                </p>
              </div>
            </div>

            {/* Tabs: Info / About / Friends (Screenshot 3) */}
            <div className="mt-4 pt-3 border-t border-[#23232c] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePreviewTab('info')}
                className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors cursor-pointer ${
                  activePreviewTab === 'info'
                    ? 'bg-[#262633] text-red-500 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Info
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('about')}
                className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors cursor-pointer ${
                  activePreviewTab === 'about'
                    ? 'bg-[#262633] text-red-500 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                About
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('friends')}
                className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors cursor-pointer ${
                  activePreviewTab === 'friends'
                    ? 'bg-[#262633] text-red-500 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Friends
              </button>
            </div>

            {/* Info Items List (Screenshot 3) */}
            <div className="mt-3 space-y-2 text-xs font-bold">
              {/* Country */}
              <div className="flex items-center justify-between text-red-500/90 py-1 px-1">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4" />
                  <span>Country</span>
                </div>
                <span className="text-red-400 font-semibold">{country}</span>
              </div>

              {/* Gender */}
              <div className="flex items-center justify-between text-red-500/90 py-1 px-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">⚥</span>
                  <span>Gender</span>
                </div>
                <span className="text-red-400 font-semibold">{gender}</span>
              </div>

              {/* Language */}
              <div className="flex items-center justify-between text-red-500/90 py-1 px-1">
                <div className="flex items-center gap-2.5">
                  <Languages className="w-4 h-4" />
                  <span>Language</span>
                </div>
                <span className="text-red-400 font-semibold">{language}</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION CONTROLS (Screenshot 3, NO VIEW GRID) */}
        <div className="mt-4 flex items-center justify-between gap-3">
          {/* < left arrow button */}
          <button
            type="button"
            onClick={handlePrev}
            title="Previous style"
            className="w-12 h-11 rounded-2xl bg-[#1e1e26] hover:bg-[#282834] active:bg-[#181820] flex items-center justify-center text-white transition-colors cursor-pointer border border-[#2b2b38] shadow-md"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-extrabold text-zinc-400 tracking-wider">
            {selectedIndex + 1} / {borders.length}
          </span>

          {/* > right arrow button */}
          <button
            type="button"
            onClick={handleNext}
            title="Next style"
            className="w-12 h-11 rounded-2xl bg-[#1e1e26] hover:bg-[#282834] active:bg-[#181820] flex items-center justify-center text-white transition-colors cursor-pointer border border-[#2b2b38] shadow-md"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* BOTTOM ACTION ROW: "Next Style ➔" and "✓ Save" (Screenshot 3) */}
        <div className="mt-3.5 flex items-center gap-3">
          {/* Next Style button */}
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 bg-[#1e1e26] hover:bg-[#282834] text-white font-extrabold py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#2b2b38]"
          >
            <span>Next Style</span>
            <span>➔</span>
          </button>

          {/* Save button (Cyan, Screenshot 3) */}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-[#00c2ff] hover:bg-[#00aee6] active:bg-[#0096cc] text-white font-black py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-cyan-500/25"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
