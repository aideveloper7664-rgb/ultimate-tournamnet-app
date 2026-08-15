import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../firebase';
import confetti from 'canvas-confetti';

interface DailyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DayReward {
  day: number;
  amount: number;
  icon: string;
  badge?: string;
}

const REWARDS: DayReward[] = [
  { day: 1, amount: 2, icon: '🪙' },
  { day: 2, amount: 5, icon: '💵' },
  { day: 3, amount: 8, icon: '🎁', badge: 'Bonus' },
  { day: 4, amount: 12, icon: '💰' },
  { day: 5, amount: 18, icon: '💎', badge: 'Super' },
  { day: 6, amount: 25, icon: '🔥' },
  { day: 7, amount: 50, icon: '👑', badge: 'Mega Pot' },
];

export const DailyCheckinModal: React.FC<DailyCheckinModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, reloadUserProfile } = useAuth();
  const [streak, setStreak] = useState<number>(0);
  const [canClaimToday, setCanClaimToday] = useState<boolean>(true);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimedTodayReward, setClaimedTodayReward] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const checkStreakData = () => {
      const dataStr = localStorage.getItem(`daily_checkin_${currentUser.uid}`);
      if (!dataStr) {
        setStreak(0);
        setCanClaimToday(true);
        return;
      }

      try {
        const data = JSON.parse(dataStr);
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
          // Check if yesterday or older
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const isYesterday = 
            lastDate.getFullYear() === yesterday.getFullYear() &&
            lastDate.getMonth() === yesterday.getMonth() &&
            lastDate.getDate() === yesterday.getDate();

          if (isYesterday) {
            setStreak(data.currentStreak % 7);
          } else {
            // Streak broken, reset to 0
            setStreak(0);
          }
          setCanClaimToday(true);
        }
      } catch (e) {
        setStreak(0);
        setCanClaimToday(true);
      }
    };

    checkStreakData();
  }, [currentUser, isOpen]);

  const handleClaim = async () => {
    if (!currentUser || !canClaimToday || claiming) return;

    setClaiming(true);
    const nextStreak = (streak % 7) + 1;
    const currentDayReward = REWARDS[nextStreak - 1];
    const amount = currentDayReward.amount;

    try {
      // 1. Credit wallet
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

      // 2. Record Transaction
      await recordTransaction(
        currentUser.uid,
        'bonus',
        amount,
        `🎁 Daily Check-in Day ${nextStreak} Reward`,
        { day: nextStreak, source: 'daily_checkin' }
      );

      // 3. Save local streak state
      const checkinData = {
        lastClaimDate: new Date().toISOString(),
        currentStreak: nextStreak
      };
      localStorage.setItem(`daily_checkin_${currentUser.uid}`, JSON.stringify(checkinData));

      setStreak(nextStreak);
      setCanClaimToday(false);
      setClaimedTodayReward(amount);

      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 }
      });

      await reloadUserProfile();
    } catch (err) {
      console.error("Daily checkin error:", err);
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3 z-50">
      <div 
        className="modal-content-custom w-100 rounded-4 overflow-hidden shadow-2xl border border-yellow-500/30 position-relative"
        style={{
          maxWidth: '440px',
          background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)'
        }}
      >
        {/* Header */}
        <div className="p-4 d-flex align-items-center justify-content-between border-b border-white/10 bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-amber-950/40">
          <div className="d-flex align-items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl text-amber-400">
              🎁
            </div>
            <div>
              <h5 className="mb-0 text-white font-extrabold text-base flex items-center gap-2">
                Daily Check-in
                <span className="badge bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {streak} Days Streak 🔥
                </span>
              </h5>
              <p className="text-gray-400 text-xs mb-0">Login every day to unlock bigger cash rewards!</p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-close btn-close-white opacity-75 hover:opacity-100 transition-opacity"
            onClick={onClose}
          ></button>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Rewards Grid (7 Days) */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {REWARDS.map((item, idx) => {
              const isPastClaimed = idx < streak;
              const isCurrentToClaim = idx === streak && canClaimToday;
              const isUpcoming = idx > streak || (idx === streak && !canClaimToday);

              return (
                <div
                  key={item.day}
                  className={`p-2.5 rounded-2xl text-center border relative transition-all ${
                    item.day === 7 ? 'col-span-2' : 'col-span-1'
                  } ${
                    isPastClaimed
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400 opacity-90'
                      : isCurrentToClaim
                      ? 'bg-gradient-to-b from-amber-500/25 to-yellow-600/20 border-yellow-400 shadow-lg shadow-amber-500/20 scale-105 z-10'
                      : 'bg-white/5 border-white/10 text-gray-400 opacity-70'
                  }`}
                >
                  {/* Badge */}
                  {item.badge && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shadow whitespace-nowrap">
                      {item.badge}
                    </span>
                  )}

                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Day {item.day}
                  </div>

                  <div className="text-2xl my-1">{item.icon}</div>

                  <div className="font-extrabold text-white text-xs">
                    +₹{item.amount}
                  </div>

                  <div className="mt-1">
                    {isPastClaimed ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                        <i className="bi bi-check-circle-fill"></i> Done
                      </span>
                    ) : isCurrentToClaim ? (
                      <span className="text-[10px] text-yellow-300 font-black animate-pulse uppercase">
                        Ready!
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500 font-medium">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Success Banner */}
          {claimedTodayReward && (
            <div className="mb-3 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-center">
              <div className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
                🎉 Reward Claimed!
              </div>
              <div className="text-white font-extrabold text-lg mt-0.5">
                +₹{claimedTodayReward} Added to Wallet
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={!canClaimToday || claiming}
            onClick={handleClaim}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-base transition-all shadow-lg flex items-center justify-center gap-2 ${
              canClaimToday
                ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-black hover:brightness-110 shadow-amber-500/25 active:scale-95'
                : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {claiming ? (
              <>
                <div className="spinner-border spinner-border-sm" role="status"></div>
                <span>Claiming Reward...</span>
              </>
            ) : canClaimToday ? (
              <>
                <span>🎁 CLAIM DAY {streak + 1} REWARD</span>
                <i className="bi bi-arrow-right-short text-xl"></i>
              </>
            ) : (
              <>
                <i className="bi bi-check-circle-fill text-emerald-400"></i>
                <span>Already Claimed Today (Come back tomorrow!)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
