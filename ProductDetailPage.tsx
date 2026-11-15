import { ArrowLeft, Check, Eye, FileDown, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { calcDiscountPercent, formatCurrency } from '../lib/format.ts';
import { resolveImageSrc } from '../lib/images.ts';
import type { Product } from '../types.ts';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate, addToCart, startCheckout, setPreviewProduct } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setProduct(data))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="glass-panel h-96 animate-pulse rounded-2xl" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Product Not Found</h1>
        <p className="mt-2 text-sm text-slate-400">This digital asset may have been archived or moved.</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
        >
          Back to Catalog
        </button>
      </main>
    );
  }

  const effectivePrice = product.discount_price ?? product.price;
  const discountPct = calcDiscountPercent(product.price, product.discount_price);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate('/shop')}
        className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Catalog</span>
      </button>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
        {/* Left Sticky Gallery & Preview */}
        <div className="lg:col-span-7 space-y-6 lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080C17] aspect-[4/3]">
            <img
              src={resolveImageSrc(product.image_url)}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Preview &amp; Contents</h2>
              <button
                type="button"
                onClick={() => setPreviewProduct(product)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Open Full Preview</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">
              {product.preview_excerpt || product.description}
            </pre>
          </div>
        </div>

        {/* Right Contiguous Purchase Module */}
        <div className="glass-panel rounded-2xl p-7 lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="text-blue-400">{product.category_name}</span>
              <span aria-hidden="true">·</span>
              <span>{product.file_format}</span>
              <span aria-hidden="true">·</span>
              <span>{product.pages_or_duration}</span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl [text-wrap:balance]">
              {product.name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{product.description}</p>
          </div>

          <div className="border-y border-white/[0.08] py-5">
            <div className="flex items-baseline gap-3 tabular-nums">
              <span className="font-mono text-3xl font-bold text-white">
                {formatCurrency(effectivePrice)}
              </span>
              {product.discount_price && product.discount_price < product.price && (
                <>
                  <span className="font-mono text-base text-slate-500 line-through">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">Save {discountPct}%</span>
                </>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              One-time purchase · Instant private PDF / file download · {product.file_size_label}
            </p>
          </div>

          {product.highlights && product.highlights.length > 0 && (
            <ul className="space-y-2.5">
              {product.highlights.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-200">
                  <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 pt-2">
            <input
              type="text"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Optional coupon code (e.g. NEXORA20)"
              className="h-10 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => startCheckout([product.id], coupon.trim() || null)}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
            >
              Buy Now with Razorpay
            </button>
            <button
              type="button"
              onClick={() => addToCart(product)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] text-sm font-medium text-slate-100 transition-colors hover:bg-white/[0.08] cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Add to Shopping Bag</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
              <span>Razorpay Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <FileDown className="h-4 w-4 text-blue-400 shrink-0" />
              <span>Signed URL Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
