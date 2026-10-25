import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const doctors = [
  {
    id: "doc_sabbir_ahmed",
    name: "Dr. Sabbir Ahmed",
    specialty: "General Physician",
    isPinned: true,
    email: "sabbir.ahmed@shusto.com",
    fee: 500,
    createdAt: new Date().toISOString()
  },
  {
    id: "doc_aquib_shadman",
    name: "Dr. Aquib Shadman",
    specialty: "Cardiologist",
    isPinned: true,
    email: "aquib.shadman@shusto.com",
    fee: 800,
    createdAt: new Date().toISOString()
  }
];

async function seed() {
  for (const doctor of doctors) {
    await setDoc(doc(db, "doctors", doctor.id), doctor);
    console.log(`Added doctor: ${doctor.name}`);
  }
}

seed().catch(console.error);
