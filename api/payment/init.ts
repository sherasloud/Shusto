import axios from "axios";
import crypto from "crypto";

export default async function handler(req: any, res: any) {
  // CORS setup
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    const { amount, userId, userName, userEmail, clientBaseUrl: incomingClientBaseUrl } = body;

    if (!amount || !userId) {
      return res.status(400).json({ error: "Amount and userId are required" });
    }

    const tran_id = crypto.randomUUID();

    const store_id =
      process.env.STORE_ID ||
      process.env.SSLCOMMERZ_STORE_ID ||
      process.env.SSL_STORE_ID ||
      "shusto0live";

    const store_passwd =
      process.env.STORE_PASSWD ||
      process.env.SSLCOMMERZ_STORE_PASSWORD ||
      process.env.SSL_STORE_PASSWORD ||
      "6A0D6039B299110857";

    const host =
      req.headers["x-forwarded-host"] ||
      req.headers["host"] ||
      "auth.shusto.com";
    const proto = req.headers["x-forwarded-proto"] || "https";
    
    let clientBaseUrl = incomingClientBaseUrl || `${proto}://${host}`;
    if (clientBaseUrl.endsWith("/")) {
      clientBaseUrl = clientBaseUrl.slice(0, -1);
    }
    if (!clientBaseUrl.startsWith("https://") && !clientBaseUrl.includes("localhost") && !clientBaseUrl.includes("127.0.0.1")) {
      clientBaseUrl = "https://" + clientBaseUrl.replace(/^http:\/\//i, "");
    }

    const isSandboxMode =
      process.env.SSL_MODE === "sandbox" ||
      store_id.includes("test") ||
      store_id === "demo";

    const sslUrl = isSandboxMode
      ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
      : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

    const postData: Record<string, any> = {
      store_id: store_id,
      store_passwd: store_passwd,
      total_amount: Number(amount),
      currency: "BDT",
      tran_id: tran_id,
      success_url: `${clientBaseUrl}/api/payment/success?userId=${userId}&tran_id=${tran_id}&clientBaseUrl=${encodeURIComponent(clientBaseUrl)}`,
      fail_url: `${clientBaseUrl}/api/payment/fail?userId=${userId}&clientBaseUrl=${encodeURIComponent(clientBaseUrl)}`,
      cancel_url: `${clientBaseUrl}/api/payment/cancel?userId=${userId}&clientBaseUrl=${encodeURIComponent(clientBaseUrl)}`,
      ipn_url: `${clientBaseUrl}/api/payment/ipn`,
      shipping_method: "No",
      product_name: "Telehealth Service Wallet Top Up",
      product_category: "Healthcare",
      product_profile: "general",
      cus_name: userName || "Customer",
      cus_email: userEmail || "customer@example.com",
      cus_add1: "Dhaka",
      cus_city: "Dhaka",
      cus_state: "Dhaka",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: "01700000000",
      value_a: userId,
      value_d: clientBaseUrl,
    };

    const formParams = new URLSearchParams();
    Object.keys(postData).forEach((key) => {
      formParams.append(key, String(postData[key]));
    });

    console.log(`[PAYMENT_INIT_SERVERLESS] Calling SSLCommerz (${sslUrl}) for user ${userId}, amount ${amount}`);

    const response = await axios.post(sslUrl, formParams.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });

    if (response.data && response.data.status === "SUCCESS") {
      console.log(`[PAYMENT_INIT_SERVERLESS] SSLCommerz success: GatewayPageURL generated`);
      return res.status(200).json(response.data);
    } else {
      console.error(`[PAYMENT_INIT_SERVERLESS] SSLCommerz error:`, response.data);
      return res.status(400).json({
        error: `SSLCommerz error: ${response.data?.failedreason || "unknown gateway error"}`,
        details: response.data,
      });
    }
  } catch (error: any) {
    console.error("[PAYMENT_INIT_SERVERLESS] Exception:", error?.response?.data || error?.message);
    return res.status(500).json({
      error: `Payment initiation failed: ${error?.message || "Internal error"}`,
      details: error?.response?.data || null,
    });
  }
}
