import {
  getQueryParams,
  getRazorpayCredentials,
  sendJson,
  verifyPassToken,
  type VercelReq,
  type VercelRes,
} from '../../_lib/razorpay.js';

export default function handler(req: VercelReq, res: VercelRes) {
  const params = getQueryParams(req);
  let token = params.get('token') || '';
  if (!token && req.url) {
    const cleanPath = req.url.split('?')[0];
    const parts = cleanPath.split('/').filter(Boolean);
    token = decodeURIComponent(parts[parts.length - 1] || '');
  }

  const { keySecret } = getRazorpayCredentials();
  const payload = verifyPassToken(token, keySecret);

  if (!payload) {
    sendJson(res, 404, { error: 'Payment pass not found or expired.' });
    return;
  }

  sendJson(res, 200, {
    verified: true,
    downloadToken: token,
    tierId: payload.tierId,
    paymentId: payload.paymentId,
    orderId: payload.orderId,
    priceInr: payload.priceInr,
  });
}
