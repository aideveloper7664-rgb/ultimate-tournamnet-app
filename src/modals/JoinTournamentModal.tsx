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
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(5, 6, 18, 0.85)', backdropFilter: 'blur(8px)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bg-dark text-white border border-secondary shadow-lg rounded-3">
          
          <div className="modal-header border-bottom border-secondary pb-2">
            <div>
              <h5 className="modal-title fw-bold text-white m-0 d-flex align-items-center gap-2">
                <i className="bi bi-controller text-warning fs-5"></i>
                Enter In-Game Details
              </h5>
              <div className="small text-secondary mt-1">
                Match: <strong className="text-light">{tournament.name}</strong>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-3">
            {/* Selected Slots Badge Summary */}
            {selectedSlots && selectedSlots.length > 0 && (
              <div className="p-2 mb-3 bg-black bg-opacity-40 border border-warning border-opacity-50 rounded d-flex align-items-center justify-content-between">
                <span className="small text-warning fw-semibold">
                  <i className="bi bi-grid-3x3-gap-fill me-2"></i>
                  Allocated Slot(s):
                </span>
                <span className="badge bg-warning text-dark font-monospace fw-bold fs-6">
                  #{selectedSlots.map(s => s < 10 ? `0${s}` : s).join(', #')}
                </span>
              </div>
            )}

            <div className="d-flex align-items-center justify-content-between p-2 mb-3 bg-black bg-opacity-30 rounded border border-secondary border-opacity-50 small">
              <span className="text-secondary">Entry Fee:</span>
              <strong className="text-warning fs-6">
                ₹ {totalFee.toFixed(2)} {teamSize > 1 ? `(₹ ${fee} / slot)` : ''}
              </strong>
            </div>

            <form onSubmit={handleConfirmAndJoin}>
              <div className="mb-3">
                <label className="form-label small text-secondary fw-semibold mb-1">
                  <i className="bi bi-person-fill text-danger me-1"></i>
                  In-Game Username (Free Fire)
                </label>
                <input
                  type="text"
                  className="form-control bg-dark border-secondary text-white shadow-none"
                  placeholder="e.g. OP_GAMER_99"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small text-secondary fw-semibold mb-1">
                  <i className="bi bi-hash text-warning me-1"></i>
                  Free Fire Game UID
                </label>
                <input
                  type="text"
                  className="form-control bg-dark border-secondary text-white font-monospace shadow-none"
                  placeholder="e.g. 1234567890"
                  value={gameUid}
                  onChange={(e) => setGameUid(e.target.value)}
                  required
                />
              </div>

              {teammates.length > 0 && (
                <div className="mt-3">
                  <hr className="border-secondary opacity-25" />
                  <h6 className="text-warning fw-bold mb-3 small text-uppercase">
                    <i className="bi bi-people-fill me-2"></i>
                    Teammates Free Fire Details
                  </h6>
                  {teammates.map((tm, idx) => (
                    <div key={idx} className="mb-3 p-3 bg-black bg-opacity-30 border border-secondary border-opacity-50 rounded">
                      <h6 className="text-warning small fw-bold mb-2">Teammate {idx + 2}</h6>
                      <div className="mb-2">
                        <label className="extra-small text-secondary d-block mb-1">Username</label>
                        <input
                          type="text"
                          className="form-control form-control-sm bg-dark border-secondary text-white"
                          placeholder={`Teammate ${idx + 2} Username`}
                          value={tm.username}
                          onChange={(e) => handleTeammateChange(idx, 'username', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="extra-small text-secondary d-block mb-1">Free Fire UID</label>
                        <input
                          type="text"
                          className="form-control form-control-sm bg-dark border-secondary text-white font-monospace"
                          placeholder={`Teammate ${idx + 2} Game UID`}
                          value={tm.gameUid}
                          onChange={(e) => handleTeammateChange(idx, 'gameUid', e.target.value)}
                          required
                        />
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

              <div className="modal-footer px-0 pb-0 mt-3 border-top border-secondary border-opacity-25 pt-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary text-light btn-sm px-3"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-custom btn-custom-accent btn-sm px-4 fw-bold shadow-sm"
                  disabled={loading}
                >
                  {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                  Confirm & Lock Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
