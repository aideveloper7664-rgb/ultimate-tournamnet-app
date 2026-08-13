import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// GuruPay Payment API Routes
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount, order_id, customer_name, description, callback_url } = req.body;
    
    if (!amount || !order_id) {
      return res.status(400).json({ error: "Amount and order_id are required" });
    }

    const guruKey = process.env.GURUPAY_API_KEY;
    if (!guruKey) {
      console.error("GURUPAY_API_KEY is not set in environment variables");
      return res.status(500).json({ error: "Payment gateway configuration error" });
    }

    const response = await fetch("https://gurupaygateway.com/api/create-order", {
      method: "POST",
      headers: {
        "X-Guru-Key": guruKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        order_id,
        customer_name: customer_name || "Guest User",
        description: description || "Recharge/Order Payment",
        callback_url
      })
    });

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Error creating GuruPay order:", error);
    return res.status(500).json({ error: "Failed to create payment order" });
  }
});

app.post("/api/payment/verify", async (req, res) => {
  try {
    const { order_id } = req.body;
    
    if (!order_id) {
      return res.status(400).json({ error: "order_id is required" });
    }

    const guruKey = process.env.GURUPAY_API_KEY;
    if (!guruKey) {
      return res.status(500).json({ error: "Payment gateway configuration error" });
    }

    const response = await fetch("https://gurupaygateway.com/api/check-status", {
      method: "POST",
      headers: {
        "X-Guru-Key": guruKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ order_id })
    });

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Error verifying GuruPay payment:", error);
    return res.status(500).json({ error: "Failed to verify payment" });
  }
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
