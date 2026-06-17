import React from 'react';
import { Wallet } from 'lucide-react';
import ContaFinanceiraRow from './ContaFinanceiraRow';
import { FinanceiroGrupo, FinanceiroListaEstado } from './FinanceiroListaShared';
import { getSaldoExibicaoConta } from '@/lib/saldoContaFinanceira';

export default function ListaContasFinanceiras({
  grupos,
  loading,
  pendenciasMap = {},
  saldosCalculados = {},
  onExtrato,
  onEdit,
  onAjuste,
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
        const totalGrupo = items.reduce(
          (acc, c) => acc + getSaldoExibicaoConta(c, saldosCalculados),
          0,
        );
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
                saldosCalculados={saldosCalculados}
                striped={index % 2 === 1}
                onExtrato={onExtrato}
                onEdit={onEdit}
                onAjuste={onAjuste}
                onConciliar={onConciliar}
              />
            ))}
          </FinanceiroGrupo>
        );
      })}
    </FinanceiroListaEstado>
  );
}
