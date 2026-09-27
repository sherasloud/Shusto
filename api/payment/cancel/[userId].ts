import cancelHandler from "../cancel";

export default function handler(req: any, res: any) {
  return cancelHandler(req, res);
}
