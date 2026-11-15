import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Product, RazorpayOrderSession, SiteSettings, User } from '../types.ts';

interface ToastState {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface AppContextValue {
  path: string;
  navigate: (to: string) => void;
  user: User | null;
  authLoading: boolean;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
  settings: SiteSettings;
  refreshSettings: () => Promise<void>;
  cart: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  previewProduct: Product | null;
  setPreviewProduct: (p: Product | null) => void;
  checkoutSession: RazorpayOrderSession | null;
  setCheckoutSession: (s: RazorpayOrderSession | null) => void;
  startCheckout: (productIds: number[], couponCode?: string | null) => Promise<void>;
  pendingReturnTo: string | null;
  setPendingReturnTo: (path: string | null) => void;
  showToast: (message: string, tone?: 'info' | 'success' | 'error') => void;
}

const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: 'NEXORA',
  tagline: 'Digital Products. Unlimited Possibilities.',
  logo_url: '',
  hero_title: 'Digital Products. Unlimited Possibilities.',
  hero_subtitle:
    'Architectural ebooks, production UI templates, engineering courses, and security playbooks engineered for high-output builders.',
  hero_cta_text: 'Explore Catalog',
  contact_email: 'support@nexora.digital',
  contact_phone: '+91 9963955611',
  contact_address: 'Thummalacheruvu, Piduguralla, Andhra Pradesh',
  twitter_url: 'https://x.com/nexoradigital',
  github_url: 'https://github.com/nexoradigital',
  linkedin_url: 'https://linkedin.com/company/nexoradigital',
  instagram_url: 'https://instagram.com/nexoradigital',
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState<string>(() => window.location.pathname || '/');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [cart, setCart] = useState<Product[]>(() => {
    try {
      const raw = localStorage.getItem('nexora_cart');
      return raw ? (JSON.parse(raw) as Product[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<RazorpayOrderSession | null>(null);
  const [pendingReturnTo, setPendingReturnTo] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now();
    setToast({ id, message, tone });
    window.setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3600);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('nexora_cart', JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const resp = await fetch('/api/auth/me', { credentials: 'include' });
      if (!resp.ok) {
        setUser(null);
        return null;
      }
      const data = (await resp.json()) as { user: User | null };
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const resp = await fetch('/api/settings');
      if (resp.ok) {
        const data = (await resp.json()) as SiteSettings;
        if (data?.brand_name) {
          setSettings(data);
        }
      }
    } catch {
      // keep defaults
    }
  }, []);

  useEffect(() => {
    refreshUser();
    refreshSettings();
  }, [refreshUser, refreshSettings]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    showToast('Signed out securely.', 'info');
    if (path.startsWith('/account') || path.startsWith('/orders') || path.startsWith('/downloads')) {
      navigate('/');
    }
  }, [navigate, path, showToast]);

  const addToCart = useCallback(
    (product: Product) => {
      setCart((prev) => {
        if (prev.some((p) => p.id === product.id)) {
          showToast(`${product.name} is already in your bag.`, 'info');
          return prev;
        }
        showToast(`Added ${product.name} to bag.`, 'success');
        return [...prev, product];
      });
      setCartOpen(true);
    },
    [showToast]
  );

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const startCheckout = useCallback(
    async (productIds: number[], couponCode?: string | null) => {
      if (!user) {
        setPendingReturnTo(window.location.pathname);
        setCartOpen(false);
        showToast('Sign in or create an account to unlock your digital downloads.', 'info');
        navigate('/login');
        return;
      }
      try {
        const resp = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productIds, couponCode }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          showToast(data.error || 'Could not initiate checkout.', 'error');
          return;
        }
        setCartOpen(false);
        setCheckoutSession(data as RazorpayOrderSession);
      } catch {
        showToast('Network error initiating Razorpay order.', 'error');
      }
    },
    [navigate, showToast, user]
  );

  return (
    <AppContext.Provider
      value={{
        path,
        navigate,
        user,
        authLoading,
        refreshUser,
        logout,
        settings,
        refreshSettings,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        cartOpen,
        setCartOpen,
        previewProduct,
        setPreviewProduct,
        checkoutSession,
        setCheckoutSession,
        startCheckout,
        pendingReturnTo,
        setPendingReturnTo,
        showToast,
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl transition-all duration-200 ${
            toast.tone === 'error'
              ? 'border border-rose-500/40 bg-rose-950/85 text-rose-100'
              : toast.tone === 'success'
                ? 'border border-blue-500/40 bg-[#0B1222]/95 text-slate-100'
                : 'border border-white/12 bg-[#0B101D]/95 text-slate-100'
          }`}
        >
          {toast.message}
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
