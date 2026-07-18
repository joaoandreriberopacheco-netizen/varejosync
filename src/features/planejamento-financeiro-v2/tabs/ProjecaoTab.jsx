import { FinanceiroListaEstado } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { TrendingUp } from 'lucide-react';
import AgefinPrevisaoProjecao from '@/components/agefin-previsao/AgefinPrevisaoProjecao';

export default function ProjecaoTab({
  loading,
  modelos,
  competenciaMes,
  lancamentosRecorrentes,
}) {
  return (
    <FinanceiroListaEstado
      loading={loading}
      vazio={!loading && modelos.filter((m) => m.ativo !== false).length === 0}
      vazioMensagem="Cadastre contas fixas para ver a projeção de 12 meses."
      vazioIcon={TrendingUp}
    >
      <AgefinPrevisaoProjecao
        modelos={modelos}
        competenciaInicio={competenciaMes}
        lancamentos={lancamentosRecorrentes}
      />
    </FinanceiroListaEstado>
  );
}
