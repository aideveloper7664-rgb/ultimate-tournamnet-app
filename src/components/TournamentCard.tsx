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
      {/* Banner & Floating Badges */}
      <div className="tournament-banner-wrapper">
        <img 
          src={bannerUrl} 
          alt={tournament.name || 'Tournament'} 
          className="tournament-banner-image"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';
          }}
        />
        <div className="tournament-banner-gradient"></div>
        
        {/* Floating Timer Badge only on image */}
        <div className="tournament-banner-badges">
          <div></div>
          <div className={`tournament-card-timer timer-${status}`}>
            {status === 'ongoing' && <span className="timer-pulse-dot"></span>}
            <i className={`bi ${status === 'ongoing' ? 'bi-broadcast' : status === 'completed' ? 'bi-check2-circle' : 'bi-clock-history'} me-1`}></i>
            <span>{timerText}</span>
          </div>
        </div>
      </div>

      <div className="tournament-card-content">
        {/* Title & Schedule */}
        <div className="tournament-title-row">
          <h3 className="tournament-card-title">
            <span className="tournament-title-icon">
              <i className={tournament.icon || 'bi bi-controller'}></i>
            </span>
            <span className="tournament-title-text">{tournament.name || 'Tournament'}</span>
          </h3>
          <div className="tournament-schedule-badge">
            <i className="bi bi-calendar3"></i>
            <span>{sTimeLoc}</span>
          </div>
        </div>

        {/* Tags Row below Title */}
        {(tournament.mode || tournament.map || tagsList.length > 0) && (
          <div className="tournament-card-tags-row mb-2.5">
            {tournament.mode && (
              <span className="tag-chip mode-chip">
                <i className="bi bi-people-fill me-1"></i>
                {tournament.mode}
              </span>
            )}
            {tournament.map && (
              <span className="tag-chip map-chip">
                <i className="bi bi-geo-alt-fill me-1"></i>
                {tournament.map}
              </span>
            )}
            {tagsList.map((tag, idx) => (
              <span key={idx} className="tag-chip">
                <i className="bi bi-tag-fill me-1"></i>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 3-Column Native Stats Grid */}
        <div className="tournament-stats-grid">
          <div className="stat-box prize-box">
            <div className="stat-label">
              <i className="bi bi-trophy-fill"></i>
              <span>Prize Pool</span>
            </div>
            <div className="stat-value prize-value">₹{pPool}</div>
          </div>

          <div className="stat-box kill-box">
            <div className="stat-label">
              <i className="bi bi-crosshair"></i>
              <span>Per Kill</span>
            </div>
            <div className="stat-value kill-value">₹{pkPrize}</div>
          </div>

          <div className="stat-box entry-box">
            <div className="stat-label">
              <i className="bi bi-ticket-perforated-fill"></i>
              <span>Entry Fee</span>
            </div>
            <div className={`stat-value ${eFee > 0 ? 'entry-paid' : 'entry-free'}`}>
              {eFee > 0 ? `₹${eFee}` : 'FREE'}
            </div>
          </div>
        </div>

        {/* Slot Booking Live Status Bar */}
        <div className="tournament-slots-wrapper">
          <div className="d-flex justify-content-between align-items-center mb-1.5">
            <div className="slots-counter-label">
              <span className={`slot-dot ${spotsL <= 5 ? 'dot-urgent' : 'dot-available'}`}></span>
              <span className={spotsL <= 5 ? 'text-danger fw-bold' : 'text-slate-300'}>
                {spotsTxt}
              </span>
            </div>
            {isJoined && userSlots.length > 0 && (
              <span className="booked-slot-chip">
                <i className="bi bi-shield-check"></i>
                <span>Slot #{userSlots.map((s: any) => s < 10 ? `0${s}` : s).join(', #')}</span>
              </span>
            )}
          </div>
          <div className="slots-progress-track">
            <div
              className={`slots-progress-fill ${spotsL <= 5 ? 'fill-urgent' : 'fill-normal'}`}
              style={{ width: `${progP}%` }}
            ></div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="tournament-card-actions">
          <button
            type="button"
            className="btn btn-action-card btn-card-details"
            onClick={() => onOpenDetails(tournament)}
          >
            <i className="bi bi-info-circle"></i>
            <span>Details</span>
          </button>

          {isJoined && (status === 'ongoing' || status === 'upcoming') && (
            <button
              type="button"
              className="btn btn-action-card btn-card-chat"
              onClick={() => onOpenChat(tournament)}
            >
              <i className="bi bi-chat-dots-fill"></i>
              <span>Chat</span>
            </button>
          )}

          {isJoined ? (
            <button
              type="button"
              className="btn btn-action-card btn-card-booked"
              onClick={handleSlotBookingTrigger}
              title="View your booked slot and other players"
            >
              <i className="bi bi-check-circle-fill"></i>
              <span>Booked</span>
            </button>
          ) : canJoin ? (
            <button
              type="button"
              className="btn btn-action-card btn-card-join"
              onClick={handleSlotBookingTrigger}
            >
              <i className="bi bi-lightning-charge-fill"></i>
              <span>{eFee > 0 ? `Join (₹${eFee})` : 'Join Free'}</span>
            </button>
          ) : (
            <button type="button" className="btn btn-action-card btn-card-disabled" disabled>
              <span>{status !== 'upcoming' ? status.toUpperCase() : isFull ? 'Slots Full' : 'Closed'}</span>
            </button>
          )}
        </div>

        {/* ID & Password Button if active */}
        {showIdPass && (
          <button
            type="button"
            className="btn btn-card-idpass w-100 mt-2.5"
            onClick={() => onOpenIdPass(tournament)}
          >
            <i className="bi bi-key-fill"></i>
            <span>View Room ID & Password</span>
          </button>
        )}
      </div>
    </div>
  );
};
