export interface RankDefinition {
  id: string;
  name: string;
  icon: string;
  priority: number;
}

const GITHUB_RANKS_BASE = 'https://raw.githubusercontent.com/nyatter1/chatranks/main';

export const SYSTEM_BOT_USERNAME = 'System';
export const SYSTEM_BOT_AVATAR = '/bot.png';
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
  superfounder: {
    id: 'superfounder',
    name: 'Super Founder',
    icon: '/superfounder.gif',
    priority: 86
  },
  mainfounder: {
    id: 'mainfounder',
    name: 'Main Founder',
    icon: '/mainfounder.gif',
    priority: 83
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
  mainadmin: {
    id: 'mainadmin',
    name: 'Main Admin',
    icon: '/mainadmin.gif',
    priority: 65
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
    priority: 25
  },
  superprem: {
    id: 'superprem',
    name: 'Super Premium',
    icon: '/superprem.gif',
    priority: 18
  },
  prem: {
    id: 'prem',
    name: 'Premium',
    icon: '/prem.gif',
    priority: 15
  },
  ghost: {
    id: 'ghost',
    name: 'Ghost',
    icon: '/ghost.gif',
    priority: 10
  }
};

export const ASSIGNABLE_RANKS: { id: string; name: string; priority: number }[] = [
  { id: 'none', name: 'User', priority: 0 },
  { id: 'ghost', name: 'Ghost', priority: 10 },
  { id: 'prem', name: 'Premium', priority: 15 },
  { id: 'superprem', name: 'Super Premium', priority: 18 },
  { id: 'vip', name: 'VIP', priority: 25 },
  { id: 'rank737', name: 'Super VIP', priority: 30 },
  { id: 'mod', name: 'Moderator', priority: 40 },
  { id: 'admin', name: 'Admin', priority: 50 },
  { id: 'superadmin', name: 'Super Admin', priority: 60 },
  { id: 'mainadmin', name: 'Main Admin', priority: 65 },
  { id: 'owner', name: 'Owner', priority: 70 },
  { id: 'founder', name: 'Founder', priority: 80 },
  { id: 'mainfounder', name: 'Main Founder', priority: 83 },
  { id: 'superfounder', name: 'Super Founder', priority: 86 },
  { id: 'developer', name: 'Developer', priority: 90 }
];

export const CUSTOM_RANK_ICONS: { id: string; label: string; icon: string }[] = [
  { id: 'rank_08c22e', label: 'Rank 1', icon: `${GITHUB_RANKS_BASE}/rank_icon_08c22e88f38fd6e3.gif` },
  { id: 'rank_2e9bd0', label: 'Rank 2', icon: `${GITHUB_RANKS_BASE}/rank_icon_2e9bd0b23b0e1ff2.gif` },
  { id: 'rank_34e0b5', label: 'Rank 3', icon: `${GITHUB_RANKS_BASE}/rank_icon_34e0b53619071d93.gif` },
  { id: 'rank_4e47e2', label: 'Rank 4', icon: `${GITHUB_RANKS_BASE}/rank_icon_4e47e2e17209cdcb.gif` },
  { id: 'rank_58d1f4', label: 'Rank 5', icon: `${GITHUB_RANKS_BASE}/rank_icon_58d1f43657a13aaa.gif` },
  { id: 'rank_5ffb36', label: 'Rank 6', icon: `${GITHUB_RANKS_BASE}/rank_icon_5ffb36cf4833092f.gif` },
  { id: 'rank_66f1f1', label: 'Rank 7', icon: `${GITHUB_RANKS_BASE}/rank_icon_66f1f189f1a8deeb.gif` },
  { id: 'rank_7e77b6', label: 'Rank 8', icon: `${GITHUB_RANKS_BASE}/rank_icon_7e77b633d0d0fc90.gif` },
  { id: 'rank_81016e', label: 'Rank 9', icon: `${GITHUB_RANKS_BASE}/rank_icon_81016e7085be8b65.gif` },
  { id: 'rank_a7c98b', label: 'Rank 10', icon: `${GITHUB_RANKS_BASE}/rank_icon_a7c98b93b63a44a5.gif` },
  { id: 'rank_b2f843', label: 'Rank 11', icon: `${GITHUB_RANKS_BASE}/rank_icon_b2f8436ef0affb9d.gif` },
  { id: 'rank_bcd99b', label: 'Rank 12', icon: `${GITHUB_RANKS_BASE}/rank_icon_bcd99bbd6b71e15c.gif` },
  { id: 'rank_cd401d', label: 'Rank 13', icon: `${GITHUB_RANKS_BASE}/rank_icon_cd401dbf47af0de0.gif` },
  { id: 'rank_d96422', label: 'Rank 14', icon: `${GITHUB_RANKS_BASE}/rank_icon_d964224aade86578.gif` }
];

function resolveBaseRank(
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
      case 'ghost':
      case 'host':
        return RANKS.ghost;
      case 'prem':
      case 'premium':
        return RANKS.prem;
      case 'superprem':
      case 'super_prem':
      case 'super prem':
      case 'superpremium':
      case 'super_premium':
      case 'super premium':
        return RANKS.superprem;
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
      case 'mainadmin':
      case 'main_admin':
      case 'main admin':
        return RANKS.mainadmin;
      case 'owner':
        return RANKS.owner;
      case 'founder':
        return RANKS.founder;
      case 'mainfounder':
      case 'main_founder':
      case 'main founder':
        return RANKS.mainfounder;
      case 'superfounder':
      case 'super_founder':
      case 'super founder':
        return RANKS.superfounder;
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
 * Resolves a user's rank while applying optional custom rank icon and custom rank name overrides.
 * The underlying hierarchy priority and staff status always remain tied to the base rank.
 */
export function getUserRank(
  username?: string | null,
  email?: string | null,
  dbRank?: string | null,
  customRankIcon?: string | null,
  customRankName?: string | null
): RankDefinition | null {
  const cleanUser = (username || '').trim().toLowerCase();
  if (cleanUser === 'system') {
    return RANKS.bot;
  }

  const baseRank = resolveBaseRank(username, email, dbRank);
  const cleanCustomIcon =
    typeof customRankIcon === 'string' && customRankIcon.trim() ? customRankIcon.trim() : null;
  const cleanCustomName =
    typeof customRankName === 'string' && customRankName.trim() ? customRankName.trim() : null;

  if (!baseRank && !cleanCustomIcon && !cleanCustomName) {
    return null;
  }

  return {
    id: baseRank ? baseRank.id : 'custom',
    priority: baseRank ? baseRank.priority : 0,
    icon: cleanCustomIcon || baseRank?.icon || '/prem.gif',
    name: cleanCustomName || baseRank?.name || 'Member'
  };
}

/**
 * Returns true if the user's rank is a staff rank (Moderator or higher: priority >= 40).
 */
export function isStaffRank(rank: RankDefinition | null | undefined): boolean {
  if (!rank) return false;
  return rank.priority >= 40;
}
