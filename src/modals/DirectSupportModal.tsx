import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, ref, push, serverTimestamp } from '../firebase';

interface DirectSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectSupportModal: React.FC<DirectSupportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile, currentUser, appSettings } = useAuth();
  const [issueCategory, setIssueCategory] = useState('Payment / Deposit Issue');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const userName = userProfile?.displayName || currentUser?.displayName || 'Gamer';
  const userEmailPhone = currentUser?.email || userProfile?.phoneNumber || 'N/A';
  const userId = currentUser?.uid || 'N/A';
  const gameUid = userProfile?.gameUid || 'Not updated';
  const walletBalance = userProfile?.walletBalance ?? 0;
  const supportPhone = appSettings?.supportContact || '9389660753';

  // Construct WhatsApp support link with auto-populated customer details
  const generateWhatsAppLink = () => {
    const textMessage = `Hello Customer Support,

My Account Details:
• Name: ${userName}
• Game UID: ${gameUid}
• Registered Email/Phone: ${userEmailPhone}
• User ID: ${userId}
• Wallet Balance: ₹${walletBalance}

Issue Category: ${issueCategory}
Query Details: ${ticketMessage.trim() || 'I need help regarding my account.'}`;

    const encodedText = encodeURIComponent(textMessage);
    const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    return `https://wa.me/${formattedPhone}?text=${encodedText}`;
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) {
      setErrorMessage("Please enter your problem description.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ticketRef = ref(db, `support_tickets/${userId}`);
      const newTicket = {
        userId,
        userName,
        userEmailPhone,
        gameUid,
        walletBalance,
        category: issueCategory,
        message: ticketMessage.trim(),
        status: 'Open',
        createdAt: serverTimestamp(),
      };

      const res = await push(ticketRef, newTicket);
      setSuccessTicketId(res.key || `TKT-${Date.now().toString().slice(-6)}`);
      setTicketMessage('');
    } catch (err: any) {
      console.error("Support ticket error:", err);
      setErrorMessage(err?.message || "Failed to submit ticket. Please try WhatsApp support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="support-fullscreen-page show">
      <div className="direct-support-container">
        {/* Native Full Screen Header */}
        <div className="ai-modal-header bg-gradient-dark">
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <button
              type="button"
              className="btn-back-native me-1"
              onClick={onClose}
              aria-label="Back"
            >
              <i className="bi bi-arrow-left fs-4 text-white"></i>
            </button>
            <div className="icon-badge-headset bg-success text-white flex-shrink-0">
              <i className="bi bi-person-headset fs-5"></i>
            </div>
            <div className="text-truncate">
              <h6 className="m-0 fw-bold text-white text-truncate">Direct Support</h6>
              <small className="text-muted text-xs">Helpdesk</small>
            </div>
          </div>
        </div>

        <div className="modal-body-custom p-3">
          {/* Main WhatsApp Quick Redirect Banner */}
          <div className="whatsapp-banner-card mb-3 p-3 rounded-4 shadow-sm text-center">
            <div className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle p-3 mb-2 shadow">
              <i className="bi bi-whatsapp fs-2"></i>
            </div>
            <h5 className="fw-bold text-white mb-1">Direct WhatsApp Support</h5>
            <p className="text-muted text-xs mb-3">
              Click below to instantly open WhatsApp chat with our official customer support team. Your account details & Game UID will be attached automatically!
            </p>
            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp-direct w-100 py-3 rounded-3 fw-bold fs-6 d-flex align-items-center justify-content-center gap-2 shadow-lg"
            >
              <i className="bi bi-whatsapp fs-4"></i>
              <span>Open WhatsApp Chat Now</span>
            </a>
          </div>

          {/* Linked Customer Account Details Card */}
          <div className="account-details-card mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill font-mono">
                <i className="bi bi-check-circle-fill me-1"></i> Account Connected
              </span>
              <span className="badge bg-warning text-dark font-mono">
                Wallet: ₹{walletBalance}
              </span>
            </div>

            <div className="row g-2 text-xs">
              <div className="col-6">
                <span className="text-muted d-block">Customer Name:</span>
                <strong className="text-white font-mono">{userName}</strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">Game UID / Character ID:</span>
                <strong className="text-warning font-mono">{gameUid}</strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">Email / Contact:</span>
                <span className="text-slate-300 font-mono text-truncate d-block">{userEmailPhone}</span>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">Account User ID:</span>
                <span className="text-slate-400 font-mono text-truncate d-block">{userId.slice(0, 10)}...</span>
              </div>
            </div>
          </div>

          {/* Secondary Helpline Options */}
          <div className="d-flex gap-2 mb-3">
            <a
              href={`tel:${supportPhone}`}
              className="btn btn-outline-info btn-sm flex-fill rounded-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1"
            >
              <i className="bi bi-telephone-fill"></i> Call Hotline
            </a>
            <a
              href={`mailto:support@esports.com?subject=Support Request from ${userName}&body=${encodeURIComponent(
                `Name: ${userName}\nGame UID: ${gameUid}\nAccount ID: ${userId}\nIssue: `
              )}`}
              className="btn btn-outline-secondary btn-sm flex-fill rounded-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1"
            >
              <i className="bi bi-envelope-fill"></i> Email Support
            </a>
          </div>

          <div className="divider-or my-3">
            <span>OR SUBMIT IN-APP TICKET</span>
          </div>

          {/* Ticket Submission Form */}
          {successTicketId ? (
            <div className="ticket-success-alert text-center p-3 rounded-3 my-2">
              <i className="bi bi-check-circle-fill text-success fs-1 mb-2 d-block"></i>
              <h6 className="fw-bold text-white mb-1">Ticket Submitted Successfully!</h6>
              <p className="text-muted text-xs mb-2">
                Your ticket ID is <strong className="text-warning font-mono">{successTicketId}</strong>.
                Our team will process your request shortly.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-warning rounded-pill mt-1"
                onClick={() => setSuccessTicketId(null)}
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket}>
              <div className="mb-2">
                <label className="form-label text-xs fw-bold text-slate-300">Select Issue Category</label>
                <select
                  className="form-select auth-input text-xs"
                  value={issueCategory}
                  onChange={(e) => setIssueCategory(e.target.value)}
                >
                  <option value="Payment / Deposit Issue">💳 Payment / Deposit Issue</option>
                  <option value="Room ID & Password Problem">🔑 Room ID & Password Delay</option>
                  <option value="Prize Money & Withdrawal">💸 Prize Money & Withdrawal</option>
                  <option value="Game UID / Profile Correction">🆔 Game UID Update Help</option>
                  <option value="Match Disqualification / Hacker Report">🚨 Report Hacker / Disqualification</option>
                  <option value="Other Account Query">❓ Other Account Query</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label text-xs fw-bold text-slate-300">Describe Your Issue</label>
                <textarea
                  className="form-control auth-input text-xs"
                  rows={3}
                  placeholder="Explain your problem in detail (e.g., UTR number, match name, screenshot details)..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  required
                />
              </div>

              {errorMessage && (
                <div className="alert alert-danger py-1 px-2 text-xs mb-2">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-warning w-100 fw-bold py-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  <>
                    <i className="bi bi-send-check-fill"></i>
                    <span>Submit Direct Ticket</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
