import React, { useState } from 'react';
import {
  auth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from '../firebase';
import { StatusMessage } from '../components/StatusMessage';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ msg: string; type: 'success' | 'danger' } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatusMessage({ msg: "All fields are required.", type: 'danger' });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMessage({ msg: "New password must be at least 6 characters.", type: 'danger' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ msg: "New passwords do not match.", type: 'danger' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("No authenticated user.");

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setStatusMessage({ msg: "Password updated successfully!", type: 'success' });
      setTimeout(() => {
        onClose();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setStatusMessage(null);
      }, 2000);
    } catch (error: any) {
      console.error("Password change error:", error);
      let msg = "An error occurred.";
      if (error.code === 'auth/wrong-password') {
        msg = "Incorrect current password.";
      } else if (error.message) {
        msg = error.message;
      }
      setStatusMessage({ msg, type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Change Password</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <StatusMessage
                message={statusMessage?.msg}
                type={statusMessage?.type}
                onDismiss={() => setStatusMessage(null)}
              />

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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
