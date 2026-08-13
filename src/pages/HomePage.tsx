import React, { useEffect, useState } from 'react';
import { ref, get, db } from '../firebase';
import { Game, Promotion } from '../types';
import { useAuth } from '../context/AuthContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

export const HomePage: React.FC = () => {
  const { appSettings, setSelectedGame, showSection } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState<boolean>(true);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);

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

  const handleGameClick = (game: Game) => {
    setSelectedGame(game.id, game.name);
    showSection('tournaments-section');
  };

  const handleContestStatusClick = (status: string) => {
    if (games.length > 0) {
      const firstGame = games[0];
      setSelectedGame(firstGame.id, firstGame.name);
      showSection('tournaments-section');
    } else {
      alert("No games are available to show tournaments.");
    }
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
          className="contest-status-btn"
          onClick={(e) => { e.preventDefault(); handleContestStatusClick('upcoming'); }}
        >
          <i className="bi bi-calendar-event-fill"></i>
          <span>Upcoming</span>
        </a>
        <a
          href="#"
          className="contest-status-btn"
          onClick={(e) => { e.preventDefault(); handleContestStatusClick('ongoing'); }}
        >
          <i className="bi bi-play-circle-fill"></i>
          <span>Ongoing</span>
        </a>
        <a
          href="#"
          className="contest-status-btn"
          onClick={(e) => { e.preventDefault(); handleContestStatusClick('completed'); }}
        >
          <i className="bi bi-trophy-fill"></i>
          <span>Completed</span>
        </a>
      </div>

      {/* Esport Games */}
      <h2 className="section-title">Esport Games</h2>
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
          games.map((game) => (
            <div key={game.id} className="col-4">
              <div
                className="game-card custom-card"
                onClick={() => handleGameClick(game)}
              >
                <div className="game-card-img-wrapper">
                  <img src={game.imageUrl} alt={game.name} />
                  <div className="game-card-badge">
                    <i className="bi bi-controller"></i>
                  </div>
                </div>
                <span>{game.name}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-secondary text-center col-12">No games available.</p>
        )}
      </div>
    </section>
  );
};
