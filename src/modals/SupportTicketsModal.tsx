import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, push, db } from '../firebase';
import { SupportTicket } from '../types';

interface SupportTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportTicketsModal: React.FC<SupportTicketsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'myTickets'>('create');
  const [ticketType, setTicketType] = useState<'hacker' | 'refund' | 'general'>('hacker');
  const [message, setMessage] = useState<string>('');
  const [clipUrl, setClipUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const fetchTickets = async () => {
      setLoadingTickets(true);
      try {
        const ticketRef = ref(db, `supportTickets`);
        const snapshot = await get(ticketRef);
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: SupportTicket[] = Object.entries(val)
            .map(([ticketId, data]: [string, any]) => ({ ticketId, ...data }))
            .filter(t => t.userId === currentUser.uid);
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setMyTickets(list);
        } else {
          setMyTickets([]);
        }
      } catch (err) {
        console.error('Error fetching tickets:', err);
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchTickets();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isSubmitting) return;

    if (!message.trim()) {
      setStatusMsg({ text: 'Please enter details for your ticket request.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const newTicket: Omit<SupportTicket, 'ticketId'> = {
        userId: currentUser.uid,
        userName: userProfile?.displayName || currentUser.email || 'Player',
        userEmail: currentUser.email || undefined,
        ticketType,
        status: 'open',
        message: message.trim(),
        attachment: clipUrl.trim() ? { url: clipUrl.trim(), resourceType: 'image' } : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const res = await push(ref(db, 'supportTickets'), newTicket);
      setMyTickets(prev => [{ ticketId: res.key as string, ...newTicket }, ...prev]);

      setStatusMsg({ text: 'Support ticket submitted! Support team will review and respond.', type: 'success' });
      setTimeout(() => {
        setMessage('');
        setClipUrl('');
        setStatusMsg(null);
        setActiveTab('myTickets');
      }, 1500);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to submit ticket', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ zIndex: 1085, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="card border-0 rounded-4 shadow-2xl text-white p-4 w-100"
        style={{
          maxWidth: '430px',
          background: 'linear-gradient(165deg, #131738 0%, #0a0d22 100%)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-exclamation text-danger fs-4"></i>
            <h5 className="fw-extrabold text-white mb-0 fs-5">Evidence Support Tickets</h5>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onClose}
          ></button>
        </div>

        {/* Tab switch */}
        <div
          className="d-flex p-1 rounded-3 mb-3 gap-1.5"
          style={{ background: '#0a0d20', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <button
            type="button"
            className="flex-fill btn btn-sm border-0 fw-bold py-2 rounded-2 transition-all"
            style={{
              background: activeTab === 'create' ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : 'transparent',
              color: activeTab === 'create' ? '#0f172a' : '#94a3b8'
            }}
            onClick={() => setActiveTab('create')}
          >
            <i className="bi bi-plus-circle me-1"></i> New Ticket
          </button>
          <button
            type="button"
            className="flex-fill btn btn-sm border-0 fw-bold py-2 rounded-2 transition-all"
            style={{
              background: activeTab === 'myTickets' ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : 'transparent',
              color: activeTab === 'myTickets' ? '#0f172a' : '#94a3b8'
            }}
            onClick={() => setActiveTab('myTickets')}
          >
            <i className="bi bi-card-checklist me-1"></i> My Tickets ({myTickets.length})
          </button>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleSubmitTicket}>
            {/* Category selection */}
            <div className="mb-3">
              <label className="form-label extra-small text-secondary fw-bold text-uppercase d-block mb-1.5">
                Issue Category
              </label>
              <div className="d-flex flex-column gap-2">
                <label
                  className={`p-2.5 rounded-3 d-flex align-items-center gap-2.5 cursor-pointer border ${ticketType === 'hacker' ? 'border-danger' : 'border-secondary border-opacity-30'}`}
                  style={{ background: ticketType === 'hacker' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0,0,0,0.3)' }}
                >
                  <input
                    type="radio"
                    name="ticketCategory"
                    checked={ticketType === 'hacker'}
                    onChange={() => setTicketType('hacker')}
                  />
                  <div>
                    <strong className="text-white small d-block">Report Hacker / Cheater</strong>
                    <span className="text-secondary extra-small">Suspected aimbot, speed-hack, or wall-hack</span>
                  </div>
                </label>

                <label
                  className={`p-2.5 rounded-3 d-flex align-items-center gap-2.5 cursor-pointer border ${ticketType === 'refund' ? 'border-warning' : 'border-secondary border-opacity-30'}`}
                  style={{ background: ticketType === 'refund' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0,0,0,0.3)' }}
                >
                  <input
                    type="radio"
                    name="ticketCategory"
                    checked={ticketType === 'refund'}
                    onChange={() => setTicketType('refund')}
                  />
                  <div>
                    <strong className="text-white small d-block">Room Full / Kicked by Host</strong>
                    <span className="text-secondary extra-small">Could not enter match room before start</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label extra-small text-secondary fw-bold text-uppercase d-block mb-1">
                Screenshot / Clip Link
              </label>
              <input
                type="url"
                className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-40"
                placeholder="Google Drive / Imgur / YouTube link"
                value={clipUrl}
                onChange={(e) => setClipUrl(e.target.value)}
              />
              <small className="text-secondary extra-small">Paste link to your evidence clip or screenshot</small>
            </div>

            <div className="mb-3">
              <label className="form-label extra-small text-secondary fw-bold text-uppercase d-block mb-1">
                Incident Description *
              </label>
              <textarea
                className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-40"
                rows={3}
                placeholder="Describe what happened, match name, slot number..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              ></textarea>
            </div>

            {statusMsg && (
              <div
                className={`p-2 rounded-3 small text-center mb-3 ${statusMsg.type === 'success' ? 'bg-success bg-opacity-20 text-success border border-success border-opacity-30' : 'bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30'}`}
              >
                {statusMsg.text}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-warning w-100 py-2.5 fw-extrabold text-dark rounded-3 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}
            </button>
          </form>
        ) : (
          <div className="d-flex flex-column gap-2.5">
            {loadingTickets ? (
              <div className="text-center py-4">
                <div className="spinner-border text-warning spinner-border-sm"></div>
                <p className="text-secondary extra-small mt-1">Loading tickets...</p>
              </div>
            ) : myTickets.length > 0 ? (
              myTickets.map((t) => (
                <div
                  key={t.ticketId}
                  className="p-3 rounded-3 border"
                  style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-1.5">
                    <span className="badge bg-secondary bg-opacity-30 text-light font-mono extra-small">
                      #{t.ticketId.substring(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`badge font-mono extra-small ${t.status === 'open' ? 'bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30' : 'bg-success bg-opacity-20 text-success border border-success border-opacity-30'}`}
                    >
                      {t.status.toUpperCase()}
                    </span>
                  </div>

                  <strong className="text-white small d-block mb-1">
                    {t.ticketType === 'hacker' ? 'Report Hacker/Cheater' : 'Refund Request'}
                  </strong>
                  <p className="text-secondary extra-small mb-1.5" style={{ lineHeight: 1.4 }}>
                    {t.message}
                  </p>
                  <span className="text-muted extra-small font-mono">
                    {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-secondary small">
                No tickets submitted yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
