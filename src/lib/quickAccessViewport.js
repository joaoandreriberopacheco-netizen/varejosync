import { useEffect, useState } from 'react';

/** Bottom nav + atalhos globais existem abaixo de lg (1024px), incluindo tablet. */
export const QUICK_ACCESS_MAX_WIDTH = 1024;

export function isQuickAccessViewport(width = typeof window !== 'undefined' ? window.innerWidth : 0) {
  return width < QUICK_ACCESS_MAX_WIDTH;
}

export function useQuickAccessViewport() {
  const [visible, setVisible] = useState(() => isQuickAccessViewport());

  useEffect(() => {
    const handleResize = () => setVisible(isQuickAccessViewport());
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return visible;
}
