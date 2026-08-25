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
        <div className="announcement-ticker-wrapper mb-3" id="announcementTickerEl">
          <div className="announcement-ticker-inner">
            <div className="ticker-badge">
              <i className="bi bi-megaphone-fill"></i>
              <span>News</span>
            </div>
            <div className="ticker-content-track">
              <div 
                className="ticker-text" 
                dangerouslySetInnerHTML={{ __html: appSettings.announcementBar.text || 'Welcome to the platform! Join tournaments and win exciting rewards.' }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Slider */}
      <div className="promotion-slider-wrapper mb-3" id="promotionSliderEl">
        {loadingPromotions ? (
          <div className="placeholder-glow w-100">
            <div className="promo-skeleton placeholder"></div>
          </div>
        ) : promotions.length > 0 ? (
          <Swiper
            modules={[Autoplay, Pagination]}
            autoplay={{ delay: 3500, disableOnInteraction: false }}
            pagination={{ clickable: true, dynamicBullets: true }}
            loop={promotions.length > 1}
            className="promo-swiper-container"
          >
            {promotions.map((promo) => (
              <SwiperSlide key={promo.id} className="promo-slide">
                {promo.link ? (
                  <a href={promo.link} target="_blank" rel="noopener noreferrer" className="promo-slide-link">
                    <img 
                      src={promo.imageUrl} 
                      alt="Promotion" 
                      className="promo-img"
                      loading="lazy"
                    />
                    <div className="promo-glass-shine"></div>
                  </a>
                ) : (
                  <div className="promo-slide-inner">
                    <img 
                      src={promo.imageUrl} 
                      alt="Promotion" 
                      className="promo-img"
                      loading="lazy"
                    />
                    <div className="promo-glass-shine"></div>
                  </div>
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
          className="contest-status-btn status-upcoming"
          onClick={(e) => { e.preventDefault(); handleContestStatusClick('upcoming'); }}
        >
          <div className="status-icon-wrapper upcoming-icon">
            <i className="bi bi-clock-history"></i>
          </div>
          <div className="status-info">
            <span className="status-title">Upcoming</span>
            <span className="status-badge upcoming-badge">Matches</span>
          </div>
        </a>

        <a
          href="#"
          className="contest-status-btn status-ongoing"
          onClick={(e) => { e.preventDefault(); handleContestStatusClick('ongoing'); }}
        >
          <div className="status-icon-wrapper ongoing-icon">
            <i className="bi bi-fire"></i>
            <span className="live-pulse-dot"></span>
          </div>
          <div className="status-info">
            <span className="status-title">Live Now</span>
            <span className="status-badge live-badge">Ongoing</span>
          </div>
        </a>

        <a
          href="#"
          className="contest-status-btn status-completed"
          onClick={(e) => { e.preventDefault(); handleContestStatusClick('completed'); }}
        >
          <div className="status-icon-wrapper completed-icon">
            <i className="bi bi-trophy-fill"></i>
          </div>
          <div className="status-info">
            <span className="status-title">Completed</span>
            <span className="status-badge completed-badge">Results</span>
          </div>
        </a>
      </div>

      {/* Esport Games */}
      <div className="section-header-row mb-3 d-flex align-items-center justify-content-between">
        <h2 className="section-title mb-0 d-flex align-items-center gap-2">
          <span className="section-title-icon">
            <i className="bi bi-controller"></i>
          </span>
          <span>Esport Games</span>
        </h2>
        {games.length > 0 && (
          <span className="games-count-badge">{games.length} Games</span>
        )}
      </div>

      <div className="row g-2.5 g-sm-3 mb-4" id="gamesListEl">
        {loadingGames ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="col-4">
                <div className="game-card custom-card placeholder-glow">
                  <div className="game-card-img-wrapper">
                    <span className="placeholder w-100 h-100 d-block"></span>
                  </div>
                  <div className="game-card-footer">
                    <span className="placeholder d-block col-8 mx-auto" style={{ height: '14px', borderRadius: '4px' }}></span>
                  </div>
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
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="game-card-overlay"></div>
                  <div className="game-card-badge">
                    <i className="bi bi-joystick"></i>
                  </div>
                  <div className="game-card-play-btn">
                    <i className="bi bi-play-fill"></i>
                  </div>
                </div>
                <div className="game-card-footer">
                  <span className="game-name">{game.name}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-12 text-center py-4">
            <p className="text-secondary mb-0">No games available.</p>
          </div>
        )}
      </div>
    </section>
  );
};
