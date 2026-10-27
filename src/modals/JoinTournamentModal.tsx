import React, { useState, useEffect, useRef } from 'react';
import { Tournament, Teammate } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ref,
  set,
  runTransaction,
  get,
  update,
  db,
  serverTimestamp,
  recordTransaction
} from '../firebase';

interface JoinTournamentModalProps {
  tournament: Tournament | null;
  selectedSlots: (string | number)[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const JoinTournamentModal: React.FC<JoinTournamentModalProps> = ({
  tournament,
  selectedSlots,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { currentUser, userProfile, reloadUserProfile } = useAuth();

  const [username, setUsername] = useState('');
  const [gameUid, setGameUid] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ msg: string; type: 'success' | 'danger' | 'warning' } | null>(null);
  const [loading, setLoading] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAccessCode('');
      setShowAccessCode(false);
      setStatusMessage(null);
    }
  }, [isOpen, tournament]);

  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username || userProfile.displayName || '');
      setGameUid(userProfile.gameUid || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (tournament && tournament.slotConfig?.type === 'team' && (tournament.slotConfig.slotsPerEntry || 1) > 1) {
      const count = tournament.slotConfig.slotsPerEntry! - 1;
      const initial: Teammate[] = Array.from({ length: count }, () => ({ username: '', gameUid: '' }));
      setTeammates(initial);
    } else {
      setTeammates([]);
    }
  }, [tournament]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !tournament) return null;

  const tId = tournament.id;
  const fee = tournament.entryFee || 0;
  let teamSize = 1;
  if (tournament.slotConfig && tournament.slotConfig.type === 'team' && (tournament.slotConfig.slotsPerEntry || 1) > 1) {
    teamSize = tournament.slotConfig.slotsPerEntry!;
  }

  const totalFee = fee * teamSize;

  const handleTeammateChange = (index: number, field: 'username' | 'gameUid', value: string) => {
    setTeammates(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleConfirmAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const isFree = fee === 0;

    if (username.trim().length < 2 || gameUid.trim().length < 8) {
      setStatusMessage({ msg: "Please fill in a valid Username (min 2 chars) and Game UID (min 8 digits).", type: 'warning' });
      return;
    }

    if (isFree) {
      const trimmedCode = accessCode.trim();
      if (!trimmedCode) {
        setStatusMessage({
          msg: "Access Code is required to join this free match. Enter the code set by admin.",
          type: 'warning'
        });
        return;
      }

      const expectedCode = String(
        tournament.accessCode ||
        (tournament as any).joinCode ||
        (tournament as any).passcode ||
        (tournament as any).code ||
        ''
      ).trim();

      if (expectedCode && trimmedCode.toLowerCase() !== expectedCode.toLowerCase()) {
        setStatusMessage({
          msg: "Invalid Access Code! Only players with the correct code from admin can join.",
          type: 'danger'
        });
        return;
      }
    }

    for (let i = 0; i < teammates.length; i++) {
      if (teammates[i].username.trim().length < 2 || teammates[i].gameUid.trim().length < 8) {
        setStatusMessage({ msg: `Valid details for Teammate ${i + 2} are required (Username min 2 chars, UID min 8 digits).`, type: 'warning' });
        return;
      }
    }

    setLoading(true);
    setStatusMessage(null);

    const uRef = ref(db, `users/${currentUser.uid}`);
    let transactionResult: any = null;

    try {
      const tRef = ref(db, `tournaments/${tId}`);
      const snapshot = await get(tRef);
      if (!snapshot.exists()) throw new Error("Tournament not found.");
      const tData = snapshot.val();

      if (tData.status !== 'upcoming') throw new Error("Tournament is no longer upcoming.");
      const regC = tData.registeredPlayers ? Object.keys(tData.registeredPlayers).length : 0;
      if (tData.maxPlayers > 0 && regC >= tData.maxPlayers) throw new Error("Tournament is full.");

      // Strict verification of Access Code for free tournaments
      if ((tData.entryFee || 0) === 0) {
        const expectedDbCode = String(
          tData.accessCode ||
          tData.joinCode ||
          tData.passcode ||
          tData.code ||
          ''
        ).trim();

        if (expectedDbCode && accessCode.trim().toLowerCase() !== expectedDbCode.toLowerCase()) {
          throw new Error("Invalid Access Code. Access denied.");
        }
      }

      const registrationData: any = {
        joinedAt: Date.now(),
        username: username.trim(),
        gameUid: gameUid.trim(),
        slots: selectedSlots || [],
        teammates: teammates.map(t => ({ username: t.username.trim(), gameUid: t.gameUid.trim() }))
      };

      if (isFree) {
        registrationData.accessCode = accessCode.trim();
      }

      // 1. Safely deduct balance and record joined status & slots inside user profile
      // Note: users/${uid} is owned by the current authenticated user and guaranteed writable
      transactionResult = await runTransaction(uRef, (profileData) => {
        if (!profileData) throw new Error("User profile missing.");
        if ((profileData.balance || 0) < totalFee) throw new Error("Insufficient wallet balance.");
        if (profileData.joinedTournaments?.[tId]) {
          return;
        }
        profileData.balance = (profileData.balance || 0) - totalFee;
        if (!profileData.joinedTournaments) profileData.joinedTournaments = {};
        profileData.joinedTournaments[tId] = true;

        if (!profileData.joinedMatchSlots) profileData.joinedMatchSlots = {};
        profileData.joinedMatchSlots[tId] = selectedSlots || [];

        if (!profileData.registrations) profileData.registrations = {};
        profileData.registrations[tId] = registrationData;

        profileData.username = username.trim();
        profileData.gameUid = gameUid.trim();
        return profileData;
      });

      if (!transactionResult.committed) {
        throw new Error("Join failed. You may have already joined or have insufficient balance.");
      }

      // 2. Next: Attempt to record registration directly in the tournament node
      // Note: Direct path tournaments/${tId} is used (never root ref(db))
      try {
        const tournamentUpdates: Record<string, any> = {
          [`registeredPlayers/${currentUser.uid}`]: registrationData
        };
        if (selectedSlots && selectedSlots.length > 0) {
          selectedSlots.forEach(slot => {
            tournamentUpdates[`slots/${slot}`] = currentUser.uid;
          });
        }
        await update(ref(db, `tournaments/${tId}`), tournamentUpdates);
      } catch (tErr: any) {
        console.warn("Tournament full update restricted by RTDB rules, attempting registeredPlayers node:", tErr);
        try {
          await set(ref(db, `tournaments/${tId}/registeredPlayers/${currentUser.uid}`), registrationData);
        } catch (rpErr: any) {
          console.warn("Tournament registeredPlayers write restricted by RTDB rules. Join is persisted in user profile:", rpErr);
        }
      }

      // 3. Record transaction in user transactions ledger
      if (totalFee > 0) {
        try {
          await recordTransaction(
            currentUser.uid,
            'tournament_join',
            -totalFee,
            `Joined: ${tData.name || 'Tournament'}`,
            { tournamentId: tId, slots: selectedSlots }
          );
        } catch (recErr) {
          console.warn("Transaction record log notice:", recErr);
        }
      }

      await reloadUserProfile();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Join failed:", err);
      setStatusMessage({ msg: err.message || "Failed to join match.", type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const isFree = fee === 0;
  const isTeammatesValid = teammates.every(tm => tm.username.trim().length >= 2 && tm.gameUid.trim().length >= 8);
  const isAccessCodeValid = !isFree || accessCode.trim().length > 0;
  const isValid = username.trim().length >= 2 && gameUid.trim().length >= 8 && isTeammatesValid && isAccessCodeValid;

  const modeName = tournament.mode || (tournament.slotConfig?.type ? tournament.slotConfig.type.toUpperCase() : "LONE WOLF");

  const formattedSlots = selectedSlots && selectedSlots.length > 0
    ? selectedSlots.map(s => typeof s === 'number' ? `#${s < 10 ? '0' + s : s}` : `#${s}`).join(', ')
    : '#01';

  return (
    <div
      className="player-reg-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reg-title"
    >
      <div className="player-reg-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Grabber handle */}
        <div className="grabber"></div>

        {/* Header */}
        <div className="head">
          <div className="mode-icon">
            <i className="bi bi-controller"></i>
          </div>
          <div className="titles">
            <h2 id="reg-title">Player Registration</h2>
            <p>{modeName}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Summary strip */}
        <div className="summary">
          <div className="cell">
            <span className="lbl">SLOT</span>
            <span className="chip">{formattedSlots}</span>
          </div>
          <div className="divider"></div>
          <div className="cell right">
            <span className="lbl">ENTRY FEE</span>
            <span className="fee">
              {isFree ? (
                <span className="text-success d-inline-flex align-items-center gap-1">
                  FREE <span className="badge bg-warning text-dark px-1.5 py-0.5 rounded-pill" style={{ fontSize: '0.62rem' }}>🔒 Code Required</span>
                </span>
              ) : (
                `₹${totalFee.toFixed(2)}`
              )}
            </span>
          </div>
        </div>

        <form onSubmit={handleConfirmAndJoin}>
          {/* Fields */}
          <div className="fields">
            {/* Access Code for Free Tournaments */}
            {isFree && (
              <div className="group">
                <label htmlFor="reg-access-code" className="d-flex align-items-center justify-content-between">
                  <span>
                    Tournament Access Code <span className="text-danger">*</span>
                  </span>
                  <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30 font-monospace" style={{ fontSize: '0.65rem' }}>
                    <i className="bi bi-key-fill me-1"></i>Set by Host
                  </span>
                </label>
                <div className="field position-relative">
                  <div className="ico text-warning">
                    <i className="bi bi-shield-lock-fill"></i>
                  </div>
                  <input
                    id="reg-access-code"
                    type={showAccessCode ? "text" : "password"}
                    placeholder="Enter admin access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required
                    autoComplete="off"
                    style={{ letterSpacing: accessCode ? '1px' : 'normal' }}
                  />
                  <button
                    type="button"
                    className="btn btn-link text-secondary p-0 position-absolute end-0 top-50 translate-middle-y me-3 shadow-none text-decoration-none"
                    onClick={() => setShowAccessCode(!showAccessCode)}
                    style={{ zIndex: 3 }}
                    title={showAccessCode ? "Hide code" : "Show code"}
                  >
                    <i className={`bi ${showAccessCode ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
                <div className="extra-small text-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                  <i className="bi bi-info-circle text-warning me-1"></i>
                  Entry is free. Joining requires the secret access code added by the admin.
                </div>
              </div>
            )}

            {/* Game username */}
            <div className="group">
              <label htmlFor="reg-username">Game username</label>
              <div className="field">
                <div className="ico">
                  <i className="bi bi-person-fill"></i>
                </div>
                <input
                  id="reg-username"
                  ref={usernameInputRef}
                  type="text"
                  placeholder="e.g. OP_GAMER_99"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Game UID */}
            <div className="group">
              <label htmlFor="reg-game-uid">
                Game UID <span className="sub">(Free Fire)</span>
              </label>
              <div className="field">
                <div className="ico">
                  <i className="bi bi-hash"></i>
                </div>
                <input
                  id="reg-game-uid"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1029384756"
                  value={gameUid}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                    setGameUid(val);
                  }}
                  required
                />
              </div>
              {gameUid.length > 0 && gameUid.length < 8 && (
                <div className="error-text">UID should be at least 8 digits.</div>
              )}
            </div>

            {/* Teammates section if any */}
            {teammates.length > 0 && (
              <div className="mt-2 pt-3 border-top border-secondary border-opacity-25">
                <label className="text-warning extra-small fw-bold text-uppercase mb-2 d-block">
                  Teammates Details
                </label>
                {teammates.map((tm, idx) => (
                  <div key={idx} className="p-3 mb-2 rounded-3" style={{ background: '#1A1D26', border: '1px solid #272B38' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small fw-bold text-light">Player {idx + 2}</span>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <input
                        type="text"
                        className="form-control bg-dark border-secondary border-opacity-40 text-white form-control-sm"
                        placeholder="IGN Username"
                        value={tm.username}
                        onChange={(e) => handleTeammateChange(idx, 'username', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        className="form-control bg-dark border-secondary border-opacity-40 text-white form-control-sm font-monospace"
                        placeholder="Game UID"
                        value={tm.gameUid}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                          handleTeammateChange(idx, 'gameUid', val);
                        }}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info line */}
          <div className="info">
            {isFree ? (
              <span>Free tournament entry with admin access code verification.</span>
            ) : (
              <span>₹{totalFee.toFixed(2)} will be deducted from your wallet.</span>
            )}
          </div>

          {/* Status / Error message */}
          {statusMessage && (
            <div className="submit-error">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{statusMessage.msg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !isValid}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  <span>Joining…</span>
                </>
              ) : (
                <>
                  <span>Join Match</span>
                  <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
