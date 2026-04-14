import React, { useCallback, useRef } from 'react';
import { Flag } from 'lucide-react';
import { useModoFlare } from '@/features/modo-flare/ModoFlareContext';

const UP_MIN = 44;
const LEFT_MIN = 44;

/**
 * Faixa lateral esquerda: toque longo abre o Flare; gesto em L (cima depois esquerda) também.
 */
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

      if (phaseRef.current === 'idle' && dy < -UP_MIN && Math.abs(dx) < 28) {
        phaseRef.current = 'up';
        clearLongPress();
      } else if (phaseRef.current === 'up' && dx < -LEFT_MIN && dy < 20) {
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
      className="fixed left-0 top-[28%] z-[10040] flex h-40 w-9 items-center justify-center rounded-r-md bg-amber-950/25 opacity-40 hover:opacity-70 lg:hidden"
      style={{ touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      aria-hidden
    >
      <Flag className="h-5 w-5 text-amber-200" strokeWidth={1.5} />
    </div>
  );
}
