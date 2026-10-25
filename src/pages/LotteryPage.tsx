import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, update, push, db } from '../firebase';
import { LotteryItem } from '../types';

export const LotteryPage: React.FC = () => {
  const { currentUser, userProfile, reloadUserProfile, showSection } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'resulted'>('upcoming');
  const [lotteries, setLotteries] = useState<LotteryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLottery, setSelectedLottery] = useState<LotteryItem | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinMsg, setJoinMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchLotteries = async () => {
      setLoading(true);
      try {
        const lotRef = ref(db, 'lotteries');
        const snapshot = await get(lotRef);
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: LotteryItem[] = Object.entries(val).map(([id, item]: [string, any]) => ({
            id,
            ...item
          }));
          setLotteries(list);
        } else {
          // Fallback realistic starter draws if none seeded in DB
          setLotteries([
            {
              id: 'lot_iphone16',
              name: 'iPhone 16 Pro Max (256GB)',
              bannerUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
              entryFee: 20,
              winningPrize: 'iPhone 16 Pro Max',
              maxSlots: 100,
              resultTime: Date.now() + 86400000 * 2,
              status: 'upcoming',
              registeredUsers: {
                u1: { joinedAt: Date.now() - 3600000, username: 'ProSniper' },
                u2: { joinedAt: Date.now() - 7200000, username: 'AlphaGamer' }
              }
            },
            {
              id: 'lot_cash50k',
              name: '₹25,000 Mega Cash Pool',
              bannerUrl: 'https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=600&auto=format&fit=crop&q=80',
              entryFee: 10,
              winningPrize: '₹25,000 Direct Cash',
              maxSlots: 200,
              resultTime: Date.now() + 86400000 * 3,
              status: 'upcoming',
              registeredUsers: {
                u1: { joinedAt: Date.now() - 10000, username: 'ShadowHunter' }
              }
            },
            {
              id: 'lot_ps5',
              name: 'Sony PlayStation 5 Console',
              bannerUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80',
              entryFee: 15,
              winningPrize: 'PS5 Disc Edition',
              maxSlots: 80,
              resultTime: Date.now() - 86400000,
              status: 'resulted',
              winnerName: 'RockyGamer99',
              registeredUsers: {}
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to load lotteries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLotteries();
  }, []);

  const filteredLotteries = lotteries.filter(l => {
    if (activeTab === 'resulted') {
      return l.status === 'resulted' || l.status === 'completed';
    }
    return l.status === 'upcoming';
  });

  const handleConfirmJoin = async () => {
    if (!currentUser || !selectedLottery || isJoining) return;

    const userBalance = (userProfile?.balance || 0);
    if (userBalance < selectedLottery.entryFee) {
      setJoinMsg({ text: 'Insufficient balance! Please add funds in your wallet.', type: 'error' });
      return;
    }

    setIsJoining(true);
    setJoinMsg(null);

    try {
      const newBalance = userBalance - selectedLottery.entryFee;
      const registeredUsers = {
        ...(selectedLottery.registeredUsers || {}),
        [currentUser.uid]: {
          joinedAt: Date.now(),
          username: userProfile?.displayName || currentUser.email || 'Player'
        }
      };

      // Deduct balance
      await update(ref(db, `users/${currentUser.uid}`), {
        balance: newBalance
      });

      // Update lottery
      await update(ref(db, `lotteries/${selectedLottery.id}`), {
        registeredUsers
      });

      // Record transaction
      await push(ref(db, `transactions/${currentUser.uid}`), {
        type: 'lottery',
        amount: -selectedLottery.entryFee,
        description: `Lucky Draw Ticket: ${selectedLottery.name}`,
        timestamp: Date.now()
      });

      // Update local state
      setLotteries(prev => prev.map(item => item.id === selectedLottery.id ? { ...item, registeredUsers } : item));

      await reloadUserProfile();
      setJoinMsg({ text: 'Ticket purchased successfully! Good luck!', type: 'success' });
      setTimeout(() => {
        setSelectedLottery(null);
        setJoinMsg(null);
      }, 1500);
    } catch (err: any) {
      setJoinMsg({ text: err.message || 'Failed to purchase ticket', type: 'error' });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <section id="lottery-section" className="section active px-3 py-2 pb-5">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 pt-2">
        <button
          type="button"
          className="btn btn-sm btn-dark border border-secondary border-opacity-30 rounded-circle p-2"
          onClick={() => showSection('earn-section')}
        >
          <i className="bi bi-arrow-left fs-5"></i>
        </button>
        <h4 className="fw-extrabold text-white m-0 d-flex align-items-center gap-2">
          <i className="bi bi-ticket-detailed-fill text-warning"></i> Lucky Draw
        </h4>
        <div style={{ width: '38px' }}></div>
      </div>

      {/* Tabs */}
      <div
        className="d-flex p-1 rounded-3 mb-4 gap-1.5"
        style={{ background: '#0a0d20', border: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <button
          type="button"
          className="flex-fill btn btn-sm border-0 fw-bold py-2 rounded-2 transition-all"
          style={{
            background: activeTab === 'upcoming' ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : 'transparent',
            color: activeTab === 'upcoming' ? '#0f172a' : '#94a3b8',
            boxShadow: activeTab === 'upcoming' ? '0 4px 12px rgba(250, 204, 21, 0.3)' : 'none'
          }}
          onClick={() => setActiveTab('upcoming')}
        >
          <i className="bi bi-clock-history me-1.5"></i> Upcoming Draws
        </button>
        <button
          type="button"
          className="flex-fill btn btn-sm border-0 fw-bold py-2 rounded-2 transition-all"
          style={{
            background: activeTab === 'resulted' ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : 'transparent',
            color: activeTab === 'resulted' ? '#0f172a' : '#94a3b8',
            boxShadow: activeTab === 'resulted' ? '0 4px 12px rgba(250, 204, 21, 0.3)' : 'none'
          }}
          onClick={() => setActiveTab('resulted')}
        >
          <i className="bi bi-trophy-fill me-1.5"></i> Resulted Draws
        </button>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status"></div>
          <p className="text-secondary small mt-2">Loading lucky draws...</p>
        </div>
      ) : filteredLotteries.length > 0 ? (
        <div className="d-flex flex-column gap-3.5">
          {filteredLotteries.map((item) => {
            const bookedCount = item.registeredUsers ? Object.keys(item.registeredUsers).length : 0;
            const spotsLeft = Math.max(0, item.maxSlots - bookedCount);
            const progress = Math.min(100, (bookedCount / item.maxSlots) * 100);
            const isJoined = !!(currentUser && item.registeredUsers?.[currentUser.uid]);

            return (
              <div
                key={item.id}
                className="rounded-4 overflow-hidden shadow-lg border"
                style={{
                  background: 'linear-gradient(145deg, #131738 0%, #0a0d22 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Banner Image */}
                <div className="position-relative" style={{ height: '150px' }}>
                  <img
                    src={item.bannerUrl || 'https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=600&auto=format&fit=crop&q=80'}
                    alt={item.name}
                    className="w-100 h-100 object-fit-cover"
                  />
                  <div
                    className="position-absolute top-0 start-0 p-2"
                    style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)', width: '100%' }}
                  >
                    <span className="badge bg-warning text-dark font-mono fw-bold">
                      ENTRY ₹{item.entryFee}
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  <h5 className="fw-extrabold text-white mb-1 fs-6">{item.name}</h5>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary extra-small fw-bold">
                      <i className="bi bi-gift-fill text-warning me-1"></i>Prize:
                    </span>
                    <strong className="text-warning small">{item.winningPrize}</strong>
                  </div>

                  {/* Winner if resulted */}
                  {item.status === 'resulted' && item.winnerName && (
                    <div
                      className="p-2 rounded-3 text-center mb-2"
                      style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px dashed #22c55e' }}
                    >
                      <small className="text-secondary d-block extra-small text-uppercase fw-bold">Winner Announced</small>
                      <strong className="text-success fs-6">🏆 {item.winnerName}</strong>
                    </div>
                  )}

                  {/* Slots progress bar */}
                  {item.status === 'upcoming' && (
                    <div className="mb-3">
                      <div className="d-flex justify-content-between extra-small text-secondary mb-1 fw-bold">
                        <span>{spotsLeft} spots left</span>
                        <span>{bookedCount} / {item.maxSlots}</span>
                      </div>
                      <div className="progress rounded-pill" style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)' }}>
                        <div
                          className="progress-bar rounded-pill"
                          style={{
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #f59e0b, #ec4899)'
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {item.status === 'resulted' ? (
                    <button type="button" className="btn btn-sm btn-dark w-100 py-2 border-secondary border-opacity-30 text-secondary fw-bold rounded-3" disabled>
                      Draw Ended
                    </button>
                  ) : isJoined ? (
                    <button
                      type="button"
                      className="btn btn-sm w-100 py-2 fw-extrabold rounded-3 text-success border border-success border-opacity-40"
                      style={{ background: 'rgba(34, 197, 94, 0.12)' }}
                      disabled
                    >
                      <i className="bi bi-check-circle-fill me-1"></i> Ticket Booked
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-warning w-100 py-2 fw-extrabold rounded-3 text-dark shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' }}
                      onClick={() => setSelectedLottery(item)}
                    >
                      Buy Ticket (₹{item.entryFee})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-5">
          <i className="bi bi-ticket-detailed text-secondary fs-1 mb-2"></i>
          <p className="text-secondary small">No {activeTab} lucky draws right now.</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedLottery && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ zIndex: 1085, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="card border-0 rounded-4 shadow-2xl text-white p-4 w-100"
            style={{ maxWidth: '380px', background: 'linear-gradient(165deg, #131738 0%, #0a0d22 100%)', border: '1px solid rgba(250, 204, 21, 0.3)' }}
          >
            <div className="text-center mb-3">
              <div
                className="d-inline-flex p-3 rounded-circle mb-2"
                style={{ background: 'rgba(250, 204, 21, 0.15)', border: '1px solid rgba(250, 204, 21, 0.3)' }}
              >
                <i className="bi bi-ticket-perforated text-warning fs-3"></i>
              </div>
              <h5 className="fw-bold text-white mb-1">Confirm Lucky Draw Ticket</h5>
              <p className="text-secondary small mb-0">{selectedLottery.name}</p>
            </div>

            <div
              className="p-3 rounded-3 text-center mb-3"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="extra-small text-secondary fw-bold text-uppercase d-block mb-1">Ticket Entry Fee</span>
              <strong className="fs-3 text-warning fw-extrabold">₹{selectedLottery.entryFee}</strong>
            </div>

            {joinMsg && (
              <div
                className={`p-2 rounded-3 small text-center mb-3 ${joinMsg.type === 'success' ? 'bg-success bg-opacity-20 text-success border border-success border-opacity-30' : 'bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30'}`}
              >
                {joinMsg.text}
              </div>
            )}

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-dark border border-secondary border-opacity-30 w-50 py-2 rounded-3"
                onClick={() => setSelectedLottery(null)}
                disabled={isJoining}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-warning fw-extrabold w-50 py-2 rounded-3 text-dark shadow-sm"
                style={{ background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' }}
                onClick={handleConfirmJoin}
                disabled={isJoining}
              >
                {isJoining ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
