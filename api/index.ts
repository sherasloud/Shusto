process.env.IS_SERVERLESS = "true";
(global as any).__IS_SERVERLESS = true;

import app from "../server.ts";

export default function handler(req: any, res: any) {
  try {
    const forwardedUrl = req.headers["x-matched-path"] || req.headers["x-invoke-path"] || req.headers["x-forwarded-uri"] || req.url;
    if (forwardedUrl && typeof forwardedUrl === "string" && (forwardedUrl.startsWith("/api/") || forwardedUrl.startsWith("/direct-api/"))) {
      req.url = forwardedUrl;
    }
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
