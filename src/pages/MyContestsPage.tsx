import React, { useEffect, useState } from 'react';
import { ref, get, db } from '../firebase';
import { Tournament } from '../types';
import { useAuth } from '../context/AuthContext';
import { TournamentCard } from '../components/TournamentCard';

interface MyContestsPageProps {
  onOpenDetails: (tournament: Tournament) => void;
  onOpenIdPass: (tournament: Tournament) => void;
  onOpenChat: (tournament: Tournament) => void;
  onJoinClick: (tournament: Tournament) => void;
}

export const MyContestsPage: React.FC<MyContestsPageProps> = ({
  onOpenDetails,
  onOpenIdPass,
  onOpenChat,
  onJoinClick
}) => {
  const { currentUser, userProfile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchJoinedContests = async () => {
      if (!currentUser || !userProfile?.joinedTournaments) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      const joinedIds = Object.keys(userProfile.joinedTournaments);
      if (joinedIds.length === 0) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const promises = joinedIds.map(id => get(ref(db, `tournaments/${id}`)));
        const snapshots = await Promise.all(promises);

        const list: Tournament[] = [];
        snapshots.forEach((snap, idx) => {
          if (snap.exists()) {
            const t = snap.val();
            if (t.status === 'upcoming' || t.status === 'ongoing' || t.status === 'completed' || t.status === 'result') {
              list.push({ id: joinedIds[idx], ...t });
            }
          }
        });

        list.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
        setTournaments(list);
      } catch (e) {
        console.error("My contests load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchJoinedContests();
  }, [currentUser, userProfile?.joinedTournaments]);

  return (
    <section id="my-contests-section" className="section active">
      <h2 className="section-title">My Contests</h2>
      <div id="myContestsListEl">
        {loading ? (
          <div className="tournament-card placeholder-glow mb-3">
            <div className="tournament-card-content">
              <span className="placeholder col-6" style={{ height: '18px' }}></span>
              <span className="placeholder col-12 mt-2" style={{ height: '24px' }}></span>
              <span className="placeholder col-10 mt-2" style={{ height: '16px' }}></span>
              <div className="d-flex justify-content-between mt-3">
                <span className="placeholder col-4" style={{ height: '30px', borderRadius: '6px' }}></span>
                <span className="placeholder col-4" style={{ height: '30px', borderRadius: '6px' }}></span>
              </div>
            </div>
          </div>
        ) : tournaments.length > 0 ? (
          tournaments.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              onOpenDetails={onOpenDetails}
              onOpenIdPass={onOpenIdPass}
              onOpenChat={onOpenChat}
              onJoinClick={onJoinClick}
            />
          ))
        ) : (
          <p id="noContestsMessageEl" className="text-secondary text-center py-4">
            You haven't joined any contests yet.
          </p>
        )}
      </div>
    </section>
  );
};
