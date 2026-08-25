import React, { useEffect, useState } from 'react';
import { ref, get, query, limitToLast, db } from '../firebase';
import { Transaction } from '../types';
import { useAuth } from '../context/AuthContext';

interface WalletPageProps {
  onOpenWithdrawMethod: () => void;
  onStartRecharge: () => void;
  onOpenP2PTransfer?: () => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  onOpenWithdrawMethod,
  onStartRecharge,
  onOpenP2PTransfer
}) => {
  const { currentUser, userProfile, showSection } = useAuth();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      if (!currentUser) {
        setRecentTransactions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const transRef = query(ref(db, `transactions/${currentUser.uid}`), limitToLast(6));
        const snapshot = await get(transRef);
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: Transaction[] = Object.values(val);
          list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          setRecentTransactions(list);
        } else {
          setRecentTransactions([]);
        }
      } catch (e) {
        console.error("Transactions load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTransactions();
  }, [currentUser]);

  const balance = userProfile?.balance || 0;
  const winningCash = userProfile?.winningCash || 0;
  const bonusCash = userProfile?.bonusCash || 0;


  const depositCash = Math.max(0, balance - winningCash - bonusCash);

  return (
    <section id="wallet-section" className="section active native-wallet-section px-3 py-2">
      {/* Native Main Balance Card */}
      <div className="wallet-hero-card mb-4">
        <div className="wallet-hero-glow"></div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="wallet-brand-title">
            <i className="bi bi-wallet2 text-warning me-2"></i>My Vault & Balance
          </div>
          <span 
            className="badge px-3 py-1.5 rounded-pill fw-bold text-white shadow-sm cursor-pointer d-inline-flex align-items-center gap-1"
            style={{ background: 'linear-gradient(135deg, #047857 0%, #10B981 100%)', fontSize: '0.75rem', letterSpacing: '0.5px' }}
            onClick={() => {
              // Show secure wallet info or toast
              const toast = document.createElement('div');
              toast.className = 'position-fixed bottom-0 start-50 translate-middle-x mb-4 px-3 py-2 bg-dark text-success border border-success rounded-pill shadow-lg small z-3';
              toast.innerHTML = '<i class="bi bi-shield-check-fill me-1"></i> 100% Secure Encrypted Wallet';
              document.body.appendChild(toast);
              setTimeout(() => toast.remove(), 2500);
            }}
            title="Encrypted & Secure"
          >
            <i className="bi bi-shield-check"></i>Secure Vault
          </span>
        </div>

        <div className="wallet-header text-start mb-3">
          <div className="balance-label text-uppercase tracking-wider small text-secondary fw-bold mb-1">Total Available Balance</div>
          <div className="total-balance display-5 fw-bold text-white mb-0" id="walletTotalBalanceEl">
            ₹ {balance.toFixed(2)}
          </div>
        </div>

        <div className="wallet-breakdown-grid">
          <div className="breakdown-box">
            <div className="breakdown-icon bg-success bg-opacity-10 text-success">
              <i className="bi bi-trophy-fill"></i>
            </div>
            <div>
              <div className="amount text-success fw-bold" id="walletWinningCashEl">
                ₹ {winningCash.toFixed(2)}
              </div>
              <div className="label text-secondary small">Winnings</div>
            </div>
          </div>
          <div className="breakdown-box">
            <div className="breakdown-icon bg-warning bg-opacity-10 text-warning">
              <i className="bi bi-gift-fill"></i>
            </div>
            <div>
              <div className="amount text-warning fw-bold" id="walletBonusCashEl">
                ₹ {bonusCash.toFixed(2)}
              </div>
              <div className="label text-secondary small">Bonus Cash</div>
            </div>
          </div>
        </div>



        <div className="wallet-actions mt-4">
          <button
            id="btn-add-money"
            type="button"
            className="btn btn-custom btn-action btn-add-money shadow-sm"
            onClick={onStartRecharge}
          >
            <i className="bi bi-plus-circle-fill"></i>
            <span>Add Cash</span>
          </button>
          <button
            id="btn-withdraw-money"
            type="button"
            className="btn btn-custom btn-action btn-withdraw-money shadow-sm"
            onClick={onOpenWithdrawMethod}
          >
            <i className="bi bi-arrow-up-right-circle-fill"></i>
            <span>Withdraw</span>
          </button>
          {onOpenP2PTransfer && (
            <button
              id="btn-send-coins"
              type="button"
              className="btn btn-custom btn-action btn-send-coins shadow-sm"
              onClick={onOpenP2PTransfer}
            >
              <i className="bi bi-send-fill"></i>
              <span>Send Coins</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Info Banner */}
      <div className="wallet-info-banner mb-4 d-flex align-items-center gap-3 p-3 rounded-4 border border-secondary border-opacity-25 bg-dark bg-opacity-50">
        <div className="fs-3 text-warning">
          <i className="bi bi-lightning-charge-fill"></i>
        </div>
        <div>
          <div className="fw-bold small text-white">Instant Withdrawals 24/7</div>
          <div className="text-secondary" style={{ fontSize: '0.78rem' }}>Direct transfers to UPI & Bank accounts within minutes.</div>
        </div>
      </div>

      {/* Transactions Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="section-title mb-0 fw-bold text-white d-flex align-items-center gap-2">
          <i className="bi bi-clock-history text-warning"></i> Recent Transactions
        </h6>
        <button
          type="button"
          className="btn btn-link text-warning text-decoration-none small fw-semibold p-0"
          onClick={() => showSection('earnings-section')}
        >
          View All <i className="bi bi-chevron-right"></i>
        </button>
      </div>

      <div id="recentTransactionsListEl" className="transactions-list-container">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="custom-card p-3 mb-2 placeholder-glow rounded-3">
                <div className="d-flex justify-content-between">
                  <span className="placeholder col-5 rounded" style={{ height: '16px' }}></span>
                  <span className="placeholder col-3 rounded" style={{ height: '16px' }}></span>
                </div>
                <div className="small text-secondary mt-2">
                  <span className="placeholder col-7 rounded" style={{ height: '12px' }}></span>
                </div>
              </div>
            ))}
          </>
        ) : recentTransactions.length > 0 ? (
          recentTransactions.map((t, index) => {
            const isCredit = t.amount > 0;
            const formattedAmount = `${isCredit ? '+' : ''}₹ ${Math.abs(t.amount || 0).toFixed(2)}`;
            const timeStr = t.timestamp
              ? new Date(t.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
              : 'Recently';

            const txType = (t.type || 'transaction').toLowerCase();
            let iconClass = 'bi-arrow-down-left text-success';
            let bgClass = 'bg-success bg-opacity-10';
            if (!isCredit || txType.includes('withdraw')) {
              iconClass = 'bi-arrow-up-right text-danger';
              bgClass = 'bg-danger bg-opacity-10';
            } else if (txType.includes('bonus') || txType.includes('reward')) {
              iconClass = 'bi-gift text-warning';
              bgClass = 'bg-warning bg-opacity-10';
            }

            return (
              <div
                key={index}
                className="custom-card p-3 mb-2.5 d-flex justify-content-between align-items-center rounded-4 border border-secondary border-opacity-10 bg-dark bg-opacity-40 shadow-sm transition-all hover-lift"
              >
                <div className="d-flex align-items-center gap-3">
                  <div className={`rounded-circle p-2.5 d-flex align-items-center justify-content-center ${bgClass}`} style={{ width: '42px', height: '42px', minWidth: '42px' }}>
                    <i className={`bi ${iconClass} fs-5`}></i>
                  </div>
                  <div>
                    <div className="fw-semibold text-white small mb-0.5">{t.description || t.type || 'Wallet Transaction'}</div>
                    <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{timeStr}</div>
                  </div>
                </div>
                <div className={`fw-bold text-end ${isCredit ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.95rem' }}>
                  {formattedAmount}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-5 custom-card rounded-4 border border-secondary border-opacity-10 bg-dark bg-opacity-30">
            <div className="text-secondary fs-1 mb-2 opacity-50">
              <i className="bi bi-receipt"></i>
            </div>
            <p className="text-secondary small mb-1">No transactions found yet.</p>
            <p className="text-muted" style={{ fontSize: '0.75rem' }}>Add money or join contests to view history.</p>
          </div>
        )}
      </div>
    </section>
  );
};

