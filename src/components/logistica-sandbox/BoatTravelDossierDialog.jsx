import React, { useMemo } from 'react';
import { Anchor, CalendarDays, ClipboardList, Link2, Package, Printer, Route, UserCircle2, Waves } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function formatMoney(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizeItems(embarque = {}) {
  return (embarque.itens || []).map((item) => {
    const quantidade = Number(item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0) || 0;
    const custo = Number(item.custo_unitario ?? item.custo_unitario_momento ?? item.valor_unitario ?? item.total_unitario ?? 0) || 0;
    const total = Number(item.total ?? item.valor_total ?? item.total_item ?? (quantidade * custo)) || 0;
    return {
      id: item.id || `${item.produto_id || item.produto_nome}-${quantidade}`,
      nome: item.produto_nome || 'Item sem descrição',
      quantidade,
      unidade: item.unidade_medida || 'UN',
      custo,
      total,
    };
  });
}

export default function BoatTravelDossierDialog({
  open,
  onOpenChange,
  evento,
  transportadora,
  timeline = [],
}) {
  const itinerario = useMemo(() => timeline.filter((item) => item?.linkedCount > 0 || item?.data !== '-'), [timeline]);
  const embarques = evento?.embarques || [];
  const resumo = useMemo(() => {
    return embarques.reduce((acc, embarque) => {
      const itens = normalizeItems(embarque);
      acc.totalEmbarques += 1;
      acc.totalItens += itens.length;
      acc.totalVolumes += itens.reduce((sum, item) => sum + item.quantidade, 0);
      acc.totalValor += itens.reduce((sum, item) => sum + item.total, 0);
      return acc;
    }, { totalEmbarques: 0, totalItens: 0, totalVolumes: 0, totalValor: 0 });
  }, [embarques]);

  if (!evento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl h-[92vh] max-h-[92vh] p-0 overflow-hidden rounded-[28px] border-0 bg-white dark:bg-gray-900 shadow-2xl">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #boat-dossier-print, #boat-dossier-print * { visibility: visible !important; }
            #boat-dossier-print { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #111827 !important; }
            .boat-dossier-print-hidden { display: none !important; }
            .boat-dossier-page-break { page-break-before: always; }
          }
        `}</style>
        <div id="boat-dossier-print" className="h-full overflow-y-auto px-5 py-5 space-y-5">
          <DialogHeader className="text-left boat-dossier-print-hidden">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dossiê de Viagem</DialogTitle>
              <Button type="button" onClick={() => window.print()} className="rounded-2xl">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </DialogHeader>

          <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-white dark:from-gray-900 dark:to-gray-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Viagem Fluvial</p>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{evento.titulo}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{evento.codigo} · {evento.data}</p>
              </div>
              <Badge className="border-0 shadow-none bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                {evento.pagamentoLabel || 'Sem status financeiro'}
              </Badge>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <article className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2"><Anchor className="w-4 h-4" /> Transportadora</p>
              <p className="text-sm font-semibold mt-2">{transportadora?.nome || 'Não informado'}</p>
            </article>
            <article className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Data de referência</p>
              <p className="text-sm font-semibold mt-2">{evento.data || '-'}</p>
            </article>
            <article className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2"><Package className="w-4 h-4" /> Cargas vinculadas</p>
              <p className="text-sm font-semibold mt-2">{resumo.totalEmbarques} embarque(s)</p>
            </article>
            <article className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2"><Waves className="w-4 h-4" /> Valor total carga</p>
              <p className="text-sm font-semibold mt-2">{formatMoney(resumo.totalValor)}</p>
            </article>
          </section>

          <section className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Route className="w-4 h-4" /> Itinerário</h3>
            <div className="space-y-2">
              {itinerario.length ? itinerario.map((step, idx) => (
                <div key={`${step.label}-${idx}`} className="rounded-xl bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500">{step.label}</p>
                  <p className="text-sm font-medium">{step.data || '-'}</p>
                </div>
              )) : <p className="text-sm text-gray-500">Sem etapas disponíveis.</p>}
            </div>
          </section>

          <section className="boat-dossier-page-break rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Link2 className="w-4 h-4" /> Vínculos</h3>
            <div className="space-y-3">
              {embarques.map((embarque, index) => (
                <article key={embarque.id || index} className="rounded-xl bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{embarque.fornecedor_nome || 'Fornecedor'}</p>
                    <Badge className="border-0 shadow-none bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {embarque.pedido_compra_numero || embarque.numero || 'Compra vinculada'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Itens: {normalizeItems(embarque).length}</p>
                  <div className="mt-2 space-y-1">
                    {normalizeItems(embarque).map((item) => (
                      <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs">
                        <span className="truncate">{item.nome}</span>
                        <span>{item.quantidade} {item.unidade}</span>
                        <span>{formatMoney(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <article className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Resumo de cargas</h3>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Total de embarques: {resumo.totalEmbarques}</li>
                <li>Total de itens: {resumo.totalItens}</li>
                <li>Total de volumes/quantidade: {resumo.totalVolumes}</li>
                <li>Valor total: {formatMoney(resumo.totalValor)}</li>
              </ul>
            </article>
            <article className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
              <h3 className="text-sm font-semibold flex items-center gap-2"><UserCircle2 className="w-4 h-4" /> Responsáveis e contatos</h3>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Contato: {transportadora?.contato || '-'}</li>
                <li>Telefone: {transportadora?.telefone || '-'}</li>
                <li>Email: {transportadora?.email || '-'}</li>
              </ul>
            </article>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
