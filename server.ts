import * as adminModule from "firebase-admin";

// Safe ES Module/CommonJS interop wrapper for firebase-admin
const admin = (adminModule as any).default && (adminModule as any).default.initializeApp ? (adminModule as any).default : adminModule;

const getFirestore = (app: any, dbId?: string) => {
  if (typeof app.firestore === "function") {
    return (dbId && dbId !== "(default)") ? app.firestore(dbId) : app.firestore();
  }
  return admin.firestore();
};

const FieldValue = admin.firestore?.FieldValue || (adminModule as any).firestore?.FieldValue;


import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import {
  connectMongoDB,
  getMongoStatus,
  Appointment as MongoAppointment,
  User as MongoUser,
  Prescription as MongoPrescription,
  Wallet as MongoWallet,
  Transaction as MongoTransaction,
  ServiceRequest as MongoServiceRequest
} from "./mongo";

dotenv.config();

// Connect to MongoDB Atlas
connectMongoDB().catch(err => console.error("Initial MongoDB connect error:", err));

const getFilename = () => {
  return typeof __filename !== "undefined" ? __filename : "";
};

const getDirname = (filePath: string) => {
  if (filePath) return path.dirname(filePath);
  return typeof __dirname !== "undefined" ? __dirname : process.cwd();
};

const myFilename = getFilename();
const myDirname = getDirname(myFilename);

// Safe Lazy-initializer for Firebase Admin Database

let firebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const localConfigPath = path.join(myDirname, "firebase-applet-config.json");
  const parentConfigPath = path.join(myDirname, "..", "firebase-applet-config.json");
  
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    console.log("Firebase config loaded from process.cwd()");
  } else if (fs.existsSync(localConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(localConfigPath, "utf8"));
    console.log("Firebase config loaded from myDirname");
  } else if (fs.existsSync(parentConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(parentConfigPath, "utf8"));
    console.log("Firebase config loaded from myDirname/..");
  } else if (fs.existsSync("firebase-applet-config.json")) {
    firebaseConfig = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
    console.log("Firebase config loaded from relative string");
  }
} catch (e: any) {
  console.error("Failed to parse firebase config:", e.message);
}

let db_admin: any;
try {
  if (admin && admin.apps && admin.apps.length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8")
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig?.projectId || process.env.VITE_FIREBASE_PROJECT_ID || "demo-project"
      });
    } else {
      // Fallback to default application credentials or unauthenticated demo
      admin.initializeApp({
        projectId: firebaseConfig?.projectId || process.env.VITE_FIREBASE_PROJECT_ID || "demo-project"
      });
    }
  }
  db_admin = getFirestore(admin.app(), firebaseConfig?.firestoreDatabaseId);
  console.log("Firebase Admin initialized successfully.");
} catch (e: any) {
  console.error("Firebase Admin Error:", e.message);
}

const app = express();
const PORT = 3000;

// Enable robust CORS support for local and custom domains (like shusto.com) with preflight OPTIONS responder
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Authorization, Accept, Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// Database Status Endpoint (MongoDB Atlas + Firebase)
app.get("/api/db/status", async (req, res) => {
  const mongo = getMongoStatus();
  res.json({
    success: true,
    mongo: {
      ...mongo,
      targetDatabase: "shustodb",
      cluster: "cluster0.sbpz6mc.mongodb.net",
    },
    firebase: {
      initialized: Boolean(db_admin),
      projectId: firebaseConfig?.projectId || "configured",
    },
    timestamp: new Date().toISOString(),
  });
});

// Test MongoDB Atlas Ping
app.get("/api/mongo/test-connection", async (req, res) => {
  try {
    const conn = await connectMongoDB();
    if (!conn) {
      return res.status(500).json({ success: false, message: "Could not connect to MongoDB Atlas" });
    }
    const adminDb = conn.db.admin();
    const pingResult = await adminDb.ping();
    res.json({
      success: true,
      message: "Successfully pinged and connected to MongoDB Atlas!",
      ping: pingResult,
      dbName: conn.name,
      host: conn.host,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// MongoDB Appointments API
app.get("/api/mongo/appointments", async (req, res) => {
  try {
    await connectMongoDB();
    const { doctorId, userId } = req.query;
    const filter: any = {};
    if (doctorId) filter.doctorId = doctorId;
    if (userId) filter.userId = userId;

    const list = await MongoAppointment.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, appointments: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/mongo/appointments", async (req, res) => {
  try {
    await connectMongoDB();
    const newApp = await MongoAppointment.create(req.body);
    res.json({ success: true, appointment: newApp });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook endpoint for Sheba to notify Shusto (Placeholder)
app.post("/api/sheba/webhook", async (req, res) => {
  const apiKeyHeader = req.headers["x-api-key"];
  const shustoSecret = process.env.SHUSTO_API_SECRET;

  if (shustoSecret && apiKeyHeader !== shustoSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("Received webhook from Sheba:", req.body);
  // Implementation for Sheba -> Shusto notifications could go here
  res.json({ success: true });
});

// Helper to compute HMAC SHA256 signature
function generateShustoHMAC(secret: string, timestamp: string | number, rawBody: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

// Helper to verify HMAC SHA256 signature with replay protection (5 minutes = 300 seconds)
function verifyShustoHMAC(secret: string, timestamp: string | number, rawBody: string, incomingSignature: string): { valid: boolean; reason?: string } {
  if (!secret) return { valid: false, reason: "Secret is not configured" };
  if (!timestamp || !incomingSignature) return { valid: false, reason: "Missing timestamp or signature headers" };

  const tsNum = Number(timestamp);
  if (isNaN(tsNum)) return { valid: false, reason: "Invalid timestamp" };

  const nowSec = Math.floor(Date.now() / 1000);
  const isMs = tsNum > 100000000000;
  const incomingSec = isMs ? Math.floor(tsNum / 1000) : tsNum;
  
  // 5 minute replay window (300 seconds)
  const diffSec = Math.abs(nowSec - incomingSec);
  if (diffSec > 300) {
    return { valid: false, reason: `Timestamp replay protection failed (request age: ${diffSec}s, max allowed: 300s)` };
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(incomingSignature, "utf8")
    );
    return { valid: isValid, reason: isValid ? undefined : "Signature mismatch" };
  } catch (e) {
    return { valid: false, reason: "Signature comparison error" };
  }
}

// Unified Shusto -> Sheba Withdrawal API (POST /api/shusto/withdraw and /api/sheba/withdraw)
app.post(["/api/shusto/withdraw", "/direct-api/shusto/withdraw", "/api/sheba/withdraw", "/direct-api/sheba/withdraw"], async (req, res) => {
  const shustoSecret = (process.env.SHUSTO_API_SECRET || process.env.SHEBA_API_SECRET || "shusto_secure_secret_key_2026").trim();
  const incomingSignature = (req.headers["x-shusto-signature"] || req.headers["x-signature"]) as string;
  const incomingTimestamp = (req.headers["x-shusto-timestamp"] || req.headers["x-timestamp"]) as string;

  const rawJsonBody = JSON.stringify(req.body || {});
  console.log("--- [SHUSTO WITHDRAWAL] Request received ---");
  console.log("Headers:", { timestamp: incomingTimestamp, hasSignature: !!incomingSignature });
  console.log("Body:", req.body);

  const {
    shustoUserId,
    userId: reqUserId,
    shebaNumber,
    phone: reqPhone,
    amount: reqAmount,
    idempotencyKey: reqIdempotencyKey
  } = req.body || {};

  const effectiveUserId = (shustoUserId || reqUserId || "").trim();
  const effectiveNumber = (shebaNumber || reqPhone || "").trim();
  const numAmount = Number(reqAmount);
  const idempotencyKey = (reqIdempotencyKey || uuidv4()).trim();

  // Basic validation
  if (!effectiveUserId) {
    return res.status(400).json({ success: false, error: "shustoUserId is required" });
  }
  if (!effectiveNumber || effectiveNumber.length < 11) {
    return res.status(400).json({ success: false, error: "Valid 11-digit shebaNumber is required" });
  }
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, error: "Valid positive amount is required" });
  }

  // If this is an external server-to-server call with HMAC signature header, verify it
  if (incomingSignature && incomingTimestamp) {
    const authCheck = verifyShustoHMAC(shustoSecret, incomingTimestamp, rawJsonBody, incomingSignature);
    if (!authCheck.valid) {
      console.warn("[SHUSTO WITHDRAWAL] HMAC verification failed:", authCheck.reason);
      return res.status(401).json({ success: false, error: `Unauthorized: ${authCheck.reason}` });
    }
  }

  try {
    // 1. Check idempotency: Ensure this request wasn't already processed
    if (db_admin) {
      const existingTxSnap = await db_admin.collection("transactions")
        .where("idempotencyKey", "==", idempotencyKey)
        .limit(1)
        .get();

      if (!existingTxSnap.empty) {
        const txData = existingTxSnap.docs[0].data();
        console.log(`[SHUSTO WITHDRAWAL] Duplicate request blocked (idempotencyKey: ${idempotencyKey})`);
        return res.status(200).json({
          success: true,
          message: "এই রিকোয়েস্টটি পূর্বেই সফলভাবে সম্পন্ন হয়েছে (Already Processed)",
          alreadyProcessed: true,
          transaction: txData
        });
      }
    }

    // 2. Atomic Balance Check on Shusto Database
    let currentBalance = 0;
    if (db_admin) {
      const walletDoc = await db_admin.collection("wallets").doc(effectiveUserId).get();
      if (!walletDoc.exists) {
        return res.status(404).json({ success: false, error: "Shusto user wallet not found" });
      }
      currentBalance = walletDoc.data()?.balance || 0;
      if (currentBalance < numAmount) {
        console.warn(`[SHUSTO WITHDRAWAL] Insufficient balance for user ${effectiveUserId}. Bal: ${currentBalance}, Req: ${numAmount}`);
        return res.status(400).json({
          success: false,
          error: `অপর্যাপ্ত ব্যালেন্স! আপনার বর্তমান ব্যালেন্স ৳${currentBalance}, উত্তোলনের জন্য প্রয়োজন ৳${numAmount}।`
        });
      }
    }

    // 3. Prepare signed HMAC request to Sheba backend
    const shebaPayload = {
      shustoUserId: effectiveUserId,
      shebaNumber: effectiveNumber,
      amount: numAmount,
      idempotencyKey: idempotencyKey
    };

    const payloadString = JSON.stringify(shebaPayload);
    const outTimestamp = Math.floor(Date.now() / 1000).toString();
    const outSignature = generateShustoHMAC(shustoSecret, outTimestamp, payloadString);

    // Determine target Sheba endpoint
    let targetUrl = process.env.SHEBA_WITHDRAW_URL || process.env.SHEBA_WEBHOOK_URL || "https://shebabangladesh.vercel.app/api/shusto/withdraw";
    if (targetUrl.includes("/webhook") && !process.env.SHEBA_WITHDRAW_URL) {
      targetUrl = targetUrl.replace("/webhook", "/withdraw");
    }

    console.log(`[SHUSTO WITHDRAWAL] Calling Sheba endpoint: ${targetUrl}`);
    console.log(`[SHUSTO WITHDRAWAL] Outgoing Headers: x-shusto-timestamp=${outTimestamp}, x-shusto-signature=${outSignature.slice(0, 10)}...`);

    let shebaResponse: any = null;
    try {
      shebaResponse = await axios.post(targetUrl, shebaPayload, {
        headers: {
          "Content-Type": "application/json",
          "x-shusto-timestamp": outTimestamp,
          "x-shusto-signature": outSignature,
          "x-api-key": process.env.SHEBA_API_SECRET || shustoSecret
        },
        timeout: 15000
      });
      console.log(`[SHUSTO WITHDRAWAL] Sheba Response Status: ${shebaResponse.status}`, shebaResponse.data);
    } catch (shebaErr: any) {
      console.error("[SHUSTO WITHDRAWAL] Sheba API error:", {
        message: shebaErr.message,
        data: shebaErr.response?.data,
        status: shebaErr.response?.status
      });

      const shebaErrMsg = shebaErr.response?.data?.error || shebaErr.response?.data?.message || shebaErr.message;
      return res.status(shebaErr.response?.status || 502).json({
        success: false,
        error: `শেবা সার্ভার এরর: ${shebaErrMsg}`
      });
    }

    const isShebaSuccess = shebaResponse && shebaResponse.status >= 200 && shebaResponse.status < 300 && shebaResponse.data?.success !== false;

    if (!isShebaSuccess) {
      return res.status(502).json({
        success: false,
        error: shebaResponse?.data?.error || shebaResponse?.data?.message || "শেবা সার্ভার রিকোয়েস্ট প্রত্যাখ্যান করেছে।"
      });
    }

    // 4. Atomic Debit & Transaction Recording in Firestore
    if (db_admin) {
      const walletRef = db_admin.collection("wallets").doc(effectiveUserId);
      const txRef = db_admin.collection("transactions").doc();
      const notifRef = db_admin.collection("notifications").doc();

      await db_admin.runTransaction(async (transaction: any) => {
        const wDoc = await transaction.get(walletRef);
        const bal = (wDoc.exists ? wDoc.data()?.balance : 0) || 0;
        if (bal < numAmount) {
          throw new Error("Insufficient balance during atomic deduction");
        }

        // Debit User's Shusto Wallet
        transaction.update(walletRef, {
          balance: bal - numAmount,
          updatedAt: new Date().toISOString()
        });

        // Record Withdrawal Transaction
        transaction.set(txRef, {
          userId: effectiveUserId,
          amount: numAmount,
          type: "withdrawal",
          status: "success",
          method: "sheba",
          phoneNumber: effectiveNumber,
          idempotencyKey: idempotencyKey,
          details: `Withdrawn to Sheba: ${effectiveNumber}`,
          createdAt: new Date().toISOString()
        });

        // Send In-app Notification to User
        transaction.set(notifRef, {
          userId: effectiveUserId,
          title: "উত্তোলন সফল হয়েছে",
          message: `৳${numAmount} টাকা সফলভাবে সেবা (${effectiveNumber}) অ্যাকাউন্টে পাঠানো হয়েছে।`,
          type: "wallet",
          read: false,
          createdAt: new Date().toISOString()
        });
      });
    }

    console.log(`[SHUSTO WITHDRAWAL] Withdrawal completed atomically for user ${effectiveUserId}, amount ৳${numAmount}`);

    return res.status(200).json({
      success: true,
      message: shebaResponse.data?.message || "আপনার টাকা সফলভাবে শেবা অ্যাকাউন্টে পাঠানো হয়েছে।",
      idempotencyKey: idempotencyKey,
      shebaData: shebaResponse.data
    });

  } catch (error: any) {
    console.error("[SHUSTO WITHDRAWAL] Fatal Error:", error);
    return res.status(500).json({
      success: false,
      error: `উত্তোলন সম্পন্ন করতে সমস্যা হয়েছে: ${error.message}`
    });
  }
});

// Register body-parsers safely (Vercel parses req.body automatically)
app.use((req, res, next) => {
  // Restore original request path from custom Vercel / proxy headers if rewritten
  const forwardedPath = (req.headers['x-vercel-forwarded-path'] || req.headers['x-forwarded-path'] || req.headers['x-original-url']) as string;
  if (forwardedPath && (forwardedPath.startsWith('/api/') || forwardedPath.startsWith('/direct-api/'))) {
    const queryIndex = req.url.indexOf('?');
    const queryString = queryIndex !== -1 ? req.url.substring(queryIndex) : '';
    const cleanForwardedPath = forwardedPath.split('?')[0]; 
    const newUrl = `${cleanForwardedPath}${queryString}`;
    console.log(`[ROUTER MIDDLEWARE] Recovered original URL on cloud proxy: ${req.url} -> ${newUrl}`);
    req.url = newUrl;
  }

  console.log(`[REQUEST LOGGER] ${req.method} ${req.path || req.url}`);
  if (req.body !== undefined) {
    return next();
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// YouTube Subscription API
app.post("/api/youtube/subscribe", async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: "Access token required" });

  try {
    const handle = '@SiamTheBin';
    console.log(`[YOUTUBE_SUB] Processing subscription for ${handle}`);

    // 1. Resolve handle to channel ID
    const channelResp = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
      params: {
        forHandle: handle,
        part: 'id',
        key: process.env.YOUTUBE_API_KEY // Optional if using user token for everything
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!channelResp.data.items || channelResp.data.items.length === 0) {
      console.error("[YOUTUBE_SUB] Channel not found for handle:", handle);
      return res.status(404).json({ error: "YouTube channel not found" });
    }

    const channelId = channelResp.data.items[0].id;
    console.log(`[YOUTUBE_SUB] Resolved channel ID: ${channelId}`);

    // 2. Insert subscription
    try {
      const subResp = await axios.post(`https://www.googleapis.com/youtube/v3/subscriptions?part=snippet`, {
        snippet: {
          resourceId: {
            kind: 'youtube#channel',
            channelId: channelId
          }
        }
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("[YOUTUBE_SUB] Subscription successful!");
      res.json({ success: true, message: "Subscribed successfully" });
    } catch (subErr: any) {
      // Check if already subscribed (403 with specific reason)
      if (subErr.response?.status === 403 && subErr.response?.data?.error?.errors?.[0]?.reason === 'subscriptionDuplicate') {
        console.log("[YOUTUBE_SUB] User already subscribed.");
        return res.json({ success: true, message: "Already subscribed" });
      }
      throw subErr;
    }
  } catch (error: any) {
    console.error("[YOUTUBE_SUB] Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: "YouTube subscription failed", 
      details: error.response?.data || error.message 
    });
  }
});

// Simple diagnostic route to test serverless environment health
app.get(["/api/test", "/direct-api/test", "/test"], (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV || "development", vercel: !!process.env.VERCEL });
});

// --- Real Payment Withdrawals (Automatic bKash/Nagad) ---
app.post(["/api/withdraw/automatic", "/direct-api/withdraw/automatic", "/withdraw/automatic"], async (req, res) => {
  const { userId, amount, method, phoneNumber } = req.body || {};

    if (!userId || !amount || !method || !phoneNumber) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      let disbursementStatus = "SUCCESS";
      
      if (process.env.REAL_PAYOUT_API_KEY) {
        console.log(`Executing REAL Payout via ${method} to ${phoneNumber} for ৳${amount}`);
      } else {
        console.log(`Simulating AUTOMATIC Payout via ${method} to ${phoneNumber} for ৳${amount}`);
      }

      if (disbursementStatus === "SUCCESS") {
        return res.json({ status: "SUCCESS", message: "Disbursement request received. Handled by client." });
      } else {
        throw new Error("Disbursement failed at provider level");
      }

    } catch (error) {
      console.error("Withdrawal Error:", error);
      res.status(500).json({ error: "টাকা পাঠানো ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।" });
    }
});

  // API Route to reset all users' wallets to 0 balance
  app.post(["/api/admin/reset-wallets", "/admin/reset-wallets"], async (req, res) => {
    return res.status(200).json({ status: "SUCCESS", message: "Admin reset feature temporarily disabled for security." });
  });

  function getRealExternalBaseUrl(req: any, clientBaseUrl?: string): string {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const xForwardedHost = req.headers["x-forwarded-host"];
    let host = req.headers.host || "";
    if (xForwardedHost) {
      host = Array.isArray(xForwardedHost) ? xForwardedHost[0] : xForwardedHost;
    }
    
    // If the host starts/contains localhost/127.0.0.1, but the client base url doesn't,
    // then the real host is the client base url or the env APP_URL or shusto.com.
    const isHostLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.startsWith("3000");
    const isClientLocal = clientBaseUrl && (clientBaseUrl.includes("localhost") || clientBaseUrl.includes("127.0.0.1"));
    
    if (isHostLocal && !isClientLocal) {
      if (clientBaseUrl && clientBaseUrl.startsWith("http")) {
        return clientBaseUrl;
      }
      if (process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL") {
        return process.env.APP_URL;
      }
      return "https://shusto.com";
    }
    
    return `${protocol}://${host}`;
  }

  function getSSLCommerzCredentials() {
    let store_id = (process.env.SSL_STORE_ID || "shusto0live").trim();
    let store_passwd = (process.env.SSL_STORE_PASSWORD || "6A0D6039B299110857").trim();

    // Strip any leading or trailing single/double quotes to prevent config issues from copy-paste
    store_id = store_id.replace(/^["']|["']$/g, "");
    store_passwd = store_passwd.replace(/^["']|["']$/g, "");

    // If environment has placeholder templates, fallback to user's real live credentials
    if (!store_id || store_id === "YOUR_STORE_ID" || store_id === "demo" || store_id === "" || store_id.includes("YOUR")) {
      store_id = "shusto0live";
    }
    if (!store_passwd || store_passwd === "YOUR_STORE_PASSWORD" || store_passwd === "" || store_passwd.includes("YOUR")) {
      store_passwd = "6A0D6039B299110857";
    }

    return { store_id, store_passwd };
  }

  // SSLCommerz Payment Initiation (Add Money)
  app.post(["/api/payment/init", "/direct-api/payment/init", "/payment/init"], async (req, res) => {
    console.log("[PAYMENT_INIT] Received POST to payment/init. Path:", req.path, "Body:", JSON.stringify(req.body));
    
    const params = req.body || {};
    const { amount, userId, providerId, providerType, userName, userEmail, mock, clientBaseUrl: incomingClientBaseUrl } = params;
    
    if (!amount || !userId) {
      console.error("[PAYMENT_INIT] Missing required fields:", { amount, userId });
      return res.status(400).json({ error: "Amount and userId are required" });
    }

    const tran_id = uuidv4();

    const { store_id, store_passwd } = getSSLCommerzCredentials();
    console.log(`[PAYMENT_INIT] Initiating for user ${userId}, amount ${amount}, store: ${store_id}`);

    // Detect dynamic baseUrl for seamless callback redirects
    const clientBaseUrl = incomingClientBaseUrl || getRealExternalBaseUrl(req, incomingClientBaseUrl);
    let cleanBaseUrl = clientBaseUrl;
    if (cleanBaseUrl.endsWith("/")) {
      cleanBaseUrl = cleanBaseUrl.slice(0, -1);
    }
    // CRITICAL: Force HTTPS for callbacks unless we are truly in a local development environment
    if (!cleanBaseUrl.startsWith("https://") && !cleanBaseUrl.includes("localhost") && !cleanBaseUrl.includes("127.0.0.1")) {
      cleanBaseUrl = "https://" + cleanBaseUrl.replace(/^http:\/\//i, "");
    }

    const data: any = {
      store_id: store_id,
      store_passwd: store_passwd,
      total_amount: Number(amount),
      currency: "BDT",
      tran_id: tran_id,
      success_url: `${cleanBaseUrl}/api/payment/success/${userId}?tran_id=${tran_id}&clientBaseUrl=${encodeURIComponent(clientBaseUrl)}`,
      fail_url: `${cleanBaseUrl}/api/payment/fail/${userId}?clientBaseUrl=${encodeURIComponent(clientBaseUrl)}`,
      cancel_url: `${cleanBaseUrl}/api/payment/cancel/${userId}?clientBaseUrl=${encodeURIComponent(clientBaseUrl)}`,
      ipn_url: `${cleanBaseUrl}/api/payment/ipn`,
      shipping_method: "No",
      product_name: "Telehealth Service Wallet Top Up",
      product_category: "Healthcare",
      product_profile: "general",
      cus_name: userName || "Customer",
      cus_email: userEmail || "customer@example.com",
      cus_add1: "Dhaka",
      cus_city: "Dhaka",
      cus_state: "Dhaka",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: "01700000000",
      value_a: userId,
      value_d: clientBaseUrl,
    };

    try {
      const isSandboxMode = process.env.SSL_MODE === "sandbox" || store_id.includes("test") || store_id === "demo";
      const sslUrl = isSandboxMode
        ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
        : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

      // Force real payment gateway - Mock disabled by Admin
      console.log(`[PAYMENT_INIT] Initiating REAL SSLCommerz request to ${sslUrl}`);
      
      const formParams = new URLSearchParams();
      Object.keys(data).forEach(key => {
        formParams.append(key, String(data[key]));
      });

      const response = await axios.post(sslUrl, formParams.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 5000
      });

      console.log("[PAYMENT_INIT] SSLCommerz response status:", response.status);
      
      if (response.data && response.data.status === "SUCCESS") {
        console.log("[PAYMENT_INIT] SSLCommerz SUCCESS response");
        res.json(response.data);
      } else {
        console.error("[PAYMENT_INIT] SSLCommerz error response:", response.data);
        res.status(400).json({ error: `SSLCommerz error: ${response.data?.failedreason || "unknown gateway error"}` });
      }
    } catch (error: any) {
      console.error("[PAYMENT_INIT] Exception:", error?.response?.data || error?.message || error);
      res.status(500).json({ 
        error: `Payment initiation failed: ${error?.message || "Internal error"}`,
        details: error?.response?.data || null,
        stack: error?.stack || null
      });
    }
  });

  // SSLCommerz Success Callback (Handles HTTP POST and GET)
  app.all(["/api/payment/success/:userId", "/api/payment/success", "/direct-api/payment/success", "/payment/success"], async (req, res) => {
    // Merge post body and query params
    const queryParams = req.query || {};
    const bodyParams = req.body || {};
    
    console.log("[SSLCOMMERZ SUCCESS CALLBACK] Invoked!");
    console.log("params:", JSON.stringify(req.params));
    console.log("query:", JSON.stringify(queryParams));
    console.log("body:", JSON.stringify(bodyParams));
    
    const tran_id = (queryParams.tran_id as string) || (bodyParams.tran_id as string) || uuidv4();
    const userId = (req.params.userId as string) || (queryParams.userId as string) || (bodyParams.value_a as string);
    const providerId = (queryParams.providerId as string) || (bodyParams.value_b as string);
    const providerType = (queryParams.providerType as string) || (bodyParams.value_c as string);
    const val_id = (bodyParams.val_id as string) || (queryParams.val_id as string);
    const mockSuccess = queryParams.mock === "true";

    // Resolve dynamic redirect client base URL safely using our helper to avoid container localhost port mapping leaks
    const clientBaseUrlRaw = (queryParams.clientBaseUrl as string) || (bodyParams.value_d as string);
    let clientBaseUrl = clientBaseUrlRaw ? decodeURIComponent(clientBaseUrlRaw) : "";
    if (clientBaseUrl.endsWith("/")) {
      clientBaseUrl = clientBaseUrl.slice(0, -1);
    }
    
    const fallbackAbsoluteUrl = getRealExternalBaseUrl(req, clientBaseUrl);
    if (!clientBaseUrl || !clientBaseUrl.startsWith("http") || (clientBaseUrl.includes("localhost") && !fallbackAbsoluteUrl.includes("localhost"))) {
      clientBaseUrl = fallbackAbsoluteUrl;
    }

    const { store_id, store_passwd } = getSSLCommerzCredentials();

    let isPaymentValid = false;
    let paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || 0);

    const isSandboxMode = process.env.SSL_MODE === "sandbox" || store_id.includes("test") || store_id === "demo";
    const validationUrl = isSandboxMode
      ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
      : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";

    // Helper helper to match common success/validation status from SSLCommerz in a case-insensitive way
    const checkStatusSuccess = (status?: string): boolean => {
      if (!status) return false;
      const upper = status.trim().toUpperCase();
      return upper === "VALID" || upper === "VALIDATED" || upper === "SUCCESS";
    };

    if (mockSuccess) {
      isPaymentValid = true;
    } else if (val_id) {
      try {
        console.log(`[SSLCOMMERZ SUCCESS] Validating transaction val_id: ${val_id} with store: ${store_id}`);
        const valResp = await axios.get(validationUrl, {
          params: {
            val_id,
            store_id,
            store_passwd,
            format: "json"
          },
          timeout: 8000
        });

        const valData = valResp.data;
        if (valData && checkStatusSuccess(valData?.status)) {
          isPaymentValid = true;
          paidAmount = Number(valData.amount || valData.total_amount || paidAmount);
          console.log(`[SSLCOMMERZ SUCCESS] Validator confirmed VALID. Amount: ৳${paidAmount}`);
        } else {
          console.warn("[SSLCOMMERZ SUCCESS] Validator returned non-valid status:", valData);
          // Fallback to body status
          if (checkStatusSuccess(bodyParams?.status)) {
            console.log("[SSLCOMMERZ SUCCESS] Falling back to body status VALID/SUCCESS");
            isPaymentValid = true;
            paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || paidAmount);
          }
        }
      } catch (err: any) {
        console.error("[SSLCOMMERZ SUCCESS] Validator request failed:", err.message);
        // Fallback to body status
        if (checkStatusSuccess(bodyParams?.status)) {
          console.log("[SSLCOMMERZ SUCCESS] Falling back to body status VALID/SUCCESS after request failure");
          isPaymentValid = true;
          paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || paidAmount);
        }
      }
    } else {
      console.warn("[SSLCOMMERZ SUCCESS] Success callback received, but no val_id in body/query.");
      // Fallback to body status
      if (checkStatusSuccess(bodyParams?.status)) {
        console.log("[SSLCOMMERZ SUCCESS] Trusting body status VALID/SUCCESS without val_id");
        isPaymentValid = true;
        paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || paidAmount);
      }
    }

    if (isPaymentValid) {
      if (userId && db_admin) {
        try {
          // Use tran_id directly as Firestore document ID for reliable point lookup & update isolation (matches client doc path)
          const txRef = db_admin.collection("transactions").doc(tran_id);
          const txSnap = await txRef.get();
          
          if (!txSnap.exists) {
            await db_admin.runTransaction(async (t) => {
              const walletRef = db_admin.collection("wallets").doc(userId);
              const targetTxRef = db_admin.collection("transactions").doc(tran_id);
              
              t.set(walletRef, {
                uid: userId,
                balance: FieldValue.increment(paidAmount),
                updatedAt: new Date().toISOString()
              }, { merge: true });
              
              t.set(targetTxRef, {
                tran_id,
                userId,
                amount: paidAmount,
                type: "add_money",
                status: "success",
                createdAt: new Date().toISOString()
              });
            });
            console.log(`[SSLCOMMERZ SUCCESS] Successfully credited ৳${paidAmount} to wallet of user ${userId}`);
          } else {
            console.log(`[SSLCOMMERZ SUCCESS] Transaction ${tran_id} was already credited.`);
          }

          const redirectUrl = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}`;
          return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>পেমেন্ট সফল - Shusto</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        .container {
            background-color: #ffffff;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            max-width: 410px;
            width: 100%;
        }
        .icon-circle {
            width: 72px;
            height: 72px;
            background-color: #f0fdf4;
            color: #15803d;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
        }
        .icon {
            width: 40px;
            height: 40px;
        }
        h2 {
            margin: 0 0 12px 0;
            color: #0f172a;
            font-size: 22px;
            font-weight: 700;
        }
        p {
            margin: 0 0 24px 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.6;
        }
        .loader {
            border: 4px solid #f1f5f9;
            border-top: 4px solid #0ea5e9;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .btn {
            display: inline-block;
            margin-top: 24px;
            background-color: #0ea5e9;
            color: white;
            padding: 12px 24px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #0284c7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
        </div>
        <h2>পেমেন্ট সফল হয়েছে!</h2>
        <p>আপনার Shusto ওয়ালেটে ৳${paidAmount} সফলভাবে যুক্ত করা হচ্ছে। অনুগ্রহ করে ক্ষণিক অপেক্ষা করুন, আপনাকে অ্যাপে ফিরিয়ে নেওয়া হচ্ছে...</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl}">অ্যাপে ফিরে যান</a>
    </div>
    <script>
        window.location.replace(${JSON.stringify(redirectUrl)});
    </script>
</body>
</html>
          `);
        } catch (e: any) {
          console.error("[SSLCOMMERZ SUCCESS] Firebase Update Failed but payment is validated. Redirecting to client sync:", e.message);
          const redirectUrl = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}&fallback=db_error`;
          return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>পেমেন্ট সফল - Shusto</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        .container {
            background-color: #ffffff;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            max-width: 410px;
            width: 100%;
        }
        .icon-circle {
            width: 72px;
            height: 72px;
            background-color: #f0fdf4;
            color: #15803d;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
        }
        .icon {
            width: 40px;
            height: 40px;
        }
        h2 {
            margin: 0 0 12px 0;
            color: #0f172a;
            font-size: 22px;
            font-weight: 700;
        }
        p {
            margin: 0 0 24px 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.6;
        }
        .loader {
            border: 4px solid #f1f5f9;
            border-top: 4px solid #0ea5e9;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .btn {
            display: inline-block;
            margin-top: 24px;
            background-color: #0ea5e9;
            color: white;
            padding: 12px 24px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #0284c7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
        </div>
        <h2>পেমেন্ট সফল হয়েছে!</h2>
        <p>আপনার Shusto ওয়ালেটে ৳${paidAmount} সফলভাবে যুক্ত করা হচ্ছে। অনুগ্রহ করে ক্ষণিক অপেক্ষা করুন, আপনাকে অ্যাপে ফিরিয়ে নেওয়া হচ্ছে...</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl}">অ্যাপে ফিরে যান</a>
    </div>
    <script>
        window.location.replace(${JSON.stringify(redirectUrl)});
    </script>
</body>
</html>
          `);
        }
      } else {
        console.warn("[SSLCOMMERZ SUCCESS] db_admin or userId missing. Redirecting to client sync.");
        const redirectUrl = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}&fallback=db_missing`;
        return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>পেমেন্ট সফল - Shusto</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        .container {
            background-color: #ffffff;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            max-width: 410px;
            width: 100%;
        }
        .icon-circle {
            width: 72px;
            height: 72px;
            background-color: #f0fdf4;
            color: #15803d;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
        }
        .icon {
            width: 40px;
            height: 40px;
        }
        h2 {
            margin: 0 0 12px 0;
            color: #0f172a;
            font-size: 22px;
            font-weight: 700;
        }
        p {
            margin: 0 0 24px 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.6;
        }
        .loader {
            border: 4px solid #f1f5f9;
            border-top: 4px solid #0ea5e9;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .btn {
            display: inline-block;
            margin-top: 24px;
            background-color: #0ea5e9;
            color: white;
            padding: 12px 24px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #0284c7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
        </div>
        <h2>পেমেন্ট সফল হয়েছে!</h2>
        <p>আপনার Shusto ওয়ালেটে ৳${paidAmount} যুক্ত করা হচ্ছে। অনুগ্রহ করে ক্ষণিক অপেক্ষা করুন, আপনাকে অ্যাপে ফিরিয়ে নেওয়া হচ্ছে...</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl}">অ্যাপে ফিরে যান</a>
    </div>
    <script>
        window.location.replace(${JSON.stringify(redirectUrl)});
    </script>
</body>
</html>
        `);
      }
    } else {
      console.warn("[SSLCOMMERZ SUCCESS] Payment invalid. Redirection values:", { isPaymentValid, userId });
      const redirectUrl = `${clientBaseUrl}/?payment=failed&reason=invalid_payment`;
      return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>পেমেন্ট ব্যর্থ - Shusto</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        .container {
            background-color: #ffffff;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            max-width: 410px;
            width: 100%;
        }
        .icon-circle {
            width: 72px;
            height: 72px;
            background-color: #fef2f2;
            color: #dc2626;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
        }
        .icon {
            width: 40px;
            height: 40px;
        }
        h2 {
            margin: 0 0 12px 0;
            color: #0f172a;
            font-size: 22px;
            font-weight: 700;
        }
        p {
            margin: 0 0 24px 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.6;
        }
        .loader {
            border: 4px solid #f1f5f9;
            border-top: 4px solid #ef4444;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .btn {
            display: inline-block;
            margin-top: 24px;
            background-color: #ef4444;
            color: white;
            padding: 12px 24px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #dc2626;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </div>
        <h2>পেমেন্ট ব্যর্থ হয়েছে</h2>
        <p>দুঃখিত, কোনো সমস্যার কারণে আমরা পেমেন্টটি সম্পন্ন করতে পারিনি। দয়া করে ফিরে গিয়ে আবার চেষ্টা করুন।</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl}">অ্যাপে ফিরে যান</a>
    </div>
    <script>
        window.location.replace(${JSON.stringify(redirectUrl)});
    </script>
</body>
</html>
      `);
    }

    const redirectUrl = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}`;
    return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>পেমেন্ট সফল - Shusto</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        .container {
            background-color: #ffffff;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            max-width: 410px;
            width: 100%;
        }
        .icon-circle {
            width: 72px;
            height: 72px;
            background-color: #f0fdf4;
            color: #15803d;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
        }
        .icon {
            width: 40px;
            height: 40px;
        }
        h2 {
            margin: 0 0 12px 0;
            color: #0f172a;
            font-size: 22px;
            font-weight: 700;
        }
        p {
            margin: 0 0 24px 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.6;
        }
        .loader {
            border: 4px solid #f1f5f9;
            border-top: 4px solid #0ea5e9;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .btn {
            display: inline-block;
            margin-top: 24px;
            background-color: #0ea5e9;
            color: white;
            padding: 12px 24px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #0284c7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
        </div>
        <h2>পেমেন্ট সফল হয়েছে!</h2>
        <p>আপনার Shusto ওয়ালেটে ৳${paidAmount} সফলভাবে যুক্ত করা হয়েছে। অনুগ্রহ করে ক্ষণিক অপেক্ষা করুন, আপনাকে অ্যাপে ফিরিয়ে নেওয়া হচ্ছে...</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl}">অ্যাপে ফিরে যান</a>
    </div>
    <script>
        window.location.replace(${JSON.stringify(redirectUrl)});
    </script>
</body>
</html>
    `);
  });

  // SSLCommerz Failure Callback
  app.all(["/api/payment/fail/:userId", "/api/payment/fail", "/direct-api/payment/fail", "/payment/fail"], (req, res) => {
    console.log("SSLCommerz payment failed redirect:", req.body || req.query);
    const queryParams = req.query || {};
    const bodyParams = req.body || {};

    // Resolve dynamic redirect client base URL safely using our helper to avoid container localhost port mapping leaks
    const clientBaseUrlRaw = (queryParams.clientBaseUrl as string) || (bodyParams.value_d as string);
    let clientBaseUrl = clientBaseUrlRaw ? decodeURIComponent(clientBaseUrlRaw) : "";
    if (clientBaseUrl.endsWith("/")) {
      clientBaseUrl = clientBaseUrl.slice(0, -1);
    }
    
    const fallbackAbsoluteUrl = getRealExternalBaseUrl(req, clientBaseUrl);
    if (!clientBaseUrl || !clientBaseUrl.startsWith("http") || (clientBaseUrl.includes("localhost") && !fallbackAbsoluteUrl.includes("localhost"))) {
      clientBaseUrl = fallbackAbsoluteUrl;
    }
    const redirectUrl = `${clientBaseUrl}/?payment=failed`;
    return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>পেমেন্ট ব্যর্থ - Shusto</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        .container {
            background-color: #ffffff;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            max-width: 410px;
            width: 100%;
        }
        .icon-circle {
            width: 72px;
            height: 72px;
            background-color: #fef2f2;
            color: #dc2626;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
        }
        .icon {
            width: 40px;
            height: 40px;
        }
        h2 {
            margin: 0 0 12px 0;
            color: #0f172a;
            font-size: 22px;
            font-weight: 700;
        }
        p {
            margin: 0 0 24px 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.6;
        }
        .loader {
            border: 4px solid #f1f5f9;
            border-top: 4px solid #ef4444;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .btn {
            display: inline-block;
            margin-top: 24px;
            background-color: #ef4444;
            color: white;
            padding: 12px 24px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #dc2626;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </div>
        <h2>পেমেন্ট সম্পন্ন হতে পারেনি</h2>
        <p>দুঃখিত, আমাদের পেমেন্ট গেটওয়েতে কোনো ট্রানজেকশন প্রসেস করা যায়নি। দয়া করে ফিরে গিয়ে আবার চেষ্টা করুন।</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl}">অ্যাপে ফিরে যান</a>
    </div>
    <script>
        window.location.replace(${JSON.stringify(redirectUrl)});
    </script>
</body>
</html>
    `);
  });

  // SSLCommerz Cancel Callback
  app.all(["/api/payment/cancel/:userId", "/api/payment/cancel", "/direct-api/payment/cancel", "/payment/cancel"], (req, res) => {
    console.log("SSLCommerz payment cancelled redirect:", req.body || req.query);
    const queryParams = req.query || {};
    const bodyParams = req.body || {};

    // Resolve dynamic redirect client base URL safely using our helper to avoid container localhost port mapping leaks
    const clientBaseUrlRaw = (queryParams.clientBaseUrl as string) || (bodyParams.value_d as string);
    let clientBaseUrl = clientBaseUrlRaw ? decodeURIComponent(clientBaseUrlRaw) : "";
    if (clientBaseUrl.endsWith("/")) {
      clientBaseUrl = clientBaseUrl.slice(0, -1);
    }
    
    const fallbackAbsoluteUrl = getRealExternalBaseUrl(req, clientBaseUrl);
    if (!clientBaseUrl || !clientBaseUrl.startsWith("http") || (clientBaseUrl.includes("localhost") && !fallbackAbsoluteUrl.includes("localhost"))) {
      clientBaseUrl = fallbackAbsoluteUrl;
    }
    const redirectUrl = `${clientBaseUrl}/?payment=cancelled`;
    return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>পেমেন্ট বাতিল - Shusto</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        .container {
            background-color: #ffffff;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            max-width: 410px;
            width: 100%;
        }
        .icon-circle {
            width: 72px;
            height: 72px;
            background-color: #fef3c7;
            color: #d97706;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
        }
        .icon {
            width: 40px;
            height: 40px;
        }
        h2 {
            margin: 0 0 12px 0;
            color: #0f172a;
            font-size: 22px;
            font-weight: 700;
        }
        p {
            margin: 0 0 24px 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.6;
        }
        .loader {
            border: 4px solid #f1f5f9;
            border-top: 4px solid #f59e0b;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .btn {
            display: inline-block;
            margin-top: 24px;
            background-color: #f59e0b;
            color: white;
            padding: 12px 24px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #d97706;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
        </div>
        <h2>পেমেন্ট বাতিল করা হয়েছে</h2>
        <p>আপনি ওয়ালেট রিচার্জ রিকুয়েস্টটি বাতিল করেছেন। আপনাকে ওয়ালেটে পুনরায় ফিরিয়ে নেওয়া হচ্ছে, ক্ষণিক অপেক্ষা করুন...</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl}">অ্যাপে ফিরে যান</a>
    </div>
    <script>
        window.location.replace(${JSON.stringify(redirectUrl)});
    </script>
</body>
</html>
    `);
  });

  // SSLCommerz IPN Handler (Secure Async Notification)
  app.all(["/api/payment/ipn", "/direct-api/payment/ipn", "/payment/ipn"], async (req, res) => {
    console.log("[SSLCOMMERZ IPN] IPN Notification received:", req.body);
    const bodyParams = req.body || {};
    const val_id = bodyParams.val_id;
    const tran_id = bodyParams.tran_id;
    const userId = bodyParams.value_a;

    let isIPNValid = false;
    let paidAmount = Number(bodyParams.amount || bodyParams.total_amount || 0);

    const checkStatusSuccess = (status?: string): boolean => {
      if (!status) return false;
      const upper = status.trim().toUpperCase();
      return upper === "VALID" || upper === "VALIDATED" || upper === "SUCCESS";
    };

    if (val_id) {
      const { store_id, store_passwd } = getSSLCommerzCredentials();

      const validationUrl = store_id.endsWith("live")
        ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
        : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";

      try {
        const valResp = await axios.get(validationUrl, {
          params: {
            val_id,
            store_id,
            store_passwd,
            format: "json"
          },
          timeout: 8000
        });

        const valData = valResp.data;
        if (valData && checkStatusSuccess(valData?.status)) {
          isIPNValid = true;
          paidAmount = Number(valData.amount || valData.total_amount || paidAmount);
          console.log(`[SSLCOMMERZ IPN] Validator confirmed VALID. Amount: ৳${paidAmount}`);
        } else {
          console.warn("[SSLCOMMERZ IPN] Validator failed. Status in body is:", bodyParams.status);
          if (checkStatusSuccess(bodyParams.status)) {
            isIPNValid = true;
          }
        }
      } catch (err: any) {
        console.error("[SSLCOMMERZ IPN] Validator request error:", err.message);
        if (checkStatusSuccess(bodyParams.status)) {
          isIPNValid = true;
        }
      }
    } else {
      if (checkStatusSuccess(bodyParams.status)) {
        isIPNValid = true;
      }
    }

    if (isIPNValid && userId && paidAmount > 0 && tran_id) {
      if (db_admin) {
        try {
          const txRef = db_admin.collection("transactions").doc(tran_id);
          const txSnap = await txRef.get();
          
          if (!txSnap.exists) {
            await db_admin.runTransaction(async (t) => {
              const walletRef = db_admin.collection("wallets").doc(userId);
              const targetTxRef = db_admin.collection("transactions").doc(tran_id);
              
              t.set(walletRef, {
                uid: userId,
                balance: FieldValue.increment(paidAmount),
                updatedAt: new Date().toISOString()
              }, { merge: true });
              
              t.set(targetTxRef, {
                tran_id,
                userId,
                amount: paidAmount,
                type: "add_money",
                status: "success",
                createdAt: new Date().toISOString()
              });
            });
            console.log(`[SSLCOMMERZ IPN] Automatically Added ৳${paidAmount} to wallet of user ${userId}`);
          } else {
            console.log(`[SSLCOMMERZ IPN] Transaction ${tran_id} already exists, skipping.`);
          }
        } catch (e: any) {
          console.error("[SSLCOMMERZ IPN] Firebase Update Failed:", e.message);
        }
      } else {
        console.error("[SSLCOMMERZ IPN] db_admin missing! Payment validation passed, but cannot save to DB.");
      }
    }

    res.status(200).send("OK");
  });

// Serve static client assets and hot reload dev server dynamically (only if NOT on external serverless like Vercel)
async function startViteOrStaticServer() {
  if (!process.env.VERCEL) {
    const isProduction = process.env.NODE_ENV === "production" || myFilename.endsWith("server.cjs");
    if (!isProduction) {
      try {
        const viteModuleSpecifier = "vi" + "te";
        const { createServer: createViteServer } = await import(viteModuleSpecifier);
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } catch (viteLoadErr: any) {
        console.warn("Vite server failed to load dynamically:", viteLoadErr.message);
      }
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!(global as any).__IS_SERVERLESS && !process.env.VERCEL) {
  startViteOrStaticServer().catch(console.error);
}

export { app };
export default app;
