import React, { useState, useEffect, useRef } from 'react';
import { Tournament, Teammate } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ref,
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
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ msg: string; type: 'success' | 'danger' | 'warning' } | null>(null);
  const [loading, setLoading] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);

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

    if (username.trim().length < 2 || gameUid.trim().length < 8) {
      setStatusMessage({ msg: "Please fill in a valid Username (min 2 chars) and Game UID (min 8 digits).", type: 'warning' });
      return;
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
      transactionResult = await runTransaction(uRef, (profileData) => {
        if (!profileData) throw new Error("User profile missing.");
        if ((profileData.balance || 0) < totalFee) throw new Error("Insufficient wallet balance.");
        if (profileData.joinedTournaments?.[tId]) {
          return;
        }
        profileData.balance = (profileData.balance || 0) - totalFee;
        if (!profileData.joinedTournaments) profileData.joinedTournaments = {};
        profileData.joinedTournaments[tId] = true;
        profileData.username = username.trim();
        profileData.gameUid = gameUid.trim();
        return profileData;
      });

      if (!transactionResult.committed) {
        throw new Error("Join failed. You may have already joined or have insufficient balance.");
      }

      const tRef = ref(db, `tournaments/${tId}`);
      const snapshot = await get(tRef);
      if (!snapshot.exists()) throw new Error("Tournament not found after transaction.");
      const tData = snapshot.val();

      if (tData.status !== 'upcoming') throw new Error("Tournament is no longer upcoming.");
      const regC = tData.registeredPlayers ? Object.keys(tData.registeredPlayers).length : 0;
      if (tData.maxPlayers > 0 && regC >= tData.maxPlayers) throw new Error("Tournament is full.");

      const updates: Record<string, any> = {};
      const registrationData: any = {
        joinedAt: serverTimestamp(),
        username: username.trim(),
        gameUid: gameUid.trim(),
        teammates: teammates.map(t => ({ username: t.username.trim(), gameUid: t.gameUid.trim() }))
      };

      if (selectedSlots && selectedSlots.length > 0) {
        registrationData.slots = selectedSlots;
        selectedSlots.forEach(slot => {
          updates[`tournaments/${tId}/slots/${slot}`] = currentUser.uid;
        });
      }

      updates[`tournaments/${tId}/registeredPlayers/${currentUser.uid}`] = registrationData;

      await update(ref(db), updates);
      await recordTransaction(
        currentUser.uid,
        'tournament_join',
        -totalFee,
        `Joined: ${tData.name || 'Tournament'}`,
        { tournamentId: tId }
      );

      await reloadUserProfile();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Join failed:", err);
      setStatusMessage({ msg: err.message || "Failed to join match.", type: 'danger' });

      if (transactionResult?.committed) {
        console.error("CRITICAL: Balance deducted but failed to update tournament! Attempting refund.");
        try {
          await runTransaction(uRef, (profileData) => {
            if (profileData) {
              profileData.balance = (profileData.balance || 0) + totalFee;
              if (profileData.joinedTournaments) delete profileData.joinedTournaments[tId];
            }
            return profileData;
          });
          await recordTransaction(
            currentUser.uid,
            'join_failed_refund',
            totalFee,
            `Refund Failed Join: ${tournament.name || 'Tournament'}`
          );
          setStatusMessage({ msg: "Join failed, but your wallet balance was refunded.", type: 'warning' });
          await reloadUserProfile();
        } catch (refundError) {
          console.error("CRITICAL: FAILED TO REFUND BALANCE!", refundError);
          setStatusMessage({ msg: `Join failed. Failed to refund balance (₹ ${totalFee.toFixed(2)})! Contact support.`, type: 'danger' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const isTeammatesValid = teammates.every(tm => tm.username.trim().length >= 2 && tm.gameUid.trim().length >= 8);
  const isValid = username.trim().length >= 2 && gameUid.trim().length >= 8 && isTeammatesValid;

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
            <span className="fee">₹{totalFee.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleConfirmAndJoin}>
          {/* Fields */}
          <div className="fields">
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
            ₹{totalFee.toFixed(2)} will be deducted from your wallet.
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
