import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp({
  ...firebaseConfig,
  authDomain: firebaseConfig.authDomain || 'ai-studio-applet-webapp-3b366.firebaseapp.com'
});
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const snapshot = await getDocs(collection(db, 'users'));
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.email && data.email.includes('@shusto.demo')) {
      console.log('Deleting', docSnap.id, data.email);
      await deleteDoc(doc(db, 'users', docSnap.id));
    } else if (docSnap.id.startsWith('demo-') || docSnap.id.startsWith('patient_')) {
      console.log('Deleting', docSnap.id);
      await deleteDoc(doc(db, 'users', docSnap.id));
    }
  }
  console.log('Done!');
  process.exit(0);
}
run().catch(console.error);
