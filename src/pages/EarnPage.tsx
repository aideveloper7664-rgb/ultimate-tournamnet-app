import React from 'react';
import { useAuth } from '../context/AuthContext';

interface EarnPageProps {
  onOpenSpinWheel: () => void;
  onOpenScratchCard: () => void;
  onOpenLottery: () => void;
  onOpenShop: () => void;
  onOpenReferral: () => void;
}

export const EarnPage: React.FC<EarnPageProps> = ({
  onOpenSpinWheel,
  onOpenScratchCard,
  onOpenLottery,
  onOpenShop,
  onOpenReferral
}) => {
  const { userProfile, showSection } = useAuth();

  const spinTickets = userProfile?.spinTickets || 0;
  const scratchCards = userProfile?.scratchCards || 0;

  return (
    <section id="earn-section" className="section active px-3 py-2 pb-5">
      {/* Top Banner Header */}
      <div className="text-center pt-3 mb-4">
        <div
          className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-2"
          style={{
            background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%)',
            border: '1.5px solid rgba(250, 204, 21, 0.4)',
            boxShadow: '0 0 25px rgba(250, 204, 21, 0.25)'
          }}
        >
          <i className="bi bi-gift-fill text-warning" style={{ fontSize: '2.5rem' }}></i>
        </div>
        <h2 className="fw-extrabold mb-1 text-white fs-3">Earn Rewards</h2>
        <p className="text-secondary small px-3 mb-0">
          Play interactive games, complete milestones, and win real cash & merchandise!
        </p>
      </div>

      {/* Quick Summary Pill Row */}
      <div className="row g-2 mb-4">
        <div className="col-6">
          <div
            className="p-3 rounded-4 d-flex align-items-center gap-2.5"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(219, 39, 119, 0.05) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.3)'
            }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: '40px', height: '40px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}
            >
              <i className="bi bi-disc-fill fs-5"></i>
            </div>
            <div>
              <div className="text-secondary extra-small fw-bold text-uppercase">Spin Tickets</div>
              <strong className="fs-5 text-white">{spinTickets} Available</strong>
            </div>
          </div>
        </div>

        <div className="col-6">
          <div
            className="p-3 rounded-4 d-flex align-items-center gap-2.5"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.05) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: '40px', height: '40px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}
            >
              <i className="bi bi-stars fs-5"></i>
            </div>
            <div>
              <div className="text-secondary extra-small fw-bold text-uppercase">Scratch Cards</div>
              <strong className="fs-5 text-white">{scratchCards} Ready</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Earn Rewards Tiles Grid */}
      <div className="d-flex flex-column gap-3">
        {/* 1. Spin to Win */}
        <div
          className="earn-action-card p-3.5 rounded-4 shadow-lg position-relative overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #be185d 0%, #db2777 50%, #9d174d 100%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 24px rgba(219, 39, 119, 0.35)'
          }}
          onClick={onOpenSpinWheel}
        >
          <div className="position-absolute end-0 top-0 p-3 opacity-20 pointer-events-none">
            <i className="bi bi-disc-fill" style={{ fontSize: '6rem' }}></i>
          </div>
          <div className="position-relative z-1 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center bg-white bg-opacity-20 text-white"
                style={{ width: '54px', height: '54px' }}
              >
                <i className="bi bi-disc-fill fs-2"></i>
              </div>
              <div>
                <span className="badge bg-black bg-opacity-30 text-white font-mono small mb-1 px-2 py-0.5">
                  JACKPOT UP TO ₹500
                </span>
                <h4 className="fw-extrabold text-white m-0 fs-5">Spin to Win</h4>
                <p className="text-white text-opacity-80 small mb-0 mt-0.5">
                  Spin the lucky wheel and win instant wallet coins!
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-light fw-bold px-3 py-1.5 rounded-pill shadow-sm"
              style={{ color: '#be185d', whiteSpace: 'nowrap' }}
            >
              Play <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>

        {/* 2. Scratch Card */}
        <div
          className="earn-action-card p-3.5 rounded-4 shadow-lg position-relative overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #b45309 100%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)'
          }}
          onClick={onOpenScratchCard}
        >
          <div className="position-absolute end-0 top-0 p-3 opacity-20 pointer-events-none">
            <i className="bi bi-stars" style={{ fontSize: '6rem' }}></i>
          </div>
          <div className="position-relative z-1 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center bg-white bg-opacity-20 text-white"
                style={{ width: '54px', height: '54px' }}
              >
                <i className="bi bi-stars fs-2"></i>
              </div>
              <div>
                <span className="badge bg-black bg-opacity-30 text-white font-mono small mb-1 px-2 py-0.5">
                  100% GUARANTEED WIN
                </span>
                <h4 className="fw-extrabold text-white m-0 fs-5">Scratch Card</h4>
                <p className="text-white text-opacity-80 small mb-0 mt-0.5">
                  Scratch & reveal coins, XP points, and free spin tickets!
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-light fw-bold px-3 py-1.5 rounded-pill shadow-sm"
              style={{ color: '#b45309', whiteSpace: 'nowrap' }}
            >
              Scratch <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>

        {/* 3. Lucky Draw / Lottery */}
        <div
          className="earn-action-card p-3.5 rounded-4 shadow-lg position-relative overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #4338ca 100%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)'
          }}
          onClick={onOpenLottery}
        >
          <div className="position-absolute end-0 top-0 p-3 opacity-20 pointer-events-none">
            <i className="bi bi-ticket-detailed-fill" style={{ fontSize: '6rem' }}></i>
          </div>
          <div className="position-relative z-1 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center bg-white bg-opacity-20 text-white"
                style={{ width: '54px', height: '54px' }}
              >
                <i className="bi bi-ticket-detailed-fill fs-2"></i>
              </div>
              <div>
                <span className="badge bg-black bg-opacity-30 text-white font-mono small mb-1 px-2 py-0.5">
                  MEGA GADGETS & CASH
                </span>
                <h4 className="fw-extrabold text-white m-0 fs-5">Lucky Draw</h4>
                <p className="text-white text-opacity-80 small mb-0 mt-0.5">
                  Buy tickets for iPhone, Gaming Gear & Mega Cash Pools!
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-light fw-bold px-3 py-1.5 rounded-pill shadow-sm"
              style={{ color: '#4338ca', whiteSpace: 'nowrap' }}
            >
              Enter <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>

        {/* 4. Gaming Merchandise Store */}
        <div
          className="earn-action-card p-3.5 rounded-4 shadow-lg position-relative overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6d28d9 100%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.35)'
          }}
          onClick={onOpenShop}
        >
          <div className="position-absolute end-0 top-0 p-3 opacity-20 pointer-events-none">
            <i className="bi bi-cart-check-fill" style={{ fontSize: '6rem' }}></i>
          </div>
          <div className="position-relative z-1 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center bg-white bg-opacity-20 text-white"
                style={{ width: '54px', height: '54px' }}
              >
                <i className="bi bi-cart-check-fill fs-2"></i>
              </div>
              <div>
                <span className="badge bg-black bg-opacity-30 text-white font-mono small mb-1 px-2 py-0.5">
                  ESPORTS GEAR & GIFTS
                </span>
                <h4 className="fw-extrabold text-white m-0 fs-5">Gaming Store</h4>
                <p className="text-white text-opacity-80 small mb-0 mt-0.5">
                  Order high-quality gaming gear directly using your wallet balance!
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-light fw-bold px-3 py-1.5 rounded-pill shadow-sm"
              style={{ color: '#6d28d9', whiteSpace: 'nowrap' }}
            >
              Shop <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>

        {/* 5. Refer & Earn */}
        <div
          className="earn-action-card p-3.5 rounded-4 shadow-lg position-relative overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #047857 100%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)'
          }}
          onClick={onOpenReferral}
        >
          <div className="position-absolute end-0 top-0 p-3 opacity-20 pointer-events-none">
            <i className="bi bi-people-fill" style={{ fontSize: '6rem' }}></i>
          </div>
          <div className="position-relative z-1 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center bg-white bg-opacity-20 text-white"
                style={{ width: '54px', height: '54px' }}
              >
                <i className="bi bi-people-fill fs-2"></i>
              </div>
              <div>
                <span className="badge bg-black bg-opacity-30 text-white font-mono small mb-1 px-2 py-0.5">
                  EARN ₹ PER FRIEND
                </span>
                <h4 className="fw-extrabold text-white m-0 fs-5">Refer & Earn</h4>
                <p className="text-white text-opacity-80 small mb-0 mt-0.5">
                  Invite your squads and receive instant bonus cash!
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-light fw-bold px-3 py-1.5 rounded-pill shadow-sm"
              style={{ color: '#047857', whiteSpace: 'nowrap' }}
            >
              Invite <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
