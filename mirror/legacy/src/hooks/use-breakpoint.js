import * as React from 'react';

/** Smartphone estreito: sempre layout mobile. */
export const PHONE_MAX = 767;
/** Largura mínima típica de tablet. */
export const TABLET_MIN = 768;
/** Desktop por largura (monitor / tablet paisagem largo). */
export const DESKTOP_MIN = 1024;

function isPortrait(width, height) {
  return height > width;
}

/**
 * Layout de conteúdo/shell:
 * - mobile: telemóvel OU tablet em retrato (vertical)
 * - desktop: largura ≥1024 OU tablet em paisagem (horizontal)
 */
export function resolveViewportLayout(width, height) {
  if (width >= DESKTOP_MIN) return 'desktop';
  if (width < TABLET_MIN) return 'mobile';
  return isPortrait(width, height) ? 'mobile' : 'desktop';
}

/** Legado: phone | tablet | desktop por largura só. */
function resolveBreakpoint(width) {
  if (width < TABLET_MIN) return 'phone';
  if (width < DESKTOP_MIN) return 'tablet';
  return 'desktop';
}

function readViewport() {
  if (typeof window === 'undefined') {
    return { width: DESKTOP_MIN, height: DESKTOP_MIN, layout: 'desktop', breakpoint: 'desktop' };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    layout: resolveViewportLayout(width, height),
    breakpoint: resolveBreakpoint(width),
  };
}

/**
 * Hook reativo — atualiza em resize e rotação.
 * `layout`: 'mobile' | 'desktop' (orientação + largura)
 * `breakpoint`: 'phone' | 'tablet' | 'desktop' (só largura)
 */
export function useViewport() {
  const [viewport, setViewport] = React.useState(readViewport);

  React.useEffect(() => {
    const onChange = () => setViewport(readViewport());

    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    const portraitMq = window.matchMedia('(orientation: portrait)');
    const landscapeMq = window.matchMedia('(orientation: landscape)');
    portraitMq.addEventListener('change', onChange);
    landscapeMq.addEventListener('change', onChange);

    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
      portraitMq.removeEventListener('change', onChange);
      landscapeMq.removeEventListener('change', onChange);
    };
  }, []);

  return viewport;
}

/** @deprecated Preferir useViewport().layout */
export function useBreakpoint() {
  return useViewport().breakpoint;
}

/** Shell mobile: bottom nav, padding sob menu — telemóvel + tablet retrato. */
export function useCompactShell() {
  return useViewport().layout === 'mobile';
}

/** Conteúdo denso: tabelas, TreeGrid — desktop + tablet paisagem. */
export function useDesktopContent() {
  return useViewport().layout === 'desktop';
}

/** Alias semântico: layout mobile (inclui tablet vertical). */
export function useMobileLayout() {
  return useCompactShell();
}

/** true em smartphone estreito (<768px). */
export function useIsPhone() {
  return useViewport().breakpoint === 'phone';
}

/** true em tablet por largura (768–1023), qualquer orientação. */
export function useIsTablet() {
  return useViewport().breakpoint === 'tablet';
}

/** true quando largura ≥1024 (independente de orientação). */
export function useIsDesktop() {
  return useViewport().breakpoint === 'desktop';
}
