import React from 'react';
import { Scale } from 'lucide-react';
import FinanceiroLancRow from './FinanceiroLancRow';
import { FinanceiroGrupo, FinanceiroListaEstado } from './FinanceiroListaShared';

export default function ListaContasAbertas({
  grupos,
  loading,
  onRow,
  emSelecao = false,
  selecionarPagos = false,
  selecionados = [],
  onToggleSelecionado,
}) {
  return (
    <FinanceiroListaEstado
      loading={loading}
      vazio={!loading && grupos.length === 0}
      vazioMensagem="Nenhuma conta em aberto"
      vazioIcon={Scale}
    >
      {grupos.map(({ k, label, items, aReceberDia, aPagarDia, isVencido, isTreeBucket }) => (
        <FinanceiroGrupo
          key={k}
          label={label}
          variant={isVencido ? 'overdue' : 'default'}
          card={!!isTreeBucket}
          labelClassName={isVencido ? 'text-amber-600/90 dark:text-amber-400/90' : undefined}
          receitas={aReceberDia}
          despesas={aPagarDia}
        >
          {items.map((l, index) => (
            <FinanceiroLancRow
              key={l.id}
              l={l}
              striped={index % 2 === 1}
              dataField={selecionarPagos ? 'pagamento' : 'vencimento'}
              showPago
              onClick={onRow}
              emSelecao={emSelecao}
              selecionarPagos={selecionarPagos}
              selecionado={selecionados.includes(l.id)}
              onToggleSelecionado={onToggleSelecionado}
            />
          ))}
        </FinanceiroGrupo>
      ))}
    </FinanceiroListaEstado>
  );
}
