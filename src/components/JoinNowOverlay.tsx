```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Users, Sparkles, X } from 'lucide-react';
import { RaceHorse } from '../types.ts';

interface Props {
  initialSeconds?: number;
  onComplete: () => void;
  onDismiss?: () => void;
  activeLanesCount?: number;
  horses?: RaceHorse[];
}

export const JoinNowOverlay: React.FC<Props> = ({
  initialSeconds = 15,
  onComplete,
  onDismiss,
  activeLanesCount = 6,
  horses = [],
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);

  const onCompleteRef = useRef(onComplete);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    const targetEndTime = Date.now() + initialSeconds * 1000;

    const interval = window.setInterval(() => {
      const remainingMs = targetEndTime - Date.now();
      const nextSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      setSecondsLeft(nextSeconds);

      if (remainingMs <= 0) {
        window.clearInterval(interval);

        window.setTimeout(() => {
          onCompleteRef.current();
        }, 400);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [initialSeconds]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (onDismissRef.current) {
      onDismissRef.current();
    } else {
      onCompleteRef.current();
    }
  };

  // SVG circular countdown gauge
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  const progressRatio =
    initialSeconds > 0
      ? Math.max(0, secondsLeft / initialSeconds)
      : 0;

  const strokeDashoffset =
    circumference * (1 - progressRatio);

  // Dynamic urgency colors
  const isUrgent = secondsLeft <= 3 && secondsLeft > 0;
  const isMedium = secondsLeft > 3 && secondsLeft <= 7;

  const colorTheme = isUrgent
    ? {
        ring: '#f43f5e',
        text: 'text-rose-400',
        badgeBorder: 'border-rose-500/70',
        badgeBg: 'bg-rose-950/70 text-rose-300',
        glow: 'shadow-[0_0_30px_rgba(244,63,94,0.45)]',
        cardBorder: 'border-rose-500/80',
        accentBar: 'from-rose-500 via-amber-400 to-rose-500',
      }
    : isMedium
      ? {
          ring: '#f59e0b',
          text: 'text-amber-400',
          badgeBorder: 'border-amber-500/70',
          badgeBg: 'bg-amber-950/70 text-amber-300',
          glow: 'shadow-[0_0_30px_rgba(245,158,11,0.35)]',
          cardBorder: 'border-amber-500/80',
          accentBar: 'from-amber-400 via-emerald-400 to-amber-400',
        }
      : {
          ring: '#10b981',
          text: 'text-emerald-400',
          badgeBorder: 'border-emerald-500/70',
          badgeBg: 'bg-emerald-950/70 text-emerald-300',
          glow: 'shadow-[0_0_30px_rgba(16,185,129,0.35)]',
          cardBorder: 'border-emerald-500/80',
          accentBar: 'from-emerald-400 via-teal-300 to-emerald-400',
        };

  /*
   * If real horses exist, use them.
   * Otherwise create visual placeholder lanes so the
   * countdown still has the same AI Studio appearance.
   */
  const validHorses: RaceHorse[] =
    horses && horses.length > 0
      ? horses
      : Array.from(
          { length: Math.max(0, activeLanesCount) },
          (_, i) => ({
            lane: i + 1,
            username: `Runner ${i + 1}`,
            countryName: 'USA',
            countryCode: 'US',
            flagEmoji: '🇺🇸',
            horseLevel: 1,
            skin: {
              level: 1,
              name: 'Standard',
              image: '',
              speed: 1,
              maxStamina: 100,
              unlockReq: '',
              winReq: 0,
              coinReq: 0,
              vipReq: false,
              trailType: '',
              auraDescription: '',
              themeColor: '#888',
            },
            distance: 0,
            speed: 1,
            stamina: 100,
            maxStamina: 100,
            isNitro: false,
            nitroTimer: 0,
            finished: false,
            tapsReceived: 0,
            giftsReceived: 0,
          }),
        );

  const midIndex = Math.ceil(validHorses.length / 2);

  const leftRacers = validHorses.slice(0, midIndex);
  const rightRacers = validHorses.slice(midIndex);

  const enteredPlayersCount = validHorses.filter(
    (h) =>
      h.is_vip ||
      h.isVip ||
      (h.username &&
        !h.username.startsWith('Turbo') &&
        !h.username.startsWith('Desert') &&
        !h.username.startsWith('Neon') &&
        !h.username.startsWith('Sahara') &&
        !h.username.startsWith('Tokyo') &&
        !h.username.startsWith('Runner'))
  ).length;

  const isPlayer = (horse: RaceHorse) =>
    Boolean(
      horse.is_vip ||
        horse.isVip ||
        (horse.username &&
          !horse.username.startsWith('Turbo') &&
          !horse.username.startsWith('Desert') &&
          !horse.username.startsWith('Neon') &&
          !horse.username.startsWith('Sahara') &&
          !horse.username.startsWith('Tokyo') &&
          !horse.username.startsWith('Runner'))
    );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 bg-black/60 backdrop-blur-[2.5px] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300 font-sans pointer-events-auto select-none"
    >
      <div
        className={`w-full max-w-lg sm:max-w-xl bg-gradient-to-b from-[#10141a]/95 via-[#080b0f]/95 to-[#10141a]/95 border-2 ${colorTheme.cardBorder} ${colorTheme.glow} rounded-3xl p-3.5 sm:p-4 relative overflow-hidden flex flex-col items-center text-center transition-all duration-300`}
      >
        {/* Top glowing header line */}
        <div
          className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${colorTheme.accentBar} transition-colors duration-500`}
        />

        {/* Ambient radial spotlight */}
        <div className="absolute -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top controls */}
        <div className="w-full flex items-center justify-between z-10 mb-1">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${colorTheme.badgeBorder} ${colorTheme.badgeBg} text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase shadow-sm`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isUrgent
                  ? 'bg-rose-400 animate-ping'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />

            <Users className="w-3 h-3 text-emerald-300" />

            <span>VIEWER REGISTRATION PHASE</span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Headline */}
        <h2 className="text-xl sm:text-2xl font-black uppercase font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-yellow-200 to-amber-300 drop-shadow-sm leading-tight mt-0.5 mb-0.5">
          JOIN THE NEXT RACE!
        </h2>

        <p className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wide text-amber-300/90 uppercase mb-2">
          LIMITED TIME TO ENTER • CLAIM YOUR JOCKEY NOW
        </p>

        {/* Racers + countdown */}
        <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2.5 my-1.5 sm:my-2">
          {/* LEFT RACERS */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-center justify-between px-1 pb-0.5 border-b border-slate-800">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                LANES 1-{midIndex}
              </span>

              <span className="text-[8px] font-mono text-emerald-400 font-semibold">
                READY
              </span>
            </div>

            {leftRacers.map((h) => {
              const player = isPlayer(h);

              return (
                <div
                  key={h.lane}
                  className={`flex items-center gap-1 sm:gap-1.5 px-1.5 py-1 rounded-lg border text-left transition-all duration-200 ${
                    player
                      ? 'bg-emerald-950/80 border-emerald-400/80 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : 'bg-[#0d1219]/90 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-mono font-black shrink-0 ${
                      player
                        ? 'bg-emerald-400 text-black font-extrabold shadow-sm'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {h.lane}
                  </span>

                  <span className="text-[10px] sm:text-[11px] font-bold font-mono truncate leading-none flex-1">
                    @{h.username}
                  </span>

                  {player ? (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse"
                      title="Entered and ready to race"
                    />
                  ) : (
                    <span className="text-[7px] text-slate-500 font-mono shrink-0">
                      READY
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* CENTER COUNTDOWN */}
          <div className="shrink-0 relative flex items-center justify-center mx-1 sm:mx-2">
            <svg
              className="w-24 h-24 sm:w-28 sm:h-28 -rotate-90 transform"
              viewBox="0 0 104 104"
            >
              <circle
                cx="52"
                cy="52"
                r={radius}
                className="stroke-[#1b222d]"
                strokeWidth="6"
                fill="transparent"
              />

              <circle
                cx="52"
                cy="52"
                r={radius}
                stroke={colorTheme.ring}
                strokeWidth="6.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-[stroke-dashoffset,stroke] duration-700 ease-linear"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                key={secondsLeft}
                className={`text-3xl sm:text-4xl font-black font-display tracking-tighter ${colorTheme.text} drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-in zoom-in-75 duration-200 leading-none`}
              >
                {secondsLeft}
              </span>

              <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold mt-0.5">
                {secondsLeft === 1 ? 'SECOND' : 'SECONDS'}
              </span>
            </div>
          </div>

          {/* RIGHT RACERS */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-center justify-between px-1 pb-0.5 border-b border-slate-800">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                LANES {midIndex + 1}-{validHorses.length}
              </span>

              <span className="text-[8px] font-mono text-emerald-400 font-semibold">
                READY
              </span>
            </div>

            {rightRacers.map((h) => {
              const player = isPlayer(h);

              return (
                <div
                  key={h.lane}
                  className={`flex items-center gap-1 sm:gap-1.5 px-1.5 py-1 rounded-lg border text-left transition-all duration-200 ${
                    player
                      ? 'bg-emerald-950/80 border-emerald-400/80 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : 'bg-[#0d1219]/90 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-mono font-black shrink-0 ${
                      player
                        ? 'bg-emerald-400 text-black font-extrabold shadow-sm'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {h.lane}
                  </span>

                  <span className="text-[10px] sm:text-[11px] font-bold font-mono truncate leading-none flex-1">
                    @{h.username}
                  </span>

                  {player ? (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse"
                      title="Entered and ready to race"
                    />
                  ) : (
                    <span className="text-[7px] text-slate-500 font-mono shrink-0">
                      READY
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TikTok chat command */}
        <div className="w-full bg-[#05080c]/90 border border-emerald-500/40 rounded-2xl p-2.5 sm:p-3 my-1.5 sm:my-2 flex flex-col items-center gap-1 shadow-inner">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider font-display">
            TYPE IN TIKTOK CHAT TO ENTER:
          </span>

          <div className="w-full max-w-[240px] py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-emerald-950/80 border-2 border-emerald-400/90 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />

            <span className="text-lg sm:text-xl font-black font-mono tracking-widest text-emerald-200 drop-shadow">
              !race
            </span>

            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          </div>

          <p className="text-[9px] sm:text-[10px] text-slate-400 font-sans tracking-wide">
            First come, first served • Auto-assigned to open lane
          </p>
        </div>

        {/* Lane availability */}
        <div className="w-full flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-mono text-slate-300 pt-0.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />

          <span>
            {activeLanesCount} LANES ACTIVE •{' '}
            {enteredPlayersCount > 0
              ? `${enteredPlayersCount} ENTERED • `
              : ''}
            FREE TO PLAY
          </span>
        </div>
      </div>
    </div>
  );
};
```
