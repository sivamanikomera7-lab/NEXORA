import { CheckCircle2, CreditCard, Landmark, Lock, ShieldCheck, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { formatCurrency } from '../lib/format.ts';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

export function RazorpayCheckoutModal() {
  const { checkoutSession, setCheckoutSession, clearCart, navigate, showToast } = useApp();
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedData, setVerifiedData] = useState<{
    orderNumber: string;
    paymentId: string;
    unlockedProducts: string[];
  } | null>(null);

  useEffect(() => {
    if (!checkoutSession) {
      setVerifiedData(null);
      setErrorMsg('');
      setProcessing(false);
      return;
    }

    // If live Razorpay keys are configured and SDK loaded, launch official Razorpay Checkout automatically
    if (checkoutSession.mode === 'live' && window.Razorpay) {
      const rzp = new window.Razorpay({
        key: checkoutSession.key,
        amount: checkoutSession.amount,
        currency: checkoutSession.currency,
        name: 'NEXORA',
        description: checkoutSession.items.join(', '),
        order_id: checkoutSession.razorpayOrderId,
        prefill: {
          name: checkoutSession.customer.name,
          email: checkoutSession.customer.email,
        },
        theme: { color: '#2563EB' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await verifyPaymentOnServer(response, 'razorpay_live');
        },
      });
      rzp.open();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutSession]);

  if (!checkoutSession) return null;

  async function verifyPaymentOnServer(
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
    selectedMethod: string
  ) {
    setProcessing(true);
    setErrorMsg('');
    try {
      const resp = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...payload, method: selectedMethod }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || 'Signature verification failed.');
        return;
      }
      clearCart();
      setVerifiedData(data);
      showToast('Payment verified! Digital downloads unlocked.', 'success');
    } catch {
      setErrorMsg('Network error verifying payment signature.');
    } finally {
      setProcessing(false);
    }
  }

  const handleSandboxPay = async () => {
    setProcessing(true);
    setErrorMsg('');
    try {
      const authResp = await fetch('/api/payments/sandbox-authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ razorpay_order_id: checkoutSession.razorpayOrderId }),
      });
      const authData = await authResp.json();
      if (!authResp.ok) {
        setErrorMsg(authData.error || 'Could not authorize Razorpay test payment.');
        setProcessing(false);
        return;
      }
      await verifyPaymentOnServer(authData, method);
    } catch {
      setErrorMsg('Checkout authorization failed.');
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Razorpay Secure Checkout"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => {
          if (!processing) setCheckoutSession(null);
        }}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/12 bg-[#090E1C] shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0E172E] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-display text-sm font-bold text-white">
              NX
            </div>
            <div>
              <p className="text-sm font-semibold text-white">NEXORA Checkout</p>
              <p className="font-mono text-xs text-blue-300 tabular-nums">
                {checkoutSession.orderNumber}
              </p>
            </div>
          </div>
          {!processing && (
            <button
              type="button"
              onClick={() => setCheckoutSession(null)}
              aria-label="Close checkout"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {verifiedData ? (
          <div className="p-6 text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-white">Payment Verified</h3>
              <p className="mt-1 text-sm text-slate-400">
                Order <span className="font-mono text-slate-200">{verifiedData.orderNumber}</span> confirmed. A
                confirmation receipt was dispatched to {checkoutSession.customer.email}.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Razorpay Payment ID</span>
                <span className="font-mono text-slate-200">{verifiedData.paymentId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Unlocked Assets</span>
                <span className="font-medium text-emerald-400">{verifiedData.unlockedProducts.length} Ready</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCheckoutSession(null);
                  navigate('/downloads');
                }}
                className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
              >
                Open Download Library
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckoutSession(null);
                  navigate('/orders');
                }}
                className="h-10 w-full rounded-lg border border-white/12 text-sm font-medium text-slate-300 hover:bg-white/[0.05] cursor-pointer"
              >
                View Order Receipt
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-baseline justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5">
              <span className="text-sm text-slate-400">Amount Payable</span>
              <span className="font-mono text-xl font-bold text-white tabular-nums">
                {formatCurrency(checkoutSession.totalRupees)}
              </span>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">Digital Assets ({checkoutSession.items.length})</p>
              <p className="line-clamp-2">{checkoutSession.items.join(' · ')}</p>
            </div>

            {checkoutSession.mode === 'sandbox' ? (
              <>
                <div>
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Select Payment Method (Razorpay Test Mode)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'upi' as const, label: 'UPI / QR', icon: Smartphone },
                      { id: 'card' as const, label: 'Card', icon: CreditCard },
                      { id: 'netbanking' as const, label: 'NetBanking', icon: Landmark },
                    ].map((m) => {
                      const Icon = m.icon;
                      const active = method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethod(m.id)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'border-blue-500 bg-blue-500/15 text-white'
                              : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'
                          }`}
                        >
                          <Icon className="h-4 w-4 text-blue-400" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {errorMsg && (
                  <p className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="button"
                  disabled={processing}
                  onClick={handleSandboxPay}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  <span>
                    {processing
                      ? 'Verifying Signature...'
                      : `Pay ${formatCurrency(checkoutSession.totalRupees)} Now`}
                  </span>
                </button>
              </>
            ) : (
              <div className="py-4 text-center text-sm text-slate-300 space-y-2">
                <ShieldCheck className="mx-auto h-8 w-8 text-blue-400" />
                <p>Complete payment inside the Razorpay Checkout window.</p>
                {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
              </div>
            )}

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>HMAC-SHA256 Server Signature Verification Enabled</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
