import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

const BACKGROUND_MUSIC_FILENAME = 'WhatsApp_Audio_2026-11-15_at_2.34.56_PM_a7d61b29.mpeg';

const THEME_VIDEO_MAP: Record<
  string,
  { filename: string; duration: number; tierId: PricingTierId; priceInr: number }
> = {
  'royal-prince': {
    filename: 'WhatsApp_Video_2026-11-15_at_1.20.41_PM_6f05d404.mp4',
    duration: 39.07,
    tierId: 'tier_699',
    priceInr: 699,
  },
  'grand-prix-racer': {
    filename: 'WhatsApp_Video_2026-11-15_at_1.13.04_PM_01ac652a.mp4',
    duration: 49.3,
    tierId: 'tier_299',
    priceInr: 299,
  },
  'cosmic-astronaut': {
    filename: 'WhatsApp_Video_2026-11-15_at_1.20.46_PM_af982ce3.mp4',
    duration: 45.5,
    tierId: 'tier_499',
    priceInr: 499,
  },
  'ocean-mermaid': {
    filename: 'WhatsApp_Video_2026-11-15_at_4.42.09_PM_b5f8aabf.mp4',
    duration: 40.43,
    tierId: 'tier_499',
    priceInr: 499,
  },
  'palace-princess': {
    filename: 'WhatsApp_Video_2026-11-15_at_4.42.05_PM_5937f065.mp4',
    duration: 40.67,
    tierId: 'tier_699',
    priceInr: 699,
  },
  'wonderland-bunny': {
    filename: 'WhatsApp_Video_2026-11-15_at_4.42.00_PM_ff31c327.mp4',
    duration: 60.2,
    tierId: 'tier_299',
    priceInr: 299,
  },
};

type PricingTierId = 'tier_299' | 'tier_499' | 'tier_699';

interface ServerTierSpec {
  id: PricingTierId;
  name: string;
  priceInr: number;
  amountPaise: number;
  width: number;
  height: number;
  crf: string;
  audioBitrate: string;
  maxRenders: number;
}

const PRICING_TABLE: Record<PricingTierId, ServerTierSpec> = {
  tier_299: {
    id: 'tier_299',
    name: 'HD Quick Invite',
    priceInr: 299,
    amountPaise: 29900,
    width: 720,
    height: 1280,
    crf: '20',
    audioBitrate: '192k',
    maxRenders: 3,
  },
  tier_499: {
    id: 'tier_499',
    name: 'Full HD Studio',
    priceInr: 499,
    amountPaise: 49900,
    width: 1080,
    height: 1920,
    crf: '18',
    audioBitrate: '192k',
    maxRenders: 5,
  },
  tier_699: {
    id: 'tier_699',
    name: 'Royal Master Pack',
    priceInr: 699,
    amountPaise: 69900,
    width: 1080,
    height: 1920,
    crf: '16',
    audioBitrate: '256k',
    maxRenders: 99,
  },
};

interface OrderRecord {
  orderId: string;
  tierId: PricingTierId;
  amountPaise: number;
  createdAt: number;
}

interface PaidPassRecord {
  token: string;
  tierId: PricingTierId;
  paymentId: string;
  orderId: string;
  priceInr: number;
  maxRenders: number;
  rendersUsed: number;
  createdAt: number;
}

interface PlateInput {
  id: string;
  startTime: number;
  endTime: number;
  fadeIn: number;
  fadeOut: number;
  dataUrl: string;
}

interface AudioExportOptions {
  musicEnabled?: boolean;
  musicVolume?: number;
  voiceVolume?: number;
}

interface ExportJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputPath: string;
  tempDir: string;
  filename: string;
  createdAt: number;
  error?: string;
}

interface PaymentLinkRecord {
  linkId: string;
  referenceId: string;
  tierId: PricingTierId;
  amountPaise: number;
  shortUrl: string;
  createdAt: number;
}

const orders = new Map<string, OrderRecord>();
const paymentLinks = new Map<string, PaymentLinkRecord>();
const paidPasses = new Map<string, PaidPassRecord>();
const jobs = new Map<string, ExportJob>();

const EXPORT_ROOT = path.join(os.tmpdir(), 'keepsake-studio-exports');
const PASSES_FILE = path.join(EXPORT_ROOT, 'paid_passes.json');

async function ensureExportRoot() {
  await fsp.mkdir(EXPORT_ROOT, { recursive: true });
  try {
    if (fs.existsSync(PASSES_FILE)) {
      const raw = await fsp.readFile(PASSES_FILE, 'utf8');
      const parsed = JSON.parse(raw) as PaidPassRecord[];
      for (const item of parsed) {
        if (item?.token) {
          paidPasses.set(item.token, item);
        }
      }
    }
  } catch {
    // Start fresh if file unreadable
  }
}

async function savePaidPasses() {
  try {
    const items = Array.from(paidPasses.values());
    await fsp.writeFile(PASSES_FILE, JSON.stringify(items), 'utf8');
  } catch {
    // Non-fatal persistence error
  }
}

function sanitizeDownloadName(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return cleaned || 'birthday';
}

function decodePngDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/png(?:;[^;,]+)*;base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl.trim());
  if (!match) {
    throw new Error('Invalid PNG overlay payload');
  }
  return Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
}

function resolveCallbackOrigin(req: Request, rawOrigin?: string): string {
  const candidates = [
    rawOrigin,
    typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
    process.env.APP_URL,
    `${(typeof req.headers['x-forwarded-proto'] === 'string' ? req.headers['x-forwarded-proto'].split(',')[0] : req.protocol) || 'https'}://${req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`}`,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }
    } catch {
      // Try next candidate
    }
  }
  return `http://localhost:${PORT}`;
}

function resolveTierFromAmount(amountPaise?: number, fallback?: string): PricingTierId {
  if (fallback && fallback in PRICING_TABLE) {
    return fallback as PricingTierId;
  }
  if (typeof amountPaise === 'number') {
    if (amountPaise >= 69900) return 'tier_699';
    if (amountPaise >= 49900) return 'tier_499';
    if (amountPaise >= 29900) return 'tier_299';
  }
  return 'tier_499';
}

function resolvePublicAssetPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, 'public', 'assets', 'aistudio', filename),
    path.resolve(__dirname, 'dist', 'assets', 'aistudio', filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function verifyHmacSignature(payload: string, signature: string): boolean {
  if (!RAZORPAY_KEY_SECRET || !signature) return false;
  const expectedSig = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

async function issuePaidPass(
  tierId: PricingTierId,
  paymentId: string,
  orderId: string
): Promise<PaidPassRecord> {
  // Reuse existing pass if same paymentId already verified
  for (const existing of paidPasses.values()) {
    if (existing.paymentId === paymentId) {
      return existing;
    }
  }

  const tier = PRICING_TABLE[tierId];
  const token = crypto.randomUUID();
  const pass: PaidPassRecord = {
    token,
    tierId: tier.id,
    paymentId,
    orderId,
    priceInr: tier.priceInr,
    maxRenders: tier.maxRenders,
    rendersUsed: 0,
    createdAt: Date.now(),
  };
  paidPasses.set(token, pass);
  await savePaidPasses();
  return pass;
}

setInterval(async () => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) {
      jobs.delete(id);
      try {
        await fsp.rm(job.tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup failure
      }
    }
  }
}, 5 * 60 * 1000).unref();

async function runFfmpegExport(
  job: ExportJob,
  sourceVideoPath: string,
  duration: number,
  tier: ServerTierSpec,
  plates: PlateInput[],
  audioOptions: AudioExportOptions,
  onFailure?: () => Promise<void>
) {
  job.status = 'processing';
  job.progress = 4;

  try {
    const args: string[] = ['-y', '-i', sourceVideoPath];

    const validPlates = plates.filter(
      (p) =>
        typeof p.dataUrl === 'string' &&
        Number.isFinite(p.startTime) &&
        Number.isFinite(p.endTime) &&
        p.endTime > p.startTime
    );

    for (let i = 0; i < validPlates.length; i++) {
      const plate = validPlates[i];
      const pngBuffer = decodePngDataUrl(plate.dataUrl);
      const platePath = path.join(job.tempDir, `plate_${i}.png`);
      await fsp.writeFile(platePath, pngBuffer);

      const loopEnd = Math.min(duration + 0.5, Math.max(0.5, plate.endTime + 0.25));
      args.push('-loop', '1', '-framerate', '30', '-t', loopEnd.toFixed(2), '-i', platePath);
    }

    const musicPath = resolvePublicAssetPath(BACKGROUND_MUSIC_FILENAME);
    const musicVol = Math.max(0, Math.min(1, Number(audioOptions.musicVolume ?? 45) / 100));
    const voiceVol = Math.max(0, Math.min(1, Number(audioOptions.voiceVolume ?? 100) / 100));
    const useMusic =
      Boolean(audioOptions.musicEnabled) && musicVol > 0.005 && fs.existsSync(musicPath);

    let musicInputIdx = -1;
    if (useMusic) {
      musicInputIdx = 1 + validPlates.length;
      args.push('-stream_loop', '-1', '-i', musicPath);
    }

    const filterParts: string[] = [];
    filterParts.push(
      `[0:v]scale=${tier.width}:${tier.height}:flags=lanczos,setsar=1,fps=30,format=yuv420p[base0]`
    );

    let currentBase = 'base0';
    for (let i = 0; i < validPlates.length; i++) {
      const p = validPlates[i];
      const inputIdx = i + 1;
      const start = Math.max(0, p.startTime);
      const end = Math.min(duration + 0.1, p.endTime);
      const fadeIn = Math.max(0, Math.min(1.5, p.fadeIn || 0));
      const fadeOut = Math.max(0, Math.min(1.5, p.fadeOut || 0));

      const fadeFilters: string[] = ['format=rgba'];
      if (fadeIn > 0.05) {
        fadeFilters.push(`fade=t=in:st=${start.toFixed(2)}:d=${fadeIn.toFixed(2)}:alpha=1`);
      }
      if (fadeOut > 0.05 && end - fadeOut > start) {
        fadeFilters.push(
          `fade=t=out:st=${(end - fadeOut).toFixed(2)}:d=${fadeOut.toFixed(2)}:alpha=1`
        );
      }

      const ovLabel = `ov${i}`;
      const nextBase = i === validPlates.length - 1 ? 'outv' : `base${i + 1}`;
      filterParts.push(`[${inputIdx}:v]${fadeFilters.join(',')}[${ovLabel}]`);
      filterParts.push(
        `[${currentBase}][${ovLabel}]overlay=0:0:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})':eof_action=pass[${nextBase}]`
      );
      currentBase = nextBase;
    }

    const finalVideoLabel = validPlates.length > 0 ? '[outv]' : '[base0]';

    let audioMapArg = '0:a?';
    let audioCodecArgs = ['-c:a', 'copy'];

    if (useMusic && musicInputIdx > 0) {
      const fadeOutStart = Math.max(0, duration - 1.2).toFixed(2);
      if (voiceVol > 0.005) {
        filterParts.push(`[0:a]volume=${voiceVol.toFixed(3)}[va]`);
        filterParts.push(
          `[${musicInputIdx}:a]atrim=0:${duration.toFixed(2)},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo,volume=${musicVol.toFixed(3)},afade=t=out:st=${fadeOutStart}:d=1.2[ma]`
        );
        filterParts.push(
          `[va][ma]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[outa]`
        );
      } else {
        filterParts.push(
          `[${musicInputIdx}:a]atrim=0:${duration.toFixed(2)},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo,volume=${musicVol.toFixed(3)},afade=t=out:st=${fadeOutStart}:d=1.2[outa]`
        );
      }
      audioMapArg = '[outa]';
      audioCodecArgs = ['-c:a', 'aac', '-b:a', tier.audioBitrate];
    } else if (Math.abs(voiceVol - 1) > 0.02) {
      filterParts.push(`[0:a]volume=${voiceVol.toFixed(3)}[outa]`);
      audioMapArg = '[outa]';
      audioCodecArgs = ['-c:a', 'aac', '-b:a', tier.audioBitrate];
    }

    args.push(
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      finalVideoLabel,
      '-map',
      audioMapArg,
      '-c:v',
      'libx264',
      '-profile:v',
      'high',
      '-level:v',
      '4.0',
      '-preset',
      'veryfast',
      '-crf',
      tier.crf,
      '-pix_fmt',
      'yuv420p',
      ...audioCodecArgs,
      '-movflags',
      '+faststart',
      '-progress',
      'pipe:1',
      '-nostats',
      job.outputPath
    );

    const ffmpegProc = spawn('ffmpeg', args);
    let stderrTail = '';
    const totalUs = Math.max(1, duration * 1_000_000);

    ffmpegProc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (line.startsWith('out_time_us=')) {
          const us = Number(line.slice('out_time_us='.length));
          if (Number.isFinite(us) && us > 0) {
            const pct = Math.min(97, Math.max(5, Math.round((us / totalUs) * 95) + 4));
            job.progress = pct;
          }
        } else if (line.startsWith('out_time_ms=')) {
          const us = Number(line.slice('out_time_ms='.length));
          if (Number.isFinite(us) && us > 0) {
            const pct = Math.min(97, Math.max(5, Math.round((us / totalUs) * 95) + 4));
            job.progress = pct;
          }
        }
      }
    });

    ffmpegProc.stderr.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString('utf8')).slice(-2000);
    });

    await new Promise<void>((resolve, reject) => {
      ffmpegProc.on('error', (err) => reject(err));
      ffmpegProc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}: ${stderrTail.slice(-300)}`));
      });
    });

    job.progress = 100;
    job.status = 'completed';
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : 'Failed to render HD video';
    if (onFailure) {
      await onFailure();
    }
  }
}

async function startServer() {
  await ensureExportRoot();

  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      razorpayConfigured: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
      ffmpegExportAvailable: true,
    });
  });

  // 1. Create Razorpay Order + Hosted Payment Link (Works in mobile, desktop, & iframe)
  app.post('/api/payments/create-order', async (req: Request, res: Response) => {
    try {
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        res.status(500).json({ error: 'Razorpay credentials are not configured on the server.' });
        return;
      }

      const { tierId, childName, themeId, themeTitle, callbackOrigin } = req.body as {
        tierId?: PricingTierId;
        childName?: string;
        themeId?: string;
        themeTitle?: string;
        callbackOrigin?: string;
      };

      const themeEntry = themeId ? THEME_VIDEO_MAP[themeId] : undefined;
      const effectiveTierId = themeEntry?.tierId ?? tierId;
      const tier = effectiveTierId ? PRICING_TABLE[effectiveTierId] : undefined;
      if (!tier) {
        res.status(400).json({ error: 'Invalid pricing plan selected.' });
        return;
      }

      const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      const origin = resolveCallbackOrigin(req, callbackOrigin);
      const callbackUrl = `${origin}/api/payments/callback?tier=${encodeURIComponent(tier.id)}`;
      const referenceId = `sky_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const cleanChild = (childName || 'Birthday').replace(/[^\w\s-]/g, '').trim().slice(0, 40) || 'Birthday';
      const cleanThemeTitle = (themeTitle || themeId || 'Birthday Invite')
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

      const rzpOrderData = (await orderRes.json()) as {
        id?: string;
        amount?: number;
        currency?: string;
        error?: { description?: string };
      };

      if (!orderRes.ok || !rzpOrderData.id) {
        res.status(502).json({
          error: rzpOrderData?.error?.description || 'Failed to create Razorpay order.',
        });
        return;
      }

      orders.set(rzpOrderData.id, {
        orderId: rzpOrderData.id,
        tierId: tier.id,
        amountPaise: tier.amountPaise,
        createdAt: Date.now(),
      });

      let paymentLinkId: string | undefined;
      let shortUrl: string | undefined;

      if (linkRes && linkRes.ok) {
        const linkData = (await linkRes.json()) as {
          id?: string;
          short_url?: string;
        };
        if (linkData.id && linkData.short_url) {
          paymentLinkId = linkData.id;
          shortUrl = linkData.short_url;
          paymentLinks.set(linkData.id, {
            linkId: linkData.id,
            referenceId,
            tierId: tier.id,
            amountPaise: tier.amountPaise,
            shortUrl: linkData.short_url,
            createdAt: Date.now(),
          });
        }
      }

      res.json({
        orderId: rzpOrderData.id,
        amount: rzpOrderData.amount ?? tier.amountPaise,
        currency: rzpOrderData.currency ?? 'INR',
        keyId: RAZORPAY_KEY_ID,
        tierId: tier.id,
        paymentLinkId,
        shortUrl,
        referenceId,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to initialize payment.',
      });
    }
  });

  // 2. Razorpay Redirect Callback (Handles POST from checkout.js redirect if used)
  app.post('/api/payments/callback', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as Record<string, string | undefined>;
      const queryTier = typeof req.query.tier === 'string' ? req.query.tier : undefined;

      const paymentId = body.razorpay_payment_id;
      const orderId = body.razorpay_order_id;
      const signature = body.razorpay_signature;
      const errorDesc = body['error[description]'];

      if (errorDesc || !paymentId || !orderId || !signature) {
        const msg = errorDesc || 'Payment was not completed. Please try again.';
        res.redirect(303, `/?payment_error=${encodeURIComponent(msg)}#export`);
        return;
      }

      if (!verifyHmacSignature(`${orderId}|${paymentId}`, signature)) {
        res.redirect(
          303,
          `/?payment_error=${encodeURIComponent('Payment signature verification failed.')}#export`
        );
        return;
      }

      const orderRecord = orders.get(orderId);
      const resolvedTierId = resolveTierFromAmount(
        orderRecord?.amountPaise,
        orderRecord?.tierId ?? queryTier
      );

      const pass = await issuePaidPass(resolvedTierId, paymentId, orderId);
      res.redirect(
        303,
        `/?payment_token=${encodeURIComponent(pass.token)}&tier=${encodeURIComponent(pass.tierId)}#export`
      );
    } catch {
      res.redirect(
        303,
        `/?payment_error=${encodeURIComponent('Unable to verify payment callback.')}#export`
      );
    }
  });

  // 2b. Razorpay Redirect Callback (Handles GET from Razorpay Payment Links)
  app.get('/api/payments/callback', async (req: Request, res: Response) => {
    try {
      const paymentId = String(req.query.razorpay_payment_id || '');
      const linkId = String(req.query.razorpay_payment_link_id || '');
      const refId = String(req.query.razorpay_payment_link_reference_id || '');
      const status = String(req.query.razorpay_payment_link_status || '');
      const signature = String(req.query.razorpay_signature || '');
      const queryTier = typeof req.query.tier === 'string' ? req.query.tier : undefined;

      if (!linkId) {
        res.redirect(
          303,
          `/?payment_error=${encodeURIComponent('Missing Razorpay payment reference.')}#export`
        );
        return;
      }

      const payload = `${linkId}|${refId}|${status}|${paymentId}`;
      let verified =
        Boolean(paymentId && signature && status === 'paid') &&
        verifyHmacSignature(payload, signature);

      let resolvedAmountPaise: number | undefined = paymentLinks.get(linkId)?.amountPaise;
      let resolvedPaymentId = paymentId;

      if (!verified && RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
        const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        const linkCheckRes = await fetch(
          `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}`,
          { headers: { Authorization: `Basic ${authHeader}` } }
        );
        if (linkCheckRes.ok) {
          const linkJson = (await linkCheckRes.json()) as {
            status?: string;
            amount?: number;
            payments?: Array<{ payment_id?: string; status?: string }>;
          };
          if (linkJson.status === 'paid') {
            verified = true;
            resolvedAmountPaise = linkJson.amount ?? resolvedAmountPaise;
            resolvedPaymentId =
              resolvedPaymentId || linkJson.payments?.[0]?.payment_id || `plink_${linkId}`;
          }
        }
      }

      if (!verified || !resolvedPaymentId) {
        res.redirect(
          303,
          `/?payment_error=${encodeURIComponent('Payment was cancelled or incomplete.')}#export`
        );
        return;
      }

      const linkRecord = paymentLinks.get(linkId);
      const resolvedTierId = resolveTierFromAmount(
        resolvedAmountPaise,
        linkRecord?.tierId ?? queryTier
      );
      const pass = await issuePaidPass(resolvedTierId, resolvedPaymentId, linkId);
      res.redirect(
        303,
        `/?payment_token=${encodeURIComponent(pass.token)}&tier=${encodeURIComponent(pass.tierId)}#export`
      );
    } catch {
      res.redirect(
        303,
        `/?payment_error=${encodeURIComponent('Unable to verify payment callback.')}#export`
      );
    }
  });

  // 2c. Live Poll Payment Link Status (Auto-unlocks if user paid via hosted Razorpay link in a tab)
  app.get('/api/payments/link-status/:linkId', async (req: Request, res: Response) => {
    try {
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        res.status(500).json({ error: 'Razorpay credentials not configured.' });
        return;
      }

      const linkId = String(req.params.linkId || '').trim();
      if (!linkId) {
        res.status(400).json({ error: 'Invalid payment link ID.' });
        return;
      }

      const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      const linkCheckRes = await fetch(
        `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}`,
        { headers: { Authorization: `Basic ${authHeader}` } }
      );

      if (!linkCheckRes.ok) {
        res.status(502).json({ error: 'Unable to check Razorpay payment link status.' });
        return;
      }

      const linkJson = (await linkCheckRes.json()) as {
        id?: string;
        status?: string;
        amount?: number;
        notes?: { tierId?: string };
        payments?: Array<{ payment_id?: string; status?: string }>;
      };

      if (linkJson.status !== 'paid') {
        res.json({
          paid: false,
          status: linkJson.status || 'created',
        });
        return;
      }

      const linkRecord = paymentLinks.get(linkId);
      const resolvedTierId = resolveTierFromAmount(
        linkJson.amount ?? linkRecord?.amountPaise,
        linkRecord?.tierId ?? linkJson.notes?.tierId
      );
      const paymentId = linkJson.payments?.[0]?.payment_id || `plink_${linkId}`;
      const pass = await issuePaidPass(resolvedTierId, paymentId, linkId);

      res.json({
        paid: true,
        verified: true,
        downloadToken: pass.token,
        tierId: pass.tierId,
        paymentId: pass.paymentId,
        orderId: pass.orderId,
        priceInr: pass.priceInr,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to check payment status.',
      });
    }
  });

  // 3. Validate Paid Pass Token after redirect
  app.get('/api/payments/pass/:token', (req: Request, res: Response) => {
    const token = String(req.params.token || '');
    const pass = paidPasses.get(token);
    if (!pass) {
      res.status(404).json({ error: 'Payment pass not found or expired.' });
      return;
    }

    res.json({
      verified: true,
      downloadToken: pass.token,
      tierId: pass.tierId,
      paymentId: pass.paymentId,
      orderId: pass.orderId,
      priceInr: pass.priceInr,
    });
  });

  // 4. Verify Razorpay HMAC Signature via JSON API (Fallback/Direct)
  app.post('/api/payments/verify', async (req: Request, res: Response) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tierId } = req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
        tierId?: PricingTierId;
      };

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({ error: 'Missing Razorpay payment verification fields.' });
        return;
      }

      if (!verifyHmacSignature(`${razorpay_order_id}|${razorpay_payment_id}`, razorpay_signature)) {
        res.status(400).json({ error: 'Payment signature verification failed.' });
        return;
      }

      const orderRecord = orders.get(razorpay_order_id);
      const resolvedTierId: PricingTierId =
        orderRecord?.tierId ?? (tierId && PRICING_TABLE[tierId] ? tierId : 'tier_499');
      const pass = await issuePaidPass(resolvedTierId, razorpay_payment_id, razorpay_order_id);

      res.json({
        verified: true,
        downloadToken: pass.token,
        tierId: pass.tierId,
        paymentId: pass.paymentId,
        orderId: pass.orderId,
        priceInr: pass.priceInr,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to verify payment.',
      });
    }
  });

  // 5. Export HD Video (Requires Verified Paid Pass Token)
  app.post('/api/export', async (req: Request, res: Response) => {
    try {
      const { themeId, plates, childName, audio, downloadToken } = req.body as {
        themeId?: string;
        plates?: PlateInput[];
        childName?: string;
        audio?: AudioExportOptions;
        downloadToken?: string;
      };

      if (!downloadToken || !paidPasses.has(downloadToken)) {
        res.status(402).json({
          error: 'Please complete payment to unlock your HD video download.',
        });
        return;
      }

      const pass = paidPasses.get(downloadToken)!;
      if (pass.rendersUsed >= pass.maxRenders) {
        res.status(403).json({
          error: 'Render limit reached for this pass. Choose Royal Master Pack for unlimited edits.',
        });
        return;
      }

      const tier = PRICING_TABLE[pass.tierId];
      if (!themeId || !THEME_VIDEO_MAP[themeId]) {
        res.status(400).json({ error: 'Invalid or unsupported theme selected.' });
        return;
      }

      if (!Array.isArray(plates) || plates.length === 0 || plates.length > 5) {
        res.status(400).json({ error: 'Invalid overlay plates payload.' });
        return;
      }

      const themeAsset = THEME_VIDEO_MAP[themeId];
      if (pass.priceInr < themeAsset.priceInr) {
        res.status(402).json({
          error: `This theme requires the ₹${themeAsset.priceInr} pass. Complete checkout to unlock.`,
        });
        return;
      }

      const sourceVideoPath = resolvePublicAssetPath(themeAsset.filename);
      if (!fs.existsSync(sourceVideoPath)) {
        res.status(404).json({ error: 'Source theme video file could not be located.' });
        return;
      }

      pass.rendersUsed += 1;
      await savePaidPasses();

      const jobId = crypto.randomUUID();
      const tempDir = path.join(EXPORT_ROOT, jobId);
      await fsp.mkdir(tempDir, { recursive: true });

      const safeName = sanitizeDownloadName(childName || 'birthday');
      const resTag = tier.width >= 1080 ? '1080p-hd' : '720p-hd';
      const filename = `${safeName}-birthday-invitation-${resTag}.mp4`;
      const outputPath = path.join(tempDir, filename);

      const job: ExportJob = {
        jobId,
        status: 'queued',
        progress: 2,
        outputPath,
        tempDir,
        filename,
        createdAt: Date.now(),
      };
      jobs.set(jobId, job);

      void runFfmpegExport(
        job,
        sourceVideoPath,
        themeAsset.duration,
        tier,
        plates,
        audio ?? { musicEnabled: true, musicVolume: 45, voiceVolume: 100 },
        async () => {
          pass.rendersUsed = Math.max(0, pass.rendersUsed - 1);
          await savePaidPasses();
        }
      );

      res.status(202).json({
        jobId,
        status: job.status,
        progress: job.progress,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to start HD export job.',
      });
    }
  });

  app.get('/api/export/:jobId/status', (req: Request, res: Response) => {
    const jobId = String(req.params.jobId || '');
    const job = jobs.get(jobId);
    if (!job) {
      res.status(404).json({ error: 'Export job not found or expired.' });
      return;
    }

    res.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      error: job.error,
      filename: job.filename,
      downloadUrl: job.status === 'completed' ? `/api/export/${job.jobId}/download` : undefined,
    });
  });

  app.get('/api/export/:jobId/download', (req: Request, res: Response) => {
    const jobId = String(req.params.jobId || '');
    const job = jobs.get(jobId);
    if (!job || job.status !== 'completed' || !fs.existsSync(job.outputPath)) {
      res.status(404).json({ error: 'Rendered video is not ready or has expired.' });
      return;
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
    res.setHeader('Cache-Control', 'private, max-age=1800');
    res.sendFile(job.outputPath);
  });

  if (IS_PROD) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Skyline Software Studio listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
