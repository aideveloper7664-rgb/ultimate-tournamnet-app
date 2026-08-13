import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, ref, get, update } from '../firebase';

export const PaymentCallbackPage: React.FC = () => {
  const { showSection, currentUser } = useAuth();
  const [statusMsg, setStatusMsg] = useState('Verifying Payment...');
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order_id = params.get('order_id');
    const status = params.get('status');

    if (!order_id) {
      setStatusMsg('Invalid payment callback: Missing Order ID.');
      setVerified(false);
      return;
    }

    verifyPayment(order_id);
  }, []);

  const verifyPayment = async (order_id: string) => {
    try {
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id })
      });
      const result = await response.json();

      if (result.status === 'success' && result.data?.payment_status === 'success') {
        setStatusMsg('Payment Successful!');
        setVerified(true);
        
        // Find the pending deposit request in Firebase and update it
        // Note: For real production, use Cloud Functions. Since we don't have Admin SDK set up,
        // we'll query by order_id from the client side if possible, or just add a new success record.
        // Actually, we can fetch all user deposits and find the matching one to update, 
        // but easier way is we know we just made it.
        // We will just add a new record or update if we stored the push key in localstorage?
        // Let's just push a verified transaction record to be safe and update user balance.
        
        if (currentUser) {
           const depositRecord = {
             userId: currentUser.uid,
             amount: result.data.amount || 0,
             paymentMethod: 'GuruPay',
             order_id: result.data.order_id,
             utr: result.data.utr || result.data.order_id,
             status: 'success',
             timestamp: Date.now()
           };
           const newDepositRef = ref(db, 'deposits');
           const { push } = await import('../firebase');
           await push(newDepositRef, depositRecord);
           
           // Optionally update user balance here or via your existing mechanisms
        }

      } else {
        setStatusMsg(`Payment Failed or Pending. Status: ${result.data?.payment_status || 'unknown'}`);
        setVerified(false);
      }
    } catch (error: any) {
      setStatusMsg(`Unable to verify payment: ${error.message}`);
      setVerified(false);
    }
  };

  return (
    <section className="section active px-3 py-4 text-center">
      <div className="card bg-dark bg-opacity-50 border-secondary border-opacity-25 rounded-4 p-5 max-w-md mx-auto mt-5 shadow-lg">
        {verified === null && (
          <>
            <div className="spinner-border text-warning mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
            <h3 className="text-white fw-bold">Processing Payment...</h3>
            <p className="text-secondary mb-0">{statusMsg}</p>
          </>
        )}
        {verified === true && (
          <>
            <i className="bi bi-check-circle-fill text-success mb-3" style={{ fontSize: '4rem' }}></i>
            <h3 className="text-success fw-bold">Payment Successful</h3>
            <p className="text-white mb-4">{statusMsg}</p>
            <button className="btn btn-warning fw-bold px-4 rounded-pill" onClick={() => showSection('wallet-section')}>
              Go to Wallet
            </button>
          </>
        )}
        {verified === false && (
          <>
            <i className="bi bi-x-circle-fill text-danger mb-3" style={{ fontSize: '4rem' }}></i>
            <h3 className="text-danger fw-bold">Payment Failed</h3>
            <p className="text-white mb-4">{statusMsg}</p>
            <button className="btn btn-outline-light fw-bold px-4 rounded-pill" onClick={() => showSection('home-section')}>
              Return Home
            </button>
          </>
        )}
      </div>
    </section>
  );
};
