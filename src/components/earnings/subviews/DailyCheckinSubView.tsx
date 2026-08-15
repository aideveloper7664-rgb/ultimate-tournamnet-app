import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../../firebase';
import confetti from 'canvas-confetti';

interface DailyCheckinSubViewProps {
  onBack: () => void;
}

interface DayReward {
  day: number;
  amount: number;
  icon: string;
  badge?: string;
  tag?: string;
}

const REWARDS: DayReward[] = [
  { day: 1, amount: 2, icon: '🪙', tag: 'Start' },
  { day: 2, amount: 5, icon: '💵' },
  { day: 3, amount: 8, icon: '🎁', badge: 'Bonus' },
  { day: 4, amount: 12, icon: '💰' },
  { day: 5, amount: 18, icon: '💎', badge: 'Super' },
  { day: 6, amount: 25, icon: '🔥' },
  { day: 7, amount: 50, icon: '👑', badge: 'Mega Pot', tag: 'Jackpot' },
];

export const DailyCheckinSubView: React.FC<DailyCheckinSubViewProps> = ({ onBack }) => {
  const { currentUser, userProfile, reloadUserProfile } = useAuth();
  const [streak, setStreak] = useState<number>(0);
  const [canClaimToday, setCanClaimToday] = useState<boolean>(true);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimedTodayReward, setClaimedTodayReward] = useState<number | null>(null);
  const [totalClaimedHistory, setTotalClaimedHistory] = useState<number>(0);

  useEffect(() => {
    if (!currentUser) return;

    const checkStreakData = () => {
      const dataStr = localStorage.getItem(`daily_checkin_${currentUser.uid}`);
      if (!dataStr) {
        setStreak(0);
        setCanClaimToday(true);
        return;
      }

      try {
        const data = JSON.parse(dataStr);
        setTotalClaimedHistory(data.totalClaimedAllTime || 0);
        const lastDate = new Date(data.lastClaimDate);
        const today = new Date();

        const isSameDay = 
          lastDate.getFullYear() === today.getFullYear() &&
          lastDate.getMonth() === today.getMonth() &&
          lastDate.getDate() === today.getDate();

        if (isSameDay) {
          setStreak(data.currentStreak || 1);
          setCanClaimToday(false);
        } else {
          // Check if yesterday
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);
          const isYesterday =
            lastDate.getFullYear() === yesterday.getFullYear() &&
            lastDate.getMonth() === yesterday.getMonth() &&
            lastDate.getDate() === yesterday.getDate();

          if (isYesterday) {
            setStreak(data.currentStreak || 0);
            setCanClaimToday(true);
          } else {
            // Streak broken, reset to 0
            setStreak(0);
            setCanClaimToday(true);
          }
        }
      } catch (e) {
        console.error("Error parsing streak data:", e);
        setStreak(0);
        setCanClaimToday(true);
      }
    };

    checkStreakData();
  }, [currentUser]);

  const handleClaim = async () => {
    if (!canClaimToday || claiming || !currentUser) return;

    setClaiming(true);
    try {
      const nextDay = (streak % 7) + 1;
      const rewardDef = REWARDS[nextDay - 1];
      const amount = rewardDef.amount;

      // Update Firebase wallet
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snap = await get(userRef);
      const currentProf = snap.val() || {};
      const currentBonus = Number(currentProf.bonusCash || 0);
      const currentTotal = Number(currentProf.balance || 0);
      const currentEarn = Number(currentProf.totalEarnings || 0);

      await update(userRef, {
        bonusCash: currentBonus + amount,
        balance: currentTotal + amount,
        totalEarnings: currentEarn + amount
      });

      await recordTransaction(
        currentUser.uid,
        'bonus',
        amount,
        `🎁 Daily Check-in Day ${nextDay} Streak Reward`,
        { source: 'daily_checkin', day: nextDay }
      );

      // Save local streak state
      const newStreak = nextDay === 7 ? 0 : nextDay;
      const newTotal = totalClaimedHistory + amount;
      const dataToSave = {
        lastClaimDate: new Date().toISOString(),
        currentStreak: nextDay,
        totalClaimedAllTime: newTotal
      };
      localStorage.setItem(`daily_checkin_${currentUser.uid}`, JSON.stringify(dataToSave));

      setStreak(nextDay);
      setCanClaimToday(false);
      setClaimedTodayReward(amount);
      setTotalClaimedHistory(newTotal);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      await reloadUserProfile();
    } catch (err) {
      console.error("Error claiming checkin reward:", err);
    } finally {
      setClaiming(false);
    }
  };

  const currentActiveDay = canClaimToday ? (streak % 7) + 1 : streak % 7 || 7;

  return (
    <div className="min-h-full pb-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <button
          onClick={onBack}
          className="btn btn-outline-light btn-sm rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white/10 transition-colors"
        >
          <i className="bi bi-arrow-left text-emerald-400"></i> Back
        </button>
        <span className="text-white font-bold text-sm">Daily Streak</span>
        <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-xl font-bold">
          🔥 Day {streak}
        </span>
      </div>

      {/* Claimed banner */}
      {claimedTodayReward && (
        <div className="mb-3 p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-center">
          <span className="text-emerald-300 font-bold text-xs">
            🎉 ₹{claimedTodayReward} Credited to balance!
          </span>
        </div>
      )}

      {/* 7 Days Grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {REWARDS.map((r) => {
          const isPast = streak >= r.day;
          const isToday = currentActiveDay === r.day;

          return (
            <div
              key={r.day}
              className={`p-2.5 rounded-2xl border transition-all relative flex flex-col justify-between items-center text-center ${
                r.day === 7 ? 'col-span-2' : ''
              } ${
                isToday && canClaimToday
                  ? 'bg-emerald-950/40 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                  : isPast
                  ? 'bg-emerald-950/20 border-emerald-500/30 opacity-80'
                  : 'bg-zinc-900/60 border-white/5 opacity-50'
              }`}
              style={{ minHeight: '92px' }}
            >
              <div className="text-[11px] font-bold text-gray-300">
                Day {r.day}
              </div>

              <div className="text-xl my-0.5">{r.icon}</div>

              <div className="text-white font-black text-xs">
                ₹{r.amount}
              </div>

              <div className="text-[9px] font-bold">
                {isToday && canClaimToday ? (
                  <span className="text-emerald-400">Ready</span>
                ) : isPast ? (
                  <span className="text-emerald-500">✓ Done</span>
                ) : (
                  <span className="text-gray-500">🔒</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Claim Action Button */}
      <div className="p-3 bg-zinc-900/80 border border-white/10 rounded-2xl text-center">
        {canClaimToday ? (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="btn btn-success w-full py-2.5 rounded-2xl font-black text-white text-sm shadow-md hover:brightness-110 active:scale-95 transition-all"
          >
            {claiming ? 'Claiming...' : `CLAIM DAY ${currentActiveDay} (₹${REWARDS[currentActiveDay - 1]?.amount || 0}) ⚡`}
          </button>
        ) : (
          <div className="py-1">
            <div className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
              <i className="bi bi-check-circle-fill"></i> Claimed for Today
            </div>
            <p className="text-gray-400 text-[11px] mt-0.5 mb-0">
              Next reward available tomorrow
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
