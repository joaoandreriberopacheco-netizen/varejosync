import { FinanceiroListaEstado } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import AgefinPrevisaoProjecao from '@/components/agefin-previsao/AgefinPrevisaoProjecao';

export default function ProjecaoTab({
  loading,
  modelos,
  competenciaMes,
  lancamentosRecorrentes,
  onNovoLancamento,
}) {
  const semModelos = !loading && modelos.filter((m) => m.ativo !== false).length === 0;

  return (
    <div className="space-y-3">
      <FinanceiroListaEstado
        loading={loading}
        vazio={semModelos}
        vazioMensagem="Cadastre despesas recorrentes pelo botão + para ver a projeção de 12 meses."
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
          <Button variant="outline" onClick={onNovoLancamento}>
            Novo lançamento financeiro
          </Button>
        </div>
      )}
    </div>
  );
}
