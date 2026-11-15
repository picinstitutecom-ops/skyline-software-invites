import {
  getRazorpayCredentials,
  PRICING_TABLE,
  readJsonOrFormBody,
  sendJson,
  signPassToken,
  verifyHmacSignature,
  type PricingTierId,
  type VercelReq,
  type VercelRes,
} from '../_lib/razorpay.js';

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const body = await readJsonOrFormBody(req);
    const orderId = body.razorpay_order_id || '';
    const paymentId = body.razorpay_payment_id || '';
    const signature = body.razorpay_signature || '';
    const tierId = (body.tierId && body.tierId in PRICING_TABLE
      ? body.tierId
      : 'tier_499') as PricingTierId;

    if (!orderId || !paymentId || !signature) {
      sendJson(res, 400, { error: 'Missing Razorpay payment verification fields.' });
      return;
    }

    const { keySecret } = getRazorpayCredentials();
    if (!verifyHmacSignature(`${orderId}|${paymentId}`, signature, keySecret)) {
      sendJson(res, 400, { error: 'Payment signature verification failed.' });
      return;
    }

    const tier = PRICING_TABLE[tierId];
    const token = signPassToken(
      {
        tierId: tier.id,
        paymentId,
        orderId,
        priceInr: tier.priceInr,
        iat: Date.now(),
      },
      keySecret
    );

    sendJson(res, 200, {
      verified: true,
      downloadToken: token,
      tierId: tier.id,
      paymentId,
      orderId,
      priceInr: tier.priceInr,
    });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Unable to verify payment.',
    });
  }
}
