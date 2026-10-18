import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

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

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const params = req.body || {};
  const { amount, userId, userName, userEmail, clientBaseUrl: incomingClientBaseUrl } = params;

  if (!amount || !userId || Number(amount) < 10) {
    return res.status(400).json({ error: 'SSLCommerz গেটওয়ের নিয়ম অনুযায়ী সর্বনিম্ন ১০ টাকা যোগ করতে হবে (Minimum is 10 BDT)' });
  }

  const tran_id = uuidv4();
  const { store_id, store_passwd } = getSSLCommerzCredentials();

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'shusto.com';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const defaultBaseUrl = `${proto}://${host}`;
  const clientBaseUrl = incomingClientBaseUrl || defaultBaseUrl;

  let cleanBaseUrl = clientBaseUrl.endsWith('/') ? clientBaseUrl.slice(0, -1) : clientBaseUrl;
  if (!cleanBaseUrl.startsWith('https://') && !cleanBaseUrl.includes('localhost') && !cleanBaseUrl.includes('127.0.0.1')) {
    cleanBaseUrl = 'https://' + cleanBaseUrl.replace(/^http:\/\//i, '');
  }

  const data: any = {
    store_id: store_id,
    store_passwd: store_passwd,
    total_amount: Number(amount),
    currency: 'BDT',
    tran_id: tran_id,
    success_url: `${cleanBaseUrl}/api/payment/success?userId=${encodeURIComponent(userId)}&tran_id=${encodeURIComponent(tran_id)}&clientBaseUrl=${encodeURIComponent(cleanBaseUrl)}`,
    fail_url: `${cleanBaseUrl}/api/payment/fail?userId=${encodeURIComponent(userId)}&clientBaseUrl=${encodeURIComponent(cleanBaseUrl)}`,
    cancel_url: `${cleanBaseUrl}/api/payment/cancel?userId=${encodeURIComponent(userId)}&clientBaseUrl=${encodeURIComponent(cleanBaseUrl)}`,
    ipn_url: `${cleanBaseUrl}/api/payment/ipn`,
    shipping_method: 'No',
    product_name: 'Telehealth Service Wallet Top Up',
    product_category: 'Healthcare',
    product_profile: 'general',
    cus_name: userName || 'Customer',
    cus_email: userEmail || 'customer@example.com',
    cus_add1: 'Dhaka',
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: '01700000000',
    value_a: userId,
    value_d: cleanBaseUrl,
  };

  try {
    const isSandboxMode = process.env.SSL_MODE === 'sandbox' || store_id.includes('test') || store_id === 'demo';
    const sslUrl = isSandboxMode
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

    const formParams = new URLSearchParams();
    Object.keys(data).forEach((key) => {
      formParams.append(key, String(data[key]));
    });

    const response = await axios.post(sslUrl, formParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 25000,
    });

    if (response.data && response.data.status === 'SUCCESS') {
      return res.status(200).json(response.data);
    } else {
      console.error('[SSLCOMMERZ ERROR]', response.data);
      return res.status(400).json({ error: `SSLCommerz error: ${response.data?.failedreason || 'unknown gateway error'}` });
    }
  } catch (error: any) {
    console.error('[PAYMENT_INIT Exception]', error?.response?.data || error?.message || error);
    return res.status(500).json({
      error: `Payment initiation failed: ${error?.message || 'Internal error'}`,
      details: error?.response?.data || null,
    });
  }
}
