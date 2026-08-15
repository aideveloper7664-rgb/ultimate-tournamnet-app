import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface LeaderboardRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RankTier {
  rank: string;
  prize: string;
  icon: string;
  badge: string;
  bg: string;
}

const TIERS: RankTier[] = [
  { rank: 'Rank 1', prize: '₹5,000 Cash', icon: '👑', badge: 'Champion', bg: 'from-amber-500/20 to-yellow-500/10 border-amber-500/50' },
  { rank: 'Rank 2', prize: '₹2,500 Cash', icon: '🥈', badge: 'Grand Master', bg: 'from-slate-400/20 to-slate-500/10 border-slate-400/40' },
  { rank: 'Rank 3', prize: '₹1,000 Cash', icon: '🥉', badge: 'Master', bg: 'from-amber-700/20 to-yellow-800/10 border-amber-700/40' },
  { rank: 'Rank 4 - 10', prize: '₹500 Each', icon: '⭐', badge: 'Elite Top 10', bg: 'from-purple-500/15 to-indigo-500/10 border-purple-500/30' },
  { rank: 'Rank 11 - 50', prize: '₹100 Bonus', icon: '🎖️', badge: 'Challenger', bg: 'from-white/5 to-white/5 border-white/10' },
];

export const LeaderboardRewardsModal: React.FC<LeaderboardRewardsModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, showSection } = useAuth();
  const myRank = userProfile?.leaderboardRank || 42;

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3 z-50">
      <div 
        className="modal-content-custom w-100 rounded-4 overflow-hidden shadow-2xl border border-yellow-500/30 position-relative"
        style={{
          maxWidth: '460px',
          background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)'
        }}
      >
        {/* Header */}
        <div className="p-4 d-flex align-items-center justify-content-between border-b border-white/10 bg-amber-950/30">
          <div className="d-flex align-items-center gap-2.5">
            <span className="text-2xl">🏆</span>
            <div>
              <h5 className="mb-0 text-white font-extrabold text-base flex items-center gap-2">
                Leaderboard Rewards
                <span className="badge bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Weekly Payout
                </span>
              </h5>
              <p className="text-gray-400 text-xs mb-0">Top ranked players win huge cash pool every Sunday!</p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-close btn-close-white opacity-75 hover:opacity-100 transition-opacity"
            onClick={onClose}
          ></button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[75vh] overflow-y-auto custom-scroll space-y-3">
          {/* User Current Standing */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-500/40 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-base">
                #{myRank}
              </div>
              <div>
                <span className="text-xs text-gray-300 font-bold block">Your Current Rank</span>
                <span className="text-amber-400 text-[11px] font-medium">Eligible for ₹100 Challenger Reward</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); showSection('leaderboard-section'); }}
              className="btn btn-warning btn-sm font-bold text-dark rounded-xl px-3 py-1 text-xs"
            >
              View Ranks →
            </button>
          </div>

          {/* Prize Tiers */}
          <div className="space-y-2">
            <h6 className="text-white text-xs font-bold uppercase tracking-wider mb-2">Weekly Prize Distribution</h6>
            {TIERS.map((tier, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-2xl bg-gradient-to-r ${tier.bg} border flex items-center justify-between`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{tier.icon}</span>
                  <div>
                    <div className="text-white font-bold text-sm">{tier.rank}</div>
                    <span className="text-gray-400 text-[11px] font-medium">{tier.badge}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 font-extrabold text-sm block">{tier.prize}</span>
                  <span className="text-emerald-400 text-[10px] font-semibold uppercase">Auto-Credited</span>
                </div>
              </div>
            ))}
          </div>

          {/* Rules info */}
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5 text-[11px] text-gray-400 space-y-1">
            <div className="flex items-center gap-1 text-white font-bold">
              <i className="bi bi-clock-history text-amber-400"></i> Payout Cycle
            </div>
            <p className="mb-0">
              Leaderboard closes every Sunday at 11:59 PM. Cash rewards are directly credited to winning players' vault balance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
