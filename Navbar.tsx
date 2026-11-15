import { useState } from 'react';
import { Menu, ShoppingBag, User, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function Navbar() {
  const { path, navigate, user, settings, cart, setCartOpen } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    { label: 'About', to: '/about' },
    { label: 'FAQ', to: '/faq' },
    { label: 'Contact', to: '/contact' },
  ];

  const handleNav = (to: string) => {
    setMobileOpen(false);
    navigate(to);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#05070E]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNav('/');
          }}
          className="flex items-center gap-2.5 font-display text-lg font-bold tracking-[0.14em] text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md px-1"
        >
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.brand_name}
              referrerPolicy="no-referrer"
              className="h-7 w-7 rounded-md object-cover"
            />
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 text-blue-400 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          )}
          <span>{settings.brand_name}</span>
        </a>

        {/* Zone 2: 5 clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navLinks.map((item) => {
            const active = item.to === '/' ? path === '/' : path.startsWith(item.to);
            return (
              <a
                key={item.to}
                href={item.to}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.to);
                }}
                className={`relative py-1 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ${
                  active ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-0.5 h-px bg-gradient-to-r from-blue-400 to-indigo-400" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Primary action zone (Bag + Account/Sign In) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="Open shopping bag"
            className="relative flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4 text-blue-400" />
            <span className="tabular-nums">{cart.length}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav(user ? (user.role === 'admin' ? '/admin' : '/downloads') : '/login')}
            className="hidden sm:inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer"
          >
            <User className="h-4 w-4" />
            <span>{user ? (user.role === 'admin' ? 'Admin' : 'Library') : 'Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/[0.08] bg-[#05070E]/95 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((item) => (
              <a
                key={item.to}
                href={item.to}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.to);
                }}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/[0.05]"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 border-t border-white/[0.08] pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleNav('/downloads')}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-left text-sm font-semibold text-white"
                  >
                    Download Library
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('/account')}
                    className="rounded-lg border border-white/10 px-4 py-2.5 text-left text-sm font-medium text-slate-200"
                  >
                    My Account & Orders
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNav('/login')}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
