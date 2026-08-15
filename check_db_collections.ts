import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

try {
  let firebaseConfig = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
    firebaseConfig = JSON.parse(serviceAccountJson);
  } else if (fs.existsSync(path.resolve(process.cwd(), "firebase-applet-config.json"))) {
    const rawConfig = fs.readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf8");
    firebaseConfig = JSON.parse(rawConfig);
  }

  const initOptions: admin.AppOptions = {};
  if (firebaseConfig?.serviceAccount) {
    initOptions.credential = admin.credential.cert(firebaseConfig.serviceAccount);
  }
  if (firebaseConfig?.projectId) {
    initOptions.projectId = firebaseConfig.projectId;
  }
  
  if (!admin.apps.length) {
    admin.initializeApp(initOptions);
  }

  const appInstance = admin.app();
  const db = getFirestore(appInstance, firebaseConfig?.firestoreDatabaseId);
  const dbId = firebaseConfig?.firestoreDatabaseId || "(default)";
  console.log("Checking Firestore Database:", dbId);

  async function check() {
    const collections = [
      "users",
      "doctors",
      "ambulances",
      "hospitals",
      "pharmacies",
      "labs",
      "nursings",
      "physios",
      "wallets"
    ];

    for (const col of collections) {
      const snap = await db.collection(col).limit(10).get();
      console.log(`Collection [${col}]: ${snap.size} documents found.`);
      if (snap.size > 0) {
        console.log(` - Sample IDs from ${col}:`, snap.docs.map(d => d.id));
      }
    }
  }

  check().catch(console.error);

} catch (err: any) {
  console.error("Initialization error:", err);
}
