import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { HORSE_SKINS, getSkinByLevel } from '../skinsData.ts';

interface Props {
  unlockInfo: {
    username: string;
    unlockedLevel: number;
    skinName: string;
    skinImage: string;
  };
}

export const UnlockCeremonyModal: React.FC<Props> = ({ unlockInfo }) => {
  const skin = getSkinByLevel(unlockInfo.unlockedLevel);

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#a855f7', '#ec4899', '#38bdf8', '#fbbf24'],
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-400 font-sans">
      <div className="bg-gradient-to-b from-[#181120] via-[#0f0c14] to-[#111215] border-2 border-purple-500/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        {/* Glowing Background Radial */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-center gap-2 mb-2 z-10">
          <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-purple-300 font-display">
            LEGENDARY PROGRESSION UNLOCKED
          </span>
          <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
        </div>

        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-300 to-amber-300 font-display uppercase mb-1 z-10">
          TIER {skin.level} UNLOCKED!
        </h2>

        <p className="text-sm font-bold text-slate-300 font-display mb-4 z-10">
          Congratulations <span className="text-purple-300">@{unlockInfo.username}</span>!
        </p>

        {/* Horse Skin Artwork Container */}
        <div className="relative my-4 p-4 rounded-2xl bg-[#0b0a10]/90 border border-purple-500/40 shadow-2xl flex flex-col items-center justify-center w-64 h-48">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 rounded-2xl blur-md" />
          <img
            src={`/assets/skins/skin_${skin.level}.png`}
            alt={skin.name}
            referrerPolicy="no-referrer"
            className="w-36 h-auto object-contain z-10 animate-pulse drop-shadow-[0_0_25px_rgba(168,85,247,0.8)]"
          />
          <div className="mt-2 text-base font-black text-amber-300 font-display uppercase tracking-wide z-10">
            {skin.name}
          </div>
        </div>

        {/* Unlocked Stats: MAX STAMINA only */}
        <div className="w-full my-3 z-10 text-xs">
          <div className="bg-[#111215]/90 border border-[#23262d] rounded-xl p-3 flex items-center justify-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-400 font-semibold font-display uppercase tracking-wider">MAX STAMINA</span>
              <span className="font-bold text-emerald-300 font-mono text-sm">{skin.maxStamina} STA</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-[#111215]/80 border border-[#23262d] rounded-xl p-2.5 z-10 text-[11px] text-purple-200/90 text-left">
          <span className="font-bold text-purple-300">Aura Effect:</span> {skin.auraDescription}
        </div>
      </div>
    </div>
  );
};
