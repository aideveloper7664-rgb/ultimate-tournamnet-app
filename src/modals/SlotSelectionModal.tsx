import React, { useState, useEffect } from 'react';
import { Tournament, RegisteredPlayer } from '../types';
import { ref, onValue, db } from '../firebase';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Search & Filter
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied'>('all');
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
    if (!isOpen || !tournament) return;
    
    setLoading(true);
    setSelectedSlots([]);
    setErrorMessage(null);
    setSearchQuery('');
    setFilter('all');
    setInspectedSlot(null);

    const tRef = ref(db, `tournaments/${tournament.id}`);
    
    const unsubscribe = onValue(tRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const tData = snapshot.val();
          setTakenSlots(tData.slots || {});
          setRegisteredPlayers(tData.registeredPlayers || {});
        } else {
          setTakenSlots({});
          setRegisteredPlayers({});
        }
      } catch (e: any) {
        console.error("Error subscribing to slots:", e);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error("Slot sync error:", err);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, tournament]);

  if (!isOpen || !tournament) return null;

  // Required slots calculation
  let slotsToSelect = 1;
  const slotConfig = tournament.slotConfig;
  const modeLower = (tournament.mode || '').toLowerCase();
  if (slotConfig && slotConfig.type === 'team' && (slotConfig.slotsPerEntry || 1) > 1) {
    slotsToSelect = slotConfig.slotsPerEntry!;
  } else if (modeLower.includes('squad') || modeLower.includes('4v4')) {
    slotsToSelect = 4;
  } else if (modeLower.includes('duo') || modeLower.includes('2v2')) {
    slotsToSelect = 2;
  }

  // Max players capacity
  const maxPlayers = tournament.maxPlayers > 0 
    ? tournament.maxPlayers 
    : (modeLower.includes('clash') || modeLower.includes('cs')) ? 8 : 48;

  // Resolve player info for occupied slots
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
        username: 'Player',
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

  const isSlotTaken = (slotNum: number) => {
    return !!(takenSlots[slotNum] || takenSlots[slotNum.toString()]);
  };

  const handleSlotClick = (slotNum: number, isTaken: boolean) => {
    setErrorMessage(null);
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
        setSelectedSlots(prev => [...prev, slotNum].sort((a: any, b: any) => Number(a) - Number(b)));
      } else {
        if (slotsToSelect === 1) {
          setSelectedSlots([slotNum]);
        } else {
          setErrorMessage(`Select up to ${slotsToSelect} slots.`);
        }
      }
    }
  };

  // Quick Auto Pick
  const handleQuickAutoPick = () => {
    setErrorMessage(null);
    const availableSlots: number[] = [];
    for (let i = 1; i <= maxPlayers; i++) {
      if (!isSlotTaken(i)) {
        availableSlots.push(i);
      }
    }

    if (availableSlots.length < slotsToSelect) {
      setErrorMessage("No free slots available.");
      return;
    }

    const picked = availableSlots.slice(0, slotsToSelect);
    setSelectedSlots(picked);
  };

  const handleConfirm = () => {
    if (selectedSlots.length !== slotsToSelect) {
      setErrorMessage(`Please select ${slotsToSelect} slot(s) to proceed.`);
      return;
    }
    onConfirmSlots(selectedSlots);
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // Stats calculation
  let occupiedCount = 0;
  for (let i = 1; i <= maxPlayers; i++) {
    if (isSlotTaken(i)) occupiedCount++;
  }
  const availableCount = Math.max(0, maxPlayers - occupiedCount);

  // Filter slots
  const allSlotNumbers = Array.from({ length: maxPlayers }, (_, i) => i + 1);
  const filteredSlots = allSlotNumbers.filter(slotNum => {
    const isTaken = isSlotTaken(slotNum);
    if (filter === 'available' && isTaken) return false;
    if (filter === 'occupied' && !isTaken) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const slotMatch = `#${slotNum}`.includes(q) || slotNum.toString() === q;
      const details = isTaken ? getSlotDetails(slotNum) : null;
      const userMatch = details?.username.toLowerCase().includes(q);
      const uidMatch = details?.gameUid.toLowerCase().includes(q);
      return slotMatch || userMatch || uidMatch;
    }

    return true;
  });

  return (
    <div className="modal fade show d-block native-slot-modal-backdrop" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable native-slot-dialog">
        <div className="modal-content native-slot-container">
          
          {/* App-Native Gaming Header */}
          <div className="modal-header border-bottom border-secondary border-opacity-30 px-3 py-2.5 d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(180deg, #181B34 0%, #101328 100%)' }}>
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-2 bg-warning bg-opacity-15 p-1.5 d-flex align-items-center justify-content-center text-warning border border-warning border-opacity-30" style={{ width: '32px', height: '32px' }}>
                <i className="bi bi-grid-3x3-gap-fill fs-6"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="modal-title fw-bold text-white fs-6 m-0">Select Slot</h5>
                  <span className="badge bg-warning text-dark fw-bold font-monospace" style={{ fontSize: '0.68rem', letterSpacing: '0.03em' }}>
                    {tournament.mode || 'Solo'}
                  </span>
                </div>
                <div className="text-secondary extra-small m-0">
                  {tournament.name}
                </div>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* Clean Colorful Toolbar & Quick Legend */}
          <div className="px-3 py-2 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-20" style={{ background: 'rgba(0, 0, 0, 0.25)' }}>
            <div className="d-flex align-items-center gap-2">
              <div 
                className="d-inline-flex align-items-center gap-1.5 py-1 px-2.5 rounded-2"
                style={{ 
                  backgroundColor: 'rgba(34, 197, 94, 0.18)', 
                  border: '1px solid rgba(34, 197, 94, 0.45)',
                  color: '#4ADE80',
                  fontWeight: '700',
                  fontSize: '0.75rem',
                  letterSpacing: '0.02em'
                }}
              >
                <span className="legend-dot open"></span>
                <span>{availableCount} OPEN</span>
              </div>
              <div 
                className="d-inline-flex align-items-center gap-1.5 py-1 px-2.5 rounded-2"
                style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.18)', 
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#F87171',
                  fontWeight: '700',
                  fontSize: '0.75rem',
                  letterSpacing: '0.02em'
                }}
              >
                <span className="legend-dot taken"></span>
                <span>{occupiedCount} TAKEN</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-warning text-dark fw-bold py-1 px-2.5 d-inline-flex align-items-center gap-1 shadow-sm transition-all"
              style={{ fontSize: '0.74rem', borderRadius: '7px' }}
              onClick={handleQuickAutoPick}
              disabled={availableCount < slotsToSelect}
            >
              <i className="bi bi-lightning-charge-fill text-dark"></i>
              <span>Auto Pick</span>
            </button>
          </div>

          {/* Search bar if slots > 12 */}
          {maxPlayers > 12 && (
            <div className="native-slot-search-wrap">
              <div className="input-group input-group-sm">
                <span className="input-group-text native-search-icon">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control native-search-input"
                  placeholder="Search slot # or IGN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="btn native-search-clear"
                    onClick={() => setSearchQuery('')}
                  >
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Clean Slot Grid */}
          <div className="native-slot-body">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-warning" role="status"></div>
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="text-center py-4 text-secondary small">
                No slots found.
              </div>
            ) : (
              <div className="native-slot-grid">
                {filteredSlots.map((slotNum) => {
                  const isTaken = isSlotTaken(slotNum);
                  const isSelected = selectedSlots.some(s => s.toString() === slotNum.toString());
                  const details = isTaken ? getSlotDetails(slotNum) : null;
                  const isMine = details?.userId === currentUser?.uid;

                  return (
                    <button
                      key={slotNum}
                      type="button"
                      className={`native-slot-chip ${
                        isSelected
                          ? 'chip-selected'
                          : isMine
                          ? 'chip-mine'
                          : isTaken
                          ? 'chip-taken'
                          : 'chip-available'
                      }`}
                      onClick={() => handleSlotClick(slotNum, isTaken)}
                      title={isTaken ? `Booked by: ${details?.username || 'Player'} (Tap to inspect)` : `Slot #${slotNum} - Available`}
                    >
                      <div className="chip-top-bar">
                        <span className="chip-slot-num">#{slotNum < 10 ? `0${slotNum}` : slotNum}</span>
                        {isSelected ? (
                          <span className="chip-tag-selected">
                            <i className="bi bi-check2"></i>
                          </span>
                        ) : isMine ? (
                          <span className="chip-tag-mine">YOU</span>
                        ) : isTaken ? (
                          <span className="chip-tag-booked">BOOKED</span>
                        ) : (
                          <span className="chip-tag-open">OPEN</span>
                        )}
                      </div>

                      <div className="chip-content-wrap">
                        {isSelected ? (
                          <div className="chip-selected-badge">
                            <i className="bi bi-check-circle-fill me-1"></i> Picked
                          </div>
                        ) : isTaken ? (
                          <div className="chip-booked-player">
                            <div className="player-avatar-mini">
                              <i className="bi bi-person-fill"></i>
                            </div>
                            <span className="player-name-text" title={details?.username}>
                              {details?.username || 'Player'}
                            </span>
                          </div>
                        ) : (
                          <div className="chip-open-label">
                            <i className="bi bi-plus-circle text-success me-1"></i> Tap to Book
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {errorMessage && (
              <div className="native-slot-error mt-2">
                <i className="bi bi-exclamation-circle me-1"></i> {errorMessage}
              </div>
            )}
          </div>

          {/* Native Bottom Action Bar */}
          <div className="native-slot-footer">
            <div className="native-footer-info">
              <span className="footer-label">Selected</span>
              <span className="footer-value">
                {selectedSlots.length > 0
                  ? selectedSlots.map(s => `#${s < 10 ? `0${s}` : s}`).join(', ')
                  : 'None'}
              </span>
            </div>

            <button
              type="button"
              className="native-slot-confirm-btn"
              onClick={handleConfirm}
              disabled={loading || selectedSlots.length !== slotsToSelect}
            >
              Confirm Slot <i className="bi bi-arrow-right-short fs-5 align-middle"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Inspected Player Slot Detail Modal / Popover */}
      {inspectedSlot && (
        <div
          className="modal fade show d-block native-submodal-backdrop"
          onClick={() => setInspectedSlot(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content native-player-popover">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold text-warning small">Slot #{inspectedSlot.slotNum}</span>
                <button type="button" className="btn-close btn-close-white small" onClick={() => setInspectedSlot(null)}></button>
              </div>

              <div className="text-center mb-3">
                <div className="native-avatar-circle mb-2">
                  <i className="bi bi-person-fill fs-3 text-secondary"></i>
                </div>
                <div className="fw-bold text-white fs-6">{inspectedSlot.username}</div>
              </div>

              <div className="native-uid-box mb-3">
                <span className="text-secondary extra-small d-block mb-1">UID</span>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="font-monospace text-light fw-bold">{inspectedSlot.gameUid}</span>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-warning py-0 px-2"
                    onClick={() => handleCopyUid(inspectedSlot.gameUid)}
                  >
                    <i className={`bi ${copiedUid ? 'bi-check2' : 'bi-copy'} me-1`}></i>
                    {copiedUid ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-dark w-100 border border-secondary"
                onClick={() => setInspectedSlot(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
