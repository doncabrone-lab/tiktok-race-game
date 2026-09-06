import React, { useState, useEffect, useRef } from 'react';
import { RaceHorse } from '../types.ts';
import { HorseParticleAura } from './HorseParticleAura.tsx';
import { Flame } from 'lucide-react';

interface Props {
  horse: RaceHorse;
  isRacing: boolean;
  isLobby: boolean;
  totalLanes?: number;
  onTap?: () => void;
}

export const HorseRunner: React.FC<Props> = ({ horse, isRacing, isLobby, totalLanes = 6, onTap }) => {
  const [imgError, setImgError] = useState(false);
  const isVip = !!(horse.is_vip || horse.isVip);
  const isNineLanes = totalLanes >= 9;
  const isEightLanes = totalLanes === 8;
  const isSevenLanes = totalLanes === 7;
  const isSixLanes = totalLanes === 6;
  const isCompact = totalLanes >= 7;

  // Scaled for comfortable clearance under the 1.3cm header bar across all 1-9 racer configurations
  const horseImgWidth = isNineLanes
    ? '55px'
    : isEightLanes
    ? '61px'
    : isSevenLanes
    ? '68px'
    : isSixLanes
    ? '76px'
    : '86px';

  const avatarSize = isNineLanes
    ? 15
    : isEightLanes
    ? 17
    : isSevenLanes
    ? 19
    : isSixLanes
    ? 22
    : 24;

  const shadowWidth = isNineLanes
    ? '46px'
    : isEightLanes
    ? '52px'
    : isSevenLanes
    ? '58px'
    : isSixLanes
    ? '66px'
    : '76px';

  // Mounted rider avatar: for 8-9 racers, nestles onto the saddle with slight natural overlap so Lane 1 never clips under 1.3cm header
  const avatarTop = isNineLanes
    ? '18%'
    : isEightLanes
    ? '15%'
    : isSevenLanes
    ? '10%'
    : isSixLanes
    ? '3%'
    : '-2%';

  // Determine ground shadow animation state
  let animClass = 'lobby';
  if (horse.finished) {
    animClass = 'finished';
  } else if (isRacing && horse.isNitro) {
    animClass = 'nitro';
  } else if (isRacing) {
    animClass = 'racing';
  }

  // Default avatar URL if none provided
  const avatarSrc =
    horse.avatarUrl ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(horse.username)}&backgroundColor=111215`;

  // Calculate target position along extended 2500px track
  const START_POS = 150;
  const FINISH_POS = 2440; // Finish line starts at 2420px; 2440px carries runner cleanly across
  const targetX = START_POS + (FINISH_POS - START_POS) * (Math.min(100, Math.max(0, horse.distance)) / 100);

  // 60-120fps Sub-pixel GPU Lerp (Eliminates all network stutter and choppiness)
  const [currentX, setCurrentX] = useState(targetX);
  const currentXRef = useRef(targetX);
  const targetXRef = useRef(targetX);

  useEffect(() => {
    targetXRef.current = targetX;
    // Snap instantly if resetting to start line
    if (horse.distance === 0 || isLobby) {
      currentXRef.current = targetX;
      setCurrentX(targetX);
    }
  }, [targetX, horse.distance, isLobby]);

  useEffect(() => {
    let animFrameId: number;
    const smoothStep = () => {
      const diff = targetXRef.current - currentXRef.current;
      if (Math.abs(diff) > 0.05) {
        // Continuous smooth glide toward target
        currentXRef.current += diff * 0.22;
        setCurrentX(currentXRef.current);
      } else if (currentXRef.current !== targetXRef.current) {
        currentXRef.current = targetXRef.current;
        setCurrentX(targetXRef.current);
      }
      animFrameId = requestAnimationFrame(smoothStep);
    };

    animFrameId = requestAnimationFrame(smoothStep);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  // Horses only disappear when they have physically reached and run across the finish line (2435px+)
  const hasPassedFinishLine = horse.finished && currentX >= 2435;

  if (hasPassedFinishLine && isRacing) {
    return null;
  }

  return (
    <div
      onClick={onTap}
      className={`absolute cursor-pointer z-10 select-none flex flex-col items-center will-change-transform ${
        isCompact ? 'bottom-0' : 'bottom-0.5 sm:bottom-1'
      }`}
      style={{
        left: 0,
        transform: `translate3d(${currentX}px, 0, 0)`,
      }}
    >
      {/* Natural Horse Gallop Container with Ground Shadow, Aura & Mounted TikTok Avatar */}
      <div className="relative flex items-end justify-center">
        {/* Dynamic Turf Contact Shadow Underneath Horse */}
        <div
          className={`horse-ground-shadow ${animClass}`}
          style={{
            width: shadowWidth,
          }}
        />

        {/* Background Particle Aura System */}
        <HorseParticleAura
          trailType={horse.skin.trailType}
          isRacing={isRacing}
          isNitro={horse.isNitro}
          color={horse.skin.themeColor}
          horseLevel={horse.skin.level}
        />

        {/* Turf Kickback Flecks When Racing */}
        {isRacing && !horse.finished && <div className="turf-dust-puff" />}

        {/* Nitro Burst Flame Ring */}
        {isRacing && horse.isNitro && (
          <div className="absolute inset-[-6px] rounded-full bg-gradient-to-r from-red-600/30 via-orange-500/30 to-amber-500/30 blur-md animate-ping pointer-events-none" />
        )}

        {/* Cyber scanline overlay for Level 6 */}
        {horse.skin.level === 6 && (
          <div className="absolute inset-0 cyber-scanlines rounded pointer-events-none z-10" />
        )}

        {/* User-Provided Authentic Horse Skin */}
        <div
          className={`horse-runner-wrapper ${animClass} tier-glow-${horse.skin.level} ${
            isRacing && horse.isNitro ? 'nitro-flame-glow' : ''
          }`}
        >
          {/* User's Original Horse Skin Image */}
          <img
            src={`/assets/skins/skin_${horse.skin.level}.png`}
            alt={horse.skin.name}
            referrerPolicy="no-referrer"
            className="horse-runner-img select-none pointer-events-none"
            style={{
              width: horseImgWidth,
            }}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (!target.src.endsWith('skin_1.png')) {
                target.src = '/assets/skins/skin_1.png';
              }
            }}
          />

          {/* TikTok User Avatar floating on the horse's back - nestled directly on the saddle */}
          <div
            className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: '46%', // Center of horse's back/saddle
              top: avatarTop,
              width: `${avatarSize}px`,
              height: `${avatarSize}px`,
            }}
          >
            <div
              className={`w-full h-full flex items-center justify-center rounded-full overflow-hidden shadow-md ${
                isRacing && horse.isNitro
                  ? 'border-2 border-amber-400 ring-1 ring-red-500/80 shadow-red-500/50'
                  : isVip
                  ? 'border-2 border-[#FFD700] ring-1 ring-amber-300 shadow-[0_0_10px_rgba(255,215,0,0.85)]'
                  : 'border border-white/90 ring-1 ring-black/50'
              }`}
            >
              {!imgError && avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={horse.username}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#f27d26] to-amber-500 text-slate-950 font-black text-[7px] flex items-center justify-center font-display uppercase">
                  {(horse.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Nitro Flame Icon Badge */}
            {isRacing && horse.isNitro && (
              <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 shadow-md border border-yellow-300 z-30">
                <Flame className="w-2 h-2 text-yellow-200 animate-pulse fill-yellow-300" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

