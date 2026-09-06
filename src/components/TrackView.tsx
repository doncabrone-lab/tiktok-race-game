import React from 'react';
import { GameState } from '../types.ts';
import { TrackLane } from './TrackLane.tsx';
import { Timer, Trophy, Sparkles, Zap, Users, Crown } from 'lucide-react';

interface Props {
  gameState: GameState;
  onTapLane: (lane: number) => void;
}

export const TrackView: React.FC<Props> = ({ gameState, onTapLane }) => {
  const isRacing = gameState.phase === 'RACING';
  const isLobby = gameState.phase === 'LOBBY';
  const isCountdown = gameState.phase === 'COUNTDOWN';

  // Calculate dynamic camera offset following the leading horse along the 2500px track
  const START_POS = 150;
  const FINISH_POS = 2440;
  const maxDistance = Math.max(0, ...gameState.horses.map((h) => h.distance || 0));
  const leadX = START_POS + (FINISH_POS - START_POS) * (Math.min(100, maxDistance) / 100);
  
  let targetOffset = 0;
  if (isRacing) {
    // Keep camera tracking the lead horse so lead horse is ALWAYS visible (~220px from left)
    const normalOffset = Math.max(0, leadX - 220);
    // Max camera offset is 2100 (frames finish line at 2420px on mobile screen width ~360-400px)
    // CRITICAL: targetOffset must never exceed leadX - 60px so lead horse is NEVER pushed off-screen to the left!
    const maxLeadOffset = Math.max(0, leadX - 60);
    targetOffset = Math.min(2100, Math.min(normalOffset, maxLeadOffset));
  } else if (gameState.phase === 'WINNER_CEREMONY' || gameState.phase === 'UNLOCK_CEREMONY') {
    targetOffset = 2100; // Pin camera at finish line with clean space
  } else {
    targetOffset = 0; // Starting gates visible, finish line hidden
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#030804] overflow-hidden relative select-none">
      {/* Top Stream Header Bar (Phase / Timer HUD) - Exactly 1.3cm */}
      <header
        className="header-bar bg-[#040e06]/98 flex items-center justify-between px-3 z-30 shadow-xl shrink-0 backdrop-blur-md relative"
        style={{ height: '1.3cm', minHeight: '1.3cm', maxHeight: '1.3cm' }}
      >
        {/* Left spacer for optical balance */}
        <div className="w-10" />

        {/* Center: Phase / Countdown HUD (Rock-solid absolute center, stays in identical position as RACING badge) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
          {isLobby && (
            <div
              className={`h-6 flex items-center gap-1.5 ${
                gameState.isLobbyPaused
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-200 animate-pulse'
                  : 'bg-amber-950/70 border border-amber-500/50 text-amber-300'
              } px-2.5 rounded-md shadow backdrop-blur-md`}
            >
              <Timer className="w-3.5 h-3.5 text-[#f27d26]" />
              <span className="font-extrabold text-xs font-display tracking-wide leading-none">
                {gameState.isLobbyPaused ? 'LOBBY PAUSED' : `LOBBY: ${Math.max(0, Math.ceil(gameState.lobbyTimeLeft))}s`}
              </span>
              {gameState.matchMode === 'INVITE_ONLY' && (
                <span className="bg-purple-600/80 text-purple-100 text-[8px] font-black px-1 py-0.5 rounded leading-none ml-1">
                  INVITE
                </span>
              )}
            </div>
          )}

          {isCountdown && (
            <div className="h-6 flex items-center gap-1.5 bg-red-950/80 border border-red-500/60 text-red-200 px-2.5 rounded-md shadow">
              <Timer className="w-3.5 h-3.5 text-red-400" />
              <span className="font-black text-xs font-display tracking-wider leading-none">
                STARTING IN {Math.ceil(gameState.countdownTimeLeft)}...
              </span>
            </div>
          )}

          {isRacing && (
            <div className="flex items-center">
              {gameState.mode === 'TIME_TRIAL' ? (
                <div
                  id="racing-timer-badge"
                  className="h-6 flex items-center gap-1.5 bg-indigo-950/85 border border-indigo-500/70 text-indigo-100 px-2.5 rounded-md font-mono text-xs font-black shadow-lg shadow-indigo-950/60 backdrop-blur-md"
                >
                  <Timer className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="leading-none tracking-tight">
                    RACE: {Math.round((gameState.totalRaceTime || 60) / 60)}m ({gameState.totalRaceTime || 60}s) • {Math.max(0, Math.ceil(gameState.raceTimeLeft))}s LEFT
                  </span>
                </div>
              ) : (
                <div
                  id="racing-timer-badge"
                  className="h-6 flex items-center gap-1.5 bg-emerald-950/85 border border-emerald-500/70 text-emerald-200 px-2.5 rounded-md font-display text-xs font-black shadow-lg shadow-emerald-950/60 backdrop-blur-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="leading-none tracking-tight">
                    RACING • {Math.floor(gameState.raceDuration)}s
                  </span>
                </div>
              )}
            </div>
          )}

          {gameState.phase === 'WINNER_CEREMONY' && (
            <div className="h-6 flex items-center gap-1.5 bg-amber-950/70 border border-amber-400/60 text-amber-300 px-2.5 rounded-md font-display text-xs font-black shadow">
              <Trophy className="w-3.5 h-3.5 text-[#f27d26]" />
              <span className="leading-none">VICTORY CEREMONY</span>
            </div>
          )}
        </div>

        {/* Right: Spacer placeholder */}
        <div className="w-12" />
      </header>

      {/* Main Track Viewport with Camera Tracking across 2500px Extended Track (flush with header, no double line) */}
      <main className="flex-1 w-full flex flex-col overflow-hidden relative bg-[#040d06]">
        {/* Pinned Lane Info & TikTok Username HUD Badges on Visible Screen (left-2, never scrolls off) */}
        <div className="absolute left-1.5 sm:left-2 top-0 bottom-0 z-20 flex flex-col pointer-events-none">
          {gameState.horses.map((horse) => {
            const staminaPct = Math.max(0, Math.min(100, ((horse.stamina || 0) / (horse.maxStamina || 100)) * 100));
            const supporterBets = (gameState.bets || []).filter((b) => b.lane === horse.lane);
            const supporterCount = supporterBets.length;
            const isVip = !!(horse.is_vip || horse.isVip);
            const totalCount = gameState.horses.length;
            const isCompactHud = totalCount >= 7;
            const isNineHud = totalCount >= 9;

            const avatarSrc =
              horse.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(horse.username)}&backgroundColor=111215`;

            return (
              <div
                key={`hud_${horse.lane}`}
                className={`flex-1 flex flex-col justify-center items-start ${
                  isNineHud ? 'gap-0 py-0' : isCompactHud ? 'gap-0.5 py-0' : 'gap-0.5 sm:gap-1 py-0.5'
                }`}
              >
                {/* 1. Lane Number + TikTok User Avatar + Name + Small VIP Banner */}
                <div className="flex items-center gap-1">
                  <div
                    className={`${
                      isNineHud
                        ? 'w-3.5 h-3.5 text-[8px]'
                        : isCompactHud
                        ? 'w-4 h-4 text-[8.5px]'
                        : 'w-4 h-4 sm:w-5 sm:h-5 text-[9px] sm:text-[10px]'
                    } rounded bg-[#030905]/95 ${
                      isVip
                        ? 'border-2 border-[#FFD700] text-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.6)] ring-1 ring-[#FFD700]/50'
                        : 'border border-[#0e2712] text-[#f27d26]'
                    } flex items-center justify-center font-black font-display shadow-md shrink-0`}
                  >
                    {horse.lane}
                  </div>

                  <div
                    className={`${
                      isVip
                        ? 'border-2 border-[#FFD700] ring-1 ring-amber-300/60 shadow-[0_0_12px_rgba(255,215,0,0.55)] bg-gradient-to-r from-[#211905]/95 via-[#131a0b]/95 to-[#040e06]/95'
                        : 'border border-[#0e2712] bg-[#030905]/95'
                    } ${
                      isNineHud ? 'px-1 py-0 max-w-[125px]' : isCompactHud ? 'px-1 py-0.5 max-w-[135px]' : 'px-1.5 py-0.5 max-w-[155px]'
                    } rounded shadow-md backdrop-blur-md flex items-center gap-1 transition-all`}
                  >
                    {/* Compact Pinned Avatar with Round Gold Border */}
                    <div className="relative shrink-0 flex items-center justify-center">
                      <img
                        src={avatarSrc}
                        alt={horse.username}
                        className={`${
                          isNineHud ? 'w-3.5 h-3.5' : isCompactHud ? 'w-4 h-4' : 'w-4.5 h-4.5'
                        } rounded-full object-cover ${
                          isVip
                            ? 'border-2 border-[#FFD700] ring-1 ring-amber-300 shadow-[0_0_8px_rgba(255,215,0,0.8)]'
                            : 'border border-white/80'
                        }`}
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <span
                      className={`${
                        isNineHud
                          ? 'text-[8.5px]'
                          : isCompactHud
                          ? 'text-[9px]'
                          : 'text-[10px] sm:text-[11px]'
                      } font-bold font-display truncate leading-none ${isVip ? 'text-[#FFD700] font-black' : 'text-slate-100'}`}
                    >
                      @{horse.username}
                    </span>

                    {/* Small Gold VIP Banner next to TikTok handle */}
                    {isVip && (
                      <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[7px] sm:text-[7.5px] px-1 py-[1.5px] rounded-[3px] font-display tracking-wider uppercase shadow-[0_0_8px_rgba(255,215,0,0.7)] shrink-0 border border-yellow-200 leading-none">
                        VIP
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Live Stamina Bar */}
                <div
                  className={`flex items-center gap-1 bg-[#091f0d]/95 border border-[#1b4e24] rounded ${
                    isNineHud ? 'px-1 py-0' : 'px-1.5 py-0.5'
                  } shadow backdrop-blur-md`}
                  title={`Stamina: ${Math.round(staminaPct)}%`}
                >
                  <Zap
                    className={`${isNineHud ? 'w-2 h-2' : 'w-2.5 h-2.5'} shrink-0 ${
                      horse.isNitro
                        ? 'text-amber-400 fill-amber-400 animate-pulse'
                        : staminaPct > 55
                        ? 'text-emerald-400'
                        : staminaPct > 25
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  />
                  <div
                    className={`${
                      isNineHud ? 'w-10 h-1' : isCompactHud ? 'w-11 h-1.5' : 'w-12 sm:w-16 h-1.5 sm:h-2'
                    } bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 relative`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        horse.isNitro
                          ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 animate-pulse'
                          : staminaPct > 55
                          ? 'bg-emerald-500'
                          : staminaPct > 25
                          ? 'bg-amber-400'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${staminaPct}%` }}
                    />
                  </div>
                  <span
                    className={`${
                      isNineHud ? 'text-[7px]' : 'text-[8px] sm:text-[9px]'
                    } font-mono font-bold text-slate-300 min-w-[16px]`}
                  >
                    {Math.round(staminaPct)}%
                  </span>
                </div>

                {/* 3. Under Stamina Bar: Supporter Bet Count on the Left Side */}
                <div
                  className={`flex items-center gap-1 bg-[#091f0d]/95 border border-[#1b4e24] rounded ${
                    isNineHud ? 'px-1 py-0 text-[8px]' : 'px-1.5 py-0.5 text-[9px] sm:text-[10px]'
                  } shadow backdrop-blur-md font-bold font-mono text-amber-300`}
                  title={`${supporterCount} spectator${supporterCount === 1 ? '' : 's'} bet on Lane ${horse.lane}`}
                >
                  <Users className={`${isNineHud ? 'w-2 h-2' : 'w-2.5 h-2.5'} text-[#f27d26] shrink-0`} />
                  <span className="leading-none">{supporterCount}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Horizontal Scrolling 2500px Track Container with Camera Tracking */}
        <div
          className="w-[2500px] h-full flex flex-col transition-transform duration-300 ease-out relative"
          style={{ transform: `translateX(-${targetOffset}px)` }}
        >
          {/* Continuous Track-Wide Finish Line Glow & Overhead Marker at 2420px */}
          <div className="absolute left-[2420px] top-0 bottom-0 w-10 pointer-events-none z-20 overflow-visible">
            {/* Glowing neon orange finish line guide beam */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f27d26] shadow-[0_0_16px_rgba(242,125,38,0.95)]" />
            {/* Overhead Finish Line Badge */}
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-[#f27d26] text-black font-black text-[9px] px-2 py-0.5 rounded-b shadow-[0_0_12px_rgba(242,125,38,0.8)] uppercase tracking-wider font-display whitespace-nowrap z-30 flex items-center gap-1">
              <span>🏁</span>
              <span>FINISH</span>
            </div>
          </div>

          {gameState.horses.map((horse, idx) => (
            <TrackLane
              key={horse.lane}
              horse={horse}
              isRacing={isRacing}
              isLobby={isLobby}
              laneIndex={idx}
              totalLanes={gameState.horses.length}
              onTap={() => onTapLane(horse.lane)}
            />
          ))}
        </div>
      </main>

      {/* Bottom Header Bar: Exactly 3cm in height, clean for TikTok chat */}
      <footer
        className="bottom-header bg-[#040e06]/98 border-t border-[#0a200e] flex flex-col justify-start px-3 py-1.5 text-slate-400 shrink-0 z-20 font-sans backdrop-blur-md relative shadow-2xl"
        style={{ height: '3cm', minHeight: '3cm', maxHeight: '3cm' }}
      >
        <div className="flex items-center justify-end gap-2 text-[10px] font-sans select-none pr-1 font-semibold text-emerald-400">
          <span>!race</span>
          <span className="text-emerald-500/50">•</span>
          <span>!bet 1-{gameState.horses.length}</span>
          <span className="text-emerald-500/50">•</span>
          <span>Gift is Nitro</span>
        </div>

        {/* Clean empty space reserved for TikTok chat */}
        <div className="flex-1 w-full" />
      </footer>
    </div>
  );
};
