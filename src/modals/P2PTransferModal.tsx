import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  db,
  ref,
  get,
  set,
  push,
  update,
  runTransaction,
  serverTimestamp,
  recordTransaction,
  onValue,
  off,
  query,
  orderByChild
} from '../firebase';
import { P2PTransfer, UserProfile } from '../types';

interface P2PTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const P2PTransferModal: React.FC<P2PTransferModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, userProfile, appSettings, reloadUserProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  
  // Recipient Lookup State
  const [isSearchingRecipient, setIsSearchingRecipient] = useState<boolean>(false);
  const [recipientData, setRecipientData] = useState<{ uid: string; displayName: string; email: string } | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  // Transfer Processing State
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transferSuccessData, setTransferSuccessData] = useState<P2PTransfer | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'danger' | 'warning' } | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<P2PTransfer[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const transferFeePercent = appSettings.transferFeePercent ?? 10;
  const currentBalance = userProfile?.balance || 0;
  const winningCash = userProfile?.winningCash || 0;

  // Real-time lookup of recipient when email changes
  useEffect(() => {
    const trimmed = recipientEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setRecipientData(null);
      setRecipientError(null);
      return;
    }

    if (currentUser?.email && trimmed === currentUser.email.toLowerCase()) {
      setRecipientData(null);
      setRecipientError("You cannot send money to your own Gmail address.");
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRecipient(true);
      setRecipientError(null);
      try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
          const usersMap = snapshot.val();
          let foundUser: { uid: string; displayName: string; email: string } | null = null;

          for (const uid of Object.keys(usersMap)) {
            const u = usersMap[uid];
            if (u.email && u.email.toLowerCase() === trimmed) {
              foundUser = {
                uid,
                displayName: u.displayName || u.email.split('@')[0],
                email: u.email
              };
              break;
            }
          }

          if (foundUser) {
            setRecipientData(foundUser);
            setRecipientError(null);
          } else {
            setRecipientData(null);
            setRecipientError("No registered user found with this Gmail address.");
          }
        } else {
          setRecipientData(null);
          setRecipientError("No user directory found.");
        }
      } catch (err) {
        console.error("Recipient search failed:", err);
        setRecipientError("Error verifying Gmail address.");
      } finally {
        setIsSearchingRecipient(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [recipientEmail, currentUser]);

  // Load Transfer History
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    setHistoryLoading(true);
    const transRef = ref(db, `transactions/${currentUser.uid}`);

    const unsubscribe = onValue(transRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: P2PTransfer[] = [];
        Object.keys(data).forEach((key) => {
          const item = data[key];
          if (item.type === 'p2p_transfer_sent' || item.type === 'p2p_transfer_received') {
            const isSent = item.type === 'p2p_transfer_sent';
            const gross = item.grossAmount || Math.abs(item.amount) || 0;
            const fee = item.feeAmount || 0;
            const net = item.netAmount || (isSent ? gross - fee : item.amount);

            list.push({
              id: item.transferId || key,
              senderUid: isSent ? currentUser.uid : (item.senderUid || ''),
              senderEmail: item.senderEmail || (isSent ? (currentUser.email || '') : 'User'),
              senderName: item.senderName || (isSent ? (userProfile?.displayName || 'You') : 'Friend'),
              receiverUid: !isSent ? currentUser.uid : (item.receiverUid || ''),
              receiverEmail: item.recipientEmail || item.receiverEmail || (!isSent ? (currentUser.email || '') : 'User'),
              receiverName: item.recipientName || item.receiverName || 'Friend',
              grossAmount: gross,
              feePercent: item.feePercent || transferFeePercent,
              feeAmount: fee,
              netAmount: net,
              timestamp: typeof item.timestamp === 'number' ? item.timestamp : (item.timestamp?.seconds ? item.timestamp.seconds * 1000 : Date.now()),
              status: 'completed',
              note: item.note
            });
          }
        });

        list.sort((a, b) => {
          const tA = typeof a.timestamp === 'number' ? a.timestamp : 0;
          const tB = typeof b.timestamp === 'number' ? b.timestamp : 0;
          return tB - tA;
        });

        setHistoryList(list);
      } else {
        setHistoryList([]);
      }
      setHistoryLoading(false);
    }, (err) => {
      console.error("History fetch error:", err);
      setHistoryLoading(false);
    });

    return () => {
      off(transRef);
    };
  }, [isOpen, currentUser, userProfile, transferFeePercent]);

  // Calculations
  const numericAmount = parseFloat(amount) || 0;
  const feeAmount = (numericAmount * transferFeePercent) / 100;
  const netReceivedAmount = Math.max(0, numericAmount - feeAmount);

  // Quick Amount presets
  const handleSetQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleSetMax = () => {
    if (currentBalance > 0) {
      setAmount(Math.floor(currentBalance).toString());
    }
  };

  // Pre-validate before opening confirmation modal
  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!currentUser || !userProfile) {
      setStatusMessage({ text: "Please log in to transfer cash.", type: 'danger' });
      return;
    }

    const trimmed = recipientEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setStatusMessage({ text: "Please enter a valid recipient Gmail address.", type: 'warning' });
      return;
    }

    if (currentUser.email && trimmed === currentUser.email.toLowerCase()) {
      setStatusMessage({ text: "You cannot transfer cash to yourself.", type: 'danger' });
      return;
    }

    if (!recipientData) {
      setStatusMessage({ text: "Please select a valid registered recipient.", type: 'danger' });
      return;
    }

    if (numericAmount <= 0 || isNaN(numericAmount)) {
      setStatusMessage({ text: "Please enter a valid transfer amount.", type: 'warning' });
      return;
    }

    if (numericAmount < 10) {
      setStatusMessage({ text: "Minimum transfer amount is ₹ 10.", type: 'warning' });
      return;
    }

    if (numericAmount > currentBalance) {
      setStatusMessage({ text: `Insufficient balance! Your available balance is ₹ ${currentBalance.toFixed(2)}.`, type: 'danger' });
      return;
    }

    setIsConfirming(true);
  };

  // Execute the atomic P2P transfer
  const handleExecuteTransfer = async () => {
    if (!currentUser || !recipientData || numericAmount <= 0) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const senderUid = currentUser.uid;
      const receiverUid = recipientData.uid;
      const senderEmail = currentUser.email || 'N/A';
      const senderName = userProfile?.displayName || senderEmail.split('@')[0] || 'Sender';
      const receiverEmail = recipientData.email;
      const receiverName = recipientData.displayName;

      const grossAmt = numericAmount;
      const feeAmt = feeAmount;
      const netAmt = netReceivedAmount;

      // 1. Deduct from Sender Profile via transaction
      const senderRef = ref(db, `users/${senderUid}`);
      const senderResult = await runTransaction(senderRef, (currentProfile: UserProfile | null) => {
        if (!currentProfile) return currentProfile;
        const bal = currentProfile.balance || 0;
        if (bal < grossAmt) {
          throw new Error("Insufficient balance during transaction.");
        }
        
        currentProfile.balance = bal - grossAmt;
        // Proportionally or safely deduct from winning cash if applicable
        if ((currentProfile.winningCash || 0) > 0) {
          const winDeduct = Math.min(currentProfile.winningCash || 0, grossAmt);
          currentProfile.winningCash = (currentProfile.winningCash || 0) - winDeduct;
        }
        return currentProfile;
      });

      if (!senderResult.committed) {
        throw new Error("Sender balance deduction could not be completed.");
      }

      // 2. Credit to Receiver Profile via transaction
      const receiverRef = ref(db, `users/${receiverUid}`);
      const receiverResult = await runTransaction(receiverRef, (currentProfile: UserProfile | null) => {
        if (!currentProfile) return currentProfile;
        currentProfile.balance = (currentProfile.balance || 0) + netAmt;
        currentProfile.winningCash = (currentProfile.winningCash || 0) + netAmt;
        return currentProfile;
      });

      if (!receiverResult.committed) {
        // Attempt refund to sender if receiver credit fails
        await runTransaction(senderRef, (currentProfile: UserProfile | null) => {
          if (!currentProfile) return currentProfile;
          currentProfile.balance = (currentProfile.balance || 0) + grossAmt;
          return currentProfile;
        });
        throw new Error("Receiver credit failed. Transferred amount was refunded to your wallet.");
      }

      // 3. Create Transfer Details Record
      const transferId = `p2p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();

      const transferRecord: P2PTransfer = {
        id: transferId,
        senderUid,
        senderEmail,
        senderName,
        receiverUid,
        receiverEmail,
        receiverName,
        grossAmount: grossAmt,
        feePercent: transferFeePercent,
        feeAmount: feeAmt,
        netAmount: netAmt,
        timestamp: now,
        status: 'completed',
        note: note.trim() || undefined
      };

      // 4. Record wallet statements for both users (stored in permitted transactions/$uid path)
      await recordTransaction(
        senderUid,
        'p2p_transfer_sent',
        -grossAmt,
        `Sent ₹${grossAmt} to ${receiverEmail} (Fee: ₹${feeAmt.toFixed(2)})`,
        {
          transferId,
          recipientEmail: receiverEmail,
          recipientName: receiverName,
          grossAmount: grossAmt,
          feeAmount: feeAmt,
          feePercent: transferFeePercent,
          netAmount: netAmt,
          p2pType: 'sent',
          note: note.trim() || undefined
        }
      );

      await recordTransaction(
        receiverUid,
        'p2p_transfer_received',
        netAmt,
        `Received ₹${netAmt.toFixed(2)} from ${senderEmail}`,
        {
          transferId,
          senderEmail,
          senderName,
          grossAmount: grossAmt,
          feeAmount: feeAmt,
          feePercent: transferFeePercent,
          netAmount: netAmt,
          p2pType: 'received',
          note: note.trim() || undefined
        }
      );

      // 5. Push in-app notification to receiver in permitted user notifications path
      try {
        const notifRef = push(ref(db, `users/${receiverUid}/notifications`));
        await set(notifRef, {
          title: "💰 Money Received!",
          message: `${senderName} (${senderEmail}) sent you ₹${netAmt.toFixed(2)} directly to your vault wallet.`,
          timestamp: now,
          isRead: false
        });
      } catch (nErr) {
        console.warn("Receiver notification push failed:", nErr);
      }

      await reloadUserProfile();

      // Reset form and show success confirmation
      setTransferSuccessData(transferRecord);
      setIsConfirming(false);
      setRecipientEmail('');
      setAmount('');
      setNote('');
      setRecipientData(null);
    } catch (err: any) {
      console.error("P2P Transfer execution error:", err);
      setStatusMessage({ text: err.message || "Transfer failed. Please try again.", type: 'danger' });
      setIsConfirming(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered History List
  const filteredHistory = useMemo(() => {
    if (!currentUser) return [];
    if (historyFilter === 'sent') {
      return historyList.filter(item => item.senderUid === currentUser.uid);
    }
    if (historyFilter === 'received') {
      return historyList.filter(item => item.receiverUid === currentUser.uid);
    }
    return historyList;
  }, [historyList, historyFilter, currentUser]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 start-50 translate-middle-x mb-4 px-3 py-2 bg-dark text-success border border-success rounded-pill shadow-lg small z-3';
    toast.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Copied to clipboard!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const formatTimestamp = (ts: number | object | undefined) => {
    if (!ts) return 'Recent';
    const num = typeof ts === 'number' ? ts : Date.now();
    const date = new Date(num);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal fade show d-block" 
      style={{ backgroundColor: 'rgba(5, 7, 20, 0.88)', backdropFilter: 'blur(10px)', zIndex: 1060 }} 
      tabIndex={-1}
    >
      <div 
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable" 
        style={{ maxWidth: '500px', width: '95%' }}
      >
        <div 
          className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden" 
          style={{ 
            background: '#0F1123', 
            color: '#F8FAFC', 
            border: '1.5px solid rgba(250, 204, 21, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
          }}
        >
          {/* Header */}
          <div 
            className="modal-header border-bottom border-secondary border-opacity-25 px-4 py-3.5 d-flex align-items-center justify-content-between position-relative" 
            style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #0F1123 100%)' }}
          >
            <div className="d-flex align-items-center gap-3">
              <div 
                className="rounded-3 d-flex align-items-center justify-content-center shadow-lg" 
                style={{ 
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', 
                  color: '#0F172A', 
                  width: '40px', 
                  height: '40px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                }}
              >
                <i className="bi bi-send-check-fill fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fw-black text-white mb-0" style={{ fontSize: '1.05rem', letterSpacing: '0.2px' }}>
                  P2P Wallet Transfer
                </h5>
                <span className="text-secondary small d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                  <i className="bi bi-shield-check text-success"></i>
                  Send & receive real money with friends via Gmail
                </span>
              </div>
            </div>

            <button 
              type="button" 
              className="btn-close btn-close-white shadow-none" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Navigation Sub-Header Tabs */}
          <div className="px-3 pt-3 pb-1 border-bottom border-secondary border-opacity-25 d-flex gap-2" style={{ background: 'rgba(15, 17, 35, 0.95)' }}>
            <button
              className={`btn btn-sm flex-fill rounded-3 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 transition-all ${
                activeTab === 'send'
                  ? 'btn-warning text-dark shadow-sm'
                  : 'btn-dark text-secondary border border-secondary border-opacity-25'
              }`}
              style={{ fontSize: '0.85rem' }}
              onClick={() => {
                setActiveTab('send');
                setTransferSuccessData(null);
              }}
            >
              <i className="bi bi-send-fill"></i>
              <span>Send Cash</span>
            </button>

            <button
              className={`btn btn-sm flex-fill rounded-3 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 transition-all ${
                activeTab === 'history'
                  ? 'btn-warning text-dark shadow-sm'
                  : 'btn-dark text-secondary border border-secondary border-opacity-25'
              }`}
              style={{ fontSize: '0.85rem' }}
              onClick={() => setActiveTab('history')}
            >
              <i className="bi bi-clock-history"></i>
              <span>Transfer History</span>
              {historyList.length > 0 && (
                <span className="badge rounded-pill bg-dark text-warning border border-warning border-opacity-40" style={{ fontSize: '0.65rem' }}>
                  {historyList.length}
                </span>
              )}
            </button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-3.5" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            
            {/* SUCCESS BANNER */}
            {transferSuccessData && (
              <div className="p-3.5 rounded-4 mb-3 border border-success border-opacity-40 bg-success bg-opacity-10 text-center animate__animated animate__fadeIn">
                <div className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center mb-2 shadow" style={{ width: '48px', height: '48px' }}>
                  <i className="bi bi-check2-circle fs-3"></i>
                </div>
                <h6 className="fw-black text-white mb-1">Transfer Successful!</h6>
                <p className="text-secondary small mb-2" style={{ fontSize: '0.78rem' }}>
                  ₹{transferSuccessData.grossAmount} was sent to <strong className="text-white">{transferSuccessData.receiverEmail}</strong>.
                </p>
                <div className="p-2.5 rounded-3 bg-dark bg-opacity-75 border border-secondary border-opacity-25 text-start font-mono small mb-3" style={{ fontSize: '0.75rem' }}>
                  <div className="d-flex justify-content-between text-secondary mb-1">
                    <span>Sent Amount:</span>
                    <span className="text-white fw-bold">₹{transferSuccessData.grossAmount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary mb-1">
                    <span>Admin Fee ({transferSuccessData.feePercent}%):</span>
                    <span className="text-warning">-₹{transferSuccessData.feeAmount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary pt-1 border-top border-secondary border-opacity-25">
                    <span>Credited to Friend:</span>
                    <span className="text-success fw-bold">₹{transferSuccessData.netAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-sm btn-outline-light flex-fill rounded-3 fw-bold"
                    onClick={() => setTransferSuccessData(null)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Send Another
                  </button>
                  <button 
                    className="btn btn-sm btn-warning text-dark flex-fill rounded-3 fw-bold"
                    onClick={() => {
                      setTransferSuccessData(null);
                      setActiveTab('history');
                    }}
                    style={{ fontSize: '0.8rem' }}
                  >
                    View in History
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: SEND MONEY */}
            {activeTab === 'send' && (
              <div>
                {/* Available Balance Pill */}
                <div className="p-3 rounded-4 mb-3 d-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div>
                    <div className="text-secondary small fw-bold text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                      YOUR AVAILABLE BALANCE
                    </div>
                    <div className="text-warning fw-black fs-4 mb-0">
                      ₹ {currentBalance.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="badge bg-dark border border-warning border-opacity-30 text-warning px-2.5 py-1.5 rounded-pill font-mono" style={{ fontSize: '0.72rem' }}>
                      <i className="bi bi-percent me-1"></i>{transferFeePercent}% Transfer Fee
                    </span>
                  </div>
                </div>

                {statusMessage && (
                  <div className={`alert alert-${statusMessage.type} py-2 px-3 rounded-3 small fw-semibold mb-3`} style={{ fontSize: '0.8rem' }}>
                    <i className="bi bi-info-circle-fill me-1.5"></i>
                    {statusMessage.text}
                  </div>
                )}

                <form onSubmit={handleInitiateTransfer} className="d-flex flex-column gap-3">
                  
                  {/* Recipient Gmail Field */}
                  <div>
                    <label className="form-label text-white small fw-bold mb-1.5 d-flex justify-content-between align-items-center">
                      <span>Recipient's Registered Gmail <span className="text-danger">*</span></span>
                      {isSearchingRecipient && (
                        <span className="text-warning small font-mono" style={{ fontSize: '0.7rem' }}>
                          <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px' }}></span>
                          Verifying...
                        </span>
                      )}
                    </label>
                    <div className="position-relative">
                      <input
                        type="email"
                        className="form-control bg-dark text-white border-secondary border-opacity-30 rounded-3 px-3 py-2.5 shadow-none"
                        placeholder="friend@gmail.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                        required
                      />
                      {recipientData && (
                        <div className="position-absolute top-50 end-0 translate-middle-y me-3 text-success">
                          <i className="bi bi-check-circle-fill fs-5"></i>
                        </div>
                      )}
                    </div>

                    {/* Recipient Verification Status Badge */}
                    {recipientData && (
                      <div className="mt-1.5 p-2 rounded-3 bg-success bg-opacity-10 border border-success border-opacity-25 d-flex align-items-center justify-content-between small">
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px', fontSize: '0.65rem' }}>
                            <i className="bi bi-person-check-fill"></i>
                          </div>
                          <div>
                            <span className="text-white fw-bold">{recipientData.displayName}</span>
                            <span className="text-secondary ms-1 font-mono" style={{ fontSize: '0.7rem' }}>({recipientData.email})</span>
                          </div>
                        </div>
                        <span className="badge bg-success text-white font-mono" style={{ fontSize: '0.62rem' }}>VERIFIED</span>
                      </div>
                    )}

                    {recipientError && (
                      <div className="mt-1 text-danger small" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                        {recipientError}
                      </div>
                    )}
                  </div>

                  {/* Transfer Amount Field */}
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1.5">
                      <label className="form-label text-white small fw-bold mb-0">
                        Transfer Amount (₹) <span className="text-danger">*</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-link text-warning p-0 text-decoration-none small fw-bold"
                        style={{ fontSize: '0.75rem' }}
                        onClick={handleSetMax}
                      >
                        Send MAX (₹{currentBalance.toFixed(0)})
                      </button>
                    </div>

                    <div className="input-group">
                      <span className="input-group-text bg-dark text-warning border-secondary border-opacity-30 fw-bold px-3">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="10"
                        max={currentBalance}
                        step="any"
                        className="form-control bg-dark text-white border-secondary border-opacity-30 py-2.5 px-3 shadow-none fw-bold"
                        placeholder="Enter amount (min ₹10)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{ fontSize: '1rem' }}
                        required
                      />
                    </div>

                    {/* Quick Amount Chips */}
                    <div className="d-flex gap-1.5 mt-2 overflow-x-auto pb-1">
                      {[50, 100, 200, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`btn btn-sm rounded-pill px-2.5 py-1 fw-bold flex-shrink-0 ${
                            numericAmount === preset
                              ? 'btn-warning text-dark'
                              : 'btn-outline-secondary text-secondary border-opacity-40'
                          }`}
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => handleSetQuickAmount(preset)}
                        >
                          +₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Note Field */}
                  <div>
                    <label className="form-label text-white small fw-bold mb-1">
                      Remarks / Message <span className="text-secondary fw-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      className="form-control bg-dark text-white border-secondary border-opacity-30 rounded-3 px-3 py-2 shadow-none small"
                      placeholder="e.g. Tournament split, match prize..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      style={{ fontSize: '0.84rem' }}
                    />
                  </div>

                  {/* Live Calculation Card */}
                  {numericAmount > 0 && (
                    <div className="p-3 rounded-4 bg-dark bg-opacity-80 border border-warning border-opacity-30 animate__animated animate__fadeIn">
                      <div className="text-warning small fw-bold mb-2 d-flex align-items-center gap-1.5" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-calculator-fill"></i>
                        <span>TRANSFER CALCULATION BREAKDOWN</span>
                      </div>

                      <div className="d-flex flex-column gap-1.5 font-mono small" style={{ fontSize: '0.8rem' }}>
                        <div className="d-flex justify-content-between text-secondary">
                          <span>Amount Sent:</span>
                          <span className="text-white fw-bold">₹ {numericAmount.toFixed(2)}</span>
                        </div>

                        <div className="d-flex justify-content-between text-secondary">
                          <span>Admin Fee ({transferFeePercent}%):</span>
                          <span className="text-danger fw-bold">- ₹ {feeAmount.toFixed(2)}</span>
                        </div>

                        <div className="border-top border-secondary border-opacity-25 pt-1.5 mt-1 d-flex justify-content-between align-items-center">
                          <span className="text-success fw-bold">Friend Receives (Net):</span>
                          <span className="text-success fw-black fs-6">₹ {netReceivedAmount.toFixed(2)}</span>
                        </div>

                        <div className="d-flex justify-content-between text-secondary" style={{ fontSize: '0.72rem' }}>
                          <span>Your Wallet Debited:</span>
                          <span className="text-warning">₹ {numericAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!recipientData || numericAmount <= 0 || numericAmount > currentBalance || isSearchingRecipient}
                    className="btn btn-warning text-dark fw-black w-100 py-2.5 rounded-3 shadow-lg mt-1 d-flex align-items-center justify-content-center gap-2"
                    style={{ fontSize: '0.95rem' }}
                  >
                    <i className="bi bi-send-fill"></i>
                    <span>Transfer ₹{numericAmount > 0 ? numericAmount.toFixed(2) : '0.00'} Now</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: TRANSFER HISTORY */}
            {activeTab === 'history' && (
              <div>
                {/* Filter Pills */}
                <div className="d-flex gap-1.5 mb-3">
                  <button
                    className={`btn btn-sm rounded-pill px-3 py-1 fw-bold ${
                      historyFilter === 'all'
                        ? 'btn-warning text-dark'
                        : 'btn-dark text-secondary border border-secondary border-opacity-30'
                    }`}
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setHistoryFilter('all')}
                  >
                    All ({historyList.length})
                  </button>

                  <button
                    className={`btn btn-sm rounded-pill px-3 py-1 fw-bold ${
                      historyFilter === 'sent'
                        ? 'btn-warning text-dark'
                        : 'btn-dark text-secondary border border-secondary border-opacity-30'
                    }`}
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setHistoryFilter('sent')}
                  >
                    Sent (Debited)
                  </button>

                  <button
                    className={`btn btn-sm rounded-pill px-3 py-1 fw-bold ${
                      historyFilter === 'received'
                        ? 'btn-warning text-dark'
                        : 'btn-dark text-secondary border border-secondary border-opacity-30'
                    }`}
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setHistoryFilter('received')}
                  >
                    Received (Credited)
                  </button>
                </div>

                {/* History List */}
                {historyLoading ? (
                  <div className="text-center py-5 text-secondary small">
                    <span className="spinner-border spinner-border-sm text-warning me-2"></span>
                    Loading transfer statement...
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-5 px-3 rounded-4 bg-dark bg-opacity-40 border border-secondary border-opacity-20">
                    <div className="rounded-circle bg-secondary bg-opacity-10 text-secondary d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '48px', height: '48px' }}>
                      <i className="bi bi-clock-history fs-4"></i>
                    </div>
                    <div className="fw-bold text-white small mb-1">No Transfers Yet</div>
                    <p className="text-secondary small mb-3" style={{ fontSize: '0.75rem' }}>
                      You haven't sent or received any direct cash transfers yet.
                    </p>
                    <button
                      className="btn btn-sm btn-outline-warning rounded-pill px-3 fw-bold"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setActiveTab('send')}
                    >
                      Send Cash to Friend
                    </button>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2.5">
                    {filteredHistory.map((item) => {
                      const isSender = item.senderUid === currentUser?.uid;

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-4 position-relative transition-all"
                          style={{
                            background: 'linear-gradient(135deg, rgba(25, 28, 56, 0.75) 0%, rgba(15, 17, 35, 0.85) 100%)',
                            border: isSender
                              ? '1px solid rgba(239, 68, 68, 0.25)'
                              : '1px solid rgba(34, 197, 94, 0.25)'
                          }}
                        >
                          {/* Top Row: Type Badge + Amount */}
                          <div className="d-flex align-items-center justify-content-between mb-1.5">
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                                  isSender
                                    ? 'bg-danger bg-opacity-20 text-danger'
                                    : 'bg-success bg-opacity-20 text-success'
                                }`}
                                style={{ width: '32px', height: '32px' }}
                              >
                                <i className={`bi ${isSender ? 'bi-arrow-up-right' : 'bi-arrow-down-left'} fw-bold`}></i>
                              </div>

                              <div>
                                <span className={`badge rounded-pill fw-bold ${isSender ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-success-subtle text-success border border-success-subtle'}`} style={{ fontSize: '0.65rem' }}>
                                  {isSender ? 'SENT (DEBITED)' : 'RECEIVED (CREDITED)'}
                                </span>
                                <div className="text-white fw-bold small text-truncate" style={{ maxWidth: '200px' }}>
                                  {isSender ? `To: ${item.receiverEmail}` : `From: ${item.senderEmail}`}
                                </div>
                              </div>
                            </div>

                            {/* Amount Callout */}
                            <div className="text-end font-mono">
                              <div className={`fw-black fs-6 ${isSender ? 'text-danger' : 'text-success'}`}>
                                {isSender ? `- ₹${item.grossAmount.toFixed(2)}` : `+ ₹${item.netAmount.toFixed(2)}`}
                              </div>
                              <span className="badge bg-dark text-success border border-success border-opacity-30" style={{ fontSize: '0.58rem' }}>
                                COMPLETED
                              </span>
                            </div>
                          </div>

                          {/* Middle: Details Breakdown */}
                          <div className="p-2 rounded-3 bg-dark bg-opacity-60 border border-secondary border-opacity-20 font-mono small mb-1.5" style={{ fontSize: '0.72rem' }}>
                            <div className="d-flex justify-content-between text-secondary">
                              <span>Gross Amount:</span>
                              <span className="text-white">₹{item.grossAmount.toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between text-secondary">
                              <span>Admin Fee ({item.feePercent}%):</span>
                              <span className="text-warning">-₹{item.feeAmount.toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between text-secondary">
                              <span>Net Credited:</span>
                              <span className="text-success fw-bold">₹{item.netAmount.toFixed(2)}</span>
                            </div>
                            {item.note && (
                              <div className="mt-1 pt-1 border-top border-secondary border-opacity-20 text-white-50 fst-italic">
                                "{item.note}"
                              </div>
                            )}
                          </div>

                          {/* Footer: Date & Time + Transaction ID */}
                          <div className="d-flex justify-content-between align-items-center text-secondary" style={{ fontSize: '0.68rem' }}>
                            <span className="d-flex align-items-center gap-1">
                              <i className="bi bi-calendar3"></i>
                              {formatTimestamp(item.timestamp)}
                            </span>

                            {item.id && (
                              <button
                                className="btn btn-link p-0 text-secondary text-decoration-none font-mono d-flex align-items-center gap-1"
                                style={{ fontSize: '0.68rem' }}
                                onClick={() => copyToClipboard(item.id || '')}
                                title="Copy Transaction ID"
                              >
                                <span>ID: {item.id.slice(-8)}</span>
                                <i className="bi bi-copy"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="modal-footer border-top border-secondary border-opacity-25 px-3 py-2.5 d-flex justify-content-between align-items-center" style={{ background: 'rgba(15, 17, 35, 0.95)' }}>
            <span className="text-secondary font-mono" style={{ fontSize: '0.7rem' }}>
              <i className="bi bi-lock-fill text-warning me-1"></i>256-bit Encrypted P2P
            </span>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm rounded-3 fw-bold px-3.5"
              onClick={onClose}
              style={{ fontSize: '0.8rem' }}
            >
              Close
            </button>
          </div>

        </div>
      </div>

      {/* CONFIRMATION POPUP MODAL */}
      {isConfirming && recipientData && (
        <div 
          className="modal fade show d-block" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-content border-0 rounded-4 overflow-hidden shadow-2xl" style={{ background: '#111428', border: '1px solid rgba(250, 204, 21, 0.4)' }}>
              <div className="modal-header border-bottom border-secondary border-opacity-25 py-2.5 px-3.5">
                <h6 className="modal-title fw-bold text-white mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-shield-exclamation text-warning fs-5"></i>
                  Confirm Transfer
                </h6>
                <button 
                  type="button" 
                  className="btn-close btn-close-white shadow-none" 
                  onClick={() => setIsConfirming(false)}
                ></button>
              </div>

              <div className="modal-body p-3.5 text-center">
                <div className="rounded-circle bg-warning bg-opacity-10 text-warning d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '48px', height: '48px' }}>
                  <i className="bi bi-send-fill fs-4"></i>
                </div>

                <h5 className="fw-black text-white mb-1">Send ₹{numericAmount.toFixed(2)}?</h5>
                <p className="text-secondary small mb-3" style={{ fontSize: '0.78rem' }}>
                  To: <strong className="text-white">{recipientData.displayName}</strong> ({recipientData.email})
                </p>

                <div className="p-3 rounded-3 bg-dark text-start font-mono small mb-3" style={{ fontSize: '0.78rem' }}>
                  <div className="d-flex justify-content-between text-secondary mb-1">
                    <span>Debited from you:</span>
                    <span className="text-warning fw-bold">₹{numericAmount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary mb-1">
                    <span>Admin Fee ({transferFeePercent}%):</span>
                    <span className="text-danger">-₹{feeAmount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary pt-1 border-top border-secondary border-opacity-25">
                    <span>Friend Receives:</span>
                    <span className="text-success fw-bold">₹{netReceivedAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm flex-fill rounded-3 fw-bold"
                    onClick={() => setIsConfirming(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning btn-sm flex-fill rounded-3 fw-black text-dark d-flex align-items-center justify-content-center gap-1.5"
                    onClick={handleExecuteTransfer}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg fw-black"></i>
                        Confirm & Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
