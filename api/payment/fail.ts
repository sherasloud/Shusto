export default function handler(req: any, res: any) {
  const queryParams = req.query || {};
  const bodyParams = req.body || {};

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

  const redirectUrl = `${clientBaseUrl}/?payment=fail`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>পেমেন্ট ব্যর্থ - Shusto</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
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
            background-color: #fef2f2;
            color: #dc2626;
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
            margin: 0 0 24px 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.5;
        }
        .btn {
            display: inline-block;
            background-color: #0284c7;
            color: white;
            padding: 12px 28px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
        }
    </style>
    <script>
        setTimeout(function() {
            window.location.href = "${redirectUrl}";
        }, 2000);
    </script>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        </div>
        <h2>পেমেন্ট সম্পন্ন হয়নি</h2>
        <p>পেমেন্ট প্রসেসিং ব্যর্থ হয়েছে বা বাতিল হয়েছে। দয়া করে পুনরায় চেষ্টা করুন।</p>
        <a href="${redirectUrl}" class="btn">ওয়ালেটে ফিরে যান</a>
    </div>
</body>
</html>
  `);
}
