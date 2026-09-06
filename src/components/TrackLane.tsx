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

  return (
    <div
      onClick={onTap}
      className={`lane track-lane relative w-[2500px] flex-1 flex items-end border-b-2 ${
        isVip
          ? 'border-[#FFD700] shadow-[0_1px_10px_rgba(255,215,0,0.65)]'
          : 'border-white'
      } overflow-visible cursor-pointer select-none transition-colors ${
        isEven ? 'track-turf' : 'track-sand'
      } ${isVip ? 'vip-lane' : ''}`}
      style={{ minHeight: 0 }}
    >
      {/* Top Boundary Line: Gold for VIP Lane or White for Lane 1 */}
      {isVip ? (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.75)] z-20 pointer-events-none" />
      ) : (
        laneIndex === 0 && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white z-20 pointer-events-none shadow-sm" />
        )
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

