import { ChevronDown, Mail, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';

export function AboutPage() {
  const { navigate, settings } = useApp();
  return (
    <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 space-y-10">
      <div className="glass-panel rounded-2xl p-8 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">About {settings.brand_name}</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl [text-wrap:balance]">
          Independent Digital Publishing &amp; Systems Architecture
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          {settings.brand_name} exists to eliminate superficial tutorials and bloated marketplace fees. We author,
          curate, and distribute deep technical ebooks, production-ready UI kits, and security playbooks directly
          to engineers, designers, and founders.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3 border-t border-white/[0.08] pt-8">
          <div>
            <h2 className="text-sm font-semibold text-white">01. Zero Marketplace Tax</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Independent infrastructure powered by Razorpay direct settlement and private signed file vaults.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">02. Cryptographic Access</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Paid PDFs never sit on public URLs. Permissions unlock exclusively after HMAC signature verification.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">03. Continuous Revisions</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Every customer keeps permanent access to updated PDF editions inside their Download Library.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
          >
            Browse Digital Catalog
          </button>
        </div>
      </div>
    </main>
  );
}

export function ContactPage() {
  const { settings, showToast } = useApp();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(data.error || 'Could not send message.', 'error');
        return;
      }
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
      showToast('Message received by our support team.', 'success');
    } catch {
      showToast('Network error sending message.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="glass-panel rounded-2xl p-8 lg:col-span-5 space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Contact Us</h1>
            <p className="mt-2 text-sm text-slate-400">
              Questions about team licensing, Razorpay invoices, or custom digital bundles? Reach our team directly.
            </p>
          </div>
          <div className="space-y-4 pt-2 text-sm text-slate-300">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-blue-400 mt-1 shrink-0" />
              <span>{settings.contact_email}</span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-blue-400 mt-1 shrink-0" />
              <span className="tabular-nums">{settings.contact_phone}</span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-blue-400 mt-1 shrink-0" />
              <span>{settings.contact_address}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-8 lg:col-span-7">
          {sent ? (
            <div className="py-10 text-center space-y-3">
              <h2 className="font-display text-xl font-semibold text-white">Inquiry Received</h2>
              <p className="text-sm text-slate-400">
                Our support desk responds within one business day to {settings.contact_email}.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-3 rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-white cursor-pointer"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Message</label>
                <textarea
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full rounded-lg border border-white/12 bg-white/[0.04] p-3.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

const FAQ_ITEMS = [
  {
    q: 'How quickly do I receive my PDF or digital template after payment?',
    a: 'Immediately. Once Razorpay verifies your payment signature on our backend, the product unlocks inside your Download Library and an order confirmation email is sent automatically.',
  },
  {
    q: 'Which payment methods are supported via Razorpay?',
    a: 'You can pay via UPI (GPay, PhonePe, Paytm), Visa/Mastercard/RuPay credit and debit cards, and major Indian NetBanking providers.',
  },
  {
    q: 'Are paid PDFs hosted on public URLs?',
    a: 'Never. All paid files are stored in isolated private storage. Clicking Download generates a short-lived 5-minute HMAC-signed link tied strictly to your verified order.',
  },
  {
    q: 'Can I re-download a product if I switch devices?',
    a: 'Yes. Sign into your NEXORA account anytime and open Download Library to generate a fresh secure download link.',
  },
  {
    q: 'How do coupon codes work?',
    a: 'Enter any active promotional code (such as NEXORA20 or LAUNCH15) inside the Shopping Bag drawer or product checkout field before clicking Buy Now.',
  },
];

export function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Frequently Asked Questions</h1>
        <p className="mt-2 text-sm text-slate-400">
          Licensing, Razorpay checkout verification, and private download delivery details.
        </p>
      </div>
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className="glass-panel rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm font-semibold text-white cursor-pointer"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && <div className="border-t border-white/[0.06] px-6 py-4 text-sm text-slate-300 leading-relaxed">{item.a}</div>}
            </div>
          );
        })}
      </div>
    </main>
  );
}

export function LegalPage({ type }: { type: 'privacy' | 'terms' | 'refund' }) {
  const { settings } = useApp();
  const content = {
    privacy: {
      title: 'Privacy Policy',
      updated: 'November 2026',
      sections: [
        {
          heading: '1. Information We Collect',
          body: `${settings.brand_name} collects only the account name, email address, optional company details, and Razorpay transaction references needed to verify digital orders and grant download access.`,
        },
        {
          heading: '2. Payment Security',
          body: 'Card, UPI, and NetBanking credentials are processed directly by Razorpay. We never store raw payment instrument numbers on our servers.',
        },
        {
          heading: '3. Private Storage & Sessions',
          body: 'Authentication relies on HTTP-only signed cookies, and passwords are salted and hashed with scrypt. Your purchase records are never sold to third parties.',
        },
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      updated: 'November 2026',
      sections: [
        {
          heading: '1. Digital License Grant',
          body: `Purchasing a digital asset from ${settings.brand_name} grants a non-exclusive, non-transferable license for personal or commercial project use according to the product specification.`,
        },
        {
          heading: '2. Redistribution Restrictions',
          body: 'You may not resell, share, or upload raw PDFs, source templates, or course workbooks to public file-sharing repositories.',
        },
        {
          heading: '3. Pricing & Taxes',
          body: 'All prices are listed in INR unless otherwise specified. Discounts and promotional coupons apply prior to Razorpay order generation.',
        },
      ],
    },
    refund: {
      title: 'Refund Policy',
      updated: 'November 2026',
      sections: [
        {
          heading: '1. Instant Digital Fulfillment',
          body: 'Because digital ebooks, PDF guides, and downloadable kits become immediately accessible upon Razorpay signature verification, standard change-of-mind refunds are generally unavailable once a file is downloaded.',
        },
        {
          heading: '2. Duplicate Charges & Corrupted Files',
          body: `If you experience a duplicate Razorpay charge or an unreadable file, contact ${settings.contact_email} with your Order ID within 7 days for an immediate replacement or full refund.`,
        },
      ],
    },
  }[type];

  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="glass-panel rounded-2xl p-8 sm:p-10 space-y-6">
        <div>
          <p className="text-xs text-slate-400">Last Updated: {content.updated}</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">{content.title}</h1>
        </div>
        <div className="space-y-6 border-t border-white/[0.08] pt-6">
          {content.sections.map((sec, idx) => (
            <section key={idx} className="space-y-2">
              <h2 className="text-base font-semibold text-white">{sec.heading}</h2>
              <p className="text-sm leading-relaxed text-slate-300">{sec.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
