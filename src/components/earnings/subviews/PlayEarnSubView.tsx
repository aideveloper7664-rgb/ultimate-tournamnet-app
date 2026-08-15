import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../../firebase';
import confetti from 'canvas-confetti';

interface PlayEarnSubViewProps {
  onBack: () => void;
}

export const PlayEarnSubView: React.FC<PlayEarnSubViewProps> = ({ onBack }) => {
  const { currentUser, reloadUserProfile } = useAuth();
  const [selectedGame, setSelectedGame] = useState<'menu' | 'speed_tap' | 'coin_catcher'>('menu');

  // Game 1: Speed Tap
  const [tapScore, setTapScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [rewardWon, setRewardWon] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startSpeedTap = () => {
    setTapScore(0);
    setTimeLeft(10);
    setGameState('playing');
    setRewardWon(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          finishSpeedTap();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTap = () => {
    if (gameState !== 'playing') return;
    setTapScore(prev => prev + 1);
  };

  const finishSpeedTap = async () => {
    setGameState('gameover');
    setTapScore(final => {
      let prize = 0;
      if (final >= 45) prize = 15;
      else if (final >= 30) prize = 8;
      else if (final >= 15) prize = 3;

      if (prize > 0 && currentUser) {
        setRewardWon(prize);
        creditReward(prize, `🎮 Play & Earn: Speed Tap Score (${final} Taps)`);
      }
      return final;
    });
  };

  const creditReward = async (amount: number, desc: string) => {
    if (!currentUser) return;
    try {
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
        desc,
        { source: 'play_and_earn' }
      );

      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 }
      });

      await reloadUserProfile();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-full pb-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <button
          onClick={() => {
            if (selectedGame !== 'menu') {
              setSelectedGame('menu');
            } else {
              onBack();
            }
          }}
          className="btn btn-outline-light btn-sm rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white/10 transition-colors"
        >
          <i className="bi bi-arrow-left text-indigo-400"></i> {selectedGame === 'menu' ? 'Back' : 'Menu'}
        </button>
        <span className="text-white font-bold text-sm">Play & Earn</span>
        <span className="badge bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-xl font-bold">
          Mini Arcade
        </span>
      </div>

      {selectedGame === 'menu' ? (
        <div className="space-y-3">
          {/* Speed Tap Blitz */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-1.5 bg-black/40 rounded-xl border border-white/5">⚡</span>
                <div>
                  <h5 className="text-white font-bold text-xs mb-0.5">Speed Tap Blitz</h5>
                  <span className="text-gray-400 text-[10px]">10s Tap Challenge</span>
                </div>
              </div>
              <span className="text-amber-400 font-bold text-xs">
                Win ₹15
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedGame('speed_tap');
                setGameState('idle');
                setTapScore(0);
                setTimeLeft(10);
              }}
              className="btn btn-warning w-full py-2 rounded-xl font-black text-dark text-xs shadow-sm active:scale-95"
            >
              Play Game ⚡
            </button>
          </div>
        </div>
      ) : (
        /* Speed Tap Game Screen */
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 text-center">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-300">Speed Tap</span>
            <span className="badge bg-amber-500 text-black font-mono font-bold text-xs px-2 py-0.5 rounded-lg">
              ⏳ {timeLeft}s
            </span>
          </div>

          {gameState === 'idle' && (
            <div className="py-6">
              <span className="text-4xl mb-2 block">⚡</span>
              <p className="text-gray-400 text-xs mb-4">
                Tap as fast as you can in 10 seconds!
              </p>
              <button
                onClick={startSpeedTap}
                className="btn btn-warning px-5 py-2.5 rounded-xl font-black text-dark text-sm shadow-md hover:scale-105 active:scale-95"
              >
                START 🚀
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="py-2 select-none">
              <div className="text-4xl font-black text-white mb-1">{tapScore}</div>
              <span className="text-[11px] text-amber-400 font-bold block mb-3">Taps</span>

              <button
                onClick={handleTap}
                className="w-36 h-36 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-black font-black text-xl shadow-lg active:scale-90 transition-transform flex items-center justify-center mx-auto cursor-pointer border-2 border-yellow-200"
              >
                TAP! ⚡
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="py-4">
              <span className="text-4xl mb-1 block">🏆</span>
              <h4 className="text-white font-black text-base mb-1">Finished!</h4>
              <p className="text-amber-400 font-bold text-xs mb-2">Score: {tapScore} Taps</p>
              {rewardWon > 0 ? (
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl mb-3">
                  <span className="text-emerald-400 font-black text-xs block">🎉 Won ₹{rewardWon}.00!</span>
                </div>
              ) : (
                <p className="text-gray-400 text-[11px] mb-3">Score 15+ to win cash.</p>
              )}

              <div className="flex gap-2 justify-center">
                <button
                  onClick={startSpeedTap}
                  className="btn btn-warning px-3 py-1.5 rounded-xl font-bold text-dark text-xs"
                >
                  Play Again ⚡
                </button>
                <button
                  onClick={() => setSelectedGame('menu')}
                  className="btn btn-outline-light px-3 py-1.5 rounded-xl font-bold text-xs"
                >
                  Menu
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
