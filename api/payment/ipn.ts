import axios from 'axios';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

function getSSLCommerzCredentials() {
  let store_id = process.env.STORE_ID || process.env.SSLCOMMERZ_STORE_ID || 'shusto0live';
  let store_passwd = process.env.STORE_PASSWORD || process.env.SSLCOMMERZ_STORE_PASSWORD || '6A0D6039B299110857';

  store_id = store_id.replace(/^["']|["']$/g, '');
  store_passwd = store_passwd.replace(/^["']|["']$/g, '');

  if (!store_id || store_id.includes('6724cf62ca8f6') || store_id === 'YOUR_STORE_ID' || store_id === 'demo' || store_id === '' || store_id.includes('YOUR')) {
    store_id = 'shusto0live';
  }
  if (!store_passwd || store_passwd === 'YOUR_STORE_PASSWORD' || store_passwd === '' || store_passwd.includes('YOUR')) {
    store_passwd = '6A0D6039B299110857';
  }
  return { store_id, store_passwd };
}

function getDb() {
  try {
    let cfg: any = null;
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      cfg = {
        projectId: process.env.FIREBASE_PROJECT_ID || 'ai-studio-applet-webapp-3b366',
        apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyB5TInPrCSeROrJO1WesZGdO85yQG3919o',
        authDomain: 'ai-studio-applet-webapp-3b366.firebaseapp.com',
        firestoreDatabaseId: 'ai-studio-d521464d-ee88-49d7-a823-d0f7de73bd74',
      };
    }
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(cfg);
    return getFirestore(app, cfg.firestoreDatabaseId || 'ai-studio-d521464d-ee88-49d7-a823-d0f7de73bd74');
  } catch (e) {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  const body = req.body || {};
  const { val_id, tran_id, status, amount, value_a: userId } = body;
  const { store_id, store_passwd } = getSSLCommerzCredentials();

  const isSandboxMode = process.env.SSL_MODE === 'sandbox' || store_id.includes('test') || store_id === 'demo';
  const validationUrl = isSandboxMode
    ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
    : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

  if (!val_id) {
    return res.status(400).send('Missing val_id');
  }

  try {
    const valResp = await axios.get(validationUrl, {
      params: { val_id, store_id, store_passwd, format: 'json' },
      timeout: 8000,
    });
    const valData = valResp.data;
    const isValid = valData?.status === 'VALID' || valData?.status === 'VALIDATED';

    if (isValid && userId) {
      const db = getDb();
      if (db) {
        const paidAmount = Number(valData.amount || amount || 0);
        const txRef = doc(db, 'transactions', tran_id || `ssl_${Date.now()}`);
        await setDoc(
          txRef,
          {
            id: tran_id,
            tran_id,
            userId,
            amount: paidAmount,
            type: 'add_money',
            status: 'success',
            details: `SSLCommerz IPN Top Up (৳${paidAmount})`,
            val_id,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        const walletRef = doc(db, 'wallets', userId);
        const walletSnap = await getDoc(walletRef);
        if (walletSnap.exists()) {
          await updateDoc(walletRef, {
            balance: increment(paidAmount),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return res.status(200).send('IPN OK');
  } catch (e: any) {
    return res.status(500).send('IPN Error');
  }
}
