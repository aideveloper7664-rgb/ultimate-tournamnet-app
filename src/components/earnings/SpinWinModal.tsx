import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../firebase';
import confetti from 'canvas-confetti';

interface SpinWinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WheelSegment {
  label: string;
  amount: number;
  type: 'cash' | 'bonus' | 'ticket';
  color: string;
  textColor: string;
  icon: string;
}

const SEGMENTS: WheelSegment[] = [
  { label: '₹10 CASH', amount: 10, type: 'cash', color: '#F59E0B', textColor: '#000000', icon: '💰' },
  { label: '₹2 CASH', amount: 2, type: 'cash', color: '#1E293B', textColor: '#FFFFFF', icon: '🪙' },
  { label: '₹50 MEGA', amount: 50, type: 'cash', color: '#EF4444', textColor: '#FFFFFF', icon: '💎' },
  { label: '₹5 CASH', amount: 5, type: 'cash', color: '#3B82F6', textColor: '#FFFFFF', icon: '💵' },
  { label: '2x TICKET', amount: 0, type: 'ticket', color: '#8B5CF6', textColor: '#FFFFFF', icon: '🎟️' },
  { label: '₹100 JACKPOT', amount: 100, type: 'cash', color: '#10B981', textColor: '#000000', icon: '👑' },
  { label: '₹3 CASH', amount: 3, type: 'cash', color: '#0F172A', textColor: '#FBBF24', icon: '✨' },
  { label: '₹20 CASH', amount: 20, type: 'cash', color: '#EC4899', textColor: '#FFFFFF', icon: '🎁' }
];

export const SpinWinModal: React.FC<SpinWinModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile, reloadUserProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<WheelSegment | null>(null);
  const [cooldownTime, setCooldownTime] = useState<number | null>(null);
  const [spinsLeft, setSpinsLeft] = useState<number>(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check last spin time from userProfile or localStorage
  useEffect(() => {
    if (!currentUser) return;
    const lastSpinStr = localStorage.getItem(`last_spin_${currentUser.uid}`);
    if (lastSpinStr) {
      const lastSpin = parseInt(lastSpinStr, 10);
      const now = Date.now();
      const diff = now - lastSpin;
      const cooldownPeriod = 12 * 60 * 60 * 1000; // 12 hours
      if (diff < cooldownPeriod) {
        setCooldownTime(cooldownPeriod - diff);
        setSpinsLeft(0);
      } else {
        setCooldownTime(null);
        setSpinsLeft(1);
      }
    } else {
      setSpinsLeft(1);
    }
  }, [currentUser, isOpen]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownTime === null || cooldownTime <= 0) return;
    const interval = setInterval(() => {
      setCooldownTime(prev => {
        if (prev === null || prev <= 1000) {
          setSpinsLeft(1);
          return null;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownTime]);

  // Draw wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;
    const numSegments = SEGMENTS.length;
    const arcAngle = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, size, size);

    // Outer glow border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#F59E0B';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#0F172A';
    ctx.fill();

    // Draw Segments
    SEGMENTS.forEach((seg, i) => {
      const startAngle = i * arcAngle;
      const endAngle = startAngle + arcAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();

      // Text and Icon
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + arcAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.textColor;
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${seg.icon} ${seg.label}`, radius - 20, 4);
      ctx.restore();
    });

    // Outer rim lights
    for (let i = 0; i < 16; i++) {
      const angle = (i * 2 * Math.PI) / 16;
      const dotX = centerX + Math.cos(angle) * (radius + 4);
      const dotY = centerY + Math.sin(angle) * (radius + 4);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#FEF08A' : '#F59E0B';
      ctx.fill();
    }

    // Center Cap
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#1E1B4B';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#F59E0B';
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', centerX, centerY);
  }, []);

  const handleSpin = async () => {
    if (spinning || spinsLeft <= 0 || !currentUser) return;

    setSpinning(true);
    setWonPrize(null);

    // Weighted random selection: pick a winning segment
    // High weight for ₹2, ₹5, ₹10, medium for ₹20, lower for ₹50, ₹100
    const rand = Math.random() * 100;
    let winningIndex = 1; // Default ₹2

    if (rand < 35) winningIndex = 1; // ₹2
    else if (rand < 60) winningIndex = 6; // ₹3
    else if (rand < 80) winningIndex = 3; // ₹5
    else if (rand < 92) winningIndex = 0; // ₹10
    else if (rand < 96) winningIndex = 4; // 2x Ticket
    else if (rand < 98) winningIndex = 7; // ₹20
    else if (rand < 99.5) winningIndex = 2; // ₹50
    else winningIndex = 5; // ₹100 JACKPOT

    const selectedPrize = SEGMENTS[winningIndex];

    // Compute rotation angles
    // Each segment is 45deg (360/8). Top pointer points to 270deg (or -90deg)
    const segmentAngle = 360 / SEGMENTS.length;
    // We want segment `winningIndex` to stop at top (270 deg)
    const targetSegmentCenter = winningIndex * segmentAngle + segmentAngle / 2;
    const targetAngle = 270 - targetSegmentCenter;
    
    // Add extra 5 to 8 full spins
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const totalRotation = rotation + (extraSpins * 360) + ((targetAngle - (rotation % 360) + 360) % 360);

    setRotation(totalRotation);

    // Wait for spin animation (4.5s)
    setTimeout(async () => {
      setSpinning(false);
      setWonPrize(selectedPrize);
      setSpinsLeft(0);
      localStorage.setItem(`last_spin_${currentUser.uid}`, Date.now().toString());
      setCooldownTime(12 * 60 * 60 * 1000);

      // Trigger Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Credit cash to user profile
      try {
        if (selectedPrize.amount > 0) {
          const userRef = ref(db, `users/${currentUser.uid}`);
          const snap = await get(userRef);
          const currentProf = snap.val() || {};
          const currentBonus = Number(currentProf.bonusCash || 0);
          const currentTotal = Number(currentProf.balance || 0);
          const currentEarn = Number(currentProf.totalEarnings || 0);

          await update(userRef, {
            bonusCash: currentBonus + selectedPrize.amount,
            balance: currentTotal + selectedPrize.amount,
            totalEarnings: currentEarn + selectedPrize.amount
          });

          await recordTransaction(
            currentUser.uid,
            'bonus',
            selectedPrize.amount,
            `🎡 Spin & Win Prize: ${selectedPrize.label}`,
            { prizeType: selectedPrize.type, source: 'spin_and_win' }
          );

          await reloadUserProfile();
        }
      } catch (err) {
        console.error("Spin reward credit error:", err);
      }
    }, 4600);
  };

  const formatCooldown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3 z-50">
      <div 
        className="modal-content-custom w-100 rounded-4 overflow-hidden shadow-2xl border border-warning border-opacity-30 position-relative"
        style={{
          maxWidth: '420px',
          background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)'
        }}
      >
        {/* Modal Header */}
        <div className="p-3.5 d-flex align-items-center justify-content-between border-b border-white/10 bg-black/30">
          <div className="d-flex align-items-center gap-2">
            <span className="text-2xl">🎡</span>
            <div>
              <h5 className="mb-0 text-white font-bold text-base flex items-center gap-1.5">
                Spin & Win Cash
                <span className="badge bg-warning text-dark text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Free Daily
                </span>
              </h5>
              <p className="text-gray-400 text-xs mb-0">Spin the wheel and claim real cash prizes!</p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-close btn-close-white opacity-75 hover:opacity-100 transition-opacity"
            onClick={onClose}
          ></button>
        </div>

        {/* Modal Body */}
        <div className="p-4 text-center">
          {/* Wheel Container */}
          <div className="relative inline-block my-2">
            {/* Top Pointer Indicator */}
            <div 
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
              style={{
                width: 0,
                height: 0,
                borderLeft: '14px solid transparent',
                borderRight: '14px solid transparent',
                borderTop: '24px solid #F59E0B',
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.6))'
              }}
            ></div>

            {/* Canvas Wheel */}
            <div 
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
                width: '300px',
                height: '300px',
                margin: '0 auto'
              }}
            >
              <canvas 
                ref={canvasRef} 
                style={{ width: '300px', height: '300px' }}
              />
            </div>
          </div>

          {/* Won Prize Banner */}
          {wonPrize && (
            <div className="mt-3 p-3 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-yellow-400/40 rounded-2xl animate-bounce">
              <div className="text-yellow-400 text-xs uppercase font-black tracking-wider">🎉 Congratulations!</div>
              <div className="text-white font-extrabold text-xl mt-0.5">
                You Won {wonPrize.label}
              </div>
              <div className="text-emerald-400 text-xs font-semibold mt-0.5">
                {wonPrize.amount > 0 ? `+ ₹${wonPrize.amount} Credited to your Vault Wallet!` : 'Bonus Ticket Activated!'}
              </div>
            </div>
          )}

          {/* Action Control */}
          <div className="mt-4">
            {spinsLeft > 0 ? (
              <button
                type="button"
                disabled={spinning}
                onClick={handleSpin}
                className={`w-full py-3.5 px-6 rounded-2xl font-black text-base shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                  spinning
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-gray-950 hover:brightness-110 shadow-amber-500/25'
                }`}
              >
                {spinning ? (
                  <>
                    <div className="spinner-border spinner-border-sm" role="status"></div>
                    <span>Spinning Fortune...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ SPIN NOW (FREE)</span>
                    <i className="bi bi-arrow-right-short text-xl"></i>
                  </>
                )}
              </button>
            ) : (
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-gray-400 text-xs flex items-center justify-center gap-1.5">
                  <i className="bi bi-clock-history text-amber-400"></i>
                  Next Free Spin in:
                  <span className="font-mono text-amber-400 font-bold">
                    {cooldownTime ? formatCooldown(cooldownTime) : 'Checking...'}
                  </span>
                </div>
                <p className="text-gray-500 text-[11px] mt-1 mb-0">Free spin refreshes every 12 hours!</p>
              </div>
            )}
          </div>

          {/* Payout Table */}
          <div className="mt-4 pt-3 border-t border-white/10 text-left">
            <div className="flex justify-between items-center text-xs text-gray-400 mb-2 font-semibold">
              <span>Prize Highlights</span>
              <span className="text-amber-400">Up to ₹100 Cash</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {SEGMENTS.slice(0, 4).map((s, idx) => (
                <div key={idx} className="bg-black/30 p-1.5 rounded-lg text-center border border-white/5">
                  <div className="text-sm">{s.icon}</div>
                  <div className="text-[10px] font-bold text-white truncate">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
