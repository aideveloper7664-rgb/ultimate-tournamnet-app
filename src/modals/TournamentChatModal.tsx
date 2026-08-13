import React, { useEffect, useState, useRef } from 'react';
import { Tournament, ChatMessage, ChatReplyContext } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, useMotionValue, useTransform } from 'motion/react';
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
import { notifyMessage } from '../utils/androidBridge';

interface TournamentChatModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
}

// SwipeToReply component for swipe-to-reply functionality
const SwipeToReply: React.FC<{ children: React.ReactNode; onReply: () => void }> = ({ children, onReply }) => {
  const x = useMotionValue(0);
  const dragLimit = 70;
  const iconOpacity = useTransform(x, [0, dragLimit - 20], [0, 1]);
  const iconScale = useTransform(x, [0, dragLimit], [0.6, 1.15]);
  const iconColor = useTransform(x, [0, dragLimit], ['#475569', '#10b981']);

  const handleDragEnd = (_event: any, info: any) => {
    if (info.offset.x > 45) {
      onReply();
    }
  };

  return (
    <div className="position-relative d-flex align-items-center" style={{ overflow: 'visible', maxWidth: '100%' }}>
      {/* Hidden reply icon behind the message that reveals upon swiping right */}
      <motion.div
        style={{
          position: 'absolute',
          left: '12px',
          opacity: iconOpacity,
          scale: iconScale,
          color: iconColor,
          zIndex: 0,
          pointerEvents: 'none',
        }}
        className="d-flex align-items-center justify-content-center"
      >
        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <i className="bi bi-reply-fill text-success" style={{ fontSize: '1.1rem' }}></i>
        </div>
      </motion.div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: dragLimit }}
        dragSnapToOrigin={true}
        dragElastic={{ left: 0, right: 0.25 }}
        style={{ x, zIndex: 1, maxWidth: '100%' }}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
};

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

    const senderName = messageData.displayName;
    const messageText = messageData.message;

    try {
      await push(ref(db, `chats/${tournament.id}`), messageData);
      notifyMessage(senderName, messageText);
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
    <div className="world-chat-fullscreen" style={{ zIndex: 10050 }}>
      {/* Premium Header */}
      <div className="world-chat-app-header" style={{ background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)' }}>
        <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
          <button className="world-chat-back-btn" onClick={onClose} title="Back">
            <i className="bi bi-arrow-left"></i>
          </button>
          
          <div className="position-relative flex-shrink-0">
            <div className="world-chat-header-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <i className="bi bi-controller"></i>
            </div>
            <span className="world-chat-online-dot"></span>
          </div>

          <div className="text-truncate">
            <div className="world-chat-title-row">
              <span className="world-chat-title text-truncate" style={{ maxWidth: '180px' }}>{tournament.name || 'Tournament Chat'}</span>
              <span className="world-chat-live-tag" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                <span className="pulse-beacon" style={{ background: '#34d399' }}></span>ROOM
              </span>
            </div>
            <div className="world-chat-subtitle">
              {isJoined ? 'You are in this tournament' : 'Spectator Mode'}
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center flex-shrink-0">
          <button className="world-chat-header-action" onClick={onClose} title="Close Chat">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      {/* Main Chat Feed */}
      <div className="world-chat-feed" ref={chatMessagesRef}>
        <div className="world-chat-welcome-banner" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div className="banner-icon">
            <i className="bi bi-trophy-fill text-success"></i>
          </div>
          <div className="banner-text">
            <strong>{tournament.name || 'Tournament'} Lobby</strong>
            <div className="text-secondary">Coordinate with your opponents and team here.</div>
          </div>
        </div>

        {loading && messages.length === 0 ? (
          <div className="world-chat-loading">
            <div className="spinner-border text-success" role="status"></div>
            <span>Connecting to tournament feed...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="world-chat-empty">
            <i className="bi bi-chat-dots-fill text-success opacity-50"></i>
            <h5>No messages yet</h5>
            <p>Be the first to say hi to your opponents!</p>
          </div>
        ) : (
          <div className="world-chat-messages-wrapper">
            {messages.map((msg, idx) => {
              const isMy = msg.uid === currentUser?.uid;
              const senderName = msg.displayName || 'Gamer';

              return (
                <div
                  key={msg.id || idx}
                  className={`world-chat-row ${isMy ? 'row-outgoing' : 'row-incoming'}`}
                >
                  {!isMy && (
                    <div
                      className="world-chat-user-avatar"
                      style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
                    >
                      {(senderName.substring(0, 2)).toUpperCase()}
                    </div>
                  )}

                  <SwipeToReply onReply={() => handleBubbleClick(msg)}>
                    <div
                      className={`world-chat-bubble ${isMy ? 'bubble-outgoing' : 'bubble-incoming'}`}
                      onClick={() => handleBubbleClick(msg)}
                      title="Swipe right to reply"
                    >
                      {!isMy && (
                        <div className="bubble-sender-name">
                          <span style={{ color: '#34d399' }}>{senderName}</span>
                          <span className="sender-badge" style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#6ee7b7' }}>PLAYER</span>
                        </div>
                      )}

                      {msg.replyTo && (
                        <div className="bubble-reply-preview" style={{ borderLeftColor: '#34d399' }}>
                          <div className="reply-sender">{msg.replyTo.originalSenderName}</div>
                          <div className="reply-msg">{msg.replyTo.originalMessage}</div>
                        </div>
                      )}

                      <div className="bubble-text">{msg.message}</div>

                      <div className="bubble-footer">
                        <span className="bubble-time">{formatFullDateTime(msg.timestamp)}</span>
                        {isMy && (
                          <i className="bi bi-check2-all text-info ms-1" style={{ fontSize: '0.85rem' }}></i>
                        )}
                      </div>
                    </div>
                  </SwipeToReply>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Context Bar */}
      {replyContext && (
        <div className="world-chat-reply-bar" style={{ background: '#064e3b', borderTop: '1px solid #047857' }}>
          <div className="reply-info">
            <i className="bi bi-reply-fill text-success me-2"></i>
            <span className="fw-bold text-success me-1">Replying to {replyContext.originalSenderName}:</span>
            <span className="text-light text-truncate">{replyContext.originalMessage}</span>
          </div>
          <button
            type="button"
            className="reply-cancel-btn"
            onClick={() => setReplyContext(null)}
          >
            <i className="bi bi-x-circle-fill text-white"></i>
          </button>
        </div>
      )}

      {/* Bottom App Input Bar */}
      <div className="world-chat-input-bar">
        <form className="world-chat-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="world-chat-input"
            placeholder={isJoined ? "Type a message..." : "Join tournament to chat"}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={!isJoined}
            required
            autoComplete="off"
            style={{ borderRadius: '24px', paddingLeft: '20px' }}
          />
          <button
            type="submit"
            className="world-chat-send-btn"
            disabled={!messageInput.trim() || !isJoined}
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: '#fff' }}
          >
            <i className="bi bi-send-fill"></i>
          </button>
        </form>
      </div>
    </div>
  );
};
