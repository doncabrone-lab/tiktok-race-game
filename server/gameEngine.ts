import { Server } from 'socket.io';
import {
  GameState,
  RaceHorse,
  Bet,
  RaceWinnerInfo,
  ChatMessage,
  RaceMode,
  MAX_STAMINA_CAP,
  BASE_STAMINA_DRAIN,
  TAP_STAMINA_BONUS,
} from '../src/types.ts';
import { HORSE_SKINS, COUNTRY_TEAMS, getSkinByLevel } from '../src/skinsData.ts';
import {
  getUser,
  updateUserCoins,
  recordRaceWin,
  recordRaceParticipation,
  checkAndAutoUnlockTiers,
  SKIN_TIERS,
  setVipStatus,
  recordTapsAndGifts,
  saveDb,
} from './db.ts';

export { MAX_STAMINA_CAP, BASE_STAMINA_DRAIN, TAP_STAMINA_BONUS };

export interface GiftBoostResult {
  tier: '1' | '30' | '99' | '500' | '5000+';
  coins: number;
  staminaAdded: number;
  isFullRefill: boolean;
  nitroDuration: number;
  speedBoostPercent: number;
  speedBoostDuration: number;
  label: string;
}

/**
 * Balanced TikTok Gift Conversion Math:
 * - 1 Coin Gifts (Rose, Finger Heart): +3 STA.
 * - 30 Coin Gifts (Doughnut): +15 STA + 5% speed boost for 1.5s.
 * - 99 Coin Gifts (Paper Crane): +35 STA + 10% speed boost for 2.0s.
 * - 500 Coin Gifts (Money Gun): +65 STA + 15% speed boost for 3.0s.
 * - 5000+ Coin Gifts (Drama Queen, Universe): Set Stamina strictly to 100 STA (100% Refill, no overfilling beyond MAX_STAMINA_CAP) + trigger MAX Nitro Cap for 4.0s.
 */
export function calculateGiftBoost(giftName: string, count: number = 1): GiftBoostResult {
  const name = String(giftName || '').toLowerCase().trim();
  const giftCount = Math.max(1, parseInt(String(count), 10) || 1);

  // 5000+ Coin Gifts (Drama Queen, Universe, Galaxy, Lion, etc.)
  if (
    name.includes('universe') ||
    name.includes('drama') ||
    name.includes('queen') ||
    name.includes('lion') ||
    name.includes('galaxy') ||
    name.includes('5000') ||
    name.includes('مجرة') ||
    name.includes('دراما') ||
    name.includes('اسد') ||
    name.includes('أسد')
  ) {
    return {
      tier: '5000+',
      coins: 5000 * giftCount,
      staminaAdded: MAX_STAMINA_CAP,
      isFullRefill: true,
      nitroDuration: 4.0, // MAX Nitro Cap for 4.0s
      speedBoostPercent: 0,
      speedBoostDuration: 0,
      label: name.includes('drama') ? 'Drama Queen' : 'Universe',
    };
  }

  // 500 Coin Gifts (Money Gun): +65 STA + 15% speed boost for 3.0s
  if (
    name.includes('money gun') ||
    name.includes('money') ||
    name.includes('gun') ||
    name.includes('مسدس') ||
    name.includes('500')
  ) {
    return {
      tier: '500',
      coins: 500 * giftCount,
      staminaAdded: 65 * giftCount,
      isFullRefill: false,
      nitroDuration: 0,
      speedBoostPercent: 0.15, // 15% speed boost
      speedBoostDuration: 3.0, // for 3.0s
      label: 'Money Gun',
    };
  }

  // 99 Coin Gifts (Paper Crane): +35 STA + 10% speed boost for 2.0s
  if (
    name.includes('crane') ||
    name.includes('paper') ||
    name.includes('طائر') ||
    name.includes('ورقي') ||
    name.includes('99')
  ) {
    return {
      tier: '99',
      coins: 99 * giftCount,
      staminaAdded: 35 * giftCount,
      isFullRefill: false,
      nitroDuration: 0,
      speedBoostPercent: 0.10, // 10% speed boost
      speedBoostDuration: 2.0, // for 2.0s
      label: 'Paper Crane',
    };
  }

  // 30 Coin Gifts (Doughnut): +15 STA + 5% speed boost for 1.5s
  if (
    name.includes('doughnut') ||
    name.includes('donut') ||
    name.includes('دونات') ||
    name.includes('30')
  ) {
    return {
      tier: '30',
      coins: 30 * giftCount,
      staminaAdded: 15 * giftCount,
      isFullRefill: false,
      nitroDuration: 0,
      speedBoostPercent: 0.05, // 5% speed boost
      speedBoostDuration: 1.5, // for 1.5s
      label: 'Doughnut',
    };
  }

  // 1 Coin Gifts (Rose, Finger Heart): +3 STA
  return {
    tier: '1',
    coins: 1 * giftCount,
    staminaAdded: 3 * giftCount,
    isFullRefill: false,
    nitroDuration: 0,
    speedBoostPercent: 0,
    speedBoostDuration: 0,
    label: name.includes('heart') || name.includes('قلب') || name.includes('finger') ? 'Finger Heart' : 'Rose',
  };
}

export function getGiftCoinValue(giftName: string, explicitCoins?: number, diamondCount?: number, repeatCount: number = 1): number {
  if (typeof explicitCoins === 'number' && explicitCoins > 0) {
    return explicitCoins * repeatCount;
  }
  if (typeof diamondCount === 'number' && diamondCount > 0) {
    return diamondCount * repeatCount;
  }
  const name = String(giftName || '').toLowerCase().trim();
  let baseCoins = 1;
  if (
    name.includes('universe') ||
    name.includes('drama') ||
    name.includes('queen') ||
    name.includes('lion') ||
    name.includes('galaxy') ||
    name.includes('مجرة') ||
    name.includes('اسد') ||
    name.includes('أسد')
  ) {
    baseCoins = 5000;
  } else if (
    name.includes('money gun') ||
    name.includes('money') ||
    name.includes('gun') ||
    name.includes('مسدس') ||
    name.includes('500')
  ) {
    baseCoins = 500;
  } else if (
    name.includes('crane') ||
    name.includes('paper') ||
    name.includes('طائر') ||
    name.includes('ورقي') ||
    name.includes('99')
  ) {
    baseCoins = 99;
  } else if (
    name.includes('doughnut') ||
    name.includes('donut') ||
    name.includes('دونات') ||
    name.includes('30')
  ) {
    baseCoins = 30;
  } else if (name.includes('panda') || name.includes('باندا')) {
    baseCoins = 30;
  } else {
    baseCoins = 1;
  }
  return baseCoins * repeatCount;
}

export class GameEngine {
  private io: Server;
  public state: GameState;
  private loopInterval: NodeJS.Timeout | null = null;
  private pointsCooldowns: Map<string, number> = new Map(); // username -> timestamp
  private raceFinishedTime: number = 0;
  private unlockCeremonyTriggered: boolean = false;
  private tappersInCurrentRace: Map<string, number> = new Map(); // username -> count
  private giftersInCurrentRace: Map<string, { count: number; value: number }> = new Map();

  // Fair-Play Queue, 2-Race Cooldown, Dynamic Scaling & Invite-Only:
  public raceIndex: number = 1;
  private lastPlayedRaceIndexMap: Map<string, number> = new Map(); // username (lower) -> raceIndex
  private lobbyApplicants: Set<string> = new Set();
  private cooldownApplicants: Set<string> = new Set();
  private lobbyExtendedForRace: boolean = false;

  constructor(io: Server) {
    this.io = io;
    this.state = {
      phase: 'LOBBY',
      lobbyTimeLeft: 30,
      countdownTimeLeft: 3,
      raceDuration: 0,
      raceTimeLeft: 60,
      totalRaceTime: 60,
      configuredDuration: 60,
      mode: 'TIME_TRIAL',
      targetLanes: 6,
      isLobbyPaused: false,
      matchMode: 'PUBLIC',
      invitedUsers: [],
      raceIndex: 1,
      lobbyApplicants: [],
      horses: [],
      bets: [],
      activatedSpectators: {},
      currentRaceId: 'RACE_' + Date.now(),
      hostBroadcasterId: 'patronizzle',
    };

    this.initLobbyHorses(6);
    this.broadcastChatMessage({
      id: 'init_vip_' + Date.now(),
      username: 'SYSTEM',
      message: '👑 VIP Mode active for @TurboJockey (Lane 1) & @NeonKnight (Lane 3)! Type !vip or !خاص to join VIP.',
      type: 'system',
      timestamp: Date.now(),
    });
    this.startLoop();
  }

  // --- REGISTREER TAPS & LIKES ---
  public handleTap(username: string, count: number = 1) {
    const cleanName = username.replace(/^@/, '').trim().toLowerCase();
    const horse = this.state.horses.find((h) => h.username.toLowerCase() === cleanName);

    if (horse) {
      // 1 stamina eraf per tap/like
      horse.stamina = Math.max(0, horse.stamina - (1 * count));
      horse.tapsReceived += count;

      // Houd de tappers bij voor post-race statistieken
      const currentTaps = this.tappersInCurrentRace.get(cleanName) || 0;
      this.tappersInCurrentRace.set(cleanName, currentTaps + count);
    }
  }

  public setHostId(hostId: string) {
    this.state.hostBroadcasterId = hostId.replace(/^@/, '').trim();
    this.broadcastState();
  }

  public togglePauseLobby(): boolean {
    this.state.isLobbyPaused = !this.state.isLobbyPaused;
    this.broadcastChatMessage({
      id: 'pause_' + Date.now(),
      username: 'SYSTEM',
      message: this.state.isLobbyPaused
        ? '⏸️ Lobby countdown PAUSED by host.'
        : `▶️ Lobby countdown RESUMED by host (${Math.ceil(this.state.lobbyTimeLeft)}s remaining).`,
      isHost: true,
      type: 'system',
      timestamp: Date.now(),
    });
    this.broadcastState();
    return !!this.state.isLobbyPaused;
  }

  public setPauseLobby(paused: boolean): void {
    this.state.isLobbyPaused = !!paused;
    this.broadcastChatMessage({
      id: 'pause_' + Date.now(),
      username: 'SYSTEM',
      message: this.state.isLobbyPaused
        ? '⏸️ Lobby countdown PAUSED by host.'
        : `▶️ Lobby countdown RESUMED by host (${Math.ceil(this.state.lobbyTimeLeft)}s remaining).`,
      isHost: true,
      type: 'system',
      timestamp: Date.now(),
    });
    this.broadcastState();
  }

  public setMatchMode(mode: 'PUBLIC' | 'INVITE_ONLY', invitedUsers: string[] = []): void {
    this.state.matchMode = mode;
    const cleanInvited = invitedUsers
      .map((u) => u.replace(/^@/, '').trim())
      .filter((u) => u.length > 0);
    this.state.invitedUsers = cleanInvited;

    if (mode === 'INVITE_ONLY') {
      if (cleanInvited.length >= 2) {
        const laneCount = Math.max(2, Math.min(9, cleanInvited.length));
        this.initLobbyHorses(laneCount, cleanInvited);
        this.broadcastChatMessage({
          id: 'mode_' + Date.now(),
          username: 'SYSTEM',
          message: `🔒 INVITE-ONLY MODE ACTIVATED for ${cleanInvited.length} racers: ${cleanInvited.map((u) => '@' + u).join(', ')}!`,
          isHost: true,
          type: 'system',
          timestamp: Date.now(),
        });
      } else {
        this.broadcastChatMessage({
          id: 'mode_' + Date.now(),
          username: 'SYSTEM',
          message: `🔒 INVITE-ONLY MODE ACTIVATED! (Awaiting 2-9 invited handles via !custom or Admin UI).`,
          isHost: true,
          type: 'system',
          timestamp: Date.now(),
        });
      }
    } else {
      this.broadcastChatMessage({
        id: 'mode_' + Date.now(),
        username: 'SYSTEM',
        message: `🌐 PUBLIC LOBBY ACTIVATED! Anyone can type !race to join!`,
        isHost: true,
        type: 'system',
        timestamp: Date.now(),
      });
    }
    this.broadcastState();
  }

  public getLastPlayedRaceIndex(username: string): number {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    return this.lastPlayedRaceIndexMap.get(clean) || 0;
  }

  public setActiveLanes(laneCount: number) {
    const clamped = Math.max(2, Math.min(9, laneCount));
    this.state.targetLanes = clamped;
    this.initLobbyHorses(clamped);
    this.broadcastState();
    this.io.emit('update_grid_size', {
      laneCount: clamped,
      height: '82vh',
      timestamp: Date.now(),
    });
    this.broadcastChatMessage({
      id: 'cmd_' + Date.now(),
      username: 'SYSTEM',
      message: `🏁 Track updated to ${clamped} active lanes!`,
      isHost: true,
      type: 'system',
      timestamp: Date.now(),
    });
  }

  public setRaceDuration(duration: number | 'unlimited') {
    this.state.configuredDuration = duration;
    if (duration === 'unlimited') {
      this.state.mode = 'STANDARD';
      this.state.raceTimeLeft = 0;
      this.state.totalRaceTime = 0;
      this.broadcastChatMessage({
        id: 'cmd_' + Date.now(),
        username: 'SYSTEM',
        message: '🏁 Race Mode: Standard Sprint (Unlimited / Finish Line)!',
        isHost: true,
        type: 'system',
        timestamp: Date.now(),
      });
    } else {
      const validDuration = Math.max(30, duration);
      this.state.mode = 'TIME_TRIAL';
      this.state.raceTimeLeft = validDuration;
      this.state.totalRaceTime = validDuration;
      this.broadcastChatMessage({
        id: 'cmd_' + Date.now(),
        username: 'SYSTEM',
        message: `⏱️ Race Mode: ${Math.round(validDuration / 60)} Minute Race (${validDuration}s)!`,
        isHost: true,
        type: 'system',
        timestamp: Date.now(),
      });
    }
    this.broadcastState();
  }

  public initLobbyHorses(laneCount: number, customUsers?: string[]) {
    const clampedLanes = Math.max(2, Math.min(9, laneCount));
    this.state.targetLanes = clampedLanes;
    this.state.horses = [];

    const defaultNames = [
      'TurboJockey',
      'DesertRider',
      'NeonKnight',
      'SaharaStorm',
      'TokyoDrift',
      'SpeedyGonzales',
      'NordicThunder',
      'RedArrow',
      'ApexLegend',
    ];

    for (let i = 0; i < clampedLanes; i++) {
      const country = COUNTRY_TEAMS[i % COUNTRY_TEAMS.length];
      const username = customUsers && customUsers[i] ? customUsers[i] : defaultNames[i];
      const cleanName = username.replace(/^@/, '');
      // Initialize TurboJockey (Lane 1) and NeonKnight (Lane 3) in VIP mode
      const isDemoVip = (i === 0 || i === 2);
      const initialTier = isDemoVip ? (i === 0 ? 4 : 3) : 1;
      const defaultSkin = getSkinByLevel(initialTier);

      const horseObj: RaceHorse = {
        lane: i + 1,
        username: cleanName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=111215`,
        countryName: country.name,
        countryCode: country.code,
        flagEmoji: country.flag,
        horseLevel: initialTier,
        skin: defaultSkin,
        distance: 0,
        speed: 20,
        stamina: MAX_STAMINA_CAP,
        maxStamina: MAX_STAMINA_CAP,
        isNitro: false,
        nitroTimer: 0,
        speedBoostPercent: 0,
        speedBoostTimer: 0,
        finished: false,
        tapsReceived: 0,
        giftsReceived: 0,
        is_vip: isDemoVip,
        isVip: isDemoVip,
      };

      this.state.horses.push(horseObj);

      // Automatically assign each racer their highest unlocked tier from SQLite by default
      getUser(cleanName)
        .then((u) => {
          if (u) {
            if (u.horse_level && u.horse_level > 1) {
              horseObj.horseLevel = u.horse_level;
              horseObj.skin = getSkinByLevel(u.horse_level);
              horseObj.speed = horseObj.skin.speed;
            }
            if (u.vip_status) {
              horseObj.is_vip = true;
              horseObj.isVip = true;
            } else if (isDemoVip) {
              // Persist VIP status in DB for demo horses
              setVipStatus(cleanName, true).catch(() => {});
              horseObj.is_vip = true;
              horseObj.isVip = true;
            }
            this.broadcastState();
          }
        })
        .catch(() => {});
    }
  }

  private startLoop() {
    if (this.loopInterval) clearInterval(this.loopInterval);
    const TICK_MS = 100; // 10 ticks per second

    this.loopInterval = setInterval(() => {
      this.tick(TICK_MS / 1000);
    }, TICK_MS);
  }

  private tick(dt: number) {
    const now = Date.now();

    switch (this.state.phase) {
      case 'LOBBY': {
        if (!this.state.isLobbyPaused) {
          this.state.lobbyTimeLeft -= dt;
        }

        if (this.state.lobbyTimeLeft <= 0) {
          // Invite-Only / Custom Match Mode resolution
          if (this.state.matchMode === 'INVITE_ONLY' && this.state.invitedUsers && this.state.invitedUsers.length >= 2) {
            const finalInvited = this.state.invitedUsers.slice(0, 9);
            const activeLanes = Math.max(2, Math.min(9, finalInvited.length));
            this.state.targetLanes = activeLanes;
            this.initLobbyHorses(activeLanes, finalInvited);

            this.io.emit('update_grid_size', {
              laneCount: activeLanes,
              height: '82vh',
              timestamp: now,
            });

            this.state.phase = 'COUNTDOWN';
            this.state.countdownTimeLeft = 3;
            this.broadcastChatMessage({
              id: 'sys_' + now,
              username: 'SYSTEM',
              message: `🏁 Invite-Only race starting with ${activeLanes} racers in 3...`,
              type: 'system',
              timestamp: now,
            });
            break;
          }

          // Fair-Play Queue Resolution:
          let nonCooldownList = Array.from(this.lobbyApplicants);
          let cooldownList = Array.from(this.cooldownApplicants);

          // Also include any human players already seated in lobby horses
          for (const h of this.state.horses) {
            const isBot = h.username.startsWith('Bot_') ||
              ['turbojockey', 'desertrider', 'neonknight', 'saharastorm', 'tokyodrift', 'speedygonzales', 'nordicthunder', 'redarrow', 'apexlegend'].includes(h.username.toLowerCase());
            if (!isBot && !nonCooldownList.includes(h.username) && !cooldownList.includes(h.username)) {
              nonCooldownList.push(h.username);
            }
          }

          const totalApplicants = nonCooldownList.length + cooldownList.length;

          // If open lobby has < 2 applicants near timer expiration:
          // extend lobby time or pad with 1 AI bot to reach minimum of 2 lanes
          if (totalApplicants < 2 && !this.lobbyExtendedForRace) {
            this.state.lobbyTimeLeft = 15;
            this.lobbyExtendedForRace = true;
            this.broadcastChatMessage({
              id: 'ext_' + now,
              username: 'SYSTEM',
              message: '⏳ Lobby extended by 15s waiting for challengers! (Minimum 2 racers required)',
              type: 'system',
              timestamp: now,
            });
            this.broadcastState();
            return;
          }

          // If open lobby has >9 applicants without cooldown, perform a fair random selection among non-cooldown applicants
          let selectedRacers: string[] = [];
          if (nonCooldownList.length > 9) {
            const shuffled = [...nonCooldownList];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            selectedRacers = shuffled.slice(0, 9);
          } else {
            selectedRacers = [...nonCooldownList];
            if (selectedRacers.length < 9 && cooldownList.length > 0) {
              const slotsLeft = 9 - selectedRacers.length;
              const shuffledCooldown = [...cooldownList];
              for (let i = shuffledCooldown.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledCooldown[i], shuffledCooldown[j]] = [shuffledCooldown[j], shuffledCooldown[i]];
              }
              selectedRacers.push(...shuffledCooldown.slice(0, slotsLeft));
            }
          }

          // If < 2 applicants, pad with 1 AI bot to reach the minimum of 2 lanes
          if (selectedRacers.length === 0) {
            selectedRacers = ['TurboJockey', 'DesertRider'];
          } else if (selectedRacers.length === 1) {
            const defaultBots = ['TurboJockey', 'DesertRider', 'NeonKnight'];
            const botToAdd = defaultBots.find((b) => b.toLowerCase() !== selectedRacers[0].toLowerCase()) || 'DesertRider';
            selectedRacers.push(botToAdd);
          }

          // DYNAMIC LANE SCALING (2 TO 9 LANES):
          // Respect the host's configured targetLanes (default 6)!
          // Never collapse back to 2 racers just because no one typed !race in chat.
          const desiredLanes = Math.max(2, Math.min(9, this.state.targetLanes || 6));
          let finalRacers: string[] = selectedRacers.slice(0, desiredLanes);

          const defaultBots = [
            'TurboJockey',
            'DesertRider',
            'NeonKnight',
            'SaharaStorm',
            'TokyoDrift',
            'SpeedyGonzales',
            'NordicThunder',
            'RedArrow',
            'ApexLegend',
          ];
          for (const bot of defaultBots) {
            if (finalRacers.length >= desiredLanes) break;
            if (!finalRacers.some((r) => r.toLowerCase() === bot.toLowerCase())) {
              finalRacers.push(bot);
            }
          }

          this.state.targetLanes = desiredLanes;
          this.initLobbyHorses(desiredLanes, finalRacers);

          // Emit socket event update_grid_size so client CSS automatically scales .lane elements
          // using flex: 1 1 0px to perfectly fill the 82vh track height
          this.io.emit('update_grid_size', {
            laneCount: desiredLanes,
            height: '82vh',
            timestamp: now,
          });

          this.state.phase = 'COUNTDOWN';
          this.state.countdownTimeLeft = 3;
          this.broadcastChatMessage({
            id: 'sys_' + now,
            username: 'SYSTEM',
            message: `🏁 Betting closed! Starting ${desiredLanes}-horse race in 3...`,
            type: 'system',
            timestamp: now,
          });
        }
        break;
      }

      case 'COUNTDOWN': {
        this.state.countdownTimeLeft -= dt;
        if (this.state.countdownTimeLeft <= 0) {
          this.state.phase = 'RACING';
          this.state.raceDuration = 0;
          this.raceFinishedTime = 0;
          this.unlockCeremonyTriggered = false;

          // Set race duration for TIME_TRIAL based on host selection
          if (this.state.mode === 'TIME_TRIAL') {
            const targetDur = typeof this.state.configuredDuration === 'number'
              ? this.state.configuredDuration
              : (this.state.totalRaceTime || 60);
            this.state.raceTimeLeft = targetDur;
            this.state.totalRaceTime = targetDur;
          }

          // Reset horse distances & state for race (preserve starting stamina up to MAX_STAMINA_CAP)
          this.state.horses.forEach((h) => {
            h.distance = 0;
            h.finished = false;
            h.finishRank = undefined;
            h.isNitro = false;
            h.nitroTimer = 0;
            h.speedBoostPercent = 0;
            h.speedBoostTimer = 0;
            h.speed_points = 0;
            h.stamina = Math.min(MAX_STAMINA_CAP, h.stamina || MAX_STAMINA_CAP);
            h.maxStamina = MAX_STAMINA_CAP;
          });

          this.broadcastChatMessage({
            id: 'sys_' + now,
            username: 'SYSTEM',
            message: '🚀 THE RACE HAS BEGUN! TAP TO BOOST YOUR HORSE!',
            type: 'system',
            timestamp: now,
          });
        }
        break;
      }

      case 'RACING': {
        this.state.raceDuration += dt;
        let timeExpired = false;

        if (this.state.mode === 'TIME_TRIAL') {
          this.state.raceTimeLeft = Math.max(0, this.state.raceTimeLeft - dt);
          if (this.state.raceTimeLeft <= 0) {
            timeExpired = true;
          }
        }

        let finishedCount = 0;

        for (const horse of this.state.horses) {
          if (horse.finished) {
            finishedCount++;
            continue;
          }

          // Nitro timer management
          if (horse.isNitro) {
            horse.nitroTimer -= dt;
            if (horse.nitroTimer <= 0) {
              horse.isNitro = false;
              horse.nitroTimer = 0;
            }
          }

          // Speed boost timer management
          if (horse.speedBoostTimer && horse.speedBoostTimer > 0) {
            horse.speedBoostTimer -= dt;
            if (horse.speedBoostTimer <= 0) {
              horse.speedBoostTimer = 0;
            }
          }

          // SPEED POINTS & DECAY LOGIC:
          // Gradually decay speed_points over 3 seconds if no new taps arrive
          if (horse.speed_points && horse.speed_points > 0) {
            const timeSinceLastTap = now - (horse.lastTapTime || 0);
            if (timeSinceLastTap > 3000) {
              // Decay speed_points over 3 seconds (~25 points/second)
              const decayAmount = 25 * dt;
              horse.speed_points = Math.max(0, horse.speed_points - decayAmount);
            }
          }

          // SPEED BOOST SCALING:
          // Every 5 speed_points = +1% top speed boost (0.01 factor)
          // Cap the maximum speed boost at +15% total speed (0.15)
          const pointsBoost = Math.min(0.15, ((horse.speed_points || 0) / 5) * 0.01);
          const timedBoost = (horse.speedBoostTimer && horse.speedBoostTimer > 0) ? (horse.speedBoostPercent || 0) : 0;
          horse.speedBoostPercent = Math.min(0.15, Math.max(pointsBoost, timedBoost));

          // STAMINA MATH & DRAIN LOGIC:
          // Set BASE_STAMINA_DRAIN = 5 STA per second during continuous galloping.
          if (horse.stamina > 0) {
            horse.stamina = Math.max(0, horse.stamina - dt * BASE_STAMINA_DRAIN);
          }

          // EQUAL BASELINE SPEED:
          // All horses have identical baseline speed (20).
          // Differing performance is 100% driven by viewer interaction (taps & gifts):
          // stamina replenishment, speed_points (+1% top speed per 5 points up to +15%), and Nitro (1.65x multiplier).
          // No random wiggle or skin-tier speed discrepancy so horses stay neck-and-neck without taps or gifts.
          const BASE_SPEED = 20;
          const staminaFactor = horse.stamina > 20 ? 1.0 : horse.stamina > 0 ? 0.85 : 0.65;
          const nitroFactor = horse.isNitro ? 1.65 : 1.0;
          const speedBoostFactor = 1.0 + (horse.speedBoostPercent || 0);

          const effectiveSpeed = BASE_SPEED * staminaFactor * nitroFactor * speedBoostFactor;

          // Progress distance calculation based on race mode and target duration:
          // In TIME_TRIAL (e.g. 60s, 120s, 180s):
          // The track distance scales so that 100% corresponds to the exact duration of the race!
          // 60s race = ~1.667%/s; 120s race = ~0.833%/s; 180s race = ~0.555%/s.
          // In STANDARD mode:
          // Finish line sprint taking ~30s.
          let baseRatePerSec: number;
          if (this.state.mode === 'TIME_TRIAL') {
            const targetSec = Math.max(10, this.state.totalRaceTime || 60);
            baseRatePerSec = 100 / targetSec;
          } else {
            baseRatePerSec = 100 / 30; // standard 30s sprint
          }

          const multiplier = effectiveSpeed / BASE_SPEED;
          const distanceDelta = baseRatePerSec * multiplier * dt;
          horse.distance = Math.min(100, horse.distance + distanceDelta);

          if (this.state.mode !== 'TIME_TRIAL') {
            if (horse.distance >= 100) {
              horse.distance = 100;
              horse.finished = true;
              finishedCount++;
              const currentRanks = this.state.horses.filter((h) => h.finishRank !== undefined).length;
              horse.finishRank = currentRanks + 1;
              horse.finishTime = this.state.raceDuration;
            }
          }
        }

        // Check race finish condition:
        // In TIME_TRIAL mode: Race runs for the FULL duration (e.g. 1m, 2m, 3m). ONLY finishes when timeExpired!
        // In STANDARD mode: Finishes when winner crosses 100% finish line.
        if (this.state.mode === 'TIME_TRIAL') {
          if (timeExpired) {
            this.finishRace(true);
          }
        } else {
          const hasWinner = this.state.horses.some((h) => h.finished && h.finishRank === 1);
          if (hasWinner && (finishedCount === this.state.horses.length || this.state.raceDuration > 45)) {
            this.finishRace(false);
          }
        }
        break;
      }

      case 'WINNER_CEREMONY': {
        // Cooldown delay of EXACTLY 5 seconds before checking and triggering unlock ceremony
        if (this.raceFinishedTime > 0 && now - this.raceFinishedTime >= 5000 && !this.unlockCeremonyTriggered) {
          this.unlockCeremonyTriggered = true;
          this.triggerUnlockCeremonyCheck();
        }
        break;
      }

      case 'UNLOCK_CEREMONY': {
        // Will transition back to LOBBY after ceremony duration (10s)
        break;
      }
    }

    this.broadcastState();
  }

  private async finishRace(isTimeExpired: boolean) {
    this.state.phase = 'WINNER_CEREMONY';
    this.raceFinishedTime = Date.now();

    // If time expired, rank horses by distance
    if (isTimeExpired) {
      const sorted = [...this.state.horses].sort((a, b) => b.distance - a.distance);
      sorted.forEach((h, idx) => {
        h.finished = true;
        h.finishRank = idx + 1;
      });
    }

    // Determine Top 3
    const ranked = [...this.state.horses].sort((a, b) => (a.finishRank || 99) - (b.finishRank || 99));
    const first = ranked[0];
    const second = ranked[1];
    const third = ranked[2];

    // MVP Calculations
    let topTapper: { username: string; taps: number } | undefined;
    let maxTaps = 0;
    this.tappersInCurrentRace.forEach((taps, username) => {
      if (taps > maxTaps) {
        maxTaps = taps;
        topTapper = { username, taps };
      }
    });

    let topGifter: { username: string; gifts: number; value: number } | undefined;
    let maxGiftVal = 0;
    this.giftersInCurrentRace.forEach((data, username) => {
      if (data.value > maxGiftVal) {
        maxGiftVal = data.value;
        topGifter = { username, gifts: data.count, value: data.value };
      }
    });

    const payouts: Array<{ username: string; coins: number; reason: string }> = [];

    // 1. AUTOMATIC POST-RACE PARTICIPATION & UNLOCK CHECK:
    let anyNewlyUnlockedTier: { username: string; tier: number; name: string; image: string } | null = null;

    for (const horse of this.state.horses) {
      const isWinner = !!(first && horse.lane === first.lane);
      const isSecond = !isWinner && !!(second && horse.lane === second.lane);
      const isThird = !isWinner && !isSecond && !!(third && horse.lane === third.lane);
      const jcPrize = isWinner ? 100 : isSecond ? 50 : isThird ? 25 : 0;

      if (isWinner) {
        payouts.push({ username: horse.username, coins: 100, reason: '🥇 1st Place Victory (+100 JC, +1 Win, +60 XP)' });
      } else if (isSecond) {
        payouts.push({ username: horse.username, coins: 50, reason: '🥈 2nd Place Finish (+50 JC, +10 XP)' });
      } else if (isThird) {
        payouts.push({ username: horse.username, coins: 25, reason: '🥉 3rd Place Finish (+25 JC, +10 XP)' });
      }

      this.lastPlayedRaceIndexMap.set(horse.username.toLowerCase(), this.raceIndex);
      const result = await recordRaceParticipation(horse.username, isWinner, jcPrize, this.raceIndex);

      horse.horseLevel = result.autoUnlocks.highestTier;
      horse.skin = getSkinByLevel(result.autoUnlocks.highestTier);

      if (result.autoUnlocks.newlyUnlockedTiers.length > 0) {
        for (const unl of result.autoUnlocks.newlyUnlockedTiers) {
          const skinDef = getSkinByLevel(unl.tier);
          const unlockPayload = {
            username: horse.username,
            tier: unl.tier,
            skinName: unl.name,
            skinImage: skinDef.image,
            player_level: result.user.player_level,
            wins_count: result.user.wins_count,
            jc_balance: result.user.jc_balance,
            timestamp: Date.now(),
          };

          this.io.emit('auto_skin_unlocked', unlockPayload);

          if (!anyNewlyUnlockedTier) {
            anyNewlyUnlockedTier = {
              username: horse.username,
              tier: unl.tier,
              name: unl.name,
              image: skinDef.image,
            };
          }

          this.broadcastChatMessage({
            id: 'auto_unlock_' + Date.now() + '_' + unl.tier,
            username: 'SYSTEM',
            message: `🎉 TIER UNLOCKED: @${horse.username} unlocked Tier ${unl.tier} [${unl.name}]! (Lv. ${result.user.player_level} • ${result.user.wins_count} W • ${result.user.jc_balance} JC)`,
            type: 'system',
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  private triggerUnlockCeremonyCheck() {
    this.state.phase = 'LOBBY';
    this.state.lobbyTimeLeft = 30;
    this.raceIndex++;
    this.state.raceIndex = this.raceIndex;
    this.lobbyApplicants.clear();
    this.cooldownApplicants.clear();
    this.tappersInCurrentRace.clear();
    this.giftersInCurrentRace.clear();
    this.lobbyExtendedForRace = false;
    this.broadcastState();
  }

  public broadcastChatMessage(msg: ChatMessage) {
    this.io.emit('chat:message', msg);
  }

  public broadcastState() {
    this.io.emit('game:state', this.state);
  }
}
