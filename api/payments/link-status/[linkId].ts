import {
  getQueryParams,
  getRazorpayCredentials,
  PRICING_TABLE,
  resolveTierFromAmount,
  sendJson,
  signPassToken,
  type VercelReq,
  type VercelRes,
} from '../../_lib/razorpay.js';

export default async function handler(req: VercelReq, res: VercelRes) {
  try {
    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret) {
      sendJson(res, 500, { error: 'Razorpay credentials not configured.' });
      return;
    }

    const params = getQueryParams(req);
    let linkId = params.get('linkId') || '';
    if (!linkId && req.url) {
      const cleanPath = req.url.split('?')[0];
      const parts = cleanPath.split('/').filter(Boolean);
      linkId = decodeURIComponent(parts[parts.length - 1] || '');
    }

    if (!linkId) {
      sendJson(res, 400, { error: 'Invalid payment link ID.' });
      return;
    }

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const linkCheckRes = await fetch(
      `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}`,
      { headers: { Authorization: `Basic ${authHeader}` } }
    );

    if (!linkCheckRes.ok) {
      sendJson(res, 502, { error: 'Unable to check Razorpay payment link status.' });
      return;
    }

    const linkJson = (await linkCheckRes.json()) as {
      status?: string;
      amount?: number;
      notes?: { tierId?: string };
      payments?: Array<{ payment_id?: string }>;
    };

    if (linkJson.status !== 'paid') {
      sendJson(res, 200, {
        paid: false,
        status: linkJson.status || 'created',
      });
      return;
    }

    const tierId = resolveTierFromAmount(linkJson.amount, linkJson.notes?.tierId);
    const tier = PRICING_TABLE[tierId];
    const paymentId = linkJson.payments?.[0]?.payment_id || `plink_${linkId}`;
    const token = signPassToken(
      {
        tierId: tier.id,
        paymentId,
        orderId: linkId,
        priceInr: tier.priceInr,
        iat: Date.now(),
      },
      keySecret
    );

    sendJson(res, 200, {
      paid: true,
      verified: true,
      downloadToken: token,
      tierId: tier.id,
      paymentId,
      orderId: linkId,
      priceInr: tier.priceInr,
    });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Unable to check payment status.',
    });
  }
}
