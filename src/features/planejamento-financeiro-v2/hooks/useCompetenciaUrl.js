import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCompetenciaAtual } from '@/lib/agefinPrevisaoCalculos';

const COMPETENCIA_RE = /^\d{4}-\d{2}$/;
const ABAS_VALIDAS = new Set(['contas', 'previsao', 'projecao']);

function abaInicialDosParams(searchParams) {
  const abaParam = searchParams.get('aba');
  if (abaParam && ABAS_VALIDAS.has(abaParam)) return abaParam;
  return 'previsao';
}

export function useCompetenciaUrl() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [competenciaMes, setCompetenciaMesState] = useState(
    () => {
      const comp = searchParams.get('competencia');
      return comp && COMPETENCIA_RE.test(comp) ? comp : getCompetenciaAtual();
    },
  );

  const [abaAtiva, setAbaAtivaState] = useState(() => abaInicialDosParams(searchParams));

  useEffect(() => {
    const comp = searchParams.get('competencia');
    if (comp && COMPETENCIA_RE.test(comp)) setCompetenciaMesState(comp);
    const abaParam = searchParams.get('aba');
    if (abaParam && ABAS_VALIDAS.has(abaParam)) setAbaAtivaState(abaParam);
    else if (comp && COMPETENCIA_RE.test(comp)) setAbaAtivaState('previsao');
  }, [searchParams]);

  const syncUrl = useCallback(
    (competencia, aba) => {
      const next = new URLSearchParams(searchParams);
      if (competencia) next.set('competencia', competencia);
      else next.delete('competencia');
      if (aba && aba !== 'previsao') next.set('aba', aba);
      else next.delete('aba');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setCompetenciaMes = useCallback(
    (value) => {
      const next = typeof value === 'function' ? value(competenciaMes) : value;
      setCompetenciaMesState(next);
      syncUrl(next, abaAtiva);
    },
    [competenciaMes, abaAtiva, syncUrl],
  );

  const setAbaAtiva = useCallback(
    (value) => {
      const next = typeof value === 'function' ? value(abaAtiva) : value;
      setAbaAtivaState(next);
      syncUrl(competenciaMes, next);
    },
    [abaAtiva, competenciaMes, syncUrl],
  );

  return { competenciaMes, setCompetenciaMes, abaAtiva, setAbaAtiva };
}
