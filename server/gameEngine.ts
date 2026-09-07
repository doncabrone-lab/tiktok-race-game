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
    // Evaluate each participant's updated metrics immediately after race results are saved.
    // Players earn XP strictly by completing races (+10 XP) and winning races (+50 XP).
    // Automatically unlock the NEXT tier when: player_level >= reqLevel AND wins_count >= reqWins AND jc_balance >= reqJC.
    // Append newly unlocked tiers to unlocked_skins without deducting JC.
    // Automatically assign each racer their highest unlocked tier by default for future races.
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

      // Record XP, Level, Wins, JC in SQLite and run unlock check
      this.lastPlayedRaceIndexMap.set(horse.username.toLowerCase(), this.raceIndex);
      const result = await recordRaceParticipation(horse.username, isWinner, jcPrize, this.raceIndex);

      // Automatically assign each racer their highest unlocked tier by default for future races
      horse.horseLevel = result.autoUnlocks.highestTier;
      horse.skin = getSkinByLevel(result.autoUnlocks.highestTier);

      // Emit auto_skin_unlocked event for each newly unlocked tier
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

    // Spectator Bets & Bonuses
    // Typing a bet command ACTIVATES the spectator: 100 taps = 2 Jockey Coins (JC). Activated spectators qualify for Top 3 Bonus (1st: +20 JC, 2nd: +10 JC, 3rd: +5 JC).
    for (const bet of this.state.bets) {
      const isActivated = !!this.state.activatedSpectators[bet.username.toLowerCase()];
      if (!isActivated) continue;

      if (first && bet.lane === first.lane) {
        await updateUserCoins(bet.username, 20);
        payouts.push({ username: bet.username, coins: 20, reason: '🎯 Bet Won! 1st Place Bonus (+20 JC)' });
      } else if (second && bet.lane === second.lane) {
        await updateUserCoins(bet.username, 10);
        payouts.push({ username: bet.username, coins: 10, reason: '🎯 Bet Won! 2nd Place Bonus (+10 JC)' });
      } else if (third && bet.lane === third.lane) {
        await updateUserCoins(bet.username, 5);
        payouts.push({ username: bet.username, coins: 5, reason: '🎯 Bet Won! 3rd Place Bonus (+5 JC)' });
      }
    }

    // Activated spectators tap rewards (100 taps = 2 JC)
    for (const [user, data] of Object.entries(this.state.activatedSpectators)) {
      if (data.taps >= 100) {
        const tapReward = Math.floor(data.taps / 100) * 2;
        if (tapReward > 0) {
          await updateUserCoins(user, tapReward);
          payouts.push({ username: user, coins: tapReward, reason: `⚡ Spectator Taps Reward (${data.taps} taps -> +${tapReward} JC)` });
        }
      }
    }

    if (anyNewlyUnlockedTier) {
      this.state.unlockInfo = {
        username: anyNewlyUnlockedTier.username,
        unlockedLevel: anyNewlyUnlockedTier.tier,
        skinName: anyNewlyUnlockedTier.name,
        skinImage: anyNewlyUnlockedTier.image,
      };
    }

    const winnerInfo: RaceWinnerInfo = {
      first: {
        username: first?.username || 'Champion',
        horseLevel: first?.horseLevel || 1,
        skinName: first?.skin.name || 'Scrappy Pony',
        lane: first?.lane || 1,
        avatarUrl: first?.avatarUrl,
        points: 100,
      },
      second: second
        ? {
            username: second.username,
            horseLevel: second.horseLevel,
            skinName: second.skin.name,
            lane: second.lane,
            avatarUrl: second.avatarUrl,
            points: 50,
          }
        : undefined,
      third: third
        ? {
            username: third.username,
            horseLevel: third.horseLevel,
            skinName: third.skin.name,
            lane: third.lane,
            avatarUrl: third.avatarUrl,
            points: 25,
          }
        : undefined,
      mvp: {
        topTapper,
        topGifter,
      },
      payouts,
    };

    this.state.winnerInfo = winnerInfo;
    this.broadcastState();

    this.raceIndex += 1;
    this.state.raceIndex = this.raceIndex;

    this.broadcastChatMessage({
      id: 'win_' + Date.now(),
      username: 'SYSTEM',
      message: `🏆 WINNER: @${winnerInfo.first.username} riding ${winnerInfo.first.skinName}! (Race #${this.raceIndex - 1} Complete)`,
      type: 'system',
      timestamp: Date.now(),
    });
  }

  private async triggerUnlockCeremonyCheck() {
    if (!this.state.winnerInfo) {
      this.resetToLobby();
      return;
    }

    const winnerUser = await getUser(this.state.winnerInfo.first.username);
    // Check if horse level unlocked a higher tier
    const skin = getSkinByLevel(winnerUser.horse_level);

    if (winnerUser.horse_level > 1 && winnerUser.horse_level > (this.state.winnerInfo.first.horseLevel || 1)) {
      this.state.phase = 'UNLOCK_CEREMONY';
      this.state.unlockInfo = {
        username: winnerUser.username,
        unlockedLevel: winnerUser.horse_level,
        skinName: skin.name,
        skinImage: skin.image,
      };
      this.broadcastState();

      this.broadcastChatMessage({
        id: 'unlock_' + Date.now(),
        username: 'SYSTEM',
        message: `✨ UNLOCK CEREMONY: @${winnerUser.username} unlocked Tier ${winnerUser.horse_level} [${skin.name}]!`,
        type: 'system',
        timestamp: Date.now(),
      });

      setTimeout(() => {
        this.resetToLobby();
      }, 7000);
    } else {
      // No unlock, return to lobby after 4 seconds
      setTimeout(() => {
        this.resetToLobby();
      }, 4000);
    }
  }

  public resetToLobby() {
    this.state.phase = 'LOBBY';
    this.state.lobbyTimeLeft = 30;
    this.state.countdownTimeLeft = 3;
    const configuredDur = this.state.configuredDuration ?? 60;
    if (configuredDur === 'unlimited') {
      this.state.mode = 'STANDARD';
      this.state.raceTimeLeft = 0;
      this.state.totalRaceTime = 0;
    } else {
      this.state.mode = 'TIME_TRIAL';
      this.state.raceTimeLeft = configuredDur;
      this.state.totalRaceTime = configuredDur;
    }
    this.state.isLobbyPaused = false;
    this.state.bets = [];
    this.state.activatedSpectators = {};
    this.state.winnerInfo = undefined;
    this.state.unlockInfo = undefined;
    this.state.currentRaceId = 'RACE_' + Date.now();
    this.lobbyApplicants.clear();
    this.cooldownApplicants.clear();
    this.lobbyExtendedForRace = false;
    this.state.lobbyApplicants = [];
    this.tappersInCurrentRace.clear();
    this.giftersInCurrentRace.clear();

    const persistentLanes = Math.max(2, Math.min(9, this.state.targetLanes || 6));
    this.state.targetLanes = persistentLanes;

    // In invite-only mode with active invited users, retain them
    if (this.state.matchMode === 'INVITE_ONLY' && this.state.invitedUsers && this.state.invitedUsers.length >= 2) {
      this.initLobbyHorses(Math.max(2, Math.min(9, this.state.invitedUsers.length)), this.state.invitedUsers);
    } else {
      this.initLobbyHorses(persistentLanes);
    }
    this.broadcastState();
  }

  // Handle Incoming Chat / TikTok Stream Commands
  public async handleCommand(username: string, rawText: string, isBroadcaster: boolean = false): Promise<void> {
    const text = rawText.trim();
    const cleanUser = username.replace(/^@/, '').trim();
    const now = Date.now();

    // Check Broadcaster Host Commands
    const isHost = isBroadcaster || cleanUser.toLowerCase() === this.state.hostBroadcasterId.toLowerCase();

    // Host set lanes command: "!lanes 4", "!lanes 6", etc.
    if (isHost && text.toLowerCase().startsWith('!lanes')) {
      const parts = text.split(/\s+/);
      const count = parseInt(parts[1], 10);
      if (!isNaN(count) && count >= 2 && count <= 9) {
        this.setActiveLanes(count);
        return;
      }
    }

    // Host set duration unlimited command
    if (isHost && text.toLowerCase() === '!race unlimited') {
      this.setRaceDuration('unlimited');
      return;
    }

    // Host Pause / Resume Commands
    if (isHost && (text.toLowerCase() === '!pause' || text.toLowerCase() === '!pause lobby' || text.toLowerCase() === '!توقف')) {
      this.setPauseLobby(true);
      return;
    }
    if (isHost && (text.toLowerCase() === '!resume' || text.toLowerCase() === '!resume lobby' || text.toLowerCase() === '!استئناف')) {
      this.setPauseLobby(false);
      return;
    }

    // Host Invite-Only / Custom Match Mode Commands:
    // !custom @user1 @user2 ... (or !custom user1,user2...)
    if (isHost && (text.toLowerCase().startsWith('!custom') || text.toLowerCase().startsWith('!invite'))) {
      const handles = text
        .replace(/^!(?:custom|invite)\s*/i, '')
        .split(/[,\s]+/)
        .map((h) => h.replace(/^@/, '').trim())
        .filter((h) => h.length > 0);

      if (handles.length >= 2) {
        this.setMatchMode('INVITE_ONLY', handles.slice(0, 9));
      } else {
        this.broadcastChatMessage({
          id: 'err_' + now,
          username: 'SYSTEM',
          message: '⚠️ Usage: !custom @user1 @user2 (minimum 2, maximum 9 handles required).',
          isHost: true,
          type: 'system',
          timestamp: now,
        });
      }
      return;
    }

    // Host Public Mode Command
    if (isHost && (text.toLowerCase() === '!public' || text.toLowerCase() === '!open' || text.toLowerCase() === '!عام')) {
      this.setMatchMode('PUBLIC');
      return;
    }

    // 1. Host Custom Tournament & Race Modes:
    // !race [ID1],[ID2]... (2-9 players)
    // !race 1m, !race 2m, !race 60s
    if (isHost && (text.startsWith('!race ') || text.startsWith('!سباق '))) {
      const arg = text.replace(/^(!race|!سباق)\s+/, '').trim();

      // Time modes: 1m, 2m, 3m (No 30 second races)
      const timeMatch = arg.match(/^(\d+)(m|s)$/i);
      if (timeMatch) {
        const val = parseInt(timeMatch[1], 10);
        const unit = timeMatch[2].toLowerCase();
        let seconds = unit === 'm' ? val * 60 : val;
        // Enforce 1m, 2m, 3m races (minimum 60s)
        if (seconds < 60) {
          seconds = 60;
        }
        this.setRaceDuration(seconds);
        this.state.phase = 'COUNTDOWN';
        this.state.countdownTimeLeft = 3;

        this.broadcastChatMessage({
          id: 'cmd_' + now,
          username: cleanUser,
          message: `⏱️ Time Trial Mode Activated: ${Math.round(seconds / 60)} Minute Race (${seconds}s)!`,
          isHost: true,
          type: 'system',
          timestamp: now,
        });
        return;
      }

      // Player list mode: !race user1,user2,user3...
      const players = arg.split(/[,\s]+/).map((p) => p.replace(/^@/, '').trim()).filter(Boolean);
      if (players.length >= 2 && players.length <= 9) {
        this.initLobbyHorses(players.length, players);
        this.broadcastChatMessage({
          id: 'cmd_' + now,
          username: cleanUser,
          message: `🏆 Custom Tournament Initialized with ${players.length} racers!`,
          isHost: true,
          type: 'system',
          timestamp: now,
        });
        return;
      }
    }

    // Minimal !wins command: chat response only "@username | X Wins"
    if (text.toLowerCase().startsWith('!wins')) {
      const parts = text.split(/\s+/);
      const targetUser = parts[1] ? parts[1].replace(/^@/, '').trim() : cleanUser;
      const user = await getUser(targetUser);
      const wins = user.wins_count ?? user.wins ?? 0;
      this.broadcastChatMessage({
        id: 'wins_' + now,
        username: targetUser,
        message: `@${targetUser} | ${wins} Wins`,
        type: 'chat',
        timestamp: now,
      });
      return;
    }

    // 2. Points Check: "!points", "!pts", "!نقاط", "!نقاطي" (15s cooldown per user)
    const pointsCommands = ['!points', '!pts', '!نقاط', '!نقاطي'];
    if (pointsCommands.includes(text.toLowerCase())) {
      const lastCheck = this.pointsCooldowns.get(cleanUser.toLowerCase()) || 0;
      if (now - lastCheck < 15000) {
        const remaining = Math.ceil((15000 - (now - lastCheck)) / 1000);
        this.broadcastChatMessage({
          id: 'cd_' + now,
          username: cleanUser,
          message: `⏳ Cooldown: Wait ${remaining}s before checking points again.`,
          type: 'chat',
          timestamp: now,
        });
        return;
      }

      this.pointsCooldowns.set(cleanUser.toLowerCase(), now);
      const user = await getUser(cleanUser);
      const skin = getSkinByLevel(user.horse_level);
      this.broadcastChatMessage({
        id: 'pts_' + now,
        username: cleanUser,
        message: `🪙 Balance: ${user.coins} JC | 🏆 Wins: ${user.wins} | 🐎 Tier ${user.horse_level} [${skin.name}]`,
        type: 'chat',
        timestamp: now,
      });
      return;
    }

    // 3. Normal Join: "!race", "!سباق"
    if (text.toLowerCase() === '!race' || text.toLowerCase() === '!سباق') {
      if (this.state.phase !== 'LOBBY') {
        return;
      }

      // Invite-Only Mode Check:
      // Ignore incoming standard !race chat commands from other viewers while Invite-Only is active
      if (this.state.matchMode === 'INVITE_ONLY') {
        const isInvited = (this.state.invitedUsers || []).some(
          (u) => u.toLowerCase() === cleanUser.toLowerCase()
        );
        if (!isInvited) {
          this.broadcastChatMessage({
            id: 'inv_' + now,
            username: cleanUser,
            message: `🔒 Invite-Only Mode is active. Only invited racers can participate.`,
            type: 'chat',
            timestamp: now,
          });
          return;
        }
      }

      // 2-RACE COOLDOWN & FAIR-PLAY QUEUE LOGIC:
      // Track last played race count per player in SQLite / active memory (last_played_race_index).
      // Apply a strict 2-race cooldown: players who participated in the last 2 races are blocked
      // from !race during the first 20s of an open lobby (i.e. while lobbyTimeLeft > 10 in a 30s lobby).
      const lastRace = this.getLastPlayedRaceIndex(cleanUser);
      const inCooldown = lastRace > 0 && (this.raceIndex - lastRace) < 2;

      if (inCooldown && this.state.lobbyTimeLeft > 10) {
        const remainingCooldownSeconds = Math.ceil(this.state.lobbyTimeLeft - 10);
        this.broadcastChatMessage({
          id: 'cd_' + now,
          username: cleanUser,
          message: `⏳ 2-Race Cooldown: @${cleanUser} raced in Race #${lastRace}. Cooldown active for first 20s of open lobby (${remainingCooldownSeconds}s remaining).`,
          type: 'chat',
          timestamp: now,
        });
        return;
      }

      // Register applicant
      if (inCooldown) {
        this.cooldownApplicants.add(cleanUser);
      } else {
        this.lobbyApplicants.add(cleanUser);
      }
      this.state.lobbyApplicants = Array.from(new Set([...this.lobbyApplicants, ...this.cooldownApplicants]));

      // Check if user already in race
      const exists = this.state.horses.some((h) => h.username.toLowerCase() === cleanUser.toLowerCase());
      if (exists) {
        return;
      }

      const user = await getUser(cleanUser);
      const skin = getSkinByLevel(user.horse_level);

      // Find an available lane or replace default bot
      const botIdx = this.state.horses.findIndex(
        (h) => h.username.startsWith('Turbo') || h.username.startsWith('Desert') || h.username.startsWith('Neon') || h.username.startsWith('Sahara') || h.username.startsWith('Tokyo') || h.username.startsWith('Speedy')
      );

      if (botIdx !== -1) {
        this.state.horses[botIdx].username = cleanUser;
        this.state.horses[botIdx].avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUser)}&backgroundColor=111215`;
        this.state.horses[botIdx].horseLevel = user.horse_level;
        this.state.horses[botIdx].skin = skin;
        this.state.horses[botIdx].speed = skin.speed;
        this.state.horses[botIdx].maxStamina = MAX_STAMINA_CAP;
        this.state.horses[botIdx].stamina = MAX_STAMINA_CAP;
        this.state.horses[botIdx].speed_points = 0;
        this.state.horses[botIdx].speedBoostPercent = 0;
        this.state.horses[botIdx].speedBoostTimer = 0;
        this.state.horses[botIdx].is_vip = !!user.vip_status;
        this.state.horses[botIdx].isVip = !!user.vip_status;
      } else if (this.state.horses.length < 9) {
        const nextLane = this.state.horses.length + 1;
        const country = COUNTRY_TEAMS[(nextLane - 1) % COUNTRY_TEAMS.length];
        this.state.horses.push({
          lane: nextLane,
          username: cleanUser,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUser)}&backgroundColor=111215`,
          countryName: country.name,
          countryCode: country.code,
          flagEmoji: country.flag,
          horseLevel: user.horse_level,
          skin: skin,
          distance: 0,
          speed: skin.speed,
          stamina: MAX_STAMINA_CAP,
          maxStamina: MAX_STAMINA_CAP,
          isNitro: false,
          nitroTimer: 0,
          speed_points: 0,
          speedBoostPercent: 0,
          speedBoostTimer: 0,
          finished: false,
          tapsReceived: 0,
          giftsReceived: 0,
          is_vip: !!user.vip_status,
          isVip: !!user.vip_status,
        });
        this.state.targetLanes = this.state.horses.length;
      }

      this.broadcastChatMessage({
        id: 'join_' + now,
        username: cleanUser,
        message: `🐎 Joined Lane ${this.state.horses.find((h) => h.username.toLowerCase() === cleanUser.toLowerCase())?.lane}! (Tier ${user.horse_level} ${skin.name})`,
        type: 'chat',
        timestamp: now,
      });
      return;
    }

    // 4. VIP Entry: "!vip", "!خاص", "!vip 1", "!vip 2", "!vip @user"
    const vipMatch = text.match(/^!(?:vip|خاص)(?:\s+(.+))?$/i);
    if (vipMatch) {
      const targetArg = vipMatch[1]?.trim();
      let targetHorse: RaceHorse | undefined;
      let activatedUser = cleanUser;

      if (targetArg) {
        const laneNum = parseInt(targetArg.replace(/^lane\s*/i, ''), 10);
        if (!isNaN(laneNum) && laneNum >= 1 && laneNum <= this.state.horses.length) {
          targetHorse = this.state.horses.find((h) => h.lane === laneNum);
          if (targetHorse) {
            activatedUser = targetHorse.username;
          }
        } else {
          // Argument is a username
          const cleanTarget = targetArg.replace(/^@/, '').trim();
          targetHorse = this.state.horses.find(
            (h) => h.username.toLowerCase() === cleanTarget.toLowerCase()
          );
          if (targetHorse) {
            activatedUser = targetHorse.username;
          } else {
            activatedUser = cleanTarget;
          }
        }
      } else {
        // No argument: check if cleanUser is already in the race
        targetHorse = this.state.horses.find(
          (h) => h.username.toLowerCase() === cleanUser.toLowerCase()
        );
      }

      // If cleanUser is not already riding a horse on the track:
      if (!targetHorse) {
        if (this.state.phase === 'LOBBY') {
          // Join race as VIP horse
          const user = await getUser(activatedUser);
          const skin = getSkinByLevel(user.horse_level);
          const botIdx = this.state.horses.findIndex(
            (h) => h.username.startsWith('Turbo') || h.username.startsWith('Desert') || h.username.startsWith('Neon') || h.username.startsWith('Sahara') || h.username.startsWith('Tokyo') || h.username.startsWith('Speedy')
          );
          if (botIdx !== -1) {
            this.state.horses[botIdx].username = activatedUser;
            this.state.horses[botIdx].avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activatedUser)}&backgroundColor=111215`;
            this.state.horses[botIdx].horseLevel = user.horse_level;
            this.state.horses[botIdx].skin = skin;
            this.state.horses[botIdx].speed = skin.speed;
            this.state.horses[botIdx].is_vip = true;
            this.state.horses[botIdx].isVip = true;
            targetHorse = this.state.horses[botIdx];
          } else if (this.state.horses.length < 9) {
            const nextLane = this.state.horses.length + 1;
            const country = COUNTRY_TEAMS[(nextLane - 1) % COUNTRY_TEAMS.length];
            const newHorse: RaceHorse = {
              lane: nextLane,
              username: activatedUser,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activatedUser)}&backgroundColor=111215`,
              countryName: country.name,
              countryCode: country.code,
              flagEmoji: country.flag,
              horseLevel: user.horse_level,
              skin: skin,
              distance: 0,
              speed: skin.speed,
              stamina: MAX_STAMINA_CAP,
              maxStamina: MAX_STAMINA_CAP,
              isNitro: false,
              nitroTimer: 0,
              speedBoostPercent: 0,
              speedBoostTimer: 0,
              finished: false,
              tapsReceived: 0,
              giftsReceived: 0,
              is_vip: true,
              isVip: true,
            };
            this.state.horses.push(newHorse);
            this.state.targetLanes = this.state.horses.length;
            targetHorse = newHorse;
          } else {
            targetHorse = this.state.horses[0];
          }
        } else {
          // During RACING:
          // Adopt a bot horse or upgrade first non-VIP / Lane 1
          const botHorse = this.state.horses.find(
            (h) => h.username.startsWith('Turbo') || h.username.startsWith('Desert') || h.username.startsWith('Neon') || h.username.startsWith('Sahara') || h.username.startsWith('Tokyo') || h.username.startsWith('Speedy')
          );
          if (botHorse) {
            botHorse.username = activatedUser;
            botHorse.avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activatedUser)}&backgroundColor=111215`;
            botHorse.is_vip = true;
            botHorse.isVip = true;
            targetHorse = botHorse;
          } else {
            targetHorse = this.state.horses.find((h) => !h.is_vip) || this.state.horses[0];
            if (targetHorse) {
              activatedUser = targetHorse.username;
            }
          }
        }
      }

      if (targetHorse) {
        targetHorse.is_vip = true;
        targetHorse.isVip = true;
      }
      await setVipStatus(activatedUser, true);

      this.broadcastState();
      this.broadcastChatMessage({
        id: 'vip_' + now,
        username: activatedUser,
        message: `👑 VIP status activated for @${activatedUser}${targetHorse ? ` (Lane ${targetHorse.lane})` : ''}! Gold borders & Royal Lane active!`,
        isVIP: true,
        type: 'chat',
        timestamp: now,
      });
      return;
    }

    // 5. Spectator Betting: "!bet 1" to "!bet 9" or "!1" to "!9" or "!رهان 1" to "!رهان 9"
    const betMatch = text.match(/^!(?:bet\s+|رهان\s+)?([1-9])$/i);
    if (betMatch) {
      if (this.state.phase !== 'LOBBY') {
        this.broadcastChatMessage({
          id: 'bet_err_' + now,
          username: cleanUser,
          message: `⚠️ Betting is only open during the 30s pre-race lobby!`,
          type: 'chat',
          timestamp: now,
        });
        return;
      }

      const targetLane = parseInt(betMatch[1], 10);
      if (targetLane > this.state.horses.length) {
        return;
      }

      // Activate spectator
      if (!this.state.activatedSpectators[cleanUser.toLowerCase()]) {
        this.state.activatedSpectators[cleanUser.toLowerCase()] = { taps: 0, coinsEarned: 0 };
      }

      // Record bet
      const existingBetIdx = this.state.bets.findIndex((b) => b.username.toLowerCase() === cleanUser.toLowerCase());
      if (existingBetIdx !== -1) {
        this.state.bets[existingBetIdx].lane = targetLane;
      } else {
        this.state.bets.push({
          username: cleanUser,
          lane: targetLane,
          amount: 0, // Free numeric betting per specification
        });
      }

      const horse = this.state.horses.find((h) => h.lane === targetLane);
      this.broadcastChatMessage({
        id: 'bet_' + now,
        username: cleanUser,
        message: `🎯 Bet placed on Lane ${targetLane} (@${horse?.username || 'Runner'})! You are now an ACTIVATED spectator!`,
        type: 'chat',
        timestamp: now,
      });
      return;
    }

    // Standard Chat Message
    this.broadcastChatMessage({
      id: 'chat_' + now,
      username: cleanUser,
      message: text,
      type: 'chat',
      timestamp: now,
    });
  }

  // Handle Screen Micro-taps
  // Active Tapper Formula: 1:1 tap-to-point ratio (1 tap = +1 point)
  // While Stamina < 100%: +1 to Stamina; While Stamina == 100%: +1 to speed_points (5 speed_points = +1% speed, max +15%)
  public handleTap(username: string, targetLane?: number) {
    const cleanUser = username.replace(/^@/, '').trim().toLowerCase();
    const isActivated = !!this.state.activatedSpectators[cleanUser];
    const now = Date.now();

    // Global tap counter for MVP
    const currentTaps = (this.tappersInCurrentRace.get(cleanUser) || 0) + 1;
    this.tappersInCurrentRace.set(cleanUser, currentTaps);

    if (isActivated) {
      this.state.activatedSpectators[cleanUser].taps += 1;
    }

    let targetHorse: RaceHorse | undefined;
    if (targetLane) {
      targetHorse = this.state.horses.find((h) => h.lane === targetLane);
    } else {
      targetHorse = this.state.horses.find((h) => h.username.toLowerCase() === cleanUser);
      if (!targetHorse && isActivated) {
        const bet = this.state.bets.find((b) => b.username.toLowerCase() === cleanUser);
        if (bet) {
          targetHorse = this.state.horses.find((h) => h.lane === bet.lane);
        }
      }
    }

    // In Invite-Only Mode, only register taps/boosts for the invited set of participants
    if (this.state.matchMode === 'INVITE_ONLY' && targetHorse) {
      const isInvited = (this.state.invitedUsers || []).some(
        (u) => u.toLowerCase() === targetHorse!.username.toLowerCase()
      );
      if (!isInvited) {
        return;
      }
    }

    if (targetHorse && !targetHorse.finished) {
      // 1:1 tap-to-point ratio:
      // While Stamina < 100%: each tap adds +1 point to Stamina
      // While Stamina == 100%: each extra tap adds +1 to speed_points
      if (targetHorse.stamina < MAX_STAMINA_CAP) {
        targetHorse.stamina = Math.min(MAX_STAMINA_CAP, targetHorse.stamina + 1);
      } else {
        targetHorse.speed_points = (targetHorse.speed_points || 0) + 1;
      }

      // Convert speed_points to top speed: every 5 speed_points grants a +1% top speed boost (max +15% cap)
      const pointsBoost = Math.min(0.15, ((targetHorse.speed_points || 0) / 5) * 0.01);
      const timedBoost = (targetHorse.speedBoostTimer && targetHorse.speedBoostTimer > 0) ? (targetHorse.speedBoostPercent || 0) : 0;
      targetHorse.speedBoostPercent = Math.min(0.15, Math.max(pointsBoost, timedBoost));
      targetHorse.lastTapTime = now;
      targetHorse.tapsReceived += 1;
    }

    recordTapsAndGifts(cleanUser, 1, 0);
  }

  // Handle TikTok Live Gifts
  // 1 Coin = 1 Point. 1 Small Gift (Rose) = +10 points.
  // Points fill Stamina first, then spill over to speed_points if Stamina is 100%. Max 15% speed boost.
  public handleGift(
    username: string,
    giftName: string,
    count: number = 1,
    targetLane?: number,
    options?: { coinValue?: number; diamondCount?: number; repeatCount?: number }
  ) {
    const cleanUser = username.replace(/^@/, '').trim();
    const now = Date.now();
    const giftCount = Math.max(1, count || options?.repeatCount || 1);

    const totalCoins = getGiftCoinValue(giftName, options?.coinValue, options?.diamondCount, giftCount);
    const boost = calculateGiftBoost(giftName, giftCount);

    const currentGifts = this.giftersInCurrentRace.get(cleanUser) || { count: 0, value: 0 };
    currentGifts.count += giftCount;
    currentGifts.value += totalCoins;
    this.giftersInCurrentRace.set(cleanUser, currentGifts);

    let boostedHorse: RaceHorse | undefined;
    if (targetLane) {
      boostedHorse = this.state.horses.find((h) => h.lane === targetLane);
    } else {
      boostedHorse = this.state.horses.find((h) => h.username.toLowerCase() === cleanUser.toLowerCase());
      if (!boostedHorse) {
        const bet = this.state.bets.find((b) => b.username.toLowerCase() === cleanUser.toLowerCase());
        if (bet) {
          boostedHorse = this.state.horses.find((h) => h.lane === bet.lane);
        }
      }
    }

    // In Invite-Only Mode, only apply gifts/boosts to invited participants
    if (this.state.matchMode === 'INVITE_ONLY' && boostedHorse) {
      const isInvited = (this.state.invitedUsers || []).some(
        (u) => u.toLowerCase() === boostedHorse!.username.toLowerCase()
      );
      if (!isInvited) {
        return;
      }
    }

    // Point Calculation:
    // 1 Coin = 1 Point.
    // 1 Small TikTok Gift (e.g. Rose, Finger Heart) adds +10 points directly.
    const isSmallGift = totalCoins === 1 || (totalCoins <= 5 && (giftName.toLowerCase().includes('rose') || giftName.toLowerCase().includes('heart') || giftName.toLowerCase().includes('وردة')));
    const points = isSmallGift ? 10 * giftCount : totalCoins;

    if (boostedHorse && !boostedHorse.finished) {
      // Points fill Stamina first, then spill over to speed_points if Stamina is 100%
      if (boostedHorse.stamina < MAX_STAMINA_CAP) {
        const needed = MAX_STAMINA_CAP - boostedHorse.stamina;
        const addStamina = Math.min(points, needed);
        boostedHorse.stamina = Math.min(MAX_STAMINA_CAP, boostedHorse.stamina + addStamina);
        const spillover = points - addStamina;
        if (spillover > 0) {
          boostedHorse.speed_points = (boostedHorse.speed_points || 0) + spillover;
        }
      } else {
        boostedHorse.speed_points = (boostedHorse.speed_points || 0) + points;
      }

      // Convert speed_points to top speed boost: every 5 speed_points grants a +1% top speed boost (max +15% cap)
      const pointsBoost = Math.min(0.15, ((boostedHorse.speed_points || 0) / 5) * 0.01);
      boostedHorse.speedBoostPercent = Math.min(0.15, Math.max(pointsBoost, boostedHorse.speedBoostPercent || 0));
      boostedHorse.lastTapTime = now;
      boostedHorse.giftsReceived += giftCount;

      // Big Gifts (5000+ coins like Universe, Drama Queen, Lion) trigger MAX Nitro Cap for 4.0s
      if (boost.isFullRefill || totalCoins >= 5000) {
        boostedHorse.stamina = MAX_STAMINA_CAP;
        boostedHorse.isNitro = true;
        boostedHorse.nitroTimer = 4.0;
      }
    }

    recordTapsAndGifts(cleanUser, 0, giftCount);

    let effectDesc = '';
    if (boost.isFullRefill || totalCoins >= 5000) {
      effectDesc = '100% Stamina + MAX Nitro (4.0s) + Speed Boost';
    } else if (boostedHorse && (boostedHorse.speed_points || 0) > 0) {
      effectDesc = `+${points} Points (${Math.round((boostedHorse.speedBoostPercent || 0) * 100)}% Speed Boost)`;
    } else {
      effectDesc = `+${points} Stamina Points`;
    }

    this.broadcastChatMessage({
      id: 'gift_' + now,
      username: cleanUser,
      message: `🎁 Sent ${giftCount}x ${boost.label}! [${effectDesc}] on Lane ${boostedHorse?.lane || 1}!`,
      type: 'gift',
      giftName: boost.label,
      giftCount,
      timestamp: now,
    });
  }

  public broadcastState() {
    this.io.emit('game:state', this.state);
  }

  public broadcastChatMessage(msg: ChatMessage) {
    this.io.emit('chat:message', msg);
  }
}
