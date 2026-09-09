import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { RaceWinnerInfo } from '../types.ts';
import { Trophy, Zap, Gift, Award } from 'lucide-react';

interface Props {
  winnerInfo: RaceWinnerInfo;
}

const PlayerPodiumAvatar: React.FC<{
  username: string;
  avatarUrl?: string;
  sizeClass: string;
  borderClass: string;
}> = ({ username, avatarUrl, sizeClass, borderClass }) => {
  const [imgError, setImgError] = useState(false);
  const src =
    !imgError && avatarUrl && avatarUrl.startsWith('http')
      ? avatarUrl
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username || 'U')}&backgroundColor=111215`;

  return (
    <div
      className={`${sizeClass} rounded-full ${borderClass} overflow-hidden bg-[#111215] shadow-lg flex items-center justify-center shrink-0`}
    >
      <img
        src={src}
        alt={username}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    </div>
  );
};

// Adaptive, wrap-friendly player name for the podium to prevent any username truncation
const PodiumPlayerName: React.FC<{
  username: string;
  isChampion?: boolean;
}> = ({ username, isChampion = false }) => {
  const cleanName = username.startsWith('@') ? username : `@${username}`;
  const length = cleanName.length;

  // Responsive font size and line-height based on username length:
  // Short (<=10): standard punchy typography
  // Medium (11-15): scaled down slightly with tight leading
  // Long (16+): compact font with 2-line break-word wrapping so no characters get truncated
  let fontClasses = '';
  if (isChampion) {
    if (length <= 10) {
      fontClasses = 'text-xs sm:text-sm font-black text-amber-200';
    } else if (length <= 15) {
      fontClasses = 'text-[11px] sm:text-xs font-black text-amber-200 leading-[1.15]';
    } else {
      fontClasses = 'text-[9.5px] sm:text-[10.5px] font-extrabold text-amber-200 leading-[1.1]';
    }
  } else {
    if (length <= 10) {
      fontClasses = 'text-[11px] sm:text-xs font-extrabold text-slate-100';
    } else if (length <= 15) {
      fontClasses = 'text-[10px] sm:text-[11px] font-bold text-slate-100 leading-[1.15]';
    } else {
      fontClasses = 'text-[9px] sm:text-[9.5px] font-bold text-slate-100 leading-[1.1]';
    }
  }

  return (
    <div
      className="w-full min-h-[30px] sm:min-h-[34px] flex items-center justify-center mt-1 px-0.5"
      title={cleanName}
    >
      <span
        className={`font-display text-center [word-break:break-word] break-words line-clamp-2 max-w-full select-all drop-shadow-sm ${fontClasses}`}
      >
        {cleanName}
      </span>
    </div>
  );
};

export const WinnerCeremonyModal: React.FC<Props> = ({ winnerInfo }) => {
  useEffect(() => {
    // Fire celebratory confetti cannons
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#ec4899', '#38bdf8', '#10b981'],
    });

    const interval = setInterval(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#fbbf24', '#f97316', '#ef4444'],
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#38bdf8', '#a855f7', '#10b981'],
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-gradient-to-b from-[#111215] via-[#0b0c0e] to-[#111215] border-2 border-[#f27d26]/80 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#f27d26] via-yellow-300 to-[#f27d26]" />
        <div className="absolute -top-24 w-72 h-72 bg-[#f27d26]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Ceremony Header */}
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-[#f27d26] shrink-0" />
          <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-200 to-[#f27d26] font-display uppercase text-center">
            VICTORY CEREMONY
          </h2>
          <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-[#f27d26] shrink-0" />
        </div>
        <p className="text-[11px] text-amber-300/80 font-mono mb-4 tracking-wide uppercase">
          CHAMPIONSHIP PODIUM &amp; MVPS
        </p>

        {/* 3-Step Podium Layout */}
        <div className="w-full flex items-end justify-center gap-2 mb-4 px-0.5">
          {/* 🥈 2nd Place Block (Silver) */}
          {winnerInfo.second ? (
            <div className="flex-1 min-w-0 flex flex-col items-center">
              <div className="text-xl mb-1">🥈</div>
              <div className="w-full bg-[#15171c]/95 border border-[#2d313b] rounded-t-xl p-2 sm:p-2.5 flex flex-col items-center text-center shadow-lg min-h-[142px] justify-between">
                <div className="w-full min-w-0 flex flex-col items-center">
                  <PlayerPodiumAvatar
                    username={winnerInfo.second.username}
                    avatarUrl={winnerInfo.second.avatarUrl}
                    sizeClass="w-12 h-12"
                    borderClass="border-2 border-slate-300 ring-2 ring-slate-400/30"
                  />
                  <PodiumPlayerName
                    username={winnerInfo.second.username}
                    isChampion={false}
                  />
                </div>
                <div className="mt-2 w-full bg-[#0d0f12] border border-slate-700 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-slate-200 truncate">
                  +{winnerInfo.second.points || 50} PTS
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0" />
          )}

          {/* 🥇 1st Place Block (Hero Center Champion) */}
          <div className="flex-1 min-w-0 max-w-[170px] flex flex-col items-center scale-105 z-10">
            <div className="text-2xl mb-1">🥇</div>
            <div className="w-full bg-gradient-to-b from-[#22160d] via-[#14151a] to-[#0a0b0d] border-2 border-[#f27d26] rounded-t-2xl p-2.5 flex flex-col items-center text-center shadow-2xl shadow-[#f27d26]/30 min-h-[158px] justify-between relative">
              <div className="w-full min-w-0 flex flex-col items-center">
                <PlayerPodiumAvatar
                  username={winnerInfo.first.username}
                  avatarUrl={winnerInfo.first.avatarUrl}
                  sizeClass="w-14 h-14"
                  borderClass="border-2 border-amber-400 ring-2 ring-[#f27d26]/60 shadow-lg shadow-[#f27d26]/40"
                />
                <PodiumPlayerName
                  username={winnerInfo.first.username}
                  isChampion={true}
                />
              </div>
              <div className="mt-2 w-full bg-gradient-to-r from-[#f27d26] to-amber-400 text-slate-950 px-2 py-0.5 rounded text-xs font-mono font-black shadow truncate">
                +{winnerInfo.first.points || 100} PTS
              </div>
            </div>
          </div>

          {/* 🥉 3rd Place Block (Bronze) */}
          {winnerInfo.third ? (
            <div className="flex-1 min-w-0 flex flex-col items-center">
              <div className="text-xl mb-1">🥉</div>
              <div className="w-full bg-[#15171c]/90 border border-[#2d313b] rounded-t-xl p-2 sm:p-2.5 flex flex-col items-center text-center shadow-lg min-h-[136px] justify-between">
                <div className="w-full min-w-0 flex flex-col items-center">
                  <PlayerPodiumAvatar
                    username={winnerInfo.third.username}
                    avatarUrl={winnerInfo.third.avatarUrl}
                    sizeClass="w-11 h-11"
                    borderClass="border-2 border-amber-700 ring-2 ring-amber-800/30"
                  />
                  <PodiumPlayerName
                    username={winnerInfo.third.username}
                    isChampion={false}
                  />
                </div>
                <div className="mt-2 w-full bg-[#0d0f12] border border-amber-900/50 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-amber-400 truncate">
                  +{winnerInfo.third.points || 25} PTS
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0" />
          )}
        </div>

        {/* Community MVP Supporters (Top Tapper & Top Gifter) */}
        <div className="w-full bg-[#111215]/95 border border-[#23262d] rounded-xl p-2.5 flex flex-col gap-2 shadow-inner">
          <div className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider font-display flex items-center gap-1.5 border-b border-[#23262d] pb-1">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span>COMMUNITY MVPS</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Top Tapper MVP */}
            <div className="bg-[#0b0c0e] border border-[#23262d] rounded-lg p-2 flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#f27d26]/15 border border-[#f27d26]/40 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-[#f27d26] fill-[#f27d26]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-display truncate">
                  TOP TAPPER
                </span>
                {winnerInfo.mvp.topTapper ? (
                  <span
                    className={`font-bold text-slate-100 font-display break-words [word-break:break-word] line-clamp-1 leading-tight ${
                      winnerInfo.mvp.topTapper.username.length > 12 ? 'text-[10px]' : 'text-xs'
                    }`}
                    title={`@${winnerInfo.mvp.topTapper.username}`}
                  >
                    @{winnerInfo.mvp.topTapper.username}
                  </span>
                ) : (
                  <span className="font-bold text-slate-400 font-display text-xs truncate">No Taps</span>
                )}
                <span className="text-[10px] text-amber-400 font-mono font-semibold truncate">
                  {winnerInfo.mvp.topTapper ? `${winnerInfo.mvp.topTapper.taps} Taps` : '0 Taps'}
                </span>
              </div>
            </div>

            {/* Top Gifter MVP */}
            <div className="bg-[#0b0c0e] border border-[#23262d] rounded-lg p-2 flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shrink-0">
                <Gift className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-display truncate">
                  TOP GIFTER
                </span>
                {winnerInfo.mvp.topGifter ? (
                  <span
                    className={`font-bold text-slate-100 font-display break-words [word-break:break-word] line-clamp-1 leading-tight ${
                      winnerInfo.mvp.topGifter.username.length > 12 ? 'text-[10px]' : 'text-xs'
                    }`}
                    title={`@${winnerInfo.mvp.topGifter.username}`}
                  >
                    @{winnerInfo.mvp.topGifter.username}
                  </span>
                ) : (
                  <span className="font-bold text-slate-400 font-display text-xs truncate">No Gifts</span>
                )}
                <span className="text-[10px] text-rose-300 font-mono font-semibold truncate">
                  {winnerInfo.mvp.topGifter
                    ? `${winnerInfo.mvp.topGifter.gifts}x (${winnerInfo.mvp.topGifter.value} 💎)`
                    : '0 Gifts'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
