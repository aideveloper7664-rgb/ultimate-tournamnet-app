import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, ref, push, update, serverTimestamp, recordTransaction } from '../firebase';

export const PaymentCallbackPage: React.FC = () => {
  const { showSection, currentUser, userProfile, reloadUserProfile } = useAuth();
  const [statusMsg, setStatusMsg] = useState('Initiating server-side verification...');
  const [paymentState, setPaymentState] = useState<'verifying' | 'success' | 'pending' | 'failed'>('verifying');
  const [verifiedData, setVerifiedData] = useState<{
    order_id: string;
    amount: number;
    utr?: string;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const orderIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<any>(null);
  const fulfilledRef = useRef<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Hamro Pay appends: ?hp_order=<id>&hp_result=success|failed
    const order_id = params.get('hp_order') || params.get('order_id') || params.get('orderId');

    if (!order_id) {
      setStatusMsg('Missing Order ID in payment callback.');
      setPaymentState('failed');
      return;
    }

    orderIdRef.current = order_id;
    verifyWithServer(order_id);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Rule 1: A redirect landing is NEVER proof of payment.
  // The only trustworthy signal is GET /order-status/:orderId called from the SERVER returning status === "success".
  const verifyWithServer = async (orderId: string, isManualRetry = false) => {
    if (isManualRetry) setIsRefreshing(true);

    try {
      setStatusMsg('Confirming payment authenticity with Hamro Pay server...');
      const response = await fetch(`/api/payment/order-status/${encodeURIComponent(orderId)}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setPaymentState('failed');
        setStatusMsg(result.error || 'Server could not verify this order with Hamro Pay.');
        return;
      }

      const status = result.status; // "success" | "pending" | "failed" | "expired"
      const data = result.data || {};
      const orderAmount = Number(data.amount || data.pay_amount || 0);
      const utr = data.utr || null;

      if (status === 'success') {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setPaymentState('success');
        setStatusMsg('Payment verified and confirmed by Hamro Pay!');
        setVerifiedData({
          order_id: orderId,
          amount: orderAmount,
          utr: utr || undefined
        });

        // Rule 6: Idempotently fulfill once
        if (!fulfilledRef.current && currentUser) {
          fulfilledRef.current = true;
          await fulfillOrder(orderId, orderAmount, utr);
        }
      } else if (status === 'pending') {
        setPaymentState('pending');
        setStatusMsg('Payment is currently pending confirmation from UPI/Hamro Pay.');

        // Auto retry after 3.5 seconds (Rule 429: poll no faster than 2.5s)
        if (!pollTimerRef.current && !isManualRetry) {
          pollTimerRef.current = setTimeout(() => {
            if (orderIdRef.current && !fulfilledRef.current) {
              verifyWithServer(orderIdRef.current);
            }
          }, 3500);
        }
      } else {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setPaymentState('failed');
        setStatusMsg(`Order status is "${status}". Payment was not completed or has expired.`);
      }
    } catch (error: any) {
      setPaymentState('failed');
      setStatusMsg(`Verification error: ${error.message}`);
    } finally {
      if (isManualRetry) setIsRefreshing(false);
    }
  };

  const fulfillOrder = async (orderId: string, amount: number, utr?: string) => {
    if (!currentUser) return;
    try {
      // 1. Record deposit in Firebase
      const depositRecord = {
        userId: currentUser.uid,
        userEmail: currentUser.email || 'N/A',
        userName: userProfile?.displayName || 'User',
        amount,
        utr: utr || 'Auto-Verified',
        order_id: orderId,
        paymentMethod: 'HamroPay UPI',
        status: 'approved',
        timestamp: serverTimestamp()
      };

      await push(ref(db, 'deposits'), depositRecord);

      // 2. Credit user wallet balance
      const currentBal = userProfile?.balance || 0;
      await update(ref(db, `users/${currentUser.uid}`), {
        balance: currentBal + amount
      });

      // 3. Record transaction ledger entry
      await recordTransaction(
        currentUser.uid,
        'deposit',
        amount,
        `Hamro Pay Recharge (${orderId})`,
        {
          order_id: orderId,
          utr: utr || null,
          gateway: 'Hamro Pay'
        }
      );

      await reloadUserProfile();
    } catch (e: any) {
      console.error('Failed to credit balance on client after server verification:', e);
    }
  };

  return (
    <section className="section active px-3 py-4 text-center">
      <div
        className="card border-0 rounded-4 p-4 p-md-5 max-w-md mx-auto mt-4 shadow-2xl text-white"
        style={{
          background: 'linear-gradient(165deg, #111827 0%, #1f2937 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: '460px'
        }}
      >
        {/* State: Verifying */}
        {paymentState === 'verifying' && (
          <div className="py-4">
            <div
              className="spinner-border text-warning mb-4"
              role="status"
              style={{ width: '3.5rem', height: '3.5rem' }}
            ></div>
            <h3 className="text-white fw-bold mb-2">Verifying Payment...</h3>
            <p className="text-secondary small mb-0 px-2">{statusMsg}</p>
            <div className="mt-4 small text-secondary">
              <i className="bi bi-shield-lock-fill text-info me-1"></i>
              Querying Hamro Pay server API
            </div>
          </div>
        )}

        {/* State: Success */}
        {paymentState === 'success' && (
          <div className="py-2">
            <div
              className="rounded-circle bg-success bg-opacity-20 d-inline-flex p-3 mb-3 text-success"
              style={{ animation: 'bounce 1s infinite' }}
            >
              <i className="bi bi-check-circle-fill" style={{ fontSize: '4rem' }}></i>
            </div>
            <h3 className="text-success fw-bold mb-1">Payment Successful!</h3>
            <p className="text-secondary small mb-3">{statusMsg}</p>

            {verifiedData && (
              <div
                className="p-3 rounded-3 text-start mb-4"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <div className="d-flex justify-content-between mb-1.5">
                  <span className="text-secondary small">Amount Added:</span>
                  <span className="text-warning fw-bold">₹{verifiedData.amount.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1.5">
                  <span className="text-secondary small">Order ID:</span>
                  <span className="text-light small font-mono">{verifiedData.order_id}</span>
                </div>
                {verifiedData.utr && (
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary small">Bank UTR / Ref:</span>
                    <span className="text-info small font-mono">{verifiedData.utr}</span>
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-warning btn-lg fw-bold px-4 py-2.5 rounded-3 w-100 text-dark shadow-lg"
              onClick={() => showSection('wallet-section')}
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', border: 'none' }}
            >
              <i className="bi bi-wallet2 me-2"></i>Go to Wallet
            </button>
          </div>
        )}

        {/* State: Pending */}
        {paymentState === 'pending' && (
          <div className="py-2">
            <div
              className="rounded-circle bg-warning bg-opacity-20 d-inline-flex p-3 mb-3 text-warning"
            >
              <i className="bi bi-clock-history" style={{ fontSize: '3.5rem' }}></i>
            </div>
            <h3 className="text-warning fw-bold mb-1">Payment Pending</h3>
            <p className="text-secondary small mb-3">{statusMsg}</p>

            <div
              className="p-3 rounded-3 text-start mb-4 small"
              style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <p className="text-light mb-1">
                If you have transferred funds in your UPI app, please wait a moment. Hamro Pay takes 5-15 seconds to receive bank UTR confirmation.
              </p>
              {orderIdRef.current && (
                <div className="text-secondary mt-2">
                  Order ID: <code className="text-warning">{orderIdRef.current}</code>
                </div>
              )}
            </div>

            <div className="d-flex flex-column gap-2">
              <button
                className="btn btn-warning fw-bold py-2.5 rounded-3 text-dark shadow-sm"
                onClick={() => orderIdRef.current && verifyWithServer(orderIdRef.current, true)}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Checking Status...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-2"></i>Check Again Now
                  </>
                )}
              </button>
              <button
                className="btn btn-outline-secondary py-2 rounded-3 text-white"
                onClick={() => showSection('wallet-section')}
              >
                Go to Wallet
              </button>
            </div>
          </div>
        )}

        {/* State: Failed */}
        {paymentState === 'failed' && (
          <div className="py-2">
            <div
              className="rounded-circle bg-danger bg-opacity-20 d-inline-flex p-3 mb-3 text-danger"
            >
              <i className="bi bi-x-circle-fill" style={{ fontSize: '3.5rem' }}></i>
            </div>
            <h3 className="text-danger fw-bold mb-1">Payment Not Completed</h3>
            <p className="text-secondary small mb-4">{statusMsg}</p>

            <div className="d-flex flex-column gap-2">
              <button
                className="btn btn-warning fw-bold py-2.5 rounded-3 text-dark"
                onClick={() => showSection('recharge-section')}
              >
                <i className="bi bi-arrow-repeat me-2"></i>Retry Recharge
              </button>
              <button
                className="btn btn-outline-secondary py-2 rounded-3 text-white"
                onClick={() => showSection('home-section')}
              >
                Return to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
