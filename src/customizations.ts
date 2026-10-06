export interface ProfileEffect {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const PROFILE_EFFECTS: ProfileEffect[] = [
  { id: 'effect-none', name: 'None (Clean)', icon: '🚫', description: 'Clean default background' },
  { id: 'effect-stars', name: 'Galaxy Starfield', icon: '✨', description: 'Twinkling starry nebula' },
  { id: 'effect-sakura', name: 'Sakura Blossom Fall', icon: '🌸', description: 'Floating soft pink petals' },
  { id: 'effect-hearts', name: 'Neon Hearts', icon: '💖', description: 'Floating neon heart particles' },
  { id: 'effect-cybergrid', name: 'Cyber Grid Scanlines', icon: '🌐', description: 'Retro synthwave glowing grid' },
  { id: 'effect-gold', name: '24K Gold Dust', icon: '🪙', description: 'Floating golden sparkles' },
  { id: 'effect-fire', name: 'Ember Blaze', icon: '🔥', description: 'Rising fiery sparks' },
  { id: 'effect-matrix', name: 'Digital Cyber Rain', icon: '💻', description: 'Matrix neon code particles' }
];

export interface NameplateTitle {
  id: string;
  title: string;
  styleClass: string;
}

export const NAMEPLATE_TITLES: NameplateTitle[] = [
  { id: 'title-none', title: 'None', styleClass: '' },
  { id: 'title-vip', title: '👑 VIP ELITE', styleClass: 'bg-gradient-to-r from-amber-400 to-yellow-200 text-amber-950 font-black border border-yellow-300 shadow-md shadow-amber-500/20' },
  { id: 'title-legend', title: '⚡ CYBER LEGEND', styleClass: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black border border-cyan-300 shadow-md shadow-cyan-500/25' },
  { id: 'title-cosmic', title: '🌌 COSMIC VOYAGER', styleClass: 'bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 text-white font-black border border-purple-300 shadow-md shadow-purple-500/30' },
  { id: 'title-inferno', title: '🔥 INFERNO BLAZE', styleClass: 'bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black border border-orange-300 shadow-md shadow-orange-500/30' },
  { id: 'title-diamond', title: '💎 DIAMOND TIER', styleClass: 'bg-gradient-to-r from-sky-200 via-cyan-300 to-white text-slate-900 font-black border border-cyan-200 shadow-md shadow-sky-400/30' },
  { id: 'title-sakura', title: '🌸 SAKURA DREAM', styleClass: 'bg-gradient-to-r from-pink-400 to-rose-300 text-pink-950 font-black border border-pink-200 shadow-md shadow-pink-400/25' },
  { id: 'title-esports', title: '🎮 ESPORTS PRO', styleClass: 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black border border-emerald-300 shadow-md shadow-emerald-500/25' }
];

export interface CollectibleBadge {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export const COLLECTIBLE_BADGES: CollectibleBadge[] = [
  { id: 'badge-founder', name: 'Early Founder', emoji: '🌟', color: 'from-amber-400 to-orange-500' },
  { id: 'badge-guardian', name: 'Shield Guardian', emoji: '🛡️', color: 'from-blue-400 to-indigo-500' },
  { id: 'badge-music', name: 'Audio Maestro', emoji: '🎧', color: 'from-purple-400 to-pink-500' },
  { id: 'badge-champion', name: 'Arena Champion', emoji: '🏆', color: 'from-yellow-400 to-amber-600' },
  { id: 'badge-overclocked', name: 'Overclocked', emoji: '⚡', color: 'from-cyan-400 to-blue-600' },
  { id: 'badge-diamond', name: 'Diamond Crest', emoji: '💎', color: 'from-sky-300 to-cyan-500' },
  { id: 'badge-arcane', name: 'Arcane Mage', emoji: '🔮', color: 'from-fuchsia-400 to-purple-600' },
  { id: 'badge-pioneer', name: 'Cyber Pioneer', emoji: '🚀', color: 'from-emerald-400 to-teal-600' }
];

export interface ChatTheme {
  id: string;
  name: string;
  bubbleClass: string;
  textColor: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  { id: 'theme-purple', name: 'Royal Purple', bubbleClass: 'bg-purple-950/40 border-purple-800/40', textColor: 'text-purple-300' },
  { id: 'theme-cyan', name: 'Cyber Cyan', bubbleClass: 'bg-cyan-950/40 border-cyan-800/40', textColor: 'text-cyan-300' },
  { id: 'theme-emerald', name: 'Emerald Green', bubbleClass: 'bg-emerald-950/40 border-emerald-800/40', textColor: 'text-emerald-300' },
  { id: 'theme-rose', name: 'Neon Rose', bubbleClass: 'bg-rose-950/40 border-rose-800/40', textColor: 'text-rose-300' },
  { id: 'theme-gold', name: 'Sunset Gold', bubbleClass: 'bg-amber-950/40 border-amber-800/40', textColor: 'text-amber-300' },
  { id: 'theme-default', name: 'Classic Dark', bubbleClass: 'bg-[#181820] border-[#262632]', textColor: 'text-zinc-200' }
];
