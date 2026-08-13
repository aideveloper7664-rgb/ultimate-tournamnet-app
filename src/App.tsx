import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { MyContestsPage } from './pages/MyContestsPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { WalletPage } from './pages/WalletPage';
import { RechargePage } from './pages/RechargePage';
import { EarningsPage } from './pages/EarningsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';

import { PolicyModal } from './modals/PolicyModal';
import { AppUpdateModal } from './modals/AppUpdateModal';
import { ChangePasswordModal } from './modals/ChangePasswordModal';
import { WithdrawMethodModal } from './modals/WithdrawMethodModal';
import { WithdrawModal } from './modals/WithdrawModal';
import { MatchDetailsModal } from './modals/MatchDetailsModal';
import { IdPasswordModal } from './modals/IdPasswordModal';
import { JoinTournamentModal } from './modals/JoinTournamentModal';
import { SlotSelectionModal } from './modals/SlotSelectionModal';
import { NotificationsModal } from './modals/NotificationsModal';
import { MatchHistoryModal } from './modals/MatchHistoryModal';
import { TournamentChatModal } from './modals/TournamentChatModal';
import { WorldChatModal } from './modals/WorldChatModal';
import { EditNameModal } from './modals/EditNameModal';
import { AiSupportModal } from './modals/AiSupportModal';
import { DirectSupportModal } from './modals/DirectSupportModal';
import { FloatingSupportFAB } from './components/FloatingSupportFAB';

import { Tournament } from './types';
import { PaymentCallbackPage } from './pages/PaymentCallbackPage';

const AppContent: React.FC = () => {
  const { currentSection, showSection, reloadUserProfile } = useAuth();
  
  const isPaymentCallback = window.location.pathname === '/payment-callback';

  // Modal States
  const [policyType, setPolicyType] = useState<'privacy' | 'terms' | 'refund' | 'fairPlay' | 'refer' | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isWithdrawMethodOpen, setIsWithdrawMethodOpen] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<string | null>(null);
  const [selectedTournamentForDetails, setSelectedTournamentForDetails] = useState<Tournament | null>(null);
  const [selectedTournamentForIdPass, setSelectedTournamentForIdPass] = useState<Tournament | null>(null);
  const [selectedTournamentForChat, setSelectedTournamentForChat] = useState<Tournament | null>(null);
  const [selectedTournamentForJoin, setSelectedTournamentForJoin] = useState<Tournament | null>(null);
  const [selectedTournamentForSlots, setSelectedTournamentForSlots] = useState<Tournament | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<(string | number)[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState(false);
  const [isWorldChatOpen, setIsWorldChatOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [isAiSupportOpen, setIsAiSupportOpen] = useState(false);
  const [isDirectSupportOpen, setIsDirectSupportOpen] = useState(false);

  // Tournament Action Handlers
  const handleOpenDetails = (tournament: Tournament) => {
    setSelectedTournamentForDetails(tournament);
  };

  const handleOpenIdPass = (tournament: Tournament) => {
    setSelectedTournamentForIdPass(tournament);
  };

  const handleOpenChat = (tournament: Tournament) => {
    setSelectedTournamentForChat(tournament);
  };

  const handleJoinClick = (tournament: Tournament) => {
    const hasSlots = tournament.slotConfig && tournament.slotConfig.type !== 'disabled';
    if (hasSlots) {
      setSelectedTournamentForSlots(tournament);
    } else {
      setSelectedSlots([]);
      setSelectedTournamentForJoin(tournament);
    }
  };

  const handleConfirmSlots = (slots: (string | number)[]) => {
    const t = selectedTournamentForSlots;
    setSelectedTournamentForSlots(null);
    setSelectedSlots(slots);
    setSelectedTournamentForJoin(t);
  };

  const handleSelectWithdrawMethod = (method: string) => {
    setIsWithdrawMethodOpen(false);
    setWithdrawMethod(method);
  };

  return (
    <div className="app-container">
      <SplashScreen />

      <Header
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenWorldChat={() => setIsWorldChatOpen(true)}
      />

      <main className="main-content">
        {isPaymentCallback ? (
          <PaymentCallbackPage />
        ) : (
          <>
            {currentSection === 'login-section' && <AuthPage />}
            {currentSection === 'home-section' && <HomePage />}
            {currentSection === 'my-contests-section' && (
              <MyContestsPage
                onOpenDetails={handleOpenDetails}
                onOpenIdPass={handleOpenIdPass}
                onOpenChat={handleOpenChat}
                onJoinClick={handleJoinClick}
              />
            )}
            {currentSection === 'tournaments-section' && (
              <TournamentsPage
                onOpenDetails={handleOpenDetails}
                onOpenIdPass={handleOpenIdPass}
                onOpenChat={handleOpenChat}
                onJoinClick={handleJoinClick}
              />
            )}
            {currentSection === 'wallet-section' && (
              <WalletPage
                onOpenWithdrawMethod={() => setIsWithdrawMethodOpen(true)}
                onStartRecharge={() => showSection('recharge-section')}
              />
            )}
            {currentSection === 'recharge-section' && <RechargePage />}
            {currentSection === 'earnings-section' && <EarningsPage />}
            {currentSection === 'leaderboard-section' && <LeaderboardPage />}
            {currentSection === 'profile-section' && (
              <ProfilePage
                onOpenEditName={() => setIsEditNameOpen(true)}
                onOpenMatchHistory={() => setIsMatchHistoryOpen(true)}
                onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                onOpenPolicy={(type) => setPolicyType(type)}
              />
            )}
          </>
        )}
      </main>

      <BottomNav />

      {/* Modals */}
      <PolicyModal
        isOpen={!!policyType}
        policyType={policyType}
        onClose={() => setPolicyType(null)}
      />

      <AppUpdateModal />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      <WithdrawMethodModal
        isOpen={isWithdrawMethodOpen}
        onClose={() => setIsWithdrawMethodOpen(false)}
        onSelectMethod={handleSelectWithdrawMethod}
      />

      <WithdrawModal
        isOpen={!!withdrawMethod}
        method={withdrawMethod}
        onClose={() => setWithdrawMethod(null)}
      />

      <MatchDetailsModal
        tournament={selectedTournamentForDetails}
        onClose={() => setSelectedTournamentForDetails(null)}
      />

      <IdPasswordModal
        tournament={selectedTournamentForIdPass}
        onClose={() => setSelectedTournamentForIdPass(null)}
      />

      <SlotSelectionModal
        isOpen={!!selectedTournamentForSlots}
        tournament={selectedTournamentForSlots}
        onClose={() => setSelectedTournamentForSlots(null)}
        onConfirmSlots={handleConfirmSlots}
      />

      <JoinTournamentModal
        isOpen={!!selectedTournamentForJoin}
        tournament={selectedTournamentForJoin}
        selectedSlots={selectedSlots}
        onClose={() => {
          setSelectedTournamentForJoin(null);
          setSelectedSlots([]);
        }}
        onSuccess={() => {
          reloadUserProfile();
        }}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <MatchHistoryModal
        isOpen={isMatchHistoryOpen}
        onClose={() => setIsMatchHistoryOpen(false)}
      />

      <TournamentChatModal
        isOpen={!!selectedTournamentForChat}
        tournament={selectedTournamentForChat}
        onClose={() => setSelectedTournamentForChat(null)}
      />

      <WorldChatModal
        isOpen={isWorldChatOpen}
        onClose={() => setIsWorldChatOpen(false)}
      />

      <EditNameModal
        isOpen={isEditNameOpen}
        onClose={() => setIsEditNameOpen(false)}
      />

      {/* Floating Speed Dial Customer Support FAB */}
      <FloatingSupportFAB
        onOpenAiSupport={() => setIsAiSupportOpen(true)}
        onOpenDirectSupport={() => setIsDirectSupportOpen(true)}
      />

      {/* AI Customer Support Modal */}
      <AiSupportModal
        isOpen={isAiSupportOpen}
        onClose={() => setIsAiSupportOpen(false)}
        onOpenDirectSupport={() => {
          setIsAiSupportOpen(false);
          setIsDirectSupportOpen(true);
        }}
      />

      {/* Direct Customer Support Modal */}
      <DirectSupportModal
        isOpen={isDirectSupportOpen}
        onClose={() => setIsDirectSupportOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
