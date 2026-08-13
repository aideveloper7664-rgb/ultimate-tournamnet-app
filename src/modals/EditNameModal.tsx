import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, update, db } from '../firebase';
import { StatusMessage } from '../components/StatusMessage';

interface EditNameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditNameModal: React.FC<EditNameModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile, reloadUserProfile } = useAuth();
  const [name, setName] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.displayName) {
      setName(userProfile.displayName);
    }
  }, [userProfile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setStatusMessage("Name cannot be empty.");
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      await update(ref(db, `users/${currentUser.uid}`), {
        displayName: trimmedName
      });
      await reloadUserProfile();
      onClose();
    } catch (err: any) {
      console.error("Error updating name:", err);
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Change Your Name</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">New Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <StatusMessage message={statusMessage} type="danger" onDismiss={() => setStatusMessage(null)} />

              <div className="modal-footer px-0 pb-0 mt-3 border-top-0">
                <button
                  type="button"
                  className="btn btn-custom btn-custom-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-custom btn-custom-primary"
                  disabled={loading}
                >
                  {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
