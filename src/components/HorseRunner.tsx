import React, { useState, useEffect, useRef } from 'react';
import { RaceHorse } from '../types.ts';
import { HorseParticleAura } from './HorseParticleAura.tsx';
import { Flame } from 'lucide-react';

interface Props {
  horse: RaceHorse;
  isRacing: boolean;
  isLobby: boolean;
  totalLanes?: number;
  laneHeight?: number;
  horseScaleMultiplier?: number;
  onTap?: () => void;
}

export const HorseRunner: React.FC<Props> = ({
  horse,
  isRacing,
  isLobby,
  totalLanes = 6,
  laneHeight = 0,
  horseScaleMultiplier = 1.0,
  onTap,
}) => {
  const [imgError, setImgError] = useState(false);
  const isVip = !!(horse.is_vip || horse.isVip);

  // Proportional dynamic scaling: scales horse, mounted avatar, and turf shadow directly with lane height!
  // This guarantees horses are crisp and prominent on OBS / TikTok Live streams (no longer tiny specks)
  // while scaling down comfortably in smaller preview windows (no longer oversized).
  const scale = React.useMemo(() => {
    const scaleMult = horseScaleMultiplier || 1.0;
    
    // If laneHeight is known (from dynamic measurement), compute directly from lane height
    if (laneHeight && laneHeight > 0) {
      // 82% of lane height allows the horse to be bold and prominent with clean jockey clearance
      const horseHeight = Math.max(26, Math.min(240, Math.round(laneHeight * 0.82 * scaleMult)));
      const horseWidth = Math.round(horseHeight * 1.358);
      const avatarSize = Math.max(16, Math.min(48, Math.round(horseHeight * 0.28)));
      const shadowWidth = Math.round(horseWidth * 0.85);
      const avatarTop = `${Math.max(2, Math.round(horseHeight * 0.08))}px`;
      return { horseWidth, horseHeight, avatarSize, shadowWidth, avatarTop };
    }

    // Adaptive fallback based on totalLanes
    const estimatedLaneHeight = Math.max(40, Math.min(140, 520 / Math.max(2, totalLanes)));
    const horseHeight = Math.max(26, Math.round(estimatedLaneHeight * 0.82 * scaleMult));
    const horseWidth = Math.round(horseHeight * 1.358);
    const avatarSize = Math.max(16, Math.min(48, Math.round(horseHeight * 0.28)));
    const shadowWidth = Math.round(horseWidth * 0.85);
    const avatarTop = `${Math.max(2, Math.round(horseHeight * 0.08))}px`;
    return { horseWidth, horseHeight, avatarSize, shadowWidth, avatarTop };
  }, [laneHeight, totalLanes, horseScaleMultiplier]);

  const horseImgWidth = `${scale.horseWidth}px`;
  const horseImgHeight = `${scale.horseHeight}px`;
  const avatarSize = scale.avatarSize;
  const shadowWidth = `${scale.shadowWidth}px`;
  const avatarTop = scale.avatarTop;
  const tierClass = totalLanes <= 3 ? 'tier-large' : totalLanes <= 6 ? 'tier-medium' : 'tier-compact';

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
      className={`absolute cursor-pointer z-30 select-none flex flex-col items-center will-change-transform overflow-visible ${tierClass} ${
        totalLanes <= 3 ? 'bottom-0.5' : 'bottom-0'
      }`}
      style={{
        left: 0,
        transform: `translate3d(${currentX}px, 0, 0)`,
      }}
    >
      {/* Natural Horse Gallop Container with Ground Shadow, Aura & Mounted TikTok Avatar */}
      <div className="relative flex items-end justify-center overflow-visible" style={{ overflow: 'visible' }}>
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
          className={`horse-runner-wrapper ${animClass} tier-glow-${horse.skin.level} overflow-visible ${
            isRacing && horse.isNitro ? 'nitro-flame-glow' : ''
          }`}
          style={{ overflow: 'visible' }}
        >
          {/* User's Original Horse Skin Image */}
          <img
            src={`/assets/skins/skin_${horse.skin.level}.png`}
            alt={horse.skin.name}
            referrerPolicy="no-referrer"
            className="horse-runner-img select-none pointer-events-none"
            style={{
              width: horseImgWidth,
              height: horseImgHeight,
              objectFit: 'contain',
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
            className="absolute pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 overflow-visible"
            style={{
              left: '46%', // Center of horse's back/saddle
              top: avatarTop,
              width: `${avatarSize}px`,
              height: `${avatarSize}px`,
              overflow: 'visible',
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

