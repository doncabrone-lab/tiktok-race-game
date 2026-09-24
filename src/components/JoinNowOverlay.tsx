import React, { useEffect, useState } from 'react';

interface JoinNowOverlayProps {
  initialSeconds?: number;
  activeLanesCount?: number;
  horses?: Array<{
    lane: number;
    username: string;
    avatarUrl?: string;
  }>;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export function JoinNowOverlay({
  initialSeconds = 15,
  activeLanesCount = 0,
  horses = [],
  onComplete,
  onDismiss,
}: JoinNowOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onComplete?.();
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft, onComplete]);

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[90%] max-w-xl rounded-3xl border border-white/20 bg-black/85 p-6 text-center shadow-2xl">
        <div className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-yellow-300">
          NEXT RACE
        </div>

        <div className="text-5xl font-black text-white">
          JOIN NOW
        </div>

        <div className="mt-2 text-7xl font-black tabular-nums text-yellow-300">
          {secondsLeft}
        </div>

        <div className="mt-2 text-sm font-semibold text-white/80">
          Type <span className="font-black text-white">!race</span> to enter
        </div>

        <div className="mt-4 text-xs text-white/50">
          {activeLanesCount > 0
            ? `${activeLanesCount} racers currently on the track`
            : 'Be the first racer to join'}
        </div>

        {horses.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {horses.map((horse) => (
              <div
                key={horse.lane}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
              >
                Lane {horse.lane}: {horse.username}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
