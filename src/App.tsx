import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Trash2
} from 'lucide-react';
import {
  PROFILE_BORDERS,
  PFP_BORDERS,
  getProfileBorder,
  getPfpBorder
} from './borders';
import GlowModal from './components/GlowModal';
import BorderModal from './components/BorderModal';
import MusicPlayerModal, { MusicTrack } from './components/MusicPlayerModal';
import { detectUserCountry, getInstantUserCountry } from './utils/countryDetect';
import { uploadToCloudinary, deleteFromCloudinary } from './lib/cloudinary';
import { compressAvatar, compressBanner, formatBytes } from './utils/imageCompressor';
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

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  avatarUrl?: string | null;
  pfpBorderId?: string | null;
  pfpBorderThickness?: number;
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
          pfpBorderClass || 'border border-white/10'
        }`}
        style={pfpBorderThickness !== undefined ? { borderWidth: `${pfpBorderThickness}px` } : undefined}
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
  isOnline?: boolean;
  lastSeen?: any;
  updatedAt?: any;
}

export default function App() {
  const initialGeo = getInstantUserCountry();

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
  const initialProfile = useMemo(() => ({
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
  const [userProfile, setUserProfile] = useState<{
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
  }>(() => {
    const base = {
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
    };
    try {
      const saved = localStorage.getItem('chat_community_profile');
      if (saved) {
        return { ...base, ...JSON.parse(saved) };
      }
    } catch (_) {}
    return base;
  });

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileViewMode, setProfileViewMode] = useState<'edit' | 'view'>('edit');
  const [editOptionsTab, setEditOptionsTab] = useState<'account' | 'customisation'>('account');
  const [publicProfileTab, setPublicProfileTab] = useState<'info' | 'aboutme'>('info');

  // Delete account confirmation modal & deletion guard
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const isAccountDeletingRef = useRef(false);

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
  const [isProfileMusicPlaying, setIsProfileMusicPlaying] = useState(false);
  const profileAudioRef = useRef<HTMLAudioElement | null>(null);

  // Automatically detect user's country on load
  useEffect(() => {
    detectUserCountry().then(({ country, language }) => {
      setUserProfile((prev) => ({
        ...prev,
        country: prev.country === 'United Kingdom' || !prev.country ? country : prev.country,
        language: prev.language === 'English' || !prev.language ? language : prev.language
      }));
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

  // Chat View State (Loaded from localStorage)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('chat_community_messages');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [inputText, setInputText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTopic, setShowTopic] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [playerPopoverOpen, setPlayerPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number }>({ top: 80, right: 330 });
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfileData[]>([]);

  // Sync state to localStorage
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
        localStorage.setItem('chat_community_profile', JSON.stringify(userProfile));
      } catch (_) {}
    }
  }, [userProfile, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('chat_community_messages', JSON.stringify(messages));
    } catch (_) {}
  }, [messages]);

  // Real-time Firebase Realtime Database messages listener
  useEffect(() => {
    try {
      const messagesRef = ref(rtdb, 'messages');
      const messagesQuery = query(messagesRef, limitToLast(150));
      const unsubscribe = onValue(
        messagesQuery,
        (snapshot) => {
          if (snapshot.exists()) {
            const liveMsgs: ChatMessage[] = [];
            snapshot.forEach((childSnap) => {
              const data = childSnap.val();
              let ts = 'Just now';
              if (typeof data.createdAt === 'number') {
                ts = new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } else if (data.timestamp) {
                ts = data.timestamp;
              }
              liveMsgs.push({
                id: childSnap.key || Date.now().toString(),
                sender: data.sender || 'Anonymous',
                text: data.text || '',
                timestamp: ts,
                avatarUrl: data.avatarUrl || null,
                pfpBorderId: data.pfpBorderId || null,
                pfpBorderThickness: data.pfpBorderThickness || 2
              });
            });
            setMessages(liveMsgs);
          } else {
            setMessages([]);
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
  }, []);

  // Real-time listener for all registered/online users in Firebase Realtime Database
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
              if (val) {
                const uName = val.username || childSnap.key || '';
                list.push({
                  username: uName,
                  avatarUrl: val.avatarUrl || null,
                  avatarPublicId: val.avatarPublicId || null,
                  avatarDeleteToken: val.avatarDeleteToken || null,
                  bannerUrl: val.bannerUrl || null,
                  bannerPublicId: val.bannerPublicId || null,
                  bannerDeleteToken: val.bannerDeleteToken || null,
                  age: val.age ? String(val.age) : '18',
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
                  isOnline: val.isOnline !== false
                });
              }
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

  // Permanently delete user account:
  // - Deletes all chat messages sent by this user from Realtime Database
  // - Deletes user node users/${dbKey} from Realtime Database
  // - Deletes uploaded avatar and banner from Cloudinary
  // - Clears all local storage and state, stops audio
  // - Logs the user out completely
  const handlePermanentAccountDeletion = async (
    targetUsername: string,
    profileData?: typeof userProfile
  ) => {
    if (isAccountDeletingRef.current) return;
    isAccountDeletingRef.current = true;

    try {
      const trimmedUser = targetUsername.trim();
      const usernameLower = trimmedUser.toLowerCase();
      const dbKey = sanitizeDbKey(trimmedUser);

      // 1. Immediately log out and reset local state
      setCurrentUser(null);
      setUserProfile(initialProfile);
      setProfileModalOpen(false);
      setActiveEditSubModal(null);
      setShowProfileMenu(false);
      setShowGuide(false);
      setPlayerPopoverOpen(false);
      setShowDeleteAccountModal(false);
      setModalType(null);
      setLoginError('This account was deleted from the database. All profile information and chat messages have been permanently removed.');

      try {
        localStorage.removeItem('chat_community_user');
        localStorage.removeItem('chat_community_profile');
        localStorage.removeItem('chat_community_messages');
      } catch (_) {}

      if (profileAudioRef.current) {
        profileAudioRef.current.pause();
        profileAudioRef.current = null;
      }
      setIsProfileMusicPlaying(false);

      // Remove messages locally immediately
      setMessages((prev) => prev.filter((m) => m.sender.toLowerCase() !== usernameLower));

      // 2. Permanently delete all chat messages sent by this user from the Realtime Database
      try {
        const messagesRef = ref(rtdb, 'messages');
        const msgsSnap = await get(messagesRef);
        if (msgsSnap.exists()) {
          const allMsgs = msgsSnap.val();
          const deletePromises: Promise<any>[] = [];
          for (const [key, msg] of Object.entries(allMsgs)) {
            const sender = (msg as any)?.sender;
            if (typeof sender === 'string' && sender.trim().toLowerCase() === usernameLower) {
              deletePromises.push(remove(ref(rtdb, `messages/${key}`)));
            }
          }
          if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
            console.log(`[Teenverse] Permanently deleted ${deletePromises.length} chat messages for user ${trimmedUser}.`);
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

      // 4. Delete avatar & banner from Cloudinary
      const pfpUrl = profileData?.avatarUrl || userProfile.avatarUrl;
      const pfpPublicId = profileData?.avatarPublicId || userProfile.avatarPublicId;
      const pfpToken = profileData?.avatarDeleteToken || userProfile.avatarDeleteToken;
      if (pfpUrl || pfpPublicId) {
        deleteFromCloudinary({
          url: pfpUrl,
          publicId: pfpPublicId,
          deleteToken: pfpToken,
          resourceType: 'image'
        }).catch(() => {});
      }

      const bannerUrl = profileData?.bannerUrl || userProfile.bannerUrl;
      const bannerPublicId = profileData?.bannerPublicId || userProfile.bannerPublicId;
      const bannerToken = profileData?.bannerDeleteToken || userProfile.bannerDeleteToken;
      if (bannerUrl || bannerPublicId) {
        deleteFromCloudinary({
          url: bannerUrl,
          publicId: bannerPublicId,
          deleteToken: bannerToken,
          resourceType: 'image'
        }).catch(() => {});
      }
    } finally {
      setIsDeletingAccount(false);
      setTimeout(() => {
        isAccountDeletingRef.current = false;
      }, 1200);
    }
  };

  // Live account listener & deletion handler:
  // If the user was deleted in the Realtime Database (e.g. from Firebase console or external deletion):
  // 1. Immediately detects !snap.exists()
  // 2. Logs them out immediately
  // 3. Permanently deletes all their messages in main chat, their profile, Cloudinary media, and local cache
  useEffect(() => {
    if (!currentUser || !currentUser.username) return;
    if (isAccountDeletingRef.current) return;

    const dbKey = sanitizeDbKey(currentUser.username);
    const userRef = ref(rtdb, `users/${dbKey}`);

    const unsubscribe = onValue(
      userRef,
      (snap) => {
        if (isAccountDeletingRef.current) return;

        // If the user was deleted in the Realtime Database:
        if (!snap.exists()) {
          console.warn(`[Teenverse] User "${currentUser.username}" was deleted in Realtime Database. Triggering permanent account deletion & cleanup...`);
          handlePermanentAccountDeletion(currentUser.username, userProfile);
          return;
        }

        // Account exists: restore / sync remote profile attributes
        const val = snap.val();
        if (val) {
          setUserProfile((prev) => ({
            ...prev,
            avatarUrl: val.avatarUrl !== undefined ? val.avatarUrl : prev.avatarUrl,
            avatarPublicId: val.avatarPublicId !== undefined ? val.avatarPublicId : prev.avatarPublicId,
            avatarDeleteToken: val.avatarDeleteToken !== undefined ? val.avatarDeleteToken : prev.avatarDeleteToken,
            bannerUrl: val.bannerUrl !== undefined ? val.bannerUrl : prev.bannerUrl,
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
            musicTrack: val.musicTrack || null
          }));
        }
      },
      (err) => {
        console.warn('Realtime Database account listener notice:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser?.username]);

  // Presence detection: Set user online when connected and offline on disconnect
  useEffect(() => {
    if (!currentUser || !currentUser.username || isAccountDeletingRef.current) return;
    try {
      const sanitizedUsername = sanitizeDbKey(currentUser.username);
      const connectedRef = ref(rtdb, '.info/connected');
      const userOnlineRef = ref(rtdb, `users/${sanitizedUsername}/isOnline`);
      const userLastSeenRef = ref(rtdb, `users/${sanitizedUsername}/lastSeen`);

      const unsubscribe = onValue(connectedRef, (snap) => {
        if (isAccountDeletingRef.current) return;
        if (snap.val() === true) {
          onDisconnect(userOnlineRef).set(false);
          onDisconnect(userLastSeenRef).set(serverTimestamp());
          set(userOnlineRef, true);
        }
      });
      return () => {
        unsubscribe();
      };
    } catch (e) {
      console.warn('Presence setup notice:', e);
    }
  }, [currentUser]);

  // Sync current user profile changes to Realtime Database using update (preserving credentials)
  useEffect(() => {
    if (currentUser && currentUser.username && !isAccountDeletingRef.current) {
      try {
        const sanitizedUsername = sanitizeDbKey(currentUser.username);
        const userRef = ref(rtdb, `users/${sanitizedUsername}`);
        update(userRef, {
          username: currentUser.username,
          ...userProfile,
          isOnline: true,
          updatedAt: serverTimestamp()
        }).catch((err) => {
          console.warn('Realtime Database user profile sync notice:', err.message);
        });
      } catch (err) {
        console.warn('Realtime Database user ref error:', err);
      }
    }
  }, [currentUser, userProfile]);

  // Combined full users list
  const allUsersList = useMemo(() => {
    const map = new Map<string, UserProfileData>();
    registeredUsers.forEach((u) => {
      if (u.username) {
        map.set(u.username.toLowerCase(), u);
      }
    });
    if (currentUser && currentUser.username) {
      map.set(currentUser.username.toLowerCase(), {
        username: currentUser.username,
        ...userProfile,
        isOnline: true
      });
    }
    const list = Array.from(map.values());
    return list.sort((a, b) => {
      const aIsMe = currentUser && a.username.toLowerCase() === currentUser.username.toLowerCase();
      const bIsMe = currentUser && b.username.toLowerCase() === currentUser.username.toLowerCase();
      if (aIsMe) return -1;
      if (bIsMe) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.username.localeCompare(b.username);
    });
  }, [registeredUsers, currentUser, userProfile]);

  const onlineCount = useMemo(() => {
    return allUsersList.filter((u) => u.isOnline !== false).length;
  }, [allUsersList]);

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
    setLoginError(null);
    setRegError(null);
    setForgotStatus(null);
  };

  // Sign up action: Enforce unique username & email, required credentials, and create persistent account
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

    // 3. Validate password length
    if (!regPassword || regPassword.length < 4) {
      setRegError('Password must be at least 4 characters long.');
      return;
    }

    setRegLoading(true);

    try {
      // 4. Query Firebase Realtime Database to guarantee unique username and unique email
      const usersSnap = await get(ref(rtdb, 'users'));
      if (usersSnap.exists()) {
        const usersData = usersSnap.val();
        for (const k of Object.keys(usersData)) {
          const u = usersData[k];
          if (!u) continue;

          // Cannot signup with the same username as someone else
          if (u.username && u.username.toLowerCase() === trimmedUser.toLowerCase()) {
            setRegError('This username is already taken by someone else. Please choose another username.');
            setRegLoading(false);
            return;
          }

          // Cannot signup with the same email as someone else
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
      const sanitizedKey = sanitizeDbKey(trimmedUser);

      // 7. Create persistent user account and profile record in Realtime Database
      const newUserRecord = {
        username: trimmedUser,
        usernameLower: trimmedUser.toLowerCase(),
        email: trimmedEmail,
        emailLower: trimmedEmail.toLowerCase(),
        passwordHash: pwdHash,
        avatarUrl: null,
        avatarPublicId: null,
        avatarDeleteToken: null,
        bannerUrl: null,
        bannerPublicId: null,
        bannerDeleteToken: null,
        age: calculatedAge,
        gender: gender.toUpperCase(),
        relationship: 'Rather not say',
        country: initialGeo.country || 'Global',
        language: initialGeo.language || 'English',
        bio: '',
        mood: '',
        glowColor: null,
        glowThickness: 18,
        profileBorderId: 'pb-default',
        profileBorderThickness: 2,
        pfpBorderId: 'pfp-default',
        pfpBorderThickness: 2,
        musicTrack: null,
        isOnline: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await set(ref(rtdb, `users/${sanitizedKey}`), newUserRecord);

      // 8. Save user details in localStorage
      const userObj = {
        username: trimmedUser,
        gender: gender.toUpperCase(),
        email: trimmedEmail
      };
      localStorage.setItem('chat_community_user', JSON.stringify(userObj));
      localStorage.setItem('chat_community_profile', JSON.stringify(newUserRecord));

      setCurrentUser(userObj);
      setUserProfile(newUserRecord);
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

  // Login action: Verifies username/email and password against real database accounts, prevents fake accounts, and restores pfp/banner
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
      // 1. Fetch registered users from Firebase Realtime Database
      const usersSnap = await get(ref(rtdb, 'users'));
      if (!usersSnap.exists()) {
        setLoginError('Incorrect username/email or password.');
        setLoginLoading(false);
        return;
      }

      const allUsers = usersSnap.val();
      let matchedKey: string | null = null;
      let matchedUser: any = null;

      // Locate user by matching username OR email (case-insensitive)
      for (const k of Object.keys(allUsers)) {
        const u = allUsers[k];
        if (!u) continue;

        const uNameMatch = u.username && u.username.toLowerCase() === identifier.toLowerCase();
        const uEmailMatch = u.email && u.email.toLowerCase() === identifier.toLowerCase();

        if (uNameMatch || uEmailMatch) {
          matchedKey = k;
          matchedUser = u;
          break;
        }
      }

      // If no account exists -> forbid fake login!
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

      // 3. Restore all saved profile data (pfp, banner, music, glow, borders, bio, mood, info)
      const loadedProfile = {
        avatarUrl: matchedUser.avatarUrl || null,
        avatarPublicId: matchedUser.avatarPublicId || null,
        avatarDeleteToken: matchedUser.avatarDeleteToken || null,
        bannerUrl: matchedUser.bannerUrl || null,
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

      // 4. Save login details & session in localStorage (automatically logged in on reload)
      localStorage.setItem('chat_community_user', JSON.stringify(userObj));
      localStorage.setItem('chat_community_profile', JSON.stringify(loadedProfile));

      // 5. Update online status in Realtime Database
      update(ref(rtdb, `users/${matchedKey}`), {
        isOnline: true,
        lastSeen: serverTimestamp()
      }).catch((e) => console.warn('Online status update notice:', e));

      // 6. Set app state
      setCurrentUser(userObj);
      setUserProfile(loadedProfile);
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
      let exists = false;
      if (snap.exists()) {
        const val = snap.val();
        for (const k of Object.keys(val)) {
          if (val[k]?.email && val[k].email.toLowerCase() === forgotEmail.trim().toLowerCase()) {
            exists = true;
            break;
          }
        }
      }
      if (exists) {
        setForgotStatus('Account verified! If password recovery email service is configured, reset instructions are on their way.');
      } else {
        setForgotStatus('No registered account was found with that email address.');
      }
    } catch (err: any) {
      setForgotStatus('Unable to process password reset request right now.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Send message in chat (Saved to Realtime Database for live real-time synchronization)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    const textToSend = inputText.trim();
    setInputText('');

    // Handle /clear command: instantly deletes all messages from Realtime Database and local cache
    if (textToSend.toLowerCase() === '/clear') {
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
      return;
    }

    const newMsgData = {
      sender: currentUser.username,
      text: textToSend,
      avatarUrl: userProfile.avatarUrl || null,
      pfpBorderId: userProfile.pfpBorderId || null,
      pfpBorderThickness: userProfile.pfpBorderThickness || 2,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp()
    };

    try {
      const messagesRef = ref(rtdb, 'messages');
      await push(messagesRef, newMsgData);
    } catch (err) {
      console.warn('Realtime Database push fallback:', err);
      // Fallback local append if offline
      const fallbackMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: currentUser.username,
        text: textToSend,
        timestamp: 'Just now',
        avatarUrl: userProfile.avatarUrl,
        pfpBorderId: userProfile.pfpBorderId,
        pfpBorderThickness: userProfile.pfpBorderThickness
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    }
  };

  // Avatar and Banner file handlers (Compacted to tiny KB, uploaded to Cloudinary, deleting previous asset)
  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cache previous avatar info to delete it
    const oldAvatarUrl = userProfile.avatarUrl;
    const oldAvatarPublicId = userProfile.avatarPublicId;
    const oldAvatarToken = userProfile.avatarDeleteToken;

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

    // 3. Upload compacted file to Cloudinary in 'avatars' folder
    try {
      const uploadRes = await uploadToCloudinary(uploadFile, 'image', 'avatars');
      const finalUrl = uploadRes.secure_url || uploadRes.url;
      setUserProfile((prev) => ({
        ...prev,
        avatarUrl: finalUrl,
        avatarPublicId: uploadRes.public_id,
        avatarDeleteToken: uploadRes.delete_token || null
      }));
    } catch (err) {
      console.warn('Cloudinary avatar upload notice:', err);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cache previous banner info to delete it
    const oldBannerUrl = userProfile.bannerUrl;
    const oldBannerPublicId = userProfile.bannerPublicId;
    const oldBannerToken = userProfile.bannerDeleteToken;

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

    // 3. Upload compacted file to Cloudinary in 'banners' folder
    try {
      const uploadRes = await uploadToCloudinary(uploadFile, 'image', 'banners');
      const finalUrl = uploadRes.secure_url || uploadRes.url;
      setUserProfile((prev) => ({
        ...prev,
        bannerUrl: finalUrl,
        bannerPublicId: uploadRes.public_id,
        bannerDeleteToken: uploadRes.delete_token || null
      }));
    } catch (err) {
      console.warn('Cloudinary banner upload notice:', err);
    }
  };

  const handleRemoveAvatar = async () => {
    const oldUrl = userProfile.avatarUrl;
    const oldPublicId = userProfile.avatarPublicId;
    const oldToken = userProfile.avatarDeleteToken;
    setUserProfile((p) => ({ ...p, avatarUrl: null, avatarPublicId: null, avatarDeleteToken: null }));
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
    const oldUrl = userProfile.bannerUrl;
    const oldPublicId = userProfile.bannerPublicId;
    const oldToken = userProfile.bannerDeleteToken;
    setUserProfile((p) => ({ ...p, bannerUrl: null, bannerPublicId: null, bannerDeleteToken: null }));
    if (oldUrl || oldPublicId) {
      deleteFromCloudinary({
        url: oldUrl,
        publicId: oldPublicId,
        deleteToken: oldToken,
        resourceType: 'image'
      }).catch(() => {});
    }
  };

  // Control profile music playback
  useEffect(() => {
    if (profileAudioRef.current) {
      if (isProfileMusicPlaying && userProfile.musicTrack) {
        profileAudioRef.current.play().catch(() => setIsProfileMusicPlaying(false));
      } else {
        profileAudioRef.current.pause();
      }
    }
  }, [isProfileMusicPlaying, userProfile.musicTrack]);

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
                      if (currentUser) {
                        const key = sanitizeDbKey(currentUser.username);
                        update(ref(rtdb, `users/${key}`), { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
                      }
                      setCurrentUser(null);
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
                messages.map((msg) => {
                  const isSenderMe = Boolean(
                    currentUser && msg.sender.toLowerCase() === currentUser.username.toLowerCase()
                  );
                  const senderFromList = registeredUsers.find(
                    (u) => u.username.toLowerCase() === msg.sender.toLowerCase()
                  );
                  const msgAvatarUrl = isSenderMe
                    ? (userProfile.avatarUrl || msg.avatarUrl)
                    : (msg.avatarUrl || senderFromList?.avatarUrl || null);
                  const msgBorderId = isSenderMe
                    ? userProfile.pfpBorderId
                    : (msg.pfpBorderId || senderFromList?.pfpBorderId || 'pfp-default');
                  const msgBorderThickness = isSenderMe
                    ? userProfile.pfpBorderThickness
                    : (msg.pfpBorderThickness ?? senderFromList?.pfpBorderThickness ?? 2);

                  const handleOpenSenderProfile = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (senderFromList) {
                      setSelectedUser(senderFromList);
                    } else if (isSenderMe) {
                      setSelectedUser({
                        username: currentUser.username,
                        ...userProfile,
                        isOnline: true
                      });
                    } else {
                      setSelectedUser({
                        username: msg.sender,
                        avatarUrl: msg.avatarUrl || null,
                        pfpBorderId: msg.pfpBorderId || null,
                        pfpBorderThickness: msg.pfpBorderThickness,
                        isOnline: true
                      });
                    }
                    setProfileViewMode('view');
                    setProfileModalOpen(true);
                  };

                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3.5 group hover:bg-white/[0.02] -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      <button
                        type="button"
                        onClick={handleOpenSenderProfile}
                        className="cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                        title={`View ${msg.sender}'s profile`}
                      >
                        <UserAvatar
                          avatarUrl={msgAvatarUrl}
                          className="w-10 h-10 mt-0.5"
                          pfpBorderClass={getPfpBorder(msgBorderId).pfpBorderClass}
                          pfpBorderThickness={msgBorderThickness}
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={handleOpenSenderProfile}
                              className="font-bold text-white text-sm sm:text-base tracking-wide hover:text-cyan-300 transition-colors cursor-pointer text-left focus:outline-none"
                            >
                              {msg.sender}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-500 text-xs">
                            <span>{msg.timestamp}</span>
                          </div>
                        </div>

                        <p className="text-white font-medium text-sm sm:text-base mt-0.5 break-words leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  );
                })
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

              <div className="px-4 py-3 flex items-center justify-between border-b border-[#202026]/60">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">Online</span>
                  <span className="bg-[#00a8e8] text-white text-xs font-bold px-2 py-0.5 rounded-full leading-none">
                    {onlineCount}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 font-medium">
                  {allUsersList.length} total
                </span>
              </div>

              {/* USER LIST (Clicking card opens options on the left) */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {allUsersList.map((userItem) => {
                  const isMe = Boolean(
                    currentUser &&
                    userItem.username.toLowerCase() === currentUser.username.toLowerCase()
                  );
                  const isOnline = userItem.isOnline !== false;
                  return (
                    <div
                      key={userItem.username}
                      ref={isMe ? playerCardRef : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(userItem);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const popoverWidth = 240;
                        const targetRight = window.innerWidth - rect.left + 14;
                        setPopoverPos({
                          top: Math.max(16, Math.min(window.innerHeight - 280, rect.top - 8)),
                          right: Math.min(window.innerWidth - popoverWidth - 16, targetRight)
                        });
                        setPlayerPopoverOpen(true);
                      }}
                      style={
                        userItem.glowColor
                          ? {
                              borderColor: userItem.glowColor,
                              boxShadow: `0 0 ${userItem.glowThickness || 18}px ${userItem.glowColor}99, inset 0 0 ${Math.max(3, Math.round((userItem.glowThickness || 18) / 3))}px ${userItem.glowColor}33`
                            }
                          : undefined
                      }
                      className={`bg-[#18181f] border ${
                        userItem.glowColor ? '' : 'border-[#2b2b38] hover:border-cyan-500/40'
                      } rounded-xl p-2.5 flex items-center gap-3 transition-all cursor-pointer group`}
                    >
                      <UserAvatar
                        avatarUrl={isMe ? userProfile.avatarUrl : userItem.avatarUrl}
                        className="w-10 h-10"
                        showOnline={true}
                        isOnline={isOnline}
                        pfpBorderClass={getPfpBorder(isMe ? userProfile.pfpBorderId : userItem.pfpBorderId).pfpBorderClass}
                        pfpBorderThickness={isMe ? userProfile.pfpBorderThickness : userItem.pfpBorderThickness}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm truncate group-hover:text-cyan-300 transition-colors">
                            {userItem.username}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {userItem.mood ? userItem.mood : (isOnline ? 'Online' : 'Offline')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Options popover shown on the left of the player (Image 2) - Entire top bit is banner */}
          {playerPopoverOpen && (() => {
            const activePopoverUser: UserProfileData = selectedUser || (currentUser ? {
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
                      getPfpBorder(isSelectedUserMe ? userProfile.pfpBorderId : activePopoverUser.pfpBorderId).pfpBorderClass || 'border-2 border-white'
                    }`}
                    style={{ borderWidth: `${(isSelectedUserMe ? userProfile.pfpBorderThickness : activePopoverUser.pfpBorderThickness) || 2}px` }}
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
                  <div className="relative z-10 mt-2.5">
                    <h3 className="font-extrabold text-white text-base tracking-wide drop-shadow-md truncate flex items-center justify-center gap-1.5">
                      <span>{activePopoverUser.username}</span>
                    </h3>
                    <p className="text-xs text-zinc-300 font-medium mt-0.5 drop-shadow-sm truncate">
                      {(isSelectedUserMe ? userProfile.age : activePopoverUser.age) || '18'} years · {(isSelectedUserMe ? userProfile.gender : activePopoverUser.gender) || 'Unknown'}
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
                      setProfileViewMode('view');
                      setProfileModalOpen(true);
                    }}
                    className="w-full bg-[#1e1e26] hover:bg-[#282834] text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    <User className="w-4 h-4 text-zinc-300" />
                    <span>View profile</span>
                  </button>

                  {/* 2. Edit button (self only) */}
                  {isSelectedUserMe && (
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
                  )}

                  {/* 3. Profile Music play/pause button if track exists */}
                  {((isSelectedUserMe ? userProfile.musicTrack : activePopoverUser.musicTrack)) && (
                    <button
                      type="button"
                      onClick={() => setIsProfileMusicPlaying(!isProfileMusicPlaying)}
                      className="w-full bg-[#181822] hover:bg-[#20202e] text-cyan-300 font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer border border-cyan-500/20"
                    >
                      {isProfileMusicPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-cyan-400" />
                          <span className="truncate">Pause Music</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-cyan-400" />
                          <span className="truncate">Play Profile Music</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Hidden Audio Element for Profile Music */}
        {userProfile.musicTrack && (
          <audio
            ref={profileAudioRef}
            src={userProfile.musicTrack.url}
            onEnded={() => setIsProfileMusicPlaying(false)}
          />
        )}

        {/* ==================================================== */}
        {/* PROFILE MODAL (EDIT & VIEW MODES)                    */}
        {/* ==================================================== */}
        {profileModalOpen && (() => {
          const activeModalUser: UserProfileData = (selectedUser && (!currentUser || selectedUser.username.toLowerCase() !== currentUser.username.toLowerCase()))
            ? selectedUser
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

          const bannerToShow = isViewingSelf && effectiveProfileViewMode === 'edit'
            ? userProfile.bannerUrl
            : activeModalUser.bannerUrl;
          const avatarToShow = isViewingSelf && effectiveProfileViewMode === 'edit'
            ? userProfile.avatarUrl
            : activeModalUser.avatarUrl;
          const pfpBorderIdToShow = isViewingSelf && effectiveProfileViewMode === 'edit'
            ? userProfile.pfpBorderId
            : activeModalUser.pfpBorderId;
          const pfpBorderThicknessToShow = isViewingSelf && effectiveProfileViewMode === 'edit'
            ? userProfile.pfpBorderThickness
            : (activeModalUser.pfpBorderThickness || 2);
          const profileBorderIdToShow = isViewingSelf && effectiveProfileViewMode === 'edit'
            ? userProfile.profileBorderId
            : activeModalUser.profileBorderId;
          const profileBorderThicknessToShow = isViewingSelf && effectiveProfileViewMode === 'edit'
            ? userProfile.profileBorderThickness
            : (activeModalUser.profileBorderThickness || 2);
          const usernameToShow = activeModalUser.username;
          const moodToShow = isViewingSelf && effectiveProfileViewMode === 'edit'
            ? userProfile.mood
            : activeModalUser.mood;
          const musicToShow = isViewingSelf
            ? userProfile.musicTrack
            : activeModalUser.musicTrack;

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
                      getPfpBorder(pfpBorderIdToShow).pfpBorderClass || 'border-2 border-white/90'
                    }`}
                    style={{ borderWidth: `${pfpBorderThicknessToShow || 2}px` }}
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
                        className={`absolute bottom-1 right-1 w-4 h-4 border-2 border-white rounded-full shadow-md ${
                          activeModalUser.isOnline !== false ? 'bg-[#70c91f]' : 'bg-zinc-500'
                        }`}
                      />
                    )}
                  </div>

                  {/* Username & Mood */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate">
                        {usernameToShow}
                      </h2>
                    </div>
                    {moodToShow ? (
                      <p className="text-xs text-cyan-400 font-medium truncate mt-0.5">
                        {moodToShow}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {activeModalUser.isOnline !== false ? 'Online' : 'Offline'}
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

                        {/* 5. Delete account */}
                        <button
                          type="button"
                          onClick={() => setShowDeleteAccountModal(true)}
                          className="w-full flex items-center gap-3.5 px-3 py-3 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors cursor-pointer text-left border-b border-[#1f1f28] group rounded-xl"
                        >
                          <Trash2 className="w-5 h-5 text-rose-400 group-hover:text-rose-300 transition-colors shrink-0" />
                          <span className="text-sm sm:text-base font-extrabold text-rose-400 group-hover:text-rose-300 transition-colors">
                            Delete account
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
                {/* Only Info and About me tabs (No friends, gifts, etc.)    */}
                {/* ========================================================= */}
                {effectiveProfileViewMode === 'view' && (
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
                              onClick={() => setIsProfileMusicPlaying(!isProfileMusicPlaying)}
                              className="w-8 h-8 rounded-lg bg-[#00c2ff] hover:bg-[#00aee6] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-sm ml-2"
                            >
                              {isProfileMusicPlaying ? (
                                <Pause className="w-4 h-4 fill-white" />
                              ) : (
                                <Play className="w-4 h-4 fill-white translate-x-0.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: About me (Pure text, NO BOX, scrollable for big ass bios) */}
                    {publicProfileTab === 'aboutme' && (
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
                )}
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
                        setUserProfile((p) => ({
                          ...p,
                          age: tempAge,
                          gender: tempGender,
                          relationship: tempRelationship,
                          country: tempCountry || 'United Kingdom',
                          language: tempLanguage || 'English'
                        }));
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

            {/* 2. Edit about me (bio) sub-modal - ALLOW BIG ASS BIOS */}
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
                        if (newName.toLowerCase() === currentUser.username.toLowerCase()) {
                          setActiveEditSubModal(null);
                          return;
                        }
                        const uVal = isValidUsername(newName);
                        if (!uVal.valid) {
                          setUsernameEditError(uVal.message || 'Invalid username.');
                          return;
                        }
                        setUsernameEditLoading(true);
                        setUsernameEditError(null);
                        try {
                          const usersSnap = await get(ref(rtdb, 'users'));
                          if (usersSnap.exists()) {
                            const data = usersSnap.val();
                            for (const k of Object.keys(data)) {
                              if (data[k]?.username && data[k].username.toLowerCase() === newName.toLowerCase()) {
                                setUsernameEditError('That username is already taken by someone else.');
                                setUsernameEditLoading(false);
                                return;
                              }
                            }
                          }
                          const oldKey = sanitizeDbKey(currentUser.username);
                          const newKey = sanitizeDbKey(newName);
                          const oldSnap = await get(ref(rtdb, `users/${oldKey}`));
                          const oldData = oldSnap.exists() ? oldSnap.val() : {};

                          await set(ref(rtdb, `users/${newKey}`), {
                            ...oldData,
                            username: newName,
                            usernameLower: newName.toLowerCase(),
                            updatedAt: serverTimestamp()
                          });
                          await remove(ref(rtdb, `users/${oldKey}`));

                          const updated = { ...currentUser, username: newName };
                          setCurrentUser(updated);
                          localStorage.setItem('chat_community_user', JSON.stringify(updated));
                          setActiveEditSubModal(null);
                        } catch (err: any) {
                          setUsernameEditError(err.message || 'Failed to update username.');
                        } finally {
                          setUsernameEditLoading(false);
                        }
                      }}
                      className="w-full bg-[#00c2ff] hover:bg-[#00aee6] text-white font-extrabold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-cyan-500/25 disabled:opacity-50"
                    >
                      {usernameEditLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Checking availability...</span>
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
                        setUserProfile((p) => ({ ...p, mood: tempMood.trim() }));
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

            {/* 5. User glow sub-modal (Free, in front) */}
            {activeEditSubModal === 'glow' && (
              <GlowModal
                initialColor={userProfile.glowColor}
                initialThickness={userProfile.glowThickness || 18}
                username={currentUser.username}
                avatarUrl={userProfile.avatarUrl}
                pfpBorderClass={getPfpBorder(userProfile.pfpBorderId).pfpBorderClass}
                pfpBorderThickness={userProfile.pfpBorderThickness || 2}
                onSave={(color, thick) => {
                  setUserProfile((p) => ({ ...p, glowColor: color, glowThickness: thick }));
                  setActiveEditSubModal(null);
                }}
                onClose={() => setActiveEditSubModal(null)}
              />
            )}

            {/* 6. Profile borders sub-modal (Clean Screenshot 3 UI, in front) */}
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
                  setUserProfile((p) => ({
                    ...p,
                    profileBorderId: PROFILE_BORDERS[idx].id,
                    profileBorderThickness: thick
                  }));
                  setActiveEditSubModal(null);
                }}
                onClose={() => setActiveEditSubModal(null)}
              />
            )}

            {/* 7. Profile picture borders sub-modal (Clean Screenshot 3 UI, in front) */}
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
                  setUserProfile((p) => ({
                    ...p,
                    pfpBorderId: PFP_BORDERS[idx].id,
                    pfpBorderThickness: thick
                  }));
                  setActiveEditSubModal(null);
                }}
                onClose={() => setActiveEditSubModal(null)}
              />
            )}

            {/* 8. Profile music / Music player sub-modal (Free, in front) */}
            {activeEditSubModal === 'music' && (
              <MusicPlayerModal
                currentTrack={userProfile.musicTrack}
                onSaveTrack={(track) => {
                  setUserProfile((p) => ({ ...p, musicTrack: track }));
                  if (!track) {
                    setIsProfileMusicPlaying(false);
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
                  forgotStatus.includes('verified')
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{forgotStatus}</span>
                </div>
              )}

              <p className="text-xs sm:text-sm text-zinc-400 mb-4 text-left">
                Enter your account email address to verify your account registration.
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Email"
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
                      <span>Verifying account...</span>
                    </>
                  ) : (
                    <span>Check Account</span>
                  )}
                </button>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStatus(null);
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
