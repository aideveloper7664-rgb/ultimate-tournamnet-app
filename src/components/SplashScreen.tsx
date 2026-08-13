import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const SplashScreen: React.FC = () => {
  const [hidden, setHidden] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Initializing Arena...');
  const { appSettings } = useAuth();

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2400;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(Math.floor((elapsed / duration) * 100), 100);
      
      setProgress(currentProgress);

      if (currentProgress < 25) {
        setStatusText('Initializing Arena Engine...');
      } else if (currentProgress < 55) {
        setStatusText('Loading Tournaments & Contests...');
      } else if (currentProgress < 85) {
        setStatusText('Connecting Gaming Servers...');
      } else {
        setStatusText('Ready to Battle!');
      }

      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setHidden(true);
        }, 200);
      }
    }, 35);

    return () => clearInterval(interval);
  }, []);

  const logoUrl = appSettings.splashLogoUrl || appSettings.logoUrl || "https://i.ibb.co/hR5GTCZX/logo.jpg";
  const appName = appSettings.logoUrl ? 'Tournament App' : 'Gamer Zone';

  return (
    <div
      id="splash-screen"
      className={`splash-wrapper ${hidden ? 'splash-hidden' : ''}`}
    >
      <div className="splash-bg-glow splash-glow-1"></div>
      <div className="splash-bg-glow splash-glow-2"></div>
      <div className="splash-grid-pattern"></div>

      <div className="splash-content">
        <div className="splash-logo-box">
          <div className="cyber-ring ring-outer"></div>
          <div className="cyber-ring ring-inner"></div>
          
          <div className="splash-logo-circle">
            <img src={logoUrl} alt="Logo" className="splash-logo-img" />
          </div>

          <div className="splash-badge">
            <i className="bi bi-controller"></i>
          </div>
        </div>

        <h1 className="splash-title">{appName}</h1>
        <p className="splash-subtitle">PREPARE FOR BATTLE • WIN REWARDS</p>

        <div className="splash-progress-container">
          <div className="splash-progress-header">
            <span className="splash-status-text">
              <i className="bi bi-lightning-charge-fill text-warning me-1"></i>
              {statusText}
            </span>
            <span className="splash-percent">{progress}%</span>
          </div>

          <div className="splash-progress-track">
            <div
              className="splash-progress-fill"
              style={{ width: `${progress}%` }}
            >
              <div className="splash-progress-glow"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

