import React from 'react';
import { GameState, TrackLayoutMode } from '../types.ts';
import { TrackLane } from './TrackLane.tsx';
import { Timer, Trophy, Zap, Users, Sliders, Target, Coins } from 'lucide-react';

interface Props {
  gameState: GameState;
  layoutMode?: TrackLayoutMode;
  horseScaleMultiplier?: number;

  latestPick?: {
    username: string;
    lane: number;
    horseName?: string;
    timestamp: number;
  } | null;

  latestStatsAlert?: {
    username: string;
    type: 'wins' | 'points';
    value: number;
    text: string;
    timestamp: number;
  } | null;

  onTapLane: (lane: number) => void;
  onTapScreen?: (lane?: number) => void;
  onToggleLayoutMode?: () => void;
  onOpenDock?: () => void;
}

export const TrackView: React.FC<Props> = ({
  gameState,
  layoutMode = 'SQUARE',
  horseScaleMultiplier = 1.0,
  latestPick,
  latestStatsAlert,
  onTapLane,
  onTapScreen,
  onToggleLayoutMode,
  onOpenDock,
}) => {
  const phase = String(gameState.phase);

  const isJoining = phase === 'JOINING';
  const isRacing = phase === 'RACING';
  const isLobby = phase === 'LOBBY';
  const isCountdown = phase === 'COUNTDOWN';

  const isSquareOrFit =
    layoutMode === 'SQUARE' || layoutMode === 'FIT';

  const [activePickAlert, setActivePickAlert] =
    React.useState<typeof latestPick>(null);

  const [activeStatsAlert, setActiveStatsAlert] =
    React.useState<typeof latestStatsAlert>(null);

  React.useEffect(() => {
    if (!latestPick) return;

    setActivePickAlert(latestPick);

    const timer = window.setTimeout(() => {
      setActivePickAlert(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [latestPick?.timestamp]);

  React.useEffect(() => {
    if (!latestStatsAlert) return;

    setActiveStatsAlert(latestStatsAlert);

    const timer = window.setTimeout(() => {
      setActiveStatsAlert(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [latestStatsAlert?.timestamp]);

  const trackContainerRef =
    React.useRef<HTMLDivElement>(null);

  const [trackContainerHeight, setTrackContainerHeight] =
    React.useState(0);

  const [viewportWidth, setViewportWidth] =
    React.useState(400);

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

  const laneHeight =
    trackContainerHeight > 0
      ? trackContainerHeight / totalCount
      : 0;

  const START_POS = 150;
  const FINISH_POS = 2440;

  const maxDistance = Math.max(
    0,
    ...gameState.horses.map((h) => h.distance || 0)
  );

  const leadX =
    START_POS +
    (FINISH_POS - START_POS) *
      (Math.min(100, maxDistance) / 100);

  const maxCameraOffset = Math.max(
    0,
    2460 - viewportWidth
  );

  let targetOffset = 0;

  if (isRacing) {
    const leadTarget = Math.max(
      0,
      leadX - viewportWidth * 0.35
    );

    const maxLeadOffset = Math.max(
      0,
      leadX - 60
    );

    targetOffset = Math.min(
      maxCameraOffset,
      Math.min(leadTarget, maxLeadOffset)
    );
  } else if (
    phase === 'WINNER_CEREMONY' ||
    phase === 'UNLOCK_CEREMONY'
  ) {
    targetOffset = maxCameraOffset;
  }

  const isLarge = totalCount <= 3;
  const isMedium = totalCount >= 4 && totalCount <= 6;

  const tierClass = isLarge
    ? 'tier-large'
    : isMedium
      ? 'tier-medium'
      : 'tier-compact';

  const applicants = Array.isArray(gameState.lobbyApplicants)
    ? gameState.lobbyApplicants
    : [];

  const joiningSeconds = Math.max(
    0,
    Math.ceil(gameState.lobbyTimeLeft || 0)
  );

  return (
    <div
      onClick={(e) => {
        const target = e.target as HTMLElement;

        if (
          target.closest(
            'button, input, textarea, a, select'
          )
        ) {
          return;
        }

        onTapScreen?.();
      }}
      className={`race-bounding-box w-full h-full flex flex-col bg-[#030804] relative select-none cursor-pointer ${tierClass}`}
    >
      <header
        className={`w-full ${
          isSquareOrFit
            ? 'h-[34px] px-2'
            : 'h-[110px] px-3'
        } shrink-0 pointer-events-none relative z-50 flex items-end justify-center pb-2 transition-all`}
      >
        {/* JOINING */}
        {isJoining && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-center gap-2 bg-emerald-950/95 border border-emerald-400/80 text-emerald-200 px-3 py-1.5 rounded-lg shadow-[0_0_18px_rgba(16,185,129,0.35)] backdrop-blur-md">
            <Users className="w-4 h-4 text-emerald-400 animate-pulse" />

            <div className="flex flex-col items-center leading-none">
              <span className="font-black text-[10px] sm:text-xs tracking-wider">
                JOIN THE NEXT RACE
              </span>

              <span className="font-mono font-black text-[12px] sm:text-sm text-white mt-0.5">
                {joiningSeconds}s
              </span>
            </div>

            {applicants.length > 0 && (
              <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded px-1.5 py-0.5 text-[8px] font-black">
                {applicants.length} JOINED
              </span>
            )}
          </div>
        )}

        {/* JOINED USERS */}
        {isJoining && applicants.length > 0 && (
          <div className="absolute left-2 top-1 pointer-events-none z-30 max-w-[42%]">
            <div className="flex items-center gap-1 mb-0.5">
              <Users className="w-2.5 h-2.5 text-emerald-400" />

              <span className="text-[7px] sm:text-[8px] font-black text-emerald-300 uppercase tracking-wider">
                RACERS JOINED
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {applicants.slice(0, 8).map((username) => (
                <span
                  key={username}
                  className="bg-black/80 border border-emerald-500/40 text-white px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-bold shadow"
                >
                  @{username}
                </span>
              ))}

              {applicants.length > 8 && (
                <span className="text-[7px] text-emerald-300 font-bold px-1">
                  +{applicants.length - 8}
                </span>
              )}
            </div>
          </div>
        )}

        {/* LOBBY / PICKING */}
        {isLobby && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 h-6 sm:h-7 flex items-center gap-1.5 bg-amber-950/80 border border-amber-500/60 text-amber-300 px-2.5 sm:px-3 rounded-md shadow-lg backdrop-blur-md">
            <Timer className="w-3.5 h-3.5 text-[#f27d26]" />

            <span className="font-extrabold text-[11px] sm:text-xs font-display tracking-wide leading-none">
              {gameState.isLobbyPaused
                ? 'LOBBY PAUSED'
                : `PICK: ${Math.max(
                    0,
                    Math.ceil(gameState.lobbyTimeLeft)
                  )}s`}
            </span>
          </div>
        )}

        {/* COUNTDOWN */}
        {isCountdown && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 h-6 sm:h-7 flex items-center gap-1.5 bg-red-950/90 border border-red-500/70 text-red-200 px-2.5 sm:px-3 rounded-md shadow-lg">
            <Timer className="w-3.5 h-3.5 text-red-400 animate-pulse" />

            <span className="font-black text-[11px] sm:text-xs font-display tracking-wider leading-none">
              STARTING IN{' '}
              {Math.ceil(gameState.countdownTimeLeft)}...
            </span>
          </div>
        )}

        {/* RACING */}
        {isRacing && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-center">
            <div
              id="racing-meters-badge"
              className="h-6 sm:h-7 px-3 flex items-center gap-1.5 bg-blue-600/90 border border-blue-400 text-white rounded-md font-mono text-xs sm:text-sm font-black shadow-lg shadow-blue-900/60 backdrop-blur-md"
            >
              <span className="text-[10px] sm:text-xs text-blue-200 uppercase font-sans font-bold tracking-wider">
                DISTANCE:
              </span>

              <span className="leading-none tracking-wide font-extrabold">
                {Math.max(
                  0,
                  Math.round(
                    gameState.remainingMeters ??
                      ((1 -
                        Math.min(100, maxDistance) /
                          100) *
                        (gameState.targetMeters || 500))
                  )
                )}
                m
              </span>
            </div>
          </div>
        )}

        {/* WINNER */}
        {phase === 'WINNER_CEREMONY' && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 h-6 sm:h-7 flex items-center gap-1.5 bg-amber-950/80 border border-amber-400/70 text-amber-300 px-2.5 sm:px-3 rounded-md font-display text-[11px] sm:text-xs font-black shadow-lg">
            <Trophy className="w-3.5 h-3.5 text-[#f27d26]" />
            <span className="leading-none">
              VICTORY CEREMONY
            </span>
          </div>
        )}

        {/* PICK CONFIRMATION */}
        {activePickAlert && (
          <div className="absolute left-2 bottom-2 pointer-events-none z-40">
            <div className="flex items-center gap-1.5 bg-blue-950/95 border border-blue-400/70 text-blue-100 px-2 py-1 rounded-md shadow-[0_0_12px_rgba(59,130,246,0.3)] backdrop-blur-md">
              <Target className="w-3 h-3 text-blue-300" />

              <span className="text-[8px] sm:text-[9px] font-black whitespace-nowrap">
                @{activePickAlert.username}
                {' → '}
                HORSE {activePickAlert.lane}
              </span>
            </div>
          </div>
        )}

        {/* STATS CONFIRMATION */}
        {activeStatsAlert && (
          <div className="absolute right-12 bottom-2 pointer-events-none z-40">
            <div className="flex items-center gap-1.5 bg-amber-950/95 border border-amber-400/70 text-amber-100 px-2 py-1 rounded-md shadow-[0_0_12px_rgba(245,158,11,0.3)] backdrop-blur-md">
              <Coins className="w-3 h-3 text-amber-300" />

              <span className="text-[8px] sm:text-[9px] font-black whitespace-nowrap">
                @{activeStatsAlert.username}
                {' • '}
                {activeStatsAlert.text}
              </span>
            </div>
          </div>
        )}

        {/* HOST CONTROLS */}
        {onOpenDock && (
          <div className="absolute right-2.5 bottom-2 pointer-events-auto z-50">
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

      <main
        ref={trackContainerRef}
        className="race-lanes-vertical-container flex-1 w-full min-h-0 flex flex-col relative bg-[#040d06] overflow-visible z-20"
        style={{ overflow: 'visible' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white z-0 pointer-events-none shadow-sm" />

        {/* LANE HUD */}
        <div className="pinned-hud-container absolute left-1 sm:left-2 top-0 bottom-0 z-20 flex flex-col pointer-events-none">
          {gameState.horses.map((horse) => {
            const staminaPct = Math.max(
              0,
              Math.min(
                100,
                ((horse.stamina || 0) /
                  (horse.maxStamina || 100)) *
                  100
              )
            );

            const supporterCount = (
              gameState.bets || []
            ).filter(
              (b) => b.lane === horse.lane
            ).length;

            const isVip = !!(
              horse.is_vip || horse.isVip
            );

            const avatarSrc =
              horse.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                horse.username
              )}&backgroundColor=111215`;

            const isTight =
              laneHeight > 0
                ? laneHeight < 72
                : totalCount >= 5;

            return (
              <div
                key={`hud_${horse.lane}`}
                style={{
                  flex: '1 1 0px',
                  minHeight: 0,
                }}
                className="w-full flex flex-col justify-center items-start overflow-visible py-0"
              >
                <div
                  className={`flex flex-col gap-0.5 ${
                    isTight
                      ? 'max-w-[150px]'
                      : 'max-w-[175px]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <div
                      className={`${
                        isTight
                          ? 'w-3.5 h-3.5 text-[8px]'
                          : 'w-4 h-4 text-[9px]'
                      } font-black rounded bg-[#030905]/95 ${
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
                          ? 'border border-[#FFD700] bg-[#161205]/95'
                          : 'border border-[#1b4e24]/70 bg-[#030905]/95'
                      } px-1.5 py-0 h-4 max-w-[145px] rounded shadow flex items-center gap-1`}
                    >
                      <img
                        src={avatarSrc}
                        alt={horse.username}
                        className={`${
                          isTight
                            ? 'w-2.5 h-2.5'
                            : 'w-3.5 h-3.5'
                        } rounded-full object-cover shrink-0 ${
                          isVip
                            ? 'border border-[#FFD700]'
                            : 'border border-white/70'
                        }`}
                        onError={(e) => {
                          (
                            e.currentTarget as HTMLElement
                          ).style.display = 'none';
                        }}
                      />

                      <span
                        className={`${
                          isTight
                            ? 'text-[8px]'
                            : 'text-[9px]'
                        } font-extrabold font-display truncate leading-none ${
                          isVip
                            ? 'text-[#FFD700]'
                            : 'text-slate-100'
                        }`}
                      >
                        @{horse.username}
                      </span>

                      {isVip && (
                        <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[6px] px-1 py-0 rounded font-display tracking-wider uppercase shrink-0">
                          VIP
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 h-3 bg-[#091f0d]/95 border border-[#1b4e24]/70 rounded px-1.5 py-0 shadow">
                      <Zap
                        className={`w-2 h-2 shrink-0 ${
                          horse.isNitro
                            ? 'text-amber-400 animate-pulse'
                            : staminaPct > 35
                              ? 'text-emerald-400'
                              : 'text-red-400'
                        }`}
                      />

                      <div
                        className={`${
                          isTight
                            ? 'w-10'
                            : 'w-12'
                        } h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/60`}
                      >
                        <div
                          className={`h-full rounded-full ${
                            horse.isNitro
                              ? 'bg-amber-400'
                              : staminaPct > 35
                                ? 'bg-emerald-500'
                                : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.max(
                              3,
                              staminaPct
                            )}%`,
                          }}
                        />
                      </div>

                      <span className="text-[7px] font-mono font-bold text-slate-200 min-w-[16px] leading-none">
                        {Math.round(staminaPct)}%
                      </span>
                    </div>

                    {supporterCount > 0 && (
                      <div className="flex items-center gap-0.5 h-3 bg-[#091f0d]/95 border border-[#1b4e24]/70 rounded px-1 shadow text-[7px] font-bold font-mono text-amber-300">
                        <Users className="w-1.5 h-1.5 text-[#f27d26]" />
                        <span>{supporterCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* TRACK */}
        <div
          className="w-[2500px] h-full flex flex-col transition-transform duration-300 ease-out relative overflow-visible"
          style={{
            transform: `translateX(-${targetOffset}px)`,
          }}
        >
          <div className="absolute left-[2420px] top-0 bottom-0 w-10 pointer-events-none z-20 overflow-visible">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f27d26] shadow-[0_0_16px_rgba(242,125,38,0.95)]" />

            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-[#f27d26] text-black font-black text-[9px] px-2 py-0.5 rounded-b uppercase tracking-wider font-display whitespace-nowrap z-30 flex items-center gap-1">
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

      <div className="w-full h-[1px] bg-white z-30 shrink-0 relative shadow-sm pointer-events-none" />

      <footer
        className={`w-full ${
          isSquareOrFit
            ? 'h-[26px]'
            : 'h-[280px]'
        } shrink-0 pointer-events-none relative z-20 flex flex-col justify-start p-0 px-2 sm:px-3 bg-gradient-to-b from-[#030804] to-transparent`}
      >
        <div className="flex items-center justify-between w-full select-none font-semibold mt-0.5">
          <span className="bg-[#030804]/95 px-2 py-0.5 rounded border border-emerald-500/60 text-emerald-400 shadow text-[9.5px] sm:text-[10.5px] font-mono leading-tight tracking-wide">
            !race • !pick 1-{gameState.horses.length}
          </span>

          <span className="bg-[#030804]/95 px-2 py-0.5 rounded border border-amber-500/60 text-amber-300 shadow text-[9.5px] sm:text-[10.5px] font-mono leading-tight tracking-wide">
            Gift = Nitro Boost
          </span>
        </div>

        {!isSquareOrFit && (
          <div className="flex-1 w-full" />
        )}
      </footer>
    </div>
  );
};
