import React from 'react';
import { Tournament } from '../types';
import { copyToClipboard } from '../utils/helpers';

interface IdPasswordModalProps {
  tournament: Tournament | null;
  onClose: () => void;
}

export const IdPasswordModal: React.FC<IdPasswordModalProps> = ({
  tournament,
  onClose
}) => {
  if (!tournament) return null;

  const showPass = tournament.showIdPass;
  const roomId = showPass ? (tournament.roomId || 'Not updated yet') : 'Hidden by Admin';
  const roomPassword = showPass ? (tournament.roomPassword || 'Not updated yet') : 'Hidden by Admin';

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Room ID & Password</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body text-center">
            <p className="small text-secondary">
              ID/Pass shown shortly before match start.
            </p>

            <div className="my-3 p-3" style={{ background: 'var(--primary-bg)', borderRadius: '8px' }}>
              <p className="mb-1">Room ID:</p>
              <h4 className="text-accent referral-code d-inline-block m-0">
                {roomId}
              </h4>
              {showPass && (
                <button
                  className="btn btn-sm btn-outline-warning ms-2 copy-btn"
                  onClick={() => copyToClipboard(roomId)}
                  title="Copy Room ID"
                >
                  <i className="bi bi-clipboard"></i>
                </button>
              )}
            </div>

            <div className="my-3 p-3" style={{ background: 'var(--primary-bg)', borderRadius: '8px' }}>
              <p className="mb-1">Password:</p>
              <h4 className="text-accent referral-code d-inline-block m-0">
                {roomPassword}
              </h4>
              {showPass && (
                <button
                  className="btn btn-sm btn-outline-warning ms-2 copy-btn"
                  onClick={() => copyToClipboard(roomPassword)}
                  title="Copy Password"
                >
                  <i className="bi bi-clipboard"></i>
                </button>
              )}
            </div>

            <p className="small text-warning mt-2 mb-0">
              <i className="bi bi-exclamation-triangle me-1"></i> Don't share ID/Password with non-participants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
