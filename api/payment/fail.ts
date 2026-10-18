export default async function handler(req: any, res: any) {
  const queryParams = req.query || {};
  const bodyParams = req.body || {};

  const tran_id = (queryParams.tran_id as string) || (bodyParams.tran_id as string) || '';
  const clientBaseUrlRaw = (queryParams.clientBaseUrl as string) || (bodyParams.value_d as string);
  let clientBaseUrl = clientBaseUrlRaw ? decodeURIComponent(clientBaseUrlRaw) : 'https://shusto.com';
  if (clientBaseUrl.endsWith('/')) {
    clientBaseUrl = clientBaseUrl.slice(0, -1);
  }

  const redirectUrl = `${clientBaseUrl}/?payment=failed&tran_id=${encodeURIComponent(tran_id)}`;
  return res.redirect(302, redirectUrl);
}
