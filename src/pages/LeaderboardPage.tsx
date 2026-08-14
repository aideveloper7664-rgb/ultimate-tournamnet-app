import React, { useEffect, useState } from 'react';
import { ref, get, query, orderByChild, limitToFirst, db } from '../firebase';
import { UserProfile } from '../types';
import { motion } from 'motion/react';

export const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const leaderboardQuery = query(ref(db, 'users'), orderByChild('leaderboardRank'), limitToFirst(100));
        const snapshot = await get(leaderboardQuery);
        if (snapshot.exists()) {
          const list: UserProfile[] = [];
          snapshot.forEach(childSnapshot => {
            const user = childSnapshot.val();
            if (user && typeof user.leaderboardRank !== 'undefined') {
              list.push(user);
            }
          });
          list.sort((a, b) => (a.leaderboardRank || 999) - (b.leaderboardRank || 999));
          setLeaderboard(list);
        } else {
          setLeaderboard([]);
        }
      } catch (e) {
        console.error("Error loading leaderboard:", e);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];
  const restOfPlayers = leaderboard.slice(3);

  const getAvatarUrl = (user: UserProfile | undefined) => {
    if (!user) return '';
    const displayName = user.displayName || user.email?.split('@')[0] || 'User';
    return user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1E293B&color=E2E8F0&bold=true&size=100`;
  };

  const getDisplayName = (user: UserProfile | undefined) => {
    if (!user) return '';
    return user.displayName || user.email?.split('@')[0] || 'User';
  };

  const getEarnings = (user: UserProfile | undefined) => {
    if (!user) return 0;
    return user.leaderboardDisplayEarnings || user.totalEarnings || 0;
  };

  return (
    <section id="leaderboard-section" className="section active px-3 pt-4 overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 0%, #1e1154 0%, #0d0628 50%, #050212 100%)', minHeight: '100vh', boxShadow: 'inset 0 0 80px rgba(124, 58, 237, 0.15)' }}>
      {/* Premium Header */}
      <div className="text-center mb-4 position-relative">
        <div className="position-absolute top-50 start-50 translate-middle w-100 h-100 bg-violet opacity-20" style={{ filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}></div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="position-relative z-1"
        >
          <span className="badge bg-warning bg-opacity-25 text-warning px-3 py-1.5 rounded-pill mb-2 border border-warning border-opacity-40 text-uppercase tracking-wider fw-bold shadow-lg" style={{ fontSize: '0.68rem', letterSpacing: '2px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)', textShadow: '0 0 10px rgba(245, 158, 11, 0.4)' }}>
            🏆 Live Tournament Leaderboard
          </span>
          <h2 className="display-5 fw-extrabold text-white mb-1 position-relative z-1" style={{ letterSpacing: '-1px', background: 'linear-gradient(135deg, #ffffff 0%, #ffdf7e 50%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.25))' }}>
            Ultimate Champions
          </h2>
          <p className="text-info small fw-bold text-uppercase position-relative z-1" style={{ letterSpacing: '1.5px', textShadow: '0 0 12px rgba(6, 182, 212, 0.4)' }}>
            ✨ Hall of Fame • Top Earners ✨
          </p>
        </motion.div>
      </div>

      <div id="leaderboardListEl" className="pb-5">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-warning" role="status" style={{width: '2.5rem', height: '2.5rem', borderWidth: '3px'}}></div>
            <p className="text-secondary mt-3 small">Retrieving current rankings...</p>
          </div>
        ) : leaderboard.length > 0 ? (
          <>
            {/* Podium Section - [3rd Left], [1st Center], [2nd Right] */}
            <div className="d-flex align-items-end justify-content-center gap-2.5 mb-5 px-1 position-relative pt-4">
              {/* Background Glows & Stage Lights */}
              <div className="position-absolute bottom-0 start-50 translate-middle-x w-100" style={{ height: '220px', background: 'radial-gradient(ellipse at 50% 100%, rgba(245, 158, 11, 0.22) 0%, rgba(99, 102, 241, 0.15) 45%, rgba(0,0,0,0) 75%)', zIndex: 0, pointerEvents: 'none' }}></div>
              <div className="position-absolute top-0 start-50 translate-middle-x" style={{ width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(30px)', zIndex: 0, pointerEvents: 'none' }}></div>

              {/* 3rd Place - Left */}
              {third ? (
                <motion.div 
                  initial={{ opacity: 0, y: 35 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 90 }}
                  className="d-flex flex-column align-items-center position-relative z-1" 
                  style={{ width: '31%' }}
                >
                  <motion.div 
                    animate={{ y: [0, -5, 0] }} 
                    transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" }} 
                    className="position-relative mb-2.5 d-flex flex-column align-items-center"
                  >
                    {/* Glowing Avatar Frame */}
                    <div className="position-relative p-1 rounded-circle" style={{ background: 'linear-gradient(135deg, #f97316 0%, #b45309 50%, #7c2d12 100%)', boxShadow: '0 0 20px rgba(249, 115, 22, 0.5), inset 0 0 8px rgba(255,255,255,0.4)' }}>
                      <img 
                        src={getAvatarUrl(third)} 
                        alt={getDisplayName(third)} 
                        className="rounded-circle" 
                        style={{ width: '54px', height: '54px', objectFit: 'cover', display: 'block', border: '2px solid #0f0a2e' }} 
                      />
                      <span className="position-absolute bottom-0 start-50 translate-middle-x badge rounded-pill fw-black d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #ea580c, #9a3412)', color: '#fff', fontSize: '0.62rem', padding: '2px 7px', border: '1.5px solid rgba(255,255,255,0.6)', transform: 'translate(-50%, 40%)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', letterSpacing: '0.5px' }}>
                        #3
                      </span>
                    </div>
                  </motion.div>

                  <div className="text-white fw-bold text-truncate mb-1.5 w-100 text-center px-1" style={{ fontSize: '0.78rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    {getDisplayName(third)}
                  </div>

                  {/* 3rd Place Holographic Pedestal */}
                  <div className="w-100 rounded-top-4 d-flex flex-column align-items-center justify-content-between py-2.5 px-1 text-center position-relative overflow-hidden" 
                    style={{ 
                      height: '88px', 
                      background: 'linear-gradient(180deg, rgba(234, 88, 12, 0.28) 0%, rgba(154, 52, 18, 0.12) 60%, rgba(15, 10, 46, 0.8) 100%)', 
                      backdropFilter: 'blur(10px)',
                      borderTop: '3px solid #ea580c', 
                      borderLeft: '1px solid rgba(234, 88, 12, 0.35)', 
                      borderRight: '1px solid rgba(234, 88, 12, 0.35)',
                      boxShadow: '0 -4px 20px rgba(234, 88, 12, 0.25), inset 0 1px 1px rgba(255,255,255,0.3)'
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-center gap-1">
                      <span className="badge rounded-circle p-0 d-flex align-items-center justify-content-center" style={{ width: '18px', height: '18px', background: 'rgba(234, 88, 12, 0.25)', color: '#fdba74', fontSize: '0.65rem' }}>
                        🥉
                      </span>
                      <span className="fw-extrabold text-uppercase" style={{ fontSize: '0.62rem', color: '#fdba74', letterSpacing: '0.8px' }}>
                        BRONZE
                      </span>
                    </div>

                    <div className="w-100 px-1">
                      <div className="rounded-3 py-1 px-1.5" style={{ background: 'rgba(0, 0, 0, 0.45)', border: '1px solid rgba(234, 88, 12, 0.25)' }}>
                        <span className="fw-black text-warning" style={{ fontSize: '0.78rem', textShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}>
                          ₹{getEarnings(third).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div style={{ width: '31%' }} />
              )}

              {/* 1st Place - Center (Highest Champion Pedestal) */}
              {first ? (
                <motion.div 
                  initial={{ opacity: 0, y: 45 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 90 }}
                  className="d-flex flex-column align-items-center position-relative z-2" 
                  style={{ width: '38%' }}
                >
                  <motion.div 
                    animate={{ y: [0, -8, 0] }} 
                    transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }} 
                    className="position-relative mb-2.5 d-flex flex-column align-items-center"
                  >
                    {/* Animated Golden Crown */}
                    <div className="position-absolute" style={{ top: '-28px', zIndex: 10 }}>
                      <motion.div
                        animate={{ rotate: [-6, 6, -6], scale: [1, 1.08, 1] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                        style={{ filter: 'drop-shadow(0 0 14px rgba(251, 191, 36, 0.95))' }}
                      >
                        <i className="bi bi-crown-fill text-warning" style={{ fontSize: '2.1rem' }}></i>
                      </motion.div>
                    </div>

                    {/* Glowing Champion Avatar Frame */}
                    <div className="position-relative p-1 rounded-circle" style={{ background: 'linear-gradient(135deg, #fef08a 0%, #eab308 40%, #ca8a04 80%, #713f12 100%)', boxShadow: '0 0 35px rgba(234, 179, 8, 0.75), inset 0 0 12px rgba(255,255,255,0.7)' }}>
                      <img 
                        src={getAvatarUrl(first)} 
                        alt={getDisplayName(first)} 
                        className="rounded-circle" 
                        style={{ width: '74px', height: '74px', objectFit: 'cover', display: 'block', border: '3px solid #0f0a2e' }} 
                      />
                      <span className="position-absolute bottom-0 start-50 translate-middle-x badge rounded-pill fw-black d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#000', fontSize: '0.68rem', padding: '3px 9px', border: '2px solid #fff', transform: 'translate(-50%, 40%)', boxShadow: '0 4px 14px rgba(0,0,0,0.6)', letterSpacing: '0.5px' }}>
                        👑 #1
                      </span>
                    </div>
                  </motion.div>

                  <div className="text-warning fw-black text-truncate mt-1 mb-1.5 w-100 text-center px-1" style={{ fontSize: '0.92rem', textShadow: '0 0 14px rgba(245, 158, 11, 0.6), 0 2px 4px rgba(0,0,0,0.9)' }}>
                    {getDisplayName(first)}
                  </div>

                  {/* 1st Place Holographic Pedestal */}
                  <div className="w-100 rounded-top-4 d-flex flex-column align-items-center justify-content-between py-3 px-1.5 text-center position-relative overflow-hidden" 
                    style={{ 
                      height: '128px', 
                      background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.42) 0%, rgba(202, 138, 4, 0.18) 50%, rgba(15, 10, 46, 0.9) 100%)', 
                      backdropFilter: 'blur(12px)',
                      borderTop: '4px solid #facc15', 
                      borderLeft: '1.5px solid rgba(250, 204, 21, 0.55)', 
                      borderRight: '1.5px solid rgba(250, 204, 21, 0.55)',
                      boxShadow: '0 -6px 30px rgba(234, 179, 8, 0.4), inset 0 1px 2px rgba(255,255,255,0.5)'
                    }}
                  >
                    {/* Glowing light beam */}
                    <div className="position-absolute top-0 start-50 translate-middle-x w-100 h-100" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.2) 0%, transparent 60%)', pointerEvents: 'none' }}></div>

                    <div className="d-flex align-items-center justify-content-center gap-1 position-relative z-1">
                      <span className="badge rounded-pill px-2 py-0.5 fw-black text-dark" style={{ background: '#fef08a', fontSize: '0.62rem', letterSpacing: '0.8px', boxShadow: '0 0 10px rgba(254, 240, 138, 0.6)' }}>
                        CHAMPION
                      </span>
                    </div>

                    <div className="w-100 px-1 position-relative z-1">
                      <div className="rounded-3 py-1.5 px-1" style={{ background: 'rgba(0, 0, 0, 0.55)', border: '1.5px solid rgba(250, 204, 21, 0.45)', boxShadow: 'inset 0 0 10px rgba(234, 179, 8, 0.2)' }}>
                        <div className="small text-white-50 fw-semibold" style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Winnings</div>
                        <span className="fw-black text-white" style={{ fontSize: '0.96rem', textShadow: '0 0 12px rgba(255, 255, 255, 0.7)' }}>
                          ₹{getEarnings(first).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div style={{ width: '38%' }} />
              )}

              {/* 2nd Place - Right */}
              {second ? (
                <motion.div 
                  initial={{ opacity: 0, y: 35 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 90 }}
                  className="d-flex flex-column align-items-center position-relative z-1" 
                  style={{ width: '31%' }}
                >
                  <motion.div 
                    animate={{ y: [0, -6, 0] }} 
                    transition={{ repeat: Infinity, duration: 3.0, ease: "easeInOut" }} 
                    className="position-relative mb-2.5 d-flex flex-column align-items-center"
                  >
                    {/* Glowing Silver Avatar Frame */}
                    <div className="position-relative p-1 rounded-circle" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 50%, #475569 100%)', boxShadow: '0 0 22px rgba(203, 213, 225, 0.6), inset 0 0 8px rgba(255,255,255,0.6)' }}>
                      <img 
                        src={getAvatarUrl(second)} 
                        alt={getDisplayName(second)} 
                        className="rounded-circle" 
                        style={{ width: '58px', height: '58px', objectFit: 'cover', display: 'block', border: '2px solid #0f0a2e' }} 
                      />
                      <span className="position-absolute bottom-0 start-50 translate-middle-x badge rounded-pill fw-black d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #cbd5e1, #64748b)', color: '#0f172a', fontSize: '0.62rem', padding: '2px 7px', border: '1.5px solid #fff', transform: 'translate(-50%, 40%)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', letterSpacing: '0.5px' }}>
                        #2
                      </span>
                    </div>
                  </motion.div>

                  <div className="text-white fw-bold text-truncate mb-1.5 w-100 text-center px-1" style={{ fontSize: '0.78rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    {getDisplayName(second)}
                  </div>

                  {/* 2nd Place Holographic Pedestal */}
                  <div className="w-100 rounded-top-4 d-flex flex-column align-items-center justify-content-between py-2.5 px-1 text-center position-relative overflow-hidden" 
                    style={{ 
                      height: '104px', 
                      background: 'linear-gradient(180deg, rgba(203, 213, 225, 0.32) 0%, rgba(148, 163, 184, 0.14) 60%, rgba(15, 10, 46, 0.8) 100%)', 
                      backdropFilter: 'blur(10px)',
                      borderTop: '3px solid #e2e8f0', 
                      borderLeft: '1px solid rgba(226, 232, 240, 0.4)', 
                      borderRight: '1px solid rgba(226, 232, 240, 0.4)',
                      boxShadow: '0 -4px 22px rgba(203, 213, 225, 0.3), inset 0 1px 1px rgba(255,255,255,0.4)'
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-center gap-1">
                      <span className="badge rounded-circle p-0 d-flex align-items-center justify-content-center" style={{ width: '18px', height: '18px', background: 'rgba(226, 232, 240, 0.25)', color: '#f1f5f9', fontSize: '0.65rem' }}>
                        🥈
                      </span>
                      <span className="fw-extrabold text-uppercase" style={{ fontSize: '0.62rem', color: '#e2e8f0', letterSpacing: '0.8px' }}>
                        SILVER
                      </span>
                    </div>

                    <div className="w-100 px-1">
                      <div className="rounded-3 py-1 px-1.5" style={{ background: 'rgba(0, 0, 0, 0.45)', border: '1px solid rgba(226, 232, 240, 0.3)' }}>
                        <span className="fw-black text-warning" style={{ fontSize: '0.82rem', textShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}>
                          ₹{getEarnings(second).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div style={{ width: '31%' }} />
              )}
            </div>

            {/* Rest of the Leaderboard (4th place onwards) */}
            <div className="d-flex flex-column gap-2.5 mt-2 px-1">
              {restOfPlayers.map((user, idx) => {
                const rank = idx + 4; // Since we sliced first 3
                const displayName = getDisplayName(user);
                const photoURL = getAvatarUrl(user);
                const displayEarnings = getEarnings(user);

                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.8), type: "spring", stiffness: 100 }}
                    key={user.uid || idx} 
                    className="d-flex align-items-center p-3 rounded-4 transition"
                    style={{ background: 'linear-gradient(90deg, rgba(49, 46, 129, 0.35) 0%, rgba(13, 148, 136, 0.06) 100%)', border: '1.5px solid rgba(139, 92, 246, 0.25)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
                  >
                    <div className="fw-extrabold text-secondary text-center flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '35px', fontSize: '0.85rem' }}>
                      <span className="badge bg-indigo text-warning border border-warning border-opacity-30 rounded-pill px-2.5 py-1" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
                        #{rank}
                      </span>
                    </div>
                    <img 
                      src={photoURL} 
                      alt={displayName} 
                      className="rounded-circle mx-3 flex-shrink-0" 
                      style={{ width: '40px', height: '40px', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.08)' }} 
                    />
                    <div className="flex-grow-1 text-truncate">
                      <h6 className="fw-semibold text-white mb-0" style={{ fontSize: '0.9rem', letterSpacing: '-0.1px' }}>{displayName}</h6>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className="fw-extrabold text-success" style={{ fontSize: '0.92rem' }}>
                        ₹{displayEarnings.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          <div id="noLeaderboardMessageEl" className="text-center mt-5 p-5 bg-dark bg-opacity-50 rounded-4 border border-secondary border-opacity-25">
            <i className="bi bi-trophy text-secondary opacity-50 mb-3" style={{ fontSize: '3rem' }}></i>
            <h5 className="text-white fw-bold mb-1">No Champions Yet</h5>
            <p className="text-secondary small mb-0">Play matches and win to appear on the leaderboard.</p>
          </div>
        )}
      </div>
    </section>
  );
};
