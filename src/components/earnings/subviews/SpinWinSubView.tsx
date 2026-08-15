import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../../firebase';
import confetti from 'canvas-confetti';

interface SpinWinSubViewProps {
  onBack: () => void;
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
  { label: '2x PASS', amount: 0, type: 'ticket', color: '#8B5CF6', textColor: '#FFFFFF', icon: '🎟️' },
  { label: '₹100 JACKPOT', amount: 100, type: 'cash', color: '#10B981', textColor: '#000000', icon: '👑' },
  { label: '₹3 CASH', amount: 3, type: 'cash', color: '#0F172A', textColor: '#FBBF24', icon: '✨' },
  { label: '₹20 CASH', amount: 20, type: 'cash', color: '#EC4899', textColor: '#FFFFFF', icon: '🎁' }
];

export const SpinWinSubView: React.FC<SpinWinSubViewProps> = ({ onBack }) => {
  const { currentUser, userProfile, reloadUserProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<WheelSegment | null>(null);
  const [cooldownTime, setCooldownTime] = useState<number | null>(null);
  const [spinsLeft, setSpinsLeft] = useState<number>(1);
  const [recentWins, setRecentWins] = useState<{ name: string; prize: string; time: string }[]>([
    { name: 'Rahul K.', prize: '₹100 Jackpot', time: '2m ago' },
    { name: 'Sameer_07', prize: '₹50 Mega', time: '5m ago' },
    { name: 'Vikram_Gamer', prize: '₹20 Cash', time: '9m ago' },
    { name: 'Aman_Pro', prize: '₹10 Cash', time: '14m ago' },
  ]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check cooldown
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
  }, [currentUser]);

  // Timer
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

  // Draw Canvas
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

    // Outer glow
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#F59E0B';
    ctx.fill();

    // Wheel segments
    SEGMENTS.forEach((seg, i) => {
      const angle = i * arcAngle;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arcAngle);
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();

      // Text & Icon
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arcAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.textColor;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(`${seg.icon} ${seg.label}`, radius - 20, 4);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#F59E0B';
    ctx.stroke();

    // Center Star
    ctx.fillStyle = '#F59E0B';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', centerX, centerY);
  }, []);

  const handleSpin = async () => {
    if (spinning || spinsLeft <= 0 || !currentUser) return;

    setSpinning(true);
    setWonPrize(null);

    // Pick segment
    const rand = Math.random() * 100;
    let chosenIndex = 1; // Default ₹2
    if (rand < 5) chosenIndex = 5; // ₹100 (5%)
    else if (rand < 15) chosenIndex = 2; // ₹50 (10%)
    else if (rand < 30) chosenIndex = 7; // ₹20 (15%)
    else if (rand < 50) chosenIndex = 0; // ₹10 (20%)
    else if (rand < 70) chosenIndex = 3; // ₹5 (20%)
    else if (rand < 85) chosenIndex = 6; // ₹3 (15%)
    else chosenIndex = 1; // ₹2 (15%)

    const segmentAngle = 360 / SEGMENTS.length;
    const targetAngle = 360 - (chosenIndex * segmentAngle + segmentAngle / 2);
    const extraRotations = 360 * 5;
    const finalRotation = rotation + extraRotations + (targetAngle - (rotation % 360));

    setRotation(finalRotation);

    setTimeout(async () => {
      const prize = SEGMENTS[chosenIndex];
      setWonPrize(prize);
      setSpinning(false);
      setSpinsLeft(0);

      const now = Date.now();
      localStorage.setItem(`last_spin_${currentUser.uid}`, now.toString());
      setCooldownTime(12 * 60 * 60 * 1000);

      // Add to recent wins
      setRecentWins(prev => [
        { name: userProfile?.username || 'You', prize: prize.label, time: 'Just now' },
        ...prev.slice(0, 3)
      ]);

      if (prize.amount > 0) {
        try {
          const userRef = ref(db, `users/${currentUser.uid}`);
          const snap = await get(userRef);
          const currentProf = snap.val() || {};
          const currentBonus = Number(currentProf.bonusCash || 0);
          const currentTotal = Number(currentProf.balance || 0);
          const currentEarn = Number(currentProf.totalEarnings || 0);

          await update(userRef, {
            bonusCash: currentBonus + prize.amount,
            balance: currentTotal + prize.amount,
            totalEarnings: currentEarn + prize.amount
          });

          await recordTransaction(
            currentUser.uid,
            'bonus',
            prize.amount,
            `🎡 Fortune Spin Reward: ${prize.label}`,
            { source: 'spin_wheel', prizeLabel: prize.label }
          );

          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });

          await reloadUserProfile();
        } catch (err) {
          console.error("Error crediting spin reward:", err);
        }
      }
    }, 4000);
  };

  const formatCooldown = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-full pb-8">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <button
          onClick={onBack}
          className="btn btn-outline-light btn-sm rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white/10 transition-colors"
        >
          <i className="bi bi-arrow-left text-amber-400"></i> Back
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-white font-bold text-sm">Spin & Win</span>
        </div>
        <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-xl font-bold">
          ₹{userProfile?.balance?.toFixed(2) || '0.00'}
        </span>
      </div>

      {/* Wheel Arena */}
      <div className="p-4 rounded-3xl bg-zinc-900/90 border border-amber-500/20 shadow-xl relative overflow-hidden mb-4">
        {/* Pointer indicator */}
        <div className="relative flex flex-col items-center justify-center">
          <div 
            className="z-20 -mb-3 text-amber-400 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]"
            style={{ fontSize: '1.8rem' }}
          >
            ▼
          </div>

          {/* Rotating Wheel Canvas */}
          <div 
            className="relative rounded-full shadow-[0_0_30px_rgba(245,158,11,0.2)]"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
            }}
          >
            <canvas 
              ref={canvasRef} 
              style={{ width: '270px', height: '270px' }}
              className="rounded-full"
            />
          </div>
        </div>

        {/* Won Prize Banner */}
        {wonPrize && (
          <div className="mt-3.5 p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-center">
            <span className="text-white text-base font-black">🎉 {wonPrize.label} Won!</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 text-center">
          {spinsLeft > 0 ? (
            <button
              onClick={handleSpin}
              disabled={spinning}
              className="btn btn-warning w-full py-2.5 rounded-2xl font-black text-dark text-sm shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              {spinning ? 'Spinning...' : 'SPIN NOW ⚡'}
            </button>
          ) : (
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-2xl text-center flex items-center justify-between px-4">
              <span className="text-gray-400 text-xs font-medium">Next Spin In</span>
              <span className="font-mono text-amber-400 text-sm font-black">
                {cooldownTime ? formatCooldown(cooldownTime) : '12:00:00'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Prize Breakdown List */}
      <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-2xl mb-3">
        <div className="grid grid-cols-2 gap-1.5">
          {SEGMENTS.map((seg, idx) => (
            <div key={idx} className="p-2 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium flex items-center gap-1.5">
                <span>{seg.icon}</span> {seg.label}
              </span>
              <span className="text-amber-400 font-bold text-[11px]">
                {seg.amount > 0 ? `₹${seg.amount}` : 'Perk'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Live Winners */}
      <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-2xl">
        <div className="flex items-center justify-between text-gray-400 text-[11px] font-bold mb-2">
          <span>Recent Winners</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
        <div className="space-y-1">
          {recentWins.map((w, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-0.5">
              <span className="text-gray-300 font-medium">{w.name}</span>
              <span className="text-amber-400 font-bold">{w.prize}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
