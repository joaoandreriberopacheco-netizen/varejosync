import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FINANCEIRO_GATE_ENABLED, financeiroGatePasswordMatches } from '@/config/financeiroGate';
import {
  authenticateFinanceiroBiometric,
  hasFinanceiroBiometricEnrollment,
  isPlatformAuthenticatorAvailable,
  registerFinanceiroBiometric,
} from '@/lib/financeiroBiometria';
import { isFinanceiroUnlockValid, markFinanceiroUnlock } from '@/lib/financeiroUnlock';

/**
 * Cadeado do módulo Financeiro — senha compartilhada + biometria opcional no aparelho.
 * Desbloqueio válido 15 min (sessionStorage) ou até fechar o navegador/app.
 */
export default function FinanceiroAccessGuard({ children }) {
  const [unlocked, setUnlocked] = useState(() => !FINANCEIRO_GATE_ENABLED || isFinanceiroUnlockValid());
  const [step, setStep] = useState('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const autoBiometricTried = useRef(false);

  const completeUnlock = useCallback((options = {}) => {
    markFinanceiroUnlock();
    setUnlocked(true);
    setError('');
    setPassword('');
    if (options.offerBiometric) {
      setStep('offer-biometric');
    }
  }, []);

  const tryBiometricUnlock = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const ok = await authenticateFinanceiroBiometric();
      if (ok) {
        completeUnlock();
        return true;
      }
      setError('Biometria não reconhecida. Use a senha.');
      setStep('password');
      return false;
    } catch {
      setError('Não foi possível usar a biometria. Use a senha.');
      setStep('password');
      return false;
    } finally {
      setLoading(false);
    }
  }, [completeUnlock]);

  useEffect(() => {
    if (!FINANCEIRO_GATE_ENABLED || unlocked) return undefined;

    let cancelled = false;

    (async () => {
      if (isFinanceiroUnlockValid()) {
        setUnlocked(true);
        return;
      }

      const platformOk = await isPlatformAuthenticatorAvailable();
      if (cancelled) return;
      setBiometricAvailable(platformOk);

      if (platformOk && hasFinanceiroBiometricEnrollment() && !autoBiometricTried.current) {
        autoBiometricTried.current = true;
        setStep('biometric');
        await tryBiometricUnlock();
        return;
      }

      setStep('password');
    })();

    return () => {
      cancelled = true;
    };
  }, [unlocked, tryBiometricUnlock]);

  const handlePasswordSubmit = async (event) => {
    event?.preventDefault();
    setError('');

    if (!financeiroGatePasswordMatches(password)) {
      setError('Senha incorreta.');
      setPassword('');
      return;
    }

    setLoading(true);
    try {
      const canOfferBiometric =
        biometricAvailable
        || (await isPlatformAuthenticatorAvailable());

      setBiometricAvailable(canOfferBiometric);

      if (canOfferBiometric && !hasFinanceiroBiometricEnrollment()) {
        completeUnlock({ offerBiometric: true });
      } else {
        completeUnlock();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    setLoading(true);
    setError('');
    try {
      await registerFinanceiroBiometric();
      setStep('unlocked');
    } catch (err) {
      setError(err?.message || 'Não foi possível ativar a biometria.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipBiometric = () => {
    setStep('unlocked');
  };

  if (!FINANCEIRO_GATE_ENABLED || unlocked) {
    if (step === 'offer-biometric') {
      return (
        <>
          {children}
          <div
            className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="financeiro-bio-title"
          >
            <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-card p-6 shadow-xl">
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <Fingerprint className="h-7 w-7 text-foreground/80" />
                </div>
              </div>
              <h2 id="financeiro-bio-title" className="text-center text-lg font-semibold text-foreground font-glacial">
                Usar biometria neste aparelho?
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Nas próximas vezes, desbloqueie o Financeiro com digital ou Face ID — como no app do banco.
              </p>
              {error ? <p className="mt-3 text-center text-sm text-destructive">{error}</p> : null}
              <div className="mt-5 flex flex-col gap-2">
                <Button type="button" onClick={handleEnableBiometric} disabled={loading} className="w-full">
                  {loading ? 'Ativando…' : 'Ativar biometria'}
                </Button>
                <Button type="button" variant="ghost" onClick={handleSkipBiometric} disabled={loading} className="w-full">
                  Agora não
                </Button>
              </div>
            </div>
          </div>
        </>
      );
    }
    return children;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            {step === 'biometric' ? (
              <Fingerprint className="h-7 w-7 text-foreground/80" />
            ) : (
              <Shield className="h-7 w-7 text-foreground/80" />
            )}
          </div>
        </div>

        <h1 className="text-center text-lg font-semibold text-foreground font-glacial">
          Financeiro protegido
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {step === 'biometric'
            ? 'Confirme com biometria para continuar'
            : 'Digite a senha do Financeiro para continuar'}
        </p>

        {step === 'checking' || step === 'biometric' ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-4 text-sm text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
            {step === 'biometric' ? 'Aguardando biometria…' : 'Verificando…'}
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="financeiro-gate-password" className="sr-only">
                Senha do Financeiro
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="financeiro-gate-password"
                  type="password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Senha"
                  className="h-11 pl-9"
                  autoFocus
                />
              </div>
            </div>

            {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={loading || !password.trim()}>
              {loading ? 'Verificando…' : 'Entrar'}
            </Button>

            {biometricAvailable && hasFinanceiroBiometricEnrollment() ? (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={loading}
                onClick={tryBiometricUnlock}
              >
                <Fingerprint className="h-4 w-4" />
                Usar biometria
              </Button>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
