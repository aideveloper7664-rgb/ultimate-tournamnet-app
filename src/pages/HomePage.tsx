import React, { useEffect, useState, useRef } from 'react';
import { ref, get, db, onValue } from '../firebase';
import { Game, Promotion, Tournament } from '../types';
import { useAuth } from '../context/AuthContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { TournamentCard } from '../components/TournamentCard';
import 'swiper/css';
import 'swiper/css/pagination';

interface HomePageProps {
  onOpenDetails: (tournament: Tournament) => void;
  onOpenIdPass: (tournament: Tournament) => void;
  onOpenChat: (tournament: Tournament) => void;
  onJoinClick: (tournament: Tournament) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onOpenDetails,
  onOpenIdPass,
  onOpenChat,
  onJoinClick
}) => {
  const { appSettings, selectedGameId, setSelectedGame, currentUser, userProfile } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState<boolean>(true);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);

  // Bottom tournament list state (Only joined matches)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState<boolean>(true);
  const tournamentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const promoRef = ref(db, 'promotions');
        const snapshot = await get(promoRef);
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: Promotion[] = Object.entries(val)
            .map(([id, p]: [string, any]) => ({ id, ...p }))
            .filter(p => p.imageUrl);
          setPromotions(list);
        } else {
          setPromotions([]);
        }
      } catch (e) {
        console.error("Promo load failed:", e);
      } finally {
        setLoadingPromotions(false);
      }
    };

    const fetchGames = async () => {
      try {
        const gamesRef = ref(db, 'games');
        const snapshot = await get(gamesRef);
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: Game[] = Object.entries(val)
            .map(([id, g]: [string, any]) => ({ id, ...g }))
            .filter(g => g.imageUrl && g.name)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          setGames(list);
        } else {
          setGames([]);
        }
      } catch (e) {
        console.error("Games load failed:", e);
      } finally {
        setLoadingGames(false);
      }
    };

    fetchPromotions();
    fetchGames();
  }, []);

  // Realtime subscription for tournaments (Filter to show ONLY joined matches)
  useEffect(() => {
    setLoadingTournaments(true);
    const tourneysDbRef = ref(db, 'tournaments');

    const unsubscribe = onValue(tourneysDbRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: Tournament[] = Object.entries(val)
          .map(([id, t]: [string, any]) => ({ id, ...t }))
          .filter(t => {
            const matchesStatus = t.status === activeTab;
            const matchesGame = selectedGameId ? t.gameId === selectedGameId : true;
            const isJoined = Boolean(
              (currentUser && userProfile?.joinedTournaments && userProfile.joinedTournaments[t.id]) ||
              (currentUser?.uid && t.registeredPlayers && t.registeredPlayers[currentUser.uid])
            );
            return matchesStatus && matchesGame && isJoined;
          })
          .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

        setTournaments(list);
      } else {
        setTournaments([]);
      }
      setLoadingTournaments(false);
    }, (err) => {
      console.error("Tournaments sync error:", err);
      setLoadingTournaments(false);
    });

    return () => {
      unsubscribe();
    };
  }, [activeTab, selectedGameId, currentUser, userProfile?.joinedTournaments]);

  const handleGameClick = (game: Game) => {
    if (selectedGameId === game.id) {
      // Toggle to all games
      setSelectedGame('', '');
    } else {
      setSelectedGame(game.id, game.name);
    }
    // Smooth scroll to tournament cards section
    setTimeout(() => {
      tournamentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleContestStatusClick = (status: 'upcoming' | 'ongoing' | 'completed') => {
    setActiveTab(status);
    setTimeout(() => {
      tournamentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <section id="home-section" className="section active">
      {/* Announcement Bar */}
      {appSettings.announcementBar?.isEnabled && appSettings.announcementBar?.text && (
        <div className="mb-3 overflow-hidden rounded-4 position-relative shadow-sm" style={{ background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6)', padding: '2px' }}>
          <div className="bg-dark rounded-4 d-flex align-items-center overflow-hidden position-relative w-100" style={{ height: '44px' }}>
            <div className="bg-dark px-3 h-100 d-flex align-items-center justify-content-center z-1 border-end border-secondary border-opacity-25 shadow-sm" style={{ minWidth: '45px' }}>
              <i className="bi bi-megaphone-fill fs-5" style={{ color: '#f59e0b', animation: 'pulse-scale 1.5s infinite ease-in-out' }}></i>
            </div>
            <div className="flex-grow-1 overflow-hidden h-100 d-flex align-items-center w-100">
              <div 
                className="d-inline-block text-white fw-semibold small w-100" 
                style={{ 
                  whiteSpace: 'nowrap',
                  animation: 'scroll-left 15s linear infinite',
                  paddingLeft: '100%',
                  fontSize: '0.85rem'
                }}
                dangerouslySetInnerHTML={{ __html: appSettings.announcementBar.text || 'Welcome to the platform! Join tournaments and win exciting rewards.' }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Slider */}
      <div className="swiper-container" id="promotionSliderEl">
        {loadingPromotions ? (
          <div className="placeholder-glow">
            <div className="swiper-slide">
              <span className="placeholder d-block w-100 h-100" style={{ borderRadius: '10px' }}></span>
            </div>
          </div>
        ) : promotions.length > 0 ? (
          <Swiper
            modules={[Autoplay, Pagination]}
            autoplay={{ delay: 3500, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            loop={promotions.length > 1}
            style={{ width: '100%', height: '100%', borderRadius: '10px' }}
          >
            {promotions.map((promo) => (
              <SwiperSlide key={promo.id}>
                {promo.link ? (
                  <a href={promo.link} target="_blank" rel="noopener noreferrer">
                    <img src={promo.imageUrl} alt="Promotion" />
                  </a>
                ) : (
                  <img src={promo.imageUrl} alt="Promotion" />
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        ) : null}
      </div>

      {/* Contest Status Navigation */}
      <div className="contest-status-nav" id="contestStatusNavEl">
        <a
          href="#"
          className={`contest-status-btn ${activeTab === 'upcoming' ? 'border-warning shadow-sm' : ''}`}
          onClick={(e) => { e.preventDefault(); handleContestStatusClick('upcoming'); }}
        >
          <i className="bi bi-calendar-event-fill"></i>
          <span>Upcoming</span>
        </a>
        <a
          href="#"
          className={`contest-status-btn ${activeTab === 'ongoing' ? 'border-warning shadow-sm' : ''}`}
          onClick={(e) => { e.preventDefault(); handleContestStatusClick('ongoing'); }}
        >
          <i className="bi bi-play-circle-fill"></i>
          <span>Ongoing</span>
        </a>
        <a
          href="#"
          className={`contest-status-btn ${activeTab === 'completed' ? 'border-warning shadow-sm' : ''}`}
          onClick={(e) => { e.preventDefault(); handleContestStatusClick('completed'); }}
        >
          <i className="bi bi-trophy-fill"></i>
          <span>Completed</span>
        </a>
      </div>

      {/* Esport Games */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="section-title mb-0">Esport Games</h2>
        {selectedGameId && (
          <button 
            className="btn btn-outline-warning btn-sm py-0.5 px-2 rounded-pill small" 
            onClick={() => setSelectedGame('', '')}
            style={{ fontSize: '0.72rem' }}
          >
            Clear Filter <i className="bi bi-x-circle ms-1"></i>
          </button>
        )}
      </div>

      <div className="row g-3 mb-4" id="gamesListEl">
        {loadingGames ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="col-4">
                <div className="game-card custom-card placeholder-glow">
                  <span className="placeholder d-block" style={{ height: '100px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}></span>
                  <span className="placeholder d-block mt-2 col-8 mx-auto" style={{ height: '18px' }}></span>
                </div>
              </div>
            ))}
          </>
        ) : games.length > 0 ? (
          games.map((game) => {
            const isSelected = selectedGameId === game.id;
            return (
              <div key={game.id} className="col-4">
                <div
                  className={`game-card custom-card ${isSelected ? 'border-warning shadow' : ''}`}
                  onClick={() => handleGameClick(game)}
                  style={isSelected ? { borderColor: '#F59E0B', transform: 'scale(1.03)' } : {}}
                >
                  <div className="game-card-img-wrapper">
                    <img src={game.imageUrl} alt={game.name} />
                    <div className={`game-card-badge ${isSelected ? 'bg-warning text-dark' : ''}`}>
                      <i className={isSelected ? "bi bi-check-lg" : "bi bi-controller"}></i>
                    </div>
                  </div>
                  <span className={isSelected ? 'text-warning fw-bold' : ''}>{game.name}</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-secondary text-center col-12">No games available.</p>
        )}
      </div>

      {/* Live Tournaments / Contest Cards at the Bottom */}
      <div ref={tournamentsRef} className="pt-2">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <h2 className="section-title mb-0">Contests</h2>
            <span className="badge bg-warning bg-opacity-20 text-warning rounded-pill px-2 py-0.5 small" style={{ fontSize: '0.72rem' }}>
              {tournaments.length}
            </span>
          </div>
          <div className="d-flex align-items-center gap-1 bg-dark bg-opacity-60 p-1 rounded-3 border border-secondary border-opacity-25">
            <button
              type="button"
              className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${activeTab === 'upcoming' ? 'btn-warning text-dark' : 'text-secondary btn-dark'}`}
              style={{ fontSize: '0.72rem' }}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming
            </button>
            <button
              type="button"
              className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${activeTab === 'ongoing' ? 'btn-warning text-dark' : 'text-secondary btn-dark'}`}
              style={{ fontSize: '0.72rem' }}
              onClick={() => setActiveTab('ongoing')}
            >
              Live
            </button>
            <button
              type="button"
              className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${activeTab === 'completed' ? 'btn-warning text-dark' : 'text-secondary btn-dark'}`}
              style={{ fontSize: '0.72rem' }}
              onClick={() => setActiveTab('completed')}
            >
              Results
            </button>
          </div>
        </div>

        <div id="tournamentsListContainerEl">
          {loadingTournaments ? (
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
            <div className="p-4 rounded-4 bg-dark bg-opacity-40 border border-secondary border-opacity-20 text-center my-3">
              <i className="bi bi-controller text-secondary opacity-50 display-6 d-block mb-2"></i>
              <p className="text-secondary small mb-1">
                {!currentUser
                  ? "Please log in to view your joined contests."
                  : `You haven't joined any ${activeTab} contests yet${selectedGameId ? ' for this game' : ''}.`}
              </p>
              {selectedGameId && (
                <button 
                  className="btn btn-outline-warning btn-sm mt-2 rounded-pill"
                  onClick={() => setSelectedGame('', '')}
                >
                  View All Games
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

