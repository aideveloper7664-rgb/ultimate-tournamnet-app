import React, { useEffect, useState, useRef } from 'react';
import { ChatMessage, ChatReplyContext } from '../types';
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

interface WorldChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_EMOJIS = ['🔥', '🎮', '🏆', '😂', '👍', '❤️', '💯', '🚀'];

// SwipeToReply component for swipe-to-reply functionality
const SwipeToReply: React.FC<{ children: React.ReactNode; onReply: () => void }> = ({ children, onReply }) => {
  const x = useMotionValue(0);
  const dragLimit = 70;
  const iconOpacity = useTransform(x, [0, dragLimit - 20], [0, 1]);
  const iconScale = useTransform(x, [0, dragLimit], [0.6, 1.15]);
  const iconColor = useTransform(x, [0, dragLimit], ['#475569', '#f59e0b']);

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
        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <i className="bi bi-reply-fill text-warning" style={{ fontSize: '1.1rem' }}></i>
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

export const WorldChatModal: React.FC<WorldChatModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [replyContext, setReplyContext] = useState<ChatReplyContext | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !currentUser) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setMessages([]);

    // Listen strictly to independent global world chat node
    const chatQuery = query(ref(db, 'chats/world'), limitToLast(120));

    get(chatQuery).then((snap) => {
      if (!snap.exists()) setLoading(false);
    }).catch((err) => {
      console.warn("World chat read error:", err);
      setLoading(false);
    });

    const unsubscribe = onChildAdded(
      chatQuery,
      (snapshot) => {
        setLoading(false);
        const val = snapshot.val();
        if (val) {
          setMessages(prev => {
            if (prev.some(m => m.id === snapshot.key)) return prev;
            return [...prev, { id: snapshot.key, ...val }];
          });
        }
      },
      (err) => {
        console.warn("World chat listener error:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !currentUser) return;

    const messageText = messageInput.trim();
    setMessageInput('');

    const messageData: any = {
      uid: currentUser.uid,
      displayName: userProfile?.displayName || currentUser.email?.split('@')[0] || 'Gamer',
      message: messageText,
      timestamp: serverTimestamp()
    };

    if (replyContext) {
      messageData.replyTo = replyContext;
    }

    const senderName = messageData.displayName;

    try {
      await push(ref(db, 'chats/world'), messageData);
      notifyMessage(senderName, messageText);
      setReplyContext(null);
      setShowEmojiPicker(false);
    } catch (err: any) {
      console.error("Error sending message to World Chat:", err);
      alert(`Could not send message: ${err.message}`);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
  };

  const handleBubbleClick = (msg: ChatMessage) => {
    let msgText = msg.message;
    if (msgText.length > 50) msgText = msgText.substring(0, 50) + '...';
    setReplyContext({
      originalSenderName: msg.displayName || 'Gamer',
      originalMessage: msgText
    });
  };

  const getAvatarInitials = (name?: string) => {
    if (!name) return 'G';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRandomAvatarBg = (uid?: string) => {
    const colors = [
      'linear-gradient(135deg, #FF512F, #DD2476)',
      'linear-gradient(135deg, #12C2E9, #C471ED, #F64F59)',
      'linear-gradient(135deg, #11998E, #38EF7D)',
      'linear-gradient(135deg, #8A2387, #E94057, #F27121)',
      'linear-gradient(135deg, #4776E6, #8E54E9)',
      'linear-gradient(135deg, #F857A6, #FF5858)'
    ];
    if (!uid) return colors[0];
    let charCodeSum = 0;
    for (let i = 0; i < uid.length; i++) {
      charCodeSum += uid.charCodeAt(i);
    }
    return colors[charCodeSum % colors.length];
  };

  return (
    <div className="world-chat-fullscreen">
      {/* Real App Header */}
      <div className="world-chat-app-header">
        <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
          <button className="world-chat-back-btn" onClick={onClose} title="Back to App">
            <i className="bi bi-arrow-left"></i>
          </button>
          
          <div className="position-relative flex-shrink-0">
            <div className="world-chat-header-avatar">
              <i className="bi bi-globe2"></i>
            </div>
            <span className="world-chat-online-dot"></span>
          </div>

          <div className="text-truncate">
            <div className="world-chat-title-row">
              <span className="world-chat-title">World Chat</span>
              <span className="world-chat-live-tag">
                <span className="pulse-beacon"></span>GLOBAL
              </span>
            </div>
            <div className="world-chat-subtitle">
              Public Lounge • Online Community
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
          <button
            className="world-chat-header-action"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emoji Quick Select"
          >
            <i className="bi bi-emoji-smile"></i>
          </button>
          <button className="world-chat-header-action" onClick={onClose} title="Close Chat">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      {/* Main Chat Feed */}
      <div className="world-chat-feed" ref={chatContainerRef}>
        <div className="world-chat-welcome-banner">
          <div className="banner-icon">
            <i className="bi bi-shield-check text-warning"></i>
          </div>
          <div className="banner-text">
            <strong>Welcome to Official Global Community Chat!</strong>
            <div>Be respectful to fellow gamers. Keep chats friendly and fair.</div>
          </div>
        </div>

        {loading && messages.length === 0 ? (
          <div className="world-chat-loading">
            <div className="spinner-border text-warning" role="status"></div>
            <span>Connecting to live feed...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="world-chat-empty">
            <i className="bi bi-chat-left-dots-fill"></i>
            <h5>No messages yet</h5>
            <p>Start the conversation! Say hi to gamers around the world.</p>
          </div>
        ) : (
          <div className="world-chat-messages-wrapper">
            <div className="world-chat-date-divider">
              <span>TODAY</span>
            </div>

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
                      style={{ background: getRandomAvatarBg(msg.uid) }}
                    >
                      {getAvatarInitials(senderName)}
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
                          <span>{senderName}</span>
                          <span className="sender-badge">GAMER</span>
                        </div>
                      )}

                      {msg.replyTo && (
                        <div className="bubble-reply-preview">
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
            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* Emoji Quick Picker Strip */}
      {showEmojiPicker && (
        <div className="world-chat-emoji-strip">
          <span className="strip-title">Quick Emojis:</span>
          {QUICK_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              type="button"
              className="emoji-chip"
              onClick={() => handleAddEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Reply Context Bar */}
      {replyContext && (
        <div className="world-chat-reply-bar">
          <div className="reply-info">
            <i className="bi bi-reply-fill text-warning me-2"></i>
            <span className="fw-bold text-warning me-1">Replying to {replyContext.originalSenderName}:</span>
            <span className="text-light text-truncate">{replyContext.originalMessage}</span>
          </div>
          <button
            type="button"
            className="reply-cancel-btn"
            onClick={() => setReplyContext(null)}
          >
            <i className="bi bi-x-circle-fill"></i>
          </button>
        </div>
      )}

      {/* Bottom App Input Bar */}
      <div className="world-chat-input-bar">
        <form className="world-chat-form" onSubmit={handleSendMessage}>
          <button
            type="button"
            className="input-tool-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <i className="bi bi-emoji-smile-fill"></i>
          </button>

          <input
            type="text"
            className="world-chat-input"
            placeholder="Type a message to World Chat..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            required
            autoComplete="off"
          />

          <button
            type="submit"
            className="world-chat-send-btn"
            disabled={!messageInput.trim()}
          >
            <i className="bi bi-send-fill"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

