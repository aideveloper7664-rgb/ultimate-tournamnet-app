import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { THEMES } from '../utils/theme';
import { uploadImageToImgBB, ref, update, db, get } from '../firebase';
import { MatchHistoryItem } from '../types';
import { VipMembershipModal } from '../modals/VipMembershipModal';
import { LevelRewardsModal } from '../modals/LevelRewardsModal';
import { SupportTicketsModal } from '../modals/SupportTicketsModal';
import { TutorialsModal } from '../modals/TutorialsModal';

interface ProfilePageProps {
  onOpenEditName: () => void;
  onOpenMatchHistory: () => void;
  onOpenPlayerStats: () => void;
  onOpenCustomerSupport: () => void;
  onOpenChangePassword: () => void;
  onOpenPolicy: (type: 'privacy' | 'terms' | 'refund' | 'fairPlay' | 'refer') => void;
  onOpenP2PTransfer?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onOpenEditName,
  onOpenMatchHistory,
  onOpenPlayerStats,
  onOpenCustomerSupport,
  onOpenChangePassword,
  onOpenPolicy,
  onOpenP2PTransfer
}) => {
  const {
    currentUser,
    userProfile,
    appSettings,
    logout,
    reloadUserProfile,
    themeMode,
    currentThemeId,
    setIsDrawerOpen,
    showSection
  } = useAuth();
  
  const currentTheme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [totalKillsCount, setTotalKillsCount] = useState<number>(userProfile?.totalKills || 0);

  useEffect(() => {
    const fetchKills = async () => {
      if (!currentUser) return;
      try {
        const historyRef = ref(db, `users/${currentUser.uid}/matchHistory`);
        const snapshot = await get(historyRef);
        if (snapshot.exists()) {
          const list: MatchHistoryItem[] = Object.values(snapshot.val());
          const killsSum = list.reduce((acc, m) => acc + (Number(m.kills) || 0), 0);
          setTotalKillsCount(Math.max(killsSum, userProfile?.totalKills || 0));
        }
      } catch (err) {
        console.warn("Could not fetch user kills count:", err);
      }
    };
    fetchKills();
  }, [currentUser, userProfile?.totalKills]);

  const [isHamroPayConfigOpen, setIsHamroPayConfigOpen] = useState(false);
  const [hamroPayKey, setHamroPayKey] = useState(() => {
    try {
      const m = JSON.parse(localStorage.getItem('hamropay_merchant') || '{}');
      return m.api_key || 'hmpay_30ab49ffa8ec434ba9b9fd07925ed5ca';
    } catch { return 'hmpay_30ab49ffa8ec434ba9b9fd07925ed5ca'; }
  });
  const [saveKeyMsg, setSaveKeyMsg] = useState<string | null>(null);

  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [isLevelRewardsOpen, setIsLevelRewardsOpen] = useState(false);
  const [isSupportTicketsOpen, setIsSupportTicketsOpen] = useState(false);
  const [isTutorialsOpen, setIsTutorialsOpen] = useState(false);

  const vipActive = userProfile?.vipActive === true && (userProfile?.vipExpiresAt || 0) > Date.now();
  const totalXp = userProfile?.xp || ((userProfile?.totalMatches || 0) * 20);
  const userLevel = Math.max(1, Math.floor(Math.sqrt(totalXp / 50)) + 1);
  const currentLevelBaseXp = 50 * Math.pow(userLevel - 1, 2);
  const nextLevelBaseXp = 50 * Math.pow(userLevel, 2);
  const xpIntoLevel = Math.max(0, totalXp - currentLevelBaseXp);
  const xpNeededForNext = Math.max(1, nextLevelBaseXp - currentLevelBaseXp);
  const levelProgress = Math.min(100, (xpIntoLevel / xpNeededForNext) * 100);

  const handleSaveHamroPayKey = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('hamropay_merchant', JSON.stringify({ api_key: hamroPayKey.trim() }));
      setSaveKeyMsg('HamroPay Merchant API Key saved!');
      setTimeout(() => setSaveKeyMsg(null), 3000);
    } catch (err: any) {
      setSaveKeyMsg(`Error: ${err.message}`);
    }
  };

  const displayName = userProfile?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const photoURL = userProfile?.photoURL || currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0F172A&color=E2E8F0&bold=true&size=80`;
  const totalMatches = userProfile?.totalMatches || 0;
  const wonMatches = userProfile?.wonMatches || 0;
  const totalEarnings = userProfile?.totalEarnings || 0;
  const winRate = totalMatches > 0 ? ((wonMatches / totalMatches) * 100).toFixed(0) : '0';
  const avgKillsPerMatch = totalMatches > 0 ? (totalKillsCount / totalMatches).toFixed(1) : '0';

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
      {/* Header Profile Card - Standalone User Profile Header */}
      <div className="native-profile-card shadow-lg mb-3">
        <div className="native-profile-banner d-flex align-items-center justify-content-between mb-3">
          <span
            className="badge px-2.5 py-1 rounded-pill fw-extrabold font-mono"
            style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8'
            }}
          >
            LVL {userLevel} GAMER
          </span>

          <span
            className="native-tier-badge cursor-pointer"
            onClick={() => setIsVipModalOpen(true)}
            style={vipActive ? { background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: '#0f172a', fontWeight: 800 } : {}}
          >
            <i className={`bi ${vipActive ? 'bi-patch-check-fill' : 'bi-shield-fill-check'} me-1`}></i>
            {vipActive ? '👑 VIP PASS ACTIVE' : 'UPGRADE TO VIP'}
          </span>
        </div>

        <div className="native-profile-main mb-0 pb-0 border-0">
          <div className="native-avatar-wrapper position-relative" onClick={handleAvatarClick} title="Tap to change avatar">
            <img src={photoURL} alt="Avatar" className="native-avatar-img" />
            <div className="native-avatar-glow"></div>
            <div className="native-avatar-overlay">
              <i className="bi bi-camera-fill"></i>
            </div>
            <span
              className="position-absolute bottom-0 end-0 bg-success border border-dark rounded-circle p-1"
              style={{ width: '14px', height: '14px', zIndex: 4 }}
              title="Online"
            ></span>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <div className="native-user-info ms-2 flex-grow-1">
            <div className="native-name-row d-flex align-items-center gap-2 mb-1">
              <h3 className="native-user-name mb-0 d-flex align-items-center gap-1.5">
                {displayName}
                {vipActive && <span title="VIP Player" style={{ fontSize: '1rem' }}>👑</span>}
              </h3>
              <i className="bi bi-patch-check-fill text-warning fs-6" title="Verified Player"></i>
              <button className="native-edit-btn ms-auto" onClick={onOpenEditName} title="Edit Name">
                <i className="bi bi-pencil-fill"></i>
              </button>
            </div>
            <div className="d-flex flex-column gap-1">
              <span className="text-secondary small d-flex align-items-center gap-1">
                <i className="bi bi-envelope-fill text-info"></i>
                {currentUser?.email || currentUser?.phoneNumber || 'N/A'}
              </span>
              {userProfile?.gameUid && (
                <span className="badge bg-dark bg-opacity-80 text-warning border border-warning border-opacity-30 font-mono align-self-start px-2 py-0.5 rounded-2">
                  <i className="bi bi-controller me-1"></i>
                  UID: {userProfile.gameUid}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Level XP Bar inside Header */}
        <div className="mt-3 pt-3 border-top border-white border-opacity-10">
          <div className="d-flex justify-content-between align-items-center mb-1.5 extra-small">
            <span className="text-secondary fw-bold">Level {userLevel} Progress</span>
            <span className="text-warning font-mono fw-bold">{xpIntoLevel} / {xpNeededForNext} XP</span>
          </div>
          <div className="progress rounded-pill mb-2" style={{ height: '7px', background: 'rgba(255, 255, 255, 0.1)' }}>
            <div
              className="progress-bar rounded-pill"
              style={{
                width: `${levelProgress}%`,
                background: 'linear-gradient(90deg, #38bdf8, #a855f7)'
              }}
            ></div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-dark w-100 py-1.5 rounded-3 d-flex align-items-center justify-content-center gap-1.5 text-warning fw-bold border border-warning border-opacity-30 extra-small"
            onClick={() => showSection('level-rewards-section')}
          >
            <i className="bi bi-gift-fill"></i> Level Milestone Rewards ({totalXp} XP)
          </button>
        </div>
      </div>

      {/* Standalone Player Stats Cards Section */}
      <div className="native-group-card mb-3 p-3 shadow-lg">
        <div className="native-group-title d-flex align-items-center gap-1 mb-2">
          <i className="bi bi-bar-chart-fill text-warning fs-6"></i> PLAYER PERFORMANCE STATS
        </div>
        <div className="native-stats-grid">
          <div className="native-stat-box">
            <div className="stat-box-icon text-info">
              <i className="bi bi-controller"></i>
            </div>
            <strong className="stat-value">{totalMatches}</strong>
            <span className="stat-label">Matches</span>
          </div>

          <div className="native-stat-box">
            <div className="stat-box-icon text-success">
              <i className="bi bi-trophy-fill"></i>
            </div>
            <strong className="stat-value text-success">{wonMatches}</strong>
            <span className="stat-label">Wins</span>
          </div>

          <div className="native-stat-box">
            <div className="stat-box-icon text-primary">
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

      {/* Categorized Settings Groups */}
      <div className="native-settings-container">
        
        {/* Group 1: Gameplay & Account */}
        <div className="native-group-card">
          <div className="native-group-title">GAMEPLAY & ACCOUNT</div>
          <div className="native-list-group">
            
            <div
              className="native-list-item interactive"
              onClick={() => setIsDrawerOpen(true)}
            >
              <div className="item-left">
                <div
                  className="item-icon-circle position-relative overflow-hidden"
                  style={{
                    background: currentTheme.sw[0],
                    border: '1.5px solid var(--accent)'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '50%',
                      background: currentTheme.sw[1]
                    }}
                  />
                </div>
                <div>
                  <span className="item-title">App Theme</span>
                  <div className="text-secondary extra-small">
                    {currentTheme.name} ({THEMES.length} vibes)
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-dark text-warning border border-warning border-opacity-30 font-mono extra-small px-2 py-1">
                  {currentTheme.name}
                </span>
                <i className="bi bi-chevron-right chevron-icon"></i>
              </div>
            </div>

            <div
              className="native-list-item interactive"
              onClick={requestNotificationPermission}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-blue">
                  <i className="bi bi-bell-fill"></i>
                </div>
                <span className="item-title">Push Notifications</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={onOpenP2PTransfer}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-emerald">
                  <i className="bi bi-send-fill"></i>
                </div>
                <span className="item-title">Send & Receive Cash (P2P)</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={onOpenPlayerStats}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-indigo">
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
                <span className="item-title">Player Stats & Analytics</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={onOpenMatchHistory}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-purple">
                  <i className="bi bi-clock-history"></i>
                </div>
                <span className="item-title">Match History</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={() => setIsHamroPayConfigOpen(true)}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-pink">
                  <i className="bi bi-qr-code"></i>
                </div>
                <span className="item-title">HamroPay Merchant Key</span>
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
                <span className="item-title">Security & Password</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

          </div>
        </div>


        {/* Merged Group: Rewards, Support & Policies */}
        <div className="native-group-card">
          <div className="native-group-title">REWARDS, SUPPORT & POLICIES</div>
          <div className="native-list-group">

            <div
              className="native-list-item interactive"
              onClick={() => showSection('earn-section')}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-pink">
                  <i className="bi bi-gift-fill"></i>
                </div>
                <span className="item-title">Earn Rewards</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={() => showSection('lottery-section')}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-indigo">
                  <i className="bi bi-ticket-detailed-fill"></i>
                </div>
                <span className="item-title">Lucky Draw</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={() => showSection('shop-section')}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-purple">
                  <i className="bi bi-cart-check-fill"></i>
                </div>
                <span className="item-title">Gaming Store</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={() => setIsSupportTicketsOpen(true)}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-red">
                  <i className="bi bi-shield-exclamation"></i>
                </div>
                <span className="item-title">Support Tickets</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={() => setIsTutorialsOpen(true)}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-blue">
                  <i className="bi bi-play-circle-fill"></i>
                </div>
                <span className="item-title">Video Tutorials</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={() => onOpenPolicy('refer')}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-amber">
                  <i className="bi bi-person-plus-fill"></i>
                </div>
                <span className="item-title">Refer & Earn</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

            <div
              className="native-list-item interactive"
              onClick={onOpenCustomerSupport}
            >
              <div className="item-left">
                <div className="item-icon-circle icon-bg-emerald">
                  <i className="bi bi-headset"></i>
                </div>
                <span className="item-title">Customer Support</span>
              </div>
              <i className="bi bi-chevron-right chevron-icon"></i>
            </div>

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

      {/* HamroPay Config Modal */}
      {isHamroPayConfigOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ zIndex: 1085, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}>
          <div className="card border-0 rounded-4 shadow-lg text-white p-4 w-100" style={{ maxWidth: '420px', background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0 text-warning d-flex align-items-center gap-2">
                <i className="bi bi-qr-code-scan"></i> HamroPay API Key
              </h5>
              <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setIsHamroPayConfigOpen(false)}></button>
            </div>
            <p className="text-secondary small mb-3">
              Configure your HamroPay Merchant API key stored in <code>localStorage</code> under <code>'hamropay_merchant'</code>.
            </p>
            <form onSubmit={handleSaveHamroPayKey}>
              <div className="mb-3">
                <label className="form-label small text-light fw-semibold">Merchant API Key</label>
                <input
                  type="text"
                  className="form-control bg-dark text-warning border-secondary border-opacity-50 font-mono"
                  placeholder="Paste your api_key here"
                  value={hamroPayKey}
                  onChange={(e) => setHamroPayKey(e.target.value)}
                  required
                />
              </div>
              {saveKeyMsg && (
                <div className={`mb-3 p-2 rounded-3 small text-center ${saveKeyMsg.startsWith('Error') ? 'bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30' : 'bg-success bg-opacity-20 text-success border border-success border-opacity-30'}`}>
                  {saveKeyMsg}
                </div>
              )}
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-dark border border-secondary border-opacity-25 w-50 py-2 rounded-3" onClick={() => setIsHamroPayConfigOpen(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-warning fw-bold w-50 py-2 rounded-3 text-dark">
                  Save API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIP Membership Modal */}
      <VipMembershipModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
      />

      {/* Level Milestone Rewards Modal */}
      <LevelRewardsModal
        isOpen={isLevelRewardsOpen}
        onClose={() => setIsLevelRewardsOpen(false)}
      />

      {/* Support Tickets Modal */}
      <SupportTicketsModal
        isOpen={isSupportTicketsOpen}
        onClose={() => setIsSupportTicketsOpen(false)}
      />

      {/* Video Tutorials Modal */}
      <TutorialsModal
        isOpen={isTutorialsOpen}
        onClose={() => setIsTutorialsOpen(false)}
      />
    </section>
  );
};
