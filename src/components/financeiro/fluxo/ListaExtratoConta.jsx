import React from 'react';
import { Scale } from 'lucide-react';
import FinanceiroLancRow from './FinanceiroLancRow';
import { FinanceiroGrupo, FinanceiroListaEstado } from './FinanceiroListaShared';

export default function ListaExtratoConta({ grupos, loading, onRow }) {
  return (
    <FinanceiroListaEstado
      loading={loading}
      vazio={!loading && grupos.length === 0}
      vazioMensagem="Nenhuma movimentação no período"
      vazioIcon={Scale}
    >
      {grupos.map(({ k, label, items, totais }) => (
        <FinanceiroGrupo key={k} label={label} receitas={totais.r} despesas={totais.d}>
          {items.map((l, index) => (
            <FinanceiroLancRow
              key={l.id || `${k}-${index}`}
              l={l}
              striped={index % 2 === 1}
              dataField="pagamento"
              onClick={onRow}
            />
          ))}
        </FinanceiroGrupo>
      ))}
    </FinanceiroListaEstado>
  );
}
