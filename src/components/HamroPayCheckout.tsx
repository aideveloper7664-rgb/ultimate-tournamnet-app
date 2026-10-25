import React, { useState, useEffect, useRef } from 'react';
import { useHamroPay, HamroVerifyResult, sanitizeAmount } from '../hooks/useHamroPay';

interface HamroPayCheckoutProps {
  amount: number | string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  onSuccess: (result: HamroVerifyResult) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

export const HamroPayCheckout: React.FC<HamroPayCheckoutProps> = ({
  amount,
  customerName = 'Gamer',
  customerEmail = 'gamer@example.com',
  customerMobile,
  onSuccess,
  onError,
  onClose
}) => {
  const {
    loading,
    error,
    order,
    createOrder,
    checkStatus
  } = useHamroPay();

  const [verificationSuccess, setVerificationSuccess] = useState<boolean>(false);
  const pollingRef = useRef<any>(null);
  const verifiedRef = useRef<boolean>(false);

  const cleanAmount = sanitizeAmount(amount);

  useEffect(() => {
    let isMounted = true;

    const initOrder = async () => {
      try {
        const newOrder = await createOrder(amount, customerName, customerEmail, customerMobile);
        if (!isMounted || !newOrder) return;
        startPolling(newOrder.order_id);
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.message || 'Failed to initiate payment';
        if (onError) onError(msg);
      }
    };

    initOrder();

    return () => {
      isMounted = false;
      stopPolling();
    };
  }, []);

  const startPolling = (orderId: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      if (verifiedRef.current) {
        stopPolling();
        return;
      }

      try {
        const statusData = await checkStatus(orderId);
        if (statusData.status === 'success' && statusData.verified) {
          verifiedRef.current = true;
          stopPolling();
          setVerificationSuccess(true);
          setTimeout(() => {
            onSuccess(statusData);
          }, 1000);
        }
      } catch (err: any) {
        console.warn('Status poll note:', err.message);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0b0f19',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Minimalist Top Bar */}
      <div
        style={{
          height: '56px',
          background: '#111827',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#facc15' }}>
            Hamro Pay Gateway
          </span>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            ₹{cleanAmount.toFixed(2)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem'
          }}
          title="Close"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, position: 'relative', background: '#000', overflow: 'hidden' }}>
        {loading && !order && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0b0f19',
              color: '#fff'
            }}
          >
            <div className="spinner-border text-warning mb-3" style={{ width: '3rem', height: '3rem' }}></div>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#9ca3af' }}>Connecting to Hamro Pay Gateway...</p>
          </div>
        )}

        {error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0b0f19',
              color: '#fff',
              padding: '24px',
              textAlign: 'center'
            }}
          >
            <i className="bi bi-exclamation-triangle-fill text-danger mb-3" style={{ fontSize: '3rem' }}></i>
            <h5 style={{ fontWeight: 700, marginBottom: '8px' }}>Gateway Notice</h5>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', maxWidth: '400px', marginBottom: '20px' }}>{error}</p>
            <button
              type="button"
              className="btn btn-warning px-4 fw-bold text-dark"
              onClick={onClose}
            >
              Go Back
            </button>
          </div>
        )}

        {verificationSuccess && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0b0f19',
              color: '#fff'
            }}
          >
            <div className="rounded-circle bg-success bg-opacity-20 p-4 mb-3 text-success">
              <i className="bi bi-check-circle-fill" style={{ fontSize: '4rem' }}></i>
            </div>
            <h4 className="fw-bold text-success mb-1">Payment Successful!</h4>
            <p className="text-secondary small">Crediting your wallet balance...</p>
          </div>
        )}

        {order?.payment_url && !verificationSuccess && (
          <iframe
            src={order.payment_url}
            title="Hamro Pay Secure Payment"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#fff'
            }}
            allow="clipboard-write; payment"
          />
        )}
      </div>
    </div>
  );
};
