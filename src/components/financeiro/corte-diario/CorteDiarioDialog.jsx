import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { dataHoje } from '@/components/utils/dateUtils';
import { montarCorteDiarioMapa, ordenarContasCorteDiario } from '@/lib/corteDiarioMapa';
import { contaUsaRegraCaixaPDV } from '@/lib/saldoContaFinanceira';
import PrintDialogFilters from '@/components/financeiro/PrintDialogFilters';
import CorteDiarioPainel from './CorteDiarioPainel';

function dateRangeFromFilter(periodo, customStart, customEnd) {
  const hoje = dataHoje();
  if (periodo === 'hoje') return { dataInicio: hoje, dataFim: hoje };
  if (periodo === 'ontem') {
    const d = new Date(`${hoje}T12:00:00`);
    d.setDate(d.getDate() - 1);
    const ontem = d.toISOString().slice(0, 10);
    return { dataInicio: ontem, dataFim: ontem };
  }
  if (periodo === 'periodo' && customStart && customEnd) {
    return { dataInicio: customStart, dataFim: customEnd };
  }
  if (periodo === 'periodo' && customStart) {
    return { dataInicio: customStart, dataFim: customStart };
  }
  return { dataInicio: hoje, dataFim: hoje };
}

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
}) {
  const [etapa, setEtapa] = useState('config');
  const [periodo, setPeriodo] = useState('hoje');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
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
    setContasSel((prev) => (prev.length ? prev : contasPadraoCorte(contas)));
    setPeriodo('hoje');
    setCustomStart('');
    setCustomEnd('');
  }, [open, contas]);

  const mapa = useMemo(() => {
    if (etapa !== 'painel' || !contasSel.length) return null;
    const { dataInicio, dataFim } = dateRangeFromFilter(periodo, customStart, customEnd);
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
        } rounded-[28px] bg-card`}
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
                {etapa === 'painel' ? 'Mapa do corte diário' : 'Corte diário'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                {etapa === 'painel'
                  ? 'Visão relacional em T: PDV, Caixa Geral e contas bancárias.'
                  : 'Escolha o período e as contas. O mapa mostra apenas o que já está líquido.'}
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
              />

              <div className="rounded-[24px] bg-muted/40 p-3 dark:bg-muted/60">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ordem sugerida no mapa
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
                disabled={!contasSel.length}
                onClick={emitirMapa}
              >
                Emitir mapa
              </Button>
            </div>
          ) : (
            <CorteDiarioPainel mapa={mapa} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
