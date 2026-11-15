import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';

export function LoginPage() {
  const { navigate, refreshUser, pendingReturnTo, setPendingReturnTo, showToast } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login' ? { email, password } : { name, email, password, company };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Authentication failed.');
        return;
      }

      const signedUser = await refreshUser();
      showToast(
        mode === 'login' ? 'Signed in to NEXORA.' : 'Account created and signed in.',
        'success'
      );

      if (pendingReturnTo) {
        const dest = pendingReturnTo;
        setPendingReturnTo(null);
        navigate(dest);
      } else if (signedUser?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/downloads');
      }
    } catch {
      setError('Network error communicating with authentication server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="glass-panel rounded-2xl p-8 space-y-6">
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {mode === 'login' ? 'Access Your Vault' : 'Create Customer Account'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {mode === 'login'
              ? 'Sign in to view orders and download purchased digital assets.'
              : 'Register to purchase via Razorpay and unlock lifetime downloads.'}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3.5 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Company / Studio (Optional)
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Meridian Labs"
                  className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
          >
            {submitting
              ? 'Authenticating...'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="border-t border-white/[0.08] pt-4 text-xs text-slate-400 space-y-2">
            <p className="font-medium text-slate-300">Quick Evaluation Credentials</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('alex.mercer@nexora.demo');
                  setPassword('Customer@123');
                }}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08] cursor-pointer"
              >
                Fill Customer Demo
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-blue-400 hover:bg-white/[0.08] cursor-pointer"
              >
                Go to Admin Login
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
