import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

interface ReferEarnSubViewProps {
  onBack: () => void;
}

export const ReferEarnSubView: React.FC<ReferEarnSubViewProps> = ({ onBack }) => {
  const { userProfile } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);

  const referralCode = userProfile?.referralCode || 'ESPORT777';
  const referralLink = `https://ais-dev-efqwfhtaxakx5kktvoptct-840513166105.asia-southeast1.run.app?ref=${referralCode}`;
  const shareText = `🔥 Play Free Fire, BGMI & Ludo tournaments and win REAL CASH on GamerArena! Sign up using my referral code ${referralCode} to get ₹50 free bonus cash: ${referralLink}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="min-h-full pb-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <button
          onClick={onBack}
          className="btn btn-outline-light btn-sm rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white/10 transition-colors"
        >
          <i className="bi bi-arrow-left text-blue-400"></i> Back
        </button>
        <span className="text-white font-bold text-sm">Refer & Earn</span>
        <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-xl font-bold">
          ₹50 / Friend
        </span>
      </div>

      {/* Code Box */}
      <div className="p-3 bg-zinc-900/90 border border-white/10 rounded-2xl mb-3 flex items-center justify-between gap-2 shadow-sm">
        <div>
          <span className="text-[10px] text-gray-400 font-bold block">Referral Code</span>
          <span className="font-mono text-amber-400 font-black text-base">{referralCode}</span>
        </div>
        <button
          onClick={handleCopy}
          className="btn btn-warning btn-sm font-black text-dark rounded-xl px-3 py-1.5 text-xs shadow-sm active:scale-95"
        >
          {copied ? 'Copied ✓' : 'Copy 📋'}
        </button>
      </div>

      {/* Share Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={handleShareWhatsApp}
          className="btn btn-success py-2.5 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110 active:scale-95"
        >
          <i className="bi bi-whatsapp"></i> WhatsApp
        </button>
        <button
          onClick={handleShareTelegram}
          className="btn btn-info py-2.5 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110 active:scale-95"
        >
          <i className="bi bi-telegram"></i> Telegram
        </button>
      </div>

      {/* Reward steps */}
      <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-2xl space-y-2 text-xs">
        <div className="flex items-center justify-between text-gray-300">
          <span>Friend Registers</span>
          <span className="text-amber-400 font-bold">₹50 Bonus</span>
        </div>
        <div className="flex items-center justify-between text-gray-300">
          <span>Friend Plays Tournaments</span>
          <span className="text-emerald-400 font-bold">10% Commission</span>
        </div>
      </div>
    </div>
  );
};
