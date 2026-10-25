import React from 'react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenWorldChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications, onOpenWorldChat }) => {
  const {
    currentUser,
    userProfile,
    appSettings,
    currentSection,
    navigationStack,
    showSection,
    selectedGameName,
    unreadNotificationsCount,
    setIsDrawerOpen
  } = useAuth();

  const isSubPage = [
    'tournaments-section',
    'recharge-section',
    'earnings-section',
    'earn-section',
    'spinwheel-section',
    'scratchcard-section',
    'lottery-section',
    'shop-section'
  ].includes(currentSection);
  const defaultTitleVisible = !isSubPage;

  let pageTitle = '';
  if (isSubPage) {
    switch (currentSection) {
      case 'tournaments-section':
        pageTitle = selectedGameName || 'Tournaments';
        break;
      case 'recharge-section':
        pageTitle = 'Recharge';
        break;
      case 'earnings-section':
        pageTitle = 'Earnings History';
        break;
      case 'earn-section':
        pageTitle = 'Earn Rewards';
        break;
      case 'spinwheel-section':
        pageTitle = 'Spin to Win';
        break;
      case 'scratchcard-section':
        pageTitle = 'Scratch Card';
        break;
      case 'lottery-section':
        pageTitle = 'Lucky Draw';
        break;
      case 'shop-section':
        pageTitle = 'Gaming Store';
        break;
    }
  }

  const handleBackClick = () => {
    if (navigationStack.length > 1) {
      const newStack = [...navigationStack];
      newStack.pop();
      const prevSection = newStack[newStack.length - 1];
      if (prevSection) {
        showSection(prevSection, true);
      }
    } else {
      showSection('home-section');
    }
  };

  const displayName = userProfile?.displayName?.split(' ')[0] || (currentUser?.email?.split('@')[0]) || 'Guest';
  const balance = userProfile?.balance || 0;
  const logoUrl = appSettings.logoUrl || "https://i.ibb.co/Fny3v3b/logo.png";

  return (
    <header className="app-header">
      <div className="header-left">
        {isSubPage && (
          <button className="header-back-button" onClick={handleBackClick} style={{ display: 'inline-block' }}>
            <i className="bi bi-arrow-left"></i>
          </button>
        )}
        <img
          src={logoUrl}
          alt="Logo"
          className="header-logo"
          onClick={() => showSection('home-section')}
          style={{ cursor: 'pointer' }}
        />
        {defaultTitleVisible && (
          <div className="header-title">
            Welcome <span>{displayName} {userProfile?.vipActive && '👑'}</span>
          </div>
        )}
        {isSubPage && (
          <div className="header-game-title" style={{ display: 'block' }}>
            {pageTitle}
          </div>
        )}
      </div>

      <div className="header-right">
        <button
          className="world-chat-icon-btn"
          onClick={onOpenWorldChat}
          title="World Chat"
        >
          <i className="bi bi-globe2"></i>
          <span className="world-chat-pulse-dot"></span>
        </button>

        <button className="notification-icon" onClick={onOpenNotifications} title="Notifications">
          <i className="bi bi-bell-fill"></i>
          {unreadNotificationsCount > 0 && (
            <span className="notification-badge">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {currentUser && (
          <button
            className="wallet-chip"
            onClick={() => showSection('wallet-section')}
          >
            <i className="bi bi-wallet-fill"></i> ₹ {Math.floor(balance)}
          </button>
        )}
      </div>
    </header>
  );
};
