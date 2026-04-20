import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { ModoFlareContext } from '@/features/modo-flare/ModoFlareContext';
import FlareMobileEdge from '@/features/modo-flare/FlareMobileEdge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ModoFlareInspection = React.lazy(() => import('@/features/modo-flare/ModoFlareInspection.jsx'));

const FLARE_PIN = '240793';
const FLARE_UNLOCK_KEY = 'p38_flare_unlock_v2';
const FLARE_UNLOCK_TTL_MS = 8 * 60 * 60 * 1000;

function isUnlockStillValid() {
  try {
    const raw = sessionStorage.getItem(FLARE_UNLOCK_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return typeof parsed?.ts === 'number' && Date.now() - parsed.ts < FLARE_UNLOCK_TTL_MS;
  } catch {
    return false;
  }
}

function markUnlock() {
  try {
    sessionStorage.setItem(FLARE_UNLOCK_KEY, JSON.stringify({ ts: Date.now() }));
  } catch {
    // noop
  }
}

export default function ModoFlareProvider({ children }) {
  const [pinOpen, setPinOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);

  const openFlare = useCallback(() => {
    window.dispatchEvent(new CustomEvent('p38:close-catalog-overlay'));
    if (isUnlockStillValid()) {
      setInspectionOpen(true);
      return;
    }
    setPinError(false);
    setPinValue('');
    setPinOpen(true);
  }, []);

  const openCatalog = useCallback(() => {
    window.dispatchEvent(new CustomEvent('p38:open-catalog-overlay'));
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if (!e.ctrlKey || !e.altKey) return;
      if (e.key !== 'b' && e.key !== 'B') return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      openCatalog();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [openCatalog]);

  const submitPin = useCallback(() => {
    if (String(pinValue).trim() === FLARE_PIN) {
      window.dispatchEvent(new CustomEvent('p38:close-catalog-overlay'));
      markUnlock();
      setPinOpen(false);
      setPinError(false);
      setPinValue('');
      setInspectionOpen(true);
    } else {
      setPinError(true);
    }
  }, [pinValue]);

  const ctx = useMemo(() => ({ openFlare, openCatalog }), [openCatalog, openFlare]);

  return (
    <ModoFlareContext.Provider value={ctx}>
      {children}
      <FlareMobileEdge />
      {pinOpen ? (
        <div
          className="fixed inset-0 z-[10055] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="flare-pin-title"
        >
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-xl">
            <h2 id="flare-pin-title" className="mb-2 text-lg font-semibold">
              Marcar melhorias
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Introduza a senha da equipa para abrir o modo de marcação (Flare).
            </p>
            <Input
              type="password"
              autoComplete="off"
              value={pinValue}
              onChange={(e) => {
                setPinValue(e.target.value);
                setPinError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitPin();
              }}
              className={pinError ? 'border-destructive' : ''}
              placeholder="Senha"
            />
            {pinError ? <p className="mt-2 text-sm text-destructive">Senha incorreta.</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPinOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={submitPin}>
                Entrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {inspectionOpen ? (
        <Suspense fallback={null}>
          <ModoFlareInspection onClose={() => setInspectionOpen(false)} />
        </Suspense>
      ) : null}
    </ModoFlareContext.Provider>
  );
}
