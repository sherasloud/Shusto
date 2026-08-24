(global as any).__IS_SERVERLESS = true;

// Statically declare dependency for the Vercel bundler so it compiles and bundles server.ts
if (false) {
  await import("../server.js");
}

export default async function handler(req: any, res: any) {
  try {
    // Dynamic import inside handler to safely catch and debug startup errors
    let serverModule;
    try {
      serverModule = await import("../server.js");
    } catch (err1: any) {
      try {
        serverModule = await import("../server.ts");
      } catch (err2: any) {
        try {
          serverModule = await import("../server");
        } catch (err3: any) {
          throw new Error(`Failed to import server module:\n- server.js: ${err1.message}\n- server.ts: ${err2.message}\n- server extensionless: ${err3.message}`);
        }
      }
    }

    const app = serverModule.default || serverModule.app || serverModule;
    if (typeof app !== "function") {
      throw new Error(`Loaded server module but 'app' is not a function. Type: ${typeof app}`);
    }
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel Serverless Function Startup Error:", error);
    try {
      if (typeof res.status === "function") {
        res.status(500).json({
          error: "SERVER_STARTUP_ERROR",
          message: error?.message || "Internal server error",
          stack: error?.stack || null
        });
      } else {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ 
          error: "SERVER_STARTUP_ERROR", 
          message: error?.message,
          stack: error?.stack || null
        }));
      }
    } catch (sendErr) {
      console.error("Failed to send error response:", sendErr);
    }
  }
}


