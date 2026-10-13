import React, { useState, useEffect, useMemo } from 'react';
import { X, Gift, Lock, Check, Trophy, Flame, Medal, MessageSquare } from 'lucide-react';
import { rtdb, ref, get, set, update, onValue, serverTimestamp } from '../lib/firebase';
import { sanitizeDbKey } from '../utils/auth';

interface RewardsModalProps {
  type: 'messages' | 'login' | 'wheel';
  onClose: () => void;
  currentUser: { username: string; email?: string } | null;
  userProfile: any;
  onUpdateCurrency: (goldDelta: number, rubyDelta: number) => Promise<void> | void;
  userGold: number;
  userRuby: number;
  allUsersList: any[];
  messages?: any[];
}

export const GOLD_ICON = '/icons/gold.svg';
export const RUBY_ICON = '/icons/ruby.svg';

export const MESSAGE_TIERS = [
  { id: 'msg_5', count: 5, gold: 250, ruby: 3 },
  { id: 'msg_10', count: 10, gold: 600, ruby: 6 },
  { id: 'msg_25', count: 25, gold: 1500, ruby: 15 },
  { id: 'msg_50', count: 50, gold: 3500, ruby: 30 },
  { id: 'msg_100', count: 100, gold: 8000, ruby: 60 },
  { id: 'msg_250', count: 250, gold: 20000, ruby: 120 },
  { id: 'msg_500', count: 500, gold: 50000, ruby: 250 },
  { id: 'msg_1000', count: 1000, gold: 100000, ruby: 500 },
  { id: 'msg_2500', count: 2500, gold: 250000, ruby: 1200 },
  { id: 'msg_5000', count: 5000, gold: 600000, ruby: 2500 }
];

export const LOGIN_DAYS = Array.from({ length: 28 }, (_, i) => {
  const day = i + 1;
  if (day === 7) {
    return { day, gold: 6000, ruby: 100, isMilestone: true };
  }
  if (day === 14) {
    return { day, gold: 15000, ruby: 250, isMilestone: true };
  }
  if (day === 21) {
    return { day, gold: 35000, ruby: 500, isMilestone: true };
  }
  if (day === 28) {
    return { day, gold: 100000, ruby: 1500, isMilestone: true };
  }
  return {
    day,
    gold: day * 300,
    ruby: day * 15,
    isMilestone: false
  };
});

export const WHEEL_SLICES = [
  { id: '1', label: '1,000 Gold', type: 'gold', value: 1000, color: '#f59e0b', text: '#fff' },
  { id: '2', label: 'Nothing', type: 'nothing', value: 0, color: '#272730', text: '#9ca3af' },
  { id: '3', label: '15 Ruby', type: 'ruby', value: 15, color: '#e11d48', text: '#fff' },
  { id: '4', label: '2,500 Gold', type: 'gold', value: 2500, color: '#d97706', text: '#fff' },
  { id: '5', label: 'Nothing', type: 'nothing', value: 0, color: '#272730', text: '#9ca3af' },
  { id: '6', label: '30 Ruby', type: 'ruby', value: 30, color: '#be123c', text: '#fff' },
  { id: '7', label: '5,000 Gold', type: 'gold', value: 5000, color: '#b45309', text: '#fff' },
  { id: '8', label: 'Nothing', type: 'nothing', value: 0, color: '#272730', text: '#9ca3af' },
  { id: '9', label: '60 Ruby 💎', type: 'ruby', value: 60, color: '#9f1239', text: '#fff' },
  { id: '10', label: '10,000 Gold', type: 'gold', value: 10000, color: '#f59e0b', text: '#fff' },
  { id: '11', label: 'Nothing', type: 'nothing', value: 0, color: '#272730', text: '#9ca3af' },
  { id: '12', label: '120 Ruby 🌟', type: 'ruby', value: 120, color: '#f43f5e', text: '#fff' }
];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function playSound(url: string) {
  try {
    const audio = new Audio(url);
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch (_) {}
}

export default function RewardsModal({
  type,
  onClose,
  currentUser,
  userProfile,
  onUpdateCurrency,
  userGold,
  userRuby,
  allUsersList,
  messages = []
}: RewardsModalProps) {
  const [messagesTab, setMessagesTab] = useState<'rewards' | 'leaderboard'>('rewards');
  const [leaderboardScope, setLeaderboardScope] = useState<'daily' | 'alltime'>('daily');

  const todayStr = useMemo(() => getTodayDateString(), []);
  const userKey = currentUser?.username ? sanitizeDbKey(currentUser.username) : '';

  const [todayMsgCount, setTodayMsgCount] = useState<number>(() => {
    if (!currentUser?.username) return 0;
    try {
      const today = getTodayDateString();
      const uKey = sanitizeDbKey(currentUser.username);
      return Number(localStorage.getItem(`user_daily_messages_${uKey}_${today}`) || 0);
    } catch (_) {
      return 0;
    }
  });

  const [allTimeMsgCount, setAllTimeMsgCount] = useState<number>(0);

  const [claimedMsgTiers, setClaimedMsgTiers] = useState<Record<string, boolean>>(() => {
    if (!currentUser?.username) return {};
    try {
      const today = getTodayDateString();
      const uKey = sanitizeDbKey(currentUser.username);
      const raw = localStorage.getItem(`claimed_msg_tiers_${uKey}_${today}`);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  });

  const [dailyLeaderboard, setDailyLeaderboard] = useState<
    { username: string; count: number; avatarUrl?: string | null }[]
  >([]);

  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<
    { username: string; count: number; avatarUrl?: string | null }[]
  >([]);

  // Login Streak state
  const [loginStreak, setLoginStreak] = useState<number>(0);
  const [lastLoginClaimDate, setLastLoginClaimDate] = useState<string | null>(null);
  const [loginClaimLoading, setLoginClaimLoading] = useState(false);

  // Wheel state
  const [lastWheelSpinAt, setLastWheelSpinAt] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<(typeof WHEEL_SLICES)[0] | null>(null);

  // 1. Build in-memory stats from room messages, allUsersList, and localStorage
  const localStats = useMemo(() => {
    const dailyMap: Record<string, { username: string; count: number; avatarUrl?: string | null }> = {};
    const allTimeMap: Record<string, { username: string; count: number; avatarUrl?: string | null }> = {};

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();

    // 1a. Live room messages
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (!msg || msg.isSystem || !msg.sender || msg.sender.toLowerCase() === 'system') continue;
        const uName = String(msg.sender).trim();
        const uKey = sanitizeDbKey(uName);
        const isToday = (typeof msg.createdAt === 'number' && msg.createdAt >= startOfDayMs) || !msg.createdAt;

        if (!allTimeMap[uKey]) {
          allTimeMap[uKey] = { username: uName, count: 0, avatarUrl: msg.avatarUrl || null };
        }
        allTimeMap[uKey].count += 1;

        if (isToday) {
          if (!dailyMap[uKey]) {
            dailyMap[uKey] = { username: uName, count: 0, avatarUrl: msg.avatarUrl || null };
          }
          dailyMap[uKey].count += 1;
        }
      }
    }

    // 1b. Registered users in allUsersList
    if (Array.isArray(allUsersList)) {
      for (const u of allUsersList) {
        if (!u || !u.username || u.username.toLowerCase() === 'system') continue;
        const uKey = sanitizeDbKey(u.username);
        const uTodayCount = Number(u.rewards?.daily_messages?.[todayStr]?.count || 0);
        const uTotalCount = Number(u.totalMessages || 0);

        if (uTodayCount > 0) {
          if (!dailyMap[uKey] || dailyMap[uKey].count < uTodayCount) {
            dailyMap[uKey] = { username: u.username, count: uTodayCount, avatarUrl: u.avatarUrl || null };
          }
        }
        if (uTotalCount > 0) {
          if (!allTimeMap[uKey] || allTimeMap[uKey].count < uTotalCount) {
            allTimeMap[uKey] = { username: u.username, count: uTotalCount, avatarUrl: u.avatarUrl || null };
          }
        }
      }
    }

    // 1c. LocalStorage caches
    try {
      const cachedDaily = localStorage.getItem(`daily_leaderboard_${todayStr}`);
      if (cachedDaily) {
        const parsed = JSON.parse(cachedDaily);
        for (const [k, v] of Object.entries(parsed)) {
          const item = v as any;
          if (item && item.username) {
            const c = Number(item.count || 0);
            if (!dailyMap[k] || dailyMap[k].count < c) {
              dailyMap[k] = { username: item.username, count: c, avatarUrl: item.avatarUrl || null };
            }
          }
        }
      }

      const cachedAll = localStorage.getItem('all_time_leaderboard');
      if (cachedAll) {
        const parsed = JSON.parse(cachedAll);
        for (const [k, v] of Object.entries(parsed)) {
          const item = v as any;
          if (item && item.username) {
            const c = Number(item.count || 0);
            if (!allTimeMap[k] || allTimeMap[k].count < c) {
              allTimeMap[k] = { username: item.username, count: c, avatarUrl: item.avatarUrl || null };
            }
          }
        }
      }
    } catch (_) {}

    return { dailyMap, allTimeMap };
  }, [messages, allUsersList, todayStr]);

  // 2. Fetch and synchronize user rewards & leaderboards
  useEffect(() => {
    if (type !== 'messages') return;

    // Immediately seed leaderboards from local stats
    const initDaily = Object.values(localStats.dailyMap).sort((a, b) => b.count - a.count);
    const initAllTime = Object.values(localStats.allTimeMap).sort((a, b) => b.count - a.count);
    if (initDaily.length > 0) setDailyLeaderboard(initDaily);
    if (initAllTime.length > 0) setAllTimeLeaderboard(initAllTime);

    // If user is logged in, verify today's message count
    if (userKey && localStats.dailyMap[userKey]?.count) {
      setTodayMsgCount((prev) => Math.max(prev, localStats.dailyMap[userKey].count));
    }

    // Listen to shared daily messages under users/__system_rewards__/
    const sysDailyRef = ref(rtdb, `users/__system_rewards__/daily_messages/${todayStr}`);
    const unsubSysDaily = onValue(
      sysDailyRef,
      (snap) => {
        const val = snap.val() || {};
        const merged: Record<string, { username: string; count: number; avatarUrl?: string | null }> = {
          ...localStats.dailyMap
        };

        for (const [k, v] of Object.entries(val)) {
          const item = v as any;
          if (item && item.username) {
            const c = Number(item.count || 0);
            if (!merged[k] || merged[k].count < c) {
              merged[k] = { username: item.username, count: c, avatarUrl: item.avatarUrl || null };
            }
          }
        }

        const sorted = Object.values(merged).sort((a, b) => b.count - a.count);
        setDailyLeaderboard(sorted);
      },
      () => {
        setDailyLeaderboard(Object.values(localStats.dailyMap).sort((a, b) => b.count - a.count));
      }
    );

    // Also listen to root daily_message_counts (fallback)
    const rootDailyRef = ref(rtdb, `daily_message_counts/${todayStr}`);
    const unsubRootDaily = onValue(rootDailyRef, (snap) => {
      if (!snap.exists()) return;
      const val = snap.val() || {};
      setDailyLeaderboard((prev) => {
        const map: Record<string, { username: string; count: number; avatarUrl?: string | null }> = {};
        for (const item of prev) {
          map[sanitizeDbKey(item.username)] = item;
        }
        for (const [k, v] of Object.entries(val)) {
          const item = v as any;
          if (item && item.username) {
            const c = Number(item.count || 0);
            if (!map[k] || map[k].count < c) {
              map[k] = { username: item.username, count: c, avatarUrl: item.avatarUrl || null };
            }
          }
        }
        return Object.values(map).sort((a, b) => b.count - a.count);
      });
    }, () => {});

    // Listen to shared all-time messages under users/__system_rewards__/
    const sysAllTimeRef = ref(rtdb, 'users/__system_rewards__/all_time_messages');
    const unsubSysAllTime = onValue(
      sysAllTimeRef,
      (snap) => {
        const val = snap.val() || {};
        const merged: Record<string, { username: string; count: number; avatarUrl?: string | null }> = {
          ...localStats.allTimeMap
        };

        for (const [k, v] of Object.entries(val)) {
          const item = v as any;
          if (item && item.username) {
            const c = Number(item.count || 0);
            if (!merged[k] || merged[k].count < c) {
              merged[k] = { username: item.username, count: c, avatarUrl: item.avatarUrl || null };
            }
          }
        }

        const sorted = Object.values(merged).sort((a, b) => b.count - a.count);
        setAllTimeLeaderboard(sorted);
      },
      () => {
        setAllTimeLeaderboard(Object.values(localStats.allTimeMap).sort((a, b) => b.count - a.count));
      }
    );

    // Listen to user's personal message rewards state
    let unsubUserMsg = () => {};
    if (userKey) {
      const userMsgRef = ref(rtdb, `users/${userKey}/rewards/daily_messages/${todayStr}`);
      unsubUserMsg = onValue(userMsgRef, (snap) => {
        const val = snap.val() || {};
        const rtdbCount = Number(val.count || 0);
        const localCount = localStats.dailyMap[userKey]?.count || 0;
        const bestCount = Math.max(rtdbCount, localCount);

        setTodayMsgCount((prev) => Math.max(prev, bestCount));
        if (val.claimed) {
          setClaimedMsgTiers((prev) => ({ ...prev, ...val.claimed }));
        }

        // If local count was higher, heal RTDB
        if (localCount > rtdbCount) {
          set(ref(rtdb, `users/${userKey}/rewards/daily_messages/${todayStr}/count`), localCount).catch(() => {});
        }
      });

      // User's total messages
      const totalRef = ref(rtdb, `users/${userKey}/totalMessages`);
      get(totalRef).then((snap) => {
        if (snap.exists()) {
          setAllTimeMsgCount(Number(snap.val() || 0));
        }
      }).catch(() => {});
    }

    return () => {
      unsubSysDaily();
      unsubRootDaily();
      unsubSysAllTime();
      unsubUserMsg();
    };
  }, [type, todayStr, userKey, localStats]);

  // General listeners for Login & Wheel
  useEffect(() => {
    if (!userKey) return;

    if (type === 'login') {
      const loginRef = ref(rtdb, `users/${userKey}/rewards/login`);
      const unsubLogin = onValue(loginRef, (snap) => {
        const val = snap.val() || {};
        setLoginStreak(val.streak || 0);
        setLastLoginClaimDate(val.lastClaimDate || null);
      });
      return () => unsubLogin();
    }

    if (type === 'wheel') {
      const wheelRef = ref(rtdb, `users/${userKey}/rewards/wheel`);
      const unsubWheel = onValue(wheelRef, (snap) => {
        const val = snap.val() || {};
        setLastWheelSpinAt(val.lastSpinAt || 0);
      });
      return () => unsubWheel();
    }
  }, [userKey, type]);

  // Claim a message tier reward (with instant optimistic update & sound)
  const handleClaimMsgTier = async (tier: (typeof MESSAGE_TIERS)[0]) => {
    if (!userKey || claimedMsgTiers[tier.id] || todayMsgCount < tier.count) return;

    // 1. Optimistic local update
    const updated = { ...claimedMsgTiers, [tier.id]: true };
    setClaimedMsgTiers(updated);
    try {
      localStorage.setItem(`claimed_msg_tiers_${userKey}_${todayStr}`, JSON.stringify(updated));
    } catch (_) {}

    // 2. Database update & credit currency
    try {
      await update(ref(rtdb, `users/${userKey}/rewards/daily_messages/${todayStr}/claimed`), {
        [tier.id]: true
      });
      await onUpdateCurrency(tier.gold, tier.ruby);
      playSound('/action.mp3');
    } catch (err) {
      console.warn('Error claiming message reward:', err);
    }
  };

  // Claim daily login reward
  const canClaimLoginToday = lastLoginClaimDate !== todayStr;
  const currentClaimDay = ((loginStreak) % 28) + 1;

  const handleClaimLogin = async () => {
    if (!userKey || !canClaimLoginToday || loginClaimLoading) return;
    setLoginClaimLoading(true);
    try {
      const newStreak = loginStreak + 1;
      const targetReward = LOGIN_DAYS.find((d) => d.day === currentClaimDay) || LOGIN_DAYS[0];

      await update(ref(rtdb, `users/${userKey}/rewards/login`), {
        streak: newStreak,
        lastClaimDate: todayStr,
        updatedAt: serverTimestamp()
      });

      await onUpdateCurrency(targetReward.gold, targetReward.ruby);
      playSound('/action.mp3');
    } catch (err) {
      console.warn('Error claiming login reward:', err);
    } finally {
      setLoginClaimLoading(false);
    }
  };

  // Wheel Spin Logic
  const canSpinFreeToday = Date.now() - lastWheelSpinAt >= 24 * 60 * 60 * 1000;
  const wheelMsRemaining = Math.max(0, 24 * 60 * 60 * 1000 - (Date.now() - lastWheelSpinAt));
  const wheelHoursRemaining = Math.floor(wheelMsRemaining / (1000 * 60 * 60));
  const wheelMinsRemaining = Math.floor((wheelMsRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const extraSpinCost = 500;
  const canSpinExtra = !canSpinFreeToday && userGold >= extraSpinCost;

  const handleSpinWheel = async () => {
    if (isSpinning || !userKey || (!canSpinFreeToday && !canSpinExtra)) return;

    const isExtra = !canSpinFreeToday;
    if (isExtra) {
      await onUpdateCurrency(-extraSpinCost, 0);
    }

    setIsSpinning(true);
    setSpinResult(null);
    playSound('/notify.mp3');

    // Pick random slice
    const randomIndex = Math.floor(Math.random() * WHEEL_SLICES.length);
    const selectedSlice = WHEEL_SLICES[randomIndex];

    // Align with top pointer (pointer is pointing down at TOP = 270 deg in SVG polar coordinates)
    const sliceAngle = 360 / WHEEL_SLICES.length;
    const midAngle = randomIndex * sliceAngle + sliceAngle / 2;
    const targetSliceAngle = (270 - midAngle + 360) % 360;
    const currentModulo = wheelRotation % 360;
    const diff = (targetSliceAngle - currentModulo + 360) % 360;
    // 5 full rotations (1800 deg) + diff
    const newTotalRotation = wheelRotation + 1800 + diff;

    setWheelRotation(newTotalRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      setSpinResult(selectedSlice);

      try {
        if (!isExtra) {
          await update(ref(rtdb, `users/${userKey}/rewards/wheel`), {
            lastSpinAt: Date.now()
          });
        }

        if (selectedSlice.type === 'gold' && selectedSlice.value > 0) {
          await onUpdateCurrency(selectedSlice.value, 0);
          playSound('/action.mp3');
        } else if (selectedSlice.type === 'ruby' && selectedSlice.value > 0) {
          await onUpdateCurrency(0, selectedSlice.value);
          playSound('/action.mp3');
        } else {
          playSound('/clear.mp3');
        }
      } catch (e) {
        console.warn('Error recording wheel spin:', e);
      }
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[500px] max-h-[92vh] bg-[#141418] border border-[#252530] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-150"
      >
        {/* ==================================================== */}
        {/* 1. SEPARATE UI: DAILY WHEEL SPIN                     */}
        {/* ==================================================== */}
        {type === 'wheel' && (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#22222a] bg-[#17171e] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">🎡</span>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-wide leading-tight">
                    Daily Wheel Spin
                  </h2>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Spin once every day for Rubies, Gold, or Nothing!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-zinc-400 hover:text-white p-1 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wheel Canvas Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-1">
                {/* Top Pointer */}
                <div className="absolute -top-3.5 z-30 flex flex-col items-center pointer-events-none">
                  <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" />
                </div>

                {/* Rotating Wheel */}
                <div
                  className="w-full h-full rounded-full border-4 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.25)] overflow-hidden relative"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0.95, 0.35, 1)' : 'none'
                  }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full select-none pointer-events-none">
                    <defs>
                      <filter id="wheelShadow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.8" />
                      </filter>
                    </defs>
                    {WHEEL_SLICES.map((slice, i) => {
                      const totalSlices = WHEEL_SLICES.length;
                      const angle = 360 / totalSlices;
                      const startAngle = (i * angle * Math.PI) / 180;
                      const endAngle = (((i + 1) * angle) * Math.PI) / 180;

                      const x1 = 100 + 100 * Math.cos(startAngle);
                      const y1 = 100 + 100 * Math.sin(startAngle);
                      const x2 = 100 + 100 * Math.cos(endAngle);
                      const y2 = 100 + 100 * Math.sin(endAngle);

                      const pathData = `M 100,100 L ${x1},${y1} A 100,100 0 0,1 ${x2},${y2} Z`;

                      const midAngleDeg = (i + 0.5) * angle;
                      const midAngleRad = (midAngleDeg * Math.PI) / 180;
                      const rot = midAngleDeg + 90;

                      // Outer Icon position (radius 72)
                      const iconRadius = 72;
                      const ix = 100 + iconRadius * Math.cos(midAngleRad);
                      const iy = 100 + iconRadius * Math.sin(midAngleRad);
                      const iconSize = 13.5;

                      // Inner Number position (radius 52)
                      const numRadius = 52;
                      const nx = 100 + numRadius * Math.cos(midAngleRad);
                      const ny = 100 + numRadius * Math.sin(midAngleRad);
                      const formattedNum = slice.value > 0 ? slice.value.toLocaleString() : '0';
                      const numFontSize = slice.value >= 10000 ? '7' : '8';

                      return (
                        <g key={slice.id}>
                          {/* Wedge Slice */}
                          <path d={pathData} fill={slice.color} stroke="#141418" strokeWidth="1.5" />

                          {/* Slice Icon */}
                          {slice.type === 'nothing' ? (
                            <g transform={`rotate(${rot}, ${ix}, ${iy})`}>
                              <circle cx={ix} cy={iy} r="6" fill="#3f3f46" stroke="#52525b" strokeWidth="1" />
                              <path
                                d={`M ${ix - 2.8} ${iy - 2.8} L ${ix + 2.8} ${iy + 2.8} M ${ix + 2.8} ${iy - 2.8} L ${ix - 2.8} ${iy + 2.8}`}
                                stroke="#9ca3af"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </g>
                          ) : (
                            <image
                              href={slice.type === 'gold' ? '/icons/gold.svg' : '/icons/ruby.svg'}
                              xlinkHref={slice.type === 'gold' ? '/icons/gold.svg' : '/icons/ruby.svg'}
                              x={ix - iconSize / 2}
                              y={iy - iconSize / 2}
                              width={iconSize}
                              height={iconSize}
                              transform={`rotate(${rot}, ${ix}, ${iy})`}
                              filter="url(#wheelShadow)"
                            />
                          )}

                          {/* Slice Number */}
                          <text
                            x={nx}
                            y={ny}
                            fill={slice.type === 'nothing' ? '#9ca3af' : '#ffffff'}
                            stroke="#000000"
                            strokeWidth="0.6"
                            paintOrder="stroke fill"
                            fontSize={numFontSize}
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="central"
                            transform={`rotate(${rot}, ${nx}, ${ny})`}
                            filter="url(#wheelShadow)"
                          >
                            {formattedNum}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Center Hub Button */}
                <button
                  type="button"
                  disabled={isSpinning || (!canSpinFreeToday && !canSpinExtra)}
                  onClick={handleSpinWheel}
                  className={`absolute z-20 w-16 h-16 rounded-full border-4 border-[#141418] shadow-2xl flex flex-col items-center justify-center font-black transition-all cursor-pointer ${
                    (canSpinFreeToday || canSpinExtra) && !isSpinning
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black hover:scale-105 active:scale-95 shadow-amber-500/40'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-80'
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-tight font-black flex items-center gap-0.5">
                    {isSpinning ? (
                      '...'
                    ) : canSpinFreeToday ? (
                      'SPIN'
                    ) : (
                      <>
                        <span>500</span>
                        <img src="/icons/gold.svg" alt="" className="w-3.5 h-3.5" />
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Spin Result Banner */}
              {spinResult && (
                <div
                  className={`w-full p-3.5 rounded-2xl border text-center animate-in zoom-in-95 duration-200 ${
                    spinResult.type === 'nothing'
                      ? 'bg-[#1b1b24] border-zinc-700 text-zinc-300'
                      : spinResult.type === 'gold'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="text-base font-black">
                    {spinResult.type === 'nothing' ? '❌ Better luck next time!' : '🎉 Congratulations!'}
                  </div>
                  <div className="text-xs font-bold mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                    {spinResult.type === 'nothing' ? (
                      <span>You landed on 0 (Nothing) this spin.</span>
                    ) : (
                      <>
                        <span>You won</span>
                        <img
                          src={spinResult.type === 'gold' ? '/icons/gold.svg' : '/icons/ruby.svg'}
                          alt=""
                          className="w-4 h-4 object-contain inline-block"
                        />
                        <span className="font-extrabold text-white">
                          +{spinResult.value.toLocaleString()} {spinResult.type === 'gold' ? 'Gold' : 'Ruby'}!
                        </span>
                        <span>Added to your wallet.</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Status Notice */}
              <div className="text-center space-y-1">
                {canSpinFreeToday ? (
                  <p className="text-xs font-black text-emerald-400">
                    ✨ Daily Free Spin is available now!
                  </p>
                ) : (
                  <p className="text-xs font-bold text-zinc-400">
                    ⏳ Next free spin in: <span className="text-white font-mono">{wheelHoursRemaining}h {wheelMinsRemaining}m</span>
                    {canSpinExtra && (
                      <span className="block text-[11px] text-amber-300 font-semibold mt-0.5">
                        Or spin again anytime for 500 Gold!
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Footer with Balance and Primary Action Button */}
            <div className="p-4 border-t border-[#22222a] bg-[#17171e] flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <img src={GOLD_ICON} alt="Gold" className="w-4 h-4 object-contain" />
                  {userGold.toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <img src={RUBY_ICON} alt="Ruby" className="w-4 h-4 object-contain" />
                  {userRuby.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                disabled={isSpinning || (!canSpinFreeToday && !canSpinExtra)}
                onClick={handleSpinWheel}
                className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  canSpinFreeToday && !isSpinning
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-950/40'
                    : canSpinExtra && !isSpinning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                }`}
              >
                {isSpinning
                  ? 'Spinning...'
                  : canSpinFreeToday
                  ? 'Spin Free'
                  : canSpinExtra
                  ? 'Spin Again (500G)'
                  : 'Wait Cooldown'}
              </button>
            </div>
          </>
        )}

        {/* ==================================================== */}
        {/* 2. SEPARATE UI: DAILY LOGIN REWARD                   */}
        {/* ==================================================== */}
        {type === 'login' && (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#22222a] bg-[#17171e] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">🎁</span>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-wide leading-tight">
                    Login Reward
                  </h2>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    28-day streak with massive milestone bonuses
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-zinc-400 hover:text-white p-1 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Streak & Stats Cards */}
            <div className="p-4 sm:p-5 pb-0">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-[#191922] border border-[#282836] rounded-2xl p-2.5 sm:p-3 text-center">
                  <span className="text-xl sm:text-2xl font-black text-white font-mono block">
                    {loginStreak}
                  </span>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                    STREAK
                  </span>
                </div>
                <div className="bg-[#191922] border border-[#282836] rounded-2xl p-2.5 sm:p-3 text-center">
                  <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono block">
                    Day {currentClaimDay}
                  </span>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                    CURRENT DAY
                  </span>
                </div>
                <div className="bg-[#191922] border border-[#282836] rounded-2xl p-2.5 sm:p-3 text-center">
                  <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono block">
                    28
                  </span>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                    TOTAL DAYS
                  </span>
                </div>
              </div>
            </div>

            {/* 28 Days Calendar Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="grid grid-cols-4 gap-2">
                {LOGIN_DAYS.map((item) => {
                  const isClaimed = item.day < currentClaimDay || (!canClaimLoginToday && item.day <= currentClaimDay);
                  const isCurrent = item.day === currentClaimDay && canClaimLoginToday;

                  return (
                    <div
                      key={item.day}
                      className={`p-2 rounded-2xl flex flex-col justify-between border transition-all ${
                        isCurrent
                          ? 'bg-[#2a1b1e] border-[#ff5744] ring-2 ring-[#ff5744]/40 shadow-lg'
                          : isClaimed
                          ? 'bg-[#151b18] border-emerald-500/20 opacity-80'
                          : item.isMilestone
                          ? 'bg-[#211a14] border-amber-500/30'
                          : 'bg-[#181820] border-[#262632] opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-black ${
                            isCurrent
                              ? 'text-[#ff5744]'
                              : isClaimed
                              ? 'text-emerald-400'
                              : item.isMilestone
                              ? 'text-amber-400'
                              : 'text-zinc-300'
                          }`}
                        >
                          Day {item.day}
                        </span>
                        {isClaimed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                        ) : isCurrent ? (
                          <span className="text-xs">🎁</span>
                        ) : item.isMilestone ? (
                          <span className="text-xs">👑</span>
                        ) : (
                          <Lock className="w-3 h-3 text-zinc-500" />
                        )}
                      </div>

                      <div className="space-y-0.5 text-[10px] font-extrabold leading-tight">
                        <div className="text-amber-300">
                          {item.gold.toLocaleString()} Gold
                        </div>
                        <div className="text-rose-400">
                          +{item.ruby} Ruby
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer with Claim Button */}
            <div className="p-4 border-t border-[#22222a] bg-[#17171e] flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-zinc-400">
                {canClaimLoginToday ? (
                  <span className="text-emerald-400 font-extrabold">Ready to claim Day {currentClaimDay}!</span>
                ) : (
                  <span>Next claim in: {getTimeUntilMidnight()}</span>
                )}
              </div>

              <button
                type="button"
                disabled={!canClaimLoginToday || loginClaimLoading}
                onClick={handleClaimLogin}
                className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                  canClaimLoginToday
                    ? 'bg-[#00b4d8] hover:bg-[#009fc0] text-white shadow-cyan-950/50'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                }`}
              >
                <span>🎁</span>
                <span>{canClaimLoginToday ? 'Claim Day Reward' : 'Claimed Today'}</span>
              </button>
            </div>
          </>
        )}

        {/* ==================================================== */}
        {/* 3. SEPARATE UI: MESSAGES REWARD                      */}
        {/* ==================================================== */}
        {type === 'messages' && (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#22222a] bg-[#17171e] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">💬</span>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-wide leading-tight">
                    Messages Reward
                  </h2>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Claim rewards for your daily messages & climb the leaderboard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-zinc-400 hover:text-white p-1 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Toggle (My Rewards | Leaderboard) */}
            <div className="p-4 sm:p-5 pb-0">
              <div className="grid grid-cols-2 gap-2 bg-[#1a1a22] p-1.5 rounded-2xl border border-[#262632]">
                <button
                  type="button"
                  onClick={() => setMessagesTab('rewards')}
                  className={`py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                    messagesTab === 'rewards'
                      ? 'bg-[#ff5744] text-white shadow-lg shadow-rose-950/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  My Rewards
                </button>
                <button
                  type="button"
                  onClick={() => setMessagesTab('leaderboard')}
                  className={`py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                    messagesTab === 'leaderboard'
                      ? 'bg-[#ff5744] text-white shadow-lg shadow-rose-950/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Leaderboard
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messagesTab === 'rewards' ? (
                <>
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-400 bg-[#191922] px-3.5 py-2 rounded-xl border border-[#262632]">
                    <span>⏰ Resets daily at midnight</span>
                    <span className="font-mono text-zinc-300">{getTimeUntilMidnight()}</span>
                  </div>

                  {/* Messages Sent Today Counter */}
                  <div className="bg-[#191922] border border-[#282836] rounded-2xl p-4 text-center shadow-inner">
                    <span className="text-4xl font-black text-white font-mono tracking-tight">
                      {todayMsgCount.toLocaleString()}
                    </span>
                    <p className="text-[11px] font-black text-zinc-400 tracking-wider uppercase mt-1">
                      MESSAGES SENT TODAY
                    </p>
                  </div>

                  {/* Tiers List */}
                  <div className="space-y-2.5">
                    {MESSAGE_TIERS.map((tier) => {
                      const isClaimed = Boolean(claimedMsgTiers[tier.id]);
                      const progressPct = Math.min(100, Math.round((todayMsgCount / tier.count) * 100));
                      const isComplete = todayMsgCount >= tier.count;

                      return (
                        <div
                          key={tier.id}
                          className="bg-[#181820] border border-[#262632] rounded-2xl p-3.5 flex flex-col gap-2 transition-all hover:border-[#353545]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-8 h-8 rounded-xl bg-[#22222c] border border-[#30303e] flex items-center justify-center shrink-0">
                                {isClaimed ? (
                                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                                ) : isComplete ? (
                                  <Gift className="w-4 h-4 text-amber-400" />
                                ) : (
                                  <Lock className="w-4 h-4 text-zinc-500" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-black text-white truncate">
                                  {tier.count.toLocaleString()} Messages
                                </h3>
                                <div className="flex items-center gap-2 text-[11px] font-bold mt-0.5">
                                  <span className="text-amber-300 font-extrabold flex items-center gap-1">
                                    <img src={GOLD_ICON} alt="Gold" className="w-3.5 h-3.5 object-contain" />
                                    {tier.gold.toLocaleString()} Gold
                                  </span>
                                  <span className="text-zinc-500">•</span>
                                  <span className="text-rose-400 font-extrabold flex items-center gap-1">
                                    <img src={RUBY_ICON} alt="Ruby" className="w-3.5 h-3.5 object-contain" />
                                    {tier.ruby} Ruby
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Claim button or Progress */}
                            {isClaimed ? (
                              <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black rounded-xl">
                                Claimed
                              </span>
                            ) : isComplete ? (
                              <button
                                type="button"
                                onClick={() => handleClaimMsgTier(tier)}
                                className="px-4 py-1.5 bg-[#00b4d8] hover:bg-[#0096b7] text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                              >
                                Claim
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 bg-[#22222c] text-zinc-400 text-xs font-bold rounded-xl shrink-0 font-mono">
                                {progressPct}%
                              </span>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-[#252530] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#ff5744] to-amber-400 rounded-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Leaderboard Tab */
                <div className="space-y-3.5">
                  {/* Daily vs All-Time Scope Selector */}
                  <div className="flex items-center justify-center gap-2 bg-[#171720] p-1.5 rounded-2xl border border-[#252532]">
                    <button
                      type="button"
                      onClick={() => setLeaderboardScope('daily')}
                      className={`flex-1 py-1.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        leaderboardScope === 'daily'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md shadow-amber-500/20'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Today's Board</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderboardScope('alltime')}
                      className={`flex-1 py-1.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        leaderboardScope === 'alltime'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md shadow-amber-500/20'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>All-Time Board</span>
                    </button>
                  </div>

                  {/* Your Personal Standing Card */}
                  {(() => {
                    const activeBoard = leaderboardScope === 'daily' ? dailyLeaderboard : allTimeLeaderboard;
                    const myKey = currentUser?.username ? sanitizeDbKey(currentUser.username) : '';
                    const myIdx = activeBoard.findIndex((item) => sanitizeDbKey(item.username) === myKey);
                    const myRank = myIdx !== -1 ? myIdx + 1 : null;
                    const myCount = leaderboardScope === 'daily' ? todayMsgCount : (allTimeMsgCount || activeBoard[myIdx]?.count || todayMsgCount);

                    return (
                      <div className="bg-gradient-to-r from-[#171c26] to-[#1a1724] border border-[#2d3748] rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#24252e] shrink-0 border border-cyan-400/40 shadow-sm relative">
                            {userProfile.avatarUrl ? (
                              <img src={userProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-black text-sm text-cyan-400 bg-cyan-950/40">
                                {currentUser?.username?.slice(0, 2).toUpperCase() || 'ME'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-black text-white truncate">
                                {currentUser?.username || 'You'}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                YOU
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-zinc-400 mt-0.5">
                              {myRank ? (
                                <span className="text-amber-400 font-extrabold">
                                  {myRank === 1 ? '👑 Ranked #1 on the board!' : `Ranked #${myRank} on the board`}
                                </span>
                              ) : (
                                <span>Send a message to rank!</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg font-black text-white font-mono leading-none">
                            {myCount.toLocaleString()}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight mt-1">
                            {leaderboardScope === 'daily' ? 'MESSAGES TODAY' : 'TOTAL MESSAGES'}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Leaderboard Table / Cards */}
                  {(() => {
                    const activeBoard = leaderboardScope === 'daily' ? dailyLeaderboard : allTimeLeaderboard;
                    const myKey = currentUser?.username ? sanitizeDbKey(currentUser.username) : '';

                    if (activeBoard.length === 0) {
                      return (
                        <div className="py-12 px-4 text-center bg-[#181820] border border-[#262632] rounded-2xl space-y-2">
                          <div className="text-3xl select-none">💬</div>
                          <h4 className="text-sm font-black text-white">No messages recorded yet</h4>
                          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                            {leaderboardScope === 'daily'
                              ? 'Be the first to chat in the room today and claim the #1 spot on the leaderboard!'
                              : 'Chat with friends in the room to start racking up leaderboard rankings!'}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-500 px-3">
                          <span>Chatter Rank</span>
                          <span>{leaderboardScope === 'daily' ? 'Messages Today' : 'Total Messages'}</span>
                        </div>

                        {activeBoard.slice(0, 50).map((item, idx) => {
                          const rankNum = idx + 1;
                          const isMe = myKey && sanitizeDbKey(item.username) === myKey;

                          return (
                            <div
                              key={`${item.username}-${idx}`}
                              className={`rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3 transition-all ${
                                isMe
                                  ? 'bg-[#182330] border border-cyan-500/40 shadow-sm'
                                  : rankNum === 1
                                  ? 'bg-gradient-to-r from-[#241e16] to-[#181820] border border-amber-500/30'
                                  : rankNum === 2
                                  ? 'bg-gradient-to-r from-[#1e2024] to-[#181820] border border-zinc-400/20'
                                  : rankNum === 3
                                  ? 'bg-gradient-to-r from-[#221c1a] to-[#181820] border border-amber-700/20'
                                  : 'bg-[#181820] border border-[#242430] hover:border-[#323242]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Rank Medal / Number */}
                                <div className="w-7 text-center shrink-0">
                                  {rankNum === 1 ? (
                                    <span className="text-base select-none leading-none" title="1st Place">
                                      🥇
                                    </span>
                                  ) : rankNum === 2 ? (
                                    <span className="text-base select-none leading-none" title="2nd Place">
                                      🥈
                                    </span>
                                  ) : rankNum === 3 ? (
                                    <span className="text-base select-none leading-none" title="3rd Place">
                                      🥉
                                    </span>
                                  ) : (
                                    <span className="text-xs font-black text-zinc-400 font-mono">
                                      #{rankNum}
                                    </span>
                                  )}
                                </div>

                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#24252e] shrink-0 border border-white/10">
                                  {item.avatarUrl ? (
                                    <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center font-black text-xs text-zinc-400">
                                      {item.username.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                {/* Username */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-xs sm:text-sm font-black truncate block ${
                                        isMe ? 'text-cyan-300' : 'text-white'
                                      }`}
                                    >
                                      {item.username}
                                    </span>
                                    {isMe && (
                                      <span className="text-[9px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Message Count */}
                              <div className="text-right shrink-0">
                                <span className="text-xs sm:text-sm font-black text-amber-400 font-mono">
                                  {item.count.toLocaleString()}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-500 ml-1">
                                  msgs
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
