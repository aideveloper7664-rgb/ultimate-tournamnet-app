import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../firebase';
import confetti from 'canvas-confetti';

interface ScratchWinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScratchWinModal: React.FC<ScratchWinModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, reloadUserProfile } = useAuth();
  const [cardsLeft, setCardsLeft] = useState<number>(2);
  const [isScratched, setIsScratched] = useState<boolean>(false);
  const [isScratching, setIsScratching] = useState<boolean>(false);
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(false);
  const [revealed, setRevealed] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize random reward for current card
  const initCard = () => {
    // Generate reward between 5 and 50
    const rewards = [5, 8, 10, 15, 20, 25, 50];
    const picked = rewards[Math.floor(Math.random() * rewards.length)];
    setRewardAmount(picked);
    setIsScratched(false);
    setRewardClaimed(false);
    setRevealed(false);

    setTimeout(() => {
      drawFoil();
    }, 50);
  };

  useEffect(() => {
    if (isOpen) {
      const savedCards = localStorage.getItem(`scratch_cards_${currentUser?.uid}`);
      const today = new Date().toDateString();
      const lastScratchDay = localStorage.getItem(`scratch_day_${currentUser?.uid}`);

      if (lastScratchDay !== today) {
        setCardsLeft(2);
        localStorage.setItem(`scratch_day_${currentUser?.uid}`, today);
        localStorage.setItem(`scratch_cards_${currentUser?.uid}`, '2');
      } else if (savedCards) {
        setCardsLeft(parseInt(savedCards, 10));
      }

      initCard();
    }
  }, [isOpen, currentUser]);

  const drawFoil = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 280;
    const height = 180;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Draw metallic gradient foil
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#B45309');
    grad.addColorStop(0.3, '#F59E0B');
    grad.addColorStop(0.5, '#FEF08A');
    grad.addColorStop(0.7, '#F59E0B');
    grad.addColorStop(1, '#92400E');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Shimmer pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = -width; i < width * 2; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 40, height);
      ctx.lineTo(i + 30, height);
      ctx.lineTo(i - 10, 0);
      ctx.fill();
    }

    // Text instructions
    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧧 SCRATCH HERE 🧧', width / 2, height / 2 - 8);

    ctx.fillStyle = '#451a03';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Rub with finger or mouse to win cash', width / 2, height / 2 + 18);
  };

  const scratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || isScratched || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2, false);
    ctx.fill();

    checkScratchPercent();
  };

  const checkScratchPercent = () => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    // Sample pixels
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const pixels = imgData.data;
      let transparentPixels = 0;
      const totalPixels = pixels.length / 4;

      // Sample every 16th pixel for speed
      for (let i = 3; i < pixels.length; i += 64) {
        if (pixels[i] === 0) {
          transparentPixels++;
        }
      }

      const scratchedPercent = (transparentPixels / (totalPixels / 16)) * 100;
      if (scratchedPercent > 45 && !revealed) {
        revealPrize();
      }
    } catch (e) {
      // Security fallback
    }
  };

  const revealPrize = async () => {
    if (revealed || !currentUser) return;
    setRevealed(true);
    setIsScratched(true);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Decrement card count
    const nextCards = Math.max(0, cardsLeft - 1);
    setCardsLeft(nextCards);
    localStorage.setItem(`scratch_cards_${currentUser.uid}`, nextCards.toString());

    // Confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Credit reward
    try {
      setRewardClaimed(true);
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snap = await get(userRef);
      const currentProf = snap.val() || {};
      const currentBonus = Number(currentProf.bonusCash || 0);
      const currentTotal = Number(currentProf.balance || 0);
      const currentEarn = Number(currentProf.totalEarnings || 0);

      await update(userRef, {
        bonusCash: currentBonus + rewardAmount,
        balance: currentTotal + rewardAmount,
        totalEarnings: currentEarn + rewardAmount
      });

      await recordTransaction(
        currentUser.uid,
        'bonus',
        rewardAmount,
        `🧧 Scratch & Win Card Reward`,
        { source: 'scratch_win', amount: rewardAmount }
      );

      await reloadUserProfile();
    } catch (err) {
      console.error("Scratch reward error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3 z-50">
      <div 
        className="modal-content-custom w-100 rounded-4 overflow-hidden shadow-2xl border border-yellow-500/30 position-relative"
        style={{
          maxWidth: '400px',
          background: 'linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)'
        }}
      >
        {/* Header */}
        <div className="p-4 d-flex align-items-center justify-content-between border-b border-white/10 bg-amber-950/40">
          <div className="d-flex align-items-center gap-2.5">
            <span className="text-2xl">🧧</span>
            <div>
              <h5 className="mb-0 text-white font-extrabold text-base flex items-center gap-2">
                Scratch & Win
                <span className="badge bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {cardsLeft} Left Today
                </span>
              </h5>
              <p className="text-gray-400 text-xs mb-0">Scratch the foil to reveal your cash prize!</p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-close btn-close-white opacity-75 hover:opacity-100 transition-opacity"
            onClick={onClose}
          ></button>
        </div>

        {/* Body */}
        <div className="p-4 text-center">
          {cardsLeft > 0 || revealed ? (
            <div>
              {/* Scratch Area Wrapper */}
              <div 
                className="relative mx-auto rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/40"
                style={{ width: '280px', height: '180px', background: 'radial-gradient(circle, #292524 0%, #1c1917 100%)' }}
              >
                {/* Hidden Prize Inside Card */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <div className="text-4xl animate-pulse">💎</div>
                  <div className="text-amber-400 text-xs font-bold uppercase tracking-wider mt-1">
                    Cash Winner
                  </div>
                  <div className="text-white font-black text-3xl mt-0.5">
                    + ₹{rewardAmount}
                  </div>
                  <div className="text-emerald-400 text-[11px] font-bold mt-1">
                    Instant Wallet Credit!
                  </div>
                </div>

                {/* Canvas Foil on top */}
                <canvas
                  ref={canvasRef}
                  onMouseDown={() => setIsScratching(true)}
                  onMouseUp={() => setIsScratching(false)}
                  onMouseMove={(e) => isScratching && scratch(e)}
                  onTouchStart={() => setIsScratching(true)}
                  onTouchEnd={() => setIsScratching(false)}
                  onTouchMove={(e) => scratch(e)}
                  className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing touch-none"
                  style={{ width: '280px', height: '180px' }}
                />
              </div>

              {/* Status or Next Action */}
              {revealed ? (
                <div className="mt-4">
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-center mb-3">
                    <div className="text-emerald-400 font-extrabold text-sm uppercase">
                      🎉 ₹{rewardAmount} Credited to Vault!
                    </div>
                  </div>

                  {cardsLeft > 0 ? (
                    <button
                      type="button"
                      onClick={initCard}
                      className="w-full py-3 px-4 rounded-2xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg hover:brightness-110 active:scale-95 transition-all"
                    >
                      Scratch Next Card ({cardsLeft} remaining) 🧧
                    </button>
                  ) : (
                    <p className="text-gray-400 text-xs mt-2">
                      You've used all 2 daily cards. Free cards refresh at 12:00 AM!
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-gray-400 text-xs">
                  <i className="bi bi-hand-index-thumb me-1 text-amber-400"></i>
                  Drag over the gold box to scratch
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center">
              <div className="text-5xl mb-3">🧧</div>
              <h6 className="text-white font-bold text-base">No Cards Remaining Today</h6>
              <p className="text-gray-400 text-xs max-w-xs mx-auto mt-1 mb-4">
                You have scratched all cards for today. Return tomorrow for 2 new free scratch cards!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline-warning btn-sm rounded-pill px-4"
              >
                Back to Rewards
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
