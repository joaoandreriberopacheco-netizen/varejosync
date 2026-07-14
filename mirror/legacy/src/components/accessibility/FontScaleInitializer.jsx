import { useEffect } from 'react';
import { applyFontScale, getStoredFontScale } from '@/lib/fontScale';

export default function FontScaleInitializer() {
  useEffect(() => {
    applyFontScale(getStoredFontScale());
  }, []);

  return null;
}