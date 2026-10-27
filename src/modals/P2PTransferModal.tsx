import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface P2PTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TransferItem {
  id: string;
  senderUid: string;
  senderName: string;
  senderEmail?: string;
  senderGameUid?: string;
  receiverUid: string;
  receiverName: string;
  receiverEmail?: string;
  receiverGameUid?: string;
  amount: number;
  feePercent?: number;
  feeAmount?: number;
  totalHold?: number;
  status: 'pending' | 'completed' | 'rejected';
  note?: string;
  createdAt: number;
}

export const P2PTransferModal: React.FC<P2PTransferModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, userProfile, reloadUserProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'send' | 'req'>('send');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feePercent, setFeePercent] = useState<number>(10);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Balance from logged-in user's wallet
  const balance = Number(userProfile?.balance ?? 0);

  // Fetch fee percent from server
  useEffect(() => {
    let isMounted = true;
    fetch('/api/transfers/fee')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data && typeof data.feePercent === 'number') {
          setFeePercent(data.feePercent);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch fee from server, fallback to 10%:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch transfer requests from server
  const fetchTransfers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'x-user-id': currentUser.uid,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/transfers', { headers });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.transfers)) {
        setTransfers(data.transfers);
      }
    } catch (err) {
      console.warn('Failed to fetch transfers from server:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      fetchTransfers();
      setError('');
    }
  }, [isOpen, fetchTransfers]);

  // Live amount for submit button label
  const numericAmount = parseFloat(amount) || 0;
  const liveAmountFormatted = numericAmount > 0 ? numericAmount.toFixed(2) : '0.00';

  // MAX button
  const handleMax = () => {
    if (balance <= 0) {
      setAmount('0');
      setError('Insufficient wallet balance');
      return;
    }
    setAmount(Math.floor(balance).toString());
    setError('');
  };

  // Quick chips addition
  const handleAddAmount = (addVal: number) => {
    const current = parseFloat(amount) || 0;
    const newVal = current + addVal;
    setAmount(newVal.toString());
    setError('');
  };

  // Submit transfer request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setError('Please log in to transfer coins');
      return;
    }

    const trimmedTo = recipient.trim();
    if (!trimmedTo) {
      setError('Recipient is required');
      return;
    }

    if (isNaN(numericAmount) || numericAmount < 10) {
      setError('Minimum transfer amount is 10');
      return;
    }

    if (numericAmount > balance) {
      setError('Amount cannot exceed balance');
      return;
    }

    // Check self-transfer on client
    if (
      trimmedTo === currentUser.uid ||
      (currentUser.email && trimmedTo.toLowerCase() === currentUser.email.toLowerCase()) ||
      (userProfile?.gameUid && trimmedTo.toLowerCase() === userProfile.gameUid.toLowerCase())
    ) {
      setError('You cannot transfer coins to yourself');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await currentUser.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.uid,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipient: trimmedTo,
          amount: numericAmount,
          note: note.trim(),
          sender: {
            uid: currentUser.uid,
            displayName: userProfile?.displayName,
            email: currentUser.email,
            gameUid: userProfile?.gameUid,
            balance: balance,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Transfer request failed');
        setIsSubmitting(false);
        return;
      }

      // Success: refresh balance, clear form, switch to Transfer Requests tab
      await reloadUserProfile().catch(() => {});
      setRecipient('');
      setAmount('');
      setNote('');
      setError('');
      setIsSubmitting(false);
      setActiveTab('req');
      await fetchTransfers();
    } catch (err: any) {
      console.error('P2P Transfer submit error:', err);
      setError('Network error. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Filtered requests
  const allCount = transfers.length;
  const pendingCount = transfers.filter((t) => t.status === 'pending').length;
  const completedCount = transfers.filter((t) => t.status === 'completed').length;

  const filteredRequests = useMemo(() => {
    return transfers.filter((item) => {
      if (filter === 'pending') return item.status === 'pending';
      if (filter === 'completed') return item.status === 'completed';
      return true;
    });
  }, [transfers, filter]);

  const formatDate = (ts: number | undefined) => {
    if (!ts) return 'Recent';
    const d = new Date(ts);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="p2p-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <style>{`
        .p2p-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 18, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 1060;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow-y: auto;
        }
        .p2p-card-root {
          --bg: #090b16;
          --card: #11142a;
          --field: #1a1e36;
          --line: #262b49;
          --fg: #f2f4fb;
          --muted: #8d93b3;
          --accent: #ffc107;
          --accent-ink: #1a1400;
          --danger: #ff6b6b;
          --ok: #3ddc84;
          --font-display: "Sora", "Segoe UI", system-ui, sans-serif;
          --font-body: "DM Sans", "Segoe UI", system-ui, sans-serif;
          color-scheme: dark;
          font-family: var(--font-body);
          font-size: 15px;
          line-height: 1.45;
          color: var(--fg);
          width: 100%;
          max-width: 420px;
          margin: auto;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75);
        }
        .p2p-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .p2p-card-root h1 {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 600;
          margin: 0;
          color: var(--fg);
          text-wrap: balance;
        }
        .p2p-close-btn {
          background: transparent;
          border: 0;
          color: var(--muted);
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color .15s;
        }
        .p2p-close-btn:hover {
          color: var(--fg);
        }
        .p2p-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          background: var(--bg);
          padding: 5px;
          border-radius: 14px;
        }
        .p2p-tab {
          font: inherit;
          font-weight: 600;
          color: var(--muted);
          background: transparent;
          border: 0;
          border-radius: 10px;
          padding: 11px 8px;
          cursor: pointer;
          transition: background .15s, color .15s;
          text-align: center;
        }
        .p2p-tab[aria-selected="true"] {
          background: var(--accent);
          color: var(--accent-ink);
        }
        .p2p-tab:not([aria-selected="true"]):hover {
          color: var(--fg);
        }
        .p2p-card-root :focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .p2p-balance-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          background: var(--field);
          border: 1px solid var(--line);
          border-radius: 14px;
        }
        .p2p-balance-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .p2p-balance-val {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--fg);
          margin-top: 2px;
        }
        .p2p-fee-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 193, 7, .12);
          color: var(--accent);
          border: 1px solid rgba(255, 193, 7, .3);
          white-space: nowrap;
        }
        .p2p-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        }
        .p2p-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .p2p-field label {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
        }
        .p2p-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .p2p-input-wrap input,
        .p2p-field input {
          width: 100%;
          font: inherit;
          color: var(--fg);
          background: var(--field);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 11px 14px;
          transition: border-color .15s;
          outline: none;
        }
        .p2p-input-wrap input:focus,
        .p2p-field input:focus {
          border-color: var(--accent);
        }
        .p2p-amount-input {
          font-family: var(--font-display);
          font-weight: 600;
          padding-right: 64px !important;
        }
        .p2p-max-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          font: inherit;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .04em;
          color: var(--accent);
          background: rgba(255, 193, 7, .12);
          border: 1px solid rgba(255, 193, 7, .3);
          border-radius: 8px;
          padding: 4px 10px;
          cursor: pointer;
        }
        .p2p-max-btn:hover {
          background: rgba(255, 193, 7, .2);
        }
        .p2p-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .p2p-chip {
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          color: var(--fg);
          background: var(--field);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 6px 12px;
          cursor: pointer;
          transition: border-color .15s, background .15s;
        }
        .p2p-chip:hover {
          border-color: var(--accent);
        }
        .p2p-btn-primary {
          font: inherit;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 14px;
          color: var(--accent-ink);
          background: var(--accent);
          border: 0;
          border-radius: 12px;
          padding: 13px 18px;
          cursor: pointer;
          transition: opacity .15s, transform .05s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .p2p-btn-primary:hover:not(:disabled) {
          opacity: .92;
        }
        .p2p-btn-primary:active:not(:disabled) {
          transform: scale(.99);
        }
        .p2p-btn-primary:disabled {
          opacity: .45;
          cursor: not-allowed;
        }
        .p2p-error {
          color: var(--danger);
          font-size: 12px;
          font-weight: 500;
          margin: 0;
          min-height: 16px;
        }
        .p2p-filters {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .p2p-filter {
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          background: var(--field);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 6px 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: all .15s;
        }
        .p2p-filter[aria-selected="true"] {
          background: var(--fg);
          color: var(--bg);
          border-color: var(--fg);
        }
        .p2p-request-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          list-style: none;
          margin: 0;
          padding: 0;
          max-height: 380px;
          overflow-y: auto;
        }
        .p2p-request-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--field);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px 14px;
        }
        .p2p-request-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .p2p-request-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--fg);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .p2p-request-sub {
          font-size: 11px;
          color: var(--muted);
        }
        .p2p-request-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          flex-shrink: 0;
        }
        .p2p-request-amount {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 14px;
          color: var(--fg);
        }
        .p2p-status-pill {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .p2p-status-pending {
          background: rgba(255, 193, 7, .15);
          color: var(--accent);
        }
        .p2p-status-completed {
          background: rgba(61, 220, 132, .15);
          color: var(--ok);
        }
        .p2p-status-rejected {
          background: rgba(255, 107, 107, .15);
          color: var(--danger);
        }
        .p2p-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 40px 16px;
          gap: 14px;
        }
        .p2p-empty-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--field);
          border: 1px solid var(--line);
          display: grid;
          place-items: center;
          color: var(--muted);
        }
        .p2p-empty-title {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 15px;
          margin: 0;
          color: var(--fg);
        }
        .p2p-btn-secondary {
          font: inherit;
          font-weight: 600;
          font-size: 12px;
          color: var(--fg);
          background: var(--field);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 8px 14px;
          cursor: pointer;
        }
        .p2p-btn-secondary:hover {
          border-color: var(--accent);
        }
      `}</style>

      <div
        className="p2p-card-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p2p-header">
          <h1 id="modal-title">P2P Send &amp; Receive Coins</h1>
          <button
            type="button"
            className="p2p-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p2p-tabs" role="tablist">
          <button
            type="button"
            className="p2p-tab"
            id="tab-send"
            role="tab"
            aria-selected={activeTab === 'send'}
            aria-controls="panel-send"
            onClick={() => setActiveTab('send')}
          >
            Send Coins
          </button>
          <button
            type="button"
            className="p2p-tab"
            id="tab-req"
            role="tab"
            aria-selected={activeTab === 'req'}
            aria-controls="panel-req"
            onClick={() => setActiveTab('req')}
          >
            Transfer Requests
          </button>
        </div>

        {/* Panel 1: Send Coins */}
        <div
          id="panel-send"
          role="tabpanel"
          aria-labelledby="tab-send"
          hidden={activeTab !== 'send'}
        >
          <div className="p2p-balance-row">
            <div>
              <div className="p2p-balance-label">Available Balance</div>
              <div className="p2p-balance-val" id="bal-display">
                ₹{balance.toFixed(2)}
              </div>
            </div>
            <div className="p2p-fee-badge">{feePercent}% Transfer Fee</div>
          </div>

          <form
            id="send-form"
            className="p2p-form"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="p2p-field">
              <label htmlFor="to">Recipient</label>
              <div className="p2p-input-wrap">
                <input
                  type="text"
                  id="to"
                  name="to"
                  placeholder="UID, Email or Game ID"
                  autoComplete="off"
                  required
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    if (error) setError('');
                  }}
                />
              </div>
            </div>

            <div className="p2p-field">
              <label htmlFor="amt">Amount</label>
              <div className="p2p-input-wrap">
                <input
                  type="number"
                  id="amt"
                  name="amt"
                  className="p2p-amount-input"
                  placeholder="Min 10"
                  min="10"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (error) setError('');
                  }}
                />
                <button
                  type="button"
                  className="p2p-max-btn"
                  id="btn-max"
                  onClick={handleMax}
                >
                  MAX
                </button>
              </div>
              <div className="p2p-chips" aria-label="Quick amount additions">
                <button
                  type="button"
                  className="p2p-chip"
                  data-add="50"
                  onClick={() => handleAddAmount(50)}
                >
                  +50
                </button>
                <button
                  type="button"
                  className="p2p-chip"
                  data-add="100"
                  onClick={() => handleAddAmount(100)}
                >
                  +100
                </button>
                <button
                  type="button"
                  className="p2p-chip"
                  data-add="200"
                  onClick={() => handleAddAmount(200)}
                >
                  +200
                </button>
                <button
                  type="button"
                  className="p2p-chip"
                  data-add="500"
                  onClick={() => handleAddAmount(500)}
                >
                  +500
                </button>
                <button
                  type="button"
                  className="p2p-chip"
                  data-add="1000"
                  onClick={() => handleAddAmount(1000)}
                >
                  +1000
                </button>
              </div>
            </div>

            <div className="p2p-field">
              <label htmlFor="note">
                Message{' '}
                <span style={{ fontWeight: 400, color: 'var(--muted)' }}>
                  (Optional)
                </span>
              </label>
              <input
                type="text"
                id="note"
                name="note"
                placeholder="Optional"
                maxLength={80}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <p className="p2p-error" id="err" role="alert" aria-live="polite">
              {error}
            </p>

            <button
              type="submit"
              className="p2p-btn-primary"
              id="btn-submit"
              disabled={isSubmitting || numericAmount <= 0}
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <span>Submit Transfer Request (₹{liveAmountFormatted})</span>
              )}
            </button>
          </form>
        </div>

        {/* Panel 2: Transfer Requests */}
        <div
          id="panel-req"
          role="tabpanel"
          aria-labelledby="tab-req"
          hidden={activeTab !== 'req'}
        >
          <div className="p2p-filters" role="tablist" aria-label="Filter requests">
            <button
              type="button"
              className="p2p-filter"
              data-filter="all"
              aria-selected={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All ({allCount})
            </button>
            <button
              type="button"
              className="p2p-filter"
              data-filter="pending"
              aria-selected={filter === 'pending'}
              onClick={() => setFilter('pending')}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              className="p2p-filter"
              data-filter="completed"
              aria-selected={filter === 'completed'}
              onClick={() => setFilter('completed')}
            >
              Completed ({completedCount})
            </button>
          </div>

          <div style={{ marginTop: '14px' }}>
            {filteredRequests.length > 0 ? (
              <ul className="p2p-request-list" id="req-list">
                {filteredRequests.map((item) => {
                  const isSender = item.senderUid === currentUser?.uid;
                  const otherParty = isSender
                    ? item.receiverName || item.receiverEmail || item.receiverUid
                    : item.senderName || item.senderEmail || item.senderUid;

                  return (
                    <li className="p2p-request-item" key={item.id}>
                      <div className="p2p-request-meta">
                        <div className="p2p-request-title">
                          {isSender ? `To: ${otherParty}` : `From: ${otherParty}`}
                        </div>
                        <div className="p2p-request-sub">
                          {formatDate(item.createdAt)}
                          {item.note ? ` • ${item.note}` : ''}
                        </div>
                      </div>
                      <div className="p2p-request-right">
                        <div className="p2p-request-amount">
                          {isSender
                            ? `-₹${Number(item.amount).toFixed(2)}`
                            : `+₹${Number(item.amount).toFixed(2)}`}
                        </div>
                        <span
                          className={`p2p-status-pill p2p-status-${item.status}`}
                        >
                          {item.status === 'pending'
                            ? 'Pending'
                            : item.status === 'completed'
                            ? 'Completed'
                            : 'Rejected'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p2p-empty" id="empty-state">
                <div className="p2p-empty-icon">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </div>
                <p className="p2p-empty-title">No Transfer Requests Found</p>
                <button
                  type="button"
                  className="p2p-btn-secondary"
                  id="empty-send-btn"
                  onClick={() => setActiveTab('send')}
                >
                  Send Coins to Friend
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
