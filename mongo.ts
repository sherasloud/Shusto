import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://shustobd_db_user:7uChu8AqPXBblfgl@cluster0.sbpz6mc.mongodb.net/shustodb?retryWrites=true&w=majority&appName=Cluster0";

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    mongoose.set("strictQuery", false);
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = true;
    console.log(`✅ MongoDB Atlas connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error: any) {
    console.error("❌ MongoDB connection error:", error.message);
    return null;
  }
}

export function getMongoStatus() {
  const states: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const readyState = mongoose.connection.readyState;
  return {
    connected: readyState === 1,
    status: states[readyState] || "unknown",
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
}

// ----------------- SCHEMAS & MODELS ----------------- //

// Appointment Schema
const appointmentSchema = new mongoose.Schema(
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
      default: "pending",
    },
    fee: { type: Number, default: 500 },
    meetingLink: { type: String, default: "" },
    userId: { type: String, default: "" },
    prescriptionId: { type: String, default: "" },
  },
  { timestamps: true }
);

// User Profile Schema
const userSchema = new mongoose.Schema(
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
      isAvailable: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Prescription Schema
const prescriptionSchema = new mongoose.Schema(
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
        instructions: { type: String, default: "" },
      },
    ],
    advice: { type: String, default: "" },
    followUpDate: { type: String, default: "" },
    userId: { type: String, default: "" },
  },
  { timestamps: true }
);

// Wallet Schema
const walletSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    currency: { type: String, default: "BDT" },
  },
  { timestamps: true }
);

// Transaction Schema
const transactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["credit", "debit", "withdrawal", "fee", "refund"], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
    description: { type: String, default: "" },
    paymentMethod: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    referenceId: { type: String, default: "" },
  },
  { timestamps: true }
);

// Service Request Schema
const serviceRequestSchema = new mongoose.Schema(
  {
    serviceType: { type: String, required: true },
    patientName: { type: String, default: "" },
    patientPhone: { type: String, default: "" },
    address: { type: String, default: "" },
    details: { type: String, default: "" },
    status: { type: String, enum: ["pending", "accepted", "in_progress", "completed", "cancelled"], default: "pending" },
    cost: { type: Number, default: 0 },
    userId: { type: String, default: "" },
    providerId: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Appointment = mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);
export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Prescription = mongoose.models.Prescription || mongoose.model("Prescription", prescriptionSchema);
export const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
export const ServiceRequest = mongoose.models.ServiceRequest || mongoose.model("ServiceRequest", serviceRequestSchema);
