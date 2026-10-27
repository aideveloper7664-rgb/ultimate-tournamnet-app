import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, update, push, db } from '../firebase';

const LEVEL_MILESTONES = [
  { level: 1, xpRequired: 0, rewardType: 'coins', rewardAmount: 10, label: '10 Wallet Coins', icon: 'bi-coin', desc: 'Welcome bonus for starting your esports journey.' },
  { level: 2, xpRequired: 50, rewardType: 'coins', rewardAmount: 20, label: '20 Wallet Coins', icon: 'bi-coin', desc: 'Achieved Level 2 milestone reward.' },
  { level: 3, xpRequired: 150, rewardType: 'spin', rewardAmount: 2, label: '2 Spin Tickets', icon: 'bi-disc-fill', desc: 'Unlock lucky wheel spins for bigger cash prizes.' },
  { level: 5, xpRequired: 400, rewardType: 'scratch', rewardAmount: 2, label: '2 Scratch Cards', icon: 'bi-stars', desc: 'Unlock scratch cards to win instant rewards.' },
  { level: 8, xpRequired: 800, rewardType: 'coins', rewardAmount: 50, label: '50 Wallet Coins', icon: 'bi-coin', desc: 'Elite gamer rank bonus.' },
  { level: 10, xpRequired: 1500, rewardType: 'coins', rewardAmount: 100, label: '100 Wallet Coins + VIP 3 Days', icon: 'bi-crown-fill', desc: 'Legendary milestone with VIP pass access.' }
];

export const LevelRewardsPage: React.FC = () => {
  const { currentUser, userProfile, reloadUserProfile, showSection } = useAuth();
  const [claimingLvl, setClaimingLvl] = useState<number | null>(null);

  const totalXp = userProfile?.xp || ((userProfile?.totalMatches || 0) * 20);
  const userLevel = Math.max(1, Math.floor(Math.sqrt(totalXp / 50)) + 1);
  const currentLevelBaseXp = 50 * Math.pow(userLevel - 1, 2);
  const nextLevelBaseXp = 50 * Math.pow(userLevel, 2);
  const xpIntoLevel = Math.max(0, totalXp - currentLevelBaseXp);
  const xpNeededForNext = Math.max(1, nextLevelBaseXp - currentLevelBaseXp);
  const levelProgress = Math.min(100, (xpIntoLevel / xpNeededForNext) * 100);

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
    } catch (err: any) {
      console.error('Error claiming level reward:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setClaimingLvl(null);
    }
  };

  return (
    <section id="level-rewards-section" className="section active py-3 px-3">
      {/* Top Header Navigation */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <button
          type="button"
          className="btn btn-dark btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center border border-secondary border-opacity-30"
          onClick={() => showSection('profile-section', true)}
          style={{ width: '38px', height: '38px' }}
        >
          <i className="bi bi-arrow-left fs-5 text-white"></i>
        </button>
        <h4 className="fw-extrabold text-white mb-0 d-flex align-items-center gap-2">
          <i className="bi bi-gift-fill text-warning"></i> Level Milestone Rewards
        </h4>
        <div style={{ width: '38px' }}></div>
      </div>

      {/* Main XP Status Hero Card */}
      <div
        className="p-4 rounded-4 shadow-lg mb-4 position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.25) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="position-absolute top-0 end-0 p-3 opacity-10">
          <i className="bi bi-trophy-fill display-2 text-warning"></i>
        </div>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-40 font-mono fw-bold px-3 py-1.5 rounded-pill">
            CURRENT RANK: LEVEL {userLevel}
          </span>
          <span className="text-secondary font-mono small fw-bold">
            Total XP: <span className="text-white">{totalXp} XP</span>
          </span>
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1.5 small font-mono">
            <span className="text-secondary">Progress to Level {userLevel + 1}</span>
            <span className="text-info fw-bold">{xpIntoLevel} / {xpNeededForNext} XP</span>
          </div>
          <div className="progress rounded-pill p-0.5" style={{ height: '10px', background: 'rgba(255, 255, 255, 0.1)' }}>
            <div
              className="progress-bar rounded-pill shadow-sm"
              style={{
                width: `${levelProgress}%`,
                background: 'linear-gradient(90deg, #38bdf8, #a855f7, #facc15)'
              }}
            ></div>
          </div>
        </div>

        <p className="text-secondary small mb-0 d-flex align-items-center gap-1.5">
          <i className="bi bi-lightning-charge-fill text-warning"></i> Play tournaments and matches to accumulate XP, level up, and unlock exclusive rewards!
        </p>
      </div>

      {/* Milestones List Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 px-1">
        <span className="text-secondary fw-bold small text-uppercase font-mono">Unlocked & Available Rewards</span>
        <span className="badge bg-dark bg-opacity-70 text-warning border border-warning border-opacity-20 font-mono extra-small">
          {Object.keys(claimedLevels).length} / {LEVEL_MILESTONES.length} Claimed
        </span>
      </div>

      {/* Milestones Cards List */}
      <div className="d-flex flex-column gap-3 mb-5">
        {LEVEL_MILESTONES.map((m) => {
          const isClaimed = !!claimedLevels[m.level];
          const isEligible = !isClaimed && totalXp >= m.xpRequired;

          return (
            <div
              key={m.level}
              className="p-3.5 rounded-4 border d-flex align-items-center justify-content-between shadow-sm transition-all"
              style={{
                background: isClaimed ? 'rgba(34, 197, 94, 0.08)' : isEligible ? 'rgba(250, 204, 21, 0.08)' : 'rgba(17, 24, 39, 0.8)',
                borderColor: isClaimed ? 'rgba(34, 197, 94, 0.3)' : isEligible ? 'rgba(250, 204, 21, 0.4)' : 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-4 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                  style={{
                    width: '50px',
                    height: '50px',
                    background: isClaimed ? 'rgba(34, 197, 94, 0.2)' : isEligible ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : 'rgba(255, 255, 255, 0.05)',
                    color: isClaimed ? '#22c55e' : isEligible ? '#0f172a' : '#94a3b8'
                  }}
                >
                  <i className={`bi ${m.icon} fs-4`}></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-0.5">
                    <span className="fw-extrabold text-white">Level {m.level} Milestone</span>
                    <span className="badge bg-dark bg-opacity-70 text-warning border border-warning border-opacity-20 font-mono extra-small px-2 py-0.5">
                      {m.xpRequired} XP
                    </span>
                  </div>
                  <div className="text-warning fw-bold small mb-1">{m.label}</div>
                  <div className="text-secondary extra-small">{m.desc}</div>
                </div>
              </div>

              <div className="flex-shrink-0 ms-2">
                {isClaimed ? (
                  <span className="badge bg-success bg-opacity-20 text-success border border-success border-opacity-30 font-mono py-2 px-3 fw-bold">
                    <i className="bi bi-check-circle-fill me-1"></i> Claimed
                  </span>
                ) : isEligible ? (
                  <button
                    type="button"
                    className="btn btn-warning fw-extrabold text-dark py-2 px-4 rounded-pill shadow-md"
                    style={{ background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' }}
                    disabled={claimingLvl === m.level}
                    onClick={() => handleClaimReward(m)}
                  >
                    {claimingLvl === m.level ? 'Claiming...' : 'Claim Now'}
                  </button>
                ) : (
                  <span className="badge bg-secondary bg-opacity-20 text-secondary border border-secondary border-opacity-20 font-mono py-2 px-3">
                    <i className="bi bi-lock-fill me-1"></i> Locked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
