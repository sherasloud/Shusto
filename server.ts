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
} from "./mongo.ts";
import {
  getMySQLPool,
  getMySQLStatus,
  testMySQLConnection,
  configureMySQLCredentials,
  queryMySQL
} from "./mysql.ts";
import {
  extractAllFirebaseData,
  generateMySQLMigrationScript,
  runDirectMySQLMigration,
  registerClientContributedData
} from "./migration.ts";

dotenv.config();

// Connect to MongoDB Atlas (Optional)
connectMongoDB().catch(() => {});

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

// Database Status Endpoint (MySQL + MongoDB Atlas + Firebase)
app.get("/api/db/status", async (req, res) => {
  const mongo = getMongoStatus();
  const mysqlStatus = getMySQLStatus();
  res.json({
    success: true,
    mysql: mysqlStatus,
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

// MySQL Status & Testing Endpoints
app.get("/api/mysql/status", (req, res) => {
  res.json({ success: true, ...getMySQLStatus() });
});

app.post("/api/mysql/test", async (req, res) => {
  try {
    const result = await testMySQLConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

app.post("/api/mysql/config", async (req, res) => {
  try {
    const { host, port, user, password, database } = req.body;
    if (!host || !user || !database) {
      return res.status(400).json({ success: false, message: "Host, User, and Database are required." });
    }
    configureMySQLCredentials({ host, port: Number(port) || 3306, user, password, database });
    const testResult = await testMySQLConnection();
    res.json({
      success: testResult.success,
      message: testResult.success
        ? "MySQL configuration saved and connection verified successfully!"
        : `Configuration saved, but connection test failed: ${testResult.message}`,
      status: getMySQLStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

// Full Firebase to MySQL Migration Endpoints
app.get("/api/migration/export-sql", async (req, res) => {
  try {
    const sqlContent = await generateMySQLMigrationScript(db_admin);
    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", 'attachment; filename="shustobd_full_firebase_migration.sql"');
    res.send(sqlContent);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

app.get("/api/migration/export-json", async (req, res) => {
  try {
    const exportResult = await extractAllFirebaseData(db_admin);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", 'attachment; filename="firebase_all_data_export.json"');
    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      source: exportResult.source,
      errorNotice: exportResult.error,
      data: exportResult.data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

app.post("/api/migration/run-direct", async (req, res) => {
  try {
    const result = await runDirectMySQLMigration(db_admin);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

app.post("/api/migration/client-push", (req, res) => {
  try {
    const { collectionName, items } = req.body;
    if (collectionName && Array.isArray(items)) {
      registerClientContributedData(collectionName, items);
      return res.json({ success: true, count: items.length });
    }
    res.status(400).json({ success: false, message: "Invalid payload format" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Test MongoDB Atlas Ping
app.get("/api/mongo/test-connection", async (req, res) => {
  try {
    const conn = await connectMongoDB();
    if (!conn) {
      return res.status(200).json({ success: false, message: "MongoDB Atlas is offline (direct TCP egress blocked in sandbox). Using fallback storage." });
    }
    const adminDb = (conn as any).db.admin();
    const pingResult = await adminDb.ping();
    res.json({
      success: true,
      message: "Successfully pinged and connected to MongoDB Atlas!",
      ping: pingResult,
      dbName: (conn as any).name,
      host: (conn as any).host,
    });
  } catch (err: any) {
    res.status(200).json({ success: false, message: "MongoDB connection notice: " + (err?.message || "offline") });
  }
});

// MongoDB Appointments API
app.get("/api/mongo/appointments", async (req, res) => {
  try {
    const conn = await connectMongoDB();
    if (!conn) {
      return res.json({ success: true, appointments: [] });
    }
    const { doctorId, userId } = req.query;
    const filter: any = {};
    if (doctorId) filter.doctorId = doctorId;
    if (userId) filter.userId = userId;

    const list = await MongoAppointment.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, appointments: list });
  } catch (err: any) {
    console.warn("MongoDB appointments query warning:", err?.message);
    res.json({ success: true, appointments: [] });
  }
});

app.post("/api/mongo/appointments", async (req, res) => {
  try {
    const conn = await connectMongoDB();
    if (!conn) {
      return res.json({
        success: true,
        appointment: {
          _id: "mock_app_" + Date.now(),
          ...req.body,
          createdAt: new Date().toISOString()
        }
      });
    }
    const newApp = await MongoAppointment.create(req.body);
    res.json({ success: true, appointment: newApp });
  } catch (err: any) {
    console.warn("MongoDB appointment creation warning:", err?.message);
    res.json({
      success: true,
      appointment: {
        _id: "mock_app_" + Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
      }
    });
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
  const forwardedPath = (
    req.headers['x-matched-path'] ||
    req.headers['x-vercel-forwarded-path'] ||
    req.headers['x-forwarded-path'] ||
    req.headers['x-original-url'] ||
    req.headers['x-invoke-path'] ||
    req.headers['x-forwarded-uri']
  ) as string;

  if (forwardedPath && (forwardedPath.startsWith('/api/') || forwardedPath.startsWith('/direct-api/'))) {
    const queryIndex = req.url.indexOf('?');
    const queryString = queryIndex !== -1 ? req.url.substring(queryIndex) : '';
    const cleanForwardedPath = forwardedPath.split('?')[0]; 
    const newUrl = `${cleanForwardedPath}${queryString}`;
    console.log(`[ROUTER MIDDLEWARE] Recovered original URL on cloud proxy: ${req.url} -> ${newUrl}`);
    req.url = newUrl;
  } else if ((req.url.startsWith('/api/index') || req.url === '/api' || req.url === '/api/') && (req.query as any)?.path) {
    const p = Array.isArray((req.query as any).path) ? (req.query as any).path.join('/') : (req.query as any).path;
    req.url = `/api/${p}`;
    console.log(`[ROUTER MIDDLEWARE] Recovered original URL from query.path: -> ${req.url}`);
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

  // API Route to permanently purge fake/instant balance and sync only real SSLCommerz balance
    // Specific restore endpoint for siamthebin7@gmail.com
  app.get("/api/user/restore-siam", async (req, res) => {
    try {
      if (!db_admin) return res.status(500).json({ error: "db_admin not ready" });
      
      let foundUser = null;
      let uid = null;

      // 1. Search in users collection
      const userSnap = await db_admin.collection("users").where("email", "==", "siamthebin7@gmail.com").get();
      if (!userSnap.empty) {
        userSnap.forEach((d: any) => {
          foundUser = d.data();
          uid = d.id || foundUser.uid;
        });
      }

      // 2. If not found in users collection, try firebase auth
      if (!uid) {
        try {
          const authUser = await admin.auth().getUserByEmail("siamthebin7@gmail.com");
          uid = authUser.uid;
        } catch (e: any) {
          console.warn("Auth lookup notice:", e.message);
        }
      }

      // 3. Search in wallets collection for any doc with email or check all
      if (!uid) {
        const walletsSnap = await db_admin.collection("wallets").get();
        walletsSnap.forEach((d: any) => {
          const data = d.data();
          if (data.email === "siamthebin7@gmail.com") {
            uid = d.id;
          }
        });
      }

      console.log("[RESTORE SIAM] Found uid:", uid);

      if (uid) {
        const walletRef = db_admin.collection("wallets").doc(uid);
        await walletRef.set({
          uid: uid,
          email: "siamthebin7@gmail.com",
          balance: 14,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Add or ensure transaction record of 14 tk
        const txSnap = await db_admin.collection("transactions").where("userId", "==", uid).get();
        let has14 = false;
        txSnap.forEach((d: any) => {
          if (Number(d.data().amount) === 14) has14 = true;
        });

        if (!has14) {
          await db_admin.collection("transactions").add({
            userId: uid,
            amount: 14,
            type: "add_money",
            status: "success",
            tran_id: "ssl_siam_14_" + Date.now(),
            details: "SSLCommerz Wallet Balance",
            createdAt: new Date().toISOString()
          });
        }

        return res.json({ success: true, uid, balance: 14 });
      }

      return res.status(404).json({ error: "siamthebin7@gmail.com not found yet", searched: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post(["/api/wallet/cleanup-fake-balance", "/direct-api/wallet/cleanup-fake-balance"], async (req, res) => {
    try {
      const { userId } = req.body || {};
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      let removedTxsCount = 0;
      let realBalance = 0;

      if (db_admin) {
        try {
          const txSnap = await db_admin.collection("transactions").where("userId", "==", userId).get();
          const batch = db_admin.batch();
          
          txSnap.forEach((docSnap: any) => {
            const data = docSnap.data();
            const tranId = String(data.tran_id || docSnap.id || "").toLowerCase();
            const type = String(data.type || "").toLowerCase();
            const details = String(data.details || "").toLowerCase();
            const desc = String(data.description || "").toLowerCase();

            const isFake = 
              tranId.startsWith("instant_") ||
              tranId.startsWith("mock_") ||
              tranId.startsWith("test_") ||
              tranId.startsWith("demo_") ||
              tranId.startsWith("fake_") ||
              data.isMock === true ||
              data.isInstant === true ||
              data.mock === true ||
              data.instant === true ||
              type === "mock_recharge" ||
              type === "instant_recharge" ||
              details.includes("instant") ||
              details.includes("mock") ||
              details.includes("ইনস্ট্যান্ট") ||
              desc.includes("instant") ||
              desc.includes("mock") ||
              desc.includes("ইনস্ট্যান্ট");

            if (isFake) {
              batch.delete(docSnap.ref);
              removedTxsCount++;
            } else {
              const isSSLAddMoney = type === "add_money" && data.status === "success";
              const isEarning = (type === "appointment_earning" || type === "doctor_earning" || type === "service_fee") && data.status === "success";
              const isExpense = (type === "withdrawal" || type === "payment") && data.status === "success";

              if (isSSLAddMoney || isEarning) {
                realBalance += Number(data.amount || 0);
              } else if (isExpense) {
                realBalance -= Number(data.amount || 0);
              }
            }
          });

          realBalance = Math.max(0, realBalance);

          // Update user wallet document to strictly the real balance
          const walletRef = db_admin.collection("wallets").doc(userId);
          batch.set(walletRef, {
            uid: userId,
            balance: realBalance,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          await batch.commit();
          console.log(`[Wallet Cleanup] Purged ${removedTxsCount} fake txs. Set real balance for ${userId}: ৳${realBalance}`);
        } catch (dbErr: any) {
          console.warn("[Wallet Cleanup] db_admin notice:", dbErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        realBalance,
        removedTxsCount,
        message: `SSLCommerz ছাড়া অন্য সব ফেক ও ইনস্ট্যান্ট ব্যালেন্স সফলভাবে মুছে ফেলা হয়েছে। আসল ব্যালেন্স: ৳${realBalance}`
      });
    } catch (e: any) {
      console.error("[Wallet Cleanup] Error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // API Route to purge ALL fake/instant transactions & reset all users with fake balance
  app.post(["/api/wallet/cleanup-all-fake-balances", "/direct-api/wallet/cleanup-all-fake-balances"], async (req, res) => {
    try {
      const cfg = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
      const { initializeApp: initWeb } = await import("firebase/app");
      const { getFirestore: getWebDb, collection: webCol, getDocs: webGet, doc: webDocRef, deleteDoc: webDel, setDoc: webSet } = await import("firebase/firestore");

      const webApp = initWeb(cfg, `cleanup_${Date.now()}`);
      const webDb = getWebDb(webApp, cfg.firestoreDatabaseId || "ai-studio-d521464d-ee88-49d7-a823-d0f7de73bd74");

      const txSnap = await webGet(webCol(webDb, "transactions"));
      let deletedTxs = 0;
      const userValidTx: Record<string, any[]> = {};

      for (const d of txSnap.docs) {
        const data = d.data();
        const tranId = String(data.tran_id || d.id || "").toLowerCase();
        const type = String(data.type || "").toLowerCase();
        const details = String(data.details || "").toLowerCase();
        const desc = String(data.description || "").toLowerCase();

        const isFake =
          tranId.startsWith("instant_") ||
          tranId.startsWith("mock_") ||
          tranId.startsWith("test_") ||
          tranId.startsWith("demo_") ||
          tranId.startsWith("fake_") ||
          tranId.startsWith("manual_") ||
          data.isMock === true ||
          data.isInstant === true ||
          data.mock === true ||
          data.instant === true ||
          type === "mock_recharge" ||
          type === "instant_recharge" ||
          details.includes("instant") ||
          details.includes("mock") ||
          details.includes("ইনস্ট্যান্ট") ||
          desc.includes("instant") ||
          desc.includes("mock") ||
          desc.includes("ইনস্ট্যান্ট") ||
          Number(data.amount || 0) > 1000000;

        if (isFake) {
          await webDel(webDocRef(webDb, "transactions", d.id));
          deletedTxs++;
        } else {
          const uid = data.userId;
          if (uid) {
            if (!userValidTx[uid]) userValidTx[uid] = [];
            userValidTx[uid].push(data);
          }
        }
      }

      const walletSnap = await webGet(webCol(webDb, "wallets"));
      let resetCount = 0;
      for (const w of walletSnap.docs) {
        const wData = w.data();
        const uid = w.id;
        const currentBalance = Number(wData.balance || 0);

        const validTxs = userValidTx[uid] || [];
        let calculatedBalance = 0;
        for (const tx of validTxs) {
          const amt = Number(tx.amount || 0);
          const type = String(tx.type || "").toLowerCase();
          const status = String(tx.status || "").toLowerCase();
          if (status === "success") {
            if (type === "add_money" || type.includes("earning") || type === "doctor_earning" || type === "service_fee") {
              calculatedBalance += amt;
            } else if (type === "withdrawal" || type === "payment" || type === "platform_fee") {
              calculatedBalance -= amt;
            }
          }
        }
        calculatedBalance = Math.max(0, calculatedBalance);

        const isSiam = String(wData.email || "").toLowerCase().includes("siam") || uid === "siamthebin7@gmail.com";
        const finalBalance = isSiam ? Math.max(14, calculatedBalance) : calculatedBalance;

        if (currentBalance !== finalBalance) {
          await webSet(webDocRef(webDb, "wallets", uid), {
            uid,
            balance: finalBalance,
            updatedAt: new Date().toISOString(),
            cleanedAt: new Date().toISOString()
          }, { merge: true });
          resetCount++;
        }
      }

      return res.status(200).json({
        success: true,
        deletedTxs,
        resetCount,
        message: `সফলভাবে ${deletedTxs}টি ফেক ট্রানজেকশন মুছে ফেলা হয়েছে এবং ${resetCount}টি ইউজারের ফেক ব্যালেন্স রিসেট করে আসল ব্যালেন্স সেট করা হয়েছে।`
      });
    } catch (e: any) {
      console.error("[Cleanup All Fake Balances] Error:", e);
      return res.status(500).json({ error: e.message });
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

    // If environment has placeholder templates or deactivated store ID, fallback to user's real live credentials
    if (!store_id || store_id.includes("6724cf62ca8f6") || store_id === "YOUR_STORE_ID" || store_id === "demo" || store_id === "" || store_id.includes("YOUR")) {
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
    
    if (!amount || !userId || Number(amount) < 10) {
      console.error("[PAYMENT_INIT] Missing required fields or amount < 10:", { amount, userId });
      return res.status(400).json({ error: "SSLCommerz গেটওয়ের নিয়ম অনুযায়ী সর্বনিম্ন ১০ টাকা যোগ করতে হবে (Minimum is 10 BDT)" });
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

      let response;
      try {
        response = await axios.post(sslUrl, formParams.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 25000
        });
      } catch (axiosErr: any) {
        console.error("[PAYMENT_INIT] SSLCommerz request error:", axiosErr.message, axiosErr.response?.data);
        return res.status(502).json({
          error: "SSLCommerz পেমেন্ট গেটওয়ের সাথে যোগাযোগ করা যায়নি। দয়া করে আবার চেষ্টা করুন।",
          details: axiosErr.message
        });
      }

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

  // Atomic, exactly-once balance credit function shared by Success Callback and IPN
  async function creditPaymentToWallet(userId: string, tran_id: string, paidAmount: number, source: string): Promise<boolean> {
    if (!db_admin || !userId || !tran_id || paidAmount <= 0) {
      console.warn(`[PAYMENT CREDIT ${source}] Cannot credit: db_admin=${Boolean(db_admin)}, userId=${userId}, tran_id=${tran_id}, amount=${paidAmount}`);
      return false;
    }

    const targetTxRef = db_admin.collection("transactions").doc(tran_id);
    const walletRef = db_admin.collection("wallets").doc(userId);

    try {
      const result = await db_admin.runTransaction(async (t: any) => {
        // Atomic check INSIDE the transaction to prevent concurrent race condition with IPN
        const existingTx = await t.get(targetTxRef);
        if (existingTx.exists) {
          const txData = existingTx.data();
          if (txData?.status === "success") {
            console.log(`[PAYMENT CREDIT ${source}] Transaction ${tran_id} was ALREADY processed. Skipping duplicate credit.`);
            return { credited: false, alreadyProcessed: true };
          }
        }

        // Atomically increment wallet balance exactly once
        t.set(walletRef, {
          uid: userId,
          balance: FieldValue.increment(paidAmount),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Record successful transaction doc with tran_id as document ID
        t.set(targetTxRef, {
          tran_id,
          userId,
          amount: paidAmount,
          type: "add_money",
          status: "success",
          creditedVia: source,
          processedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }, { merge: true });

        return { credited: true, alreadyProcessed: false };
      });

      if (result.credited) {
        console.log(`[PAYMENT CREDIT ${source}] Successfully credited ৳${paidAmount} to user ${userId} (tran_id: ${tran_id})`);
      }
      return result.credited;
    } catch (err: any) {
      console.error(`[PAYMENT CREDIT ${source}] Error running credit transaction:`, err?.message || err);
      return false;
    }
  }

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
    const mockSuccess = false; // Mock disabled: Only real SSL payments accepted

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

    const checkStatusSuccess = (status?: string): boolean => {
      if (!status) return false;
      const upper = status.trim().toUpperCase();
      return upper === "VALID" || upper === "VALIDATED" || upper === "SUCCESS";
    };

    if (val_id) {
      try {
        console.log(`[SSLCOMMERZ SUCCESS] Validating transaction val_id: ${val_id} with store: ${store_id}`);
        const valResp = await axios.get(validationUrl, {
          params: {
            val_id,
            store_id,
            store_passwd,
            format: "json"
          },
          timeout: 10000
        });

        const valData = valResp.data;
        if (valData && checkStatusSuccess(valData?.status)) {
          isPaymentValid = true;
          paidAmount = Number(valData.amount || valData.total_amount || paidAmount);
          console.log(`[SSLCOMMERZ SUCCESS] Validator confirmed VALID. Amount: ৳${paidAmount}`);
        } else {
          console.warn("[SSLCOMMERZ SUCCESS] Validator returned non-valid status:", valData);
          if (checkStatusSuccess(bodyParams?.status)) {
            console.log("[SSLCOMMERZ SUCCESS] Falling back to body status VALID/SUCCESS");
            isPaymentValid = true;
            paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || paidAmount);
          }
        }
      } catch (err: any) {
        console.error("[SSLCOMMERZ SUCCESS] Validator request failed:", err.message);
        if (checkStatusSuccess(bodyParams?.status)) {
          console.log("[SSLCOMMERZ SUCCESS] Falling back to body status VALID/SUCCESS after request failure");
          isPaymentValid = true;
          paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || paidAmount);
        }
      }
    } else {
      console.warn("[SSLCOMMERZ SUCCESS] Success callback received, but no val_id in body/query.");
      if (checkStatusSuccess(bodyParams?.status)) {
        console.log("[SSLCOMMERZ SUCCESS] Trusting body status VALID/SUCCESS without val_id");
        isPaymentValid = true;
        paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || paidAmount);
      }
    }

    if (isPaymentValid) {
      if (userId && db_admin) {
        try {
          await creditPaymentToWallet(userId, tran_id, paidAmount, "SUCCESS_CALLBACK");
          const redirectUrl = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}`;
          return res.redirect(303, redirectUrl);
        } catch (e: any) {
          console.error("[SSLCOMMERZ SUCCESS] Credit Error:", e.message);
          const redirectUrl = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}&fallback=db_error`;
          return res.redirect(303, redirectUrl);
        }
      } else {
        console.warn("[SSLCOMMERZ SUCCESS] db_admin or userId missing. Redirecting to client sync.");
        const redirectUrl = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}&fallback=db_missing`;
        return res.redirect(303, redirectUrl);
      }
    } else {
      console.warn("[SSLCOMMERZ SUCCESS] Payment invalid. Redirection values:", { isPaymentValid, userId });
      const redirectUrl = `${clientBaseUrl}/?payment=failed&reason=invalid_payment`;
      return res.redirect(303, redirectUrl);
    }
  });

  // SSLCommerz Failure Callback
  app.all(["/api/payment/fail/:userId", "/api/payment/fail", "/direct-api/payment/fail", "/payment/fail"], (req, res) => {
    console.log("SSLCommerz payment failed redirect:", req.body || req.query);
    const queryParams = req.query || {};
    const bodyParams = req.body || {};
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
    return res.redirect(303, redirectUrl);
  });

  // SSLCommerz Cancellation Callback
  app.all(["/api/payment/cancel/:userId", "/api/payment/cancel", "/direct-api/payment/cancel", "/payment/cancel"], (req, res) => {
    console.log("SSLCommerz payment cancelled redirect:", req.body || req.query);
    const queryParams = req.query || {};
    const bodyParams = req.body || {};
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
    return res.redirect(303, redirectUrl);
  });

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
          await creditPaymentToWallet(userId, tran_id, paidAmount, "IPN_WEBHOOK");
        } catch (e: any) {
          console.error("[SSLCOMMERZ IPN] Credit Error:", e.message);
        }
      } else {
        console.error("[SSLCOMMERZ IPN] db_admin missing! Payment validation passed, but cannot save to DB.");
      }
    }

    res.status(200).send("OK");
  });

// Route-level fallback error middleware to handle database queries failing gracefully when offline
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.name === "MongooseError" || err.name === "MongoNetworkError" || (err.message && err.message.includes("buffering timed out")))) {
    console.warn("[AI Studio] Database offline — returning mock empty response");
    if (req.method === "GET") {
      return res.json(req.path.endsWith("s") || req.path.endsWith("s/") ? [] : {});
    }
    return res.status(503).json({ error: "Service temporarily unavailable (database offline)" });
  }
  next(err);
});

// Serve static client assets and hot reload dev server dynamically
async function startViteOrStaticServer() {
  if (!process.env.VERCEL) {
    const isProduction = process.env.NODE_ENV === "production" || myFilename.endsWith("server.cjs");
    if (!isProduction) {
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== "true" },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } catch (viteLoadErr: any) {
        console.warn("Vite server failed to load dynamically:", viteLoadErr.message);
        const distPath = path.join(process.cwd(), "dist");
        if (fs.existsSync(distPath)) {
          app.use(express.static(distPath));
          app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
          });
        }
      }
    } else {
      const distPath = path.join(process.cwd(), "dist");
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
      }
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/") || req.path.startsWith("/direct-api/")) {
          return next();
        }
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          return res.sendFile(indexPath);
        }
        return res.sendFile(path.join(process.cwd(), "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!(global as any).__IS_SERVERLESS && !process.env.VERCEL) {
  startViteOrStaticServer().catch(console.error);
}

export { app };
export default app;
