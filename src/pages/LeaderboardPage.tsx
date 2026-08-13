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
    <section id="leaderboard-section" className="section active px-3 pt-3 overflow-hidden">
      <div className="text-center mb-5 position-relative">
        <div className="position-absolute top-50 start-50 translate-middle w-100 h-100 bg-warning opacity-10" style={{ filter: 'blur(40px)', zIndex: 0 }}></div>
        <h2 className="display-6 fw-bold text-white mb-1 position-relative z-1">Top Players</h2>
        <p className="text-warning small fw-semibold text-uppercase position-relative z-1" style={{ letterSpacing: '2px' }}>Hall of Fame</p>
      </div>

      <div id="leaderboardListEl" className="pb-5">
        {loading ? (
          <div className="text-center mt-5">
            <div className="spinner-border text-warning" role="status" style={{width: '3rem', height: '3rem'}}></div>
            <p className="text-secondary mt-3">Loading Champions...</p>
          </div>
        ) : leaderboard.length > 0 ? (
          <>
            {/* Podium Section - [3rd Left], [1st Center], [2nd Right] */}
            <div className="d-flex align-items-end justify-content-center gap-2 mb-5 px-1 position-relative">
              {/* Background Glow */}
              <div className="position-absolute bottom-0 start-50 translate-middle-x w-100" style={{height: '120px', background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(0,0,0,0) 70%)', zIndex: 0}}></div>

              {/* 3rd Place - Left */}
              {third ? (
                <div className="d-flex flex-column align-items-center position-relative z-1" style={{ width: '30%' }}>
                  <motion.div 
                    animate={{ y: [0, -6, 0] }} 
                    transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }} 
                    className="position-relative mb-2 d-flex flex-column align-items-center"
                  >
                    <img 
                      src={getAvatarUrl(third)} 
                      alt={getDisplayName(third)} 
                      className="rounded-circle shadow-lg" 
                      style={{ width: '55px', height: '55px', border: '3px solid #d97706', objectFit: 'cover' }} 
                    />
                    <div className="position-absolute bottom-0 start-50 translate-middle-x bg-dark text-white rounded-pill px-2 border border-secondary shadow-sm" style={{fontSize: '0.65rem', padding: '1px'}}>3rd</div>
                  </motion.div>
                  <div className="text-white fw-semibold text-truncate mb-1 w-100 text-center" style={{ fontSize: '0.75rem' }}>{getDisplayName(third)}</div>
                  <div className="w-100 rounded-top-4 shadow-lg d-flex flex-column align-items-center justify-content-start pt-2" style={{ height: '80px', background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)', borderTop: '2px solid rgba(255,255,255,0.2)' }}>
                    <span className="text-white fw-bold" style={{ fontSize: '0.75rem' }}>₹{getEarnings(third).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : (
                <div style={{ width: '30%' }} />
              )}

              {/* 1st Place - Center (Highest + Moving Animation) */}
              {first ? (
                <div className="d-flex flex-column align-items-center position-relative z-2" style={{ width: '38%' }}>
                  <motion.div 
                    animate={{ y: [0, -12, 0] }} 
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }} 
                    className="position-relative mb-2 d-flex flex-column align-items-center"
                  >
                    <i className="bi bi-heptagon-fill text-warning position-absolute start-50 translate-middle" style={{ top: '-12px', fontSize: '1.6rem', filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.9))', zIndex: 2 }}></i>
                    <i className="bi bi-star-fill text-white position-absolute start-50 translate-middle" style={{ top: '-12px', fontSize: '0.7rem', zIndex: 3 }}></i>
                    <img 
                      src={getAvatarUrl(first)} 
                      alt={getDisplayName(first)} 
                      className="rounded-circle shadow-lg position-relative z-1" 
                      style={{ width: '85px', height: '85px', border: '4px solid #f59e0b', objectFit: 'cover' }} 
                    />
                    <div className="position-absolute bottom-0 start-50 translate-middle-x bg-warning text-dark fw-bold rounded-pill px-3 shadow" style={{fontSize: '0.75rem', padding: '2px', zIndex: 2}}>1st</div>
                  </motion.div>
                  <div className="text-warning fw-bold text-truncate mb-1 w-100 text-center" style={{ fontSize: '0.95rem', textShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}>{getDisplayName(first)}</div>
                  <div className="w-100 rounded-top-4 shadow-lg d-flex flex-column align-items-center justify-content-start pt-3 position-relative overflow-hidden" style={{ height: '140px', background: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)', borderTop: '2px solid rgba(255,255,255,0.5)' }}>
                    <span className="text-dark fw-bolder fs-6 position-relative z-1">₹{getEarnings(first).toLocaleString('en-IN')}</span>
                    <div className="position-absolute bottom-0 w-100 h-50 z-0" style={{background: 'linear-gradient(0deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)'}}></div>
                  </div>
                </div>
              ) : (
                <div style={{ width: '38%' }} />
              )}

              {/* 2nd Place - Right */}
              {second ? (
                <div className="d-flex flex-column align-items-center position-relative z-1" style={{ width: '30%' }}>
                  <motion.div 
                    animate={{ y: [0, -8, 0] }} 
                    transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }} 
                    className="position-relative mb-2 d-flex flex-column align-items-center"
                  >
                    <img 
                      src={getAvatarUrl(second)} 
                      alt={getDisplayName(second)} 
                      className="rounded-circle shadow-lg" 
                      style={{ width: '60px', height: '60px', border: '3px solid #cbd5e1', objectFit: 'cover' }} 
                    />
                    <div className="position-absolute bottom-0 start-50 translate-middle-x bg-light text-dark fw-bold rounded-pill px-2 border border-secondary shadow-sm" style={{fontSize: '0.65rem', padding: '1px'}}>2nd</div>
                  </motion.div>
                  <div className="text-light fw-semibold text-truncate mb-1 w-100 text-center" style={{ fontSize: '0.8rem' }}>{getDisplayName(second)}</div>
                  <div className="w-100 rounded-top-4 shadow-lg d-flex flex-column align-items-center justify-content-start pt-2" style={{ height: '100px', background: 'linear-gradient(180deg, #94a3b8 0%, #475569 100%)', borderTop: '2px solid rgba(255,255,255,0.4)' }}>
                    <span className="text-white fw-bold" style={{ fontSize: '0.8rem' }}>₹{getEarnings(second).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : (
                <div style={{ width: '30%' }} />
              )}
            </div>

            {/* Rest of the Leaderboard (4th place onwards) */}
            <div className="d-flex flex-column gap-2 mt-2 px-1">
              {restOfPlayers.map((user, idx) => {
                const rank = idx + 4; // Since we sliced first 3
                const displayName = getDisplayName(user);
                const photoURL = getAvatarUrl(user);
                const displayEarnings = getEarnings(user);

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={user.uid || idx} 
                    className="d-flex align-items-center p-3 rounded-4 bg-dark bg-opacity-40 border border-secondary border-opacity-25 transition"
                  >
                    <div className="fw-bold text-secondary text-center flex-shrink-0" style={{ width: '35px', fontSize: '0.9rem' }}>
                      #{rank}
                    </div>
                    <img 
                      src={photoURL} 
                      alt={displayName} 
                      className="rounded-circle mx-3 flex-shrink-0" 
                      style={{ width: '42px', height: '42px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                    />
                    <div className="flex-grow-1 text-truncate">
                      <h6 className="fw-semibold text-white mb-0" style={{ fontSize: '0.95rem' }}>{displayName}</h6>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className="fw-bold text-success" style={{ fontSize: '0.95rem' }}>
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
