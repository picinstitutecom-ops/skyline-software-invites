import {
  getRazorpayCredentials,
  sendJson,
  type VercelReq,
  type VercelRes,
} from './_lib/razorpay.js';

export default function handler(_req: VercelReq, res: VercelRes) {
  const { keyId, keySecret } = getRazorpayCredentials();
  sendJson(res, 200, {
    ok: true,
    razorpayConfigured: Boolean(keyId && keySecret),
    ffmpegExportAvailable: false,
  });
}
