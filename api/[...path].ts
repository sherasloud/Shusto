process.env.IS_SERVERLESS = "true";
(global as any).__IS_SERVERLESS = true;

import handler from "./index.ts";

export default handler;
