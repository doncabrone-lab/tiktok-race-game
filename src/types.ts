export interface HorseSkinDef {
  level: number;
  name: string;
  image: string;
  speed: number;
  maxStamina: number;
  unlockReq: string;
  winReq: number;
  coinReq: number;
  vipReq: boolean;
  trailType: string;
  auraDescription: string;
  themeColor: string;
}

export interface PlayerProfile {
  username: string;
  displayName: string;
  avatarUrl: string;
  coins: number;
  wins: number;
  totalRaces: number;
  horseLevel: number;
  unlockedSkins: number[];
  vipStatus: boolean;
  totalTaps: number;
  totalGifts: number;
}

export const MAX_STAMINA_CAP = 100; // Base tier max stamina cap (100 STA)
export const BASE_STAMINA_DRAIN = 5; // 5 STA per second during continuous galloping
export const TAP_STAMINA_BONUS = 0.5; // 1 Tap = +1.0 STA added directly to horse pool (10 Taps = +10 STA)

export interface RaceHorse {
  lane: number;
  username: string;
  avatarUrl?: string;
  countryName: string;
  countryCode: string;
  flagEmoji: string;
  horseLevel: number;
  skin: HorseSkinDef;
  distance: number; // 0 to 100%
  speed: number;
  stamina: number;
  maxStamina: number;
  isNitro: boolean;
  nitroTimer: number;
  speedBoostPercent?: number;
  speedBoostTimer?: number;
  speed_points?: number;
  lastTapTime?: number;
  finished: boolean;
  finishRank?: number;
  finishTime?: number;
  tapsReceived: number;
  giftsReceived: number;
  is_vip?: boolean;
  isVip?: boolean;
}

export type GameStatePhase = 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'WINNER_CEREMONY' | 'UNLOCK_CEREMONY';

export type RaceMode = 'STANDARD' | 'TIME_TRIAL';

export interface Bet {
  username: string;
  lane: number;
  amount: number;
  payout?: number;
}

export interface MVPStats {
  topTapper?: { username: string; taps: number };
  topGifter?: { username: string; gifts: number; value: number };
}

export interface RaceWinnerInfo {
  first: { username: string; horseLevel: number; skinName: string; lane: number; avatarUrl?: string; points?: number };
  second?: { username: string; horseLevel: number; skinName: string; lane: number; avatarUrl?: string; points?: number };
  third?: { username: string; horseLevel: number; skinName: string; lane: number; avatarUrl?: string; points?: number };
  mvp: MVPStats;
  payouts: Array<{ username: string; coins: number; reason: string }>;
}

export interface GameState {
  phase: GameStatePhase;
  lobbyTimeLeft: number;
  countdownTimeLeft: number;
  raceDuration: number;
  raceTimeLeft: number; // for Time Trial
  totalRaceTime?: number; // total duration of current race in seconds (e.g. 60, 120, 180)
  configuredDuration?: number | 'unlimited'; // host configured duration
  mode: RaceMode;
  targetLanes: number;
  isLobbyPaused?: boolean;
  matchMode?: 'PUBLIC' | 'INVITE_ONLY';
  invitedUsers?: string[];
  raceIndex?: number;
  lobbyApplicants?: string[];
  horses: RaceHorse[];
  bets: Bet[];
  activatedSpectators: Record<string, { taps: number; coinsEarned: number }>;
  currentRaceId: string;
  hostBroadcasterId: string;
  winnerInfo?: RaceWinnerInfo;
  unlockInfo?: {
    username: string;
    unlockedLevel: number;
    skinName: string;
    skinImage: string;
  };
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  isHost?: boolean;
  isVIP?: boolean;
  timestamp: number;
  type?: 'chat' | 'command' | 'system' | 'gift' | 'tap';
  giftName?: string;
  giftCount?: number;
}
