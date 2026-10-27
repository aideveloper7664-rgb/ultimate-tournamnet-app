import React from 'react';

interface BubbleData {
  id: number;
  size: number;
  left: number;
  animDuration: number;
  animDelay: number;
  color: string;
  opacity: number;
}

// Generate static bubble layout once so it never re-calculates or triggers re-renders
const STATIC_BUBBLES: BubbleData[] = Array.from({ length: 24 }).map((_, i) => {
  const seed = (i * 37 + 13) % 100;
  const size = 5 + (seed % 7); // 5px to 12px
  const left = (i * 100) / 24 + ((seed % 7) - 3);
  const animDuration = 9 + (seed % 8); // 9s to 17s
  const animDelay = (i * 0.45) % 6;
  const colors = ['#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#3b82f6', '#ff2e93'];
  const color = colors[i % colors.length];
  return {
    id: i,
    size,
    left: Math.max(2, Math.min(98, left)),
    animDuration,
    animDelay,
    color,
    opacity: 0.35 + (seed % 40) / 100
  };
});

export const ParticleBackground: React.FC = React.memo(() => {
  return (
    <div className="particle-container pointer-events-none" aria-hidden="true">
      {STATIC_BUBBLES.map((b) => (
        <div
          key={b.id}
          className="floating-bubble"
          style={{
            width: `${b.size}px`,
            height: `${b.size}px`,
            left: `${b.left}%`,
            bottom: '-20px',
            backgroundColor: b.color,
            boxShadow: `0 0 8px ${b.color}`,
            animation: `floatBubble ${b.animDuration}s linear infinite`,
            animationDelay: `${b.animDelay}s`,
            opacity: b.opacity
          }}
        />
      ))}
    </div>
  );
});

ParticleBackground.displayName = 'ParticleBackground';
