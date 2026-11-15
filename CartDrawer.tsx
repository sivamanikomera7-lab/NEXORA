import { ArrowRight, Tag, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { formatCurrency } from '../lib/format.ts';
import { resolveImageSrc } from '../lib/images.ts';

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, startCheckout, navigate, showToast } = useApp();
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  if (!cartOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + (item.discount_price ?? item.price), 0);
  const discount = appliedCoupon ? Math.min(subtotal, appliedCoupon.discount_amount) : 0;
  const total = Math.max(0, subtotal - discount);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    setCouponError('');
    try {
      const resp = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setAppliedCoupon(null);
        setCouponError(data.error || 'Invalid coupon.');
        return;
      }
      setAppliedCoupon({ code: data.code, discount_amount: data.discount_amount });
      showToast(`Coupon ${data.code} applied.`, 'success');
    } catch {
      setCouponError('Unable to validate coupon.');
    } finally {
      setCheckingCoupon(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping Bag">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setCartOpen(false)}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#080C17]/95 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Your Bag</h2>
            <p className="text-xs text-slate-400 tabular-nums">{cart.length} digital asset(s) selected</p>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close bag"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <p className="font-display text-base font-medium text-slate-200">Your digital bag is empty</p>
              <p className="mt-1 text-sm text-slate-400">
                Browse ebooks, UI systems, and security guides to unlock instant downloads.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/shop');
                }}
                className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
              >
                Explore Products
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {cart.map((item) => {
                const price = item.discount_price ?? item.price;
                return (
                  <li key={item.id} className="flex gap-4 py-4">
                    <img
                      src={resolveImageSrc(item.image_url)}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="h-16 w-20 rounded-lg object-cover bg-slate-900 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.category_name} · {item.file_format}
                      </p>
                      <p className="mt-1.5 font-mono text-sm font-semibold text-blue-300 tabular-nums">
                        {formatCurrency(price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="self-start rounded-md p-2 text-slate-500 hover:bg-white/[0.06] hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-white/[0.08] bg-[#060912] px-6 py-5 space-y-4">
            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Coupon (e.g. NEXORA20)"
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={checkingCoupon}
                  onClick={handleApplyCoupon}
                  className="h-10 rounded-lg border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-white hover:bg-white/[0.12] disabled:opacity-50 cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="mt-1.5 text-xs text-rose-400">{couponError}</p>}
              {appliedCoupon && (
                <div className="mt-1.5 flex items-center justify-between text-xs text-emerald-400">
                  <span>Applied {appliedCoupon.code}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput('');
                    }}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-slate-200">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon Discount</span>
                  <span className="font-mono tabular-nums">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/[0.08] pt-2.5 text-base font-semibold text-white">
                <span>Total</span>
                <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                startCheckout(
                  cart.map((c) => c.id),
                  appliedCoupon?.code ?? null
                )
              }
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
            >
              <span>Checkout with Razorpay</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
