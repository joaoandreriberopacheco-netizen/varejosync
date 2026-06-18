import React from 'react';
import { Scale } from 'lucide-react';
import FinanceiroLancRow from './FinanceiroLancRow';
import { FinanceiroGrupo, FinanceiroListaEstado } from './FinanceiroListaShared';

export default function ListaLancamentos({ grupos, loading, onRow }) {
  return (
    <FinanceiroListaEstado
      loading={loading}
      vazio={!loading && grupos.length === 0}
      vazioMensagem="Nenhum lançamento encontrado"
      vazioIcon={Scale}
    >
      {grupos.map(({ k, label, items, totais }) => (
        <FinanceiroGrupo key={k} label={label} receitas={totais.r} despesas={totais.d} liquido={totais.liquido}>
          {items.map((l, index) => (
            <FinanceiroLancRow key={l.id} l={l} onClick={onRow} striped={index % 2 === 1} />
          ))}
        </FinanceiroGrupo>
      ))}
    </FinanceiroListaEstado>
  );
}
