import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, db } from '../firebase';
import { MatchHistoryItem } from '../types';
import { formatFullDateTime } from '../utils/helpers';

interface MatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser) return;
      setLoading(true);

      try {
        const historyRef = ref(db, `users/${currentUser.uid}/matchHistory`);
        const snapshot = await get(historyRef);

        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: MatchHistoryItem[] = Object.values(val);
          list.sort((a, b) => (b.date || 0) - (a.date || 0));
          setHistory(list);
        } else {
          setHistory([]);
        }
      } catch (e) {
        console.error("Error loading match history:", e);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && currentUser) {
      fetchHistory();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex={-1}>
      <div className="modal-dialog modal-fullscreen modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-clock-history me-2"></i> Match History
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-accent"></div>
                <p className="mt-2 text-secondary">Loading history...</p>
              </div>
            ) : history.length > 0 ? (
              history.map((match, idx) => (
                <div key={match.id || idx} className="custom-card mb-3">
                  <h5 className="tournament-card-title mb-2">{match.tournamentName || 'Tournament'}</h5>
                  <p className="small text-secondary mb-3">{formatFullDateTime(match.date)}</p>
                  <div className="d-flex justify-content-around text-center">
                    <div>
                      <span className="text-secondary small d-block">Rank</span>
                      <strong className="h5">#{match.rank || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-secondary small d-block">Kills</span>
                      <strong className="h5">{match.kills ?? 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-secondary small d-block">Winnings</span>
                      <strong className="h5 text-success">₹ {(match.earnings || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-secondary py-5">You haven't played any matches yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
