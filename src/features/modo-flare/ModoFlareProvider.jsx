import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { ModoFlareContext } from '@/features/modo-flare/ModoFlareContext';
import FlareMobileEdge from '@/features/modo-flare/FlareMobileEdge';
import {
  isFlareUnlocked,
  setFlareUnlocked,
  validateFlarePin,
} from '@/features/modo-flare/flareSession';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ModoFlareInspection = React.lazy(() => import('@/features/modo-flare/ModoFlareInspection.jsx'));

export default function ModoFlareProvider({ children }) {
  const [pinOpen, setPinOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);

  const openFlare = useCallback(() => {
    if (isFlareUnlocked()) {
      setInspectionOpen(true);
      return;
    }
    setPinError(false);
    setPinValue('');
    setPinOpen(true);
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
      openFlare();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [openFlare]);

  const submitPin = useCallback(() => {
    if (validateFlarePin(pinValue)) {
      setFlareUnlocked();
      setPinOpen(false);
      setPinError(false);
      setPinValue('');
      setInspectionOpen(true);
    } else {
      setPinError(true);
    }
  }, [pinValue]);

  const ctx = useMemo(() => ({ openFlare }), [openFlare]);

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
              Modo Flare
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">Introduza a senha para abrir o modo inspeção.</p>
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
