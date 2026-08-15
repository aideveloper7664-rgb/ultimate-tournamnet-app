import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../firebase';
import confetti from 'canvas-confetti';

interface LuckyCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CouponDef {
  code: string;
  amount: number;
  title: string;
  desc: string;
}

const ACTIVE_COUPONS: CouponDef[] = [
  { code: 'WELCOME50', amount: 50, title: 'Welcome Gift', desc: 'Instant ₹50 free wallet credit' },
  { code: 'GAMER20', amount: 20, title: 'Esport Drop', desc: 'Free ₹20 entry voucher' },
  { code: 'LUCKY10', amount: 10, title: 'Daily Lucky Pass', desc: 'Claim ₹10 instant bonus cash' }
];

export const LuckyCouponModal: React.FC<LuckyCouponModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, reloadUserProfile } = useAuth();
  const [couponCode, setCouponCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleApplyCoupon = async (codeToUse?: string) => {
    const code = (codeToUse || couponCode).trim().toUpperCase();
    if (!code || !currentUser || loading) return;

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // Check already used
      const usedCouponsStr = localStorage.getItem(`used_coupons_${currentUser.uid}`) || '[]';
      const usedCoupons: string[] = JSON.parse(usedCouponsStr);

      if (usedCoupons.includes(code)) {
        setErrorMsg('You have already redeemed this coupon code!');
        setLoading(false);
        return;
      }

      // Check coupon match
      const matched = ACTIVE_COUPONS.find(c => c.code === code);
      let rewardAmount = 0;
      if (matched) {
        rewardAmount = matched.amount;
      } else if (code === 'VIP100') {
        rewardAmount = 100;
      } else {
        setErrorMsg('Invalid or expired coupon code. Try one from the active drops below!');
        setLoading(false);
        return;
      }

      // Credit wallet
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
        `🎟️ Lucky Coupon Redeemed: ${code}`,
        { couponCode: code, source: 'coupon_unlock' }
      );

      usedCoupons.push(code);
      localStorage.setItem(`used_coupons_${currentUser.uid}`, JSON.stringify(usedCoupons));

      setSuccessMsg(`🎉 Success! ₹${rewardAmount} credited to your wallet balance.`);
      setCouponCode('');

      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 }
      });

      await reloadUserProfile();
    } catch (err) {
      console.error("Coupon redemption error:", err);
      setErrorMsg('Failed to redeem coupon. Please try again.');
    } finally {
      setLoading(false);
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
            <span className="text-2xl">🎟️</span>
            <div>
              <h5 className="mb-0 text-white font-extrabold text-base flex items-center gap-2">
                Lucky Coupon Unlock
                <span className="badge bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Instant Cash
                </span>
              </h5>
              <p className="text-gray-400 text-xs mb-0">Enter voucher code to claim instant cash prizes!</p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-close btn-close-white opacity-75 hover:opacity-100 transition-opacity"
            onClick={onClose}
          ></button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[75vh] overflow-y-auto custom-scroll space-y-4">
          {/* Input Box */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <label className="text-xs text-gray-300 font-bold block mb-2">Enter Coupon Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME50"
                className="form-control bg-dark border-secondary border-opacity-40 text-white font-mono uppercase font-bold rounded-xl text-sm"
              />
              <button
                type="button"
                disabled={!couponCode.trim() || loading}
                onClick={() => handleApplyCoupon()}
                className="btn btn-warning text-dark font-bold rounded-xl px-4 text-xs shadow-sm flex-shrink-0"
              >
                {loading ? <div className="spinner-border spinner-border-sm" role="status"></div> : 'Redeem ⚡'}
              </button>
            </div>

            {errorMsg && (
              <div className="text-red-400 text-xs mt-2.5 flex items-center gap-1">
                <i className="bi bi-exclamation-circle-fill"></i> {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="text-emerald-400 text-xs mt-2.5 font-bold flex items-center gap-1">
                <i className="bi bi-check-circle-fill"></i> {successMsg}
              </div>
            )}
          </div>

          {/* Active Promo Drops */}
          <div className="space-y-2">
            <h6 className="text-white text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <i className="bi bi-gift-fill text-amber-400"></i> Active Lucky Coupon Drops
            </h6>
            {ACTIVE_COUPONS.map((c) => (
              <div
                key={c.code}
                className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:border-amber-500/40 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                    🎟️
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{c.title}</div>
                    <span className="text-gray-400 text-xs">{c.desc}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-amber-400 font-extrabold text-xs block mb-1">
                    {c.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setCouponCode(c.code); handleApplyCoupon(c.code); }}
                    className="btn btn-outline-warning btn-sm py-0.5 px-2.5 rounded-lg text-[11px] font-bold"
                  >
                    Apply ⚡
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
