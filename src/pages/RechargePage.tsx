import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadImageToImgBB, ref, push, db, serverTimestamp } from '../firebase';
import { copyToClipboard } from '../utils/helpers';
import { StatusMessage } from '../components/StatusMessage';

export const RechargePage: React.FC = () => {
  const { currentUser, userProfile, appSettings, showSection } = useAuth();
  const [step, setStep] = useState<number>(1);

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Phone Pay');
  const [utr, setUtr] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const [step1Status, setStep1Status] = useState<string | null>(null);
  const [step2Status, setStep2Status] = useState<string | null>(null);
  const [step3Status, setStep3Status] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const balance = userProfile?.balance || 0;
  const upiId = appSettings.upiDetails || '9848988740';
  const qrCodeUrl = appSettings.qrCodeUrl || 'https://i.ibb.co/j9P6NzXp/IMG-20250822-120255.jpg';

  const handleGoToStep2 = () => {
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum < 10 || amtNum > 10000) {
      setStep1Status("Please enter an amount between ₹ 10 and ₹ 10,000.");
      return;
    }
    setStep1Status(null);
    setStep(2);
  };

  const handleInitiatePayment = async () => {
    if (!paymentMethod) {
      setStep2Status("Please select a payment method.");
      return;
    }
    
    if (!currentUser) return;

    setLoading(true);
    setStep2Status(null);
    try {
      const order_id = `ORD_${new Date().toISOString().replace(/[-:.TZ]/g, '')}_${Math.floor(Math.random() * 1000)}`;
      const callback_url = `${window.location.origin}/payment-callback`;
      
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount).toFixed(2),
          order_id,
          customer_name: userProfile?.displayName || 'User',
          description: 'Wallet Recharge',
          callback_url
        })
      });
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data?.payment_url) {
        // Save pending order to firebase
        const depositRequest = {
          userId: currentUser.uid,
          userEmail: currentUser.email || 'N/A',
          userName: userProfile?.displayName || 'N/A',
          amount: parseFloat(amount),
          paymentMethod: paymentMethod === 'Phone Pay' ? 'GuruPay PhonePe/UPI' : paymentMethod,
          order_id,
          status: 'pending',
          timestamp: serverTimestamp()
        };
        const depositsRef = ref(db, 'deposits');
        await push(depositsRef, depositRequest);
        
        // Redirect to payment URL
        if (window !== window.parent) {
          // In iframe (AI Studio preview)
          window.open(result.data.payment_url, '_blank');
          setStep2Status("Payment page opened in a new tab. Since you are in a preview iframe, the gateway cannot load here.");
          setLoading(false);
        } else {
          // Normal window
          window.location.href = result.data.payment_url;
        }
      } else {
        setStep2Status(`Failed to initiate payment: ${result.error || 'Gateway error'}`);
        setLoading(false);
      }
    } catch (e: any) {
      setStep2Status(`Network error: ${e.message}`);
      setLoading(false);
    }
  };

  return (
    <section id="recharge-section" className="section active px-3 py-2">
      {step === 1 && (
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
                placeholder="Enter amount (10 - 10000)"
                min={10}
                max={10000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="d-flex justify-content-between align-items-center px-1 mb-3">
              <small className="text-info" style={{ fontSize: '0.78rem' }}><i className="bi bi-info-circle me-1"></i>Min: ₹ 10</small>
              <small className="text-info" style={{ fontSize: '0.78rem' }}>Max: ₹ 10,000</small>
            </div>

            <div className="mb-2">
              <span className="text-light small d-block mb-2 fw-semibold">Quick Amount Presets:</span>
              <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {['50', '100', '200', '500', '1000', '5000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`btn btn-sm py-2.5 rounded-3 fw-bold transition shadow-sm ${amount === preset ? 'btn-gradient bg-gradient text-white border-0 shadow' : 'btn-dark text-warning border border-warning border-opacity-40'}`}
                    onClick={() => setAmount(preset)}
                    style={{ fontSize: '0.9rem', background: amount === preset ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' : undefined }}
                  >
                    ₹ {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <StatusMessage message={step1Status} type="warning" onDismiss={() => setStep1Status(null)} />

          <div className="d-grid mt-4">
            <button
              type="button"
              className="btn btn-warning btn-lg fw-bold py-3 rounded-3 text-dark shadow-sm"
              onClick={handleGoToStep2}
              style={{ fontSize: '1rem' }}
            >
              Proceed to Payment <i className="bi bi-arrow-right ms-2"></i>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div id="recharge-step-2-method">
          <div className="text-center mb-4 p-3 rounded-4 bg-dark bg-opacity-40 border border-secondary border-opacity-25">
            <p className="text-secondary small mb-1">Selected Recharge Amount</p>
            <h2 className="fw-bold text-warning mb-0">₹ {parseFloat(amount || '0').toFixed(2)}</h2>
            <button 
              className="btn btn-link btn-sm text-secondary text-decoration-none mt-1 p-0" 
              onClick={() => setStep(1)}
              style={{ fontSize: '0.78rem' }}
            >
              <i className="bi bi-pencil-square me-1"></i>Change Amount
            </button>
          </div>
          <h5 className="fw-bold text-white mb-3 fs-6">Select Payment Gateway</h5>
          <div id="paymentOptionsContainer" className="mb-4">
            <div
              className={`payment-option-card p-3 rounded-4 border d-flex align-items-center justify-content-between cursor-pointer transition ${paymentMethod === 'GuruPay' ? 'border-warning bg-warning bg-opacity-10' : 'border-secondary border-opacity-25 bg-dark bg-opacity-40'}`}
              onClick={() => setPaymentMethod('GuruPay')}
            >
              <div className="d-flex align-items-center gap-3">
                <div className="bg-white p-2 rounded-3 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                  <img
                    src="https://gurupaygateway.com/assets/images/logo.png"
                    alt="GuruPay"
                    style={{ maxHeight: '30px', maxWidth: '30px', objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.src = "https://i.ibb.co/kFgvQdg/phonepay.png"; }}
                  />
                </div>
                <div>
                  <h6 className="fw-bold text-white mb-0">GuruPay Gateway</h6>
                  <span className="text-secondary" style={{ fontSize: '0.75rem' }}>Secure UPI & Cards</span>
                </div>
              </div>
              <div className="form-check m-0">
                <input
                  className="form-check-input shadow-none"
                  type="radio"
                  name="paymentMethod"
                  value="GuruPay"
                  checked={paymentMethod === 'GuruPay'}
                  onChange={() => setPaymentMethod('GuruPay')}
                />
              </div>
            </div>
          </div>

          <StatusMessage message={step2Status} type="warning" onDismiss={() => setStep2Status(null)} />

          <div className="d-grid gap-2 mt-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button
              type="button"
              className="btn btn-dark border border-secondary border-opacity-25 py-3 rounded-3 text-white fw-semibold"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-warning fw-bold py-3 rounded-3 text-dark shadow-sm"
              onClick={handleInitiatePayment}
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Redirecting...</>
              ) : (
                <>Pay Now <i className="bi bi-shield-lock-fill ms-1"></i></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual Step 3 Removed since we redirect to GuruPay */}
    </section>
  );
};
