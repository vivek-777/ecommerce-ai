export interface RazorpayPaymentParams {
  amountInPaise: number;
  currency?: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function initiateRazorpayPayment(params: RazorpayPaymentParams) {
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  // When NEXT_PUBLIC_RAZORPAY_KEY_ID is configured & backend order is created:
  if (razorpayKey) {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      throw new Error('Failed to load Razorpay SDK. Check your internet connection.');
    }

    const options = {
      key: razorpayKey,
      amount: params.amountInPaise,
      currency: params.currency ?? 'INR',
      name: 'OmniStore Retail',
      description: `Order ${params.orderId}`,
      order_id: params.orderId,
      prefill: {
        name: params.customerName,
        email: params.customerEmail,
        contact: params.customerPhone,
      },
      theme: {
        color: '#2563eb',
      },
      handler: params.onSuccess,
      modal: {
        ondismiss: params.onDismiss,
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
    return;
  }

  // Frontend-only staging callback until backend + Razorpay keys are connected
  params.onSuccess({
    razorpay_payment_id: `pay_stage_${Date.now()}`,
    razorpay_order_id: params.orderId,
    razorpay_signature: 'sig_pending_backend_verification',
  });
}