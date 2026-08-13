import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ref,
  runTransaction,
  push,
  db,
  serverTimestamp,
  recordTransaction
} from '../firebase';
import { StatusMessage } from '../components/StatusMessage';

interface WithdrawModalProps {
  isOpen: boolean;
  method: string | null;
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  method,
  onClose
}) => {
  const { currentUser, userProfile, appSettings, reloadUserProfile } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [accountDetails, setAccountDetails] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ msg: string; type: 'success' | 'danger' | 'warning' } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen || !method) return null;

  const winningCash = userProfile?.winningCash || 0;
  const minWithdraw = appSettings.minWithdraw || 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setStatusMessage({ msg: "Invalid amount.", type: 'warning' });
      return;
    }
    if (amt < minWithdraw) {
      setStatusMessage({ msg: `Minimum withdrawal is ₹ ${minWithdraw}.`, type: 'warning' });
      return;
    }
    if (amt > winningCash) {
      setStatusMessage({ msg: "Insufficient winning balance.", type: 'warning' });
      return;
    }
    if (!accountDetails.trim()) {
      setStatusMessage({ msg: "Please enter your withdrawal account details.", type: 'warning' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    let transactionCommitted = false;
    try {
      const uRef = ref(db, `users/${currentUser.uid}`);
      const txResult = await runTransaction(uRef, (prof) => {
        if (prof) {
          if ((prof.winningCash || 0) >= amt) {
            prof.winningCash = (prof.winningCash || 0) - amt;
            return prof;
          } else {
            throw new Error("Insufficient winning balance.");
          }
        } else {
          throw new Error("Profile missing.");
        }
      });

      if (!txResult.committed) {
        throw new Error("Failed to update balance. Please try again.");
      }
      transactionCommitted = true;

      const wrRef = ref(db, 'withdrawals');
      const newReq = {
        userId: currentUser.uid,
        userName: userProfile?.displayName || currentUser.email || 'User',
        amount: amt,
        methodDetails: {
          methodName: method,
          accountInfo: accountDetails.trim()
        },
        status: 'pending',
        requestTimestamp: serverTimestamp(),
        userEmail: currentUser.email || 'N/A'
      };

      const newWithdrawalRef = await push(wrRef, newReq);
      await recordTransaction(
        currentUser.uid,
        'withdraw_request',
        -amt,
        `Withdrawal to ${method}`,
        { withdrawalId: newWithdrawalRef.key }
      );

      setStatusMessage({ msg: "Request submitted successfully!", type: 'success' });
      await reloadUserProfile();

      setTimeout(() => {
        onClose();
        setAmount('');
        setAccountDetails('');
        setStatusMessage(null);
      }, 2000);
    } catch (err: any) {
      console.error("Withdraw error:", err);
      setStatusMessage({ msg: `Error: ${err.message}`, type: 'danger' });

      if (transactionCommitted) {
        console.warn("Attempting to refund winning cash...");
        const uRef = ref(db, `users/${currentUser.uid}`);
        try {
          await runTransaction(uRef, (prof) => {
            if (prof) {
              prof.winningCash = (prof.winningCash || 0) + amt;
            }
            return prof;
          });
          await recordTransaction(currentUser.uid, 'withdraw_failed_refund', amt, `Refund Failed Withdrawal Request`);
          setStatusMessage({ msg: `Error: ${err.message}. Amount refunded.`, type: 'danger' });
          await reloadUserProfile();
        } catch (refundError: any) {
          console.error("CRITICAL: FAILED TO REFUND WINNING CASH!", refundError);
          setStatusMessage({
            msg: `Error: ${err.message}. CRITICAL: Failed to refund amount! Contact support.`,
            type: 'danger'
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-cash-coin me-2"></i> Withdraw Funds
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p className="small text-secondary">
              Withdrawable balance: <strong className="text-light">₹ {winningCash.toFixed(2)}</strong>
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Amount (Min ₹ {minWithdraw})</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter amount"
                  value={amount}
                  min={minWithdraw}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Your {method} ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={`Enter your ${method} ID`}
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  required
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
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
