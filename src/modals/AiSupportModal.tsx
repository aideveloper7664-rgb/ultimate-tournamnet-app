import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface AiSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDirectSupport: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  actionButton?: {
    label: string;
    action: () => void;
  };
}

export const AiSupportModal: React.FC<AiSupportModalProps> = ({
  isOpen,
  onClose,
  onOpenDirectSupport,
}) => {
  const { userProfile, currentUser, appSettings, showSection } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initial welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const userName = userProfile?.displayName || currentUser?.displayName || 'Gamer';
      setMessages([
        {
          id: 'welcome-1',
          sender: 'ai',
          text: `👋 Namaste ${userName}! Main aapka **AI Customer Support Assistant** hoon. \n\nMain aapki eSports tournaments, Room ID & Password, Wallet Deposit, Withdrawal aur Game UID ke regarding 24/7 help kar sakta hoon. Aap mujhse koi bhi sawal pooch sakte hain!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, userProfile, currentUser]);

  // Auto scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const quickQuestions = [
    "🎮 Room ID & Pass kab milega?",
    "💰 Money Deposit add nahi hua?",
    "💸 Withdrawal process & min limit?",
    "🆔 Game UID kaise update kare?",
    "⚔️ Match kaise join kare?",
    "🎧 Human Support se baat karni hai"
  ];

  // WhatsApp Direct Redirect helper
  const handleDirectWhatsAppRedirect = () => {
    const userName = userProfile?.displayName || currentUser?.displayName || 'Gamer';
    const userEmailPhone = currentUser?.email || userProfile?.phoneNumber || 'N/A';
    const userId = currentUser?.uid || 'N/A';
    const gameUid = userProfile?.gameUid || 'Not updated';
    const walletBalance = userProfile?.walletBalance ?? 0;
    const supportPhone = appSettings?.supportContact || '9389660753';

    const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const textMessage = `Hello Customer Support,

My Account Details:
• Name: ${userName}
• Game UID: ${gameUid}
• Contact: ${userEmailPhone}
• User ID: ${userId}
• Wallet Balance: ₹${walletBalance}

I need direct help regarding my account.`;

    const link = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMessage)}`;
    window.open(link, '_blank');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    try {
      // Call Gemini API server endpoint
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newHistory.slice(-6),
          userProfile: {
            displayName: userProfile?.displayName || currentUser?.displayName || 'Gamer',
            gameUid: userProfile?.gameUid || 'Not updated',
            walletBalance: userProfile?.walletBalance ?? 0,
          }
        })
      });

      const data = await res.json();
      const aiResponseText = data?.text || generateAiAnswer(text).text;

      // Check if response contains key action triggers
      let actionBtn: { label: string; action: () => void } | undefined = undefined;
      const lowerResp = aiResponseText.toLowerCase();

      if (lowerResp.includes('room id') || lowerResp.includes('my contest') || lowerResp.includes('joined match')) {
        actionBtn = {
          label: 'View My Contests',
          action: () => {
            onClose();
            showSection('my-contests-section');
          }
        };
      } else if (lowerResp.includes('recharge') || lowerResp.includes('deposit') || lowerResp.includes('add money')) {
        actionBtn = {
          label: 'Go to Recharge Page',
          action: () => {
            onClose();
            showSection('recharge-section');
          }
        };
      } else if (lowerResp.includes('wallet') || lowerResp.includes('withdraw')) {
        actionBtn = {
          label: 'Open Wallet',
          action: () => {
            onClose();
            showSection('wallet-section');
          }
        };
      } else if (lowerResp.includes('profile') || lowerResp.includes('game uid')) {
        actionBtn = {
          label: 'Go to Profile',
          action: () => {
            onClose();
            showSection('profile-section');
          }
        };
      } else if (lowerResp.includes('whatsapp') || lowerResp.includes('direct support') || lowerResp.includes('human')) {
        actionBtn = {
          label: 'Chat Direct on WhatsApp',
          action: () => handleDirectWhatsAppRedirect()
        };
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionButton: actionBtn
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Gemini API call failed, using fallback generator:", err);
      const fallback = generateAiAnswer(text);
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateAiAnswer = (query: string): ChatMessage => {
    const q = query.toLowerCase();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (q.includes('room id') || q.includes('room') || q.includes('password') || q.includes('pass')) {
      return {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `🔑 **Room ID & Password Rules:**\n\n1. Match start hone se **10 se 15 minute pehle** Room ID & Password app me update ho jata hai.\n2. Aap **My Contests** section me jaakar apne joined match par tap karein aur **"Room ID & Pass"** button par click karke details dekh sakte hain.\n3. SMS/Notification ke zariye bhi alert bheja jata hai. Please match time par ready rahein!`,
        timestamp: timeStr,
        actionButton: {
          label: 'View My Contests',
          action: () => {
            onClose();
            showSection('my-contests-section');
          }
        }
      };
    }

    if (q.includes('deposit') || q.includes('money') || q.includes('recharge') || q.includes('add money') || q.includes('payment')) {
      return {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `💳 **Wallet Deposit & Payment Help:**\n\n• Payment karne ke baad **Transaction UTR/UPI Ref ID** zaroor submit karein.\n• Normal verification me **2-5 minute** lagte hain.\n• Agar 10 min tak coins na milein, toh Direct Support me UTR screenshot ke saath ticket create karein!`,
        timestamp: timeStr,
        actionButton: {
          label: 'Go to Recharge Page',
          action: () => {
            onClose();
            showSection('recharge-section');
          }
        }
      };
    }

    if (q.includes('withdraw') || q.includes('withdrawal') || q.includes('paisa nikale') || q.includes('payout')) {
      const minW = appSettings?.minWithdraw || 50;
      const bal = userProfile?.walletBalance ?? 0;
      return {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `💸 **Withdrawal Rules & Info:**\n\n• Minimum Withdrawal Amount: **₹${minW}**\n• Aapka Current Wallet Balance: **₹${bal}**\n• Payments Instant UPI / Paytm / PhonePe / Bank transfer dwara bhej diye jaate hain (Max 1 hour processing time).\n• Ensure aapka Game UID aur Payment UPI correctly filled hai.`,
        timestamp: timeStr,
        actionButton: {
          label: 'Open Wallet',
          action: () => {
            onClose();
            showSection('wallet-section');
          }
        }
      };
    }

    if (q.includes('game uid') || q.includes('uid') || q.includes('character id') || q.includes('bgmi id')) {
      const gameUid = userProfile?.gameUid || 'Not updated yet';
      return {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `🎯 **Game UID / In-Game Name:**\n\n• Current Game UID: **${gameUid}**\n• Tournament me join hone se pehle sahi Game UID add hona zaroori hai taaki Room me slot assign ho sake aur winning prize credit ho sake.\n• Aap Profile section me jaakar UID edit kar sakte hain.`,
        timestamp: timeStr,
        actionButton: {
          label: 'Go to Profile',
          action: () => {
            onClose();
            showSection('profile-section');
          }
        }
      };
    }

    if (q.includes('human') || q.includes('direct') || q.includes('admin') || q.includes('whatsapp') || q.includes('contact') || q.includes('call')) {
      return {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `🎧 **Direct Customer Support Assistance:**\n\nAap direct hamare official admin customer support se WhatsApp ya In-App Ticket dwara judein. Aapka account data (Game UID: ${userProfile?.gameUid || 'N/A'}, Email/Phone) automatically support executive ko chala jaayega.`,
        timestamp: timeStr,
        actionButton: {
          label: 'Connect Direct Support Now',
          action: () => {
            handleDirectWhatsAppRedirect();
          }
        }
      };
    }

    if (q.includes('join') || q.includes('match') || q.includes('tournament') || q.includes('contest')) {
      return {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `⚔️ **How to Join Tournament:**\n\n1. **Home** par pasandida game (BGMI / FreeFire / Ludo) select karein.\n2. Active Tournament card par **"Join"** button dabayein.\n3. Apni **Slot Number** (agar applicable ho) select karein aur Entry Fee pay karein.\n4. Match time se 15 min pehle Room ID & Pass check karein!`,
        timestamp: timeStr,
        actionButton: {
          label: 'Explore Tournaments',
          action: () => {
            onClose();
            showSection('home-section');
          }
        }
      };
    }

    // Default smart response
    return {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: `🤖 Main aapke query ko samajh gaya hoon! \n\nAgar aapka koi specific issue hai jaise **Payment, Room ID, Game UID, ya Prize Claim**, toh aap humare **Direct Customer Support Executive** se apne account details ke saath direct WhatsApp / Ticket connect kar sakte hain.`,
      timestamp: timeStr,
      actionButton: {
        label: 'Open Direct Support',
        action: () => {
          handleDirectWhatsAppRedirect();
        }
      }
    };
  };

  return (
    <div className="support-fullscreen-page show">
      <div className="ai-support-container">
        {/* Native Chat Header */}
        <div className="ai-modal-header">
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <button
              type="button"
              className="btn-back-native me-1"
              onClick={onClose}
              aria-label="Back"
            >
              <i className="bi bi-arrow-left fs-4 text-white"></i>
            </button>
            <div className="ai-avatar-ring flex-shrink-0">
              <i className="bi bi-robot text-warning fs-5"></i>
              <span className="online-badge-dot"></span>
            </div>
            <div className="text-truncate">
              <h6 className="m-0 fw-bold text-white d-flex align-items-center gap-2">
                <span className="text-truncate">AI Support</span>
              </h6>
              <small className="text-success text-xs fw-semibold">Online</small>
            </div>
          </div>

          <div className="d-flex align-items-center flex-shrink-0">
            <button
              type="button"
              className="btn btn-link text-success p-2 text-decoration-none d-flex align-items-center justify-content-center"
              onClick={handleDirectWhatsAppRedirect}
              title="Open WhatsApp Support"
            >
              <i className="bi bi-whatsapp fs-4"></i>
            </button>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="quick-questions-pills px-3 py-2">
          <div className="quick-pills-scroll">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="quick-pill-btn"
                onClick={() => handleSendMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="ai-chat-body">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}
            >
              {msg.sender === 'ai' && (
                <div className="ai-chat-avatar">
                  <i className="bi bi-cpu-fill text-warning"></i>
                </div>
              )}
              <div className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                <div className="bubble-content" style={{ whiteSpace: 'pre-line' }}>
                  {msg.text}
                </div>

                {msg.actionButton && (
                  <button
                    type="button"
                    className="btn btn-sm btn-warning rounded-pill mt-2 fw-bold w-100 d-flex align-items-center justify-content-center gap-1 shadow-sm"
                    onClick={msg.actionButton.action}
                  >
                    <span>{msg.actionButton.label}</span>
                    <i className="bi bi-arrow-right-short fs-5"></i>
                  </button>
                )}

                <div className="bubble-time">{msg.timestamp}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chat-bubble-row ai-row">
              <div className="ai-chat-avatar">
                <i className="bi bi-cpu-fill text-warning"></i>
              </div>
              <div className="chat-bubble bubble-ai typing-bubble">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="ai-chat-footer">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="d-flex align-items-center gap-2"
          >
            <input
              type="text"
              className="form-control ai-chat-input"
              placeholder="Ask AI support anything..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              type="submit"
              className="btn ai-send-btn"
              disabled={!inputText.trim()}
            >
              <i className="bi bi-send-fill"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
