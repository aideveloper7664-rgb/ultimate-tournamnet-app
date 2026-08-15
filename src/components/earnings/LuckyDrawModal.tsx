import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';

interface LuckyDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DrawPool {
  id: string;
  title: string;
  prizePool: number;
  entryType: 'free' | 'ticket';
  totalEntries: number;
  endsInSeconds: number;
  winnerCount: number;
  color: string;
}

const POOLS: DrawPool[] = [
  { id: 'daily_mega', title: 'Daily Mega Jackpot', prizePool: 2500, entryType: 'free', totalEntries: 482, endsInSeconds: 18450, winnerCount: 5, color: '#F59E0B' },
  { id: 'weekly_king', title: 'Weekly Royal Bonanza', prizePool: 10000, entryType: 'free', totalEntries: 1240, endsInSeconds: 182400, winnerCount: 10, color: '#8B5CF6' },
  { id: 'instant_clash', title: 'Hourly Cash Splash', prizePool: 500, entryType: 'free', totalEntries: 96, endsInSeconds: 2100, winnerCount: 3, color: '#10B981' }
];

export const LuckyDrawModal: React.FC<LuckyDrawModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [joinedPools, setJoinedPools] = useState<Record<string, number>>({});
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`lucky_draws_${currentUser.uid}`);
      if (saved) {
        try {
          setJoinedPools(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, [currentUser, isOpen]);

  const handleJoinPool = (pool: DrawPool) => {
    if (!currentUser || joiningId) return;
    setJoiningId(pool.id);

    setTimeout(() => {
      const currentTickets = joinedPools[pool.id] || 0;
      const updated = { ...joinedPools, [pool.id]: currentTickets + 1 };
      setJoinedPools(updated);
      localStorage.setItem(`lucky_draws_${currentUser.uid}`, JSON.stringify(updated));
      setJoiningId(null);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 800);
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3 z-50">
      <div 
        className="modal-content-custom w-100 rounded-4 overflow-hidden shadow-2xl border border-yellow-500/30 position-relative"
        style={{
          maxWidth: '460px',
          background: 'linear-gradient(180deg, #1e1b4b 0%, #09090b 100%)'
        }}
      >
        {/* Header */}
        <div className="p-4 d-flex align-items-center justify-content-between border-b border-white/10 bg-black/40">
          <div className="d-flex align-items-center gap-2.5">
            <span className="text-2xl">🎯</span>
            <div>
              <h5 className="mb-0 text-white font-extrabold text-base flex items-center gap-2">
                Lucky Draw Pools
                <span className="badge bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Free Entries
                </span>
              </h5>
              <p className="text-gray-400 text-xs mb-0">Join jackpot lotteries & win up to ₹10,000 cash!</p>
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
          {POOLS.map((pool) => {
            const myTickets = joinedPools[pool.id] || 0;
            const isJoining = joiningId === pool.id;

            return (
              <div 
                key={pool.id}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden transition-all hover:border-amber-500/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{ background: `${pool.color}25`, color: pool.color, border: `1px solid ${pool.color}50` }}
                    >
                      🎯
                    </div>
                    <div>
                      <h6 className="text-white font-bold text-sm mb-0">{pool.title}</h6>
                      <span className="text-gray-400 text-[11px]">
                        {pool.winnerCount} Lucky Winners • {pool.totalEntries + (myTickets > 0 ? 1 : 0)} Participants
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 font-extrabold text-base block">
                      ₹{pool.prizePool.toLocaleString()}
                    </span>
                    <span className="text-emerald-400 text-[10px] font-bold uppercase">
                      Prize Pool
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
                  <div className="text-gray-400 flex items-center gap-1">
                    <i className="bi bi-stopwatch text-amber-400"></i>
                    <span>Draw in: <strong className="text-white">{formatTimer(pool.endsInSeconds)}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    {myTickets > 0 && (
                      <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-1 rounded-full font-bold">
                        🎟️ {myTickets} Ticket
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isJoining || myTickets >= 3}
                      onClick={() => handleJoinPool(pool)}
                      className={`btn btn-sm py-1 px-3 rounded-xl font-bold text-xs ${
                        myTickets >= 3
                          ? 'btn-secondary text-gray-400 opacity-60'
                          : 'btn-warning text-dark shadow-sm'
                      }`}
                    >
                      {isJoining ? (
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                      ) : myTickets >= 3 ? (
                        'Max Tickets'
                      ) : myTickets > 0 ? (
                        '+ Add Ticket (Free)'
                      ) : (
                        'Claim Free Ticket 🎯'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Recent Winners Hall */}
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5 mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span className="font-bold text-white flex items-center gap-1">
                <i className="bi bi-award-fill text-amber-400"></i> Recent Lucky Winners
              </span>
              <span className="text-emerald-400 font-semibold text-[10px]">Verified Payouts</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-gray-300 bg-white/5 px-2.5 py-1.5 rounded-lg">
                <span className="truncate max-w-[160px]">🏆 rohit_gamer99 (Mega Pot)</span>
                <span className="text-emerald-400 font-bold">+ ₹2,500</span>
              </div>
              <div className="flex items-center justify-between text-gray-300 bg-white/5 px-2.5 py-1.5 rounded-lg">
                <span className="truncate max-w-[160px]">👑 vikram_pro (Hourly Splash)</span>
                <span className="text-emerald-400 font-bold">+ ₹500</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
