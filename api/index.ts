(global as any).__IS_SERVERLESS = true;

import app from "../server.ts";

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Handler Error:", err);
    if (typeof res.status === "function") {
      return res.status(500).json({ error: "SERVER_ERROR", message: err?.message || String(err) });
    }
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "SERVER_ERROR", message: err?.message || String(err) }));
  }
}
