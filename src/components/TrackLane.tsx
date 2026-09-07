import React from 'react';
import { RaceHorse } from '../types.ts';
import { HorseRunner } from './HorseRunner.tsx';

interface Props {
  horse: RaceHorse;
  isRacing: boolean;
  isLobby: boolean;
  laneIndex: number;
  totalLanes: number;
  onTap: () => void;
}

export const TrackLane: React.FC<Props> = ({
  horse,
  isRacing,
  isLobby,
  laneIndex,
  totalLanes,
  onTap,
}) => {
  // Alternate subtle clay track striping for depth
  const isEven = laneIndex % 2 === 0;
  const isVip = !!(horse.is_vip || horse.isVip);
  const isLarge = totalLanes <= 3;
  const isMedium = totalLanes >= 4 && totalLanes <= 6;
  const tierClass = isLarge ? 'tier-large' : isMedium ? 'tier-medium' : 'tier-compact';

  return (
    <div
      onClick={onTap}
      className={`lane track-lane race-lane-item relative w-[2500px] flex-1 flex items-end border-b border-white/85 overflow-visible cursor-pointer select-none transition-colors ${
        isEven ? 'track-turf' : 'track-sand'
      } ${tierClass}`}
      style={{ minHeight: 0 }}
    >
      {/* Top Boundary Line: White for Lane 1 */}
      {laneIndex === 0 && (
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white z-20 pointer-events-none shadow-sm" />
      )}

      {/* Finish Line Strip at Far Right (2420px - 100% position) - Clean Checker Pattern */}
      <div className="absolute left-[2420px] top-0 bottom-0 w-10 finish-line-pattern border-l-[3px] border-[#f27d26] z-10 opacity-95 shadow-[0_0_15px_rgba(242,125,38,0.6)] pointer-events-none" />

      {/* Horse Runner Component (EXACTLY ONE per lane) */}
      <HorseRunner
        horse={horse}
        isRacing={isRacing}
        isLobby={isLobby}
        totalLanes={totalLanes}
        onTap={onTap}
      />
    </div>
  );
};
