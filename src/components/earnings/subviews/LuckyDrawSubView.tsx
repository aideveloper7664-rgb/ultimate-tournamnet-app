import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import confetti from 'canvas-confetti';

interface LuckyDrawSubViewProps {
  onBack: () => void;
}

interface JackpotPool {
  id: string;
  title: string;
  prize: string;
  entryFee: string;
  totalEntries: number;
  maxEntries: number;
  drawDate: string;
  bannerColor: string;
  icon: string;
}

const POOLS: JackpotPool[] = [
  { id: 'daily_500', title: 'Daily Flash Lucky Pot', prize: '₹500', entryFee: 'FREE', totalEntries: 342, maxEntries: 500, drawDate: 'Today 9:00 PM', bannerColor: 'from-amber-500/20 to-orange-500/10 border-amber-500/30', icon: '🎯' },
  { id: 'weekly_2500', title: 'Weekend Mega Bumper', prize: '₹2,500', entryFee: 'FREE PASS', totalEntries: 1205, maxEntries: 2000, drawDate: 'Sunday 11:59 PM', bannerColor: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30', icon: '💎' },
  { id: 'monthly_10k', title: 'Grand Royale Jackpot', prize: '₹10,000', entryFee: 'FREE PASS', totalEntries: 4890, maxEntries: 10000, drawDate: 'End of Month', bannerColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30', icon: '👑' },
];

export const LuckyDrawSubView: React.FC<LuckyDrawSubViewProps> = ({ onBack }) => {
  const { currentUser, userProfile } = useAuth();
  const [pools, setPools] = useState<JackpotPool[]>(POOLS);
  const [myTickets, setMyTickets] = useState<{ poolId: string; ticketNo: string; date: string }[]>([]);
  const [claimingPool, setClaimingPool] = useState<string | null>(null);

  // Load tickets
  useEffect(() => {
    if (!currentUser) return;
    const saved = localStorage.getItem(`my_lucky_tickets_${currentUser.uid}`);
    if (saved) {
      try {
        setMyTickets(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, [currentUser]);

  const handleClaimTicket = (pool: JackpotPool) => {
    if (!currentUser || claimingPool) return;

    setClaimingPool(pool.id);

    setTimeout(() => {
      const randomTicket = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      const newTicket = {
        poolId: pool.id,
        ticketNo: randomTicket,
        date: 'Just now'
      };

      const updated = [newTicket, ...myTickets];
      setMyTickets(updated);
      localStorage.setItem(`my_lucky_tickets_${currentUser.uid}`, JSON.stringify(updated));

      setPools(prev => prev.map(p => p.id === pool.id ? { ...p, totalEntries: p.totalEntries + 1 } : p));
      setClaimingPool(null);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 1000);
  };

  const hasClaimed = (poolId: string) => myTickets.some(t => t.poolId === poolId);

  return (
    <div className="min-h-full pb-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <button
          onClick={onBack}
          className="btn btn-outline-light btn-sm rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white/10 transition-colors"
        >
          <i className="bi bi-arrow-left text-purple-400"></i> Back
        </button>
        <span className="text-white font-bold text-sm">Lucky Draw</span>
        <span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs px-2.5 py-1 rounded-xl font-bold">
          {myTickets.length} Tickets
        </span>
      </div>

      {/* Pools List */}
      <div className="space-y-2.5 mb-4">
        {pools.map((p) => {
          const userTicket = myTickets.find(t => t.poolId === p.id);
          const percent = Math.min(100, Math.round((p.totalEntries / p.maxEntries) * 100));

          return (
            <div
              key={p.id}
              className={`p-3 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-sm relative overflow-hidden`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl p-1.5 bg-black/40 rounded-xl border border-white/5">
                    {p.icon}
                  </span>
                  <div>
                    <h5 className="text-white font-bold text-xs mb-0">{p.title}</h5>
                    <span className="text-gray-400 text-[10px]">
                      {p.drawDate}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 font-black text-sm block">{p.prize}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-2.5">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>{p.totalEntries} entries</span>
                  <span>{percent}%</span>
                </div>
                <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-gradient-to-r from-purple-500 to-amber-400 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                </div>
              </div>

              {/* Action / Ticket Display */}
              <div>
                {userTicket ? (
                  <div className="flex items-center justify-between py-1 bg-black/40 px-2.5 rounded-xl border border-white/5">
                    <span className="font-mono text-amber-400 text-[11px] font-bold">
                      🎟️ {userTicket.ticketNo}
                    </span>
                    <span className="text-emerald-400 text-[11px] font-bold">
                      ✓ Entered
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleClaimTicket(p)}
                    disabled={claimingPool === p.id}
                    className="btn btn-warning w-full py-2 rounded-xl font-black text-dark text-xs shadow-sm hover:brightness-110 active:scale-95 transition-all"
                  >
                    {claimingPool === p.id ? 'Claiming Ticket...' : 'Get Free Ticket ⚡'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
