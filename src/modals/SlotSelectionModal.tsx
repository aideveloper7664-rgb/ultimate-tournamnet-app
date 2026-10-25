import React, { useState, useEffect, useRef } from 'react';
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
  
  // Roulette Auto Pick States
  const [spinning, setSpinning] = useState<boolean>(false);
  const [scannedSlot, setScannedSlot] = useState<number | null>(null);
  const [poppingSlot, setPoppingSlot] = useState<number | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const handleCloseModal = () => {
    clearAllTimeouts();
    setSpinning(false);
    setScannedSlot(null);
    setPoppingSlot(null);
    onClose();
  };

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
    if (!isOpen || !tournament) {
      clearAllTimeouts();
      setSpinning(false);
      setScannedSlot(null);
      setPoppingSlot(null);
      return;
    }
    
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
      clearAllTimeouts();
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
    if (spinning) return;
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

  // Roulette Auto Pick Effect (5 seconds duration, cubic ease-out slowdown, backwards sequence)
  const handleAutoPick = () => {
    if (spinning) return;
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

    const targetIndex = Math.floor(Math.random() * availableSlots.length);
    const targetSlot = availableSlots[targetIndex];

    let finalPicked: number[] = [targetSlot];
    if (slotsToSelect > 1) {
      const remaining = availableSlots.filter(s => s !== targetSlot);
      finalPicked = [targetSlot, ...remaining.slice(0, slotsToSelect - 1)].sort((a, b) => a - b);
    }

    // Accessibility check: prefers-reduced-motion
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setSelectedSlots(finalPicked);
      return;
    }

    clearAllTimeouts();
    setSpinning(true);
    setSelectedSlots([]);

    const AUTO_MS = 5000;
    const N = 36;

    // Timing calculation: delay[i] = 50 + (i / (N-1))^3 * 450
    const rawDelays: number[] = [];
    for (let i = 0; i < N; i++) {
      rawDelays.push(50 + Math.pow(i / (N - 1), 3) * 450);
    }
    const sumDelays = rawDelays.reduce((a, b) => a + b, 0);
    const scale = AUTO_MS / sumDelays;
    const delays = rawDelays.map(d => d * scale);

    // Backward sequence generation: seq[i] = openSlots[(targetIndex - (N - 1 - i)) mod openSlots.length]
    const sequence: number[] = [];
    for (let i = 0; i < N; i++) {
      const offset = N - 1 - i;
      const idx = ((targetIndex - offset) % availableSlots.length + availableSlots.length) % availableSlots.length;
      sequence.push(availableSlots[idx]);
    }

    let accumulatedDelay = 0;
    for (let i = 0; i < N; i++) {
      const slotNum = sequence[i];
      const isLast = i === N - 1;

      const t = setTimeout(() => {
        setScannedSlot(slotNum);

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
          try {
            if (isLast) {
              navigator.vibrate([20, 40, 20]);
            } else {
              navigator.vibrate(8);
            }
          } catch (e) {
            // Browser vibrate permission fallback
          }
        }

        if (isLast) {
          const tFinal = setTimeout(() => {
            setScannedSlot(null);
            setSelectedSlots(finalPicked);
            setPoppingSlot(targetSlot);

            const tPop = setTimeout(() => {
              setPoppingSlot(null);
              setSpinning(false);
            }, 400);
            timeoutsRef.current.push(tPop);
          }, 450);
          timeoutsRef.current.push(tFinal);
        }
      }, accumulatedDelay);

      timeoutsRef.current.push(t);
      accumulatedDelay += delays[i];
    }
  };

  const handleConfirm = () => {
    if (spinning) return;
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

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="backdrop">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="slot-title">
        <div className="grabber"></div>

        {/* Header matching slot-modal.html */}
        <header className="head">
          <div className="mode-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#17130A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4.5 20c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5"/>
            </svg>
          </div>
          <div className="titles">
            <h1 id="slot-title">Select Slot</h1>
            <p>{tournament.mode || 'Solo'} · {tournament.name}</p>
          </div>
          <button className="icon-btn" id="closeBtn" type="button" aria-label="Close" onClick={handleCloseModal} disabled={spinning}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9CDDB" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </header>

        {/* Status row matching slot-modal.html */}
        <div className="status">
          <div className="counts">
            <span className="open">
              <span className="dot"></span>
              <span id="openCount">{availableCount} open</span>
            </span>
            <span className="taken">
              <span id="takenCount">{occupiedCount} taken</span>
            </span>
          </div>
          <button 
            className="auto" 
            id="autoBtn" 
            type="button" 
            onClick={handleAutoPick} 
            disabled={spinning || availableCount < slotsToSelect}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13.5 2L5 13.5h6L10 22l9-12h-6.5z"/>
            </svg>
            <span id="autoLabel">{spinning ? "Picking…" : "Auto pick"}</span>
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
                disabled={spinning}
              />
              {searchQuery && (
                <button
                  className="btn native-search-clear"
                  onClick={() => setSearchQuery('')}
                  disabled={spinning}
                >
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Slots List matching slot-modal.html */}
        <div className="slots" id="slots" role="radiogroup" aria-label="Available slots">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm text-warning" role="status"></div>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="text-center py-4 text-secondary small">
              No slots found.
            </div>
          ) : (
            filteredSlots.map((slotNum) => {
              const isTaken = isSlotTaken(slotNum);
              const isSelected = selectedSlots.some(s => s.toString() === slotNum.toString());
              const details = isTaken ? getSlotDetails(slotNum) : null;
              const isScanned = scannedSlot === slotNum;
              const isPopping = poppingSlot === slotNum;

              const label = isTaken
                ? (details?.username ? details.username : "Taken")
                : isSelected
                ? "Selected"
                : isScanned
                ? "Picking…"
                : "Open";

              return (
                <button
                  key={slotNum}
                  type="button"
                  className={"slot" + (isScanned ? " scan" : "") + (isPopping ? " pop" : "")}
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={isTaken}
                  disabled={spinning}
                  onClick={() => handleSlotClick(slotNum, isTaken)}
                >
                  <div className="num">{pad(slotNum)}</div>
                  <div className="info">
                    <span className="name">Slot #{pad(slotNum)}</span>
                    <span className="state">{label}</span>
                  </div>
                  <div className="radio">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#17130A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5"/>
                    </svg>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {errorMessage && (
          <div className="native-slot-error text-danger small text-center fw-bold mt-1">
            {errorMessage}
          </div>
        )}

        {/* Footer CTA matching slot-modal.html */}
        <div>
          <button 
            className="cta" 
            id="confirmBtn" 
            type="button" 
            disabled={loading || spinning || selectedSlots.length !== slotsToSelect}
            onClick={handleConfirm}
          >
            {spinning ? (
              "Picking your slot…"
            ) : selectedSlots.length === 0 ? (
              "Choose a slot to continue"
            ) : (
              <>
                Confirm Slot #{selectedSlots.map(s => pad(Number(s))).join(', ')}{' '}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#17130A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6"/>
                </svg>
              </>
            )}
          </button>
          <div className="home-bar"></div>
        </div>
      </section>

      {/* Inspected Player Slot Detail Modal / Popover */}
      {inspectedSlot && (
        <div
          className="modal fade show d-block native-submodal-backdrop"
          onClick={() => setInspectedSlot(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content native-player-popover">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold text-warning small">Slot #{pad(inspectedSlot.slotNum)}</span>
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

