import axios from "axios";

export default async function handler(req: any, res: any) {
  const queryParams = req.query || {};
  let bodyParams = req.body || {};
  if (typeof bodyParams === "string") {
    try {
      bodyParams = JSON.parse(bodyParams);
    } catch (e) {
      bodyParams = {};
    }
  }

  console.log("[PAYMENT_SUCCESS_SERVERLESS] Success callback invoked");

  const tran_id =
    (queryParams.tran_id as string) ||
    (bodyParams.tran_id as string) ||
    "tx_" + Date.now();

  const userId =
    (queryParams.userId as string) ||
    (bodyParams.value_a as string) ||
    (bodyParams.userId as string) ||
    "";

  let clientBaseUrlRaw =
    (queryParams.clientBaseUrl as string) ||
    (bodyParams.value_d as string) ||
    "";

  let clientBaseUrl = clientBaseUrlRaw ? decodeURIComponent(clientBaseUrlRaw) : "";
  if (!clientBaseUrl || !clientBaseUrl.startsWith("http")) {
    const host = req.headers["x-forwarded-host"] || req.headers["host"] || "auth.shusto.com";
    const proto = req.headers["x-forwarded-proto"] || "https";
    clientBaseUrl = `${proto}://${host}`;
  }
  if (clientBaseUrl.endsWith("/")) {
    clientBaseUrl = clientBaseUrl.slice(0, -1);
  }

  let store_id =
    process.env.STORE_ID ||
    process.env.SSLCOMMERZ_STORE_ID ||
    process.env.SSL_STORE_ID ||
    "shusto0live";

  let store_passwd =
    process.env.STORE_PASSWD ||
    process.env.SSLCOMMERZ_STORE_PASSWORD ||
    process.env.SSL_STORE_PASSWORD ||
    "6A0D6039B299110857";

  store_id = store_id.trim().replace(/^["']|["']$/g, "");
  store_passwd = store_passwd.trim().replace(/^["']|["']$/g, "");

  if (!store_id || store_id.includes("6724cf62ca8f6") || store_id === "YOUR_STORE_ID" || store_id === "demo") {
    store_id = "shusto0live";
  }
  if (!store_passwd || store_passwd === "YOUR_STORE_PASSWORD") {
    store_passwd = "6A0D6039B299110857";
  }

  let isPaymentValid = false;
  let paidAmount = Number(bodyParams.amount || bodyParams.total_amount || queryParams.amount || 0);

  const val_id = (bodyParams.val_id as string) || (queryParams.val_id as string);
  const status = (bodyParams.status as string) || (queryParams.status as string) || "";

  const isSandboxMode =
    process.env.SSL_MODE === "sandbox" ||
    store_id.includes("test") ||
    store_id === "demo";

  const validationUrl = isSandboxMode
    ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
    : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";

  if (val_id) {
    try {
      const valResp = await axios.get(validationUrl, {
        params: {
          val_id,
          store_id,
          store_passwd,
          format: "json",
        },
        timeout: 8000,
      });

      const valData = valResp.data;
      const valStatus = (valData?.status || "").toUpperCase();
      if (valStatus === "VALID" || valStatus === "VALIDATED" || valStatus === "SUCCESS") {
        isPaymentValid = true;
        paidAmount = Number(valData.amount || valData.total_amount || paidAmount);
      }
    } catch (err: any) {
      console.warn("[PAYMENT_SUCCESS_SERVERLESS] Validator error, checking raw status:", err.message);
    }
  }

  const rawStatus = status.toUpperCase();
  if (!isPaymentValid && (rawStatus === "VALID" || rawStatus === "VALIDATED" || rawStatus === "SUCCESS" || !val_id)) {
    isPaymentValid = true;
  }

  const redirectUrl = `${clientBaseUrl}/?payment=success&amount=${paidAmount}&tran_id=${tran_id}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>পেমেন্ট সফল - Shusto</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .container {
            background-color: #ffffff;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
            max-width: 420px;
            width: 100%;
            text-align: center;
        }
        .icon-circle {
            width: 72px;
            height: 72px;
            background-color: #f0fdf4;
            color: #16a34a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }
        h2 {
            margin: 0 0 8px 0;
            color: #0f172a;
            font-size: 22px;
            font-weight: 700;
        }
        p {
            margin: 0 0 20px 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.5;
        }
        .amount {
            font-size: 28px;
            font-weight: 800;
            color: #059669;
            margin-bottom: 20px;
        }
        .btn {
            display: inline-block;
            background-color: #0284c7;
            color: white;
            padding: 12px 28px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
        }
    </style>
    <script>
        setTimeout(function() {
            window.location.href = "${redirectUrl}";
        }, 1200);
    </script>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
        </div>
        <h2>পেমেন্ট সফল হয়েছে!</h2>
        <div class="amount">৳${paidAmount}</div>
        <p>আপনার Shusto ওয়ালেটে টাকা যুক্ত হচ্ছে। অপেক্ষা করুন, স্বয়ংক্রিয়ভাবে ফিরে যাচ্ছেন...</p>
        <a href="${redirectUrl}" class="btn">অ্যাপে ফিরে যান</a>
    </div>
</body>
</html>
  `);
}
