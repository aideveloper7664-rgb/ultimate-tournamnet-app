import React from 'react';

export const ParticleBackground: React.FC = () => {
  return (
    <div className="particle-container">
      {[...Array(30)].map((_, i) => {
        const size = Math.random() * 8 + 4; // 4px to 12px
        const left = Math.random() * 100;
        const animDuration = Math.random() * 10 + 6; // 6s to 16s
        const animDelay = Math.random() * 8;
        const colors = ['#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#3b82f6', '#ff2e93'];
        const color = colors[i % colors.length];
        const style = {
          width: `${size}px`,
          height: `${size}px`,
          left: `${left}%`,
          bottom: `-20px`,
          background: color,
          boxShadow: `0 0 12px ${color}`,
          animation: `floatBubble ${animDuration}s linear infinite`,
          animationDelay: `${animDelay}s`,
          opacity: Math.random() * 0.7 + 0.3
        };
        return <div key={i} className="floating-bubble" style={style as React.CSSProperties}></div>;
      })}
    </div>
  );
};
