import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, Search } from 'lucide-react';
import QuickBudgetPanel from './QuickBudgetPanel';

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

  return (
    <>
      {isMobile && (
        <div
          className="fixed left-0 z-[250] p38-bottom-fab1"
          style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`, transition: dragging ? 'none' : 'transform 180ms ease-out' }}
        >
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={resetDrag}
            className="h-16 w-9 rounded-r-2xl bg-white/92 dark:bg-gray-900/92 shadow-lg backdrop-blur-sm flex flex-col items-center justify-center gap-1 text-gray-500 select-none touch-pan-x"
            aria-label="Arraste para abrir orçamento rápido"
          >
            <Search className="w-4 h-4" />
            <ChevronUp className="w-3 h-3 opacity-70" />
          </button>
        </div>
      )}

      <QuickBudgetPanel open={open} onOpenChange={setOpen} />
    </>
  );
}