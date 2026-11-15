import { Check, FileText, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatCurrency } from '../lib/format.ts';
import { resolveImageSrc } from '../lib/images.ts';

export function PreviewModal() {
  const { previewProduct, setPreviewProduct, startCheckout, addToCart } = useApp();

  if (!previewProduct) return null;

  const price = previewProduct.discount_price ?? previewProduct.price;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${previewProduct.name}`}
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => setPreviewProduct(null)}
      />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/12 bg-[#080D1A]/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <FileText className="h-4 w-4 text-blue-400" />
            <span>Sample Preview</span>
            <span aria-hidden="true">·</span>
            <span>{previewProduct.file_format}</span>
            <span aria-hidden="true">·</span>
            <span>{previewProduct.file_size_label}</span>
          </div>
          <button
            type="button"
            onClick={() => setPreviewProduct(null)}
            aria-label="Close preview"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img
              src={resolveImageSrc(previewProduct.image_url)}
              alt={previewProduct.name}
              referrerPolicy="no-referrer"
              className="h-28 w-36 rounded-xl object-cover shrink-0 bg-slate-900"
            />
            <div>
              <p className="text-xs font-medium text-blue-400">{previewProduct.category_name}</p>
              <h3 className="mt-1 font-display text-xl font-semibold text-white">{previewProduct.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{previewProduct.subtitle}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#05070E]/80 p-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Excerpt &amp; Contents
            </h4>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">
              {previewProduct.preview_excerpt || previewProduct.description}
            </pre>
          </div>

          {previewProduct.highlights && previewProduct.highlights.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Included in Your Download
              </h4>
              <ul className="space-y-2">
                {previewProduct.highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] bg-[#05070E]/80 px-6 py-4">
          <div className="flex items-baseline gap-2.5 tabular-nums">
            <span className="font-mono text-xl font-semibold text-white">{formatCurrency(price)}</span>
            {previewProduct.discount_price && (
              <span className="font-mono text-xs text-slate-500 line-through">
                {formatCurrency(previewProduct.price)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const prod = previewProduct;
                setPreviewProduct(null);
                addToCart(prod);
              }}
              className="h-10 rounded-lg border border-white/15 px-4 text-sm font-medium text-slate-200 hover:bg-white/[0.07] cursor-pointer"
            >
              Add to Bag
            </button>
            <button
              type="button"
              onClick={() => {
                const id = previewProduct.id;
                setPreviewProduct(null);
                startCheckout([id]);
              }}
              className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
