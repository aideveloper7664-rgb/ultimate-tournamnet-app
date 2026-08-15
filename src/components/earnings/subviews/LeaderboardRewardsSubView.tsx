import React from 'react';
import { useAuth } from '../../../context/AuthContext';

interface LeaderboardRewardsSubViewProps {
  onBack: () => void;
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

export const LeaderboardRewardsSubView: React.FC<LeaderboardRewardsSubViewProps> = ({ onBack }) => {
  const { userProfile, showSection } = useAuth();
  const myRank = userProfile?.leaderboardRank || 42;

  return (
    <div className="min-h-full pb-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <button
          onClick={onBack}
          className="btn btn-outline-light btn-sm rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white/10 transition-colors"
        >
          <i className="bi bi-arrow-left text-yellow-400"></i> Back
        </button>
        <span className="text-white font-bold text-sm">Leaderboard Rewards</span>
        <span className="badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs px-2.5 py-1 rounded-xl font-bold">
          Rank #{myRank}
        </span>
      </div>

      {/* User Standing Card */}
      <div className="p-3 bg-zinc-900/90 border border-white/10 rounded-2xl mb-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-sm">
            #{myRank}
          </div>
          <div>
            <span className="text-xs text-white font-bold block">Your Standing</span>
            <span className="text-amber-400 text-[11px]">₹100 Challenger Tier</span>
          </div>
        </div>
        <button
          onClick={() => showSection('leaderboard-section')}
          className="btn btn-warning btn-sm font-black text-dark rounded-xl px-3 py-1.5 text-xs"
        >
          View Full Board →
        </button>
      </div>

      {/* Tiers Distribution */}
      <div className="space-y-2 mb-4">
        {TIERS.map((tier, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-xl bg-zinc-900/80 border border-white/5 flex items-center justify-between`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{tier.icon}</span>
              <div>
                <div className="text-white font-bold text-xs">{tier.rank}</div>
                <span className="text-gray-400 text-[10px]">{tier.badge}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-amber-400 font-bold text-xs">{tier.prize}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
