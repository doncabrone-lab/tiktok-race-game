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
  onTap,
}) => {
  const isVip = !!(horse.is_vip || horse.isVip);

  // Oorspronkelijke VIP / Reguliere visual effects & sprites
  const getHorseSprite = () => {
    if (isVip) {
      return {
        filter: 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.9)) brightness(1.2)',
        particleColor: 'rgba(255, 215, 0, 0.6)',
      };
    }
    return {
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
      particleColor: 'rgba(242, 125, 38, 0.5)',
    };
  };

  const spriteStyle = getHorseSprite();

  // Posititiebepaling over de 2500px baan
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
      {/* Dynamic Runner Container op de baan */}
      <div
        className="absolute top-1/2 flex flex-col items-center justify-center transition-all duration-100 ease-linear pointer-events-none z-10"
        style={{ left: `${currentX}px`, transform: 'translate(-50%, -40%)' }}
      >
        {/* Speler Avatar Bubble op het paard */}
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

        {/* Oorspronkelijk Paard / Skin Render met Animaties & Glow */}
        <div
          className={`relative flex items-center justify-center ${
            isRacing ? 'animate-bounce' : ''
          }`}
          style={{
            animationDuration: '0.35s',
            filter: spriteStyle.filter,
          }}
        >
          {horse.skinUrl ? (
            <img
              src={horse.skinUrl}
              alt="Horse Skin"
              className="h-8 sm:h-10 w-auto object-contain"
            />
          ) : (
            <span className="text-2xl sm:text-3xl leading-none">🐎</span>
          )}
        </div>
      </div>
    </div>
  );
};
