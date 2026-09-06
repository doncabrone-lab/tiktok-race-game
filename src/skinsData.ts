import { HorseSkinDef } from './types.ts';

export const HORSE_SKINS: HorseSkinDef[] = [
  {
    level: 1,
    name: 'Scrappy Pony',
    image: '/assets/skins/skin_1.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 1 | 0 Wins | 0 JC',
    winReq: 0,
    coinReq: 0,
    vipReq: false,
    trailType: 'dust',
    auraDescription: 'Basic dust particles behind hooves',
    themeColor: '#b45309',
  },
  {
    level: 2,
    name: 'Cyber-Steed',
    image: '/assets/skins/skin_2.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 3 | 3 Wins | 200 JC',
    winReq: 3,
    coinReq: 200,
    vipReq: false,
    trailType: 'electric_blue',
    auraDescription: 'Electric blue glitch & cyan speed trail',
    themeColor: '#06b6d4',
  },
  {
    level: 3,
    name: 'Emerald Glade',
    image: '/assets/skins/skin_3.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 5 | 8 Wins | 500 JC',
    winReq: 8,
    coinReq: 500,
    vipReq: false,
    trailType: 'emerald_leaves',
    auraDescription: 'Green leaf particles & soft emerald glow',
    themeColor: '#10b981',
  },
  {
    level: 4,
    name: 'Golden Majesty',
    image: '/assets/skins/skin_4.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 8 | 15 Wins | 1,200 JC',
    winReq: 15,
    coinReq: 1200,
    vipReq: false,
    trailType: 'golden_sparkles',
    auraDescription: 'Golden sparkles & gold drop-shadow',
    themeColor: '#eab308',
  },
  {
    level: 5,
    name: 'Cosmic Nebula',
    image: '/assets/skins/skin_5.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 10 | 25 Wins | 2,500 JC',
    winReq: 25,
    coinReq: 2500,
    vipReq: false,
    trailType: 'cosmic_galaxy',
    auraDescription: 'Pulsing galaxy glow & star particles',
    themeColor: '#a855f7',
  },
  {
    level: 6,
    name: 'Cyberpunk Spectre',
    image: '/assets/skins/skin_6.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 12 | 40 Wins | 5,000 JC',
    winReq: 40,
    coinReq: 5000,
    vipReq: false,
    trailType: 'magenta_scanlines',
    auraDescription: 'Magenta scanlines & phantom ghost trail',
    themeColor: '#ec4899',
  },
  {
    level: 7,
    name: 'Shadow Colt',
    image: '/assets/skins/skin_7.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 15 | 60 Wins | 8,000 JC',
    winReq: 60,
    coinReq: 8000,
    vipReq: false,
    trailType: 'shadow_smoke',
    auraDescription: 'Dark shadow smoke rising around horse',
    themeColor: '#6366f1',
  },
  {
    level: 8,
    name: 'Frostbite Stallion',
    image: '/assets/skins/skin_8.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 18 | 85 Wins | 12,000 JC',
    winReq: 85,
    coinReq: 12000,
    vipReq: false,
    trailType: 'frost_snow',
    auraDescription: 'Frosty blue aura & falling snowflakes',
    themeColor: '#38bdf8',
  },
  {
    level: 9,
    name: 'Lava Charger',
    image: '/assets/skins/skin_9.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 20 | 120 Wins | 20,000 JC',
    winReq: 120,
    coinReq: 20000,
    vipReq: false,
    trailType: 'magma_embers',
    auraDescription: 'Magma glow & flying ember particles',
    themeColor: '#f97316',
  },
  {
    level: 10,
    name: 'Crystal Vanguard',
    image: '/assets/skins/skin_10.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 22 | 160 Wins | 30,000 JC',
    winReq: 160,
    coinReq: 30000,
    vipReq: false,
    trailType: 'prism_diamond',
    auraDescription: 'Prism reflection glow & diamond sparkles',
    themeColor: '#06b6d4',
  },
  {
    level: 11,
    name: 'Solar Phoenix',
    image: '/assets/skins/skin_11.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 24 | 200 Wins | 40,000 JC',
    winReq: 200,
    coinReq: 40000,
    vipReq: false,
    trailType: 'sun_flare',
    auraDescription: 'Sun flare aura & golden feather embers',
    themeColor: '#f59e0b',
  },
  {
    level: 12,
    name: 'Pyro-Pegasus',
    image: '/assets/skins/skin_12.png',
    speed: 20,
    maxStamina: 100,
    unlockReq: 'Level 26 | 250 Wins | 50,000 JC',
    winReq: 250,
    coinReq: 50000,
    vipReq: false,
    trailType: 'pyro_flames',
    auraDescription: 'Fiery flame particle system & bursting embers during Nitro',
    themeColor: '#ef4444',
  },
];

export const COUNTRY_TEAMS = [
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', color: 'from-orange-500 to-amber-600' },
  { name: 'France', code: 'FR', flag: '🇫🇷', color: 'from-blue-600 to-indigo-700' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', color: 'from-emerald-600 to-green-700' },
  { name: 'United States', code: 'US', flag: '🇺🇸', color: 'from-red-600 to-blue-700' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', color: 'from-rose-500 to-red-600' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', color: 'from-sky-600 to-indigo-800' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', color: 'from-emerald-500 to-yellow-500' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', color: 'from-amber-600 to-yellow-600' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', color: 'from-cyan-600 to-blue-800' },
];

export function getSkinByLevel(level: number): HorseSkinDef {
  const clamped = Math.max(1, Math.min(12, level));
  return HORSE_SKINS.find((s) => s.level === clamped) || HORSE_SKINS[0];
}

export function checkUnlockedSkin(wins: number, coins: number, isVip: boolean): number {
  let highest = 1;
  for (const s of HORSE_SKINS) {
    let unlocked = false;
    if (s.level === 1) unlocked = true;
    else if (s.level === 11) {
      if (wins >= 75 && isVip) unlocked = true;
    } else if (s.level === 12) {
      if (wins >= 100 && coins >= 50000) unlocked = true;
    } else {
      // OR logic for levels 2-10
      if (wins >= s.winReq || (s.coinReq > 0 && coins >= s.coinReq)) {
        unlocked = true;
      }
    }
    if (unlocked) {
      highest = Math.max(highest, s.level);
    }
  }
  return highest;
}
