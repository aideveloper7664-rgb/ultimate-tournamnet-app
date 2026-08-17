import React, { useState, useEffect } from 'react';
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
import { StatusMessage } from '../components/StatusMessage';

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

    if (!username.trim() || !gameUid.trim()) {
      setStatusMessage({ msg: "Your Player Username and Game UID are required.", type: 'warning' });
      return;
    }

    for (let i = 0; i < teammates.length; i++) {
      if (!teammates[i].username.trim() || !teammates[i].gameUid.trim()) {
        setStatusMessage({ msg: `All details for Teammate ${i + 2} are required.`, type: 'warning' });
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
        if ((profileData.balance || 0) < totalFee) throw new Error("Insufficient balance.");
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
      alert(`Joined successfully! ₹ ${totalFee.toFixed(2)} deducted.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Join failed:", err);
      setStatusMessage({ msg: `Failed: ${err.message}`, type: 'danger' });

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
          alert("Join failed, but your balance was refunded.");
          await reloadUserProfile();
        } catch (refundError) {
          console.error("CRITICAL: FAILED TO REFUND BALANCE!", refundError);
          alert(`Join failed. CRITICAL: Failed to refund balance (₹ ${totalFee.toFixed(2)})! Contact support immediately.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal fade show d-block native-slot-modal-backdrop" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered native-slot-dialog">
        <div className="modal-content native-slot-container">
          
          {/* App Header */}
          <div className="modal-header border-bottom border-secondary border-opacity-30 px-3 py-2.5 d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(180deg, #181B34 0%, #101328 100%)' }}>
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-2 bg-warning bg-opacity-15 p-1.5 d-flex align-items-center justify-content-center text-warning border border-warning border-opacity-30" style={{ width: '32px', height: '32px' }}>
                <i className="bi bi-controller fs-6"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold text-white fs-6 m-0">Player Registration</h5>
                <div className="text-secondary extra-small m-0 text-truncate" style={{ maxWidth: '220px' }}>
                  {tournament.name}
                </div>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-3">
            {/* Slot & Fee Highlight Strip */}
            <div className="d-flex align-items-center justify-content-between p-2.5 mb-3 rounded-3" style={{ background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(250, 204, 21, 0.25)' }}>
              {selectedSlots && selectedSlots.length > 0 ? (
                <div className="d-flex align-items-center gap-1.5">
                  <span className="text-secondary extra-small text-uppercase fw-bold">Slot:</span>
                  <span className="badge bg-warning text-dark fw-bold font-monospace px-2 py-1" style={{ fontSize: '0.75rem' }}>
                    #{selectedSlots.map(s => s < 10 ? `0${s}` : s).join(', #')}
                  </span>
                </div>
              ) : (
                <div className="text-secondary extra-small fw-bold">Auto Slot</div>
              )}

              <div className="d-flex align-items-center gap-1.5">
                <span className="text-secondary extra-small text-uppercase fw-bold">Entry:</span>
                <span className="text-warning fw-bold font-monospace" style={{ fontSize: '0.95rem' }}>
                  ₹{totalFee.toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmAndJoin}>
              {/* Leader / Player 1 Details */}
              <div className="mb-2.5">
                <label className="form-label extra-small text-secondary fw-bold text-uppercase mb-1 d-flex align-items-center gap-1">
                  <i className="bi bi-person-fill text-danger"></i>
                  <span>Game Username</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-black bg-opacity-40 border-secondary border-opacity-40 text-secondary">
                    <i className="bi bi-person-badge text-warning"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control bg-dark border-secondary border-opacity-40 text-white shadow-none"
                    placeholder="e.g. OP_GAMER_99"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label extra-small text-secondary fw-bold text-uppercase mb-1 d-flex align-items-center gap-1">
                  <i className="bi bi-hash text-warning"></i>
                  <span>Game UID (Free Fire)</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-black bg-opacity-40 border-secondary border-opacity-40 text-secondary">
                    <i className="bi bi-fingerprint text-warning"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control bg-dark border-secondary border-opacity-40 text-white font-monospace shadow-none"
                    placeholder="e.g. 1029384756"
                    value={gameUid}
                    onChange={(e) => setGameUid(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Teammates Section if Duo / Squad */}
              {teammates.length > 0 && (
                <div className="mt-3 pt-2 border-top border-secondary border-opacity-25">
                  <div className="d-flex align-items-center gap-1.5 mb-2.5 text-warning extra-small fw-bold text-uppercase">
                    <i className="bi bi-people-fill"></i>
                    <span>Teammates Details</span>
                  </div>
                  {teammates.map((tm, idx) => (
                    <div key={idx} className="mb-2.5 p-2.5 rounded-3 bg-black bg-opacity-40 border border-secondary border-opacity-30">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="extra-small fw-bold text-light">Player {idx + 2}</span>
                        <span className="badge bg-secondary bg-opacity-25 text-warning extra-small">Teammate</span>
                      </div>
                      <div className="row g-2">
                        <div className="col-6">
                          <input
                            type="text"
                            className="form-control form-control-sm bg-dark border-secondary border-opacity-40 text-white shadow-none"
                            placeholder="IGN Username"
                            value={tm.username}
                            onChange={(e) => handleTeammateChange(idx, 'username', e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-6">
                          <input
                            type="text"
                            className="form-control form-control-sm bg-dark border-secondary border-opacity-40 text-white font-monospace shadow-none"
                            placeholder="Game UID"
                            value={tm.gameUid}
                            onChange={(e) => handleTeammateChange(idx, 'gameUid', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <StatusMessage
                message={statusMessage?.msg}
                type={statusMessage?.type}
                onDismiss={() => setStatusMessage(null)}
              />

              <div className="d-flex gap-2 mt-3 pt-2 border-top border-secondary border-opacity-25">
                <button
                  type="button"
                  className="btn btn-outline-secondary text-light btn-sm px-3 flex-grow-1"
                  style={{ borderRadius: '9px' }}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-warning text-dark fw-bold btn-sm px-4 flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1.5 shadow-sm"
                  style={{ borderRadius: '9px' }}
                  disabled={loading}
                >
                  {loading ? <span className="spinner-border spinner-border-sm"></span> : (
                    <>
                      <span>Join Match</span>
                      <i className="bi bi-arrow-right-short fs-5"></i>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
