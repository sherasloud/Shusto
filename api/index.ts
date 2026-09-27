(global as any).__IS_SERVERLESS = true;

import app from "../server.ts";

export default function handler(req: any, res: any) {
  try {
    if (req.query && req.query.path) {
      const rawPath = req.query.path;
      const subPath = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
      if (!req.url.startsWith(`/api/${subPath}`) && !req.url.startsWith(`/direct-api/${subPath}`)) {
        req.url = `/api/${subPath}`;
      }
    }
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel Serverless Function Error (/api/index):", error);
    try {
      if (typeof res.status === "function") {
        return res.status(500).json({
          error: "SERVER_EXECUTION_ERROR",
          message: error?.message || "Internal server error",
          stack: error?.stack || null,
        });
      } else {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        return res.end(
          JSON.stringify({
            error: "SERVER_EXECUTION_ERROR",
            message: error?.message,
            stack: error?.stack || null,
          })
        );
      }
    } catch (sendErr) {
      console.error("Failed to send error response:", sendErr);
    }
  }
}
