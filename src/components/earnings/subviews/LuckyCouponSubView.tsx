import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../../firebase';
import confetti from 'canvas-confetti';

interface LuckyCouponSubViewProps {
  onBack: () => void;
}

interface CouponDef {
  code: string;
  amount: number;
  title: string;
  desc: string;
}

const ACTIVE_COUPONS: CouponDef[] = [
  { code: 'WELCOME50', amount: 50, title: 'Welcome Gift Drop', desc: 'Instant ₹50 free wallet credit voucher' },
  { code: 'GAMER20', amount: 20, title: 'Esport Pass Drop', desc: 'Free ₹20 entry voucher pass' },
  { code: 'LUCKY10', amount: 10, title: 'Daily Lucky Pass', desc: 'Claim ₹10 instant bonus cash drop' }
];

export const LuckyCouponSubView: React.FC<LuckyCouponSubViewProps> = ({ onBack }) => {
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

  return (
    <div className="min-h-full pb-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <button
          onClick={onBack}
          className="btn btn-outline-light btn-sm rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white/10 transition-colors"
        >
          <i className="bi bi-arrow-left text-teal-400"></i> Back
        </button>
        <span className="text-white font-bold text-sm">Lucky Coupons</span>
        <span className="badge bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs px-2.5 py-1 rounded-xl font-bold">
          Redeem Code
        </span>
      </div>

      {/* Redemption Form */}
      <div className="p-3 bg-zinc-900/90 border border-white/10 rounded-2xl shadow-sm mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="ENTER COUPON CODE"
            className="form-control bg-black border-white/10 text-white font-mono uppercase font-bold rounded-xl text-xs py-2 px-3"
          />
          <button
            type="button"
            disabled={!couponCode.trim() || loading}
            onClick={() => handleApplyCoupon()}
            className="btn btn-warning text-dark font-black rounded-xl px-3.5 text-xs shadow-sm flex-shrink-0"
          >
            {loading ? '...' : 'Apply ⚡'}
          </button>
        </div>

        {errorMsg && (
          <div className="text-red-400 text-[11px] mt-2 flex items-center gap-1">
            <i className="bi bi-exclamation-circle-fill"></i> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="text-emerald-400 text-[11px] mt-2 font-bold flex items-center gap-1">
            <i className="bi bi-check-circle-fill"></i> {successMsg}
          </div>
        )}
      </div>

      {/* Active Drops */}
      <div className="space-y-2 mb-4">
        {ACTIVE_COUPONS.map((c) => (
          <div
            key={c.code}
            className="p-2.5 bg-zinc-900/80 border border-white/5 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm">
                🎟️
              </div>
              <div>
                <div className="text-white font-bold text-xs">{c.title}</div>
                <span className="font-mono text-amber-400 font-bold text-[11px]">{c.code}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setCouponCode(c.code); handleApplyCoupon(c.code); }}
              className="btn btn-outline-warning btn-sm py-1 px-2.5 rounded-xl text-xs font-bold"
            >
              Use ⚡
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
