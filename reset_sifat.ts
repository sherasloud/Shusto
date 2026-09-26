
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

async function resetUser() {
  const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();
  const email = 'amk.sifat20@gmail.com';
  
  console.log(`Searching for user with email: ${email}`);
  const userSnap = await db.collection('users').where('email', '==', email).get();
  
  if (userSnap.empty) {
    console.log('User not found.');
    return;
  }

  const uid = userSnap.docs[0].id;
  console.log(`Found user ${uid}. Resetting balance to 0...`);
  
  await db.collection('wallets').doc(uid).set({
    balance: 0,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log('Balance reset successfully.');
}

resetUser().catch(console.error);
