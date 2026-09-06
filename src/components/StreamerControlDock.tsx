import React, { useState, useRef, useEffect } from 'react';
import { GameState, ChatMessage } from '../types.ts';
import { HORSE_SKINS } from '../skinsData.ts';
import { audioManager } from '../utils/audioManager.ts';
import {
  Send,
  Gift,
  Zap,
  Trophy,
  Sliders,
  Radio,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
  Volume1,
  VolumeX,
  Users,
  Eye,
  EyeOff,
  Flame,
  GripVertical,
} from 'lucide-react';

interface Props {
  gameState: GameState;
  chatMessages: ChatMessage[];
  onSendMessage: (msg: string, username?: string, isBroadcaster?: boolean) => void;
  onSendGift: (giftName: string, count: number, lane?: number, username?: string) => void;
  onTap: (lane?: number) => void;
  onResetRace: () => void;
  onSetHostId: (hostId: string) => void;
  onSetDuration?: (duration: number | 'unlimited') => void;
  onSetLanes?: (lanes: number) => void;
  onTogglePauseLobby?: () => void;
  onSetMatchMode?: (mode: 'PUBLIC' | 'INVITE_ONLY', invitedUsers?: string[]) => void;
}

export const StreamerControlDock: React.FC<Props> = ({
  gameState,
  chatMessages,
  onSendMessage,
  onSendGift,
  onTap,
  onResetRace,
  onSetHostId,
  onSetDuration,
  onSetLanes,
  onTogglePauseLobby,
  onSetMatchMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'chat' | 'host' | 'gifts' | 'skins'>('quick');
  const [inputMsg, setInputMsg] = useState('');
  const [testUsername, setTestUsername] = useState('TikTokGamer');
  const [selectedLane, setSelectedLane] = useState<number>(1);
  const [hostInput, setHostInput] = useState(gameState.hostBroadcasterId);
  const [tournamentUsers, setTournamentUsers] = useState('Speedy,DesertFox,TurboNova,ShadowRacer');
  const [timeModeInput, setTimeModeInput] = useState('1m');

  // Audio Volume State synced with global audioManager
  const [volume, setVolume] = useState<number>(() => audioManager.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(() => audioManager.isMuted());

  useEffect(() => {
    const unsub = audioManager.subscribe((vol, muted) => {
      setVolume(vol);
      setIsMuted(muted);
    });
    return unsub;
  }, []);

  const handleVolumeChange = (newVol: number) => {
    audioManager.setVolume(newVol);
  };

  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    audioManager.toggleMute();
  };

  // Floating Host Button coordinates (draggable anywhere across the screen, persisted in localStorage)
  const [btnPos, setBtnPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('streamer_host_btn_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    // Default initial placement: top right
    return {
      x: typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 90) : 320,
      y: 8,
    };
  });

  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    hasMoved: boolean;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    hasMoved: false,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initX: btnPos.x,
      initY: btnPos.y,
      hasMoved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 4) {
      dragRef.current.hasMoved = true;
    }
    const newX = Math.max(4, Math.min(window.innerWidth - 86, dragRef.current.initX + dx));
    const newY = Math.max(4, Math.min(window.innerHeight - 38, dragRef.current.initY + dy));
    setBtnPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (dragRef.current.hasMoved) {
      // Save position to localStorage
      try {
        localStorage.setItem('streamer_host_btn_pos', JSON.stringify(btnPos));
      } catch {
        // ignore
      }
    } else {
      // Normal click without dragging: toggle host controls
      setIsOpen((prev) => !prev);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    onSendMessage(inputMsg, testUsername, testUsername === gameState.hostBroadcasterId);
    setInputMsg('');
  };

  const handleQuickCommand = (cmd: string) => {
    onSendMessage(cmd, testUsername, testUsername === gameState.hostBroadcasterId);
  };

  const handleDurationClick = (dur: number | 'unlimited') => {
    if (onSetDuration) {
      onSetDuration(dur);
    } else {
      if (dur === 'unlimited') {
        onSendMessage('!race unlimited', hostInput, true);
      } else {
        onSendMessage(`!race ${dur}s`, hostInput, true);
      }
    }
  };

  const handleLanesClick = (count: number) => {
    if (onSetLanes) {
      onSetLanes(count);
    } else {
      onSendMessage(`!lanes ${count}`, hostInput, true);
    }
  };

  // Determine current active duration (1m, 2m, 3m, or Unlimited)
  const currentDuration = gameState.configuredDuration ?? (gameState.mode === 'STANDARD' ? 'unlimited' : (gameState.totalRaceTime || 60));
  const isUnlimited = currentDuration === 'unlimited' || gameState.mode === 'STANDARD';
  const is1m = !isUnlimited && (currentDuration === 60 || gameState.totalRaceTime === 60);
  const is2m = !isUnlimited && (currentDuration === 120 || gameState.totalRaceTime === 120);
  const is3m = !isUnlimited && (currentDuration === 180 || gameState.totalRaceTime === 180);
  const activeLanesCount = gameState.targetLanes || gameState.horses.length;

  return (
    <>
      {/* Floating Draggable Host Controls Button with direct inline Volume Indicator & Mute toggle */}
      <div
        style={{ left: `${btnPos.x}px`, top: `${btnPos.y}px` }}
        className="fixed z-50 flex items-center shadow-2xl rounded-lg overflow-hidden border border-[#f27d26]/80 backdrop-blur-md bg-[#111317]/95 select-none touch-none shadow-black/80"
      >
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragRef.current.isDragging = false;
          }}
          title="Host Controls (Drag anywhere on screen • Click to open/close dock)"
          className={`h-7 px-2.5 flex items-center gap-1.5 transition-colors cursor-grab active:cursor-grabbing text-[11px] font-display font-extrabold ${
            isOpen
              ? 'bg-[#f27d26] text-slate-950 font-black'
              : 'hover:bg-[#1a1d24] text-[#f27d26]'
          }`}
        >
          <GripVertical className="w-3.5 h-3.5 opacity-50 shrink-0" />
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span>HOST</span>
        </button>

        {/* Inline Volume Control right on the Host Button */}
        <div
          className="h-7 px-2 bg-[#0a0c0f] border-l border-[#2d313b] flex items-center gap-1.5 text-[10px] font-mono text-slate-200"
          title="Galloping Sound Volume (Click speaker to mute/unmute • Use dock to adjust slider)"
        >
          <button
            onClick={handleToggleMute}
            className="p-0.5 hover:text-[#f27d26] transition-colors active:scale-95"
            title={isMuted ? 'Unmute Gallop Sound' : 'Mute Gallop Sound'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>
          <span className="font-bold min-w-[28px] text-right font-mono">
            {isMuted ? 'OFF' : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      </div>

      {/* Modern Compact Host Overlay Panel */}
      {isOpen && (
        <div className="fixed inset-x-2 bottom-8 z-50 max-w-[440px] mx-auto bg-[#111215]/98 border border-[#2d313b] rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 font-sans">
          {/* Header */}
          <div className="bg-[#0c0d10] border-b border-[#23262d] px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-slate-100 font-display">
              <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span>HOST & STREAMER DOCK</span>
              {gameState.phase === 'RACING' && (
                <span className="bg-red-600/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded animate-pulse">
                  RACING {Math.round(gameState.raceDuration)}s
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
                placeholder="User"
                className="bg-[#181a1f] border border-[#2d313b] text-slate-200 text-[10px] px-2 py-0.5 rounded font-mono w-24 focus:outline-none focus:border-[#f27d26]"
                title="Current Simulator Username"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-[#1f2229]"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Primary Host Quick Control Bar (Always visible at top of dock) */}
          <div className="p-3 bg-[#0e1014] border-b border-[#23262d] flex flex-col gap-2.5">
            {/* Dedicated Galloping Sound Volume Control */}
            <div className="flex flex-col gap-1.5 bg-[#08090c] p-2 rounded-lg border border-[#20232a]">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 font-display uppercase tracking-wider">
                <span className="flex items-center gap-1 text-emerald-400">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  GALLOP SOUND EFFECT VOLUME
                </span>
                <span className="text-slate-200 font-mono text-[10px] font-bold">
                  {isMuted ? 'MUTED' : `${Math.round(volume * 100)}%`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMute}
                  className={`px-2 py-1 rounded text-[10px] font-bold font-display border transition-colors ${
                    isMuted
                      ? 'bg-red-950/80 border-red-500 text-red-200'
                      : 'bg-[#181a1f] border-[#2d313b] text-slate-300 hover:bg-[#23262d]'
                  }`}
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : Math.round(volume * 100)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    handleVolumeChange(val / 100);
                  }}
                  className="flex-1 accent-[#f27d26] h-1.5 bg-[#1f2229] rounded-lg cursor-pointer"
                />
                <button
                  onClick={() => audioManager.testSound()}
                  className="px-2 py-1 rounded text-[10px] font-bold bg-[#181a1f] hover:bg-[#23262d] border border-[#2d313b] text-[#f27d26] active:scale-95 transition-all"
                  title="Play 3 second preview of galloping sound"
                >
                  🔊 Test
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1 pt-0.5">
                {[0, 25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleVolumeChange(pct / 100)}
                    className={`py-0.5 rounded text-[9px] font-mono font-bold border transition-colors ${
                      !isMuted && Math.round(volume * 100) === pct
                        ? 'bg-[#f27d26] text-slate-950 border-amber-300'
                        : 'bg-[#14161a] hover:bg-[#1f2229] text-slate-400 border-[#23262d]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Race Duration Quick Buttons: [ 1m ] [ 2m ] [ 3m ] [ Unlimited / Finish Line ] */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 font-display uppercase tracking-wider">
                <span className="flex items-center gap-1 text-[#f27d26]">
                  <Clock className="w-3 h-3" />
                  RACE DURATION
                </span>
                <span className="text-slate-400 font-mono text-[9px]">
                  Configured: {isUnlimited ? 'Unlimited' : `${Math.round((gameState.totalRaceTime || 60) / 60)}m (${gameState.totalRaceTime || 60}s)`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => handleDurationClick(60)}
                  className={`py-1 rounded text-xs font-bold font-mono transition-all border active:scale-95 ${
                    is1m
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)] font-black'
                      : 'bg-[#181a1f] hover:bg-[#23262d] text-slate-300 border-[#2d313b]'
                  }`}
                >
                  1m
                </button>
                <button
                  onClick={() => handleDurationClick(120)}
                  className={`py-1 rounded text-xs font-bold font-mono transition-all border active:scale-95 ${
                    is2m
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)] font-black'
                      : 'bg-[#181a1f] hover:bg-[#23262d] text-slate-300 border-[#2d313b]'
                  }`}
                >
                  2m
                </button>
                <button
                  onClick={() => handleDurationClick(180)}
                  className={`py-1 rounded text-xs font-bold font-mono transition-all border active:scale-95 ${
                    is3m
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)] font-black'
                      : 'bg-[#181a1f] hover:bg-[#23262d] text-slate-300 border-[#2d313b]'
                  }`}
                >
                  3m
                </button>
                <button
                  onClick={() => handleDurationClick('unlimited')}
                  className={`py-1 rounded text-xs font-bold font-mono transition-all border active:scale-95 ${
                    isUnlimited
                      ? 'bg-[#f27d26] text-slate-950 border-amber-300 shadow-[0_0_8px_rgba(242,125,38,0.5)] font-black'
                      : 'bg-[#181a1f] hover:bg-[#23262d] text-slate-300 border-[#2d313b]'
                  }`}
                >
                  Unlimited
                </button>
              </div>
            </div>

            {/* Active Racer Count (2 to 9 racers): [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ] [ 7 ] [ 8 ] [ 9 ] */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 font-display uppercase tracking-wider">
                <span className="flex items-center gap-1 text-cyan-400">
                  <Users className="w-3 h-3" />
                  ACTIVE RACERS (2-9 LANES)
                </span>
                <span className="text-slate-300 font-mono text-[10px] font-bold">
                  Active: {activeLanesCount} Lanes
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1">
                {[2, 3, 4, 5, 6, 7, 8, 9].map((count) => {
                  const isActive = activeLanesCount === count;
                  return (
                    <button
                      key={count}
                      onClick={() => handleLanesClick(count)}
                      className={`py-1 rounded text-xs font-bold font-mono transition-all border active:scale-95 ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.5)] font-black'
                          : 'bg-[#181a1f] hover:bg-[#23262d] text-slate-300 border-[#2d313b]'
                      }`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Match Mode Selector: Public vs Invite-Only */}
            <div className="flex flex-col gap-1 border-t border-[#23262d] pt-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 font-display uppercase tracking-wider">
                <span className="text-purple-400">MATCH MODE</span>
                <span className="text-slate-400 font-mono text-[9px]">
                  {gameState.matchMode === 'INVITE_ONLY' ? '🔒 INVITE-ONLY' : '🌐 PUBLIC'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() =>
                    onSetMatchMode
                      ? onSetMatchMode('PUBLIC')
                      : onSendMessage('!public', hostInput, true)
                  }
                  className={`py-1 rounded text-xs font-bold font-display transition-all border ${
                    gameState.matchMode !== 'INVITE_ONLY'
                      ? 'bg-emerald-700 text-white border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      : 'bg-[#181a1f] hover:bg-[#23262d] text-slate-400 border-[#2d313b]'
                  }`}
                >
                  🌐 Public Match
                </button>
                <button
                  onClick={() => {
                    const users = tournamentUsers
                      .split(/[,\s]+/)
                      .map((u) => u.replace(/^@/, '').trim())
                      .filter(Boolean);
                    if (onSetMatchMode) {
                      onSetMatchMode('INVITE_ONLY', users);
                    } else {
                      onSendMessage(`!custom ${users.join(' ')}`, hostInput, true);
                    }
                  }}
                  className={`py-1 rounded text-xs font-bold font-display transition-all border ${
                    gameState.matchMode === 'INVITE_ONLY'
                      ? 'bg-purple-700 text-white border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                      : 'bg-[#181a1f] hover:bg-[#23262d] text-slate-400 border-[#2d313b]'
                  }`}
                >
                  🔒 Invite-Only
                </button>
              </div>
              {gameState.matchMode === 'INVITE_ONLY' && (
                <div className="flex gap-1.5 mt-1">
                  <input
                    type="text"
                    value={tournamentUsers}
                    onChange={(e) => setTournamentUsers(e.target.value)}
                    placeholder="@user1, @user2, @user3..."
                    className="flex-1 bg-[#07080a] border border-[#23262d] rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={() => {
                      const users = tournamentUsers
                        .split(/[,\s]+/)
                        .map((u) => u.replace(/^@/, '').trim())
                        .filter(Boolean);
                      if (onSetMatchMode) {
                        onSetMatchMode('INVITE_ONLY', users);
                      } else {
                        onSendMessage(`!custom ${users.join(' ')}`, hostInput, true);
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-2.5 py-1 rounded text-xs font-display"
                  >
                    Set
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={onResetRace}
                className="bg-[#181a1f] hover:bg-[#23262d] text-amber-300 border border-[#2d313b] text-xs font-bold py-1 px-2 rounded font-display flex items-center justify-center gap-1"
                title="Reset Race to 30s Lobby"
              >
                🔄 Reset
              </button>

              <button
                onClick={() =>
                  onTogglePauseLobby
                    ? onTogglePauseLobby()
                    : onSendMessage(gameState.isLobbyPaused ? '!resume' : '!pause', hostInput, true)
                }
                className={`flex-1 ${
                  gameState.isLobbyPaused
                    ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                    : 'bg-[#181a1f] hover:bg-[#23262d] text-slate-300 border-[#2d313b]'
                } border text-xs font-bold py-1 px-2 rounded font-display flex items-center justify-center gap-1`}
                title={gameState.isLobbyPaused ? 'Resume countdown' : 'Pause countdown'}
              >
                {gameState.isLobbyPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>

              <select
                value={selectedLane}
                onChange={(e) => setSelectedLane(parseInt(e.target.value, 10))}
                className="bg-[#181a1f] border border-[#2d313b] text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none"
              >
                {gameState.horses.map((h) => (
                  <option key={h.lane} value={h.lane}>
                    Lane {h.lane} (@{h.username})
                  </option>
                ))}
              </select>

              <button
                onClick={() => onTap(selectedLane)}
                className="bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 text-xs font-bold py-1 px-2 rounded font-display"
              >
                👆 Tap
              </button>

              <button
                onClick={() => onSendGift('Rose', 1, selectedLane, testUsername)}
                className="bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-300 text-xs font-bold py-1 px-2 rounded font-display"
              >
                🌹 Rose
              </button>
            </div>
          </div>

          {/* Navigation Tabs for Simulator Features */}
          <div className="flex border-b border-[#23262d] bg-[#0c0d10]/60 text-[10px] font-display font-bold">
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex-1 py-1.5 text-center transition-colors ${
                activeTab === 'quick' ? 'text-[#f27d26] border-b-2 border-[#f27d26] bg-[#181a1f]/80' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Commands
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-1.5 text-center transition-colors ${
                activeTab === 'chat' ? 'text-[#f27d26] border-b-2 border-[#f27d26] bg-[#181a1f]/80' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('gifts')}
              className={`flex-1 py-1.5 text-center transition-colors ${
                activeTab === 'gifts' ? 'text-rose-400 border-b-2 border-rose-400 bg-[#181a1f]/80' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gifts & Nitro
            </button>
            <button
              onClick={() => setActiveTab('skins')}
              className={`flex-1 py-1.5 text-center transition-colors ${
                activeTab === 'skins' ? 'text-purple-400 border-b-2 border-purple-400 bg-[#181a1f]/80' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              12 Skins
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'quick' && (
            <div className="p-3 flex flex-col gap-2 text-xs">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => handleQuickCommand('!race')}
                  className="bg-[#0b1b12] hover:bg-[#10291b] border border-emerald-700/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono"
                >
                  !race (Join)
                </button>
                <button
                  onClick={() => handleQuickCommand(`!bet ${selectedLane}`)}
                  className="bg-[#201408] hover:bg-[#301d0a] border border-[#f27d26]/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono"
                >
                  !bet {selectedLane}
                </button>
                <button
                  onClick={() => handleQuickCommand('!points')}
                  className="bg-[#0a1828] hover:bg-[#0f243b] border border-blue-700/80 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono"
                >
                  !points
                </button>
                <button
                  onClick={() => handleQuickCommand('!vip')}
                  className="bg-[#241706] hover:bg-[#38240a] border border-amber-500/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono shadow-[0_0_8px_rgba(255,215,0,0.3)]"
                >
                  !vip
                </button>
              </div>

              {/* Host Broadcaster ID Setting */}
              <div className="flex flex-col gap-1 border-t border-[#23262d] pt-2">
                <span className="font-bold text-slate-300 text-[10px]">Broadcaster TikTok ID (Host Protection):</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={hostInput}
                    onChange={(e) => setHostInput(e.target.value)}
                    className="flex-1 bg-[#07080a] border border-[#23262d] rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => onSetHostId(hostInput)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1 rounded text-xs font-display"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Chat & Commands Simulator */}
          {activeTab === 'chat' && (
            <div className="p-3 flex flex-col gap-2.5 max-h-80 overflow-y-auto">
              {/* Quick Bilingual Command Chips */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => handleQuickCommand('!race')}
                  className="bg-[#0b1b12] hover:bg-[#10291b] border border-emerald-700/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono"
                >
                  !race (Join)
                </button>
                <button
                  onClick={() => handleQuickCommand('!سباق')}
                  className="bg-[#0b1b12] hover:bg-[#10291b] border border-emerald-700/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded font-arabic"
                >
                  !سباق
                </button>
                <button
                  onClick={() => handleQuickCommand(`!bet ${selectedLane}`)}
                  className="bg-[#201408] hover:bg-[#301d0a] border border-[#f27d26]/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono"
                >
                  !bet {selectedLane}
                </button>
                <button
                  onClick={() => handleQuickCommand(`!${selectedLane}`)}
                  className="bg-[#201408] hover:bg-[#301d0a] border border-[#f27d26]/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono"
                >
                  !{selectedLane}
                </button>
                <button
                  onClick={() => handleQuickCommand('!points')}
                  className="bg-[#0a1828] hover:bg-[#0f243b] border border-blue-700/80 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono"
                >
                  !points
                </button>
                <button
                  onClick={() => handleQuickCommand('!نقاط')}
                  className="bg-[#0a1828] hover:bg-[#0f243b] border border-blue-700/80 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded font-arabic"
                >
                  !نقاط
                </button>
                <button
                  onClick={() => handleQuickCommand('!vip')}
                  className="bg-[#241706] hover:bg-[#38240a] border border-amber-500/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono shadow-[0_0_8px_rgba(255,215,0,0.3)]"
                >
                  !vip
                </button>
                <button
                  onClick={() => handleQuickCommand('!خاص')}
                  className="bg-[#241706] hover:bg-[#38240a] border border-amber-500/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded font-arabic shadow-[0_0_8px_rgba(255,215,0,0.3)]"
                >
                  !خاص
                </button>
              </div>

              {/* Chat Log Window */}
              <div className="bg-[#07080a] border border-[#23262d] rounded-xl p-2.5 h-36 overflow-y-auto flex flex-col gap-1 text-[11px] font-mono">
                {chatMessages.slice(-20).map((msg) => (
                  <div key={msg.id} className="leading-tight">
                    <span className={msg.isHost ? 'text-cyan-400 font-bold' : msg.isVIP ? 'text-[#f27d26] font-bold' : 'text-slate-400'}>
                      @{msg.username}:
                    </span>{' '}
                    <span className={msg.type === 'gift' ? 'text-rose-300 font-bold' : msg.type === 'system' ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                      {msg.message}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendChat} className="flex gap-1.5">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Type TikTok chat or command (!bet 1, !race)..."
                  className="flex-1 bg-[#07080a] border border-[#23262d] rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#f27d26]"
                />
                <button
                  type="submit"
                  className="bg-[#f27d26] hover:bg-[#e06d19] text-slate-950 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 font-display"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Live Gifts & Nitro Boosts */}
          {activeTab === 'gifts' && (
            <div className="p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold">Target Lane for Gifts & Taps:</span>
                <select
                  value={selectedLane}
                  onChange={(e) => setSelectedLane(parseInt(e.target.value, 10))}
                  className="bg-[#07080a] border border-[#23262d] text-amber-300 font-bold rounded px-2 py-1 text-xs"
                >
                  {gameState.horses.map((h) => (
                    <option key={h.lane} value={h.lane}>
                      Lane {h.lane} - @{h.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Micro-Tap Trigger */}
              <button
                onClick={() => onTap(selectedLane)}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-display font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <Zap className="w-4 h-4 fill-emerald-200" />
                <span>Micro-Tap Screen (+0.5 Stamina to Lane {selectedLane})</span>
              </button>

              {/* Live Gifts Preset Buttons matching Balanced Math Tiers */}
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {/* 1 Coin: Rose (+3 STA) */}
                <button
                  onClick={() => onSendGift('Rose', 1, selectedLane, testUsername)}
                  className="bg-[#1f0a12]/90 hover:bg-[#2c0f1a] border border-rose-600/80 text-rose-200 p-2 rounded-xl flex items-center gap-2"
                >
                  <span className="text-xl">🌹</span>
                  <div className="flex flex-col text-left">
                    <span>1x Rose (+3 STA)</span>
                    <span className="text-[10px] text-rose-400 font-normal">1 Coin • Base Tap</span>
                  </div>
                </button>

                {/* 30 Coins: Doughnut (+15 STA, +5% spd for 1.5s) */}
                <button
                  onClick={() => onSendGift('Doughnut', 1, selectedLane, testUsername)}
                  className="bg-[#241706]/90 hover:bg-[#362209] border border-amber-500/80 text-amber-200 p-2 rounded-xl flex items-center gap-2"
                >
                  <span className="text-xl">🍩</span>
                  <div className="flex flex-col text-left">
                    <span>Doughnut (+15 STA)</span>
                    <span className="text-[10px] text-amber-400 font-normal">30 Coins • +5% Spd (1.5s)</span>
                  </div>
                </button>

                {/* 99 Coins: Paper Crane (+35 STA, +10% spd for 2.0s) */}
                <button
                  onClick={() => onSendGift('Paper Crane', 1, selectedLane, testUsername)}
                  className="bg-[#081b28]/90 hover:bg-[#0d2a3d] border border-sky-500/80 text-sky-200 p-2 rounded-xl flex items-center gap-2"
                >
                  <span className="text-xl">🕊️</span>
                  <div className="flex flex-col text-left">
                    <span>Paper Crane (+35 STA)</span>
                    <span className="text-[10px] text-sky-400 font-normal">99 Coins • +10% Spd (2.0s)</span>
                  </div>
                </button>

                {/* 500 Coins: Money Gun (+65 STA, +15% spd for 3.0s) */}
                <button
                  onClick={() => onSendGift('Money Gun', 1, selectedLane, testUsername)}
                  className="bg-[#092215]/90 hover:bg-[#0f3420] border border-emerald-500/80 text-emerald-200 p-2 rounded-xl flex items-center gap-2"
                >
                  <span className="text-xl">🔫</span>
                  <div className="flex flex-col text-left">
                    <span>Money Gun (+65 STA)</span>
                    <span className="text-[10px] text-emerald-400 font-normal">500 Coins • +15% Spd (3.0s)</span>
                  </div>
                </button>

                {/* 5000+ Coins: Universe (100 STA refill + 4.0s Nitro) */}
                <button
                  onClick={() => onSendGift('Universe', 1, selectedLane, testUsername)}
                  className="col-span-2 bg-[#190c24]/90 hover:bg-[#261337] border border-purple-600/80 text-purple-200 p-2 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌌</span>
                    <div className="flex flex-col text-left">
                      <span>TikTok Universe / Drama Queen (100% Refill)</span>
                      <span className="text-[10px] text-purple-400 font-normal">5000+ Coins • 100 STA Cap Refill + 4.0s MAX Nitro</span>
                    </div>
                  </div>
                  <Flame className="w-4 h-4 text-purple-300" />
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Host / Admin Tournament Modes */}
          {activeTab === 'host' && (
            <div className="p-3 flex flex-col gap-3 text-xs">
              {/* Host Broadcaster ID Setting */}
              <div className="flex flex-col gap-1">
                <span className="font-bold text-slate-300">Broadcaster TikTok ID (Host Protection):</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={hostInput}
                    onChange={(e) => setHostInput(e.target.value)}
                    className="flex-1 bg-[#07080a] border border-[#23262d] rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => onSetHostId(hostInput)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1 rounded text-xs font-display"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Custom Tournament: !race user1,user2... */}
              <div className="flex flex-col gap-1 border-t border-[#23262d] pt-2">
                <span className="font-bold text-slate-300">Custom Tournament (!race ID1,ID2...):</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={tournamentUsers}
                    onChange={(e) => setTournamentUsers(e.target.value)}
                    placeholder="User1,User2,User3 (2-9)"
                    className="flex-1 bg-[#07080a] border border-[#23262d] rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-[#f27d26]"
                  />
                  <button
                    onClick={() => onSendMessage(`!race ${tournamentUsers}`, hostInput, true)}
                    className="bg-[#f27d26] hover:bg-[#e06d19] text-slate-950 font-bold px-3 py-1 rounded text-xs font-display"
                  >
                    Start
                  </button>
                </div>
              </div>

              {/* Time Mode: !race 1m, !race 2m, !race 3m */}
              <div className="flex flex-col gap-1 border-t border-[#23262d] pt-2">
                <span className="font-bold text-slate-300">Time Mode Countdown (!race 1m, !race 2m, !race 3m):</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={timeModeInput}
                    onChange={(e) => setTimeModeInput(e.target.value)}
                    placeholder="1m, 2m, 3m"
                    className="flex-1 bg-[#07080a] border border-[#23262d] rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => onSendMessage(`!race ${timeModeInput}`, hostInput, true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded text-xs font-display"
                  >
                    Launch Time Mode
                  </button>
                </div>
              </div>

              {/* Reset Race */}
              <button
                onClick={onResetRace}
                className="w-full bg-[#181a1f] hover:bg-[#23262d] text-slate-200 font-bold py-1.5 rounded-lg border border-[#2d313b] mt-1 font-display"
              >
                Reset to Pre-Race Lobby
              </button>
            </div>
          )}

          {/* Tab 4: 12 Horse Progression Explorer */}
          {activeTab === 'skins' && (
            <div className="p-3 max-h-80 overflow-y-auto flex flex-col gap-2">
              <span className="text-xs font-bold text-purple-300 font-display">
                12-HORSE PROGRESSION & PNG SKINS
              </span>
              <div className="grid grid-cols-1 gap-2 text-xs">
                {HORSE_SKINS.map((skin) => (
                  <div
                    key={skin.level}
                    className="bg-[#07080a] border border-[#23262d] rounded-xl p-2.5 flex items-center gap-3"
                  >
                    <img
                      src={skin.image}
                      alt={skin.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 font-display">
                          T{skin.level}: {skin.name}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400">
                          {skin.maxStamina} STA
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{skin.unlockReq}</span>
                      <span className="text-[9px] text-purple-300/90">{skin.auraDescription}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
