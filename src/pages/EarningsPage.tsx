import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, query, orderByChild, equalTo, db } from '../firebase';
import { Transaction } from '../types';

export const EarningsPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [earningsTransactions, setEarningsTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const totalEarnings = userProfile?.totalEarnings || 0;
  const referralEarnings = userProfile?.referralEarnings || 0;
  const tournamentEarnings = Math.max(0, totalEarnings - referralEarnings);

  useEffect(() => {
    const fetchEarningsData = async () => {
      if (!currentUser) {
        setEarningsTransactions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const transRef = ref(db, `transactions/${currentUser.uid}`);
        const snapshot = await get(transRef);
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: Transaction[] = Object.values(val);
          // Filter for credits / winnings / referrals
          const earningsList = list.filter(item => 
            item.type === 'win' || item.type === 'referral' || item.type === 'bonus' || (item.amount > 0 && item.type !== 'deposit')
          );
          earningsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          setEarningsTransactions(earningsList);
        } else {
          setEarningsTransactions([]);
        }
      } catch (e) {
        console.error("Error fetching earnings transactions:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchEarningsData();
  }, [currentUser]);

  const filteredHistory = earningsTransactions;

  return (
    <section id="earnings-section" className="section active px-3 py-2">
      {/* Header & Title */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="section-title mb-0 fs-4 fw-bold text-white">Earnings & Rewards</h2>
          <p className="text-secondary small mb-0">Detailed breakdown of your tournament winnings and referrals</p>
        </div>
        <span className="badge bg-warning bg-opacity-25 text-warning px-2.5 py-1.5 rounded-pill fw-semibold small">
          <i className="bi bi-graph-up-arrow me-1"></i>Live
        </span>
      </div>

      {/* Hero Earnings Card */}
      <div className="wallet-hero-card p-4 rounded-4 position-relative overflow-hidden mb-4" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="wallet-hero-glow"></div>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="wallet-brand-title text-uppercase text-secondary" style={{ fontSize: '0.78rem', letterSpacing: '1px' }}>Total Lifetime Earnings</span>
          <i className="bi bi-shield-check text-success fs-5"></i>
        </div>
        <h1 className="display-5 fw-bold text-white mb-3">
          ₹ {totalEarnings.toFixed(2)}
        </h1>
        <div className="wallet-breakdown-grid pt-3 border-top border-secondary border-opacity-25">
          <div className="breakdown-box bg-dark bg-opacity-50 p-3 rounded-3 border border-secondary border-opacity-15 d-flex align-items-center justify-content-between">
            <div>
              <span className="text-secondary small text-uppercase fw-semibold d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Tournaments</span>
              <div className="amount text-white fw-bold fs-5">₹ {tournamentEarnings.toFixed(2)}</div>
            </div>
            <div className="breakdown-icon bg-info bg-opacity-15 text-info d-flex align-items-center justify-content-center rounded-2" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
              <i className="bi bi-trophy-fill"></i>
            </div>
          </div>
          <div className="breakdown-box bg-dark bg-opacity-50 p-3 rounded-3 border border-secondary border-opacity-15 d-flex align-items-center justify-content-between">
            <div>
              <span className="text-secondary small text-uppercase fw-semibold d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Referrals</span>
              <div className="amount text-white fw-bold fs-5">₹ {referralEarnings.toFixed(2)}</div>
            </div>
            <div className="breakdown-icon bg-warning bg-opacity-15 text-warning d-flex align-items-center justify-content-center rounded-2" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
              <i className="bi bi-people-fill"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Banner Widget */}
      <div className="mb-4 p-3 rounded-4 bg-gradient border border-warning border-opacity-30 text-white position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)' }}>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <span className="badge bg-warning text-dark fw-bold px-2 py-0.5 rounded-pill small mb-1">Refer & Earn</span>
            <h6 className="fw-bold mb-1">Get ₹50 for every friend</h6>
            <p className="text-warning text-opacity-75 small mb-0">Share your invite link and earn lifetime commissions!</p>
          </div>
          <button 
            className="btn btn-warning btn-sm fw-bold px-3 py-2 rounded-3 text-dark shadow-sm"
            onClick={() => {
              navigator.clipboard?.writeText('https://esports.app/invite/USER99');
              const toast = document.createElement('div');
              toast.className = 'position-fixed bottom-0 start-50 translate-middle-x mb-4 px-3 py-2 bg-dark text-warning border border-warning rounded-pill shadow-lg small z-3';
              toast.innerHTML = '<i class="bi bi-clipboard-check me-1"></i> Referral Link Copied!';
              document.body.appendChild(toast);
              setTimeout(() => toast.remove(), 2500);
            }}
          >
            <i className="bi bi-share-fill me-1"></i> Invite
          </button>
        </div>
      </div>



      {/* Earnings Transaction List */}
      <div className="custom-card p-0 overflow-hidden bg-dark bg-opacity-40 border border-secondary border-opacity-15 rounded-4">
        <div className="p-3 border-bottom border-secondary border-opacity-15 d-flex justify-content-between align-items-center">
          <span className="fw-bold small text-white"><i className="bi bi-list-columns-reverse me-2 text-warning"></i>Recent Payouts</span>
          <span className="text-secondary small">{filteredHistory.length} Transactions</span>
        </div>
        <div className="divide-y divide-secondary divide-opacity-10">
          {loading ? (
            <div className="text-center py-5 text-secondary">
              <div className="spinner-border spinner-border-sm text-warning me-2" role="status"></div>
              Loading live earnings...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-5 text-secondary">
              <i className="bi bi-receipt display-6 d-mb-2 text-secondary opacity-50 mb-2"></i>
              <p className="small mb-0">No earnings or payouts recorded yet.</p>
            </div>
          ) : (
            filteredHistory.map((item, idx) => {
              const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
              const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
              const isReferral = item.type === 'referral';
              return (
                <div key={item.id || idx} className="p-3 d-flex align-items-center justify-content-between border-bottom border-secondary border-opacity-10">
                  <div className="d-flex align-items-center gap-3">
                    <div className={`rounded-circle p-2.5 d-flex align-items-center justify-content-center ${!isReferral ? 'bg-info bg-opacity-15 text-info' : 'bg-warning bg-opacity-15 text-warning'}`} style={{ width: '40px', height: '40px' }}>
                      <i className={`bi ${!isReferral ? 'bi-trophy' : 'bi-people'} fs-5`}></i>
                    </div>
                    <div>
                      <h6 className="mb-0 text-white fw-bold small">{item.description || (isReferral ? 'Referral Reward' : 'Tournament Winning')}</h6>
                      <p className="text-secondary mb-0" style={{ fontSize: '0.75rem' }}>{dateStr} {timeStr ? `• ${timeStr}` : ''}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold text-success fs-6">+ ₹ {Number(item.amount || 0).toFixed(2)}</div>
                    <span className="badge bg-success bg-opacity-15 text-success px-2 py-0.5 rounded-pill" style={{ fontSize: '0.7rem' }}>Credited</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

