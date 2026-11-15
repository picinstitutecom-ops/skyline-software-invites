export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
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
        throw new Error(`Request failed (${response.status}). Please retry.`);
      }
      throw new Error('Unexpected response format from server. Please retry.');
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
    throw new Error(errMsg);
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

function buildSafeHttpUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof window === 'undefined') return undefined;
  try {
    const resolved = new URL(rawUrl, window.location.origin);
    if (resolved.protocol === 'https:' || resolved.protocol === 'http:') {
      return resolved.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function openRazorpayModalCheckout(options: {
  keyId: string;
  orderId: string;
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

  const safeImage = buildSafeHttpUrl(options.logoUrl);
  const safeName = options.prefillName?.replace(/[^\w\s.-]/g, '').trim().slice(0, 48);

  return new Promise<RazorpaySuccessResponse>((resolve, reject) => {
    let settled = false;

    const rzpOptions: Record<string, unknown> = {
      key: options.keyId,
      amount: options.amount,
      currency: options.currency || 'INR',
      name: options.title.slice(0, 50),
      description: options.description.slice(0, 120),
      order_id: options.orderId,
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

