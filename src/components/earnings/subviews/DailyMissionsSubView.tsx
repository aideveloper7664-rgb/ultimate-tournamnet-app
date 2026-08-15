import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../../firebase';
import confetti from 'canvas-confetti';

interface DailyMissionsSubViewProps {
  onBack: () => void;
  onNavigateHub: (hubId: string) => void;
}

interface Mission {
  id: string;
  title: string;
  desc: string;
  reward: number;
  progress: number;
  total: number;
  completed: boolean;
  claimed: boolean;
  hubTarget?: string;
  sectionTarget?: string;
}

const DEFAULT_MISSIONS: Mission[] = [
  { id: 'm1', title: 'Daily App Login', desc: 'Open and explore app features today', reward: 5, progress: 1, total: 1, completed: true, claimed: false },
  { id: 'm2', title: 'Spin the Fortune Wheel', desc: 'Test your luck with 1 daily spin', reward: 10, progress: 1, total: 1, completed: true, claimed: false, hubTarget: 'spin' },
  { id: 'm3', title: 'Scratch 1 Foil Card', desc: 'Reveal cash from any scratch card', reward: 10, progress: 0, total: 1, completed: false, claimed: false, hubTarget: 'scratch' },
  { id: 'm4', title: 'Play Speed Tap Mini Game', desc: 'Score at least 20 taps in Play & Earn', reward: 15, progress: 0, total: 1, completed: false, claimed: false, hubTarget: 'play_earn' },
  { id: 'm5', title: 'Join Any Esports Contest', desc: 'Enter any Free or Paid match room', reward: 25, progress: 0, total: 1, completed: false, claimed: false, sectionTarget: 'tournaments-section' },
  { id: 'm6', title: 'Share Referral With 1 Friend', desc: 'Send your referral link on WhatsApp', reward: 10, progress: 0, total: 1, completed: false, claimed: false, hubTarget: 'refer' }
];

export const DailyMissionsSubView: React.FC<DailyMissionsSubViewProps> = ({ onBack, onNavigateHub }) => {
  const { currentUser, reloadUserProfile, showSection } = useAuth();
  const [missions, setMissions] = useState<Mission[]>(DEFAULT_MISSIONS);
  const [claiming, setClaiming] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
    if (!currentUser) return;
    const saved = localStorage.getItem(`daily_missions_${currentUser.uid}`);
    if (saved) {
      try {
        setMissions(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, [currentUser]);

  const handleClaim = async (mission: Mission) => {
    if (!currentUser || claiming || !mission.completed || mission.claimed) return;

    setClaiming(mission.id);
    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snap = await get(userRef);
      const currentProf = snap.val() || {};
      const currentBonus = Number(currentProf.bonusCash || 0);
      const currentTotal = Number(currentProf.balance || 0);
      const currentEarn = Number(currentProf.totalEarnings || 0);

      await update(userRef, {
        bonusCash: currentBonus + mission.reward,
        balance: currentTotal + mission.reward,
        totalEarnings: currentEarn + mission.reward
      });

      await recordTransaction(
        currentUser.uid,
        'bonus',
        mission.reward,
        `🔥 Daily Mission Completed: ${mission.title}`,
        { source: 'daily_mission', missionId: mission.id }
      );

      const updated = missions.map(m => m.id === mission.id ? { ...m, claimed: true } : m);
      setMissions(updated);
      localStorage.setItem(`daily_missions_${currentUser.uid}`, JSON.stringify(updated));

      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 }
      });

      await reloadUserProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setClaiming(null);
    }
  };

  const handleAction = (m: Mission) => {
    if (m.hubTarget) {
      onNavigateHub(m.hubTarget);
    } else if (m.sectionTarget) {
      showSection(m.sectionTarget);
    }
  };

  const completedCount = missions.filter(m => m.completed || m.claimed).length;
  const totalCount = missions.length;

  return (
    <div className="min-h-full pb-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <button
          onClick={onBack}
          className="btn btn-outline-light btn-sm rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white/10 transition-colors"
        >
          <i className="bi bi-arrow-left text-orange-400"></i> Back
        </button>
        <span className="text-white font-bold text-sm">Daily Missions</span>
        <span className="badge bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs px-2.5 py-1 rounded-xl font-bold">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Missions List */}
      <div className="space-y-2 mb-4">
        {missions.map((m) => (
          <div
            key={m.id}
            className="p-3 bg-zinc-900/90 border border-white/5 rounded-2xl flex items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h6 className="text-white font-bold text-xs truncate mb-0">{m.title}</h6>
                <span className="text-amber-400 font-extrabold text-[11px]">
                  +₹{m.reward}
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                <div className="w-20 bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-orange-500 h-full rounded-full"
                    style={{ width: `${(m.progress / m.total) * 100}%` }}
                  ></div>
                </div>
                <span>{m.progress}/{m.total}</span>
              </div>
            </div>

            {/* Action/Claim Button */}
            <div>
              {m.claimed ? (
                <span className="text-emerald-400 text-xs font-bold px-2 py-1">
                  ✓ Claimed
                </span>
              ) : m.completed ? (
                <button
                  onClick={() => handleClaim(m)}
                  disabled={claiming === m.id}
                  className="btn btn-warning btn-sm font-black text-dark rounded-xl px-3 py-1 text-xs shadow-sm hover:scale-105 active:scale-95 transition-all"
                >
                  {claiming === m.id ? '...' : 'Claim ⚡'}
                </button>
              ) : (
                <button
                  onClick={() => handleAction(m)}
                  className="btn btn-outline-warning btn-sm font-bold rounded-xl px-2.5 py-1 text-xs"
                >
                  Go →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
