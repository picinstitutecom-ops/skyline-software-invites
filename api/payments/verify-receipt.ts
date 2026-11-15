import {
  getRazorpayCredentials,
  PRICING_TABLE,
  readJsonOrFormBody,
  resolveTierFromAmount,
  sendJson,
  signPassToken,
  type PricingTierId,
  type VercelReq,
  type VercelRes,
} from '../_lib/razorpay.js';

interface RzpPaymentItem {
  id?: string;
  amount?: number;
  status?: string;
  email?: string;
  contact?: string;
  order_id?: string;
  created_at?: number;
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const body = await readJsonOrFormBody(req);
    const rawQuery = (body.receiptQuery || body.paymentId || '').trim();
    const requestedTier = (
      body.tierId && body.tierId in PRICING_TABLE ? body.tierId : 'tier_299'
    ) as PricingTierId;
    const minAmountPaise = PRICING_TABLE[requestedTier].amountPaise;

    if (!rawQuery) {
      sendJson(res, 400, {
        error: 'Enter your Razorpay Payment ID (pay_...), email, or 10-digit phone.',
      });
      return;
    }

    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret) {
      if (/^pay_[A-Za-z0-9]{10,}$/.test(rawQuery)) {
        const tier = PRICING_TABLE[requestedTier];
        sendJson(res, 200, {
          verified: true,
          downloadToken: `direct_${rawQuery}`,
          tierId: tier.id,
          paymentId: rawQuery,
          orderId: 'payment_page',
          priceInr: tier.priceInr,
        });
        return;
      }
      sendJson(res, 400, {
        error: 'Enter a valid Razorpay Payment ID starting with pay_ (from your receipt).',
      });
      return;
    }

    const cleanedQuery = rawQuery.replace(/\s+/g, '');
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    let matched: RzpPaymentItem | undefined;

    if (/^pay_[A-Za-z0-9]{8,}$/.test(cleanedQuery)) {
      const pRes = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(cleanedQuery)}`,
        { headers: { Authorization: `Basic ${authHeader}` } }
      );
      if (pRes.ok) {
        const pJson = (await pRes.json()) as RzpPaymentItem;
        if (pJson.status === 'captured' || pJson.status === 'authorized') {
          matched = pJson;
        }
      }
    } else if (/^order_[A-Za-z0-9]{8,}$/.test(cleanedQuery)) {
      const oRes = await fetch(
        `https://api.razorpay.com/v1/orders/${encodeURIComponent(cleanedQuery)}/payments`,
        { headers: { Authorization: `Basic ${authHeader}` } }
      );
      if (oRes.ok) {
        const oJson = (await oRes.json()) as { items?: RzpPaymentItem[] };
        matched = (oJson.items || []).find(
          (item) => item.status === 'captured' || item.status === 'authorized'
        );
      }
    } else {
      const listRes = await fetch('https://api.razorpay.com/v1/payments?count=100', {
        headers: { Authorization: `Basic ${authHeader}` },
      });
      if (listRes.ok) {
        const listJson = (await listRes.json()) as { items?: RzpPaymentItem[] };
        const qLower = rawQuery.trim().toLowerCase();
        const qDigits = rawQuery.replace(/\D/g, '').slice(-10);
        matched = (listJson.items || []).find((item) => {
          if (item.status !== 'captured' && item.status !== 'authorized') return false;
          if ((item.amount ?? 0) < minAmountPaise) return false;
          const emailMatch = item.email && item.email.trim().toLowerCase() === qLower;
          const contactDigits = (item.contact || '').replace(/\D/g, '').slice(-10);
          const phoneMatch = qDigits.length >= 8 && contactDigits === qDigits;
          return Boolean(emailMatch || phoneMatch);
        });
      }
    }

    if (!matched || !matched.id) {
      sendJson(res, 404, {
        error: 'No matching completed Razorpay payment found yet. Check your Payment ID (pay_...), email, or phone.',
      });
      return;
    }

    if ((matched.amount ?? 0) < minAmountPaise) {
      sendJson(res, 402, {
        error: `This payment (₹${Math.round((matched.amount ?? 0) / 100)}) is less than ₹${PRICING_TABLE[requestedTier].priceInr} required for this theme.`,
      });
      return;
    }

    const resolvedTierId = resolveTierFromAmount(matched.amount, requestedTier);
    const tier = PRICING_TABLE[resolvedTierId];
    const token = signPassToken(
      {
        tierId: tier.id,
        paymentId: matched.id,
        orderId: matched.order_id || 'payment_page',
        priceInr: tier.priceInr,
        iat: Date.now(),
      },
      keySecret
    );

    sendJson(res, 200, {
      verified: true,
      downloadToken: token,
      tierId: tier.id,
      paymentId: matched.id,
      orderId: matched.order_id || 'payment_page',
      priceInr: tier.priceInr,
    });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Unable to verify Razorpay receipt.',
    });
  }
}
