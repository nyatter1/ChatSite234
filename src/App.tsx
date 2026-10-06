import React, { useState, useRef, useEffect } from 'react';
import {
  LogIn,
  SquarePen,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  SendHorizontal,
  Mic,
  MoreHorizontal,
  Mail,
  LogOut,
  Compass,
  Check,
  MessageSquare,
  Camera,
  Eye,
  Save,
  CreditCard,
  HelpCircle,
  Heart,
  Calendar,
  Users,
  User,
  Sparkles,
  Layers,
  CircleDot,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Disc,
  Wand2,
  Award,
  Palette,
  Upload,
  Radio,
  Sliders,
  Sparkle
} from 'lucide-react';
import {
  PROFILE_BORDERS,
  PFP_BORDERS,
  getProfileBorder,
  getPfpBorder
} from './borders';
import { musicSynth, PRESET_TRACKS, MusicTrack } from './audioPresets';
import {
  PROFILE_EFFECTS,
  NAMEPLATE_TITLES,
  COLLECTIBLE_BADGES,
  CHAT_THEMES,
  ProfileEffect,
  NameplateTitle,
  CollectibleBadge,
  ChatTheme
} from './customizations';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  avatarUrl?: string | null;
}

// Reusable Avatar component supporting custom uploaded avatar or default silhouette
function UserAvatar({
  avatarUrl,
  className = 'w-10 h-10',
  showOnline = false,
  pfpBorderClass
}: {
  avatarUrl?: string | null;
  className?: string;
  showOnline?: boolean;
  pfpBorderClass?: string;
}) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`w-full h-full rounded-full overflow-hidden bg-[#24252e] flex items-center justify-center transition-all ${
          pfpBorderClass || 'border border-white/10'
        }`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <svg
            viewBox="0 0 40 40"
            className="w-full h-full text-zinc-400 fill-current translate-y-0.5"
            preserveAspectRatio="none"
          >
            <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
          </svg>
        )}
      </div>
      {showOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#121215] rounded-full" />
      )}
    </div>
  );
}

export interface UserProfileData {
  avatarUrl: string | null;
  bannerUrl: string | null;
  age: string;
  gender: string;
  relationship: string;
  bio: string;
  mood: string;
  glowColor: string | null;
  profileBorderId: string | null;
  pfpBorderId: string | null;
  musicUrl: string | null;
  musicName: string;
  musicAutoplay: boolean;
  musicVolume: number;
  musicType: 'upload' | 'synthwave' | 'lofi' | 'cyberpunk' | 'ambient' | 'chiptune';
  profileEffectId: string;
  nameplateId: string;
  badgeIds: string[];
  chatThemeId: string;
}

const DEFAULT_PROFILE: UserProfileData = {
  avatarUrl: null,
  bannerUrl: null,
  age: '17',
  gender: 'MALE',
  relationship: 'Rather not say',
  bio: '',
  mood: '',
  glowColor: null,
  profileBorderId: 'pb-default',
  pfpBorderId: 'pfp-default',
  musicUrl: null,
  musicName: 'Neon Midnight Drive',
  musicAutoplay: true,
  musicVolume: 0.5,
  musicType: 'synthwave',
  profileEffectId: 'effect-none',
  nameplateId: 'title-none',
  badgeIds: ['badge-founder', 'badge-music'],
  chatThemeId: 'theme-purple'
};

export default function App() {
  // Authentication & Current User State (Loaded from localStorage)
  const [currentUser, setCurrentUser] = useState<{ username: string; gender: string } | null>(() => {
    try {
      const saved = localStorage.getItem('chatflux_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Profile Details State (Loaded from localStorage)
  const [userProfile, setUserProfile] = useState<UserProfileData>(() => {
    try {
      const saved = localStorage.getItem('chatflux_profile');
      return saved ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) } : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileViewMode, setProfileViewMode] = useState<'edit' | 'view'>('edit');
  const [publicProfileTab, setPublicProfileTab] = useState<'info' | 'aboutme'>('info');

  // Edit Profile Category Tab: [ACCOUNT] [CUSTOMISATION] [MORE]
  const [editCategoryTab, setEditCategoryTab] = useState<'account' | 'customisation' | 'more'>('account');

  // Sub-modal state for Edit actions
  const [activeEditSubModal, setActiveEditSubModal] = useState<
    | 'info'
    | 'username'
    | 'bio'
    | 'mood'
    | 'glow'
    | 'profileBorder'
    | 'pfpBorder'
    | 'music'
    | 'effect'
    | 'nameplate'
    | 'badges'
    | 'chatTheme'
    | null
  >(null);

  const [tempAge, setTempAge] = useState('17');
  const [tempGender, setTempGender] = useState('MALE');
  const [tempRelationship, setTempRelationship] = useState('Rather not say');
  const [tempUsername, setTempUsername] = useState('');
  const [tempBio, setTempBio] = useState('');
  const [tempMood, setTempMood] = useState('');
  const [tempGlowColor, setTempGlowColor] = useState<string | null>(null);
  const [tempProfileBorderIndex, setTempProfileBorderIndex] = useState(0);
  const [tempPfpBorderIndex, setTempPfpBorderIndex] = useState(0);

  // Music state
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  // Hidden file inputs for avatar & banner uploads
  const pfpInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Save currentUser and profile to localStorage automatically
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('chatflux_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('chatflux_session');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('chatflux_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  // Modal State for Landing Screen
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | 'terms' | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [birthDay, setBirthDay] = useState('Day');
  const [birthMonth, setBirthMonth] = useState('Month');
  const [birthYear, setBirthYear] = useState('Year');

  // Landing Dropdown states
  const [genderDropdownOpen, setGenderDropdownOpen] = useState(false);
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  // Chat View State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTopic, setShowTopic] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [playerPopoverOpen, setPlayerPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number }>({ top: 80, right: 330 });

  // Welcome Guide State
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState<1 | 2>(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const genderRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const playerCardRef = useRef<HTMLDivElement>(null);
  const playerPopoverRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (genderRef.current && !genderRef.current.contains(e.target as Node)) {
        setGenderDropdownOpen(false);
      }
      if (dayRef.current && !dayRef.current.contains(e.target as Node)) {
        setDayDropdownOpen(false);
      }
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) {
        setMonthDropdownOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setYearDropdownOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (
        playerCardRef.current &&
        !playerCardRef.current.contains(e.target as Node) &&
        playerPopoverRef.current &&
        !playerPopoverRef.current.contains(e.target as Node)
      ) {
        setPlayerPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (currentUser) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentUser]);

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentYear = 2026;
  const years = Array.from({ length: 87 }, (_, i) => String(currentYear - i));

  const closeModal = () => {
    setModalType(null);
    setGenderDropdownOpen(false);
    setDayDropdownOpen(false);
    setMonthDropdownOpen(false);
    setYearDropdownOpen(false);
  };

  // Sign up action
  const handleSignUp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = regUsername.trim() || 'Player';
    setCurrentUser({
      username: finalName,
      gender: gender
    });
    setUserProfile((prev) => ({
      ...prev,
      gender: gender.toUpperCase()
    }));
    setModalType(null);
    setGuideStep(1);
    setShowGuide(true);
  };

  // Login action
  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = loginEmail.trim() || 'Player';
    setCurrentUser({
      username: finalName,
      gender: 'Male'
    });
    setModalType(null);
    setGuideStep(1);
    setShowGuide(true);
  };

  // Send message in chat
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: currentUser.username,
      text: inputText.trim(),
      timestamp: 'Just now',
      avatarUrl: userProfile.avatarUrl
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
  };

  // Avatar and Banner file handlers
  const handlePfpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUserProfile((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUserProfile((prev) => ({ ...prev, bannerUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Music handlers
  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const reader = new FileReader();
      reader.onload = () => {
        setUserProfile((prev) => ({
          ...prev,
          musicUrl: reader.result as string,
          musicName: fileName,
          musicType: 'upload'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const playProfileMusic = () => {
    if (userProfile.musicType === 'upload' && userProfile.musicUrl) {
      if (audioElementRef.current) {
        audioElementRef.current.volume = userProfile.musicVolume;
        audioElementRef.current.play().catch(() => {});
        setIsMusicPlaying(true);
      }
    } else {
      musicSynth.setVolume(userProfile.musicVolume);
      musicSynth.playTrack(
        (userProfile.musicType === 'upload' ? 'synthwave' : userProfile.musicType) as any
      );
      setIsMusicPlaying(true);
    }
  };

  const stopProfileMusic = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    musicSynth.stop();
    setIsMusicPlaying(false);
  };

  // Autoplay music when opening profile in view mode
  useEffect(() => {
    if (profileModalOpen && profileViewMode === 'view' && userProfile.musicAutoplay) {
      playProfileMusic();
    } else {
      stopProfileMusic();
    }
    return () => {
      stopProfileMusic();
    };
  }, [profileModalOpen, profileViewMode]);

  // Open Edit Sub-Modal with prefilled values
  const openEditSubModal = (
    type:
      | 'info'
      | 'username'
      | 'bio'
      | 'mood'
      | 'glow'
      | 'profileBorder'
      | 'pfpBorder'
      | 'music'
      | 'effect'
      | 'nameplate'
      | 'badges'
      | 'chatTheme'
  ) => {
    if (type === 'info') {
      setTempAge(userProfile.age);
      setTempGender(userProfile.gender);
      setTempRelationship(userProfile.relationship);
    } else if (type === 'username') {
      setTempUsername(currentUser?.username || '');
    } else if (type === 'bio') {
      setTempBio(userProfile.bio);
    } else if (type === 'mood') {
      setTempMood(userProfile.mood);
    } else if (type === 'glow') {
      setTempGlowColor(userProfile.glowColor);
    } else if (type === 'profileBorder') {
      const idx = PROFILE_BORDERS.findIndex((b) => b.id === userProfile.profileBorderId);
      setTempProfileBorderIndex(idx >= 0 ? idx : 0);
    } else if (type === 'pfpBorder') {
      const idx = PFP_BORDERS.findIndex((b) => b.id === userProfile.pfpBorderId);
      setTempPfpBorderIndex(idx >= 0 ? idx : 0);
    }
    setActiveEditSubModal(type);
  };

  // ==========================================
  // VIEW 1: CHAT UI (After Sign up)
  // ==========================================
  if (currentUser) {
    return (
      <div className="h-screen w-screen bg-[#111114] text-white flex flex-col font-sans overflow-hidden select-none relative">
        {/* TOP NAVBAR */}
        <header className="h-14 bg-[#141418] border-b border-[#202026] flex items-center justify-between px-4 z-20 shrink-0">
          {/* Left: Hamburger menu only */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
              className="text-zinc-300 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Right: Default PFP or Uploaded PFP with green online status dot */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="User profile"
              className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-cyan-500/40 transition-all cursor-pointer"
            >
              <UserAvatar
                avatarUrl={userProfile.avatarUrl}
                className="w-8 h-8"
                showOnline={true}
                pfpBorderClass={getPfpBorder(userProfile.pfpBorderId).pfpBorderClass}
              />
            </button>

            {/* Profile Dropdown Menu (Matching Image 1 with our options) */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#181820] border border-[#282834] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* Header with Avatar, Username, and Green Checkmark (Image 1) */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#24252e] border border-white/10 shrink-0">
                      {userProfile.avatarUrl ? (
                        <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <svg viewBox="0 0 40 40" className="w-full h-full text-zinc-400 fill-current translate-y-0.5">
                          <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {currentUser.username}
                      </p>
                    </div>
                  </div>

                  {/* Green Checkmark online indicator */}
                  <div className="w-5 h-5 rounded-full bg-[#52c41a] text-white flex items-center justify-center shrink-0 shadow-sm ml-2">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                <div className="border-t border-[#252530]" />

                {/* Our Options */}
                <div className="p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setProfileViewMode('edit');
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <SquarePen className="w-4 h-4 text-cyan-400" />
                    <span>Edit profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setProfileViewMode('view');
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>View profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setGuideStep(1);
                      setShowGuide(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>Site guide</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUser(null);
                      setShowProfileMenu(false);
                      setShowGuide(false);
                      setProfileModalOpen(false);
                      setPlayerPopoverOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* MAIN BODY: Chat Area + Right Sidebar */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* CHAT AREA */}
          <section className="flex-1 flex flex-col bg-[#111114] overflow-hidden relative">
            {/* MESSAGES LIST (Cleared, No Fake Messages) */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 pointer-events-none select-none">
                  <div className="w-16 h-16 rounded-full bg-[#17171d] border border-zinc-800 flex items-center justify-center mb-3">
                    <UserAvatar avatarUrl={userProfile.avatarUrl} className="w-10 h-10 opacity-40" />
                  </div>
                  <p className="text-sm font-medium text-zinc-500">The chat is clear.</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Send a message below to start chatting as{' '}
                    <span className="text-cyan-400 font-semibold">{currentUser.username}</span>
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3.5 group hover:bg-white/[0.02] -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <UserAvatar
                      avatarUrl={msg.avatarUrl || userProfile.avatarUrl}
                      className="w-10 h-10 mt-0.5"
                      pfpBorderClass={
                        msg.sender === currentUser.username
                          ? getPfpBorder(userProfile.pfpBorderId).pfpBorderClass
                          : undefined
                      }
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-sm sm:text-base tracking-wide">
                            {msg.sender}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                          <span>{msg.timestamp}</span>
                          <button
                            type="button"
                            aria-label="Message options"
                            className="text-zinc-500 hover:text-white p-0.5 rounded cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div
                        className={`mt-1 p-2.5 px-3 rounded-xl max-w-2xl border ${
                          msg.sender === currentUser.username
                            ? (CHAT_THEMES.find((t) => t.id === userProfile.chatThemeId)?.bubbleClass || 'bg-[#181820] border-[#262632]')
                            : 'bg-[#181820] border-[#262632]'
                        }`}
                      >
                        <p className="text-white font-medium text-sm sm:text-base break-words leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* TOPIC BANNER */}
            {showTopic && (
              <div className="mx-4 mb-2 bg-[#0d231b] border border-[#14422e] rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-white mr-2">Topic</span>
                    <span className="text-[#6ee7b7] font-normal">
                      invite 10 users for moderator rank
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTopic(false)}
                  aria-label="Dismiss topic"
                  className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* CHAT INPUT BAR */}
            <div className="p-4 pt-1 bg-[#111114]">
              <form
                onSubmit={handleSendMessage}
                className="bg-[#18181e] border border-[#24242d] rounded-2xl px-4 py-2.5 flex items-center gap-2 focus-within:border-purple-500/70 transition-colors shadow-lg"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type here..."
                  className="flex-1 bg-transparent text-white text-sm sm:text-base placeholder-zinc-500 focus:outline-none px-1"
                />

                <button
                  type="button"
                  aria-label="Voice input"
                  className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                >
                  <Mic className="w-5 h-5" />
                </button>

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  aria-label="Send message"
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    inputText.trim()
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                      : 'text-zinc-600'
                  }`}
                >
                  <SendHorizontal className="w-4 h-4" />
                </button>
              </form>
            </div>
          </section>

          {/* RIGHT SIDEBAR: ONLINE PLAYERS PANEL */}
          {sidebarOpen && (
            <aside className="w-72 sm:w-80 bg-[#141418] border-l border-[#202026] flex flex-col shrink-0 z-10 animate-in slide-in-from-right duration-150">
              <div className="h-12 border-b border-[#202026] flex items-center justify-between px-3">
                <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase pl-1">
                  Users
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                  className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 py-3 flex items-center gap-2">
                <span className="font-bold text-white text-sm">Online</span>
                <span className="bg-[#00a8e8] text-white text-xs font-bold px-2 py-0.5 rounded-full leading-none">
                  1
                </span>
              </div>

              {/* USER LIST (Clicking card opens options on the left - Image 2) */}
              <div className="flex-1 overflow-y-auto px-3 space-y-2">
                <div
                  ref={playerCardRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const popoverWidth = 240;
                    const targetRight = window.innerWidth - rect.left + 14;
                    setPopoverPos({
                      top: Math.max(16, Math.min(window.innerHeight - 280, rect.top - 8)),
                      right: Math.min(window.innerWidth - popoverWidth - 16, targetRight)
                    });
                    setPlayerPopoverOpen((prev) => !prev);
                  }}
                  style={
                    userProfile.glowColor
                      ? {
                          borderColor: userProfile.glowColor,
                          boxShadow: `0 0 16px ${userProfile.glowColor}99, inset 0 0 6px ${userProfile.glowColor}33`
                        }
                      : undefined
                  }
                  className={`bg-[#18181f] border ${
                    userProfile.glowColor ? '' : 'border-[#2b2b38] hover:border-cyan-500/40'
                  } rounded-xl p-2.5 flex items-center gap-3 transition-all cursor-pointer group`}
                >
                  <UserAvatar
                    avatarUrl={userProfile.avatarUrl}
                    className="w-10 h-10"
                    showOnline={true}
                    pfpBorderClass={getPfpBorder(userProfile.pfpBorderId).pfpBorderClass}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-white text-sm truncate group-hover:text-cyan-300 transition-colors block">
                      {currentUser.username}
                    </span>
                    <p className="text-xs text-zinc-400 truncate">
                      {userProfile.mood ? userProfile.mood : 'Online'}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* Options popover shown on the left of the player (Image 2) - Entire top bit is banner */}
          {playerPopoverOpen && (
            <div
              ref={playerPopoverRef}
              style={{ top: `${popoverPos.top}px`, right: `${popoverPos.right}px` }}
              className="fixed w-64 bg-[#141419] border border-[#282834] rounded-2xl shadow-2xl overflow-hidden z-50 text-center animate-in fade-in zoom-in-95 duration-150 flex flex-col"
            >
              {/* Entire Top Bit covered by Banner */}
              <div className="relative w-full overflow-hidden flex flex-col items-center pt-5 pb-4 px-4 text-center shrink-0">
                {/* Banner background covering this whole top section */}
                {userProfile.bannerUrl ? (
                  <img
                    src={userProfile.bannerUrl}
                    alt="Banner"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#282836] via-[#1e1e27] to-[#15151c]" />
                )}

                {/* Subtle gradient scrim overlay for contrast */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/70 pointer-events-none" />

                {/* Centered Circular Avatar with custom border */}
                <div
                  className={`w-20 h-20 rounded-full overflow-hidden bg-[#24252e] shadow-2xl relative shrink-0 z-10 transition-all ${
                    getPfpBorder(userProfile.pfpBorderId).pfpBorderClass || 'border-2 border-white'
                  }`}
                >
                  {userProfile.avatarUrl ? (
                    <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 40 40" className="w-full h-full text-zinc-400 fill-current translate-y-1">
                      <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                    </svg>
                  )}
                </div>

                {/* User Details over the banner (without UK flag, without star, without likes) */}
                <div className="relative z-10 mt-2.5">
                  <h3 className="font-extrabold text-white text-base tracking-wide drop-shadow-md truncate">
                    {currentUser.username}
                  </h3>
                  <p className="text-xs text-zinc-300 font-medium mt-0.5 drop-shadow-sm truncate">
                    {userProfile.age} years · {userProfile.gender}
                  </p>
                </div>
              </div>

              {/* Actions Section: View profile & Edit */}
              <div className="p-3 pt-2.5 border-t border-[#23232c] bg-[#121216] space-y-1.5">
                {/* 1. View profile button (views profile) */}
                <button
                  type="button"
                  onClick={() => {
                    setPlayerPopoverOpen(false);
                    setProfileViewMode('view');
                    setProfileModalOpen(true);
                  }}
                  className="w-full bg-[#1e1e26] hover:bg-[#282834] text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-sm"
                >
                  <User className="w-4 h-4 text-zinc-300" />
                  <span>View profile</span>
                </button>

                {/* 2. Edit button (edits profile) */}
                <button
                  type="button"
                  onClick={() => {
                    setPlayerPopoverOpen(false);
                    setProfileViewMode('edit');
                    setProfileModalOpen(true);
                  }}
                  className="w-full hover:bg-[#1e1e26] text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
                >
                  <SquarePen className="w-4 h-4 text-cyan-400" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* PROFILE MODAL (EDIT & VIEW MODES)                    */}
        {/* ==================================================== */}
        {profileModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          >
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={bannerInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleBannerUpload}
            />
            <input
              type="file"
              ref={pfpInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePfpUpload}
            />

            <div
              className={`w-full max-w-[480px] max-h-[92vh] bg-[#141418] rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white animate-in zoom-in-95 duration-150 relative transition-all ${
                profileViewMode === 'view'
                  ? (getProfileBorder(userProfile.profileBorderId).cardBorderClass || 'border border-[#252530]')
                  : 'border border-[#252530]'
              }`}
            >
              {/* BANNER AREA */}
              <div className="h-36 sm:h-40 w-full relative bg-gradient-to-r from-[#1c1c24] via-[#242430] to-[#1c1c24] shrink-0 overflow-hidden">
                {userProfile.bannerUrl ? (
                  <img
                    src={userProfile.bannerUrl}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full opacity-40 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                )}

                {/* BANNER CONTROLS (Top Right) */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                  {/* In Edit mode: Pill with X and Camera for banner */}
                  {profileViewMode === 'edit' && (
                    <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-3 border border-white/10 shadow-lg">
                      <button
                        type="button"
                        onClick={() => setUserProfile((p) => ({ ...p, bannerUrl: null }))}
                        title="Delete banner"
                        className="text-white hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        title="Upload banner"
                        className="text-white hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Mode switcher: Eye (view) or SquarePen (edit) */}
                  {profileViewMode === 'edit' ? (
                    <button
                      type="button"
                      onClick={() => setProfileViewMode('view')}
                      title="View public profile"
                      className="bg-black/60 hover:bg-black/80 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:text-cyan-300 transition-colors cursor-pointer shadow-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setProfileViewMode('edit')}
                      title="Edit profile"
                      className="bg-black/60 hover:bg-black/80 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:text-cyan-300 transition-colors cursor-pointer shadow-lg"
                    >
                      <SquarePen className="w-4 h-4" />
                    </button>
                  )}

                  {/* Close modal button */}
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(false)}
                    title="Close"
                    className="bg-black/60 hover:bg-black/80 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:text-rose-400 transition-colors cursor-pointer shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* AVATAR + USERNAME SECTION */}
              <div className="px-5 pb-3 flex items-end gap-3.5 relative z-10 shrink-0">
                {/* PFP Box (Rounded square with selected PFP border) */}
                <div
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#1f1f26] relative shrink-0 shadow-2xl -mt-12 sm:-mt-14 transition-all ${
                    getPfpBorder(userProfile.pfpBorderId).pfpBorderClass || 'border-2 border-white/90'
                  }`}
                >
                  {userProfile.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt="PFP"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#252530]">
                      <svg
                        viewBox="0 0 40 40"
                        className="w-14 h-14 text-zinc-400 fill-current translate-y-1"
                      >
                        <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                      </svg>
                    </div>
                  )}

                  {/* Edit mode: controls inside PFP (Delete X and Upload Camera) */}
                  {profileViewMode === 'edit' && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-xs py-1.5 px-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setUserProfile((p) => ({ ...p, avatarUrl: null }))}
                        title="Delete avatar"
                        className="text-white hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => pfpInputRef.current?.click()}
                        title="Upload avatar"
                        className="text-white hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* View mode: online status indicator */}
                  {profileViewMode === 'view' && (
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-[#70c91f] border-2 border-white rounded-full shadow-md" />
                  )}
                </div>

                {/* Username, Title, Badges & Mood */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate">
                      {currentUser.username}
                    </h2>
                    {/* Nameplate Title */}
                    {userProfile.nameplateId && userProfile.nameplateId !== 'title-none' && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md shrink-0 ${
                          NAMEPLATE_TITLES.find((t) => t.id === userProfile.nameplateId)?.styleClass || ''
                        }`}
                      >
                        {NAMEPLATE_TITLES.find((t) => t.id === userProfile.nameplateId)?.title}
                      </span>
                    )}
                  </div>

                  {/* Badges list */}
                  {userProfile.badgeIds && userProfile.badgeIds.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {userProfile.badgeIds.map((bId) => {
                        const b = COLLECTIBLE_BADGES.find((x) => x.id === bId);
                        return b ? (
                          <span
                            key={b.id}
                            title={b.name}
                            className="w-5 h-5 rounded-md bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-xs cursor-default shadow-xs"
                          >
                            {b.emoji}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}

                  {userProfile.mood ? (
                    <p className="text-xs text-purple-300 font-medium truncate mt-1">
                      {userProfile.mood}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 truncate mt-1">Online</p>
                  )}
                </div>
              </div>

              {/* Hidden audio element for uploaded MP3 files */}
              <audio ref={audioElementRef} src={userProfile.musicUrl || undefined} loop />

              {/* ========================================================= */}
              {/* MODE 1: EDIT PROFILE                                      */}
              {/* Categories: [ACCOUNT] [CUSTOMISATION] [MORE]              */}
              {/* ========================================================= */}
              {profileViewMode === 'edit' && (
                <div className="p-4 sm:p-5 pt-2 overflow-y-auto flex-1 flex flex-col space-y-3">
                  {/* Category Tabs: [ACCOUNT] [CUSTOMISATION] [MORE] */}
                  <div className="flex items-center gap-1.5 p-1 bg-[#181820] border border-[#262632] rounded-2xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditCategoryTab('account')}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
                        editCategoryTab === 'account'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCategoryTab('customisation')}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
                        editCategoryTab === 'customisation'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Customisation
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCategoryTab('more')}
                      className={`flex-1 py-2 px-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        editCategoryTab === 'more'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>More</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-full hidden sm:inline">
                        Soon
                      </span>
                    </button>
                  </div>

                  {/* TAB 1: ACCOUNT */}
                  {editCategoryTab === 'account' && (
                    <div className="space-y-2.5 animate-in fade-in duration-150">
                      {/* 1. Edit info */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('info')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                          Edit info
                        </span>
                      </button>

                      {/* 2. Edit about me */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('bio')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                          Edit about me
                        </span>
                      </button>

                      {/* 3. Edit username */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('username')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <SquarePen className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                          Edit username
                        </span>
                      </button>

                      {/* 4. Edit mood */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('mood')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <Heart className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                          Edit mood
                        </span>
                      </button>
                    </div>
                  )}

                  {/* TAB 2: CUSTOMISATION */}
                  {editCategoryTab === 'customisation' && (
                    <div className="space-y-2.5 animate-in fade-in duration-150">
                      {/* 1. Profile Music (NEW!) */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('music')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-purple-500/30 hover:border-purple-500/60 rounded-xl px-4 py-3 flex items-center gap-3 transition-all cursor-pointer text-left group shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:text-purple-200 transition-colors">
                          <Music className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div>
                            <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors block">
                              Profile music
                            </span>
                            <span className="text-[11px] text-purple-400 font-medium truncate block max-w-[140px]">
                              {userProfile.musicName || 'No music set'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {userProfile.musicAutoplay ? 'Autoplay On' : 'Manual'}
                          </span>
                        </div>
                      </button>

                      {/* 2. User glow */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('glow')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                            User glow
                          </span>
                          {userProfile.glowColor ? (
                            <span
                              className="w-4 h-4 rounded-full border border-white/60 shadow-sm shrink-0"
                              style={{
                                backgroundColor: userProfile.glowColor,
                                boxShadow: `0 0 8px ${userProfile.glowColor}`
                              }}
                            />
                          ) : (
                            <span className="text-xs text-zinc-500 font-normal">None</span>
                          )}
                        </div>
                      </button>

                      {/* 3. Profile borders */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('profileBorder')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                            Profile borders
                          </span>
                          <span className="text-xs text-zinc-400 font-medium truncate max-w-[130px]">
                            {getProfileBorder(userProfile.profileBorderId).name.replace(/^\d+\.\s*/, '')}
                          </span>
                        </div>
                      </button>

                      {/* 4. Profile picture borders */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('pfpBorder')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <CircleDot className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                            Profile picture borders
                          </span>
                          <span className="text-xs text-zinc-400 font-medium truncate max-w-[130px]">
                            {getPfpBorder(userProfile.pfpBorderId).name.replace(/^\d+\.\s*/, '')}
                          </span>
                        </div>
                      </button>

                      {/* 5. Profile Theme & Particle FX */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('effect')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <Wand2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                            Profile theme FX
                          </span>
                          <span className="text-xs text-purple-400 font-medium truncate max-w-[130px]">
                            {PROFILE_EFFECTS.find((e) => e.id === userProfile.profileEffectId)?.name || 'None'}
                          </span>
                        </div>
                      </button>

                      {/* 6. Nameplate Title Tag */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('nameplate')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <Sparkle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                            Nameplate title
                          </span>
                          <span className="text-xs text-purple-400 font-medium truncate max-w-[130px]">
                            {NAMEPLATE_TITLES.find((t) => t.id === userProfile.nameplateId)?.title || 'None'}
                          </span>
                        </div>
                      </button>

                      {/* 7. Collectible Badges */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('badges')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <Award className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                            Profile badge pins
                          </span>
                          <div className="flex items-center gap-1">
                            {userProfile.badgeIds.map((bId) => {
                              const b = COLLECTIBLE_BADGES.find((x) => x.id === bId);
                              return b ? <span key={b.id} className="text-xs">{b.emoji}</span> : null;
                            })}
                          </div>
                        </div>
                      </button>

                      {/* 8. Chat bubble theme */}
                      <button
                        type="button"
                        onClick={() => openEditSubModal('chatTheme')}
                        className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-purple-400 transition-colors">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                            Chat bubble theme
                          </span>
                          <span className="text-xs text-zinc-400 font-medium truncate max-w-[130px]">
                            {CHAT_THEMES.find((t) => t.id === userProfile.chatThemeId)?.name || 'Classic'}
                          </span>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* TAB 3: MORE COMING SOON */}
                  {editCategoryTab === 'more' && (
                    <div className="space-y-3 animate-in fade-in duration-150 py-2">
                      <div className="bg-gradient-to-br from-purple-950/40 via-[#181822] to-indigo-950/30 border border-purple-500/30 rounded-2xl p-4 text-center">
                        <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-pulse" />
                        <h4 className="font-extrabold text-white text-base">More Coming Soon!</h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          We are actively developing even more epic customization features for your Chatflux profile.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-left">
                        {[
                          { title: 'Animated Stickers', icon: '🎨', desc: 'Custom GIF pins on card' },
                          { title: 'Voice Status Notes', icon: '🎙️', desc: '10s audio voice snippet' },
                          { title: '3D Spatial Avatars', icon: '🔮', desc: 'Interactive 3D profile' },
                          { title: 'Sound FX Pack', icon: '🔊', desc: 'Custom chat sound effects' },
                          { title: 'Profile Mini-Games', icon: '🎮', desc: 'Arcade leaderboard card' },
                          { title: 'Custom Shader FX', icon: '⚡', desc: 'WebGL fluid card effects' }
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="bg-[#181820] border border-[#262632] rounded-xl p-3 opacity-80 hover:opacity-100 transition-opacity"
                          >
                            <span className="text-lg block mb-1">{item.icon}</span>
                            <span className="text-xs font-bold text-white block">{item.title}</span>
                            <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">{item.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* MODE 2: PUBLIC VIEW (How everyone else sees your profile) */}
              {/* Only Info and About me tabs (No friends, gifts, etc.)    */}
              {/* ========================================================= */}
              {profileViewMode === 'view' && (
                <div className="p-4 sm:p-5 pt-2 overflow-y-auto flex-1 flex flex-col relative">
                  {/* Theme Effect Overlay */}
                  {userProfile.profileEffectId !== 'effect-none' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
                      {userProfile.profileEffectId === 'effect-stars' && (
                        <div className="w-full h-full bg-[radial-gradient(#c084fc_1.5px,transparent_1.5px)] [background-size:18px_18px] animate-pulse" />
                      )}
                      {userProfile.profileEffectId === 'effect-sakura' && (
                        <div className="w-full h-full bg-[radial-gradient(#f472b6_2px,transparent_2px)] [background-size:24px_24px]" />
                      )}
                      {userProfile.profileEffectId === 'effect-hearts' && (
                        <div className="w-full h-full bg-[radial-gradient(#ec4899_2px,transparent_2px)] [background-size:28px_28px]" />
                      )}
                      {userProfile.profileEffectId === 'effect-cybergrid' && (
                        <div className="w-full h-full bg-[linear-gradient(to_right,#8b5cf615_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf615_1px,transparent_1px)] [background-size:20px_20px]" />
                      )}
                      {userProfile.profileEffectId === 'effect-gold' && (
                        <div className="w-full h-full bg-[radial-gradient(#f59e0b_2px,transparent_2px)] [background-size:22px_22px] animate-pulse" />
                      )}
                      {userProfile.profileEffectId === 'effect-fire' && (
                        <div className="w-full h-full bg-[radial-gradient(#ef4444_2px,transparent_2px)] [background-size:20px_20px]" />
                      )}
                      {userProfile.profileEffectId === 'effect-matrix' && (
                        <div className="w-full h-full bg-[radial-gradient(#10b981_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
                      )}
                    </div>
                  )}

                  {/* Profile Music Player Widget in View Mode */}
                  <div className="relative z-10 mb-3.5 bg-gradient-to-r from-purple-950/50 via-[#191924] to-purple-950/40 border border-purple-500/30 rounded-2xl p-2.5 px-3.5 flex items-center justify-between shadow-lg shadow-purple-950/30 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full bg-purple-900/60 border border-purple-400/40 flex items-center justify-center shrink-0 ${
                          isMusicPlaying ? 'animate-vinyl' : ''
                        }`}
                      >
                        <Disc className="w-4 h-4 text-purple-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[180px]">
                            {userProfile.musicName || 'Profile Music'}
                          </span>
                          {/* Animated Bouncing Equalizer Bars */}
                          {isMusicPlaying && (
                            <div className="flex items-end gap-0.5 h-3 shrink-0">
                              <span className="w-0.5 bg-purple-400 rounded-full eq-bar-1" />
                              <span className="w-0.5 bg-purple-300 rounded-full eq-bar-2" />
                              <span className="w-0.5 bg-pink-400 rounded-full eq-bar-3" />
                              <span className="w-0.5 bg-purple-400 rounded-full eq-bar-4" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-purple-300/80 font-semibold block">
                          {isMusicPlaying ? 'Background music playing' : 'Music paused'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (isMusicPlaying) stopProfileMusic();
                          else playProfileMusic();
                        }}
                        className="w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md shadow-purple-600/30"
                        title={isMusicPlaying ? 'Pause music' : 'Play music'}
                      >
                        {isMusicPlaying ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Two Tabs: Info and About me */}
                  <div className="relative z-10 flex items-center gap-2 border-b border-[#22222a] pb-3 mb-4 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPublicProfileTab('info')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        publicProfileTab === 'info'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublicProfileTab('aboutme')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        publicProfileTab === 'aboutme'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      About me
                    </button>
                  </div>

                  {/* Tab 1: Info */}
                  {publicProfileTab === 'info' && (
                    <div className="space-y-2.5">
                      {/* Age */}
                      <div className="bg-[#181820] border border-[#242430] rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-zinc-300 text-sm font-semibold">
                          <Calendar className="w-4 h-4 text-zinc-400" />
                          <span>Age</span>
                        </div>
                        <span className="text-sm font-bold text-white">
                          {userProfile.age} years old
                        </span>
                      </div>

                      {/* Gender */}
                      <div className="bg-[#181820] border border-[#242430] rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-zinc-300 text-sm font-semibold">
                          <Users className="w-4 h-4 text-zinc-400" />
                          <span>Gender</span>
                        </div>
                        <span className="text-sm font-bold text-white">
                          {userProfile.gender}
                        </span>
                      </div>

                      {/* Relationship */}
                      <div className="bg-[#181820] border border-[#242430] rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-zinc-300 text-sm font-semibold">
                          <Heart className="w-4 h-4 text-zinc-400" />
                          <span>Relationship</span>
                        </div>
                        <span className="text-sm font-bold text-white">
                          {userProfile.relationship}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: About me */}
                  {publicProfileTab === 'aboutme' && (
                    <div className="bg-[#181820] border border-[#242430] rounded-2xl p-4 min-h-[120px] flex-1">
                      {userProfile.bio ? (
                        <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                          {userProfile.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-500 italic">
                          No about me info provided yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* SUB-MODALS FOR EDIT ACTIONS (Matching Screenshots 2, 3, 4, 5) */}
              {/* ========================================================= */}
              {activeEditSubModal && (
                <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
                  {/* 1. Edit info sub-modal (Screenshot 2) */}
                  {activeEditSubModal === 'info' && (
                    <div className="w-full max-w-[360px] bg-[#17171d] border border-[#262632] rounded-2xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                          Edit Info
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3.5">
                        {/* Age */}
                        <div>
                          <label className="block text-xs font-bold text-white mb-1.5">
                            Age
                          </label>
                          <select
                            value={tempAge}
                            onChange={(e) => setTempAge(e.target.value)}
                            className="w-full bg-[#1f1f26] border border-[#2d2d38] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            {Array.from({ length: 80 }, (_, i) => String(i + 13)).map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Gender */}
                        <div>
                          <label className="block text-xs font-bold text-white mb-1.5">
                            Gender
                          </label>
                          <select
                            value={tempGender}
                            onChange={(e) => setTempGender(e.target.value)}
                            className="w-full bg-[#1f1f26] border border-[#2d2d38] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <option value="MALE">MALE</option>
                            <option value="FEMALE">FEMALE</option>
                            <option value="OTHER">OTHER</option>
                          </select>
                        </div>

                        {/* Relationship */}
                        <div>
                          <label className="block text-xs font-bold text-white mb-1.5">
                            Relationship
                          </label>
                          <select
                            value={tempRelationship}
                            onChange={(e) => setTempRelationship(e.target.value)}
                            className="w-full bg-[#1f1f26] border border-[#2d2d38] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <option value="Rather not say">Rather not say</option>
                            <option value="Single">Single</option>
                            <option value="Taken">Taken</option>
                            <option value="In a relationship">In a relationship</option>
                            <option value="Married">Married</option>
                          </select>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUserProfile((p) => ({
                                ...p,
                                age: tempAge,
                                gender: tempGender,
                                relationship: tempRelationship
                              }));
                              setActiveEditSubModal(null);
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shadow-lg shadow-purple-600/30"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Edit about me (bio) sub-modal (Screenshot 3) */}
                  {activeEditSubModal === 'bio' && (
                    <div className="w-full max-w-[380px] bg-[#17171d] border border-[#262632] rounded-2xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-white">About me</h3>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <textarea
                          rows={5}
                          value={tempBio}
                          onChange={(e) => setTempBio(e.target.value)}
                          placeholder="Tell everyone about yourself..."
                          className="w-full bg-[#1f1f26] border border-[#2d2d38] rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
                        />

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setUserProfile((p) => ({ ...p, bio: tempBio }));
                              setActiveEditSubModal(null);
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shadow-lg shadow-purple-600/30"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Edit username sub-modal (Screenshot 4) */}
                  {activeEditSubModal === 'username' && (
                    <div className="w-full max-w-[360px] bg-[#17171d] border border-[#262632] rounded-2xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-white">Username</h3>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <input
                          type="text"
                          value={tempUsername}
                          onChange={(e) => setTempUsername(e.target.value)}
                          placeholder="Username"
                          className="w-full bg-[#1f1f26] border border-[#2d2d38] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (tempUsername.trim()) {
                                setCurrentUser((u) => (u ? { ...u, username: tempUsername.trim() } : u));
                              }
                              setActiveEditSubModal(null);
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-600/30"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Edit mood sub-modal (Screenshot 5) */}
                  {activeEditSubModal === 'mood' && (
                    <div className="w-full max-w-[360px] bg-[#17171d] border border-[#262632] rounded-2xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-white">Mood</h3>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <input
                          type="text"
                          value={tempMood}
                          onChange={(e) => setTempMood(e.target.value)}
                          placeholder="What's your current mood?"
                          className="w-full bg-[#1f1f26] border border-[#2d2d38] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setUserProfile((p) => ({ ...p, mood: tempMood.trim() }));
                              setActiveEditSubModal(null);
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-600/30"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. User glow sub-modal */}
                  {activeEditSubModal === 'glow' && (
                    <div className="w-full max-w-[380px] bg-[#17171d] border border-[#262632] rounded-2xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <h3 className="text-base font-bold text-white">User glow</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                        Click a color, click save, and the outline of your user card in players online will change to that glow.
                      </p>

                      {/* Live preview of the player card */}
                      <div className="mb-3.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                          Card Outline Preview
                        </span>
                        <div
                          style={
                            tempGlowColor
                              ? {
                                  borderColor: tempGlowColor,
                                  boxShadow: `0 0 16px ${tempGlowColor}99, inset 0 0 6px ${tempGlowColor}33`
                                }
                              : undefined
                          }
                          className={`bg-[#18181f] border ${
                            tempGlowColor ? '' : 'border-[#2b2b38]'
                          } rounded-xl p-2.5 flex items-center gap-3 transition-all`}
                        >
                          <UserAvatar
                            avatarUrl={userProfile.avatarUrl}
                            className="w-10 h-10"
                            showOnline={true}
                            pfpBorderClass={getPfpBorder(userProfile.pfpBorderId).pfpBorderClass}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-white text-sm truncate block">
                              {currentUser?.username || 'Player'}
                            </span>
                            <p className="text-xs text-zinc-400 truncate">
                              {userProfile.mood ? userProfile.mood : 'Online'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Glow Color Swatches */}
                      <div className="space-y-2 mb-4">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                          Choose Color
                        </span>
                        <div className="grid grid-cols-6 gap-2">
                          {/* None option */}
                          <button
                            type="button"
                            onClick={() => setTempGlowColor(null)}
                            title="No glow"
                            className={`h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                              tempGlowColor === null
                                ? 'border-purple-400 bg-white/10 ring-2 ring-purple-400/50'
                                : 'border-[#2b2b38] bg-[#1a1a22] hover:border-zinc-500'
                            }`}
                          >
                            <span className="text-[10px] font-bold text-zinc-400">None</span>
                          </button>

                          {[
                            { name: 'Purple', color: '#a855f7' },
                            { name: 'Cyan', color: '#00f0ff' },
                            { name: 'Pink', color: '#ec4899' },
                            { name: 'Emerald', color: '#10b981' },
                            { name: 'Blue', color: '#3b82f6' },
                            { name: 'Gold', color: '#f59e0b' },
                            { name: 'Red', color: '#ef4444' },
                            { name: 'Orange', color: '#f97316' },
                            { name: 'Lime', color: '#84cc16' },
                            { name: 'Magenta', color: '#d946ef' },
                            { name: 'White', color: '#ffffff' }
                          ].map((item) => (
                            <button
                              key={item.color}
                              type="button"
                              onClick={() => setTempGlowColor(item.color)}
                              title={item.name}
                              style={{
                                backgroundColor: item.color,
                                boxShadow:
                                  tempGlowColor === item.color
                                    ? `0 0 12px ${item.color}`
                                    : undefined
                              }}
                              className={`h-9 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                                tempGlowColor === item.color
                                  ? 'border-white scale-105 ring-2 ring-white/70'
                                  : 'border-white/20 hover:scale-105 opacity-80 hover:opacity-100'
                              }`}
                            >
                              {tempGlowColor === item.color && (
                                <Check
                                  className={`w-4 h-4 ${
                                    item.color === '#ffffff' ? 'text-black' : 'text-white'
                                  }`}
                                />
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Custom color picker */}
                        <div className="pt-1 flex items-center justify-between">
                          <label className="text-xs text-zinc-400 flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                            <input
                              type="color"
                              value={tempGlowColor || '#a855f7'}
                              onChange={(e) => setTempGlowColor(e.target.value)}
                              className="w-7 h-7 rounded-lg bg-transparent border-0 cursor-pointer p-0"
                            />
                            <span>Custom color picker</span>
                          </label>
                          {tempGlowColor && (
                            <span className="text-[11px] font-mono text-zinc-400 uppercase">
                              {tempGlowColor}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Save button */}
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setUserProfile((p) => ({ ...p, glowColor: tempGlowColor }));
                            setActiveEditSubModal(null);
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6. Profile Borders sub-modal */}
                  {activeEditSubModal === 'profileBorder' && (
                    <div className="w-full max-w-[420px] bg-[#17171d] border border-[#262632] rounded-2xl p-4 sm:p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100 flex flex-col max-h-[92vh]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-purple-400" />
                          <h3 className="text-base font-bold text-white">Profile borders</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-zinc-400 mb-2.5 leading-relaxed">
                        Choose between 50 borders (40 normal, 10 animated). This will change the outline of your whole profile when someone views it.
                      </p>

                      {/* [profile card] preview */}
                      <div className="flex-1 flex flex-col items-center justify-center my-1 py-1 overflow-y-auto">
                        <div
                          className={`w-full max-w-[340px] bg-[#141418] rounded-2xl overflow-hidden transition-all duration-200 shadow-2xl ${
                            PROFILE_BORDERS[tempProfileBorderIndex].cardBorderClass
                          }`}
                        >
                          {/* Banner preview */}
                          <div className="h-20 w-full relative bg-gradient-to-r from-[#1c1c24] via-[#242430] to-[#1c1c24] overflow-hidden">
                            {userProfile.bannerUrl ? (
                              <img
                                src={userProfile.bannerUrl}
                                alt="Banner"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full opacity-40 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:16px_16px]" />
                            )}
                          </div>

                          {/* Avatar + User preview */}
                          <div className="px-3 pb-3 flex items-end gap-2.5 -mt-7 relative z-10">
                            <div
                              className={`w-14 h-14 rounded-xl overflow-hidden bg-[#1f1f26] shrink-0 shadow-lg ${
                                getPfpBorder(userProfile.pfpBorderId).pfpBorderClass || 'border-2 border-white'
                              }`}
                            >
                              {userProfile.avatarUrl ? (
                                <img
                                  src={userProfile.avatarUrl}
                                  alt="Avatar"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#252530]">
                                  <svg
                                    viewBox="0 0 40 40"
                                    className="w-8 h-8 text-zinc-400 fill-current translate-y-0.5"
                                  >
                                    <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-0.5">
                              <h4 className="font-extrabold text-white text-sm truncate">
                                {currentUser?.username || 'Player'}
                              </h4>
                              <p className="text-[11px] text-zinc-400 truncate">
                                {userProfile.mood || 'Online'}
                              </p>
                            </div>
                          </div>

                          <div className="px-3 pb-2 pt-1 border-t border-[#202028] flex items-center justify-between text-[10px] text-zinc-400">
                            <span>{userProfile.age} yrs · {userProfile.gender}</span>
                            <span className="text-zinc-500">{userProfile.relationship}</span>
                          </div>
                        </div>
                      </div>

                      {/* < select > controls */}
                      <div className="mt-2.5 space-y-2">
                        <div className="flex items-center gap-2">
                          {/* < left arrow */}
                          <button
                            type="button"
                            onClick={() =>
                              setTempProfileBorderIndex((prev) =>
                                prev === 0 ? PROFILE_BORDERS.length - 1 : prev - 1
                              )
                            }
                            className="w-10 h-10 rounded-xl bg-[#20202a] hover:bg-[#282836] border border-[#2c2c3a] flex items-center justify-center text-white hover:text-purple-400 transition-colors cursor-pointer shrink-0"
                            title="Previous border"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>

                          {/* select dropdown */}
                          <div className="flex-1 relative">
                            <select
                              value={tempProfileBorderIndex}
                              onChange={(e) => setTempProfileBorderIndex(Number(e.target.value))}
                              className="w-full bg-[#20202a] hover:bg-[#252532] border border-[#2c2c3a] focus:border-purple-500 rounded-xl px-3 py-2.5 text-xs font-bold text-white appearance-none cursor-pointer pr-8 text-center truncate"
                            >
                              {PROFILE_BORDERS.map((border, idx) => (
                                <option key={border.id} value={idx}>
                                  {border.name} {border.isAnimated ? '★' : ''}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
                          </div>

                          {/* > right arrow */}
                          <button
                            type="button"
                            onClick={() =>
                              setTempProfileBorderIndex((prev) =>
                                prev === PROFILE_BORDERS.length - 1 ? 0 : prev + 1
                              )
                            }
                            className="w-10 h-10 rounded-xl bg-[#20202a] hover:bg-[#282836] border border-[#2c2c3a] flex items-center justify-center text-white hover:text-purple-400 transition-colors cursor-pointer shrink-0"
                            title="Next border"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
                          <span>Border {tempProfileBorderIndex + 1} of 50</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              PROFILE_BORDERS[tempProfileBorderIndex].isAnimated
                                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {PROFILE_BORDERS[tempProfileBorderIndex].isAnimated ? '★ Animated' : 'Normal'}
                          </span>
                        </div>

                        {/* Save button */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setUserProfile((p) => ({
                                ...p,
                                profileBorderId: PROFILE_BORDERS[tempProfileBorderIndex].id
                              }));
                              setActiveEditSubModal(null);
                            }}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save Profile Border</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7. Profile Picture Borders sub-modal */}
                  {activeEditSubModal === 'pfpBorder' && (
                    <div className="w-full max-w-[400px] bg-[#17171d] border border-[#262632] rounded-2xl p-4 sm:p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100 flex flex-col max-h-[92vh]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CircleDot className="w-4 h-4 text-purple-400" />
                          <h3 className="text-base font-bold text-white">Profile picture borders</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-zinc-400 mb-2.5 leading-relaxed">
                        Choose between 50 borders (40 normal, 10 animated) for your profile picture.
                      </p>

                      {/* [profile picture] preview */}
                      <div className="flex-1 flex flex-col items-center justify-center my-2 py-4 bg-[#121217] rounded-2xl border border-[#202028]">
                        <div
                          className={`w-28 h-28 rounded-2xl overflow-hidden bg-[#1f1f26] shrink-0 shadow-2xl transition-all duration-200 relative ${
                            PFP_BORDERS[tempPfpBorderIndex].pfpBorderClass
                          }`}
                        >
                          {userProfile.avatarUrl ? (
                            <img
                              src={userProfile.avatarUrl}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#252530]">
                              <svg
                                viewBox="0 0 40 40"
                                className="w-16 h-16 text-zinc-400 fill-current translate-y-1"
                              >
                                <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        <span className="text-xs font-bold text-white mt-3">
                          {currentUser?.username || 'Player'}
                        </span>
                      </div>

                      {/* < select > controls */}
                      <div className="mt-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {/* < left arrow */}
                          <button
                            type="button"
                            onClick={() =>
                              setTempPfpBorderIndex((prev) =>
                                prev === 0 ? PFP_BORDERS.length - 1 : prev - 1
                              )
                            }
                            className="w-10 h-10 rounded-xl bg-[#20202a] hover:bg-[#282836] border border-[#2c2c3a] flex items-center justify-center text-white hover:text-purple-400 transition-colors cursor-pointer shrink-0"
                            title="Previous border"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>

                          {/* select dropdown */}
                          <div className="flex-1 relative">
                            <select
                              value={tempPfpBorderIndex}
                              onChange={(e) => setTempPfpBorderIndex(Number(e.target.value))}
                              className="w-full bg-[#20202a] hover:bg-[#252532] border border-[#2c2c3a] focus:border-purple-500 rounded-xl px-3 py-2.5 text-xs font-bold text-white appearance-none cursor-pointer pr-8 text-center truncate"
                            >
                              {PFP_BORDERS.map((border, idx) => (
                                <option key={border.id} value={idx}>
                                  {border.name} {border.isAnimated ? '★' : ''}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
                          </div>

                          {/* > right arrow */}
                          <button
                            type="button"
                            onClick={() =>
                              setTempPfpBorderIndex((prev) =>
                                prev === PFP_BORDERS.length - 1 ? 0 : prev + 1
                              )
                            }
                            className="w-10 h-10 rounded-xl bg-[#20202a] hover:bg-[#282836] border border-[#2c2c3a] flex items-center justify-center text-white hover:text-purple-400 transition-colors cursor-pointer shrink-0"
                            title="Next border"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
                          <span>Border {tempPfpBorderIndex + 1} of 50</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              PFP_BORDERS[tempPfpBorderIndex].isAnimated
                                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {PFP_BORDERS[tempPfpBorderIndex].isAnimated ? '★ Animated' : 'Normal'}
                          </span>
                        </div>

                        {/* Save button */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setUserProfile((p) => ({
                                ...p,
                                pfpBorderId: PFP_BORDERS[tempPfpBorderIndex].id
                              }));
                              setActiveEditSubModal(null);
                            }}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save PFP Border</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 8. Profile Music sub-modal */}
                  {activeEditSubModal === 'music' && (
                    <div className="w-full max-w-[420px] bg-[#17171d] border border-[#262632] rounded-2xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100 flex flex-col max-h-[92vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-purple-400" />
                          <h3 className="text-base font-bold text-white">Profile Music</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            stopProfileMusic();
                            setActiveEditSubModal(null);
                          }}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                        Upload your custom <span className="text-purple-300 font-semibold">.mp3</span> or pick a synth track. It will autoplay in the background when someone views your profile!
                      </p>

                      {/* Hidden music input */}
                      <input
                        type="file"
                        ref={musicInputRef}
                        accept="audio/*"
                        className="hidden"
                        onChange={handleMusicUpload}
                      />

                      {/* Upload MP3 button */}
                      <div className="mb-3.5">
                        <button
                          type="button"
                          onClick={() => musicInputRef.current?.click()}
                          className="w-full bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 rounded-xl p-3.5 flex items-center justify-center gap-2.5 transition-colors cursor-pointer text-purple-200 group"
                        >
                          <Upload className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold">
                            {userProfile.musicType === 'upload' && userProfile.musicUrl
                              ? `Uploaded: ${userProfile.musicName}.mp3`
                              : 'Upload .MP3 / Audio Track'}
                          </span>
                        </button>
                      </div>

                      {/* Preset Tracks */}
                      <div className="space-y-2 mb-3.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                          Or Choose A Preset Track
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {PRESET_TRACKS.map((track) => (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => {
                                setUserProfile((p) => ({
                                  ...p,
                                  musicType: track.synthType || 'synthwave',
                                  musicName: track.name,
                                  musicUrl: null
                                }));
                              }}
                              className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                                userProfile.musicType === track.synthType
                                  ? 'bg-purple-600/20 border-purple-500 text-white'
                                  : 'bg-[#191922] border-[#272736] text-zinc-300 hover:border-zinc-500'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Disc className={`w-4 h-4 shrink-0 ${userProfile.musicType === track.synthType ? 'text-purple-400 animate-spin' : 'text-zinc-500'}`} />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold block truncate">{track.name}</span>
                                  <span className="text-[10px] text-zinc-500 block">{track.genre}</span>
                                </div>
                              </div>
                              {userProfile.musicType === track.synthType && (
                                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Autoplay & Volume controls */}
                      <div className="bg-[#14141a] border border-[#262632] rounded-xl p-3 space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-300">Autoplay on Profile View</span>
                          <button
                            type="button"
                            onClick={() => setUserProfile((p) => ({ ...p, musicAutoplay: !p.musicAutoplay }))}
                            className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                              userProfile.musicAutoplay ? 'bg-purple-600' : 'bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`block w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                                userProfile.musicAutoplay ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Volume slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                              Volume
                            </span>
                            <span>{Math.round(userProfile.musicVolume * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={userProfile.musicVolume}
                            onChange={(e) => {
                              const vol = parseFloat(e.target.value);
                              setUserProfile((p) => ({ ...p, musicVolume: vol }));
                              musicSynth.setVolume(vol);
                              if (audioElementRef.current) audioElementRef.current.volume = vol;
                            }}
                            className="w-full accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                          />
                        </div>

                        {/* Live Audio Test Play button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isMusicPlaying) stopProfileMusic();
                            else playProfileMusic();
                          }}
                          className="w-full bg-[#20202c] hover:bg-[#28283a] text-purple-300 border border-purple-500/30 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          {isMusicPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5" /> Stop Preview
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" /> Test Play Sound
                            </>
                          )}
                        </button>
                      </div>

                      {/* Save button */}
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            stopProfileMusic();
                            setActiveEditSubModal(null);
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save Music</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 9. Profile Theme FX sub-modal */}
                  {activeEditSubModal === 'effect' && (
                    <div className="w-full max-w-[400px] bg-[#17171d] border border-[#262632] rounded-2xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100 flex flex-col max-h-[92vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-purple-400" />
                          <h3 className="text-base font-bold text-white">Profile Theme FX</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                        Ambient animated particle overlays rendered across your profile view card!
                      </p>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {PROFILE_EFFECTS.map((fx) => (
                          <button
                            key={fx.id}
                            type="button"
                            onClick={() => setUserProfile((p) => ({ ...p, profileEffectId: fx.id }))}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              userProfile.profileEffectId === fx.id
                                ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/40 text-white'
                                : 'bg-[#181822] border-[#272736] text-zinc-400 hover:text-white hover:border-zinc-500'
                            }`}
                          >
                            <span className="text-xl mb-1">{fx.icon}</span>
                            <div>
                              <span className="text-xs font-bold block text-white">{fx.name}</span>
                              <span className="text-[10px] text-zinc-500 leading-tight block mt-0.5">{fx.description}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveEditSubModal(null)}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Theme FX</span>
                      </button>
                    </div>
                  )}

                  {/* 10. Nameplate Title sub-modal */}
                  {activeEditSubModal === 'nameplate' && (
                    <div className="w-full max-w-[400px] bg-[#17171d] border border-[#262632] rounded-2xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100 flex flex-col max-h-[92vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkle className="w-4 h-4 text-purple-400" />
                          <h3 className="text-base font-bold text-white">Nameplate Title</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                        Showcase a custom prestigious title badge on your profile card.
                      </p>

                      <div className="space-y-2 mb-4">
                        {NAMEPLATE_TITLES.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setUserProfile((p) => ({ ...p, nameplateId: item.id }))}
                            className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              userProfile.nameplateId === item.id
                                ? 'bg-purple-600/20 border-purple-500 text-white'
                                : 'bg-[#181822] border-[#272736] text-zinc-300 hover:border-zinc-500'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {item.id === 'title-none' ? (
                                <span className="text-xs text-zinc-500">None</span>
                              ) : (
                                <span className={`text-[11px] px-2.5 py-0.5 rounded-md ${item.styleClass}`}>
                                  {item.title}
                                </span>
                              )}
                            </div>
                            {userProfile.nameplateId === item.id && (
                              <Check className="w-4 h-4 text-purple-400" />
                            )}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveEditSubModal(null)}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Title</span>
                      </button>
                    </div>
                  )}

                  {/* 11. Profile Badges sub-modal */}
                  {activeEditSubModal === 'badges' && (
                    <div className="w-full max-w-[400px] bg-[#17171d] border border-[#262632] rounded-2xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100 flex flex-col max-h-[92vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-purple-400" />
                          <h3 className="text-base font-bold text-white">Profile Badges</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                        Select up to 3 collectible badge pins to display proudly on your profile card.
                      </p>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {COLLECTIBLE_BADGES.map((b) => {
                          const isSelected = userProfile.badgeIds.includes(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setUserProfile((p) => {
                                  if (isSelected) {
                                    return { ...p, badgeIds: p.badgeIds.filter((id) => id !== b.id) };
                                  } else {
                                    if (p.badgeIds.length >= 3) {
                                      return { ...p, badgeIds: [...p.badgeIds.slice(1), b.id] };
                                    }
                                    return { ...p, badgeIds: [...p.badgeIds, b.id] };
                                  }
                                });
                              }}
                              className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600/25 border-purple-500 text-white'
                                  : 'bg-[#181822] border-[#272736] text-zinc-400 hover:text-white hover:border-zinc-500'
                              }`}
                            >
                              <span className="text-xl">{b.emoji}</span>
                              <div className="text-left flex-1 min-w-0">
                                <span className="text-xs font-bold block text-white truncate">{b.name}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveEditSubModal(null)}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Badges</span>
                      </button>
                    </div>
                  )}

                  {/* 12. Chat Theme sub-modal */}
                  {activeEditSubModal === 'chatTheme' && (
                    <div className="w-full max-w-[400px] bg-[#17171d] border border-[#262632] rounded-2xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-100 flex flex-col max-h-[92vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-purple-400" />
                          <h3 className="text-base font-bold text-white">Chat Bubble Theme</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveEditSubModal(null)}
                          className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                        Customize how your chat messages glow in the main channel.
                      </p>

                      <div className="space-y-2 mb-4">
                        {CHAT_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setUserProfile((p) => ({ ...p, chatThemeId: theme.id }))}
                            className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              userProfile.chatThemeId === theme.id
                                ? 'bg-purple-600/20 border-purple-500 text-white'
                                : 'bg-[#181822] border-[#272736] text-zinc-300 hover:border-zinc-500'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${theme.bubbleClass} ${theme.textColor}`}>
                                Hello Chatflux!
                              </div>
                              <span className="text-xs font-bold text-white">{theme.name}</span>
                            </div>
                            {userProfile.chatThemeId === theme.id && (
                              <Check className="w-4 h-4 text-purple-400" />
                            )}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveEditSubModal(null)}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Theme</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* WELCOME GUIDE MODAL                                  */}
        {/* ==================================================== */}
        {showGuide && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          >
            <div className="w-full max-w-[430px] max-h-[92vh] bg-[#16161c] border border-[#252530] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-150">
              <div className="p-3.5 sm:p-4 pb-2.5 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#23232c] border border-white/10 flex items-center justify-center text-white shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                      Welcome guide
                    </h2>
                    <p className="text-[11px] text-zinc-400 font-normal">
                      New user button guide
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full h-1 bg-[#22222a] shrink-0 relative">
                <div
                  className="h-full bg-[#00b4d8] transition-all duration-300"
                  style={{ width: guideStep === 1 ? '50%' : '100%' }}
                />
              </div>

              <div className="p-4 sm:p-5 pt-3.5 flex flex-col items-center text-center overflow-y-auto">
                {guideStep === 1 && (
                  <div className="w-full flex flex-col items-center animate-in fade-in duration-150">
                    <div className="w-13 h-13 rounded-xl bg-[#22222a] border border-[#2c2c36] flex items-center justify-center mb-2 text-white">
                      <span className="text-xl" role="img" aria-label="Waving hand">
                        👋✨
                      </span>
                    </div>

                    <span className="bg-[#24242e] text-zinc-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-1.5">
                      Step 1 of 2
                    </span>

                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide mb-1">
                      Welcome to the talk
                    </h3>

                    <p className="text-xs text-zinc-400 max-w-sm mb-3.5 leading-relaxed font-normal">
                      This quick guide explains the important buttons and panels so new users do not feel lost after joining.
                    </p>

                    <div className="w-full space-y-1.5 text-left mb-4">
                      <div className="bg-[#1c1c24] border border-[#272732] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#00c2ff] text-black flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                          Use Next to learn each area.
                        </span>
                      </div>

                      <div className="bg-[#1c1c24] border border-[#272732] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#00c2ff] text-black flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                          Use Skip to close and stop showing this welcome popup.
                        </span>
                      </div>

                      <div className="bg-[#1c1c24] border border-[#272732] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#00c2ff] text-black flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                          You can reopen this later from Edit profile &gt; Site guide.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {guideStep === 2 && (
                  <div className="w-full flex flex-col items-center animate-in fade-in duration-150">
                    <div className="w-13 h-13 rounded-xl bg-[#22222a] border border-[#2c2c36] flex items-center justify-center mb-2 text-white">
                      <MessageSquare className="w-6 h-6 text-white fill-white/10" />
                    </div>

                    <span className="bg-[#24242e] text-zinc-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-1.5">
                      Step 2 of 2
                    </span>

                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide mb-1">
                      Main talk buttons
                    </h3>

                    <p className="text-xs text-zinc-400 max-w-sm mb-3.5 leading-relaxed font-normal">
                      The bottom message area is where users type and send public talk messages.
                    </p>

                    <div className="w-full space-y-1.5 text-left mb-4">
                      <div className="bg-[#1c1c24] border border-[#272732] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#00c2ff] text-black flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                          Type a message and press Send.
                        </span>
                      </div>

                      <div className="bg-[#1c1c24] border border-[#272732] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#00c2ff] text-black flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                          Swipe or use reply to answer a specific message.
                        </span>
                      </div>

                      <div className="bg-[#1c1c24] border border-[#272732] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#00c2ff] text-black flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                          Type @ to tag a username in talk or friend wall.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="w-full space-y-2 mt-auto">
                  <div className="flex items-center gap-2.5 w-full">
                    <button
                      type="button"
                      disabled={guideStep === 1}
                      onClick={() => setGuideStep(1)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
                        guideStep === 1
                          ? 'bg-[#1f1f26] text-zinc-500 cursor-not-allowed opacity-60'
                          : 'bg-[#22222c] hover:bg-[#2b2b38] text-white'
                      }`}
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (guideStep === 1) {
                          setGuideStep(2);
                        } else {
                          setShowGuide(false);
                        }
                      }}
                      className="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#00a8e8] hover:bg-[#0096d1] text-white transition-colors cursor-pointer shadow-md shadow-cyan-500/20"
                    >
                      {guideStep === 2 ? 'Done' : 'Next'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGuide(false)}
                    className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#1b1b22] hover:bg-[#22222c] text-white transition-colors cursor-pointer"
                  >
                    Skip guide
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: WELCOME / SIGNUP / LOGIN SCREEN
  // ==========================================
  return (
    <div className="min-h-screen w-full bg-[#270e44] text-white flex flex-col items-center justify-center p-4 relative select-none font-sans overflow-x-hidden">
      <main className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center py-12 z-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          Welcome To The Chat
        </h1>

        <p className="text-base sm:text-lg text-white/90 max-w-xl mx-auto leading-relaxed px-4 font-normal">
          Our chat community gives you the opportunity of making new friends and sharing fun moments with other people.
        </p>

        <button
          type="button"
          onClick={() => setModalType('login')}
          className="mt-8 sm:mt-10 bg-[#9333ea] hover:bg-[#8324dc] active:bg-[#721ec0] text-white font-semibold text-lg px-12 py-3 rounded-full flex items-center justify-center gap-2.5 shadow-lg shadow-purple-950/50 hover:shadow-purple-900/60 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer min-w-[210px]"
        >
          <svg
            className="w-5 h-5 fill-white transform -rotate-45 -mt-0.5"
            viewBox="0 0 24 24"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
          <span>Login</span>
        </button>

        <div className="mt-8 flex flex-col items-center">
          <span className="text-xs sm:text-sm text-white/70 font-normal">
            New here?
          </span>
          <button
            type="button"
            onClick={() => setModalType('register')}
            className="text-lg sm:text-xl font-bold text-white hover:text-purple-200 hover:underline transition-colors mt-0.5 cursor-pointer"
          >
            Register now
          </button>
        </div>
      </main>

      {/* MODAL OVERLAY */}
      {modalType && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          {/* LOGIN MODAL */}
          {modalType === 'login' && (
            <div className="w-full max-w-[390px] bg-[#17171a] border border-[#26262b] rounded-2xl p-6 sm:p-7 shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  Login
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close modal"
                  className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Username/Email"
                    className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#9333ea] hover:bg-[#8324dc] active:bg-[#721ec0] text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base shadow-md transition-all cursor-pointer mt-4"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Login</span>
                </button>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setModalType('forgot')}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer block text-left"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* REGISTER MODAL */}
          {modalType === 'register' && (
            <div className="w-full max-w-[400px] bg-[#17171a] border border-[#26262b] rounded-2xl p-6 sm:p-7 shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  Register
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close modal"
                  className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Gender Dropdown */}
                <div ref={genderRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setGenderDropdownOpen(!genderDropdownOpen);
                      setDayDropdownOpen(false);
                      setMonthDropdownOpen(false);
                      setYearDropdownOpen(false);
                    }}
                    className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white flex items-center justify-between cursor-pointer focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    <span>{gender}</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${genderDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {genderDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#1e1e24] border border-[#2d2d35] rounded-lg overflow-hidden z-30 shadow-xl">
                      {['Male', 'Female', 'Other'].map((option) => {
                        const isSelected = gender === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setGender(option);
                              setGenderDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#2d2d36] text-white font-medium'
                                : 'text-zinc-400 hover:text-white hover:bg-[#25252c]'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Birth Date Section */}
                <div className="pt-1">
                  <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5 text-left">
                    Birth date
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Day Dropdown */}
                    <div ref={dayRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setDayDropdownOpen(!dayDropdownOpen);
                          setGenderDropdownOpen(false);
                          setMonthDropdownOpen(false);
                          setYearDropdownOpen(false);
                        }}
                        className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-3 py-3 text-sm text-white flex items-center justify-between cursor-pointer focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        <span className="truncate">{birthDay}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
                      </button>

                      {dayDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-[#1e1e24] border border-[#2d2d35] rounded-lg z-30 shadow-xl scrollbar-thin">
                          {days.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                setBirthDay(d);
                                setDayDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                                birthDay === d
                                  ? 'bg-[#2d2d36] text-white font-medium'
                                  : 'text-zinc-400 hover:text-white hover:bg-[#25252c]'
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Month Dropdown */}
                    <div ref={monthRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setMonthDropdownOpen(!monthDropdownOpen);
                          setGenderDropdownOpen(false);
                          setDayDropdownOpen(false);
                          setYearDropdownOpen(false);
                        }}
                        className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-3 py-3 text-sm text-white flex items-center justify-between cursor-pointer focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        <span className="truncate">{birthMonth}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
                      </button>

                      {monthDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-[#1e1e24] border border-[#2d2d35] rounded-lg z-30 shadow-xl scrollbar-thin">
                          {months.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setBirthMonth(m);
                                setMonthDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                                birthMonth === m
                                  ? 'bg-[#2d2d36] text-white font-medium'
                                  : 'text-zinc-400 hover:text-white hover:bg-[#25252c]'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Year Dropdown */}
                    <div ref={yearRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setYearDropdownOpen(!yearDropdownOpen);
                          setGenderDropdownOpen(false);
                          setDayDropdownOpen(false);
                          setMonthDropdownOpen(false);
                        }}
                        className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-3 py-3 text-sm text-white flex items-center justify-between cursor-pointer focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        <span className="truncate">{birthYear}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
                      </button>

                      {yearDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-[#1e1e24] border border-[#2d2d35] rounded-lg z-30 shadow-xl scrollbar-thin">
                          {years.map((y) => (
                            <button
                              key={y}
                              type="button"
                              onClick={() => {
                                setBirthYear(y);
                                setYearDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                                birthYear === y
                                  ? 'bg-[#2d2d36] text-white font-medium'
                                  : 'text-zinc-400 hover:text-white hover:bg-[#25252c]'
                              }`}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-[#9333ea] hover:bg-[#8324dc] active:bg-[#721ec0] text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base shadow-md transition-all cursor-pointer"
                  >
                    <SquarePen className="w-5 h-5" />
                    <span>Register</span>
                  </button>
                </div>

                <div className="pt-1">
                  <p className="text-[11px] sm:text-xs text-zinc-400 text-left">
                    By registering, you agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setModalType('terms')}
                      className="underline hover:text-white transition-colors cursor-pointer text-zinc-300"
                    >
                      Terms of Use
                    </button>
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* FORGOT PASSWORD MODAL */}
          {modalType === 'forgot' && (
            <div className="w-full max-w-[390px] bg-[#17171a] border border-[#26262b] rounded-2xl p-6 sm:p-7 shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  Reset Password
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close modal"
                  className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-zinc-400 mb-4 text-left">
                Enter your email address and we will send you a password reset link.
              </p>

              <div className="space-y-3.5">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />

                <button
                  type="button"
                  onClick={() => setModalType('login')}
                  className="w-full bg-[#9333ea] hover:bg-[#8324dc] active:bg-[#721ec0] text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base shadow-md transition-all cursor-pointer"
                >
                  <span>Send Reset Link</span>
                </button>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setModalType('login')}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TERMS OF USE MODAL */}
          {modalType === 'terms' && (
            <div className="w-full max-w-[420px] bg-[#17171a] border border-[#26262b] rounded-2xl p-6 sm:p-7 shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  Terms of Use
                </h2>
                <button
                  type="button"
                  onClick={() => setModalType('register')}
                  aria-label="Close modal"
                  className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs sm:text-sm text-zinc-300 space-y-3 overflow-y-auto pr-1 text-left flex-1">
                <p>
                  1. <strong>Community Guidelines:</strong> Treat all chat members with kindness, dignity, and respect. Harassment, abuse, or hate speech is strictly prohibited.
                </p>
                <p>
                  2. <strong>Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your account credentials.
                </p>
                <p>
                  3. <strong>Content Ownership:</strong> You retain rights to content you share, while granting our platform a license to display and transmit messages.
                </p>
                <p>
                  4. <strong>Privacy:</strong> We respect your privacy and safeguard personal information in accordance with standard safety protocols.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalType('register')}
                  className="w-full bg-[#9333ea] hover:bg-[#8324dc] text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
                >
                  I Understand
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
