import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function list() {
  const snap = await getDocs(collection(db, "doctors"));
  snap.docs.forEach(d => {
    console.log(`${d.id}: ${d.data().name} (Pinned: ${d.data().isPinned})`);
  });
}

list().catch(console.error);
