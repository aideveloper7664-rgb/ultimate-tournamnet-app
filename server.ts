import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// Initialize Gemini Client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// System instruction for eSports Tournament Customer Support
const SYSTEM_INSTRUCTION = `You are an AI Customer Support Assistant for an eSports Gaming Tournament application.
Your name is "AI Gaming Support Assistant".
You assist users with eSports tournaments (BGMI, Free Fire, Ludo, Call of Duty, etc.), Room ID & Password rules, Wallet Deposit & UTR Verification, Withdrawals, Game UID updates, and Fair Play rules.

Key Application Rules & FAQ knowledge:
1. Room ID & Password: Updated 10 to 15 minutes before the match start time in the "My Contests" section.
2. Wallet Deposit: Minimum deposit is ₹10. Payment must include UTR / UPI Ref ID verification which takes 2-5 minutes.
3. Withdrawal: Minimum withdrawal is ₹50 (or as configured). Processed via UPI / Paytm / PhonePe / Bank transfer.
4. Game UID: Mandatory to update in Profile before joining a match so slots and prize money match the player.
5. Tone: Be polite, energetic, gamer-friendly, and speak in concise Hinglish (English + Hindi mix, e.g. "Namaste Gamer! Match start hone se 10 min pehle Room ID update ho jayegi.").
6. Formatting: Keep responses well-structured with clear bullet points and emojis.
7. Escalation: If the user needs direct manual support for stuck payments or special account issues, mention that they can click the "Direct WhatsApp Support" button anytime.`;

app.post("/api/support-chat", async (req, res) => {
  try {
    const { message, history, userProfile } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }

    const userName = userProfile?.displayName || 'Gamer';
    const gameUid = userProfile?.gameUid || 'Not Updated';
    const walletBalance = userProfile?.walletBalance ?? 0;

    const userContextPrompt = `User Context: Name="${userName}", Game UID="${gameUid}", Wallet Balance=₹${walletBalance}.`;

    // Construct history array for Gemini API call
    const contentsHistory = [];
    
    // Add system context
    contentsHistory.push({
      role: 'user',
      parts: [{ text: `${SYSTEM_INSTRUCTION}\n${userContextPrompt}` }]
    });
    contentsHistory.push({
      role: 'model',
      parts: [{ text: `Namaste ${userName}! Main aapki eSports tournaments, Room ID & Pass, Wallet deposit aur withdrawal me help kar sakta hoon. Poochiye aapka kya sawal hai!` }]
    });

    if (Array.isArray(history)) {
      history.slice(-8).forEach((item: any) => {
        if (item.text) {
          contentsHistory.push({
            role: item.sender === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }]
          });
        }
      });
    }

    // Append latest user message
    contentsHistory.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: contentsHistory,
      config: {
        temperature: 0.7,
      }
    });

    const replyText = response.text || "Main aapki query samajh gaya hoon. Agar aapko direct help chahiye, toh aap Direct WhatsApp Support button par click karke hamare support team se chat kar sakte hain!";

    return res.json({ text: replyText });
  } catch (error: any) {
    console.error("Gemini API Error in /api/support-chat:", error?.message || error);
    return res.json({
      text: "🤖 Aapse connect hone me thoda issue aa raha hai. Aap Room ID, Deposit, ya Withdrawal ke regarding hamare Direct WhatsApp Support par contact kar sakte hain!"
    });
  }
});

// Hamro Pay Payment Gateway Integration
// Strictly follows Rules 1-6 & Developer API Specification
const HAMRO_API_KEY = process.env.HAMRO_API_KEY || process.env.HAMROPAY_API_KEY || "hmpay_30ab49ffa8ec434ba9b9fd07925ed5ca";
const HAMRO_BASE_URL = "https://hamropay-backends.onrender.com";

interface ServerOrderRecord {
  order_id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'expired';
  fulfilled: boolean;
  createdAt: number;
  fulfilledAt?: number;
  utr?: string;
  payment_url?: string;
}

// Server-side orders memory store for idempotency (Rule 6)
const serverOrders = new Map<string, ServerOrderRecord>();

// Actionable error formatter matching Hamro Pay Error Table (Rule 4)
function formatHamroErrorMessage(status: number, message: string = "", errorDetails: any = null): string {
  const lowerMsg = (message || "").toLowerCase();

  if (status === 401) {
    if (lowerMsg.includes("missing")) {
      return "Missing HamroAPI key. Send the key as the X-HamroAPI-Key header or check HAMRO_API_KEY environment variable.";
    }
    return "Invalid HamroAPI key. Copy the key again from the dashboard Developer section. After regenerating, update your environment variable.";
  }

  if (status === 403 || lowerMsg.includes("suspended")) {
    return "This account has been suspended. Contact Hamro Pay support to resolve the suspension.";
  }

  if (status === 400) {
    if (lowerMsg.includes("fampay") || lowerMsg.includes("paytm") || lowerMsg.includes("connect")) {
      return "Please connect FamPay or Paytm account first in the dashboard, or switch to Test mode while developing.";
    }
    if (lowerMsg.includes("insufficient") || lowerMsg.includes("credits")) {
      return "Insufficient Hamro Credits. Add credits from the dashboard. Test mode does not use credits.";
    }
    if (lowerMsg.includes("full") || lowerMsg.includes("wallet is full")) {
      return "Your Hamro wallet is full. Withdraw funds or upgrade your plan. It is an account limit.";
    }
    if (lowerMsg.includes("validation")) {
      const errList = errorDetails?.errors ? JSON.stringify(errorDetails.errors) : message;
      return `Validation failed: ${errList}. Amount must be plain number (Rs.1 to Rs.5000) and mobile exactly 10 digits.`;
    }
    return message || "Invalid request parameters to Hamro Pay.";
  }

  if (status === 404) {
    return "Order not found. Pass the exact order_id from create-order, unmodified, and use the same API key that created it.";
  }

  if (status === 429) {
    if (lowerMsg.includes("pending")) {
      return "Too many pending orders right now. Wait a few minutes: orders free their amount when paid, cancelled or expired (15 minutes).";
    }
    return "Too many API requests. Poll no faster than every 2.5 seconds, add exponential backoff to retries.";
  }

  if (status === 503 || lowerMsg.includes("maintenance")) {
    return "Payment system is under maintenance. Nothing to change in code. Retry after a short delay.";
  }

  return message || `Payment gateway returned error (HTTP ${status}).`;
}

// Mobile sanitizer - exactly 10 digits or omit (Rule 3)
function sanitizeCustomerMobile(mobile?: any): string | undefined {
  if (!mobile || typeof mobile !== 'string') return undefined;
  const digits = mobile.replace(/[^0-9]/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return undefined; // If not guaranteed 10 digits, omit field
}

// 1. Create Order endpoint: POST /api/payment/create-order
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount, title, customer_mobile, userId, userEmail, userName } = req.body;

    // Rule 2: Amount must be a plain number, never a formatted string. Strip it.
    const cleanAmount = Number(String(amount || '').replace(/[^0-9.]/g, ""));
    if (isNaN(cleanAmount) || cleanAmount < 1 || cleanAmount > 5000) {
      return res.status(400).json({
        success: false,
        error: "Validation failed: Amount must be a valid number between ₹1 and ₹5000 (max 2 decimals)."
      });
    }

    const roundedAmount = Math.round(cleanAmount * 100) / 100;

    // Rule 5: Keep API key in server-side config
    if (!HAMRO_API_KEY) {
      return res.status(401).json({
        success: false,
        error: "Missing HamroAPI key. Send the key as the X-HamroAPI-Key header or set HAMRO_API_KEY environment variable."
      });
    }

    // Rule 3: Mobile is optional - exactly 10 digits or omit
    const safeMobile = sanitizeCustomerMobile(customer_mobile);

    // Determine redirect URL
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const redirect_url = `${protocol}://${host}/payment-callback`;

    const requestPayload: any = {
      hamro_api: HAMRO_API_KEY,
      amount: roundedAmount,
      title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 100) : "Wallet Recharge",
      redirect_url,
      useEmbedded: true
    };

    if (safeMobile) {
      requestPayload.customer_mobile = safeMobile;
    }

    const response = await fetch(`${HAMRO_BASE_URL}/api/developer/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-HamroAPI-Key": HAMRO_API_KEY
      },
      body: JSON.stringify(requestPayload)
    });

    const resData: any = await response.json().catch(() => ({}));

    if (!response.ok || !resData?.success) {
      const actionableError = formatHamroErrorMessage(
        response.status,
        resData?.message || resData?.error,
        resData
      );
      console.error(`Hamro Pay order creation failed [HTTP ${response.status}]:`, actionableError);
      return res.status(response.status >= 400 && response.status < 600 ? response.status : 400).json({
        success: false,
        error: actionableError,
        raw: resData
      });
    }

    const orderData = resData.data;
    const orderId = orderData.order_id;

    // Rule 6: Store order_id against internal order
    serverOrders.set(orderId, {
      order_id: orderId,
      userId: userId || undefined,
      userEmail: userEmail || undefined,
      userName: userName || undefined,
      amount: roundedAmount,
      status: 'pending',
      fulfilled: false,
      createdAt: Date.now(),
      payment_url: orderData.payment_url
    });

    return res.json({
      success: true,
      data: {
        order_id: orderId,
        amount: roundedAmount,
        payment_url: orderData.payment_url,
        qr_code: orderData.qr_code,
        upi_id: orderData.upi_id,
        expires_at: orderData.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }
    });
  } catch (error: any) {
    console.error("Error creating Hamro Pay order:", error);
    return res.status(500).json({
      success: false,
      error: `Network / server error while reaching Hamro Pay: ${error.message}`
    });
  }
});

// Helper for server-side verification (Rule 1 & Rule 6)
async function verifyHamroOrderOnServer(orderId: string) {
  if (!orderId) {
    throw { status: 400, message: "Missing order_id." };
  }

  if (!HAMRO_API_KEY) {
    throw {
      status: 401,
      message: "Missing HamroAPI key. Please set HAMRO_API_KEY in server environment variables."
    };
  }

  const response = await fetch(`${HAMRO_BASE_URL}/api/developer/order-status/${encodeURIComponent(orderId)}`, {
    headers: {
      "X-HamroAPI-Key": HAMRO_API_KEY
    }
  });

  const resData: any = await response.json().catch(() => ({}));

  if (!response.ok || !resData?.success) {
    const errorMsg = formatHamroErrorMessage(response.status, resData?.message || resData?.error, resData);
    throw { status: response.status, message: errorMsg, raw: resData };
  }

  const data = resData.data;
  const status = data?.status; // "success" | "pending" | "failed" | "expired"
  const existingOrder = serverOrders.get(orderId);

  let isFirstFulfillment = false;
  let alreadyFulfilled = false;

  // Rule 6: Fulfil each order_id only once (idempotent)
  if (status === "success") {
    if (existingOrder) {
      if (!existingOrder.fulfilled) {
        existingOrder.fulfilled = true;
        existingOrder.status = "success";
        existingOrder.fulfilledAt = Date.now();
        existingOrder.utr = data.utr;
        isFirstFulfillment = true;
      } else {
        alreadyFulfilled = true;
      }
    } else {
      // Record fulfillment even if server restarted between create and return
      serverOrders.set(orderId, {
        order_id: orderId,
        amount: Number(data.amount || data.pay_amount || 0),
        status: "success",
        fulfilled: true,
        createdAt: Date.now(),
        fulfilledAt: Date.now(),
        utr: data.utr
      });
      isFirstFulfillment = true;
    }
  }

  return {
    success: true,
    verified: status === "success",
    isFirstFulfillment,
    alreadyFulfilled,
    status,
    data: {
      ...data,
      order_id: orderId,
      amount: Number(data.amount || data.pay_amount || existingOrder?.amount || 0),
      userId: existingOrder?.userId
    }
  };
}

// 2. Server verification endpoint (Rule 1): GET /api/developer/order-status/:orderId
app.get("/api/developer/order-status/:orderId", async (req, res) => {
  try {
    const result = await verifyHamroOrderOnServer(req.params.orderId);
    return res.json(result);
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, error: err.message, raw: err.raw });
  }
});

// Also alias for /api/payment/order-status/:orderId
app.get("/api/payment/order-status/:orderId", async (req, res) => {
  try {
    const result = await verifyHamroOrderOnServer(req.params.orderId);
    return res.json(result);
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, error: err.message, raw: err.raw });
  }
});

// Also support POST /api/payment/verify for existing client references
app.post("/api/payment/verify", async (req, res) => {
  try {
    const orderId = req.body.order_id || req.body.orderId || req.body.hp_order;
    const result = await verifyHamroOrderOnServer(orderId);
    return res.json({
      status: result.verified ? "success" : "pending",
      ...result
    });
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({
      status: "error",
      success: false,
      error: err.message,
      raw: err.raw
    });
  }
});

// Return route from Hamro Pay (Reference implementation): GET /payment-return
app.get("/payment-return", (req, res) => {
  const hpOrder = req.query.hp_order || '';
  const hpResult = req.query.hp_result || '';
  res.redirect(`/payment-callback?hp_order=${encodeURIComponent(String(hpOrder))}&hp_result=${encodeURIComponent(String(hpResult))}`);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
