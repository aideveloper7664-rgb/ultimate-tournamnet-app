import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../firebase';
import confetti from 'canvas-confetti';

interface PlayEarnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayEarnModal: React.FC<PlayEarnModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, reloadUserProfile } = useAuth();
  const [activeGame, setActiveGame] = useState<'menu' | 'speed_tap' | 'reflex'>('menu');

  // Speed Tap State
  const [tapScore, setTapScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [rewardWon, setRewardWon] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean timer on unmount
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
    // Read final score from state closure or calculate
    setTapScore(final => {
      let prize = 0;
      if (final >= 45) prize = 15;
      else if (final >= 30) prize = 8;
      else if (final >= 15) prize = 3;

      if (prize > 0 && currentUser) {
        setRewardWon(prize);
        creditMiniGameReward(prize, `🎮 Play & Earn: Speed Tap Score (${final} taps)`);
      }
      return final;
    });
  };

  const creditMiniGameReward = async (amount: number, desc: string) => {
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
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });

      await reloadUserProfile();
    } catch (e) {
      console.error("Mini game reward error:", e);
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
            <span className="text-2xl">🎮</span>
            <div>
              <h5 className="mb-0 text-white font-extrabold text-base flex items-center gap-2">
                Play & Earn Mini-Games
                <span className="badge bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Skill Rewards
                </span>
              </h5>
              <p className="text-gray-400 text-xs mb-0">Play quick skill challenges and win instant cash!</p>
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
          {activeGame === 'menu' ? (
            <div className="space-y-3">
              {/* Game 1: Speed Tap Rush */}
              <div 
                onClick={() => { setActiveGame('speed_tap'); setGameState('idle'); setTapScore(0); }}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl border border-amber-500/30 group-hover:scale-110 transition-transform">
                    ⚡
                  </div>
                  <div>
                    <h6 className="text-white font-bold text-sm mb-0.5">Speed Tap Blitz</h6>
                    <p className="text-gray-400 text-xs mb-0">Tap 30+ times in 10s to win up to ₹15 cash</p>
                  </div>
                </div>
                <button type="button" className="btn btn-warning btn-sm fw-bold rounded-xl px-3 py-1 text-dark shadow-sm">
                  Play ⚡
                </button>
              </div>

              {/* Game 2: Weapon Memory Match */}
              <div 
                onClick={() => { setActiveGame('speed_tap'); startSpeedTap(); }}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl border border-indigo-500/30 group-hover:scale-110 transition-transform">
                    🎯
                  </div>
                  <div>
                    <h6 className="text-white font-bold text-sm mb-0.5">Reflex Target Rush</h6>
                    <p className="text-gray-400 text-xs mb-0">Test your combat speed & claim bonus coins</p>
                  </div>
                </div>
                <button type="button" className="btn btn-outline-warning btn-sm fw-bold rounded-xl px-3 py-1 shadow-sm">
                  Start 🎯
                </button>
              </div>
            </div>
          ) : (
            /* Speed Tap Game Screen */
            <div className="text-center">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                <button 
                  type="button" 
                  onClick={() => { setActiveGame('menu'); if (timerRef.current) clearInterval(timerRef.current); }}
                  className="btn btn-sm btn-dark text-gray-300 rounded-xl px-2.5 py-1 text-xs"
                >
                  ← Back to Games
                </button>
                <span className="text-xs font-bold text-amber-400 uppercase">⚡ Speed Tap Blitz</span>
              </div>

              {gameState === 'idle' && (
                <div className="py-6">
                  <div className="text-5xl mb-3 animate-bounce">⚡</div>
                  <h5 className="text-white font-extrabold text-lg">Are you ready?</h5>
                  <p className="text-gray-400 text-xs max-w-xs mx-auto mb-4">
                    Tap the button as fast as possible for 10 seconds! Target: 30+ Taps = ₹8, 45+ Taps = ₹15.
                  </p>
                  <button
                    type="button"
                    onClick={startSpeedTap}
                    className="w-full py-3.5 px-6 rounded-2xl font-black bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-black shadow-lg hover:brightness-110 text-base"
                  >
                    🚀 START CHALLENGE (10s)
                  </button>
                </div>
              )}

              {gameState === 'playing' && (
                <div className="py-4">
                  {/* Timer & Score Bar */}
                  <div className="flex items-center justify-around mb-4">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-2xl w-28">
                      <span className="text-[11px] text-gray-400 block uppercase font-bold">Time Left</span>
                      <span className="font-mono text-2xl font-black text-amber-400">{timeLeft}s</span>
                    </div>
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-2xl w-28">
                      <span className="text-[11px] text-gray-400 block uppercase font-bold">Your Taps</span>
                      <span className="font-mono text-2xl font-black text-emerald-400">{tapScore}</span>
                    </div>
                  </div>

                  {/* Gigantic Tap Target Button */}
                  <button
                    type="button"
                    onClick={handleTap}
                    className="w-48 h-48 rounded-full mx-auto my-3 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-gray-950 font-black text-3xl shadow-2xl active:scale-90 transition-transform flex flex-col items-center justify-center border-4 border-yellow-300"
                    style={{ filter: 'drop-shadow(0 8px 24px rgba(245, 158, 11, 0.4))' }}
                  >
                    <span className="text-4xl">⚡</span>
                    <span className="text-xl mt-1 tracking-wider">TAP FAST!</span>
                  </button>
                </div>
              )}

              {gameState === 'gameover' && (
                <div className="py-4">
                  <div className="text-5xl mb-2">🏁</div>
                  <h5 className="text-white font-extrabold text-xl mb-1">Time's Up!</h5>
                  <p className="text-gray-400 text-xs mb-3">You scored <strong className="text-amber-400 text-sm">{tapScore} Taps</strong> in 10 seconds!</p>

                  {rewardWon > 0 ? (
                    <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl mb-4 animate-pulse">
                      <span className="text-emerald-400 font-bold text-xs uppercase block">🎉 Victory Reward</span>
                      <span className="text-white font-black text-2xl">+ ₹{rewardWon} Credited to Wallet!</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl mb-4">
                      <span className="text-gray-400 text-xs">Reach 30 taps next time to unlock cash!</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startSpeedTap}
                      className="btn btn-warning flex-1 font-bold text-dark rounded-xl py-2.5 text-xs shadow-sm"
                    >
                      🔄 Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGame('menu')}
                      className="btn btn-dark flex-1 font-bold text-white rounded-xl py-2.5 text-xs border border-white/10"
                    >
                      🎮 More Games
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
