import { Eye, FileText, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { calcDiscountPercent, formatCurrency } from '../lib/format.ts';
import { resolveImageSrc } from '../lib/images.ts';
import type { Product } from '../types.ts';

export function ProductCard({ product }: { product: Product }) {
  const { navigate, addToCart, setPreviewProduct, startCheckout } = useApp();
  const [imgFailed, setImgFailed] = useState(false);

  const effectivePrice = product.discount_price ?? product.price;
  const discountPct = calcDiscountPercent(product.price, product.discount_price);

  return (
    <article className="group glass-panel flex flex-col overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/20">
      <a
        href={`/product/${product.slug}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/product/${product.slug}`);
        }}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#0B101D]"
      >
        {!imgFailed ? (
          <img
            src={resolveImageSrc(product.image_url)}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#0B1224] to-slate-950 p-6 text-center">
            <FileText className="h-10 w-10 text-blue-400/70 mb-2" />
            <span className="text-xs font-medium text-slate-400">{product.name}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05070E]/75 via-transparent to-transparent" />
      </a>

      <div className="flex flex-1 flex-col p-5">
        {/* Clean unboxed metadata with typographic separators (no pills) */}
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <span className="text-blue-400">{product.category_name}</span>
          <span aria-hidden="true">·</span>
          <span>{product.file_format}</span>
          <span aria-hidden="true">·</span>
          <span>{product.pages_or_duration}</span>
        </div>

        <a
          href={`/product/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/product/${product.slug}`);
          }}
          className="font-display text-lg font-semibold leading-snug text-white hover:text-blue-300 transition-colors line-clamp-2"
        >
          {product.name}
        </a>

        <p className="mt-1.5 text-sm leading-relaxed text-slate-400 line-clamp-2">{product.subtitle}</p>

        <div className="mt-auto pt-5">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2.5 tabular-nums">
              <span className="font-mono text-lg font-semibold text-white">
                {formatCurrency(effectivePrice)}
              </span>
              {product.discount_price && product.discount_price < product.price && (
                <span className="font-mono text-xs text-slate-500 line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
            {discountPct > 0 && (
              <span className="text-xs font-medium text-blue-400 tabular-nums">Save {discountPct}%</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => startCheckout([product.id])}
              className="flex-1 h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Buy Now
            </button>
            <button
              type="button"
              onClick={() => addToCart(product)}
              aria-label={`Add ${product.name} to bag`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] shrink-0 cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewProduct(product)}
              aria-label={`Preview ${product.name}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] shrink-0 cursor-pointer"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
