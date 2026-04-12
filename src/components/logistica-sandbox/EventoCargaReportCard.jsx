import React from 'react';
import { Printer, Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';

async function printReport(evento) {
  const fornecedores = (evento.resumo_fornecedores || []).map((fornecedor) => {
    const itens = (fornecedor.itens || []).map((item) => `<li>${item.produto_nome || 'Item'} — ${item.quantidade_embarcada || 0} ${item.unidade_medida || ''}</li>`).join('');
    return `<section style="margin-bottom:16px"><h3 style="margin:0 0 8px">${fornecedor.fornecedor_nome || 'Fornecedor'}</h3><ul style="margin:0;padding-left:18px">${itens}</ul></section>`;
  }).join('');

  const html = `<html><head><title>Relatório do Evento</title></head><body style="font-family:Inter,sans-serif;padding:24px"><h2>${evento.embarcacao_nome || 'Evento logístico'}</h2><p>${evento.codigo || ''}</p><p>Total de carga: ${(evento.valor_total_carga || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>${fornecedores || '<p>Sem embarques relacionados.</p>'}</body></html>`;
  try {
    await openPrintWindowOrShareHtml(html, `evento-carga-${evento.codigo || Date.now()}.html`, evento.embarcacao_nome || 'Evento');
  } catch {
    /* popup bloqueado */
  }
}

export default function EventoCargaReportCard({ evento }) {
  if (!evento) {
    return <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 md:p-5 shadow-sm text-sm text-gray-500 dark:text-gray-400">Selecione um frete para ver o resumo da carga.</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 md:p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Resumo da carga</p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100 font-glacial">{evento.embarcacao_nome}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{evento.codigo || 'Sem código'}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => void printReport(evento)} className="h-10 w-10 rounded-2xl bg-gray-100 dark:bg-gray-700">
          <Printer className="w-4 h-4" />
        </Button>
      </div>

      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Package2 className="w-4 h-4" /> Totais</div>
        <div className="mt-2 text-sm text-gray-900 dark:text-gray-100">Carga prevista: {(evento.valor_total_carga || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{evento.total_embarques_relacionados || 0} embarques · {evento.total_fornecedores_relacionados || 0} fornecedores</div>
      </div>

      <div className="space-y-3">
        {(evento.resumo_fornecedores || []).map((fornecedor, index) => (
          <div key={`${fornecedor.fornecedor_nome || 'fornecedor'}-${index}`} className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{fornecedor.fornecedor_nome || 'Fornecedor'}</p>
            <div className="mt-2 space-y-1">
              {(fornecedor.itens || []).map((item, itemIndex) => (
                <div key={`${item.produto_id || itemIndex}-${itemIndex}`} className="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="truncate">{item.produto_nome || 'Item'}</span>
                  <span className="whitespace-nowrap">{item.quantidade_embarcada || 0} {item.unidade_medida || ''}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}