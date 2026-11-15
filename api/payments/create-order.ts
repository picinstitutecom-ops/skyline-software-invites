import crypto from 'node:crypto';
import {
  getRazorpayCredentials,
  PRICING_TABLE,
  readJsonOrFormBody,
  resolveOrigin,
  sendJson,
  THEME_TIER_MAP,
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
    const themeId = typeof body.themeId === 'string' ? body.themeId : '';
    const requestedTier = body.tierId as PricingTierId | undefined;
    const effectiveTierId = THEME_TIER_MAP[themeId] ?? requestedTier;
    const tier = effectiveTierId ? PRICING_TABLE[effectiveTierId] : undefined;

    if (!tier) {
      sendJson(res, 400, { error: 'Invalid pricing plan selected.' });
      return;
    }

    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret) {
      sendJson(res, 200, {
        fallbackDirectCheckout: true,
        amount: tier.amountPaise,
        currency: 'INR',
        keyId: keyId || undefined,
        tierId: tier.id,
      });
      return;
    }

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const origin = resolveOrigin(req, body.callbackOrigin);
    const callbackUrl = `${origin}/api/payments/callback?tier=${encodeURIComponent(tier.id)}`;
    const referenceId = `sky_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const cleanChild =
      (body.childName || 'Birthday').replace(/[^\w\s-]/g, '').trim().slice(0, 40) || 'Birthday';
    const cleanThemeTitle = (body.themeTitle || themeId || 'Birthday Invite')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .slice(0, 48);

    const [orderRes, linkRes] = await Promise.all([
      fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: tier.amountPaise,
          currency: 'INR',
          receipt: referenceId,
          notes: {
            tierId: tier.id,
            plan: tier.name,
            childName: cleanChild,
            themeId: (themeId || 'royal-prince').slice(0, 32),
          },
        }),
      }),
      fetch('https://api.razorpay.com/v1/payment_links', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: tier.amountPaise,
          currency: 'INR',
          accept_partial: false,
          reference_id: referenceId,
          description: `Skyline Software - ${cleanThemeTitle} (${cleanChild})`,
          callback_url: callbackUrl,
          callback_method: 'get',
          notes: {
            tierId: tier.id,
            plan: tier.name,
            childName: cleanChild,
            themeId: (themeId || 'royal-prince').slice(0, 32),
          },
        }),
      }).catch(() => null),
    ]);

    const orderText = await orderRes.text();
    let rzpOrderData: {
      id?: string;
      amount?: number;
      currency?: string;
      error?: { description?: string };
    } = {};
    try {
      rzpOrderData = JSON.parse(orderText);
    } catch {
      rzpOrderData = {};
    }

    if (!orderRes.ok || !rzpOrderData.id) {
      sendJson(res, 502, {
        error: rzpOrderData?.error?.description || 'Failed to create Razorpay order.',
      });
      return;
    }

    let paymentLinkId: string | undefined;
    let shortUrl: string | undefined;

    if (linkRes && linkRes.ok) {
      try {
        const linkData = (await linkRes.json()) as { id?: string; short_url?: string };
        if (linkData.id && linkData.short_url) {
          paymentLinkId = linkData.id;
          shortUrl = linkData.short_url;
        }
      } catch {
        // Payment link optional if order created
      }
    }

    sendJson(res, 200, {
      orderId: rzpOrderData.id,
      amount: rzpOrderData.amount ?? tier.amountPaise,
      currency: rzpOrderData.currency ?? 'INR',
      keyId,
      tierId: tier.id,
      paymentLinkId,
      shortUrl,
      referenceId,
    });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Unable to initialize payment.',
    });
  }
}
