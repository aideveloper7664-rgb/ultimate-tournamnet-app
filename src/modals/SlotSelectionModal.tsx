import React, { useState, useEffect } from 'react';
import { Tournament, RegisteredPlayer } from '../types';
import { ref, get, db } from '../firebase';
import { StatusMessage } from '../components/StatusMessage';
import { useAuth } from '../context/AuthContext';

interface SlotSelectionModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSlots: (selectedSlots: (string | number)[]) => void;
}

export const SlotSelectionModal: React.FC<SlotSelectionModalProps> = ({
  tournament,
  isOpen,
  onClose,
  onConfirmSlots
}) => {
  const { currentUser } = useAuth();
  const [takenSlots, setTakenSlots] = useState<Record<string | number, any>>({});
  const [registeredPlayers, setRegisteredPlayers] = useState<Record<string, RegisteredPlayer>>({});
  const [selectedSlots, setSelectedSlots] = useState<(string | number)[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  // Search and Filter states
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Inspected slot detail popover state
  const [inspectedSlot, setInspectedSlot] = useState<{
    slotNum: number;
    username: string;
    gameUid: string;
    userId: string;
  } | null>(null);
  const [copiedUid, setCopiedUid] = useState<boolean>(false);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!tournament) return;
      setLoading(true);
      setSelectedSlots([]);
      setStatusMessage(null);
      setSearchQuery('');
      setFilter('all');
      setInspectedSlot(null);

      try {
        const tRef = ref(db, `tournaments/${tournament.id}`);
        const snapshot = await get(tRef);
        if (snapshot.exists()) {
          const tData = snapshot.val();
          setTakenSlots(tData.slots || {});
          setRegisteredPlayers(tData.registeredPlayers || {});
        }
      } catch (e: any) {
        console.error("Error fetching slots:", e);
        setStatusMessage(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && tournament) {
      fetchSlots();
    }
  }, [isOpen, tournament]);

  if (!isOpen || !tournament) return null;

  let slotsToSelect = 1;
  const slotConfig = tournament.slotConfig;
  if (slotConfig && slotConfig.type === 'team' && (slotConfig.slotsPerEntry || 1) > 1) {
    slotsToSelect = slotConfig.slotsPerEntry!;
  }

  const maxPlayers = tournament.maxPlayers || 0;

  // Helper to resolve player information for a given slot number
  const getSlotDetails = (slotNum: number) => {
    const slotKey = slotNum.toString();
    const rawVal = takenSlots[slotNum] || takenSlots[slotKey];
    if (!rawVal) return null;

    let userId = typeof rawVal === 'string' ? rawVal : rawVal.userId;

    if (!userId && typeof rawVal === 'object') {
      return {
        userId: 'unknown',
        username: rawVal.username || 'Occupied',
        gameUid: rawVal.gameUid || rawVal.ffUid || 'N/A'
      };
    }

    const player = registeredPlayers[userId];
    if (!player) {
      return {
        userId,
        username: 'Registered Player',
        gameUid: 'N/A'
      };
    }

    if (player.slots && Array.isArray(player.slots)) {
      const slotIndex = player.slots.findIndex((s: any) => s.toString() === slotKey);
      if (slotIndex > 0 && player.teammates && player.teammates[slotIndex - 1]) {
        const teammate = player.teammates[slotIndex - 1];
        return {
          userId,
          username: teammate.username || player.username,
          gameUid: teammate.gameUid || player.gameUid
        };
      }
    }

    return {
      userId,
      username: player.username,
      gameUid: player.gameUid
    };
  };

  const handleSlotClick = (slotNum: number, isTaken: boolean) => {
    if (isTaken) {
      const details = getSlotDetails(slotNum);
      if (details) {
        setInspectedSlot({
          slotNum,
          ...details
        });
      }
      return;
    }

    const slotStr = slotNum.toString();
    if (selectedSlots.includes(slotStr) || selectedSlots.includes(slotNum)) {
      setSelectedSlots(prev => prev.filter(s => s.toString() !== slotStr));
    } else {
      if (selectedSlots.length < slotsToSelect) {
        setSelectedSlots(prev => [...prev, slotNum]);
      } else {
        setStatusMessage(`You can only select ${slotsToSelect} slot(s).`);
      }
    }
  };

  const handleConfirm = () => {
    if (selectedSlots.length !== slotsToSelect) {
      setStatusMessage(`Please select exactly ${slotsToSelect} slot(s).`);
      return;
    }
    onConfirmSlots(selectedSlots);
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // Calculate statistics
  let occupiedCount = 0;
  for (let i = 1; i <= maxPlayers; i++) {
    if (takenSlots[i] || takenSlots[i.toString()]) occupiedCount++;
  }
  const availableCount = Math.max(0, maxPlayers - occupiedCount);

  // Build list of slots to display
  const allSlotNumbers = Array.from({ length: maxPlayers }, (_, i) => i + 1);

  const filteredSlots = allSlotNumbers.filter(slotNum => {
    const isTaken = !!(takenSlots[slotNum] || takenSlots[slotNum.toString()]);
    const isSelected = selectedSlots.some(s => s.toString() === slotNum.toString());
    const details = isTaken ? getSlotDetails(slotNum) : null;
    const isMine = details?.userId === currentUser?.uid;

    if (filter === 'available' && isTaken) return false;
    if (filter === 'occupied' && !isTaken) return false;
    if (filter === 'mine' && !isMine && !isSelected) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const slotMatch = `#${slotNum}`.includes(q) || slotNum.toString() === q;
      const userMatch = details?.username.toLowerCase().includes(q);
      const uidMatch = details?.gameUid.toLowerCase().includes(q);
      return slotMatch || userMatch || uidMatch;
    }

    return true;
  });

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(5, 6, 18, 0.85)', backdropFilter: 'blur(8px)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content slot-modal-content">
          
          {/* Header */}
          <div className="modal-header slot-modal-header border-bottom border-secondary border-opacity-25">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <i className="bi bi-grid-3x3-gap-fill text-warning fs-5"></i>
                <h5 className="modal-title fw-bold text-white m-0">Slot Allocation Matrix</h5>
              </div>
              <p className="small text-secondary m-0">
                Tournament: <strong className="text-light">{tournament.name}</strong> • Mode: <span className="badge bg-dark border border-secondary text-warning">{tournament.mode || 'Solo'}</span>
              </p>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-3">
            {/* Quick Stats Bar */}
            <div className="slot-stats-bar mb-3">
              <div className="stat-pill">
                <span className="stat-label">Total Slots</span>
                <span className="stat-val text-light">{maxPlayers}</span>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Available</span>
                <span className="stat-val text-success">{availableCount}</span>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Occupied</span>
                <span className="stat-val text-danger">{occupiedCount}</span>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Your Selection</span>
                <span className="stat-val text-warning">{selectedSlots.length} / {slotsToSelect}</span>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="row g-2 mb-3 align-items-center">
              <div className="col-12 col-md-7">
                <div className="slot-filter-tabs">
                  <button
                    type="button"
                    className={`slot-tab-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    All ({maxPlayers})
                  </button>
                  <button
                    type="button"
                    className={`slot-tab-btn ${filter === 'available' ? 'active' : ''}`}
                    onClick={() => setFilter('available')}
                  >
                    <i className="bi bi-check-circle me-1"></i> Available
                  </button>
                  <button
                    type="button"
                    className={`slot-tab-btn ${filter === 'occupied' ? 'active' : ''}`}
                    onClick={() => setFilter('occupied')}
                  >
                    <i className="bi bi-person-fill-lock me-1"></i> Taken
                  </button>
                  <button
                    type="button"
                    className={`slot-tab-btn ${filter === 'mine' ? 'active' : ''}`}
                    onClick={() => setFilter('mine')}
                  >
                    <i className="bi bi-star-fill me-1"></i> Selected
                  </button>
                </div>
              </div>

              <div className="col-12 col-md-5">
                <div className="input-group input-group-sm slot-search-group">
                  <span className="input-group-text bg-dark border-secondary text-secondary">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control bg-dark border-secondary text-light shadow-none"
                    placeholder="Search name, slot # or FF UID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="btn btn-outline-secondary text-secondary border-secondary"
                      onClick={() => setSearchQuery('')}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Selection Guidance Notice */}
            <div className="slot-info-notice mb-3">
              <div className="notice-content">
                <i className="bi bi-info-circle-fill notice-icon"></i>
                <span className="notice-text">
                  Select <span className="notice-highlight">{slotsToSelect} slot(s)</span> and tap next to enter Free Fire UID.
                </span>
              </div>
              {selectedSlots.length > 0 && (
                <div className="slot-selected-badge">
                  <i className="bi bi-check2-circle me-1"></i>
                  Selected: #{selectedSlots.map(s => s < 10 ? `0${s}` : s).join(', #')}
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-warning mb-2" role="status"></div>
                <p className="text-secondary small">Loading slot matrix & player details...</p>
              </div>
            ) : maxPlayers === 0 ? (
              <p className="text-danger text-center w-100 py-4">This tournament does not have defined slots.</p>
            ) : filteredSlots.length === 0 ? (
              <div className="text-center py-5 text-secondary">
                <i className="bi bi-inbox fs-2 mb-2 d-block"></i>
                No slots match your current filter or search query.
              </div>
            ) : (
              <div className="esports-slot-grid">
                {filteredSlots.map((slotNum) => {
                  const isTaken = !!(takenSlots[slotNum] || takenSlots[slotNum.toString()]);
                  const isSelected = selectedSlots.some(s => s.toString() === slotNum.toString());
                  const details = isTaken ? getSlotDetails(slotNum) : null;
                  const isMine = details?.userId === currentUser?.uid;

                  return (
                    <div
                      key={slotNum}
                      className={`esports-slot-card ${
                        isSelected ? 'slot-selected' : isMine ? 'slot-mine' : isTaken ? 'slot-taken' : 'slot-available'
                      }`}
                      onClick={() => handleSlotClick(slotNum, isTaken)}
                    >
                      {/* Top Header of Card */}
                      <div className="slot-card-header">
                        <span className="slot-num-tag">
                          SLOT #{slotNum < 10 ? `0${slotNum}` : slotNum}
                        </span>
                        {isSelected ? (
                          <span className="badge bg-dark text-warning border border-warning">SELECTED</span>
                        ) : isMine ? (
                          <span className="badge bg-warning text-dark fw-bold">YOURS</span>
                        ) : isTaken ? (
                          <span className="badge bg-danger bg-opacity-75 text-white">TAKEN</span>
                        ) : (
                          <span className="badge bg-success bg-opacity-75 text-white">OPEN</span>
                        )}
                      </div>

                      {/* Content Body of Card */}
                      <div className="slot-card-body">
                        {isTaken && details ? (
                          <div className="slot-player-info">
                            <div className="player-name text-truncate" title={details.username}>
                              <i className="bi bi-person-fill text-danger me-1"></i>
                              {details.username}
                            </div>
                            <div className="player-uid-badge" title="Click to view full Free Fire UID">
                              <i className="bi bi-controller text-warning me-1"></i>
                              <span>UID: {details.gameUid}</span>
                            </div>
                          </div>
                        ) : isSelected ? (
                          <div className="slot-selected-info">
                            <i className="bi bi-check-circle-fill fs-4 text-warning mb-1"></i>
                            <span className="fw-bold text-white small">YOUR SELECTION</span>
                          </div>
                        ) : (
                          <div className="slot-open-info">
                            <i className="bi bi-plus-circle text-success fs-4 mb-1"></i>
                            <span className="text-secondary small fw-medium">+ TAP TO SELECT</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <StatusMessage message={statusMessage} type="warning" onDismiss={() => setStatusMessage(null)} />
          </div>

          {/* Modal Footer */}
          <div className="modal-footer slot-modal-footer border-top border-secondary border-opacity-25 py-2">
            <button type="button" className="btn btn-outline-secondary text-light px-3 btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-custom btn-custom-accent px-3 btn-sm shadow-sm fw-bold d-flex align-items-center gap-1"
              onClick={handleConfirm}
              disabled={loading || selectedSlots.length !== slotsToSelect}
            >
              <span>Next: Enter Free Fire UID ({selectedSlots.length}/{slotsToSelect})</span>
              <i className="bi bi-arrow-right-short fs-5"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Inspected Player Slot Detail Modal / Popover */}
      {inspectedSlot && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1055 }}
          onClick={() => setInspectedSlot(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-dark text-white border border-secondary shadow-lg">
              <div className="modal-header border-bottom border-secondary py-2">
                <h6 className="modal-title fw-bold text-warning m-0">
                  <i className="bi bi-controller me-2"></i>
                  Slot #{inspectedSlot.slotNum} Participant
                </h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setInspectedSlot(null)}
                ></button>
              </div>

              <div className="modal-body text-center py-3">
                <div className="mb-2">
                  <div
                    className="rounded-circle bg-secondary bg-opacity-25 d-inline-flex align-items-center justify-content-center mb-2 text-warning border border-warning"
                    style={{ width: '56px', height: '56px' }}
                  >
                    <i className="bi bi-person-badge fs-2"></i>
                  </div>
                  <h6 className="fw-bold mb-1">{inspectedSlot.username}</h6>
                  <p className="small text-secondary m-0">Registered Competitor</p>
                </div>

                <div className="bg-black bg-opacity-50 p-2 rounded border border-secondary mb-3">
                  <div className="text-secondary extra-small text-uppercase mb-1">Free Fire / Game UID</div>
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <span className="fw-mono text-warning fs-6 fw-bold">{inspectedSlot.gameUid}</span>
                    <button
                      className="btn btn-sm btn-outline-warning py-0 px-2"
                      onClick={() => handleCopyUid(inspectedSlot.gameUid)}
                      title="Copy Free Fire UID"
                    >
                      <i className={`bi ${copiedUid ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
                      {copiedUid ? ' Copied!' : ''}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-secondary w-100"
                  onClick={() => setInspectedSlot(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
