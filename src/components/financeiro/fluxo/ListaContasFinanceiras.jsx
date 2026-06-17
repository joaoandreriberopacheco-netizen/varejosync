import React from 'react';
import { Wallet } from 'lucide-react';
import ContaFinanceiraRow from './ContaFinanceiraRow';
import { FinanceiroGrupo, FinanceiroListaEstado } from './FinanceiroListaShared';

function saldoConta(conta) {
  return Number(conta.saldo_atual ?? conta.saldo_inicial ?? 0);
}

export default function ListaContasFinanceiras({
  grupos,
  loading,
  pendenciasMap = {},
  onExtrato,
  onEdit,
  onConciliar,
}) {
  return (
    <FinanceiroListaEstado
      loading={loading}
      vazio={!loading && grupos.length === 0}
      vazioMensagem="Nenhuma conta encontrada"
      vazioIcon={Wallet}
    >
      {grupos.map(({ k, label, items }) => {
        const totalGrupo = items.reduce((acc, c) => acc + saldoConta(c), 0);
        const positivo = totalGrupo >= 0;

        return (
          <FinanceiroGrupo
            key={k}
            label={label}
            receitas={positivo ? totalGrupo : 0}
            despesas={positivo ? 0 : Math.abs(totalGrupo)}
            card
          >
            {items.map((conta, index) => (
              <ContaFinanceiraRow
                key={conta.id}
                conta={conta}
                pendencias={pendenciasMap[conta.id] || 0}
                striped={index % 2 === 1}
                onExtrato={onExtrato}
                onEdit={onEdit}
                onConciliar={onConciliar}
              />
            ))}
          </FinanceiroGrupo>
        );
      })}
    </FinanceiroListaEstado>
  );
}
