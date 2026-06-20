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
      {grupos.map(({ k, label, items, totais = {} }) => (
        <FinanceiroGrupo
          key={k}
          label={label}
          balancoDia
          receitas={totais.entrou ?? totais.r ?? 0}
          despesas={totais.saiu ?? totais.d ?? 0}
          liquido={totais.liquidoOperacional ?? totais.liquido ?? 0}
          saldoAcumulado={totais.saldoAcumulado}
        >
          {items.map((l, index) => (
            <FinanceiroLancRow key={l.id} l={l} onClick={onRow} striped={index % 2 === 1} />
          ))}
        </FinanceiroGrupo>
      ))}
    </FinanceiroListaEstado>
  );
}
