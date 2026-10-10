import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Database,
  Trash2,
  Edit3,
  RefreshCw,
  Search,
  AlertTriangle,
  Check,
  Shield,
  MessageSquare,
  Users,
  Newspaper,
  Camera,
  HardDrive,
  Zap,
  Code,
  Mail
} from 'lucide-react';
import { rtdb, ref, get, set, update, remove } from '../lib/firebase';
import { ASSIGNABLE_RANKS, RANKS, getUserRank } from '../ranks';
import { sanitizeDbKey } from '../utils/auth';

interface DatabaseMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
}

function estimateBytes(obj: any): number {
  if (obj === null || obj === undefined) return 0;
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    try {
      return JSON.stringify(obj).length;
    } catch {
      return 0;
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export default function DatabaseMonitorModal({
  isOpen,
  onClose,
  currentUsername
}: DatabaseMonitorModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'messages' | 'pms' | 'stories_news' | 'raw'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Raw snapshots fetched on-demand when modal opens or refreshes
  const [rawMessages, setRawMessages] = useState<Record<string, any>>({});
  const [rawUsers, setRawUsers] = useState<Record<string, any>>({});

  // Editing user state
  const [editingUserKey, setEditingUserKey] = useState<string | null>(null);
  const [editUsernameVal, setEditUsernameVal] = useState('');
  const [editEmailVal, setEditEmailVal] = useState('');
  const [editRankVal, setEditRankVal] = useState('');
  const [editBioVal, setEditBioVal] = useState('');
  const [editMoodVal, setEditMoodVal] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Editing chat message state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgText, setEditMsgText] = useState('');

  // Raw path explorer state
  const [rawPathInput, setRawPathInput] = useState('messages');
  const [rawJsonText, setRawJsonText] = useState('');
  const [isSavingRaw, setIsSavingRaw] = useState(false);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const fetchDatabaseSnapshot = useCallback(async () => {
    setIsLoading(true);
    try {
      const [msgsSnap, usersSnap] = await Promise.all([
        get(ref(rtdb, 'messages')),
        get(ref(rtdb, 'users'))
      ]);
      const mVal = msgsSnap.exists() && typeof msgsSnap.val() === 'object' ? msgsSnap.val() : {};
      const uVal = usersSnap.exists() && typeof usersSnap.val() === 'object' ? usersSnap.val() : {};
      setRawMessages(mVal);
      setRawUsers(uVal);
    } catch (err: any) {
      showNotice(err?.message || 'Failed to read Realtime Database snapshot.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDatabaseSnapshot();
    }
  }, [isOpen, fetchDatabaseSnapshot]);

  // Compute detailed metrics across all collections
  const metrics = useMemo(() => {
    const msgEntries = Object.entries(rawMessages || {});
    const messagesBytes = estimateBytes(rawMessages);

    const userEntries: {
      key: string;
      data: any;
      bytes: number;
      pmCount: number;
      pmBytes: number;
      notifCount: number;
    }[] = [];

    let totalUsersProfileBytes = 0;
    let totalPmMessagesCount = 0;
    let totalPmBytes = 0;
    let totalNotificationsCount = 0;
    let totalNotificationsBytes = 0;

    for (const [uKey, uVal] of Object.entries(rawUsers || {})) {
      if (
        uKey === '__system_news__' ||
        uKey === '__system_bot__' ||
        uKey === '__system_messenger__'
      ) {
        continue;
      }
      if (!uVal || typeof uVal !== 'object') continue;

      const uBytes = estimateBytes(uVal);
      const pmsObj = uVal.pms && typeof uVal.pms === 'object' ? uVal.pms : {};
      const notifsObj =
        uVal.notifications && typeof uVal.notifications === 'object' ? uVal.notifications : {};

      let userPmCount = 0;
      for (const thread of Object.values(pmsObj) as any[]) {
        if (thread?.messages && typeof thread.messages === 'object') {
          userPmCount += Object.keys(thread.messages).length;
        }
      }
      const userPmBytes = estimateBytes(pmsObj);
      const userNotifBytes = estimateBytes(notifsObj);
      const userNotifCount = Object.keys(notifsObj).length;

      totalUsersProfileBytes += Math.max(0, uBytes - userPmBytes - userNotifBytes);
      totalPmMessagesCount += userPmCount;
      totalPmBytes += userPmBytes;
      totalNotificationsCount += userNotifCount;
      totalNotificationsBytes += userNotifBytes;

      userEntries.push({
        key: uKey,
        data: uVal,
        bytes: uBytes,
        pmCount: userPmCount,
        pmBytes: userPmBytes,
        notifCount: userNotifCount
      });
    }

    const newsNode = rawUsers?.['__system_news__']?.posts || {};
    const newsEntries = Object.entries(newsNode);
    const newsBytes = estimateBytes(rawUsers?.['__system_news__'] || {});

    const storiesNode = rawUsers?.['__system_messenger__']?.stories || {};
    const storiesEntries = Object.entries(storiesNode);
    const storiesBytes = estimateBytes(storiesNode);

    const groupsNode = rawUsers?.['__system_messenger__']?.groups || {};
    const groupsEntries = Object.entries(groupsNode);
    let totalGroupMessagesCount = 0;
    for (const [, gVal] of groupsEntries as [string, any][]) {
      if (gVal?.messages && typeof gVal.messages === 'object') {
        totalGroupMessagesCount += Object.keys(gVal.messages).length;
      }
    }
    const groupsBytes = estimateBytes(groupsNode);

    const totalDatabaseBytes =
      messagesBytes +
      totalUsersProfileBytes +
      totalPmBytes +
      totalNotificationsBytes +
      newsBytes +
      storiesBytes +
      groupsBytes;

    // Firebase Spark Free Tier RTDB Storage = 1 GB (1,073,741,824 bytes), Soft warning cap = 100 MB
    const sparkLimitBytes = 1024 * 1024 * 1024;
    const softCapBytes = 100 * 1024 * 1024;
    const percentOf1GB = Math.min(100, (totalDatabaseBytes / sparkLimitBytes) * 100);
    const percentOf100MB = Math.min(100, (totalDatabaseBytes / softCapBytes) * 100);

    return {
      msgEntries,
      messagesBytes,
      userEntries,
      totalUsersProfileBytes,
      totalPmMessagesCount,
      totalPmBytes,
      totalNotificationsCount,
      totalNotificationsBytes,
      newsEntries,
      newsBytes,
      storiesEntries,
      storiesBytes,
      groupsEntries,
      totalGroupMessagesCount,
      groupsBytes,
      totalDatabaseBytes,
      percentOf1GB,
      percentOf100MB
    };
  }, [rawMessages, rawUsers]);

  // Load raw JSON when switching to 'raw' tab or changing path
  useEffect(() => {
    if (activeTab === 'raw') {
      if (rawPathInput === 'messages') {
        setRawJsonText(JSON.stringify(rawMessages, null, 2));
      } else if (rawPathInput === 'users') {
        setRawJsonText(JSON.stringify(rawUsers, null, 2));
      } else if (rawPathInput === 'users/__system_news__/posts') {
        setRawJsonText(JSON.stringify(rawUsers?.['__system_news__']?.posts || {}, null, 2));
      } else if (rawPathInput === 'users/__system_messenger__/stories') {
        setRawJsonText(JSON.stringify(rawUsers?.['__system_messenger__']?.stories || {}, null, 2));
      } else if (rawPathInput === 'users/__system_messenger__/groups') {
        setRawJsonText(JSON.stringify(rawUsers?.['__system_messenger__']?.groups || {}, null, 2));
      }
    }
  }, [activeTab, rawPathInput, rawMessages, rawUsers]);

  if (!isOpen) return null;

  // ========================================================
  // ADMIN DATABASE ACTIONS
  // ========================================================

  // 1. Clear all Main Chat messages
  const handleClearAllMessages = async () => {
    try {
      await remove(ref(rtdb, 'messages'));
      setRawMessages({});
      showNotice('Cleared all main chat messages from Realtime Database.');
    } catch (err: any) {
      showNotice(err?.message || 'Failed to clear messages.', 'error');
    }
  };

  // 2. Delete a single Main Chat message
  const handleDeleteSingleMessage = async (msgId: string) => {
    try {
      await remove(ref(rtdb, `messages/${msgId}`));
      setRawMessages((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      showNotice(`Deleted message ${msgId}.`);
    } catch (err: any) {
      showNotice(err?.message || 'Failed to delete message.', 'error');
    }
  };

  // 3. Save edited Main Chat message text
  const handleSaveEditedMessage = async (msgId: string) => {
    try {
      await update(ref(rtdb, `messages/${msgId}`), {
        text: editMsgText
      });
      setRawMessages((prev) => ({
        ...prev,
        [msgId]: {
          ...prev[msgId],
          text: editMsgText
        }
      }));
      setEditingMsgId(null);
      showNotice('Updated message in Realtime Database.');
    } catch (err: any) {
      showNotice(err?.message || 'Failed to update message.', 'error');
    }
  };

  // 4. Clear all News posts
  const handleClearAllNews = async () => {
    try {
      await remove(ref(rtdb, 'users/__system_news__/posts'));
      await fetchDatabaseSnapshot();
      showNotice('Cleared all News posts from Realtime Database.');
    } catch (err: any) {
      showNotice(err?.message || 'Failed to clear news.', 'error');
    }
  };

  // 5. Clear all Stories
  const handleClearAllStories = async () => {
    try {
      await remove(ref(rtdb, 'users/__system_messenger__/stories'));
      await fetchDatabaseSnapshot();
      showNotice('Cleared all Stories from Realtime Database.');
    } catch (err: any) {
      showNotice(err?.message || 'Failed to clear stories.', 'error');
    }
  };

  // 6. Clear all PMs across ALL users
  const handleClearAllPmsEverywhere = async () => {
    try {
      const updatesMap: Record<string, null> = {};
      for (const u of metrics.userEntries) {
        updatesMap[`users/${u.key}/pms`] = null;
      }
      if (Object.keys(updatesMap).length > 0) {
        await update(ref(rtdb), updatesMap);
      }
      await fetchDatabaseSnapshot();
      showNotice('Purged all PM conversations across all users.');
    } catch (err: any) {
      showNotice(err?.message || 'Failed to purge PMs.', 'error');
    }
  };

  // 7. Clear all Group Chat messages
  const handleClearAllGroupMessages = async () => {
    try {
      const updatesMap: Record<string, null> = {};
      for (const [gId] of metrics.groupsEntries) {
        updatesMap[`users/__system_messenger__/groups/${gId}/messages`] = null;
      }
      if (Object.keys(updatesMap).length > 0) {
        await update(ref(rtdb), updatesMap);
      }
      await fetchDatabaseSnapshot();
      showNotice('Cleared all group chat messages from Realtime Database.');
    } catch (err: any) {
      showNotice(err?.message || 'Failed to clear group messages.', 'error');
    }
  };

  // 8. Optimize & Prune Bloated Data (removes ghost nodes, oversized base64 data URLs > 80KB, old notifications)
  const handleOptimizeDatabase = async () => {
    setIsLoading(true);
    try {
      let prunedItems = 0;
      const updatesMap: Record<string, any> = {};

      // Check chat messages for oversized inline base64 strings
      for (const [mId, mVal] of Object.entries(rawMessages || {})) {
        if (typeof mVal?.mediaUrl === 'string' && mVal.mediaUrl.startsWith('data:') && mVal.mediaUrl.length > 80000) {
          updatesMap[`messages/${mId}`] = null;
          prunedItems++;
        }
        if (typeof mVal?.avatarUrl === 'string' && mVal.avatarUrl.startsWith('data:') && mVal.avatarUrl.length > 80000) {
          updatesMap[`messages/${mId}/avatarUrl`] = null;
          prunedItems++;
        }
      }

      // Check users for ghost nodes or bloated inline base64 strings
      for (const [uKey, uVal] of Object.entries(rawUsers || {})) {
        if (
          uKey === '__system_news__' ||
          uKey === '__system_bot__' ||
          uKey === '__system_messenger__'
        ) {
          continue;
        }
        if (!uVal || typeof uVal !== 'object' || !uVal.username) {
          updatesMap[`users/${uKey}`] = null;
          prunedItems++;
          continue;
        }
        if (typeof uVal.avatarUrl === 'string' && uVal.avatarUrl.startsWith('data:') && uVal.avatarUrl.length > 80000) {
          updatesMap[`users/${uKey}/avatarUrl`] = null;
          prunedItems++;
        }
        if (typeof uVal.bannerUrl === 'string' && uVal.bannerUrl.startsWith('data:') && uVal.bannerUrl.length > 80000) {
          updatesMap[`users/${uKey}/bannerUrl`] = null;
          prunedItems++;
        }
        // Trim notifications to latest 25 per user
        if (uVal.notifications && typeof uVal.notifications === 'object') {
          const nEntries = Object.entries(uVal.notifications) as [string, any][];
          if (nEntries.length > 25) {
            nEntries.sort((a, b) => (a[1]?.createdAt || 0) - (b[1]?.createdAt || 0));
            const toRemove = nEntries.slice(0, nEntries.length - 25);
            for (const [nId] of toRemove) {
              updatesMap[`users/${uKey}/notifications/${nId}`] = null;
              prunedItems++;
            }
          }
        }
      }

      if (Object.keys(updatesMap).length > 0) {
        await update(ref(rtdb), updatesMap);
      }
      await fetchDatabaseSnapshot();
      showNotice(`Optimization complete! Pruned ${prunedItems} bloated/ghost records.`);
    } catch (err: any) {
      showNotice(err?.message || 'Database optimization failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 9. Start editing a user row
  const handleStartEditUser = (uKey: string, uData: any) => {
    setEditingUserKey(uKey);
    setEditUsernameVal(uData.username || uKey);
    setEditEmailVal(uData.email || '');
    setEditRankVal(uData.rank || 'none');
    setEditBioVal(uData.bio || '');
    setEditMoodVal(uData.mood || '');
  };

  // 10. Save edited user (including renaming username key in RTDB and updating their messages!)
  const handleSaveEditedUser = async (oldKey: string) => {
    const oldData = rawUsers[oldKey];
    if (!oldData) return;

    const cleanNewUsername = editUsernameVal.trim();
    if (!cleanNewUsername) {
      showNotice('Username cannot be empty.', 'error');
      return;
    }

    const newKey = sanitizeDbKey(cleanNewUsername);
    if (!newKey) {
      showNotice('Invalid username characters.', 'error');
      return;
    }

    setIsSavingUser(true);
    try {
      // Check if renaming to an existing different user's key
      if (newKey !== oldKey && rawUsers[newKey] && rawUsers[newKey].username) {
        showNotice(`Username "${cleanNewUsername}" is already taken by another user.`, 'error');
        setIsSavingUser(false);
        return;
      }

      const updatedUserRecord = {
        ...oldData,
        username: cleanNewUsername,
        usernameLower: cleanNewUsername.toLowerCase(),
        email: editEmailVal.trim(),
        emailLower: editEmailVal.trim().toLowerCase(),
        rank: editRankVal === 'none' ? null : editRankVal,
        bio: editBioVal,
        mood: editMoodVal,
        updatedAt: Date.now()
      };

      if (newKey !== oldKey) {
        // Create new node and remove old node
        await set(ref(rtdb, `users/${newKey}`), updatedUserRecord);
        await remove(ref(rtdb, `users/${oldKey}`));
      } else {
        await update(ref(rtdb, `users/${oldKey}`), {
          username: cleanNewUsername,
          usernameLower: cleanNewUsername.toLowerCase(),
          email: editEmailVal.trim(),
          emailLower: editEmailVal.trim().toLowerCase(),
          rank: editRankVal === 'none' ? null : editRankVal,
          bio: editBioVal,
          mood: editMoodVal,
          rankUpdatedAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      // Also update sender username & rank across existing chat messages from this user
      const msgUpdates: Record<string, any> = {};
      for (const [mId, mVal] of Object.entries(rawMessages || {})) {
        if (
          mVal?.senderKey === oldKey ||
          (typeof mVal?.sender === 'string' &&
            mVal.sender.toLowerCase() === (oldData.username || oldKey).toLowerCase())
        ) {
          msgUpdates[`messages/${mId}/sender`] = cleanNewUsername;
          msgUpdates[`messages/${mId}/senderKey`] = newKey;
          msgUpdates[`messages/${mId}/rank`] = editRankVal === 'none' ? null : editRankVal;
        }
      }
      if (Object.keys(msgUpdates).length > 0) {
        await update(ref(rtdb), msgUpdates);
      }

      setEditingUserKey(null);
      await fetchDatabaseSnapshot();
      showNotice(`Saved changes for user @${cleanNewUsername}.`);
    } catch (err: any) {
      showNotice(err?.message || 'Failed to update user.', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  // 11. Delete a user & all their messages from RTDB
  const handleDeleteUserFromDb = async (uKey: string, uName: string) => {
    try {
      await remove(ref(rtdb, `users/${uKey}`));
      const msgUpdates: Record<string, null> = {};
      for (const [mId, mVal] of Object.entries(rawMessages || {})) {
        if (
          mVal?.senderKey === uKey ||
          (typeof mVal?.sender === 'string' && mVal.sender.toLowerCase() === uName.toLowerCase())
        ) {
          msgUpdates[`messages/${mId}`] = null;
        }
      }
      if (Object.keys(msgUpdates).length > 0) {
        await update(ref(rtdb), msgUpdates);
      }
      await fetchDatabaseSnapshot();
      showNotice(`Deleted user @${uName} and their messages from Realtime Database.`);
    } catch (err: any) {
      showNotice(err?.message || 'Failed to delete user.', 'error');
    }
  };

  // 12. Clear a specific user's PMs or Notifications
  const handleClearUserSubnode = async (uKey: string, subnode: 'pms' | 'notifications') => {
    try {
      await remove(ref(rtdb, `users/${uKey}/${subnode}`));
      await fetchDatabaseSnapshot();
      showNotice(`Cleared ${subnode} for ${uKey}.`);
    } catch (err: any) {
      showNotice(err?.message || `Failed to clear ${subnode}.`, 'error');
    }
  };

  // 13. Delete a single Story or News post or Group
  const handleDeletePath = async (dbPath: string, label: string) => {
    try {
      await remove(ref(rtdb, dbPath));
      await fetchDatabaseSnapshot();
      showNotice(`Deleted ${label} from Realtime Database.`);
    } catch (err: any) {
      showNotice(err?.message || `Failed to delete ${label}.`, 'error');
    }
  };

  // 14. Load / Save custom Raw JSON path
  const handleLoadRawPath = async () => {
    const cleanPath = rawPathInput.trim().replace(/^\/+|\/+$/g, '');
    if (!cleanPath) return;
    setIsLoading(true);
    try {
      const snap = await get(ref(rtdb, cleanPath));
      setRawJsonText(JSON.stringify(snap.exists() ? snap.val() : null, null, 2));
      showNotice(`Loaded path /${cleanPath}`);
    } catch (err: any) {
      showNotice(err?.message || 'Failed to load path.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRawPath = async () => {
    const cleanPath = rawPathInput.trim().replace(/^\/+|\/+$/g, '');
    if (!cleanPath) return;
    setIsSavingRaw(true);
    try {
      const parsed = JSON.parse(rawJsonText);
      await set(ref(rtdb, cleanPath), parsed);
      await fetchDatabaseSnapshot();
      showNotice(`Written JSON to /${cleanPath} in Realtime Database!`);
    } catch (err: any) {
      showNotice(err?.message || 'Invalid JSON or permission error.', 'error');
    } finally {
      setIsSavingRaw(false);
    }
  };

  // Filtered lists for tables
  const filteredUsers = metrics.userEntries.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.key.toLowerCase().includes(q) ||
      (u.data.username || '').toLowerCase().includes(q) ||
      (u.data.email || '').toLowerCase().includes(q) ||
      (u.data.rank || '').toLowerCase().includes(q)
    );
  });

  const sortedMessages = [...metrics.msgEntries]
    .sort((a, b) => (b[1]?.createdAt || 0) - (a[1]?.createdAt || 0))
    .filter(([mId, m]) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        mId.toLowerCase().includes(q) ||
        (m?.sender || '').toLowerCase().includes(q) ||
        (m?.text || '').toLowerCase().includes(q)
      );
    });

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[90vh] bg-[#101014] border border-red-500/40 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#1a1014] via-[#16141c] to-[#141418] border-b border-red-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-inner">
              <i className="fa fa-flag text-red-500 text-base" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Firebase Realtime Database Console
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 rounded-md">
                  Main Dev Only ({currentUsername})
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Live Storage Monitor, Auto-Purge Rules & Full Database Table Editor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDatabaseSnapshot}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-[#1d1d26] hover:bg-[#272733] border border-[#2e2e3d] text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
              <span>Refresh DB</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast Banner */}
        {statusBanner && (
          <div
            className={`px-5 py-2 text-xs font-bold flex items-center justify-between border-b shrink-0 ${
              statusBanner.type === 'error'
                ? 'bg-red-500/20 border-red-500/40 text-red-200'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <span>{statusBanner.text}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-white/70 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs + Search */}
        <div className="px-5 py-2.5 bg-[#14141a] border-b border-[#22222c] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-[#1c1c24] text-zinc-400 hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Monitor & Storage</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-[#1c1c24] text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users Table ({metrics.userEntries.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'messages'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-[#1c1c24] text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat Messages ({metrics.msgEntries.length}/200)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pms')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'pms'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-[#1c1c24] text-zinc-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>PMs & Groups ({metrics.totalPmMessagesCount + metrics.totalGroupMessagesCount}/1000)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stories_news')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'stories_news'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-[#1c1c24] text-zinc-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Stories ({metrics.storiesEntries.length}/50) & News ({metrics.newsEntries.length}/10)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-[#1c1c24] text-zinc-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw JSON Tree</span>
            </button>
          </div>

          {(activeTab === 'users' || activeTab === 'messages') && (
            <div className="relative w-60">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Filter ${activeTab}...`}
                className="w-full bg-[#1b1b23] border border-[#2c2c38] rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          )}
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: OVERVIEW & STORAGE MONITOR */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Storage Gauge Card */}
              <div className="bg-[#15151c] border border-[#252532] rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Database className="w-4 h-4 text-red-400" />
                      <span>Realtime Database Live Storage & Usage</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Real-time payload size across all database nodes. Automatic purge limits keep download bandwidth low.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOptimizeDatabase}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Optimize & Prune Bloated Data Now</span>
                  </button>
                </div>

                {/* Progress Bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div className="bg-[#1b1b24] border border-[#2a2a38] rounded-xl p-4">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-zinc-300">Database Payload Size (100 MB Fast-Sync Budget)</span>
                      <span className="text-red-400 font-black">
                        {formatBytes(metrics.totalDatabaseBytes)} / 100 MB ({metrics.percentOf100MB.toFixed(3)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-[#101015] rounded-full overflow-hidden border border-[#2a2a36]">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-300"
                        style={{ width: `${Math.max(2, metrics.percentOf100MB)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#1b1b24] border border-[#2a2a38] rounded-xl p-4">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-zinc-300">Firebase Free Tier Storage Used (1 GB Cap)</span>
                      <span className="text-emerald-400 font-black">
                        {formatBytes(metrics.totalDatabaseBytes)} / 1 GB ({metrics.percentOf1GB.toFixed(4)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-[#101015] rounded-full overflow-hidden border border-[#2a2a36]">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.max(1, metrics.percentOf1GB)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Auto-Delete Quotas Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Main Chat Messages Quota (200) */}
                  <div className="bg-[#191922] border border-[#282836] rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                        <span>Main Chat</span>
                        <span className="text-[11px] text-zinc-500">{formatBytes(metrics.messagesBytes)}</span>
                      </div>
                      <div className="text-lg font-black text-white mt-1">
                        {metrics.msgEntries.length} <span className="text-xs text-zinc-500">/ 200 msgs</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#111116] rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${Math.min(100, (metrics.msgEntries.length / 200) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Auto-deletes all at 200 messages</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllMessages}
                      className="mt-3 w-full py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Clear Chat ({metrics.msgEntries.length})
                    </button>
                  </div>

                  {/* News Posts Quota (10) */}
                  <div className="bg-[#191922] border border-[#282836] rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                        <span>Community News</span>
                        <span className="text-[11px] text-zinc-500">{formatBytes(metrics.newsBytes)}</span>
                      </div>
                      <div className="text-lg font-black text-white mt-1">
                        {metrics.newsEntries.length} <span className="text-xs text-zinc-500">/ 10 news</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#111116] rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${Math.min(100, (metrics.newsEntries.length / 10) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Auto-deletes all at 10 news posts</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllNews}
                      className="mt-3 w-full py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Clear News ({metrics.newsEntries.length})
                    </button>
                  </div>

                  {/* PMs Quota (1,000) */}
                  <div className="bg-[#191922] border border-[#282836] rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                        <span>Private Messages</span>
                        <span className="text-[11px] text-zinc-500">{formatBytes(metrics.totalPmBytes)}</span>
                      </div>
                      <div className="text-lg font-black text-white mt-1">
                        {metrics.totalPmMessagesCount} <span className="text-xs text-zinc-500">/ 1,000 PMs</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#111116] rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-cyan-500"
                          style={{ width: `${Math.min(100, (metrics.totalPmMessagesCount / 1000) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Auto-deletes all at 1,000 PMs</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllPmsEverywhere}
                      className="mt-3 w-full py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Purge All PMs
                    </button>
                  </div>

                  {/* Group Messages Quota (1,000) */}
                  <div className="bg-[#191922] border border-[#282836] rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                        <span>Group Messages</span>
                        <span className="text-[11px] text-zinc-500">{formatBytes(metrics.groupsBytes)}</span>
                      </div>
                      <div className="text-lg font-black text-white mt-1">
                        {metrics.totalGroupMessagesCount} <span className="text-xs text-zinc-500">/ 1,000 msgs</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#111116] rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${Math.min(100, (metrics.totalGroupMessagesCount / 1000) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Auto-deletes all at 1,000 msgs</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllGroupMessages}
                      className="mt-3 w-full py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Clear Group Msgs
                    </button>
                  </div>

                  {/* Stories Quota (50) */}
                  <div className="bg-[#191922] border border-[#282836] rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                        <span>Stories</span>
                        <span className="text-[11px] text-zinc-500">{formatBytes(metrics.storiesBytes)}</span>
                      </div>
                      <div className="text-lg font-black text-white mt-1">
                        {metrics.storiesEntries.length} <span className="text-xs text-zinc-500">/ 50 stories</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#111116] rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-pink-500"
                          style={{ width: `${Math.min(100, (metrics.storiesEntries.length / 50) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Auto-deletes all at 50 stories</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllStories}
                      className="mt-3 w-full py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Clear Stories ({metrics.storiesEntries.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Bandwidth Protections Summary */}
              <div className="bg-[#15151c] border border-[#252532] rounded-2xl p-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-3">
                  Active Firebase Bandwidth & Download Optimizations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#1a1a24] border border-[#282836] rounded-xl p-3">
                    <div className="font-bold text-white mb-1">1. Paginated Chat Window (60 msgs)</div>
                    <p className="text-zinc-400">
                      Loads only the latest 60 messages initially and dynamically fetches older messages only when scrolling up, with hard auto-clear at 200 messages.
                    </p>
                  </div>
                  <div className="bg-[#1a1a24] border border-[#282836] rounded-xl p-3">
                    <div className="font-bold text-white mb-1">2. Scoped Path Listeners</div>
                    <p className="text-zinc-400">
                      Eliminated duplicate full-tree listeners. Stories and Group listeners attach only while the Messages view is open and detach immediately on exit.
                    </p>
                  </div>
                  <div className="bg-[#1a1a24] border border-[#282836] rounded-xl p-3">
                    <div className="font-bold text-white mb-1">3. Automatic Quota Purging</div>
                    <p className="text-zinc-400">
                      Main Chat clears at 200 msgs, News clears at 10 posts, PMs & Group messages clear at 1,000 msgs, and Stories clear at 50 stories.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS DATABASE TABLE (Edit Usernames, Ranks, Emails, Delete Users) */}
          {activeTab === 'users' && (
            <div className="bg-[#15151c] border border-[#252532] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#252532] flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                  Registered Users Table ({filteredUsers.length})
                </span>
                <span className="text-xs text-zinc-400">
                  Profile Storage: {formatBytes(metrics.totalUsersProfileBytes)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1b1b24] text-zinc-400 border-b border-[#262634] uppercase text-[10px] font-black tracking-wider">
                      <th className="py-2.5 px-3">DB Key</th>
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Bio / Mood</th>
                      <th className="py-2.5 px-3">PMs / Notifs</th>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22222e]">
                    {filteredUsers.map(({ key, data, bytes, pmCount, notifCount }) => {
                      const isEditing = editingUserKey === key;
                      const resolvedRank = getUserRank(data.username, data.email, data.rank);

                      return (
                        <tr key={key} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">{key}</td>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editUsernameVal}
                                onChange={(e) => setEditUsernameVal(e.target.value)}
                                className="bg-[#101015] border border-red-500/60 rounded px-2 py-1 text-xs text-white font-bold w-32"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    data.isOnline ? 'bg-emerald-400' : 'bg-zinc-600'
                                  }`}
                                />
                                <span className="font-bold text-white">{data.username}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editEmailVal}
                                onChange={(e) => setEditEmailVal(e.target.value)}
                                className="bg-[#101015] border border-red-500/60 rounded px-2 py-1 text-xs text-white w-44"
                              />
                            ) : (
                              <span className="text-zinc-300">{data.email || '—'}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <select
                                value={editRankVal}
                                onChange={(e) => setEditRankVal(e.target.value)}
                                className="bg-[#101015] border border-red-500/60 rounded px-2 py-1 text-xs text-white"
                              >
                                <option value="none">User (None)</option>
                                {ASSIGNABLE_RANKS.filter((r) => r.id !== 'none').map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            ) : resolvedRank ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-bold">
                                <img src={resolvedRank.icon} alt="" className="w-3.5 h-3.5 object-contain" />
                                <span>{resolvedRank.name}</span>
                              </span>
                            ) : (
                              <span className="text-zinc-500">User</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 max-w-[180px]">
                            {isEditing ? (
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={editMoodVal}
                                  onChange={(e) => setEditMoodVal(e.target.value)}
                                  placeholder="Mood"
                                  className="bg-[#101015] border border-zinc-700 rounded px-2 py-0.5 text-[11px] text-white"
                                />
                                <input
                                  type="text"
                                  value={editBioVal}
                                  onChange={(e) => setEditBioVal(e.target.value)}
                                  placeholder="Bio"
                                  className="bg-[#101015] border border-zinc-700 rounded px-2 py-0.5 text-[11px] text-white"
                                />
                              </div>
                            ) : (
                              <div className="truncate text-zinc-400">
                                {data.mood ? <span className="text-zinc-200">{data.mood} </span> : null}
                                {data.bio || '—'}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleClearUserSubnode(key, 'pms')}
                                title="Click to clear user's PMs"
                                className="px-1.5 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-bold cursor-pointer"
                              >
                                {pmCount} PMs
                              </button>
                              <button
                                type="button"
                                onClick={() => handleClearUserSubnode(key, 'notifications')}
                                title="Click to clear user's notifications"
                                className="px-1.5 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[10px] font-bold cursor-pointer"
                              >
                                {notifCount} Notifs
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">
                            {formatBytes(bytes)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={isSavingUser}
                                  onClick={() => handleSaveEditedUser(key)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUserKey(null)}
                                  className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-[11px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditUser(key, data)}
                                  className="px-2.5 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUserFromDb(key, data.username || key)}
                                  className="p-1.5 rounded bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-400 cursor-pointer"
                                  title="Delete user & their messages"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CHAT MESSAGES TABLE */}
          {activeTab === 'messages' && (
            <div className="bg-[#15151c] border border-[#252532] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#252532] flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                  Main Chat Messages Table ({sortedMessages.length} / 200 Auto-Clear Limit)
                </span>
                <button
                  type="button"
                  onClick={handleClearAllMessages}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete All Chat Messages</span>
                </button>
              </div>
              <div className="overflow-x-auto max-h-[62vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1b1b24] text-zinc-400 border-b border-[#262634] uppercase text-[10px] font-black tracking-wider sticky top-0">
                      <th className="py-2.5 px-3">Message ID</th>
                      <th className="py-2.5 px-3">Sender</th>
                      <th className="py-2.5 px-3">Content / Media</th>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22222e]">
                    {sortedMessages.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500">
                          No chat messages in database.
                        </td>
                      </tr>
                    ) : (
                      sortedMessages.map(([mId, m]) => {
                        const isEditing = editingMsgId === mId;
                        return (
                          <tr key={mId} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-mono text-[11px] text-zinc-500">{mId}</td>
                            <td className="py-2 px-3 font-bold text-white">{m?.sender || 'Anonymous'}</td>
                            <td className="py-2 px-3 max-w-md">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editMsgText}
                                  onChange={(e) => setEditMsgText(e.target.value)}
                                  className="w-full bg-[#101015] border border-red-500/60 rounded px-2 py-1 text-xs text-white"
                                />
                              ) : (
                                <div className="space-y-1">
                                  <div className="text-zinc-200 break-words">{m?.text || '—'}</div>
                                  {m?.mediaUrl && (
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                                      Media: {m.mediaType || 'image'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-zinc-400 whitespace-nowrap">
                              {m?.timestamp || '—'}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-zinc-400">
                              {formatBytes(estimateBytes(m))}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditedMessage(mId)}
                                    className="px-2 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMsgId(null)}
                                    className="px-2 py-1 rounded bg-zinc-700 text-zinc-200 text-[11px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMsgId(mId);
                                      setEditMsgText(m?.text || '');
                                    }}
                                    className="p-1.5 rounded bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 cursor-pointer"
                                    title="Edit message text"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSingleMessage(mId)}
                                    className="p-1.5 rounded bg-red-500/15 hover:bg-red-500/30 text-red-400 cursor-pointer"
                                    title="Delete message"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PMs & GROUP CHATS TABLE */}
          {activeTab === 'pms' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* User PM Boxes */}
              <div className="bg-[#15151c] border border-[#252532] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#252532] flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                    User PM Mailboxes ({metrics.totalPmMessagesCount} / 1,000 Auto-Purge)
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllPmsEverywhere}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Purge All PMs
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1b1b24] text-zinc-400 border-b border-[#262634] uppercase text-[10px] font-black">
                        <th className="py-2 px-3">User</th>
                        <th className="py-2 px-3">Total PM Msgs</th>
                        <th className="py-2 px-3">Mailbox Size</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22222e]">
                      {metrics.userEntries.map((u) => (
                        <tr key={u.key} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-3 font-bold text-white">{u.data.username || u.key}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">{u.pmCount} msgs</td>
                          <td className="py-2 px-3 font-mono text-zinc-400">{formatBytes(u.pmBytes)}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleClearUserSubnode(u.key, 'pms')}
                              className="px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/30 text-red-300 text-[11px] font-bold cursor-pointer"
                            >
                              Clear PMs
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Group Chats Table */}
              <div className="bg-[#15151c] border border-[#252532] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#252532] flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                    Messages Group Chats ({metrics.totalGroupMessagesCount} / 1,000 Msgs)
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllGroupMessages}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Clear All Group Msgs
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1b1b24] text-zinc-400 border-b border-[#262634] uppercase text-[10px] font-black">
                        <th className="py-2 px-3">Group Name</th>
                        <th className="py-2 px-3">Members</th>
                        <th className="py-2 px-3">Messages</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22222e]">
                      {metrics.groupsEntries.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-zinc-500">
                            No group chats created yet.
                          </td>
                        </tr>
                      ) : (
                        metrics.groupsEntries.map(([gId, g]: [string, any]) => {
                          const mCount = g?.messages ? Object.keys(g.messages).length : 0;
                          const memCount = g?.members ? Object.keys(g.members).length : 0;
                          return (
                            <tr key={gId} className="hover:bg-white/[0.02]">
                              <td className="py-2 px-3 font-bold text-white">{g?.name || gId}</td>
                              <td className="py-2 px-3 text-zinc-400">{memCount} members</td>
                              <td className="py-2 px-3 text-emerald-400 font-bold">{mCount} msgs</td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeletePath(
                                      `users/__system_messenger__/groups/${gId}`,
                                      `group "${g?.name || gId}"`
                                    )
                                  }
                                  className="p-1.5 rounded bg-red-500/15 hover:bg-red-500/30 text-red-400 cursor-pointer"
                                  title="Delete group chat"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STORIES & NEWS TABLE */}
          {activeTab === 'stories_news' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Stories Table (50 limit) */}
              <div className="bg-[#15151c] border border-[#252532] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#252532] flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                    Active Stories ({metrics.storiesEntries.length} / 50 Auto-Delete)
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllStories}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Delete All Stories
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1b1b24] text-zinc-400 border-b border-[#262634] uppercase text-[10px] font-black">
                        <th className="py-2 px-3">Author</th>
                        <th className="py-2 px-3">Caption / Type</th>
                        <th className="py-2 px-3">Size</th>
                        <th className="py-2 px-3 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22222e]">
                      {metrics.storiesEntries.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-zinc-500">
                            No active stories.
                          </td>
                        </tr>
                      ) : (
                        metrics.storiesEntries.map(([sId, s]: [string, any]) => (
                          <tr key={sId} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-bold text-white">
                              {s?.authorUsername || 'User'}
                            </td>
                            <td className="py-2 px-3 text-zinc-300 truncate max-w-[180px]">
                              {s?.caption || `[${s?.mediaType || 'image'}]`}
                            </td>
                            <td className="py-2 px-3 font-mono text-zinc-400">
                              {formatBytes(estimateBytes(s))}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeletePath(
                                    `users/__system_messenger__/stories/${sId}`,
                                    `story ${sId}`
                                  )
                                }
                                className="p-1.5 rounded bg-red-500/15 hover:bg-red-500/30 text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Community News Table (10 limit) */}
              <div className="bg-[#15151c] border border-[#252532] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#252532] flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                    Community News ({metrics.newsEntries.length} / 10 Auto-Delete)
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllNews}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Delete All News
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1b1b24] text-zinc-400 border-b border-[#262634] uppercase text-[10px] font-black">
                        <th className="py-2 px-3">Author</th>
                        <th className="py-2 px-3">Title</th>
                        <th className="py-2 px-3">Size</th>
                        <th className="py-2 px-3 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22222e]">
                      {metrics.newsEntries.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-zinc-500">
                            No news posts.
                          </td>
                        </tr>
                      ) : (
                        metrics.newsEntries.map(([nId, n]: [string, any]) => (
                          <tr key={nId} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-bold text-white">{n?.author || 'Dev'}</td>
                            <td className="py-2 px-3 text-zinc-300 truncate max-w-[200px]">
                              {n?.title || n?.description || nId}
                            </td>
                            <td className="py-2 px-3 font-mono text-zinc-400">
                              {formatBytes(estimateBytes(n))}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeletePath(
                                    `users/__system_news__/posts/${nId}`,
                                    `news post ${nId}`
                                  )
                                }
                                className="p-1.5 rounded bg-red-500/15 hover:bg-red-500/30 text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RAW FIREBASE JSON TREE EDITOR */}
          {activeTab === 'raw' && (
            <div className="bg-[#15151c] border border-[#252532] rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-400">RTDB Path:</span>
                <input
                  type="text"
                  value={rawPathInput}
                  onChange={(e) => setRawPathInput(e.target.value)}
                  placeholder="e.g. messages or users/null"
                  className="flex-1 min-w-[220px] bg-[#101015] border border-[#2b2b38] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={handleLoadRawPath}
                  className="px-3 py-1.5 rounded-lg bg-[#232330] hover:bg-[#2c2c3c] text-xs font-bold text-white cursor-pointer"
                >
                  Load Path
                </button>
                <button
                  type="button"
                  disabled={isSavingRaw}
                  onClick={handleSaveRawPath}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
                >
                  {isSavingRaw ? 'Saving...' : 'Save JSON to RTDB'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePath(rawPathInput.trim(), `path /${rawPathInput.trim()}`)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
                >
                  Delete Path
                </button>
              </div>
              <textarea
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
                rows={20}
                spellCheck={false}
                className="w-full bg-[#0c0c10] border border-[#262634] rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-red-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
