import botAvatar from '../bot.png';

export interface RankDefinition {
  id: string;
  name: string;
  icon: string;
  priority: number;
}

const GITHUB_RANKS_BASE = 'https://raw.githubusercontent.com/nyatter1/chatranks/main';

export const SYSTEM_BOT_USERNAME = 'System';
export const SYSTEM_BOT_AVATAR = botAvatar || '/bot.png';
export const SYSTEM_BOT_RANK_ICON = '/ranks/bot.svg';

export const RANKS: Record<string, RankDefinition> = {
  main_developer: {
    id: 'main_developer',
    name: 'Main Developer',
    icon: `${GITHUB_RANKS_BASE}/rank_icon_71f046c1326aabfd.gif`,
    priority: 100
  },
  developer: {
    id: 'developer',
    name: 'Developer',
    icon: `${GITHUB_RANKS_BASE}/developer.gif`,
    priority: 90
  },
  founder: {
    id: 'founder',
    name: 'Founder',
    icon: `${GITHUB_RANKS_BASE}/founder.gif`,
    priority: 80
  },
  owner: {
    id: 'owner',
    name: 'Owner',
    icon: `${GITHUB_RANKS_BASE}/owner.svg`,
    priority: 70
  },
  superadmin: {
    id: 'superadmin',
    name: 'Super Admin',
    icon: `${GITHUB_RANKS_BASE}/super.svg`,
    priority: 60
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    icon: `${GITHUB_RANKS_BASE}/admin.svg`,
    priority: 50
  },
  mod: {
    id: 'mod',
    name: 'Moderator',
    icon: '/ranks/mod.svg',
    priority: 40
  },
  bot: {
    id: 'bot',
    name: 'Bot',
    icon: SYSTEM_BOT_RANK_ICON,
    priority: 35
  },
  rank737: {
    id: 'rank737',
    name: 'Super VIP',
    icon: `${GITHUB_RANKS_BASE}/rank_737cb.gif`,
    priority: 30
  },
  vip: {
    id: 'vip',
    name: 'VIP',
    icon: `${GITHUB_RANKS_BASE}/vip.gif`,
    priority: 20
  }
};

export const ASSIGNABLE_RANKS: { id: string; name: string; priority: number }[] = [
  { id: 'none', name: 'User', priority: 0 },
  { id: 'vip', name: 'VIP', priority: 20 },
  { id: 'rank737', name: 'Super VIP', priority: 30 },
  { id: 'mod', name: 'Moderator', priority: 40 },
  { id: 'admin', name: 'Admin', priority: 50 },
  { id: 'superadmin', name: 'Super Admin', priority: 60 },
  { id: 'owner', name: 'Owner', priority: 70 },
  { id: 'founder', name: 'Founder', priority: 80 },
  { id: 'developer', name: 'Developer', priority: 90 }
];

/**
 * Resolves a user's rank.
 * - Exclusively grants "Main Developer" (rank_icon_71f046c1326aabfd.gif) to user "Null" (null@gmail.com).
 *   No other user can ever obtain this rank.
 * - Grants "Bot" (bot.svg, priority 35 below Moderator) to the "System" bot.
 * - Grants "Developer" (developer.gif) to username "org" by default unless overridden in RTDB.
 * - Maps allowed ranks from Realtime Database: vip, rank737 (Super VIP), mod, admin, superadmin, owner, founder, developer.
 */
export function getUserRank(
  username?: string | null,
  email?: string | null,
  dbRank?: string | null
): RankDefinition | null {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();

  // Exclusive rank for Null (null@gmail.com / null@gmai.com) - no one else can ever have this rank
  if (cleanUser === 'null' || cleanEmail === 'null@gmail.com' || cleanEmail === 'null@gmai.com') {
    return RANKS.main_developer;
  }

  // Exclusive rank for System bot
  if (cleanUser === 'system') {
    return RANKS.bot;
  }

  if (dbRank && typeof dbRank === 'string') {
    const normalized = dbRank.trim().toLowerCase();

    if (normalized === 'none' || normalized === 'user' || normalized === 'default') {
      return null;
    }

    // Prevent anyone other than Null from ever getting main_developer
    if (
      normalized === 'main_developer' ||
      normalized === 'main developer' ||
      normalized === 'maindev' ||
      normalized.includes('71f046c1326aabfd')
    ) {
      return null;
    }

    switch (normalized) {
      case 'vip':
        return RANKS.vip;
      case 'rank737':
      case 'rank_737':
      case 'rank_737cb':
      case 'supervip':
      case 'super_vip':
      case 'super vip':
        return RANKS.rank737;
      case 'bot':
        return RANKS.bot;
      case 'mod':
      case 'moderator':
        return RANKS.mod;
      case 'admin':
      case 'administrator':
        return RANKS.admin;
      case 'superadmin':
      case 'super_admin':
      case 'super admin':
      case 'super':
        return RANKS.superadmin;
      case 'owner':
        return RANKS.owner;
      case 'founder':
        return RANKS.founder;
      case 'developer':
      case 'dev':
        return RANKS.developer;
      default:
        break;
    }
  }

  // Dedicated default Developer rank for username "org" if not explicitly changed
  if (cleanUser === 'org') {
    return RANKS.developer;
  }

  return null;
}

/**
 * Returns true if the user's rank is a staff rank (Moderator or higher: priority >= 40).
 */
export function isStaffRank(rank: RankDefinition | null | undefined): boolean {
  if (!rank) return false;
  return rank.priority >= 40;
}
