import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, update, push, db } from '../firebase';

interface VipMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VipMembershipModal: React.FC<VipMembershipModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile, reloadUserProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('weekly');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const vipActive = userProfile?.vipActive === true && (userProfile?.vipExpiresAt || 0) > Date.now();
  const expiresAt = userProfile?.vipExpiresAt;
  const userBalance = userProfile?.balance || 0;

  const planPrices = {
    weekly: 99,
    monthly: 299
  };

  const currentPrice = planPrices[selectedPlan];

  const handleBuyVip = async () => {
    if (!currentUser || isProcessing) return;

    if (userBalance < currentPrice) {
      setMsg({ text: `Insufficient balance! You need ₹${currentPrice} to activate this pass.`, type: 'error' });
      return;
    }

    setIsProcessing(true);
    setMsg(null);

    try {
      const durationMs = selectedPlan === 'weekly' ? 7 * 86400000 : 30 * 86400000;
      const currentExpiry = vipActive && expiresAt ? Math.max(Date.now(), expiresAt) : Date.now();
      const newExpiry = currentExpiry + durationMs;
      const newBalance = userBalance - currentPrice;

      await update(ref(db, `users/${currentUser.uid}`), {
        vipActive: true,
        vipExpiresAt: newExpiry,
        vipPlan: selectedPlan,
        balance: newBalance
      });

      await push(ref(db, `transactions/${currentUser.uid}`), {
        type: 'vip',
        amount: -currentPrice,
        description: `VIP Membership (${selectedPlan === 'weekly' ? 'Weekly' : 'Monthly'} Pass)`,
        timestamp: Date.now()
      });

      await reloadUserProfile();
      setMsg({ text: 'VIP Membership Activated Successfully! 👑', type: 'success' });
      setTimeout(() => {
        setMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to activate VIP', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const vipBenefits = [
    { icon: 'bi-cash-coin', text: '3 withdrawals per day' },
    { icon: 'bi-percent', text: '20% lower minimum withdrawal limits' },
    { icon: 'bi-crown-fill', text: 'Crown symbol & VIP badge on profile and leaderboard' },
    { icon: 'bi-shield-fill-check', text: 'Priority match entries & reserved VIP match slots' },
    { icon: 'bi-headset', text: 'Direct 24/7 VIP priority support' },
    { icon: 'bi-lightning-charge-fill', text: 'Instant coin rewards bonus' }
  ];

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ zIndex: 1085, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="card border-0 rounded-4 shadow-2xl text-white p-4 w-100"
        style={{
          maxWidth: '440px',
          background: 'linear-gradient(165deg, #1e1154 0%, #0d0628 100%)',
          border: '1.5px solid rgba(250, 204, 21, 0.4)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Top Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.8rem' }}>👑</span>
            <h5 className="fw-extrabold text-warning mb-0 fs-5">VIP Membership</h5>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onClose}
          ></button>
        </div>

        {/* Current status card */}
        <div
          className="p-3 rounded-4 mb-3 position-relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)',
            border: '1px solid rgba(250, 204, 21, 0.3)'
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span className="extra-small text-secondary fw-bold text-uppercase d-block">Status</span>
              <strong className={vipActive ? 'text-warning fs-6 fw-extrabold' : 'text-slate-300 fs-6'}>
                {vipActive ? 'VIP ACTIVE 👑' : 'Standard Member'}
              </strong>
            </div>
            {vipActive && expiresAt && (
              <div className="text-end">
                <span className="extra-small text-secondary fw-bold text-uppercase d-block">Expires</span>
                <span className="small text-warning font-mono fw-bold">
                  {new Date(expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* VIP Benefits List */}
        <div className="mb-4">
          <h6 className="fw-bold text-warning small text-uppercase mb-2 tracking-wider">
            <i className="bi bi-stars me-1"></i> Premium VIP Privileges
          </h6>
          <div
            className="rounded-3 p-2.5 d-flex flex-column gap-2"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {vipBenefits.map((b, idx) => (
              <div key={idx} className="d-flex align-items-center gap-2.5 small text-light">
                <i className={`bi ${b.icon} text-warning flex-shrink-0`}></i>
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Selection */}
        <div className="mb-3">
          <label className="form-label extra-small text-secondary fw-bold text-uppercase d-block mb-2">
            Select Pass Duration
          </label>
          <div className="row g-2">
            <div className="col-6">
              <div
                className={`p-3 rounded-3 text-center cursor-pointer transition-all ${selectedPlan === 'weekly' ? 'border-warning' : 'border-secondary'}`}
                style={{
                  background: selectedPlan === 'weekly' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(0,0,0,0.3)',
                  border: `1.5px solid ${selectedPlan === 'weekly' ? '#facc15' : 'rgba(255,255,255,0.1)'}`
                }}
                onClick={() => setSelectedPlan('weekly')}
              >
                <span className="extra-small text-secondary fw-bold text-uppercase d-block">Weekly Pass</span>
                <strong className="fs-5 text-warning fw-extrabold font-mono d-block mt-0.5">₹99</strong>
                <small className="text-secondary extra-small">7 Days Access</small>
              </div>
            </div>

            <div className="col-6">
              <div
                className={`p-3 rounded-3 text-center cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'border-warning' : 'border-secondary'}`}
                style={{
                  background: selectedPlan === 'monthly' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(0,0,0,0.3)',
                  border: `1.5px solid ${selectedPlan === 'monthly' ? '#facc15' : 'rgba(255,255,255,0.1)'}`
                }}
                onClick={() => setSelectedPlan('monthly')}
              >
                <span className="extra-small text-secondary fw-bold text-uppercase d-block">Monthly Pass</span>
                <strong className="fs-5 text-warning fw-extrabold font-mono d-block mt-0.5">₹299</strong>
                <small className="text-secondary extra-small">30 Days (Save 30%)</small>
              </div>
            </div>
          </div>
        </div>

        {msg && (
          <div
            className={`p-2 rounded-3 small text-center mb-3 ${msg.type === 'success' ? 'bg-success bg-opacity-20 text-success border border-success border-opacity-30' : 'bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30'}`}
          >
            {msg.text}
          </div>
        )}

        <button
          type="button"
          className="btn btn-warning w-100 py-3 fw-extrabold text-dark rounded-3 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' }}
          disabled={isProcessing}
          onClick={handleBuyVip}
        >
          {isProcessing ? 'Activating...' : `Activate VIP Pass (₹${currentPrice})`}
        </button>
      </div>
    </div>
  );
};
