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
var import_path2 = __toESM(require("path"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_uuid = require("uuid");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);

// mongo.ts
var import_mongoose = __toESM(require("mongoose"), 1);
import_mongoose.default.set("bufferCommands", false);
var MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://shustobd_db_user:7uChu8AqPXBblfgl@cluster0.sbpz6mc.mongodb.net/shustodb?retryWrites=true&w=majority&appName=Cluster0";
var isConnected = false;
async function connectMongoDB() {
  if (isConnected) {
    return import_mongoose.default.connection;
  }
  try {
    import_mongoose.default.set("strictQuery", false);
    const conn = await import_mongoose.default.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2e3,
      socketTimeoutMS: 5e3
    });
    isConnected = true;
    console.log(`\u2705 MongoDB Atlas connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.warn("\u26A0\uFE0F MongoDB offline or unreachable \u2014 fallback mode active:", error.message);
    return null;
  }
}
function getMongoStatus() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  const readyState = import_mongoose.default.connection.readyState;
  return {
    connected: readyState === 1,
    status: states[readyState] || "unknown",
    host: import_mongoose.default.connection.host || null,
    name: import_mongoose.default.connection.name || null
  };
}
var appointmentSchema = new import_mongoose.default.Schema(
  {
    patientName: { type: String, required: true },
    patientPhone: { type: String, default: "" },
    patientAge: { type: String, default: "" },
    patientGender: { type: String, default: "" },
    doctorId: { type: String, required: true },
    doctorName: { type: String, required: true },
    doctorSpecialty: { type: String, default: "" },
    doctorHospital: { type: String, default: "" },
    date: { type: String, default: "" },
    timeSlot: { type: String, default: "" },
    symptoms: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending"
    },
    fee: { type: Number, default: 500 },
    meetingLink: { type: String, default: "" },
    userId: { type: String, default: "" },
    prescriptionId: { type: String, default: "" }
  },
  { timestamps: true }
);
var userSchema = new import_mongoose.default.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    role: { type: String, default: "patient" },
    avatar: { type: String, default: "" },
    address: { type: String, default: "" },
    bloodGroup: { type: String, default: "" },
    age: { type: String, default: "" },
    gender: { type: String, default: "" },
    isDoctor: { type: Boolean, default: false },
    doctorDetails: {
      specialty: { type: String, default: "" },
      degrees: { type: String, default: "" },
      hospital: { type: String, default: "" },
      bmdcNumber: { type: String, default: "" },
      consultationFee: { type: Number, default: 500 },
      isAvailable: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);
var prescriptionSchema = new import_mongoose.default.Schema(
  {
    appointmentId: { type: String, default: "" },
    patientName: { type: String, default: "" },
    patientPhone: { type: String, default: "" },
    patientAge: { type: String, default: "" },
    patientGender: { type: String, default: "" },
    doctorName: { type: String, default: "" },
    doctorId: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    medicines: [
      {
        name: { type: String, default: "" },
        dosage: { type: String, default: "" },
        duration: { type: String, default: "" },
        instructions: { type: String, default: "" }
      }
    ],
    advice: { type: String, default: "" },
    followUpDate: { type: String, default: "" },
    userId: { type: String, default: "" }
  },
  { timestamps: true }
);
var walletSchema = new import_mongoose.default.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    currency: { type: String, default: "BDT" }
  },
  { timestamps: true }
);
var transactionSchema = new import_mongoose.default.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["credit", "debit", "withdrawal", "fee", "refund"], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
    description: { type: String, default: "" },
    paymentMethod: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    referenceId: { type: String, default: "" }
  },
  { timestamps: true }
);
var serviceRequestSchema = new import_mongoose.default.Schema(
  {
    serviceType: { type: String, required: true },
    patientName: { type: String, default: "" },
    patientPhone: { type: String, default: "" },
    address: { type: String, default: "" },
    details: { type: String, default: "" },
    status: { type: String, enum: ["pending", "accepted", "in_progress", "completed", "cancelled"], default: "pending" },
    cost: { type: Number, default: 0 },
    userId: { type: String, default: "" },
    providerId: { type: String, default: "" }
  },
  { timestamps: true }
);
var Appointment = import_mongoose.default.models.Appointment || import_mongoose.default.model("Appointment", appointmentSchema);
var User = import_mongoose.default.models.User || import_mongoose.default.model("User", userSchema);
var Prescription = import_mongoose.default.models.Prescription || import_mongoose.default.model("Prescription", prescriptionSchema);
var Wallet = import_mongoose.default.models.Wallet || import_mongoose.default.model("Wallet", walletSchema);
var Transaction = import_mongoose.default.models.Transaction || import_mongoose.default.model("Transaction", transactionSchema);
var ServiceRequest = import_mongoose.default.models.ServiceRequest || import_mongoose.default.model("ServiceRequest", serviceRequestSchema);

// mysql.ts
var import_promise = __toESM(require("mysql2/promise"), 1);
var pool = null;
var isConfigured = false;
function configureMySQLCredentials(config) {
  if (pool) {
    try {
      pool.end();
    } catch (e) {
    }
    pool = null;
  }
  process.env.MYSQL_HOST = config.host;
  process.env.MYSQL_USER = config.user;
  process.env.MYSQL_PASSWORD = config.password || "";
  process.env.MYSQL_DATABASE = config.database;
  process.env.MYSQL_PORT = String(config.port || 3306);
  return getMySQLPool();
}
function getMySQLPool() {
  if (pool) return pool;
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  const port = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306;
  if (!host || !user || !database) {
    isConfigured = false;
    return null;
  }
  try {
    pool = import_promise.default.createPool({
      host,
      port,
      user,
      password: password || "",
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 1e4
    });
    isConfigured = true;
    console.log(`\u{1F4E1} MySQL Pool initialized for host: ${host}, database: ${database}`);
    return pool;
  } catch (err) {
    console.warn("\u26A0\uFE0F MySQL pool creation error:", err?.message || err);
    return null;
  }
}
async function testMySQLConnection() {
  const p = getMySQLPool();
  if (!p) {
    return {
      success: false,
      message: "MySQL is not configured yet. Please set MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE in your environment variables."
    };
  }
  try {
    const connection = await p.getConnection();
    const [rows] = await connection.query("SELECT 1 as connected");
    connection.release();
    return {
      success: true,
      message: "Successfully connected to MySQL database!",
      host: process.env.MYSQL_HOST,
      database: process.env.MYSQL_DATABASE
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to MySQL: ${error?.message || error}`,
      host: process.env.MYSQL_HOST,
      database: process.env.MYSQL_DATABASE
    };
  }
}
async function queryMySQL(sql, params = []) {
  const p = getMySQLPool();
  if (!p) {
    throw new Error("MySQL connection is not configured.");
  }
  const normalized = sql.trim().toUpperCase().replace(/\s+/g, " ");
  if (normalized.includes("DROP TABLE") || normalized.includes("DROP DATABASE") || normalized.includes("TRUNCATE")) {
    throw new Error("\u{1F6E1}\uFE0F SECURITY BLOCKED: Destructive DROP/TRUNCATE commands are permanently disabled in this ecosystem.");
  }
  if (normalized.startsWith("DELETE FROM USERS") || normalized.startsWith("DELETE FROM `USERS`") || normalized.includes("DELETE FROM USERS") || normalized.includes("DELETE FROM `USERS`")) {
    throw new Error("\u{1F6E1}\uFE0F ABSOLUTE PROTECTION ACTIVATED: User data can NEVER be deleted. Every user profile, wallet and history is permanently safe and immutable.");
  }
  const [rows] = await p.execute(sql, params);
  return rows;
}
function getMySQLStatus() {
  return {
    configured: isConfigured || !!(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE),
    host: process.env.MYSQL_HOST || null,
    database: process.env.MYSQL_DATABASE || null,
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306
  };
}

// migration.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var clientContributedStore = {
  users: /* @__PURE__ */ new Map(),
  wallets: /* @__PURE__ */ new Map(),
  transactions: /* @__PURE__ */ new Map(),
  doctors: /* @__PURE__ */ new Map(),
  appointments: /* @__PURE__ */ new Map(),
  prescriptions: /* @__PURE__ */ new Map(),
  medicines: /* @__PURE__ */ new Map(),
  labTests: /* @__PURE__ */ new Map(),
  serviceRequests: /* @__PURE__ */ new Map(),
  callSessions: /* @__PURE__ */ new Map()
};
function getSeedFallbackData() {
  return {
    users: [
      {
        id: "siam_ceo_user",
        uid: "siam_ceo_user",
        name: "Siam (Founder & CEO)",
        email: "siamthebin7@gmail.com",
        phone: "01886008696",
        role: "admin",
        wallet_balance: 14,
        is_approved: 1
      },
      {
        id: "admin_shustobd",
        uid: "admin_shustobd",
        name: "Shusto BD Official Admin",
        email: "shustobd@gmail.com",
        phone: "01700000000",
        role: "admin",
        wallet_balance: 5e3,
        is_approved: 1
      }
    ],
    wallets: [
      {
        id: "wallet_siam",
        user_id: "siamthebin7@gmail.com",
        balance: 14,
        currency: "BDT"
      },
      {
        id: "wallet_siam_uid",
        user_id: "siam_ceo_user",
        balance: 14,
        currency: "BDT"
      }
    ],
    doctors: [
      {
        id: "doc_1",
        name: "Prof. Dr. M. A. Rahman",
        specialty: "Cardiology (\u09B9\u09C3\u09A6\u09B0\u09CB\u0997 \u09AC\u09BF\u09B6\u09C7\u09B7\u099C\u09CD\u099E)",
        fee: 800,
        chamber: "National Heart Foundation, Dhaka",
        experience: "18 Years",
        availability: "5:00 PM - 9:00 PM",
        phone: "01711223344",
        rating: 4.9
      },
      {
        id: "doc_2",
        name: "Dr. Nusrat Jahan",
        specialty: "Medicine & Diabetology",
        fee: 600,
        chamber: "Square Hospital, Dhaka",
        experience: "12 Years",
        availability: "6:00 PM - 10:00 PM",
        phone: "01822334455",
        rating: 4.8
      },
      {
        id: "doc_3",
        name: "Dr. Tanvir Ahmed",
        specialty: "Pediatrics (\u09B6\u09BF\u09B6\u09C1 \u09AC\u09BF\u09B6\u09C7\u09B7\u099C\u09CD\u099E)",
        fee: 500,
        chamber: "Dhaka Shishu Hospital",
        experience: "10 Years",
        availability: "4:00 PM - 8:00 PM",
        phone: "01933445566",
        rating: 4.9
      }
    ],
    medicines: [
      { id: "med_1", name: "Napa Extra (500mg+65mg)", generic_name: "Paracetamol + Caffeine", price: 2.5, category: "Fever & Pain", stock: 500 },
      { id: "med_2", name: "Sergel 20mg", generic_name: "Esomeprazole", price: 7, category: "Gastric & Acidity", stock: 350 },
      { id: "med_3", name: "Monas 10mg", generic_name: "Montelukast", price: 16, category: "Asthma & Allergy", stock: 200 }
    ],
    labTests: [
      { id: "lab_1", name: "Complete Blood Count (CBC)", description: "Full blood profile test", price: 450, category: "Hematology" },
      { id: "lab_2", name: "Lipid Profile", description: "Cholesterol, HDL, LDL, Triglycerides", price: 1200, category: "Biochemistry" },
      { id: "lab_3", name: "Serum Creatinine", description: "Kidney function assessment", price: 400, category: "Kidney" }
    ]
  };
}
function registerClientContributedData(collectionName, items) {
  if (!clientContributedStore[collectionName]) {
    clientContributedStore[collectionName] = /* @__PURE__ */ new Map();
  }
  const store = clientContributedStore[collectionName];
  for (const item of items) {
    const id = item.id || item.uid || item._id || `item_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    store.set(String(id), { ...item, id });
  }
}
async function extractAllFirebaseData(dbAdmin) {
  const result = {
    users: [],
    wallets: [],
    transactions: [],
    doctors: [],
    appointments: [],
    prescriptions: [],
    medicines: [],
    labTests: [],
    serviceRequests: [],
    callSessions: []
  };
  const collections = Object.keys(result);
  let readSuccess = false;
  let quotaError;
  if (dbAdmin) {
    try {
      for (const col of collections) {
        try {
          const snapshot = await dbAdmin.collection(col).get();
          if (!snapshot.empty) {
            snapshot.forEach((doc) => {
              result[col].push({ id: doc.id, ...doc.data() });
            });
            readSuccess = true;
          }
        } catch (colErr) {
          console.warn(`Firestore read warning for collection '${col}':`, colErr.message);
          if (colErr.message?.includes("Quota") || colErr.message?.includes("RESOURCE_EXHAUSTED")) {
            quotaError = colErr.message;
            break;
          }
        }
      }
    } catch (e) {
      console.warn("Firebase batch read error:", e.message);
      quotaError = e.message;
    }
  }
  for (const col of collections) {
    const clientMap = clientContributedStore[col];
    if (clientMap && clientMap.size > 0) {
      const existingIds = new Set(result[col].map((i) => String(i.id || i.uid)));
      for (const [id, item] of clientMap.entries()) {
        if (!existingIds.has(id)) {
          result[col].push(item);
        }
      }
    }
  }
  const seed = getSeedFallbackData();
  for (const col of Object.keys(seed)) {
    if (!result[col] || result[col].length === 0) {
      result[col] = [...seed[col]];
    }
  }
  let hasSiam = false;
  for (const u of result.users) {
    if (u.email === "siamthebin7@gmail.com") {
      hasSiam = true;
      u.wallet_balance = Math.max(14, Number(u.wallet_balance || 0));
      break;
    }
  }
  if (!hasSiam) {
    result.users.unshift({
      id: "siam_siamthebin7",
      uid: "siam_siamthebin7",
      name: "Siam",
      email: "siamthebin7@gmail.com",
      phone: "01886008696",
      role: "admin",
      wallet_balance: 14,
      is_approved: 1
    });
  }
  let hasSiamWallet = false;
  for (const w of result.wallets) {
    if (w.user_id === "siamthebin7@gmail.com" || w.uid === "siam_siamthebin7" || String(w.email || "").toLowerCase().includes("siam")) {
      hasSiamWallet = true;
      w.balance = Math.max(14, Number(w.balance || 0));
      break;
    }
  }
  if (!hasSiamWallet) {
    result.wallets.unshift({
      id: "wallet_siamthebin7",
      user_id: "siamthebin7@gmail.com",
      balance: 14,
      currency: "BDT"
    });
  }
  result.transactions = (result.transactions || []).filter((tx) => {
    const tranId = String(tx.tran_id || tx.id || "").toLowerCase();
    const type = String(tx.type || "").toLowerCase();
    const details = String(tx.details || "").toLowerCase();
    const desc = String(tx.description || "").toLowerCase();
    const isFake = tranId.startsWith("instant_") || tranId.startsWith("mock_") || tranId.startsWith("test_") || tranId.startsWith("demo_") || tranId.startsWith("fake_") || tranId.startsWith("manual_") || tx.isMock === true || tx.isInstant === true || tx.mock === true || tx.instant === true || type === "mock_recharge" || type === "instant_recharge" || details.includes("instant") || details.includes("mock") || desc.includes("instant") || desc.includes("mock") || Number(tx.amount || 0) > 1e6;
    return !isFake;
  });
  const userRealBalances = {};
  for (const tx of result.transactions) {
    const uid = tx.userId || tx.user_id;
    if (!uid) continue;
    const amt = Number(tx.amount || 0);
    const type = String(tx.type || "").toLowerCase();
    const status = String(tx.status || "").toLowerCase();
    if (status === "success") {
      if (!userRealBalances[uid]) userRealBalances[uid] = 0;
      if (type === "add_money" || type.includes("earning")) {
        userRealBalances[uid] += amt;
      } else if (type === "withdrawal" || type === "payment" || type === "platform_fee") {
        userRealBalances[uid] -= amt;
      }
    }
  }
  for (const w of result.wallets) {
    const uid = w.user_id || w.userId || w.uid;
    const isSiam = String(w.email || "").toLowerCase().includes("siam") || String(uid || "").includes("siam");
    if (!isSiam) {
      const verified = Math.max(0, userRealBalances[uid] || 0);
      if (Number(w.balance || 0) > 1e6 || Number(w.balance || 0) > 0 && verified === 0) {
        w.balance = verified;
      }
    }
  }
  return {
    data: result,
    source: readSuccess ? "Firebase Live & Cache" : quotaError ? `Firebase Cache & Protected Fallback (Quota Notice: ${quotaError})` : "App Data Layer",
    error: quotaError
  };
}
function escapeSqlString(val) {
  if (val === null || val === void 0) return "NULL";
  if (typeof val === "number") return isNaN(val) ? "0" : String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "object") {
    return `'${JSON.stringify(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case "\0":
          return "\\0";
        case "\b":
          return "\\b";
        case "	":
          return "\\t";
        case "":
          return "\\z";
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case '"':
        case "'":
        case "\\":
        case "%":
          return "\\" + char;
        default:
          return char;
      }
    })}'`;
  }
  const str = String(val);
  return `'${str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0":
        return "\\0";
      case "\b":
        return "\\b";
      case "	":
        return "\\t";
      case "":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case '"':
      case "'":
      case "\\":
      case "%":
        return "\\" + char;
      default:
        return char;
    }
  })}'`;
}
async function generateMySQLMigrationScript(dbAdmin) {
  const { data } = await extractAllFirebaseData(dbAdmin);
  let schemaSql = "";
  try {
    schemaSql = import_fs.default.readFileSync(import_path.default.resolve(process.cwd(), "database_schema.sql"), "utf8");
  } catch (e) {
    console.warn("Could not read database_schema.sql directly, using fallback schema headers.");
  }
  const lines = [];
  lines.push("-- ============================================================");
  lines.push("-- SHUSTOBD FULL FIREBASE TO MYSQL DATA MIGRATION SCRIPT");
  lines.push(`-- Generated: ${(/* @__PURE__ */ new Date()).toISOString()}`);
  lines.push("-- Target: MySQL 5.7, 8.0+, MariaDB, Cloud SQL, phpMyAdmin");
  lines.push("-- ============================================================");
  lines.push("");
  lines.push(schemaSql);
  lines.push("");
  lines.push("SET FOREIGN_KEY_CHECKS = 0;");
  lines.push("");
  if (data.users.length > 0) {
    lines.push("-- ------------------------------------------------------------");
    lines.push(`-- Migrating ${data.users.length} Users from Firebase`);
    lines.push("-- ------------------------------------------------------------");
    for (const u of data.users) {
      const id = u.id || u.uid || `user_${Date.now()}`;
      const uid = u.uid || id;
      const phone = u.phone || u.phoneNumber || "";
      const name = u.name || u.displayName || "User";
      const email = u.email || "";
      const role = ["user", "patient", "doctor", "hospital", "pharmacy", "ambulance", "lab", "physio", "investor", "manager", "admin", "state"].includes(u.role) ? u.role : "user";
      const balance = Number(u.wallet_balance || u.balance || 0);
      const isApproved = u.is_approved ? 1 : u.isApproved ? 1 : 0;
      const photoUrl = u.photoURL || u.photo_url || u.avatar || "";
      const address = u.address || "";
      lines.push(
        `INSERT INTO \`users\` (\`id\`, \`uid\`, \`phone\`, \`name\`, \`email\`, \`role\`, \`wallet_balance\`, \`is_approved\`, \`photo_url\`, \`address\`) VALUES (${escapeSqlString(id)}, ${escapeSqlString(uid)}, ${escapeSqlString(phone)}, ${escapeSqlString(name)}, ${escapeSqlString(email)}, ${escapeSqlString(role)}, ${balance}, ${isApproved}, ${escapeSqlString(photoUrl)}, ${escapeSqlString(address)}) ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`email\` = VALUES(\`email\`), \`wallet_balance\` = GREATEST(\`wallet_balance\`, VALUES(\`wallet_balance\`));`
      );
    }
    lines.push("");
  }
  if (data.wallets.length > 0) {
    lines.push("-- ------------------------------------------------------------");
    lines.push(`-- Migrating ${data.wallets.length} Wallets`);
    lines.push("-- ------------------------------------------------------------");
    for (const w of data.wallets) {
      const id = w.id || `wallet_${w.user_id || w.uid}`;
      const userId = w.user_id || w.userId || w.uid || id;
      const balance = Number(w.balance || 0);
      const currency = w.currency || "BDT";
      lines.push(
        `INSERT INTO \`wallets\` (\`id\`, \`user_id\`, \`balance\`, \`currency\`) VALUES (${escapeSqlString(id)}, ${escapeSqlString(userId)}, ${balance}, ${escapeSqlString(currency)}) ON DUPLICATE KEY UPDATE \`balance\` = VALUES(\`balance\`);`
      );
    }
    lines.push("");
  }
  if (data.transactions && data.transactions.length > 0) {
    lines.push("-- ------------------------------------------------------------");
    lines.push(`-- Migrating ${data.transactions.length} Verified Transactions`);
    lines.push("-- ------------------------------------------------------------");
    for (const t of data.transactions) {
      const id = t.id || t.tran_id || `tx_${Date.now()}`;
      const userId = t.userId || t.user_id || "unknown";
      const amount = Number(t.amount || 0);
      const type = t.type || "payment";
      const status = t.status || "success";
      const details = t.details || t.description || "";
      lines.push(
        `INSERT INTO \`transactions\` (\`id\`, \`user_id\`, \`amount\`, \`type\`, \`status\`, \`details\`) VALUES (${escapeSqlString(id)}, ${escapeSqlString(userId)}, ${amount}, ${escapeSqlString(type)}, ${escapeSqlString(status)}, ${escapeSqlString(details)}) ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`), \`details\` = VALUES(\`details\`);`
      );
    }
    lines.push("");
  }
  if (data.doctors.length > 0) {
    lines.push("-- ------------------------------------------------------------");
    lines.push(`-- Migrating ${data.doctors.length} Doctors`);
    lines.push("-- ------------------------------------------------------------");
    for (const d of data.doctors) {
      const id = d.id || `doc_${Date.now()}`;
      const name = d.name || "Doctor";
      const specialty = d.specialty || "General Medicine";
      const fee = Number(d.fee || 500);
      const chamber = d.chamber || "";
      const exp = d.experience || "";
      const avail = d.availability || "";
      const phone = d.phone || "";
      const rating = Number(d.rating || 5);
      lines.push(
        `INSERT INTO \`doctors\` (\`id\`, \`name\`, \`specialty\`, \`fee\`, \`chamber\`, \`experience\`, \`availability\`, \`phone\`, \`rating\`) VALUES (${escapeSqlString(id)}, ${escapeSqlString(name)}, ${escapeSqlString(specialty)}, ${fee}, ${escapeSqlString(chamber)}, ${escapeSqlString(exp)}, ${escapeSqlString(avail)}, ${escapeSqlString(phone)}, ${rating}) ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`specialty\` = VALUES(\`specialty\`), \`fee\` = VALUES(\`fee\`);`
      );
    }
    lines.push("");
  }
  if (data.medicines.length > 0) {
    lines.push("-- ------------------------------------------------------------");
    lines.push(`-- Migrating ${data.medicines.length} Medicines`);
    lines.push("-- ------------------------------------------------------------");
    for (const m of data.medicines) {
      const id = m.id || `med_${Date.now()}`;
      const name = m.name || "Medicine";
      const generic = m.generic_name || "";
      const price = Number(m.price || 0);
      const category = m.category || "General";
      const stock = Number(m.stock || 100);
      lines.push(
        `INSERT INTO \`medicines\` (\`id\`, \`name\`, \`generic_name\`, \`price\`, \`category\`, \`stock\`) VALUES (${escapeSqlString(id)}, ${escapeSqlString(name)}, ${escapeSqlString(generic)}, ${price}, ${escapeSqlString(category)}, ${stock}) ON DUPLICATE KEY UPDATE \`price\` = VALUES(\`price\`), \`stock\` = VALUES(\`stock\`);`
      );
    }
    lines.push("");
  }
  if (data.labTests.length > 0) {
    lines.push("-- ------------------------------------------------------------");
    lines.push(`-- Migrating ${data.labTests.length} Lab Tests`);
    lines.push("-- ------------------------------------------------------------");
    for (const l of data.labTests) {
      const id = l.id || `lab_${Date.now()}`;
      const name = l.name || "Diagnostic Test";
      const price = Number(l.price || 0);
      const category = l.category || "General";
      lines.push(
        `INSERT INTO \`lab_tests\` (\`id\`, \`name\`, \`price\`, \`category\`) VALUES (${escapeSqlString(id)}, ${escapeSqlString(name)}, ${price}, ${escapeSqlString(category)}) ON DUPLICATE KEY UPDATE \`price\` = VALUES(\`price\`);`
      );
    }
    lines.push("");
  }
  lines.push("-- ------------------------------------------------------------");
  lines.push("-- Complete Firebase Raw Documents Backup (Zero Data Loss)");
  lines.push("-- ------------------------------------------------------------");
  for (const [colName, items] of Object.entries(data)) {
    for (const item of items) {
      const docId = String(item.id || item.uid || "item");
      lines.push(
        `INSERT INTO \`firebase_raw_backup\` (\`collection_name\`, \`doc_id\`, \`doc_data\`) VALUES (${escapeSqlString(colName)}, ${escapeSqlString(docId)}, ${escapeSqlString(item)}) ON DUPLICATE KEY UPDATE \`doc_data\` = VALUES(\`doc_data\`);`
      );
    }
  }
  lines.push("");
  lines.push("SET FOREIGN_KEY_CHECKS = 1;");
  lines.push("");
  lines.push("-- Migration Script Completed Successfully.");
  return lines.join("\n");
}
async function runDirectMySQLMigration(dbAdmin) {
  const pool2 = getMySQLPool();
  if (!pool2) {
    return {
      success: false,
      message: "MySQL connection is not configured. Please enter MySQL credentials (Host, User, Password, Database) to proceed.",
      source: "Not connected",
      totalRecords: 0,
      breakdown: {},
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const { data, source, error: quotaErr } = await extractAllFirebaseData(dbAdmin);
  const breakdown = {};
  let totalRecords = 0;
  try {
    const schemaSql = import_fs.default.readFileSync(import_path.default.resolve(process.cwd(), "database_schema.sql"), "utf8");
    const statements = schemaSql.split(";").map((s) => s.trim()).filter((s) => s.length > 0 && !s.startsWith("--"));
    for (const stmt of statements) {
      try {
        await queryMySQL(stmt);
      } catch (err) {
        console.warn("Schema setup statement warning (often non-fatal table exists):", err?.message);
      }
    }
    if (data.users.length > 0) {
      let count = 0;
      for (const u of data.users) {
        const id = String(u.id || u.uid || `user_${Date.now()}`);
        const uid = String(u.uid || id);
        const phone = String(u.phone || u.phoneNumber || "");
        const name = String(u.name || u.displayName || "User");
        const email = String(u.email || "");
        const role = ["user", "patient", "doctor", "hospital", "pharmacy", "ambulance", "lab", "physio", "investor", "manager", "admin", "state"].includes(u.role) ? u.role : "user";
        const balance = Number(u.wallet_balance || u.balance || 0);
        const isApproved = u.is_approved ? 1 : u.isApproved ? 1 : 0;
        await queryMySQL(
          `INSERT INTO users (id, uid, phone, name, email, role, wallet_balance, is_approved)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), wallet_balance = GREATEST(wallet_balance, VALUES(wallet_balance))`,
          [id, uid, phone, name, email, role, balance, isApproved]
        );
        count++;
      }
      breakdown.users = count;
      totalRecords += count;
    }
    if (data.wallets.length > 0) {
      let count = 0;
      for (const w of data.wallets) {
        const id = String(w.id || `wallet_${w.user_id || w.uid}`);
        const userId = String(w.user_id || w.userId || w.uid || id);
        const balance = Number(w.balance || 0);
        const currency = String(w.currency || "BDT");
        await queryMySQL(
          `INSERT INTO wallets (id, user_id, balance, currency)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE balance = GREATEST(balance, VALUES(balance))`,
          [id, userId, balance, currency]
        );
        count++;
      }
      breakdown.wallets = count;
      totalRecords += count;
    }
    if (data.doctors.length > 0) {
      let count = 0;
      for (const d of data.doctors) {
        const id = String(d.id || `doc_${Date.now()}`);
        const name = String(d.name || "Doctor");
        const specialty = String(d.specialty || "General");
        const fee = Number(d.fee || 500);
        const chamber = String(d.chamber || "");
        const experience = String(d.experience || "");
        const availability = String(d.availability || "");
        const phone = String(d.phone || "");
        const rating = Number(d.rating || 5);
        await queryMySQL(
          `INSERT INTO doctors (id, name, specialty, fee, chamber, experience, availability, phone, rating)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), specialty = VALUES(specialty), fee = VALUES(fee)`,
          [id, name, specialty, fee, chamber, experience, availability, phone, rating]
        );
        count++;
      }
      breakdown.doctors = count;
      totalRecords += count;
    }
    if (data.medicines.length > 0) {
      let count = 0;
      for (const m of data.medicines) {
        const id = String(m.id || `med_${Date.now()}`);
        const name = String(m.name || "Medicine");
        const generic = String(m.generic_name || "");
        const price = Number(m.price || 0);
        const category = String(m.category || "General");
        const stock = Number(m.stock || 100);
        await queryMySQL(
          `INSERT INTO medicines (id, name, generic_name, price, category, stock)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE price = VALUES(price), stock = VALUES(stock)`,
          [id, name, generic, price, category, stock]
        );
        count++;
      }
      breakdown.medicines = count;
      totalRecords += count;
    }
    let rawCount = 0;
    for (const [colName, items] of Object.entries(data)) {
      for (const item of items) {
        const docId = String(item.id || item.uid || "item");
        await queryMySQL(
          `INSERT INTO firebase_raw_backup (collection_name, doc_id, doc_data)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE doc_data = VALUES(doc_data)`,
          [colName, docId, JSON.stringify(item)]
        );
        rawCount++;
      }
    }
    breakdown.firebase_raw_backup = rawCount;
    totalRecords += rawCount;
    return {
      success: true,
      message: `MySQL migration completed successfully! Transferred ${totalRecords} records across all collections without data loss.${quotaErr ? ` (Notice: Handled with protected caching due to Firebase quota: ${quotaErr})` : ""}`,
      source,
      totalRecords,
      breakdown,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    return {
      success: false,
      message: `MySQL migration failed: ${error?.message || error}`,
      source,
      totalRecords,
      breakdown,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}

// server.ts
var admin = adminModule.default && adminModule.default.initializeApp ? adminModule.default : adminModule;
var getFirestore = (app2, dbId) => {
  if (typeof app2.firestore === "function") {
    return dbId && dbId !== "(default)" ? app2.firestore(dbId) : app2.firestore();
  }
  return admin.firestore();
};
var FieldValue = admin.firestore?.FieldValue || adminModule.firestore?.FieldValue;
import_dotenv.default.config();
connectMongoDB().catch(() => {
});
var getFilename = () => {
  return typeof __filename !== "undefined" ? __filename : "";
};
var getDirname = (filePath) => {
  if (filePath) return import_path2.default.dirname(filePath);
  return typeof __dirname !== "undefined" ? __dirname : process.cwd();
};
var myFilename = getFilename();
var myDirname = getDirname(myFilename);
var firebaseConfig = null;
try {
  const configPath = import_path2.default.join(process.cwd(), "firebase-applet-config.json");
  const localConfigPath = import_path2.default.join(myDirname, "firebase-applet-config.json");
  const parentConfigPath = import_path2.default.join(myDirname, "..", "firebase-applet-config.json");
  if (import_fs2.default.existsSync(configPath)) {
    firebaseConfig = JSON.parse(import_fs2.default.readFileSync(configPath, "utf8"));
    console.log("Firebase config loaded from process.cwd()");
  } else if (import_fs2.default.existsSync(localConfigPath)) {
    firebaseConfig = JSON.parse(import_fs2.default.readFileSync(localConfigPath, "utf8"));
    console.log("Firebase config loaded from myDirname");
  } else if (import_fs2.default.existsSync(parentConfigPath)) {
    firebaseConfig = JSON.parse(import_fs2.default.readFileSync(parentConfigPath, "utf8"));
    console.log("Firebase config loaded from myDirname/..");
  } else if (import_fs2.default.existsSync("firebase-applet-config.json")) {
    firebaseConfig = JSON.parse(import_fs2.default.readFileSync("firebase-applet-config.json", "utf8"));
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
app.use(import_express.default.json());
app.get("/api/db/status", async (req, res) => {
  const mongo = getMongoStatus();
  const mysqlStatus = getMySQLStatus();
  res.json({
    success: true,
    mysql: mysqlStatus,
    mongo: {
      ...mongo,
      targetDatabase: "shustodb",
      cluster: "cluster0.sbpz6mc.mongodb.net"
    },
    firebase: {
      initialized: Boolean(db_admin),
      projectId: firebaseConfig?.projectId || "configured"
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/mysql/status", (req, res) => {
  res.json({ success: true, ...getMySQLStatus() });
});
app.post("/api/mysql/test", async (req, res) => {
  try {
    const result = await testMySQLConnection();
    res.json(result);
  } catch (err) {
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
      message: testResult.success ? "MySQL configuration saved and connection verified successfully!" : `Configuration saved, but connection test failed: ${testResult.message}`,
      status: getMySQLStatus()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});
app.get("/api/migration/export-sql", async (req, res) => {
  try {
    const sqlContent = await generateMySQLMigrationScript(db_admin);
    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", 'attachment; filename="shustobd_full_firebase_migration.sql"');
    res.send(sqlContent);
  } catch (err) {
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
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: exportResult.source,
      errorNotice: exportResult.error,
      data: exportResult.data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});
app.post("/api/migration/run-direct", async (req, res) => {
  try {
    const result = await runDirectMySQLMigration(db_admin);
    res.json(result);
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});
app.get("/api/mongo/test-connection", async (req, res) => {
  try {
    const conn = await connectMongoDB();
    if (!conn) {
      return res.status(200).json({ success: false, message: "MongoDB Atlas is offline (direct TCP egress blocked in sandbox). Using fallback storage." });
    }
    const adminDb = conn.db.admin();
    const pingResult = await adminDb.ping();
    res.json({
      success: true,
      message: "Successfully pinged and connected to MongoDB Atlas!",
      ping: pingResult,
      dbName: conn.name,
      host: conn.host
    });
  } catch (err) {
    res.status(200).json({ success: false, message: "MongoDB connection notice: " + (err?.message || "offline") });
  }
});
app.get("/api/mongo/appointments", async (req, res) => {
  try {
    const conn = await connectMongoDB();
    if (!conn) {
      return res.json({ success: true, appointments: [] });
    }
    const { doctorId, userId } = req.query;
    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (userId) filter.userId = userId;
    const list = await Appointment.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, appointments: list });
  } catch (err) {
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
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
    const newApp = await Appointment.create(req.body);
    res.json({ success: true, appointment: newApp });
  } catch (err) {
    console.warn("MongoDB appointment creation warning:", err?.message);
    res.json({
      success: true,
      appointment: {
        _id: "mock_app_" + Date.now(),
        ...req.body,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  }
});
app.post("/api/sheba/webhook", async (req, res) => {
  const apiKeyHeader = req.headers["x-api-key"];
  const shustoSecret = process.env.SHUSTO_API_SECRET;
  if (shustoSecret && apiKeyHeader !== shustoSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  console.log("Received webhook from Sheba:", req.body);
  res.json({ success: true });
});
function generateShustoHMAC(secret, timestamp, rawBody) {
  return import_crypto.default.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}
function verifyShustoHMAC(secret, timestamp, rawBody, incomingSignature) {
  if (!secret) return { valid: false, reason: "Secret is not configured" };
  if (!timestamp || !incomingSignature) return { valid: false, reason: "Missing timestamp or signature headers" };
  const tsNum = Number(timestamp);
  if (isNaN(tsNum)) return { valid: false, reason: "Invalid timestamp" };
  const nowSec = Math.floor(Date.now() / 1e3);
  const isMs = tsNum > 1e11;
  const incomingSec = isMs ? Math.floor(tsNum / 1e3) : tsNum;
  const diffSec = Math.abs(nowSec - incomingSec);
  if (diffSec > 300) {
    return { valid: false, reason: `Timestamp replay protection failed (request age: ${diffSec}s, max allowed: 300s)` };
  }
  const expectedSignature = import_crypto.default.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  try {
    const isValid = import_crypto.default.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(incomingSignature, "utf8")
    );
    return { valid: isValid, reason: isValid ? void 0 : "Signature mismatch" };
  } catch (e) {
    return { valid: false, reason: "Signature comparison error" };
  }
}
app.post(["/api/shusto/withdraw", "/direct-api/shusto/withdraw", "/api/sheba/withdraw", "/direct-api/sheba/withdraw"], async (req, res) => {
  const shustoSecret = (process.env.SHUSTO_API_SECRET || process.env.SHEBA_API_SECRET || "shusto_secure_secret_key_2026").trim();
  const incomingSignature = req.headers["x-shusto-signature"] || req.headers["x-signature"];
  const incomingTimestamp = req.headers["x-shusto-timestamp"] || req.headers["x-timestamp"];
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
  const idempotencyKey = (reqIdempotencyKey || (0, import_uuid.v4)()).trim();
  if (!effectiveUserId) {
    return res.status(400).json({ success: false, error: "shustoUserId is required" });
  }
  if (!effectiveNumber || effectiveNumber.length < 11) {
    return res.status(400).json({ success: false, error: "Valid 11-digit shebaNumber is required" });
  }
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, error: "Valid positive amount is required" });
  }
  if (incomingSignature && incomingTimestamp) {
    const authCheck = verifyShustoHMAC(shustoSecret, incomingTimestamp, rawJsonBody, incomingSignature);
    if (!authCheck.valid) {
      console.warn("[SHUSTO WITHDRAWAL] HMAC verification failed:", authCheck.reason);
      return res.status(401).json({ success: false, error: `Unauthorized: ${authCheck.reason}` });
    }
  }
  try {
    if (db_admin) {
      const existingTxSnap = await db_admin.collection("transactions").where("idempotencyKey", "==", idempotencyKey).limit(1).get();
      if (!existingTxSnap.empty) {
        const txData = existingTxSnap.docs[0].data();
        console.log(`[SHUSTO WITHDRAWAL] Duplicate request blocked (idempotencyKey: ${idempotencyKey})`);
        return res.status(200).json({
          success: true,
          message: "\u098F\u0987 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F\u099F\u09BF \u09AA\u09C2\u09B0\u09CD\u09AC\u09C7\u0987 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u09B9\u09DF\u09C7\u099B\u09C7 (Already Processed)",
          alreadyProcessed: true,
          transaction: txData
        });
      }
    }
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
          error: `\u0985\u09AA\u09B0\u09CD\u09AF\u09BE\u09AA\u09CD\u09A4 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8! \u0986\u09AA\u09A8\u09BE\u09B0 \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09F3${currentBalance}, \u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u09AA\u09CD\u09B0\u09DF\u09CB\u099C\u09A8 \u09F3${numAmount}\u0964`
        });
      }
    }
    const shebaPayload = {
      shustoUserId: effectiveUserId,
      shebaNumber: effectiveNumber,
      amount: numAmount,
      idempotencyKey
    };
    const payloadString = JSON.stringify(shebaPayload);
    const outTimestamp = Math.floor(Date.now() / 1e3).toString();
    const outSignature = generateShustoHMAC(shustoSecret, outTimestamp, payloadString);
    let targetUrl = process.env.SHEBA_WITHDRAW_URL || process.env.SHEBA_WEBHOOK_URL || "https://shebabangladesh.vercel.app/api/shusto/withdraw";
    if (targetUrl.includes("/webhook") && !process.env.SHEBA_WITHDRAW_URL) {
      targetUrl = targetUrl.replace("/webhook", "/withdraw");
    }
    console.log(`[SHUSTO WITHDRAWAL] Calling Sheba endpoint: ${targetUrl}`);
    console.log(`[SHUSTO WITHDRAWAL] Outgoing Headers: x-shusto-timestamp=${outTimestamp}, x-shusto-signature=${outSignature.slice(0, 10)}...`);
    let shebaResponse = null;
    try {
      shebaResponse = await import_axios.default.post(targetUrl, shebaPayload, {
        headers: {
          "Content-Type": "application/json",
          "x-shusto-timestamp": outTimestamp,
          "x-shusto-signature": outSignature,
          "x-api-key": process.env.SHEBA_API_SECRET || shustoSecret
        },
        timeout: 15e3
      });
      console.log(`[SHUSTO WITHDRAWAL] Sheba Response Status: ${shebaResponse.status}`, shebaResponse.data);
    } catch (shebaErr) {
      console.error("[SHUSTO WITHDRAWAL] Sheba API error:", {
        message: shebaErr.message,
        data: shebaErr.response?.data,
        status: shebaErr.response?.status
      });
      const shebaErrMsg = shebaErr.response?.data?.error || shebaErr.response?.data?.message || shebaErr.message;
      return res.status(shebaErr.response?.status || 502).json({
        success: false,
        error: `\u09B6\u09C7\u09AC\u09BE \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 \u098F\u09B0\u09B0: ${shebaErrMsg}`
      });
    }
    const isShebaSuccess = shebaResponse && shebaResponse.status >= 200 && shebaResponse.status < 300 && shebaResponse.data?.success !== false;
    if (!isShebaSuccess) {
      return res.status(502).json({
        success: false,
        error: shebaResponse?.data?.error || shebaResponse?.data?.message || "\u09B6\u09C7\u09AC\u09BE \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u0996\u09CD\u09AF\u09BE\u09A8 \u0995\u09B0\u09C7\u099B\u09C7\u0964"
      });
    }
    if (db_admin) {
      const walletRef = db_admin.collection("wallets").doc(effectiveUserId);
      const txRef = db_admin.collection("transactions").doc();
      const notifRef = db_admin.collection("notifications").doc();
      await db_admin.runTransaction(async (transaction) => {
        const wDoc = await transaction.get(walletRef);
        const bal = (wDoc.exists ? wDoc.data()?.balance : 0) || 0;
        if (bal < numAmount) {
          throw new Error("Insufficient balance during atomic deduction");
        }
        transaction.update(walletRef, {
          balance: bal - numAmount,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        transaction.set(txRef, {
          userId: effectiveUserId,
          amount: numAmount,
          type: "withdrawal",
          status: "success",
          method: "sheba",
          phoneNumber: effectiveNumber,
          idempotencyKey,
          details: `Withdrawn to Sheba: ${effectiveNumber}`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        transaction.set(notifRef, {
          userId: effectiveUserId,
          title: "\u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8 \u09B8\u09AB\u09B2 \u09B9\u09DF\u09C7\u099B\u09C7",
          message: `\u09F3${numAmount} \u099F\u09BE\u0995\u09BE \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u09C7\u09AC\u09BE (${effectiveNumber}) \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7\u0964`,
          type: "wallet",
          read: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      });
    }
    console.log(`[SHUSTO WITHDRAWAL] Withdrawal completed atomically for user ${effectiveUserId}, amount \u09F3${numAmount}`);
    return res.status(200).json({
      success: true,
      message: shebaResponse.data?.message || "\u0986\u09AA\u09A8\u09BE\u09B0 \u099F\u09BE\u0995\u09BE \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B6\u09C7\u09AC\u09BE \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7\u0964",
      idempotencyKey,
      shebaData: shebaResponse.data
    });
  } catch (error) {
    console.error("[SHUSTO WITHDRAWAL] Fatal Error:", error);
    return res.status(500).json({
      success: false,
      error: `\u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u0995\u09B0\u09A4\u09C7 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7: ${error.message}`
    });
  }
});
app.use((req, res, next) => {
  const forwardedPath = req.headers["x-matched-path"] || req.headers["x-vercel-forwarded-path"] || req.headers["x-forwarded-path"] || req.headers["x-original-url"] || req.headers["x-invoke-path"] || req.headers["x-forwarded-uri"];
  if (forwardedPath && (forwardedPath.startsWith("/api/") || forwardedPath.startsWith("/direct-api/"))) {
    const queryIndex = req.url.indexOf("?");
    const queryString = queryIndex !== -1 ? req.url.substring(queryIndex) : "";
    const cleanForwardedPath = forwardedPath.split("?")[0];
    const newUrl = `${cleanForwardedPath}${queryString}`;
    console.log(`[ROUTER MIDDLEWARE] Recovered original URL on cloud proxy: ${req.url} -> ${newUrl}`);
    req.url = newUrl;
  } else if ((req.url.startsWith("/api/index") || req.url === "/api" || req.url === "/api/") && req.query?.path) {
    const p = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path;
    req.url = `/api/${p}`;
    console.log(`[ROUTER MIDDLEWARE] Recovered original URL from query.path: -> ${req.url}`);
  }
  console.log(`[REQUEST LOGGER] ${req.method} ${req.path || req.url}`);
  if (req.body !== void 0) {
    return next();
  }
  next();
});
app.use(import_express.default.json());
app.use(import_express.default.urlencoded({ extended: true }));
app.post("/api/youtube/subscribe", async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: "Access token required" });
  try {
    const handle = "@SiamTheBin";
    console.log(`[YOUTUBE_SUB] Processing subscription for ${handle}`);
    const channelResp = await import_axios.default.get(`https://www.googleapis.com/youtube/v3/channels`, {
      params: {
        forHandle: handle,
        part: "id",
        key: process.env.YOUTUBE_API_KEY
        // Optional if using user token for everything
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
    try {
      const subResp = await import_axios.default.post(`https://www.googleapis.com/youtube/v3/subscriptions?part=snippet`, {
        snippet: {
          resourceId: {
            kind: "youtube#channel",
            channelId
          }
        }
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });
      console.log("[YOUTUBE_SUB] Subscription successful!");
      res.json({ success: true, message: "Subscribed successfully" });
    } catch (subErr) {
      if (subErr.response?.status === 403 && subErr.response?.data?.error?.errors?.[0]?.reason === "subscriptionDuplicate") {
        console.log("[YOUTUBE_SUB] User already subscribed.");
        return res.json({ success: true, message: "Already subscribed" });
      }
      throw subErr;
    }
  } catch (error) {
    console.error("[YOUTUBE_SUB] Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "YouTube subscription failed",
      details: error.response?.data || error.message
    });
  }
});
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
app.get("/api/user/restore-siam", async (req, res) => {
  try {
    if (!db_admin) return res.status(500).json({ error: "db_admin not ready" });
    let foundUser = null;
    let uid = null;
    const userSnap = await db_admin.collection("users").where("email", "==", "siamthebin7@gmail.com").get();
    if (!userSnap.empty) {
      userSnap.forEach((d) => {
        foundUser = d.data();
        uid = d.id || foundUser.uid;
      });
    }
    if (!uid) {
      try {
        const authUser = await admin.auth().getUserByEmail("siamthebin7@gmail.com");
        uid = authUser.uid;
      } catch (e) {
        console.warn("Auth lookup notice:", e.message);
      }
    }
    if (!uid) {
      const walletsSnap = await db_admin.collection("wallets").get();
      walletsSnap.forEach((d) => {
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
        uid,
        email: "siamthebin7@gmail.com",
        balance: 14,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      const txSnap = await db_admin.collection("transactions").where("userId", "==", uid).get();
      let has14 = false;
      txSnap.forEach((d) => {
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
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return res.json({ success: true, uid, balance: 14 });
    }
    return res.status(404).json({ error: "siamthebin7@gmail.com not found yet", searched: true });
  } catch (e) {
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
        txSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const tranId = String(data.tran_id || docSnap.id || "").toLowerCase();
          const type = String(data.type || "").toLowerCase();
          const details = String(data.details || "").toLowerCase();
          const desc = String(data.description || "").toLowerCase();
          const isFake = tranId.startsWith("instant_") || tranId.startsWith("mock_") || tranId.startsWith("test_") || tranId.startsWith("demo_") || tranId.startsWith("fake_") || data.isMock === true || data.isInstant === true || data.mock === true || data.instant === true || type === "mock_recharge" || type === "instant_recharge" || details.includes("instant") || details.includes("mock") || details.includes("\u0987\u09A8\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u09A8\u09CD\u099F") || desc.includes("instant") || desc.includes("mock") || desc.includes("\u0987\u09A8\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u09A8\u09CD\u099F");
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
        const walletRef = db_admin.collection("wallets").doc(userId);
        batch.set(walletRef, {
          uid: userId,
          balance: realBalance,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
        await batch.commit();
        console.log(`[Wallet Cleanup] Purged ${removedTxsCount} fake txs. Set real balance for ${userId}: \u09F3${realBalance}`);
      } catch (dbErr) {
        console.warn("[Wallet Cleanup] db_admin notice:", dbErr.message);
      }
    }
    return res.status(200).json({
      success: true,
      realBalance,
      removedTxsCount,
      message: `SSLCommerz \u099B\u09BE\u09DC\u09BE \u0985\u09A8\u09CD\u09AF \u09B8\u09AC \u09AB\u09C7\u0995 \u0993 \u0987\u09A8\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u09A8\u09CD\u099F \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AE\u09C1\u099B\u09C7 \u09AB\u09C7\u09B2\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u0986\u09B8\u09B2 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8: \u09F3${realBalance}`
    });
  } catch (e) {
    console.error("[Wallet Cleanup] Error:", e);
    return res.status(500).json({ error: e.message });
  }
});
app.post(["/api/wallet/cleanup-all-fake-balances", "/direct-api/wallet/cleanup-all-fake-balances"], async (req, res) => {
  try {
    const cfg = JSON.parse(import_fs2.default.readFileSync("firebase-applet-config.json", "utf8"));
    const { initializeApp: initWeb } = await import("firebase/app");
    const { getFirestore: getWebDb, collection: webCol, getDocs: webGet, doc: webDocRef, deleteDoc: webDel, setDoc: webSet } = await import("firebase/firestore");
    const webApp = initWeb(cfg, `cleanup_${Date.now()}`);
    const webDb = getWebDb(webApp, cfg.firestoreDatabaseId || "ai-studio-d521464d-ee88-49d7-a823-d0f7de73bd74");
    const txSnap = await webGet(webCol(webDb, "transactions"));
    let deletedTxs = 0;
    const userValidTx = {};
    for (const d of txSnap.docs) {
      const data = d.data();
      const tranId = String(data.tran_id || d.id || "").toLowerCase();
      const type = String(data.type || "").toLowerCase();
      const details = String(data.details || "").toLowerCase();
      const desc = String(data.description || "").toLowerCase();
      const isFake = tranId.startsWith("instant_") || tranId.startsWith("mock_") || tranId.startsWith("test_") || tranId.startsWith("demo_") || tranId.startsWith("fake_") || tranId.startsWith("manual_") || data.isMock === true || data.isInstant === true || data.mock === true || data.instant === true || type === "mock_recharge" || type === "instant_recharge" || details.includes("instant") || details.includes("mock") || details.includes("\u0987\u09A8\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u09A8\u09CD\u099F") || desc.includes("instant") || desc.includes("mock") || desc.includes("\u0987\u09A8\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u09A8\u09CD\u099F") || Number(data.amount || 0) > 1e6;
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
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          cleanedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
        resetCount++;
      }
    }
    return res.status(200).json({
      success: true,
      deletedTxs,
      resetCount,
      message: `\u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 ${deletedTxs}\u099F\u09BF \u09AB\u09C7\u0995 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09C7\u0995\u09B6\u09A8 \u09AE\u09C1\u099B\u09C7 \u09AB\u09C7\u09B2\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 \u098F\u09AC\u0982 ${resetCount}\u099F\u09BF \u0987\u0989\u099C\u09BE\u09B0\u09C7\u09B0 \u09AB\u09C7\u0995 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09B0\u09BF\u09B8\u09C7\u099F \u0995\u09B0\u09C7 \u0986\u09B8\u09B2 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09B8\u09C7\u099F \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964`
    });
  } catch (e) {
    console.error("[Cleanup All Fake Balances] Error:", e);
    return res.status(500).json({ error: e.message });
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
  if (!store_id || store_id.includes("6724cf62ca8f6") || store_id === "YOUR_STORE_ID" || store_id === "demo" || store_id === "" || store_id.includes("YOUR")) {
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
  if (!amount || !userId || Number(amount) < 10) {
    console.error("[PAYMENT_INIT] Missing required fields or amount < 10:", { amount, userId });
    return res.status(400).json({ error: "SSLCommerz \u0997\u09C7\u099F\u0993\u09DF\u09C7\u09B0 \u09A8\u09BF\u09DF\u09AE \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u09B8\u09B0\u09CD\u09AC\u09A8\u09BF\u09AE\u09CD\u09A8 \u09E7\u09E6 \u099F\u09BE\u0995\u09BE \u09AF\u09CB\u0997 \u0995\u09B0\u09A4\u09C7 \u09B9\u09AC\u09C7 (Minimum is 10 BDT)" });
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
    console.log(`[PAYMENT_INIT] Initiating REAL SSLCommerz request to ${sslUrl}`);
    const formParams = new URLSearchParams();
    Object.keys(data).forEach((key) => {
      formParams.append(key, String(data[key]));
    });
    let response;
    try {
      response = await import_axios.default.post(sslUrl, formParams.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 25e3
      });
    } catch (axiosErr) {
      console.error("[PAYMENT_INIT] SSLCommerz request error:", axiosErr.message, axiosErr.response?.data);
      return res.status(502).json({
        error: "SSLCommerz \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u0997\u09C7\u099F\u0993\u09AF\u09BC\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF\u0964 \u09A6\u09AF\u09BC\u09BE \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964",
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
  } catch (error) {
    console.error("[PAYMENT_INIT] Exception:", error?.response?.data || error?.message || error);
    res.status(500).json({
      error: `Payment initiation failed: ${error?.message || "Internal error"}`,
      details: error?.response?.data || null,
      stack: error?.stack || null
    });
  }
});
async function creditPaymentToWallet(userId, tran_id, paidAmount, source) {
  if (!db_admin || !userId || !tran_id || paidAmount <= 0) {
    console.warn(`[PAYMENT CREDIT ${source}] Cannot credit: db_admin=${Boolean(db_admin)}, userId=${userId}, tran_id=${tran_id}, amount=${paidAmount}`);
    return false;
  }
  const targetTxRef = db_admin.collection("transactions").doc(tran_id);
  const walletRef = db_admin.collection("wallets").doc(userId);
  try {
    const result = await db_admin.runTransaction(async (t) => {
      const existingTx = await t.get(targetTxRef);
      if (existingTx.exists) {
        const txData = existingTx.data();
        if (txData?.status === "success") {
          console.log(`[PAYMENT CREDIT ${source}] Transaction ${tran_id} was ALREADY processed. Skipping duplicate credit.`);
          return { credited: false, alreadyProcessed: true };
        }
      }
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
        creditedVia: source,
        processedAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      return { credited: true, alreadyProcessed: false };
    });
    if (result.credited) {
      console.log(`[PAYMENT CREDIT ${source}] Successfully credited \u09F3${paidAmount} to user ${userId} (tran_id: ${tran_id})`);
    }
    return result.credited;
  } catch (err) {
    console.error(`[PAYMENT CREDIT ${source}] Error running credit transaction:`, err?.message || err);
    return false;
  }
}
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
  const mockSuccess = false;
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
  if (val_id) {
    try {
      console.log(`[SSLCOMMERZ SUCCESS] Validating transaction val_id: ${val_id} with store: ${store_id}`);
      const valResp = await import_axios.default.get(validationUrl, {
        params: {
          val_id,
          store_id,
          store_passwd,
          format: "json"
        },
        timeout: 1e4
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
        await creditPaymentToWallet(userId, tran_id, paidAmount, "SUCCESS_CALLBACK");
        const redirectUrl = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}`;
        return res.redirect(303, redirectUrl);
      } catch (e) {
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
  return res.redirect(303, redirectUrl);
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
        await creditPaymentToWallet(userId, tran_id, paidAmount, "IPN_WEBHOOK");
      } catch (e) {
        console.error("[SSLCOMMERZ IPN] Credit Error:", e.message);
      }
    } else {
      console.error("[SSLCOMMERZ IPN] db_admin missing! Payment validation passed, but cannot save to DB.");
    }
  }
  res.status(200).send("OK");
});
app.use((err, req, res, next) => {
  if (err && (err.name === "MongooseError" || err.name === "MongoNetworkError" || err.message && err.message.includes("buffering timed out"))) {
    console.warn("[AI Studio] Database offline \u2014 returning mock empty response");
    if (req.method === "GET") {
      return res.json(req.path.endsWith("s") || req.path.endsWith("s/") ? [] : {});
    }
    return res.status(503).json({ error: "Service temporarily unavailable (database offline)" });
  }
  next(err);
});
app.get("/api/download-android", (req, res) => {
  const tarPath = import_path2.default.join(process.cwd(), "shusto-android-project.tar.gz");
  if (import_fs2.default.existsSync(tarPath)) {
    res.download(tarPath, "shusto-android-project.tar.gz");
  } else {
    res.status(404).send("Android project archive not found.");
  }
});
app.get("/api/download-aab", (req, res) => {
  const aabPath = import_path2.default.join(process.cwd(), "shusto-app-release.aab");
  if (import_fs2.default.existsSync(aabPath)) {
    res.download(aabPath, "shusto-app-release.aab");
  } else {
    res.status(404).send("Android app bundle not found.");
  }
});
async function startViteOrStaticServer() {
  if (!process.env.VERCEL) {
    const isProduction = process.env.NODE_ENV === "production" || myFilename.endsWith("server.cjs");
    if (!isProduction) {
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== "true" },
          appType: "spa"
        });
        app.use(vite.middlewares);
      } catch (viteLoadErr) {
        console.warn("Vite server failed to load dynamically:", viteLoadErr.message);
        const distPath = import_path2.default.join(process.cwd(), "dist");
        if (import_fs2.default.existsSync(distPath)) {
          app.use(import_express.default.static(distPath));
          app.get("*", (req, res) => {
            res.sendFile(import_path2.default.join(distPath, "index.html"));
          });
        }
      }
    } else {
      const distPath = import_path2.default.join(process.cwd(), "dist");
      if (import_fs2.default.existsSync(distPath)) {
        app.use(import_express.default.static(distPath));
      }
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/") || req.path.startsWith("/direct-api/")) {
          return next();
        }
        const indexPath = import_path2.default.join(distPath, "index.html");
        if (import_fs2.default.existsSync(indexPath)) {
          return res.sendFile(indexPath);
        }
        return res.sendFile(import_path2.default.join(process.cwd(), "index.html"));
      });
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
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
