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

export const MAX_STAMINA_CAP = 100;
export const BASE_STAMINA_DRAIN = 5;
export const TAP_STAMINA_BONUS = 2;
export const TAP_SPEED_BONUS = 0.5;

export interface RaceHorse {
  lane: number;
  username: string;
  avatarUrl?: string;
  countryName: string;
  countryCode: string;
  flagEmoji: string;
  horseLevel: number;
  skin: HorseSkinDef;
  distance: number;
  speed: number;
  stamina: number;
  maxStamina: number;
  isNitro: boolean;
  nitroTimer: number;
  speedBoostPercent?: number;
  speedBoostTimer?: number;
  speed_points?: number;
  tapSpeedBonus?: number;
  lastTapTime?: number;
  finished: boolean;
  finishRank?: number;
  finishTime?: number;
  tapsReceived: number;
  giftsReceived: number;
  is_vip?: boolean;
  isVip?: boolean;
}

export type GameStatePhase =
  | 'JOINING'
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'RACING'
  | 'WINNER_CEREMONY'
  | 'UNLOCK_CEREMONY';

export type RaceMode = 'STANDARD' | 'TIME_TRIAL';

export type TrackLayoutMode =
  | 'SQUARE'
  | 'VERTICAL'
  | 'FIT';

export interface Bet {
  username: string;
  lane: number;
  amount: number;
  payout?: number;
}

export interface MVPStats {
  topTapper?: {
    username: string;
    taps: number;
  };
  topGifter?: {
    username: string;
    gifts: number;
    value: number;
  };
}

export interface RaceWinnerInfo {
  first: {
    username: string;
    horseLevel: number;
    skinName: string;
    lane: number;
    avatarUrl?: string;
    points?: number;
  };

  second?: {
    username: string;
    horseLevel: number;
    skinName: string;
    lane: number;
    avatarUrl?: string;
    points?: number;
  };

  third?: {
    username: string;
    horseLevel: number;
    skinName: string;
    lane: number;
    avatarUrl?: string;
    points?: number;
  };

  mvp: MVPStats;

  payouts: Array<{
    username: string;
    coins: number;
    reason: string;
  }>;
}

export interface StatsAlert {
  username: string;
  type: 'wins' | 'points';
  value: number;
  text: string;
  timestamp: number;
}

export interface GameState {
  phase: GameStatePhase;

  lobbyTimeLeft: number;
  countdownTimeLeft: number;

  raceDuration: number;
  raceTimeLeft: number;
  totalRaceTime?: number;

  configuredDuration?: number | 'unlimited';

  targetMeters: number;
  remainingMeters?: number;

  mode: RaceMode;

  targetLanes: number;

  isLobbyPaused?: boolean;

  matchMode?: 'PUBLIC' | 'INVITE_ONLY';

  invitedUsers?: string[];

  raceIndex?: number;

  lobbyApplicants?: string[];

  horses: RaceHorse[];

  bets: Bet[];

  latestPick?: {
    username: string;
    lane: number;
    horseName?: string;
    timestamp: number;
  };

  latestStatsAlert?: StatsAlert;

  activatedSpectators: Record<
    string,
    {
      taps: number;
      coinsEarned: number;
    }
  >;

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
  type?:
    | 'chat'
    | 'command'
    | 'system'
    | 'gift'
    | 'tap';

  giftName?: string;
  giftCount?: number;
}
