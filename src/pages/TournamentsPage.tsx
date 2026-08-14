import React, { useEffect, useState, useRef } from 'react';
import { ref, query, orderByChild, equalTo, db } from '../firebase';
import { Tournament } from '../types';
import { useAuth } from '../context/AuthContext';
import { TournamentCard } from '../components/TournamentCard';
import { notifyTournament } from '../utils/androidBridge';
import { onValue } from 'firebase/database';

interface TournamentsPageProps {
  onOpenDetails: (tournament: Tournament) => void;
  onOpenIdPass: (tournament: Tournament) => void;
  onOpenChat: (tournament: Tournament) => void;
  onJoinClick: (tournament: Tournament) => void;
}

export const TournamentsPage: React.FC<TournamentsPageProps> = ({
  onOpenDetails,
  onOpenIdPass,
  onOpenChat,
  onJoinClick
}) => {
  const { selectedGameId } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const isInitialLoadRef = useRef(true);
  const knownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isInitialLoadRef.current = true;
    knownIdsRef.current = new Set();

    if (!selectedGameId) {
      setTournaments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const tQuery = query(ref(db, 'tournaments'), orderByChild('gameId'), equalTo(selectedGameId));

    const unsubscribe = onValue(tQuery, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: Tournament[] = Object.entries(val)
            .map(([id, t]: [string, any]) => ({ id, ...t }))
            .filter(t => t.status === activeTab)
            .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

          // Notify for any newly added tournament that wasn't in our known IDs list (if not initial load)
          if (!isInitialLoadRef.current) {
            list.forEach(t => {
              if (t.id && !knownIdsRef.current.has(t.id)) {
                notifyTournament(t.name);
              }
            });
          }

          // Maintain our set of known tournament IDs
          const nextIds = new Set<string>();
          list.forEach(t => {
            if (t.id) nextIds.add(t.id);
          });
          knownIdsRef.current = nextIds;

          setTournaments(list);
        } else {
          setTournaments([]);
          knownIdsRef.current = new Set();
        }
      } catch (e) {
        console.error(`Tournaments realtime sync failed (${activeTab}):`, e);
        setTournaments([]);
      } finally {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    }, (error) => {
      console.error("Tournaments realtime sync error:", error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [selectedGameId, activeTab]);

  return (
    <section id="tournaments-section" className="section active">
      <div className="tournament-tabs">
        <button
          className={`tab-item ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <i className="bi bi-calendar-event-fill me-1"></i> Upcoming
        </button>
        <button
          className={`tab-item ${activeTab === 'ongoing' ? 'active' : ''}`}
          onClick={() => setActiveTab('ongoing')}
        >
          <i className="bi bi-play-circle-fill me-1"></i> Ongoing
        </button>
        <button
          className={`tab-item ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <i className="bi bi-trophy-fill me-1"></i> Results
        </button>
      </div>

      <div id="tournamentsListContainerEl" className="mt-3">
        {!selectedGameId ? (
          <p className="text-secondary text-center mt-4 py-4">
            Select a game from Home page first.
          </p>
        ) : loading ? (
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
          <p id="noTournamentsMessageEl" className="text-secondary text-center mt-4 py-4">
            No {activeTab} tournaments found.
          </p>
        )}
      </div>
    </section>
  );
};
