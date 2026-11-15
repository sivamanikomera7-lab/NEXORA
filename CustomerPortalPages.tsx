import { Download, FileCheck2, LogOut, Mail, Package, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { formatCurrency, formatShortDate } from '../lib/format.ts';
import { resolveImageSrc } from '../lib/images.ts';
import type { DownloadPermission, OrderRecord } from '../types.ts';

function PortalNav({ active }: { active: 'account' | 'orders' | 'downloads' }) {
  const { navigate, logout, user } = useApp();
  const tabs = [
    { id: 'downloads' as const, label: 'Download Library', to: '/downloads', icon: Download },
    { id: 'orders' as const, label: 'My Orders', to: '/orders', icon: Package },
    { id: 'account' as const, label: 'My Account', to: '/account', icon: UserIcon },
  ];

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
          {active === 'downloads'
            ? 'Download Library'
            : active === 'orders'
              ? 'My Orders'
              : 'My Account'}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Signed in as <span className="text-slate-200">{user?.email}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isCurrent = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab.to)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isCurrent
                  ? 'bg-blue-600 text-white'
                  : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={logout}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function RequireCustomerGate() {
  const { navigate } = useApp();
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="glass-panel rounded-2xl p-10 space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">Sign In Required</h1>
        <p className="text-sm text-slate-400">
          Please sign in to access your purchased downloads, order receipts, and account settings.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-2 h-11 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
        >
          Sign In / Register
        </button>
      </div>
    </main>
  );
}

export function DownloadsPage() {
  const { user, authLoading, navigate, showToast } = useApp();
  const [items, setItems] = useState<DownloadPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadDownloads = () => {
    setLoading(true);
    fetch('/api/downloads', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) loadDownloads();
  }, [user]);

  if (authLoading) return <div className="mx-auto max-w-6xl px-4 py-14"><div className="glass-panel h-64 animate-pulse rounded-2xl" /></div>;
  if (!user) return <RequireCustomerGate />;

  const handleDownload = async (permissionId: number, fileName: string) => {
    setDownloadingId(permissionId);
    try {
      const resp = await fetch(`/api/downloads/${permissionId}/token`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(data.error || 'Download authorization denied.', 'error');
        return;
      }
      const a = document.createElement('a');
      a.href = data.downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast(`Secure download started for ${fileName}`, 'success');
      window.setTimeout(loadDownloads, 800);
    } catch {
      showToast('Failed to generate signed download link.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <PortalNav active="downloads" />

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="glass-panel h-48 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-4">
          <FileCheck2 className="mx-auto h-10 w-10 text-blue-400" />
          <h2 className="font-display text-xl font-semibold text-white">No Digital Assets Yet</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Products purchased via Razorpay appear here immediately with signed private PDF delivery.
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="h-10 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
          >
            Browse Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.permission_id} className="glass-panel rounded-2xl p-5 flex gap-5 items-center">
              <img
                src={resolveImageSrc(item.image_url)}
                alt={item.product_name}
                referrerPolicy="no-referrer"
                className="h-24 w-28 rounded-xl object-cover shrink-0 bg-slate-900"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-xs font-mono text-blue-400 tabular-nums">
                  Order {item.order_number} · {item.file_format}
                </p>
                <h2 className="font-display text-base font-semibold text-white truncate">
                  {item.product_name}
                </h2>
                <p className="text-xs text-slate-400 tabular-nums">
                  {item.file_size_label} · Downloads: {item.download_count}/{item.max_downloads}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={downloadingId === item.permission_id}
                    onClick={() => handleDownload(item.permission_id, item.file_name)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>
                      {downloadingId === item.permission_id ? 'Preparing Link...' : 'Download Asset'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export function OrdersPage() {
  const { user, authLoading, navigate } = useApp();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch('/api/orders', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setOrders(data);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <div className="mx-auto max-w-6xl px-4 py-14"><div className="glass-panel h-64 animate-pulse rounded-2xl" /></div>;
  if (!user) return <RequireCustomerGate />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <PortalNav active="orders" />

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="glass-panel h-36 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-4">
          <h2 className="font-display text-xl font-semibold text-white">No Orders Placed</h2>
          <p className="text-sm text-slate-400">Your verified Razorpay orders and email receipts will appear here.</p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="h-10 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
          >
            Shop Digital Products
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <p className="font-mono text-sm font-semibold text-white tabular-nums">
                    {order.order_number}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                    {formatShortDate(order.created_at)} · Razorpay Ref: {order.razorpay_payment_id || 'Pending'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-white tabular-nums">
                    {formatCurrency(order.total_amount)}
                  </p>
                  <p
                    className={`text-xs font-semibold capitalize ${
                      order.status === 'paid'
                        ? 'text-emerald-400'
                        : order.status === 'failed'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                    }`}
                  >
                    {order.status === 'paid' ? 'Verified & Paid' : order.status}
                  </p>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between text-slate-300">
                      <span>
                        {item.product_name}{' '}
                        <span className="text-xs text-slate-500">· {item.file_format}</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-200">
                        {formatCurrency(item.unit_price)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {order.emailReceipt && (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-xs text-slate-400 flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-200">{order.emailReceipt.subject}</p>
                    <p className="mt-0.5 leading-relaxed">{order.emailReceipt.preview_text}</p>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export function AccountPage() {
  const { user, authLoading, refreshUser, showToast } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPw, setUpdatingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setCompany(user.company || '');
    }
  }, [user]);

  if (authLoading) return <div className="mx-auto max-w-6xl px-4 py-14"><div className="glass-panel h-64 animate-pulse rounded-2xl" /></div>;
  if (!user) return <RequireCustomerGate />;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const resp = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, phone, company }),
      });
      if (!resp.ok) {
        const d = await resp.json();
        showToast(d.error || 'Could not update profile.', 'error');
        return;
      }
      await refreshUser();
      showToast('Profile details updated.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingPw(true);
    try {
      const resp = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await resp.json();
      if (!resp.ok) {
        showToast(d.error || 'Password update failed.', 'error');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password updated securely.', 'success');
    } finally {
      setUpdatingPw(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <PortalNav active="account" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <form onSubmit={handleSaveProfile} className="glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-white">Profile Details</h2>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Company / Organization</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        <form onSubmit={handleUpdatePassword} className="glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-white">Change Password</h2>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={updatingPw}
            className="h-10 rounded-lg border border-white/15 bg-white/[0.06] px-5 text-sm font-semibold text-white hover:bg-white/[0.12] disabled:opacity-60 cursor-pointer"
          >
            {updatingPw ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </main>
  );
}
