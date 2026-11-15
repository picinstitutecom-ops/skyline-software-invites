export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export const PUBLIC_RAZORPAY_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) ||
  'rzp_live_U0TEjZjeBWGtaI';

export class FetchHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'FetchHttpError';
    this.status = status;
  }
}

interface RazorpayWindow extends Window {
  Razorpay?: new (options: Record<string, unknown>) => {
    open: () => void;
    on: (event: string, handler: (resp: { error?: { description?: string } }) => void) => void;
  };
}

export async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const rawText = await response.text();
  let parsed: unknown = null;

  if (rawText.trim().length > 0) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      if (!response.ok) {
        throw new FetchHttpError(
          `Endpoint unavailable (${response.status}).`,
          response.status
        );
      }
      throw new FetchHttpError(
        'Unexpected non-JSON response from server.',
        response.status
      );
    }
  }

  if (!response.ok) {
    const errMsg =
      parsed &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : `Request failed with status ${response.status}.`;
    throw new FetchHttpError(errMsg, response.status);
  }

  return (parsed ?? {}) as T;
}

export function isInsideIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay checkout requires a browser environment.'));
  }
  const win = window as RazorpayWindow;
  if (win.Razorpay) {
    return Promise.resolve();
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Unable to load Razorpay Checkout. Check your internet connection.'));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

function buildSafeHttpsUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof window === 'undefined') return undefined;
  try {
    const resolved = new URL(rawUrl, window.location.origin);
    if (resolved.protocol === 'https:') {
      return resolved.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function sanitizeAscii(value: string, maxLen: number): string {
  return value.replace(/[^A-Za-z0-9\s.,()\-:/]/g, '').trim().slice(0, maxLen);
}

export async function openRazorpayModalCheckout(options: {
  keyId: string;
  orderId?: string;
  amount: number;
  currency: string;
  title: string;
  description: string;
  logoUrl?: string;
  prefillName?: string;
}): Promise<RazorpaySuccessResponse> {
  await loadRazorpayScript();
  const win = window as RazorpayWindow;
  if (!win.Razorpay) {
    throw new Error('Razorpay Checkout SDK did not initialize.');
  }

  const safeImage = buildSafeHttpsUrl(options.logoUrl);
  const safeName = options.prefillName
    ? sanitizeAscii(options.prefillName, 48)
    : undefined;

  return new Promise<RazorpaySuccessResponse>((resolve, reject) => {
    let settled = false;

    const rzpOptions: Record<string, unknown> = {
      key: options.keyId.trim(),
      amount: Math.round(options.amount),
      currency: (options.currency || 'INR').toUpperCase(),
      name: sanitizeAscii(options.title, 50) || 'Skyline Software',
      description: sanitizeAscii(options.description, 120) || 'HD Birthday Video Invite',
      redirect: false,
      theme: {
        color: '#7C3AED',
      },
      handler: (response: RazorpaySuccessResponse) => {
        if (settled) return;
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          reject(new Error('Payment window closed before completing payment.'));
        },
      },
    };

    if (options.orderId) {
      rzpOptions.order_id = options.orderId;
    }
    if (safeImage) {
      rzpOptions.image = safeImage;
    }
    if (safeName) {
      rzpOptions.prefill = { name: safeName };
    }

    const rzp = new win.Razorpay!(rzpOptions);

    rzp.on('payment.failed', (resp) => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          resp?.error?.description || 'Payment failed. Please try another payment method.'
        )
      );
    });

    rzp.open();
  });
}


