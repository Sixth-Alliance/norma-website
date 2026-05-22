import { getPaymentConfig, initializePayment } from '@/src/app/api/action';
import { logger } from '@/src/utils/logger';

type PaystackResult = { reference: string };

let scriptLoaded = false;
let scriptLoadingPromise: Promise<void> | null = null;

export async function loadPaystackScript(): Promise<void> {
  if (scriptLoaded) return;
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window is not available'));
    const existing = document.querySelector('script[data-paystack]');
    if (existing) {
      scriptLoaded = true;
      return resolve();
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.setAttribute('data-paystack', 'true');
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = (err) => {
      reject(new Error('Failed to load Paystack script'));
    };
    // Paystack expects the inline script to be inside a form element. Create
    // a hidden form wrapper to satisfy that constraint without altering DOM.
    const form = document.createElement('form');
    form.style.display = 'none';
    form.setAttribute('data-paystack-form', 'true');
    form.appendChild(script);
    document.body.appendChild(form);
  });

  return scriptLoadingPromise;
}

export async function openPaystackPopup(options: {
  key: string;
  email: string;
  amount: number; // in kobo
  ref?: string;
  currency?: string;
  orderNo?: string;
  onClose?: () => void;
}): Promise<PaystackResult> {
  await loadPaystackScript();
  if (typeof window === 'undefined' || !window.PaystackPop) throw new Error('Paystack not available');

  return new Promise((resolve, reject) => {
    const config: any = {
      key: options.key,
      email: options.email,
      amount: options.amount,
      currency: options.currency || 'NGN',
      ref: options.ref || `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...(options.orderNo && { metadata: { order_no: options.orderNo } }),
      callback: (response: any) => {
        resolve({ reference: response.reference });
      },
      onClose: () => {
        options.onClose?.();
        reject(new Error('Payment popup closed'));
      },
    };

    try {
      const handler = window.PaystackPop.setup(config);
      handler.openIframe();
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Failed to open payment popup'));
    }
  });
}

export async function startPaymentFlow(params: {
  orderId?: string; // optional, if present prefer server-side init
  orderNo?: string; // order_number from checkout response, used in Paystack metadata
  amountNGN: number; // amount in NGN (not kobo)
  email: string;
  callbackUrl?: string;
  paystackPublicKey: string;
}): Promise<{ method: 'redirect' | 'popup'; reference?: string } | null> {
  // Force server-side initialization and redirect-only flow.
  // Caller should provide orderId so initializePayment can return an authorization_url.
  try {
    if (!params.orderId) {
      throw new Error('Redirect-only flow requires orderId');
    }
    const init = await initializePayment(params.orderId, params.callbackUrl || window.location.href, params.orderNo);
    if (!init) throw new Error('Payment initialization failed');
    // Prefer explicit authorization_url
    if (init.authorization_url) {
      return { method: 'redirect', reference: init.reference, authorization_url: init.authorization_url } as any;
    }
    // If no authorization_url but we have an access_code or reference, construct a hosted URL if possible
    const access = (init as any).access_code || (init as any).reference;
    if (access) {
      // Paystack doesn't offer a stable client-hosted URL pattern for access_code; prefer error so backend is fixed.
      throw new Error('Initialization returned reference but no authorization_url; backend should provide authorization_url');
    }
    throw new Error('Payment initialization did not return an authorization URL');
  } catch (err) {
    logger.error('startPaymentFlow (redirect-only) failed:', err);
    throw err;
  }
}

export async function getBackendPaystackKey(): Promise<string | null> {
  try {
    const cfg = await getPaymentConfig();
    return cfg?.public_key || null;
  } catch (e) {
    return null;
  }
}

export default {
  loadPaystackScript,
  openPaystackPopup,
  startPaymentFlow,
  getBackendPaystackKey,
};
