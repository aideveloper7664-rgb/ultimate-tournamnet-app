import React from 'react';
import { useAuth } from '../context/AuthContext';

interface CustomerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SupportChannel {
  id: string;
  name: string;
  url: string;
  brandColor: string;
  gradientBg: string;
  glowColor: string;
  svgIcon: React.ReactNode;
}

export const CustomerSupportModal: React.FC<CustomerSupportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile, currentUser, appSettings } = useAuth();

  if (!isOpen) return null;

  const userName = userProfile?.displayName || currentUser?.displayName || 'Gamer';
  const gameUid = userProfile?.gameUid || 'Not updated';
  const userId = currentUser?.uid || 'N/A';
  const supportPhone = appSettings?.supportContact || '9389660753';

  // Auto-formatted WhatsApp message
  const waMsg = encodeURIComponent(
    `Hello Support,\nName: ${userName}\nGame UID: ${gameUid}\nUser ID: ${userId}\nQuery: `
  );
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${waMsg}`;

  // Pixel-perfect vector brand icons
  const channels: SupportChannel[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      url: whatsappUrl,
      brandColor: '#25D366',
      gradientBg: 'linear-gradient(135deg, #128C7E 0%, #25D366 100%)',
      glowColor: 'rgba(37, 211, 102, 0.45)',
      svgIcon: (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.04 7.5C8.86 7.5 8.57 7.57 8.32 7.84C8.07 8.11 7.37 8.77 7.37 10.11C7.37 11.45 8.35 12.75 8.49 12.93C8.63 13.11 10.36 15.78 13.06 16.94C15.3 17.9 15.75 17.71 16.25 17.66C16.74 17.61 17.84 17 18.06 16.37C18.28 15.73 18.28 15.19 18.22 15.08C18.15 14.97 17.97 14.9 17.7 14.77C17.43 14.64 16.1 13.98 15.85 13.89C15.6 13.8 15.42 13.76 15.24 14.03C15.06 14.3 14.54 14.91 14.38 15.09C14.22 15.27 14.07 15.3 13.8 15.16C13.53 15.03 12.66 14.74 11.63 13.82C10.82 13.1 10.27 12.21 10.11 11.94C9.95 11.67 10.1 11.52 10.23 11.39C10.35 11.27 10.5 11.08 10.63 10.92C10.76 10.76 10.81 10.65 10.9 10.47C10.99 10.29 10.95 10.13 10.88 10C10.81 9.87 10.27 8.54 10.05 8C9.83 7.48 9.61 7.55 9.44 7.54C9.28 7.54 9.1 7.5 9.04 7.5Z"/>
        </svg>
      )
    },
    {
      id: 'telegram',
      name: 'Telegram',
      url: 'https://t.me/telegram',
      brandColor: '#29B6F6',
      gradientBg: 'linear-gradient(135deg, #0288D1 0%, #29B6F6 100%)',
      glowColor: 'rgba(41, 182, 246, 0.45)',
      svgIcon: (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"/>
        </svg>
      )
    },
    {
      id: 'instagram',
      name: 'Instagram',
      url: 'https://instagram.com',
      brandColor: '#E1306C',
      gradientBg: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)',
      glowColor: 'rgba(225, 48, 108, 0.45)',
      svgIcon: (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      )
    },
    {
      id: 'youtube',
      name: 'YouTube',
      url: 'https://youtube.com',
      brandColor: '#FF0000',
      gradientBg: 'linear-gradient(135deg, #CC0000 0%, #FF2E2E 100%)',
      glowColor: 'rgba(255, 0, 0, 0.45)',
      svgIcon: (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
    {
      id: 'facebook',
      name: 'Facebook',
      url: 'https://facebook.com',
      brandColor: '#1877F2',
      gradientBg: 'linear-gradient(135deg, #0D6EFD 0%, #1877F2 100%)',
      glowColor: 'rgba(24, 119, 242, 0.45)',
      svgIcon: (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      url: 'https://tiktok.com',
      brandColor: '#00F2FE',
      gradientBg: 'linear-gradient(135deg, #000000 0%, #00F2FE 50%, #FE2C55 100%)',
      glowColor: 'rgba(0, 242, 254, 0.45)',
      svgIcon: (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      )
    },
  ];

  return (
    <div 
      className="modal fade show d-block" 
      style={{ backgroundColor: 'rgba(5, 7, 20, 0.88)', backdropFilter: 'blur(10px)', zIndex: 1060 }} 
      tabIndex={-1}
      onClick={onClose}
    >
      <div 
        className="modal-dialog modal-dialog-centered" 
        style={{ maxWidth: '440px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden" 
          style={{ 
            background: '#101326', 
            color: '#F8FAFC', 
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)'
          }}
        >
          {/* Header */}
          <div 
            className="modal-header border-bottom border-secondary border-opacity-25 px-4 py-3.5 d-flex align-items-center justify-content-between" 
            style={{ background: 'linear-gradient(135deg, #1A1E3E 0%, #101326 100%)' }}
          >
            <div className="d-flex align-items-center gap-3">
              <div 
                className="rounded-3 d-flex align-items-center justify-content-center shadow-lg flex-shrink-0" 
                style={{ 
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', 
                  color: '#0F172A', 
                  width: '40px', 
                  height: '40px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                }}
              >
                <i className="bi bi-headset fs-5" style={{ display: 'inline-flex', lineHeight: 1 }}></i>
              </div>
              <h5 className="modal-title fw-black text-white mb-0" style={{ fontSize: '1.08rem', letterSpacing: '0.3px' }}>
                Customer Support
              </h5>
            </div>

            <button 
              type="button" 
              className="btn-close btn-close-white shadow-none" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Body: 2 Columns Square Grid (Icon on Top, Text Below) */}
          <div className="modal-body p-3.5">
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '12px' 
              }}
            >
              {channels.map((channel) => (
                <a
                  key={channel.id}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="d-flex flex-column align-items-center justify-content-center p-3 rounded-4 text-decoration-none text-white transition-all position-relative"
                  style={{
                    aspectRatio: '1 / 1',
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.04) 100%)';
                    e.currentTarget.style.borderColor = channel.brandColor;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `0 10px 24px -4px ${channel.glowColor}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)';
                  }}
                >
                  {/* Top Big Icon */}
                  <div 
                    className="rounded-3 d-flex align-items-center justify-content-center text-white mb-2.5 shadow-md flex-shrink-0"
                    style={{ 
                      background: channel.gradientBg, 
                      width: '56px', 
                      height: '56px',
                      boxShadow: `0 6px 16px ${channel.glowColor}`,
                      border: '1.5px solid rgba(255, 255, 255, 0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1
                    }}
                  >
                    {channel.svgIcon}
                  </div>
                  
                  {/* Bottom Text Label */}
                  <span 
                    className="fw-bold text-white text-center text-truncate w-100 px-1" 
                    style={{ fontSize: '0.96rem', letterSpacing: '0.2px' }}
                  >
                    {channel.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
