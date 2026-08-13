import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface FloatingSupportFABProps {
  onOpenAiSupport: () => void;
  onOpenDirectSupport: () => void;
}

export const FloatingSupportFAB: React.FC<FloatingSupportFABProps> = ({
  onOpenAiSupport,
  onOpenDirectSupport,
}) => {
  const { currentSection, userProfile, currentUser, appSettings } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Only show the floating FAB on the main home section, nowhere else
  if (currentSection !== 'home-section') {
    return null;
  }

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const handleAiClick = () => {
    setIsOpen(false);
    onOpenAiSupport();
  };

  const handleDirectClick = () => {
    setIsOpen(false);
    
    const userName = userProfile?.displayName || currentUser?.displayName || 'Gamer';
    const userEmailPhone = currentUser?.email || userProfile?.phoneNumber || 'N/A';
    const userId = currentUser?.uid || 'N/A';
    const gameUid = userProfile?.gameUid || 'Not updated';
    const walletBalance = userProfile?.walletBalance ?? 0;
    const supportPhone = appSettings?.supportContact || '9389660753';

    const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const textMessage = `Hello Customer Support,

My Account Details:
• Name: ${userName}
• Game UID: ${gameUid}
• Contact: ${userEmailPhone}
• User ID: ${userId}
• Wallet Balance: ₹${walletBalance}

I need direct help regarding my account.`;

    const link = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMessage)}`;
    window.open(link, '_blank');
  };

  return (
    <div className="floating-fab-container">
      {/* Backdrop overlay when speed dial is open */}
      {isOpen && (
        <div
          className="floating-fab-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sub-buttons list */}
      <div className={`fab-speed-dial ${isOpen ? 'open' : ''}`}>
        {/* 1. AI Customer Support Button */}
        <button
          type="button"
          className="fab-sub-btn fab-ai-btn"
          onClick={handleAiClick}
          title="AI Customer Support"
        >
          <span className="fab-sub-label">
            <i className="bi bi-robot me-1 text-info"></i> AI Customer Support
          </span>
          <div className="fab-sub-icon-circle ai-circle">
            <i className="bi bi-robot"></i>
            <span className="fab-sparkle-dot"></span>
          </div>
        </button>

        {/* 2. Direct Account Customer Support Button */}
        <button
          type="button"
          className="fab-sub-btn fab-direct-btn"
          onClick={handleDirectClick}
          title="Direct Customer Support"
        >
          <span className="fab-sub-label">
            <i className="bi bi-headset me-1 text-success"></i> Direct Support
          </span>
          <div className="fab-sub-icon-circle direct-circle">
            <i className="bi bi-person-headset"></i>
          </div>
        </button>
      </div>

      {/* Main Trigger FAB */}
      <button
        type="button"
        className={`fab-main-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle Customer Support"
      >
        <div className="fab-main-glow"></div>
        <div className="fab-icon-wrapper">
          <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-headset'} fab-icon`}></i>
        </div>
        {!isOpen && (
          <span className="fab-badge-pulse">Support</span>
        )}
      </button>
    </div>
  );
};
