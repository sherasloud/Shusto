import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import * as fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const doctors = [
  {
    id: "doc_sabbir_ahmed",
    name: "Dr. Sabbir Ahmed",
    specialty: "General Physician & Consultant",
    isPinned: true,
    email: "sabbir.ahmed@shusto.com",
    fee: 500,
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80",
    degree: "MBBS, FCPS",
    experience: "8+ Years Experience",
    createdAt: new Date().toISOString()
  }
];

async function seed() {
  // First unpin all existing doctors
  const allDocsSnap = await getDocs(collection(db, "doctors"));
  for (const d of allDocsSnap.docs) {
    await updateDoc(doc(db, "doctors", d.id), { isPinned: false });
  }

  // Then set Dr. Sabbir Ahmed as pinned and update his info
  for (const doctor of doctors) {
    await setDoc(doc(db, "doctors", doctor.id), doctor, { merge: true });
    console.log(`Updated featured doctor: ${doctor.name}`);
  }
}

seed().catch(console.error);
