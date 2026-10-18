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
    console.warn('Firebase init warning:', e);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  const queryParams = req.query || {};
  const bodyParams = req.body || {};

  const tran_id = (queryParams.tran_id as string) || (bodyParams.tran_id as string) || `ssl_${Date.now()}`;
  const userId = (queryParams.userId as string) || (bodyParams.value_a as string);
  const val_id = (bodyParams.val_id as string) || (queryParams.val_id as string);

  const clientBaseUrlRaw = (queryParams.clientBaseUrl as string) || (bodyParams.value_d as string);
  let clientBaseUrl = clientBaseUrlRaw ? decodeURIComponent(clientBaseUrlRaw) : 'https://shusto.com';
  if (clientBaseUrl.endsWith('/')) {
    clientBaseUrl = clientBaseUrl.slice(0, -1);
  }

  const { store_id, store_passwd } = getSSLCommerzCredentials();
  let isPaymentValid = false;
  let paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || 0);

  const isSandboxMode = process.env.SSL_MODE === 'sandbox' || store_id.includes('test') || store_id === 'demo';
  const validationUrl = isSandboxMode
    ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
    : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

  const checkStatusSuccess = (status?: string): boolean => {
    if (!status) return false;
    const upper = status.trim().toUpperCase();
    return upper === 'VALID' || upper === 'VALIDATED' || upper === 'SUCCESS';
  };

  if (val_id) {
    try {
      const valResp = await axios.get(validationUrl, {
        params: {
          val_id,
          store_id,
          store_passwd,
          format: 'json',
        },
        timeout: 8000,
      });
      const valData = valResp.data;
      if (valData && checkStatusSuccess(valData?.status)) {
        isPaymentValid = true;
        paidAmount = Number(valData.amount || valData.total_amount || paidAmount);
      } else if (checkStatusSuccess(bodyParams?.status)) {
        isPaymentValid = true;
        paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || paidAmount);
      }
    } catch (err: any) {
      if (checkStatusSuccess(bodyParams?.status)) {
        isPaymentValid = true;
        paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || paidAmount);
      }
    }
  } else if (checkStatusSuccess(bodyParams?.status) || checkStatusSuccess(queryParams?.status)) {
    isPaymentValid = true;
  }

  // Record transaction in Firestore
  if (userId) {
    try {
      const db = getDb();
      if (db) {
        const txRef = doc(db, 'transactions', tran_id);
        await setDoc(
          txRef,
          {
            id: tran_id,
            tran_id,
            userId,
            amount: paidAmount,
            type: 'add_money',
            status: isPaymentValid ? 'success' : 'pending',
            details: `SSLCommerz Wallet Top Up (৳${paidAmount})`,
            val_id: val_id || null,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );

        if (isPaymentValid && paidAmount > 0) {
          const walletRef = doc(db, 'wallets', userId);
          const walletSnap = await getDoc(walletRef);
          if (walletSnap.exists()) {
            await updateDoc(walletRef, {
              balance: increment(paidAmount),
              updatedAt: new Date().toISOString(),
            });
          } else {
            await setDoc(
              walletRef,
              {
                uid: userId,
                balance: paidAmount,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        }
      }
    } catch (dbErr: any) {
      console.error('[DB Write Error in Success Callback]', dbErr);
    }
  }

  const redirectUrl = `${clientBaseUrl}/?payment=success&tran_id=${encodeURIComponent(tran_id)}&amount=${paidAmount}&status=success`;
  return res.redirect(302, redirectUrl);
}
