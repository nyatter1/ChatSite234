import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  MoreVertical,
  Search,
  Plus,
  SendHorizontal,
  ArrowLeft,
  Star,
  Users,
  UserPlus,
  UserCheck,
  Heart,
  MessageCircle,
  Trash2,
  X,
  Check,
  Image as ImageIcon,
  Loader2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Music
} from 'lucide-react';
import { rtdb, ref, onValue, push, set, update, remove } from './lib/firebase';
import { uploadToCloudinary } from './lib/cloudinary';
import { compressAvatar, compressBanner } from './utils/imageCompressor';
import { SYSTEM_BOT_USERNAME, SYSTEM_BOT_AVATAR } from './ranks';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export interface MessengerUserItem {
  username: string;
  avatarUrl?: string | null;
  bio?: string;
  mood?: string;
  isOnline?: boolean;
  msgProfile?: {
    displayName?: string;
    avatarUrl?: string | null;
    about?: string;
  };
  msgFollowers?: Record<string, boolean>;
  msgFollowing?: Record<string, boolean>;
  msgFavorites?: Record<string, boolean>;
}

export interface MessengerStoryComment {
  id: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl?: string | null;
  text: string;
  createdAt: number;
}

export interface MessengerStory {
  id: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl?: string | null;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  createdAt: number;
  likes: Record<string, boolean>;
  comments: MessengerStoryComment[];
}

export interface MessengerChatMessage {
  id: string;
  sender: string;
  senderDisplayName?: string;
  senderAvatarUrl?: string | null;
  text: string;
  timestamp: string;
  createdAt: number;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'audio' | 'video' | null;
  mediaName?: string | null;
}

export interface MessengerGroupChat {
  id: string;
  name: string;
  avatarUrl?: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  members: Record<string, boolean>;
  unreadBy: Record<string, number>;
  messages: MessengerChatMessage[];
}

export interface MessengerDmThread {
  peerKey: string;
  peerUsername: string;
  peerAvatarUrl?: string | null;
  unread: boolean;
  unreadCount?: number;
  updatedAt: number;
  messages: MessengerChatMessage[];
}

interface MessagesViewProps {
  currentUser: { username: string; email?: string };
  userAvatarUrl: string | null;
  allUsersList: MessengerUserItem[];
  pmThreads: MessengerDmThread[];
  onBackToPublicChat: () => void;
  onGenerateAiReply: (promptText: string, botName: string, senderUsername: string) => Promise<string>;
}

function sanitizeDbKey(username: string): string {
  return username.trim().toLowerCase().replace(/[.#$/[\]]/g, '_');
}

function formatShortTime(ts?: number): string {
  if (!ts) return '';
  const now = new Date();
  const date = new Date(ts);
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60 * 1000) return 'Now';
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  userAvatarUrl,
  allUsersList,
  pmThreads,
  onBackToPublicChat,
  onGenerateAiReply
}) => {
  const myKey = sanitizeDbKey(currentUser.username);

  // Filter tabs matching the screenshot: All | Unread | Favorites | Groups
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'favorites' | 'groups'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // Real-time data from users/{myKey} & users/__system_messenger__
  const [myMsgProfile, setMyMsgProfile] = useState<{
    displayName: string;
    avatarUrl: string | null;
    about: string;
  }>({
    displayName: currentUser.username,
    avatarUrl: userAvatarUrl,
    about: 'Hey there! I am using Messages.'
  });
  const [myFollowing, setMyFollowing] = useState<Record<string, boolean>>({});
  const [myFollowers, setMyFollowers] = useState<Record<string, boolean>>({});
  const [myFavorites, setMyFavorites] = useState<Record<string, boolean>>({});

  // Stories & Groups
  const [stories, setStories] = useState<MessengerStory[]>([]);
  const [groups, setGroups] = useState<MessengerGroupChat[]>([]);

  // Active open conversation: either { type: 'dm', peerUsername: string } or { type: 'group', groupId: string }
  const [activeChat, setActiveChat] = useState<
    { type: 'dm'; peerUsername: string } | { type: 'group'; groupId: string } | null
  >(null);

  // Chat composer state
  const [chatText, setChatText] = useState('');
  const [chatMediaUrl, setChatMediaUrl] = useState<string | null>(null);
  const [chatMediaType, setChatMediaType] = useState<'image' | 'audio' | 'video' | null>(null);
  const [chatMediaName, setChatMediaName] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Modals state
  const [showMyMsgProfileModal, setShowMyMsgProfileModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [isUploadingMsgAvatar, setIsUploadingMsgAvatar] = useState(false);
  const [isSavingMsgProfile, setIsSavingMsgProfile] = useState(false);

  // Viewing another user's Specialized Messages Profile modal
  const [viewingUserMsgProfile, setViewingUserMsgProfile] = useState<string | null>(null);

  // Story Composer Modal
  const [showStoryCreatorModal, setShowStoryCreatorModal] = useState(false);
  const [storyMediaUrl, setStoryMediaUrl] = useState<string | null>(null);
  const [storyMediaType, setStoryMediaType] = useState<'image' | 'video'>('image');
  const [storyCaption, setStoryCaption] = useState('');
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [isPostingStory, setIsPostingStory] = useState(false);

  // Story Viewer Modal
  const [viewingStoryAuthor, setViewingStoryAuthor] = useState<string | null>(null);
  const [viewingStoryIndex, setViewingStoryIndex] = useState(0);
  const [storyCommentInput, setStoryCommentInput] = useState('');

  // Create Group Chat / Add Friends Modal
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAvatarUrl, setNewGroupAvatarUrl] = useState<string | null>(null);
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Record<string, boolean>>({});
  const [groupMemberSearch, setGroupMemberSearch] = useState('');

  // Group Info Modal
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);

  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatMediaInputRef = useRef<HTMLInputElement>(null);
  const storyFileInputRef = useRef<HTMLInputElement>(null);
  const msgAvatarInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Close 3-dots header menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Derive all users' msgProfile, followers, following from allUsersList (no duplicate root users listener!)
  const usersMessengerData = useMemo(() => {
    const map: Record<
      string,
      {
        displayName?: string;
        avatarUrl?: string | null;
        about?: string;
        followers: Record<string, boolean>;
        following: Record<string, boolean>;
      }
    > = {};
    allUsersList.forEach((u) => {
      const k = sanitizeDbKey(u.username);
      if (!k) return;
      map[k] = {
        displayName: u.msgProfile?.displayName || u.username,
        avatarUrl: u.msgProfile?.avatarUrl || u.avatarUrl || null,
        about: u.msgProfile?.about || u.mood || 'Hey there! I am using Messages.',
        followers: u.msgFollowers || {},
        following: u.msgFollowing || {}
      };
    });
    return map;
  }, [allUsersList]);

  // Listen ONLY to the current user's specific lightweight messenger subpaths (not the entire users root)
  useEffect(() => {
    const profRef = ref(rtdb, `users/${myKey}/msgProfile`);
    const flwrsRef = ref(rtdb, `users/${myKey}/msgFollowers`);
    const flwngRef = ref(rtdb, `users/${myKey}/msgFollowing`);
    const favsRef = ref(rtdb, `users/${myKey}/msgFavorites`);

    const unsubProf = onValue(profRef, (snap) => {
      const mp = snap.exists() && typeof snap.val() === 'object' ? snap.val() : {};
      setMyMsgProfile({
        displayName: mp.displayName || currentUser.username,
        avatarUrl: mp.avatarUrl || userAvatarUrl || null,
        about: mp.about || 'Hey there! I am using Messages.'
      });
    });
    const unsubFlwrs = onValue(flwrsRef, (snap) => {
      setMyFollowers(snap.exists() && typeof snap.val() === 'object' ? snap.val() : {});
    });
    const unsubFlwng = onValue(flwngRef, (snap) => {
      setMyFollowing(snap.exists() && typeof snap.val() === 'object' ? snap.val() : {});
    });
    const unsubFavs = onValue(favsRef, (snap) => {
      setMyFavorites(snap.exists() && typeof snap.val() === 'object' ? snap.val() : {});
    });

    return () => {
      unsubProf();
      unsubFlwrs();
      unsubFlwng();
      unsubFavs();
    };
  }, [myKey, currentUser.username, userAvatarUrl]);

  // Listen to Stories & Group Chats under users/__system_messenger__ (with auto-purge at 50 stories & 1,000 group messages)
  useEffect(() => {
    const messengerRef = ref(rtdb, 'users/__system_messenger__');
    const unsub = onValue(messengerRef, (snap) => {
      if (!snap.exists()) {
        setStories([]);
        setGroups([]);
        return;
      }
      const val = snap.val();

      // Parse Stories
      const loadedStories: MessengerStory[] = [];
      if (val.stories && typeof val.stories === 'object') {
        const rawStoryEntries = Object.entries(val.stories);
        // Auto-clear all stories if total hits 50
        if (rawStoryEntries.length >= 50) {
          remove(ref(rtdb, 'users/__system_messenger__/stories')).catch(() => {});
          setStories([]);
        } else {
          for (const [sId, sVal] of rawStoryEntries) {
            const s = sVal as any;
            if (!s || !s.mediaUrl) continue;
            const commentsList: MessengerStoryComment[] = [];
            if (s.comments && typeof s.comments === 'object') {
              for (const [cId, cVal] of Object.entries(s.comments)) {
                const c = cVal as any;
                if (c && typeof c.text === 'string') {
                  commentsList.push({
                    id: cId,
                    authorUsername: c.authorUsername || 'User',
                    authorDisplayName: c.authorDisplayName || c.authorUsername || 'User',
                    authorAvatarUrl: c.authorAvatarUrl || null,
                    text: c.text,
                    createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now()
                  });
                }
              }
            }
            commentsList.sort((a, b) => a.createdAt - b.createdAt);

            loadedStories.push({
              id: sId,
              authorUsername: s.authorUsername || 'User',
              authorDisplayName: s.authorDisplayName || s.authorUsername || 'User',
              authorAvatarUrl: s.authorAvatarUrl || null,
              mediaUrl: s.mediaUrl,
              mediaType: s.mediaType === 'video' ? 'video' : 'image',
              caption: s.caption || '',
              createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
              likes: s.likes && typeof s.likes === 'object' ? s.likes : {},
              comments: commentsList
            });
          }
          loadedStories.sort((a, b) => a.createdAt - b.createdAt);
          setStories(loadedStories);
        }
      } else {
        setStories([]);
      }

      // Parse Group Chats
      const loadedGroups: MessengerGroupChat[] = [];
      let totalGroupMsgsCount = 0;
      if (val.groups && typeof val.groups === 'object') {
        for (const [gId, gVal] of Object.entries(val.groups)) {
          const g = gVal as any;
          if (!g || !g.name) continue;
          const gMsgCount = g.messages && typeof g.messages === 'object' ? Object.keys(g.messages).length : 0;
          totalGroupMsgsCount += gMsgCount;
          const members = g.members && typeof g.members === 'object' ? g.members : {};
          if (!members[myKey]) continue;

          const msgs: MessengerChatMessage[] = [];
          if (g.messages && typeof g.messages === 'object') {
            for (const [mId, mVal] of Object.entries(g.messages)) {
              const m = mVal as any;
              if (!m) continue;
              msgs.push({
                id: mId,
                sender: m.sender || 'User',
                senderDisplayName: m.senderDisplayName || m.sender || 'User',
                senderAvatarUrl: m.senderAvatarUrl || null,
                text: m.text || '',
                timestamp: m.timestamp || '',
                createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
                mediaUrl: m.mediaUrl || null,
                mediaType: m.mediaType || null,
                mediaName: m.mediaName || null
              });
            }
          }
          msgs.sort((a, b) => a.createdAt - b.createdAt);

          loadedGroups.push({
            id: gId,
            name: g.name,
            avatarUrl: g.avatarUrl || null,
            createdBy: g.createdBy || '',
            createdAt: typeof g.createdAt === 'number' ? g.createdAt : Date.now(),
            updatedAt:
              typeof g.updatedAt === 'number'
                ? g.updatedAt
                : msgs.length > 0
                ? msgs[msgs.length - 1].createdAt
                : Date.now(),
            members,
            unreadBy: g.unreadBy && typeof g.unreadBy === 'object' ? g.unreadBy : {},
            messages: msgs
          });
        }

        // Auto-clear all group chat messages if total hits 1,000
        if (totalGroupMsgsCount >= 1000) {
          const groupClearMap: Record<string, null> = {};
          for (const gId of Object.keys(val.groups)) {
            groupClearMap[`users/__system_messenger__/groups/${gId}/messages`] = null;
          }
          update(ref(rtdb), groupClearMap).catch(() => {});
        }
      }
      loadedGroups.sort((a, b) => b.updatedAt - a.updatedAt);
      setGroups(loadedGroups);
    });

    return () => unsub();
  }, [myKey]);

  // Helper to resolve a user's Messages display name, avatar, about, and online status
  const resolveUserMessengerInfo = (username: string) => {
    const cleanKey = sanitizeDbKey(username);
    if (cleanKey === 'system') {
      return {
        username: SYSTEM_BOT_USERNAME,
        displayName: 'System AI',
        avatarUrl: SYSTEM_BOT_AVATAR,
        about: '🤖 Ask me anything...',
        isOnline: true,
        followersCount: 999,
        followingCount: 1
      };
    }
    const fromAll = allUsersList.find((u) => u.username.toLowerCase() === username.toLowerCase());
    const fromMsg = usersMessengerData[cleanKey];
    const isMe = cleanKey === myKey;
    return {
      username: fromAll?.username || username,
      displayName: isMe
        ? myMsgProfile.displayName
        : fromMsg?.displayName || fromAll?.username || username,
      avatarUrl: isMe
        ? myMsgProfile.avatarUrl || userAvatarUrl
        : fromMsg?.avatarUrl || fromAll?.avatarUrl || null,
      about: isMe
        ? myMsgProfile.about
        : fromMsg?.about || fromAll?.mood || 'Hey there! I am using Messages.',
      isOnline: isMe ? true : Boolean(fromAll?.isOnline),
      followersCount: Object.keys(fromMsg?.followers || {}).length,
      followingCount: Object.keys(fromMsg?.following || {}).length
    };
  };

  // Group stories by author
  const storiesByAuthor = useMemo(() => {
    const map = new Map<string, MessengerStory[]>();
    stories.forEach((st) => {
      const k = st.authorUsername.toLowerCase();
      const arr = map.get(k) || [];
      arr.push(st);
      map.set(k, arr);
    });
    return map;
  }, [stories]);

  const myStories = storiesByAuthor.get(currentUser.username.toLowerCase()) || [];

  // Build the Stories Bar items:
  // 1. All users who have active stories + followed users so the bar looks vibrant like the screenshot
  const storyCircleUsers = useMemo(() => {
    const seen = new Set<string>();
    const list: { username: string; hasStory: boolean }[] = [];

    // First: other users who have posted active stories
    stories.forEach((s) => {
      const lower = s.authorUsername.toLowerCase();
      if (lower !== currentUser.username.toLowerCase() && !seen.has(lower)) {
        seen.add(lower);
        list.push({ username: s.authorUsername, hasStory: true });
      }
    });

    // Next: users the current user follows (or online users) so the horizontal row is always populated
    allUsersList.forEach((u) => {
      const lower = u.username.toLowerCase();
      const uKey = sanitizeDbKey(u.username);
      if (lower !== currentUser.username.toLowerCase() && !seen.has(lower)) {
        if (myFollowing[uKey] || list.length < 8) {
          seen.add(lower);
          list.push({ username: u.username, hasStory: false });
        }
      }
    });

    return list;
  }, [stories, allUsersList, currentUser.username, myFollowing]);

  // Unified conversation items (DMs + Group Chats + System AI + Followed Friends)
  const unifiedConversations = useMemo(() => {
    interface ConvItem {
      id: string;
      type: 'dm' | 'group';
      targetId: string; // peerUsername for DM, groupId for Group
      title: string;
      subtitle: string;
      avatarUrl: string | null;
      isOnline: boolean;
      updatedAt: number;
      unreadCount: number;
      isFavorite: boolean;
    }

    const items: ConvItem[] = [];
    const seenDmKeys = new Set<string>();

    // 1. Existing DM threads
    pmThreads.forEach((t) => {
      seenDmKeys.add(t.peerKey);
      const info = resolveUserMessengerInfo(t.peerUsername);
      const lastMsg = t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;
      const preview = lastMsg
        ? lastMsg.text
          ? lastMsg.text
          : lastMsg.mediaType === 'video'
          ? '🎥 Video'
          : lastMsg.mediaType === 'audio'
          ? '🎵 Audio'
          : '📷 Photo'
        : info.about;

      const favKey = `dm_${t.peerKey}`;
      const unreadNum = t.unread ? Math.max(1, t.unreadCount || 1) : 0;

      items.push({
        id: `dm:${t.peerKey}`,
        type: 'dm',
        targetId: info.username,
        title: info.displayName,
        subtitle: preview,
        avatarUrl: info.avatarUrl,
        isOnline: info.isOnline,
        updatedAt: t.updatedAt,
        unreadCount: unreadNum,
        isFavorite: Boolean(myFavorites[favKey])
      });
    });

    // 2. Always include System AI if not already in DM threads (just like "Novachat AI - 🤖 Ask me anything..." in the screenshot!)
    if (!seenDmKeys.has('system')) {
      seenDmKeys.add('system');
      items.push({
        id: 'dm:system',
        type: 'dm',
        targetId: SYSTEM_BOT_USERNAME,
        title: 'System AI',
        subtitle: '🤖 Ask me anything...',
        avatarUrl: SYSTEM_BOT_AVATAR,
        isOnline: true,
        updatedAt: 1,
        unreadCount: 0,
        isFavorite: Boolean(myFavorites['dm_system'])
      });
    }

    // 3. Include followed users even if no message sent yet so adding/following someone puts them in your Messages list immediately
    Object.keys(myFollowing).forEach((followedKey) => {
      if (!myFollowing[followedKey] || seenDmKeys.has(followedKey)) return;
      const matched = allUsersList.find((u) => sanitizeDbKey(u.username) === followedKey);
      const uname = matched?.username || usersMessengerData[followedKey]?.displayName || followedKey;
      const info = resolveUserMessengerInfo(uname);
      seenDmKeys.add(followedKey);
      items.push({
        id: `dm:${followedKey}`,
        type: 'dm',
        targetId: info.username,
        title: info.displayName,
        subtitle: info.about || 'Tap to start chatting',
        avatarUrl: info.avatarUrl,
        isOnline: info.isOnline,
        updatedAt: 0,
        unreadCount: 0,
        isFavorite: Boolean(myFavorites[`dm_${followedKey}`])
      });
    });

    // 4. Group Chats
    groups.forEach((g) => {
      const lastMsg = g.messages.length > 0 ? g.messages[g.messages.length - 1] : null;
      const preview = lastMsg
        ? `${lastMsg.senderDisplayName || lastMsg.sender}: ${
            lastMsg.text || (lastMsg.mediaType === 'video' ? '🎥 Video' : '📷 Photo')
          }`
        : `${Object.keys(g.members).length} members`;
      const unreadNum = g.unreadBy?.[myKey] || 0;
      const favKey = `group_${g.id}`;

      items.push({
        id: `group:${g.id}`,
        type: 'group',
        targetId: g.id,
        title: g.name,
        subtitle: preview,
        avatarUrl: g.avatarUrl || null,
        isOnline: true,
        updatedAt: g.updatedAt,
        unreadCount: unreadNum,
        isFavorite: Boolean(myFavorites[favKey])
      });
    });

    items.sort((a, b) => b.updatedAt - a.updatedAt);

    // Filter by search query and active tab
    return items.filter((item) => {
      if (activeFilter === 'unread' && item.unreadCount <= 0) return false;
      if (activeFilter === 'favorites' && !item.isFavorite) return false;
      if (activeFilter === 'groups' && item.type !== 'group') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.targetId.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pmThreads, groups, myFollowing, myFavorites, allUsersList, usersMessengerData, activeFilter, searchQuery, myKey]);

  // Searchable community users to Add / Follow / Message when typing in "Search friends..."
  const searchedCommunityUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allUsersList.filter(
      (u) =>
        u.username.toLowerCase() !== currentUser.username.toLowerCase() &&
        (u.username.toLowerCase().includes(q) ||
          (usersMessengerData[sanitizeDbKey(u.username)]?.displayName || '')
            .toLowerCase()
            .includes(q))
    );
  }, [searchQuery, allUsersList, currentUser.username, usersMessengerData]);

  // Follow / Unfollow a user + send them a notification
  const handleToggleFollow = async (targetUsername: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetKey = sanitizeDbKey(targetUsername);
    if (!targetKey || targetKey === myKey || targetKey === 'system') return;

    const isCurrentlyFollowing = Boolean(myFollowing[targetKey]);
    try {
      if (isCurrentlyFollowing) {
        await remove(ref(rtdb, `users/${myKey}/msgFollowing/${targetKey}`));
        await remove(ref(rtdb, `users/${targetKey}/msgFollowers/${myKey}`));
      } else {
        await set(ref(rtdb, `users/${myKey}/msgFollowing/${targetKey}`), true);
        await set(ref(rtdb, `users/${targetKey}/msgFollowers/${myKey}`), true);

        // Send notification to target user
        await push(ref(rtdb, `users/${targetKey}/notifications`), {
          type: 'profile_visit',
          fromUsername: currentUser.username,
          fromAvatarUrl: myMsgProfile.avatarUrl || userAvatarUrl || null,
          text: 'Started following you on Messages!',
          createdAt: Date.now(),
          read: false
        });
      }
    } catch (err) {
      console.warn('Error toggling follow:', err);
    }
  };

  // Toggle Favorite on a DM or Group
  const handleToggleFavorite = async (favKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isFav = Boolean(myFavorites[favKey]);
    try {
      if (isFav) {
        await remove(ref(rtdb, `users/${myKey}/msgFavorites/${favKey}`));
      } else {
        await set(ref(rtdb, `users/${myKey}/msgFavorites/${favKey}`), true);
      }
    } catch (err) {
      console.warn('Error toggling favorite:', err);
    }
  };

  // Open a DM or Group conversation & clear unread count
  const handleSelectConversation = async (
    conv: { type: 'dm'; peerUsername: string } | { type: 'group'; groupId: string }
  ) => {
    setActiveChat(conv);
    if (conv.type === 'dm') {
      const peerKey = sanitizeDbKey(conv.peerUsername);
      try {
        await update(ref(rtdb, `users/${myKey}/pms/${peerKey}`), {
          unread: false,
          unreadCount: 0
        });
      } catch (_) {}
    } else {
      try {
        await set(ref(rtdb, `users/__system_messenger__/groups/${conv.groupId}/unreadBy/${myKey}`), 0);
      } catch (_) {}
    }
    setTimeout(() => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  // Upload media for active DM or Group chat
  const handleChatMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const lower = file.name.toLowerCase();
    const isAudio =
      file.type.startsWith('audio/') ||
      lower.endsWith('.mp3') ||
      lower.endsWith('.wav') ||
      lower.endsWith('.ogg') ||
      lower.endsWith('.m4a');
    const isVideo =
      !isAudio &&
      (file.type.startsWith('video/') ||
        lower.endsWith('.mp4') ||
        lower.endsWith('.webm') ||
        lower.endsWith('.mov'));
    const isGif = file.type === 'image/gif' || lower.endsWith('.gif');
    const detectedType: 'image' | 'audio' | 'video' = isAudio
      ? 'audio'
      : isVideo
      ? 'video'
      : 'image';

    setIsUploadingMedia(true);
    try {
      let uploadFile = file;
      if (detectedType === 'image' && !isGif && file.type.startsWith('image/')) {
        try {
          const comp = await compressBanner(file);
          uploadFile = comp.file;
        } catch (_) {}
      }
      const resType = detectedType === 'image' ? 'image' : 'video';
      try {
        const res = await uploadToCloudinary(uploadFile, resType, 'messenger_media');
        setChatMediaUrl(res.secure_url || res.url);
        setChatMediaType(detectedType);
        setChatMediaName(file.name);
      } catch (_) {
        const dataUrl = await fileToDataUrl(uploadFile);
        setChatMediaUrl(dataUrl);
        setChatMediaType(detectedType);
        setChatMediaName(file.name);
      }
    } catch (err) {
      console.warn('Error uploading messenger media:', err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Send message in active DM or Group Chat
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!chatText.trim() && !chatMediaUrl) || !activeChat || isUploadingMedia) return;

    const textToSend = chatText.trim();
    const mediaUrlToSend = chatMediaUrl;
    const mediaTypeToSend = mediaUrlToSend ? chatMediaType : null;
    const mediaNameToSend = mediaUrlToSend ? chatMediaName : null;

    setChatText('');
    setChatMediaUrl(null);
    setChatMediaType(null);
    setChatMediaName(null);

    const now = Date.now();
    const msgId = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (activeChat.type === 'dm') {
      const peerUsername = activeChat.peerUsername;
      const peerKey = sanitizeDbKey(peerUsername);
      const peerInfo = resolveUserMessengerInfo(peerUsername);

      const msgPayload = {
        sender: currentUser.username,
        senderDisplayName: myMsgProfile.displayName || currentUser.username,
        senderAvatarUrl: myMsgProfile.avatarUrl || userAvatarUrl || null,
        text: textToSend,
        mediaUrl: mediaUrlToSend || null,
        mediaType: mediaTypeToSend || null,
        mediaName: mediaNameToSend || null,
        timestamp: timeStr,
        createdAt: now
      };

      try {
        await update(ref(rtdb, `users/${myKey}/pms/${peerKey}`), {
          peerUsername: peerInfo.username,
          peerAvatarUrl: peerInfo.avatarUrl || null,
          unread: false,
          unreadCount: 0,
          updatedAt: now,
          [`messages/${msgId}`]: msgPayload
        });

        if (peerKey !== 'system') {
          const existingPeerThread = pmThreads.find((t) => t.peerKey === peerKey);
          const nextUnreadCount = (existingPeerThread?.unreadCount || 0) + 1;
          await update(ref(rtdb, `users/${peerKey}/pms/${myKey}`), {
            peerUsername: currentUser.username,
            peerAvatarUrl: myMsgProfile.avatarUrl || userAvatarUrl || null,
            unread: true,
            unreadCount: nextUnreadCount,
            updatedAt: now,
            [`messages/${msgId}`]: msgPayload
          });
        } else {
          // System AI reply inside Messages
          const promptForBot = textToSend || 'Hello';
          (async () => {
            try {
              const rawReply = await onGenerateAiReply(
                promptForBot,
                SYSTEM_BOT_USERNAME,
                currentUser.username
              );
              const cleanReply =
                rawReply
                  .replace(/<think>[\s\S]*?<\/think>/gi, '')
                  .replace(/\*[^*]+\*/g, '')
                  .trim() || 'Hello! How can I help you today?';
              const botNow = Date.now();
              const botMsgId = `${botNow}-bot`;
              await update(ref(rtdb, `users/${myKey}/pms/system`), {
                peerUsername: SYSTEM_BOT_USERNAME,
                peerAvatarUrl: SYSTEM_BOT_AVATAR,
                unread: false,
                unreadCount: 0,
                updatedAt: botNow,
                [`messages/${botMsgId}`]: {
                  sender: SYSTEM_BOT_USERNAME,
                  senderDisplayName: 'System AI',
                  senderAvatarUrl: SYSTEM_BOT_AVATAR,
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
        console.warn('Error sending DM in MessagesView:', err);
      }
    } else {
      // Group Chat message
      const group = groups.find((g) => g.id === activeChat.groupId);
      if (!group) return;

      const msgPayload = {
        sender: currentUser.username,
        senderDisplayName: myMsgProfile.displayName || currentUser.username,
        senderAvatarUrl: myMsgProfile.avatarUrl || userAvatarUrl || null,
        text: textToSend,
        mediaUrl: mediaUrlToSend || null,
        mediaType: mediaTypeToSend || null,
        mediaName: mediaNameToSend || null,
        timestamp: timeStr,
        createdAt: now
      };

      const groupUpdates: Record<string, any> = {
        updatedAt: now,
        [`messages/${msgId}`]: msgPayload
      };

      Object.keys(group.members).forEach((memberKey) => {
        if (memberKey !== myKey) {
          const prevUnread = group.unreadBy?.[memberKey] || 0;
          groupUpdates[`unreadBy/${memberKey}`] = prevUnread + 1;
        } else {
          groupUpdates[`unreadBy/${myKey}`] = 0;
        }
      });

      try {
        await update(
          ref(rtdb, `users/__system_messenger__/groups/${activeChat.groupId}`),
          groupUpdates
        );
      } catch (err) {
        console.warn('Error sending group message:', err);
      }
    }

    setTimeout(() => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  // Save Specialized Custom Messages Profile
  const handleSaveMyMsgProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMsgProfile(true);
    try {
      const nextProfile = {
        displayName: editDisplayName.trim() || currentUser.username,
        avatarUrl: editAvatarUrl || userAvatarUrl || null,
        about: editAbout.trim() || 'Hey there! I am using Messages.',
        updatedAt: Date.now()
      };
      await set(ref(rtdb, `users/${myKey}/msgProfile`), nextProfile);
      setMyMsgProfile(nextProfile);
      setShowMyMsgProfileModal(false);
    } catch (err) {
      console.warn('Error saving custom Messages profile:', err);
    } finally {
      setIsSavingMsgProfile(false);
    }
  };

  // Upload custom avatar for Messages Profile
  const handleUploadMsgAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploadingMsgAvatar(true);
    try {
      let uploadFile = file;
      try {
        const comp = await compressAvatar(file);
        uploadFile = comp.file;
      } catch (_) {}
      try {
        const res = await uploadToCloudinary(uploadFile, 'image', 'msg_avatars');
        setEditAvatarUrl(res.secure_url || res.url);
      } catch (_) {
        const dataUrl = await fileToDataUrl(uploadFile);
        setEditAvatarUrl(dataUrl);
      }
    } finally {
      setIsUploadingMsgAvatar(false);
    }
  };

  // Upload Story Media (Photo, GIF, or Video)
  const handleStoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    setIsUploadingStory(true);
    setShowStoryCreatorModal(true);

    try {
      let uploadFile = file;
      if (!isVideo && !isGif && file.type.startsWith('image/')) {
        try {
          const comp = await compressBanner(file);
          uploadFile = comp.file;
        } catch (_) {}
      }
      const resType = isVideo ? 'video' : 'image';
      try {
        const res = await uploadToCloudinary(uploadFile, resType, 'stories');
        setStoryMediaUrl(res.secure_url || res.url);
        setStoryMediaType(isVideo ? 'video' : 'image');
      } catch (_) {
        const dataUrl = await fileToDataUrl(uploadFile);
        setStoryMediaUrl(dataUrl);
        setStoryMediaType(isVideo ? 'video' : 'image');
      }
    } catch (err) {
      console.warn('Error uploading story media:', err);
    } finally {
      setIsUploadingStory(false);
    }
  };

  // Publish Story to Firebase RTDB (Auto-clears all stories if hitting 50)
  const handlePublishStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyMediaUrl || isPostingStory) return;
    setIsPostingStory(true);
    try {
      if (stories.length + 1 >= 50) {
        await remove(ref(rtdb, 'users/__system_messenger__/stories'));
      } else {
        await push(ref(rtdb, 'users/__system_messenger__/stories'), {
          authorUsername: currentUser.username,
          authorDisplayName: myMsgProfile.displayName || currentUser.username,
          authorAvatarUrl: myMsgProfile.avatarUrl || userAvatarUrl || null,
          mediaUrl: storyMediaUrl,
          mediaType: storyMediaType,
          caption: storyCaption.trim(),
          createdAt: Date.now()
        });
      }
      setStoryMediaUrl(null);
      setStoryCaption('');
      setShowStoryCreatorModal(false);
    } catch (err) {
      console.warn('Error publishing story:', err);
    } finally {
      setIsPostingStory(false);
    }
  };

  // Like / Unlike a Story
  const handleToggleStoryLike = async (story: MessengerStory) => {
    const liked = Boolean(story.likes?.[myKey]);
    try {
      const likeRef = ref(rtdb, `users/__system_messenger__/stories/${story.id}/likes/${myKey}`);
      if (liked) {
        await remove(likeRef);
      } else {
        await set(likeRef, true);
        if (story.authorUsername.toLowerCase() !== currentUser.username.toLowerCase()) {
          const targetKey = sanitizeDbKey(story.authorUsername);
          await push(ref(rtdb, `users/${targetKey}/notifications`), {
            type: 'profile_like',
            fromUsername: currentUser.username,
            fromAvatarUrl: myMsgProfile.avatarUrl || userAvatarUrl || null,
            text: 'Liked your story!',
            createdAt: Date.now(),
            read: false
          });
        }
      }
    } catch (err) {
      console.warn('Error liking story:', err);
    }
  };

  // Comment on a Story
  const handleAddStoryComment = async (story: MessengerStory, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = storyCommentInput.trim();
    if (!text) return;
    setStoryCommentInput('');
    try {
      await push(ref(rtdb, `users/__system_messenger__/stories/${story.id}/comments`), {
        authorUsername: currentUser.username,
        authorDisplayName: myMsgProfile.displayName || currentUser.username,
        authorAvatarUrl: myMsgProfile.avatarUrl || userAvatarUrl || null,
        text,
        createdAt: Date.now()
      });

      if (story.authorUsername.toLowerCase() !== currentUser.username.toLowerCase()) {
        const targetKey = sanitizeDbKey(story.authorUsername);
        await push(ref(rtdb, `users/${targetKey}/notifications`), {
          type: 'profile_visit',
          fromUsername: currentUser.username,
          fromAvatarUrl: myMsgProfile.avatarUrl || userAvatarUrl || null,
          text: `Commented on your story: "${text}"`,
          createdAt: Date.now(),
          read: false
        });
      }
    } catch (err) {
      console.warn('Error commenting on story:', err);
    }
  };

  // Delete own Story
  const handleDeleteStory = async (storyId: string) => {
    try {
      await remove(ref(rtdb, `users/__system_messenger__/stories/${storyId}`));
      setViewingStoryAuthor(null);
    } catch (err) {
      console.warn('Error deleting story:', err);
    }
  };

  // Create a new Group Chat
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const membersMap: Record<string, boolean> = {
      [myKey]: true,
      ...selectedGroupMembers
    };
    const now = Date.now();
    try {
      const newGroupRef = await push(ref(rtdb, 'users/__system_messenger__/groups'), {
        name: newGroupName.trim(),
        avatarUrl: newGroupAvatarUrl || null,
        createdBy: currentUser.username,
        createdAt: now,
        updatedAt: now,
        members: membersMap,
        unreadBy: {},
        messages: {
          [`${now}-init`]: {
            sender: currentUser.username,
            senderDisplayName: myMsgProfile.displayName || currentUser.username,
            senderAvatarUrl: myMsgProfile.avatarUrl || userAvatarUrl || null,
            text: `Created group "${newGroupName.trim()}"`,
            timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: now
          }
        }
      });

      setNewGroupName('');
      setNewGroupAvatarUrl(null);
      setSelectedGroupMembers({});
      setShowCreateGroupModal(false);

      if (newGroupRef.key) {
        setActiveChat({ type: 'group', groupId: newGroupRef.key });
      }
    } catch (err) {
      console.warn('Error creating group chat:', err);
    }
  };

  // Upload Group Avatar
  const handleUploadGroupAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploadingGroupAvatar(true);
    try {
      let uploadFile = file;
      try {
        const comp = await compressAvatar(file);
        uploadFile = comp.file;
      } catch (_) {}
      try {
        const res = await uploadToCloudinary(uploadFile, 'image', 'group_avatars');
        setNewGroupAvatarUrl(res.secure_url || res.url);
      } catch (_) {
        const dataUrl = await fileToDataUrl(uploadFile);
        setNewGroupAvatarUrl(dataUrl);
      }
    } finally {
      setIsUploadingGroupAvatar(false);
    }
  };

  // Resolve active conversation messages & metadata
  const activeDmThread = useMemo(() => {
    if (!activeChat || activeChat.type !== 'dm') return null;
    const pKey = sanitizeDbKey(activeChat.peerUsername);
    return pmThreads.find((t) => t.peerKey === pKey) || null;
  }, [activeChat, pmThreads]);

  const activeGroupObj = useMemo(() => {
    if (!activeChat || activeChat.type !== 'group') return null;
    return groups.find((g) => g.id === activeChat.groupId) || null;
  }, [activeChat, groups]);

  const activeMessages: MessengerChatMessage[] = useMemo(() => {
    if (!activeChat) return [];
    if (activeChat.type === 'dm') {
      return activeDmThread?.messages || [];
    }
    return activeGroupObj?.messages || [];
  }, [activeChat, activeDmThread, activeGroupObj]);

  // Active Story Viewer author stories
  const activeAuthorStories = useMemo(() => {
    if (!viewingStoryAuthor) return [];
    return storiesByAuthor.get(viewingStoryAuthor.toLowerCase()) || [];
  }, [viewingStoryAuthor, storiesByAuthor]);

  const currentViewedStory =
    activeAuthorStories[Math.min(viewingStoryIndex, Math.max(0, activeAuthorStories.length - 1))] ||
    null;

  return (
    <section className="flex-1 flex bg-[#090a0c] text-white overflow-hidden relative select-none">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={storyFileInputRef}
        accept="image/*,video/*,.gif"
        className="hidden"
        onChange={handleStoryFileChange}
      />
      <input
        type="file"
        ref={chatMediaInputRef}
        accept="image/*,video/*,audio/*,.mp3,.wav,.ogg,.m4a,.mp4,.webm,.mov,.gif"
        className="hidden"
        onChange={handleChatMediaUpload}
      />
      <input
        type="file"
        ref={msgAvatarInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleUploadMsgAvatar}
      />
      <input
        type="file"
        ref={groupAvatarInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleUploadGroupAvatar}
      />

      {/* =================================================================== */}
      {/* LEFT / MAIN PANE: MESSAGES LIST (Matches Screenshot 100%)           */}
      {/* =================================================================== */}
      <div
        className={`${
          activeChat ? 'hidden md:flex md:w-[390px] lg:w-[420px] border-r border-white/10' : 'flex w-full'
        } flex-col h-full bg-[#090a0c] shrink-0`}
      >
        {/* TOP HEADER: "Messages" + Camera Icon + 3-Dots Icon */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white">Messages</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Back to Public Chat pill button */}
            <button
              type="button"
              onClick={onBackToPublicChat}
              className="px-3 py-1.5 rounded-full bg-[#171a1f] hover:bg-[#22262d] text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Return to Public Chat Room"
            >
              Chat Room
            </button>

            {/* Camera Icon -> Post Story */}
            <button
              type="button"
              onClick={() => storyFileInputRef.current?.click()}
              title="Post a Story"
              className="p-2 rounded-full text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Camera className="w-6 h-6" />
            </button>

            {/* 3-Dots Menu -> Custom Messages Profile, Create Group, Post Story */}
            <div className="relative" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() => setHeaderMenuOpen((p) => !p)}
                title="Messages Options & Custom Profile"
                className="p-2 rounded-full text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <MoreVertical className="w-6 h-6" />
              </button>

              {headerMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#16191e] border border-white/10 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      setEditDisplayName(myMsgProfile.displayName);
                      setEditAbout(myMsgProfile.about);
                      setEditAvatarUrl(myMsgProfile.avatarUrl);
                      setShowMyMsgProfileModal(true);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-bold text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <Edit3 className="w-4 h-4 text-[#00d95f]" />
                    <span>Messages Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      setShowCreateGroupModal(true);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-bold text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <Users className="w-4 h-4 text-[#00d95f]" />
                    <span>New Group Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      storyFileInputRef.current?.click();
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-bold text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <Camera className="w-4 h-4 text-[#00d95f]" />
                    <span>Post a Story</span>
                  </button>

                  <div className="my-1 border-t border-white/10" />

                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      onBackToPublicChat();
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-bold text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <ArrowLeft className="w-4 h-4 text-zinc-400" />
                    <span>Back to Main Chat</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SEARCH BAR ("Search friends...") */}
        <div className="px-4 py-2">
          <div className="bg-[#1b1e23] rounded-full px-4 py-2.5 flex items-center gap-3 border border-white/5 focus-within:border-[#00d95f]/50 transition-colors">
            <Search className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="flex-1 bg-transparent text-white text-sm sm:text-base placeholder-zinc-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* FILTER TABS ROW: All | Unread | Favorites | Groups | + */}
        <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/10">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'favorites', label: 'Favorites' },
              { id: 'groups', label: 'Groups' }
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#00d95f] text-black shadow-md shadow-[#00d95f]/20'
                    : 'bg-[#14171a] text-zinc-200 border border-white/10 hover:bg-[#1e2228]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowCreateGroupModal(true)}
            title="Create Group Chat or Add Friends"
            className="w-9 h-9 rounded-full bg-[#14171a] border border-white/10 hover:bg-[#1e2228] text-zinc-200 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* STORIES ROW (Green rings matching screenshot) */}
        <div className="px-4 py-3.5 flex items-center gap-4 overflow-x-auto no-scrollbar border-b border-white/5 shrink-0">
          {/* Current User's Story / Add Story Circle */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (myStories.length > 0) {
                    setViewingStoryAuthor(currentUser.username);
                    setViewingStoryIndex(0);
                  } else {
                    storyFileInputRef.current?.click();
                  }
                }}
                className={`w-16 h-16 rounded-full p-0.5 transition-transform hover:scale-105 cursor-pointer ${
                  myStories.length > 0
                    ? 'border-[2.5px] border-[#00d95f]'
                    : 'border-2 border-zinc-700'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-[#1b1e24] flex items-center justify-center">
                  {myMsgProfile.avatarUrl ? (
                    <img
                      src={myMsgProfile.avatarUrl}
                      alt="My Story"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-black text-white">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  storyFileInputRef.current?.click();
                }}
                title="Add new story"
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#00d95f] text-black flex items-center justify-center border-2 border-[#090a0c] cursor-pointer shadow"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
            <span className="text-xs font-medium text-zinc-200 max-w-[68px] truncate">
              Your Story
            </span>
          </div>

          {/* Other Users' Stories / Friends Circles */}
          {storyCircleUsers.map((item) => {
            const info = resolveUserMessengerInfo(item.username);
            const userStories = storiesByAuthor.get(item.username.toLowerCase()) || [];
            return (
              <button
                key={item.username}
                type="button"
                onClick={() => {
                  if (userStories.length > 0) {
                    setViewingStoryAuthor(item.username);
                    setViewingStoryIndex(0);
                  } else {
                    setViewingUserMsgProfile(item.username);
                  }
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <div
                  className={`w-16 h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                    userStories.length > 0
                      ? 'border-[2.5px] border-[#00d95f] shadow-sm shadow-[#00d95f]/30'
                      : 'border-[2px] border-[#00d95f]/60'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#1b1e24] flex items-center justify-center">
                    {info.avatarUrl ? (
                      <img
                        src={info.avatarUrl}
                        alt={info.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-black text-white">
                        {info.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-zinc-200 max-w-[68px] truncate">
                  {info.displayName}
                </span>
              </button>
            );
          })}
        </div>

        {/* MAIN SCROLLABLE CONVERSATION LIST & SEARCH RESULTS */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {/* Live Search Results to Add / Follow / Message any username */}
          {searchQuery.trim() && searchedCommunityUsers.length > 0 && (
            <div className="px-4 py-3 bg-[#101317]">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#00d95f] mb-2">
                Add / Follow People ({searchedCommunityUsers.length})
              </p>
              <div className="space-y-2">
                {searchedCommunityUsers.map((u) => {
                  const uKey = sanitizeDbKey(u.username);
                  const info = resolveUserMessengerInfo(u.username);
                  const isFollowing = Boolean(myFollowing[uKey]);
                  return (
                    <div
                      key={u.username}
                      className="flex items-center justify-between gap-3 py-1.5"
                    >
                      <div
                        onClick={() => setViewingUserMsgProfile(u.username)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1f242b] shrink-0 flex items-center justify-center">
                          {info.avatarUrl ? (
                            <img
                              src={info.avatarUrl}
                              alt={info.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-white">
                              {info.displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {info.displayName}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">@{u.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFollow(u.username, e)}
                          className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
                            isFollowing
                              ? 'bg-[#1e232a] text-zinc-200 border border-white/10'
                              : 'bg-[#00d95f] text-black'
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            handleSelectConversation({ type: 'dm', peerUsername: u.username });
                          }}
                          className="px-3 py-1.5 rounded-full bg-[#1b1f26] hover:bg-[#262b34] text-white text-xs font-bold cursor-pointer"
                        >
                          Message
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conversations List */}
          {unifiedConversations.length === 0 ? (
            <div className="py-16 px-6 text-center text-zinc-500">
              <p className="text-sm font-bold text-zinc-300">No conversations found</p>
              <p className="text-xs text-zinc-500 mt-1">
                Search for a username above to follow & message them, or tap + to create a group chat.
              </p>
            </div>
          ) : (
            unifiedConversations.map((conv) => {
              const isSelected =
                (activeChat?.type === 'dm' &&
                  conv.type === 'dm' &&
                  activeChat.peerUsername.toLowerCase() === conv.targetId.toLowerCase()) ||
                (activeChat?.type === 'group' &&
                  conv.type === 'group' &&
                  activeChat.groupId === conv.targetId);

              return (
                <div
                  key={conv.id}
                  onClick={() =>
                    handleSelectConversation(
                      conv.type === 'dm'
                        ? { type: 'dm', peerUsername: conv.targetId }
                        : { type: 'group', groupId: conv.targetId }
                    )
                  }
                  className={`px-4 py-3.5 flex items-center gap-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer ${
                    isSelected ? 'bg-white/[0.06]' : ''
                  }`}
                >
                  {/* Avatar with green online dot */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-[#1c2026] flex items-center justify-center">
                      {conv.avatarUrl ? (
                        <img
                          src={conv.avatarUrl}
                          alt={conv.title}
                          className="w-full h-full object-cover"
                        />
                      ) : conv.type === 'group' ? (
                        <Users className="w-6 h-6 text-[#00d95f]" />
                      ) : (
                        <span className="text-xl font-black text-white">
                          {conv.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {conv.isOnline && (
                      <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#00d95f] border-2 border-[#090a0c]" />
                    )}
                  </div>

                  {/* Name & Message Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base font-extrabold text-white truncate">
                          {conv.title}
                        </span>
                        {conv.isFavorite && (
                          <Star className="w-3.5 h-3.5 text-[#00d95f] fill-[#00d95f] shrink-0" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-zinc-400 shrink-0">
                        {formatShortTime(conv.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-sm text-zinc-400 truncate">{conv.subtitle}</p>
                      {conv.unreadCount > 0 && (
                        <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#00d95f] text-black font-extrabold text-xs flex items-center justify-center shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* RIGHT PANE: ACTIVE CONVERSATION (1-ON-1 DM OR GROUP CHAT)           */}
      {/* =================================================================== */}
      {activeChat ? (
        <div className="flex-1 flex flex-col h-full bg-[#0c0e11] overflow-hidden">
          {/* Active Chat Top Bar */}
          {(() => {
            if (activeChat.type === 'dm') {
              const info = resolveUserMessengerInfo(activeChat.peerUsername);
              const peerKey = sanitizeDbKey(activeChat.peerUsername);
              const favKey = `dm_${peerKey}`;
              const isFav = Boolean(myFavorites[favKey]);
              const isFollowing = Boolean(myFollowing[peerKey]);

              return (
                <div className="h-16 px-4 bg-[#121519] border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setActiveChat(null)}
                      className="md:hidden p-1.5 -ml-1 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div
                      onClick={() => setViewingUserMsgProfile(info.username)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer group"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#1e2229] shrink-0 flex items-center justify-center">
                        {info.avatarUrl ? (
                          <img
                            src={info.avatarUrl}
                            alt={info.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-white">
                            {info.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-extrabold text-white truncate group-hover:text-[#00d95f] transition-colors">
                          {info.displayName}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          {info.isOnline ? 'Online' : 'Offline'} · {info.followersCount} followers
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {peerKey !== 'system' && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFollow(info.username, e)}
                        className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
                          isFollowing
                            ? 'bg-[#1d2229] text-zinc-200 border border-white/10'
                            : 'bg-[#00d95f] text-black'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(favKey, e)}
                      title="Toggle Favorite"
                      className="p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          isFav ? 'text-[#00d95f] fill-[#00d95f]' : 'text-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            } else {
              const grp = activeGroupObj;
              const favKey = `group_${activeChat.groupId}`;
              const isFav = Boolean(myFavorites[favKey]);
              const memberCount = Object.keys(grp?.members || {}).length;

              return (
                <div className="h-16 px-4 bg-[#121519] border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setActiveChat(null)}
                      className="md:hidden p-1.5 -ml-1 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div
                      onClick={() => setShowGroupInfoModal(true)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1e2229] shrink-0 flex items-center justify-center">
                        {grp?.avatarUrl ? (
                          <img
                            src={grp.avatarUrl}
                            alt={grp.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-5 h-5 text-[#00d95f]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-extrabold text-white truncate group-hover:text-[#00d95f] transition-colors">
                          {grp?.name || 'Group Chat'}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          {memberCount} members · Tap for group info
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(favKey, e)}
                      title="Toggle Favorite"
                      className="p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          isFav ? 'text-[#00d95f] fill-[#00d95f]' : 'text-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            }
          })()}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
                <MessageCircle className="w-10 h-10 text-[#00d95f]/40 mb-2" />
                <p className="text-sm font-bold text-zinc-300">No messages yet</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Send a message or photo below to start the conversation!
                </p>
              </div>
            ) : (
              activeMessages.map((m) => {
                const isMe = m.sender.toLowerCase() === currentUser.username.toLowerCase();
                const senderInfo = resolveUserMessengerInfo(m.sender);
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => setViewingUserMsgProfile(m.sender)}
                        className="w-8 h-8 rounded-full overflow-hidden bg-[#1e2229] shrink-0 flex items-center justify-center cursor-pointer"
                      >
                        {senderInfo.avatarUrl ? (
                          <img
                            src={senderInfo.avatarUrl}
                            alt={senderInfo.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-white">
                            {senderInfo.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </button>
                    )}

                    <div
                      className={`max-w-[78%] sm:max-w-[68%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                        isMe
                          ? 'bg-[#005c4b] text-white rounded-br-sm'
                          : 'bg-[#1c2026] text-white rounded-bl-sm'
                      }`}
                    >
                      {activeChat.type === 'group' && !isMe && (
                        <p className="text-xs font-extrabold text-[#00d95f] mb-0.5">
                          {senderInfo.displayName}
                        </p>
                      )}

                      {m.mediaUrl && (
                        <div className="mb-1.5 rounded-xl overflow-hidden bg-black/30">
                          {m.mediaType === 'video' ? (
                            <video
                              src={m.mediaUrl}
                              controls
                              playsInline
                              className="max-h-64 w-full object-contain"
                            />
                          ) : m.mediaType === 'audio' ? (
                            <div className="p-2 flex flex-col gap-1.5 min-w-[210px]">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#00d95f]">
                                <Music className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{m.mediaName || 'Audio'}</span>
                              </div>
                              <audio src={m.mediaUrl} controls className="w-full h-8" />
                            </div>
                          ) : (
                            <img
                              src={m.mediaUrl}
                              alt="Attachment"
                              className="max-h-64 w-full object-contain"
                            />
                          )}
                        </div>
                      )}

                      {m.text && (
                        <p className="text-sm leading-relaxed break-words select-text">{m.text}</p>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-white/60">{m.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Pending Media Preview */}
          {(chatMediaUrl || isUploadingMedia) && (
            <div className="px-4 py-2 bg-[#14181d] border-t border-white/10 flex items-center justify-between gap-3">
              {isUploadingMedia ? (
                <div className="flex items-center gap-2 text-xs text-[#00d95f] font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading media...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0">
                  {chatMediaType === 'image' && chatMediaUrl && (
                    <img
                      src={chatMediaUrl}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  )}
                  <span className="text-xs font-bold text-white truncate">
                    {chatMediaName || 'Attachment ready'}
                  </span>
                </div>
              )}
              {!isUploadingMedia && (
                <button
                  type="button"
                  onClick={() => {
                    setChatMediaUrl(null);
                    setChatMediaType(null);
                    setChatMediaName(null);
                  }}
                  className="text-zinc-400 hover:text-rose-400 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Chat Composer Bar */}
          <form
            onSubmit={handleSendChatMessage}
            className="p-3 bg-[#121519] border-t border-white/10 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => chatMediaInputRef.current?.click()}
              disabled={isUploadingMedia}
              title="Upload image, video, or MP3"
              className="w-10 h-10 rounded-full bg-[#1d2229] hover:bg-[#262c35] text-zinc-200 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-[#1d2229] rounded-full px-4 py-2.5 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#00d95f]"
            />

            <button
              type="submit"
              disabled={(!chatText.trim() && !chatMediaUrl) || isUploadingMedia}
              className="w-10 h-10 rounded-full bg-[#00d95f] hover:bg-[#00c254] disabled:opacity-40 text-black flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <SendHorizontal className="w-5 h-5" />
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#0c0e11] text-center p-8">
          <div className="w-20 h-20 rounded-full bg-[#00d95f]/10 border border-[#00d95f]/30 flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-[#00d95f]" />
          </div>
          <h2 className="text-xl font-black text-white">Your Messages Hub</h2>
          <p className="text-sm text-zinc-400 max-w-sm mt-1">
            Select a chat on the left, search usernames to follow & message them, post stories, or create a group chat.
          </p>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: MY SPECIALIZED CUSTOM MESSAGES PROFILE                     */}
      {/* =================================================================== */}
      {showMyMsgProfileModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMyMsgProfileModal(false);
          }}
        >
          <div className="w-full max-w-md bg-[#12151a] border border-white/10 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">Custom Messages Profile</h3>
              <button
                type="button"
                onClick={() => setShowMyMsgProfileModal(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMyMsgProfile} className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#00d95f] bg-[#1b1f26] flex items-center justify-center">
                    {editAvatarUrl ? (
                      <img
                        src={editAvatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-black text-white">
                        {currentUser.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => msgAvatarInputRef.current?.click()}
                    disabled={isUploadingMsgAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#00d95f] text-black flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    {isUploadingMsgAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
                  <span>
                    <strong className="text-white">{Object.keys(myFollowers).length}</strong> Followers
                  </span>
                  <span>
                    <strong className="text-white">{Object.keys(myFollowing).length}</strong> Following
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Messages Display Name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder={currentUser.username}
                  className="w-full bg-[#1b1f26] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00d95f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  About / Status (WhatsApp Style)
                </label>
                <input
                  type="text"
                  value={editAbout}
                  onChange={(e) => setEditAbout(e.target.value)}
                  placeholder="Hey there! I am using Messages."
                  className="w-full bg-[#1b1f26] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00d95f]"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingMsgProfile}
                className="w-full py-3 rounded-xl bg-[#00d95f] hover:bg-[#00c254] text-black font-black text-sm transition-colors cursor-pointer"
              >
                {isSavingMsgProfile ? 'Saving...' : 'Save Messages Profile'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: VIEWING ANY USER'S SPECIALIZED MESSAGES PROFILE            */}
      {/* =================================================================== */}
      {viewingUserMsgProfile && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingUserMsgProfile(null);
          }}
        >
          {(() => {
            const info = resolveUserMessengerInfo(viewingUserMsgProfile);
            const targetKey = sanitizeDbKey(info.username);
            const isMe = targetKey === myKey;
            const isFollowing = Boolean(myFollowing[targetKey]);
            const userStories = storiesByAuthor.get(info.username.toLowerCase()) || [];

            return (
              <div className="w-full max-w-sm bg-[#12151a] border border-white/10 rounded-3xl p-6 shadow-2xl text-white text-center relative">
                <button
                  type="button"
                  onClick={() => setViewingUserMsgProfile(null)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div
                  onClick={() => {
                    if (userStories.length > 0) {
                      setViewingUserMsgProfile(null);
                      setViewingStoryAuthor(info.username);
                      setViewingStoryIndex(0);
                    }
                  }}
                  className={`w-24 h-24 mx-auto rounded-full p-0.5 mb-3 ${
                    userStories.length > 0
                      ? 'border-[3px] border-[#00d95f] cursor-pointer'
                      : 'border-2 border-white/15'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#1c2026] flex items-center justify-center">
                    {info.avatarUrl ? (
                      <img
                        src={info.avatarUrl}
                        alt={info.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-black text-white">
                        {info.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-black text-white">{info.displayName}</h3>
                <p className="text-xs text-zinc-400">@{info.username}</p>

                <p className="mt-3 text-sm text-zinc-200 bg-[#1a1e25] rounded-2xl px-4 py-2.5 border border-white/5">
                  {info.about}
                </p>

                <div className="flex items-center justify-center gap-6 my-4 text-sm">
                  <div>
                    <p className="font-black text-white">{info.followersCount}</p>
                    <p className="text-xs text-zinc-400">Followers</p>
                  </div>
                  <div>
                    <p className="font-black text-white">{info.followingCount}</p>
                    <p className="text-xs text-zinc-400">Following</p>
                  </div>
                  <div>
                    <p className="font-black text-white">{userStories.length}</p>
                    <p className="text-xs text-zinc-400">Stories</p>
                  </div>
                </div>

                {!isMe && (
                  <div className="flex items-center gap-2.5 mt-4">
                    {targetKey !== 'system' && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFollow(info.username, e)}
                        className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm cursor-pointer transition-colors ${
                          isFollowing
                            ? 'bg-[#1e232b] text-white border border-white/10'
                            : 'bg-[#00d95f] text-black'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setViewingUserMsgProfile(null);
                        handleSelectConversation({ type: 'dm', peerUsername: info.username });
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-[#1e232b] hover:bg-[#282f3a] text-white font-extrabold text-sm cursor-pointer"
                    >
                      Message
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: POST A STORY MODAL                                         */}
      {/* =================================================================== */}
      {showStoryCreatorModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStoryCreatorModal(false);
          }}
        >
          <div className="w-full max-w-md bg-[#12151a] border border-white/10 rounded-3xl p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-white">Post to Your Story</h3>
              <button
                type="button"
                onClick={() => setShowStoryCreatorModal(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishStory} className="space-y-4">
              <div className="rounded-2xl overflow-hidden bg-black/50 border border-white/10 min-h-[220px] max-h-[340px] flex items-center justify-center relative">
                {isUploadingStory ? (
                  <div className="flex flex-col items-center gap-2 text-[#00d95f]">
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span className="text-xs font-bold">Uploading story media...</span>
                  </div>
                ) : storyMediaUrl ? (
                  storyMediaType === 'video' ? (
                    <video
                      src={storyMediaUrl}
                      controls
                      className="max-h-[320px] w-full object-contain"
                    />
                  ) : (
                    <img
                      src={storyMediaUrl}
                      alt="Story preview"
                      className="max-h-[320px] w-full object-contain"
                    />
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => storyFileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 text-zinc-400 hover:text-white cursor-pointer p-8"
                  >
                    <ImageIcon className="w-10 h-10 text-[#00d95f]" />
                    <span className="text-sm font-bold">Select Photo or Video</span>
                  </button>
                )}
              </div>

              <input
                type="text"
                value={storyCaption}
                onChange={(e) => setStoryCaption(e.target.value)}
                placeholder="Add a caption to your story..."
                className="w-full bg-[#1b1f26] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-[#00d95f]"
              />

              <button
                type="submit"
                disabled={!storyMediaUrl || isUploadingStory || isPostingStory}
                className="w-full py-3 rounded-xl bg-[#00d95f] hover:bg-[#00c254] disabled:opacity-40 text-black font-black text-sm transition-colors cursor-pointer"
              >
                {isPostingStory ? 'Sharing Story...' : 'Share Story'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: STORY VIEWER & COMMENTS MODAL                              */}
      {/* =================================================================== */}
      {viewingStoryAuthor && currentViewedStory && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingStoryAuthor(null);
          }}
        >
          <div className="w-full max-w-md h-[90vh] bg-[#101216] border border-white/10 rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
            {/* Story Progress Bars */}
            <div className="px-3 pt-3 flex items-center gap-1.5">
              {activeAuthorStories.map((st, idx) => (
                <div
                  key={st.id}
                  onClick={() => setViewingStoryIndex(idx)}
                  className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden cursor-pointer"
                >
                  <div
                    className={`h-full ${
                      idx <= viewingStoryIndex ? 'bg-[#00d95f]' : 'bg-transparent'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Story Author Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1e2229] flex items-center justify-center border border-[#00d95f]">
                  {currentViewedStory.authorAvatarUrl ? (
                    <img
                      src={currentViewedStory.authorAvatarUrl}
                      alt={currentViewedStory.authorDisplayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {currentViewedStory.authorDisplayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-white leading-tight">
                    {currentViewedStory.authorDisplayName}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {formatShortTime(currentViewedStory.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentViewedStory.authorUsername.toLowerCase() ===
                  currentUser.username.toLowerCase() && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStory(currentViewedStory.id)}
                    title="Delete story"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingStoryAuthor(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Story Media & Navigation Arrows */}
            <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden min-h-[240px]">
              {currentViewedStory.mediaType === 'video' ? (
                <video
                  src={currentViewedStory.mediaUrl}
                  controls
                  autoPlay
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <img
                  src={currentViewedStory.mediaUrl}
                  alt="Story"
                  className="max-h-full max-w-full object-contain"
                />
              )}

              {currentViewedStory.caption && (
                <div className="absolute bottom-3 inset-x-4 bg-black/70 backdrop-blur-sm rounded-xl px-3.5 py-2 text-center text-sm text-white font-medium">
                  {currentViewedStory.caption}
                </div>
              )}

              {viewingStoryIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setViewingStoryIndex((i) => Math.max(0, i - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {viewingStoryIndex < activeAuthorStories.length - 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setViewingStoryIndex((i) => Math.min(activeAuthorStories.length - 1, i + 1))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Story Comments Feed */}
            <div className="max-h-40 overflow-y-auto px-4 py-2.5 bg-[#12151a] border-t border-white/10 space-y-2">
              {currentViewedStory.comments.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-1">
                  No comments yet. Leave a comment below!
                </p>
              ) : (
                currentViewedStory.comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-xs">
                    <span className="font-extrabold text-[#00d95f] shrink-0">
                      {c.authorDisplayName}:
                    </span>
                    <span className="text-zinc-200 break-words flex-1">{c.text}</span>
                  </div>
                ))
              )}
            </div>

            {/* Story Like + Comment Input Bar */}
            <form
              onSubmit={(e) => handleAddStoryComment(currentViewedStory, e)}
              className="p-3 bg-[#161a20] border-t border-white/10 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => handleToggleStoryLike(currentViewedStory)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-full bg-[#1f242c] text-xs font-bold cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${
                    currentViewedStory.likes?.[myKey]
                      ? 'text-rose-500 fill-rose-500'
                      : 'text-zinc-300'
                  }`}
                />
                <span>{Object.keys(currentViewedStory.likes || {}).length}</span>
              </button>

              <input
                type="text"
                value={storyCommentInput}
                onChange={(e) => setStoryCommentInput(e.target.value)}
                placeholder="Comment on story..."
                className="flex-1 bg-[#1f242c] rounded-full px-3.5 py-2 text-xs sm:text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#00d95f]"
              />

              <button
                type="submit"
                disabled={!storyCommentInput.trim()}
                className="w-9 h-9 rounded-full bg-[#00d95f] disabled:opacity-40 text-black flex items-center justify-center shrink-0 cursor-pointer"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: CREATE GROUP CHAT MODAL                                    */}
      {/* =================================================================== */}
      {showCreateGroupModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateGroupModal(false);
          }}
        >
          <div className="w-full max-w-md bg-[#12151a] border border-white/10 rounded-3xl p-6 shadow-2xl text-white max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">Create Group Chat</h3>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => groupAvatarInputRef.current?.click()}
                  className="w-14 h-14 rounded-full bg-[#1b1f26] border-2 border-[#00d95f] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                >
                  {isUploadingGroupAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#00d95f]" />
                  ) : newGroupAvatarUrl ? (
                    <img
                      src={newGroupAvatarUrl}
                      alt="Group"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-5 h-5 text-[#00d95f]" />
                  )}
                </button>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name..."
                  className="flex-1 bg-[#1b1f26] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder-zinc-400 focus:outline-none focus:border-[#00d95f]"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                  placeholder="Search users to add to group..."
                  className="w-full bg-[#1b1f26] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[160px]">
                {allUsersList
                  .filter(
                    (u) =>
                      u.username.toLowerCase() !== currentUser.username.toLowerCase() &&
                      u.username.toLowerCase() !== 'system' &&
                      (!groupMemberSearch.trim() ||
                        u.username.toLowerCase().includes(groupMemberSearch.trim().toLowerCase()))
                  )
                  .map((u) => {
                    const uKey = sanitizeDbKey(u.username);
                    const info = resolveUserMessengerInfo(u.username);
                    const isChecked = Boolean(selectedGroupMembers[uKey]);
                    return (
                      <div
                        key={u.username}
                        onClick={() =>
                          setSelectedGroupMembers((prev) => ({
                            ...prev,
                            [uKey]: !prev[uKey]
                          }))
                        }
                        className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1e2229] flex items-center justify-center shrink-0">
                            {info.avatarUrl ? (
                              <img
                                src={info.avatarUrl}
                                alt={info.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-white">
                                {info.displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {info.displayName}
                            </p>
                            <p className="text-xs text-zinc-400 truncate">@{u.username}</p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isChecked
                              ? 'bg-[#00d95f] border-[#00d95f] text-black'
                              : 'border-zinc-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="w-full py-3 rounded-xl bg-[#00d95f] hover:bg-[#00c254] disabled:opacity-40 text-black font-black text-sm transition-colors cursor-pointer shrink-0"
              >
                Create Group Chat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 6: GROUP INFO MODAL                                           */}
      {/* =================================================================== */}
      {showGroupInfoModal && activeGroupObj && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGroupInfoModal(false);
          }}
        >
          <div className="w-full max-w-sm bg-[#12151a] border border-white/10 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">{activeGroupObj.name}</h3>
              <button
                type="button"
                onClick={() => setShowGroupInfoModal(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-[#00d95f] mb-2">
              Group Members ({Object.keys(activeGroupObj.members).length})
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {Object.keys(activeGroupObj.members).map((memKey) => {
                const matched = allUsersList.find((u) => sanitizeDbKey(u.username) === memKey);
                const uname = matched?.username || memKey;
                const info = resolveUserMessengerInfo(uname);
                return (
                  <div
                    key={memKey}
                    onClick={() => {
                      setShowGroupInfoModal(false);
                      setViewingUserMsgProfile(info.username);
                    }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1e2229] flex items-center justify-center shrink-0">
                      {info.avatarUrl ? (
                        <img
                          src={info.avatarUrl}
                          alt={info.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-white">
                          {info.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{info.displayName}</p>
                      <p className="text-xs text-zinc-400 truncate">@{info.username}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
