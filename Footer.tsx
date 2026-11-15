import { useApp } from '../context/AppContext.tsx';

export function Footer() {
  const { navigate, settings } = useApp();

  const linkClass =
    'text-sm text-slate-400 hover:text-white transition-colors duration-150 cursor-pointer text-left';

  return (
    <footer className="border-t border-white/[0.08] bg-[#04060C] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="font-display text-lg font-bold tracking-[0.14em] text-white">
              {settings.brand_name}
            </div>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs">{settings.tagline}</p>
            <div className="space-y-1 text-xs text-slate-500">
              <p>{settings.contact_email}</p>
              <p>{settings.contact_phone}</p>
              <p>{settings.contact_address}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Storefront</h3>
            <ul className="space-y-2.5">
              <li>
                <button type="button" onClick={() => navigate('/')} className={linkClass}>
                  Home
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/shop')} className={linkClass}>
                  Shop All Products
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/about')} className={linkClass}>
                  About {settings.brand_name}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/faq')} className={linkClass}>
                  FAQ
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/contact')} className={linkClass}>
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Customer Vault</h3>
            <ul className="space-y-2.5">
              <li>
                <button type="button" onClick={() => navigate('/login')} className={linkClass}>
                  Login / Register
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/account')} className={linkClass}>
                  My Account
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/orders')} className={linkClass}>
                  My Orders
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/downloads')} className={linkClass}>
                  Download Library
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/admin')} className={linkClass}>
                  Admin Dashboard
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Legal & Social</h3>
            <ul className="space-y-2.5">
              <li>
                <button type="button" onClick={() => navigate('/privacy')} className={linkClass}>
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/terms')} className={linkClass}>
                  Terms &amp; Conditions
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/refund-policy')} className={linkClass}>
                  Refund Policy
                </button>
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-400">
              {settings.twitter_url && (
                <a href={settings.twitter_url} target="_blank" rel="noreferrer" className="hover:text-white">
                  X / Twitter
                </a>
              )}
              {settings.github_url && (
                <a href={settings.github_url} target="_blank" rel="noreferrer" className="hover:text-white">
                  GitHub
                </a>
              )}
              {settings.linkedin_url && (
                <a href={settings.linkedin_url} target="_blank" rel="noreferrer" className="hover:text-white">
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {settings.brand_name}. All rights reserved.
          </p>
          <p>Secured by Razorpay Checkout · Instant Private PDF Delivery</p>
        </div>
      </div>
    </footer>
  );
}
