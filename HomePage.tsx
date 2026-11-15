import { ArrowRight, CheckCircle2, Lock, ShieldCheck, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductCard } from '../components/ProductCard.tsx';
import { useApp } from '../context/AppContext.tsx';
import { resolveImageSrc } from '../lib/images.ts';
import type { Product } from '../types.ts';

export function HomePage() {
  const { navigate, settings, showToast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'featured' | 'bestseller' | 'new'>('featured');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNews, setSubmittingNews] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = products
    .filter((p) => {
      if (tab === 'featured') return p.is_featured;
      if (tab === 'bestseller') return p.is_bestseller;
      return p.is_new_arrival;
    })
    .slice(0, 6);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubmittingNews(true);
    try {
      const resp = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(data.error || 'Could not subscribe.', 'error');
        return;
      }
      setNewsletterEmail('');
      showToast('Subscribed to NEXORA product releases.', 'success');
    } catch {
      showToast('Network error subscribing.', 'error');
    } finally {
      setSubmittingNews(false);
    }
  };

  return (
    <main className="relative overflow-hidden">
      {/* Animated gradient backdrop orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="nexora-mesh-orb absolute -top-48 left-1/4 h-[520px] w-[520px] rounded-full bg-blue-600/18 blur-[130px]" />
        <div className="nexora-mesh-orb absolute top-1/3 -right-32 h-[440px] w-[440px] rounded-full bg-indigo-600/16 blur-[130px]" />
      </div>

      {/* Hero Split Showcase */}
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          <div className="glass-panel flex flex-col justify-center rounded-2xl p-8 sm:p-10 lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
              {settings.brand_name} Digital Vault
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl leading-[1.08] [text-wrap:balance]">
              {settings.hero_title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              {settings.hero_subtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer whitespace-nowrap"
              >
                <span>{settings.hero_cta_text}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="inline-flex h-12 items-center rounded-xl border border-white/12 bg-white/[0.04] px-6 text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.08] cursor-pointer whitespace-nowrap"
              >
                How Delivery Works
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/[0.08] pt-6">
              <div>
                <p className="font-mono text-xl font-semibold text-white tabular-nums">100%</p>
                <p className="mt-0.5 text-xs text-slate-400">Verified Razorpay Checkout</p>
              </div>
              <div>
                <p className="font-mono text-xl font-semibold text-white tabular-nums">&lt; 3s</p>
                <p className="mt-0.5 text-xs text-slate-400">Signed PDF Unlock</p>
              </div>
              <div>
                <p className="font-mono text-xl font-semibold text-white tabular-nums">6</p>
                <p className="mt-0.5 text-xs text-slate-400">Curated Asset Formats</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#080C17] lg:col-span-5 min-h-[300px]">
            <img
              src={resolveImageSrc('asset:hero_nexora_vault')}
              alt="NEXORA glassmorphism digital vault hardware and folios"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05070E]/85 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 glass-surface rounded-xl p-4">
              <p className="text-xs font-medium text-blue-300">Instant Digital Fulfillment</p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                Ebooks · Templates · Engineering Courses · Security Guides
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Collection Tabs (Featured / Best Sellers / New Arrivals) */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Curated Digital Releases
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Every asset includes lifetime library access and cryptographic receipt verification.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 self-start">
            {[
              { key: 'featured' as const, label: 'Featured' },
              { key: 'bestseller' as const, label: 'Best Sellers' },
              { key: 'new' as const, label: 'New Arrivals' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  tab === item.key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-panel h-96 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-6 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] cursor-pointer"
          >
            <span>View All Products</span>
            <ArrowRight className="h-4 w-4 text-blue-400" />
          </button>
        </div>
      </section>

      {/* Why Choose NEXORA + Customer Proof */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="glass-panel rounded-2xl p-8 lg:col-span-7 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Why Builders Choose {settings.brand_name}</h2>
              <p className="mt-1.5 text-sm text-slate-400">
                Engineered end-to-end for secure digital commerce without third-party marketplace clutter.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 pt-2">
              <div className="space-y-2">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Signature Verified</h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  Every Razorpay settlement is verified server-side with HMAC-SHA256 before issuing file access.
                </p>
              </div>
              <div className="space-y-2">
                <Lock className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Private File Vault</h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  Paid PDFs remain locked in private storage and stream only over temporary 5-minute signed URLs.
                </p>
              </div>
              <div className="space-y-2">
                <Zap className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Lifetime Updates</h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  Revisit your Download Library anytime to pull revised handbook editions and template updates.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-8 lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Verified Customer Outcomes</span>
              </div>
              <blockquote className="text-sm leading-relaxed text-slate-200">
                &ldquo;We replaced three fragmented architecture docs with NEXORA&apos;s Distributed Systems
                Handbook and Obsidian UI kit. Our checkout latency dropped by 40% within two sprint cycles.&rdquo;
              </blockquote>
              <div className="text-xs text-slate-400">
                <p className="font-semibold text-white">Priya Nair</p>
                <p>Principal Systems Architect, CloudCraft Systems</p>
              </div>
            </div>

            <div className="border-t border-white/[0.08] pt-5">
              <blockquote className="text-sm leading-relaxed text-slate-300">
                &ldquo;Instant Razorpay UPI verification and direct PDF download in under three seconds. Cleanest
                digital resource storefront I have used.&rdquo;
              </blockquote>
              <div className="mt-2 text-xs text-slate-400">
                <p className="font-semibold text-white">Rohan Kulkarni</p>
                <p>Design Engineering Lead, VectorWorks</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Subscription */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-2xl p-8 sm:p-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-lg">
            <h2 className="font-display text-2xl font-bold text-white">Get Notified on New Releases</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Receive release notes when new ebooks, UI systems, and engineering playbooks drop—plus launch
              coupon codes.
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-11 flex-1 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submittingNews}
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap cursor-pointer"
            >
              {submittingNews ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
