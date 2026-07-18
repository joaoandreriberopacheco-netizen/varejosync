import { Link } from 'react-router-dom';
import { FinanceiroListaEstado } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import AgefinPrevisaoProjecao from '@/components/agefin-previsao/AgefinPrevisaoProjecao';
import { buildNovoLancamentoDespesaUrl } from '../constants/atalhos';

export default function ProjecaoTab({
  loading,
  modelos,
  competenciaMes,
  lancamentosRecorrentes,
}) {
  const semModelos = !loading && modelos.filter((m) => m.ativo !== false).length === 0;
  const novoLancamentoUrl = buildNovoLancamentoDespesaUrl();

  return (
    <div className="space-y-3">
      <FinanceiroListaEstado
        loading={loading}
        vazio={semModelos}
        vazioMensagem="Cadastre despesas recorrentes no Financeiro para ver a projeção de 12 meses."
        vazioIcon={TrendingUp}
      >
        <AgefinPrevisaoProjecao
          modelos={modelos}
          competenciaInicio={competenciaMes}
          lancamentos={lancamentosRecorrentes}
        />
      </FinanceiroListaEstado>

      {semModelos && (
        <div className="flex justify-center -mt-6 pb-4">
          <Button variant="outline" asChild>
            <Link to={novoLancamentoUrl}>Novo lançamento financeiro</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
