import React from 'react';

export interface BorderItem {
  id: string;
  name: string;
  isAnimated: boolean;
  category: 'normal' | 'animated';
  // Style for full profile card
  cardBorderClass?: string;
  cardBorderStyle?: React.CSSProperties;
  // Style for avatar / pfp ring
  pfpBorderClass?: string;
  pfpBorderStyle?: React.CSSProperties;
}

// =========================================================
// 50 PROFILE CARD BORDERS (40 Normal, 10 Animated)
// =========================================================
export const PROFILE_BORDERS: BorderItem[] = [
  // 1-40 Normal Borders
  {
    id: 'pb-default',
    name: '1. Classic Slate',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border border-[#252530]'
  },
  {
    id: 'pb-cyber-cyan',
    name: '2. Cyber Cyan',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.4)]'
  },
  {
    id: 'pb-royal-purple',
    name: '3. Royal Purple',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#a855f7] shadow-[0_0_20px_rgba(168,85,247,0.45)]'
  },
  {
    id: 'pb-neon-emerald',
    name: '4. Neon Emerald',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.4)]'
  },
  {
    id: 'pb-hot-crimson',
    name: '5. Hot Crimson',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#ef4444] shadow-[0_0_20px_rgba(239,68,68,0.45)]'
  },
  {
    id: 'pb-24k-gold',
    name: '6. 24K Gold',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#f59e0b] shadow-[0_0_22px_rgba(245,158,11,0.5),inset_0_0_6px_rgba(245,158,11,0.2)]'
  },
  {
    id: 'pb-platinum-silver',
    name: '7. Platinum Silver',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#e2e8f0] shadow-[0_0_18px_rgba(226,232,240,0.4)]'
  },
  {
    id: 'pb-sunset-orange',
    name: '8. Sunset Orange',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#f97316] shadow-[0_0_18px_rgba(249,115,22,0.4)]'
  },
  {
    id: 'pb-electric-blue',
    name: '9. Electric Cobalt',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#3b82f6] shadow-[0_0_20px_rgba(59,130,246,0.45)]'
  },
  {
    id: 'pb-rose-pink',
    name: '10. Rose Neon',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#ec4899] shadow-[0_0_20px_rgba(236,72,153,0.45)]'
  },
  {
    id: 'pb-lime-acid',
    name: '11. Acid Lime',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#84cc16] shadow-[0_0_18px_rgba(132,204,22,0.4)]'
  },
  {
    id: 'pb-deep-obsidian',
    name: '12. Deep Obsidian',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#312e81] shadow-[0_0_25px_rgba(49,46,129,0.7)]'
  },
  {
    id: 'pb-amethyst',
    name: '13. Amethyst Crystal',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#7c3aed] shadow-[0_0_20px_rgba(124,58,237,0.5)]'
  },
  {
    id: 'pb-aquamarine',
    name: '14. Aquamarine',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#06b6d4] shadow-[0_0_20px_rgba(6,182,212,0.45)]'
  },
  {
    id: 'pb-blood-ruby',
    name: '15. Blood Ruby',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#991b1b] shadow-[0_0_22px_rgba(153,27,27,0.6)]'
  },
  {
    id: 'pb-midnight-indigo',
    name: '16. Midnight Indigo',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#4338ca] shadow-[0_0_20px_rgba(67,56,202,0.5)]'
  },
  {
    id: 'pb-lavender-dream',
    name: '17. Lavender Dream',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#c084fc] shadow-[0_0_18px_rgba(192,132,252,0.4)]'
  },
  {
    id: 'pb-mint-frost',
    name: '18. Mint Frost',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#6ee7b7] shadow-[0_0_18px_rgba(110,231,183,0.4)]'
  },
  {
    id: 'pb-peach-blush',
    name: '19. Peach Blush',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#fda4af] shadow-[0_0_18px_rgba(253,164,175,0.4)]'
  },
  {
    id: 'pb-pure-whiteout',
    name: '20. Pure Whiteout',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-white shadow-[0_0_25px_rgba(255,255,255,0.6)]'
  },
  {
    id: 'pb-stealth-charcoal',
    name: '21. Stealth Charcoal',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#475569] shadow-[0_0_15px_rgba(71,85,105,0.3)]'
  },
  {
    id: 'pb-cyberpunk-yellow',
    name: '22. Cyberpunk Yellow',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#facc15] shadow-[0_0_22px_rgba(250,204,21,0.55)]'
  },
  {
    id: 'pb-glacial-ice',
    name: '23. Glacial Ice',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#bae6fd] shadow-[0_0_20px_rgba(186,230,253,0.5)]'
  },
  {
    id: 'pb-toxic-hazard',
    name: '24. Toxic Hazard',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#a3e635] shadow-[0_0_22px_rgba(163,230,53,0.5)]'
  },
  {
    id: 'pb-sakura-pink',
    name: '25. Sakura Pink',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#f472b6] shadow-[0_0_18px_rgba(244,114,182,0.45)]'
  },
  {
    id: 'pb-deep-ocean',
    name: '26. Deep Ocean',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#1e3a8a] shadow-[0_0_20px_rgba(30,58,138,0.6)]'
  },
  {
    id: 'pb-emerald-jewel',
    name: '27. Emerald Jewel',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#047857] shadow-[0_0_20px_rgba(4,120,87,0.55)]'
  },
  {
    id: 'pb-copper-glow',
    name: '28. Ancient Copper',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#b45309] shadow-[0_0_20px_rgba(180,83,9,0.5)]'
  },
  {
    id: 'pb-dual-cyan-magenta',
    name: '29. Cyan & Magenta Split',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#00f0ff] shadow-[0_0_22px_rgba(217,70,239,0.5),0_0_10px_rgba(0,240,255,0.5)]'
  },
  {
    id: 'pb-gold-double',
    name: '30. Imperial Gold Double',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-4 border-double border-[#fbbf24] shadow-[0_0_24px_rgba(251,191,36,0.5)]'
  },
  {
    id: 'pb-frosted-glass',
    name: '31. Frosted Glass',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.25)]'
  },
  {
    id: 'pb-neon-violet',
    name: '32. Neon Violet',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#8b5cf6] shadow-[0_0_20px_rgba(139,92,246,0.5)]'
  },
  {
    id: 'pb-laser-red',
    name: '33. Laser Red',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#dc2626] shadow-[0_0_25px_rgba(220,38,38,0.6)]'
  },
  {
    id: 'pb-cosmic-purple',
    name: '34. Cosmic Purple',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#6d28d9] shadow-[0_0_22px_rgba(109,40,217,0.5)]'
  },
  {
    id: 'pb-warm-amber',
    name: '35. Warm Amber',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#d97706] shadow-[0_0_18px_rgba(217,119,6,0.45)]'
  },
  {
    id: 'pb-steel-blue',
    name: '36. Steel Blue',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#64748b] shadow-[0_0_18px_rgba(100,116,139,0.4)]'
  },
  {
    id: 'pb-electric-teal',
    name: '37. Electric Teal',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#14b8a6] shadow-[0_0_20px_rgba(20,184,166,0.45)]'
  },
  {
    id: 'pb-fuchsia-blaze',
    name: '38. Fuchsia Blaze',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#d946ef] shadow-[0_0_20px_rgba(217,70,239,0.5)]'
  },
  {
    id: 'pb-bronze-titanium',
    name: '39. Bronze Titanium',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#78350f] shadow-[0_0_18px_rgba(120,53,15,0.4)]'
  },
  {
    id: 'pb-polar-white',
    name: '40. Polar White Glow',
    isAnimated: false,
    category: 'normal',
    cardBorderClass: 'border-2 border-[#f8fafc] shadow-[0_0_22px_rgba(248,250,252,0.5),inset_0_0_8px_rgba(248,250,252,0.2)]'
  },

  // 41-50 ANIMATED BORDERS
  {
    id: 'pb-anim-rainbow',
    name: '41. [Animated] Rainbow RGB',
    isAnimated: true,
    category: 'animated',
    cardBorderClass: 'border-2 border-[#00f0ff] border-anim-rainbow shadow-[0_0_25px_rgba(0,240,255,0.6)]'
  },
  {
    id: 'pb-anim-neon',
    name: '42. [Animated] Neon Pulse',
    isAnimated: true,
    category: 'animated',
    cardBorderClass: 'border-2 border-[#00f0ff] border-anim-neon'
  },
  {
    id: 'pb-anim-fire',
    name: '43. [Animated] Fire Flame',
    isAnimated: true,
    category: 'animated',
    cardBorderClass: 'border-2 border-[#ef4444] border-anim-fire'
  },
  {
    id: 'pb-anim-electric',
    name: '44. [Animated] Electric Zap',
    isAnimated: true,
    category: 'animated',
    cardBorderClass: 'border-2 border-[#3b82f6] border-anim-electric'
  },
  {
    id: 'pb-anim-aurora',
    name: '45. [Animated] Ethereal Aurora',
    isAnimated: true,
    category: 'animated',
    cardBorderClass: 'border-2 border-[#10b981] border-anim-aurora'
  },
  {
    id: 'pb-anim-galaxy',
    name: '46. [Animated] Galaxy Starlight',
    isAnimated: true,
    category: 'animated',
    cardBorderClass: 'border-2 border-[#8b5cf6] border-anim-galaxy'
  },
  {
    id: 'pb-anim-laser',
    name: '47. [Animated] Cyber Laser',
    isAnimated: true,
    category: 'animated',
    cardBorderClass: 'border-2 border-[#06b6d4] border-anim-laser'
  },
  {
    id: 'pb-anim-disco',
    name: '48. [Animated] Disco Strobe',
    isAnimated: true,
    category: 'animated',
    cardBorderClass: 'border-2 border-[#ef4444] border-anim-disco'
  },
  {
    id: 'pb-anim-plasma',
    name: '49. [Animated] Plasma Pulse',
    isAnimated: true,
    category: 'animated',
    cardBorderClass: 'border-2 border-[#d946ef] border-anim-plasma'
  },
  {
    id: 'pb-anim-hyper-prism',
    name: '50. [Animated] Hyper Prism Spectrum',
    isAnimated: true,
    category: 'animated',
    cardBorderClass: 'border-2 border-[#ec4899] border-anim-rainbow shadow-[0_0_30px_rgba(236,72,153,0.7),inset_0_0_10px_rgba(0,240,255,0.3)]'
  }
];

// =========================================================
// 50 PROFILE PICTURE BORDERS (40 Normal, 10 Animated)
// =========================================================
export const PFP_BORDERS: BorderItem[] = [
  // 1-40 Normal PFP Borders
  {
    id: 'pfp-default',
    name: '1. Classic White Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-white/90'
  },
  {
    id: 'pfp-cyber-cyan',
    name: '2. Cyber Cyan Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#00f0ff] shadow-[0_0_14px_#00f0ff]'
  },
  {
    id: 'pfp-royal-purple',
    name: '3. Royal Purple Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#a855f7] shadow-[0_0_14px_#a855f7]'
  },
  {
    id: 'pfp-neon-emerald',
    name: '4. Emerald Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#10b981] shadow-[0_0_14px_#10b981]'
  },
  {
    id: 'pfp-hot-crimson',
    name: '5. Hot Crimson Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#ef4444] shadow-[0_0_14px_#ef4444]'
  },
  {
    id: 'pfp-24k-gold',
    name: '6. 24K Gold Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#f59e0b] shadow-[0_0_15px_#f59e0b]'
  },
  {
    id: 'pfp-platinum-silver',
    name: '7. Platinum Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#e2e8f0] shadow-[0_0_12px_#e2e8f0]'
  },
  {
    id: 'pfp-sunset-orange',
    name: '8. Sunset Orange Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#f97316] shadow-[0_0_14px_#f97316]'
  },
  {
    id: 'pfp-electric-blue',
    name: '9. Cobalt Blue Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#3b82f6] shadow-[0_0_14px_#3b82f6]'
  },
  {
    id: 'pfp-rose-pink',
    name: '10. Rose Pink Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#ec4899] shadow-[0_0_14px_#ec4899]'
  },
  {
    id: 'pfp-lime-acid',
    name: '11. Acid Lime Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#84cc16] shadow-[0_0_14px_#84cc16]'
  },
  {
    id: 'pfp-deep-obsidian',
    name: '12. Obsidian Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#312e81] shadow-[0_0_16px_#312e81]'
  },
  {
    id: 'pfp-amethyst',
    name: '13. Amethyst Gem Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#7c3aed] shadow-[0_0_14px_#7c3aed]'
  },
  {
    id: 'pfp-aquamarine',
    name: '14. Aquamarine Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#06b6d4] shadow-[0_0_14px_#06b6d4]'
  },
  {
    id: 'pfp-ruby-red',
    name: '15. Blood Ruby Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#991b1b] shadow-[0_0_16px_#991b1b]'
  },
  {
    id: 'pfp-midnight-indigo',
    name: '16. Midnight Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#4338ca] shadow-[0_0_14px_#4338ca]'
  },
  {
    id: 'pfp-lavender',
    name: '17. Lavender Pastel Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#c084fc] shadow-[0_0_12px_#c084fc]'
  },
  {
    id: 'pfp-mint-frost',
    name: '18. Mint Frost Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#6ee7b7] shadow-[0_0_12px_#6ee7b7]'
  },
  {
    id: 'pfp-peach',
    name: '19. Peach Blossom Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#fda4af] shadow-[0_0_12px_#fda4af]'
  },
  {
    id: 'pfp-pure-whiteout',
    name: '20. Bright White Aura Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-white shadow-[0_0_18px_#ffffff]'
  },
  {
    id: 'pfp-stealth-slate',
    name: '21. Stealth Slate Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#475569] shadow-[0_0_10px_#475569]'
  },
  {
    id: 'pfp-cyberpunk-yellow',
    name: '22. Cyberpunk Yellow Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#facc15] shadow-[0_0_16px_#facc15]'
  },
  {
    id: 'pfp-ice-diamond',
    name: '23. Ice Diamond Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#bae6fd] shadow-[0_0_15px_#bae6fd]'
  },
  {
    id: 'pfp-hazard-lime',
    name: '24. Toxic Hazard Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#a3e635] shadow-[0_0_15px_#a3e635]'
  },
  {
    id: 'pfp-sakura',
    name: '25. Sakura Petal Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#f472b6] shadow-[0_0_14px_#f472b6]'
  },
  {
    id: 'pfp-abyss-navy',
    name: '26. Abyss Navy Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#1e3a8a] shadow-[0_0_14px_#1e3a8a]'
  },
  {
    id: 'pfp-jade-gem',
    name: '27. Jade Gemstone Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#047857] shadow-[0_0_14px_#047857]'
  },
  {
    id: 'pfp-copper-coin',
    name: '28. Polished Copper Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#b45309] shadow-[0_0_14px_#b45309]'
  },
  {
    id: 'pfp-dashed-cyan',
    name: '29. Dashed Cyber Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-dashed border-[#00f0ff] shadow-[0_0_12px_#00f0ff]'
  },
  {
    id: 'pfp-double-gold',
    name: '30. Double Imperial Gold',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-4 border-double border-[#fbbf24] shadow-[0_0_16px_#fbbf24]'
  },
  {
    id: 'pfp-dotted-violet',
    name: '31. Dotted Violet Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-dotted border-[#c084fc] shadow-[0_0_12px_#c084fc]'
  },
  {
    id: 'pfp-neon-violet',
    name: '32. Neon Violet Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#8b5cf6] shadow-[0_0_14px_#8b5cf6]'
  },
  {
    id: 'pfp-crimson-blaze',
    name: '33. Crimson Blaze Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#dc2626] shadow-[0_0_16px_#dc2626]'
  },
  {
    id: 'pfp-cosmic-purple',
    name: '34. Cosmic Purple Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#6d28d9] shadow-[0_0_14px_#6d28d9]'
  },
  {
    id: 'pfp-amber-glow',
    name: '35. Warm Amber Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#d97706] shadow-[0_0_14px_#d97706]'
  },
  {
    id: 'pfp-steel-rim',
    name: '36. Brushed Steel Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#64748b] shadow-[0_0_10px_#64748b]'
  },
  {
    id: 'pfp-electric-teal',
    name: '37. Electric Teal Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#14b8a6] shadow-[0_0_14px_#14b8a6]'
  },
  {
    id: 'pfp-fuchsia-ring',
    name: '38. Fuchsia Blaze Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#d946ef] shadow-[0_0_14px_#d946ef]'
  },
  {
    id: 'pfp-bronze-rim',
    name: '39. Bronze Rim',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-[#78350f] shadow-[0_0_12px_#78350f]'
  },
  {
    id: 'pfp-frosted-halo',
    name: '40. Frosted Halo Ring',
    isAnimated: false,
    category: 'normal',
    pfpBorderClass: 'border-2 border-white/60 shadow-[0_0_16px_rgba(255,255,255,0.4)]'
  },

  // 41-50 ANIMATED PFP BORDERS
  {
    id: 'pfp-anim-rainbow',
    name: '41. [Animated] Rainbow Spin Ring',
    isAnimated: true,
    category: 'animated',
    pfpBorderClass: 'border-2 border-[#00f0ff] border-anim-rainbow shadow-[0_0_18px_#00f0ff]'
  },
  {
    id: 'pfp-anim-neon',
    name: '42. [Animated] Neon Pulse Ring',
    isAnimated: true,
    category: 'animated',
    pfpBorderClass: 'border-2 border-[#00f0ff] border-anim-neon'
  },
  {
    id: 'pfp-anim-fire',
    name: '43. [Animated] Flame Aura Ring',
    isAnimated: true,
    category: 'animated',
    pfpBorderClass: 'border-2 border-[#ef4444] border-anim-fire'
  },
  {
    id: 'pfp-anim-electric',
    name: '44. [Animated] Lightning Zap Ring',
    isAnimated: true,
    category: 'animated',
    pfpBorderClass: 'border-2 border-[#3b82f6] border-anim-electric'
  },
  {
    id: 'pfp-anim-aurora',
    name: '45. [Animated] Aurora Ribbon Ring',
    isAnimated: true,
    category: 'animated',
    pfpBorderClass: 'border-2 border-[#10b981] border-anim-aurora'
  },
  {
    id: 'pfp-anim-galaxy',
    name: '46. [Animated] Galaxy Nebula Ring',
    isAnimated: true,
    category: 'animated',
    pfpBorderClass: 'border-2 border-[#8b5cf6] border-anim-galaxy'
  },
  {
    id: 'pfp-anim-laser',
    name: '47. [Animated] Radar Laser Ring',
    isAnimated: true,
    category: 'animated',
    pfpBorderClass: 'border-2 border-[#06b6d4] border-anim-laser'
  },
  {
    id: 'pfp-anim-disco',
    name: '48. [Animated] Disco Party Ring',
    isAnimated: true,
    category: 'animated',
    pfpBorderClass: 'border-2 border-[#ef4444] border-anim-disco'
  },
  {
    id: 'pfp-anim-plasma',
    name: '49. [Animated] Plasma Shield Ring',
    isAnimated: true,
    category: 'animated',
    pfpBorderClass: 'border-2 border-[#d946ef] border-anim-plasma'
  },
  {
    id: 'pfp-anim-prism',
    name: '50. [Animated] Hyper Spectrum Ring',
    isAnimated: true,
    category: 'animated',
    pfpBorderClass: 'border-2 border-[#ec4899] border-anim-rainbow shadow-[0_0_20px_#ec4899]'
  }
];

export function getProfileBorder(id: string | null | undefined): BorderItem {
  if (!id) return PROFILE_BORDERS[0];
  const found = PROFILE_BORDERS.find((b) => b.id === id);
  return found || PROFILE_BORDERS[0];
}

export function getPfpBorder(id: string | null | undefined): BorderItem {
  if (!id) return PFP_BORDERS[0];
  const found = PFP_BORDERS.find((b) => b.id === id);
  return found || PFP_BORDERS[0];
}
