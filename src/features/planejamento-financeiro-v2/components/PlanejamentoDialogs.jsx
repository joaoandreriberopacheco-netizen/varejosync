import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AgefinPrevisaoDetalheDrawer from '@/components/agefin-previsao/AgefinPrevisaoDetalheDrawer';
import AgefinParcelamentoDialog from '@/components/agefin-previsao/AgefinParcelamentoDialog';
import FolhaCentrosCustoDialog from '@/components/folha-previsao/FolhaCentrosCustoDialog';
import AgefinImportador from '@/components/agefin/AgefinImportador';
import { buildNovoLancamentoDespesaUrl } from '../constants/atalhos';

export function PlanejamentoFab({ onCentros, onImportar }) {
  const [fabOpen, setFabOpen] = useState(false);
  const novoLancamentoUrl = buildNovoLancamentoDespesaUrl();

  return (
    <div className="fixed right-4 z-[55] bottom-[calc(var(--p38-bottom-nav-h,0px)+1rem)] lg:bottom-8 lg:right-8">
      {fabOpen && (
        <div className="mb-2 flex flex-col items-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full shadow-md"
            onClick={() => {
              setFabOpen(false);
              onCentros();
            }}
          >
            Centros de custo
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full shadow-md"
            onClick={() => {
              setFabOpen(false);
              onImportar();
            }}
          >
            Importar conta (PDF)
          </Button>
          <Button size="sm" className="rounded-full shadow-md" asChild>
            <Link to={novoLancamentoUrl} onClick={() => setFabOpen(false)}>
              Novo lançamento financeiro
            </Link>
          </Button>
        </div>
      )}
      <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => setFabOpen((v) => !v)}>
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

export default function PlanejamentoDialogs({
  selectedComp,
  selectedModelo,
  onCloseSelected,
  parcelamentoDialog,
  onCloseParcelamentoDialog,
  onCriarParcelamento,
  salvandoParcelamento,
  centroDialogOpen,
  onCloseCentroDialog,
  onCentrosChanged,
  showImportador,
  onCloseImportador,
  importadorLancamentoId,
  onImportadorSuccess,
  syncing,
  onSyncFinanceiro,
  onAbrirSerieNoMes,
  abrindoMes,
  onVincularBoleto,
  onSalvarManual,
  salvandoManual,
  podeParcelarConta,
  onParcelar,
  onSalvarParcela,
  onRemoverParcelamento,
  removendoParcelamento,
}) {
  return (
    <>
      <AgefinPrevisaoDetalheDrawer
        open={Boolean(selectedComp)}
        onClose={onCloseSelected}
        competencia={selectedComp}
        modelo={selectedModelo}
        onSyncFinanceiro={onSyncFinanceiro}
        syncing={syncing}
        onAbrirMes={onAbrirSerieNoMes}
        abrindoMes={abrindoMes}
        onVincularBoleto={onVincularBoleto}
        onSalvarManual={onSalvarManual}
        salvandoManual={salvandoManual}
        onParcelar={podeParcelarConta ? onParcelar : undefined}
        onSalvarParcela={onSalvarParcela}
        onRemoverParcelamento={onRemoverParcelamento}
        removendoParcelamento={removendoParcelamento}
      />

      <AgefinParcelamentoDialog
        open={parcelamentoDialog}
        onClose={onCloseParcelamentoDialog}
        competencia={selectedComp}
        modelo={selectedModelo}
        onConfirm={onCriarParcelamento}
        saving={salvandoParcelamento}
      />

      <FolhaCentrosCustoDialog open={centroDialogOpen} onClose={onCloseCentroDialog} onChanged={onCentrosChanged} />

      <Dialog open={showImportador} onOpenChange={(open) => !open && onCloseImportador()}>
        <DialogContent className="flex min-h-0 max-h-[92vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-xl">
          <div className="shrink-0 border-b border-border/40 p-5">
            <h2 className="text-lg font-semibold text-foreground">Anexar boleto (PDF)</h2>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AgefinImportador
              modoAtualizacao={Boolean(importadorLancamentoId || selectedComp?.lancamento_id)}
              somenteAnexo
              lancamentoFinanceiroId={importadorLancamentoId || selectedComp?.lancamento_id || undefined}
              dadosContaExistente={
                selectedComp
                  ? { descricao: selectedComp.serie_nome, terceiro_nome: selectedComp.terceiro_nome }
                  : undefined
              }
              onSuccess={onImportadorSuccess}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
