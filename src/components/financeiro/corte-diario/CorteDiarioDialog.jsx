import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { dateRangeFinanceiro } from '@/lib/periodoFinanceiro';
import { montarCorteDiarioMapa, ordenarContasCorteDiario } from '@/lib/corteDiarioMapa';
import { contaUsaRegraCaixaPDV } from '@/lib/saldoContaFinanceira';
import PrintDialogFilters from '@/components/financeiro/PrintDialogFilters';
import CorteDiarioPainel from './CorteDiarioPainel';

function contasPadraoCorte(contas = []) {
  const ativas = contas.filter((c) => c.ativo !== false);
  const pdv = ativas.filter((c) => contaUsaRegraCaixaPDV(c));
  const geral = ativas.filter((c) => c.is_caixa_geral);
  const bancos = ativas.filter((c) => {
    const tipo = String(c.tipo || '').toLowerCase();
    return tipo.includes('banc') || tipo.includes('poupan');
  });
  const ids = [...pdv, ...geral, ...bancos].map((c) => c.id);
  if (ids.length) return [...new Set(ids)];
  return ativas.map((c) => c.id);
}

export default function CorteDiarioDialog({
  open,
  onOpenChange,
  contas = [],
  lancamentos = [],
  movimentos = [],
  initialPeriodo = 'hoje',
  initialCustomStart = '',
  initialCustomEnd = '',
  initialContasSel = null,
  abrirDiretoNoMapa = false,
}) {
  const [etapa, setEtapa] = useState('config');
  const [periodo, setPeriodo] = useState(initialPeriodo);
  const [customStart, setCustomStart] = useState(initialCustomStart);
  const [customEnd, setCustomEnd] = useState(initialCustomEnd);
  const [contasSel, setContasSel] = useState([]);

  const contasOrdenadas = useMemo(
    () => ordenarContasCorteDiario(contas.filter((c) => c.ativo !== false)),
    [contas],
  );

  useEffect(() => {
    if (!open) {
      setEtapa('config');
      return;
    }
    setPeriodo(initialPeriodo);
    setCustomStart(initialCustomStart);
    setCustomEnd(initialCustomEnd);
    const padrao = initialContasSel?.length ? initialContasSel : contasPadraoCorte(contas);
    setContasSel(padrao);
    setEtapa(abrirDiretoNoMapa && padrao.length ? 'painel' : 'config');
  }, [open, contas, initialPeriodo, initialCustomStart, initialCustomEnd, initialContasSel, abrirDiretoNoMapa]);

  const mapa = useMemo(() => {
    if (etapa !== 'painel' || !contasSel.length) return null;
    const { dataInicio, dataFim } = dateRangeFinanceiro(periodo, customStart, customEnd);
    return montarCorteDiarioMapa({
      contas,
      lancamentos,
      movimentos,
      contasSel,
      dataInicio,
      dataFim,
    });
  }, [etapa, contas, lancamentos, movimentos, contasSel, periodo, customStart, customEnd]);

  const toggleConta = (id) => {
    setContasSel((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const emitirMapa = () => {
    if (!contasSel.length) return;
    if (periodo === 'periodo' && !customStart) return;
    setEtapa('painel');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setEtapa('config');
      }}
    >
      <DialogContent
        className={`flex max-h-[min(92dvh,900px)] flex-col gap-0 overflow-hidden border-0 p-0 shadow-2xl ${
          etapa === 'painel'
            ? 'h-[min(92dvh,900px)] w-[calc(100vw-1rem)] max-w-6xl'
            : 'w-[calc(100vw-1rem)] max-w-lg'
        } z-[70] rounded-[28px] bg-card`}
        overlayClassName="z-[70]"
      >
        <DialogHeader className="shrink-0 border-b border-border/30 px-5 pb-3 pt-5 text-left">
          <div className="flex items-center gap-2">
            {etapa === 'painel' && (
              <button
                type="button"
                onClick={() => setEtapa('config')}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50"
                aria-label="Voltar à configuração"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <DialogTitle className="flex items-center gap-2 font-glacial text-xl text-foreground">
                <LayoutGrid className="h-5 w-5" />
                {etapa === 'painel' ? 'Balancete diário' : 'Balancete diário'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                {etapa === 'painel'
                  ? 'Palitos em T: PDV à esquerda, Caixa Geral no centro, bancos à direita.'
                  : 'Ajuste período e contas, depois emita o mapa.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {etapa === 'config' ? (
            <div className="space-y-5">
              <PrintDialogFilters
                periodo={periodo}
                setPeriodo={setPeriodo}
                customStart={customStart}
                customEnd={customEnd}
                setCustomStart={setCustomStart}
                setCustomEnd={setCustomEnd}
                contas={contasOrdenadas}
                contasSel={contasSel}
                setContasSel={setContasSel}
                showAdvancedFilters={false}
                showContasFilter={false}
                inDialog
              />

              <div className="rounded-[24px] bg-muted/40 p-3 dark:bg-muted/60">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Contas no mapa
                </p>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Ordem: PDV → Caixa Geral → bancos
                </p>
                <div className="space-y-1">
                  {contasOrdenadas.map((conta) => (
                    <label
                      key={conta.id}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={contasSel.includes(conta.id)}
                        onCheckedChange={() => toggleConta(conta.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-xs text-foreground/90">{conta.nome}</span>
                      {contaUsaRegraCaixaPDV(conta) && (
                        <span className="ml-auto text-[10px] text-muted-foreground">PDV</span>
                      )}
                      {conta.is_caixa_geral && (
                        <span className="ml-auto text-[10px] text-muted-foreground">Geral</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                className="w-full rounded-2xl"
                disabled={!contasSel.length || (periodo === 'periodo' && !customStart)}
                onClick={emitirMapa}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Emitir balancete
              </Button>

              {periodo === 'periodo' && !customStart && (
                <p className="text-center text-[11px] text-amber-700 dark:text-amber-400">
                  Selecione a data inicial no período personalizado.
                </p>
              )}
            </div>
          ) : (
            <CorteDiarioPainel mapa={mapa} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
