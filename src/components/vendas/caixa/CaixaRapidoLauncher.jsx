import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { ChevronUp, Wallet } from 'lucide-react';
import { resolverPermissoes } from '@/components/config/usePermissoesResolvidas';
import { getCachedUserSession } from '@/lib/userSessionCache';
import { perfilResolvidoParaUsuario, usuarioLegadoSemMatrizPerfil } from '@/lib/perfilPermissoes';
import CaixaRapidoPanel from './CaixaRapidoPanel';

/** Acima de drawers/modais comuns; empilhado acima do orçamento rápido (mesmo z). */
const LAUNCHER_Z = 520;

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
  return useMemo(() => {
    if (location.pathname.includes('PDVCaixa')) return true;
    if (location.pathname.includes('PDV')) {
      const mode = new URLSearchParams(location.search).get('mode');
      if (mode === 'caixa') return true;
    }
    return false;
  }, [location.pathname, location.search]);
}

export default function CaixaRapidoLauncher() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startPointRef = useRef(null);
  const hideOnCaixaPage = useHideOnCaixaPage();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    isMobile &&
    !open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="pointer-events-none fixed left-0 p38-bottom-fab2"
        style={{
          zIndex: LAUNCHER_Z,
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
          className="pointer-events-auto flex h-16 w-9 select-none flex-col items-center justify-center gap-1 rounded-r-2xl border border-border/40/80 bg-white/95 text-muted-foreground shadow-lg backdrop-blur-sm dark:border-border/40/80 dark:bg-background/95 dark:text-muted-foreground touch-pan-x"
          aria-label="Arraste para cima e para a direita para abrir o caixa rápido"
        >
          <Wallet className="h-4 w-4" />
          <ChevronUp className="h-3 w-3 opacity-70" />
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
