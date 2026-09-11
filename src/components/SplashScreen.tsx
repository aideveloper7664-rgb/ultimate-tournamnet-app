import React, { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onStart?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const [isPausedAtEnd, setIsPausedAtEnd] = useState<boolean>(false);
  const [showStartBtn, setShowStartBtn] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [isDestroyed, setIsDestroyed] = useState<boolean>(false);
  const [useFallbackIframe, setUseFallbackIframe] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Synthesize a heavy sci-fi gaming launch sound (Web Audio API)
  const playStartSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      
      // Heavy sub-bass drop impact
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.42);
      gain.gain.setValueAtTime(0.9, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.42);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);

      // Cyber laser sweep sound
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(380, audioCtx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(920, audioCtx.currentTime + 0.22);
      gain2.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.28);
    } catch (e) {
      // AudioContext muted/unsupported
    }
  };

  // Trigger video pause when exactly 9.9 seconds have played (as requested)
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isPausedAtEnd) return;

    // Pause exactly at 9.9s before end
    const pauseThreshold = 9.9;

    if (video.currentTime >= pauseThreshold) {
      video.pause();
      setIsPausedAtEnd(true);
      setShowStartBtn(true);
    }
  };

  // Safety fallback timer if timeupdate has delay or duration is pending (at 9.9s)
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!isPausedAtEnd) {
        if (videoRef.current) {
          videoRef.current.pause();
        }
        setIsPausedAtEnd(true);
        setShowStartBtn(true);
      }
    }, 9900);

    return () => clearTimeout(safetyTimer);
  }, [isPausedAtEnd]);

  // Attempt unmuted autoPlay
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser strictly blocks unmuted autoplay without gesture, fallback to muted play
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, []);

  const handleStartClick = () => {
    if (isExiting) return;
    setIsExiting(true);
    playStartSound();

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([40, 50, 90]);
      } catch (e) {}
    }

    // Trigger khatarnak cascade drop-in animation across all elements in the app
    onStart?.();

    // After warp-out animation finishes, unmount splash completely
    setTimeout(() => {
      setIsDestroyed(true);
    }, 580);
  };

  if (isDestroyed) {
    return null;
  }

  return (
    <div
      id="splash-screen"
      className={`splash-wrapper ${isExiting ? 'splash-warp-out' : ''}`}
    >
      <div className="splash-video-container">
        {useFallbackIframe ? (
          <iframe
            src="https://streamable.com/e/7eo3db?autoplay=1&muted=0&loop=0&nocontrols=1"
            className="splash-video-iframe"
            title="Splash Background Video"
            allow="autoplay; encrypted-media"
          ></iframe>
        ) : (
          <video
            ref={videoRef}
            src="/splash-video.mp4"
            className="splash-video-element"
            playsInline
            autoPlay
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              if (!isPausedAtEnd) {
                setIsPausedAtEnd(true);
                setShowStartBtn(true);
              }
            }}
            onError={() => setUseFallbackIframe(true)}
          />
        )}
      </div>

      {/* Freeze Overlay & Animated START Button */}
      {showStartBtn && (
        <div className="splash-freeze-overlay">
          <div className="splash-start-wrapper">
            {/* Pulsing Concentric Radar Shockwaves */}
            <div className="start-radar-ring start-radar-ring-1"></div>
            <div className="start-radar-ring start-radar-ring-2"></div>
            <div className="start-radar-ring start-radar-ring-3"></div>

            {/* Glowing High-Impact Action Button (Compact & Sleek) */}
            <button
              type="button"
              className="khatarnak-start-btn"
              onClick={handleStartClick}
              id="khatarnakStartBtn"
            >
              <div className="start-btn-laser-shine"></div>
              
              <div className="start-btn-icon-box">
                <i className="bi bi-play-fill"></i>
              </div>

              <div className="start-btn-text-group">
                <span className="start-btn-main-text">START</span>
                <span className="start-btn-sub-text">TAP TO PLAY</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

