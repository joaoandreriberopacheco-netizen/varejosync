import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { ChevronUp, Wallet } from 'lucide-react';
import { resolverPermissoes } from '@/components/config/usePermissoesResolvidas';
import { getCachedUserSession } from '@/lib/userSessionCache';
import { perfilResolvidoParaUsuario, usuarioLegadoSemMatrizPerfil } from '@/lib/perfilPermissoes';
import { QUICK_ACCESS_Z } from '@/lib/quickAccessOverlay';
import { shouldHideQuickAccessLaunchers } from '@/lib/caixaQuickAccessHide';
import { useQuickAccessViewport } from '@/lib/quickAccessViewport';
import CaixaRapidoPanel from './CaixaRapidoPanel';

function userCanAccessCaixa(user, perfilDeAcesso) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (usuarioLegadoSemMatrizPerfil(user)) return true;
  const perfil = perfilResolvidoParaUsuario(user, perfilDeAcesso);
  const permissoes = resolverPermissoes(perfil, user?.override_permissoes);
  return !!(permissoes?.pdv?.acesso_caixa || permissoes?.financeiro?.acesso);
}

function useHideOnCaixaPage() {
  const location = useLocation();
  return useMemo(
    () => shouldHideQuickAccessLaunchers(location.pathname, location.search),
    [location.pathname, location.search]
  );
}

export default function CaixaRapidoLauncher() {
  const [open, setOpen] = useState(false);
  const showInViewport = useQuickAccessViewport();
  const [canAccess, setCanAccess] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startPointRef = useRef(null);
  const hideOnCaixaPage = useHideOnCaixaPage();

  useEffect(() => {
    let cancelled = false;
    const refreshAccess = () => {
      if (cancelled) return;
      const cached = getCachedUserSession();
      setCanAccess(userCanAccessCaixa(cached?.user, cached?.perfilDeAcesso));
    };
    refreshAccess();
    const intervalId = window.setInterval(refreshAccess, 1500);
    const stopId = window.setTimeout(() => window.clearInterval(intervalId), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(stopId);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!canAccess || hideOnCaixaPage) return;
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canAccess, hideOnCaixaPage]);

  const resetDrag = () => {
    setDragOffset({ x: 0, y: 0 });
    setDragging(false);
    startPointRef.current = null;
  };

  const handlePointerDown = (event) => {
    startPointRef.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const handlePointerMove = (event) => {
    if (!startPointRef.current) return;
    const deltaX = Math.max(0, Math.min(event.clientX - startPointRef.current.x, 56));
    const deltaY = Math.min(0, Math.max(event.clientY - startPointRef.current.y, -56));
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handlePointerUp = () => {
    if (dragOffset.x >= 20 && dragOffset.y <= -20) {
      setOpen(true);
    }
    resetDrag();
  };

  const showLauncher = canAccess && !hideOnCaixaPage;

  const launcher =
    showLauncher &&
    showInViewport &&
    !open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="pointer-events-none fixed left-0 p38-quick-access-launcher2"
        style={{
          zIndex: QUICK_ACCESS_Z.launcher,
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
        }}
      >
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetDrag}
          className="pointer-events-auto flex h-11 w-7 select-none flex-col items-center justify-center gap-0.5 rounded-r-xl border border-border/25 bg-background/70 text-muted-foreground/55 shadow-sm backdrop-blur-sm opacity-85 active:opacity-100 dark:border-border/20 dark:bg-background/65 dark:text-muted-foreground/50 touch-pan-x"
          aria-label="Arraste para cima e para a direita para abrir o caixa rápido"
        >
          <Wallet className="h-3.5 w-3.5" />
          <ChevronUp className="h-2.5 w-2.5 opacity-45" />
        </button>
      </div>,
      document.body
    );

  if (!showLauncher && !open) return null;

  return (
    <>
      {launcher}
      <CaixaRapidoPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
