import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, ChatMessage, TrackLayoutMode } from './types.ts';
import { TrackView } from './components/TrackView.tsx';
import { WinnerCeremonyModal } from './components/WinnerCeremonyModal.tsx';
import { UnlockCeremonyModal } from './components/UnlockCeremonyModal.tsx';
import { StreamerControlDock } from './components/StreamerControlDock.tsx';
import { HORSE_SKINS } from './skinsData.ts';
import { audioManager } from './utils/audioManager.ts';
import './App.css';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    phase: 'LOBBY',
    lobbyTimeLeft: 30,
    countdownTimeLeft: 3,
    raceDuration: 0,
    raceTimeLeft: 60,
    totalRaceTime: 60,
    configuredDuration: 60,
    targetMeters: 500,
    remainingMeters: 500,
    mode: 'TIME_TRIAL',
    targetLanes: 6,
    horses: [
      {
        lane: 1,
        username: 'TurboJockey',
        countryName: 'Netherlands',
        countryCode: 'NL',
        flagEmoji: '🇳🇱',
        horseLevel: 4,
        skin: HORSE_SKINS[3],
        distance: 0,
        speed: 15,
        stamina: 100,
        maxStamina: 200,
        isNitro: false,
        nitroTimer: 0,
        finished: false,
        tapsReceived: 0,
        giftsReceived: 0,
        is_vip: true,
        isVip: true,
      },
      {
        lane: 2,
        username: 'DesertRider',
        countryName: 'France',
        countryCode: 'FR',
        flagEmoji: '🇫🇷',
        horseLevel: 2,
        skin: HORSE_SKINS[1],
        distance: 0,
        speed: 15,
        stamina: 120,
        maxStamina: 200,
        isNitro: false,
        nitroTimer: 0,
        finished: false,
        tapsReceived: 0,
        giftsReceived: 0,
        is_vip: false,
        isVip: false,
      },
      {
        lane: 3,
        username: 'NeonKnight',
        countryName: 'Saudi Arabia',
        countryCode: 'SA',
        flagEmoji: '🇸🇦',
        horseLevel: 3,
        skin: HORSE_SKINS[2],
        distance: 0,
        speed: 15,
        stamina: 140,
        maxStamina: 200,
        isNitro: false,
        nitroTimer: 0,
        finished: false,
        tapsReceived: 0,
        giftsReceived: 0,
        is_vip: true,
        isVip: true,
      },
      {
        lane: 4,
        username: 'SaharaStorm',
        countryName: 'United States',
        countryCode: 'US',
        flagEmoji: '🇺🇸',
        horseLevel: 1,
        skin: HORSE_SKINS[0],
        distance: 0,
        speed: 15,
        stamina: 100,
        maxStamina: 200,
        isNitro: false,
        nitroTimer: 0,
        finished: false,
        tapsReceived: 0,
        giftsReceived: 0,
      },
      {
        lane: 5,
        username: 'TokyoDrift',
        countryName: 'Japan',
        countryCode: 'JP',
        flagEmoji: '🇯🇵',
        horseLevel: 2,
        skin: HORSE_SKINS[1],
        distance: 0,
        speed: 15,
        stamina: 120,
        maxStamina: 200,
        isNitro: false,
        nitroTimer: 0,
        finished: false,
        tapsReceived: 0,
        giftsReceived: 0,
      },
      {
        lane: 6,
        username: 'SpeedyGonzales',
        countryName: 'United Kingdom',
        countryCode: 'GB',
        flagEmoji: '🇬🇧',
        horseLevel: 3,
        skin: HORSE_SKINS[2],
        distance: 0,
        speed: 15,
        stamina: 140,
        maxStamina: 200,
        isNitro: false,
        nitroTimer: 0,
        finished: false,
        tapsReceived: 0,
        giftsReceived: 0,
      },
    ],
    bets: [],
    activatedSpectators: {},
    currentRaceId: 'RACE_1',
    hostBroadcasterId: 'patronizzle',
  });

  const [currentUsername, setCurrentUsername] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const paramUser = searchParams.get('user');
      if (paramUser) return paramUser.replace(/^@/, '').trim();
      try {
        const savedHost = localStorage.getItem('broadcaster_tiktok_id');
        if (savedHost) return savedHost;
      } catch {}
    }
    return 'patronizzle';
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Connect to WebSocket server on origin
    const newSocket = io({
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to TikTok LIVE Jockey Bot Socket server');
    });

    newSocket.on('game:state', (updatedState: GameState) => {
      setGameState(updatedState);
    });

    newSocket.on('chat:message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-40), msg]);
    });

    newSocket.on('update_grid_size', (data: { lanes: number; activeLanes: number }) => {
      console.log('Dynamic grid resized to lanes:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Synchronize horse galloping audio with RACING phase
  // Plays for the exact duration of the race (1m, 2m, 3m, etc.) and stops automatically
  useEffect(() => {
    if (gameState.phase === 'RACING') {
      audioManager.playRaceSound();
    } else {
      audioManager.stopRaceSound();
    }
  }, [gameState.phase]);

  const handleSendMessage = (message: string, username: string = 'Viewer', isBroadcaster: boolean = false) => {
    if (!socket) return;
    socket.emit('chat:send', { username, message, isBroadcaster });
  };

  const handleSendGift = (giftName: string, count: number = 1, lane?: number, username: string = 'Gifter') => {
    if (!socket) return;
    socket.emit('horse:gift', { username, giftName, count, lane });
  };

  const handleTap = (lane?: number, customUsername?: string) => {
    if (!socket) return;
    const user = customUsername || currentUsername || 'patronizzle';
    socket.emit('horse:tap', { username: user, lane });
  };

  const handleResetRace = () => {
    if (!socket) return;
    socket.emit('host:reset_race');
  };

  const handleSetHostId = (hostId: string) => {
    if (!socket) return;
    socket.emit('host:set_id', { hostId });
  };

  const handleSetDuration = (duration: number | 'unlimited') => {
    if (!socket) return;
    socket.emit('host:set_duration', { duration });
  };

  const handleSetMeters = (meters: number) => {
    if (!socket) return;
    socket.emit('host:set_meters', { meters });
  };

  const handleSetLanes = (lanes: number) => {
    if (!socket) return;
    socket.emit('host:set_lanes', { lanes });
  };

  const handleTogglePauseLobby = () => {
    if (!socket) return;
    socket.emit('host:toggle_pause_lobby');
  };

  const handleSetMatchMode = (mode: 'PUBLIC' | 'INVITE_ONLY', invitedUsers?: string[]) => {
    if (!socket) return;
    socket.emit('host:set_match_mode', { mode, invitedUsers });
  };

  // Layout mode: SQUARE (1:1 Box for guest box / OBS square) vs VERTICAL (9:16 mobile) vs FIT (100% canvas)
  const [layoutMode, setLayoutMode] = useState<TrackLayoutMode>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const paramLayout = searchParams.get('layout')?.toUpperCase();
      if (paramLayout === 'SQUARE' || paramLayout === '1:1' || searchParams.has('square') || searchParams.has('box')) {
        return 'SQUARE';
      }
      if (paramLayout === 'VERTICAL' || paramLayout === '9:16' || searchParams.has('vertical')) {
        return 'VERTICAL';
      }
      if (paramLayout === 'FIT' || paramLayout === 'FILL' || searchParams.has('fit')) {
        return 'FIT';
      }
      try {
        const saved = localStorage.getItem('jockey_layout_mode');
        if (saved === 'VERTICAL' || saved === 'FIT' || saved === 'SQUARE') {
          return saved as TrackLayoutMode;
        }
      } catch {
        // ignore
      }
    }
    return 'SQUARE'; // Default to SQUARE layout requested by user
  });

  const [horseScaleMultiplier, setHorseScaleMultiplier] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const pScale = searchParams.get('scale');
      if (pScale) {
        const parsed = parseFloat(pScale);
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) return parsed;
      }
      try {
        const saved = localStorage.getItem('jockey_horse_scale');
        if (saved) {
          const val = parseFloat(saved);
          if (!isNaN(val) && val >= 0.5 && val <= 2.0) return val;
        }
      } catch {
        // ignore
      }
    }
    return 1.0;
  });

  const handleSetLayoutMode = (mode: TrackLayoutMode) => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('jockey_layout_mode', mode);
    } catch {
      // ignore
    }
  };

  const handleToggleLayoutMode = () => {
    setLayoutMode((prev) => {
      const next: TrackLayoutMode = prev === 'SQUARE' ? 'VERTICAL' : prev === 'VERTICAL' ? 'FIT' : 'SQUARE';
      try {
        localStorage.setItem('jockey_layout_mode', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSetHorseScaleMultiplier = (multiplier: number) => {
    setHorseScaleMultiplier(multiplier);
    try {
      localStorage.setItem('jockey_horse_scale', String(multiplier));
    } catch {
      // ignore
    }
  };

  // Support ?overlay=true URL parameter or persisted overlay mode preference
  const [isOverlayMode, setIsOverlayMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (
        searchParams.get('overlay') === 'true' ||
        searchParams.get('overlay') === '1' ||
        searchParams.has('overlay')
      ) {
        return true;
      }
      try {
        const saved = localStorage.getItem('jockey_overlay_mode');
        if (saved === 'true') return true;
      } catch {
        // ignore
      }
    }
    return false;
  });

  const handleToggleOverlayMode = () => {
    setIsOverlayMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('jockey_overlay_mode', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const activeLanesCount = gameState.horses.length;
  const laneTier =
    activeLanesCount <= 3
      ? 'tier-large'
      : activeLanesCount <= 6
      ? 'tier-medium'
      : 'tier-compact';

  // In SQUARE mode, center the 1:1 square box nicely on screen (or fill 1:1 OBS browser source)
  const containerSizingClass =
    layoutMode === 'SQUARE'
      ? 'w-full max-w-[100dvh] aspect-square max-h-[100dvh] mx-auto shadow-2xl border border-white/10'
      : layoutMode === 'VERTICAL'
      ? 'w-full max-w-[56.25dvh] h-[100dvh] mx-auto shadow-2xl border border-white/10'
      : 'w-full h-full';

  return (
    <div className={`w-screen h-[100dvh] overflow-hidden bg-[#020503] font-sans text-[#f3f4f6] relative touch-manipulation select-none flex items-center justify-center ${laneTier}`}>
      {/* Target Game Layout Bounding Box (Square 1:1 / Vertical 9:16 / Full Fit) */}
      <div
        id="game-container"
        className={`race-bounding-box game-container ${containerSizingClass} flex flex-col relative overflow-hidden bg-[#030804] ${laneTier}`}
      >
        {/* 100% Dynamic Vertical Flex Tracks with live ResizeObserver */}
        <TrackView
          gameState={gameState}
          layoutMode={layoutMode}
          horseScaleMultiplier={horseScaleMultiplier}
          onTapLane={(lane) => handleTap(lane)}
          onTapScreen={(lane) => handleTap(lane)}
          onToggleLayoutMode={handleToggleLayoutMode}
        />

        {/* Winner Ceremony Modal */}
        {gameState.phase === 'WINNER_CEREMONY' && gameState.winnerInfo && (
          <WinnerCeremonyModal winnerInfo={gameState.winnerInfo} />
        )}

        {/* Unlock Ceremony Modal (Triggers 5s after race finish if new tier unlocked) */}
        {gameState.phase === 'UNLOCK_CEREMONY' && gameState.unlockInfo && (
          <UnlockCeremonyModal unlockInfo={gameState.unlockInfo} />
        )}
      </div>

      {/* Streamer / Broadcaster Control Dock */}
      <StreamerControlDock
        gameState={gameState}
        chatMessages={chatMessages}
        isOverlayMode={isOverlayMode}
        layoutMode={layoutMode}
        horseScaleMultiplier={horseScaleMultiplier}
        currentUsername={currentUsername}
        onSetCurrentUsername={setCurrentUsername}
        onSetLayoutMode={handleSetLayoutMode}
        onSetHorseScaleMultiplier={handleSetHorseScaleMultiplier}
        onToggleOverlayMode={handleToggleOverlayMode}
        onSendMessage={handleSendMessage}
        onSendGift={handleSendGift}
        onTap={handleTap}
        onResetRace={handleResetRace}
        onSetHostId={handleSetHostId}
        onSetDuration={handleSetDuration}
        onSetMeters={handleSetMeters}
        onSetLanes={handleSetLanes}
        onTogglePauseLobby={handleTogglePauseLobby}
        onSetMatchMode={handleSetMatchMode}
      />
    </div>
  );
}
