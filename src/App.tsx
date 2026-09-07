import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, ChatMessage } from './types';
import { TrackView } from './components/TrackView';
import { WinnerCeremonyModal } from './components/WinnerCeremonyModal';
import { UnlockCeremonyModal } from './components/UnlockCeremonyModal';
import { StreamerControlDock } from './components/StreamerControlDock';
import { HORSE_SKINS } from './skinsData';
import { audioManager } from './utils/audioManager';
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
    hostBroadcasterId: 'TikTokBroadcaster',
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
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

  const handleTap = (lane?: number) => {
    if (!socket) return;
    socket.emit('horse:tap', { username: 'Spectator', lane });
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

  return (
    <div className={`w-screen h-[100dvh] overflow-hidden bg-[#030804] font-sans text-[#f3f4f6] relative touch-manipulation select-none ${laneTier}`}>
      <div
        id="game-container"
        className={`race-bounding-box game-container w-screen h-full flex-1 flex flex-col relative overflow-hidden bg-[#030804] ${laneTier}`}
      >
        <TrackView
          gameState={gameState}
          onTapLane={(lane) => handleTap(lane)}
        />

        {gameState.phase === 'WINNER_CEREMONY' && gameState.winnerInfo && (
          <WinnerCeremonyModal winnerInfo={gameState.winnerInfo} />
        )}

        {gameState.phase === 'UNLOCK_CEREMONY' && gameState.unlockInfo && (
          <UnlockCeremonyModal unlockInfo={gameState.unlockInfo} />
        )}
      </div>

      <StreamerControlDock
        gameState={gameState}
        chatMessages={chatMessages}
        isOverlayMode={isOverlayMode}
        onToggleOverlayMode={handleToggleOverlayMode}
        onSendMessage={handleSendMessage}
        onSendGift={handleSendGift}
        onTap={handleTap}
        onResetRace={handleResetRace}
        onSetHostId={handleSetHostId}
        onSetDuration={handleSetDuration}
        onSetLanes={handleSetLanes}
        onTogglePauseLobby={handleTogglePauseLobby}
        onSetMatchMode={handleSetMatchMode}
      />
    </div>
  );
}
