import { useState } from 'react';

export interface HamroOrder {
  order_id: string;
  amount: number;
  payment_url: string;
  qr_code?: string;
  upi_id?: string;
  expires_at?: string;
}

export interface HamroVerifyResult {
  order_id: string;
  status: 'success' | 'pending' | 'failed' | 'expired';
  verified: boolean;
  isFirstFulfillment: boolean;
  alreadyFulfilled: boolean;
  amount: number;
  utr?: string;
  pay_amount?: number;
  is_test?: boolean;
  mode?: string;
  raw?: any;
}

export const sanitizeAmount = (price: any): number => {
  return Number(String(price).replace(/[^0-9.]/g, ''));
};

export const sanitizeCustomerMobile = (mobile?: string): string | undefined => {
  if (!mobile || typeof mobile !== 'string') return undefined;
  const digits = mobile.replace(/[^0-9]/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return undefined;
};

// Map errors according to Hamro Pay Error Table (Rule 4)
export const getActionableErrorMessage = (errorMsg: string): string => {
  const lower = (errorMsg || '').toLowerCase();

  if (lower.includes('missing hamroapi key')) {
    return 'Missing HamroAPI key: Please configure HAMRO_API_KEY in the server environment variables.';
  }
  if (lower.includes('invalid hamroapi key')) {
    return 'Invalid HamroAPI key: Please re-copy the key from the Hamro Pay Developer section.';
  }
  if (lower.includes('suspended')) {
    return 'Account suspended: Contact Hamro Pay support to resolve this suspension.';
  }
  if (lower.includes('connect fampay') || lower.includes('connect paytm') || lower.includes('please connect')) {
    return 'Please connect a FamPay or Paytm account in the Hamro Pay dashboard, or switch to Test mode.';
  }
  if (lower.includes('insufficient hamro credits') || lower.includes('insufficient credits')) {
    return 'Insufficient Hamro Credits: Please add credits in your Hamro Pay dashboard.';
  }
  if (lower.includes('wallet is full') || lower.includes('hamro wallet is full')) {
    return 'Hamro wallet is full: Withdraw funds or upgrade your plan in the Hamro Pay dashboard.';
  }
  if (lower.includes('too many pending orders')) {
    return 'Too many pending orders right now. Orders expire in 15 minutes or when paid. Please wait a few minutes or complete your existing order.';
  }
  if (lower.includes('too many api requests') || lower.includes('rate limit')) {
    return 'Too many requests. Please wait a moment before trying again.';
  }
  if (lower.includes('maintenance')) {
    return 'Payment system is under maintenance. Please try again after a few minutes.';
  }
  if (lower.includes('order not found')) {
    return 'Order not found on Hamro Pay. Please initiate a new order.';
  }
  if (lower.includes('validation')) {
    return 'Validation failed: Amount must be between ₹1 and ₹5000 and mobile must be 10 digits.';
  }

  return errorMsg || 'An unexpected error occurred while communicating with Hamro Pay.';
};

export const useHamroPay = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<HamroOrder | null>(null);
  const [verifyResult, setVerifyResult] = useState<HamroVerifyResult | null>(null);

  // 1. Create Order via server route (Rule 2: sanitised amount, Rule 5: server key)
  const createOrder = async (
    rawAmount: any,
    customerName?: string,
    customerEmail?: string,
    customerMobile?: string
  ): Promise<HamroOrder> => {
    setLoading(true);
    setError(null);
    try {
      const cleanAmt = sanitizeAmount(rawAmount);
      if (isNaN(cleanAmt) || cleanAmt < 1 || cleanAmt > 5000) {
        throw new Error('Amount must be a valid number between ₹1 and ₹5000');
      }

      const safeMobile = sanitizeCustomerMobile(customerMobile);

      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cleanAmt,
          title: 'Wallet Recharge',
          customer_mobile: safeMobile,
          userName: customerName,
          userEmail: customerEmail
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const message = getActionableErrorMessage(data.error || 'Failed to create order');
        throw new Error(message);
      }

      setOrder(data.data);
      return data.data;
    } catch (err: any) {
      const msg = getActionableErrorMessage(err.message);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Server-side verification (Rule 1: signal is GET /order-status/:orderId on SERVER)
  const checkStatus = async (orderId: string): Promise<HamroVerifyResult> => {
    try {
      const res = await fetch(`/api/payment/order-status/${encodeURIComponent(orderId)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = getActionableErrorMessage(data.error || 'Failed to check order status');
        throw new Error(message);
      }

      const result: HamroVerifyResult = {
        order_id: orderId,
        status: data.status || data.data?.status || 'pending',
        verified: data.verified || data.status === 'success',
        isFirstFulfillment: !!data.isFirstFulfillment,
        alreadyFulfilled: !!data.alreadyFulfilled,
        amount: Number(data.data?.amount || data.data?.pay_amount || 0),
        utr: data.data?.utr,
        pay_amount: data.data?.pay_amount,
        is_test: data.data?.is_test,
        mode: data.data?.mode,
        raw: data.data
      };

      setVerifyResult(result);
      return result;
    } catch (err: any) {
      const msg = getActionableErrorMessage(err.message);
      throw new Error(msg);
    }
  };

  const reset = () => {
    setOrder(null);
    setVerifyResult(null);
    setError(null);
  };

  return {
    loading,
    error,
    order,
    verifyResult,
    createOrder,
    checkStatus,
    reset,
    sanitizeAmount,
    sanitizeCustomerMobile,
    getActionableErrorMessage
  };
};

// Compatibility exports
export type Order = HamroOrder;
export type VerifyResult = HamroVerifyResult;
