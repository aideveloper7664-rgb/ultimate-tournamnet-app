import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ref, update, db, recordTransaction, get } from '../../firebase';
import confetti from 'canvas-confetti';

interface BonusZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  { id: 'first_deposit', title: '100% First Deposit Match', desc: 'Add ₹50 or more and get 100% matching bonus cash instantly', tag: 'Hot 🔥', rewardValue: '2X Cash', claimed: false, type: 'recharge' },
  { id: 'weekend_pass', title: 'Weekend Esports Cashback', desc: 'Get 20% loss protection cashback on all Saturday & Sunday contests', tag: 'VIP Pass', rewardValue: '20% Back', claimed: false, type: 'instant' },
  { id: 'mystery_box', title: 'Secret Mystery Gift Box', desc: 'Tap to unbox your secret surprise gift drop today', tag: 'Surprise 🎁', rewardValue: '₹5 - ₹100', claimed: false, type: 'instant' }
];

export const BonusZoneModal: React.FC<BonusZoneModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, reloadUserProfile, showSection } = useAuth();
  const [offers, setOffers] = useState<BonusOffer[]>(OFFERS);
  const [claiming, setClaiming] = useState<string | null>(null);

  const handleClaimOffer = async (offer: BonusOffer) => {
    if (!currentUser || claiming) return;

    if (offer.type === 'recharge') {
      onClose();
      showSection('recharge-section');
      return;
    }

    setClaiming(offer.id);
    try {
      const reward = offer.id === 'mystery_box' ? Math.floor(Math.random() * 20) + 10 : 15;

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
            <span className="text-2xl">💰</span>
            <div>
              <h5 className="mb-0 text-white font-extrabold text-base flex items-center gap-2">
                Bonus Zone
                <span className="badge bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Special Perks
                </span>
              </h5>
              <p className="text-gray-400 text-xs mb-0">Exclusive cash multipliers & cashback boosters!</p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-close btn-close-white opacity-75 hover:opacity-100 transition-opacity"
            onClick={onClose}
          ></button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[75vh] overflow-y-auto custom-scroll space-y-3">
          {offers.map((offer) => (
            <div 
              key={offer.id}
              className="p-3.5 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden hover:border-amber-500/40 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase mb-1">
                    {offer.tag}
                  </span>
                  <h6 className="text-white font-bold text-sm mb-0.5">{offer.title}</h6>
                  <p className="text-gray-400 text-xs mb-0">{offer.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-amber-400 font-extrabold text-sm block">
                    {offer.rewardValue}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end">
                {offer.claimed ? (
                  <span className="badge bg-emerald-500/20 text-emerald-400 text-[11px] px-3 py-1.5 rounded-xl font-bold">
                    Claimed ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={claiming === offer.id}
                    onClick={() => handleClaimOffer(offer)}
                    className="btn btn-warning btn-sm font-bold text-dark rounded-xl px-4 py-1.5 text-xs shadow-sm"
                  >
                    {claiming === offer.id ? (
                      <div className="spinner-border spinner-border-sm" role="status"></div>
                    ) : offer.type === 'recharge' ? (
                      'Deposit Now ⚡'
                    ) : (
                      'Claim Perk 🎁'
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
