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

export async function openRazorpayRedirectCheckout(options: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  title: string;
  description: string;
  logoUrl: string;
  callbackUrl: string;
  prefillName?: string;
}): Promise<void> {
  await loadRazorpayScript();
  const win = window as RazorpayWindow;
  if (!win.Razorpay) {
    throw new Error('Razorpay Checkout SDK did not initialize.');
  }

  const absoluteLogo = options.logoUrl.startsWith('http')
    ? options.logoUrl
    : `${window.location.origin}${options.logoUrl}`;

  return new Promise<void>((_resolve, reject) => {
    const rzp = new win.Razorpay!({
      key: options.keyId,
      amount: options.amount,
      currency: options.currency,
      name: options.title,
      description: options.description,
      image: absoluteLogo,
      order_id: options.orderId,
      callback_url: options.callbackUrl,
      redirect: true,
      prefill: options.prefillName ? { name: options.prefillName } : undefined,
      theme: {
        color: '#7C3AED',
      },
      modal: {
        ondismiss: () => {
          reject(new Error('Payment window closed before completing payment.'));
        },
      },
    });

    rzp.on('payment.failed', (resp) => {
      reject(
        new Error(
          resp?.error?.description || 'Payment failed. Please try another payment method.'
        )
      );
    });

    rzp.open();
  });
}
