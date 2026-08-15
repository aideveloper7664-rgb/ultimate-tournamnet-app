import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ReferEarnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferEarnModal: React.FC<ReferEarnModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile, appSettings } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);

  const referralCode = userProfile?.referralCode || currentUser?.uid?.substring(0, 7).toUpperCase() || 'ESPORT77';
  const referralBonus = appSettings.referralBonus ?? 50;
  const referralEarnings = userProfile?.referralEarnings || 0;

  const appUrl = window.location.origin;
  const shareText = `🔥 Join me on Esport Arena! Use my referral code: *${referralCode}* to get ₹10 Free Bonus & win real cash tournaments! 🎮 Play Now: ${appUrl}`;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsapp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleShareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
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
            <span className="text-2xl">👥</span>
            <div>
              <h5 className="mb-0 text-white font-extrabold text-base flex items-center gap-2">
                Refer & Earn Cash
                <span className="badge bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  ₹{referralBonus} Per Friend
                </span>
              </h5>
              <p className="text-gray-400 text-xs mb-0">Invite your squad and earn lifetime bonuses!</p>
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
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-center">
              <span className="text-gray-400 text-[11px] uppercase font-bold tracking-wider block mb-0.5">
                Total Earnings
              </span>
              <span className="text-amber-400 font-black text-xl">
                ₹{referralEarnings.toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-center">
              <span className="text-gray-400 text-[11px] uppercase font-bold tracking-wider block mb-0.5">
                Reward Per Friend
              </span>
              <span className="text-emerald-400 font-black text-xl">
                ₹{referralBonus}
              </span>
            </div>
          </div>

          {/* Referral Code Box */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 border-2 border-dashed border-amber-500/40 rounded-2xl text-center">
            <span className="text-gray-400 text-xs font-semibold block mb-1">
              Your Unique Referral Code
            </span>
            <div className="flex items-center justify-center gap-3 my-2">
              <span className="font-mono text-2xl font-black text-yellow-300 tracking-wider">
                {referralCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn btn-warning btn-sm font-bold text-dark rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-1"
              >
                <i className={`bi ${copied ? 'bi-check2' : 'bi-copy'}`}></i>
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-gray-400 text-[11px] mb-0">Share this code with friends during registration.</p>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleShareWhatsapp}
              className="py-3 px-4 rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <i className="bi bi-whatsapp text-base"></i>
              <span>Share on WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleShareTelegram}
              className="py-3 px-4 rounded-2xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <i className="bi bi-telegram text-base"></i>
              <span>Share on Telegram</span>
            </button>
          </div>

          {/* How It Works Steps */}
          <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 space-y-2.5">
            <h6 className="text-white font-bold text-xs flex items-center gap-1.5 mb-2">
              <i className="bi bi-info-circle-fill text-amber-400"></i> How Referral Works
            </h6>
            <div className="flex items-start gap-2.5 text-xs text-gray-300">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                1
              </span>
              <span>Share your referral code with gamers & friends.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-gray-300">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                2
              </span>
              <span>Your friend signs up and gets ₹10 welcome cash.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-gray-300">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                3
              </span>
              <span>When they join their first match, you get ₹{referralBonus} credited to your wallet!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
