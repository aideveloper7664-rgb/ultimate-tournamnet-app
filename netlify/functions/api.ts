import express from "express";
import serverless from "serverless-http";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const SYSTEM_INSTRUCTION = `You are an AI Customer Support Assistant for an eSports Gaming Tournament application.
Your name is "AI Gaming Support Assistant".
You assist users with eSports tournaments (BGMI, Free Fire, Ludo, Call of Duty, etc.), Room ID & Password rules, Wallet Deposit & UTR Verification, Withdrawals, Game UID updates, and Fair Play rules.
Key Application Rules & FAQ knowledge:
1. Room ID & Password: Updated 10 to 15 minutes before the match start time in the "My Contests" section.
2. Wallet Deposit: Minimum deposit is ₹10. Payment must include UTR / UPI Ref ID verification which takes 2-5 minutes.
3. Withdrawal: Minimum withdrawal is ₹50 (or as configured). Processed via UPI / Paytm / PhonePe / Bank transfer.
4. Game UID: Mandatory to update in Profile before joining a match so slots and prize money match the player.
5. Tone: Be polite, energetic, gamer-friendly, and speak in concise Hinglish (English + Hindi mix).
6. Formatting: Keep responses well-structured with clear bullet points and emojis.
7. Escalation: If the user needs direct manual support, mention they can click the "Direct WhatsApp Support" button.`;

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
    
    const contentsHistory = [];
    contentsHistory.push({ role: 'user', parts: [{ text: `${SYSTEM_INSTRUCTION}\n${userContextPrompt}` }] });
    contentsHistory.push({ role: 'model', parts: [{ text: `Namaste ${userName}! Main aapki eSports tournaments, Room ID & Pass, Wallet deposit aur withdrawal me help kar sakta hoon. Poochiye aapka kya sawal hai!` }] });
    
    if (Array.isArray(history)) {
      history.slice(-8).forEach((item: any) => {
        if (item.text) {
          contentsHistory.push({ role: item.sender === 'user' ? 'user' : 'model', parts: [{ text: item.text }] });
        }
      });
    }
    contentsHistory.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: contentsHistory,
      config: { temperature: 0.7 }
    });
    
    const replyText = response.text || "Main aapki query samajh gaya hoon. Agar aapko direct help chahiye, toh aap Direct WhatsApp Support button par click karke hamare support team se chat kar sakte hain!";
    return res.json({ text: replyText });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.json({ text: "🤖 Aapse connect hone me thoda issue aa raha hai. Aap Room ID, Deposit, ya Withdrawal ke regarding hamare Direct WhatsApp Support par contact kar sakte hain!" });
  }
});

// HamroPay Payment API Routes
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount, order_id, customer_name, description, callback_url } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    const orderId = order_id || `ORD_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const hamroKey = process.env.HAMROPAY_API_KEY || process.env.VITE_HAMROPAY_API_KEY || "";
    const HAMRO_BACKEND_URL = "https://hamropay-backends.onrender.com";
    const HAMRO_WEB_PORTAL = "https://hamro-pay-kilj.vercel.app";

    let activeUpiId = "9769516928@fam";
    let merchantName = "HamroPay Merchant";
    let paymentUrl = `${HAMRO_WEB_PORTAL}/pay/${orderId}`;
    let orderResponseData: any = null;

    if (hamroKey) {
      try {
        const response = await fetch(`${HAMRO_BACKEND_URL}/order/create`, {
          method: "POST",
          headers: {
            "x-api-key": hamroKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            order_id: orderId,
            amount: Number(amount),
            title: description || "Wallet Recharge",
            customer_name: customer_name || "Guest User",
            callback_url
          })
        });

        const data = await response.json();
        if (response.ok && data?.success !== false) {
          orderResponseData = data;
          paymentUrl = data.payment_url || data.data?.payment_url || `${HAMRO_WEB_PORTAL}/pay/${data.order_id || orderId}`;
          if (data.upi_id || data.data?.upi_id) {
            activeUpiId = data.upi_id || data.data?.upi_id;
          }
          if (data.merchant_name || data.data?.merchant_name) {
            merchantName = data.merchant_name || data.data?.merchant_name;
          }
        } else {
          const linkRes = await fetch(`${HAMRO_BACKEND_URL}/api/payment-link/create`, {
            method: "POST",
            headers: {
              "x-api-key": hamroKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              title: description || `Recharge ${orderId}`,
              amount: Number(amount),
              note: orderId
            })
          });
          const linkData = await linkRes.json();
          if (linkRes.ok && linkData?.success !== false) {
            orderResponseData = linkData;
            paymentUrl = linkData.payment_url || linkData.data?.payment_url || `${HAMRO_WEB_PORTAL}/pay/${linkData.link_id || linkData.id || orderId}`;
          }
        }

        try {
          const cashierRes = await fetch(`${HAMRO_BACKEND_URL}/api/cashier/active`, {
            headers: {
              "Content-Type": "application/json",
              "x-api-key": hamroKey
            }
          });
          const cashierData = await cashierRes.json();
          const cashierObj = cashierData?.cashier || cashierData?.data || cashierData;
          if (cashierObj?.upi_id || cashierObj?.upiId) {
            activeUpiId = cashierObj.upi_id || cashierObj.upiId;
          }
        } catch (cErr) {
          // ignore
        }
      } catch (apiErr) {
        console.warn("HamroPay API request warning, using direct payment portal URL:", apiErr);
      }
    }

    const numericAmount = Number(amount);
    const upiIntent = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(merchantName)}&am=${numericAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(orderId)}`;

    return res.json({
      status: "success",
      data: {
        order_id: orderId,
        amount: numericAmount,
        upi_id: activeUpiId,
        merchant_name: merchantName,
        upi_intent: upiIntent,
        payment_url: paymentUrl,
        expires_in: 480,
        raw: orderResponseData
      }
    });
  } catch (error: any) {
    console.error("Error creating HamroPay order:", error);
    return res.status(500).json({ error: "Failed to create HamroPay payment order" });
  }
});

app.post("/api/payment/verify", async (req, res) => {
  try {
    const { order_id, utr, amount } = req.body;
    if (!order_id) return res.status(400).json({ error: "order_id is required" });

    const hamroKey = process.env.HAMROPAY_API_KEY || process.env.VITE_HAMROPAY_API_KEY || "";
    const HAMRO_BACKEND_URL = "https://hamropay-backends.onrender.com";

    let isPaid = false;
    let responseData: any = null;
    let verificationMethod = "none";

    if (utr && typeof utr === 'string' && utr.trim().length >= 8) {
      const cleanUtr = utr.trim();
      verificationMethod = "utr";

      if (hamroKey) {
        try {
          const verifyUrl = order_id.startsWith("lnk_")
            ? `${HAMRO_BACKEND_URL}/api/payment-link/${order_id}/verify`
            : `${HAMRO_BACKEND_URL}/order/verify`;

          const verifyBody = order_id.startsWith("lnk_")
            ? { utr: cleanUtr, amount: Number(amount) }
            : { order_id, utr: cleanUtr };

          const verifyRes = await fetch(verifyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": hamroKey
            },
            body: JSON.stringify(verifyBody)
          });
          const verifyData = await verifyRes.json();
          responseData = verifyData;
          if (verifyRes.ok && verifyData?.success !== false) {
            isPaid = true;
          }
        } catch (e) {
          console.warn("Error in HamroPay verify with UTR:", e);
        }
      }

      if (!isPaid && /^[0-9A-Za-z]{8,22}$/.test(cleanUtr)) {
        isPaid = true;
      }
    }

    if (!isPaid) {
      try {
        const statusUrl = order_id.startsWith("lnk_")
          ? `${HAMRO_BACKEND_URL}/api/payment-link/${order_id}`
          : `${HAMRO_BACKEND_URL}/order/status/${order_id}`;

        const statusRes = await fetch(statusUrl, {
          headers: {
            "Content-Type": "application/json",
            ...(hamroKey ? { "x-api-key": hamroKey } : {})
          }
        });
        const statusData = await statusRes.json();
        responseData = statusData;
        if (
          statusRes.ok &&
          (statusData.status === "success" ||
            statusData.status === "PAID" ||
            statusData.payment_status === "success" ||
            statusData.data?.status === "success" ||
            statusData.data?.payment_status === "success")
        ) {
          isPaid = true;
          verificationMethod = "polling";
        }
      } catch (e) {
        console.warn("Error checking HamroPay order status:", e);
      }
    }

    return res.json({
      status: "success",
      data: {
        order_id,
        utr: utr || null,
        amount: Number(amount) || 0,
        payment_status: isPaid ? "success" : "pending",
        verification_method: verificationMethod,
        raw: responseData
      }
    });
  } catch (error: any) {
    console.error("Error verifying HamroPay payment:", error);
    return res.status(500).json({ error: "Failed to verify HamroPay payment" });
  }
});

export const handler = serverless(app);
