import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../../firebase';
import confetti from 'canvas-confetti';

interface BonusZoneSubViewProps {
  onBack: () => void;
}

interface BonusOffer {
  id: string;
  title: string;
  desc: string;
  tag: string;
  rewardValue: string;
  claimed: boolean;
  type: 'instant' | 'recharge';
}

const OFFERS: BonusOffer[] = [
  { id: 'first_deposit', title: '100% First Deposit Match', desc: 'Add ₹50 or more and get 100% matching bonus cash instantly into your vault', tag: 'Hot 🔥', rewardValue: '2X Cash', claimed: false, type: 'recharge' },
  { id: 'weekend_pass', title: 'Weekend Esports Cashback', desc: 'Get 20% loss protection cashback on all Saturday & Sunday tournament contests', tag: 'VIP Pass', rewardValue: '20% Back', claimed: false, type: 'instant' },
  { id: 'mystery_box', title: 'Secret Mystery Gift Box', desc: 'Tap to unbox your secret surprise gift drop today', tag: 'Surprise 🎁', rewardValue: '₹10 - ₹100', claimed: false, type: 'instant' }
];

export const BonusZoneSubView: React.FC<BonusZoneSubViewProps> = ({ onBack }) => {
  const { currentUser, reloadUserProfile, showSection } = useAuth();
  const [offers, setOffers] = useState<BonusOffer[]>(OFFERS);
  const [claiming, setClaiming] = useState<string | null>(null);

  const handleClaimOffer = async (offer: BonusOffer) => {
    if (!currentUser || claiming) return;

    if (offer.type === 'recharge') {
      showSection('recharge-section');
      return;
    }

    setClaiming(offer.id);
    try {
      const reward = offer.id === 'mystery_box' ? Math.floor(Math.random() * 25) + 15 : 20;

      const userRef = ref(db, `users/${currentUser.uid}`);
      const snap = await get(userRef);
      const currentProf = snap.val() || {};
      const currentBonus = Number(currentProf.bonusCash || 0);
      const currentTotal = Number(currentProf.balance || 0);
      const currentEarn = Number(currentProf.totalEarnings || 0);

      await update(userRef, {
        bonusCash: currentBonus + reward,
        balance: currentTotal + reward,
        totalEarnings: currentEarn + reward
      });

      await recordTransaction(
        currentUser.uid,
        'bonus',
        reward,
        `💰 Bonus Zone Claimed: ${offer.title}`,
        { offerId: offer.id, source: 'bonus_zone' }
      );

      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, claimed: true } : o));

      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 }
      });

      await reloadUserProfile();
    } catch (e) {
      console.error("Bonus zone claim error:", e);
    } finally {
      setClaiming(null);
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
          <i className="bi bi-arrow-left text-amber-400"></i> Back
        </button>
        <span className="text-white font-bold text-sm">Bonus Zone</span>
        <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-xl font-bold">
          Promos
        </span>
      </div>

      {/* Offers List */}
      <div className="space-y-2.5 mb-4">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="p-3 bg-zinc-900/90 border border-white/10 rounded-2xl relative overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <h6 className="text-white font-bold text-xs mb-0.5">{offer.title}</h6>
                <span className="text-amber-400 font-black text-xs">
                  {offer.rewardValue}
                </span>
              </div>
              <span className="badge bg-amber-500/20 text-amber-400 text-[9px] px-2 py-0.5 rounded-full uppercase font-bold">
                {offer.tag}
              </span>
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-end">
              {offer.claimed ? (
                <span className="text-emerald-400 text-xs font-bold px-2 py-1">
                  ✓ Claimed
                </span>
              ) : (
                <button
                  type="button"
                  disabled={claiming === offer.id}
                  onClick={() => handleClaimOffer(offer)}
                  className="btn btn-warning btn-sm font-black text-dark rounded-xl px-3.5 py-1.5 text-xs shadow-sm active:scale-95"
                >
                  {claiming === offer.id ? '...' : offer.type === 'recharge' ? 'Deposit ⚡' : 'Claim 🎁'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
