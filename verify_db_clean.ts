import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

async function verifyDb() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);

  const collections = ['users', 'doctors', 'medicines', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings', 'wallets'];
  console.log("=== CURRENT FIRESTORE DATABASE STATUS ===");
  for (const c of collections) {
    const snap = await getDocs(collection(db, c));
    console.log(`[${c}]: ${snap.docs.length} docs`);
    snap.docs.forEach(d => {
      console.log(`  - Doc ID: ${d.id}, data:`, JSON.stringify(d.data()).slice(0, 100));
    });
  }
}

verifyDb().catch(console.error);
