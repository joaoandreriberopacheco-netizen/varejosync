import * as React from 'react';

/** Smartphone: layout com bottom nav e listas touch. */
export const PHONE_MAX = 767;
/** Tablet: sidebar + listas touch (sem tabelas densas). */
export const TABLET_MIN = 768;
/** Desktop: tabelas densas e shell completo. */
export const DESKTOP_MIN = 1024;

function resolveBreakpoint(width) {
  if (width < TABLET_MIN) return 'phone';
  if (width < DESKTOP_MIN) return 'tablet';
  return 'desktop';
}

/**
 * Breakpoints P38: phone (<768) · tablet (768–1023) · desktop (≥1024).
 * Alinha shell (sidebar) com conteúdo (listas vs tabelas).
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState(() =>
    typeof window !== 'undefined' ? resolveBreakpoint(window.innerWidth) : 'desktop'
  );

  React.useEffect(() => {
    const mqlPhone = window.matchMedia(`(max-width: ${PHONE_MAX}px)`);
    const mqlDesktop = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);

    const onChange = () => {
      setBreakpoint(resolveBreakpoint(window.innerWidth));
    };

    mqlPhone.addEventListener('change', onChange);
    mqlDesktop.addEventListener('change', onChange);
    onChange();

    return () => {
      mqlPhone.removeEventListener('change', onChange);
      mqlDesktop.removeEventListener('change', onChange);
    };
  }, []);

  return breakpoint;
}

/** true em smartphone (<768px) — bottom nav, padding sob menu. */
export function useIsPhone() {
  const bp = useBreakpoint();
  return bp === 'phone';
}

/** true em tablet (768–1023px). */
export function useIsTablet() {
  const bp = useBreakpoint();
  return bp === 'tablet';
}

/** true em desktop (≥1024px) — tabelas densas. */
export function useIsDesktop() {
  const bp = useBreakpoint();
  return bp === 'desktop';
}
