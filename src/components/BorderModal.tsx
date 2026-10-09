import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Layers, CircleDot, Globe, Languages, Sparkles } from 'lucide-react';
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
  bio?: string;
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
  bio,
  onSave,
  onClose
}: BorderModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [activePreviewTab, setActivePreviewTab] = useState<'info' | 'about' | 'friends'>('info');
  const [filterMode, setFilterMode] = useState<'all' | 'animated' | 'normal'>('all');

  const currentBorder = borders[selectedIndex] || borders[0];
  const isProfileBorder = type === 'profileBorder';

  const filteredBorders = borders.filter((b) => {
    if (filterMode === 'animated') return b.isAnimated;
    if (filterMode === 'normal') return !b.isAnimated;
    return true;
  });

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
      className="fixed inset-0 z-[75] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150 select-none overflow-y-auto"
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="w-full max-w-[560px] bg-[#131317] border border-[#24242e] rounded-3xl p-4 sm:p-6 shadow-2xl relative z-10 text-white animate-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[94vh]">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              {isProfileBorder ? (
                <Layers className="w-4 h-4 text-cyan-400" />
              ) : (
                <CircleDot className="w-4 h-4 text-cyan-400" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                {isProfileBorder ? 'Profile Borders' : 'Profile Picture Borders'}
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                {isProfileBorder
                  ? 'Card frame styling applied to your public profile'
                  : 'Avatar ring styling applied across chat and profile'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STYLE NUMBER & NAME */}
        <div className="flex items-center justify-between bg-[#191920] px-3.5 py-1.5 rounded-xl border border-[#23232c] my-1 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest shrink-0">
              STYLE {selectedIndex + 1} OF {borders.length}
            </span>
            <span className="text-zinc-600 font-black">•</span>
            <span className="text-xs text-zinc-200 font-bold truncate">
              {currentBorder.name.replace(/^\d+\.\s*/, '')}
            </span>
          </div>
          {currentBorder.isAnimated && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 rounded-full shrink-0">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Animated
            </span>
          )}
        </div>

        {/* ZOOMED OUT PREVIEW CONTAINER (Screenshot 3 layout) */}
        <div className="py-2 flex flex-col items-center justify-center shrink-0">
          <div
            className={`w-full max-w-[390px] bg-[#16161b] rounded-2xl p-3.5 sm:p-4 relative transition-all duration-200 shadow-xl ${
              isProfileBorder
                ? (currentBorder.cardBorderClass || 'border border-red-600')
                : 'border border-[#262633]'
            }`}
          >
            {/* Top Right Mini Red X in preview card */}
            <div className="absolute top-2.5 right-2.5 text-red-500">
              <X className="w-3.5 h-3.5" />
            </div>

            {/* Avatar & User Details */}
            <div className="flex items-center gap-3">
              {/* Avatar Box (Applies pfpBorderClass if in PFP border mode) */}
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#22222b] shrink-0 shadow-md transition-all ${
                  !isProfileBorder
                    ? (currentBorder.pfpBorderClass || 'border-2 border-white')
                    : 'border border-white/20'
                }`}
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

              {/* User details (NO Moderator badge, as requested) */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-black text-red-500 tracking-wide truncate">
                  {username || 'Null'}
                </h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-red-400/90 mt-0.5">
                  Preview Mode
                </p>
              </div>
            </div>

            {/* Tabs: Info / About / Friends (Screenshot 3) */}
            <div className="mt-2.5 pt-2 border-t border-[#23232c] flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActivePreviewTab('info')}
                className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black transition-colors cursor-pointer ${
                  activePreviewTab === 'info'
                    ? 'bg-[#262633] text-red-500 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Info
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('about')}
                className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black transition-colors cursor-pointer ${
                  activePreviewTab === 'about'
                    ? 'bg-[#262633] text-red-500 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                About
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('friends')}
                className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black transition-colors cursor-pointer ${
                  activePreviewTab === 'friends'
                    ? 'bg-[#262633] text-red-500 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Friends
              </button>
            </div>

            {/* Tab content */}
            {activePreviewTab === 'info' && (
              <div className="mt-2 space-y-1 text-[11px] font-bold">
                {/* Country (Auto-detected) */}
                <div className="flex items-center justify-between text-red-500/90 py-0.5 px-0.5">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Country</span>
                  </div>
                  <span className="text-red-400 font-semibold">{country}</span>
                </div>

                {/* Gender */}
                <div className="flex items-center justify-between text-red-500/90 py-0.5 px-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">⚥</span>
                    <span>Gender</span>
                  </div>
                  <span className="text-red-400 font-semibold">{gender}</span>
                </div>

                {/* Language */}
                <div className="flex items-center justify-between text-red-500/90 py-0.5 px-0.5">
                  <div className="flex items-center gap-2">
                    <Languages className="w-3.5 h-3.5" />
                    <span>Language</span>
                  </div>
                  <span className="text-red-400 font-semibold">{language}</span>
                </div>
              </div>
            )}

            {/* About Tab in Preview: Pure text, no box, scrollable! */}
            {activePreviewTab === 'about' && (
              <div className="mt-2 max-h-[80px] overflow-y-auto pr-1">
                <p className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {bio || 'Hey there! Welcome to my chat profile.'}
                </p>
              </div>
            )}

            {/* Friends Tab in Preview */}
            {activePreviewTab === 'friends' && (
              <div className="mt-2 py-1 text-center">
                <p className="text-[11px] text-zinc-500 italic">No friends listed in preview</p>
              </div>
            )}
          </div>
        </div>

        {/* ZOOMED OUT OPTIONS GALLERY: Let users see the options more! */}
        <div className="mt-1 flex-1 flex flex-col min-h-0 border-t border-[#23232c] pt-2.5">
          <div className="flex items-center justify-between mb-2 px-1 shrink-0">
            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
              Browse All Options ({borders.length})
            </span>

            {/* Category filter pills */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                  filterMode === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('animated')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                  filterMode === 'animated'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                ★ Animated
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('normal')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                  filterMode === 'normal'
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Normal
              </button>
            </div>
          </div>

          {/* Visual Options Scroller (Multi-row zoomed-out mini cards) */}
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 overflow-y-auto max-h-[140px] p-1 rounded-xl bg-[#101014] border border-[#202028]">
            {filteredBorders.map((b) => {
              const originalIndex = borders.findIndex((x) => x.id === b.id);
              const isSelected = selectedIndex === originalIndex;

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedIndex(originalIndex)}
                  title={b.name}
                  className={`p-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-cyan-950/70 border-2 border-cyan-400 shadow-md shadow-cyan-500/20 scale-102 ring-1 ring-cyan-300'
                      : 'bg-[#181820] hover:bg-[#20202c] border border-[#262634]'
                  }`}
                >
                  {/* Miniature representation of the border effect */}
                  {isProfileBorder ? (
                    <div
                      className={`w-7 h-5 rounded-md bg-[#242430] mb-1 flex items-center justify-center text-[8px] font-bold text-zinc-400 ${
                        b.cardBorderClass || 'border border-zinc-700'
                      }`}
                    >
                      {originalIndex + 1}
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-lg bg-[#242430] mb-1 flex items-center justify-center text-[8px] font-bold text-zinc-400 ${
                        b.pfpBorderClass || 'border border-zinc-700'
                      }`}
                    >
                      {originalIndex + 1}
                    </div>
                  )}

                  <span className="text-[9px] font-extrabold text-zinc-300 truncate w-full text-center">
                    #{originalIndex + 1}
                  </span>

                  {b.isAnimated && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 border border-black" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* NAVIGATION CONTROLS (Screenshot 3, NO VIEW GRID, stepped arrows) */}
        <div className="mt-2.5 flex items-center justify-between gap-3 shrink-0">
          {/* < left arrow button */}
          <button
            type="button"
            onClick={handlePrev}
            title="Previous style"
            className="w-12 h-10 rounded-xl bg-[#1e1e26] hover:bg-[#282834] active:bg-[#181820] flex items-center justify-center text-white transition-colors cursor-pointer border border-[#2b2b38] shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white tracking-wider">
              {selectedIndex + 1} / {borders.length}
            </span>
            <span className="text-xs text-zinc-400 truncate max-w-[150px]">
              {currentBorder.name.replace(/^\d+\.\s*/, '')}
            </span>
          </div>

          {/* > right arrow button */}
          <button
            type="button"
            onClick={handleNext}
            title="Next style"
            className="w-12 h-10 rounded-xl bg-[#1e1e26] hover:bg-[#282834] active:bg-[#181820] flex items-center justify-center text-white transition-colors cursor-pointer border border-[#2b2b38] shadow-sm"
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
