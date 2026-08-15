import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../../firebase';
import confetti from 'canvas-confetti';

interface ScratchWinSubViewProps {
  onBack: () => void;
}

interface ScratchCardDef {
  id: string;
  name: string;
  maxPrize: string;
  color: string;
  border: string;
  icon: string;
}

const CARDS: ScratchCardDef[] = [
  { id: 'gold_card', name: 'Golden Rush Pass', maxPrize: '₹50', color: 'from-amber-500/20 to-yellow-600/10', border: 'border-amber-500/40', icon: '🏆' },
  { id: 'silver_card', name: 'Esports Blitz Foil', maxPrize: '₹25', color: 'from-slate-400/20 to-slate-600/10', border: 'border-slate-400/40', icon: '⚔️' },
  { id: 'diamond_card', name: 'Diamond Royale Card', maxPrize: '₹100', color: 'from-cyan-500/20 to-blue-600/10', border: 'border-cyan-500/40', icon: '💎' },
];

export const ScratchWinSubView: React.FC<ScratchWinSubViewProps> = ({ onBack }) => {
  const { currentUser, reloadUserProfile } = useAuth();
  const [selectedCard, setSelectedCard] = useState<ScratchCardDef>(CARDS[0]);
  const [scratchProgress, setScratchProgress] = useState<number>(0);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [prizeAmount, setPrizeAmount] = useState<number>(10);
  const [isScratching, setIsScratching] = useState<boolean>(false);
  const [cardsLeft, setCardsLeft] = useState<number>(2);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize Card
  useEffect(() => {
    // Generate randomized prize
    const rand = Math.floor(Math.random() * 20) + 5; // ₹5 to ₹25
    setPrizeAmount(rand);
    setRevealed(false);
    setScratchProgress(0);
    initCanvas();
  }, [selectedCard]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.offsetWidth || 300;
    const height = canvas.offsetHeight || 180;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Fill foil
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#71717A');
    grad.addColorStop(0.5, '#A1A1AA');
    grad.addColorStop(1, '#52525B');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative foil pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < width; i += 20) {
      for (let j = 0; j < height; j += 20) {
        ctx.fillText('✨', i, j + 12);
      }
    }

    // Text on foil
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCRATCH FOIL TO REVEAL ✨', width / 2, height / 2 - 10);

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('Rub your finger here', width / 2, height / 2 + 15);
  };

  const handleScratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      if (!isScratching) return;
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Estimate progress
    setScratchProgress(prev => {
      const next = prev + 3;
      if (next >= 40 && !revealed) {
        claimPrize();
      }
      return next;
    });
  };

  const claimPrize = async () => {
    if (revealed || !currentUser) return;
    setRevealed(true);

    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snap = await get(userRef);
      const currentProf = snap.val() || {};
      const currentBonus = Number(currentProf.bonusCash || 0);
      const currentTotal = Number(currentProf.balance || 0);
      const currentEarn = Number(currentProf.totalEarnings || 0);

      await update(userRef, {
        bonusCash: currentBonus + prizeAmount,
        balance: currentTotal + prizeAmount,
        totalEarnings: currentEarn + prizeAmount
      });

      await recordTransaction(
        currentUser.uid,
        'bonus',
        prizeAmount,
        `🧧 Scratch & Win Reward: ${selectedCard.name}`,
        { source: 'scratch_win', cardId: selectedCard.id }
      );

      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 }
      });

      setCardsLeft(prev => Math.max(0, prev - 1));
      await reloadUserProfile();
    } catch (e) {
      console.error("Scratch claim error:", e);
    }
  };

  const handleInstantReveal = () => {
    if (!revealed) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      claimPrize();
    }
  };

  return (
    <div className="min-h-full pb-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <button
          onClick={onBack}
          className="btn btn-outline-light btn-sm rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white/10 transition-colors"
        >
          <i className="bi bi-arrow-left text-rose-400"></i> Back
        </button>
        <span className="text-white font-bold text-sm">Scratch Cards</span>
        <span className="badge bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-1 rounded-xl font-bold">
          {cardsLeft} Left
        </span>
      </div>

      {/* Card Switcher Tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {CARDS.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCard(c)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
              selectedCard.id === c.id
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                : 'bg-zinc-900/60 text-gray-400 border-white/5 hover:bg-white/10'
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* Scratch Canvas Area */}
      <div className="p-3 bg-zinc-900/90 border border-white/10 rounded-3xl shadow-xl relative overflow-hidden mb-3">
        <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-950/30 via-zinc-800 to-black border border-white/10 flex flex-col items-center justify-center select-none">
          {/* Underneath Reward Box */}
          <div className="text-center p-3">
            <span className="text-2xl mb-0.5 block">🎉</span>
            <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider block">Cash Prize</span>
            <h2 className="text-2xl font-black text-white my-0.5">₹{prizeAmount}.00</h2>
            <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {revealed ? 'Claimed ✓' : 'Scratch Above'}
            </span>
          </div>

          {/* Canvas Foil Overlay */}
          <canvas
            ref={canvasRef}
            onMouseDown={() => setIsScratching(true)}
            onMouseUp={() => setIsScratching(false)}
            onMouseMove={handleScratch}
            onTouchMove={handleScratch}
            className="absolute inset-0 w-full h-full cursor-pointer z-10 touch-none"
          />
        </div>

        {/* Action Controls */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleInstantReveal}
            disabled={revealed}
            className="btn btn-outline-light w-full py-2 rounded-xl text-xs font-bold"
          >
            {revealed ? 'Revealed ✓' : 'Instant Reveal ⚡'}
          </button>
          <button
            onClick={() => {
              const rand = Math.floor(Math.random() * 25) + 5;
              setPrizeAmount(rand);
              setRevealed(false);
              setScratchProgress(0);
              initCanvas();
            }}
            className="btn btn-warning w-full py-2 rounded-xl text-xs font-black text-dark"
          >
            Next Card 🧧
          </button>
        </div>
      </div>
    </div>
  );
};
