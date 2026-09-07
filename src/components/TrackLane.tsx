import React from 'react';
import { Horse } from '../types';

interface TrackLaneProps {
  horse: Horse;
  isRacing: boolean;
  isLobby: boolean;
  laneIndex: number;
  totalLanes: number;
  onTap: () => void;
}

export const TrackLane: React.FC<TrackLaneProps> = ({
  horse,
  isRacing,
  laneIndex,
  onTap,
}) => {
  const isVip = !!(horse.is_vip || horse.isVip);

  // Dynamic horse sprite/glow depending on VIP status
  const getHorseSprite = () => {
    if (isVip) {
      return {
        filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))',
        particleColor: 'rgba(255, 215, 0, 0.6)',
      };
    }
    return {
      filter: 'none',
      particleColor: 'rgba(242, 125, 38, 0.5)',
    };
  };

  const spriteStyle = getHorseSprite();

  // Position relative to track length (2500px)
  const START_POS = 150;
  const FINISH_POS = 2440;
  const currentX = START_POS + (FINISH_POS - START_POS) * (Math.min(100, horse.distance || 0) / 100);

  const avatarSrc =
    horse.avatarUrl ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(horse.username)}&backgroundColor=111215`;

  return (
    <div
      onClick={onTap}
      style={{ flex: '1 1 0px', minHeight: 0 }}
      className="w-full relative flex items-center border-b border-white/40 overflow-visible cursor-pointer select-none"
    >
      {/* Dynamic Runner Position along track */}
      <div
        className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-100 ease-linear pointer-events-none z-10"
        style={{ left: `${currentX}px`, transform: 'translate(-50%, -50%)' }}
      >
        {/* Rider / Spectator Avatar Bubble */}
        <div className="relative -mb-1 z-20">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-900 border border-white/80 p-0.5 shadow-md flex items-center justify-center overflow-hidden">
            <img
              src={avatarSrc}
              alt={horse.username}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Animated Horse Icon */}
        <div
          className={`relative flex items-center justify-center ${
            isRacing ? 'animate-bounce' : ''
          }`}
          style={{
            animationDuration: '0.4s',
            filter: spriteStyle.filter,
          }}
        >
          <span className="text-2xl sm:text-3xl leading-none">
            {isVip ? '🐎' : '🐎'}
          </span>
        </div>
      </div>
    </div>
  );
};
