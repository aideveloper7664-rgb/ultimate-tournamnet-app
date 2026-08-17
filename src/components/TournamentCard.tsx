import React, { useState, useEffect } from 'react';
import { Tournament } from '../types';
import { useAuth } from '../context/AuthContext';
import { getTimeRemaining } from '../utils/helpers';

interface TournamentCardProps {
  tournament: Tournament;
  onOpenDetails: (tournament: Tournament) => void;
  onOpenIdPass: (tournament: Tournament) => void;
  onOpenChat: (tournament: Tournament) => void;
  onJoinClick: (tournament: Tournament) => void;
  onOpenSlots?: (tournament: Tournament) => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  onOpenDetails,
  onOpenIdPass,
  onOpenChat,
  onJoinClick,
  onOpenSlots
}) => {
  const { currentUser, userProfile } = useAuth();
  const [timerText, setTimerText] = useState<string>('');

  const tId = tournament.id;
  const status = tournament.status || 'upcoming';
  const bannerUrl = tournament.bannerUrl || 'https://via.placeholder.com/400x225/1E293B/94A3B8?text=16:9+Banner';
  const eFee = tournament.entryFee || 0;
  const pkPrize = tournament.perKillPrize || 0;
  const pPool = tournament.prizePool || 0;
  const sTime = tournament.startTime ? new Date(tournament.startTime) : null;
  const sTimeLoc = sTime ? sTime.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'TBA';
  
  const regP = tournament.registeredPlayers || {};
  const regC = Object.keys(regP).length;
  // Intelligent fallback for max players if not set
  const maxP = tournament.maxPlayers > 0 ? tournament.maxPlayers : 48;
  const spotsL = Math.max(0, maxP - regC);
  const isFull = maxP > 0 && spotsL <= 0;
  
  const isJoined = !!(currentUser && userProfile?.joinedTournaments?.[tId]);
  const userRegistration = currentUser ? regP[currentUser.uid] : null;
  const userSlots = userRegistration?.slots || [];

  const canJoin = !isJoined && !isFull && status === 'upcoming';

  useEffect(() => {
    const updateTimer = () => {
      if (status === 'upcoming' && tournament.startTime) {
        setTimerText(getTimeRemaining(tournament.startTime));
      } else if (status === 'ongoing') {
        setTimerText('LIVE');
      } else if (status === 'completed' || status === 'result') {
        setTimerText('ENDED');
      } else {
        setTimerText(status.toUpperCase());
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [status, tournament.startTime]);

  const spotsTxt = `${spotsL} Slots Open (${regC}/${maxP})`;
  const progP = Math.min(100, (regC / maxP) * 100);

  const tagsList = Array.isArray(tournament.tags)
    ? tournament.tags
    : tournament.tags
    ? Object.values(tournament.tags)
    : [];

  const showIdPass = isJoined && (
    status === 'ongoing' ||
    (status === 'upcoming' && tournament.showIdPass && sTime && Date.now() > sTime.getTime() - 900000)
  );

  const handleSlotBookingTrigger = () => {
    if (onOpenSlots) {
      onOpenSlots(tournament);
    } else {
      onJoinClick(tournament);
    }
  };

  return (
    <div className="tournament-card" data-tournament-id={tId} data-status={status}>
      <img src={bannerUrl} alt="Tournament Banner" className="tournament-banner-image" />
      <div className="tournament-card-content">
        <div className="tournament-card-header">
          <div className="tournament-card-tags">
            {tournament.mode && <span>{tournament.mode}</span>}
            {tournament.map && <span>{tournament.map}</span>}
            {tagsList.map((tag, idx) => (
              <span key={idx}>{tag}</span>
            ))}
          </div>
          <div className="tournament-card-timer">
            {timerText}
          </div>
        </div>

        <h3 className="tournament-card-title">
          {tournament.icon ? (
            <i className={tournament.icon}></i>
          ) : (
            <i className="bi bi-joystick text-accent"></i>
          )}{' '}
          {tournament.name || 'Tournament'}
        </h3>

        <p className="small text-secondary mb-2">
          <i className="bi bi-calendar-event me-1"></i> {sTimeLoc}
        </p>

        <div className="tournament-card-info">
          <div className="info-item">
            <span>Prize Pool</span>
            <strong>
              <i className="bi bi-trophy-fill text-accent prize-icon me-1"></i> ₹ {pPool}
            </strong>
          </div>
          <div className="info-item">
            <span>Per Kill</span>
            <strong>₹ {pkPrize}</strong>
          </div>
          <div className="info-item">
            <span>Entry Fee</span>
            <strong className={eFee > 0 ? 'text-info' : 'text-success'}>
              {eFee > 0 ? `₹ ${eFee}` : 'Free'}
            </strong>
          </div>
        </div>

        {/* Slot Booking Live Status Bar */}
        <div className="tournament-card-spots">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className={spotsL <= 5 ? 'text-danger fw-bold' : 'text-warning fw-semibold'}>
              <i className="bi bi-grid-3x3-gap-fill me-1"></i>
              {spotsTxt}
            </span>
            {isJoined && userSlots.length > 0 && (
              <span className="badge bg-warning text-dark font-monospace fw-bold">
                <i className="bi bi-check-circle-fill me-1"></i>
                Slot #{userSlots.map((s: any) => s < 10 ? `0${s}` : s).join(', #')}
              </span>
            )}
          </div>
          <div className="progress" style={{ height: '6px' }}>
            <div
              className={`progress-bar ${spotsL <= 5 ? 'bg-danger' : 'bg-warning'}`}
              role="progressbar"
              style={{ width: `${progP}%` }}
            ></div>
          </div>
        </div>

        <div className="tournament-card-actions mt-3">
          <button
            className="btn btn-custom btn-custom-secondary btn-sm btn-details"
            onClick={() => onOpenDetails(tournament)}
          >
            Details
          </button>

          {isJoined && (status === 'ongoing' || status === 'upcoming') && (
            <button
              className="btn btn-custom btn-custom-secondary btn-sm btn-chat"
              onClick={() => onOpenChat(tournament)}
            >
              <i className="bi bi-chat-dots-fill me-1"></i> Chat
            </button>
          )}

          {isJoined ? (
            <button
              className="btn btn-custom btn-sm btn-joined"
              onClick={handleSlotBookingTrigger}
              title="View your booked slot and other players"
            >
              <i className="bi bi-check-circle-fill me-1 text-success"></i> Booked
            </button>
          ) : canJoin ? (
            <button
              className="btn btn-custom btn-sm btn-custom-accent btn-join"
              onClick={handleSlotBookingTrigger}
            >
              <i className="bi bi-grid-fill me-1"></i>
              {eFee > 0 ? `Book (₹${eFee})` : 'Book Free Slot'}{' '}
              <i className="bi bi-arrow-right-short"></i>
            </button>
          ) : (
            <button className="btn btn-custom btn-sm btn-disabled" disabled>
              {status !== 'upcoming' ? status.toUpperCase() : isFull ? 'Slots Full' : 'Closed'}
            </button>
          )}
        </div>

        {showIdPass && (
          <button
            className="btn btn-custom btn-idpass w-100 mt-2 btn-sm"
            onClick={() => onOpenIdPass(tournament)}
          >
            <i className="bi bi-key-fill me-1"></i> View ID & Pass
          </button>
        )}
      </div>
    </div>
  );
};
