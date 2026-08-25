import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  db,
  ref,
  get,
  set,
  push,
  serverTimestamp,
  onValue,
  off,
  query,
  orderByChild,
  equalTo
} from '../firebase';
import { TransferRequest, UserProfile } from '../types';

interface P2PTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const P2PTransferModal: React.FC<P2PTransferModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, userProfile, appSettings } = useAuth();

  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  
  // Recipient Lookup State
  const [isSearchingRecipient, setIsSearchingRecipient] = useState<boolean>(false);
  const [recipientData, setRecipientData] = useState<{ uid: string; displayName: string; email: string; gameUid?: string } | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  // Transfer Processing State
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transferSuccessData, setTransferSuccessData] = useState<TransferRequest | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'danger' | 'warning' } | null>(null);

  // Transfer Requests & History State
  const [requestsList, setRequestsList] = useState<TransferRequest[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'completed' | 'rejected' | 'sent' | 'received'>('all');
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const transferFeePercent = appSettings.transferFeePercent ?? 10;
  const currentBalance = userProfile?.balance || 0;

  // Real-time lookup of recipient when input changes (Email, Game UID, Username, or UID)
  useEffect(() => {
    const trimmed = recipientInput.trim();
    if (!trimmed || trimmed.length < 3) {
      setRecipientData(null);
      setRecipientError(null);
      return;
    }

    const trimmedLower = trimmed.toLowerCase();
    if (currentUser?.email && trimmedLower === currentUser.email.toLowerCase()) {
      setRecipientData(null);
      setRecipientError("You cannot send coins to your own account.");
      return;
    }
    if (currentUser?.uid && trimmed === currentUser.uid) {
      setRecipientData(null);
      setRecipientError("You cannot send coins to your own account.");
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRecipient(true);
      setRecipientError(null);
      try {
        let foundUser: { uid: string; displayName: string; email: string; gameUid?: string } | null = null;

        // Try direct indexed query by email if it looks like an email
        if (trimmedLower.includes('@')) {
          try {
            const q = query(ref(db, 'users'), orderByChild('email'), equalTo(trimmedLower));
            const snapshot = await get(q);
            if (snapshot.exists()) {
              const data = snapshot.val();
              const uid = Object.keys(data)[0];
              const u = data[uid];
              if (uid !== currentUser?.uid) {
                foundUser = {
                  uid,
                  displayName: u.displayName || u.username || u.email?.split('@')[0] || 'Gamer',
                  email: u.email || trimmedLower,
                  gameUid: u.gameUid
                };
              }
            }
          } catch (qErr) {
            console.warn("Direct query by email error:", qErr);
          }
        }

        // Try direct fetch by UID
        if (!foundUser && trimmed.length >= 10 && !trimmed.includes('@')) {
          try {
            const uSnap = await get(ref(db, `users/${trimmed}`));
            if (uSnap.exists() && trimmed !== currentUser?.uid) {
              const u = uSnap.val();
              foundUser = {
                uid: trimmed,
                displayName: u.displayName || u.username || u.email?.split('@')[0] || 'Gamer',
                email: u.email || 'Registered User',
                gameUid: u.gameUid
              };
            }
          } catch (uErr) {
            console.warn("Direct UID lookup notice:", uErr);
          }
        }

        // Fallback directory scan
        if (!foundUser) {
          const usersRef = ref(db, 'users');
          const snapshot = await get(usersRef);
          if (snapshot.exists()) {
            const usersMap = snapshot.val();
            for (const uid of Object.keys(usersMap)) {
              if (uid === currentUser?.uid) continue;
              const u = usersMap[uid];
              const uEmail = (u.email || '').toLowerCase();
              const uGameUid = (u.gameUid || '').toLowerCase();
              const uDisplayName = (u.displayName || '').toLowerCase();
              const uUsername = (u.username || '').toLowerCase();

              if (
                uEmail === trimmedLower || 
                uGameUid === trimmedLower || 
                uDisplayName === trimmedLower || 
                uUsername === trimmedLower || 
                uid === trimmed
              ) {
                foundUser = {
                  uid,
                  displayName: u.displayName || u.username || u.email?.split('@')[0] || 'Gamer',
                  email: u.email || 'Registered Gamer',
                  gameUid: u.gameUid
                };
                break;
              }
            }
          }
        }

        if (foundUser) {
          setRecipientData(foundUser);
          setRecipientError(null);
        } else {
          setRecipientData(null);
          setRecipientError("No registered gamer found with this email, UID, or Game ID.");
        }
      } catch (err) {
        console.error("Recipient search failed:", err);
        setRecipientError("Error verifying user details.");
      } finally {
        setIsSearchingRecipient(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [recipientInput, currentUser]);

  // Real-time synchronization of transferRequests for the user
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    setHistoryLoading(true);
    const requestsRef = ref(db, 'transferRequests');

    const unsubscribe = onValue(requestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: TransferRequest[] = [];

        Object.keys(data).forEach((key) => {
          const item = data[key];
          if (!item || typeof item !== 'object') return;

          // Match items where current user is sender or receiver
          if (item.senderUid === currentUser.uid || item.receiverUid === currentUser.uid) {
            const reqAmount = typeof item.amount === 'number' ? item.amount : (item.grossAmount || 0);
            const fee = typeof item.feeAmount === 'number' ? item.feeAmount : (reqAmount * (item.feePercent || transferFeePercent)) / 100;
            const net = typeof item.netAmount === 'number' ? item.netAmount : Math.max(0, reqAmount - fee);

            list.push({
              id: item.id || key,
              senderUid: item.senderUid,
              senderEmail: item.senderEmail || 'Sender',
              senderName: item.senderName || 'Sender',
              senderGameUid: item.senderGameUid,
              receiverUid: item.receiverUid,
              receiverEmail: item.receiverEmail || 'Receiver',
              receiverName: item.receiverName || 'Friend',
              receiverGameUid: item.receiverGameUid,
              amount: reqAmount,
              grossAmount: item.grossAmount || reqAmount,
              feePercent: item.feePercent || transferFeePercent,
              feeAmount: fee,
              netAmount: net,
              status: item.status || 'pending',
              createdAt: item.createdAt || item.timestamp || Date.now(),
              timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
              note: item.note,
              rejectReason: item.rejectReason,
              processedAt: item.processedAt
            });
          }
        });

        // Sort latest first
        list.sort((a, b) => {
          const tA = typeof a.timestamp === 'number' ? a.timestamp : (typeof a.createdAt === 'number' ? a.createdAt : 0);
          const tB = typeof b.timestamp === 'number' ? b.timestamp : (typeof b.createdAt === 'number' ? b.createdAt : 0);
          return tB - tA;
        });

        setRequestsList(list);
      } else {
        setRequestsList([]);
      }
      setHistoryLoading(false);
    }, (err) => {
      console.warn("Transfer requests fetch notice:", err);
      setHistoryLoading(false);
    });

    return () => {
      off(requestsRef);
    };
  }, [isOpen, currentUser, transferFeePercent]);

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
      setStatusMessage({ text: "Please log in to transfer coins.", type: 'danger' });
      return;
    }

    const trimmed = recipientInput.trim();
    if (!trimmed) {
      setStatusMessage({ text: "Please enter a valid recipient UID, Email, or Game ID.", type: 'warning' });
      return;
    }

    if (currentUser.email && trimmed.toLowerCase() === currentUser.email.toLowerCase()) {
      setStatusMessage({ text: "You cannot transfer coins to yourself.", type: 'danger' });
      return;
    }
    if (currentUser.uid && trimmed === currentUser.uid) {
      setStatusMessage({ text: "You cannot transfer coins to yourself.", type: 'danger' });
      return;
    }

    if (!recipientData) {
      setStatusMessage({ text: "Please select a valid registered recipient.", type: 'danger' });
      return;
    }

    if (numericAmount <= 0 || isNaN(numericAmount)) {
      setStatusMessage({ text: "Please enter a valid coin transfer amount.", type: 'warning' });
      return;
    }

    if (numericAmount < 10) {
      setStatusMessage({ text: "Minimum transfer amount is 10 coins (₹10).", type: 'warning' });
      return;
    }

    if (numericAmount > currentBalance) {
      setStatusMessage({ text: `Insufficient balance! Your available balance is ₹ ${currentBalance.toFixed(2)}.`, type: 'danger' });
      return;
    }

    setIsConfirming(true);
  };

  // Create transfer request in Firebase `transferRequests`
  const handleExecuteTransfer = async () => {
    if (!currentUser || !recipientData || numericAmount <= 0) return;

    if (numericAmount > currentBalance) {
      setStatusMessage({ text: "Insufficient balance for this transfer request.", type: 'danger' });
      setIsConfirming(false);
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const senderUid = currentUser.uid;
      const receiverUid = recipientData.uid;
      const senderEmail = currentUser.email || 'N/A';
      const senderName = userProfile?.displayName || senderEmail.split('@')[0] || 'Sender';
      const senderGameUid = userProfile?.gameUid || '';
      const receiverEmail = recipientData.email;
      const receiverName = recipientData.displayName;
      const receiverGameUid = recipientData.gameUid || '';

      const grossAmt = numericAmount;
      const feeAmt = feeAmount;
      const netAmt = netReceivedAmount;
      const now = Date.now();

      // Create new request under `transferRequests/{requestId}`
      const requestsRef = ref(db, 'transferRequests');
      const newReqRef = push(requestsRef);
      const requestId = newReqRef.key;

      const cleanPayload: Record<string, any> = {
        senderUid,
        senderEmail,
        senderName,
        receiverUid,
        receiverEmail,
        receiverName,
        amount: grossAmt,
        grossAmount: grossAmt,
        feePercent: transferFeePercent,
        feeAmount: feeAmt,
        netAmount: netAmt,
        status: 'pending',
        createdAt: serverTimestamp(),
        timestamp: now
      };

      if (requestId) cleanPayload.id = requestId;
      if (senderGameUid) cleanPayload.senderGameUid = senderGameUid;
      if (receiverGameUid) cleanPayload.receiverGameUid = receiverGameUid;
      if (note && note.trim()) cleanPayload.note = note.trim();

      await set(newReqRef, cleanPayload);

      // Show success screen with 'pending' status
      setTransferSuccessData({
        ...(cleanPayload as TransferRequest),
        createdAt: now,
        timestamp: now
      });
      setIsConfirming(false);
      setRecipientInput('');
      setAmount('');
      setNote('');
      setRecipientData(null);
    } catch (err: any) {
      console.error("Transfer request creation error:", err);
      setStatusMessage({ text: err.message || "Failed to create transfer request. Please try again.", type: 'danger' });
      setIsConfirming(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    if (!currentUser) return [];

    return requestsList.filter((item) => {
      if (historyFilter === 'pending') return item.status === 'pending';
      if (historyFilter === 'completed') return item.status === 'completed';
      if (historyFilter === 'rejected') return item.status === 'rejected';
      if (historyFilter === 'sent') return item.senderUid === currentUser.uid;
      if (historyFilter === 'received') return item.receiverUid === currentUser.uid;
      return true;
    });
  }, [requestsList, historyFilter, currentUser]);

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

  const pendingCount = useMemo(() => {
    return requestsList.filter(item => item.status === 'pending').length;
  }, [requestsList]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal fade show d-block" 
      style={{ backgroundColor: 'rgba(5, 7, 20, 0.88)', backdropFilter: 'blur(10px)', zIndex: 1060 }} 
      tabIndex={-1}
    >
      <div 
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable" 
        style={{ maxWidth: '520px', width: '95%' }}
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
                  width: '42px', 
                  height: '42px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                }}
              >
                <i className="bi bi-send-check-fill fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fw-black text-white mb-0" style={{ fontSize: '1.05rem', letterSpacing: '0.2px' }}>
                  P2P Send & Receive Coins
                </h5>
                <span className="text-secondary small d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                  <i className="bi bi-shield-check text-success"></i>
                  Secure peer-to-peer transfer requests with admin verification
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
              <span>Send Coins</span>
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
              <span>Transfer Requests</span>
              {pendingCount > 0 && (
                <span className="badge rounded-pill bg-warning text-dark font-mono" style={{ fontSize: '0.65rem' }}>
                  {pendingCount} Pending
                </span>
              )}
            </button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-3.5" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            
            {/* SUCCESS BANNER */}
            {transferSuccessData && (
              <div className="p-3.5 rounded-4 mb-3 border border-warning border-opacity-40 bg-warning bg-opacity-10 text-center animate__animated animate__fadeIn">
                <div className="rounded-circle bg-warning text-dark d-inline-flex align-items-center justify-content-center mb-2 shadow" style={{ width: '48px', height: '48px' }}>
                  <i className="bi bi-hourglass-split fs-3"></i>
                </div>
                <h6 className="fw-black text-white mb-1">Transfer Request Submitted!</h6>
                <div className="d-inline-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill bg-warning text-dark fw-bold small mb-2 font-mono" style={{ fontSize: '0.72rem' }}>
                  <i className="bi bi-clock-fill"></i> STATUS: PENDING ADMIN APPROVAL
                </div>
                <p className="text-secondary small mb-2" style={{ fontSize: '0.78rem' }}>
                  Your request to send <strong>₹{transferSuccessData.amount}</strong> to <strong className="text-white">{transferSuccessData.receiverName || transferSuccessData.receiverEmail}</strong> has been logged.
                </p>
                <div className="p-2.5 rounded-3 bg-dark bg-opacity-75 border border-secondary border-opacity-25 text-start font-mono small mb-3" style={{ fontSize: '0.75rem' }}>
                  <div className="d-flex justify-content-between text-secondary mb-1">
                    <span>Requested Amount:</span>
                    <span className="text-white fw-bold">₹{Number(transferSuccessData.amount).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary mb-1">
                    <span>Transfer Fee ({transferSuccessData.feePercent}%):</span>
                    <span className="text-warning">-₹{Number(transferSuccessData.feeAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary pt-1 border-top border-secondary border-opacity-25">
                    <span>Recipient Receives (Upon Approval):</span>
                    <span className="text-success fw-bold">₹{Number(transferSuccessData.netAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="mt-2 pt-1 border-top border-secondary border-opacity-20 text-white-50 small" style={{ fontSize: '0.7rem' }}>
                    <i className="bi bi-info-circle text-warning me-1"></i>
                    Balance will be updated once verified & approved by Admin.
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
                      setHistoryFilter('pending');
                    }}
                    style={{ fontSize: '0.8rem' }}
                  >
                    View Status
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: SEND COINS */}
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
                  
                  {/* Recipient Search Field */}
                  <div>
                    <label className="form-label text-white small fw-bold mb-1.5 d-flex justify-content-between align-items-center">
                      <span>Recipient's UID / Email / Game UID <span className="text-danger">*</span></span>
                      {isSearchingRecipient && (
                        <span className="text-warning small font-mono" style={{ fontSize: '0.7rem' }}>
                          <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px' }}></span>
                          Searching...
                        </span>
                      )}
                    </label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control bg-dark text-white border-secondary border-opacity-30 rounded-3 px-3 py-2.5 shadow-none"
                        placeholder="Enter recipient's UID, Email, or Game ID"
                        value={recipientInput}
                        onChange={(e) => setRecipientInput(e.target.value)}
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
                          <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
                            <i className="bi bi-person-check-fill"></i>
                          </div>
                          <div>
                            <span className="text-white fw-bold">{recipientData.displayName}</span>
                            <span className="text-secondary ms-1 font-mono" style={{ fontSize: '0.7rem' }}>
                              ({recipientData.email})
                            </span>
                            {recipientData.gameUid && (
                              <span className="text-warning ms-1.5 font-mono" style={{ fontSize: '0.68rem' }}>
                                [ID: {recipientData.gameUid}]
                              </span>
                            )}
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
                        Transfer Coins / Amount (₹) <span className="text-danger">*</span>
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
                        placeholder="Enter amount (min 10 coins)"
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
                      placeholder="e.g. Tournament split, match fee, prize share..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      style={{ fontSize: '0.84rem' }}
                    />
                  </div>

                  {/* Live Calculation Breakdown */}
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
                          <span className="text-success fw-bold">Friend Receives (Upon Approval):</span>
                          <span className="text-success fw-black fs-6">₹ {netReceivedAmount.toFixed(2)}</span>
                        </div>

                        <div className="d-flex justify-content-between text-secondary" style={{ fontSize: '0.72rem' }}>
                          <span>Flow:</span>
                          <span className="text-warning">Pending Admin Approval</span>
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
                    <span>Submit Transfer Request (₹{numericAmount > 0 ? numericAmount.toFixed(2) : '0.00'})</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: TRANSFER REQUESTS & HISTORY */}
            {activeTab === 'history' && (
              <div>
                {/* Filter Pills */}
                <div className="d-flex gap-1.5 mb-3 overflow-x-auto pb-1">
                  <button
                    className={`btn btn-sm rounded-pill px-3 py-1 fw-bold flex-shrink-0 ${
                      historyFilter === 'all'
                        ? 'btn-warning text-dark'
                        : 'btn-dark text-secondary border border-secondary border-opacity-30'
                    }`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => setHistoryFilter('all')}
                  >
                    All ({requestsList.length})
                  </button>

                  <button
                    className={`btn btn-sm rounded-pill px-3 py-1 fw-bold flex-shrink-0 ${
                      historyFilter === 'pending'
                        ? 'btn-warning text-dark'
                        : 'btn-dark text-secondary border border-secondary border-opacity-30'
                    }`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => setHistoryFilter('pending')}
                  >
                    🟡 Pending ({requestsList.filter(i => i.status === 'pending').length})
                  </button>

                  <button
                    className={`btn btn-sm rounded-pill px-3 py-1 fw-bold flex-shrink-0 ${
                      historyFilter === 'completed'
                        ? 'btn-warning text-dark'
                        : 'btn-dark text-secondary border border-secondary border-opacity-30'
                    }`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => setHistoryFilter('completed')}
                  >
                    🟢 Completed ({requestsList.filter(i => i.status === 'completed').length})
                  </button>

                  <button
                    className={`btn btn-sm rounded-pill px-3 py-1 fw-bold flex-shrink-0 ${
                      historyFilter === 'rejected'
                        ? 'btn-warning text-dark'
                        : 'btn-dark text-secondary border border-secondary border-opacity-30'
                    }`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => setHistoryFilter('rejected')}
                  >
                    🔴 Rejected ({requestsList.filter(i => i.status === 'rejected').length})
                  </button>

                  <button
                    className={`btn btn-sm rounded-pill px-3 py-1 fw-bold flex-shrink-0 ${
                      historyFilter === 'sent'
                        ? 'btn-warning text-dark'
                        : 'btn-dark text-secondary border border-secondary border-opacity-30'
                    }`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => setHistoryFilter('sent')}
                  >
                    Sent
                  </button>

                  <button
                    className={`btn btn-sm rounded-pill px-3 py-1 fw-bold flex-shrink-0 ${
                      historyFilter === 'received'
                        ? 'btn-warning text-dark'
                        : 'btn-dark text-secondary border border-secondary border-opacity-30'
                    }`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => setHistoryFilter('received')}
                  >
                    Received
                  </button>
                </div>

                {/* History List */}
                {historyLoading ? (
                  <div className="text-center py-5 text-secondary small">
                    <span className="spinner-border spinner-border-sm text-warning me-2"></span>
                    Loading transfer requests...
                  </div>
                ) : filteredList.length === 0 ? (
                  <div className="text-center py-5 px-3 rounded-4 bg-dark bg-opacity-40 border border-secondary border-opacity-20">
                    <div className="rounded-circle bg-secondary bg-opacity-10 text-secondary d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '48px', height: '48px' }}>
                      <i className="bi bi-clock-history fs-4"></i>
                    </div>
                    <div className="fw-bold text-white small mb-1">No Transfer Requests Found</div>
                    <p className="text-secondary small mb-3" style={{ fontSize: '0.75rem' }}>
                      {historyFilter === 'pending'
                        ? "You have no pending transfer requests right now."
                        : "You haven't initiated or received any coin transfer requests yet."}
                    </p>
                    <button
                      className="btn btn-sm btn-outline-warning rounded-pill px-3 fw-bold"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setActiveTab('send')}
                    >
                      Send Coins to Friend
                    </button>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2.5">
                    {filteredList.map((item) => {
                      const isSender = item.senderUid === currentUser?.uid;
                      const status = item.status || 'pending';

                      const statusBadge = () => {
                        if (status === 'pending') {
                          return (
                            <span className="badge bg-warning text-dark border border-warning font-mono" style={{ fontSize: '0.62rem' }}>
                              <i className="bi bi-hourglass-split me-1"></i>PENDING APPROVAL
                            </span>
                          );
                        }
                        if (status === 'completed') {
                          return (
                            <span className="badge bg-success text-white border border-success font-mono" style={{ fontSize: '0.62rem' }}>
                              <i className="bi bi-check-circle-fill me-1"></i>COMPLETED
                            </span>
                          );
                        }
                        return (
                          <span className="badge bg-danger text-white border border-danger font-mono" style={{ fontSize: '0.62rem' }}>
                            <i className="bi bi-x-circle-fill me-1"></i>REJECTED
                          </span>
                        );
                      };

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-4 position-relative transition-all"
                          style={{
                            background: 'linear-gradient(135deg, rgba(25, 28, 56, 0.75) 0%, rgba(15, 17, 35, 0.85) 100%)',
                            border: status === 'pending'
                              ? '1px solid rgba(245, 158, 11, 0.35)'
                              : status === 'completed'
                              ? '1px solid rgba(34, 197, 94, 0.3)'
                              : '1px solid rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          {/* Top Row: Direction + Status + Amount */}
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
                                <div className="d-flex align-items-center gap-1.5">
                                  <span className={`badge rounded-pill fw-bold ${isSender ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-success-subtle text-success border border-success-subtle'}`} style={{ fontSize: '0.65rem' }}>
                                    {isSender ? 'SENT REQUEST' : 'RECEIVED REQUEST'}
                                  </span>
                                  {statusBadge()}
                                </div>
                                <div className="text-white fw-bold small text-truncate mt-0.5" style={{ maxWidth: '200px' }}>
                                  {isSender ? `To: ${item.receiverName || item.receiverEmail}` : `From: ${item.senderName || item.senderEmail}`}
                                </div>
                              </div>
                            </div>

                            {/* Amount Callout */}
                            <div className="text-end font-mono">
                              <div className={`fw-black fs-6 ${isSender ? 'text-danger' : 'text-success'}`}>
                                {isSender ? `- ₹${Number(item.amount).toFixed(2)}` : `+ ₹${Number(item.netAmount || item.amount).toFixed(2)}`}
                              </div>
                              <span className="text-secondary small" style={{ fontSize: '0.62rem' }}>
                                {status === 'pending' ? 'Coins reserved' : status === 'completed' ? 'Settled' : 'Cancelled'}
                              </span>
                            </div>
                          </div>

                          {/* Middle: Details Breakdown */}
                          <div className="p-2 rounded-3 bg-dark bg-opacity-60 border border-secondary border-opacity-20 font-mono small mb-1.5" style={{ fontSize: '0.72rem' }}>
                            <div className="d-flex justify-content-between text-secondary">
                              <span>Transfer Amount:</span>
                              <span className="text-white">₹{Number(item.amount).toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between text-secondary">
                              <span>Admin Fee ({item.feePercent}%):</span>
                              <span className="text-warning">-₹{Number(item.feeAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between text-secondary">
                              <span>Recipient Receives:</span>
                              <span className="text-success fw-bold">₹{Number(item.netAmount || item.amount).toFixed(2)}</span>
                            </div>
                            {item.note && (
                              <div className="mt-1 pt-1 border-top border-secondary border-opacity-20 text-white-50 fst-italic">
                                "{item.note}"
                              </div>
                            )}
                            {item.rejectReason && (
                              <div className="mt-1 pt-1 border-top border-danger border-opacity-30 text-danger">
                                <i className="bi bi-x-circle me-1"></i>Reason: {item.rejectReason}
                              </div>
                            )}
                          </div>

                          {/* Footer: Date & Time + Request ID */}
                          <div className="d-flex justify-content-between align-items-center text-secondary" style={{ fontSize: '0.68rem' }}>
                            <span className="d-flex align-items-center gap-1">
                              <i className="bi bi-calendar3"></i>
                              {formatTimestamp(item.timestamp || item.createdAt)}
                            </span>

                            {item.id && (
                              <button
                                className="btn btn-link p-0 text-secondary text-decoration-none font-mono d-flex align-items-center gap-1"
                                style={{ fontSize: '0.68rem' }}
                                onClick={() => copyToClipboard(item.id || '')}
                                title="Copy Request ID"
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
              <i className="bi bi-shield-lock-fill text-warning me-1"></i>Protected by Admin Audit
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
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px', width: '90%' }}>
            <div className="modal-content border-0 rounded-4 overflow-hidden shadow-2xl" style={{ background: '#111428', border: '1px solid rgba(250, 204, 21, 0.4)' }}>
              <div className="modal-header border-bottom border-secondary border-opacity-25 py-2.5 px-3.5">
                <h6 className="modal-title fw-bold text-white mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-shield-exclamation text-warning fs-5"></i>
                  Confirm Transfer Request
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
                <p className="text-secondary small mb-2" style={{ fontSize: '0.78rem' }}>
                  To: <strong className="text-white">{recipientData.displayName}</strong> ({recipientData.email})
                </p>

                <div className="p-3 rounded-3 bg-dark text-start font-mono small mb-3" style={{ fontSize: '0.78rem' }}>
                  <div className="d-flex justify-content-between text-secondary mb-1">
                    <span>Coins Amount:</span>
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
                  <div className="mt-2 pt-1 border-top border-secondary border-opacity-20 text-white-50 small" style={{ fontSize: '0.68rem' }}>
                    <i className="bi bi-info-circle text-warning me-1"></i>
                    This creates a pending transfer request for Admin review.
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
                        Creating Request...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg fw-black"></i>
                        Confirm & Submit Request
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
