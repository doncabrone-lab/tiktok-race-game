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

  const totalCount = gameState.horses.length;
  const isLarge = totalCount <= 3;
  const isMedium = totalCount >= 4 && totalCount <= 6;
  const isCompact = totalCount >= 7;
  const tierClass = isLarge ? 'tier-large' : isMedium ? 'tier-medium' : 'tier-compact';

  return (
    <div className={`race-bounding-box w-full h-full flex flex-col bg-[#030804] relative select-none ${tierClass}`}>
      {/* Top Safe Zone Header (140px TikTok LIVE mobile safety zone: keeps streamer username & live badge clear) */}
      <header className="w-full h-[140px] shrink-0 pointer-events-none relative z-30 flex flex-col justify-end items-center pb-1">
        {/* Center: Phase / Countdown HUD positioned right above Lane 1 */}
        <div className="flex items-center justify-center pointer-events-none">
          {isLobby && (
            <div
              className={`h-7 flex items-center gap-1.5 ${
                gameState.isLobbyPaused
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-200 animate-pulse'
                  : 'bg-amber-950/80 border border-amber-500/60 text-amber-300'
              } px-3 rounded-md shadow-lg backdrop-blur-md`}
            >
              <Timer className="w-4 h-4 text-[#f27d26]" />
              <span className="font-extrabold text-xs sm:text-sm font-display tracking-wide leading-none">
                {gameState.isLobbyPaused ? 'LOBBY PAUSED' : `LOBBY: ${Math.max(0, Math.ceil(gameState.lobbyTimeLeft))}s`}
              </span>
              {gameState.matchMode === 'INVITE_ONLY' && (
                <span className="bg-purple-600/90 text-purple-100 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded leading-none ml-1">
                  INVITE
                </span>
              )}
            </div>
          )}

          {isCountdown && (
            <div className="h-7 flex items-center gap-1.5 bg-red-950/90 border border-red-500/70 text-red-200 px-3 rounded-md shadow-lg">
              <Timer className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="font-black text-xs sm:text-sm font-display tracking-wider leading-none">
                STARTING IN {Math.ceil(gameState.countdownTimeLeft)}...
              </span>
            </div>
          )}

          {isRacing && (
            <div className="flex items-center">
              {gameState.mode === 'TIME_TRIAL' ? (
                <div
                  id="racing-timer-badge"
                  className="h-7 px-3.5 flex items-center gap-1.5 bg-blue-600/90 border border-blue-400 text-white rounded-md font-mono text-sm font-black shadow-lg shadow-blue-900/60 backdrop-blur-md"
                >
                  <Timer className="w-4 h-4 text-blue-200 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="leading-none tracking-wide font-extrabold">
                    {Math.max(0, Math.ceil(gameState.raceTimeLeft))}s
                  </span>
                </div>
              ) : (
                <div
                  id="racing-timer-badge"
                  className="h-7 px-3.5 flex items-center gap-1.5 bg-emerald-600/90 border border-emerald-400 text-white rounded-md font-mono text-sm font-black shadow-lg shadow-emerald-900/60 backdrop-blur-md"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span className="leading-none tracking-wide font-extrabold">
                    {Math.floor(gameState.raceDuration)}s
                  </span>
                </div>
              )}
            </div>
          )}

          {gameState.phase === 'WINNER_CEREMONY' && (
            <div className="h-7 flex items-center gap-1.5 bg-amber-950/80 border border-amber-400/70 text-amber-300 px-3 rounded-md font-display text-xs sm:text-sm font-black shadow-lg">
              <Trophy className="w-4 h-4 text-[#f27d26]" />
              <span className="leading-none">VICTORY CEREMONY</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Track Viewport: All active lanes fit 100% inside this vertical flex area with strict overflow-hidden */}
      <main className="race-lanes-vertical-container flex-1 w-full min-h-0 flex flex-col relative bg-[#040d06] overflow-hidden">
        {/* Continuous uninterrupted white top line for Lane 1 across viewport */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white z-30 pointer-events-none shadow-sm" />

        {/* Pinned Lane Info & TikTok Username HUD Badges on Visible Screen */}
        <div className="pinned-hud-container absolute left-1 sm:left-2 top-0 bottom-0 z-20 flex flex-col pointer-events-none">
          {gameState.horses.map((horse) => {
            const staminaPct = Math.max(0, Math.min(100, ((horse.stamina || 0) / (horse.maxStamina || 100)) * 100));
            const supporterBets = (gameState.bets || []).filter((b) => b.lane === horse.lane);
            const supporterCount = supporterBets.length;
            const isVip = !!(horse.is_vip || horse.isVip);

            const avatarSrc =
              horse.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(horse.username)}&backgroundColor=111215`;

            const totalLanes = gameState.horses.length;
            const isCompact = totalLanes >= 7;

            return (
              <div
                key={`hud_${horse.lane}`}
                style={{ flex: '1 1 0px', minHeight: 0 }}
                className="w-full flex flex-col justify-center items-start overflow-visible py-0"
              >
                {isCompact ? (
                  /* Compact single-row layout for 7, 8, 9 racers: fits cleanly within tight lanes */
                  <div
                    className={`h-3.5 sm:h-4 ${
                      totalLanes === 9 ? 'max-w-[135px]' : 'max-w-[150px]'
                    } flex items-center gap-1 bg-[#030905]/95 rounded px-1 py-0 shadow border ${
                      isVip
                        ? 'border-[#FFD700]/90 shadow-[0_0_6px_rgba(255,215,0,0.35)]'
                        : 'border-[#1b4e24]/80'
                    }`}
                  >
                    {/* Lane Number */}
                    <span
                      className={`font-display font-black leading-none ${
                        totalLanes === 9 ? 'text-[7.5px]' : 'text-[8px]'
                      } ${isVip ? 'text-[#FFD700]' : 'text-[#f27d26]'}`}
                    >
                      {horse.lane}
                    </span>

                    {/* Avatar */}
                    <img
                      src={avatarSrc}
                      alt={horse.username}
                      className={`${
                        totalLanes === 9 ? 'w-2.5 h-2.5' : 'w-3 h-3'
                      } rounded-full object-cover shrink-0 ${
                        isVip ? 'border border-[#FFD700]' : 'border border-white/70'
                      }`}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />

                    {/* Username */}
                    <span
                      className={`${
                        totalLanes === 9 ? 'text-[7.5px] max-w-[42px]' : 'text-[8px] max-w-[50px]'
                      } font-display font-bold truncate leading-none ${
                        isVip ? 'text-[#FFD700] font-black' : 'text-slate-100'
                      }`}
                    >
                      @{horse.username}
                    </span>

                    {/* VIP Pill */}
                    {isVip && (
                      <span className="bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[5.5px] px-0.5 rounded leading-none shrink-0 font-display">
                        VIP
                      </span>
                    )}

                    {/* Mini Stamina Bar */}
                    <div className="flex items-center gap-0.5 shrink-0 pl-0.5">
                      <Zap
                        className={`w-1.5 h-1.5 shrink-0 ${
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
                          totalLanes === 9 ? 'w-5 sm:w-6' : 'w-6 sm:w-7'
                        } h-0.5 sm:h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 relative`}
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
                      <span className="text-[6.5px] font-mono font-bold text-slate-200 leading-none">
                        {Math.round(staminaPct)}%
                      </span>
                    </div>

                    {/* Supporter Bets count */}
                    {supporterCount > 0 && (
                      <div className="flex items-center gap-0.5 text-[6.5px] font-bold font-mono text-amber-300 shrink-0">
                        <Users className="w-1.5 h-1.5 text-[#f27d26] shrink-0" />
                        <span className="leading-none">{supporterCount}</span>
                      </div>
                    )}
                  </div>
                ) : isMedium ? (
                  /* Medium tight layout for 4, 5, 6 racers: fits well inside lanes */
                  <div className="flex flex-col gap-0.5 max-w-[160px]">
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-3.5 h-3.5 text-[8.5px] font-black rounded bg-[#030905]/95 ${
                          isVip
                            ? 'border border-[#FFD700] text-[#FFD700]'
                            : 'border border-[#1b4e24]/70 text-[#f27d26]'
                        } flex items-center justify-center font-display shadow shrink-0`}
                      >
                        {horse.lane}
                      </div>

                      <div
                        className={`${
                          isVip
                            ? 'border border-[#FFD700] bg-[#161205]/95 shadow-[0_0_6px_rgba(255,215,0,0.4)]'
                            : 'border border-[#1b4e24]/70 bg-[#030905]/95'
                        } px-1.5 py-0 h-3.5 max-w-[130px] rounded shadow flex items-center gap-1 transition-all`}
                      >
                        <img
                          src={avatarSrc}
                          alt={horse.username}
                          className={`w-3 h-3 rounded-full object-cover shrink-0 ${
                            isVip
                              ? 'border border-[#FFD700]'
                              : 'border border-white/70'
                          }`}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span
                          className={`text-[8.5px] font-bold font-display truncate leading-none ${
                            isVip ? 'text-[#FFD700] font-black' : 'text-slate-100'
                          }`}
                        >
                          @{horse.username}
                        </span>
                        {isVip && (
                          <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[6px] px-0.5 py-0 rounded font-display tracking-wider uppercase leading-none shadow-[0_0_6px_rgba(255,215,0,0.6)] shrink-0">
                            VIP
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <div
                        className="flex items-center gap-1 h-2.5 bg-[#091f0d]/95 border border-[#1b4e24]/70 rounded px-1 py-0 shadow backdrop-blur-md"
                        title={`Stamina: ${Math.round(staminaPct)}%`}
                      >
                        <Zap
                          className={`w-2 h-2 shrink-0 ${
                            horse.isNitro
                              ? 'text-amber-400 fill-amber-400 animate-pulse'
                              : staminaPct > 55
                              ? 'text-emerald-400'
                              : staminaPct > 25
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        />
                        <div className="w-9 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 relative">
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
                        <span className="text-[7px] font-mono font-bold text-slate-200 min-w-[16px] leading-none">
                          {Math.round(staminaPct)}%
                        </span>
                      </div>

                      {supporterCount > 0 && (
                        <div
                          className="flex items-center gap-0.5 h-2.5 bg-[#091f0d]/95 border border-[#1b4e24]/70 rounded px-1 py-0 shadow backdrop-blur-md text-[7px] font-bold font-mono text-amber-300"
                          title={`${supporterCount} spectator bets`}
                        >
                          <Users className="w-2 h-2 text-[#f27d26] shrink-0" />
                          <span className="leading-none">{supporterCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Large layout for 2, 3 racers: compact and comfortably inside lane */
                  <div className="flex flex-col gap-0.5 max-w-[180px]">
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-4 h-4 text-[9px] font-black rounded bg-[#030905]/95 ${
                          isVip
                            ? 'border border-[#FFD700] text-[#FFD700]'
                            : 'border border-[#1b4e24]/70 text-[#f27d26]'
                        } flex items-center justify-center font-display shadow shrink-0`}
                      >
                        {horse.lane}
                      </div>

                      <div
                        className={`${
                          isVip
                            ? 'border border-[#FFD700] bg-[#161205]/95 shadow-[0_0_8px_rgba(255,215,0,0.4)]'
                            : 'border border-[#1b4e24]/70 bg-[#030905]/95'
                        } px-2 py-0.5 h-4 max-w-[150px] rounded shadow backdrop-blur-md flex items-center gap-1 transition-all`}
                      >
                        <img
                          src={avatarSrc}
                          alt={horse.username}
                          className={`w-3.5 h-3.5 rounded-full object-cover shrink-0 ${
                            isVip
                              ? 'border border-[#FFD700]'
                              : 'border border-white/70'
                          }`}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span
                          className={`text-[9.5px] font-extrabold font-display truncate leading-none ${
                            isVip ? 'text-[#FFD700] font-black' : 'text-slate-100'
                          }`}
                        >
                          @{horse.username}
                        </span>
                        {isVip && (
                          <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[6.5px] px-1 py-0 rounded font-display tracking-wider uppercase shadow-[0_0_6px_rgba(255,215,0,0.6)] shrink-0">
                            VIP
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <div
                        className="flex items-center gap-1 h-3 bg-[#091f0d]/95 border border-[#1b4e24]/70 rounded px-1.5 py-0 shadow backdrop-blur-md"
                        title={`Stamina: ${Math.round(staminaPct)}%`}
                      >
                        <Zap
                          className={`w-2 h-2 shrink-0 ${
                            horse.isNitro
                              ? 'text-amber-400 fill-amber-400 animate-pulse'
                              : staminaPct > 55
                              ? 'text-emerald-400'
                              : staminaPct > 25
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        />
                        <div className="w-12 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 relative">
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
                        <span className="text-[7.5px] font-mono font-bold text-slate-200 min-w-[18px] leading-none">
                          {Math.round(staminaPct)}%
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-0.5 h-3 bg-[#091f0d]/95 border border-[#1b4e24]/70 rounded px-1 py-0 shadow backdrop-blur-md font-bold font-mono text-[7.5px] text-amber-300"
                        title={`${supporterCount} spectator bets`}
                      >
                        <Users className="w-2 h-2 text-[#f27d26] shrink-0" />
                        <span className="leading-none">{supporterCount}</span>
                      </div>
                    </div>
                  </div>
                )}
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
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f27d26] shadow-[0_0_16px_rgba(242,125,38,0.95)]" />
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

      {/* Continuous, uninterrupted solid white bottom line for the last lane across the entire viewport */}
      <div className="w-full h-[1px] bg-white z-30 shrink-0 relative shadow-sm pointer-events-none" />

      {/* Bottom Safe Zone (320px TikTok LIVE mobile safety zone: keeps chat and gifts completely clear) */}
      <footer className="w-full h-[320px] shrink-0 pointer-events-none relative z-20 flex flex-col justify-start p-0 px-2 sm:px-3 bg-gradient-to-b from-[#030804] to-transparent">
        {/* Command bar placed tightly right beneath the uninterrupted bottom line */}
        <div className="flex items-center justify-between w-full select-none font-semibold mt-1">
          <span className="bg-[#030804]/95 px-2 py-0.5 rounded border border-emerald-500/60 text-emerald-400 shadow text-[10px] sm:text-[11px] font-mono leading-tight tracking-wide">
            !race • !bet 1-{gameState.horses.length}
          </span>
          <span className="bg-[#030804]/95 px-2 py-0.5 rounded border border-amber-500/60 text-amber-300 shadow text-[10px] sm:text-[11px] font-mono leading-tight tracking-wide">
            Gift = Nitro Boost
          </span>
        </div>
        {/* TikTok LIVE Chat & Gift Clear Zone (Leaves the bottom mobile screen completely unobstructed) */}
        <div className="flex-1 w-full" />
      </footer>
    </div>
  );
};

