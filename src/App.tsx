import React, { useState, useRef, useEffect } from 'react';
import {
  LogIn,
  SquarePen,
  X,
  ChevronDown,
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
  User
} from 'lucide-react';

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
  showOnline = false
}: {
  avatarUrl?: string | null;
  className?: string;
  showOnline?: boolean;
}) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <div className="w-full h-full rounded-full overflow-hidden bg-[#24252e] border border-white/10 flex items-center justify-center">
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

export default function App() {
  // Authentication & Current User State
  const [currentUser, setCurrentUser] = useState<{ username: string; gender: string } | null>(null);

  // Profile Details State
  const [userProfile, setUserProfile] = useState<{
    avatarUrl: string | null;
    bannerUrl: string | null;
    age: string;
    gender: string;
    relationship: string;
    bio: string;
    mood: string;
  }>({
    avatarUrl: null,
    bannerUrl: null,
    age: '17',
    gender: 'MALE',
    relationship: 'Rather not say',
    bio: '',
    mood: ''
  });

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileViewMode, setProfileViewMode] = useState<'edit' | 'view'>('edit');
  const [publicProfileTab, setPublicProfileTab] = useState<'info' | 'aboutme'>('info');

  // Sub-modal state for Edit actions (only info, username, bio, mood)
  const [activeEditSubModal, setActiveEditSubModal] = useState<'info' | 'username' | 'bio' | 'mood' | null>(null);
  const [tempAge, setTempAge] = useState('17');
  const [tempGender, setTempGender] = useState('MALE');
  const [tempRelationship, setTempRelationship] = useState('Rather not say');
  const [tempUsername, setTempUsername] = useState('');
  const [tempBio, setTempBio] = useState('');
  const [tempMood, setTempMood] = useState('');

  // Hidden file inputs for avatar & banner uploads
  const pfpInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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
      if (playerCardRef.current && !playerCardRef.current.contains(e.target as Node)) {
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

  // Open Edit Sub-Modal with prefilled values
  const openEditSubModal = (type: 'info' | 'username' | 'bio' | 'mood') => {
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
              <UserAvatar avatarUrl={userProfile.avatarUrl} className="w-8 h-8" showOnline={true} />
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
                    <UserAvatar avatarUrl={msg.avatarUrl || userProfile.avatarUrl} className="w-10 h-10 mt-0.5" />

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

                      <p className="text-white font-medium text-sm sm:text-base mt-0.5 break-words leading-relaxed">
                        {msg.text}
                      </p>
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
                className="bg-[#18181e] border border-[#24242d] rounded-2xl px-4 py-2.5 flex items-center gap-2 focus-within:border-cyan-500/60 transition-colors shadow-lg"
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
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    inputText.trim()
                      ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                      : 'text-zinc-600'
                  }`}
                >
                  <SendHorizontal className="w-5 h-5" />
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
                <div className="relative" ref={playerCardRef}>
                  <div
                    onClick={() => setPlayerPopoverOpen(!playerPopoverOpen)}
                    className="bg-[#18181f] border border-[#2b2b38] hover:border-cyan-500/40 rounded-xl p-2.5 flex items-center gap-3 transition-colors cursor-pointer group"
                  >
                    <UserAvatar avatarUrl={userProfile.avatarUrl} className="w-10 h-10" showOnline={true} />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-white text-sm truncate group-hover:text-cyan-300 transition-colors block">
                        {currentUser.username}
                      </span>
                      <p className="text-xs text-zinc-400 truncate">
                        {userProfile.mood ? userProfile.mood : 'Online'}
                      </p>
                    </div>
                  </div>

                  {/* Options popover shown on the left of the player (Image 2) */}
                  {playerPopoverOpen && (
                    <div className="absolute right-full mr-3.5 top-0 w-60 bg-[#16161c] border border-[#282834] rounded-2xl shadow-2xl overflow-hidden z-40 text-center animate-in fade-in zoom-in-95 duration-150 flex flex-col">
                      {/* Banner Strip */}
                      <div className="h-16 w-full relative bg-gradient-to-r from-[#1f1f28] via-[#282834] to-[#1f1f28] shrink-0 overflow-hidden">
                        {userProfile.bannerUrl ? (
                          <img src={userProfile.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full opacity-30 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px]" />
                        )}
                      </div>

                      {/* Centered Circular Avatar with white border */}
                      <div className="w-18 h-18 rounded-full border-2 border-white -mt-9 mx-auto overflow-hidden bg-[#24252e] shadow-xl relative shrink-0">
                        {userProfile.avatarUrl ? (
                          <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <svg viewBox="0 0 40 40" className="w-full h-full text-zinc-400 fill-current translate-y-1">
                            <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                          </svg>
                        )}
                      </div>

                      {/* User Details (without UK flag, without star, without likes) */}
                      <div className="px-4 pt-2 pb-3">
                        <h3 className="font-bold text-white text-base truncate">
                          {currentUser.username}
                        </h3>
                        <p className="text-xs text-zinc-400 font-medium mt-0.5 truncate">
                          {userProfile.age} years · {userProfile.gender}
                        </p>
                      </div>

                      {/* Actions Section: View profile & Edit */}
                      <div className="p-3 pt-2.5 border-t border-[#23232c] bg-[#131317] space-y-1.5">
                        {/* 1. View profile button (views profile) */}
                        <button
                          type="button"
                          onClick={() => {
                            setPlayerPopoverOpen(false);
                            setProfileViewMode('view');
                            setProfileModalOpen(true);
                          }}
                          className="w-full bg-[#1e1e26] hover:bg-[#282834] text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
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
              </div>
            </aside>
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

            <div className="w-full max-w-[480px] max-h-[92vh] bg-[#141418] border border-[#252530] rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white animate-in zoom-in-95 duration-150 relative">
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
                {/* PFP Box (Rounded square with white border matching mockup) */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-white/90 overflow-hidden bg-[#1f1f26] relative shrink-0 shadow-2xl -mt-12 sm:-mt-14">
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

                {/* Username & Mood */}
                <div className="flex-1 min-w-0 pb-1">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate">
                    {currentUser.username}
                  </h2>
                  {userProfile.mood ? (
                    <p className="text-xs text-cyan-400 font-medium truncate mt-0.5">
                      {userProfile.mood}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 truncate mt-0.5">Online</p>
                  )}
                </div>
              </div>

              {/* ========================================================= */}
              {/* MODE 1: EDIT PROFILE (Only: Edit info, Edit about me, Edit username, Edit mood) */}
              {/* ========================================================= */}
              {profileViewMode === 'edit' && (
                <div className="p-5 pt-3 overflow-y-auto flex-1 space-y-2.5">
                  <div className="pb-1">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Account Settings
                    </span>
                  </div>

                  {/* 1. Edit info */}
                  <button
                    type="button"
                    onClick={() => openEditSubModal('info')}
                    className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-cyan-400 transition-colors">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                      Edit info
                    </span>
                  </button>

                  {/* 2. Edit about me (Edit bio) */}
                  <button
                    type="button"
                    onClick={() => openEditSubModal('bio')}
                    className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-cyan-400 transition-colors">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                      Edit about me
                    </span>
                  </button>

                  {/* 3. Edit username */}
                  <button
                    type="button"
                    onClick={() => openEditSubModal('username')}
                    className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-cyan-400 transition-colors">
                      <SquarePen className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                      Edit username
                    </span>
                  </button>

                  {/* 4. Edit mood */}
                  <button
                    type="button"
                    onClick={() => openEditSubModal('mood')}
                    className="w-full bg-[#181820] hover:bg-[#20202a] border border-[#262632] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#242430] flex items-center justify-center text-zinc-300 group-hover:text-cyan-400 transition-colors">
                      <Heart className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                      Edit mood
                    </span>
                  </button>
                </div>
              )}

              {/* ========================================================= */}
              {/* MODE 2: PUBLIC VIEW (How everyone else sees your profile) */}
              {/* Only Info and About me tabs (No friends, gifts, etc.)    */}
              {/* ========================================================= */}
              {profileViewMode === 'view' && (
                <div className="p-5 pt-2 overflow-y-auto flex-1 flex flex-col">
                  {/* Two Tabs: Info and About me */}
                  <div className="flex items-center gap-2 border-b border-[#22222a] pb-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setPublicProfileTab('info')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        publicProfileTab === 'info'
                          ? 'bg-[#252532] text-white shadow-sm'
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
                          ? 'bg-[#252532] text-white shadow-sm'
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
                            className="bg-[#00a8e8] hover:bg-[#0096d1] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shadow-md shadow-cyan-500/20"
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
                          className="w-full bg-[#1f1f26] border border-[#2d2d38] rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 resize-none"
                        />

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setUserProfile((p) => ({ ...p, bio: tempBio }));
                              setActiveEditSubModal(null);
                            }}
                            className="bg-[#00a8e8] hover:bg-[#0096d1] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shadow-md shadow-cyan-500/20"
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
                          className="w-full bg-[#1f1f26] border border-[#2d2d38] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
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
                            className="bg-[#00a8e8] hover:bg-[#0096d1] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center gap-2 shadow-md shadow-cyan-500/20"
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
                          className="w-full bg-[#1f1f26] border border-[#2d2d38] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                        />

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setUserProfile((p) => ({ ...p, mood: tempMood.trim() }));
                              setActiveEditSubModal(null);
                            }}
                            className="bg-[#00a8e8] hover:bg-[#0096d1] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center gap-2 shadow-md shadow-cyan-500/20"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
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
