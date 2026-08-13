import React, { useEffect, useState } from 'react';
import { ref, get, query, orderByChild, limitToFirst, db } from '../firebase';
import { UserProfile } from '../types';

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

  return (
    <section id="leaderboard-section" className="section active">
      <h2 className="section-title">Top Players</h2>
      <div id="leaderboardListEl">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="leaderboard-item placeholder-glow mb-2">
                <span className="placeholder col-1" style={{ height: '30px', width: '35px' }}></span>
                <span className="placeholder col-2 ms-2 me-3" style={{ height: '45px', width: '45px', borderRadius: '50%' }}></span>
                <div style={{ flexGrow: 1 }}>
                  <span className="placeholder col-6 d-block" style={{ height: '20px' }}></span>
                </div>
                <span className="placeholder col-3" style={{ height: '20px' }}></span>
              </div>
            ))}
          </>
        ) : leaderboard.length > 0 ? (
          leaderboard.map((user, idx) => {
            const displayName = user.displayName || user.email?.split('@')[0] || 'User';
            const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1E293B&color=E2E8F0&bold=true&size=45`;
            const displayEarnings = user.leaderboardDisplayEarnings || user.totalEarnings || 0;

            return (
              <div key={user.uid || idx} className="leaderboard-item">
                <div className="leaderboard-rank">#{user.leaderboardRank || idx + 1}</div>
                <img src={photoURL} alt={displayName} className="leaderboard-avatar" />
                <div className="leaderboard-user-info">
                  <div className="leaderboard-name">{displayName}</div>
                </div>
                <div className="leaderboard-earnings">
                  ₹ {displayEarnings.toLocaleString('en-IN')}
                </div>
              </div>
            );
          })
        ) : (
          <p id="noLeaderboardMessageEl" className="text-secondary text-center mt-4 py-4">
            Leaderboard is empty.
          </p>
        )}
      </div>
    </section>
  );
};
