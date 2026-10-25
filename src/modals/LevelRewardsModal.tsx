import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, update, push, db } from '../firebase';

interface LevelRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_MILESTONES = [
  { level: 1, xpRequired: 0, rewardType: 'coins', rewardAmount: 10, label: '10 Wallet Coins', icon: 'bi-coin' },
  { level: 2, xpRequired: 50, rewardType: 'coins', rewardAmount: 20, label: '20 Wallet Coins', icon: 'bi-coin' },
  { level: 3, xpRequired: 150, rewardType: 'spin', rewardAmount: 2, label: '2 Spin Tickets', icon: 'bi-disc-fill' },
  { level: 5, xpRequired: 400, rewardType: 'scratch', rewardAmount: 2, label: '2 Scratch Cards', icon: 'bi-stars' },
  { level: 8, xpRequired: 800, rewardType: 'coins', rewardAmount: 50, label: '50 Wallet Coins', icon: 'bi-coin' },
  { level: 10, xpRequired: 1500, rewardType: 'coins', rewardAmount: 100, label: '100 Wallet Coins + VIP 3 Days', icon: 'bi-crown-fill' }
];

export const LevelRewardsModal: React.FC<LevelRewardsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile, reloadUserProfile } = useAuth();
  const [claimingLvl, setClaimingLvl] = useState<number | null>(null);

  if (!isOpen) return null;

  const totalXp = userProfile?.xp || ((userProfile?.totalMatches || 0) * 20);
  const userLevel = Math.max(1, Math.floor(Math.sqrt(totalXp / 50)) + 1);
  const claimedLevels: Record<string | number, boolean> = userProfile?.claimedLevels || {};

  const handleClaimReward = async (milestone: typeof LEVEL_MILESTONES[0]) => {
    if (!currentUser || claimingLvl !== null) return;
    setClaimingLvl(milestone.level);

    try {
      const updates: Record<string, any> = {
        [`claimedLevels/${milestone.level}`]: true
      };

      if (milestone.rewardType === 'coins') {
        const newBal = (userProfile?.balance || 0) + milestone.rewardAmount;
        updates['balance'] = newBal;

        await push(ref(db, `transactions/${currentUser.uid}`), {
          type: 'level_reward',
          amount: milestone.rewardAmount,
          description: `Level ${milestone.level} Milestone Reward: ₹${milestone.rewardAmount}`,
          timestamp: Date.now()
        });
      } else if (milestone.rewardType === 'spin') {
        const newSpins = (userProfile?.spinTickets || 0) + milestone.rewardAmount;
        updates['spinTickets'] = newSpins;
      } else if (milestone.rewardType === 'scratch') {
        const newCards = (userProfile?.scratchCards || 0) + milestone.rewardAmount;
        updates['scratchCards'] = newCards;
      }

      await update(ref(db, `users/${currentUser.uid}`), updates);
      await reloadUserProfile();
    } catch (err) {
      console.error('Error claiming level reward:', err);
    } finally {
      setClaimingLvl(null);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ zIndex: 1085, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="card border-0 rounded-4 shadow-2xl text-white p-4 w-100"
        style={{
          maxWidth: '430px',
          background: 'linear-gradient(165deg, #131738 0%, #0a0d22 100%)',
          border: '1px solid rgba(250, 204, 21, 0.3)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-gift-fill text-warning fs-4"></i>
            <h5 className="fw-extrabold text-white mb-0 fs-5">Level Milestone Rewards</h5>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onClose}
          ></button>
        </div>

        {/* Level Stats Pill Card */}
        <div
          className="p-3 rounded-4 mb-3 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}
        >
          <span className="badge bg-primary bg-opacity-30 text-info font-mono fw-bold px-3 py-1 mb-1">
            CURRENT: LEVEL {userLevel}
          </span>
          <div className="fs-3 fw-extrabold text-white font-mono">{totalXp} XP</div>
          <small className="text-secondary">Play matches to earn XP and level up!</small>
        </div>

        {/* Milestones List */}
        <div className="d-flex flex-column gap-2.5">
          {LEVEL_MILESTONES.map((m) => {
            const isClaimed = !!claimedLevels[m.level];
            const isEligible = !isClaimed && totalXp >= m.xpRequired;

            return (
              <div
                key={m.level}
                className="p-3 rounded-3 border d-flex align-items-center justify-content-between"
                style={{
                  background: isClaimed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(0,0,0,0.35)',
                  borderColor: isClaimed ? 'rgba(34, 197, 94, 0.25)' : isEligible ? 'rgba(250, 204, 21, 0.4)' : 'rgba(255,255,255,0.08)'
                }}
              >
                <div className="d-flex align-items-center gap-2.5">
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: '42px',
                      height: '42px',
                      background: isClaimed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(250, 204, 21, 0.15)',
                      color: isClaimed ? '#22c55e' : '#facc15'
                    }}
                  >
                    <i className={`bi ${m.icon} fs-5`}></i>
                  </div>
                  <div>
                    <div className="fw-bold text-white small">Level {m.level} Milestone</div>
                    <div className="text-warning extra-small fw-bold">{m.label}</div>
                    <span className="text-secondary font-mono" style={{ fontSize: '0.68rem' }}>Req: {m.xpRequired} XP</span>
                  </div>
                </div>

                <div>
                  {isClaimed ? (
                    <span className="badge bg-success bg-opacity-20 text-success border border-success border-opacity-30 font-mono py-1.5 px-2.5">
                      <i className="bi bi-check-lg me-1"></i> Claimed
                    </span>
                  ) : isEligible ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-warning fw-extrabold text-dark py-1.5 px-3 rounded-pill shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' }}
                      disabled={claimingLvl === m.level}
                      onClick={() => handleClaimReward(m)}
                    >
                      {claimingLvl === m.level ? 'Claiming...' : 'Claim'}
                    </button>
                  ) : (
                    <span className="badge bg-secondary bg-opacity-20 text-secondary border border-secondary border-opacity-20 font-mono py-1.5 px-2">
                      <i className="bi bi-lock-fill me-1"></i> Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
