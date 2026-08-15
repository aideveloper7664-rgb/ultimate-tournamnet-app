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
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  onOpenDetails,
  onOpenIdPass,
  onOpenChat,
  onJoinClick
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
  const maxP = tournament.maxPlayers || 0;
  const spotsL = maxP > 0 ? Math.max(0, maxP - regC) : Infinity;
  const isFull = maxP > 0 && spotsL <= 0;
  
  const isJoined = !!(currentUser && userProfile?.joinedTournaments?.[tId]);
  const hasSlots = tournament.slotConfig && tournament.slotConfig.type !== 'disabled';
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

  let spotsTxt = 'Unlimited Spots';
  let progP = 0;
  if (maxP > 0) {
    spotsTxt = `${spotsL} Spots Left (${regC}/${maxP})`;
    progP = Math.min(100, (regC / maxP) * 100);
  }

  const tagsList = Array.isArray(tournament.tags)
    ? tournament.tags
    : tournament.tags
    ? Object.values(tournament.tags)
    : [];

  const showIdPass = isJoined && (
    status === 'ongoing' ||
    (status === 'upcoming' && tournament.showIdPass && sTime && Date.now() > sTime.getTime() - 900000)
  );

  return (
    <div className="tournament-card" data-tournament-id={tId} data-status={status}>
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
            <strong className={eFee > 0 ? 'text-info' : ''}>
              {eFee > 0 ? `₹ ${eFee}` : 'Free'}
            </strong>
          </div>
        </div>

        <div className="tournament-card-spots">
          <span className={spotsL <= 5 && maxP > 0 ? 'text-danger' : 'text-accent'}>
            {spotsTxt}
          </span>
          {maxP > 0 && (
            <div className="progress mt-1" style={{ height: '6px' }}>
              <div
                className="progress-bar bg-warning"
                role="progressbar"
                style={{ width: `${progP}%` }}
              ></div>
            </div>
          )}
        </div>

        <div className="tournament-card-actions">
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
            <button className="btn btn-custom btn-sm btn-joined" disabled>
              <i className="bi bi-check-circle-fill me-1"></i> Joined
            </button>
          ) : canJoin ? (
            <button
              className="btn btn-custom btn-sm btn-custom-accent btn-join"
              onClick={() => onJoinClick(tournament)}
            >
              {hasSlots ? "Select Slot" : `₹ ${eFee} Join`}{' '}
              <i className="bi bi-arrow-right-short"></i>
            </button>
          ) : (
            <button className="btn btn-custom btn-sm btn-disabled" disabled>
              {status !== 'upcoming' ? status.toUpperCase() : isFull ? 'Full' : 'Closed'}
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
