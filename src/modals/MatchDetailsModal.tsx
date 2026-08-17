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

  // Helper to resolve player information for a given slot number
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
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(5, 6, 18, 0.85)', backdropFilter: 'blur(8px)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content bg-dark text-white border border-secondary shadow-lg">
          
          <div className="modal-header border-bottom border-secondary pb-2">
            <div>
              <h5 className="modal-title fw-bold text-white m-0 d-flex align-items-center gap-2">
                <i className="bi bi-trophy-fill text-warning"></i>
                {tournament.name || 'Match Details'}
              </h5>
              <div className="small text-secondary mt-1">
                Game: <span className="text-warning fw-bold">{gameName}</span> • Mode: <span className="badge bg-secondary text-white">{tournament.mode || 'N/A'}</span>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* Modal Tab Controls */}
          <div className="px-3 pt-2 bg-black bg-opacity-25 border-bottom border-secondary border-opacity-50">
            <ul className="nav nav-pills nav-fill small">
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold ${activeTab === 'info' ? 'active bg-warning text-dark' : 'text-secondary'}`}
                  onClick={() => setActiveTab('info')}
                >
                  <i className="bi bi-file-text-fill me-1"></i> Match Info & Rules
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold ${activeTab === 'slots' ? 'active bg-warning text-dark' : 'text-secondary'}`}
                  onClick={() => setActiveTab('slots')}
                >
                  <i className="bi bi-controller me-1"></i> Live Slot Allocation ({maxP} Slots)
                </button>
              </li>
            </ul>
          </div>

          <div className="modal-body p-3" id="matchDetailsModalBodyEl">
            {activeTab === 'info' ? (
              <div>
                <div className="row g-2 mb-3">
                  <div className="col-6 col-md-3">
                    <div className="p-2 rounded bg-black bg-opacity-40 border border-secondary text-center">
                      <span className="text-secondary extra-small d-block">Entry Fee</span>
                      <strong className={tournament.entryFee > 0 ? 'text-info fs-6' : 'text-success fs-6'}>
                        {tournament.entryFee > 0 ? `₹ ${tournament.entryFee}` : 'Free'}
                      </strong>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-2 rounded bg-black bg-opacity-40 border border-secondary text-center">
                      <span className="text-secondary extra-small d-block">Prize Pool</span>
                      <strong className="text-warning fs-6">₹ {tournament.prizePool || 0}</strong>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-2 rounded bg-black bg-opacity-40 border border-secondary text-center">
                      <span className="text-secondary extra-small d-block">Per Kill</span>
                      <strong className="text-white fs-6">₹ {tournament.perKillPrize || 0}</strong>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-2 rounded bg-black bg-opacity-40 border border-secondary text-center">
                      <span className="text-secondary extra-small d-block">Total Slots</span>
                      <strong className="text-white fs-6">{maxP} Slots</strong>
                    </div>
                  </div>
                </div>

                <div className="mb-3 p-2 bg-black bg-opacity-30 rounded border border-secondary border-opacity-50">
                  <div className="small text-secondary"><i className="bi bi-calendar-event me-1"></i> Start Time:</div>
                  <div className="fw-bold text-white fs-6">{sTimeLoc}</div>
                  <div className="small text-secondary mt-1"><i className="bi bi-geo-alt-fill me-1"></i> Map: <span className="text-white">{tournament.map || 'N/A'}</span></div>
                </div>

                <h6 className="text-warning fw-bold mb-2"><i className="bi bi-shield-check me-1"></i> Match Rules:</h6>
                <div className="p-3 bg-black bg-opacity-40 rounded border border-secondary text-light small" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {desc}
                </div>

                {pDistHTML && (
                  <div className="mt-3">
                    <h6 className="text-warning fw-bold mb-2"><i className="bi bi-trophy me-1"></i> Prize Distribution:</h6>
                    <pre className="p-3 bg-black bg-opacity-40 rounded border border-secondary text-warning small m-0">{pDistHTML}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {loadingSlots ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-warning mb-2" role="status"></div>
                    <p className="text-secondary small">Fetching slot participants & Free Fire UIDs...</p>
                  </div>
                ) : (
                  <div>
                    <div className="d-flex justify-content-between align-items-center alert alert-dark border-warning border-opacity-50 py-2 px-3 small text-warning mb-3">
                      <div>
                        <i className="bi bi-info-circle-fill me-2"></i>
                        Live allocation of all {maxP} match slots and competitor details.
                      </div>
                      {onOpenSlots && (
                        <button
                          type="button"
                          className="btn btn-sm btn-warning text-dark fw-bold py-1 px-3 shadow-sm"
                          onClick={() => {
                            onClose();
                            onOpenSlots(tournament);
                          }}
                        >
                          <i className="bi bi-grid-fill me-1"></i>
                          {isJoined ? 'View Slot Matrix' : 'Book Your Slot Now'}
                        </button>
                      )}
                    </div>

                    <div className="table-responsive bg-black bg-opacity-50 rounded border border-secondary max-h-[50vh] overflow-y-auto">
                      <table className="table table-dark table-hover table-sm align-middle mb-0">
                        <thead className="sticky-top bg-dark">
                          <tr className="text-secondary small border-bottom border-secondary">
                            <th className="ps-3 py-2" style={{ width: '80px' }}>Slot</th>
                            <th className="py-2">Player Username</th>
                            <th className="py-2">Free Fire UID</th>
                            <th className="pe-3 py-2 text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slotList.map((slotNum) => {
                            const details = getSlotDetails(slotNum);
                            return (
                              <tr key={slotNum} className="border-bottom border-secondary border-opacity-25">
                                <td className="ps-3 fw-bold text-warning">
                                  #{slotNum < 10 ? `0${slotNum}` : slotNum}
                                </td>
                                <td>
                                  {details ? (
                                    <span className="fw-semibold text-white">
                                      <i className="bi bi-person-fill text-danger me-1"></i>
                                      {details.username}
                                    </span>
                                  ) : (
                                    <span className="text-success extra-small fw-semibold">
                                      <i className="bi bi-check-circle me-1"></i> Available Slot
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {details ? (
                                    <span className="badge bg-dark text-warning border border-warning font-monospace px-2 py-1">
                                      <i className="bi bi-controller me-1"></i>
                                      {details.gameUid}
                                    </span>
                                  ) : (
                                    <span className="text-muted small">-</span>
                                  )}
                                </td>
                                <td className="pe-3 text-end">
                                  {details && details.gameUid !== 'N/A' ? (
                                    <button
                                      className="btn btn-xs btn-outline-warning py-0 px-2"
                                      onClick={() => handleCopyUid(details.gameUid)}
                                    >
                                      <i className={`bi ${copiedUid === details.gameUid ? 'bi-check-lg' : 'bi-clipboard'} me-1`}></i>
                                      {copiedUid === details.gameUid ? 'Copied' : 'Copy UID'}
                                    </button>
                                  ) : onOpenSlots && !isJoined ? (
                                    <button
                                      className="btn btn-xs btn-outline-success py-0 px-2 fw-semibold"
                                      onClick={() => {
                                        onClose();
                                        onOpenSlots(tournament);
                                      }}
                                    >
                                      + Book
                                    </button>
                                  ) : (
                                    <span className="text-muted small">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer border-top border-secondary py-2 d-flex justify-content-between">
            {onOpenSlots && !isJoined && tournament.status === 'upcoming' ? (
              <button
                type="button"
                className="btn btn-custom btn-custom-accent btn-sm px-4 fw-bold"
                onClick={() => {
                  onClose();
                  onOpenSlots(tournament);
                }}
              >
                <i className="bi bi-grid-fill me-1"></i> Book Slot Now
              </button>
            ) : <div />}
            <button type="button" className="btn btn-secondary btn-sm px-4" onClick={onClose}>
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
