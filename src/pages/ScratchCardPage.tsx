import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, update, push, db } from '../firebase';

export const ScratchCardPage: React.FC = () => {
  const { currentUser, userProfile, reloadUserProfile, showSection } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isScratching, setIsScratching] = useState<boolean>(false);
  const [scratchProgress, setScratchProgress] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [activeReward, setActiveReward] = useState<{ type: 'coins' | 'xp' | 'spin'; value: number; label: string } | null>(null);
  const [hasCardActive, setHasCardActive] = useState<boolean>(false);

  const scratchCards = userProfile?.scratchCards || 0;
  const scratchCoins = userProfile?.scratchCoins || 0;
  const matchesCount = (userProfile?.totalMatches || 0) % 7;

  // Initialize canvas layer
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 175;

    // Draw silver foil background with glitter particles
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#94a3b8');
    gradient.addColorStop(0.5, '#cbd5e1');
    gradient.addColorStop(1, '#64748b');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative pattern
    ctx.font = 'bold 15px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('✨ SCRATCH HERE ✨', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.fillText('Scratch to unveil guaranteed reward', canvas.width / 2, canvas.height / 2 + 15);
  };

  const handleUseCard = () => {
    if (scratchCards <= 0 || hasCardActive) return;

    // Pick weighted reward
    const rand = Math.random() * 100;
    let reward: { type: 'coins' | 'xp' | 'spin'; value: number; label: string };

    if (rand < 40) {
      reward = { type: 'coins', value: 5, label: '₹5 Wallet Coins' };
    } else if (rand < 70) {
      reward = { type: 'coins', value: 10, label: '₹10 Wallet Coins' };
    } else if (rand < 85) {
      reward = { type: 'xp', value: 50, label: '50 Level XP' };
    } else if (rand < 95) {
      reward = { type: 'spin', value: 1, label: '1 Free Spin Ticket' };
    } else {
      reward = { type: 'coins', value: 25, label: '₹25 Wallet Coins' };
    }

    setActiveReward(reward);
    setHasCardActive(true);
    setIsRevealed(false);
    setScratchProgress(0);

    setTimeout(() => {
      initCanvas();
    }, 50);
  };

  // Touch and Mouse scratch handlers
  const scratchAtPoint = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    checkClearedArea();
  };

  const checkClearedArea = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparentPixels = 0;
    const totalPixels = imgData.data.length / 4;

    for (let i = 3; i < imgData.data.length; i += 4 * 16) {
      if (imgData.data[i] === 0) {
        transparentPixels++;
      }
    }

    const pct = Math.min(100, (transparentPixels / (totalPixels / 16)) * 100);
    setScratchProgress(pct);

    if (pct > 40 && !isRevealed) {
      revealFullCard();
    }
  };

  const revealFullCard = async () => {
    setIsRevealed(true);
    setHasCardActive(false);

    if (!currentUser || !activeReward) return;

    // Haptic
    if ('vibrate' in navigator) {
      try { navigator.vibrate([40, 60, 80]); } catch (e) {}
    }

    try {
      const newCards = Math.max(0, scratchCards - 1);
      const updates: Record<string, any> = {
        scratchCards: newCards
      };

      if (activeReward.type === 'coins') {
        const newBal = (userProfile?.balance || 0) + activeReward.value;
        const newScratchCoins = scratchCoins + activeReward.value;
        updates['balance'] = newBal;
        updates['scratchCoins'] = newScratchCoins;

        await push(ref(db, `transactions/${currentUser.uid}`), {
          type: 'win',
          amount: activeReward.value,
          description: `Scratch Card Reward: ₹${activeReward.value}`,
          timestamp: Date.now()
        });
      } else if (activeReward.type === 'xp') {
        const newXp = (userProfile?.xp || 0) + activeReward.value;
        updates['xp'] = newXp;
      } else if (activeReward.type === 'spin') {
        const newSpins = (userProfile?.spinTickets || 0) + activeReward.value;
        updates['spinTickets'] = newSpins;
      }

      await update(ref(db, `users/${currentUser.uid}`), updates);
      await reloadUserProfile();
    } catch (err) {
      console.error('Error crediting scratch reward:', err);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  return (
    <section id="scratchcard-section" className="section active px-3 py-2 pb-5">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 pt-2">
        <button
          type="button"
          className="btn btn-sm btn-dark border border-secondary border-opacity-30 rounded-circle p-2"
          onClick={() => showSection('earn-section')}
        >
          <i className="bi bi-arrow-left fs-5"></i>
        </button>
        <h4 className="fw-extrabold text-white m-0 d-flex align-items-center gap-2">
          <i className="bi bi-stars text-warning"></i> Scratch Card
        </h4>
        <div style={{ width: '38px' }}></div>
      </div>

      <p className="text-secondary small text-center px-2 mb-3">
        Earn 1 free scratch card for every 7 matches you complete! Guaranteed wins on every card.
      </p>

      {/* Cards summary pills */}
      <div className="d-flex justify-content-center gap-3 mb-3">
        <div
          className="px-3 py-2 rounded-3 text-center"
          style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', minWidth: '115px' }}
        >
          <div className="text-secondary extra-small fw-bold text-uppercase">Cards Ready</div>
          <div className="fw-extrabold fs-4 text-warning">
            <i className="bi bi-stars me-1"></i>
            {scratchCards}
          </div>
        </div>

        <div
          className="px-3 py-2 rounded-3 text-center"
          style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', minWidth: '115px' }}
        >
          <div className="text-secondary extra-small fw-bold text-uppercase">Total Earned</div>
          <div className="fw-extrabold fs-4 text-info">
            <i className="bi bi-coin me-1"></i>
            ₹{scratchCoins}
          </div>
        </div>
      </div>

      {/* Progress track */}
      <div className="px-3 mb-4">
        <div className="d-flex justify-content-between small text-secondary mb-1 fw-bold">
          <span>Next Card Progress</span>
          <span>{matchesCount} / 7 matches</span>
        </div>
        <div className="progress rounded-pill" style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)' }}>
          <div
            className="progress-bar rounded-pill"
            style={{
              width: `${(matchesCount / 7) * 100}%`,
              background: 'linear-gradient(90deg, #f59e0b, #eab308)'
            }}
          ></div>
        </div>
      </div>

      {/* Scratch Card Area */}
      <div className="d-flex justify-content-center my-3">
        {!hasCardActive && !isRevealed ? (
          <div
            className="d-flex flex-column align-items-center justify-content-center p-4 rounded-4 text-center"
            style={{
              width: '300px',
              height: '175px',
              border: '2px dashed rgba(250, 204, 21, 0.4)',
              background: 'rgba(15, 23, 42, 0.6)'
            }}
          >
            <i className="bi bi-gift-fill text-warning mb-2" style={{ fontSize: '2.5rem' }}></i>
            <h6 className="fw-bold text-white mb-1">Scratch Card Awaiting</h6>
            <small className="text-secondary">Tap "Use Card" below to start scratching</small>
          </div>
        ) : (
          <div
            className="position-relative overflow-hidden rounded-4 shadow-lg"
            style={{
              width: '300px',
              height: '175px',
              border: '2px solid rgba(250, 204, 21, 0.5)',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
            }}
          >
            {/* Prize Underneath Layer */}
            <div
              className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 text-center"
              style={{ zIndex: 1 }}
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                style={{
                  width: '52px',
                  height: '52px',
                  background: activeReward?.type === 'coins' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                  color: activeReward?.type === 'coins' ? '#22c55e' : '#facc15'
                }}
              >
                <i className={`bi ${activeReward?.type === 'coins' ? 'bi-coin' : activeReward?.type === 'xp' ? 'bi-bar-chart-fill' : 'bi-ticket-perforated-fill'} fs-2`}></i>
              </div>
              <h5 className="fw-extrabold text-white mb-0 fs-5">{activeReward?.label}</h5>
              <small className="text-success fw-bold">🎉 Reward Claimed!</small>
            </div>

            {/* Canvas Scratcher Overlay */}
            {!isRevealed && (
              <canvas
                ref={canvasRef}
                className="position-absolute top-0 start-0 w-100 h-100"
                style={{ zIndex: 3, touchAction: 'none', cursor: 'pointer' }}
                onMouseDown={() => setIsScratching(true)}
                onMouseUp={() => setIsScratching(false)}
                onMouseMove={(e) => {
                  if (!isScratching) return;
                  const { x, y } = getCoordinates(e);
                  scratchAtPoint(x, y);
                }}
                onTouchStart={() => setIsScratching(true)}
                onTouchEnd={() => setIsScratching(false)}
                onTouchMove={(e) => {
                  if (!isScratching) return;
                  const { x, y } = getCoordinates(e);
                  scratchAtPoint(x, y);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Won Prize Celebration banner */}
      {isRevealed && activeReward && (
        <div
          className="text-center p-3 rounded-4 mb-3 mx-2"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
            border: '1.5px solid #22c55e'
          }}
        >
          <div className="fw-bold text-success fs-5">
            🎉 You Won {activeReward.label}!
          </div>
          <small className="text-light">Reward credited directly to your account.</small>
        </div>
      )}

      {/* Action Button */}
      <div className="px-3 mt-4">
        <button
          type="button"
          className="btn w-100 py-3 fw-extrabold text-uppercase rounded-4 shadow-lg text-dark"
          style={{
            background: scratchCards > 0 && !hasCardActive
              ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)'
              : 'rgba(255, 255, 255, 0.15)',
            color: scratchCards > 0 && !hasCardActive ? '#0f172a' : '#94a3b8',
            fontSize: '1.05rem',
            letterSpacing: '0.5px',
            border: 'none',
            boxShadow: scratchCards > 0 && !hasCardActive ? '0 6px 20px rgba(250, 204, 21, 0.35)' : 'none'
          }}
          disabled={scratchCards <= 0 || hasCardActive}
          onClick={handleUseCard}
        >
          <i className="bi bi-stars me-1.5"></i>
          {hasCardActive ? 'Scratch Card to Reveal' : `Use Card (${scratchCards} Cards)`}
        </button>

        {scratchCards <= 0 && (
          <p className="text-secondary extra-small text-center mt-2">
            No scratch cards available. Play 7 matches in tournaments to earn a free card!
          </p>
        )}
      </div>
    </section>
  );
};
