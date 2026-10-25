import React from 'react';
import { TutorialVideo } from '../types';

interface TutorialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_TUTORIALS: TutorialVideo[] = [
  {
    id: 'tut_1',
    title: 'How to Join Match & Book Slots',
    description: 'Learn how to pick your game mode, choose team/individual slots, and register in 30 seconds.',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  {
    id: 'tut_2',
    title: 'How to View Room ID & Password',
    description: 'Room credentials unlock 15 minutes before match start time. Tap your tournament to copy ID and password.',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  {
    id: 'tut_3',
    title: 'Adding Cash & Instant Withdrawals',
    description: 'Step-by-step guide on UPI deposits and fast withdrawal requests directly to your bank account or UPI.',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  {
    id: 'tut_4',
    title: 'Fair Play & Anti-Cheat Rules',
    description: 'Guidelines to ensure a clean competitive esports arena. Hacks, emulators, and teaming result in permanent ban.',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  }
];

export const TutorialsModal: React.FC<TutorialsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ zIndex: 1085, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="card border-0 rounded-4 shadow-2xl text-white p-4 w-100"
        style={{
          maxWidth: '440px',
          background: 'linear-gradient(165deg, #131738 0%, #0a0d22 100%)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-play-circle-fill text-danger fs-4"></i>
            <h5 className="fw-extrabold text-white mb-0 fs-5">App Video Tutorials</h5>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onClose}
          ></button>
        </div>

        <p className="text-secondary small mb-3">
          Watch quick video guides to learn everything about playing and winning in the arena.
        </p>

        <div className="d-flex flex-column gap-3">
          {DEFAULT_TUTORIALS.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-4 border"
              style={{ background: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="d-flex align-items-center gap-2.5 mb-1.5">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center bg-danger bg-opacity-20 text-danger"
                  style={{ width: '36px', height: '36px' }}
                >
                  <i className="bi bi-play-fill fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-white mb-0 small">{t.title}</h6>
                </div>
              </div>
              <p className="text-secondary extra-small mb-2" style={{ lineHeight: 1.4 }}>
                {t.description}
              </p>
              <div className="rounded-3 overflow-hidden" style={{ aspectRatio: '16/9', background: '#000' }}>
                <iframe
                  src={t.videoUrl}
                  title={t.title}
                  className="w-100 h-100 border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
