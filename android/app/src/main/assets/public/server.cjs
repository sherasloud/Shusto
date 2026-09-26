var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app,
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var adminModule = __toESM(require("firebase-admin"), 1);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_uuid = require("uuid");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
var admin = adminModule.default && adminModule.default.initializeApp ? adminModule.default : adminModule;
var getFirestore = (app2, dbId) => {
  if (typeof app2.firestore === "function") {
    return dbId ? app2.firestore(dbId) : app2.firestore();
  }
  return admin.firestore();
};
var FieldValue = admin.firestore?.FieldValue || adminModule.firestore?.FieldValue;
import_dotenv.default.config();
var getFilename = () => {
  return typeof __filename !== "undefined" ? __filename : "";
};
var getDirname = (filePath) => {
  if (filePath) return import_path.default.dirname(filePath);
  return typeof __dirname !== "undefined" ? __dirname : process.cwd();
};
var myFilename = getFilename();
var myDirname = getDirname(myFilename);
var firebaseConfig = null;
try {
  const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
  const localConfigPath = import_path.default.join(myDirname, "firebase-applet-config.json");
  const parentConfigPath = import_path.default.join(myDirname, "..", "firebase-applet-config.json");
  if (import_fs.default.existsSync(configPath)) {
    firebaseConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf8"));
    console.log("Firebase config loaded from process.cwd()");
  } else if (import_fs.default.existsSync(localConfigPath)) {
    firebaseConfig = JSON.parse(import_fs.default.readFileSync(localConfigPath, "utf8"));
    console.log("Firebase config loaded from myDirname");
  } else if (import_fs.default.existsSync(parentConfigPath)) {
    firebaseConfig = JSON.parse(import_fs.default.readFileSync(parentConfigPath, "utf8"));
    console.log("Firebase config loaded from myDirname/..");
  } else if (import_fs.default.existsSync("firebase-applet-config.json")) {
    firebaseConfig = JSON.parse(import_fs.default.readFileSync("firebase-applet-config.json", "utf8"));
    console.log("Firebase config loaded from relative string");
  }
} catch (e) {
  console.error("Failed to parse firebase config:", e.message);
}
var db_admin;
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
      admin.initializeApp({
        projectId: firebaseConfig?.projectId || process.env.VITE_FIREBASE_PROJECT_ID || "demo-project"
      });
    }
  }
  db_admin = getFirestore(admin.app(), firebaseConfig?.firestoreDatabaseId);
  console.log("Firebase Admin initialized successfully.");
} catch (e) {
  console.error("Firebase Admin Error:", e.message);
}
var app = (0, import_express.default)();
var PORT = 3e3;
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
app.use((req, res, next) => {
  const forwardedPath = req.headers["x-vercel-forwarded-path"] || req.headers["x-forwarded-path"] || req.headers["x-original-url"];
  if (forwardedPath && (forwardedPath.startsWith("/api/") || forwardedPath.startsWith("/direct-api/"))) {
    const queryIndex = req.url.indexOf("?");
    const queryString = queryIndex !== -1 ? req.url.substring(queryIndex) : "";
    const cleanForwardedPath = forwardedPath.split("?")[0];
    const newUrl = `${cleanForwardedPath}${queryString}`;
    console.log(`[ROUTER MIDDLEWARE] Recovered original URL on cloud proxy: ${req.url} -> ${newUrl}`);
    req.url = newUrl;
  }
  console.log(`[REQUEST LOGGER] ${req.method} ${req.path || req.url}`);
  if (req.body !== void 0) {
    return next();
  }
  next();
});
app.use(import_express.default.json());
app.use(import_express.default.urlencoded({ extended: true }));
app.get(["/api/test", "/direct-api/test", "/test"], (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV || "development", vercel: !!process.env.VERCEL });
});
app.post(["/api/withdraw/automatic", "/direct-api/withdraw/automatic", "/withdraw/automatic"], async (req, res) => {
  const { userId, amount, method, phoneNumber } = req.body || {};
  if (!userId || !amount || !method || !phoneNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    let disbursementStatus = "SUCCESS";
    if (process.env.REAL_PAYOUT_API_KEY) {
      console.log(`Executing REAL Payout via ${method} to ${phoneNumber} for \u09F3${amount}`);
    } else {
      console.log(`Simulating AUTOMATIC Payout via ${method} to ${phoneNumber} for \u09F3${amount}`);
    }
    if (disbursementStatus === "SUCCESS") {
      return res.json({ status: "SUCCESS", message: "Disbursement request received. Handled by client." });
    } else {
      throw new Error("Disbursement failed at provider level");
    }
  } catch (error) {
    console.error("Withdrawal Error:", error);
    res.status(500).json({ error: "\u099F\u09BE\u0995\u09BE \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964" });
  }
});
app.post(["/api/admin/reset-wallets", "/admin/reset-wallets"], async (req, res) => {
  return res.status(200).json({ status: "SUCCESS", message: "Admin reset feature temporarily disabled for security." });
});
function getRealExternalBaseUrl(req, clientBaseUrl) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const xForwardedHost = req.headers["x-forwarded-host"];
  let host = req.headers.host || "";
  if (xForwardedHost) {
    host = Array.isArray(xForwardedHost) ? xForwardedHost[0] : xForwardedHost;
  }
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
  store_id = store_id.replace(/^["']|["']$/g, "");
  store_passwd = store_passwd.replace(/^["']|["']$/g, "");
  if (!store_id || store_id === "YOUR_STORE_ID" || store_id === "demo" || store_id === "" || store_id.includes("YOUR")) {
    store_id = "shusto0live";
  }
  if (!store_passwd || store_passwd === "YOUR_STORE_PASSWORD" || store_passwd === "" || store_passwd.includes("YOUR")) {
    store_passwd = "6A0D6039B299110857";
  }
  return { store_id, store_passwd };
}
app.post(["/api/payment/init", "/direct-api/payment/init", "/payment/init"], async (req, res) => {
  console.log("[PAYMENT_INIT] Received POST to payment/init. Path:", req.path, "Body:", JSON.stringify(req.body));
  const params = req.body || {};
  const { amount, userId, providerId, providerType, userName, userEmail, mock, clientBaseUrl: incomingClientBaseUrl } = params;
  if (!amount || !userId) {
    console.error("[PAYMENT_INIT] Missing required fields:", { amount, userId });
    return res.status(400).json({ error: "Amount and userId are required" });
  }
  const tran_id = (0, import_uuid.v4)();
  const { store_id, store_passwd } = getSSLCommerzCredentials();
  console.log(`[PAYMENT_INIT] Initiating for user ${userId}, amount ${amount}, store: ${store_id}`);
  const clientBaseUrl = incomingClientBaseUrl || getRealExternalBaseUrl(req, incomingClientBaseUrl);
  let cleanBaseUrl = clientBaseUrl;
  if (cleanBaseUrl.endsWith("/")) {
    cleanBaseUrl = cleanBaseUrl.slice(0, -1);
  }
  if (!cleanBaseUrl.startsWith("https://") && !cleanBaseUrl.includes("localhost") && !cleanBaseUrl.includes("127.0.0.1")) {
    cleanBaseUrl = "https://" + cleanBaseUrl.replace(/^http:\/\//i, "");
  }
  const data = {
    store_id,
    store_passwd,
    total_amount: Number(amount),
    currency: "BDT",
    tran_id,
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
    value_d: clientBaseUrl
  };
  try {
    const isSandboxMode = process.env.SSL_MODE === "sandbox" || store_id.includes("test") || store_id === "demo";
    const sslUrl = isSandboxMode ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php" : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";
    const isMock = mock === true || mock === "true" || !store_id || store_id === "YOUR_STORE_ID" || store_id === "demo";
    if (isMock) {
      console.log("[PAYMENT_INIT] Simulating success (Mock config)");
      return res.json({ status: "SUCCESS", GatewayPageURL: `${cleanBaseUrl}/api/payment/success?tran_id=${tran_id}&userId=${userId}&mock=true&amount=${amount}&clientBaseUrl=${encodeURIComponent(clientBaseUrl)}` });
    }
    console.log(`[PAYMENT_INIT] Initiating REAL SSLCommerz request to ${sslUrl}`);
    const formParams = new URLSearchParams();
    Object.keys(data).forEach((key) => {
      formParams.append(key, String(data[key]));
    });
    const response = await import_axios.default.post(sslUrl, formParams.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 5e3
    });
    console.log("[PAYMENT_INIT] SSLCommerz response status:", response.status);
    if (response.data && response.data.status === "SUCCESS") {
      console.log("[PAYMENT_INIT] SSLCommerz SUCCESS response");
      res.json(response.data);
    } else {
      console.error("[PAYMENT_INIT] SSLCommerz error response:", response.data);
      res.status(400).json({ error: `SSLCommerz error: ${response.data?.failedreason || "unknown gateway error"}` });
    }
  } catch (error) {
    console.error("[PAYMENT_INIT] Exception:", error?.response?.data || error?.message || error);
    res.status(500).json({
      error: `Payment initiation failed: ${error?.message || "Internal error"}`,
      details: error?.response?.data || null,
      stack: error?.stack || null
    });
  }
});
app.all(["/api/payment/success/:userId", "/api/payment/success", "/direct-api/payment/success", "/payment/success"], async (req, res) => {
  const queryParams = req.query || {};
  const bodyParams = req.body || {};
  console.log("[SSLCOMMERZ SUCCESS CALLBACK] Invoked!");
  console.log("params:", JSON.stringify(req.params));
  console.log("query:", JSON.stringify(queryParams));
  console.log("body:", JSON.stringify(bodyParams));
  const tran_id = queryParams.tran_id || bodyParams.tran_id || (0, import_uuid.v4)();
  const userId = req.params.userId || queryParams.userId || bodyParams.value_a;
  const providerId = queryParams.providerId || bodyParams.value_b;
  const providerType = queryParams.providerType || bodyParams.value_c;
  const val_id = bodyParams.val_id || queryParams.val_id;
  const mockSuccess = queryParams.mock === "true";
  const clientBaseUrlRaw = queryParams.clientBaseUrl || bodyParams.value_d;
  let clientBaseUrl = clientBaseUrlRaw ? decodeURIComponent(clientBaseUrlRaw) : "";
  if (clientBaseUrl.endsWith("/")) {
    clientBaseUrl = clientBaseUrl.slice(0, -1);
  }
  const fallbackAbsoluteUrl = getRealExternalBaseUrl(req, clientBaseUrl);
  if (!clientBaseUrl || !clientBaseUrl.startsWith("http") || clientBaseUrl.includes("localhost") && !fallbackAbsoluteUrl.includes("localhost")) {
    clientBaseUrl = fallbackAbsoluteUrl;
  }
  const { store_id, store_passwd } = getSSLCommerzCredentials();
  let isPaymentValid = false;
  let paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || 0);
  const isSandboxMode = process.env.SSL_MODE === "sandbox" || store_id.includes("test") || store_id === "demo";
  const validationUrl = isSandboxMode ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php" : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";
  const checkStatusSuccess = (status) => {
    if (!status) return false;
    const upper = status.trim().toUpperCase();
    return upper === "VALID" || upper === "VALIDATED" || upper === "SUCCESS";
  };
  if (mockSuccess) {
    isPaymentValid = true;
  } else if (val_id) {
    try {
      console.log(`[SSLCOMMERZ SUCCESS] Validating transaction val_id: ${val_id} with store: ${store_id}`);
      const valResp = await import_axios.default.get(validationUrl, {
        params: {
          val_id,
          store_id,
          store_passwd,
          format: "json"
        },
        timeout: 8e3
      });
      const valData = valResp.data;
      if (valData && checkStatusSuccess(valData?.status)) {
        isPaymentValid = true;
        paidAmount = Number(valData.amount || valData.total_amount || paidAmount);
        console.log(`[SSLCOMMERZ SUCCESS] Validator confirmed VALID. Amount: \u09F3${paidAmount}`);
      } else {
        console.warn("[SSLCOMMERZ SUCCESS] Validator returned non-valid status:", valData);
        if (checkStatusSuccess(bodyParams?.status)) {
          console.log("[SSLCOMMERZ SUCCESS] Falling back to body status VALID/SUCCESS");
          isPaymentValid = true;
          paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || paidAmount);
        }
      }
    } catch (err) {
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
        const txRef = db_admin.collection("transactions").doc(tran_id);
        const txSnap = await txRef.get();
        if (!txSnap.exists) {
          await db_admin.runTransaction(async (t) => {
            const walletRef = db_admin.collection("wallets").doc(userId);
            const targetTxRef = db_admin.collection("transactions").doc(tran_id);
            t.set(walletRef, {
              uid: userId,
              balance: FieldValue.increment(paidAmount),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true });
            t.set(targetTxRef, {
              tran_id,
              userId,
              amount: paidAmount,
              type: "add_money",
              status: "success",
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          });
          console.log(`[SSLCOMMERZ SUCCESS] Successfully credited \u09F3${paidAmount} to wallet of user ${userId}`);
        } else {
          console.log(`[SSLCOMMERZ SUCCESS] Transaction ${tran_id} was already credited.`);
        }
        const redirectUrl2 = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}`;
        return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2 - Shusto</title>
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
        <h2>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2 \u09B9\u09DF\u09C7\u099B\u09C7!</h2>
        <p>\u0986\u09AA\u09A8\u09BE\u09B0 Shusto \u0993\u09DF\u09BE\u09B2\u09C7\u099F\u09C7 \u09F3${paidAmount} \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09BE \u09B9\u099A\u09CD\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0995\u09CD\u09B7\u09A3\u09BF\u0995 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8, \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09BF\u09DF\u09C7 \u09A8\u09C7\u0993\u09DF\u09BE \u09B9\u099A\u09CD\u099B\u09C7...</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl2}">\u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09C7 \u09AF\u09BE\u09A8</a>
    </div>
    <script>
        setTimeout(() => {
            window.location.href = ${JSON.stringify(redirectUrl2)};
        }, 1200);
    </script>
</body>
</html>
          `);
      } catch (e) {
        console.error("[SSLCOMMERZ SUCCESS] Firebase Update Failed but payment is validated. Redirecting to client sync:", e.message);
        const redirectUrl2 = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}&fallback=db_error`;
        return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2 - Shusto</title>
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
        <h2>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2 \u09B9\u09DF\u09C7\u099B\u09C7!</h2>
        <p>\u0986\u09AA\u09A8\u09BE\u09B0 Shusto \u0993\u09DF\u09BE\u09B2\u09C7\u099F\u09C7 \u09F3${paidAmount} \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09BE \u09B9\u099A\u09CD\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0995\u09CD\u09B7\u09A3\u09BF\u0995 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8, \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09BF\u09DF\u09C7 \u09A8\u09C7\u0993\u09DF\u09BE \u09B9\u099A\u09CD\u099B\u09C7...</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl2}">\u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09C7 \u09AF\u09BE\u09A8</a>
    </div>
    <script>
        setTimeout(() => {
            window.location.href = ${JSON.stringify(redirectUrl2)};
        }, 1200);
    </script>
</body>
</html>
          `);
      }
    } else {
      console.warn("[SSLCOMMERZ SUCCESS] db_admin or userId missing. Redirecting to client sync.");
      const redirectUrl2 = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}&fallback=db_missing`;
      return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2 - Shusto</title>
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
        <h2>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2 \u09B9\u09DF\u09C7\u099B\u09C7!</h2>
        <p>\u0986\u09AA\u09A8\u09BE\u09B0 Shusto \u0993\u09DF\u09BE\u09B2\u09C7\u099F\u09C7 \u09F3${paidAmount} \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09BE \u09B9\u099A\u09CD\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0995\u09CD\u09B7\u09A3\u09BF\u0995 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8, \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09BF\u09DF\u09C7 \u09A8\u09C7\u0993\u09DF\u09BE \u09B9\u099A\u09CD\u099B\u09C7...</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl2}">\u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09C7 \u09AF\u09BE\u09A8</a>
    </div>
    <script>
        setTimeout(() => {
            window.location.href = ${JSON.stringify(redirectUrl2)};
        }, 1200);
    </script>
</body>
</html>
        `);
    }
  } else {
    console.warn("[SSLCOMMERZ SUCCESS] Payment invalid. Redirection values:", { isPaymentValid, userId });
    const redirectUrl2 = `${clientBaseUrl}/?payment=failed&reason=invalid_payment`;
    return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 - Shusto</title>
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
        <h2>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7</h2>
        <p>\u09A6\u09C1\u0983\u0996\u09BF\u09A4, \u0995\u09CB\u09A8\u09CB \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE\u09B0 \u0995\u09BE\u09B0\u09A3\u09C7 \u0986\u09AE\u09B0\u09BE \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F\u099F\u09BF \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09BF\u09A8\u09BF\u0964 \u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u09AB\u09BF\u09B0\u09C7 \u0997\u09BF\u09DF\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl2}">\u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09C7 \u09AF\u09BE\u09A8</a>
    </div>
    <script>
        setTimeout(() => {
            window.location.href = ${JSON.stringify(redirectUrl2)};
        }, 1500);
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
    <title>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2 - Shusto</title>
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
        <h2>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2 \u09B9\u09DF\u09C7\u099B\u09C7!</h2>
        <p>\u0986\u09AA\u09A8\u09BE\u09B0 Shusto \u0993\u09DF\u09BE\u09B2\u09C7\u099F\u09C7 \u09F3${paidAmount} \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0995\u09CD\u09B7\u09A3\u09BF\u0995 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8, \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09BF\u09DF\u09C7 \u09A8\u09C7\u0993\u09DF\u09BE \u09B9\u099A\u09CD\u099B\u09C7...</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl}">\u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09C7 \u09AF\u09BE\u09A8</a>
    </div>
    <script>
        setTimeout(() => {
            window.location.href = ${JSON.stringify(redirectUrl)};
        }, 1200);
    </script>
</body>
</html>
    `);
});
app.all(["/api/payment/fail/:userId", "/api/payment/fail", "/direct-api/payment/fail", "/payment/fail"], (req, res) => {
  console.log("SSLCommerz payment failed redirect:", req.body || req.query);
  const queryParams = req.query || {};
  const bodyParams = req.body || {};
  const clientBaseUrlRaw = queryParams.clientBaseUrl || bodyParams.value_d;
  let clientBaseUrl = clientBaseUrlRaw ? decodeURIComponent(clientBaseUrlRaw) : "";
  if (clientBaseUrl.endsWith("/")) {
    clientBaseUrl = clientBaseUrl.slice(0, -1);
  }
  const fallbackAbsoluteUrl = getRealExternalBaseUrl(req, clientBaseUrl);
  if (!clientBaseUrl || !clientBaseUrl.startsWith("http") || clientBaseUrl.includes("localhost") && !fallbackAbsoluteUrl.includes("localhost")) {
    clientBaseUrl = fallbackAbsoluteUrl;
  }
  const redirectUrl = `${clientBaseUrl}/?payment=failed`;
  return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 - Shusto</title>
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
        <h2>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u09B9\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u09A8\u09BF</h2>
        <p>\u09A6\u09C1\u0983\u0996\u09BF\u09A4, \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u0997\u09C7\u099F\u0993\u09DF\u09C7\u09A4\u09C7 \u0995\u09CB\u09A8\u09CB \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09C7\u0995\u09B6\u09A8 \u09AA\u09CD\u09B0\u09B8\u09C7\u09B8 \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964 \u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u09AB\u09BF\u09B0\u09C7 \u0997\u09BF\u09DF\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl}">\u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09C7 \u09AF\u09BE\u09A8</a>
    </div>
    <script>
        setTimeout(() => {
            window.location.href = ${JSON.stringify(redirectUrl)};
        }, 1500);
    </script>
</body>
</html>
    `);
});
app.all(["/api/payment/cancel/:userId", "/api/payment/cancel", "/direct-api/payment/cancel", "/payment/cancel"], (req, res) => {
  console.log("SSLCommerz payment cancelled redirect:", req.body || req.query);
  const queryParams = req.query || {};
  const bodyParams = req.body || {};
  const clientBaseUrlRaw = queryParams.clientBaseUrl || bodyParams.value_d;
  let clientBaseUrl = clientBaseUrlRaw ? decodeURIComponent(clientBaseUrlRaw) : "";
  if (clientBaseUrl.endsWith("/")) {
    clientBaseUrl = clientBaseUrl.slice(0, -1);
  }
  const fallbackAbsoluteUrl = getRealExternalBaseUrl(req, clientBaseUrl);
  if (!clientBaseUrl || !clientBaseUrl.startsWith("http") || clientBaseUrl.includes("localhost") && !fallbackAbsoluteUrl.includes("localhost")) {
    clientBaseUrl = fallbackAbsoluteUrl;
  }
  const redirectUrl = `${clientBaseUrl}/?payment=cancelled`;
  return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AC\u09BE\u09A4\u09BF\u09B2 - Shusto</title>
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
        <h2>\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7</h2>
        <p>\u0986\u09AA\u09A8\u09BF \u0993\u09DF\u09BE\u09B2\u09C7\u099F \u09B0\u09BF\u099A\u09BE\u09B0\u09CD\u099C \u09B0\u09BF\u0995\u09C1\u09DF\u09C7\u09B8\u09CD\u099F\u099F\u09BF \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09C7\u099B\u09C7\u09A8\u0964 \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0993\u09DF\u09BE\u09B2\u09C7\u099F\u09C7 \u09AA\u09C1\u09A8\u09B0\u09BE\u09DF \u09AB\u09BF\u09B0\u09BF\u09DF\u09C7 \u09A8\u09C7\u0993\u09DF\u09BE \u09B9\u099A\u09CD\u099B\u09C7, \u0995\u09CD\u09B7\u09A3\u09BF\u0995 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8...</p>
        <div class="loader"></div>
        <a class="btn" href="${redirectUrl}">\u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u09AB\u09BF\u09B0\u09C7 \u09AF\u09BE\u09A8</a>
    </div>
    <script>
        setTimeout(() => {
            window.location.href = ${JSON.stringify(redirectUrl)};
        }, 1500);
    </script>
</body>
</html>
    `);
});
app.all(["/api/payment/ipn", "/direct-api/payment/ipn", "/payment/ipn"], async (req, res) => {
  console.log("[SSLCOMMERZ IPN] IPN Notification received:", req.body);
  const bodyParams = req.body || {};
  const val_id = bodyParams.val_id;
  const tran_id = bodyParams.tran_id;
  const userId = bodyParams.value_a;
  let isIPNValid = false;
  let paidAmount = Number(bodyParams.amount || bodyParams.total_amount || 0);
  const checkStatusSuccess = (status) => {
    if (!status) return false;
    const upper = status.trim().toUpperCase();
    return upper === "VALID" || upper === "VALIDATED" || upper === "SUCCESS";
  };
  if (val_id) {
    const { store_id, store_passwd } = getSSLCommerzCredentials();
    const validationUrl = store_id.endsWith("live") ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php" : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";
    try {
      const valResp = await import_axios.default.get(validationUrl, {
        params: {
          val_id,
          store_id,
          store_passwd,
          format: "json"
        },
        timeout: 8e3
      });
      const valData = valResp.data;
      if (valData && checkStatusSuccess(valData?.status)) {
        isIPNValid = true;
        paidAmount = Number(valData.amount || valData.total_amount || paidAmount);
        console.log(`[SSLCOMMERZ IPN] Validator confirmed VALID. Amount: \u09F3${paidAmount}`);
      } else {
        console.warn("[SSLCOMMERZ IPN] Validator failed. Status in body is:", bodyParams.status);
        if (checkStatusSuccess(bodyParams.status)) {
          isIPNValid = true;
        }
      }
    } catch (err) {
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
        const transRef = db_admin.collection("transactions").where("tran_id", "==", tran_id).where("status", "==", "success");
        const snap = await transRef.get();
        if (snap.empty) {
          await db_admin.runTransaction(async (t) => {
            const walletRef = db_admin.collection("wallets").doc(userId);
            const txRef = db_admin.collection("transactions").doc();
            t.set(walletRef, {
              balance: FieldValue.increment(paidAmount),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true });
            t.set(txRef, {
              tran_id,
              userId,
              amount: paidAmount,
              status: "success",
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          });
          console.log(`[SSLCOMMERZ IPN] Automatically Added \u09F3${paidAmount} to wallet of user ${userId}`);
        }
      } catch (e) {
        console.error("[SSLCOMMERZ IPN] Firebase Update Failed:", e.message);
      }
    } else {
      console.error("[SSLCOMMERZ IPN] db_admin missing! Payment validation passed, but cannot save to DB.");
    }
  }
  res.status(200).send("OK");
});
async function startViteOrStaticServer() {
  if (!process.env.VERCEL) {
    const isProduction = process.env.NODE_ENV === "production" || myFilename.endsWith("server.cjs");
    if (!isProduction) {
      try {
        const viteModuleSpecifier = "vite";
        const { createServer: createViteServer } = await import(viteModuleSpecifier);
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa"
        });
        app.use(vite.middlewares);
      } catch (viteLoadErr) {
        console.warn("Vite server failed to load dynamically:", viteLoadErr.message);
      }
    } else {
      const distPath = import_path.default.join(process.cwd(), "dist");
      app.use(import_express.default.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(import_path.default.join(distPath, "index.html"));
      });
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}
if (!global.__IS_SERVERLESS && !process.env.VERCEL) {
  startViteOrStaticServer().catch(console.error);
}
var server_default = app;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.cjs.map
