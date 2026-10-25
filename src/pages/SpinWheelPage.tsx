import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, update, push, db } from '../firebase';

const SPIN_SEGMENTS = [
  { value: 1, label: '₹1', color: '#64748b', textColor: '#0f172a' },
  { value: 2, label: '₹2', color: '#06b6d4', textColor: '#0f172a' },
  { value: 5, label: '₹5', color: '#22c55e', textColor: '#0f172a' },
  { value: 10, label: '₹10', color: '#f59e0b', textColor: '#0f172a' },
  { value: 50, label: '₹50\nMINI', color: '#eab308', textColor: '#0f172a' },
  { value: 500, label: '₹500\nMEGA', color: '#d946ef', textColor: '#ffffff' }
];

export const SpinWheelPage: React.FC = () => {
  const { currentUser, userProfile, reloadUserProfile, showSection } = useAuth();
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationDegree, setRotationDegree] = useState<number>(0);
  const [wonPrize, setWonPrize] = useState<number | null>(null);

  const spinTickets = userProfile?.spinTickets || 0;
  const earnedCoins = userProfile?.spinCoins || 0;
  const matchesCount = (userProfile?.totalMatches || 0) % 5;

  const handleSpinClick = async () => {
    if (!currentUser || isSpinning || spinTickets <= 0) return;

    setIsSpinning(true);
    setWonPrize(null);

    // Weighted random selection:
    // Higher chance for 1, 2, 5, 10; lower chance for 50, 500
    const rand = Math.random() * 100;
    let chosenIdx = 0;
    if (rand < 40) chosenIdx = 0; // ₹1 (40%)
    else if (rand < 70) chosenIdx = 1; // ₹2 (30%)
    else if (rand < 88) chosenIdx = 2; // ₹5 (18%)
    else if (rand < 96) chosenIdx = 3; // ₹10 (8%)
    else if (rand < 99) chosenIdx = 4; // ₹50 (3%)
    else chosenIdx = 5; // ₹500 (1%)

    const segmentAngle = 360 / SPIN_SEGMENTS.length; // 60 deg
    const targetAngle = chosenIdx * segmentAngle + segmentAngle / 2;
    // 5 full spins + landing offset
    const finalDegree = rotationDegree + 360 * 5 + (360 - (rotationDegree % 360)) + (360 - targetAngle);

    setRotationDegree(finalDegree);

    // Haptic feedback
    if ('vibrate' in navigator) {
      try { navigator.vibrate([30, 40, 50]); } catch (e) {}
    }

    // Wait for wheel animation (4.5s)
    setTimeout(async () => {
      setIsSpinning(false);
      const prize = SPIN_SEGMENTS[chosenIdx].value;
      setWonPrize(prize);

      try {
        const newTickets = Math.max(0, spinTickets - 1);
        const newBalance = (userProfile?.balance || 0) + prize;
        const newEarned = earnedCoins + prize;

        await update(ref(db, `users/${currentUser.uid}`), {
          balance: newBalance,
          spinTickets: newTickets,
          spinCoins: newEarned
        });

        // Log transaction
        await push(ref(db, `transactions/${currentUser.uid}`), {
          type: 'win',
          amount: prize,
          description: `Spin to Win Reward: ₹${prize}`,
          timestamp: Date.now()
        });

        await reloadUserProfile();
      } catch (err) {
        console.error('Error saving spin prize:', err);
      }
    }, 4500);
  };

  return (
    <section id="spinwheel-section" className="section active px-3 py-2 pb-5">
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
          <i className="bi bi-disc-fill text-pink-500"></i> Spin to Win
        </h4>
        <div style={{ width: '38px' }}></div>
      </div>

      <p className="text-secondary small text-center px-2 mb-3">
        Earn 1 free spin ticket for every 5 matches you play! Coins won are instantly added to your wallet.
      </p>

      {/* Ticket & Coins summary pill */}
      <div className="d-flex justify-content-center gap-3 mb-3">
        <div
          className="px-3 py-2 rounded-3 text-center"
          style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', minWidth: '115px' }}
        >
          <div className="text-secondary extra-small fw-bold text-uppercase">Tickets</div>
          <div className="fw-extrabold fs-4 text-warning">
            <i className="bi bi-ticket-perforated-fill me-1"></i>
            {spinTickets}
          </div>
        </div>

        <div
          className="px-3 py-2 rounded-3 text-center"
          style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', minWidth: '115px' }}
        >
          <div className="text-secondary extra-small fw-bold text-uppercase">Won Coins</div>
          <div className="fw-extrabold fs-4 text-info">
            <i className="bi bi-coin me-1"></i>
            ₹{earnedCoins}
          </div>
        </div>
      </div>

      {/* Matches progress to next ticket */}
      <div className="px-3 mb-4">
        <div className="d-flex justify-content-between small text-secondary mb-1 fw-bold">
          <span>Next Ticket Progress</span>
          <span>{matchesCount} / 5 matches</span>
        </div>
        <div className="progress rounded-pill" style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)' }}>
          <div
            className="progress-bar rounded-pill"
            style={{
              width: `${(matchesCount / 5) * 100}%`,
              background: 'linear-gradient(90deg, #ec4899, #f59e0b)'
            }}
          ></div>
        </div>
      </div>

      {/* Interactive Wheel Container */}
      <div className="d-flex justify-content-center my-3 position-relative">
        <div style={{ position: 'relative', width: '280px', height: '280px' }}>
          {/* Top Pointer */}
          <div
            style={{
              position: 'absolute',
              top: '-14px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              fontSize: '2rem',
              color: '#ffffff',
              filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.7))'
            }}
          >
            <i className="bi bi-caret-down-fill text-warning"></i>
          </div>

          {/* Wheel Disc */}
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '6px solid #1e1b4b',
              boxShadow: '0 0 0 3px rgba(250, 204, 21, 0.4), 0 10px 30px rgba(0,0,0,0.6)',
              position: 'relative',
              overflow: 'hidden',
              transform: `rotate(${rotationDegree}deg)`,
              transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0.85, 0.1, 1)' : 'none',
              background: `conic-gradient(
                #64748b 0deg 60deg,
                #06b6d4 60deg 120deg,
                #22c55e 120deg 180deg,
                #f59e0b 180deg 240deg,
                #eab308 240deg 300deg,
                #d946ef 300deg 360deg
              )`
            }}
          >
            {/* Labels on each slice */}
            {SPIN_SEGMENTS.map((seg, idx) => {
              const deg = idx * 60 + 30;
              return (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '0',
                    height: '0',
                    transform: `rotate(${deg}deg)`
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: '-110px',
                      transform: 'translateX(-50%)',
                      display: 'block',
                      width: '60px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: seg.value >= 50 ? '0.72rem' : '1.05rem',
                      color: seg.textColor,
                      lineHeight: '1.15',
                      whiteSpace: 'pre-line',
                      textShadow: '0 1px 2px rgba(255,255,255,0.3)'
                    }}
                  >
                    {seg.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Center Hub */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              color: '#ffffff',
              boxShadow: '0 0 0 4px #1e1b4b, 0 4px 14px rgba(0,0,0,0.5)',
              zIndex: 5
            }}
          >
            <i className="bi bi-stars"></i>
          </div>
        </div>
      </div>

      {/* Won Prize Celebration banner */}
      {wonPrize !== null && (
        <div
          className="text-center p-3 rounded-4 mb-3 mx-2"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
            border: '1.5px solid #22c55e',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <div className="fw-bold text-success fs-5">
            🎉 You Won ₹{wonPrize}!
          </div>
          <small className="text-light">Coins added directly to your wallet balance.</small>
        </div>
      )}

      {/* Action Button */}
      <div className="px-3 mt-4">
        <button
          type="button"
          className="btn w-100 py-3 fw-extrabold text-uppercase rounded-4 shadow-lg text-dark"
          style={{
            background: spinTickets > 0 && !isSpinning
              ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)'
              : 'rgba(255, 255, 255, 0.15)',
            color: spinTickets > 0 && !isSpinning ? '#0f172a' : '#94a3b8',
            fontSize: '1.05rem',
            letterSpacing: '0.5px',
            border: 'none',
            boxShadow: spinTickets > 0 && !isSpinning ? '0 6px 20px rgba(250, 204, 21, 0.35)' : 'none'
          }}
          disabled={spinTickets <= 0 || isSpinning}
          onClick={handleSpinClick}
        >
          {isSpinning ? (
            <span>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Spinning Wheel...
            </span>
          ) : (
            <span>
              <i className="bi bi-arrow-repeat me-1.5"></i>
              Spin Now ({spinTickets} Tickets)
            </span>
          )}
        </button>

        {spinTickets <= 0 && (
          <p className="text-secondary extra-small text-center mt-2">
            No spin tickets available. Play 5 matches in tournaments to earn 1 free spin!
          </p>
        )}
      </div>
    </section>
  );
};
