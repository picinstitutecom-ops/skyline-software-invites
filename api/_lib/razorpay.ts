import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type PricingTierId = 'tier_299' | 'tier_499' | 'tier_699';

export interface TierSpec {
  id: PricingTierId;
  name: string;
  priceInr: number;
  amountPaise: number;
}

export const PRICING_TABLE: Record<PricingTierId, TierSpec> = {
  tier_299: { id: 'tier_299', name: 'Classic Story Pack', priceInr: 299, amountPaise: 29900 },
  tier_499: { id: 'tier_499', name: 'Signature 3D Pack', priceInr: 499, amountPaise: 49900 },
  tier_699: { id: 'tier_699', name: 'Royal Master Pack', priceInr: 699, amountPaise: 69900 },
};

export const THEME_TIER_MAP: Record<string, PricingTierId> = {
  'grand-prix-racer': 'tier_299',
  'wonderland-bunny': 'tier_299',
  'cosmic-astronaut': 'tier_499',
  'ocean-mermaid': 'tier_499',
  'royal-prince': 'tier_699',
  'palace-princess': 'tier_699',
};

export function getRazorpayCredentials(): { keyId: string; keySecret: string } {
  const keyId =
    process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  return { keyId: keyId.trim(), keySecret: keySecret.trim() };
}

export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

export interface SignedPassPayload {
  tierId: PricingTierId;
  paymentId: string;
  orderId: string;
  priceInr: number;
  iat: number;
}

export function signPassToken(payload: SignedPassPayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `sky_${encoded}.${sig}`;
}

export function verifyPassToken(token: string, secret: string): SignedPassPayload | null {
  if (!token.startsWith('sky_') || !secret) return null;
  const body = token.slice(4);
  const dotIdx = body.indexOf('.');
  if (dotIdx <= 0) return null;
  const encoded = body.slice(0, dotIdx);
  const sig = body.slice(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SignedPassPayload;
    if (!parsed?.tierId || !parsed?.paymentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function resolveTierFromAmount(amountPaise?: number, fallback?: string): PricingTierId {
  if (typeof amountPaise === 'number' && amountPaise >= 29900) {
    if (amountPaise >= 69900) return 'tier_699';
    if (amountPaise >= 49900) return 'tier_499';
    return 'tier_299';
  }
  if (fallback && fallback in PRICING_TABLE) {
    return fallback as PricingTierId;
  }
  return 'tier_499';
}

export function resolveOrigin(req: IncomingMessage, rawOrigin?: string): string {
  const headers = req.headers;
  const protoHeader = headers['x-forwarded-proto'];
  const proto =
    typeof protoHeader === 'string' && protoHeader
      ? protoHeader.split(',')[0].trim()
      : 'https';
  const hostHeader = headers['x-forwarded-host'] || headers.host;
  const host = typeof hostHeader === 'string' ? hostHeader : '';

  const candidates = [
    rawOrigin,
    typeof headers.origin === 'string' ? headers.origin : undefined,
    process.env.APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    host ? `${proto}://${host}` : undefined,
  ];

  for (const c of candidates) {
    if (!c) continue;
    try {
      const u = new URL(c);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        return u.origin;
      }
    } catch {
      // Try next
    }
  }
  return 'https://localhost:3000';
}

export type VercelReq = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

export type VercelRes = ServerResponse & {
  status?: (code: number) => VercelRes;
  json?: (data: unknown) => void;
};

export async function readJsonOrFormBody(req: VercelReq): Promise<Record<string, string | undefined>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, string | undefined>;
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return JSON.parse(req.body) as Record<string, string | undefined>;
    } catch {
      return Object.fromEntries(new URLSearchParams(req.body).entries());
    }
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
  try {
    return JSON.parse(raw) as Record<string, string | undefined>;
  } catch {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
}

export function getQueryParams(req: VercelReq): URLSearchParams {
  const urlStr = req.url || '/';
  const qIdx = urlStr.indexOf('?');
  const params = new URLSearchParams(qIdx >= 0 ? urlStr.slice(qIdx + 1) : '');
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string' && !params.has(k)) {
        params.set(k, v);
      } else if (Array.isArray(v) && v[0] && !params.has(k)) {
        params.set(k, v[0]);
      }
    }
  }
  return params;
}

export function sendJson(res: VercelRes, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function sendRedirect(res: VercelRes, location: string): void {
  res.statusCode = 303;
  res.setHeader('Location', location);
  res.end();
}
