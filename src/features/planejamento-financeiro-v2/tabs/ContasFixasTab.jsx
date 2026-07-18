import { useMemo } from 'react';
import { Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import { FinanceiroListaEstado } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import AgefinContasFixasGrupos from '@/components/agefin-previsao/AgefinContasFixasGrupos';
import AgefinConsultaOrganizer from '@/components/agefin/AgefinConsultaOrganizer';
import {
  agruparSeriesPorFrequenciaEGrupo,
  ordenarSeriesPorCentroENome,
} from '@/lib/agefinPrevisaoCalculos';

export default function ContasFixasTab({
  loading,
  modelos,
  centrosRegistrados,
  groupBy,
  sortOrder,
  onGroupByChange,
  onSortOrderToggle,
  draggingSerieId,
  dropCentroAtual,
  onDragStart,
  onDragEnd,
  onHoverCentro,
  onLeaveCentro,
  onDropCentro,
  onEdit,
  onDelete,
  onCadastrar,
}) {
  const seriesAtivas = useMemo(
    () => ordenarSeriesPorCentroENome(modelos.filter((m) => m.ativo !== false)),
    [modelos],
  );

  const agrupamento = useMemo(
    () =>
      agruparSeriesPorFrequenciaEGrupo(seriesAtivas, {
        centrosRegistrados,
        groupBy,
        sortOrder,
      }),
    [seriesAtivas, centrosRegistrados, groupBy, sortOrder],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <P38HelpPopover label="Ajuda: contas fixas" side="bottom" align="start">
          <p className="font-medium text-foreground">Cadastro de templates recorrentes</p>
          <p className="text-muted-foreground">
            Aqui cadastra-se o <strong className="text-foreground">modelo</strong> das contas que se renovam:
            energia, telefone, aluguel, etc. — com frequência mensal, bimestral, trimestral, semestral ou anual.
          </p>
          <p className="text-muted-foreground mt-2">
            Fretes e despesas avulsas <strong className="text-foreground">não entram aqui</strong>; aparecem na
            AGEFIN Consulta conforme o vencimento de cada lançamento no financeiro.
          </p>
          <p className="text-muted-foreground mt-2">
            Ao salvar um template, o sistema cria ou atualiza os lançamentos em aberto no financeiro — é essa
            base que a AGEFIN lê.
          </p>
        </P38HelpPopover>
        <AgefinConsultaOrganizer
          variant="contasFixas"
          groupBy={groupBy}
          sortOrder={sortOrder}
          onGroupByChange={onGroupByChange}
          onSortOrderToggle={onSortOrderToggle}
        />
      </div>

      <FinanceiroListaEstado
        loading={loading}
        vazio={!loading && seriesAtivas.length === 0}
        vazioMensagem="Nenhum template de conta recorrente cadastrado."
        vazioIcon={Repeat2}
      >
        <AgefinContasFixasGrupos
          agrupamento={agrupamento}
          groupBy={groupBy}
          draggingSerieId={draggingSerieId}
          dropCentroAtual={dropCentroAtual}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onHoverCentro={onHoverCentro}
          onLeaveCentro={onLeaveCentro}
          onDropCentro={onDropCentro}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </FinanceiroListaEstado>

      {!loading && seriesAtivas.length === 0 && (
        <div className="flex justify-center -mt-6 pb-4">
          <Button variant="outline" onClick={onCadastrar}>
            Cadastrar conta fixa
          </Button>
        </div>
      )}
    </div>
  );
}
