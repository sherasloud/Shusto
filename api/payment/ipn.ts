export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  console.log("[PAYMENT_IPN_SERVERLESS] IPN Received:", req.body);
  return res.status(200).send("OK");
}
