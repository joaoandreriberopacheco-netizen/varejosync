import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, Search } from 'lucide-react';
import QuickBudgetPanel from './QuickBudgetPanel';

/** Acima de drawers/modais comuns (ex. z-310) para o atalho continuar acessível. */
const LAUNCHER_Z = 520;

export default function QuickBudgetLauncher() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startPointRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const launcher =
    isMobile &&
    !open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="pointer-events-none fixed left-0 p38-bottom-fab1"
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
          aria-label="Arraste para cima e para a direita para abrir o orçamento rápido"
        >
          <Search className="h-4 w-4" />
          <ChevronUp className="h-3 w-3 opacity-70" />
        </button>
      </div>,
      document.body
    );

  return (
    <>
      {launcher}
      <QuickBudgetPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
