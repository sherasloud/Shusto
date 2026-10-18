import axios from 'axios';
import crypto from 'crypto';

function generateShustoHMAC(secret: string, timestamp: string, payload: string): string {
  const data = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-shusto-signature, x-shusto-timestamp'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { shebaNumber, amount, phone, mobileNumber, idempotencyKey } = req.body || {};
  const effectiveNumber = shebaNumber || phone || mobileNumber;
  const numAmount = Number(amount);

  if (!effectiveNumber || !numAmount || numAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'shebaNumber and a positive amount are required',
    });
  }

  const shustoSecret = (process.env.SHUSTO_API_SECRET || process.env.SHEBA_API_SECRET || 'shusto_secure_secret_key_2026').trim();
  const shebaPayload = {
    shebaNumber: effectiveNumber,
    amount: numAmount,
    idempotencyKey: idempotencyKey,
  };
  const payloadString = JSON.stringify(shebaPayload);
  const outTimestamp = Math.floor(Date.now() / 1000).toString();
  const outSignature = generateShustoHMAC(shustoSecret, outTimestamp, payloadString);

  const targetUrl = process.env.SHEBA_WITHDRAW_URL || process.env.SHEBA_WEBHOOK_URL || 'https://shebabangladesh.vercel.app/api/shusto/withdraw';

  try {
    const shebaResponse = await axios.post(targetUrl, shebaPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-shusto-timestamp': outTimestamp,
        'x-shusto-signature': outSignature,
      },
      timeout: 15000,
    });
    return res.status(200).json(shebaResponse.data);
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: 'Sheba service unavailable',
      details: err?.response?.data || err?.message,
    });
  }
}
