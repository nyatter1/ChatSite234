import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Globe,
  Languages,
  AlertCircle,
  Loader2,
  Trash2,
  Reply,
  ThumbsUp,
  ThumbsDown,
  Newspaper,
  Shield,
  Scale,
  Image as ImageIcon,
  Plus,
  Maximize2,
  Minimize2,
  Minus
} from 'lucide-react';
import {
  PROFILE_BORDERS,
  PFP_BORDERS,
  getProfileBorder,
  getPfpBorder
} from './borders';
import {
  RANKS,
  getUserRank,
  isStaffRank,
  ASSIGNABLE_RANKS,
  SYSTEM_BOT_USERNAME,
  SYSTEM_BOT_AVATAR
} from './ranks';
import GlowModal from './components/GlowModal';

const appLogo = '/logo.png';
const usernameSoundUrl = '/username.mp3';
const newNewsSoundUrl = '/new_news.mp3';
const newMessagesSoundUrl = '/new_messages.mp3';
const privateSoundUrl = '/private.mp3';
const quoteSoundUrl = '/quote.mp3';
const notifySoundUrl = '/notify.mp3';
const clearSoundUrl = '/clear.mp3';
import BorderModal from './components/BorderModal';
import { MessagesView } from './MessagesView';
import DatabaseMonitorModal from './components/DatabaseMonitorModal';
import MusicPlayerModal, { MusicTrack } from './components/MusicPlayerModal';
import { detectUserCountry, getInstantUserCountry } from './utils/countryDetect';
import { uploadToCloudinary, deleteFromCloudinary } from './lib/cloudinary';
import { compressAvatar, compressBanner } from './utils/imageCompressor';
import {
  hashPassword,
  sanitizeDbKey,
  isValidEmail,
  isValidUsername
} from './utils/auth';
import {
  rtdb,
  ref,
  push,
  set,
  update,
  get,
  remove,
  onValue,
  query,
  limitToLast,
  serverTimestamp,
  onDisconnect
} from './lib/firebase';

interface MessageReply {
  id: string;
  sender: string;
  text: string;
}

interface MessengerToastItem {
  id: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
  groupName?: string | null;
  text: string;
  exiting?: boolean;
}

function playAppSound(soundUrl: string) {
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.85;
    audio.play().catch(() => {});
  } catch (_) {}
}

interface ChatMessage {
  id: string;
  sender: string;
  senderKey?: string;
  text: string;
  timestamp: string;
  createdAt?: number;
  avatarUrl?: string | null;
  pfpBorderId?: string | null;
  pfpBorderThickness?: number;
  rank?: string | null;
  replyTo?: MessageReply | null;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'audio' | 'video' | null;
  mediaName?: string | null;
}

interface AppNotification {
  id: string;
  type: 'profile_visit' | 'rank_change' | 'mute' | 'profile_like';
  fromUsername: string;
  fromAvatarUrl?: string | null;
  fromPfpBorderId?: string | null;
  fromPfpBorderThickness?: number;
  text: string;
  createdAt: number;
  read?: boolean;
}

interface PmMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  createdAt: number;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'audio' | 'video' | null;
  mediaName?: string | null;
}

interface PmThread {
  peerKey: string;
  peerUsername: string;
  peerAvatarUrl?: string | null;
  unread: boolean;
  unreadCount?: number;
  updatedAt: number;
  messages: PmMessage[];
}

interface NewsComment {
  id: string;
  author: string;
  authorAvatar?: string | null;
  authorRank?: string | null;
  text: string;
  createdAt: number;
}

interface NewsPost {
  id: string;
  author: string;
  authorAvatar?: string | null;
  authorRank?: string | null;
  authorPfpBorderId?: string | null;
  authorPfpBorderThickness?: number;
  title: string;
  description: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  createdAt: number;
  likes: Record<string, boolean>;
  dislikes: Record<string, boolean>;
  loves: Record<string, boolean>;
  laughs: Record<string, boolean>;
  comments: NewsComment[];
}

const MUTE_DURATIONS: { id: string; label: string; ms: number }[] = [
  { id: '10s', label: '10s', ms: 10 * 1000 },
  { id: '30s', label: '30s', ms: 30 * 1000 },
  { id: '1m', label: '1m', ms: 60 * 1000 },
  { id: '5m', label: '5m', ms: 5 * 60 * 1000 },
  { id: '10m', label: '10m', ms: 10 * 60 * 1000 },
  { id: '15m', label: '15m', ms: 15 * 60 * 1000 },
  { id: '30m', label: '30m', ms: 30 * 60 * 1000 },
  { id: '60m', label: '60m', ms: 60 * 60 * 1000 },
  { id: '1d', label: '1d', ms: 24 * 60 * 60 * 1000 },
  { id: '5d', label: '5d', ms: 5 * 24 * 60 * 60 * 1000 },
  { id: '10d', label: '10d', ms: 10 * 24 * 60 * 60 * 1000 },
  { id: '1w', label: '1w', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '5w', label: '5w', ms: 5 * 7 * 24 * 60 * 60 * 1000 },
  { id: '10w', label: '10w', ms: 10 * 7 * 24 * 60 * 60 * 1000 },
  { id: '1yr', label: '1yr', ms: 365 * 24 * 60 * 60 * 1000 },
  { id: '5yr', label: '5yr', ms: 5 * 365 * 24 * 60 * 60 * 1000 },
  { id: '10yr', label: '10yr', ms: 10 * 365 * 24 * 60 * 60 * 1000 },
  { id: '100yrs', label: '100yrs', ms: 100 * 365 * 24 * 60 * 60 * 1000 },
  { id: '1000yrs', label: '1000yrs', ms: 1000 * 365 * 24 * 60 * 60 * 1000 }
];

function formatNotificationDate(ts?: number): string {
  const d = ts ? new Date(ts) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${mins}`;
}

// Convert File/Blob to Data URL as fallback if cloud storage is unreachable
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Ensure no temporary browser blob: URLs ever get written to Realtime Database
function sanitizeMediaUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:')) return null;
  return url;
}

const BAZAARLINK_API_URL = 'https://api.bazaarlink.ai/v1/chat/completions';
const BAZAARLINK_API_KEY = 'sk-bl-Lj2VRPx5ynD0-9AoM4uARPUBo4BDRvSAFPXJoaoxA7BOAQc9';

async function generateAiBotReply(
  prompt: string,
  botName: string,
  senderName: string
): Promise<string> {
  const userPrompt = prompt.trim() || 'Say hello in one sentence';

  // 1. Try server-side proxy endpoint (/api/bot-chat) first
  try {
    const res = await fetch('/api/bot-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userPrompt, botName, senderName })
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.reply && typeof data.reply === 'string' && data.reply.trim()) {
        return data.reply.trim();
      }
    }
  } catch (_) {
    // Fall through to direct BazaarLink call if server route is unavailable
  }

  // 2. Direct BazaarLink API call fallback (DeepSeek V4 Flash 0731 Free primary)
  const messages = [
    {
      role: 'system',
      content: `You are ${botName}, an official, intelligent automated AI assistant. Answer any question, math problem, or topic accurately, directly, and formally in 1 to 2 concise sentences. Never use roleplay, actions in asterisks (*...*), slang, or emotes. Do not prefix your message with "${senderName}" or "@${senderName}" because the system automatically prepends their username tag.`
    },
    {
      role: 'user',
      content: userPrompt
    }
  ];

  const modelsToTry = [
    'deepseek/deepseek-v4-flash-0731free:free',
    'qwen/qwen3.7-flash:free',
    'auto:free'
  ];

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(BAZAARLINK_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${BAZAARLINK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages
          })
        });
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (response.ok && content) {
          return content;
        }
        if (response.status === 429 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 900));
          continue;
        }
        break;
      } catch (_) {
        break;
      }
    }
  }

  return 'Hello. How may I assist you today?';
}

// Highlight the logged-in user's username in a blue badge when they are tagged in a chat message
function renderMessageTextWithMentions(
  text: string,
  myUsername?: string | null
): React.ReactNode {
  if (!text) return text;
  const cleanMyUsername = (myUsername || '').trim();
  if (!cleanMyUsername) return text;

  const escaped = cleanMyUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mentionRegex = new RegExp(`(^|[^a-zA-Z0-9_])(@?${escaped})(?=$|[^a-zA-Z0-9_])`, 'gi');

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    const prefix = match[1] || '';
    const matchedTag = match[2] || '';
    const tagStartIndex = match.index + prefix.length;

    if (tagStartIndex > lastIndex) {
      parts.push(text.slice(lastIndex, tagStartIndex));
    }

    parts.push(
      <span
        key={`tag-${tagStartIndex}`}
        className="inline-block bg-[#00add8] text-white font-bold px-1.5 py-[1px] rounded-[4px] leading-snug"
      >
        {cleanMyUsername}
      </span>
    );

    lastIndex = tagStartIndex + matchedTag.length;
  }

  if (parts.length === 0) {
    return text;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// Dynamically update the browser tab favicon (/favicon.png or /favicon2.png)
function setDocumentFavicon(href: '/favicon.png' | '/favicon2.png') {
  if (typeof document === 'undefined') return;
  const links = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
  if (links.length > 0) {
    links.forEach((link) => {
      if (link.getAttribute('href') !== href) {
        link.href = href;
      }
    });
  } else {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = href;
    document.head.appendChild(link);
  }
}

function isUserOutOfTab(): boolean {
  if (typeof document === 'undefined') return false;
  return document.hidden || document.visibilityState === 'hidden' || !document.hasFocus();
}

function triggerBackgroundTabFaviconAlert() {
  if (isUserOutOfTab()) {
    setDocumentFavicon('/favicon2.png');
    try {
      sessionStorage.setItem('teenverse_pending_favicon_alert', '1');
    } catch (_) {}
  }
}

// Reusable Avatar component supporting custom uploaded avatar or default silhouette
function UserAvatar({
  avatarUrl,
  className = 'w-10 h-10',
  showOnline = false,
  isOnline = true,
  pfpBorderClass,
  pfpBorderThickness
}: {
  avatarUrl?: string | null;
  className?: string;
  showOnline?: boolean;
  isOnline?: boolean;
  pfpBorderClass?: string;
  pfpBorderThickness?: number;
}) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`w-full h-full rounded-full overflow-hidden bg-[#24252e] flex items-center justify-center transition-all ${
          pfpBorderClass || ''
        }`}
        style={pfpBorderClass && pfpBorderThickness !== undefined ? { borderWidth: `${pfpBorderThickness}px` } : undefined}
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
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#121215] rounded-full ${
            isOnline ? 'bg-emerald-500' : 'bg-zinc-500'
          }`}
        />
      )}
    </div>
  );
}

interface UserProfileData {
  username: string;
  email?: string;
  rank?: string | null;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
  avatarDeleteToken?: string | null;
  bannerUrl?: string | null;
  bannerPublicId?: string | null;
  bannerDeleteToken?: string | null;
  age?: string;
  gender?: string;
  relationship?: string;
  country?: string;
  language?: string;
  bio?: string;
  mood?: string;
  glowColor?: string | null;
  glowThickness?: number;
  profileBorderId?: string | null;
  profileBorderThickness?: number;
  pfpBorderId?: string | null;
  pfpBorderThickness?: number;
  musicTrack?: MusicTrack | null;
  mutedUntil?: number | null;
  muteDuration?: string | null;
  muteReason?: string | null;
  muteNotificationId?: string | null;
  likes?: Record<string, boolean>;
  msgProfile?: {
    displayName?: string;
    avatarUrl?: string | null;
    about?: string;
  };
  msgFollowers?: Record<string, boolean>;
  msgFollowing?: Record<string, boolean>;
  msgFavorites?: Record<string, boolean>;
  isOnline?: boolean;
  lastSeen?: any;
  updatedAt?: any;
}

interface UserProfileState {
  rank?: string | null;
  avatarUrl: string | null;
  avatarPublicId?: string | null;
  avatarDeleteToken?: string | null;
  bannerUrl: string | null;
  bannerPublicId?: string | null;
  bannerDeleteToken?: string | null;
  age: string;
  gender: string;
  relationship: string;
  country: string;
  language: string;
  bio: string;
  mood: string;
  glowColor: string | null;
  glowThickness: number;
  profileBorderId: string | null;
  profileBorderThickness: number;
  pfpBorderId: string | null;
  pfpBorderThickness: number;
  musicTrack: MusicTrack | null;
  mutedUntil?: number | null;
  muteDuration?: string | null;
  muteReason?: string | null;
  muteNotificationId?: string | null;
  likes?: Record<string, boolean>;
}

export default function App() {
  const initialGeo = useMemo(() => getInstantUserCountry(), []);

  // Authentication & Current User State (Loaded from localStorage)
  const [currentUser, setCurrentUser] = useState<{ username: string; gender: string; email?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('chat_community_user');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  // Default Profile Configuration
  const initialProfile = useMemo<UserProfileState>(() => ({
    avatarUrl: null,
    avatarPublicId: null,
    avatarDeleteToken: null,
    bannerUrl: null,
    bannerPublicId: null,
    bannerDeleteToken: null,
    age: '17',
    gender: 'MALE',
    relationship: 'Rather not say',
    country: initialGeo.country,
    language: initialGeo.language,
    bio: '',
    mood: '',
    glowColor: null,
    glowThickness: 18,
    profileBorderId: 'pb-default',
    profileBorderThickness: 2,
    pfpBorderId: 'pfp-default',
    pfpBorderThickness: 2,
    musicTrack: null
  }), [initialGeo]);

  // Profile Details State (Loaded from localStorage)
  const [userProfile, setUserProfile] = useState<UserProfileState>(() => {
    try {
      const saved = localStorage.getItem('chat_community_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...initialProfile,
          ...parsed,
          avatarUrl: sanitizeMediaUrl(parsed.avatarUrl),
          bannerUrl: sanitizeMediaUrl(parsed.bannerUrl)
        };
      }
    } catch (_) {}
    return initialProfile;
  });

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileViewMode, setProfileViewMode] = useState<'edit' | 'view'>('edit');
  const [editOptionsTab, setEditOptionsTab] = useState<'account' | 'customisation'>('account');
  const [publicProfileTab, setPublicProfileTab] = useState<'info' | 'aboutme'>('info');

  // Upload progress indicators
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Delete account confirmation modal & lifecycle guards
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const isAccountDeletingRef = useRef(false);
  const isRenamingRef = useRef(false);
  const isSessionVerifiedRef = useRef(false);
  const initialRankSnapshotRef = useRef<{
    loaded: boolean;
    rank: string | null;
    rankUpdatedAt: number | null;
    lastActionAt: number | null;
  }>({ loaded: false, rank: null, rankUpdatedAt: null, lastActionAt: null });
  const knownMessageIdsRef = useRef<Set<string> | null>(null);
  const knownNotificationIdsRef = useRef<Set<string> | null>(null);
  const knownNewsPostIdsRef = useRef<Set<string> | null>(null);
  const knownGroupMsgSignaturesRef = useRef<Set<string> | null>(null);
  const currentUsernameRef = useRef<string | null>(currentUser?.username || null);
  currentUsernameRef.current = currentUser?.username || null;

  // Action, Change Rank, & Mute Modals (Main Developer moderation tools)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [changeRankModalOpen, setChangeRankModalOpen] = useState(false);
  const [muteModalOpen, setMuteModalOpen] = useState(false);
  const [muteDurationId, setMuteDurationId] = useState<string>('5m');
  const [muteDropdownOpen, setMuteDropdownOpen] = useState(false);
  const [muteReason, setMuteReason] = useState('');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const isUnmutingRef = useRef(false);

  // Sub-modal state for Edit actions (info, username, bio, mood, glow, profileBorder, pfpBorder, music)
  const [activeEditSubModal, setActiveEditSubModal] = useState<
    'info' | 'username' | 'bio' | 'mood' | 'glow' | 'profileBorder' | 'pfpBorder' | 'music' | null
  >(null);
  const [tempAge, setTempAge] = useState('17');
  const [tempGender, setTempGender] = useState('MALE');
  const [tempRelationship, setTempRelationship] = useState('Rather not say');
  const [tempCountry, setTempCountry] = useState(initialGeo.country);
  const [tempLanguage, setTempLanguage] = useState(initialGeo.language);
  const [tempUsername, setTempUsername] = useState('');
  const [tempBio, setTempBio] = useState('');
  const [tempMood, setTempMood] = useState('');
  const [tempGlowColor, setTempGlowColor] = useState<string | null>(null);
  const [tempGlowThickness, setTempGlowThickness] = useState(18);
  const [tempProfileBorderIndex, setTempProfileBorderIndex] = useState(0);
  const [tempProfileBorderThickness, setTempProfileBorderThickness] = useState(2);
  const [tempPfpBorderIndex, setTempPfpBorderIndex] = useState(0);
  const [tempPfpBorderThickness, setTempPfpBorderThickness] = useState(2);

  // Profile Music Player State (supports playing own music OR any viewed user's music)
  const [activeAudioTrack, setActiveAudioTrack] = useState<MusicTrack | null>(null);
  const [isProfileMusicPlaying, setIsProfileMusicPlaying] = useState(false);
  const profileAudioRef = useRef<HTMLAudioElement | null>(null);

  // Detect user's country on load for default registration/temp state without overwriting existing RTDB profiles
  const detectedGeoRef = useRef<{ country: string; language: string }>(initialGeo);
  useEffect(() => {
    detectUserCountry().then(({ country, language }) => {
      detectedGeoRef.current = { country, language };
      setTempCountry((prev) => (!prev || prev === 'United Kingdom' ? country : prev));
      setTempLanguage((prev) => (!prev || prev === 'English' ? language : prev));
    });
  }, []);

  // Hidden file inputs for avatar & banner uploads
  const pfpInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Modal State for Landing Screen
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | 'terms' | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [birthDay, setBirthDay] = useState('Day');
  const [birthMonth, setBirthMonth] = useState('Month');
  const [birthYear, setBirthYear] = useState('Year');
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Edit username submodal states
  const [usernameEditError, setUsernameEditError] = useState<string | null>(null);
  const [usernameEditLoading, setUsernameEditLoading] = useState(false);

  // Landing Dropdown states
  const [genderDropdownOpen, setGenderDropdownOpen] = useState(false);
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  // Chat View State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('chat_community_messages');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<MessageReply | null>(null);
  const [chatMediaUrl, setChatMediaUrl] = useState<string | null>(null);
  const [chatMediaType, setChatMediaType] = useState<'image' | 'audio' | 'video' | null>(null);
  const [chatMediaName, setChatMediaName] = useState<string | null>(null);
  const [isUploadingChatMedia, setIsUploadingChatMedia] = useState(false);
  const chatMediaInputRef = useRef<HTMLInputElement>(null);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [activeMsgMenuId, setActiveMsgMenuId] = useState<string | null>(null);
  const [showTopic, setShowTopic] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [playerPopoverOpen, setPlayerPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number }>({ top: 80, right: 330 });
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfileData[]>([]);
  const [systemBotLikes, setSystemBotLikes] = useState<Record<string, boolean>>({});

  // Top-left Hamburger Menu, News Drawer (pinned left), Staff Modal, and Rules Modal state
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [newsDrawerOpen, setNewsDrawerOpen] = useState(false);
  const [newsComposerOpen, setNewsComposerOpen] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsDescription, setNewsDescription] = useState('');
  const [newsMediaUrl, setNewsMediaUrl] = useState<string | null>(null);
  const [newsMediaType, setNewsMediaType] = useState<'image' | 'video' | null>(null);
  const [isUploadingNewsMedia, setIsUploadingNewsMedia] = useState(false);
  const [isSendingNews, setIsSendingNews] = useState(false);
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [expandedNewsComments, setExpandedNewsComments] = useState<Record<string, boolean>>({});
  const [newsCommentInputs, setNewsCommentInputs] = useState<Record<string, string>>({});
  const newsMediaInputRef = useRef<HTMLInputElement>(null);
  const hamburgerMenuRef = useRef<HTMLDivElement>(null);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [expandedStaffCategory, setExpandedStaffCategory] = useState<string | null>(null);

  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [activeRulesTab, setActiveRulesTab] = useState<'user' | 'staff'>('user');
  const [messagesViewActive, setMessagesViewActive] = useState(false);
  const [dbMonitorModalOpen, setDbMonitorModalOpen] = useState(false);
  const [chatHistoryLimit, setChatHistoryLimit] = useState<number>(60);

  // Private Messages (PMs) State
  const [showPrivateMenu, setShowPrivateMenu] = useState(false);
  const [pmThreads, setPmThreads] = useState<PmThread[]>([]);
  const [activePmPeer, setActivePmPeer] = useState<string | null>(null);
  const [pmWindowExpanded, setPmWindowExpanded] = useState(false);
  const [pmInputText, setPmInputText] = useState('');
  const [pmMediaUrl, setPmMediaUrl] = useState<string | null>(null);
  const [pmMediaType, setPmMediaType] = useState<'image' | 'audio' | 'video' | null>(null);
  const [pmMediaName, setPmMediaName] = useState<string | null>(null);
  const [isUploadingPmMedia, setIsUploadingPmMedia] = useState(false);
  const [isListeningPmVoice, setIsListeningPmVoice] = useState(false);
  const pmRecognitionRef = useRef<any>(null);
  const pmMediaInputRef = useRef<HTMLInputElement>(null);
  const pmInputRef = useRef<HTMLInputElement>(null);
  const pmMessagesEndRef = useRef<HTMLDivElement>(null);
  const privateMenuRef = useRef<HTMLDivElement>(null);
  const knownPmSignaturesRef = useRef<Set<string> | null>(null);
  const registeredUsersRef = useRef<UserProfileData[]>([]);
  registeredUsersRef.current = registeredUsers;

  // Discord-style bottom-left stacking & fading toast notifications for Messages / Groupchats
  const [messengerToasts, setMessengerToasts] = useState<MessengerToastItem[]>([]);

  const dismissMessengerToast = useCallback((toastId: string) => {
    setMessengerToasts((prev) =>
      prev.map((t) => (t.id === toastId ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setMessengerToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 320);
  }, []);

  const enqueueMessengerToast = useCallback((toast: Omit<MessengerToastItem, 'exiting'>) => {
    setMessengerToasts((prev) => {
      if (prev.some((t) => t.id === toast.id)) return prev;
      return [...prev.slice(-4), { ...toast, exiting: false }];
    });
    setTimeout(() => {
      setMessengerToasts((prev) =>
        prev.map((t) => (t.id === toast.id ? { ...t, exiting: true } : t))
      );
    }, 4200);
    setTimeout(() => {
      setMessengerToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 4550);
  }, []);

  // Targeted helper to persist profile updates cleanly to Realtime Database & localStorage
  // Prevents infinite onValue <-> useEffect loops and never writes temporary blob: URLs
  const saveProfileToRtdb = useCallback(
    async (updates: Partial<UserProfileState>, overrideUsername?: string) => {
      const targetName = overrideUsername || currentUser?.username;
      if (!targetName || isAccountDeletingRef.current) return;

      const dbKey = sanitizeDbKey(targetName);
      const cleanUpdates: Record<string, any> = { ...updates };

      if ('avatarUrl' in cleanUpdates) {
        cleanUpdates.avatarUrl = sanitizeMediaUrl(cleanUpdates.avatarUrl);
      }
      if ('bannerUrl' in cleanUpdates) {
        cleanUpdates.bannerUrl = sanitizeMediaUrl(cleanUpdates.bannerUrl);
      }

      try {
        await update(ref(rtdb, `users/${dbKey}`), {
          ...cleanUpdates,
          username: targetName,
          usernameLower: targetName.toLowerCase(),
          isOnline: true,
          updatedAt: serverTimestamp()
        });
      } catch (err: any) {
        console.warn('Realtime Database profile update notice:', err?.message || err);
      }
    },
    [currentUser?.username]
  );

  // Sync currentUser & userProfile to localStorage
  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem('chat_community_user', JSON.stringify(currentUser));
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem('chat_community_user');
      } catch (_) {}
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      try {
        const persisted = {
          ...userProfile,
          avatarUrl: sanitizeMediaUrl(userProfile.avatarUrl),
          bannerUrl: sanitizeMediaUrl(userProfile.bannerUrl)
        };
        localStorage.setItem('chat_community_profile', JSON.stringify(persisted));
      } catch (_) {}
    }
  }, [userProfile, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('chat_community_messages', JSON.stringify(messages));
    } catch (_) {}
  }, [messages]);

  // Real-time Firebase Realtime Database messages listener (Loads latest 60 messages initially, expands on scroll-up, auto-clears at 200 messages)
  useEffect(() => {
    try {
      const messagesRef = ref(rtdb, 'messages');
      const messagesQuery = query(messagesRef, limitToLast(chatHistoryLimit));
      const unsubscribe = onValue(
        messagesQuery,
        (snapshot) => {
          if (snapshot.exists()) {
            // Auto-clear all chat messages in the database if count reaches 200
            if (snapshot.size >= 200) {
              remove(messagesRef).catch(() => {});
              setMessages([]);
              try {
                localStorage.removeItem('chat_community_messages');
              } catch (_) {}
              return;
            }

            const liveMsgs: ChatMessage[] = [];
            snapshot.forEach((childSnap) => {
              const data = childSnap.val();
              if (!data || (typeof data.text !== 'string' && typeof data.mediaUrl !== 'string')) return;
              let ts = 'Just now';
              const createdNum = typeof data.createdAt === 'number' ? data.createdAt : undefined;
              if (createdNum) {
                ts = new Date(createdNum).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } else if (data.timestamp) {
                ts = data.timestamp;
              }
              const cleanMediaUrl = sanitizeMediaUrl(data.mediaUrl);
              const resolvedMediaType: 'image' | 'audio' | 'video' | null =
                data.mediaType === 'video'
                  ? 'video'
                  : data.mediaType === 'audio'
                  ? 'audio'
                  : cleanMediaUrl
                  ? 'image'
                  : null;
              liveMsgs.push({
                id: childSnap.key || Date.now().toString(),
                sender: data.sender || 'Anonymous',
                senderKey: data.senderKey || sanitizeDbKey(data.sender || 'Anonymous'),
                text: typeof data.text === 'string' ? data.text : '',
                timestamp: ts,
                createdAt: createdNum,
                avatarUrl: sanitizeMediaUrl(data.avatarUrl),
                pfpBorderId: data.pfpBorderId || null,
                pfpBorderThickness: typeof data.pfpBorderThickness === 'number' ? data.pfpBorderThickness : 2,
                rank: data.rank || null,
                replyTo: data.replyTo || null,
                mediaUrl: cleanMediaUrl,
                mediaType: resolvedMediaType,
                mediaName: data.mediaName || null
              });
            });

            // Detect newly arrived chat messages and play appropriate sound effects
            if (knownMessageIdsRef.current === null) {
              knownMessageIdsRef.current = new Set(liveMsgs.map((m) => m.id));
            } else {
              const newlyAddedMsgs = liveMsgs.filter((m) => !knownMessageIdsRef.current!.has(m.id));
              knownMessageIdsRef.current = new Set(liveMsgs.map((m) => m.id));
              if (newlyAddedMsgs.length > 0) {
                triggerBackgroundTabFaviconAlert();

                const myName = (currentUsernameRef.current || '').trim();
                const otherUserMsgs = myName
                  ? newlyAddedMsgs.filter(
                      (m) => m.sender.trim().toLowerCase() !== myName.toLowerCase()
                    )
                  : newlyAddedMsgs;

                if (otherUserMsgs.length > 0) {
                  const isReplyToMe = Boolean(
                    myName &&
                      otherUserMsgs.some(
                        (m) =>
                          m.replyTo?.sender &&
                          m.replyTo.sender.trim().toLowerCase() === myName.toLowerCase()
                      )
                  );

                  const escapedMe = myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const tagRegex = myName
                    ? new RegExp(`(^|[^a-zA-Z0-9_])@?${escapedMe}(?=$|[^a-zA-Z0-9_])`, 'i')
                    : null;
                  const isTaggedMe = Boolean(
                    tagRegex && otherUserMsgs.some((m) => tagRegex.test(m.text || ''))
                  );

                  if (isReplyToMe) {
                    playAppSound(quoteSoundUrl || '/quote.mp3');
                  } else if (isTaggedMe) {
                    playAppSound(usernameSoundUrl || '/username.mp3');
                  } else {
                    playAppSound(newMessagesSoundUrl || '/new_messages.mp3');
                  }
                }
              }
            }

            setMessages(liveMsgs);
          } else {
            if (knownMessageIdsRef.current !== null && knownMessageIdsRef.current.size > 0) {
              playAppSound(clearSoundUrl || '/clear.mp3');
            }
            knownMessageIdsRef.current = new Set();
            setMessages([]);
            try {
              localStorage.removeItem('chat_community_messages');
            } catch (_) {}
          }
        },
        (err) => {
          console.warn('Realtime Database messages listener notice:', err.message);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Realtime Database initialization notice:', err);
    }
  }, [chatHistoryLimit]);

  // Restore favicon to /favicon.png when the user enters or focuses the tab
  useEffect(() => {
    try {
      if (sessionStorage.getItem('teenverse_pending_favicon_alert') === '1' && isUserOutOfTab()) {
        setDocumentFavicon('/favicon2.png');
      }
    } catch (_) {}

    const handleEnterTab = () => {
      if (!document.hidden && document.visibilityState !== 'hidden') {
        try {
          sessionStorage.removeItem('teenverse_pending_favicon_alert');
        } catch (_) {}
        setDocumentFavicon('/favicon.png');
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && document.visibilityState !== 'hidden') {
        handleEnterTab();
      }
    };

    window.addEventListener('focus', handleEnterTab);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', handleEnterTab);
    window.addEventListener('keydown', handleEnterTab);

    return () => {
      window.removeEventListener('focus', handleEnterTab);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', handleEnterTab);
      window.removeEventListener('keydown', handleEnterTab);
    };
  }, []);

  // Real-time listener for all registered/online users in Firebase Realtime Database
  // Filters out any incomplete ghost nodes and automatically cleans them up in RTDB
  useEffect(() => {
    try {
      const usersRef = ref(rtdb, 'users');
      const unsubscribe = onValue(
        usersRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const list: UserProfileData[] = [];
            snapshot.forEach((childSnap) => {
              const val = childSnap.val();
              const key = childSnap.key;
              if (!val || typeof val !== 'object') return;
              if (
                key === '__system_news__' ||
                key === '__system_bot__' ||
                key === '__system_messenger__'
              ) {
                return;
              }

              // Check if this node is a valid registered user (must have username string)
              if (typeof val.username !== 'string' || !val.username.trim()) {
                // Clean up orphaned ghost node created by stale onDisconnect
                if (key && !isRenamingRef.current && !isAccountDeletingRef.current) {
                  remove(ref(rtdb, `users/${key}`)).catch(() => {});
                }
                return;
              }

              const uName = val.username.trim();
              const rawLikes = val.likes && typeof val.likes === 'object' ? val.likes : {};
              list.push({
                username: uName,
                email: val.email || undefined,
                rank: val.rank || null,
                avatarUrl: sanitizeMediaUrl(val.avatarUrl),
                avatarPublicId: val.avatarPublicId || null,
                avatarDeleteToken: val.avatarDeleteToken || null,
                bannerUrl: sanitizeMediaUrl(val.bannerUrl),
                bannerPublicId: val.bannerPublicId || null,
                bannerDeleteToken: val.bannerDeleteToken || null,
                age: val.age ? String(val.age) : '17',
                gender: val.gender || 'MALE',
                relationship: val.relationship || 'Rather not say',
                country: val.country || 'Global',
                language: val.language || 'English',
                bio: val.bio || '',
                mood: val.mood || '',
                glowColor: val.glowColor || null,
                glowThickness: typeof val.glowThickness === 'number' ? val.glowThickness : 18,
                profileBorderId: val.profileBorderId || 'pb-default',
                profileBorderThickness: typeof val.profileBorderThickness === 'number' ? val.profileBorderThickness : 2,
                pfpBorderId: val.pfpBorderId || 'pfp-default',
                pfpBorderThickness: typeof val.pfpBorderThickness === 'number' ? val.pfpBorderThickness : 2,
                musicTrack: val.musicTrack || null,
                mutedUntil: typeof val.mutedUntil === 'number' ? val.mutedUntil : null,
                muteDuration: val.muteDuration || null,
                muteReason: val.muteReason || null,
                muteNotificationId: val.muteNotificationId || null,
                likes: rawLikes,
                msgProfile: val.msgProfile && typeof val.msgProfile === 'object' ? val.msgProfile : undefined,
                msgFollowers: val.msgFollowers && typeof val.msgFollowers === 'object' ? val.msgFollowers : undefined,
                msgFollowing: val.msgFollowing && typeof val.msgFollowing === 'object' ? val.msgFollowing : undefined,
                msgFavorites: val.msgFavorites && typeof val.msgFavorites === 'object' ? val.msgFavorites : undefined,
                isOnline: val.isOnline === true,
                lastSeen: val.lastSeen || null,
                updatedAt: val.updatedAt || null
              });
            });
            setRegisteredUsers(list);
          } else {
            setRegisteredUsers([]);
          }
        },
        (err) => {
          console.warn('Realtime Database users listener notice:', err.message);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Realtime Database users listener initialization notice:', err);
    }
  }, []);

  // Real-time listener for current user's notifications in Firebase Realtime Database
  useEffect(() => {
    if (!currentUser?.username) {
      knownNotificationIdsRef.current = null;
      setNotifications([]);
      return;
    }
    knownNotificationIdsRef.current = null;
    const myKey = sanitizeDbKey(currentUser.username);
    const notifRef = query(ref(rtdb, `users/${myKey}/notifications`), limitToLast(50));
    const unsubscribe = onValue(
      notifRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const items: AppNotification[] = [];
          snapshot.forEach((childSnap) => {
            const val = childSnap.val();
            if (!val || typeof val !== 'object') return;
            items.push({
              id: childSnap.key || String(Date.now()),
              type:
                val.type === 'rank_change'
                  ? 'rank_change'
                  : val.type === 'mute'
                  ? 'mute'
                  : val.type === 'profile_like'
                  ? 'profile_like'
                  : 'profile_visit',
              fromUsername: val.fromUsername || 'System',
              fromAvatarUrl: sanitizeMediaUrl(val.fromAvatarUrl),
              fromPfpBorderId: val.fromPfpBorderId || null,
              fromPfpBorderThickness: typeof val.fromPfpBorderThickness === 'number' ? val.fromPfpBorderThickness : 2,
              text: val.text || '',
              createdAt: typeof val.createdAt === 'number' ? val.createdAt : Date.now(),
              read: val.read === true
            });
          });
          items.sort((a, b) => b.createdAt - a.createdAt);

          if (knownNotificationIdsRef.current === null) {
            knownNotificationIdsRef.current = new Set(items.map((n) => `${n.id}:${n.text}`));
            if (items.some((n) => !n.read)) {
              triggerBackgroundTabFaviconAlert();
            }
          } else {
            const hasNewOrUpdatedNotif = items.some(
              (n) => !knownNotificationIdsRef.current!.has(`${n.id}:${n.text}`)
            );
            knownNotificationIdsRef.current = new Set(items.map((n) => `${n.id}:${n.text}`));
            if (hasNewOrUpdatedNotif) {
              triggerBackgroundTabFaviconAlert();
              playAppSound(notifySoundUrl || '/notify.mp3');
            }
          }

          setNotifications(items);
        } else {
          knownNotificationIdsRef.current = new Set();
          setNotifications([]);
        }
      },
      (err) => {
        console.warn('Realtime Database notifications listener notice:', err.message);
      }
    );
    return () => unsubscribe();
  }, [currentUser?.username]);

  // Real-time listener for current user's Private Messages (PMs) in Firebase Realtime Database
  useEffect(() => {
    if (!currentUser?.username) {
      knownPmSignaturesRef.current = null;
      setPmThreads([]);
      setActivePmPeer(null);
      return;
    }
    knownPmSignaturesRef.current = null;
    const myKey = sanitizeDbKey(currentUser.username);
    const pmsRef = ref(rtdb, `users/${myKey}/pms`);
    const unsubscribe = onValue(
      pmsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const threads: PmThread[] = [];
          const currentSigs: string[] = [];
          const allPmEntries: {
            sig: string;
            peerUsername: string;
            peerAvatarUrl: string | null;
            msg: PmMessage;
          }[] = [];

          snapshot.forEach((childSnap) => {
            const val = childSnap.val();
            const peerKey = childSnap.key;
            if (!val || typeof val !== 'object' || !peerKey) return;

            const threadPeerName = val.peerUsername || peerKey;
            const threadPeerAvatar = sanitizeMediaUrl(val.peerAvatarUrl);
            const msgsList: PmMessage[] = [];
            if (val.messages && typeof val.messages === 'object') {
              for (const [mId, mVal] of Object.entries(val.messages)) {
                const m = mVal as any;
                if (!m || (typeof m.text !== 'string' && typeof m.mediaUrl !== 'string')) continue;
                const cAt = typeof m.createdAt === 'number' ? m.createdAt : Date.now();
                const cleanUrl = sanitizeMediaUrl(m.mediaUrl);
                const mType: 'image' | 'audio' | 'video' | null =
                  m.mediaType === 'video'
                    ? 'video'
                    : m.mediaType === 'audio'
                    ? 'audio'
                    : cleanUrl
                    ? 'image'
                    : null;
                const msgObj: PmMessage = {
                  id: mId,
                  sender: m.sender || 'Anonymous',
                  text: typeof m.text === 'string' ? m.text : '',
                  timestamp:
                    m.timestamp ||
                    new Date(cAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  createdAt: cAt,
                  mediaUrl: cleanUrl,
                  mediaType: mType,
                  mediaName: m.mediaName || null
                };
                msgsList.push(msgObj);
                const sig = `${peerKey}:${mId}`;
                currentSigs.push(sig);
                allPmEntries.push({
                  sig,
                  peerUsername: threadPeerName,
                  peerAvatarUrl: threadPeerAvatar,
                  msg: msgObj
                });
              }
            }
            msgsList.sort((a, b) => a.createdAt - b.createdAt);

            const lastMsgTime = msgsList.length > 0 ? msgsList[msgsList.length - 1].createdAt : 0;
            threads.push({
              peerKey,
              peerUsername: threadPeerName,
              peerAvatarUrl: threadPeerAvatar,
              unread: val.unread === true,
              unreadCount: typeof val.unreadCount === 'number' ? val.unreadCount : val.unread ? 1 : 0,
              updatedAt: typeof val.updatedAt === 'number' ? val.updatedAt : lastMsgTime || Date.now(),
              messages: msgsList
            });
          });

          // Auto-delete all PMs for this user if total PM messages across threads hits 1,000
          if (currentSigs.length >= 1000) {
            remove(pmsRef).catch(() => {});
            setPmThreads([]);
            return;
          }

          threads.sort((a, b) => b.updatedAt - a.updatedAt);

          if (knownPmSignaturesRef.current === null) {
            knownPmSignaturesRef.current = new Set(currentSigs);
            if (threads.some((t) => t.unread)) {
              triggerBackgroundTabFaviconAlert();
            }
          } else {
            const newEntries = allPmEntries.filter(
              (entry) => !knownPmSignaturesRef.current!.has(entry.sig)
            );
            knownPmSignaturesRef.current = new Set(currentSigs);

            if (newEntries.length > 0) {
              triggerBackgroundTabFaviconAlert();

              const incomingFromOthers = newEntries.filter(
                (entry) =>
                  entry.msg.sender.trim().toLowerCase() !==
                  currentUser.username.trim().toLowerCase()
              );

              if (incomingFromOthers.length > 0) {
                playAppSound(privateSoundUrl || '/private.mp3');

                incomingFromOthers.slice(-3).forEach((entry) => {
                  const senderLower = entry.msg.sender.trim().toLowerCase();
                  const senderProfile = registeredUsersRef.current.find(
                    (u) => u.username.toLowerCase() === senderLower
                  );
                  const displayName =
                    senderProfile?.msgProfile?.displayName ||
                    senderProfile?.username ||
                    entry.msg.sender;
                  const avatarUrl =
                    senderLower === 'system'
                      ? SYSTEM_BOT_AVATAR
                      : senderProfile?.msgProfile?.avatarUrl ||
                        senderProfile?.avatarUrl ||
                        entry.peerAvatarUrl ||
                        null;
                  const previewText =
                    entry.msg.text ||
                    (entry.msg.mediaType === 'video'
                      ? '🎬 Sent a video'
                      : entry.msg.mediaType === 'audio'
                      ? '🎵 Sent an audio clip'
                      : '📷 Sent an image');

                  enqueueMessengerToast({
                    id: `pm-${entry.sig}`,
                    senderUsername: entry.msg.sender,
                    senderDisplayName: displayName,
                    senderAvatarUrl: avatarUrl,
                    groupName: null,
                    text: previewText
                  });
                });
              }
            }
          }

          setPmThreads(threads);
        } else {
          knownPmSignaturesRef.current = new Set();
          setPmThreads([]);
        }
      },
      (err) => {
        console.warn('Realtime Database PMs listener notice:', err.message);
      }
    );
    return () => unsubscribe();
  }, [currentUser?.username, enqueueMessengerToast]);

  // Real-time listener for Groupchat messages in Messages (triggers bottom-left Discord toast & sound)
  useEffect(() => {
    if (!currentUser?.username) {
      knownGroupMsgSignaturesRef.current = null;
      return;
    }
    knownGroupMsgSignaturesRef.current = null;
    const myKey = sanitizeDbKey(currentUser.username);
    const groupsRef = ref(rtdb, 'users/__system_messenger__/groups');

    const unsubGroups = onValue(
      groupsRef,
      (snap) => {
        if (!snap.exists() || typeof snap.val() !== 'object') {
          knownGroupMsgSignaturesRef.current = new Set();
          return;
        }
        const groupsVal = snap.val();
        const currentSigs: string[] = [];
        const allGroupEntries: {
          sig: string;
          groupName: string;
          sender: string;
          senderDisplayName: string;
          senderAvatarUrl: string | null;
          text: string;
        }[] = [];

        for (const [gId, gRaw] of Object.entries(groupsVal)) {
          const g = gRaw as any;
          if (!g || !g.name) continue;
          const members = g.members && typeof g.members === 'object' ? g.members : {};
          if (!members[myKey]) continue;

          if (g.messages && typeof g.messages === 'object') {
            for (const [mId, mRaw] of Object.entries(g.messages)) {
              const m = mRaw as any;
              if (!m) continue;
              const sig = `${gId}:${mId}`;
              currentSigs.push(sig);
              const previewText =
                (typeof m.text === 'string' && m.text.trim()) ||
                (m.mediaType === 'video'
                  ? '🎬 Sent a video'
                  : m.mediaType === 'audio'
                  ? '🎵 Sent an audio clip'
                  : m.mediaUrl
                  ? '📷 Sent an image'
                  : '');
              if (!previewText) continue;

              allGroupEntries.push({
                sig,
                groupName: g.name,
                sender: m.sender || 'User',
                senderDisplayName: m.senderDisplayName || m.sender || 'User',
                senderAvatarUrl: sanitizeMediaUrl(m.senderAvatarUrl),
                text: previewText
              });
            }
          }
        }

        if (knownGroupMsgSignaturesRef.current === null) {
          knownGroupMsgSignaturesRef.current = new Set(currentSigs);
        } else {
          const newEntries = allGroupEntries.filter(
            (e) => !knownGroupMsgSignaturesRef.current!.has(e.sig)
          );
          knownGroupMsgSignaturesRef.current = new Set(currentSigs);

          const incomingFromOthers = newEntries.filter(
            (e) => e.sender.trim().toLowerCase() !== currentUser.username.trim().toLowerCase()
          );

          if (incomingFromOthers.length > 0) {
            triggerBackgroundTabFaviconAlert();
            playAppSound(privateSoundUrl || '/private.mp3');

            incomingFromOthers.slice(-3).forEach((entry) => {
              const senderLower = entry.sender.trim().toLowerCase();
              const senderProfile = registeredUsersRef.current.find(
                (u) => u.username.toLowerCase() === senderLower
              );
              const resolvedAvatar =
                senderLower === 'system'
                  ? SYSTEM_BOT_AVATAR
                  : entry.senderAvatarUrl ||
                    senderProfile?.msgProfile?.avatarUrl ||
                    senderProfile?.avatarUrl ||
                    null;

              enqueueMessengerToast({
                id: `grp-${entry.sig}`,
                senderUsername: entry.sender,
                senderDisplayName: entry.senderDisplayName,
                senderAvatarUrl: resolvedAvatar,
                groupName: entry.groupName,
                text: entry.text
              });
            });
          }
        }
      },
      () => {}
    );

    return () => unsubGroups();
  }, [currentUser?.username, enqueueMessengerToast]);

  // Real-time listener for Community News posts (auto-clears at 10 news posts) & System bot likes
  useEffect(() => {
    try {
      const newsRef = ref(rtdb, 'users/__system_news__/posts');
      const newsQuery = query(newsRef, limitToLast(12));
      const unsubNews = onValue(
        newsQuery,
        (snapshot) => {
          if (snapshot.exists()) {
            if (snapshot.size >= 10) {
              remove(newsRef).catch(() => {});
              setNewsPosts([]);
              return;
            }
            const items: NewsPost[] = [];
            snapshot.forEach((childSnap) => {
              const val = childSnap.val();
              if (!val || typeof val !== 'object') return;
              const rawComments: NewsComment[] = [];
              if (val.comments && typeof val.comments === 'object') {
                for (const [cId, cVal] of Object.entries(val.comments)) {
                  const c = cVal as any;
                  if (c && typeof c.text === 'string') {
                    rawComments.push({
                      id: cId,
                      author: c.author || 'Anonymous',
                      authorAvatar: sanitizeMediaUrl(c.authorAvatar),
                      authorRank: c.authorRank || null,
                      text: c.text,
                      createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now()
                    });
                  }
                }
              }
              rawComments.sort((a, b) => a.createdAt - b.createdAt);

              items.push({
                id: childSnap.key || String(Date.now()),
                author: val.author || 'Developer',
                authorAvatar: sanitizeMediaUrl(val.authorAvatar),
                authorRank: val.authorRank || null,
                authorPfpBorderId: val.authorPfpBorderId || 'pfp-default',
                authorPfpBorderThickness: typeof val.authorPfpBorderThickness === 'number' ? val.authorPfpBorderThickness : 2,
                title: val.title || '',
                description: val.description || '',
                mediaUrl: sanitizeMediaUrl(val.mediaUrl),
                mediaType: val.mediaType === 'video' ? 'video' : val.mediaUrl ? 'image' : null,
                createdAt: typeof val.createdAt === 'number' ? val.createdAt : Date.now(),
                likes: val.likes && typeof val.likes === 'object' ? val.likes : {},
                dislikes: val.dislikes && typeof val.dislikes === 'object' ? val.dislikes : {},
                loves: val.loves && typeof val.loves === 'object' ? val.loves : {},
                laughs: val.laughs && typeof val.laughs === 'object' ? val.laughs : {},
                comments: rawComments
              });
            });
            items.sort((a, b) => b.createdAt - a.createdAt);
            if (knownNewsPostIdsRef.current === null) {
              knownNewsPostIdsRef.current = new Set(items.map((p) => p.id));
            } else {
              const hasNewNewsPost = items.some((p) => !knownNewsPostIdsRef.current!.has(p.id));
              knownNewsPostIdsRef.current = new Set(items.map((p) => p.id));
              if (hasNewNewsPost) {
                playAppSound(newNewsSoundUrl || '/new_news.mp3');
                triggerBackgroundTabFaviconAlert();
              }
            }
            setNewsPosts(items);
          } else {
            knownNewsPostIdsRef.current = new Set();
            setNewsPosts([]);
          }
        },
        (err) => {
          console.warn('Realtime Database news listener notice:', err.message);
        }
      );

      const sysBotLikesRef = ref(rtdb, 'users/__system_bot__/likes');
      const unsubSysLikes = onValue(
        sysBotLikesRef,
        (snapshot) => {
          if (snapshot.exists() && typeof snapshot.val() === 'object') {
            setSystemBotLikes(snapshot.val());
          } else {
            setSystemBotLikes({});
          }
        },
        () => {}
      );

      return () => {
        unsubNews();
        unsubSysLikes();
      };
    } catch (err) {
      console.warn('News listener init notice:', err);
    }
  }, []);

  // Permanently delete user account:
  // - Cancels onDisconnect hooks so no ghost node is recreated
  // - Deletes all chat messages sent by this user from Realtime Database
  // - Deletes user node users/${dbKey} from Realtime Database
  // - Deletes uploaded avatar, banner, and music from Cloudinary
  // - Clears all local storage and state, stops audio
  // - Logs the user out completely
  const handlePermanentAccountDeletion = useCallback(async (
    targetUsername: string,
    profileData?: UserProfileState
  ) => {
    if (isAccountDeletingRef.current) return;
    isAccountDeletingRef.current = true;
    isSessionVerifiedRef.current = false;

    try {
      const trimmedUser = targetUsername.trim();
      const usernameLower = trimmedUser.toLowerCase();
      const dbKey = sanitizeDbKey(trimmedUser);

      // Cancel any pending onDisconnect hooks first so RTDB doesn't recreate a stub node
      try {
        await onDisconnect(ref(rtdb, `users/${dbKey}/isOnline`)).cancel();
        await onDisconnect(ref(rtdb, `users/${dbKey}/lastSeen`)).cancel();
      } catch (_) {}

      // 1. Immediately log out and reset local state
      setCurrentUser(null);
      setUserProfile(initialProfile);
      setSelectedUser(null);
      setProfileModalOpen(false);
      setActiveEditSubModal(null);
      setShowProfileMenu(false);
      setShowGuide(false);
      setPlayerPopoverOpen(false);
      setShowDeleteAccountModal(false);
      setModalType(null);
      setReplyingTo(null);
      setLoginError('This account was deleted from the database. All profile information and chat messages have been permanently removed.');

      try {
        localStorage.removeItem('chat_community_user');
        localStorage.removeItem('chat_community_profile');
        localStorage.removeItem('chat_community_messages');
      } catch (_) {}

      if (profileAudioRef.current) {
        profileAudioRef.current.pause();
      }
      setActiveAudioTrack(null);
      setIsProfileMusicPlaying(false);

      // Remove messages locally immediately
      setMessages((prev) => prev.filter((m) => m.sender.toLowerCase() !== usernameLower));

      // 2. Permanently delete all chat messages sent by this user from the Realtime Database
      try {
        const messagesRef = ref(rtdb, 'messages');
        const msgsSnap = await get(messagesRef);
        if (msgsSnap.exists()) {
          const allMsgs = msgsSnap.val();
          const updatesMap: Record<string, null> = {};
          for (const [key, msg] of Object.entries(allMsgs)) {
            const sender = (msg as any)?.sender;
            const senderKey = (msg as any)?.senderKey;
            if (
              (typeof sender === 'string' && sender.trim().toLowerCase() === usernameLower) ||
              senderKey === dbKey
            ) {
              updatesMap[key] = null;
            }
          }
          if (Object.keys(updatesMap).length > 0) {
            await update(messagesRef, updatesMap);
          }
        }
      } catch (msgErr) {
        console.warn('Error deleting user messages in RTDB:', msgErr);
      }

      // 3. Ensure user record in RTDB is completely wiped
      try {
        await remove(ref(rtdb, `users/${dbKey}`));
      } catch (userErr) {
        console.warn('Error removing user record in RTDB:', userErr);
      }

      // 4. Delete avatar, banner & music from Cloudinary
      const pfpUrl = profileData?.avatarUrl;
      const pfpPublicId = profileData?.avatarPublicId;
      const pfpToken = profileData?.avatarDeleteToken;
      if (pfpUrl || pfpPublicId) {
        deleteFromCloudinary({
          url: pfpUrl,
          publicId: pfpPublicId,
          deleteToken: pfpToken,
          resourceType: 'image'
        }).catch(() => {});
      }

      const bannerUrl = profileData?.bannerUrl;
      const bannerPublicId = profileData?.bannerPublicId;
      const bannerToken = profileData?.bannerDeleteToken;
      if (bannerUrl || bannerPublicId) {
        deleteFromCloudinary({
          url: bannerUrl,
          publicId: bannerPublicId,
          deleteToken: bannerToken,
          resourceType: 'image'
        }).catch(() => {});
      }

      const music = profileData?.musicTrack;
      if (music && (music.url || music.publicId)) {
        deleteFromCloudinary({
          url: music.url,
          publicId: music.publicId,
          deleteToken: music.deleteToken,
          resourceType: 'video'
        }).catch(() => {});
      }
    } finally {
      setIsDeletingAccount(false);
      setTimeout(() => {
        isAccountDeletingRef.current = false;
      }, 1000);
    }
  }, [initialProfile]);

  // Live account listener & presence manager for the current logged-in user
  useEffect(() => {
    if (!currentUser || !currentUser.username) {
      isSessionVerifiedRef.current = false;
      return;
    }
    if (isAccountDeletingRef.current) return;

    const dbKey = sanitizeDbKey(currentUser.username);
    const userRef = ref(rtdb, `users/${dbKey}`);
    const connectedRef = ref(rtdb, '.info/connected');
    const userOnlineRef = ref(rtdb, `users/${dbKey}/isOnline`);
    const userLastSeenRef = ref(rtdb, `users/${dbKey}/lastSeen`);

    let connectedUnsub: (() => void) | null = null;

    const setupPresence = () => {
      if (connectedUnsub) return;
      connectedUnsub = onValue(connectedRef, (snap) => {
        if (isAccountDeletingRef.current || isRenamingRef.current || !isSessionVerifiedRef.current) return;
        if (snap.val() === true) {
          onDisconnect(userOnlineRef).set(false);
          onDisconnect(userLastSeenRef).set(serverTimestamp());
          update(userRef, {
            isOnline: true,
            lastSeen: serverTimestamp()
          }).catch(() => {});
        }
      });
    };

    initialRankSnapshotRef.current = { loaded: false, rank: null, rankUpdatedAt: null, lastActionAt: null };

    const unsubscribeUser = onValue(
      userRef,
      (snap) => {
        if (isAccountDeletingRef.current || isRenamingRef.current) return;

        // If the user node was deleted or is a ghost node without username:
        if (!snap.exists() || !snap.val()?.username) {
          console.warn(`[Teenverse] User "${currentUser.username}" no longer exists in Realtime Database. Logging out & cleaning up...`);
          handlePermanentAccountDeletion(currentUser.username, userProfile);
          return;
        }

        const val = snap.val();
        isSessionVerifiedRef.current = true;
        setupPresence();

        // Detect live rank changes or moderation actions on the currently logged-in user
        const incomingRank = val.rank !== undefined ? (val.rank || null) : null;
        const incomingRankUpdatedAt = typeof val.rankUpdatedAt === 'number' ? val.rankUpdatedAt : null;
        const incomingLastActionAt = typeof val.lastActionAt === 'number' ? val.lastActionAt : null;

        if (!initialRankSnapshotRef.current.loaded) {
          initialRankSnapshotRef.current = {
            loaded: true,
            rank: incomingRank,
            rankUpdatedAt: incomingRankUpdatedAt,
            lastActionAt: incomingLastActionAt
          };
        } else {
          if (
            incomingLastActionAt !== null &&
            incomingLastActionAt !== initialRankSnapshotRef.current.lastActionAt
          ) {
            initialRankSnapshotRef.current.lastActionAt = incomingLastActionAt;
            triggerBackgroundTabFaviconAlert();
          }

          if (
            incomingRank !== initialRankSnapshotRef.current.rank ||
            (incomingRankUpdatedAt !== null &&
              incomingRankUpdatedAt !== initialRankSnapshotRef.current.rankUpdatedAt)
          ) {
            initialRankSnapshotRef.current = {
              loaded: true,
              rank: incomingRank,
              rankUpdatedAt: incomingRankUpdatedAt,
              lastActionAt: incomingLastActionAt
            };
            triggerBackgroundTabFaviconAlert();
            try {
              const savedProf = localStorage.getItem('chat_community_profile');
              const parsedProf = savedProf ? JSON.parse(savedProf) : {};
              localStorage.setItem(
                'chat_community_profile',
                JSON.stringify({ ...parsedProf, rank: incomingRank })
              );
            } catch (_) {}
            window.location.reload();
            return;
          }
        }

        // Sync remote profile changes into local state only if values actually changed
        setUserProfile((prev) => {
          const nextAvatar = val.avatarUrl !== undefined ? sanitizeMediaUrl(val.avatarUrl) : prev.avatarUrl;
          const nextBanner = val.bannerUrl !== undefined ? sanitizeMediaUrl(val.bannerUrl) : prev.bannerUrl;
          // Preserve local blob preview if currently uploading
          const effectiveAvatar = prev.avatarUrl?.startsWith('blob:') ? prev.avatarUrl : nextAvatar;
          const effectiveBanner = prev.bannerUrl?.startsWith('blob:') ? prev.bannerUrl : nextBanner;

          const nextState: UserProfileState = {
            avatarUrl: effectiveAvatar,
            avatarPublicId: val.avatarPublicId !== undefined ? val.avatarPublicId : prev.avatarPublicId,
            avatarDeleteToken: val.avatarDeleteToken !== undefined ? val.avatarDeleteToken : prev.avatarDeleteToken,
            bannerUrl: effectiveBanner,
            bannerPublicId: val.bannerPublicId !== undefined ? val.bannerPublicId : prev.bannerPublicId,
            bannerDeleteToken: val.bannerDeleteToken !== undefined ? val.bannerDeleteToken : prev.bannerDeleteToken,
            age: val.age ? String(val.age) : prev.age,
            gender: val.gender || prev.gender,
            relationship: val.relationship || prev.relationship,
            country: val.country || prev.country,
            language: val.language || prev.language,
            bio: val.bio !== undefined ? val.bio : prev.bio,
            mood: val.mood !== undefined ? val.mood : prev.mood,
            glowColor: val.glowColor !== undefined ? val.glowColor : prev.glowColor,
            glowThickness: typeof val.glowThickness === 'number' ? val.glowThickness : prev.glowThickness,
            profileBorderId: val.profileBorderId || prev.profileBorderId,
            profileBorderThickness: typeof val.profileBorderThickness === 'number' ? val.profileBorderThickness : prev.profileBorderThickness,
            pfpBorderId: val.pfpBorderId || prev.pfpBorderId,
            pfpBorderThickness: typeof val.pfpBorderThickness === 'number' ? val.pfpBorderThickness : prev.pfpBorderThickness,
            musicTrack: val.musicTrack || null,
            rank: val.rank !== undefined ? val.rank : prev.rank,
            mutedUntil: typeof val.mutedUntil === 'number' ? val.mutedUntil : null,
            muteDuration: val.muteDuration || null,
            muteReason: val.muteReason || null,
            muteNotificationId: val.muteNotificationId || null,
            likes: val.likes && typeof val.likes === 'object' ? val.likes : {}
          };

          if (JSON.stringify(prev) === JSON.stringify(nextState)) {
            return prev;
          }
          return nextState;
        });
      },
      (err) => {
        console.warn('Realtime Database account listener notice:', err);
      }
    );

    return () => {
      unsubscribeUser();
      if (connectedUnsub) connectedUnsub();
    };
  }, [currentUser?.username, handlePermanentAccountDeletion]);

  // Combined full users list (Always includes System bot, ordered by online status then Rank hierarchy priority descending)
  const allUsersList = useMemo(() => {
    const map = new Map<string, UserProfileData>();
    registeredUsers.forEach((u) => {
      if (u.username && u.username.toLowerCase() !== 'system') {
        map.set(u.username.toLowerCase(), u);
      }
    });
    if (currentUser && currentUser.username) {
      const existingMe = map.get(currentUser.username.toLowerCase());
      map.set(currentUser.username.toLowerCase(), {
        username: currentUser.username,
        email: currentUser.email,
        ...userProfile,
        likes: userProfile.likes || existingMe?.likes || {},
        isOnline: true
      });
    }
    // Always online System bot (below Moderator in hierarchy: priority 35)
    map.set('system', {
      username: SYSTEM_BOT_USERNAME,
      rank: 'bot',
      avatarUrl: SYSTEM_BOT_AVATAR,
      age: '999',
      gender: 'Bot',
      bio: '',
      mood: '',
      pfpBorderId: 'pfp-default',
      pfpBorderThickness: 2,
      profileBorderId: 'pb-default',
      profileBorderThickness: 2,
      likes: systemBotLikes,
      isOnline: true
    });

    const list = Array.from(map.values());
    return list.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;

      const aIsMe = currentUser && a.username.toLowerCase() === currentUser.username.toLowerCase();
      const bIsMe = currentUser && b.username.toLowerCase() === currentUser.username.toLowerCase();
      const rankA = getUserRank(
        a.username,
        aIsMe ? currentUser?.email : a.email,
        aIsMe ? userProfile.rank : a.rank
      );
      const rankB = getUserRank(
        b.username,
        bIsMe ? currentUser?.email : b.email,
        bIsMe ? userProfile.rank : b.rank
      );
      const priorityA = rankA?.priority ?? 0;
      const priorityB = rankB?.priority ?? 0;

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      if (aIsMe) return -1;
      if (bIsMe) return 1;
      return a.username.localeCompare(b.username);
    });
  }, [registeredUsers, currentUser, userProfile]);

  // Resolve selectedUser live against allUsersList so profile popovers/modals update in real-time
  const liveSelectedUser = useMemo<UserProfileData | null>(() => {
    if (!selectedUser) return null;
    const found = allUsersList.find(
      (u) => u.username.toLowerCase() === selectedUser.username.toLowerCase()
    );
    return found || selectedUser;
  }, [selectedUser, allUsersList]);

  const onlineCount = useMemo(() => {
    return allUsersList.filter((u) => u.isOnline === true).length;
  }, [allUsersList]);

  // Welcome Guide State
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState<1 | 2>(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);
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
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(e.target as Node)) {
        setShowNotificationsMenu(false);
      }
      if (privateMenuRef.current && !privateMenuRef.current.contains(e.target as Node)) {
        setShowPrivateMenu(false);
      }
      if (hamburgerMenuRef.current && !hamburgerMenuRef.current.contains(e.target as Node)) {
        setShowHamburgerMenu(false);
      }
      if (
        playerPopoverRef.current &&
        !playerPopoverRef.current.contains(e.target as Node) &&
        (!playerCardRef.current || !playerCardRef.current.contains(e.target as Node))
      ) {
        setPlayerPopoverOpen(false);
      }
      const targetEl = e.target as HTMLElement | null;
      if (targetEl && !targetEl.closest('[data-msg-menu]')) {
        setActiveMsgMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to bottom when message count increases
  const prevMsgCountRef = useRef(messages.length);
  useEffect(() => {
    if (currentUser && messages.length >= prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, currentUser]);

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
    setLoginError(null);
    setRegError(null);
    setForgotStatus(null);
  };

  // Sign up action: Enforce unique username & email, required credentials, and create persistent account in RTDB
  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (regLoading) return;

    setRegError(null);
    const trimmedUser = regUsername.trim();
    const trimmedEmail = regEmail.trim();

    // 1. Validate username format & length
    const userCheck = isValidUsername(trimmedUser);
    if (!userCheck.valid) {
      setRegError(userCheck.message || 'Invalid username.');
      return;
    }

    // 2. Validate email format
    if (!isValidEmail(trimmedEmail)) {
      setRegError('Please enter a valid email address.');
      return;
    }

    // Reserve username "Null" strictly for null@gmail.com and "System" for the system bot
    if (trimmedUser.toLowerCase() === 'null' && trimmedEmail.toLowerCase() !== 'null@gmail.com') {
      setRegError('The username Null is reserved.');
      return;
    }
    if (trimmedUser.toLowerCase() === 'system') {
      setRegError('The username System is reserved.');
      return;
    }

    // 3. Validate password length
    if (!regPassword || regPassword.length < 4) {
      setRegError('Password must be at least 4 characters long.');
      return;
    }

    setRegLoading(true);

    try {
      const sanitizedKey = sanitizeDbKey(trimmedUser);

      // 4. Query Firebase Realtime Database to guarantee unique username, key, and email
      const usersSnap = await get(ref(rtdb, 'users'));
      if (usersSnap.exists()) {
        const usersData = usersSnap.val();
        for (const k of Object.keys(usersData)) {
          const u = usersData[k];
          if (!u || !u.username) continue;

          if (k === sanitizedKey || u.username.toLowerCase() === trimmedUser.toLowerCase()) {
            setRegError('This username is already taken by someone else. Please choose another username.');
            setRegLoading(false);
            return;
          }

          if (u.email && u.email.toLowerCase() === trimmedEmail.toLowerCase()) {
            setRegError('This email is already registered to another account. Please log in instead.');
            setRegLoading(false);
            return;
          }
        }
      }

      // 5. Calculate age based on birth year if chosen
      let calculatedAge = '17';
      if (birthYear && birthYear !== 'Year') {
        const parsedYear = parseInt(birthYear, 10);
        if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= currentYear) {
          calculatedAge = String(Math.max(13, currentYear - parsedYear));
        }
      }

      // 6. Hash password securely
      const pwdHash = await hashPassword(regPassword);
      const geo = detectedGeoRef.current || initialGeo;
      const assignedRank = getUserRank(trimmedUser, trimmedEmail, null)?.id || null;

      const newProfileState: UserProfileState = {
        rank: assignedRank,
        avatarUrl: null,
        avatarPublicId: null,
        avatarDeleteToken: null,
        bannerUrl: null,
        bannerPublicId: null,
        bannerDeleteToken: null,
        age: calculatedAge,
        gender: gender.toUpperCase(),
        relationship: 'Rather not say',
        country: geo.country || 'Global',
        language: geo.language || 'English',
        bio: '',
        mood: '',
        glowColor: null,
        glowThickness: 18,
        profileBorderId: 'pb-default',
        profileBorderThickness: 2,
        pfpBorderId: 'pfp-default',
        pfpBorderThickness: 2,
        musicTrack: null
      };

      // 7. Create persistent user account and profile record in Realtime Database
      const newUserRecord = {
        username: trimmedUser,
        usernameLower: trimmedUser.toLowerCase(),
        email: trimmedEmail,
        emailLower: trimmedEmail.toLowerCase(),
        passwordHash: pwdHash,
        ...newProfileState,
        isOnline: true,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      isSessionVerifiedRef.current = true;
      await set(ref(rtdb, `users/${sanitizedKey}`), newUserRecord);

      // 8. Save user details in localStorage & state
      const userObj = {
        username: trimmedUser,
        gender: gender.toUpperCase(),
        email: trimmedEmail
      };
      localStorage.setItem('chat_community_user', JSON.stringify(userObj));
      localStorage.setItem('chat_community_profile', JSON.stringify(newProfileState));

      setUserProfile(newProfileState);
      setCurrentUser(userObj);
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegError(null);
      closeModal();
      setGuideStep(1);
      setShowGuide(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setRegError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // Login action: Verifies username/email and password against Realtime Database accounts
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loginLoading) return;

    setLoginError(null);
    const identifier = loginEmail.trim();
    const password = loginPassword;

    if (!identifier) {
      setLoginError('Please enter your username or email.');
      return;
    }
    if (!password) {
      setLoginError('Please enter your password.');
      return;
    }

    setLoginLoading(true);

    try {
      let matchedKey: string | null = null;
      let matchedUser: any = null;

      // 1. Try direct O(1) key lookup first to avoid downloading the entire users collection
      const directKey = sanitizeDbKey(identifier);
      if (directKey && !identifier.includes('@')) {
        const directSnap = await get(ref(rtdb, `users/${directKey}`));
        if (directSnap.exists() && directSnap.val()?.username) {
          matchedKey = directKey;
          matchedUser = directSnap.val();
        }
      }

      // 2. Fall back to scanning users only if direct lookup didn't match (e.g. login via email)
      if (!matchedUser) {
        const usersSnap = await get(ref(rtdb, 'users'));
        if (!usersSnap.exists()) {
          setLoginError('Incorrect username/email or password.');
          setLoginLoading(false);
          return;
        }
        const allUsers = usersSnap.val();
        for (const k of Object.keys(allUsers)) {
          const u = allUsers[k];
          if (!u || !u.username) continue;
          const uNameMatch = u.username.toLowerCase() === identifier.toLowerCase();
          const uEmailMatch = u.email && u.email.toLowerCase() === identifier.toLowerCase();
          if (uNameMatch || uEmailMatch) {
            matchedKey = k;
            matchedUser = u;
            break;
          }
        }
      }

      if (!matchedUser || !matchedKey) {
        setLoginError('Incorrect username/email or password. Please verify your details.');
        setLoginLoading(false);
        return;
      }

      // 2. Verify password match
      const inputHash = await hashPassword(password);
      const isPasswordValid =
        (matchedUser.passwordHash && matchedUser.passwordHash === inputHash) ||
        (matchedUser.password && matchedUser.password === password);

      if (!isPasswordValid) {
        setLoginError('Incorrect username/email or password. Please verify your details.');
        setLoginLoading(false);
        return;
      }

      // 3. Restore all saved profile data
      const resolvedRankObj = getUserRank(matchedUser.username, matchedUser.email, matchedUser.rank);
      const loadedProfile: UserProfileState = {
        rank: resolvedRankObj?.id || matchedUser.rank || null,
        avatarUrl: sanitizeMediaUrl(matchedUser.avatarUrl),
        avatarPublicId: matchedUser.avatarPublicId || null,
        avatarDeleteToken: matchedUser.avatarDeleteToken || null,
        bannerUrl: sanitizeMediaUrl(matchedUser.bannerUrl),
        bannerPublicId: matchedUser.bannerPublicId || null,
        bannerDeleteToken: matchedUser.bannerDeleteToken || null,
        age: matchedUser.age ? String(matchedUser.age) : '17',
        gender: matchedUser.gender || 'MALE',
        relationship: matchedUser.relationship || 'Rather not say',
        country: matchedUser.country || initialGeo.country,
        language: matchedUser.language || initialGeo.language,
        bio: matchedUser.bio || '',
        mood: matchedUser.mood || '',
        glowColor: matchedUser.glowColor || null,
        glowThickness: typeof matchedUser.glowThickness === 'number' ? matchedUser.glowThickness : 18,
        profileBorderId: matchedUser.profileBorderId || 'pb-default',
        profileBorderThickness: typeof matchedUser.profileBorderThickness === 'number' ? matchedUser.profileBorderThickness : 2,
        pfpBorderId: matchedUser.pfpBorderId || 'pfp-default',
        pfpBorderThickness: typeof matchedUser.pfpBorderThickness === 'number' ? matchedUser.pfpBorderThickness : 2,
        musicTrack: matchedUser.musicTrack || null
      };

      const userObj = {
        username: matchedUser.username,
        gender: matchedUser.gender || 'MALE',
        email: matchedUser.email || ''
      };

      // 4. Save login details & session in localStorage
      localStorage.setItem('chat_community_user', JSON.stringify(userObj));
      localStorage.setItem('chat_community_profile', JSON.stringify(loadedProfile));

      // 5. Update online status (and persist developer rank for Null/org) in Realtime Database
      isSessionVerifiedRef.current = true;
      const loginRtdbUpdate: Record<string, any> = {
        isOnline: true,
        lastSeen: serverTimestamp()
      };
      if (resolvedRankObj && matchedUser.rank !== resolvedRankObj.id) {
        loginRtdbUpdate.rank = resolvedRankObj.id;
      }
      await update(ref(rtdb, `users/${matchedKey}`), loginRtdbUpdate).catch((e) =>
        console.warn('Online status update notice:', e)
      );

      // 6. Set app state
      setUserProfile(loadedProfile);
      setCurrentUser(userObj);
      setLoginEmail('');
      setLoginPassword('');
      setLoginError(null);
      closeModal();
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(err.message || 'Login failed. Please check your network and try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Sign out cleanly: cancel onDisconnect hooks and mark user offline in RTDB
  const handleSignOut = async () => {
    if (currentUser?.username) {
      const key = sanitizeDbKey(currentUser.username);
      isSessionVerifiedRef.current = false;
      try {
        await onDisconnect(ref(rtdb, `users/${key}/isOnline`)).cancel();
        await onDisconnect(ref(rtdb, `users/${key}/lastSeen`)).cancel();
        await update(ref(rtdb, `users/${key}`), {
          isOnline: false,
          lastSeen: serverTimestamp()
        });
      } catch (_) {}
    }

    if (profileAudioRef.current) {
      profileAudioRef.current.pause();
    }
    setActiveAudioTrack(null);
    setIsProfileMusicPlaying(false);
    setCurrentUser(null);
    setSelectedUser(null);
    setReplyingTo(null);

    try {
      localStorage.removeItem('chat_community_user');
      localStorage.removeItem('chat_community_profile');
    } catch (_) {}

    setLoginEmail('');
    setLoginPassword('');
    setLoginError(null);
    setShowProfileMenu(false);
    setShowGuide(false);
    setProfileModalOpen(false);
    setPlayerPopoverOpen(false);
  };

  const [forgotNewPassword, setForgotNewPassword] = useState('');

  // Forgot password action
  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotStatus('Please enter your account email address.');
      return;
    }
    setForgotLoading(true);
    setForgotStatus(null);
    try {
      const snap = await get(ref(rtdb, 'users'));
      let matchedKey: string | null = null;
      let matchedUsername: string | null = null;
      if (snap.exists()) {
        const val = snap.val();
        for (const k of Object.keys(val)) {
          if (val[k]?.email && val[k].email.toLowerCase() === forgotEmail.trim().toLowerCase()) {
            matchedKey = k;
            matchedUsername = val[k].username;
            break;
          }
        }
      }
      if (matchedKey && matchedUsername) {
        if (forgotNewPassword.trim()) {
          if (forgotNewPassword.trim().length < 4) {
            setForgotStatus('New password must be at least 4 characters long.');
          } else {
            const newHash = await hashPassword(forgotNewPassword.trim());
            await update(ref(rtdb, `users/${matchedKey}`), {
              passwordHash: newHash,
              updatedAt: serverTimestamp()
            });
            setForgotNewPassword('');
            setForgotStatus(`Password updated for @${matchedUsername}! You can now log in with your new password.`);
          }
        } else {
          setForgotStatus(`Account verified (@${matchedUsername})! Enter a new password below to reset it immediately.`);
        }
      } else {
        setForgotStatus('No registered account was found with that email address.');
      }
    } catch (err: any) {
      setForgotStatus('Unable to process password reset request right now.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Upload image, MP3/audio, or video attachment for chat message
  const handleChatMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const lowerName = file.name.toLowerCase();
    const isAudio =
      file.type.startsWith('audio/') ||
      lowerName.endsWith('.mp3') ||
      lowerName.endsWith('.wav') ||
      lowerName.endsWith('.ogg') ||
      lowerName.endsWith('.m4a');
    const isVideo =
      !isAudio &&
      (file.type.startsWith('video/') ||
        lowerName.endsWith('.mp4') ||
        lowerName.endsWith('.webm') ||
        lowerName.endsWith('.mov'));
    const isGif = file.type === 'image/gif' || lowerName.endsWith('.gif');
    const detectedType: 'image' | 'audio' | 'video' = isAudio
      ? 'audio'
      : isVideo
      ? 'video'
      : 'image';

    setIsUploadingChatMedia(true);
    try {
      let uploadFile = file;
      if (detectedType === 'image' && !isGif && file.type.startsWith('image/')) {
        try {
          const comp = await compressBanner(file);
          uploadFile = comp.file;
        } catch (_) {}
      }

      // Cloudinary uses 'video' resourceType for both audio (MP3) and video files
      const cloudinaryResourceType = detectedType === 'image' ? 'image' : 'video';
      try {
        const res = await uploadToCloudinary(uploadFile, cloudinaryResourceType, 'chat_media');
        setChatMediaUrl(res.secure_url || res.url);
        setChatMediaType(detectedType);
        setChatMediaName(file.name);
      } catch (cloudErr) {
        console.warn('Cloudinary chat media upload fallback to Data URL:', cloudErr);
        const dataUrl = await fileToDataUrl(uploadFile);
        setChatMediaUrl(dataUrl);
        setChatMediaType(detectedType);
        setChatMediaName(file.name);
      }
    } catch (err) {
      console.warn('Error uploading chat media:', err);
    } finally {
      setIsUploadingChatMedia(false);
    }
  };

  // Send message in chat (Saved to Realtime Database for live real-time synchronization)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !chatMediaUrl) || !currentUser || isUploadingChatMedia) return;
    if (userProfile.mutedUntil && userProfile.mutedUntil > Date.now()) return;

    const textToSend = inputText.trim();
    const currentReply = replyingTo;
    const mediaUrlToSend = sanitizeMediaUrl(chatMediaUrl);
    const mediaTypeToSend = mediaUrlToSend ? chatMediaType : null;
    const mediaNameToSend = mediaUrlToSend ? chatMediaName : null;

    setInputText('');
    setReplyingTo(null);
    setChatMediaUrl(null);
    setChatMediaType(null);
    setChatMediaName(null);

    const cleanAvatar = sanitizeMediaUrl(userProfile.avatarUrl);
    const activeSenderRank = getUserRank(currentUser.username, currentUser.email, userProfile.rank);

    // Handle /clear command: Owners and above (priority >= 90) can clear all chat messages
    if (textToSend.toLowerCase() === '/clear' && !mediaUrlToSend) {
      if ((activeSenderRank?.priority ?? 0) >= 90) {
        try {
          const messagesRef = ref(rtdb, 'messages');
          await remove(messagesRef);
          localStorage.removeItem('chat_community_messages');
          setMessages([]);
        } catch (err) {
          console.warn('Error clearing messages in RTDB:', err);
          localStorage.removeItem('chat_community_messages');
          setMessages([]);
        }
      }
      return;
    }

    const newMsgData = {
      sender: currentUser.username,
      senderKey: sanitizeDbKey(currentUser.username),
      text: textToSend,
      avatarUrl: cleanAvatar,
      pfpBorderId: userProfile.pfpBorderId || 'pfp-default',
      pfpBorderThickness: userProfile.pfpBorderThickness || 2,
      rank: activeSenderRank?.id || null,
      replyTo: currentReply || null,
      mediaUrl: mediaUrlToSend || null,
      mediaType: mediaTypeToSend || null,
      mediaName: mediaNameToSend || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp()
    };

    try {
      const messagesRef = ref(rtdb, 'messages');
      // Check if messages hit 200 limit; if so, auto-clear all messages in database
      const checkSnap = await get(query(messagesRef, limitToLast(200)));
      if (checkSnap.exists() && checkSnap.size >= 199) {
        await remove(messagesRef);
        localStorage.removeItem('chat_community_messages');
        setMessages([]);
      } else {
        await push(messagesRef, newMsgData);
      }
    } catch (err) {
      console.warn('Realtime Database push fallback:', err);
      const fallbackMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: currentUser.username,
        senderKey: sanitizeDbKey(currentUser.username),
        text: textToSend,
        timestamp: 'Just now',
        createdAt: Date.now(),
        avatarUrl: cleanAvatar,
        pfpBorderId: userProfile.pfpBorderId,
        pfpBorderThickness: userProfile.pfpBorderThickness,
        rank: activeSenderRank?.id || null,
        replyTo: currentReply || null,
        mediaUrl: mediaUrlToSend || null,
        mediaType: mediaTypeToSend || null,
        mediaName: mediaNameToSend || null
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    }

    // Check if the message tags a bot (e.g. "System Hello!" or "whats 1+1 System" - no @ required, just the bot's username)
    const botCandidates = allUsersList.filter(
      (u) =>
        u.username.toLowerCase() === SYSTEM_BOT_USERNAME.toLowerCase() ||
        u.rank === 'bot' ||
        getUserRank(u.username, u.email, u.rank)?.id === 'bot'
    );

    let mentionedBot = botCandidates.find((bot) => {
      const escapedBot = bot.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9_])@?${escapedBot}(?=$|[^a-zA-Z0-9_])`, 'i');
      return regex.test(textToSend);
    });

    if (!mentionedBot && currentReply?.sender) {
      mentionedBot = botCandidates.find(
        (bot) => bot.username.toLowerCase() === currentReply.sender.toLowerCase()
      );
    }

    if (mentionedBot && mentionedBot.username.toLowerCase() !== currentUser.username.toLowerCase()) {
      const targetBot = mentionedBot;
      const senderUsername = currentUser.username;
      const escapedBot = targetBot.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const stripBotAnywhereRegex = new RegExp(`(^|\\s)@?${escapedBot}(?:[\\s,:!.-]+|$)`, 'gi');
      const strippedPrompt = textToSend.replace(stripBotAnywhereRegex, ' ').replace(/\s{2,}/g, ' ').trim();
      const promptForAi = strippedPrompt || 'Say hello in one sentence';

      (async () => {
        try {
          const rawAiReply = await generateAiBotReply(
            promptForAi,
            targetBot.username,
            senderUsername
          );

          // Clean AI reply, remove any *roleplay* actions, and strip any duplicate leading username tag
          let cleanReply = rawAiReply
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/\*[^*]+\*/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .replace(/^["']|["']$/g, '')
            .trim();

          const escapedSender = senderUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const leadingSenderRegex = new RegExp(`^@?${escapedSender}(?:[:,!]+)?\\s+`, 'i');
          cleanReply = cleanReply.replace(leadingSenderRegex, '').trim();

          if (!cleanReply) {
            cleanReply = 'Hello. How may I assist you today?';
          }

          // Tag the person who tagged the bot (no @, just "[username] [reply]")
          const botMessageText = `${senderUsername} ${cleanReply}`;
          const botMsgData = {
            sender: targetBot.username,
            senderKey: sanitizeDbKey(targetBot.username),
            text: botMessageText,
            avatarUrl: sanitizeMediaUrl(targetBot.avatarUrl) || SYSTEM_BOT_AVATAR,
            pfpBorderId: targetBot.pfpBorderId || 'pfp-default',
            pfpBorderThickness: targetBot.pfpBorderThickness || 2,
            rank: 'bot',
            replyTo: null,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: serverTimestamp()
          };

          try {
            await push(ref(rtdb, 'messages'), botMsgData);
          } catch (botPushErr) {
            console.warn('Realtime Database bot push fallback:', botPushErr);
            const fallbackBotMsg: ChatMessage = {
              id: `${Date.now()}-bot`,
              sender: targetBot.username,
              senderKey: sanitizeDbKey(targetBot.username),
              text: botMessageText,
              timestamp: 'Just now',
              createdAt: Date.now(),
              avatarUrl: sanitizeMediaUrl(targetBot.avatarUrl) || SYSTEM_BOT_AVATAR,
              pfpBorderId: targetBot.pfpBorderId || 'pfp-default',
              pfpBorderThickness: targetBot.pfpBorderThickness || 2,
              rank: 'bot',
              replyTo: null
            };
            setMessages((prev) => [...prev, fallbackBotMsg]);
          }
        } catch (aiErr) {
          console.warn('Error generating AI bot reply:', aiErr);
        }
      })();
    }
  };

  // Delete a specific chat message (own message or Owner and above) from Realtime Database
  const handleDeleteMessage = async (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    try {
      await remove(ref(rtdb, `messages/${msgId}`));
    } catch (err) {
      console.warn('Error deleting message:', err);
    }
  };

  // Toggle profile like on any user's profile and save to Firebase Realtime Database
  const handleToggleProfileLike = async (targetUsername: string) => {
    if (!currentUser?.username || !targetUsername) return;
    const myKey = sanitizeDbKey(currentUser.username);
    const isSystemTarget = targetUsername.trim().toLowerCase() === 'system';
    const targetKey = isSystemTarget ? '__system_bot__' : sanitizeDbKey(targetUsername);

    const targetUserObj = allUsersList.find(
      (u) => u.username.toLowerCase() === targetUsername.trim().toLowerCase()
    );
    const currentLikes = isSystemTarget
      ? systemBotLikes
      : (targetUserObj?.likes || {});
    const alreadyLiked = Boolean(currentLikes[myKey]);
    const nextLikes = { ...currentLikes };
    if (alreadyLiked) {
      delete nextLikes[myKey];
    } else {
      nextLikes[myKey] = true;
    }

    // Optimistic update
    if (isSystemTarget) {
      setSystemBotLikes(nextLikes);
    } else if (targetUsername.trim().toLowerCase() === currentUser.username.toLowerCase()) {
      setUserProfile((prev) => ({ ...prev, likes: nextLikes }));
    } else {
      setRegisteredUsers((prev) =>
        prev.map((u) =>
          u.username.toLowerCase() === targetUsername.trim().toLowerCase()
            ? { ...u, likes: nextLikes }
            : u
        )
      );
    }

    try {
      const likeRef = ref(rtdb, `users/${targetKey}/likes/${myKey}`);
      if (alreadyLiked) {
        await remove(likeRef);
      } else {
        await set(likeRef, true);
        // Send notification when someone likes your profile
        if (
          !isSystemTarget &&
          targetUsername.trim().toLowerCase() !== currentUser.username.toLowerCase()
        ) {
          await push(ref(rtdb, `users/${targetKey}/notifications`), {
            type: 'profile_like',
            fromUsername: currentUser.username,
            fromAvatarUrl: sanitizeMediaUrl(userProfile.avatarUrl) || null,
            fromPfpBorderId: userProfile.pfpBorderId || 'pfp-default',
            fromPfpBorderThickness: userProfile.pfpBorderThickness || 2,
            text: 'Liked your profile!',
            createdAt: Date.now(),
            read: false
          });
        }
      }
    } catch (err) {
      console.warn('Error toggling profile like in RTDB:', err);
    }
  };

  // Upload image, GIF, or video for Community News post
  const handleNewsMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    setIsUploadingNewsMedia(true);

    try {
      let uploadFile = file;
      if (!isVideo && !isGif && file.type.startsWith('image/')) {
        try {
          const comp = await compressBanner(file);
          uploadFile = comp.file;
        } catch (_) {}
      }

      const resourceType = isVideo ? 'video' : 'image';
      try {
        const res = await uploadToCloudinary(uploadFile, resourceType, 'news');
        setNewsMediaUrl(res.secure_url || res.url);
        setNewsMediaType(isVideo ? 'video' : 'image');
      } catch (cloudErr) {
        console.warn('Cloudinary news upload fallback to data URL:', cloudErr);
        const dataUrl = await fileToDataUrl(uploadFile);
        setNewsMediaUrl(dataUrl);
        setNewsMediaType(isVideo ? 'video' : 'image');
      }
    } catch (err) {
      console.warn('Error uploading news media:', err);
    } finally {
      setIsUploadingNewsMedia(false);
    }
  };

  // Publish a new Community News post (Developers and above: priority >= 80)
  const handleCreateNewsPost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || isSendingNews) return;
    const myRank = getUserRank(currentUser.username, currentUser.email, userProfile.rank);
    if ((myRank?.priority ?? 0) < 80) return;
    if (!newsTitle.trim() && !newsDescription.trim() && !newsMediaUrl) return;

    setIsSendingNews(true);
    try {
      const postsRef = ref(rtdb, 'users/__system_news__/posts');
      // Auto-clear all news if hitting 10 news posts
      if (newsPosts.length + 1 >= 10) {
        await remove(postsRef);
      } else {
        await push(postsRef, {
          author: currentUser.username,
          authorAvatar: sanitizeMediaUrl(userProfile.avatarUrl) || null,
          authorRank: myRank?.id || 'developer',
          authorPfpBorderId: userProfile.pfpBorderId || 'pfp-default',
          authorPfpBorderThickness: userProfile.pfpBorderThickness || 2,
          title: newsTitle.trim(),
          description: newsDescription.trim(),
          mediaUrl: sanitizeMediaUrl(newsMediaUrl) || null,
          mediaType: newsMediaType || null,
          createdAt: Date.now()
        });
      }
      setNewsTitle('');
      setNewsDescription('');
      setNewsMediaUrl(null);
      setNewsMediaType(null);
      setNewsComposerOpen(false);
    } catch (err) {
      console.warn('Error creating news post in RTDB:', err);
    } finally {
      setIsSendingNews(false);
    }
  };

  // Delete a Community News post (Developers and above: priority >= 80)
  const handleDeleteNewsPost = async (postId: string) => {
    if (!currentUser) return;
    const myRank = getUserRank(currentUser.username, currentUser.email, userProfile.rank);
    if ((myRank?.priority ?? 0) < 80) return;

    setNewsPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await remove(ref(rtdb, `users/__system_news__/posts/${postId}`));
    } catch (err) {
      console.warn('Error deleting news post:', err);
    }
  };

  // Toggle reaction (likes, dislikes, loves, laughs) on a Community News post
  const handleToggleNewsReaction = async (
    postId: string,
    reactionField: 'likes' | 'dislikes' | 'loves' | 'laughs'
  ) => {
    if (!currentUser?.username) return;
    const myKey = sanitizeDbKey(currentUser.username);
    const targetPost = newsPosts.find((p) => p.id === postId);
    if (!targetPost) return;

    const currentMap = targetPost[reactionField] || {};
    const alreadyReacted = Boolean(currentMap[myKey]);

    try {
      const reactRef = ref(rtdb, `users/__system_news__/posts/${postId}/${reactionField}/${myKey}`);
      if (alreadyReacted) {
        await remove(reactRef);
      } else {
        await set(reactRef, true);
      }
    } catch (err) {
      console.warn('Error toggling news reaction:', err);
    }
  };

  // Add a comment to a Community News post
  const handleAddNewsComment = async (postId: string) => {
    if (!currentUser?.username) return;
    const commentText = (newsCommentInputs[postId] || '').trim();
    if (!commentText) return;

    const myRank = getUserRank(currentUser.username, currentUser.email, userProfile.rank);
    setNewsCommentInputs((prev) => ({ ...prev, [postId]: '' }));

    try {
      await push(ref(rtdb, `users/__system_news__/posts/${postId}/comments`), {
        author: currentUser.username,
        authorAvatar: sanitizeMediaUrl(userProfile.avatarUrl) || null,
        authorRank: myRank?.id || null,
        text: commentText,
        createdAt: Date.now()
      });
    } catch (err) {
      console.warn('Error adding news comment:', err);
    }
  };

  // Delete a comment on a Community News post (comment author or Developers and above)
  const handleDeleteNewsComment = async (postId: string, commentId: string, commentAuthor: string) => {
    if (!currentUser?.username) return;
    const myRank = getUserRank(currentUser.username, currentUser.email, userProfile.rank);
    const isAuthor = commentAuthor.toLowerCase() === currentUser.username.toLowerCase();
    if (!isAuthor && (myRank?.priority ?? 0) < 80) return;

    try {
      await remove(ref(rtdb, `users/__system_news__/posts/${postId}/comments/${commentId}`));
    } catch (err) {
      console.warn('Error deleting news comment:', err);
    }
  };

  // ====================================================
  // PRIVATE MESSAGES (PMs) HANDLERS
  // ====================================================
  const handleOpenPmWithUser = useCallback(
    async (targetUsername: string) => {
      if (!currentUser?.username || !targetUsername) return;
      const cleanTarget = targetUsername.trim();
      if (!cleanTarget || cleanTarget.toLowerCase() === currentUser.username.toLowerCase()) return;

      setActivePmPeer(cleanTarget);
      setShowPrivateMenu(false);

      const myKey = sanitizeDbKey(currentUser.username);
      const peerKey = sanitizeDbKey(cleanTarget);
      const targetUserObj = allUsersList.find(
        (u) => u.username.toLowerCase() === cleanTarget.toLowerCase()
      );

      try {
        await update(ref(rtdb, `users/${myKey}/pms/${peerKey}`), {
          peerUsername: targetUserObj?.username || cleanTarget,
          peerAvatarUrl: sanitizeMediaUrl(targetUserObj?.avatarUrl) || null,
          unread: false,
          updatedAt: Date.now()
        });
      } catch (_) {}

      setTimeout(() => {
        pmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        pmInputRef.current?.focus();
      }, 60);
    },
    [currentUser?.username, allUsersList]
  );

  // Mark all PM threads as read (Checkmark square button in Private dropdown)
  const handleMarkAllPmsRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser?.username) return;
    const myKey = sanitizeDbKey(currentUser.username);
    setPmThreads((prev) => prev.map((t) => ({ ...t, unread: false })));
    try {
      const updates: Record<string, any> = {};
      pmThreads.forEach((t) => {
        if (t.unread) {
          updates[`${t.peerKey}/unread`] = false;
        }
      });
      if (Object.keys(updates).length > 0) {
        await update(ref(rtdb, `users/${myKey}/pms`), updates);
      }
    } catch (err) {
      console.warn('Error marking all PMs read:', err);
    }
  };

  // Delete a single PM conversation thread (X button next to user in Private dropdown)
  const handleDeletePmThread = async (peerKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser?.username || !peerKey) return;
    const myKey = sanitizeDbKey(currentUser.username);

    const targetThread = pmThreads.find((t) => t.peerKey === peerKey);
    if (
      activePmPeer &&
      (sanitizeDbKey(activePmPeer) === peerKey ||
        (targetThread && targetThread.peerUsername.toLowerCase() === activePmPeer.toLowerCase()))
    ) {
      setActivePmPeer(null);
    }

    setPmThreads((prev) => prev.filter((t) => t.peerKey !== peerKey));
    try {
      await remove(ref(rtdb, `users/${myKey}/pms/${peerKey}`));
    } catch (err) {
      console.warn('Error deleting PM thread:', err);
    }
  };

  // Delete all PM conversations (Trash icon in Private dropdown)
  const handleClearAllPmThreads = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser?.username) return;
    const myKey = sanitizeDbKey(currentUser.username);
    setPmThreads([]);
    setActivePmPeer(null);
    try {
      await remove(ref(rtdb, `users/${myKey}/pms`));
    } catch (err) {
      console.warn('Error clearing all PM threads:', err);
    }
  };

  // Upload image (or media) in Private Message window
  const handlePmMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const lowerName = file.name.toLowerCase();
    const isAudio =
      file.type.startsWith('audio/') ||
      lowerName.endsWith('.mp3') ||
      lowerName.endsWith('.wav') ||
      lowerName.endsWith('.ogg') ||
      lowerName.endsWith('.m4a');
    const isVideo =
      !isAudio &&
      (file.type.startsWith('video/') ||
        lowerName.endsWith('.mp4') ||
        lowerName.endsWith('.webm') ||
        lowerName.endsWith('.mov'));
    const isGif = file.type === 'image/gif' || lowerName.endsWith('.gif');
    const detectedType: 'image' | 'audio' | 'video' = isAudio
      ? 'audio'
      : isVideo
      ? 'video'
      : 'image';

    setIsUploadingPmMedia(true);
    try {
      let uploadFile = file;
      if (detectedType === 'image' && !isGif && file.type.startsWith('image/')) {
        try {
          const comp = await compressBanner(file);
          uploadFile = comp.file;
        } catch (_) {}
      }

      const cloudinaryResourceType = detectedType === 'image' ? 'image' : 'video';
      try {
        const res = await uploadToCloudinary(uploadFile, cloudinaryResourceType, 'pm_media');
        setPmMediaUrl(res.secure_url || res.url);
        setPmMediaType(detectedType);
        setPmMediaName(file.name);
      } catch (cloudErr) {
        console.warn('Cloudinary PM media upload fallback to Data URL:', cloudErr);
        const dataUrl = await fileToDataUrl(uploadFile);
        setPmMediaUrl(dataUrl);
        setPmMediaType(detectedType);
        setPmMediaName(file.name);
      }
    } catch (err) {
      console.warn('Error uploading PM media:', err);
    } finally {
      setIsUploadingPmMedia(false);
    }
  };

  // Voice dictation inside the PM input bar
  const handleTogglePmVoiceInput = () => {
    if (isListeningPmVoice && pmRecognitionRef.current) {
      try {
        pmRecognitionRef.current.stop();
      } catch (_) {}
      setIsListeningPmVoice(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      pmInputRef.current?.focus();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListeningPmVoice(true);
      recognition.onend = () => setIsListeningPmVoice(false);
      recognition.onerror = () => setIsListeningPmVoice(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setPmInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          pmInputRef.current?.focus();
        }
      };

      pmRecognitionRef.current = recognition;
      recognition.start();
    } catch (_) {
      setIsListeningPmVoice(false);
    }
  };

  // Send a Private Message (syncs to both sender's and recipient's PM threads in RTDB)
  const handleSendPmMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!pmInputText.trim() && !pmMediaUrl) || !currentUser?.username || !activePmPeer || isUploadingPmMedia) {
      return;
    }
    if (userProfile.mutedUntil && userProfile.mutedUntil > Date.now()) return;

    const textToSend = pmInputText.trim();
    const mediaUrlToSend = sanitizeMediaUrl(pmMediaUrl);
    const mediaTypeToSend = mediaUrlToSend ? pmMediaType : null;
    const mediaNameToSend = mediaUrlToSend ? pmMediaName : null;
    const targetPeerName = activePmPeer.trim();

    setPmInputText('');
    setPmMediaUrl(null);
    setPmMediaType(null);
    setPmMediaName(null);

    const myKey = sanitizeDbKey(currentUser.username);
    const peerKey = sanitizeDbKey(targetPeerName);
    const now = Date.now();
    const msgId = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const targetUserObj = allUsersList.find(
      (u) => u.username.toLowerCase() === targetPeerName.toLowerCase()
    );

    const msgPayload = {
      sender: currentUser.username,
      text: textToSend,
      mediaUrl: mediaUrlToSend || null,
      mediaType: mediaTypeToSend || null,
      mediaName: mediaNameToSend || null,
      timestamp: timeStr,
      createdAt: now
    };

    try {
      // 1. Save message in sender's PM thread
      await update(ref(rtdb, `users/${myKey}/pms/${peerKey}`), {
        peerUsername: targetUserObj?.username || targetPeerName,
        peerAvatarUrl: sanitizeMediaUrl(targetUserObj?.avatarUrl) || null,
        unread: false,
        updatedAt: now,
        [`messages/${msgId}`]: msgPayload
      });

      // 2. If recipient is a real user (not System), deliver into recipient's PM thread and trigger action alert
      if (targetPeerName.toLowerCase() !== 'system') {
        await update(ref(rtdb, `users/${peerKey}/pms/${myKey}`), {
          peerUsername: currentUser.username,
          peerAvatarUrl: sanitizeMediaUrl(userProfile.avatarUrl) || null,
          unread: true,
          updatedAt: now,
          [`messages/${msgId}`]: msgPayload
        });
      } else {
        // If PMing System bot, generate AI reply inside the PM thread
        const promptForBot = textToSend || 'Hello';
        const senderName = currentUser.username;
        (async () => {
          try {
            const rawReply = await generateAiBotReply(promptForBot, SYSTEM_BOT_USERNAME, senderName);
            const cleanReply =
              rawReply
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .replace(/\*[^*]+\*/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim()
                .replace(/^["']|["']$/g, '')
                .trim() || 'Hello. How may I assist you today?';

            const botNow = Date.now();
            const botMsgId = `${botNow}-bot`;
            await update(ref(rtdb, `users/${myKey}/pms/${peerKey}`), {
              peerUsername: SYSTEM_BOT_USERNAME,
              peerAvatarUrl: SYSTEM_BOT_AVATAR,
              unread: false,
              updatedAt: botNow,
              [`messages/${botMsgId}`]: {
                sender: SYSTEM_BOT_USERNAME,
                text: cleanReply,
                timestamp: new Date(botNow).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                createdAt: botNow
              }
            });
          } catch (_) {}
        })();
      }
    } catch (err) {
      console.warn('Error sending PM in RTDB:', err);
    }

    setTimeout(() => {
      pmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Auto-mark active PM peer thread as read when open & scroll to bottom on new PM messages
  const activePmThread = useMemo(() => {
    if (!activePmPeer) return null;
    const pKey = sanitizeDbKey(activePmPeer);
    return (
      pmThreads.find(
        (t) =>
          t.peerKey === pKey ||
          t.peerUsername.toLowerCase() === activePmPeer.toLowerCase()
      ) || null
    );
  }, [activePmPeer, pmThreads]);

  useEffect(() => {
    if (!activePmPeer || !currentUser?.username) return;
    if (activePmThread?.unread) {
      const myKey = sanitizeDbKey(currentUser.username);
      update(ref(rtdb, `users/${myKey}/pms/${activePmThread.peerKey}`), {
        unread: false
      }).catch(() => {});
    }
    pmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activePmPeer, activePmThread?.messages.length, activePmThread?.unread, currentUser?.username]);

  // Record a "Is stalking you!" notification when viewing another user's profile
  const recordProfileVisitNotification = useCallback(
    async (targetUsername?: string | null) => {
      if (!currentUser?.username || !targetUsername) return;
      const cleanTarget = targetUsername.trim();
      if (
        !cleanTarget ||
        cleanTarget.toLowerCase() === currentUser.username.toLowerCase() ||
        cleanTarget.toLowerCase() === 'system' ||
        cleanTarget.toLowerCase() === 'guest'
      ) {
        return;
      }

      const targetKey = sanitizeDbKey(cleanTarget);
      try {
        await push(ref(rtdb, `users/${targetKey}/notifications`), {
          type: 'profile_visit',
          fromUsername: currentUser.username,
          fromAvatarUrl: sanitizeMediaUrl(userProfile.avatarUrl) || null,
          fromPfpBorderId: userProfile.pfpBorderId || 'pfp-default',
          fromPfpBorderThickness: userProfile.pfpBorderThickness || 2,
          text: 'Is stalking you!',
          createdAt: Date.now(),
          read: false
        });
      } catch (err) {
        console.warn('Error pushing profile visit notification:', err);
      }
    },
    [currentUser?.username, userProfile.avatarUrl, userProfile.pfpBorderId, userProfile.pfpBorderThickness]
  );

  // Mark all unread notifications for the current user as read in RTDB
  const markAllNotificationsAsRead = useCallback(async () => {
    if (!currentUser?.username) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    const myKey = sanitizeDbKey(currentUser.username);
    const updatesMap: Record<string, boolean> = {};
    unread.forEach((n) => {
      updatesMap[`${n.id}/read`] = true;
    });
    try {
      await update(ref(rtdb, `users/${myKey}/notifications`), updatesMap);
    } catch (err) {
      console.warn('Error marking notifications read:', err);
    }
  }, [currentUser?.username, notifications]);

  // Delete a single notification from Firebase Realtime Database
  const handleDeleteNotification = useCallback(
    async (notifId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!currentUser?.username || !notifId) return;
      const myKey = sanitizeDbKey(currentUser.username);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      try {
        await remove(ref(rtdb, `users/${myKey}/notifications/${notifId}`));
      } catch (err) {
        console.warn('Error deleting notification from RTDB:', err);
      }
    },
    [currentUser?.username]
  );

  // Clear all notifications for the current user from Firebase Realtime Database
  const handleClearAllNotifications = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!currentUser?.username) return;
      const myKey = sanitizeDbKey(currentUser.username);
      setNotifications([]);
      try {
        await remove(ref(rtdb, `users/${myKey}/notifications`));
      } catch (err) {
        console.warn('Error clearing notifications from RTDB:', err);
      }
    },
    [currentUser?.username]
  );

  // Change another user's rank in Realtime Database (Main Developer only)
  const handleChangeTargetUserRank = async (targetUsername: string, newRankId: string) => {
    if (!currentUser || !targetUsername) return;
    if (targetUsername.toLowerCase() === 'system') return;
    const myRank = getUserRank(currentUser.username, currentUser.email, userProfile.rank);
    if (!myRank || myRank.id !== 'main_developer') return;

    // Close the dropdown menu modal immediately upon selecting a rank
    setChangeRankModalOpen(false);
    setActionModalOpen(false);

    const targetKey = sanitizeDbKey(targetUsername);
    const dbRankVal = !newRankId || newRankId === 'none' ? 'none' : newRankId;
    const newRankDisplayName =
      ASSIGNABLE_RANKS.find((r) => r.id === dbRankVal)?.name || 'User';

    try {
      // 1. Send System rank-change notification into users/{targetKey}/notifications so it's ready when the target's tab reloads
      try {
        await push(ref(rtdb, `users/${targetKey}/notifications`), {
          type: 'rank_change',
          fromUsername: SYSTEM_BOT_USERNAME,
          fromAvatarUrl: SYSTEM_BOT_AVATAR,
          text: `Your rank has been changed to ${newRankDisplayName}`,
          createdAt: Date.now(),
          read: false
        });
      } catch (notifErr) {
        console.warn('Error pushing rank change notification:', notifErr);
      }

      // 2. Update user's rank & trigger live reload on their tab
      await update(ref(rtdb, `users/${targetKey}`), {
        rank: dbRankVal,
        rankUpdatedAt: Date.now(),
        updatedAt: serverTimestamp()
      });

      // Also update rank on existing messages sent by this user so chat updates immediately for everyone
      const msgsRef = ref(rtdb, 'messages');
      const msgsSnap = await get(msgsRef);
      if (msgsSnap.exists()) {
        const allMsgs = msgsSnap.val();
        const msgUpdates: Record<string, any> = {};
        for (const [mKey, mVal] of Object.entries(allMsgs)) {
          const m = mVal as any;
          if (
            (m?.sender && m.sender.toLowerCase() === targetUsername.toLowerCase()) ||
            m?.senderKey === targetKey
          ) {
            msgUpdates[`${mKey}/rank`] = dbRankVal === 'none' ? null : dbRankVal;
          }
        }
        if (Object.keys(msgUpdates).length > 0) {
          await update(msgsRef, msgUpdates);
        }
      }
    } catch (err) {
      console.warn('Error updating user rank in RTDB:', err);
    }
  };

  // Unmute a user in RTDB and update their mute notification to "You have been unmuted."
  const handleUnmuteTargetUser = useCallback(
    async (targetUsername: string, specificNotifId?: string | null) => {
      if (!targetUsername || targetUsername.toLowerCase() === 'system') return;
      const targetKey = sanitizeDbKey(targetUsername);
      try {
        // 1. Update existing mute notification(s) to "You have been unmuted."
        const notifsRef = ref(rtdb, `users/${targetKey}/notifications`);
        const notifsSnap = await get(notifsRef);
        let updatedExistingNotif = false;

        if (notifsSnap.exists()) {
          const allNotifs = notifsSnap.val();
          const notifUpdates: Record<string, any> = {};
          for (const [nKey, nVal] of Object.entries(allNotifs)) {
            const n = nVal as any;
            if (
              (specificNotifId && nKey === specificNotifId) ||
              (n?.type === 'mute' && n?.text !== 'You have been unmuted.')
            ) {
              notifUpdates[`${nKey}/text`] = 'You have been unmuted.';
              notifUpdates[`${nKey}/read`] = false;
              notifUpdates[`${nKey}/createdAt`] = Date.now();
              updatedExistingNotif = true;
            }
          }
          if (Object.keys(notifUpdates).length > 0) {
            await update(notifsRef, notifUpdates);
          }
        }

        if (!updatedExistingNotif) {
          await push(notifsRef, {
            type: 'mute',
            fromUsername: SYSTEM_BOT_USERNAME,
            fromAvatarUrl: SYSTEM_BOT_AVATAR,
            text: 'You have been unmuted.',
            createdAt: Date.now(),
            read: false
          });
        }

        // 2. Clear mute fields on user node
        await update(ref(rtdb, `users/${targetKey}`), {
          mutedUntil: null,
          muteDuration: null,
          muteReason: null,
          muteNotificationId: null,
          lastActionAt: Date.now(),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Error unmuting user in RTDB:', err);
      }
    },
    []
  );

  // Mute target user (Main Developer only) for the selected duration
  const handleMuteTargetUser = async () => {
    if (!currentUser || !liveSelectedUser) return;
    const targetUsername = liveSelectedUser.username;
    if (!targetUsername || targetUsername.toLowerCase() === 'system') return;
    const myRank = getUserRank(currentUser.username, currentUser.email, userProfile.rank);
    if (!myRank || myRank.id !== 'main_developer') return;

    const selectedDur = MUTE_DURATIONS.find((d) => d.id === muteDurationId) || MUTE_DURATIONS[3];
    const mutedUntil = Date.now() + selectedDur.ms;
    const cleanReason = muteReason.trim();
    const targetKey = sanitizeDbKey(targetUsername);

    setMuteModalOpen(false);
    setMuteDropdownOpen(false);
    setActionModalOpen(false);
    setMuteReason('');

    try {
      // 1. Push or update the System mute notification so it shows "You have been muted for (duration)"
      const notifText = cleanReason
        ? `You have been muted for ${selectedDur.label} (${cleanReason})`
        : `You have been muted for ${selectedDur.label}`;

      const newNotifRef = await push(ref(rtdb, `users/${targetKey}/notifications`), {
        type: 'mute',
        fromUsername: SYSTEM_BOT_USERNAME,
        fromAvatarUrl: SYSTEM_BOT_AVATAR,
        text: notifText,
        createdAt: Date.now(),
        read: false
      });

      // 2. Save mute state on target user in RTDB
      await update(ref(rtdb, `users/${targetKey}`), {
        mutedUntil,
        muteDuration: selectedDur.label,
        muteReason: cleanReason || null,
        muteNotificationId: newNotifRef.key || null,
        lastActionAt: Date.now(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Error muting user in RTDB:', err);
    }
  };

  // Automatic real-time timer to unmute the current user as soon as their mute duration expires
  useEffect(() => {
    setNowMs(Date.now());
    const mutedUntil = userProfile.mutedUntil;
    if (!currentUser?.username || !mutedUntil) {
      isUnmutingRef.current = false;
      return;
    }

    // Stop voice recording & clear input while muted
    if (mutedUntil > Date.now()) {
      if (isListeningVoice && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
        setIsListeningVoice(false);
      }
      if (inputText) setInputText('');
      if (replyingTo) setReplyingTo(null);
    }

    const checkMuteExpiry = () => {
      const currentNow = Date.now();
      setNowMs(currentNow);
      if (mutedUntil <= currentNow && !isUnmutingRef.current) {
        isUnmutingRef.current = true;
        setUserProfile((prev) => ({
          ...prev,
          mutedUntil: null,
          muteDuration: null,
          muteReason: null,
          muteNotificationId: null
        }));
        handleUnmuteTargetUser(currentUser.username, userProfile.muteNotificationId).finally(() => {
          isUnmutingRef.current = false;
        });
      }
    };

    checkMuteExpiry();
    const interval = setInterval(checkMuteExpiry, 500);
    return () => clearInterval(interval);
  }, [
    currentUser?.username,
    userProfile.mutedUntil,
    userProfile.muteNotificationId,
    handleUnmuteTargetUser,
    isListeningVoice,
    inputText,
    replyingTo
  ]);

  // Voice input toggle using Web Speech API
  const handleToggleVoiceInput = () => {
    if (isListeningVoice && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListeningVoice(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      chatInputRef.current?.focus();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListeningVoice(true);
      recognition.onend = () => setIsListeningVoice(false);
      recognition.onerror = () => setIsListeningVoice(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          chatInputRef.current?.focus();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (_) {
      setIsListeningVoice(false);
    }
  };

  // Avatar and Banner file handlers (Compacted to tiny KB, uploaded to Cloudinary, synced to RTDB)
  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const oldAvatarUrl = sanitizeMediaUrl(userProfile.avatarUrl);
    const oldAvatarPublicId = userProfile.avatarPublicId;
    const oldAvatarToken = userProfile.avatarDeleteToken;

    setIsUploadingAvatar(true);

    // 1. Compact image size to tiny KB (Canvas WebP/JPEG compression)
    let uploadFile = file;
    try {
      const comp = await compressAvatar(file);
      uploadFile = comp.file;
    } catch (compErr) {
      console.warn('Avatar compression notice:', compErr);
    }

    // Instant local preview
    const localPreview = URL.createObjectURL(uploadFile);
    setUserProfile((prev) => ({ ...prev, avatarUrl: localPreview }));

    // 2. Delete previous avatar from Cloudinary (if previously uploaded)
    if (oldAvatarUrl || oldAvatarPublicId) {
      deleteFromCloudinary({
        url: oldAvatarUrl,
        publicId: oldAvatarPublicId,
        deleteToken: oldAvatarToken,
        resourceType: 'image'
      }).catch((delErr) => console.warn('Old avatar delete notice:', delErr));
    }

    // 3. Upload compacted file to Cloudinary in 'avatars' folder, then sync permanent URL to RTDB
    try {
      const uploadRes = await uploadToCloudinary(uploadFile, 'image', 'avatars');
      const finalUrl = uploadRes.secure_url || uploadRes.url;
      const updates: Partial<UserProfileState> = {
        avatarUrl: finalUrl,
        avatarPublicId: uploadRes.public_id,
        avatarDeleteToken: uploadRes.delete_token || null
      };
      setUserProfile((prev) => ({ ...prev, ...updates }));
      await saveProfileToRtdb(updates);
    } catch (err) {
      console.warn('Cloudinary avatar upload fallback to compact Data URL:', err);
      try {
        const dataUrl = await fileToDataUrl(uploadFile);
        const updates: Partial<UserProfileState> = {
          avatarUrl: dataUrl,
          avatarPublicId: null,
          avatarDeleteToken: null
        };
        setUserProfile((prev) => ({ ...prev, ...updates }));
        await saveProfileToRtdb(updates);
      } catch (_) {}
    } finally {
      URL.revokeObjectURL(localPreview);
      setIsUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const oldBannerUrl = sanitizeMediaUrl(userProfile.bannerUrl);
    const oldBannerPublicId = userProfile.bannerPublicId;
    const oldBannerToken = userProfile.bannerDeleteToken;

    setIsUploadingBanner(true);

    // 1. Compact banner size to tiny KB (Canvas WebP/JPEG compression)
    let uploadFile = file;
    try {
      const comp = await compressBanner(file);
      uploadFile = comp.file;
    } catch (compErr) {
      console.warn('Banner compression notice:', compErr);
    }

    // Instant local preview
    const localPreview = URL.createObjectURL(uploadFile);
    setUserProfile((prev) => ({ ...prev, bannerUrl: localPreview }));

    // 2. Delete previous banner from Cloudinary (if previously uploaded)
    if (oldBannerUrl || oldBannerPublicId) {
      deleteFromCloudinary({
        url: oldBannerUrl,
        publicId: oldBannerPublicId,
        deleteToken: oldBannerToken,
        resourceType: 'image'
      }).catch((delErr) => console.warn('Old banner delete notice:', delErr));
    }

    // 3. Upload compacted file to Cloudinary in 'banners' folder, then sync permanent URL to RTDB
    try {
      const uploadRes = await uploadToCloudinary(uploadFile, 'image', 'banners');
      const finalUrl = uploadRes.secure_url || uploadRes.url;
      const updates: Partial<UserProfileState> = {
        bannerUrl: finalUrl,
        bannerPublicId: uploadRes.public_id,
        bannerDeleteToken: uploadRes.delete_token || null
      };
      setUserProfile((prev) => ({ ...prev, ...updates }));
      await saveProfileToRtdb(updates);
    } catch (err) {
      console.warn('Cloudinary banner upload fallback to compact Data URL:', err);
      try {
        const dataUrl = await fileToDataUrl(uploadFile);
        const updates: Partial<UserProfileState> = {
          bannerUrl: dataUrl,
          bannerPublicId: null,
          bannerDeleteToken: null
        };
        setUserProfile((prev) => ({ ...prev, ...updates }));
        await saveProfileToRtdb(updates);
      } catch (_) {}
    } finally {
      URL.revokeObjectURL(localPreview);
      setIsUploadingBanner(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const oldUrl = sanitizeMediaUrl(userProfile.avatarUrl);
    const oldPublicId = userProfile.avatarPublicId;
    const oldToken = userProfile.avatarDeleteToken;
    const updates: Partial<UserProfileState> = {
      avatarUrl: null,
      avatarPublicId: null,
      avatarDeleteToken: null
    };
    setUserProfile((p) => ({ ...p, ...updates }));
    await saveProfileToRtdb(updates);
    if (oldUrl || oldPublicId) {
      deleteFromCloudinary({
        url: oldUrl,
        publicId: oldPublicId,
        deleteToken: oldToken,
        resourceType: 'image'
      }).catch(() => {});
    }
  };

  const handleRemoveBanner = async () => {
    const oldUrl = sanitizeMediaUrl(userProfile.bannerUrl);
    const oldPublicId = userProfile.bannerPublicId;
    const oldToken = userProfile.bannerDeleteToken;
    const updates: Partial<UserProfileState> = {
      bannerUrl: null,
      bannerPublicId: null,
      bannerDeleteToken: null
    };
    setUserProfile((p) => ({ ...p, ...updates }));
    await saveProfileToRtdb(updates);
    if (oldUrl || oldPublicId) {
      deleteFromCloudinary({
        url: oldUrl,
        publicId: oldPublicId,
        deleteToken: oldToken,
        resourceType: 'image'
      }).catch(() => {});
    }
  };

  // Toggle playback of any user's profile music track (self or other user)
  const handleToggleProfileMusic = useCallback((trackToPlay: MusicTrack | null | undefined) => {
    if (!trackToPlay || !trackToPlay.url) return;

    if (activeAudioTrack?.url === trackToPlay.url) {
      setIsProfileMusicPlaying((prev) => !prev);
    } else {
      setActiveAudioTrack(trackToPlay);
      setIsProfileMusicPlaying(true);
    }
  }, [activeAudioTrack]);

  // Control profile music audio element playback
  useEffect(() => {
    const audioEl = profileAudioRef.current;
    if (!audioEl) return;

    if (isProfileMusicPlaying && activeAudioTrack?.url) {
      audioEl.play().catch(() => setIsProfileMusicPlaying(false));
    } else {
      audioEl.pause();
    }
  }, [isProfileMusicPlaying, activeAudioTrack]);

  // Open Edit Sub-Modal with prefilled values
  const openEditSubModal = (
    type: 'info' | 'username' | 'bio' | 'mood' | 'glow' | 'profileBorder' | 'pfpBorder' | 'music'
  ) => {
    if (type === 'info') {
      setTempAge(userProfile.age);
      setTempGender(userProfile.gender);
      setTempRelationship(userProfile.relationship);
      setTempCountry(userProfile.country);
      setTempLanguage(userProfile.language);
    } else if (type === 'username') {
      setTempUsername(currentUser?.username || '');
      setUsernameEditError(null);
    } else if (type === 'bio') {
      setTempBio(userProfile.bio);
    } else if (type === 'mood') {
      setTempMood(userProfile.mood);
    } else if (type === 'glow') {
      setTempGlowColor(userProfile.glowColor);
      setTempGlowThickness(userProfile.glowThickness || 18);
    } else if (type === 'profileBorder') {
      const idx = PROFILE_BORDERS.findIndex((b) => b.id === userProfile.profileBorderId);
      setTempProfileBorderIndex(idx >= 0 ? idx : 0);
      setTempProfileBorderThickness(userProfile.profileBorderThickness || 2);
    } else if (type === 'pfpBorder') {
      const idx = PFP_BORDERS.findIndex((b) => b.id === userProfile.pfpBorderId);
      setTempPfpBorderIndex(idx >= 0 ? idx : 0);
      setTempPfpBorderThickness(userProfile.pfpBorderThickness || 2);
    } else if (type === 'music') {
      // Pause background profile audio while editing music in modal
      setIsProfileMusicPlaying(false);
    }
    setActiveEditSubModal(type);
  };

  // ==========================================
  // VIEW 1: CHAT UI (After Sign up / Login)
  // ==========================================
  if (currentUser) {
    const currentUserRank = getUserRank(currentUser.username, currentUser.email, userProfile.rank);
    const onlineUsersList = allUsersList.filter((u) => u.isOnline === true);
    const offlineUsersList = allUsersList.filter((u) => u.isOnline !== true);

    const renderSidebarUserCard = (userItem: UserProfileData, isOfflineCard = false) => {
      const isMe = Boolean(
        currentUser &&
        userItem.username.toLowerCase() === currentUser.username.toLowerCase()
      );
      const isOnline = userItem.isOnline === true;
      const sidebarUserRank = getUserRank(
        userItem.username,
        isMe ? currentUser?.email : userItem.email,
        isMe ? userProfile.rank : userItem.rank
      );
      const activeGlowColor = isMe ? userProfile.glowColor : userItem.glowColor;
      const activeGlowThickness = (isMe ? userProfile.glowThickness : userItem.glowThickness) || 18;
      return (
        <div
          key={userItem.username}
          ref={isMe ? playerCardRef : undefined}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUser(userItem);
            const rect = e.currentTarget.getBoundingClientRect();
            const popoverWidth = 256;
            const isMobileView = window.innerWidth < 640;
            const targetRight = isMobileView
              ? Math.max(12, Math.round((window.innerWidth - popoverWidth) / 2))
              : Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, window.innerWidth - rect.left + 14));
            setPopoverPos({
              top: Math.max(16, Math.min(window.innerHeight - 310, rect.top - 8)),
              right: targetRight
            });
            setPlayerPopoverOpen(true);
          }}
          style={
            activeGlowColor
              ? {
                  borderColor: activeGlowColor,
                  boxShadow: `0 0 ${activeGlowThickness}px ${activeGlowColor}99, inset 0 0 ${Math.max(4, Math.round(activeGlowThickness / 3))}px ${activeGlowColor}40`
                }
              : undefined
          }
          className={`px-3.5 py-2 flex items-center gap-3 hover:bg-black/35 transition-colors cursor-pointer group ${
            activeGlowColor ? 'border rounded-xl mx-2 my-1' : ''
          } ${
            isOfflineCard ? 'opacity-75 hover:opacity-100' : ''
          }`}
        >
          <UserAvatar
            avatarUrl={isMe ? userProfile.avatarUrl : userItem.avatarUrl}
            className="w-9 h-9"
            showOnline={true}
            isOnline={isOnline}
            pfpBorderClass={getPfpBorder(isMe ? userProfile.pfpBorderId : userItem.pfpBorderId).pfpBorderClass}
            pfpBorderThickness={isMe ? userProfile.pfpBorderThickness : userItem.pfpBorderThickness}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm truncate">
                {userItem.username}
              </span>
            </div>
            {userItem.mood && (
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {userItem.mood}
              </p>
            )}
          </div>
          {sidebarUserRank && (
            <img
              src={sidebarUserRank.icon}
              alt={sidebarUserRank.name}
              className="w-5 h-5 object-contain shrink-0 select-none ml-auto"
            />
          )}
        </div>
      );
    };

    const isCurrentUserStaff = isStaffRank(currentUserRank);
    const isMainDeveloper =
      currentUserRank?.id === 'main_developer' ||
      currentUser.username.trim().toLowerCase() === 'null' ||
      currentUser.email?.trim().toLowerCase() === 'null@gmail.com' ||
      currentUser.email?.trim().toLowerCase() === 'null@gmai.com';
    const isDevOrAbove = (currentUserRank?.priority ?? 0) >= 80;
    const isOwnerOrAbove = (currentUserRank?.priority ?? 0) >= 90;
    const hasUnreadNotifications = notifications.some((n) => !n.read);
    const hasUnreadPms = pmThreads.some((t) => t.unread);

    return (
      <div className="h-[100dvh] w-screen bg-[#111114] text-white flex flex-col font-sans overflow-hidden select-none relative">
        {/* TOP NAVBAR */}
        <header className="h-14 bg-[#141418] border-b border-[#202026] flex items-center justify-between px-4 z-50 relative shrink-0">
          {/* Top-Left Hamburger Icon + App Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative" ref={hamburgerMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu(false);
                  setShowNotificationsMenu(false);
                  setShowPrivateMenu(false);
                  setShowHamburgerMenu((prev) => !prev);
                }}
                aria-label="Open menu"
                className="text-white hover:text-zinc-300 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>

            {showHamburgerMenu && (
              <div className="absolute left-0 top-full mt-2 w-48 bg-[#15151b] border border-[#262630] rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-100 py-1.5 px-1.5 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowHamburgerMenu(false);
                    setNewsDrawerOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-extrabold text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <Newspaper className="w-4 h-4 text-[#00b4d8]" />
                  <span>News</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowHamburgerMenu(false);
                    setStaffModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-extrabold text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <Shield className="w-4 h-4 text-[#00b4d8]" />
                  <span>Staff</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowHamburgerMenu(false);
                    setRulesModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-extrabold text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <Scale className="w-4 h-4 text-[#00b4d8]" />
                  <span>Rules</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowHamburgerMenu(false);
                    setMessagesViewActive(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-extrabold rounded-xl transition-colors cursor-pointer text-left ${
                    messagesViewActive
                      ? 'bg-[#00d95f]/15 text-[#00d95f]'
                      : 'text-white hover:bg-white/5'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-[#00d95f]" />
                  <span>Messages</span>
                </button>

                {messagesViewActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowHamburgerMenu(false);
                      setMessagesViewActive(false);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-extrabold text-cyan-400 hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>Public Chat</span>
                  </button>
                )}
              </div>
            )}
            </div>

            <img
              src={appLogo || '/logo.png'}
              alt="Logo"
              className="h-9 sm:h-11 w-auto object-contain select-none pointer-events-none shrink-0"
            />
          </div>

          {/* Top-Right Controls */}
          <div className="flex items-center gap-3">
          {/* Private Messages Envelope Icon (Screenshot 1) */}
          <div className="relative" ref={privateMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileMenu(false);
                setShowNotificationsMenu(false);
                setShowHamburgerMenu(false);
                setShowPrivateMenu((prev) => !prev);
              }}
              aria-label="Private messages"
              className="bcell_mid relative text-white hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center"
            >
              <i className="fa fa-envelope text-white text-lg" aria-hidden="true" />
              {hasUnreadPms && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ff1e1e] rounded-full pointer-events-none" />
              )}
            </button>

            {/* Private Dropdown Menu (Screenshot 1) */}
            {showPrivateMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#18181c] border border-[#282832] rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-100">
                {/* Private Dropdown Header */}
                <div className="px-4 py-3 border-b border-[#25252e] flex items-center justify-between bg-[#1b1b20]">
                  <div className="flex items-center gap-2">
                    <i className="fa fa-comments text-white text-base" aria-hidden="true" />
                    <span className="text-base font-black text-white tracking-wide">
                      Private
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={handleMarkAllPmsRead}
                      title="Mark all as read"
                      className="text-white hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <i className="fa fa-check-square text-base" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllPmThreads}
                      title="Delete all private conversations"
                      className="text-white hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <i className="fa fa-trash text-base" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Private Conversations List */}
                <div className="max-h-[380px] overflow-y-auto py-1">
                  {pmThreads.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-zinc-500 font-medium">
                      No private messages yet.
                    </div>
                  ) : (
                    pmThreads.map((thread) => {
                      const isSystemPeer = thread.peerUsername.toLowerCase() === 'system';
                      const peerUser = allUsersList.find(
                        (u) => u.username.toLowerCase() === thread.peerUsername.toLowerCase()
                      );
                      const peerAvatar = isSystemPeer
                        ? SYSTEM_BOT_AVATAR
                        : (peerUser?.avatarUrl ?? thread.peerAvatarUrl ?? null);
                      const peerGlow = peerUser?.glowColor || null;
                      const peerBorderId = peerUser?.pfpBorderId || 'pfp-default';
                      const peerBorderThickness = peerUser?.pfpBorderThickness || 2;

                      return (
                        <div
                          key={thread.peerKey}
                          onClick={() => handleOpenPmWithUser(peerUser?.username || thread.peerUsername)}
                          className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.05] transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              avatarUrl={peerAvatar}
                              className="w-11 h-11"
                              pfpBorderClass={getPfpBorder(peerBorderId).pfpBorderClass}
                              pfpBorderThickness={peerBorderThickness}
                            />
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                style={
                                  peerGlow
                                    ? {
                                        color: peerGlow,
                                        textShadow: `0 0 10px ${peerGlow}80`
                                      }
                                    : undefined
                                }
                                className="text-sm sm:text-base font-black text-white truncate"
                              >
                                {peerUser?.username || thread.peerUsername}
                              </span>
                              {thread.unread && (
                                <span className="w-2.5 h-2.5 rounded-full bg-[#ff1e1e] shrink-0" />
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeletePmThread(thread.peerKey, e)}
                            aria-label="Remove conversation"
                            title="Remove conversation"
                            className="text-white hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-4 h-4 stroke-[3]" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Flag icon: only visible if current user is Staff */}
          {isCurrentUserStaff && (
            <button
              type="button"
              aria-label="Staff Reports"
              className="bcell_mid text-white hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center"
            >
              <i className="fa fa-flag text-white text-lg" aria-hidden="true" />
            </button>
          )}

          {/* RED FLAG ICON: Exclusively for Null (null@gmail.com / Main Dev) to monitor RTDB & manage database */}
          {isMainDeveloper && (
            <button
              type="button"
              onClick={() => setDbMonitorModalOpen(true)}
              aria-label="Realtime Database Monitor & Admin Console"
              title="Realtime Database Monitor & Admin Console (Main Dev Only)"
              className="bcell_mid text-[#ff1e1e] hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/15 transition-colors cursor-pointer flex items-center justify-center relative"
            >
              <i
                className="fa fa-flag text-[#ff1e1e] text-lg drop-shadow-[0_0_8px_rgba(255,30,30,0.75)]"
                aria-hidden="true"
              />
            </button>
          )}

          {/* Notifications Bell Icon (bcell_mid) next to flag (or where flag was for non-staff) */}
          <div className="relative" ref={notificationsMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileMenu(false);
                setShowPrivateMenu(false);
                setShowHamburgerMenu(false);
                const nextOpen = !showNotificationsMenu;
                setShowNotificationsMenu(nextOpen);
                if (nextOpen) {
                  markAllNotificationsAsRead();
                }
              }}
              aria-label="Notifications"
              className="bcell_mid relative text-white hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center"
            >
              <i className="fa fa-bell text-white text-lg" aria-hidden="true" />
              {hasUnreadNotifications && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ff1e1e] rounded-full pointer-events-none" />
              )}
            </button>

            {/* Notifications Dropdown Menu right underneath */}
            {showNotificationsMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#141418] border border-[#262630] rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-100">
                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 border-b border-[#22222c] flex items-center justify-between bg-[#18181f]">
                    <span className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider">
                      Notifications
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAllNotifications}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Delete all notifications"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear all</span>
                    </button>
                  </div>
                )}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-[#22222c]">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-zinc-500 font-medium">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isSystemNotif =
                        notif.type === 'rank_change' ||
                        notif.type === 'mute' ||
                        notif.fromUsername.toLowerCase() === 'system';
                      const matchedUser = allUsersList.find(
                        (u) => u.username.toLowerCase() === notif.fromUsername.toLowerCase()
                      );
                      const notifAvatar = isSystemNotif
                        ? SYSTEM_BOT_AVATAR
                        : (matchedUser?.avatarUrl ?? notif.fromAvatarUrl ?? null);
                      const notifOnline = isSystemNotif
                        ? true
                        : (matchedUser?.isOnline ?? false);
                      const notifBorderId = isSystemNotif
                        ? 'pfp-default'
                        : (matchedUser?.pfpBorderId ?? notif.fromPfpBorderId ?? 'pfp-default');
                      const notifBorderThickness = isSystemNotif
                        ? 2
                        : (matchedUser?.pfpBorderThickness ?? notif.fromPfpBorderThickness ?? 2);

                      return (
                        <div
                          key={notif.id}
                          onClick={() => {
                            setShowNotificationsMenu(false);
                            if (matchedUser) {
                              setSelectedUser(matchedUser);
                              if (!isSystemNotif) {
                                recordProfileVisitNotification(matchedUser.username);
                              }
                            } else {
                              setSelectedUser({
                                username: notif.fromUsername,
                                avatarUrl: notifAvatar,
                                isOnline: notifOnline
                              });
                              if (!isSystemNotif) {
                                recordProfileVisitNotification(notif.fromUsername);
                              }
                            }
                            setPublicProfileTab('info');
                            setProfileViewMode('view');
                            setProfileModalOpen(true);
                          }}
                          className="w-full px-4 py-3 flex items-start gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer text-left group"
                        >
                          <UserAvatar
                            avatarUrl={notifAvatar}
                            className="w-11 h-11 mt-0.5"
                            showOnline={true}
                            isOnline={notifOnline}
                            pfpBorderClass={getPfpBorder(notifBorderId).pfpBorderClass}
                            pfpBorderThickness={notifBorderThickness}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate leading-tight">
                              {isSystemNotif ? SYSTEM_BOT_USERNAME : (matchedUser?.username || notif.fromUsername)}
                            </p>
                            <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-snug mt-0.5 break-words">
                              {notif.text}
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              {formatNotificationDate(notif.createdAt)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(notif.id, e)}
                            aria-label="Delete notification"
                            title="Delete notification"
                            className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 self-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Default PFP or Uploaded PFP with green online status dot */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileMenu((prev) => !prev);
              }}
              aria-label="User profile"
              className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-cyan-500/40 transition-all cursor-pointer"
            >
              <UserAvatar
                avatarUrl={userProfile.avatarUrl}
                className="w-8 h-8"
                showOnline={true}
                pfpBorderClass={getPfpBorder(userProfile.pfpBorderId).pfpBorderClass}
                pfpBorderThickness={userProfile.pfpBorderThickness}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-[#15151b] border border-[#262630] rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-100">
                {/* Header with Avatar, Username, and Green Checkmark */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#24252e] shrink-0">
                      {userProfile.avatarUrl ? (
                        <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <svg viewBox="0 0 40 40" className="w-full h-full text-zinc-400 fill-current translate-y-0.5">
                          <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white truncate leading-tight">
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

                {/* Menu Options */}
                <div className="p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setSelectedUser(null);
                      setProfileViewMode('edit');
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <SquarePen className="w-4 h-4 text-[#00b4d8]" />
                    <span>Edit profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setSelectedUser(null);
                      setProfileViewMode('view');
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Eye className="w-4 h-4 text-[#00b4d8]" />
                    <span>View profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setGuideStep(1);
                      setShowGuide(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Compass className="w-4 h-4 text-[#00b4d8]" />
                    <span>Site guide</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </header>

        {/* MAIN BODY: Left-Pinned News Drawer + Chat Area + Right Sidebar */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* LEFT-PINNED COMMUNITY NEWS DRAWER */}
          {newsDrawerOpen && (
            <aside className="w-full sm:w-[360px] md:w-[390px] bg-[#141418] border-r border-[#22222a] flex flex-col h-full shrink-0 z-30 animate-in slide-in-from-left duration-150">
              {/* News Drawer Header */}
              <div className="px-4 py-3.5 border-b border-[#22222c] flex items-center justify-between shrink-0 bg-[#16161c]">
                <div className="flex items-center gap-2.5">
                  <Newspaper className="w-5 h-5 text-white" />
                  <h2 className="text-base font-black text-white tracking-wide">
                    Community News
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {isDevOrAbove && (
                    <button
                      type="button"
                      onClick={() => setNewsComposerOpen((prev) => !prev)}
                      className="bg-[#00add8] hover:bg-[#0099bf] text-white font-extrabold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>New</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNewsDrawerOpen(false)}
                    aria-label="Close news"
                    className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Hidden file input for News Media (image, video, GIF) */}
              <input
                type="file"
                ref={newsMediaInputRef}
                accept="image/*,video/*,.gif"
                className="hidden"
                onChange={handleNewsMediaUpload}
              />

              {/* Developer & Above New Post Composer Underneath Header */}
              {isDevOrAbove && newsComposerOpen && (
                <form
                  onSubmit={handleCreateNewsPost}
                  className="p-3.5 border-b border-[#252530] bg-[#181820] space-y-2.5 shrink-0 animate-in fade-in duration-150"
                >
                  <input
                    type="text"
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full bg-[#121216] border border-[#2a2a35] rounded-xl px-3.5 py-2 text-sm font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                  <textarea
                    rows={3}
                    value={newsDescription}
                    onChange={(e) => setNewsDescription(e.target.value)}
                    placeholder="Description"
                    className="w-full bg-[#121216] border border-[#2a2a35] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 resize-none"
                  />

                  {newsMediaUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-[#2a2a35] bg-black/40 max-h-44 flex items-center justify-center">
                      {newsMediaType === 'video' ? (
                        <video src={newsMediaUrl} controls className="max-h-44 w-full object-contain" />
                      ) : (
                        <img src={newsMediaUrl} alt="Upload preview" className="max-h-44 w-full object-contain" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setNewsMediaUrl(null);
                          setNewsMediaType(null);
                        }}
                        className="absolute top-2 right-2 bg-black/75 hover:bg-rose-600 text-white p-1 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isUploadingNewsMedia}
                      onClick={() => newsMediaInputRef.current?.click()}
                      className="bg-[#23232e] hover:bg-[#2c2c3a] text-zinc-200 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingNewsMedia ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Upload Image / Video / GIF</span>
                        </>
                      )}
                    </button>

                    <button
                      type="submit"
                      disabled={isSendingNews || isUploadingNewsMedia}
                      className="bg-[#00add8] hover:bg-[#0099bf] disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      {isSendingNews ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <SendHorizontal className="w-3.5 h-3.5" />
                      )}
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              )}

              {/* News Feed List */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 divide-y divide-[#22222c]">
                {newsPosts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 font-medium">
                    No community news posted yet.
                  </div>
                ) : (
                  newsPosts.map((post) => {
                    const authorUser = allUsersList.find(
                      (u) => u.username.toLowerCase() === post.author.toLowerCase()
                    );
                    const authorAvatar = authorUser?.avatarUrl ?? post.authorAvatar ?? null;
                    const authorOnline = authorUser?.isOnline ?? false;
                    const authorBorderId = authorUser?.pfpBorderId ?? post.authorPfpBorderId ?? 'pfp-default';
                    const authorBorderThickness = authorUser?.pfpBorderThickness ?? post.authorPfpBorderThickness ?? 2;
                    const authorRankObj = getUserRank(
                      post.author,
                      authorUser?.email,
                      authorUser?.rank ?? post.authorRank
                    );

                    const myKey = sanitizeDbKey(currentUser.username);
                    const likeCount = Object.keys(post.likes || {}).length;
                    const dislikeCount = Object.keys(post.dislikes || {}).length;
                    const loveCount = Object.keys(post.loves || {}).length;
                    const laughCount = Object.keys(post.laughs || {}).length;

                    const hasLiked = Boolean(post.likes?.[myKey]);
                    const hasDisliked = Boolean(post.dislikes?.[myKey]);
                    const hasLoved = Boolean(post.loves?.[myKey]);
                    const hasLaughed = Boolean(post.laughs?.[myKey]);
                    const isCommentsOpen = Boolean(expandedNewsComments[post.id]);

                    return (
                      <div key={post.id} className="pt-3.5 first:pt-0 space-y-2.5">
                        {/* Post Author Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar
                              avatarUrl={authorAvatar}
                              className="w-10 h-10"
                              showOnline={true}
                              isOnline={authorOnline}
                              pfpBorderClass={getPfpBorder(authorBorderId).pfpBorderClass}
                              pfpBorderThickness={authorBorderThickness}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-white text-sm truncate">
                                  {authorUser?.username || post.author}
                                </span>
                                {authorRankObj && (
                                  <img
                                    src={authorRankObj.icon}
                                    alt={authorRankObj.name}
                                    className="w-4 h-4 object-contain shrink-0"
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-zinc-400">
                              {formatNotificationDate(post.createdAt)}
                            </span>
                            {isDevOrAbove && (
                              <button
                                type="button"
                                onClick={() => handleDeleteNewsPost(post.id)}
                                title="Delete news post"
                                className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        {post.title && (
                          <h3 className="text-sm sm:text-base font-black text-white leading-snug break-words">
                            {post.title}
                          </h3>
                        )}
                        {post.description && (
                          <p className="text-xs sm:text-sm text-zinc-200 whitespace-pre-line leading-relaxed break-words select-text">
                            {post.description}
                          </p>
                        )}

                        {/* Uploaded Media (Image, GIF, or Video) */}
                        {post.mediaUrl && (
                          <div className="rounded-xl overflow-hidden border border-[#262632] bg-black/30">
                            {post.mediaType === 'video' ? (
                              <video
                                src={post.mediaUrl}
                                controls
                                className="w-full max-h-72 object-contain"
                              />
                            ) : (
                              <img
                                src={post.mediaUrl}
                                alt={post.title || 'News attachment'}
                                className="w-full max-h-80 object-cover"
                              />
                            )}
                          </div>
                        )}

                        {/* Reactions & Comments Toggle Bar (Matching Screenshot 2) */}
                        <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleNewsReaction(post.id, 'likes')}
                              className={`flex items-center gap-1 text-xs font-bold transition-transform active:scale-95 cursor-pointer ${
                                hasLiked ? 'text-amber-300' : 'text-zinc-300 hover:text-white'
                              }`}
                            >
                              <span className="text-base leading-none">👍</span>
                              <span>{likeCount}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleNewsReaction(post.id, 'dislikes')}
                              className={`flex items-center gap-1 text-xs font-bold transition-transform active:scale-95 cursor-pointer ${
                                hasDisliked ? 'text-amber-300' : 'text-zinc-300 hover:text-white'
                              }`}
                            >
                              <span className="text-base leading-none">👎</span>
                              <span>{dislikeCount}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleNewsReaction(post.id, 'loves')}
                              className={`flex items-center gap-1 text-xs font-bold transition-transform active:scale-95 cursor-pointer ${
                                hasLoved ? 'text-rose-400' : 'text-zinc-300 hover:text-white'
                              }`}
                            >
                              <span className="text-base leading-none">❤️</span>
                              <span>{loveCount}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleNewsReaction(post.id, 'laughs')}
                              className={`flex items-center gap-1 text-xs font-bold transition-transform active:scale-95 cursor-pointer ${
                                hasLaughed ? 'text-amber-300' : 'text-zinc-300 hover:text-white'
                              }`}
                            >
                              <span className="text-base leading-none">😂</span>
                              <span>{laughCount}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedNewsComments((prev) => ({
                                ...prev,
                                [post.id]: !prev[post.id]
                              }))
                            }
                            className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-200 hover:text-white transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-current" />
                            <span>Comments ({post.comments.length})</span>
                          </button>
                        </div>

                        {/* Comments Section */}
                        {isCommentsOpen && (
                          <div className="mt-2 pt-2.5 border-t border-[#23232e] space-y-2.5 animate-in fade-in duration-100">
                            {post.comments.length === 0 ? (
                              <p className="text-[11px] text-zinc-500 text-center py-1">
                                No comments yet. Be the first to comment!
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {post.comments.map((c) => {
                                  const cUser = allUsersList.find(
                                    (u) => u.username.toLowerCase() === c.author.toLowerCase()
                                  );
                                  const cRank = getUserRank(c.author, cUser?.email, cUser?.rank ?? c.authorRank);
                                  const canDeleteComment =
                                    c.author.toLowerCase() === currentUser.username.toLowerCase() ||
                                    isDevOrAbove;
                                  return (
                                    <div
                                      key={c.id}
                                      className="bg-[#181820] border border-[#24242f] rounded-xl p-2.5 flex items-start gap-2"
                                    >
                                      <UserAvatar
                                        avatarUrl={cUser?.avatarUrl ?? c.authorAvatar}
                                        className="w-7 h-7 mt-0.5"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <div className="flex items-center gap-1 min-w-0">
                                            {cRank && (
                                              <img
                                                src={cRank.icon}
                                                alt={cRank.name}
                                                className="w-3.5 h-3.5 object-contain shrink-0"
                                              />
                                            )}
                                            <span className="text-xs font-extrabold text-white truncate">
                                              {cUser?.username || c.author}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-[10px] text-zinc-500">
                                              {formatNotificationDate(c.createdAt)}
                                            </span>
                                            {canDeleteComment && (
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteNewsComment(post.id, c.id, c.author)}
                                                className="text-zinc-500 hover:text-rose-400 p-0.5 cursor-pointer"
                                                title="Delete comment"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-xs text-zinc-200 mt-0.5 break-words">
                                          {c.text}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Add Comment Input */}
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={newsCommentInputs[post.id] || ''}
                                onChange={(e) =>
                                  setNewsCommentInputs((prev) => ({
                                    ...prev,
                                    [post.id]: e.target.value
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddNewsComment(post.id);
                                  }
                                }}
                                placeholder="Write a comment..."
                                className="flex-1 bg-[#111116] border border-[#282834] rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddNewsComment(post.id)}
                                className="bg-[#00add8] hover:bg-[#0099bf] text-white p-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
                              >
                                <SendHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          )}

          {/* CHAT AREA OR MESSAGES VIEW */}
          {messagesViewActive ? (
            <MessagesView
              currentUser={currentUser}
              userAvatarUrl={userProfile.avatarUrl}
              allUsersList={allUsersList}
              pmThreads={pmThreads}
              onBackToPublicChat={() => setMessagesViewActive(false)}
              onGenerateAiReply={generateAiBotReply}
            />
          ) : (
          <section className="flex-1 flex flex-col bg-[#111114] overflow-hidden relative">
            {/* MESSAGES LIST (Loads 60 initially; scrolling to top loads older messages up to 200) */}
            <div
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop <= 25 && messages.length >= chatHistoryLimit && chatHistoryLimit < 200) {
                  setChatHistoryLimit((prev) => Math.min(200, prev + 50));
                }
              }}
              className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4"
            >
              {messages.length >= chatHistoryLimit && chatHistoryLimit < 200 && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setChatHistoryLimit((prev) => Math.min(200, prev + 50))}
                    className="px-3 py-1 rounded-full bg-[#1a1a22] hover:bg-[#23232e] border border-[#2c2c3a] text-[11px] font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Load older messages ({messages.length}/200)...
                  </button>
                </div>
              )}
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
                messages.map((msg) => {
                  const isSenderMe = Boolean(
                    currentUser &&
                    (msg.sender.toLowerCase() === currentUser.username.toLowerCase() ||
                      (msg.senderKey && msg.senderKey === sanitizeDbKey(currentUser.username)))
                  );
                  const senderFromList = allUsersList.find(
                    (u) =>
                      u.username.toLowerCase() === msg.sender.toLowerCase() ||
                      (msg.senderKey && sanitizeDbKey(u.username) === msg.senderKey)
                  );
                  const displaySenderName = isSenderMe
                    ? currentUser.username
                    : (senderFromList?.username || msg.sender);
                  const msgAvatarUrl = isSenderMe
                    ? userProfile.avatarUrl
                    : (senderFromList ? senderFromList.avatarUrl : (msg.avatarUrl || null));
                  const msgBorderId = isSenderMe
                    ? userProfile.pfpBorderId
                    : (senderFromList?.pfpBorderId || msg.pfpBorderId || 'pfp-default');
                  const msgBorderThickness = isSenderMe
                    ? userProfile.pfpBorderThickness
                    : (senderFromList?.pfpBorderThickness ?? msg.pfpBorderThickness ?? 2);
                  const senderRank = getUserRank(
                    displaySenderName,
                    isSenderMe ? currentUser.email : senderFromList?.email,
                    isSenderMe ? userProfile.rank : (senderFromList?.rank ?? msg.rank)
                  );
                  const isMsgMenuOpen = activeMsgMenuId === msg.id;

                  const handleOpenSenderProfile = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (isSenderMe) {
                      setSelectedUser(null);
                    } else if (senderFromList) {
                      setSelectedUser(senderFromList);
                      recordProfileVisitNotification(senderFromList.username);
                    } else {
                      setSelectedUser({
                        username: displaySenderName,
                        avatarUrl: msg.avatarUrl || null,
                        pfpBorderId: msg.pfpBorderId || null,
                        pfpBorderThickness: msg.pfpBorderThickness,
                        rank: msg.rank || null,
                        isOnline: false
                      });
                      recordProfileVisitNotification(displaySenderName);
                    }
                    setPublicProfileTab('info');
                    setProfileViewMode('view');
                    setProfileModalOpen(true);
                  };

                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-2.5 sm:gap-3 group hover:bg-white/[0.02] -mx-2 px-2 py-1.5 rounded-lg transition-colors relative"
                    >
                      <button
                        type="button"
                        onClick={handleOpenSenderProfile}
                        className="cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                        title={`View ${displaySenderName}'s profile`}
                      >
                        <UserAvatar
                          avatarUrl={msgAvatarUrl}
                          className="w-10 h-10 mt-0.5"
                          pfpBorderClass={getPfpBorder(msgBorderId).pfpBorderClass}
                          pfpBorderThickness={msgBorderThickness}
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {senderRank && (
                              <img
                                src={senderRank.icon}
                                alt={senderRank.name}
                                className="w-4 h-4 object-contain shrink-0 select-none"
                              />
                            )}
                            <button
                              type="button"
                              onClick={handleOpenSenderProfile}
                              className="font-bold text-white text-sm sm:text-base tracking-wide hover:text-cyan-300 transition-colors cursor-pointer text-left focus:outline-none"
                            >
                              {displaySenderName}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 text-zinc-500 text-xs shrink-0">
                            <span>{msg.timestamp}</span>

                            {/* "..." options button next to the time on the right */}
                            <div className="relative" data-msg-menu>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMsgMenuId(isMsgMenuOpen ? null : msg.id);
                                }}
                                aria-label="Message options"
                                title="Message options"
                                className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {isMsgMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-52 bg-[#1b1b22] border border-[#2b2b36] rounded-2xl shadow-2xl overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMsgMenuId(null);
                                      setReplyingTo({
                                        id: msg.id,
                                        sender: displaySenderName,
                                        text: msg.text
                                      });
                                      chatInputRef.current?.focus();
                                    }}
                                    className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-white/[0.06] transition-colors cursor-pointer text-left border-b border-[#262630] last:border-b-0"
                                  >
                                    <Reply className="w-5 h-5 text-[#00b4d8] shrink-0" />
                                    <div>
                                      <div className="text-sm font-black text-white leading-tight">
                                        Quote
                                      </div>
                                      <div className="text-xs text-zinc-400 font-normal mt-0.5">
                                        Reply to this post
                                      </div>
                                    </div>
                                  </button>

                                  {(isSenderMe || isOwnerOrAbove) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMsgMenuId(null);
                                        handleDeleteMessage(msg.id);
                                      }}
                                      className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                                    >
                                      <Trash2 className="w-5 h-5 text-[#00b4d8] shrink-0" />
                                      <div>
                                        <div className="text-sm font-black text-white leading-tight">
                                          Delete
                                        </div>
                                        <div className="text-xs text-zinc-400 font-normal mt-0.5">
                                          Erase this content
                                        </div>
                                      </div>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quoted Reply Preview if message is a reply */}
                        {msg.replyTo && (
                          <div className="mt-1 mb-1 pl-2.5 py-1 border-l-2 border-cyan-500/60 bg-white/[0.03] rounded-r-lg text-xs text-zinc-400 truncate">
                            <span className="font-bold text-cyan-400 mr-1.5">@{msg.replyTo.sender}:</span>
                            <span className="text-zinc-300">{msg.replyTo.text || 'Attachment'}</span>
                          </div>
                        )}

                        {msg.text && (
                          <p className="text-white font-medium text-sm sm:text-base mt-0.5 break-words leading-relaxed select-text">
                            {renderMessageTextWithMentions(msg.text, currentUser?.username)}
                          </p>
                        )}

                        {/* Uploaded Chat Media (Image, MP3/Audio, or Video) */}
                        {msg.mediaUrl && (
                          <div className="mt-2">
                            {msg.mediaType === 'video' ? (
                              <video
                                src={msg.mediaUrl}
                                controls
                                playsInline
                                className="max-w-full sm:max-w-md max-h-80 rounded-2xl border border-[#262632] bg-black/40 object-contain"
                              />
                            ) : msg.mediaType === 'audio' ? (
                              <div className="max-w-xs sm:max-w-sm bg-[#181820] border border-[#282834] rounded-2xl p-3 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 truncate">
                                  <Music className="w-4 h-4 shrink-0" />
                                  <span className="truncate text-white">
                                    {msg.mediaName || 'Audio track (.mp3)'}
                                  </span>
                                </div>
                                <audio
                                  src={msg.mediaUrl}
                                  controls
                                  className="w-full h-9"
                                />
                              </div>
                            ) : (
                              <img
                                src={msg.mediaUrl}
                                alt={msg.mediaName || 'Uploaded image'}
                                className="max-w-full sm:max-w-sm max-h-80 rounded-2xl border border-[#262632] bg-black/20 object-contain"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* TOPIC BANNER */}
            {showTopic && (
              <div className="mx-3 sm:mx-4 mb-2 bg-[#0d231b] border border-[#14422e] rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm">
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

            {/* REPLYING TO BAR */}
            {replyingTo && (
              <div className="mx-3 sm:mx-4 mb-1.5 bg-[#181822] border border-cyan-500/30 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs animate-in fade-in duration-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-zinc-400 shrink-0">Replying to</span>
                  <span className="font-bold text-cyan-300 shrink-0">@{replyingTo.sender}</span>
                  <span className="text-zinc-300 truncate">{replyingTo.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer shrink-0 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* PENDING CHAT MEDIA ATTACHMENT PREVIEW BAR */}
            {(chatMediaUrl || isUploadingChatMedia) && (
              <div className="mx-3 sm:mx-4 mb-1.5 bg-[#181822] border border-[#2a2a38] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 animate-in fade-in duration-100">
                {isUploadingChatMedia ? (
                  <div className="flex items-center gap-2.5 text-xs text-cyan-300 font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Uploading attachment...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {chatMediaType === 'video' ? (
                      <video
                        src={chatMediaUrl!}
                        className="w-14 h-14 rounded-lg object-cover bg-black border border-white/10 shrink-0"
                      />
                    ) : chatMediaType === 'audio' ? (
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <Music className="w-5 h-5" />
                      </div>
                    ) : (
                      <img
                        src={chatMediaUrl!}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover bg-black border border-white/10 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-white truncate">
                        {chatMediaName || (chatMediaType === 'audio' ? 'Audio (.mp3)' : chatMediaType === 'video' ? 'Video' : 'Image')}
                      </p>
                      <p className="text-[11px] text-cyan-400 font-medium capitalize">
                        Ready to send {chatMediaType}
                      </p>
                    </div>
                  </div>
                )}

                {!isUploadingChatMedia && (
                  <button
                    type="button"
                    onClick={() => {
                      setChatMediaUrl(null);
                      setChatMediaType(null);
                      setChatMediaName(null);
                    }}
                    title="Remove attachment"
                    className="text-zinc-400 hover:text-rose-400 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Hidden File Input for Chat Media (Images, MP3/Audio, Videos) */}
            <input
              type="file"
              ref={chatMediaInputRef}
              accept="image/*,video/*,audio/*,.mp3,.wav,.ogg,.m4a,.mp4,.webm,.mov,.gif"
              className="hidden"
              onChange={handleChatMediaUpload}
            />

            {/* CHAT INPUT BAR */}
            <div className="px-3 sm:px-4 py-2 bg-[#111114]">
              {userProfile.mutedUntil && userProfile.mutedUntil > nowMs ? (
                <div className="bg-[#18181e] border border-[#24242d] rounded-2xl px-4 py-3.5 flex items-center justify-center shadow-lg select-none">
                  <span className="text-white font-extrabold italic text-sm sm:text-base tracking-wide">
                    You have been muted.
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="bg-[#18181e] border border-[#24242d] rounded-2xl px-3.5 py-2 flex items-center gap-2 focus-within:border-cyan-500/60 transition-colors shadow-lg"
                >
                  <button
                    type="button"
                    disabled={isUploadingChatMedia}
                    onClick={() => chatMediaInputRef.current?.click()}
                    aria-label="Upload image, MP3, or video"
                    title="Upload image, MP3, or video"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isUploadingChatMedia ? (
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </button>

                  <input
                    ref={chatInputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={replyingTo ? `Reply to @${replyingTo.sender}...` : 'Type here...'}
                    className="flex-1 bg-[#141419] border border-[#262630] rounded-xl px-3.5 py-2 text-white text-sm sm:text-base placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                  />

                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    aria-label="Voice input"
                    title={isListeningVoice ? 'Listening... Click to stop' : 'Voice dictation'}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      isListeningVoice
                        ? 'text-rose-400 bg-rose-500/15 animate-pulse'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !chatMediaUrl) || isUploadingChatMedia}
                    aria-label="Send message"
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      (inputText.trim() || chatMediaUrl) && !isUploadingChatMedia
                        ? 'text-white hover:text-cyan-300 hover:bg-cyan-500/10'
                        : 'text-zinc-500'
                    }`}
                  >
                    <SendHorizontal className="w-5 h-5" />
                  </button>
                </form>
              )}
            </div>
          </section>
          )}

          {/* MOBILE BACKDROP WHEN PLAYERS ONLINE IS OPEN */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 top-14 bottom-11 bg-black/50 z-30 md:hidden"
            />
          )}

          {/* RIGHT SIDEBAR: ONLINE PLAYERS PANEL (On mobile: overlays on the right in front of everything else) */}
          {sidebarOpen && (
            <aside className="fixed md:relative top-14 bottom-11 right-0 md:top-auto md:bottom-auto w-[80vw] max-w-[310px] sm:w-80 bg-[#141418] border-l border-[#202026] flex flex-col shrink-0 z-40 shadow-2xl md:shadow-none animate-in slide-in-from-right duration-150">
              <div className="h-12 border-b border-[#202026] flex items-center justify-between px-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close players online"
                  className="text-zinc-300 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase pr-1">
                  Users
                </span>
              </div>

              {/* USER LIST: Online & Offline sections */}
              <div className="flex-1 overflow-y-auto">
                <div className="py-2">
                  <div className="px-3.5 py-2 flex items-center gap-2">
                    <span className="font-extrabold text-white text-sm">Online</span>
                    <span className="bg-[#00a8e8] text-white text-xs font-extrabold px-2 py-0.5 rounded-full leading-none">
                      {onlineUsersList.length}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    {onlineUsersList.map((userItem) => renderSidebarUserCard(userItem, false))}
                  </div>
                </div>

                {offlineUsersList.length > 0 && (
                  <div className="bg-black/25 py-2 border-t border-[#1c1c22]">
                    <div className="px-3.5 py-2 flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">Offline</span>
                    </div>
                    <div className="flex flex-col">
                      {offlineUsersList.map((userItem) => renderSidebarUserCard(userItem, true))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* BOTTOM BAR UNDER "TYPE HERE..." (Hamburger on bottom right, no play icon on left) */}
        <div className="h-11 bg-[#0a0a0d] border-t border-[#1c1c24] px-4 flex items-center justify-end shrink-0 z-40">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle players online"
            title="Toggle players online"
            className="text-white hover:text-cyan-300 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

          {/* Options popover shown on the left of the player - Entire top bit is banner */}
          {playerPopoverOpen && (() => {
            const activePopoverUser: UserProfileData = liveSelectedUser || (currentUser ? {
              username: currentUser.username,
              ...userProfile,
              isOnline: true
            } : {
              username: 'Guest',
              isOnline: true
            });
            const isSelectedUserMe = Boolean(
              currentUser &&
              activePopoverUser.username.toLowerCase() === currentUser.username.toLowerCase()
            );
            const popoverMusicTrack = isSelectedUserMe ? userProfile.musicTrack : activePopoverUser.musicTrack;
            const isThisTrackPlaying = Boolean(
              isProfileMusicPlaying &&
              popoverMusicTrack &&
              activeAudioTrack?.url === popoverMusicTrack.url
            );
            const popoverPfpBorderClass = getPfpBorder(
              isSelectedUserMe ? userProfile.pfpBorderId : activePopoverUser.pfpBorderId
            ).pfpBorderClass;
            const popoverRank = getUserRank(
              activePopoverUser.username,
              isSelectedUserMe ? currentUser?.email : activePopoverUser.email,
              isSelectedUserMe ? userProfile.rank : activePopoverUser.rank
            );
            const canMainDevActOnTarget = Boolean(
              !isSelectedUserMe &&
              activePopoverUser.username.toLowerCase() !== 'system' &&
              currentUserRank?.id === 'main_developer' &&
              currentUserRank.priority > (popoverRank?.priority ?? 0)
            );

            return (
              <div
                ref={playerPopoverRef}
                style={{ top: `${popoverPos.top}px`, right: `${popoverPos.right}px` }}
                className="fixed w-64 bg-[#141419] border border-[#282834] rounded-2xl shadow-2xl overflow-hidden z-50 text-center animate-in fade-in zoom-in-95 duration-150 flex flex-col"
              >
                {/* Entire Top Bit covered by Banner */}
                <div className="relative w-full overflow-hidden flex flex-col items-center pt-5 pb-4 px-4 text-center shrink-0">
                  {/* Banner background covering this whole top section */}
                  {(isSelectedUserMe ? userProfile.bannerUrl : activePopoverUser.bannerUrl) ? (
                    <img
                      src={(isSelectedUserMe ? userProfile.bannerUrl : activePopoverUser.bannerUrl) || ''}
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
                      popoverPfpBorderClass || ''
                    }`}
                    style={
                      popoverPfpBorderClass
                        ? { borderWidth: `${(isSelectedUserMe ? userProfile.pfpBorderThickness : activePopoverUser.pfpBorderThickness) || 2}px` }
                        : undefined
                    }
                  >
                    {(isSelectedUserMe ? userProfile.avatarUrl : activePopoverUser.avatarUrl) ? (
                      <img
                        src={(isSelectedUserMe ? userProfile.avatarUrl : activePopoverUser.avatarUrl) || ''}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg viewBox="0 0 40 40" className="w-full h-full text-zinc-400 fill-current translate-y-1">
                        <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.667-16 8v3h32v-3c0-5.333-10.667-8-16-8z" />
                      </svg>
                    )}
                  </div>

                  {/* User Details over the banner */}
                  <div className="relative z-10 mt-2.5 flex flex-col items-center">
                    {popoverRank && (
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <img
                          src={popoverRank.icon}
                          alt={popoverRank.name}
                          className="w-4 h-4 object-contain shrink-0 select-none"
                        />
                        <span className="text-xs font-bold text-white drop-shadow-md">
                          {popoverRank.name}
                        </span>
                      </div>
                    )}
                    <h3 className="font-extrabold text-white text-base tracking-wide drop-shadow-md truncate flex items-center justify-center gap-1.5">
                      <span>{activePopoverUser.username}</span>
                    </h3>
                    <p className="text-xs text-zinc-300 font-medium mt-0.5 drop-shadow-sm truncate">
                      {(isSelectedUserMe ? userProfile.age : activePopoverUser.age) || '17'} years · {(isSelectedUserMe ? userProfile.gender : activePopoverUser.gender) || 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="p-3 pt-2.5 border-t border-[#23232c] bg-[#121216] space-y-1.5">
                  {/* 1. View profile button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerPopoverOpen(false);
                      if (!isSelectedUserMe) {
                        recordProfileVisitNotification(activePopoverUser.username);
                      }
                      setPublicProfileTab('info');
                      setProfileViewMode('view');
                      setProfileModalOpen(true);
                    }}
                    className="w-full bg-[#1e1e26] hover:bg-[#282834] text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    <User className="w-4 h-4 text-zinc-300" />
                    <span>View profile</span>
                  </button>

                  {/* Private message button (Screenshot 2) */}
                  {!isSelectedUserMe && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerPopoverOpen(false);
                        handleOpenPmWithUser(activePopoverUser.username);
                      }}
                      className="w-full bg-[#1e1e26] hover:bg-[#282834] text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      <i className="fa fa-comments text-[#00b4d8] text-sm" aria-hidden="true" />
                      <span>Private</span>
                    </button>
                  )}

                  {/* Action button (Main Developer only when clicking a lower rank) */}
                  {canMainDevActOnTarget && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerPopoverOpen(false);
                        setActionModalOpen(true);
                      }}
                      className="w-full bg-[#1e1e26] hover:bg-[#282834] text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      <i className="fa fa-check error text-rose-500 text-sm" aria-hidden="true" />
                      <span>Action</span>
                    </button>
                  )}

                  {/* 2. Edit button (self only) */}
                  {isSelectedUserMe && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerPopoverOpen(false);
                        setSelectedUser(null);
                        setProfileViewMode('edit');
                        setProfileModalOpen(true);
                      }}
                      className="w-full hover:bg-[#1e1e26] text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
                    >
                      <SquarePen className="w-4 h-4 text-cyan-400" />
                      <span>Edit</span>
                    </button>
                  )}

                  {/* 3. Profile Music play/pause button if track exists */}
                  {popoverMusicTrack && (
                    <button
                      type="button"
                      onClick={() => handleToggleProfileMusic(popoverMusicTrack)}
                      className="w-full bg-[#181822] hover:bg-[#20202e] text-cyan-300 font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer border border-cyan-500/20"
                    >
                      {isThisTrackPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-cyan-400 shrink-0" />
                          <span className="truncate">Pause Music</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-cyan-400 shrink-0" />
                          <span className="truncate">Play Profile Music</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

        {/* ==================================================== */}
        {/* ACTION MODAL (Main Developer Moderation Menu)        */}
        {/* ==================================================== */}
        {actionModalOpen && liveSelectedUser && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActionModalOpen(false);
            }}
          >
            <div className="w-full max-w-[420px] bg-[#141414] border border-[#26262c] rounded-3xl p-5 sm:p-6 shadow-2xl relative text-white animate-in zoom-in-95 duration-150">
              {/* Close button */}
              <button
                type="button"
                onClick={() => setActionModalOpen(false)}
                aria-label="Close"
                className="absolute top-5 right-5 text-white hover:text-zinc-300 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Top User Header */}
              <div className="flex items-center gap-3 pr-8">
                <UserAvatar
                  avatarUrl={liveSelectedUser.avatarUrl}
                  className="w-12 h-12"
                  showOnline={false}
                  pfpBorderClass={getPfpBorder(liveSelectedUser.pfpBorderId).pfpBorderClass}
                  pfpBorderThickness={liveSelectedUser.pfpBorderThickness}
                />
                <h3 className="text-lg sm:text-xl font-black text-white tracking-wide truncate">
                  {liveSelectedUser.username}
                </h3>
              </div>

              {/* Action Category Tab (Only Action category, no Main category) */}
              <div className="mt-4 pb-3 border-b border-[#24242c] flex items-center">
                <span className="px-4 py-1.5 rounded-xl bg-[#222228] text-white text-xs sm:text-sm font-extrabold">
                  Action
                </span>
              </div>

              {/* Action Buttons (Change rank, Warn, Mute) */}
              <div className="mt-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionModalOpen(false);
                    setChangeRankModalOpen(true);
                  }}
                  className="w-full bg-[#1e1e22] hover:bg-[#26262c] rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer"
                >
                  <i className="fa fa-star text-white text-base w-5 text-center" aria-hidden="true" />
                  <span className="text-sm font-extrabold text-white">Change rank</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetName = liveSelectedUser.username;
                    setActionModalOpen(false);
                    if (targetName && targetName.toLowerCase() !== 'system') {
                      const targetKey = sanitizeDbKey(targetName);
                      update(ref(rtdb, `users/${targetKey}`), {
                        lastActionAt: Date.now()
                      }).catch(() => {});
                    }
                  }}
                  className="w-full bg-[#1e1e22] hover:bg-[#26262c] rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer"
                >
                  <i className="fa fa-exclamation-triangle warn text-amber-500 text-base w-5 text-center" aria-hidden="true" />
                  <span className="text-sm font-extrabold text-white">Warn</span>
                </button>

                {liveSelectedUser.mutedUntil && liveSelectedUser.mutedUntil > nowMs ? (
                  <button
                    type="button"
                    onClick={() => {
                      const targetName = liveSelectedUser.username;
                      const targetNotifId = liveSelectedUser.muteNotificationId;
                      setActionModalOpen(false);
                      handleUnmuteTargetUser(targetName, targetNotifId);
                    }}
                    className="w-full bg-[#1e1e22] hover:bg-[#26262c] rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer"
                  >
                    <i className="fa fa-microphone-slash error text-rose-500 text-base w-5 text-center" aria-hidden="true" />
                    <span className="text-sm font-extrabold text-white">Unmute</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActionModalOpen(false);
                      setMuteDurationId('5m');
                      setMuteDropdownOpen(false);
                      setMuteReason('');
                      setMuteModalOpen(true);
                    }}
                    className="w-full bg-[#1e1e22] hover:bg-[#26262c] rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer"
                  >
                    <i className="fa fa-microphone-slash error text-rose-500 text-base w-5 text-center" aria-hidden="true" />
                    <span className="text-sm font-extrabold text-white">Mute</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MUTE MODAL (Duration Dropdown + Optional Reason)     */}
        {/* ==================================================== */}
        {muteModalOpen && liveSelectedUser && (() => {
          const selectedDurationObj =
            MUTE_DURATIONS.find((d) => d.id === muteDurationId) || MUTE_DURATIONS[3];

          return (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setMuteDropdownOpen(false);
                  setMuteModalOpen(false);
                }
              }}
            >
              <div
                className="w-full max-w-[440px] bg-[#141414] border border-[#262626] rounded-[28px] p-6 shadow-2xl relative text-white animate-in zoom-in-95 duration-150"
                onClick={() => {
                  if (muteDropdownOpen) setMuteDropdownOpen(false);
                }}
              >
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => {
                    setMuteDropdownOpen(false);
                    setMuteModalOpen(false);
                  }}
                  aria-label="Close"
                  className="absolute top-5 right-5 text-white hover:text-zinc-300 p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Duration Section */}
                <div className="mb-4">
                  <label className="block text-base font-black text-white mb-2 text-left">
                    Duration
                  </label>

                  <div
                    className="relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setMuteDropdownOpen((prev) => !prev)}
                      className="w-full bg-[#141414] border border-[#242424] rounded-2xl px-4 py-3.5 text-white text-sm sm:text-base font-medium flex items-center justify-between cursor-pointer focus:outline-none"
                    >
                      <span>{selectedDurationObj.label}</span>
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    </button>

                    {muteDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-[#1b1b1b] border border-[#2a2a2a] rounded-xl shadow-2xl z-30 py-1">
                        {MUTE_DURATIONS.map((dur) => {
                          const isSelected = dur.id === muteDurationId;
                          return (
                            <button
                              key={dur.id}
                              type="button"
                              onClick={() => {
                                setMuteDurationId(dur.id);
                                setMuteDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm sm:text-base transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#2b2b2b] text-white font-semibold'
                                  : 'text-zinc-400 hover:bg-[#252525] hover:text-white'
                              }`}
                            >
                              {dur.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason (optional) Section */}
                <div className="mb-5">
                  <label className="block text-base font-black text-white mb-2 text-left">
                    Reason <span className="text-zinc-400 font-bold text-sm">(optional)</span>
                  </label>
                  <textarea
                    value={muteReason}
                    onChange={(e) => setMuteReason(e.target.value)}
                    className="w-full h-24 bg-[#141414] border border-[#242424] rounded-2xl p-3.5 text-white text-sm sm:text-base focus:outline-none focus:border-zinc-600 resize-none"
                  />
                </div>

                {/* Mute & Cancel Buttons */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleMuteTargetUser}
                    className="bg-[#d90000] hover:bg-[#b80000] text-white font-extrabold text-sm sm:text-base py-3 px-9 rounded-2xl transition-colors cursor-pointer"
                  >
                    Mute
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMuteDropdownOpen(false);
                      setMuteModalOpen(false);
                    }}
                    className="bg-[#2c2c2c] hover:bg-[#383838] text-white font-extrabold text-sm sm:text-base py-3 px-7 rounded-2xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================================================== */}
        {/* CHANGE RANK MODAL (Main Developer Rank Selector)     */}
        {/* ==================================================== */}
        {changeRankModalOpen && liveSelectedUser && (() => {
          const targetCurrentRank = getUserRank(
            liveSelectedUser.username,
            liveSelectedUser.email,
            liveSelectedUser.rank
          );
          const currentRankValue = targetCurrentRank?.id || 'none';
          const allowedRanks = ASSIGNABLE_RANKS.filter(
            (r) => r.priority < (currentUserRank?.priority ?? 0)
          );

          return (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={(e) => {
                if (e.target === e.currentTarget) setChangeRankModalOpen(false);
              }}
            >
              <div className="w-full max-w-[420px] bg-[#141414] border border-[#26262c] rounded-3xl p-6 shadow-2xl relative text-white animate-in zoom-in-95 duration-150">
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setChangeRankModalOpen(false)}
                  aria-label="Close"
                  className="absolute top-5 right-5 text-white hover:text-zinc-300 p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>

                <label className="block text-base font-black text-white mb-2.5 text-left">
                  User rank
                </label>

                <div className="relative">
                  <select
                    value={currentRankValue}
                    onChange={(e) => handleChangeTargetUserRank(liveSelectedUser.username, e.target.value)}
                    className="w-full bg-[#1b1b1f] border border-[#2a2a32] rounded-2xl px-4 py-3.5 pr-10 text-white text-sm sm:text-base font-medium focus:outline-none focus:border-zinc-500 appearance-none cursor-pointer"
                  >
                    {allowedRanks.map((r) => (
                      <option key={r.id} value={r.id} className="bg-[#1b1b1f] text-white">
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Hidden Audio Element for Profile Music (Supports self or any viewed user's track) */}
        {activeAudioTrack && (
          <audio
            ref={profileAudioRef}
            src={activeAudioTrack.url}
            onEnded={() => setIsProfileMusicPlaying(false)}
          />
        )}

        {/* ==================================================== */}
        {/* PROFILE MODAL (EDIT & VIEW MODES)                    */}
        {/* ==================================================== */}
        {profileModalOpen && (() => {
          const activeModalUser: UserProfileData = (liveSelectedUser && (!currentUser || liveSelectedUser.username.toLowerCase() !== currentUser.username.toLowerCase()))
            ? liveSelectedUser
            : (currentUser ? {
                username: currentUser.username,
                ...userProfile,
                isOnline: true
              } : {
                username: 'Guest',
                isOnline: true
              });
          const isViewingSelf = Boolean(
            currentUser &&
            activeModalUser.username.toLowerCase() === currentUser.username.toLowerCase()
          );
          const effectiveProfileViewMode = isViewingSelf ? profileViewMode : 'view';

          const bannerToShow = isViewingSelf
            ? userProfile.bannerUrl
            : activeModalUser.bannerUrl;
          const avatarToShow = isViewingSelf
            ? userProfile.avatarUrl
            : activeModalUser.avatarUrl;
          const pfpBorderIdToShow = isViewingSelf
            ? userProfile.pfpBorderId
            : activeModalUser.pfpBorderId;
          const pfpBorderThicknessToShow = isViewingSelf
            ? userProfile.pfpBorderThickness
            : (activeModalUser.pfpBorderThickness || 2);
          const profileBorderIdToShow = isViewingSelf
            ? userProfile.profileBorderId
            : activeModalUser.profileBorderId;
          const profileBorderThicknessToShow = isViewingSelf
            ? userProfile.profileBorderThickness
            : (activeModalUser.profileBorderThickness || 2);
          const usernameToShow = activeModalUser.username;
          const moodToShow = isViewingSelf
            ? userProfile.mood
            : activeModalUser.mood;
          const musicToShow = isViewingSelf
            ? userProfile.musicTrack
            : activeModalUser.musicTrack;
          const isModalTrackPlaying = Boolean(
            isProfileMusicPlaying &&
            musicToShow &&
            activeAudioTrack?.url === musicToShow.url
          );

          return (
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
                  effectiveProfileViewMode === 'view'
                    ? (getProfileBorder(profileBorderIdToShow).cardBorderClass || 'border border-[#252530]')
                    : 'border border-[#252530]'
                }`}
                style={
                  effectiveProfileViewMode === 'view' && profileBorderThicknessToShow
                    ? { borderWidth: `${profileBorderThicknessToShow}px` }
                    : undefined
                }
              >
                {/* BANNER AREA */}
                <div className="h-36 sm:h-40 w-full relative bg-gradient-to-r from-[#1c1c24] via-[#242430] to-[#1c1c24] shrink-0 overflow-hidden">
                  {bannerToShow ? (
                    <img
                      src={bannerToShow}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full opacity-40 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                  )}

                  {isUploadingBanner && isViewingSelf && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    </div>
                  )}

                  {/* TOP-LEFT LIKE BUTTON WITH COUNTER (Screenshot 1) */}
                  {(() => {
                    const targetLikesMap =
                      usernameToShow.toLowerCase() === 'system'
                        ? systemBotLikes
                        : isViewingSelf
                        ? (userProfile.likes || activeModalUser.likes || {})
                        : (activeModalUser.likes || {});
                    const totalLikesCount = Object.keys(targetLikesMap).length;
                    const myLikeKey = currentUser ? sanitizeDbKey(currentUser.username) : '';
                    const isLikedByMe = Boolean(myLikeKey && targetLikesMap[myLikeKey]);

                    return (
                      <div className="absolute top-3 left-3 z-20">
                        <button
                          type="button"
                          onClick={() => handleToggleProfileLike(usernameToShow)}
                          title={isLikedByMe ? 'Unlike profile' : 'Like profile'}
                          className="bg-[#ff1744] hover:bg-[#f0133d] active:scale-95 text-white font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                        >
                          <ThumbsUp
                            className={`w-4 h-4 ${isLikedByMe ? 'fill-white text-white' : 'text-white'}`}
                          />
                          <span>{totalLikesCount}</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* BANNER CONTROLS (Top Right) */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                    {/* In Edit mode: Pill with X and Camera for banner */}
                    {isViewingSelf && effectiveProfileViewMode === 'edit' && (
                      <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-3 border border-white/10 shadow-lg">
                        <button
                          type="button"
                          onClick={handleRemoveBanner}
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

                    {/* Mode switcher: Eye (view) or SquarePen (edit) - Only for own profile */}
                    {isViewingSelf && (
                      effectiveProfileViewMode === 'edit' ? (
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
                      )
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
                      getPfpBorder(pfpBorderIdToShow).pfpBorderClass || ''
                    }`}
                    style={
                      getPfpBorder(pfpBorderIdToShow).pfpBorderClass
                        ? { borderWidth: `${pfpBorderThicknessToShow || 2}px` }
                        : undefined
                    }
                  >
                    {avatarToShow ? (
                      <img
                        src={avatarToShow}
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

                    {isUploadingAvatar && isViewingSelf && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                      </div>
                    )}

                    {/* Edit mode: controls inside PFP (Delete X and Upload Camera) */}
                    {isViewingSelf && effectiveProfileViewMode === 'edit' && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-xs py-1.5 px-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
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
                    {effectiveProfileViewMode === 'view' && (
                      <span
                        className={`absolute bottom-1 right-1 w-4 h-4 border-2 border-[#1f1f26] rounded-full shadow-md ${
                          activeModalUser.isOnline !== false ? 'bg-[#70c91f]' : 'bg-zinc-500'
                        }`}
                      />
                    )}
                  </div>

                  {/* Username, Rank (pure text + icon above username), & Mood */}
                  <div className="flex-1 min-w-0 pb-1">
                    {(() => {
                      const modalRank = getUserRank(
                        usernameToShow,
                        isViewingSelf ? currentUser?.email : activeModalUser.email,
                        isViewingSelf ? userProfile.rank : activeModalUser.rank
                      );
                      return modalRank ? (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <img
                            src={modalRank.icon}
                            alt={modalRank.name}
                            className="w-4 h-4 object-contain shrink-0 select-none"
                          />
                          <span className="text-xs sm:text-sm font-bold text-white leading-tight">
                            {modalRank.name}
                          </span>
                        </div>
                      ) : null;
                    })()}
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate leading-tight">
                        {usernameToShow}
                      </h2>
                    </div>
                    {moodToShow && (
                      <p className="text-xs text-cyan-400 font-medium truncate mt-0.5">
                        {moodToShow}
                      </p>
                    )}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* MODE 1: EDIT PROFILE (Screenshot 5: Account & Customisation tabs) */}
                {/* ========================================================= */}
                {isViewingSelf && effectiveProfileViewMode === 'edit' && (
                  <div className="p-4 sm:p-5 pt-3 overflow-y-auto flex-1 flex flex-col">
                    {/* Top Tabs (Screenshot 5: Account, Customisation) */}
                    <div className="flex items-center gap-2 border-b border-[#23232c] pb-3 mb-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditOptionsTab('account')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                          editOptionsTab === 'account'
                            ? 'bg-[#252530] text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditOptionsTab('customisation')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                          editOptionsTab === 'customisation'
                            ? 'bg-[#252530] text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Customisation
                      </button>
                    </div>

                    {/* TAB 1: ACCOUNT (Screenshot 5) */}
                    {editOptionsTab === 'account' && (
                      <div className="space-y-1">
                        {/* 1. Edit info */}
                        <button
                          type="button"
                          onClick={() => openEditSubModal('info')}
                          className="w-full flex items-center gap-3.5 px-3 py-3 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left border-b border-[#1f1f28] group rounded-xl"
                        >
                          <CreditCard className="w-5 h-5 text-zinc-300 group-hover:text-cyan-400 transition-colors shrink-0" />
                          <span className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-200 transition-colors">
                            Edit info
                          </span>
                        </button>

                        {/* 2. Edit about me */}
                        <button
                          type="button"
                          onClick={() => openEditSubModal('bio')}
                          className="w-full flex items-center gap-3.5 px-3 py-3 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left border-b border-[#1f1f28] group rounded-xl"
                        >
                          <HelpCircle className="w-5 h-5 text-zinc-300 group-hover:text-cyan-400 transition-colors shrink-0" />
                          <span className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-200 transition-colors">
                            Edit about me
                          </span>
                        </button>

                        {/* 3. Edit username */}
                        <button
                          type="button"
                          onClick={() => openEditSubModal('username')}
                          className="w-full flex items-center gap-3.5 px-3 py-3 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left border-b border-[#1f1f28] group rounded-xl"
                        >
                          <SquarePen className="w-5 h-5 text-zinc-300 group-hover:text-cyan-400 transition-colors shrink-0" />
                          <span className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-200 transition-colors">
                            Edit username
                          </span>
                        </button>

                        {/* 4. Edit mood */}
                        <button
                          type="button"
                          onClick={() => openEditSubModal('mood')}
                          className="w-full flex items-center gap-3.5 px-3 py-3 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left border-b border-[#1f1f28] group rounded-xl"
                        >
                          <Heart className="w-5 h-5 text-zinc-300 group-hover:text-cyan-400 transition-colors shrink-0" />
                          <span className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-200 transition-colors">
                            Edit mood
                          </span>
                        </button>
                      </div>
                    )}

                    {/* TAB 2: CUSTOMISATION (Screenshot 5) */}
                    {editOptionsTab === 'customisation' && (
                      <div className="space-y-1">
                        {/* 1. Profile Music (Screenshot 4) */}
                        <button
                          type="button"
                          onClick={() => openEditSubModal('music')}
                          className="w-full flex items-center justify-between px-3 py-3 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left border-b border-[#1f1f28] group rounded-xl"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Music className="w-5 h-5 text-zinc-300 group-hover:text-cyan-400 transition-colors shrink-0" />
                            <span className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-200 transition-colors truncate">
                              Profile Music
                            </span>
                          </div>
                          {userProfile.musicTrack ? (
                            <span className="text-xs text-cyan-400 font-bold max-w-[130px] truncate ml-2">
                              {userProfile.musicTrack.name}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500 font-medium ml-2">None</span>
                          )}
                        </button>

                        {/* 2. Profile Border (Screenshot 3) */}
                        <button
                          type="button"
                          onClick={() => openEditSubModal('profileBorder')}
                          className="w-full flex items-center justify-between px-3 py-3 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left border-b border-[#1f1f28] group rounded-xl"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Layers className="w-5 h-5 text-zinc-300 group-hover:text-cyan-400 transition-colors shrink-0" />
                            <span className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-200 transition-colors truncate">
                              Profile Border
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400 font-medium truncate max-w-[130px] ml-2">
                            {getProfileBorder(userProfile.profileBorderId).name.replace(/^\d+\.\s*/, '')}
                          </span>
                        </button>

                        {/* 3. Profile Picture Border (Screenshot 3 layout) */}
                        <button
                          type="button"
                          onClick={() => openEditSubModal('pfpBorder')}
                          className="w-full flex items-center justify-between px-3 py-3 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left border-b border-[#1f1f28] group rounded-xl"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <CircleDot className="w-5 h-5 text-zinc-300 group-hover:text-cyan-400 transition-colors shrink-0" />
                            <span className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-200 transition-colors truncate">
                              Profile Picture Border
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400 font-medium truncate max-w-[130px] ml-2">
                            {getPfpBorder(userProfile.pfpBorderId).name.replace(/^\d+\.\s*/, '')}
                          </span>
                        </button>

                        {/* 4. Userlist background glow (Screenshot 1 & 2) */}
                        <button
                          type="button"
                          onClick={() => openEditSubModal('glow')}
                          className="w-full flex items-center justify-between px-3 py-3 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left border-b border-[#1f1f28] group rounded-xl"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Sparkles className="w-5 h-5 text-zinc-300 group-hover:text-cyan-400 transition-colors shrink-0" />
                            <span className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-200 transition-colors truncate">
                              Userlist background glow
                            </span>
                          </div>
                          {userProfile.glowColor ? (
                            <span
                              className="w-4 h-4 rounded-full border border-white/60 shadow-sm shrink-0 ml-2"
                              style={{
                                backgroundColor: userProfile.glowColor,
                                boxShadow: `0 0 8px ${userProfile.glowColor}`
                              }}
                            />
                          ) : (
                            <span className="text-xs text-zinc-500 font-medium ml-2">None</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* MODE 2: PUBLIC VIEW (How everyone else sees your profile) */}
                {/* For System bot: only Info tab with Age (999) & Gender (Bot) */}
                {/* ========================================================= */}
                {effectiveProfileViewMode === 'view' && (() => {
                  const isSystemProfile = usernameToShow.toLowerCase() === 'system';
                  const activeTab = isSystemProfile ? 'info' : publicProfileTab;

                  return (
                    <div className="p-5 pt-2 overflow-y-auto flex-1 flex flex-col">
                      {/* Tabs: Info (and About me for non-System users) */}
                      <div className="flex items-center gap-2 border-b border-[#22222a] pb-3 mb-4">
                        <button
                          type="button"
                          onClick={() => setPublicProfileTab('info')}
                          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                            activeTab === 'info'
                              ? 'bg-[#252532] text-white shadow-sm'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          Info
                        </button>
                        {!isSystemProfile && (
                          <button
                            type="button"
                            onClick={() => setPublicProfileTab('aboutme')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                              activeTab === 'aboutme'
                                ? 'bg-[#252532] text-white shadow-sm'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            About me
                          </button>
                        )}
                      </div>

                      {/* Tab 1: Info */}
                      {activeTab === 'info' && (
                        isSystemProfile ? (
                          <div className="space-y-2.5">
                            {/* Age (999 years old) */}
                            <div className="bg-[#181820] border border-[#242430] rounded-xl px-4 py-3 flex items-center justify-between">
                              <span className="text-zinc-300 text-sm font-bold">Age</span>
                              <span className="text-sm font-bold text-white">999 years old</span>
                            </div>

                            {/* Gender (Bot) */}
                            <div className="bg-[#181820] border border-[#242430] rounded-xl px-4 py-3 flex items-center justify-between">
                              <span className="text-zinc-300 text-sm font-bold">Gender</span>
                              <span className="text-sm font-bold text-white">Bot</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {/* Country */}
                            <div className="bg-[#181820] border border-[#242430] rounded-xl px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-2.5 text-zinc-300 text-sm font-semibold">
                                <Globe className="w-4 h-4 text-zinc-400" />
                                <span>Country</span>
                              </div>
                              <span className="text-sm font-bold text-white">
                                {(isViewingSelf ? userProfile.country : activeModalUser.country) || 'Global'}
                              </span>
                            </div>

                            {/* Gender */}
                            <div className="bg-[#181820] border border-[#242430] rounded-xl px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-2.5 text-zinc-300 text-sm font-semibold">
                                <span className="text-base text-zinc-400">⚥</span>
                                <span>Gender</span>
                              </div>
                              <span className="text-sm font-bold text-white">
                                {(isViewingSelf ? userProfile.gender : activeModalUser.gender) || 'Unknown'}
                              </span>
                            </div>

                            {/* Language */}
                            <div className="bg-[#181820] border border-[#242430] rounded-xl px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-2.5 text-zinc-300 text-sm font-semibold">
                                <Languages className="w-4 h-4 text-zinc-400" />
                                <span>Language</span>
                              </div>
                              <span className="text-sm font-bold text-white">
                                {(isViewingSelf ? userProfile.language : activeModalUser.language) || 'English'}
                              </span>
                            </div>

                            {/* Age */}
                            <div className="bg-[#181820] border border-[#242430] rounded-xl px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-2.5 text-zinc-300 text-sm font-semibold">
                                <Calendar className="w-4 h-4 text-zinc-400" />
                                <span>Age</span>
                              </div>
                              <span className="text-sm font-bold text-white">
                                {(isViewingSelf ? userProfile.age : activeModalUser.age) || '18'} years old
                              </span>
                            </div>

                            {/* Relationship */}
                            <div className="bg-[#181820] border border-[#242430] rounded-xl px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-2.5 text-zinc-300 text-sm font-semibold">
                                <Heart className="w-4 h-4 text-zinc-400" />
                                <span>Relationship</span>
                              </div>
                              <span className="text-sm font-bold text-white">
                                {(isViewingSelf ? userProfile.relationship : activeModalUser.relationship) || 'Rather not say'}
                              </span>
                            </div>

                            {/* Profile Music widget in Info tab if track exists */}
                            {musicToShow && (
                              <div className="bg-[#181820] border border-[#282838] rounded-xl px-4 py-3 flex items-center justify-between shadow-md">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Music className="w-4 h-4 text-cyan-400 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-white truncate block">
                                      {musicToShow.name}
                                    </span>
                                    <span className="text-[10px] text-zinc-400">Profile Music</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleProfileMusic(musicToShow)}
                                  className="w-8 h-8 rounded-lg bg-[#00c2ff] hover:bg-[#00aee6] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-sm ml-2"
                                >
                                  {isModalTrackPlaying ? (
                                    <Pause className="w-4 h-4 fill-white" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-white translate-x-0.5" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      )}

                      {/* Tab 2: About me (Pure text, NO BOX, scrollable for long bios) */}
                      {!isSystemProfile && activeTab === 'aboutme' && (
                        <div className="w-full max-h-[340px] overflow-y-auto px-1 py-1 pr-2">
                          {((isViewingSelf ? userProfile.bio : activeModalUser.bio)) ? (
                            <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words leading-relaxed select-text font-normal">
                              {isViewingSelf ? userProfile.bio : activeModalUser.bio}
                            </p>
                          ) : (
                            <p className="text-sm text-zinc-500 italic">
                              No about me info provided yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* SUB-MODALS FOR EDIT ACTIONS (Overlapping IN FRONT of Edit Profile) */}
        {/* ========================================================= */}
        {profileModalOpen && activeEditSubModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[65] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto select-none"
          >
            {/* Click backdrop to close */}
            <div className="fixed inset-0" onClick={() => setActiveEditSubModal(null)} />

            {/* 1. Edit info sub-modal */}
            {activeEditSubModal === 'info' && (
              <div className="w-full max-w-[390px] bg-[#141418] border border-[#272736] rounded-3xl p-5 sm:p-6 shadow-2xl relative z-10 text-white animate-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Edit Info</h3>
                    <p className="text-xs text-zinc-400">Update your account details</p>
                  </div>
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
                    <label className="block text-xs font-bold text-white mb-1">
                      Age
                    </label>
                    <select
                      value={tempAge}
                      onChange={(e) => setTempAge(e.target.value)}
                      className="w-full bg-[#1c1c24] border border-[#2d2d38] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
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
                    <label className="block text-xs font-bold text-white mb-1">
                      Gender
                    </label>
                    <select
                      value={tempGender}
                      onChange={(e) => setTempGender(e.target.value)}
                      className="w-full bg-[#1c1c24] border border-[#2d2d38] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1">
                      Relationship
                    </label>
                    <select
                      value={tempRelationship}
                      onChange={(e) => setTempRelationship(e.target.value)}
                      className="w-full bg-[#1c1c24] border border-[#2d2d38] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="Rather not say">Rather not say</option>
                      <option value="Single">Single</option>
                      <option value="Taken">Taken</option>
                      <option value="In a relationship">In a relationship</option>
                      <option value="Married">Married</option>
                    </select>
                  </div>

                  {/* Country (with Auto-detect) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-white">
                        Country
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          const det = await detectUserCountry();
                          setTempCountry(det.country);
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Auto-detect</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={tempCountry}
                      onChange={(e) => setTempCountry(e.target.value)}
                      placeholder="Country"
                      className="w-full bg-[#1c1c24] border border-[#2d2d38] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1">
                      Language
                    </label>
                    <input
                      type="text"
                      value={tempLanguage}
                      onChange={(e) => setTempLanguage(e.target.value)}
                      placeholder="Language"
                      className="w-full bg-[#1c1c24] border border-[#2d2d38] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updates: Partial<UserProfileState> = {
                          age: tempAge,
                          gender: tempGender,
                          relationship: tempRelationship,
                          country: tempCountry.trim() || 'United Kingdom',
                          language: tempLanguage.trim() || 'English'
                        };
                        setUserProfile((p) => ({ ...p, ...updates }));
                        if (currentUser) {
                          setCurrentUser({ ...currentUser, gender: tempGender });
                        }
                        saveProfileToRtdb(updates);
                        setActiveEditSubModal(null);
                      }}
                      className="w-full bg-[#00c2ff] hover:bg-[#00aee6] text-white font-extrabold py-2.5 rounded-xl text-sm transition-colors cursor-pointer shadow-md shadow-cyan-500/25"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Edit about me (bio) sub-modal */}
            {activeEditSubModal === 'bio' && (
              <div className="w-full max-w-[480px] bg-[#141418] border border-[#272736] rounded-3xl p-5 sm:p-6 shadow-2xl relative z-10 text-white animate-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Edit About Me</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Write whatever you want — long bios can be scrolled!</p>
                  </div>
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
                    rows={9}
                    value={tempBio}
                    onChange={(e) => setTempBio(e.target.value)}
                    placeholder="Tell everyone about yourself... No length limit, bios can be as big as you want!"
                    className="w-full bg-[#1b1b22] border border-[#2d2d38] rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 resize-y max-h-[340px]"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-medium">
                      {tempBio.length} characters
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUserProfile((p) => ({ ...p, bio: tempBio }));
                        saveProfileToRtdb({ bio: tempBio });
                        setActiveEditSubModal(null);
                      }}
                      className="bg-[#00c2ff] hover:bg-[#00aee6] text-white font-extrabold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shadow-md shadow-cyan-500/25"
                    >
                      Save Bio
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Edit username sub-modal */}
            {activeEditSubModal === 'username' && (
              <div className="w-full max-w-[380px] bg-[#141418] border border-[#272736] rounded-3xl p-5 sm:p-6 shadow-2xl relative z-10 text-white animate-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-white">Edit Username</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setUsernameEditError(null);
                      setActiveEditSubModal(null);
                    }}
                    className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {usernameEditError && (
                  <div className="mb-3.5 bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs px-3 py-2 rounded-lg flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{usernameEditError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <input
                    type="text"
                    value={tempUsername}
                    onChange={(e) => {
                      setTempUsername(e.target.value);
                      if (usernameEditError) setUsernameEditError(null);
                    }}
                    placeholder="Username"
                    className="w-full bg-[#1c1c24] border border-[#2d2d38] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />

                  <div>
                    <button
                      type="button"
                      disabled={usernameEditLoading}
                      onClick={async () => {
                        const newName = tempUsername.trim();
                        if (!newName || !currentUser) return;
                        if (newName === currentUser.username) {
                          setActiveEditSubModal(null);
                          return;
                        }
                        const uVal = isValidUsername(newName);
                        if (!uVal.valid) {
                          setUsernameEditError(uVal.message || 'Invalid username.');
                          return;
                        }
                        if (
                          newName.toLowerCase() === 'null' &&
                          currentUser.email?.toLowerCase() !== 'null@gmail.com'
                        ) {
                          setUsernameEditError('The username Null is reserved.');
                          return;
                        }
                        if (newName.toLowerCase() === 'system') {
                          setUsernameEditError('The username System is reserved.');
                          return;
                        }

                        const oldName = currentUser.username;
                        const oldKey = sanitizeDbKey(oldName);
                        const newKey = sanitizeDbKey(newName);

                        setUsernameEditLoading(true);
                        setUsernameEditError(null);
                        isRenamingRef.current = true;

                        try {
                          const usersSnap = await get(ref(rtdb, 'users'));
                          if (usersSnap.exists()) {
                            const data = usersSnap.val();
                            for (const k of Object.keys(data)) {
                              if (k === oldKey) continue;
                              if (
                                k === newKey ||
                                (data[k]?.username && data[k].username.toLowerCase() === newName.toLowerCase())
                              ) {
                                setUsernameEditError('That username is already taken by someone else.');
                                setUsernameEditLoading(false);
                                isRenamingRef.current = false;
                                return;
                              }
                            }
                          }

                          if (oldKey === newKey) {
                            // Casing-only change (e.g. "alex" -> "Alex")
                            await update(ref(rtdb, `users/${oldKey}`), {
                              username: newName,
                              usernameLower: newName.toLowerCase(),
                              updatedAt: serverTimestamp()
                            });
                          } else {
                            // Key change: cancel old onDisconnect, copy full user node to newKey, then remove oldKey
                            try {
                              await onDisconnect(ref(rtdb, `users/${oldKey}/isOnline`)).cancel();
                              await onDisconnect(ref(rtdb, `users/${oldKey}/lastSeen`)).cancel();
                            } catch (_) {}

                            const oldSnap = await get(ref(rtdb, `users/${oldKey}`));
                            const oldData = oldSnap.exists() ? oldSnap.val() : {};

                            await set(ref(rtdb, `users/${newKey}`), {
                              ...oldData,
                              ...userProfile,
                              avatarUrl: sanitizeMediaUrl(userProfile.avatarUrl),
                              bannerUrl: sanitizeMediaUrl(userProfile.bannerUrl),
                              username: newName,
                              usernameLower: newName.toLowerCase(),
                              isOnline: true,
                              lastSeen: serverTimestamp(),
                              updatedAt: serverTimestamp()
                            });
                            await remove(ref(rtdb, `users/${oldKey}`));
                          }

                          // Also update sender name on all messages sent by this user in Realtime Database
                          try {
                            const msgsRef = ref(rtdb, 'messages');
                            const msgsSnap = await get(msgsRef);
                            if (msgsSnap.exists()) {
                              const allMsgs = msgsSnap.val();
                              const msgUpdates: Record<string, any> = {};
                              for (const [mKey, mVal] of Object.entries(allMsgs)) {
                                const m = mVal as any;
                                if (
                                  (m?.sender && m.sender.toLowerCase() === oldName.toLowerCase()) ||
                                  m?.senderKey === oldKey
                                ) {
                                  msgUpdates[`${mKey}/sender`] = newName;
                                  msgUpdates[`${mKey}/senderKey`] = newKey;
                                }
                              }
                              if (Object.keys(msgUpdates).length > 0) {
                                await update(msgsRef, msgUpdates);
                              }
                            }
                          } catch (msgUpdateErr) {
                            console.warn('Notice updating message sender names:', msgUpdateErr);
                          }

                          const updated = { ...currentUser, username: newName };
                          setCurrentUser(updated);
                          localStorage.setItem('chat_community_user', JSON.stringify(updated));
                          setActiveEditSubModal(null);
                        } catch (err: any) {
                          setUsernameEditError(err.message || 'Failed to update username.');
                        } finally {
                          setUsernameEditLoading(false);
                          setTimeout(() => {
                            isRenamingRef.current = false;
                          }, 400);
                        }
                      }}
                      className="w-full bg-[#00c2ff] hover:bg-[#00aee6] text-white font-extrabold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-cyan-500/25 disabled:opacity-50"
                    >
                      {usernameEditLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating username...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Username</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Edit mood sub-modal */}
            {activeEditSubModal === 'mood' && (
              <div className="w-full max-w-[380px] bg-[#141418] border border-[#272736] rounded-3xl p-5 sm:p-6 shadow-2xl relative z-10 text-white animate-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-white">Edit Mood</h3>
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
                    className="w-full bg-[#1c1c24] border border-[#2d2d38] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        const cleanMood = tempMood.trim();
                        setUserProfile((p) => ({ ...p, mood: cleanMood }));
                        saveProfileToRtdb({ mood: cleanMood });
                        setActiveEditSubModal(null);
                      }}
                      className="w-full bg-[#00c2ff] hover:bg-[#00aee6] text-white font-extrabold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-cyan-500/25"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Mood</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. User glow sub-modal */}
            {activeEditSubModal === 'glow' && (
              <GlowModal
                initialColor={userProfile.glowColor}
                initialThickness={userProfile.glowThickness || 18}
                username={currentUser.username}
                avatarUrl={userProfile.avatarUrl}
                pfpBorderClass={getPfpBorder(userProfile.pfpBorderId).pfpBorderClass}
                pfpBorderThickness={userProfile.pfpBorderThickness || 2}
                onSave={(color, thick) => {
                  const updates: Partial<UserProfileState> = { glowColor: color, glowThickness: thick };
                  setUserProfile((p) => ({ ...p, ...updates }));
                  saveProfileToRtdb(updates);
                  setActiveEditSubModal(null);
                }}
                onClose={() => setActiveEditSubModal(null)}
              />
            )}

            {/* 6. Profile borders sub-modal */}
            {activeEditSubModal === 'profileBorder' && (
              <BorderModal
                type="profileBorder"
                borders={PROFILE_BORDERS}
                currentIndex={tempProfileBorderIndex}
                initialThickness={userProfile.profileBorderThickness || 2}
                username={currentUser.username}
                avatarUrl={userProfile.avatarUrl}
                gender={userProfile.gender}
                country={userProfile.country}
                language={userProfile.language}
                bio={userProfile.bio}
                onSave={(idx, thick) => {
                  const updates: Partial<UserProfileState> = {
                    profileBorderId: PROFILE_BORDERS[idx].id,
                    profileBorderThickness: thick
                  };
                  setUserProfile((p) => ({ ...p, ...updates }));
                  saveProfileToRtdb(updates);
                  setActiveEditSubModal(null);
                }}
                onClose={() => setActiveEditSubModal(null)}
              />
            )}

            {/* 7. Profile picture borders sub-modal */}
            {activeEditSubModal === 'pfpBorder' && (
              <BorderModal
                type="pfpBorder"
                borders={PFP_BORDERS}
                currentIndex={tempPfpBorderIndex}
                initialThickness={userProfile.pfpBorderThickness || 2}
                username={currentUser.username}
                avatarUrl={userProfile.avatarUrl}
                gender={userProfile.gender}
                country={userProfile.country}
                language={userProfile.language}
                bio={userProfile.bio}
                onSave={(idx, thick) => {
                  const updates: Partial<UserProfileState> = {
                    pfpBorderId: PFP_BORDERS[idx].id,
                    pfpBorderThickness: thick
                  };
                  setUserProfile((p) => ({ ...p, ...updates }));
                  saveProfileToRtdb(updates);
                  setActiveEditSubModal(null);
                }}
                onClose={() => setActiveEditSubModal(null)}
              />
            )}

            {/* 8. Profile music / Music player sub-modal */}
            {activeEditSubModal === 'music' && (
              <MusicPlayerModal
                currentTrack={userProfile.musicTrack}
                onSaveTrack={(track) => {
                  setUserProfile((p) => ({ ...p, musicTrack: track }));
                  saveProfileToRtdb({ musicTrack: track });
                  if (!track) {
                    setActiveAudioTrack(null);
                    setIsProfileMusicPlaying(false);
                  } else {
                    setActiveAudioTrack(track);
                  }
                }}
                onClose={() => setActiveEditSubModal(null)}
              />
            )}
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
                          Chat in real-time with everyone in the room.
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

        {/* DELETE ACCOUNT CONFIRMATION MODAL */}
        {showDeleteAccountModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-[4px] flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeletingAccount) {
                setShowDeleteAccountModal(false);
              }
            }}
          >
            <div className="w-full max-w-[420px] bg-[#141418] border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-white animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-center text-white mb-2">
                Permanently Delete Account?
              </h3>

              <p className="text-xs sm:text-sm text-zinc-300 text-center leading-relaxed mb-6 font-normal">
                This will permanently delete your account, your profile, your avatar, banner, and <span className="text-rose-400 font-semibold">all messages you sent in the chat</span>. You will be logged out immediately. This action cannot be undone.
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={async () => {
                    if (!currentUser) return;
                    setIsDeletingAccount(true);
                    await handlePermanentAccountDeletion(currentUser.username, userProfile);
                  }}
                  className="w-full py-3 rounded-xl font-extrabold text-sm bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 disabled:opacity-50"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting account and messages...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete Everything</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#1c1c24] hover:bg-[#252530] text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STAFF CATEGORIES MODAL (Centered)                    */}
        {/* ==================================================== */}
        {staffModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setStaffModalOpen(false);
              }
            }}
          >
            <div className="w-full max-w-[440px] max-h-[85vh] bg-[#141418] border border-[#262630] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-[#23232d] flex items-center justify-between bg-[#17171d]">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-[#00add8]" />
                  <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                    Staff Team
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  aria-label="Close staff modal"
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                {Object.values(RANKS)
                  .filter((rankDef) => rankDef.id !== 'ghost')
                  .sort((a, b) => b.priority - a.priority)
                  .map((rankDef) => {
                    const rankKey = rankDef.id;
                    const staffMembers = allUsersList.filter((u) => {
                      const isMe =
                        currentUser && u.username.toLowerCase() === currentUser.username.toLowerCase();
                      const r = getUserRank(
                        u.username,
                        isMe ? currentUser?.email : u.email,
                        isMe ? userProfile.rank : u.rank
                      );
                      return r?.id === rankKey;
                    });
                    const isExpanded = expandedStaffCategory === rankKey;

                    return (
                      <div
                        key={rankKey}
                        className="bg-[#191920] border border-[#262632] rounded-2xl overflow-hidden transition-all"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedStaffCategory((prev) => (prev === rankKey ? null : rankKey))
                          }
                          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={rankDef.icon}
                              alt={rankDef.name}
                              className="w-5 h-5 object-contain shrink-0"
                            />
                            <span className="font-extrabold text-sm sm:text-base text-white">
                              {rankDef.name}
                            </span>
                            <span className="text-xs font-bold bg-[#252530] text-zinc-300 px-2 py-0.5 rounded-full">
                              {staffMembers.length}
                            </span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-zinc-400 transition-transform duration-150 ${
                              isExpanded ? 'rotate-180 text-white' : ''
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="border-t border-[#252532] bg-[#131318] divide-y divide-[#1f1f29]">
                            {staffMembers.length === 0 ? (
                              <div className="px-4 py-4 text-center text-xs text-zinc-500 font-medium">
                                No users currently hold the {rankDef.name} rank.
                              </div>
                            ) : (
                              staffMembers.map((member) => (
                                <div
                                  key={member.username}
                                  onClick={() => {
                                    setStaffModalOpen(false);
                                    setSelectedUser(member);
                                    if (
                                      member.username.toLowerCase() !==
                                      currentUser.username.toLowerCase()
                                    ) {
                                      recordProfileVisitNotification(member.username);
                                    }
                                    setPublicProfileTab('info');
                                    setProfileViewMode('view');
                                    setProfileModalOpen(true);
                                  }}
                                  className="px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <UserAvatar
                                      avatarUrl={member.avatarUrl}
                                      className="w-9 h-9"
                                      showOnline={true}
                                      isOnline={member.isOnline === true}
                                      pfpBorderClass={getPfpBorder(member.pfpBorderId).pfpBorderClass}
                                      pfpBorderThickness={member.pfpBorderThickness}
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-black text-white truncate">
                                        {member.username}
                                      </p>
                                      {member.mood && (
                                        <p className="text-xs text-zinc-400 truncate">{member.mood}</p>
                                      )}
                                    </div>
                                  </div>
                                  <img
                                    src={rankDef.icon}
                                    alt={rankDef.name}
                                    className="w-4 h-4 object-contain shrink-0"
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* RULES MODAL (User Rules & Staff Rules in the middle) */}
        {/* ==================================================== */}
        {rulesModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setRulesModalOpen(false);
              }
            }}
          >
            <div className="w-full max-w-[460px] max-h-[85vh] bg-[#141418] border border-[#262630] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-[#23232d] flex items-center justify-between bg-[#17171d]">
                <div className="flex items-center gap-2.5">
                  <Scale className="w-5 h-5 text-[#00add8]" />
                  <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                    Community Rules
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRulesModalOpen(false)}
                  aria-label="Close rules modal"
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs: User Rules & Staff Rules */}
              <div className="px-5 pt-3.5 flex items-center gap-2 border-b border-[#23232d] pb-3 bg-[#15151a]">
                <button
                  type="button"
                  onClick={() => setActiveRulesTab('user')}
                  className={`flex-1 py-2 rounded-xl font-extrabold text-xs sm:text-sm transition-colors cursor-pointer ${
                    activeRulesTab === 'user'
                      ? 'bg-[#00add8] text-white shadow-md'
                      : 'bg-[#1e1e26] text-zinc-400 hover:text-white'
                  }`}
                >
                  User Rules
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRulesTab('staff')}
                  className={`flex-1 py-2 rounded-xl font-extrabold text-xs sm:text-sm transition-colors cursor-pointer ${
                    activeRulesTab === 'staff'
                      ? 'bg-[#00add8] text-white shadow-md'
                      : 'bg-[#1e1e26] text-zinc-400 hover:text-white'
                  }`}
                >
                  Staff Rules
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 text-xs sm:text-sm text-zinc-200 flex-1">
                {activeRulesTab === 'user' ? (
                  <div className="space-y-2.5">
                    <div className="bg-[#191921] border border-[#262632] rounded-2xl p-3.5">
                      <p className="font-black text-white mb-1">1. Respect All Members</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Treat everyone with respect. Harassment, bullying, hate speech, or discrimination will result in an immediate mute or ban.
                      </p>
                    </div>
                    <div className="bg-[#191921] border border-[#262632] rounded-2xl p-3.5">
                      <p className="font-black text-white mb-1">2. No Spamming or Flooding</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Avoid sending repeated messages, excessive caps, or flooding the chat room.
                      </p>
                    </div>
                    <div className="bg-[#191921] border border-[#262632] rounded-2xl p-3.5">
                      <p className="font-black text-white mb-1">3. Keep Content Appropriate</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Do not share NSFW, explicit, or illegal content in profiles, banners, avatars, or chat messages.
                      </p>
                    </div>
                    <div className="bg-[#191921] border border-[#262632] rounded-2xl p-3.5">
                      <p className="font-black text-white mb-1">4. Privacy & Safety</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Never share private personal information (doxxing, passwords, addresses, or phone numbers) of yourself or others.
                      </p>
                    </div>
                    <div className="bg-[#191921] border border-[#262632] rounded-2xl p-3.5">
                      <p className="font-black text-white mb-1">5. No Advertising</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        External advertising, self-promotion links, or scam links are not permitted in the chat.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="bg-[#191921] border border-[#262632] rounded-2xl p-3.5">
                      <p className="font-black text-white mb-1">1. Fair & Unbiased Moderation</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Staff must enforce rules fairly and objectively for all users regardless of personal friendships.
                      </p>
                    </div>
                    <div className="bg-[#191921] border border-[#262632] rounded-2xl p-3.5">
                      <p className="font-black text-white mb-1">2. No Abuse of Staff Powers</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Muting, deleting messages, clearing chat, or managing ranks without a valid moderation reason will result in demotion.
                      </p>
                    </div>
                    <div className="bg-[#191921] border border-[#262632] rounded-2xl p-3.5">
                      <p className="font-black text-white mb-1">3. Lead by Example</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Staff members represent the community and must follow all User Rules while remaining helpful and professional.
                      </p>
                    </div>
                    <div className="bg-[#191921] border border-[#262632] rounded-2xl p-3.5">
                      <p className="font-black text-white mb-1">4. Confidentiality</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Keep internal staff discussions, reports, and moderation logs strictly confidential.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* FLOATING PRIVATE MESSAGE (PM) CHAT WINDOW (Screenshot 3) */}
        {/* ==================================================== */}
        {activePmPeer && (() => {
          const isSystemPeer = activePmPeer.toLowerCase() === 'system';
          const peerUserObj = allUsersList.find(
            (u) => u.username.toLowerCase() === activePmPeer.toLowerCase()
          );
          const peerDisplayName = peerUserObj?.username || activePmThread?.peerUsername || activePmPeer;
          const peerAvatar = isSystemPeer
            ? SYSTEM_BOT_AVATAR
            : (peerUserObj?.avatarUrl ?? activePmThread?.peerAvatarUrl ?? null);
          const peerBorderId = peerUserObj?.pfpBorderId || 'pfp-default';
          const peerBorderThickness = peerUserObj?.pfpBorderThickness || 2;
          const pmMessagesList = activePmThread?.messages || [];

          return (
            <div
              className={`fixed z-50 bg-[#121215] border border-[#25252e] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-150 ${
                pmWindowExpanded
                  ? 'inset-3 sm:inset-auto sm:bottom-12 sm:right-4 sm:w-[580px] sm:h-[620px]'
                  : 'bottom-11 right-2 sm:right-4 w-[calc(100vw-16px)] sm:w-[430px] h-[440px] sm:h-[470px]'
              }`}
            >
              {/* PM Window Top Header Bar */}
              <div className="h-13 bg-[#1a1a20] border-b border-[#24242d] px-3.5 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (peerUserObj) {
                      setSelectedUser(peerUserObj);
                      if (!isSystemPeer) {
                        recordProfileVisitNotification(peerUserObj.username);
                      }
                    } else {
                      setSelectedUser({
                        username: peerDisplayName,
                        avatarUrl: peerAvatar,
                        isOnline: false
                      });
                    }
                    setPublicProfileTab('info');
                    setProfileViewMode('view');
                    setProfileModalOpen(true);
                  }}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90 transition-opacity text-left"
                >
                  <UserAvatar
                    avatarUrl={peerAvatar}
                    className="w-9 h-9"
                    pfpBorderClass={getPfpBorder(peerBorderId).pfpBorderClass}
                    pfpBorderThickness={peerBorderThickness}
                  />
                  <span className="font-black text-white text-base sm:text-lg truncate">
                    {peerDisplayName}
                  </span>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPmWindowExpanded((prev) => !prev)}
                    aria-label={pmWindowExpanded ? 'Restore size' : 'Expand window'}
                    title={pmWindowExpanded ? 'Restore size' : 'Expand window'}
                    className="text-white hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {pmWindowExpanded ? (
                      <Minimize2 className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Maximize2 className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePmPeer(null)}
                    aria-label="Minimize private chat"
                    title="Minimize"
                    className="text-white hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePmPeer(null)}
                    aria-label="Close private chat"
                    title="Close"
                    className="text-white hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* PM Messages Area */}
              <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 bg-[#121215]">
                {pmMessagesList.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-medium select-none">
                    No messages yet. Say hello to {peerDisplayName}!
                  </div>
                ) : (
                  pmMessagesList.map((pm) => {
                    const isMeSender =
                      pm.sender.toLowerCase() === currentUser.username.toLowerCase();
                    const senderUser = isMeSender
                      ? {
                          username: currentUser.username,
                          avatarUrl: userProfile.avatarUrl,
                          pfpBorderId: userProfile.pfpBorderId,
                          pfpBorderThickness: userProfile.pfpBorderThickness,
                          rank: userProfile.rank,
                          email: currentUser.email
                        }
                      : allUsersList.find(
                          (u) => u.username.toLowerCase() === pm.sender.toLowerCase()
                        );
                    const senderRankObj = getUserRank(
                      pm.sender,
                      senderUser?.email,
                      senderUser?.rank
                    );

                    return (
                      <div
                        key={pm.id}
                        className="flex items-start gap-2.5 hover:bg-white/[0.02] p-1.5 rounded-xl transition-colors"
                      >
                        <UserAvatar
                          avatarUrl={
                            isMeSender
                              ? userProfile.avatarUrl
                              : (senderUser?.avatarUrl ?? peerAvatar)
                          }
                          className="w-8 h-8 mt-0.5"
                          pfpBorderClass={
                            getPfpBorder(
                              isMeSender ? userProfile.pfpBorderId : senderUser?.pfpBorderId
                            ).pfpBorderClass
                          }
                          pfpBorderThickness={
                            isMeSender
                              ? userProfile.pfpBorderThickness
                              : senderUser?.pfpBorderThickness
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {senderRankObj && (
                                <img
                                  src={senderRankObj.icon}
                                  alt={senderRankObj.name}
                                  className="w-3.5 h-3.5 object-contain shrink-0"
                                />
                              )}
                              <span className="font-bold text-white text-xs sm:text-sm truncate">
                                {senderUser?.username || pm.sender}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 shrink-0">
                              {pm.timestamp}
                            </span>
                          </div>

                          {pm.text && (
                            <p className="text-xs sm:text-sm text-zinc-100 mt-0.5 break-words leading-relaxed select-text">
                              {pm.text}
                            </p>
                          )}

                          {pm.mediaUrl && (
                            <div className="mt-1.5">
                              {pm.mediaType === 'video' ? (
                                <video
                                  src={pm.mediaUrl}
                                  controls
                                  playsInline
                                  className="max-w-full max-h-56 rounded-xl border border-[#262632] bg-black/40 object-contain"
                                />
                              ) : pm.mediaType === 'audio' ? (
                                <div className="bg-[#181820] border border-[#282834] rounded-xl p-2.5 space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 truncate">
                                    <Music className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate text-white">
                                      {pm.mediaName || 'Audio (.mp3)'}
                                    </span>
                                  </div>
                                  <audio src={pm.mediaUrl} controls className="w-full h-8" />
                                </div>
                              ) : (
                                <img
                                  src={pm.mediaUrl}
                                  alt={pm.mediaName || 'Attachment'}
                                  className="max-w-full max-h-60 rounded-xl border border-[#262632] bg-black/20 object-contain"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={pmMessagesEndRef} />
              </div>

              {/* Pending PM Media Upload Preview */}
              {(pmMediaUrl || isUploadingPmMedia) && (
                <div className="px-3.5 py-2 bg-[#181820] border-t border-[#262632] flex items-center justify-between gap-2">
                  {isUploadingPmMedia ? (
                    <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Uploading image...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 min-w-0">
                      {pmMediaType === 'video' ? (
                        <video
                          src={pmMediaUrl!}
                          className="w-10 h-10 rounded-lg object-cover bg-black border border-white/10 shrink-0"
                        />
                      ) : pmMediaType === 'audio' ? (
                        <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                          <Music className="w-4 h-4" />
                        </div>
                      ) : (
                        <img
                          src={pmMediaUrl!}
                          alt="Preview"
                          className="w-10 h-10 rounded-lg object-cover bg-black border border-white/10 shrink-0"
                        />
                      )}
                      <span className="text-xs font-bold text-white truncate">
                        {pmMediaName || 'Attachment ready'}
                      </span>
                    </div>
                  )}

                  {!isUploadingPmMedia && (
                    <button
                      type="button"
                      onClick={() => {
                        setPmMediaUrl(null);
                        setPmMediaType(null);
                        setPmMediaName(null);
                      }}
                      className="text-zinc-400 hover:text-rose-400 p-1 rounded-lg cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Hidden File Input for PM Media Uploads */}
              <input
                type="file"
                ref={pmMediaInputRef}
                accept="image/*,video/*,audio/*,.mp3,.wav,.ogg,.m4a,.mp4,.webm,.mov,.gif"
                className="hidden"
                onChange={handlePmMediaUpload}
              />

              {/* PM Bottom Input Bar (Screenshot 3) */}
              <form
                onSubmit={handleSendPmMessage}
                className="bg-[#18181c] border-t border-[#23232c] px-3 py-2.5 flex items-center gap-2 shrink-0"
              >
                <button
                  type="button"
                  disabled={isUploadingPmMedia}
                  onClick={() => pmMediaInputRef.current?.click()}
                  aria-label="Upload image"
                  title="Upload image"
                  className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isUploadingPmMedia ? (
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  ) : (
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  )}
                </button>

                <input
                  ref={pmInputRef}
                  type="text"
                  value={pmInputText}
                  onChange={(e) => setPmInputText(e.target.value)}
                  placeholder="Type here..."
                  className="flex-1 bg-[#121216] border border-[#24242d] rounded-full px-4 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                />

                <button
                  type="button"
                  onClick={handleTogglePmVoiceInput}
                  aria-label="Voice input"
                  title={isListeningPmVoice ? 'Listening... Click to stop' : 'Voice dictation'}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    isListeningPmVoice
                      ? 'text-rose-400 bg-rose-500/15 animate-pulse'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>

                <button
                  type="submit"
                  disabled={(!pmInputText.trim() && !pmMediaUrl) || isUploadingPmMedia}
                  aria-label="Send private message"
                  className="text-white hover:text-cyan-300 disabled:text-zinc-600 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <i className="fa fa-paper-plane text-lg" aria-hidden="true" />
                </button>
              </form>
            </div>
          );
        })()}

        {/* DISCORD-STYLE BOTTOM-LEFT STACKING & FADING MESSAGE NOTIFICATIONS */}
        {messengerToasts.length > 0 && (
          <div className="fixed bottom-16 left-4 z-[95] flex flex-col gap-2.5 w-[calc(100vw-32px)] max-w-[340px] pointer-events-none">
            {messengerToasts.map((toast) => (
              <div
                key={toast.id}
                onClick={() => {
                  dismissMessengerToast(toast.id);
                  setMessagesViewActive(true);
                }}
                className={`pointer-events-auto bg-[#18191c]/95 backdrop-blur-md border border-[#2f3136] hover:border-[#5865f2]/70 rounded-2xl p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex items-start gap-3 cursor-pointer transition-all duration-300 ${
                  toast.exiting
                    ? 'opacity-0 translate-x-6 scale-95'
                    : 'opacity-100 translate-x-0 scale-100 animate-in fade-in slide-in-from-left-8 duration-300'
                }`}
              >
                <UserAvatar
                  avatarUrl={toast.senderAvatarUrl}
                  className="w-10 h-10 shrink-0"
                  showOnline={true}
                  isOnline={true}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-black text-white text-xs sm:text-sm truncate">
                        {toast.senderDisplayName || toast.senderUsername}
                      </span>
                      {toast.groupName && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#5865f2]/20 text-[#99a2ff] truncate max-w-[115px]">
                          {toast.groupName}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissMessengerToast(toast.id);
                      }}
                      className="text-zinc-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer shrink-0"
                      aria-label="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5 line-clamp-2 break-words leading-snug">
                    {toast.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RED FLAG DATABASE MONITOR & ADMIN CONSOLE MODAL (ONLY FOR NULL / MAIN DEV) */}
        {isMainDeveloper && (
          <DatabaseMonitorModal
            isOpen={dbMonitorModalOpen}
            onClose={() => setDbMonitorModalOpen(false)}
            currentUsername={currentUser.username}
          />
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
        {loginError && (
          <div className="w-full max-w-md mx-auto mb-6 bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs sm:text-sm px-4 py-3 rounded-2xl flex items-start gap-3 animate-in fade-in z-20 text-left">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-300">Account Notice</p>
              <p className="leading-relaxed mt-0.5">{loginError}</p>
            </div>
            <button
              type="button"
              onClick={() => setLoginError(null)}
              aria-label="Dismiss notice"
              className="text-rose-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <img
          src={appLogo || '/logo.png'}
          alt="Logo"
          className="h-24 sm:h-28 md:h-32 w-auto object-contain mx-auto mb-5 drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] select-none pointer-events-none"
        />

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
              <div className="flex items-center justify-between mb-4">
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

              {loginError && (
                <div className="mb-4 bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Username or Email"
                    className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Password"
                    className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Forgot Password */}
                <div className="flex items-center justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginError(null);
                      setModalType('forgot');
                    }}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-[#9333ea] hover:bg-[#8324dc] active:bg-[#721ec0] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base shadow-md transition-all cursor-pointer mt-3"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying credentials...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Login</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center border-t border-[#25252b] mt-3">
                  <span className="text-xs text-zinc-400">Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginError(null);
                      setModalType('register');
                    }}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                  >
                    Register now
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

              {regError && (
                <div className="mb-3.5 bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{regError}</span>
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => {
                      setRegUsername(e.target.value);
                      if (regError) setRegError(null);
                    }}
                    placeholder="Username (unique)"
                    className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (regError) setRegError(null);
                    }}
                    placeholder="Password (min 4 characters)"
                    className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (regError) setRegError(null);
                    }}
                    placeholder="Email (unique)"
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
                    disabled={regLoading}
                    className="w-full bg-[#9333ea] hover:bg-[#8324dc] active:bg-[#721ec0] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base shadow-md transition-all cursor-pointer"
                  >
                    {regLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <SquarePen className="w-5 h-5" />
                        <span>Register</span>
                      </>
                    )}
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

                <div className="pt-2 text-center border-t border-[#25252b]">
                  <span className="text-xs text-zinc-400">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRegError(null);
                      setModalType('login');
                    }}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                  >
                    Login here
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FORGOT PASSWORD MODAL */}
          {modalType === 'forgot' && (
            <div className="w-full max-w-[390px] bg-[#17171a] border border-[#26262b] rounded-2xl p-6 sm:p-7 shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4">
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

              {forgotStatus && (
                <div className={`mb-3.5 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-start gap-2.5 animate-in fade-in ${
                  forgotStatus.includes('verified') || forgotStatus.includes('updated')
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{forgotStatus}</span>
                </div>
              )}

              <p className="text-xs sm:text-sm text-zinc-400 mb-4 text-left">
                Enter your account email address to verify your username or set a new password.
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Account Email"
                  className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />

                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="New Password (optional, min 4 chars)"
                  className="w-full bg-[#1e1e24] border border-[#2d2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-[#9333ea] hover:bg-[#8324dc] active:bg-[#721ec0] disabled:opacity-60 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base shadow-md transition-all cursor-pointer"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{forgotNewPassword.trim() ? 'Reset Password' : 'Verify Account'}</span>
                  )}
                </button>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStatus(null);
                      setForgotNewPassword('');
                      setModalType('login');
                    }}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
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
