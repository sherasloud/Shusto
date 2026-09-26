import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin identically to server.ts
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
  console.log("Script using Database ID:", firebaseConfig?.firestoreDatabaseId || "(default)");

  async function run() {
    const users = await db.collection("users").where("email", "==", "shustobd@gmail.com").get();
    if (users.empty) {
      console.log("User not found");
      return;
    }
    const user = users.docs[0];
    console.log("User ID:", user.id);
    
    const wallet = await db.collection("wallets").doc(user.id).get();
    console.log("Wallet:", wallet.data());
    
    const txns = await db.collection("transactions").where("userId", "==", user.id).get();
    console.log("Transactions:");
    txns.forEach(t => console.log(t.id, t.data()));
  }

  run().catch(console.error);

} catch (err: any) {
  console.error(err);
}
