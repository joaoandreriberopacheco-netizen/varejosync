import { useCallback, useRef, useEffect } from 'react';

const CACHE_KEY = 'p38_permissoes_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function usePermissoesCache() {
  const cacheRef = useRef(null);

  const getFromCache = useCallback((userId) => {
    if (!cacheRef.current) {
      try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
          cacheRef.current = JSON.parse(stored);
        } else {
          cacheRef.current = {};
        }
      } catch {
        cacheRef.current = {};
      }
    }

    const cached = cacheRef.current[userId];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }, []);

  const setInCache = useCallback((userId, data) => {
    if (!cacheRef.current) {
      cacheRef.current = {};
    }
    
    cacheRef.current[userId] = {
      data,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheRef.current));
    } catch {
      // Silenciosamente falha se localStorage estiver cheio
    }
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // Falha silenciosa
    }
  }, []);

  // Limpar cache expirado periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (cacheRef.current) {
        const now = Date.now();
        Object.keys(cacheRef.current).forEach(key => {
          if (now - cacheRef.current[key].timestamp > CACHE_TTL) {
            delete cacheRef.current[key];
          }
        });
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheRef.current));
        } catch {
          // Falha silenciosa
        }
      }
    }, 60000); // Verificar a cada minuto

    return () => clearInterval(interval);
  }, []);

  return { getFromCache, setInCache, clearCache };
}