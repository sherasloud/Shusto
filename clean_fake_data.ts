import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';

async function removeFakeData() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);

  const fakeIdPrefixes = [
    'admin_shusto_main',
    'doc_',
    'patient_',
    'pharmacy_',
    'investor_',
    'manager_',
    'state_',
    'med_',
    'lab_',
    'hospital_',
    'amb_',
    'physio_',
    'nursing_'
  ];

  const collections = ['users', 'doctors', 'medicines', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings', 'wallets'];

  for (const colName of collections) {
    const snap = await getDocs(collection(db, colName));
    for (const d of snap.docs) {
      const isFake = fakeIdPrefixes.some(prefix => d.id.startsWith(prefix));
      if (isFake) {
        console.log(`Deleting fake doc [${colName}/${d.id}]`);
        await deleteDoc(doc(db, colName, d.id));
      }
    }
  }

  console.log("Cleanup complete!");
  process.exit(0);
}

removeFakeData().catch(e => {
  console.error(e);
  process.exit(1);
});
