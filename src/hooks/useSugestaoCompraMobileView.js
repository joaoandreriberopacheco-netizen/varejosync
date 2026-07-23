import { useCallback, useMemo, useState } from 'react';
import { useIsPhone, useViewport } from '@/hooks/use-breakpoint';

/**
 * Modo mobile da sugestão de compra:
 * - retrato (telefone): cartões compactos; sugere girar ou abrir tabela
 * - paisagem (telefone): tabela horizontal para comparar colunas
 */
export function useSugestaoCompraMobileView() {
  const { width, height } = useViewport();
  const isPhone = useIsPhone();
  const [manualMode, setManualMode] = useState(null);

  const isLandscape = width > height;

  const autoMode = useMemo(() => {
    if (!isPhone) return 'cards';
    return isLandscape ? 'table' : 'cards';
  }, [isPhone, isLandscape]);

  const viewMode = manualMode ?? autoMode;

  const showRotateHint = isPhone && !isLandscape && viewMode === 'cards';

  const setViewMode = useCallback((mode) => {
    setManualMode(mode === 'auto' ? null : mode);
  }, []);

  const resetToAuto = useCallback(() => setManualMode(null), []);

  return {
    isPhone,
    isLandscape,
    viewMode,
    autoMode,
    showRotateHint,
    setViewMode,
    resetToAuto,
    isManual: manualMode != null,
  };
}
