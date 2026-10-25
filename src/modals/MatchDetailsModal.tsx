import React, { useState, useEffect } from 'react';
import { Tournament, RegisteredPlayer } from '../types';
import { useAuth } from '../context/AuthContext';
import { ref, get, db } from '../firebase';

interface MatchDetailsModalProps {
  tournament: Tournament | null;
  onClose: () => void;
  onOpenSlots?: (tournament: Tournament) => void;
}

export const MatchDetailsModal: React.FC<MatchDetailsModalProps> = ({
  tournament,
  onClose,
  onOpenSlots
}) => {
  const { currentUser, userProfile, appSettings } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'slots'>('info');
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [takenSlots, setTakenSlots] = useState<Record<string | number, any>>({});
  const [registeredPlayers, setRegisteredPlayers] = useState<Record<string, RegisteredPlayer>>({});
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  useEffect(() => {
    const fetchParticipantData = async () => {
      if (!tournament || activeTab !== 'slots') return;
      setLoadingSlots(true);
      try {
        const tRef = ref(db, `tournaments/${tournament.id}`);
        const snapshot = await get(tRef);
        if (snapshot.exists()) {
          const tData = snapshot.val();
          setTakenSlots(tData.slots || {});
          setRegisteredPlayers(tData.registeredPlayers || {});
        }
      } catch (err) {
        console.error("Error fetching match slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchParticipantData();
  }, [tournament, activeTab]);

  if (!tournament) return null;

  const isJoined = !!(currentUser && userProfile?.joinedTournaments?.[tournament.id]);
  const gameName = appSettings.games?.[tournament.gameId]?.name || tournament.gameId || 'Free Fire';
  const sTimeLoc = tournament.startTime
    ? new Date(tournament.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'TBA';

  let pDistHTML = '';
  if (tournament.prizeDistribution) {
    if (typeof tournament.prizeDistribution === 'object') {
      pDistHTML = Object.entries(tournament.prizeDistribution)
        .map(([rank, prize]) => `Rank ${rank}: ₹ ${prize}`)
        .join('\n');
    } else {
      pDistHTML = String(tournament.prizeDistribution).replace(/\\n/g, '\n');
    }
  }

  const desc = tournament.description || 'Standard Free Fire competitive rules apply.';
  const maxP = tournament.maxPlayers > 0 ? tournament.maxPlayers : 48;

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const getSlotDetails = (slotNum: number) => {
    const slotKey = slotNum.toString();
    const rawVal = takenSlots[slotNum] || takenSlots[slotKey];
    if (!rawVal) return null;

    let userId = typeof rawVal === 'string' ? rawVal : rawVal.userId;

    if (!userId && typeof rawVal === 'object') {
      return {
        username: rawVal.username || 'Occupied',
        gameUid: rawVal.gameUid || rawVal.ffUid || 'N/A'
      };
    }

    const player = registeredPlayers[userId];
    if (!player) {
      return {
        username: 'Registered Player',
        gameUid: 'N/A'
      };
    }

    if (player.slots && Array.isArray(player.slots)) {
      const slotIndex = player.slots.findIndex((s: any) => s.toString() === slotKey);
      if (slotIndex > 0 && player.teammates && player.teammates[slotIndex - 1]) {
        const teammate = player.teammates[slotIndex - 1];
        return {
          username: teammate.username || player.username,
          gameUid: teammate.gameUid || player.gameUid
        };
      }
    }

    return {
      username: player.username,
      gameUid: player.gameUid
    };
  };

  const slotList = Array.from({ length: maxP }, (_, i) => i + 1);

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-details-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content match-details-modal-content">
          
          {/* Header */}
          <div className="match-details-head">
            <div className="d-flex align-items-center gap-3">
              <div className="mode-icon">
                <i className="bi bi-trophy-fill"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold text-white m-0 fs-5" id="match-details-title">
                  {tournament.name || 'Match Details'}
                </h5>
                <p className="m-0 extra-small" style={{ color: '#9EA4B8' }}>
                  {gameName} · {tournament.mode || 'SOLO'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Tabs Track */}
          <div className="px-4 pt-3">
            <div className="match-details-tabs-track" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'info'}
                className={`match-details-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Match Info & Rules
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'slots'}
                className={`match-details-tab-btn ${activeTab === 'slots' ? 'active' : ''}`}
                onClick={() => setActiveTab('slots')}
              >
                Slot Allocation ({maxP} Slots)
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="modal-body p-4" id="matchDetailsModalBodyEl">
            {activeTab === 'info' ? (
              <div className="d-flex flex-column gap-3.5">
                {/* 4 Stat Cards */}
                <div className="row g-3">
                  <div className="col-6 col-md-3">
                    <div className="match-stat-card match-stat-blue">
                      <span className="lbl">Entry Fee</span>
                      <strong className="val">
                        {tournament.entryFee > 0 ? `₹${tournament.entryFee}` : 'FREE'}
                      </strong>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="match-stat-card match-stat-gold">
                      <span className="lbl">Prize Pool</span>
                      <strong className="val">₹{tournament.prizePool || 0}</strong>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="match-stat-card match-stat-green">
                      <span className="lbl">Per Kill</span>
                      <strong className="val">₹{tournament.perKillPrize || 0}</strong>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="match-stat-card match-stat-purple">
                      <span className="lbl">Total Slots</span>
                      <strong className="val">{maxP} Slots</strong>
                    </div>
                  </div>
                </div>

                {/* Schedule & Map Pill */}
                <div
                  className="p-3.5 rounded-4 d-flex flex-wrap align-items-center justify-content-between gap-3"
                  style={{ background: '#1A1D26', border: '1px solid #272B38' }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center p-2.5"
                      style={{ background: '#262A37', color: '#6CC4FF', width: '44px', height: '44px' }}
                    >
                      <i className="bi bi-calendar3 fs-5"></i>
                    </div>
                    <div>
                      <div className="extra-small fw-bold tracking-wider" style={{ color: '#9EA4B8' }}>START TIME</div>
                      <div className="fw-bold text-white small">{sTimeLoc}</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center p-2.5"
                      style={{ background: '#262A37', color: '#FFC61A', width: '44px', height: '44px' }}
                    >
                      <i className="bi bi-geo-alt-fill fs-5"></i>
                    </div>
                    <div>
                      <div className="extra-small fw-bold tracking-wider" style={{ color: '#9EA4B8' }}>MAP LOCATION</div>
                      <div className="fw-bold text-warning small" style={{ color: '#FFC61A' }}>{tournament.map || 'Erangel / Bermuda'}</div>
                    </div>
                  </div>
                </div>

                {/* Match Rules Card */}
                <div>
                  <h6 className="fw-bold mb-2 small uppercase tracking-wider" style={{ color: '#FFC61A' }}>
                    Match Rules & Guidelines
                  </h6>
                  <div
                    className="p-3.5 rounded-4 small"
                    style={{
                      background: '#1A1D26',
                      border: '1px solid #272B38',
                      color: '#F5F6FA',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.65
                    }}
                  >
                    {desc}
                  </div>
                </div>

                {/* Prize Distribution Card */}
                {pDistHTML && (
                  <div>
                    <h6 className="fw-bold mb-2 small uppercase tracking-wider" style={{ color: '#FFC61A' }}>
                      Prize Distribution
                    </h6>
                    <pre
                      className="p-3.5 rounded-4 font-mono small m-0"
                      style={{
                        background: '#1A1D26',
                        border: '1px solid rgba(255, 198, 26, 0.3)',
                        color: '#FFC61A',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {pDistHTML}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {loadingSlots ? (
                  <div className="text-center py-5">
                    <div className="spinner-border mb-2" role="status" style={{ color: '#FFC61A' }}></div>
                    <p className="small" style={{ color: '#9EA4B8' }}>Loading live slot allocation...</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    <div
                      className="p-3 rounded-4 d-flex align-items-center justify-content-between gap-2"
                      style={{
                        background: '#1A1D26',
                        border: '1px solid #272B38'
                      }}
                    >
                      <div className="small fw-semibold d-flex align-items-center gap-2" style={{ color: '#FFC61A' }}>
                        <i className="bi bi-info-circle-fill fs-6"></i>
                        <span>Live participant list & game UIDs for all {maxP} slots</span>
                      </div>
                      {onOpenSlots && (
                        <button
                          type="button"
                          className="match-book-btn whitespace-nowrap"
                          onClick={() => {
                            onClose();
                            onOpenSlots(tournament);
                          }}
                        >
                          {isJoined ? 'View Slot Matrix' : 'Book Slot'}
                        </button>
                      )}
                    </div>

                    {/* Slot List */}
                    <div className="d-flex flex-column gap-2.5" style={{ maxHeight: '48vh', overflowY: 'auto' }}>
                      {slotList.map((slotNum) => {
                        const details = getSlotDetails(slotNum);
                        return (
                          <div key={slotNum} className="match-slot-row">
                            <div className="d-flex align-items-center gap-3">
                              <div className="match-slot-num-tile">
                                #{slotNum < 10 ? `0${slotNum}` : slotNum}
                              </div>
                              <div>
                                {details ? (
                                  <div>
                                    <div className="fw-bold text-white d-flex align-items-center gap-1.5">
                                      <span>{details.username}</span>
                                    </div>
                                    <div className="extra-small font-mono mt-0.5" style={{ color: '#9EA4B8' }}>
                                      UID: <span style={{ color: '#FFC61A' }}>{details.gameUid}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="fw-bold extra-small" style={{ color: '#3DDC84' }}>
                                    Available Slot
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              {details && details.gameUid !== 'N/A' ? (
                                <button
                                  type="button"
                                  className="btn btn-sm px-3 py-1.5 rounded-3 fw-bold border-0"
                                  style={{ background: '#262A37', color: '#FFC61A' }}
                                  onClick={() => handleCopyUid(details.gameUid)}
                                >
                                  {copiedUid === details.gameUid ? 'Copied' : 'Copy'}
                                </button>
                              ) : onOpenSlots && !isJoined ? (
                                <button
                                  type="button"
                                  className="match-book-btn"
                                  onClick={() => {
                                    onClose();
                                    onOpenSlots(tournament);
                                  }}
                                >
                                  + Book
                                </button>
                              ) : (
                                <span className="small" style={{ color: '#9EA4B8' }}>-</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer border-top px-4 py-3 d-flex justify-content-between" style={{ borderColor: '#272B38', background: '#14161D' }}>
            {onOpenSlots && !isJoined && tournament.status === 'upcoming' ? (
              <button
                type="button"
                className="match-action-btn-primary"
                onClick={() => {
                  onClose();
                  onOpenSlots(tournament);
                }}
              >
                Book Slot Now
              </button>
            ) : <div />}
            <button
              type="button"
              className="match-action-btn-ghost"
              onClick={onClose}
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
