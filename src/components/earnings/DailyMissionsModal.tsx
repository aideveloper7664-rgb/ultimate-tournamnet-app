import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../firebase';
import confetti from 'canvas-confetti';

interface DailyMissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Mission {
  id: string;
  title: string;
  desc: string;
  reward: number;
  icon: string;
  target: number;
  current: number;
  claimed: boolean;
}

const INITIAL_MISSIONS: Mission[] = [
  { id: 'm1', title: 'Daily App Login', desc: 'Open app & check live tournaments', reward: 3, icon: '📱', target: 1, current: 1, claimed: false },
  { id: 'm2', title: 'Spin the Fortune Wheel', desc: 'Complete 1 lucky spin today', reward: 5, icon: '🎡', target: 1, current: 1, claimed: false },
  { id: 'm3', title: 'Join Any Tournament', desc: 'Participate in any solo or squad match', reward: 12, icon: '⚔️', target: 1, current: 0, claimed: false },
  { id: 'm4', title: 'Score 3 Kills in Contests', desc: 'Show off your combat skills', reward: 20, icon: '🎯', target: 3, current: 1, claimed: false },
  { id: 'm5', title: 'Share Referral with a Friend', desc: 'Invite friends to play and earn', reward: 25, icon: '👥', target: 1, current: 0, claimed: false }
];

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, reloadUserProfile } = useAuth();
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const saved = localStorage.getItem(`daily_missions_${currentUser.uid}`);
    if (saved) {
      try {
        setMissions(JSON.parse(saved));
      } catch (e) {
        setMissions(INITIAL_MISSIONS);
      }
    } else {
      setMissions(INITIAL_MISSIONS);
    }
  }, [currentUser, isOpen]);

  const handleClaim = async (m: Mission) => {
    if (!currentUser || m.claimed || m.current < m.target || claimingId) return;
    setClaimingId(m.id);

    try {
      // 1. Credit wallet
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snap = await get(userRef);
      const currentProf = snap.val() || {};
      const currentBonus = Number(currentProf.bonusCash || 0);
      const currentTotal = Number(currentProf.balance || 0);
      const currentEarn = Number(currentProf.totalEarnings || 0);

      await update(userRef, {
        bonusCash: currentBonus + m.reward,
        balance: currentTotal + m.reward,
        totalEarnings: currentEarn + m.reward
      });

      // 2. Transaction
      await recordTransaction(
        currentUser.uid,
        'bonus',
        m.reward,
        `🔥 Daily Mission Completed: ${m.title}`,
        { missionId: m.id, source: 'daily_mission' }
      );

      const updated = missions.map(item => item.id === m.id ? { ...item, claimed: true } : item);
      setMissions(updated);
      localStorage.setItem(`daily_missions_${currentUser.uid}`, JSON.stringify(updated));

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });

      await reloadUserProfile();
    } catch (err) {
      console.error("Mission claim error:", err);
    } finally {
      setClaimingId(null);
    }
  };

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
            <span className="text-2xl">🔥</span>
            <div>
              <h5 className="mb-0 text-white font-extrabold text-base flex items-center gap-2">
                Daily Missions
                <span className="badge bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Reset at 12 AM
                </span>
              </h5>
              <p className="text-gray-400 text-xs mb-0">Complete tasks to earn bonus cash every day!</p>
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
          {missions.map((m) => {
            const isCompleted = m.current >= m.target;
            const progressPercent = Math.min(100, Math.round((m.current / m.target) * 100));

            return (
              <div 
                key={m.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  m.claimed
                    ? 'bg-white/5 border-white/5 opacity-70'
                    : isCompleted
                    ? 'bg-amber-950/30 border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl flex-shrink-0">
                      {m.icon}
                    </div>
                    <div>
                      <h6 className="text-white font-bold text-sm mb-0.5">{m.title}</h6>
                      <p className="text-gray-400 text-xs mb-1.5">{m.desc}</p>
                      
                      {/* Progress Bar */}
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-white font-bold">{m.current}/{m.target}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-amber-400 font-black text-sm mb-1.5">
                      +₹{m.reward}
                    </div>

                    {m.claimed ? (
                      <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-1 rounded-full font-bold">
                        Claimed ✓
                      </span>
                    ) : isCompleted ? (
                      <button
                        type="button"
                        disabled={claimingId === m.id}
                        onClick={() => handleClaim(m)}
                        className="btn btn-warning btn-sm py-1 px-3 rounded-xl font-bold text-xs text-dark shadow-sm animate-pulse"
                      >
                        {claimingId === m.id ? (
                          <div className="spinner-border spinner-border-sm" role="status"></div>
                        ) : (
                          'Claim 🎁'
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-500 font-semibold">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
