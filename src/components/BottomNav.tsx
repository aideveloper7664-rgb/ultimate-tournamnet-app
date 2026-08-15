import React from 'react';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const { currentSection, showSection, currentUser } = useAuth();

  const handleNavClick = (sectionId: string) => {
    showSection(sectionId);
  };

  if (currentSection === 'login-section') {
    return null;
  }

  const getEffectiveSection = (sec: string) => {
    if (sec === 'tournaments-section') return 'home-section';
    if (sec === 'recharge-section') return 'wallet-section';
    return sec;
  };

  const effectiveSection = getEffectiveSection(currentSection);

  const navItems = [
    { id: 'home-section', label: 'Home', icon: 'bi-grid-fill' },
    ...(currentUser ? [
      { id: 'earnings-section', label: 'Earnings', icon: 'bi-cash-stack' },
      { id: 'leaderboard-section', label: 'Ranks', icon: 'bi-trophy-fill' },
      { id: 'wallet-section', label: 'Wallet', icon: 'bi-wallet2' },
      { id: 'profile-section', label: 'Profile', icon: 'bi-person-circle' },
    ] : [])
  ];

  const activeIndex = navItems.findIndex(item => item.id === effectiveSection);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <nav className="bottom-nav liquid-nav">
      <ul className="liquid-nav-list" style={{ '--nav-count': navItems.length } as React.CSSProperties}>
        {navItems.map((item) => {
          const isActive = effectiveSection === item.id;
          return (
            <li key={item.id} className={`liquid-nav-item ${isActive ? 'active' : ''}`}>
              <button
                type="button"
                className="liquid-nav-link"
                onClick={() => handleNavClick(item.id)}
              >
                <span className="icon">
                  <i className={`bi ${item.icon}`}></i>
                </span>
                <span className="text">{item.label}</span>
              </button>
            </li>
          );
        })}
        {navItems.length > 0 && (
          <div
            className={`liquid-indicator ${safeActiveIndex === 0 ? 'at-start' : ''} ${safeActiveIndex === navItems.length - 1 ? 'at-end' : ''}`}
            style={{
              transform: `translateX(${safeActiveIndex * 100}%)`,
              width: `calc(100% / ${navItems.length})`
            }}
          >
            <div className="indicator-circle"></div>
          </div>
        )}
      </ul>
    </nav>
  );
};

