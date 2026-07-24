import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowserClient';
import { safeAppReturnPath } from '@/lib/supabaseAuth';
import { Button } from '@/components/ui/button';

/**
 * Callback OAuth Supabase (Google). O Google redireciona para cá com `?code=…`.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAppState } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!cancelled) setError('Supabase não configurado neste ambiente.');
        return;
      }

      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exchangeError) throw exchangeError;

        await checkAppState();
        if (cancelled) return;

        const returnUrl = safeAppReturnPath(searchParams.get('returnUrl'));
        navigate(returnUrl, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Não foi possível concluir o login com Google.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkAppState, navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background">
        <p className="text-sm text-red-600 dark:text-red-400 text-center max-w-md" role="alert">
          {error}
        </p>
        <Button type="button" variant="outline" onClick={() => navigate('/login', { replace: true })}>
          Voltar ao login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      A concluir login com Google…
    </div>
  );
}
