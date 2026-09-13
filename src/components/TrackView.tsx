import React from 'react';
import { GameState, TrackLayoutMode } from '../types.ts';
import { TrackLane } from './TrackLane.tsx';
import { Timer, Trophy, Sparkles, Zap, Users, Sliders } from 'lucide-react';

interface Props {
  gameState: GameState;
  layoutMode?: TrackLayoutMode;
  horseScaleMultiplier?: number;
  onTapLane: (lane: number) => void;
  onTapScreen?: (lane?: number) => void;
  onToggleLayoutMode?: () => void;
  onOpenDock?: () => void;
}

export const TrackView: React.FC<Props> = ({
  gameState,
  layoutMode = 'SQUARE',
  horseScaleMultiplier = 1.0,
  onTapLane,
  onTapScreen,
  onToggleLayoutMode,
  onOpenDock,
}) => {
  const isRacing = gameState.phase === 'RACING';
  const isLobby = gameState.phase === 'LOBBY';
  const isCountdown = gameState.phase === 'COUNTDOWN';

  const isSquareOrFit = layoutMode === 'SQUARE' || layoutMode === 'FIT';

  // Dynamic Measurement of Track Container via ResizeObserver
  const trackContainerRef = React.useRef<HTMLDivElement>(null);
  const [trackContainerHeight, setTrackContainerHeight] = React.useState<number>(0);
  const [viewportWidth, setViewportWidth] = React.useState<number>(400);

  React.useEffect(() => {
    const el = trackContainerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setTrackContainerHeight(entry.contentRect.height);
        }
        if (entry.contentRect.width > 0) {
          setViewportWidth(entry.contentRect.width);
        }
      }
    });

    ro.observe(el);
    setTrackContainerHeight(el.clientHeight);
    setViewportWidth(el.clientWidth);

    return () => ro.disconnect();
  }, []);

  const totalCount = gameState.horses.length || 6;
  const laneHeight = trackContainerHeight > 0 ? trackContainerHeight / totalCount : 0;

  // Calculate dynamic camera offset following the leading horse along the 2500px track
  const START_POS = 150;
  const FINISH_POS = 2440;
  const maxDistance = Math.max(0, ...gameState.horses.map((h) => h.distance || 0));
  const leadX = START_POS + (FINISH_POS - START_POS) * (Math.min(100, maxDistance) / 100);

  // Dynamic maximum camera offset so the finish line (at 2420px) is framed perfectly at the right edge
  const maxCameraOffset = Math.max(0, 2460 - viewportWidth);

  let targetOffset = 0;
  if (isRacing) {
    // Keep camera tracking the lead horse so it's always centered at ~35% of the visible viewport
    const leadTarget = Math.max(0, leadX - viewportWidth * 0.35);
    const maxLeadOffset = Math.max(0, leadX - 60);
    targetOffset = Math.min(maxCameraOffset, Math.min(leadTarget, maxLeadOffset));
  } else if (gameState.phase === 'WINNER_CEREMONY' || gameState.phase === 'UNLOCK_CEREMONY') {
    targetOffset = maxCameraOffset; // Pin camera at finish line with clean space
  } else {
    targetOffset = 0; // Starting gates visible, finish line hidden
  }

  const isLarge = totalCount <= 3;
  const isMedium = totalCount >= 4 && totalCount <= 6;
  const tierClass = isLarge ? 'tier-large' : isMedium ? 'tier-medium' : 'tier-compact';

  return (
    <div
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, textarea, a, select')) return;
        onTapScreen?.();
      }}
      className={`race-bounding-box w-full h-full flex flex-col bg-[#030804] relative select-none cursor-pointer ${tierClass}`}
    >
      {/* Header: Compact in Square/Fit modes (~34px) to maximize race height; Mobile safe zone in Vertical mode */}
      <header
        className={`w-full ${
          isSquareOrFit ? 'h-[34px] px-2' : 'h-[110px] px-3'
        } shrink-0 pointer-events-none relative z-10 flex items-end justify-center pb-2 transition-all`}
      >
        {/* Center: Phase / Countdown HUD positioned right above Lane 1, perfectly centered */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-center justify-center pointer-events-none z-20">
          {isLobby && (
            <div
              className={`h-6 sm:h-7 flex items-center gap-1.5 ${
                gameState.isLobbyPaused
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-200 animate-pulse'
                  : 'bg-amber-950/80 border border-amber-500/60 text-amber-300'
              } px-2.5 sm:px-3 rounded-md shadow-lg backdrop-blur-md`}
            >
              <Timer className="w-3.5 h-3.5 text-[#f27d26]" />
              <span className="font-extrabold text-[11px] sm:text-xs font-display tracking-wide leading-none">
                {gameState.isLobbyPaused ? 'LOBBY PAUSED' : `LOBBY: ${Math.max(0, Math.ceil(gameState.lobbyTimeLeft))}s`}
              </span>
              {gameState.matchMode === 'INVITE_ONLY' && (
                <span className="bg-purple-600/90 text-purple-100 text-[8px] font-black px-1 py-0.5 rounded leading-none ml-1">
                  INVITE
                </span>
              )}
            </div>
          )}

          {isCountdown && (
            <div className="h-6 sm:h-7 flex items-center gap-1.5 bg-red-950/90 border border-red-500/70 text-red-200 px-2.5 sm:px-3 rounded-md shadow-lg">
              <Timer className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span className="font-black text-[11px] sm:text-xs font-display tracking-wider leading-none">
                STARTING IN {Math.ceil(gameState.countdownTimeLeft)}...
              </span>
            </div>
          )}

          {isRacing && (
            <div className="flex items-center">
              <div
                id="racing-meters-badge"
                className="h-6 sm:h-7 px-3 flex items-center gap-1.5 bg-blue-600/90 border border-blue-400 text-white rounded-md font-mono text-xs sm:text-sm font-black shadow-lg shadow-blue-900/60 backdrop-blur-md"
              >
                <span className="text-[10px] sm:text-xs text-blue-200 uppercase font-sans font-bold tracking-wider">
                  DISTANCE:
                </span>
                <span className="leading-none tracking-wide font-extrabold">
                  {Math.max(0, Math.round(gameState.remainingMeters ?? ((1 - Math.min(100, maxDistance) / 100) * (gameState.targetMeters || 500))))}m
                </span>
              </div>
            </div>
          )}

          {gameState.phase === 'WINNER_CEREMONY' && (
            <div className="h-6 sm:h-7 flex items-center gap-1.5 bg-amber-950/80 border border-amber-400/70 text-amber-300 px-2.5 sm:px-3 rounded-md font-display text-[11px] sm:text-xs font-black shadow-lg">
              <Trophy className="w-3.5 h-3.5 text-[#f27d26]" />
              <span className="leading-none">VICTORY CEREMONY</span>
            </div>
          )}
        </div>

        {/* Right: Host Dock Trigger positioned absolutely so it never affects centering */}
        {onOpenDock && (
          <div className="absolute right-2.5 bottom-2 pointer-events-auto z-30">
            <button
              onClick={onOpenDock}
              title="Open Host Controls Dock"
              className="p-1 rounded bg-black/60 hover:bg-black/90 border border-white/10 hover:border-amber-400/40 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* Main Track Viewport: All active lanes fit 100% inside this vertical flex area */}
      <main
        ref={trackContainerRef}
        className="race-lanes-vertical-container flex-1 w-full min-h-0 flex flex-col relative bg-[#040d06] overflow-visible z-20"
        style={{ overflow: 'visible' }}
      >
        {/* Continuous uninterrupted white top line for Lane 1 across viewport */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white z-0 pointer-events-none shadow-sm" />

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

            // Choose layout density based on actual measured laneHeight or lane count
            const isTight = laneHeight > 0 ? laneHeight < 72 : totalCount >= 5;

            return (
              <div
                key={`hud_${horse.lane}`}
                style={{ flex: '1 1 0px', minHeight: 0 }}
                className="w-full flex flex-col justify-center items-start overflow-visible py-0"
              >
                {isTight ? (
                  /* Compact layout for 5-9 lanes: 2-row layout with stamina bar directly under username */
                  <div className="flex flex-col gap-0.5 max-w-[150px]">
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-3.5 h-3.5 text-[8px] font-black rounded bg-[#030905]/95 ${
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
                        } px-1.5 py-0 h-3.5 max-w-[125px] rounded shadow flex items-center gap-1 transition-all`}
                      >
                        <img
                          src={avatarSrc}
                          alt={horse.username}
                          className={`w-2.5 h-2.5 rounded-full object-cover shrink-0 ${
                            isVip ? 'border border-[#FFD700]' : 'border border-white/70'
                          }`}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span
                          className={`text-[8px] font-bold font-display truncate leading-none ${
                            isVip ? 'text-[#FFD700] font-black' : 'text-slate-100'
                          }`}
                        >
                          @{horse.username}
                        </span>
                        {isVip && (
                          <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[5.5px] px-0.5 py-0 rounded font-display tracking-wider uppercase leading-none shrink-0">
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
                            horse.isNitro ? 'text-amber-400 animate-pulse' : staminaPct > 35 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        />
                        <div className="w-10 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 relative shrink-0">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${
                              horse.isNitro ? 'bg-amber-400' : staminaPct > 35 ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(3, staminaPct)}%` }}
                          />
                        </div>
                        <span className="text-[7px] sm:text-[7.5px] font-mono font-bold text-slate-200 min-w-[16px] leading-none shrink-0">
                          {Math.round(staminaPct)}%
                        </span>
                      </div>
                      {supporterCount > 0 && (
                        <div
                          className="flex items-center gap-0.5 h-3 bg-[#091f0d]/95 border border-[#1b4e24]/70 rounded px-1 py-0 shadow text-[7px] font-bold font-mono text-amber-300"
                        >
                          <Users className="w-1.5 h-1.5 text-[#f27d26] shrink-0" />
                          <span className="leading-none">{supporterCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Spacious layout for large lanes (2-4 racers or high-res square) */
                  <div className="flex flex-col gap-0.5 max-w-[175px]">
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
                        } px-2 py-0.5 h-4 max-w-[145px] rounded shadow backdrop-blur-md flex items-center gap-1 transition-all`}
                      >
                        <img
                          src={avatarSrc}
                          alt={horse.username}
                          className={`w-3.5 h-3.5 rounded-full object-cover shrink-0 ${
                            isVip ? 'border border-[#FFD700]' : 'border border-white/70'
                          }`}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span
                          className={`text-[9px] font-extrabold font-display truncate leading-none ${
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
                            horse.isNitro ? 'text-amber-400 animate-pulse' : staminaPct > 35 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        />
                        <div className="w-12 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 relative shrink-0">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${
                              horse.isNitro ? 'bg-amber-400' : staminaPct > 35 ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(3, staminaPct)}%` }}
                          />
                        </div>
                        <span className="text-[7.5px] font-mono font-bold text-slate-200 min-w-[18px] leading-none shrink-0">
                          {Math.round(staminaPct)}%
                        </span>
                      </div>

                      {supporterCount > 0 && (
                        <div
                          className="flex items-center gap-0.5 h-3 bg-[#091f0d]/95 border border-[#1b4e24]/70 rounded px-1 py-0 shadow backdrop-blur-md font-bold font-mono text-[7.5px] text-amber-300"
                        >
                          <Users className="w-2 h-2 text-[#f27d26] shrink-0" />
                          <span className="leading-none">{supporterCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Horizontal Scrolling 2500px Track Container with Camera Tracking */}
        <div
          className="w-[2500px] h-full flex flex-col transition-transform duration-300 ease-out relative overflow-visible"
          style={{ transform: `translateX(-${targetOffset}px)`, overflow: 'visible' }}
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
              totalLanes={totalCount}
              laneHeight={laneHeight}
              horseScaleMultiplier={horseScaleMultiplier}
              onTap={() => onTapLane(horse.lane)}
            />
          ))}
        </div>
      </main>

      {/* Continuous, uninterrupted solid white bottom line for the last lane across the entire viewport */}
      <div className="w-full h-[1px] bg-white z-30 shrink-0 relative shadow-sm pointer-events-none" />

      {/* Bottom Command Bar: Ultra-compact (26px) in Square/Fit modes; TikTok Safe Zone (280px) in Vertical mode */}
      <footer
        className={`w-full ${
          isSquareOrFit ? 'h-[26px]' : 'h-[280px]'
        } shrink-0 pointer-events-none relative z-20 flex flex-col justify-start p-0 px-2 sm:px-3 bg-gradient-to-b from-[#030804] to-transparent transition-all`}
      >
        {/* Command bar placed tightly right beneath the uninterrupted bottom line */}
        <div className="flex items-center justify-between w-full select-none font-semibold mt-0.5">
          <span className="bg-[#030804]/95 px-2 py-0.5 rounded border border-emerald-500/60 text-emerald-400 shadow text-[9.5px] sm:text-[10.5px] font-mono leading-tight tracking-wide">
            !race • !bet 1-{gameState.horses.length}
          </span>
          <span className="bg-[#030804]/95 px-2 py-0.5 rounded border border-amber-500/60 text-amber-300 shadow text-[9.5px] sm:text-[10.5px] font-mono leading-tight tracking-wide">
            Gift = Nitro Boost
          </span>
        </div>
        {!isSquareOrFit && <div className="flex-1 w-full" />}
      </footer>
    </div>
  );
};
