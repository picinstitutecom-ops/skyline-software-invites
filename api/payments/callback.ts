import {
  getQueryParams,
  getRazorpayCredentials,
  PRICING_TABLE,
  readJsonOrFormBody,
  resolveTierFromAmount,
  sendRedirect,
  signPassToken,
  verifyHmacSignature,
  type VercelReq,
  type VercelRes,
} from '../_lib/razorpay.js';

export default async function handler(req: VercelReq, res: VercelRes) {
  try {
    const params = getQueryParams(req);
    const { keyId, keySecret } = getRazorpayCredentials();

    if (req.method === 'POST') {
      const body = await readJsonOrFormBody(req);
      const queryTier = params.get('tier') || undefined;
      const paymentId = body.razorpay_payment_id || '';
      const orderId = body.razorpay_order_id || '';
      const signature = body.razorpay_signature || '';
      const errorDesc = body['error[description]'];

      if (errorDesc || !paymentId || !orderId || !signature) {
        const msg = errorDesc || 'Payment was not completed. Please try again.';
        sendRedirect(res, `/?payment_error=${encodeURIComponent(msg)}#export`);
        return;
      }

      if (!verifyHmacSignature(`${orderId}|${paymentId}`, signature, keySecret)) {
        sendRedirect(
          res,
          `/?payment_error=${encodeURIComponent('Payment signature verification failed.')}#export`
        );
        return;
      }

      const tierId = resolveTierFromAmount(undefined, queryTier);
      const tier = PRICING_TABLE[tierId];
      const token = signPassToken(
        { tierId: tier.id, paymentId, orderId, priceInr: tier.priceInr, iat: Date.now() },
        keySecret
      );
      sendRedirect(
        res,
        `/?payment_token=${encodeURIComponent(token)}&tier=${encodeURIComponent(tier.id)}#export`
      );
      return;
    }

    const paymentId = params.get('razorpay_payment_id') || '';
    const linkId = params.get('razorpay_payment_link_id') || '';
    const refId = params.get('razorpay_payment_link_reference_id') || '';
    const status = params.get('razorpay_payment_link_status') || '';
    const signature = params.get('razorpay_signature') || '';
    const queryTier = params.get('tier') || undefined;

    if (!linkId) {
      sendRedirect(
        res,
        `/?payment_error=${encodeURIComponent('Missing Razorpay payment reference.')}#export`
      );
      return;
    }

    let verified =
      Boolean(paymentId && signature && status === 'paid') &&
      verifyHmacSignature(`${linkId}|${refId}|${status}|${paymentId}`, signature, keySecret);

    let resolvedAmountPaise: number | undefined;
    let resolvedPaymentId = paymentId;

    if (!verified && keyId && keySecret) {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const linkCheckRes = await fetch(
        `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}`,
        { headers: { Authorization: `Basic ${authHeader}` } }
      );
      if (linkCheckRes.ok) {
        const linkJson = (await linkCheckRes.json()) as {
          status?: string;
          amount?: number;
          payments?: Array<{ payment_id?: string }>;
        };
        if (linkJson.status === 'paid') {
          verified = true;
          resolvedAmountPaise = linkJson.amount;
          resolvedPaymentId =
            resolvedPaymentId || linkJson.payments?.[0]?.payment_id || `plink_${linkId}`;
        }
      }
    }

    if (!verified || !resolvedPaymentId) {
      sendRedirect(
        res,
        `/?payment_error=${encodeURIComponent('Payment was cancelled or incomplete.')}#export`
      );
      return;
    }

    const tierId = resolveTierFromAmount(resolvedAmountPaise, queryTier);
    const tier = PRICING_TABLE[tierId];
    const token = signPassToken(
      {
        tierId: tier.id,
        paymentId: resolvedPaymentId,
        orderId: linkId,
        priceInr: tier.priceInr,
        iat: Date.now(),
      },
      keySecret
    );
    sendRedirect(
      res,
      `/?payment_token=${encodeURIComponent(token)}&tier=${encodeURIComponent(tier.id)}#export`
    );
  } catch {
    sendRedirect(
      res,
      `/?payment_error=${encodeURIComponent('Unable to verify payment callback.')}#export`
    );
  }
}
