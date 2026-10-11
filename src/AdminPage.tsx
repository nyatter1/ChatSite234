import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Shield,
  ShieldAlert,
  Terminal,
  Settings,
  Users,
  Star,
  Boxes,
  Ban,
  Home,
  Puzzle,
  Layers,
  Wrench,
  Filter,
  Music,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  MicOff,
  UserCheck,
  MessageSquare,
  Mail,
  Rss,
  BarChart3,
  Search,
  RefreshCw,
  AlertCircle,
  Check,
  Sparkles,
  Clock,
  UserX,
  User as UserIcon,
  HelpCircle,
  ToggleLeft,
  LogOut,
  SendHorizontal,
  Trash2,
  Plus,
  Globe,
  Calendar,
  Heart,
  Smile,
  Volume2,
  X,
  ExternalLink,
  Award
} from 'lucide-react';
import {
  rtdb,
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  serverTimestamp
} from './lib/firebase';
import {
  getUserRank,
  RANKS,
  ASSIGNABLE_RANKS,
  SYSTEM_BOT_USERNAME,
  SYSTEM_BOT_AVATAR,
  canBanRank,
  canMuteRank,
  isStaffRank,
  FILTER_MUTE_DURATIONS
} from './ranks';
import { getPfpBorder, getProfileBorder } from './borders';
import { sanitizeDbKey, hashPassword } from './utils/auth';

export interface AuditLogItem {
  id: string;
  type:
    | 'clear_chat'
    | 'change_rank'
    | 'mute'
    | 'unmute'
    | 'ban'
    | 'unban'
    | 'warn'
    | 'delete_message'
    | 'create_poll'
    | 'wall_post'
    | 'user_register'
    | 'user_rename';
  actor: string;
  actorRank?: string | null;
  target?: string | null;
  details: string;
  category: 'staff' | 'general';
  timestamp: number;
}

export interface BannedFilterItem {
  id: string;
  word: string;
  muteDurationId: string;
  muteDurationLabel: string;
  muteDurationMs: number;
  createdAt?: number;
  createdBy?: string;
}

interface AdminPageProps {
  currentUser?: {
    username: string;
    email?: string | null;
    rank?: string | null;
    gender?: string;
  } | null;
  userProfile?: {
    rank?: string | null;
    avatarUrl?: string | null;
    customRankIcon?: string | null;
    customRankName?: string | null;
  } | null;
  onBackToChat: () => void;
  onUnmuteUser?: (username: string) => Promise<void>;
  onUnbanUser?: (username: string) => Promise<void>;
}

export default function AdminPage({
  currentUser: initialCurrentUser,
  userProfile: initialUserProfile,
  onBackToChat,
  onUnmuteUser,
  onUnbanUser
}: AdminPageProps) {
  // Navigation tabs: 'dashboard' | 'members' | 'manage_action' | 'filters' | 'console_logs'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'manage_action' | 'filters' | 'console_logs'>('dashboard');

  // Coming Soon collapsible accordion state in sidebar
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  // Authentication state for standalone /admin access
  const [localUser, setLocalUser] = useState(() => {
    if (initialCurrentUser) return initialCurrentUser;
    try {
      const saved = localStorage.getItem('chat_community_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [devLoginUser, setDevLoginUser] = useState('');
  const [devLoginPass, setDevLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Live database collections
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [messagesMap, setMessagesMap] = useState<Record<string, any>>({});
  const [newsPostsMap, setNewsPostsMap] = useState<Record<string, any>>({});
  const [auditLogsList, setAuditLogsList] = useState<AuditLogItem[]>([]);
  const [bannedFiltersList, setBannedFiltersList] = useState<BannedFilterItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Action status banner
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters for Manage Action
  const [actionFilter, setActionFilter] = useState<'all' | 'muted' | 'banned'>('all');
  const [actionSearch, setActionSearch] = useState('');

  // Filters for Console Logs
  const [logCategoryFilter, setLogCategoryFilter] = useState<'overall' | 'staff'>('overall');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // State for FILTERS tab
  const [newFilterWord, setNewFilterWord] = useState('');
  const [newFilterDurationId, setNewFilterDurationId] = useState('1h');
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [isAddingFilter, setIsAddingFilter] = useState(false);

  // State for MEMBERS tab
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberFilterTab, setMemberFilterTab] = useState<'all' | 'online' | 'staff' | 'punished'>('all');
  // Selected member to show profile card in the middle
  const [selectedMemberKey, setSelectedMemberKey] = useState<string | null>(null);

  // Moderation state on selected member profile card
  const [cardMuteDurationId, setCardMuteDurationId] = useState('1h');
  const [cardMuteReason, setCardMuteReason] = useState('');
  const [cardBanDurationId, setCardBanDurationId] = useState('1d');
  const [cardBanReason, setCardBanReason] = useState('');
  const [cardRankSelect, setCardRankSelect] = useState('none');
  const [showCardActionDropdown, setShowCardActionDropdown] = useState<'none' | 'mute' | 'ban' | 'rank'>('none');

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => {
      setActionNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Determine current effective user & check dev+ permission
  const activeUser = localUser || initialCurrentUser;
  const activeRank = useMemo(() => {
    if (!activeUser) return null;
    return getUserRank(
      activeUser.username,
      activeUser.email,
      usersMap[sanitizeDbKey(activeUser.username)]?.rank || activeUser.rank || initialUserProfile?.rank
    );
  }, [activeUser, usersMap, initialUserProfile]);

  const isDevPlus = Boolean(
    activeRank && (activeRank.priority >= 90 || activeRank.id === 'developer' || activeRank.id === 'main_developer')
  );

  // Live Firebase Realtime Database listeners
  useEffect(() => {
    const unsubUsers = onValue(
      ref(rtdb, 'users'),
      (snap) => {
        if (snap.exists() && typeof snap.val() === 'object') {
          setUsersMap(snap.val());
        } else {
          setUsersMap({});
        }
        setIsLoadingData(false);
      },
      (err) => {
        console.warn('Admin users read error:', err);
        setIsLoadingData(false);
      }
    );

    const unsubMessages = onValue(
      ref(rtdb, 'messages'),
      (snap) => {
        if (snap.exists() && typeof snap.val() === 'object') {
          setMessagesMap(snap.val());
        } else {
          setMessagesMap({});
        }
      },
      (err) => console.warn('Admin messages read error:', err)
    );

    const unsubNews = onValue(
      ref(rtdb, 'users/__system_news__/posts'),
      (snap) => {
        if (snap.exists() && typeof snap.val() === 'object') {
          setNewsPostsMap(snap.val());
        } else {
          setNewsPostsMap({});
        }
      },
      (err) => console.warn('Admin news read error:', err)
    );

    const unsubAudit = onValue(
      ref(rtdb, 'audit_logs'),
      (snap) => {
        if (snap.exists() && typeof snap.val() === 'object') {
          const val = snap.val();
          const items: AuditLogItem[] = Object.entries(val).map(([key, v]: [string, any]) => ({
            id: key,
            type: v.type || 'clear_chat',
            actor: v.actor || 'System',
            actorRank: v.actorRank || null,
            target: v.target || null,
            details: v.details || '',
            category: v.category || (['clear_chat', 'change_rank', 'mute', 'unmute', 'ban', 'unban', 'warn'].includes(v.type) ? 'staff' : 'general'),
            timestamp: typeof v.timestamp === 'number' ? v.timestamp : Date.now()
          }));
          items.sort((a, b) => b.timestamp - a.timestamp);
          setAuditLogsList(items);
        } else {
          setAuditLogsList([]);
        }
      },
      (err) => console.warn('Admin audit logs read error:', err)
    );

    const unsubFilters = onValue(
      ref(rtdb, 'banned_filters'),
      (snap) => {
        if (snap.exists() && typeof snap.val() === 'object') {
          const items: BannedFilterItem[] = Object.entries(snap.val()).map(([key, v]: [string, any]) => ({
            id: key,
            word: v.word || '',
            muteDurationId: v.muteDurationId || '1h',
            muteDurationLabel: v.muteDurationLabel || '1 hour',
            muteDurationMs: typeof v.muteDurationMs === 'number' ? v.muteDurationMs : 3600000,
            createdAt: v.createdAt || Date.now(),
            createdBy: v.createdBy || 'System'
          }));
          items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setBannedFiltersList(items);
        } else {
          setBannedFiltersList([]);
        }
      },
      (err) => console.warn('Admin banned filters read error:', err)
    );

    return () => {
      unsubUsers();
      unsubMessages();
      unsubNews();
      unsubAudit();
      unsubFilters();
    };
  }, []);

  // Compute all Dashboard statistics
  const dashboardStats = useMemo(() => {
    const userEntries = Object.entries(usersMap || {}).filter(
      ([key]) => !key.startsWith('__system_')
    );

    const registeredCount = userEntries.length;
    let onlineCount = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let otherGenderCount = 0;
    let mutedCount = 0;
    let bannedCount = 0;
    let totalPmsCount = 0;

    const now = Date.now();

    for (const [, userData] of userEntries) {
      const u = userData as any;
      if (!u || typeof u !== 'object') continue;

      if (u.isOnline) {
        onlineCount++;
      }

      const gender = (u.gender || '').toString().trim().toLowerCase();
      if (gender === 'male' || gender === 'm') {
        maleCount++;
      } else if (gender === 'female' || gender === 'f') {
        femaleCount++;
      } else {
        otherGenderCount++;
      }

      if (u.mutedUntil && Number(u.mutedUntil) > now) {
        mutedCount++;
      }

      if (u.isBanned) {
        bannedCount++;
      }

      if (u.pms && typeof u.pms === 'object') {
        for (const peerData of Object.values(u.pms)) {
          if (peerData && typeof peerData === 'object' && (peerData as any).messages) {
            totalPmsCount += Object.keys((peerData as any).messages).length;
          }
        }
      }
    }

    const estimatedPms = Math.ceil(totalPmsCount / 2);
    const chatLogsCount = Object.keys(messagesMap || {}).length;
    const wallPostsCount = Object.keys(newsPostsMap || {}).length;

    let pollsCount = 0;
    for (const m of Object.values(messagesMap || {})) {
      if (m && typeof m === 'object' && (m as any).poll) {
        pollsCount++;
      }
    }

    return {
      registered: registeredCount,
      online: onlineCount,
      female: femaleCount,
      male: maleCount,
      other: otherGenderCount,
      muted: mutedCount,
      banned: bannedCount,
      chatLogs: chatLogsCount,
      privateLogs: estimatedPms,
      wallPosts: wallPostsCount,
      polls: pollsCount
    };
  }, [usersMap, messagesMap, newsPostsMap]);

  // Derive all member accounts for the MEMBERS tab
  const allMembersList = useMemo(() => {
    const list: any[] = [];
    const now = Date.now();

    for (const [key, val] of Object.entries(usersMap || {})) {
      if (key.startsWith('__system_')) continue;
      const u = val as any;
      if (!u || typeof u !== 'object') continue;

      const isMuted = Boolean(u.mutedUntil && Number(u.mutedUntil) > now);
      const isBanned = Boolean(u.isBanned);
      const rankObj = getUserRank(u.username, u.email, u.rank, u.customRankIcon, u.customRankName);

      list.push({
        key,
        username: u.username || key,
        email: u.email || '',
        avatarUrl: u.avatarUrl || null,
        bannerUrl: u.bannerUrl || null,
        pfpBorderId: u.pfpBorderId || 'pfp-default',
        pfpBorderThickness: u.pfpBorderThickness || 2,
        profileBorderId: u.profileBorderId || 'pb-default',
        profileBorderThickness: u.profileBorderThickness || 2,
        rank: u.rank || 'none',
        rankObj,
        gender: u.gender || 'Rather not say',
        age: u.age || '17',
        relationship: u.relationship || 'Rather not say',
        country: u.country || 'Global',
        language: u.language || 'English',
        bio: u.bio || '',
        mood: u.mood || '',
        isOnline: Boolean(u.isOnline),
        lastSeen: u.lastSeen || null,
        joinedAt: u.createdAt || null,
        isMuted,
        mutedUntil: u.mutedUntil || null,
        muteDuration: u.muteDuration || null,
        muteReason: u.muteReason || null,
        isBanned,
        bannedDuration: u.bannedDuration || null,
        bannedReason: u.bannedReason || null,
        bannedBy: u.bannedBy || null,
        musicTrack: u.musicTrack || null
      });
    }

    list.sort((a, b) => {
      // Sort Online first, then Staff, then alphabetical
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      const aPri = a.rankObj?.priority || 0;
      const bPri = b.rankObj?.priority || 0;
      if (aPri !== bPri) return bPri - aPri;
      return a.username.localeCompare(b.username);
    });

    return list;
  }, [usersMap]);

  // Filtered members for MEMBERS tab
  const filteredMembers = useMemo(() => {
    let list = allMembersList;

    if (memberFilterTab === 'online') {
      list = list.filter((m) => m.isOnline);
    } else if (memberFilterTab === 'staff') {
      list = list.filter((m) => isStaffRank(m.rankObj));
    } else if (memberFilterTab === 'punished') {
      list = list.filter((m) => m.isMuted || m.isBanned);
    }

    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.username.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.country && m.country.toLowerCase().includes(q)) ||
          (m.rank && m.rank.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allMembersList, memberFilterTab, memberSearchQuery]);

  // Currently selected member object for the middle Profile Card
  const selectedMemberData = useMemo(() => {
    if (!selectedMemberKey) return null;
    return allMembersList.find((m) => m.key === selectedMemberKey) || null;
  }, [selectedMemberKey, allMembersList]);

  // Derive all currently muted or banned users for Manage Action
  const punishedUsers = useMemo(() => {
    const list: any[] = [];
    const now = Date.now();

    for (const [key, val] of Object.entries(usersMap || {})) {
      if (key.startsWith('__system_')) continue;
      const u = val as any;
      if (!u || typeof u !== 'object') continue;

      const isMuted = Boolean(u.mutedUntil && Number(u.mutedUntil) > now);
      const isBanned = Boolean(u.isBanned);

      if (isMuted || isBanned) {
        list.push({
          key,
          username: u.username || key,
          avatarUrl: u.avatarUrl || null,
          rank: u.rank || null,
          isMuted,
          mutedUntil: u.mutedUntil || null,
          muteDuration: u.muteDuration || null,
          muteReason: u.muteReason || null,
          isBanned,
          bannedDuration: u.bannedDuration || null,
          bannedReason: u.bannedReason || null,
          bannedBy: u.bannedBy || null,
          lastActionAt: u.lastActionAt || u.bannedAt || null
        });
      }
    }

    return list;
  }, [usersMap]);

  // Filtered punished users
  const filteredPunishedUsers = useMemo(() => {
    let result = punishedUsers;
    if (actionFilter === 'muted') {
      result = result.filter((u) => u.isMuted);
    } else if (actionFilter === 'banned') {
      result = result.filter((u) => u.isBanned);
    }

    if (actionSearch.trim()) {
      const q = actionSearch.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.muteReason && u.muteReason.toLowerCase().includes(q)) ||
          (u.bannedReason && u.bannedReason.toLowerCase().includes(q))
      );
    }

    return result;
  }, [punishedUsers, actionFilter, actionSearch]);

  // Filtered Banned Filters
  const filteredBannedFilters = useMemo(() => {
    if (!filterSearchQuery.trim()) return bannedFiltersList;
    const q = filterSearchQuery.trim().toLowerCase();
    return bannedFiltersList.filter(
      (f) =>
        f.word.toLowerCase().includes(q) ||
        f.muteDurationLabel.toLowerCase().includes(q)
    );
  }, [bannedFiltersList, filterSearchQuery]);

  // Combined Console Logs
  const combinedConsoleLogs = useMemo(() => {
    const historicalItems: AuditLogItem[] = [];

    for (const [msgId, val] of Object.entries(messagesMap || {})) {
      const m = val as any;
      if (!m || typeof m !== 'object') continue;

      const msgTime = typeof m.createdAt === 'number' ? m.createdAt : Date.now();

      if (m.isSystem && m.systemType) {
        const isStaff = ['clear', 'mute', 'unmute', 'ban', 'unban', 'warn'].includes(m.systemType);
        historicalItems.push({
          id: `hist-${msgId}`,
          type:
            m.systemType === 'clear'
              ? 'clear_chat'
              : m.systemType === 'mute'
              ? 'mute'
              : m.systemType === 'unmute'
              ? 'unmute'
              : m.systemType === 'ban'
              ? 'ban'
              : m.systemType === 'unban'
              ? 'unban'
              : m.systemType === 'warn'
              ? 'warn'
              : m.systemType === 'join'
              ? 'user_register'
              : 'user_rename',
          actor: m.targetUsername || m.sender || 'Staff',
          actorRank: null,
          target: m.targetUsername || null,
          details: m.text || `System action: ${m.systemType}`,
          category: isStaff ? 'staff' : 'general',
          timestamp: msgTime
        });
      } else if (m.poll) {
        historicalItems.push({
          id: `poll-${msgId}`,
          type: 'create_poll',
          actor: m.sender || 'User',
          actorRank: m.rank || null,
          target: null,
          details: `${m.sender || 'User'} created poll: "${m.poll.question || 'Untitled poll'}"`,
          category: 'general',
          timestamp: msgTime
        });
      }
    }

    const combined = [...auditLogsList];
    const seenSignatures = new Set(
      auditLogsList.map((l) => `${l.type}_${l.actor}_${l.details.slice(0, 30)}`)
    );

    for (const h of historicalItems) {
      const sig = `${h.type}_${h.actor}_${h.details.slice(0, 30)}`;
      if (!seenSignatures.has(sig)) {
        combined.push(h);
        seenSignatures.add(sig);
      }
    }

    combined.sort((a, b) => b.timestamp - a.timestamp);
    return combined;
  }, [auditLogsList, messagesMap]);

  // Filtered Console Logs
  const filteredConsoleLogs = useMemo(() => {
    let logs = combinedConsoleLogs;

    if (logCategoryFilter === 'staff') {
      logs = logs.filter((l) => l.category === 'staff');
    }

    if (logSearchQuery.trim()) {
      const q = logSearchQuery.trim().toLowerCase();
      logs = logs.filter(
        (l) =>
          l.actor.toLowerCase().includes(q) ||
          (l.target && l.target.toLowerCase().includes(q)) ||
          l.details.toLowerCase().includes(q) ||
          l.type.toLowerCase().includes(q)
      );
    }

    return logs;
  }, [combinedConsoleLogs, logCategoryFilter, logSearchQuery]);

  // -------------------------------------------------------------
  // Filter Management Functions
  // -------------------------------------------------------------
  const handleAddBannedFilter = async (customWord?: string, customDurId?: string) => {
    const rawWord = (customWord !== undefined ? customWord : newFilterWord).trim();
    if (!rawWord) {
      showNotification('Please enter a word, URL, or extension to ban', 'error');
      return;
    }

    const durId = customDurId || newFilterDurationId;
    const durObj = FILTER_MUTE_DURATIONS.find((d) => d.id === durId) || FILTER_MUTE_DURATIONS[2];

    setIsAddingFilter(true);
    try {
      const cleanKey = rawWord.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const filterId = `filter_${cleanKey}_${Date.now()}`;

      await set(ref(rtdb, `banned_filters/${filterId}`), {
        word: rawWord,
        muteDurationId: durObj.id,
        muteDurationLabel: durObj.label,
        muteDurationMs: durObj.ms,
        createdAt: Date.now(),
        createdBy: activeUser?.username || 'Developer'
      });

      // Record in audit log
      await push(ref(rtdb, 'audit_logs'), {
        type: 'change_rank',
        actor: activeUser?.username || 'Developer',
        actorRank: activeRank?.name || 'Developer',
        target: rawWord,
        details: `${activeUser?.username || 'Developer'} added banned filter "${rawWord}" (Auto-mute: ${durObj.label})`,
        category: 'staff',
        timestamp: Date.now()
      });

      if (!customWord) {
        setNewFilterWord('');
      }
      showNotification(`Added banned filter for "${rawWord}" with ${durObj.label} mute penalty`, 'success');
    } catch (err: any) {
      showNotification(`Failed to save filter: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsAddingFilter(false);
    }
  };

  const handleDeleteBannedFilter = async (filterItem: BannedFilterItem) => {
    try {
      await remove(ref(rtdb, `banned_filters/${filterItem.id}`));

      await push(ref(rtdb, 'audit_logs'), {
        type: 'change_rank',
        actor: activeUser?.username || 'Developer',
        actorRank: activeRank?.name || 'Developer',
        target: filterItem.word,
        details: `${activeUser?.username || 'Developer'} removed banned filter "${filterItem.word}"`,
        category: 'staff',
        timestamp: Date.now()
      });

      showNotification(`Removed filter "${filterItem.word}"`, 'success');
    } catch (err: any) {
      showNotification(`Failed to remove filter: ${err?.message || 'Error'}`, 'error');
    }
  };

  // -------------------------------------------------------------
  // Moderation Handlers (from Profile Card or Manage Action)
  // -------------------------------------------------------------
  const handleAdminUnmute = async (username: string) => {
    if (!username) return;
    try {
      if (onUnmuteUser) {
        await onUnmuteUser(username);
      } else {
        const targetKey = sanitizeDbKey(username);
        await update(ref(rtdb, `users/${targetKey}`), {
          mutedUntil: null,
          muteDuration: null,
          muteReason: null,
          muteNotificationId: null,
          lastActionAt: Date.now(),
          updatedAt: serverTimestamp()
        });

        await push(ref(rtdb, 'audit_logs'), {
          type: 'unmute',
          actor: activeUser?.username || 'Developer',
          actorRank: activeRank?.name || 'Developer',
          target: username,
          details: `${activeUser?.username || 'Developer'} unmuted ${username}`,
          category: 'staff',
          timestamp: Date.now()
        });

        await push(ref(rtdb, 'messages'), {
          sender: SYSTEM_BOT_USERNAME,
          senderKey: 'system_bot',
          avatarUrl: SYSTEM_BOT_AVATAR,
          text: `${username} has been unmuted!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: serverTimestamp(),
          isSystem: true,
          systemType: 'unmute',
          targetUsername: username
        });
      }

      showNotification(`Successfully unmuted ${username}`, 'success');
    } catch (err: any) {
      showNotification(`Failed to unmute: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleAdminMuteMember = async (username: string, durationId: string, reason?: string) => {
    if (!username) return;
    const dur = FILTER_MUTE_DURATIONS.find((d) => d.id === durationId) || FILTER_MUTE_DURATIONS[2];
    const mutedUntil = Date.now() + dur.ms;
    const targetKey = sanitizeDbKey(username);
    const cleanReason = (reason || '').trim();

    try {
      await update(ref(rtdb, `users/${targetKey}`), {
        mutedUntil,
        muteDuration: dur.label,
        muteReason: cleanReason || 'Staff moderation',
        lastActionAt: Date.now(),
        updatedAt: serverTimestamp()
      });

      await push(ref(rtdb, `users/${targetKey}/notifications`), {
        type: 'mute',
        fromUsername: SYSTEM_BOT_USERNAME,
        fromAvatarUrl: SYSTEM_BOT_AVATAR,
        text: cleanReason
          ? `You have been muted for ${dur.label} (${cleanReason})`
          : `You have been muted for ${dur.label}`,
        createdAt: Date.now(),
        read: false
      });

      await push(ref(rtdb, 'audit_logs'), {
        type: 'mute',
        actor: activeUser?.username || 'Developer',
        actorRank: activeRank?.name || 'Developer',
        target: username,
        details: `${activeUser?.username || 'Developer'} muted ${username} for ${dur.label}${cleanReason ? `: ${cleanReason}` : ''}`,
        category: 'staff',
        timestamp: Date.now()
      });

      await push(ref(rtdb, 'messages'), {
        sender: SYSTEM_BOT_USERNAME,
        senderKey: 'system_bot',
        avatarUrl: SYSTEM_BOT_AVATAR,
        text: `${username} has been muted!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
        isSystem: true,
        systemType: 'mute',
        targetUsername: username
      });

      setShowCardActionDropdown('none');
      setCardMuteReason('');
      showNotification(`Muted ${username} for ${dur.label}`, 'success');
    } catch (err: any) {
      showNotification(`Failed to mute user: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleAdminUnban = async (username: string) => {
    if (!username) return;
    try {
      if (onUnbanUser) {
        await onUnbanUser(username);
      } else {
        const targetKey = sanitizeDbKey(username);
        const targetSnap = await get(ref(rtdb, `users/${targetKey}`));
        const targetVal = targetSnap.val() || {};
        const targetFp = targetVal.deviceFingerprint;

        await update(ref(rtdb, `users/${targetKey}`), {
          isBanned: false,
          bannedUntil: null,
          bannedDuration: null,
          bannedReason: null,
          bannedAt: null,
          bannedBy: null,
          lastActionAt: Date.now(),
          updatedAt: serverTimestamp()
        });

        if (targetFp) {
          await remove(ref(rtdb, `banned_devices/${targetFp}`)).catch(() => {});
        }

        await push(ref(rtdb, 'audit_logs'), {
          type: 'unban',
          actor: activeUser?.username || 'Developer',
          actorRank: activeRank?.name || 'Developer',
          target: username,
          details: `${activeUser?.username || 'Developer'} unbanned ${username}`,
          category: 'staff',
          timestamp: Date.now()
        });

        await push(ref(rtdb, 'messages'), {
          sender: SYSTEM_BOT_USERNAME,
          senderKey: 'system_bot',
          avatarUrl: SYSTEM_BOT_AVATAR,
          text: `${username} has been unbanned!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: serverTimestamp(),
          isSystem: true,
          systemType: 'unban',
          targetUsername: username
        });
      }

      showNotification(`Successfully unbanned ${username}`, 'success');
    } catch (err: any) {
      showNotification(`Failed to unban: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleAdminBanMember = async (username: string, durationLabel: string, reason?: string) => {
    if (!username) return;
    const targetKey = sanitizeDbKey(username);
    const cleanReason = (reason || '').trim();

    try {
      await update(ref(rtdb, `users/${targetKey}`), {
        isBanned: true,
        bannedUntil: -1,
        bannedDuration: durationLabel,
        bannedReason: cleanReason || 'Violation of community rules',
        bannedAt: Date.now(),
        bannedBy: activeUser?.username || 'Developer',
        isOnline: false,
        lastActionAt: Date.now(),
        updatedAt: serverTimestamp()
      });

      await push(ref(rtdb, `users/${targetKey}/notifications`), {
        type: 'ban',
        fromUsername: SYSTEM_BOT_USERNAME,
        fromAvatarUrl: SYSTEM_BOT_AVATAR,
        text: cleanReason
          ? `You have been banned (${cleanReason})`
          : `You have been banned from Teenverse`,
        createdAt: Date.now(),
        read: false
      });

      await push(ref(rtdb, 'audit_logs'), {
        type: 'ban',
        actor: activeUser?.username || 'Developer',
        actorRank: activeRank?.name || 'Developer',
        target: username,
        details: `${activeUser?.username || 'Developer'} banned ${username}${cleanReason ? `: ${cleanReason}` : ''}`,
        category: 'staff',
        timestamp: Date.now()
      });

      await push(ref(rtdb, 'messages'), {
        sender: SYSTEM_BOT_USERNAME,
        senderKey: 'system_bot',
        avatarUrl: SYSTEM_BOT_AVATAR,
        text: `${username} has been banned!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
        isSystem: true,
        systemType: 'ban',
        targetUsername: username
      });

      setShowCardActionDropdown('none');
      setCardBanReason('');
      showNotification(`Banned ${username}`, 'success');
    } catch (err: any) {
      showNotification(`Failed to ban user: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleAdminChangeMemberRank = async (username: string, newRankId: string) => {
    if (!username) return;
    const targetKey = sanitizeDbKey(username);
    const rankObj = ASSIGNABLE_RANKS.find((r) => r.id === newRankId) || ASSIGNABLE_RANKS[0];

    try {
      await update(ref(rtdb, `users/${targetKey}`), {
        rank: newRankId === 'none' ? null : newRankId,
        rankUpdatedAt: Date.now(),
        updatedAt: serverTimestamp()
      });

      await push(ref(rtdb, `users/${targetKey}/notifications`), {
        type: 'rank_change',
        fromUsername: SYSTEM_BOT_USERNAME,
        fromAvatarUrl: SYSTEM_BOT_AVATAR,
        text: `Your rank has been updated to ${rankObj.name}`,
        createdAt: Date.now(),
        read: false
      });

      await push(ref(rtdb, 'audit_logs'), {
        type: 'change_rank',
        actor: activeUser?.username || 'Developer',
        actorRank: activeRank?.name || 'Developer',
        target: username,
        details: `${activeUser?.username || 'Developer'} changed ${username}'s rank to ${rankObj.name}`,
        category: 'staff',
        timestamp: Date.now()
      });

      setShowCardActionDropdown('none');
      showNotification(`Changed ${username}'s rank to ${rankObj.name}`, 'success');
    } catch (err: any) {
      showNotification(`Failed to change rank: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Developer direct login on /admin page if session was not found
  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!devLoginUser.trim() || !devLoginPass.trim()) {
      setLoginError('Please enter username and password');
      return;
    }

    setIsLoggingIn(true);
    try {
      const cleanUser = devLoginUser.trim().toLowerCase();
      const userKey = sanitizeDbKey(cleanUser);
      const userSnap = await get(ref(rtdb, `users/${userKey}`));

      if (!userSnap.exists()) {
        setLoginError('Account not found');
        setIsLoggingIn(false);
        return;
      }

      const data = userSnap.val();
      const enteredHash = await hashPassword(devLoginPass);

      if (data.passwordHash !== enteredHash) {
        setLoginError('Invalid password');
        setIsLoggingIn(false);
        return;
      }

      const rank = getUserRank(data.username, data.email, data.rank);
      if (!rank || (rank.priority < 90 && rank.id !== 'developer' && rank.id !== 'main_developer')) {
        setLoginError('Access denied: Developer privileges (Dev+) required');
        setIsLoggingIn(false);
        return;
      }

      const loggedUser = {
        username: data.username,
        email: data.email,
        rank: data.rank || rank.id
      };
      setLocalUser(loggedUser);
      localStorage.setItem('chat_community_user', JSON.stringify(loggedUser));
      showNotification(`Welcome to Admin Panel, ${data.username}`, 'success');
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Render Access Denied / Developer Sign-in if not authorized
  if (!isDevPlus) {
    return (
      <div className="min-h-screen bg-[#0e0f12] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#16171b] border border-[#262832] rounded-xl p-8 shadow-2xl">
          <div className="flex items-center justify-center w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full mx-auto mb-5 text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-center text-white mb-2">Teenverse Admin Portal</h1>
          <p className="text-zinc-400 text-sm text-center mb-6">
            Developer authorization (Dev+) is required to access the administrative dashboard.
          </p>

          {loginError && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleDevLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Developer Username</label>
              <input
                type="text"
                value={devLoginUser}
                onChange={(e) => setDevLoginUser(e.target.value)}
                placeholder="e.g. org or null"
                className="w-full px-3.5 py-2.5 bg-[#0e0f12] border border-[#2b2d38] rounded-lg text-white text-sm focus:outline-none focus:border-[#00a8e8] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
              <input
                type="password"
                value={devLoginPass}
                onChange={(e) => setDevLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[#0e0f12] border border-[#2b2d38] rounded-lg text-white text-sm focus:outline-none focus:border-[#00a8e8] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 px-4 bg-[#00a8e8] hover:bg-[#0092ca] text-white font-medium text-sm rounded-lg transition-colors cursor-pointer shadow flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Log In as Developer</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#23252f] text-center">
            <button
              onClick={onBackToChat}
              className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Teenverse Chat</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111215] text-white flex flex-col md:flex-row antialiased selection:bg-[#00a8e8] selection:text-white">
      {/* Toast Notice Banner */}
      {actionNotice && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border bg-[#1a1c22] border-[#2b2d38] text-white text-sm transition-all animate-in fade-in slide-in-from-top-3">
          {actionNotice.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* LEFT SIDEBAR (Identical Dark Aesthetic with Cyan Accent) */}
      {/* ======================================================== */}
      <aside className="w-full md:w-64 bg-[#0d0e11] border-b md:border-b-0 md:border-r border-[#1e2029] flex flex-col shrink-0 select-none">
        {/* Sidebar Header */}
        <div className="px-5 py-4 border-b border-[#1c1d26] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-5 h-5 text-[#00a8e8]" />
            <span className="font-semibold text-white tracking-wide text-base">Dashboard</span>
          </div>

          <button
            onClick={onBackToChat}
            title="Return to Teenverse Chat"
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto">
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer text-left ${
              activeTab === 'dashboard'
                ? 'text-[#00a8e8] bg-[#00a8e8]/10'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-[#00a8e8]' : 'text-zinc-400'}`} />
            <span>Dashboard</span>
          </button>

          {/* 2. Members (Working!) */}
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer text-left ${
              activeTab === 'members'
                ? 'text-[#00a8e8] bg-[#00a8e8]/10'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className={`w-4 h-4 shrink-0 ${activeTab === 'members' ? 'text-[#00a8e8]' : 'text-zinc-400'}`} />
            <span className="flex-1">Members</span>
            <span className="text-[11px] text-zinc-500 font-semibold px-1.5 py-0.2 rounded bg-white/5">
              {allMembersList.length}
            </span>
          </button>

          {/* 3. Manage Action (Working!) */}
          <button
            type="button"
            onClick={() => setActiveTab('manage_action')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer text-left ${
              activeTab === 'manage_action'
                ? 'text-[#00a8e8] bg-[#00a8e8]/10'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className={`w-4 h-4 shrink-0 ${activeTab === 'manage_action' ? 'text-[#00a8e8]' : 'text-zinc-400'}`} />
            <span className="flex-1">Manage action</span>
            {punishedUsers.length > 0 && (
              <span className="bg-red-500/80 text-white text-[11px] font-semibold px-1.5 py-0.2 rounded-full">
                {punishedUsers.length}
              </span>
            )}
          </button>

          {/* 4. Filters (Working!) */}
          <button
            type="button"
            onClick={() => setActiveTab('filters')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer text-left ${
              activeTab === 'filters'
                ? 'text-[#00a8e8] bg-[#00a8e8]/10'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Filter className={`w-4 h-4 shrink-0 ${activeTab === 'filters' ? 'text-[#00a8e8]' : 'text-zinc-400'}`} />
            <span className="flex-1">Filters</span>
            {bannedFiltersList.length > 0 && (
              <span className="text-[11px] text-cyan-400 font-semibold px-1.5 py-0.2 rounded bg-[#00a8e8]/15">
                {bannedFiltersList.length}
              </span>
            )}
          </button>

          {/* 5. Console Logs (Working!) */}
          <button
            type="button"
            onClick={() => setActiveTab('console_logs')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer text-left ${
              activeTab === 'console_logs'
                ? 'text-[#00a8e8] bg-[#00a8e8]/10'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal className={`w-4 h-4 shrink-0 ${activeTab === 'console_logs' ? 'text-[#00a8e8]' : 'text-zinc-400'}`} />
            <span>Console logs</span>
          </button>

          {/* ======================================================== */}
          {/* COMING SOON DROPDOWN ACCORDION                           */}
          {/* ======================================================== */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setComingSoonOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 rounded hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Coming soon</span>
              </span>
              {comingSoonOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>

            {comingSoonOpen && (
              <div className="mt-1 pl-2 space-y-0.5 border-l border-[#21232d] ml-3.5 animate-in fade-in duration-150">
                {/* System settings */}
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 rounded cursor-not-allowed text-left opacity-70 hover:opacity-100 transition-opacity"
                  title="Coming soon"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-500" />
                  <span>System settings</span>
                </button>

                {/* Permissions */}
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 rounded cursor-not-allowed text-left opacity-70 hover:opacity-100 transition-opacity"
                  title="Coming soon"
                >
                  <Star className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Permissions</span>
                </button>

                {/* Modules */}
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 rounded cursor-not-allowed text-left opacity-70 hover:opacity-100 transition-opacity"
                  title="Coming soon"
                >
                  <Boxes className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Modules</span>
                </button>

                {/* Banned IPs */}
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 rounded cursor-not-allowed text-left opacity-70 hover:opacity-100 transition-opacity"
                  title="Coming soon"
                >
                  <Ban className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Banned IPs</span>
                </button>

                {/* Rooms */}
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 rounded cursor-not-allowed text-left opacity-70 hover:opacity-100 transition-opacity"
                  title="Coming soon"
                >
                  <Home className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Rooms</span>
                </button>

                {/* Custom Addon Maker */}
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 rounded cursor-not-allowed text-left opacity-70 hover:opacity-100 transition-opacity"
                  title="Custom Addon Maker (Coming soon)"
                >
                  <Puzzle className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Custom Addon Maker</span>
                </button>

                {/* Addons */}
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 rounded cursor-not-allowed text-left opacity-70 hover:opacity-100 transition-opacity"
                  title="Coming soon"
                >
                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Addons</span>
                </button>

                {/* System tools */}
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 rounded cursor-not-allowed text-left opacity-70 hover:opacity-100 transition-opacity"
                  title="Coming soon"
                >
                  <Wrench className="w-3.5 h-3.5 text-zinc-500" />
                  <span>System tools</span>
                </button>

                {/* Music players */}
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 rounded cursor-not-allowed text-left opacity-70 hover:opacity-100 transition-opacity"
                  title="Coming soon"
                >
                  <Music className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Music player</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#1c1d26] bg-[#0a0b0e] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#1b1d25] border border-white/10 flex items-center justify-center font-bold text-xs text-[#00a8e8] shrink-0">
              {activeUser?.username?.slice(0, 2).toUpperCase() || 'DV'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{activeUser?.username || 'Developer'}</p>
              <div className="flex items-center gap-1.5">
                {activeRank?.icon && (
                  <img src={activeRank.icon} alt="" className="w-3.5 h-3.5 object-contain" />
                )}
                <span className="text-[11px] text-zinc-400 truncate">{activeRank?.name || 'Developer'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onBackToChat}
            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Return to Teenverse Chat"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA                                        */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
        {/* Top Header Bar with Breadcrumb */}
        <header className="px-6 py-4 border-b border-[#1c1d26] bg-[#141519] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400 font-normal">
              {activeTab === 'dashboard'
                ? '> Dashboard'
                : activeTab === 'members'
                ? '> Members'
                : activeTab === 'manage_action'
                ? '> Manage action'
                : activeTab === 'filters'
                ? '> Filters'
                : '> Console logs'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                showNotification('Synchronizing data with Firebase RTDB...', 'success');
              }}
              title="Refresh Realtime Data"
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1d1f27] hover:bg-[#252732] border border-white/5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-[#00a8e8]' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={onBackToChat}
              className="text-xs font-medium text-white bg-[#00a8e8] hover:bg-[#0094ce] px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 shadow"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Chat</span>
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 p-6">
          {/* ======================================================== */}
          {/* TAB 1: DASHBOARD                                         */}
          {/* ======================================================== */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Registered Users */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <Users className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Registered</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.registered}
                    </span>
                  </div>
                </div>

                {/* 2. Online Users */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <UserCheck className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Online</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.online}
                    </span>
                  </div>
                </div>

                {/* 3. Female Users */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <UserIcon className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Female</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.female}
                    </span>
                  </div>
                </div>

                {/* 4. Male Users */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <UserIcon className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Male</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.male}
                    </span>
                  </div>
                </div>

                {/* 5. Muted Users */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <MicOff className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Muted</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.muted}
                    </span>
                  </div>
                </div>

                {/* 6. Banned Users */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <Ban className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Banned</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.banned}
                    </span>
                  </div>
                </div>

                {/* 7. Chat Logs */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Chat logs</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.chatLogs}
                    </span>
                  </div>
                </div>

                {/* 8. Private Logs (PMs) */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <Mail className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Private logs</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.privateLogs}
                    </span>
                  </div>
                </div>

                {/* 9. Wall Post / News */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <Rss className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Wall post</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.wallPosts}
                    </span>
                  </div>
                </div>

                {/* 10. Other Gender */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Other gender</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.other}
                    </span>
                  </div>
                </div>

                {/* 11. Polls Created */}
                <div className="bg-[#16171b] border border-[#23252d] rounded-md flex items-stretch overflow-hidden shadow-sm">
                  <div className="bg-[#00a8e8] w-14 sm:w-16 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                  </div>
                  <div className="px-4 py-3 flex flex-col justify-center min-w-0">
                    <span className="text-zinc-300 text-xs sm:text-sm font-medium">Polls</span>
                    <span className="text-white text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">
                      {dashboardStats.polls}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MEMBERS (Shows all users, profile in middle)      */}
          {/* ======================================================== */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#16171b] p-3.5 rounded-lg border border-[#23252d]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setMemberFilterTab('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      memberFilterTab === 'all'
                        ? 'bg-[#00a8e8] text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    All ({allMembersList.length})
                  </button>
                  <button
                    onClick={() => setMemberFilterTab('online')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      memberFilterTab === 'online'
                        ? 'bg-[#00a8e8] text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Online ({allMembersList.filter((m) => m.isOnline).length})
                  </button>
                  <button
                    onClick={() => setMemberFilterTab('staff')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      memberFilterTab === 'staff'
                        ? 'bg-[#00a8e8] text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Staff ({allMembersList.filter((m) => isStaffRank(m.rankObj)).length})
                  </button>
                  <button
                    onClick={() => setMemberFilterTab('punished')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      memberFilterTab === 'punished'
                        ? 'bg-[#00a8e8] text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Punished ({allMembersList.filter((m) => m.isMuted || m.isBanned).length})
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search username, email, country..."
                    className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-[#0e0f12] border border-[#2a2c36] rounded text-white focus:outline-none focus:border-[#00a8e8]"
                  />
                </div>
              </div>

              {/* Members Grid */}
              {filteredMembers.length === 0 ? (
                <div className="bg-[#16171b] border border-[#23252d] rounded-lg p-12 text-center">
                  <Users className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">No members found matching your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMembers.map((member) => {
                    const pfpBorder = getPfpBorder(member.pfpBorderId);
                    return (
                      <div
                        key={member.key}
                        onClick={() => {
                          setSelectedMemberKey(member.key);
                          setCardRankSelect(member.rank || 'none');
                          setShowCardActionDropdown('none');
                        }}
                        className="bg-[#16171b] border border-[#23252d] hover:border-[#00a8e8]/50 rounded-lg p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-[#1a1c22] group shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar with ring */}
                          <div
                            className={`w-11 h-11 rounded-full overflow-hidden bg-[#24252e] shrink-0 relative ${
                              pfpBorder.pfpBorderClass || ''
                            }`}
                            style={{ borderWidth: `${member.pfpBorderThickness || 2}px` }}
                          >
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs text-zinc-400">
                                {member.username.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            {/* Online dot */}
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${
                                member.isOnline ? 'bg-emerald-400' : 'bg-zinc-500'
                              }`}
                            />
                          </div>

                          {/* Member info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white text-sm truncate group-hover:text-[#00a8e8] transition-colors">
                                {member.username}
                              </span>
                              {member.rankObj?.icon && (
                                <img
                                  src={member.rankObj.icon}
                                  alt=""
                                  className="w-3.5 h-3.5 object-contain shrink-0"
                                />
                              )}
                            </div>

                            <p className="text-xs text-zinc-400 truncate">
                              {member.gender} · {member.age} yrs · {member.country}
                            </p>

                            <div className="flex items-center gap-1.5 mt-1">
                              {member.isBanned && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
                                  Banned
                                </span>
                              )}
                              {member.isMuted && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                                  Muted
                                </span>
                              )}
                              {member.rankObj && member.rankObj.id !== 'none' && (
                                <span className="px-1.5 py-0.2 text-[9px] font-medium rounded bg-blue-500/15 text-blue-300 border border-blue-500/20 truncate max-w-[120px]">
                                  {member.rankObj.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="text-xs text-[#00a8e8] opacity-0 group-hover:opacity-100 transition-opacity font-medium shrink-0">
                          View &rarr;
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MANAGE ACTION (Punished Users)                    */}
          {/* ======================================================== */}
          {activeTab === 'manage_action' && (
            <div className="space-y-4">
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#16171b] p-3.5 rounded-lg border border-[#23252d]">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActionFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      actionFilter === 'all'
                        ? 'bg-[#00a8e8] text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    All Punished ({punishedUsers.length})
                  </button>
                  <button
                    onClick={() => setActionFilter('muted')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      actionFilter === 'muted'
                        ? 'bg-[#00a8e8] text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Muted ({punishedUsers.filter((u) => u.isMuted).length})
                  </button>
                  <button
                    onClick={() => setActionFilter('banned')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      actionFilter === 'banned'
                        ? 'bg-[#00a8e8] text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Banned ({punishedUsers.filter((u) => u.isBanned).length})
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={actionSearch}
                    onChange={(e) => setActionSearch(e.target.value)}
                    placeholder="Search username or reason..."
                    className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-[#0e0f12] border border-[#2a2c36] rounded text-white focus:outline-none focus:border-[#00a8e8]"
                  />
                </div>
              </div>

              {/* Punished Users List */}
              {filteredPunishedUsers.length === 0 ? (
                <div className="bg-[#16171b] border border-[#23252d] rounded-lg p-12 text-center">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-white text-base font-semibold mb-1">
                    No people that are muted or banned.
                  </h3>
                  <p className="text-zinc-400 text-xs max-w-sm mx-auto">
                    All users are currently in good standing. Punished accounts will appear here automatically with one-click unmute and unban options.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredPunishedUsers.map((item) => (
                    <div
                      key={item.key}
                      className="bg-[#16171b] border border-[#23252d] rounded-lg p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-[#2f313c] transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-full bg-[#20222a] border border-white/10 shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-zinc-300">
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/bot.png';
                              }}
                            />
                          ) : (
                            <span>{item.username.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white truncate">{item.username}</span>
                            {item.isBanned && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                Banned
                              </span>
                            )}
                            {item.isMuted && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Muted
                              </span>
                            )}
                          </div>

                          <div className="mt-1 space-y-0.5 text-xs text-zinc-400">
                            {item.isBanned && (
                              <p className="truncate">
                                <span className="text-zinc-500">Ban details:</span> {item.bannedDuration || 'Permanent'}
                                {item.bannedReason ? ` • ${item.bannedReason}` : ''}
                              </p>
                            )}
                            {item.isMuted && (
                              <p className="truncate">
                                <span className="text-zinc-500">Mute details:</span> {item.muteDuration || 'Active'}
                                {item.muteReason ? ` • ${item.muteReason}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#20222a] justify-end">
                        {item.isMuted && (
                          <button
                            type="button"
                            onClick={() => handleAdminUnmute(item.username)}
                            className="px-3 py-1.5 text-xs font-medium rounded bg-[#00a8e8] hover:bg-[#0092ca] text-white transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Unmute</span>
                          </button>
                        )}

                        {item.isBanned && (
                          <button
                            type="button"
                            onClick={() => handleAdminUnban(item.username)}
                            className="px-3 py-1.5 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Unban</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: FILTERS (Banned Words, Extensions & Auto-Mutes)   */}
          {/* ======================================================== */}
          {activeTab === 'filters' && (
            <div className="space-y-5">
              {/* Info banner */}
              <div className="bg-[#16171b] border border-[#23252d] rounded-lg p-4 flex items-start gap-3">
                <Filter className="w-5 h-5 text-[#00a8e8] shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 leading-relaxed">
                  <p className="font-semibold text-white text-sm mb-0.5">Automated Chat Filter & Auto-Mute</p>
                  <p>
                    Configure prohibited words, URLs, or domain extensions (like <code className="bg-[#0e0f12] px-1 py-0.5 rounded text-cyan-300">.com</code>, <code className="bg-[#0e0f12] px-1 py-0.5 rounded text-cyan-300">.co.uk</code>, <code className="bg-[#0e0f12] px-1 py-0.5 rounded text-cyan-300">discord.gg</code>). When any user posts a message containing these terms, the message is blocked and they are immediately muted for the chosen duration. Violations are logged under Staff Logs for follow-up bans.
                  </p>
                </div>
              </div>

              {/* Add Filter Form */}
              <div className="bg-[#16171b] border border-[#23252d] rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#00a8e8]" />
                  <span>Add New Banned Filter</span>
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddBannedFilter();
                  }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
                >
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Banned Word, URL or Extension
                    </label>
                    <input
                      type="text"
                      value={newFilterWord}
                      onChange={(e) => setNewFilterWord(e.target.value)}
                      placeholder="e.g. .com, .co.uk, discord.gg, http"
                      className="w-full px-3 py-2 text-xs bg-[#0e0f12] border border-[#2a2c36] rounded text-white focus:outline-none focus:border-[#00a8e8]"
                    />
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Auto-Mute Penalty
                    </label>
                    <select
                      value={newFilterDurationId}
                      onChange={(e) => setNewFilterDurationId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#0e0f12] border border-[#2a2c36] rounded text-white focus:outline-none focus:border-[#00a8e8] cursor-pointer"
                    >
                      {FILTER_MUTE_DURATIONS.map((dur) => (
                        <option key={dur.id} value={dur.id}>
                          {dur.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingFilter}
                    className="px-4 py-2 bg-[#00a8e8] hover:bg-[#0092ca] text-white text-xs font-medium rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Filter</span>
                  </button>
                </form>

                {/* Quick Add Presets */}
                <div className="mt-4 pt-3 border-t border-[#23252d] flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase">Quick presets:</span>
                  {[
                    { word: '.com', dur: '1h' },
                    { word: '.co.uk', dur: '1h' },
                    { word: '.net', dur: '1h' },
                    { word: '.org', dur: '1h' },
                    { word: 'discord.gg', dur: '6h' },
                    { word: 't.me', dur: '6h' }
                  ].map((preset) => (
                    <button
                      key={preset.word}
                      type="button"
                      onClick={() => handleAddBannedFilter(preset.word, preset.dur)}
                      className="px-2 py-1 rounded bg-[#0e0f12] hover:bg-[#20222b] text-zinc-300 border border-[#2b2d38] text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{preset.word}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    Active Filters ({bannedFiltersList.length})
                  </h3>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={filterSearchQuery}
                      onChange={(e) => setFilterSearchQuery(e.target.value)}
                      placeholder="Search active filters..."
                      className="w-48 pl-8 pr-3 py-1 text-xs bg-[#16171b] border border-[#2a2c36] rounded text-white focus:outline-none focus:border-[#00a8e8]"
                    />
                  </div>
                </div>

                {filteredBannedFilters.length === 0 ? (
                  <div className="bg-[#16171b] border border-[#23252d] rounded-lg p-10 text-center">
                    <Filter className="w-7 h-7 text-zinc-500 mx-auto mb-2" />
                    <p className="text-white text-sm font-medium">No banned filters configured.</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Add banned words, domain extensions (.com, .co.uk), or advertisement links using the form above.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredBannedFilters.map((f) => (
                      <div
                        key={f.id}
                        className="bg-[#16171b] border border-[#23252d] rounded-lg p-3.5 flex items-center justify-between gap-3 shadow-sm hover:border-[#2b2d38] transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm tracking-wide bg-[#0e0f12] px-2 py-0.5 rounded border border-white/5 truncate">
                              {f.word}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#00a8e8]/15 text-[#00a8e8] border border-[#00a8e8]/30">
                              Mute: {f.muteDurationLabel}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteBannedFilter(f)}
                          title="Remove filter"
                          className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: CONSOLE LOGS (Overall vs Staff Logs)               */}
          {/* ======================================================== */}
          {activeTab === 'console_logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#16171b] p-3.5 rounded-lg border border-[#23252d]">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setLogCategoryFilter('overall')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      logCategoryFilter === 'overall'
                        ? 'bg-[#00a8e8] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Overall Logs ({combinedConsoleLogs.length})
                  </button>

                  <button
                    onClick={() => setLogCategoryFilter('staff')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      logCategoryFilter === 'staff'
                        ? 'bg-[#00a8e8] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Staff Logs ({combinedConsoleLogs.filter((l) => l.category === 'staff').length})
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Search logs by user, action, details..."
                    className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-[#0e0f12] border border-[#2a2c36] rounded text-white focus:outline-none focus:border-[#00a8e8]"
                  />
                </div>
              </div>

              <div className="text-xs text-zinc-400 px-1 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#00a8e8]" />
                <span>
                  {logCategoryFilter === 'staff'
                    ? 'Showing staff moderation & auto-filter alerts: /clear chat, filter triggers, rank updates, mutes, unbans, and warnings.'
                    : 'Showing comprehensive audit logs: message deletions, poll creations, filter events, staff actions, and registrations.'}
                </span>
              </div>

              {filteredConsoleLogs.length === 0 ? (
                <div className="bg-[#16171b] border border-[#23252d] rounded-lg p-12 text-center">
                  <Terminal className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">No console logs found.</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {logSearchQuery.trim()
                      ? 'Try clearing your search query.'
                      : 'Activity will automatically log here in real-time as users and staff interact.'}
                  </p>
                </div>
              ) : (
                <div className="bg-[#141519] border border-[#23252d] rounded-lg overflow-hidden divide-y divide-[#1e2029]">
                  {filteredConsoleLogs.map((log) => {
                    const dateObj = new Date(log.timestamp);
                    const formattedTime = dateObj.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });
                    const formattedDate = dateObj.toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric'
                    });

                    let badgeBg = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
                    let badgeLabel = log.type.toUpperCase();

                    if (log.type === 'clear_chat') {
                      badgeBg = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                      badgeLabel = 'CLEAR CHAT';
                    } else if (log.type === 'ban') {
                      badgeBg = 'bg-red-500/20 text-red-400 border-red-500/30';
                      badgeLabel = 'BAN';
                    } else if (log.type === 'mute') {
                      badgeBg = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                      badgeLabel = 'MUTE';
                    } else if (log.type === 'unban' || log.type === 'unmute') {
                      badgeBg = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                      badgeLabel = log.type.toUpperCase();
                    } else if (log.type === 'delete_message') {
                      badgeBg = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
                      badgeLabel = 'DELETE MSG';
                    } else if (log.type === 'create_poll') {
                      badgeBg = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
                      badgeLabel = 'POLL';
                    } else if (log.type === 'change_rank') {
                      badgeBg = 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
                      badgeLabel = 'RANK UPDATE';
                    }

                    return (
                      <div
                        key={log.id}
                        className="px-4 py-3 flex items-start sm:items-center justify-between gap-3 text-xs hover:bg-[#181a20] transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className="text-zinc-500 font-mono text-[11px] shrink-0 w-24">
                            <span>{formattedDate} </span>
                            <span className="text-zinc-400">{formattedTime}</span>
                          </div>

                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border shrink-0 uppercase tracking-wide ${badgeBg}`}
                          >
                            {badgeLabel}
                          </span>

                          <div className="min-w-0">
                            <span className="text-zinc-200 font-medium">{log.details}</span>
                            {log.actorRank && (
                              <span className="ml-2 text-[10px] text-zinc-500">[{log.actorRank}]</span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                          {log.category === 'staff' ? (
                            <span className="text-amber-500/80 font-bold">STAFF</span>
                          ) : (
                            <span>GENERAL</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* CENTERED PROFILE CARD MODAL FOR SELECTED MEMBER          */}
        {/* ======================================================== */}
        {selectedMemberData && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedMemberKey(null);
                setShowCardActionDropdown('none');
              }
            }}
          >
            <div className="w-full max-w-[440px] bg-[#141419] border border-[#282834] rounded-2xl shadow-2xl overflow-hidden relative flex flex-col text-white animate-in zoom-in-95 duration-150">
              {/* Close Button Top Right */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMemberKey(null);
                  setShowCardActionDropdown('none');
                }}
                className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Profile Card Banner Top Section */}
              <div className="relative w-full overflow-hidden flex flex-col items-center pt-6 pb-4 px-4 text-center shrink-0">
                {/* Banner background */}
                {selectedMemberData.bannerUrl ? (
                  <img
                    src={selectedMemberData.bannerUrl}
                    alt="Banner"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#2a2b38] via-[#1b1c24] to-[#141419]" />
                )}

                {/* Scrim Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/40 to-black/85 pointer-events-none" />

                {/* Avatar with custom ring */}
                <div
                  className={`w-20 h-20 rounded-full overflow-hidden bg-[#24252e] shadow-2xl relative shrink-0 z-10 transition-all ${
                    getPfpBorder(selectedMemberData.pfpBorderId).pfpBorderClass || ''
                  }`}
                  style={{ borderWidth: `${selectedMemberData.pfpBorderThickness || 2}px` }}
                >
                  {selectedMemberData.avatarUrl ? (
                    <img
                      src={selectedMemberData.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-lg text-zinc-300">
                      {selectedMemberData.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User Details over Banner */}
                <div className="relative z-10 mt-2.5 flex flex-col items-center max-w-full px-2">
                  {selectedMemberData.rankObj && (
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      {selectedMemberData.rankObj.icon && (
                        <img
                          src={selectedMemberData.rankObj.icon}
                          alt=""
                          className="w-4 h-4 object-contain shrink-0"
                        />
                      )}
                      <span className="text-xs font-bold text-white drop-shadow-md">
                        {selectedMemberData.rankObj.name}
                      </span>
                    </div>
                  )}

                  <h3 className="font-extrabold text-white text-lg tracking-wide drop-shadow-md truncate flex items-center gap-1.5">
                    <span>{selectedMemberData.username}</span>
                  </h3>

                  <p className="text-xs text-zinc-300 font-medium mt-0.5 drop-shadow-sm truncate">
                    {selectedMemberData.age} years · {selectedMemberData.gender} · {selectedMemberData.country}
                  </p>
                </div>
              </div>

              {/* Bio & Details Section */}
              <div className="px-5 py-3 space-y-2.5 text-xs text-zinc-300 bg-[#121217] border-t border-[#23232c]">
                {selectedMemberData.mood && (
                  <div className="flex items-center gap-2 text-cyan-300 bg-cyan-950/30 px-2.5 py-1.5 rounded-lg border border-cyan-800/30">
                    <Smile className="w-3.5 h-3.5 shrink-0" />
                    <span className="italic truncate">&ldquo;{selectedMemberData.mood}&rdquo;</span>
                  </div>
                )}

                {selectedMemberData.bio && (
                  <p className="text-zinc-300 leading-relaxed max-h-20 overflow-y-auto">
                    {selectedMemberData.bio}
                  </p>
                )}

                {/* Account Status Badges */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                      selectedMemberData.isOnline
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-700/30 text-zinc-400 border border-zinc-700/30'
                    }`}
                  >
                    {selectedMemberData.isOnline ? 'Online now' : 'Offline'}
                  </span>

                  {selectedMemberData.isMuted && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Muted ({selectedMemberData.muteDuration || 'Active'})
                    </span>
                  )}

                  {selectedMemberData.isBanned && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      Banned ({selectedMemberData.bannedDuration || 'Active'})
                    </span>
                  )}
                </div>

                {/* Show mute/ban reason if active */}
                {(selectedMemberData.muteReason || selectedMemberData.bannedReason) && (
                  <div className="p-2 bg-black/40 rounded border border-white/5 text-[11px] text-zinc-400 space-y-0.5">
                    {selectedMemberData.muteReason && (
                      <p>
                        <span className="text-amber-400 font-semibold">Mute Reason:</span>{' '}
                        {selectedMemberData.muteReason}
                      </p>
                    )}
                    {selectedMemberData.bannedReason && (
                      <p>
                        <span className="text-red-400 font-semibold">Ban Reason:</span>{' '}
                        {selectedMemberData.bannedReason}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Modals / Dropdowns within Card */}
              {showCardActionDropdown === 'mute' && (
                <div className="p-3 bg-[#181820] border-t border-[#23232c] space-y-2 animate-in fade-in">
                  <p className="text-xs font-semibold text-white">Mute {selectedMemberData.username}</p>
                  <div className="flex gap-2">
                    <select
                      value={cardMuteDurationId}
                      onChange={(e) => setCardMuteDurationId(e.target.value)}
                      className="px-2 py-1.5 text-xs bg-[#0e0f12] border border-[#2b2d38] rounded text-white flex-1"
                    >
                      {FILTER_MUTE_DURATIONS.map((dur) => (
                        <option key={dur.id} value={dur.id}>
                          {dur.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Reason (optional)"
                      value={cardMuteReason}
                      onChange={(e) => setCardMuteReason(e.target.value)}
                      className="px-2 py-1.5 text-xs bg-[#0e0f12] border border-[#2b2d38] rounded text-white flex-1"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCardActionDropdown('none')}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAdminMuteMember(
                          selectedMemberData.username,
                          cardMuteDurationId,
                          cardMuteReason
                        )
                      }
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded"
                    >
                      Confirm Mute
                    </button>
                  </div>
                </div>
              )}

              {showCardActionDropdown === 'ban' && (
                <div className="p-3 bg-[#181820] border-t border-[#23232c] space-y-2 animate-in fade-in">
                  <p className="text-xs font-semibold text-white">Ban {selectedMemberData.username}</p>
                  <input
                    type="text"
                    placeholder="Ban Reason (e.g. Advertising, Harassment)"
                    value={cardBanReason}
                    onChange={(e) => setCardBanReason(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-[#0e0f12] border border-[#2b2d38] rounded text-white"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCardActionDropdown('none')}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAdminBanMember(
                          selectedMemberData.username,
                          'Permanent',
                          cardBanReason
                        )
                      }
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded"
                    >
                      Confirm Ban
                    </button>
                  </div>
                </div>
              )}

              {showCardActionDropdown === 'rank' && (
                <div className="p-3 bg-[#181820] border-t border-[#23232c] space-y-2 animate-in fade-in">
                  <p className="text-xs font-semibold text-white">Assign Rank to {selectedMemberData.username}</p>
                  <select
                    value={cardRankSelect}
                    onChange={(e) => setCardRankSelect(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-[#0e0f12] border border-[#2b2d38] rounded text-white"
                  >
                    {ASSIGNABLE_RANKS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCardActionDropdown('none')}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAdminChangeMemberRank(
                          selectedMemberData.username,
                          cardRankSelect
                        )
                      }
                      className="px-3 py-1 bg-[#00a8e8] hover:bg-[#0092ca] text-white text-xs font-medium rounded"
                    >
                      Save Rank
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Action Section on Profile Card */}
              {showCardActionDropdown === 'none' && (
                <div className="p-3 border-t border-[#23232c] bg-[#0f0f14] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Mute / Unmute Button */}
                    {selectedMemberData.isMuted ? (
                      <button
                        type="button"
                        onClick={() => handleAdminUnmute(selectedMemberData.username)}
                        className="px-2.5 py-1.5 bg-[#00a8e8] hover:bg-[#0092ca] text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Unmute</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCardActionDropdown('mute')}
                        className="px-2.5 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Mute</span>
                      </button>
                    )}

                    {/* Ban / Unban Button */}
                    {selectedMemberData.isBanned ? (
                      <button
                        type="button"
                        onClick={() => handleAdminUnban(selectedMemberData.username)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Unban</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCardActionDropdown('ban')}
                        className="px-2.5 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Ban</span>
                      </button>
                    )}

                    {/* Change Rank Button */}
                    <button
                      type="button"
                      onClick={() => setShowCardActionDropdown('rank')}
                      className="px-2.5 py-1.5 bg-[#1f212a] hover:bg-[#282a36] text-zinc-300 hover:text-white border border-white/5 text-xs font-medium rounded transition-colors flex items-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Rank</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMemberKey(null)}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
