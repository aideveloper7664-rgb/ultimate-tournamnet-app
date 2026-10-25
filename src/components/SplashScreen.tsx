import React, { useEffect, useState } from 'react';

export const SplashScreen: React.FC = () => {
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [isDestroyed, setIsDestroyed] = useState<boolean>(false);

  useEffect(() => {
    // Automatically transition to the app quickly so navigation is immediately functional
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsDestroyed(true);
      }, 300);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  if (isDestroyed) return null;

  return (
    <div
      className={`splash-wrapper ${isExiting ? 'splash-warp-out' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #050510 0%, #0F172A 100%)',
        color: '#fff',
        pointerEvents: isExiting ? 'none' : 'auto'
      }}
    >
      <div className="text-center">
        <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#FACC15', marginBottom: '8px', letterSpacing: '1px' }}>
          GAMER ARENA
        </h1>
        <div className="spinner-border text-warning spinner-border-sm" role="status"></div>
      </div>
    </div>
  );
};


