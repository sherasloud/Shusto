(global as any).__IS_SERVERLESS = true;

import app from "../server.ts";

export default function handler(req: any, res: any) {
  try {
    // If rewritten by Vercel to /api/[...path], restore the true URL so Express routing matches
    if (req.url && (req.url.startsWith("/api/[...path]") || req.url === "/api")) {
      const originalPath = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"];
      if (originalPath && typeof originalPath === "string") {
        req.url = originalPath;
      } else if (req.query?.path) {
        const pathParts = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path;
        req.url = `/api/${pathParts}`;
      }
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
