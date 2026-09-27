(global as any).__IS_SERVERLESS = true;
import app from "../server";

export { app };
export default function handler(req: any, res: any) {
  return (app as any)(req, res);
}
