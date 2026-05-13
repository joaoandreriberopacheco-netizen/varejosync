import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Login local (Supabase) quando `VITE_P38_USE_SUPABASE_AUTH=true`.
 * Rota explícita `/login` — não entra em `pages.config.js` para não duplicar URLs.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAppState } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const safeReturnPath = () => {
    const raw = searchParams.get('returnUrl') || '/';
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
    return raw;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await base44.auth.login({ email: email.trim(), password });
      await checkAppState();
      navigate(safeReturnPath(), { replace: true });
    } catch (err) {
      setError(err?.message || 'Falha ao iniciar sessão.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
      >
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Entrar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sessão Supabase (modo P38).</p>
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Palavra-passe</label>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'A entrar…' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
