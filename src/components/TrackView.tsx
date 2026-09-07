import React from 'react';
import { GameState } from '../types';
import { TrackLane } from './TrackLane';
import { Timer, Sparkles, Users } from 'lucide-react';

interface Props {
  gameState: GameState;
  onTapLane: (lane: number) => void;
}

export const TrackView: React.FC<Props> = ({ gameState, onTapLane }) => {
  const isRacing = gameState.phase === 'RACING';
  const isLobby = gameState.phase === 'LOBBY';
  const isCountdown = gameState.phase === 'COUNTDOWN';

  const START_POS = 150;
  const FINISH_POS = 2440;
  const maxDistance = Math.max(0, ...gameState.horses.map((h) => h.distance || 0));
  const leadX = START_POS + (FINISH_POS - START_POS) * (Math.min(100, maxDistance) / 100);

  let targetOffset = 0;
  if (isRacing) {
    const normalOffset = Math.max(0, leadX - 220);
    const maxLeadOffset = Math.max(0, leadX - 60);
    targetOffset = Math.min(2100, Math.min(normalOffset, maxLeadOffset));
  } else if (gameState.phase === 'WINNER_CEREMONY' || gameState.phase === 'UNLOCK_CEREMONY') {
    targetOffset = 2100;
  } else {
    targetOffset = 0;
  }

  const totalCount = gameState.horses.length;
  const isLarge = totalCount <= 3;
  const isMedium = totalCount >= 4 && totalCount <= 6;
  const tierClass = isLarge ? 'tier-large' : isMedium ? 'tier-medium' : 'tier-compact';

  return (
    <div className={`race-bounding-box w-full h-full flex flex-col bg-[#030804] relative select-none ${tierClass}`}>
      <header className="w-full h-[120px] shrink-0 pointer-events-none relative z-30 flex flex-col justify-end items-center pb-2">
        <div className="flex items-center justify-center pointer-events-none">
          {isLobby && (
            <div
              className={`h-5 flex items-center gap-1 ${
                gameState.isLobbyPaused
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-200 animate-pulse'
                  : 'bg-amber-950/90 border border-amber-500/60 text-amber-300'
              } px-2.5 rounded-full shadow-md backdrop-blur-md`}
            >
              <Timer className="w-3 h-3 text-[#f27d26]" />
              <span className="font-extrabold text-xs font-display tracking-wide leading-none">
                {gameState.isLobbyPaused ? 'PAUSED' : `LOBBY: ${Math.max(0, Math.ceil(gameState.lobbyTimeLeft))}s`}
              </span>
            </div>
          )}

          {isCountdown && (
            <div className="h-5 flex items-center gap-1 bg-red-950/90 border border-red-500/70 text-red-200 px-2.5 rounded-full shadow-md">
              <span className="font-black text-xs font-display tracking-wider leading-none">
                {Math.ceil(gameState.countdownTimeLeft)}s
              </span>
            </div>
          )}

          {isRacing && (
            <div className="flex items-center">
              {gameState.mode === 'TIME_TRIAL' ? (
                <div
                  id="racing-timer-badge"
                  className="h-5 px-2.5 flex items-center gap-1 bg-blue-600/90 border border-blue-400/80 text-white rounded-full font-mono text-xs font-black shadow-md backdrop-blur-md"
                >
                  <Timer className="w-3 h-3 text-blue-200 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="leading-none tracking-wide font-extrabold">
                    {Math.max(0, Math.ceil(gameState.raceTimeLeft))}s
                  </span>
                </div>
              ) : (
                <div
                  id="racing-timer-badge"
                  className="h-5 px-2.5 flex items-center gap-1 bg-emerald-600/90 border border-emerald-400/80 text-white rounded-full font-mono text-xs font-black shadow-md backdrop-blur-md"
                >
                  <Sparkles className="w-3 h-3 text-emerald-200" />
                  <span className="leading-none tracking-wide font-extrabold">
                    {Math.floor(gameState.raceDuration)}s
                  </span>
                </div>
              )}
            </div>
          )}

          {gameState.phase === 'WINNER_CEREMONY' && (
            <div className="h-5 flex items-center gap-1 bg-amber-950/80 border border-amber-400/70 text-amber-300 px-2.5 rounded-full font-display text-xs font-black shadow-md">
              <span className="leading-none">FINISH</span>
            </div>
          )}
        </div>
      </header>

      <main className="race-lanes-vertical-container flex-1 w-full min-h-0 flex flex-col relative bg-[#040d06] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white z-30 pointer-events-none shadow-sm" />

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
                  <div
                    className={`h-3.5 sm:h-4 ${
                      totalLanes === 9 ? 'max-w-[135px]' : 'max-w-[150px]'
                    } flex items-center gap-1 bg-[#030905]/95 rounded px-1 py-0 shadow ${
                      isVip ? 'border border-amber-400/80' : 'border border-slate-700/80'
                    }`}
                  >
                    <span className="font-display font-black leading-none text-[8px] text-[#f27d26]">
                      {horse.lane}
                    </span>

                    <img
                      src={avatarSrc}
                      alt={horse.username}
                      className="w-3 h-3 rounded-full object-cover shrink-0 border border-white/70"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />

                    <span className="text-[8px] max-w-[50px] font-display font-bold truncate leading-none text-slate-100">
                      @{horse.username}
                    </span>

                    {isVip && (
                      <span className="bg-amber-400 text-slate-950 font-black text-[5.5px] px-0.5 rounded leading-none shrink-0 font-display">
                        VIP
                      </span>
                    )}

                    <div className="flex items-center gap-0.5 shrink-0 pl-0.5">
                      <div className="w-5 sm:w-6 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 relative">
                        <div
                          className="h-full rounded-full transition-all duration-200 bg-emerald-500"
                          style={{ width: `${staminaPct}%` }}
                        />
                      </div>
                      <span className="text-[6.5px] font-mono font-bold text-slate-200 leading-none">
                        {Math.round(staminaPct)}%
                      </span>
                    </div>

                    {supporterCount > 0 && (
                      <div className="flex items-center gap-0.5 text-[6.5px] font-bold font-mono text-amber-300 shrink-0">
                        <Users className="w-1.5 h-1.5 text-[#f27d26] shrink-0" />
                        <span className="leading-none">{supporterCount}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5 max-w-[160px]">
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 text-[8.5px] font-black rounded bg-[#030905]/95 border border-slate-700/80 text-[#f27d26] flex items-center justify-center font-display shadow shrink-0">
                        {horse.lane}
                      </div>

                      <div
                        className={`border ${
                          isVip ? 'border-amber-400/80' : 'border-slate-700/80'
                        } bg-[#030905]/95 px-1.5 py-0 h-3.5 max-w-[130px] rounded shadow flex items-center gap-1 transition-all`}
                      >
                        <img
                          src={avatarSrc}
                          alt={horse.username}
                          className="w-3 h-3 rounded-full object-cover shrink-0 border border-white/70"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="text-[8.5px] font-bold font-display truncate leading-none text-slate-100">
                          @{horse.username}
                        </span>
                        {isVip && (
                          <span className="bg-amber-400 text-slate-950 font-black text-[6px] px-0.5 py-0 rounded font-display uppercase leading-none shrink-0">
                            VIP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="w-[2500px] h-full flex flex-col transition-transform duration-300 ease-out relative"
          style={{ transform: `translateX(-${targetOffset}px)` }}
        >
          <div className="absolute left-[2420px] top-0 bottom-0 w-10 pointer-events-none z-20 overflow-visible">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f27d26] shadow-[0_0_16px_rgba(242,125,38,0.95)]" />
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-[#f27d26] text-black font-black text-[9px] px-2 py-0.5 rounded-b shadow uppercase tracking-wider font-display whitespace-nowrap z-30 flex items-center gap-1">
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

      <div className="w-full h-[1px] bg-white z-30 shrink-0 relative shadow-sm pointer-events-none" />

      <footer className="w-full h-[320px] shrink-0 pointer-events-none relative z-20 flex flex-col justify-start p-0 px-2 sm:px-3 bg-gradient-to-b from-[#030804] to-transparent">
        <div className="flex items-center justify-between w-full select-none font-semibold mt-1">
          <span className="bg-[#030804]/95 px-2 py-0.5 rounded border border-emerald-500/60 text-emerald-400 shadow text-[10px] sm:text-[11px] font-mono leading-tight tracking-wide">
            !race • !bet 1-{gameState.horses.length}
          </span>
          <span className="bg-[#030804]/95 px-2 py-0.5 rounded border border-amber-500/60 text-amber-300 shadow text-[10px] sm:text-[11px] font-mono leading-tight tracking-wide">
            Gift = Nitro Boost
          </span>
        </div>
        <div className="flex-1 w-full" />
      </footer>
    </div>
  );
};
