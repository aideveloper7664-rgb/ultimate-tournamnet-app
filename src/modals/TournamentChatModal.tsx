import React, { useEffect, useState, useRef } from 'react';
import { Tournament, ChatMessage, ChatReplyContext } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ref,
  push,
  query,
  limitToLast,
  onChildAdded,
  get,
  db,
  serverTimestamp
} from '../firebase';
import { formatFullDateTime } from '../utils/helpers';

interface TournamentChatModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TournamentChatModal: React.FC<TournamentChatModalProps> = ({
  tournament,
  isOpen,
  onClose
}) => {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [replyContext, setReplyContext] = useState<ChatReplyContext | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !tournament || !currentUser) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setMessages([]);

    const chatQuery = query(ref(db, `chats/${tournament.id}`), limitToLast(50));

    get(chatQuery).then((snap) => {
      if (!snap.exists()) setLoading(false);
    }).catch((err) => {
      console.warn("Tournament chat read error:", err);
      setLoading(false);
    });

    const unsubscribe = onChildAdded(
      chatQuery,
      (snapshot) => {
        setLoading(false);
        const val = snapshot.val();
        if (val) {
          setMessages(prev => [{ id: snapshot.key, ...val }, ...prev]);
        }
      },
      (err) => {
        console.warn("Tournament chat listener error:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, tournament, currentUser]);

  if (!isOpen || !tournament) return null;

  const isJoined = !!(currentUser && userProfile?.joinedTournaments?.[tournament.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentUser) return;

    if (!isJoined) {
      alert("You can only chat in tournaments you have joined.");
      return;
    }

    const messageData: any = {
      uid: currentUser.uid,
      displayName: userProfile?.displayName || currentUser.email || 'User',
      message: messageInput.trim(),
      timestamp: serverTimestamp()
    };

    if (replyContext) {
      messageData.replyTo = replyContext;
    }

    try {
      await push(ref(db, `chats/${tournament.id}`), messageData);
      setMessageInput('');
      setReplyContext(null);
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert(`Could not send message: ${err.message}`);
    }
  };

  const handleBubbleClick = (msg: ChatMessage) => {
    let msgText = msg.message;
    if (msgText.length > 50) msgText = msgText.substring(0, 50) + '...';
    setReplyContext({
      originalSenderName: msg.displayName || 'User',
      originalMessage: msgText
    });
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{tournament.name || 'Tournament'} - Chat</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-0 d-flex flex-column" style={{ minHeight: '350px' }}>
            <div id="chatMessagesEl" ref={chatMessagesRef} className="flex-grow-1">
              {loading && messages.length === 0 ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-accent"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center p-5 text-secondary">
                  No messages yet. Be the first to say hi!
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMy = msg.uid === currentUser?.uid;

                  return (
                    <div
                      key={msg.id || idx}
                      className={`chat-bubble ${isMy ? 'my-message' : 'other-message'}`}
                      onClick={() => handleBubbleClick(msg)}
                    >
                      {msg.replyTo && (
                        <div className="reply-quote-block">
                          <span className="sender-name">{msg.replyTo.originalSenderName}</span>
                          <p>{msg.replyTo.originalMessage}</p>
                        </div>
                      )}

                      {!isMy && <span className="sender-name">{msg.displayName || 'User'}</span>}
                      {msg.message}
                      <span className="msg-time">{formatFullDateTime(msg.timestamp)}</span>
                    </div>
                  );
                })
              )}
            </div>

            {replyContext && (
              <div id="chatReplyContextEl">
                <div className="reply-context-header">
                  Replying to <strong>{replyContext.originalSenderName}</strong>
                  <button
                    type="button"
                    id="cancelReplyBtn"
                    onClick={() => setReplyContext(null)}
                  >
                    &times;
                  </button>
                </div>
                <p>{replyContext.originalMessage}</p>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <form id="chatForm" className="d-flex w-100 gap-2" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="form-control"
                placeholder={isJoined ? "Type a message..." : "Join tournament to chat"}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={!isJoined}
                required
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn btn-custom btn-custom-primary"
                disabled={!isJoined}
              >
                <i className="bi bi-send-fill"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
