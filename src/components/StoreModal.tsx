import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Layers,
  CircleDot,
  Music,
  Video,
  Play,
  Check,
  AlertCircle,
  UploadCloud,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { UserProfileState } from '../App';
import { PROFILE_BORDERS, PFP_BORDERS, getProfileBorder, getPfpBorder } from '../borders';
import { uploadToCloudinary } from '../lib/cloudinary';
import { compressBanner } from '../utils/imageCompressor';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  return match ? match[1] : null;
}

interface StoreModalProps {
  userGold: number;
  userRuby: number;
  userProfile: UserProfileState;
  onUpdateCurrency: (goldDelta: number, rubyDelta: number) => Promise<void>;
  onSaveProfile: (updates: Partial<UserProfileState>) => Promise<void>;
  onOpenBorderModal: (type: 'profileBorder' | 'pfpBorder') => void;
  onOpenMusicModal: () => void;
  onClose: () => void;
}

export default function StoreModal({
  userGold,
  userRuby,
  userProfile,
  onUpdateCurrency,
  onSaveProfile,
  onOpenBorderModal,
  onOpenMusicModal,
  onClose
}: StoreModalProps) {
  const [activeSubView, setActiveSubView] = useState<
    'main' | 'effects' | 'infoBanner' | 'bgVideo'
  >('main');

  // Info Banner State
  const [infoBannerInput, setInfoBannerInput] = useState(userProfile.infoBannerUrl || '');
  const [isUploadingInfoBanner, setIsUploadingInfoBanner] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Background Video State
  const [bgVideoInput, setBgVideoInput] = useState(userProfile.profileBackgroundVideo || '');
  const [videoError, setVideoError] = useState<string | null>(null);

  // Success & Error Feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [storeAlert, setStoreAlert] = useState<string | null>(null);

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // 1. Info Banner Upload Handler - Optimized for instant response and ultra-fast upload
  const handleInfoBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setBannerError(null);

    setIsUploadingInfoBanner(true);
    try {
      // Step A: Immediately show local preview/data URL so the user sees it in milliseconds!
      const instantPreview = await fileToDataUrl(file);
      setInfoBannerInput(instantPreview);

      // Step B: Compress static images (e.g. 5-10 MB -> ~30-40 KB) to upload rapidly
      let fileToUpload: File = file;
      if (file.type.startsWith('image/') && file.type !== 'image/gif') {
        try {
          const compResult = await compressBanner(file);
          fileToUpload = compResult.file;
        } catch (_) {}
      }

      // Step C: Fast upload with a 3.5s timeout race so it never hangs
      const uploadPromise = uploadToCloudinary(fileToUpload, 'image', 'banners');
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout')), 3500)
      );

      try {
        const res = (await Promise.race([uploadPromise, timeoutPromise])) as any;
        const url = res.secure_url || res.url;
        if (url) {
          setInfoBannerInput(url);
        }
      } catch (cloudErr) {
        // Fast local Data URL is already set and ready to use
        console.warn('Fast fallback used for info banner:', cloudErr);
      }
    } catch (err: any) {
      console.warn('Upload error:', err);
      setBannerError('Failed to process image. You can also paste an image or GIF link.');
    } finally {
      setIsUploadingInfoBanner(false);
    }
  };

  // 2. Buy & Apply Info Banner (10 Rubies)
  const handleApplyInfoBanner = async () => {
    setBannerError(null);
    const targetUrl = infoBannerInput.trim();
    if (!targetUrl) {
      setBannerError('Please enter an image or GIF URL, or upload a file.');
      return;
    }

    if (userRuby < 10) {
      setBannerError('You need at least 10 Rubies to purchase a Profile Info Banner.');
      return;
    }

    try {
      await onUpdateCurrency(0, -10);
      await onSaveProfile({ infoBannerUrl: targetUrl });
      showTemporarySuccess('Profile Info Banner equipped! (10 Rubies deducted)');
      setActiveSubView('main');
    } catch (err: any) {
      setBannerError(err?.message || 'Failed to purchase Info Banner.');
    }
  };

  const handleRemoveInfoBanner = async () => {
    try {
      await onSaveProfile({ infoBannerUrl: null });
      setInfoBannerInput('');
      showTemporarySuccess('Profile Info Banner removed.');
      setActiveSubView('main');
    } catch (err: any) {
      setBannerError(err?.message || 'Failed to remove Info Banner.');
    }
  };

  // 3. Buy & Apply Background Video (50 Rubies)
  // RULE: Background Video and Profile Music (PFM) are mutually exclusive.
  // Setting a background video removes profile music (PFM). Setting profile music removes background video.
  const handleApplyBgVideo = async () => {
    setVideoError(null);
    const targetUrl = bgVideoInput.trim();
    if (!targetUrl) {
      setVideoError('Please enter a YouTube video URL.');
      return;
    }

    const vidId = extractYoutubeVideoId(targetUrl);
    if (!vidId) {
      setVideoError('Invalid YouTube URL. Please enter a valid YouTube video link.');
      return;
    }

    if (userRuby < 50) {
      setVideoError('You need at least 50 Rubies to purchase a Profile Background Video.');
      return;
    }

    try {
      await onUpdateCurrency(0, -50);
      // Equipping background video removes profile music (PFM)! It preserves your avatar/PFP.
      await onSaveProfile({
        profileBackgroundVideo: targetUrl,
        musicTrack: null
      });
      showTemporarySuccess(
        'Background Video equipped! (50 Rubies deducted). Profile Music (PFM) was removed.'
      );
      setActiveSubView('main');
    } catch (err: any) {
      setVideoError(err?.message || 'Failed to equip Background Video.');
    }
  };

  const handleRemoveBgVideo = async () => {
    try {
      await onSaveProfile({ profileBackgroundVideo: null });
      setBgVideoInput('');
      showTemporarySuccess('Background Video removed.');
      setActiveSubView('main');
    } catch (err: any) {
      setVideoError(err?.message || 'Failed to remove Background Video.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 select-none overflow-y-auto"
    >
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Dialog Modal */}
      <div className="w-full max-w-[500px] bg-[#141418] border border-[#242430] rounded-3xl p-4 sm:p-5 shadow-2xl relative z-10 text-white animate-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[92vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-[#22222a] pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            {activeSubView !== 'main' ? (
              <button
                type="button"
                onClick={() => setActiveSubView('main')}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer mr-1 p-1 -ml-1 rounded-lg hover:bg-white/5"
                title="Back to Store"
              >
                ← Back
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide leading-tight">
                {activeSubView === 'main'
                  ? 'Store'
                  : activeSubView === 'infoBanner'
                  ? 'Profile Info Banner'
                  : activeSubView === 'bgVideo'
                  ? 'Profile Background Video'
                  : 'Profile Effects'}
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                {activeSubView === 'main' ? 'Customize your presence and profile cosmetics' : 'Store Item'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Wallet Badges */}
            <div className="flex items-center gap-2 bg-[#1b1b22] border border-[#2a2a38] px-2.5 py-1.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-1.5">
                <img
                  src="/icons/gold.svg"
                  alt="Gold"
                  onError={(e) => {
                    e.currentTarget.src = 'https://teenchatcity.com/default_images/icons/gold.svg';
                  }}
                  className="w-4 h-4 object-contain"
                />
                <span className="text-xs font-black text-amber-300 font-mono">
                  {userGold.toLocaleString()}
                </span>
              </div>
              <span className="text-zinc-600 text-xs">|</span>
              <div className="flex items-center gap-1.5">
                <img
                  src="/icons/ruby.svg"
                  alt="Ruby"
                  onError={(e) => {
                    e.currentTarget.src = 'https://teenchatcity.com/default_images/icons/ruby.svg';
                  }}
                  className="w-4 h-4 object-contain"
                />
                <span className="text-xs font-black text-rose-400 font-mono">
                  {userRuby.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Close Store"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Temporary Success Toast */}
        {successMessage && (
          <div className="mb-3 px-3 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-extrabold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Temporary Store Alert Banner */}
        {storeAlert && (
          <div className="mb-3 px-3 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{storeAlert}</span>
            </div>
            <button
              type="button"
              onClick={() => setStoreAlert(null)}
              className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 1: STORE MAIN MENU (THE 6 REQUESTED ITEMS)            */}
        {/* ========================================================= */}
        {activeSubView === 'main' && (
          <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
            {/* 1. Profile Effects (1000 Gold, Coming Soon) */}
            <div
              onClick={() => setActiveSubView('effects')}
              className="w-full flex items-center justify-between p-3.5 bg-[#191921] hover:bg-[#1e1e27] border border-[#272733] hover:border-amber-500/40 rounded-2xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white group-hover:text-amber-200 transition-colors">
                      Profile Effects
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    Special visual effects and particle animations for your profile
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div className="flex items-center gap-1 bg-[#121217] px-2.5 py-1 rounded-xl border border-amber-500/20">
                  <img
                    src="/icons/gold.svg"
                    alt="Gold"
                    onError={(e) => {
                      e.currentTarget.src = 'https://teenchatcity.com/default_images/icons/gold.svg';
                    }}
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span className="text-xs font-black text-amber-300 font-mono">1,000</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* 2. Profile Info Banner (10 Rubies) */}
            <div
              onClick={() => setActiveSubView('infoBanner')}
              className="w-full flex items-center justify-between p-3.5 bg-[#191921] hover:bg-[#1e1e27] border border-[#272733] hover:border-rose-500/40 rounded-2xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-5 h-5 text-rose-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white group-hover:text-rose-200 transition-colors">
                      Profile Info Banner
                    </span>
                    {userProfile.infoBannerUrl && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Equipped
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    Set the 2nd banner background under top banner to any image or GIF
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div className="flex items-center gap-1 bg-[#121217] px-2.5 py-1 rounded-xl border border-rose-500/20">
                  <img
                    src="/icons/ruby.svg"
                    alt="Ruby"
                    onError={(e) => {
                      e.currentTarget.src = 'https://teenchatcity.com/default_images/icons/ruby.svg';
                    }}
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span className="text-xs font-black text-rose-400 font-mono">10</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* 3. Profile Borders (1,000 Gold) */}
            <div
              onClick={() => {
                setStoreAlert(null);
                if (userGold < 1000) {
                  setStoreAlert(`You need at least 1,000 Gold to purchase Profile Borders. (Current: ${userGold.toLocaleString()} Gold)`);
                  return;
                }
                onClose();
                onOpenBorderModal('profileBorder');
              }}
              className="w-full flex items-center justify-between p-3.5 bg-[#191921] hover:bg-[#1e1e27] border border-[#272733] hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white group-hover:text-cyan-200 transition-colors">
                      Profile Borders
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate font-semibold">
                      ({getProfileBorder(userProfile.profileBorderId).name.replace(/^\d+\.\s*/, '')})
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    Animated RGB, neon, fire, & laser borders for your profile card
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div className="flex items-center gap-1 bg-[#121217] px-2.5 py-1 rounded-xl border border-amber-500/20">
                  <img
                    src="/icons/gold.svg"
                    alt="Gold"
                    onError={(e) => {
                      e.currentTarget.src = 'https://teenchatcity.com/default_images/icons/gold.svg';
                    }}
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span className="text-xs font-black text-amber-300 font-mono">1,000</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* 4. Profile Pic Borders (1,000 Gold) */}
            <div
              onClick={() => {
                setStoreAlert(null);
                if (userGold < 1000) {
                  setStoreAlert(`You need at least 1,000 Gold to purchase Profile Picture Borders. (Current: ${userGold.toLocaleString()} Gold)`);
                  return;
                }
                onClose();
                onOpenBorderModal('pfpBorder');
              }}
              className="w-full flex items-center justify-between p-3.5 bg-[#191921] hover:bg-[#1e1e27] border border-[#272733] hover:border-purple-500/40 rounded-2xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CircleDot className="w-5 h-5 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white group-hover:text-purple-200 transition-colors">
                      Profile Pic Borders
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate font-semibold">
                      ({getPfpBorder(userProfile.pfpBorderId).name.replace(/^\d+\.\s*/, '')})
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    Stylish glowing & animated borders around your avatar picture
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div className="flex items-center gap-1 bg-[#121217] px-2.5 py-1 rounded-xl border border-amber-500/20">
                  <img
                    src="/icons/gold.svg"
                    alt="Gold"
                    onError={(e) => {
                      e.currentTarget.src = 'https://teenchatcity.com/default_images/icons/gold.svg';
                    }}
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span className="text-xs font-black text-amber-300 font-mono">1,000</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* 5. Profile Music (50 Rubies) */}
            <div
              onClick={() => {
                setStoreAlert(null);
                if (userRuby < 50) {
                  setStoreAlert(`You need at least 50 Rubies to purchase Profile Music. (Current: ${userRuby.toLocaleString()} Rubies)`);
                  return;
                }
                onClose();
                onOpenMusicModal();
              }}
              className="w-full flex items-center justify-between p-3.5 bg-[#191921] hover:bg-[#1e1e27] border border-[#272733] hover:border-pink-500/40 rounded-2xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Music className="w-5 h-5 text-pink-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white group-hover:text-pink-200 transition-colors">
                      Profile Music
                    </span>
                    {userProfile.musicTrack && (
                      <span className="text-[10px] text-pink-400 font-bold truncate max-w-[110px]">
                        {userProfile.musicTrack.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    Upload & play your custom song (replaces Background Video)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div className="flex items-center gap-1 bg-[#121217] px-2.5 py-1 rounded-xl border border-rose-500/20">
                  <img
                    src="/icons/ruby.svg"
                    alt="Ruby"
                    onError={(e) => {
                      e.currentTarget.src = 'https://teenchatcity.com/default_images/icons/ruby.svg';
                    }}
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span className="text-xs font-black text-rose-400 font-mono">50</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* 6. Profile Background Video (50 Rubies) */}
            <div
              onClick={() => setActiveSubView('bgVideo')}
              className="w-full flex items-center justify-between p-3.5 bg-[#191921] hover:bg-[#1e1e27] border border-[#272733] hover:border-red-500/40 rounded-2xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Play className="w-5 h-5 text-red-500 fill-red-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white group-hover:text-red-200 transition-colors">
                      Profile Background Video
                    </span>
                    {userProfile.profileBackgroundVideo && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    Autoplay full-screen YouTube video behind profile (replaces Profile Music)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div className="flex items-center gap-1 bg-[#121217] px-2.5 py-1 rounded-xl border border-rose-500/20">
                  <img
                    src="/icons/ruby.svg"
                    alt="Ruby"
                    onError={(e) => {
                      e.currentTarget.src = 'https://teenchatcity.com/default_images/icons/ruby.svg';
                    }}
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span className="text-xs font-black text-rose-400 font-mono">50</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: PROFILE EFFECTS (COMING SOON)                     */}
        {/* ========================================================= */}
        {activeSubView === 'effects' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center animate-bounce duration-1000">
              <Sparkles className="w-8 h-8 text-amber-400" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Profile Effects</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Exciting visual animations, glowing particle auras, and sparkling badge effects are currently in development.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-[#1b1b24] border border-[#272738] px-4 py-2 rounded-2xl">
              <span className="text-xs font-extrabold text-zinc-400">Price when released:</span>
              <div className="flex items-center gap-1.5">
                <img
                  src="/icons/gold.svg"
                  alt="Gold"
                  className="w-4 h-4 object-contain"
                />
                <span className="text-sm font-black text-amber-300 font-mono">1,000 Gold</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubView('main')}
              className="mt-2 px-6 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs transition-colors cursor-pointer"
            >
              Back to Store
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: PROFILE INFO BANNER                               */}
        {/* ========================================================= */}
        {activeSubView === 'infoBanner' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="bg-[#1b1b24] border border-[#272738] p-3.5 rounded-2xl text-xs text-zinc-300 leading-relaxed">
              <span className="font-extrabold text-white">How it works:</span> Sets the background of the 2nd banner under the top banner (the section where your Info, About me, and stats are displayed) to any image or animated GIF.
            </div>

            {/* Error Message */}
            {bannerError && (
              <div className="px-3 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bannerError}</span>
              </div>
            )}

            {/* URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-zinc-300">
                Image or GIF URL:
              </label>
              <input
                type="url"
                value={infoBannerInput}
                onChange={(e) => setInfoBannerInput(e.target.value)}
                placeholder="https://example.com/aesthetic.gif"
                className="w-full bg-[#101014] border border-[#292936] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/60 transition-colors"
              />
            </div>

            {/* File Upload Option */}
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-[#1e1e28] hover:bg-[#252533] border border-[#2c2c3d] rounded-xl text-xs font-extrabold text-zinc-200 cursor-pointer transition-colors">
                {isUploadingInfoBanner ? (
                  <>
                    <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-rose-400" />
                    <span>Upload image or GIF from device</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,.gif"
                  className="hidden"
                  onChange={handleInfoBannerFileUpload}
                  disabled={isUploadingInfoBanner}
                />
              </label>

              {infoBannerInput && (
                <button
                  type="button"
                  onClick={() => setInfoBannerInput('')}
                  className="px-3 py-2.5 text-xs text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Clear input"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold text-zinc-400">Quick Aesthetic Presets:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '🌌 Nebula', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80' },
                  { label: '🌆 Synth Sunset', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80' },
                  { label: '🌃 Cyber City', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80' },
                  { label: '⚡ Neon Grid', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80' }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setBannerError(null);
                      setInfoBannerInput(preset.url);
                    }}
                    className="px-2.5 py-1 bg-[#1a1a24] hover:bg-[#252535] border border-[#2b2b3d] hover:border-rose-500/50 rounded-lg text-[11px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-extrabold text-zinc-400">Live Preview:</span>
              <div className="h-28 w-full rounded-2xl border border-[#2a2a38] overflow-hidden relative bg-[#121217] flex items-center justify-center">
                {infoBannerInput ? (
                  <>
                    <img
                      src={infoBannerInput}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={() => setBannerError('Preview failed to load. Check that image URL is valid.')}
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-3 text-center">
                      <div className="bg-[#181822]/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white">
                        Sample Info Container Overlay
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-zinc-500 font-medium">
                    No image or GIF selected yet
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleApplyInfoBanner}
                disabled={!infoBannerInput.trim() || isUploadingInfoBanner}
                className={`flex-1 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !infoBannerInput.trim() || isUploadingInfoBanner
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 active:scale-98 text-white shadow-lg shadow-rose-950/40'
                }`}
              >
                <span>Buy & Apply Info Banner</span>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-lg">
                  <img src="/icons/ruby.svg" alt="Ruby" className="w-3.5 h-3.5 object-contain" />
                  <span className="font-mono text-rose-200">10 Rubies</span>
                </div>
              </button>

              {userProfile.infoBannerUrl && (
                <button
                  type="button"
                  onClick={handleRemoveInfoBanner}
                  className="px-3 py-3 bg-red-950/40 hover:bg-red-900/60 border border-red-700/50 rounded-xl text-rose-300 font-extrabold text-xs transition-colors cursor-pointer"
                  title="Remove equipped info banner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: PROFILE BACKGROUND VIDEO                          */}
        {/* ========================================================= */}
        {activeSubView === 'bgVideo' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Critical rule callout */}
            <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl text-xs text-red-200 leading-relaxed">
              <span className="font-black text-white">Rule:</span> You cannot have Profile Music (PFM) and Profile Background Video active at the same time (only 1 or the other). Equipping this background video will remove your profile music.
            </div>

            {/* Error Message */}
            {videoError && (
              <div className="px-3 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{videoError}</span>
              </div>
            )}

            {/* YouTube URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-zinc-300">
                YouTube Video URL:
              </label>
              <input
                type="url"
                value={bgVideoInput}
                onChange={(e) => setBgVideoInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                className="w-full bg-[#101014] border border-[#292936] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/60 transition-colors"
              />
            </div>

            {/* Live Video Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-extrabold text-zinc-400">Live Preview:</span>
              <div className="h-40 w-full rounded-2xl border border-[#2a2a38] overflow-hidden relative bg-black flex items-center justify-center">
                {(() => {
                  const vidId = extractYoutubeVideoId(bgVideoInput);
                  if (!vidId) {
                    return (
                      <span className="text-xs text-zinc-500 font-medium">
                        Enter a YouTube URL above to preview
                      </span>
                    );
                  }
                  return (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${vidId}?autoplay=0&controls=1`}
                      title="YouTube Preview"
                      className="w-full h-full object-cover"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  );
                })()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleApplyBgVideo}
                disabled={!extractYoutubeVideoId(bgVideoInput)}
                className={`flex-1 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !extractYoutubeVideoId(bgVideoInput)
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500 active:scale-98 text-white shadow-lg shadow-red-950/40'
                }`}
              >
                <span>Buy & Equip Background Video</span>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-lg">
                  <img src="/icons/ruby.svg" alt="Ruby" className="w-3.5 h-3.5 object-contain" />
                  <span className="font-mono text-rose-200">50 Rubies</span>
                </div>
              </button>

              {userProfile.profileBackgroundVideo && (
                <button
                  type="button"
                  onClick={handleRemoveBgVideo}
                  className="px-3 py-3 bg-red-950/40 hover:bg-red-900/60 border border-red-700/50 rounded-xl text-rose-300 font-extrabold text-xs transition-colors cursor-pointer"
                  title="Remove equipped background video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
