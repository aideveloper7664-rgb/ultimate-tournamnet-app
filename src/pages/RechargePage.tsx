import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, push, update, db, serverTimestamp, recordTransaction } from '../firebase';
import { StatusMessage } from '../components/StatusMessage';
import { HamroPayCheckout } from '../components/HamroPayCheckout';
import { HamroVerifyResult } from '../hooks/useHamroPay';

export const RechargePage: React.FC = () => {
  const { currentUser, userProfile, reloadUserProfile } = useAuth();

  const [amount, setAmount] = useState<string>('');
  const [step1Status, setStep1Status] = useState<string | null>(null);
  const [showHamroPayCheckout, setShowHamroPayCheckout] = useState<boolean>(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [fulfilledOrderIds, setFulfilledOrderIds] = useState<Set<string>>(new Set());

  const balance = userProfile?.balance || 0;

  const handleProceedToPayment = () => {
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum < 10 || amtNum > 5000) {
      setStep1Status("Please enter an amount between ₹ 10 and ₹ 5,000 (Hamro Pay gateway limit).");
      return;
    }
    setStep1Status(null);
    setShowHamroPayCheckout(true);
  };

  const handleHamroPaySuccess = async (result: HamroVerifyResult) => {
    setShowHamroPayCheckout(false);
    if (!currentUser) return;

    if (fulfilledOrderIds.has(result.order_id)) {
      setPaymentSuccessMsg(`Order ${result.order_id} is already credited to your wallet.`);
      return;
    }

    try {
      setFulfilledOrderIds((prev) => new Set(prev).add(result.order_id));

      const creditAmount = Number(result.amount) || parseFloat(amount);

      const depositRecord = {
        userId: currentUser.uid,
        userEmail: currentUser.email || 'N/A',
        userName: userProfile?.displayName || 'User',
        amount: creditAmount,
        utr: result.utr || 'Auto-Verified',
        order_id: result.order_id,
        paymentMethod: 'HamroPay UPI',
        status: 'approved',
        timestamp: serverTimestamp()
      };

      await push(ref(db, 'deposits'), depositRecord);

      const newBalance = (userProfile?.balance || 0) + creditAmount;
      await update(ref(db, `users/${currentUser.uid}`), {
        balance: newBalance
      });

      await recordTransaction(
        currentUser.uid,
        'deposit',
        creditAmount,
        `Hamro Pay Recharge (${result.order_id})`,
        {
          order_id: result.order_id,
          utr: result.utr || null,
          gateway: 'Hamro Pay'
        }
      );

      await reloadUserProfile();
      setPaymentSuccessMsg(`₹${creditAmount.toFixed(2)} added to your wallet successfully! UTR: ${result.utr || result.order_id}`);
      setAmount('');
    } catch (err: any) {
      console.error("Failed to credit wallet balance:", err);
      setStep1Status(`Payment verified, but failed to credit balance: ${err.message}`);
    }
  };

  return (
    <section id="recharge-section" className="section active px-3 py-2">
      <div id="recharge-step-1-amount">
        {/* Header & Balance Card */}
        <div className="wallet-hero-card p-4 rounded-4 position-relative overflow-hidden mb-4 text-center text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div className="wallet-hero-glow"></div>
          <p className="text-white text-opacity-75 small text-uppercase mb-1 fw-semibold" style={{ letterSpacing: '1.5px' }}>Current Vault Balance</p>
          <h2 className="display-5 fw-bold text-white mb-0">₹ {balance.toFixed(2)}</h2>
        </div>

        <div className="recharge-card p-4 rounded-4 bg-dark bg-opacity-75 border border-primary border-opacity-50 shadow-lg position-relative overflow-hidden">
          <div className="position-absolute top-0 end-0 bg-gradient bg-primary opacity-10 rounded-circle" style={{ width: '150px', height: '150px', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
          <div className="d-flex align-items-center justify-content-between mb-3 position-relative">
            <label htmlFor="rechargeAmountInput" className="form-label fw-bold text-white mb-0">
              <i className="bi bi-wallet2 text-info me-2 fs-5"></i>Enter Recharge Amount
            </label>
            <span className="badge bg-gradient bg-success text-white px-3 py-1 rounded-pill shadow-sm" style={{ fontSize: '0.75rem' }}>Instant Bonus 🚀</span>
          </div>

          <div className="amount-input-group position-relative mb-2">
            <span className="rupee-symbol position-absolute top-50 start-0 translate-middle-y ps-3 fs-3 fw-bold text-success">₹</span>
            <input
              type="number"
              className="form-control form-control-lg bg-dark text-warning border-primary border-opacity-50 ps-5 py-3 rounded-3 shadow-sm fw-bold fs-3"
              id="rechargeAmountInput"
              placeholder="Enter amount (10 - 5000)"
              min={10}
              max={5000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="d-flex justify-content-between align-items-center px-1 mb-3">
            <small className="text-info" style={{ fontSize: '0.78rem' }}><i className="bi bi-info-circle me-1"></i>Min: ₹ 10</small>
            <small className="text-info" style={{ fontSize: '0.78rem' }}>Max: ₹ 5,000</small>
          </div>

          <div className="mb-2">
            <span className="text-light small d-block mb-2 fw-semibold">Quick Amount Presets:</span>
            <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {['50', '100', '200', '500', '1000', '5000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="btn btn-sm py-2.5 rounded-3 fw-bold transition shadow-sm btn-dark text-warning border border-warning border-opacity-40"
                  onClick={() => {
                    setAmount(preset);
                    setShowHamroPayCheckout(true);
                  }}
                  style={{ fontSize: '0.9rem' }}
                >
                  ₹ {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        <StatusMessage message={paymentSuccessMsg} type="success" onDismiss={() => setPaymentSuccessMsg(null)} />
        <StatusMessage message={step1Status} type="warning" onDismiss={() => setStep1Status(null)} />

        <div className="d-grid mt-4">
          <button
            type="button"
            className="btn btn-warning btn-lg fw-bold py-3 rounded-3 text-dark shadow-sm"
            onClick={handleProceedToPayment}
            style={{ fontSize: '1rem' }}
          >
            Pay Now (Instant Redirect) <i className="bi bi-shield-lock-fill ms-2"></i>
          </button>
        </div>
      </div>

      {/* HamroPay Checkout Gateway Modal / URL View */}
      {showHamroPayCheckout && (
        <HamroPayCheckout
          amount={amount}
          customerName={userProfile?.displayName || 'User'}
          customerEmail={currentUser?.email || 'user@example.com'}
          customerMobile={userProfile?.phoneNumber || userProfile?.phone || ''}
          onSuccess={handleHamroPaySuccess}
          onError={(err) => setStep1Status(err)}
          onClose={() => setShowHamroPayCheckout(false)}
        />
      )}
    </section>
  );
};
