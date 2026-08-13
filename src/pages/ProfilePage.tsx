import React, { useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadImageToImgBB, ref, update, db } from '../firebase';

interface ProfilePageProps {
  onOpenEditName: () => void;
  onOpenMatchHistory: () => void;
  onOpenChangePassword: () => void;
  onOpenPolicy: (type: 'privacy' | 'terms' | 'refund' | 'fairPlay' | 'refer') => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onOpenEditName,
  onOpenMatchHistory,
  onOpenChangePassword,
  onOpenPolicy
}) => {
  const { currentUser, userProfile, appSettings, logout, reloadUserProfile, themeMode, toggleTheme } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [promoCode, setPromoCode] = React.useState('');
  const [promoMessage, setPromoMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [applyingPromo, setApplyingPromo] = React.useState(false);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    setTimeout(() => {
      setApplyingPromo(false);
      const codeUpper = promoCode.trim().toUpperCase();
      if (codeUpper === 'WELCOME50' || codeUpper === 'BONUS100' || codeUpper === 'FREE20' || codeUpper === 'PLAY10') {
        setPromoMessage({ text: `Promo code ${codeUpper} applied successfully!`, type: 'success' });
        setPromoCode('');
      } else {
        setPromoMessage({ text: 'Invalid or expired promo code.', type: 'error' });
      }
      setTimeout(() => setPromoMessage(null), 4000);
    }, 600);
  };

  const displayName = userProfile?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const photoURL = userProfile?.photoURL || currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0F172A&color=E2E8F0&bold=true&size=80`;
  const totalMatches = userProfile?.totalMatches || 0;
  const wonMatches = userProfile?.wonMatches || 0;
  const totalEarnings = userProfile?.totalEarnings || 0;
  const winRate = totalMatches > 0 ? ((wonMatches / totalMatches) * 100).toFixed(0) : '0';

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      const imageUrl = await uploadImageToImgBB(file);
      await update(ref(db, `users/${currentUser.uid}`), { photoURL: imageUrl });
      await reloadUserProfile();
      alert("Profile picture updated!");
    } catch (error: any) {
      console.error("Profile picture upload failed:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleContactUs = () => {
    const contactNumber = appSettings.supportContact || '9389660753';
    const message = `Hello Sir I Am ${displayName} I need your help.`;
    const whatsappUrl = `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDeveloperContact = () => {
    const devNumber = appSettings.developerContact || '9848988740';
    const whatsappUrl = `https://wa.me/${devNumber}?text=${encodeURIComponent("Hello Developer!")}`;
    window.open(whatsappUrl, '_blank');
  };

  const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications.');
      return;
    }
    if (Notification.permission === 'granted') {
      alert('Notifications are already enabled!');
      return;
    }
    if (Notification.permission === 'denied') {
      alert('Notifications are blocked in your browser settings.');
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification('Notifications Enabled!', {
          body: 'You will now receive notifications from this app.',
          icon: appSettings.logoUrl || 'https://i.ibb.co/Fny3v3b/logo.png'
        });
      } else {
        alert('You have denied notification permissions.');
      }
    });
  };

  return (
    <section id="profile-section" className="section active native-profile-section">
      {/* Header Profile Card */}
      <div className="native-profile-card">
        <div className="native-profile-banner">
          <span className="native-tier-badge">
            <i className="bi bi-shield-fill-check text-warning me-1"></i> VIP ELITE GAMER
          </span>
        </div>

        <div className="native-profile-main">
          <div className="native-avatar-wrapper" onClick={handleAvatarClick} title="Tap to change avatar">
            <img src={photoURL} alt="Avatar" className="native-avatar-img" />
            <div className="native-avatar-glow"></div>
            <div className="native-avatar-overlay">
              <i className="bi bi-camera-fill"></i>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <div className="native-user-info">
            <div className="native-name-row">
              <h3 className="native-user-name">{displayName}</h3>
              <i className="bi bi-patch-check-fill text-warning ms-1" title="Verified Player"></i>
              <button className="native-edit-btn" onClick={onOpenEditName} title="Edit Name">
                <i className="bi bi-pencil-fill"></i>
              </button>
            </div>
            <p className="native-user-id mb-1">
              <i className="bi bi-envelope-fill me-1 opacity-75"></i>
              {currentUser?.email || currentUser?.phoneNumber || 'N/A'}
            </p>
            {userProfile?.gameUid && (
              <p className="native-user-id text-warning font-mono">
                <i className="bi bi-controller me-1"></i>
                Game UID: {userProfile.gameUid}
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="native-stats-grid">
          <div className="native-stat-box">
            <div className="stat-box-icon text-primary">
              <i className="bi bi-controller"></i>
            </div>
            <strong className="stat-value">{totalMatches}</strong>
            <span className="stat-label">Matches</span>
          </div>

          <div className="native-stat-box">
            <div className="stat-box-icon text-success">
              <i className="bi bi-trophy-fill"></i>
            </div>
            <strong className="stat-value">{wonMatches}</strong>
            <span className="stat-label">Wins</span>
          </div>

          <div className="native-stat-box">
            <div className="stat-box-icon text-warning">
              <i className="bi bi-lightning-charge-fill"></i>
            </div>
            <strong className="stat-value">{winRate}%</strong>
            <span className="stat-label">Win Rate</span>
          </div>

          <div className="native-stat-box highlight-box">
            <div className="stat-box-icon text-warning">
              <i className="bi bi-wallet2"></i>
            </div>
            <strong className="stat-value text-warning">₹{totalEarnings.toFixed(0)}</strong>
            <span className="stat-label">Winnings</span>
          </div>
        </div>
      </div>

      {/* Compact Promo Code Box */}
      <div className="mx-3 mb-3 p-3 rounded-4 border border-secondary border-opacity-25 bg-dark bg-opacity-50 shadow-sm">
        <div className="d-flex align-items-center gap-2 mb-2">
          <div className="text-warning fs-5">
            <i className="bi bi-tag-fill"></i>
          </div>
          <div>
            <div className="fw-bold small text-white">Have a Promo Code?</div>
            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Apply voucher or bonus code to claim rewards</div>
          </div>
        </div>
        <form onSubmit={handleApplyPromo} className="d-flex align-items-center gap-2">
          <div className="position-relative flex-grow-1">
            <input
              type="text"
              className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-25 px-3 py-2 rounded-3 shadow-none small"
              placeholder="Enter promo code (e.g. WELCOME50)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          <button
            type="submit"
            disabled={applyingPromo || !promoCode.trim()}
            className="btn btn-warning fw-bold px-4 py-2 rounded-3 text-dark shadow-sm"
            style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            {applyingPromo ? <span className="spinner-border spinner-border-sm" role="status"></span> : 'Apply'}
          </button>
        </form>
        {promoMessage && (
          <div className={`mt-2 px-3 py-1.5 rounded-3 small fw-semibold text-center ${promoMessage.type === 'success' ? 'bg-success bg-opacity-20 text-success border border-success border-opacity-30' : 'bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30'}`} style={{ fontSize: '0.78rem' }}>
            {promoMessage.text}
          </div>
        )}
      </div>

      {/* Categorized Settings Groups */}
      <div className="native-settings-container">
        
        {/* Group 1: Gameplay & Account */}
        <div className="native-group-card">
          <div className="native-group-title">GAMEPLAY & ACCOUNT</div>
          <div className="native-list-group">
            
            <div className="native-list-item">
              <div className="item-left">
                <div className="item-icon-circle icon-bg-yellow">
                  <i className={themeMode === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill'}></i>
                </div>
                <div className="item-text">
                  <span className="item-title">App Theme</span>
                  <span className="item-sub">{themeMode === 'dark' ? 'Dark Mode (Active)' : 'Light Mode (Active)'}</span>
                </div>
              </div>
              <button
                className={`btn btn-sm ${themeMode === 'dark' ? 'btn-outline-warning' : 'btn-warning'} fw-bold px-3 rounded-pill shadow-sm d-flex align-items-center gap-1`}
                onClick={toggleTheme}
              >
                <i className={themeMode === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill'}></i>
                {themeMode === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>

            <div className="native-list-item">
              <div className="item-left">
                <div className="item-icon-circle icon-bg-blue">
                  <i className="bi bi-bell-fill"></i>
                </div>
                <div className="item-text">
                  <span className="item-title">Push Notifications</span>
                  <span className="item-sub">Match updates and alerts</span>
                </div>
              </div>
              <button
                className="btn btn-sm btn-warning fw-bold px-3 rounded-pill shadow-sm"
                onClick={requestNotificationPermission}
              >
                Enable
              </button>
            </div>

            <div
              className="native-list-item interactive"
              onClick={onOpenMatchHistory}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-purple">
                  <i className="bi bi-clock-history"></i>
                </div>
                <div className="item-text">
                  <span className="item-title">Match History</span>
                  <span className="item-sub">View previous tournament records</span>
                </div>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={onOpenChangePassword}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-cyan">
                  <i className="bi bi-key-fill"></i>
                </div>
                <div className="item-text">
                  <span className="item-title">Security & Password</span>
                  <span className="item-sub">Update login password</span>
                </div>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

          </div>
        </div>

        {/* Group 2: Rewards & Support */}
        <div className="native-group-card">
          <div className="native-group-title">REWARDS & SUPPORT</div>
          <div className="native-list-group">

            <div
              className="native-list-item interactive"
              onClick={() => onOpenPolicy('refer')}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-yellow">
                  <i className="bi bi-person-plus-fill"></i>
                </div>
                <div className="item-text">
                  <span className="item-title">Refer & Earn Rewards</span>
                  <span className="item-sub">Invite friends for bonus cash</span>
                </div>
              </div>
              <span className="badge bg-warning text-dark font-mono me-1">EARN ₹</span>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={handleContactUs}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-green">
                  <i className="bi bi-whatsapp"></i>
                </div>
                <div className="item-text">
                  <span className="item-title">WhatsApp Customer Support</span>
                  <span className="item-sub">24/7 Live help line</span>
                </div>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={handleDeveloperContact}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-pink">
                  <i className="bi bi-code-slash"></i>
                </div>
                <div className="item-text">
                  <span className="item-title">Developer Desk</span>
                  <span className="item-sub">Direct technical contact</span>
                </div>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

          </div>
        </div>

        {/* Group 3: Legal & Terms */}
        <div className="native-group-card">
          <div className="native-group-title">LEGAL & POLICIES</div>
          <div className="native-list-group">

            <div
              className="native-list-item interactive"
              onClick={() => onOpenPolicy('privacy')}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-gray">
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <span className="item-title">Privacy Policy</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={() => onOpenPolicy('terms')}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-gray">
                  <i className="bi bi-file-text-fill"></i>
                </div>
                <span className="item-title">Terms & Conditions</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={() => onOpenPolicy('refund')}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-gray">
                  <i className="bi bi-arrow-repeat"></i>
                </div>
                <span className="item-title">Refund & Cancellation</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={() => onOpenPolicy('fairPlay')}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-gray">
                  <i className="bi bi-patch-check-fill"></i>
                </div>
                <span className="item-title">Fair Play Policy</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

          </div>
        </div>

        {/* Logout Button */}
        <div className="native-group-card mt-2">
          <button className="native-logout-btn" onClick={logout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout Account</span>
          </button>
        </div>

      </div>

      <div className="native-app-credits">
        <p className="credits-tag">ESPORTS GAMING PLATFORM v2.5</p>
        <p className="credits-sub">@bhajani 5 laubasta</p>
      </div>
    </section>
  );
};
