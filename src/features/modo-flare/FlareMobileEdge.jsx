import React, { useCallback, useRef } from 'react';
import { Flag } from 'lucide-react';
import { useModoFlare } from '@/features/modo-flare/ModoFlareContext';

const DOWN_MIN = 44;
const LEFT_MIN = 44;

export default function FlareMobileEdge() {
  const { openFlare } = useModoFlare();
  const longPressTimer = useRef(null);
  const startRef = useRef(null);
  const phaseRef = useRef('idle');

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e) => {
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY };
      phaseRef.current = 'idle';
      clearLongPress();
      longPressTimer.current = window.setTimeout(() => {
        longPressTimer.current = null;
        openFlare();
      }, 650);
    },
    [clearLongPress, openFlare]
  );

  const onTouchMove = useCallback(
    (e) => {
      if (!startRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;

      if (phaseRef.current === 'idle' && dy > DOWN_MIN && Math.abs(dx) < 28) {
        phaseRef.current = 'down';
        clearLongPress();
      } else if (phaseRef.current === 'down' && dx < -LEFT_MIN && dy > 12) {
        phaseRef.current = 'done';
        clearLongPress();
        openFlare();
        startRef.current = null;
        phaseRef.current = 'idle';
      }
    },
    [clearLongPress, openFlare]
  );

  const onTouchEnd = useCallback(() => {
    clearLongPress();
    startRef.current = null;
    phaseRef.current = 'idle';
  }, [clearLongPress]);

  return (
    <div
      className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[10040] flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground shadow-sm backdrop-blur-sm opacity-65 transition-opacity hover:opacity-90 active:opacity-100 dark:bg-muted/85 dark:text-muted-foreground desktop-layout:hidden"
      style={{ touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openFlare();
      }}
      title="Marcar melhorias"
      aria-hidden
    >
      <Flag className="h-4 w-4" strokeWidth={1.75} />
    </div>
  );
}
