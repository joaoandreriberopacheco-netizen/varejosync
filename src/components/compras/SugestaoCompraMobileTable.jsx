import React, { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/utils';
import { getLinhaAbcdLetter } from '@/lib/sugestaoCompraTree';
import {
  sugestaoProjecaoEstoque30dNegativa,
  sugestaoProjecaoEstoque30dTexto,
} from '@/lib/calcularSugestaoCompraVelocidade';
import { formatSugestaoQuantidadeVitrine } from '@/lib/sugestaoCompraVitrineDisplay';

function AbcdBadge({ letter }) {
  const value = String(letter || '').toUpperCase();
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[9px] font-bold bg-muted text-muted-foreground">
      {value}
    </span>
  );
}

function QtdCell({ linha, disp, onQuantidadeLinhaChange }) {
  const qty = disp?.quantidade ?? 0;
  const unidade = disp?.unidade || '';
  const [localValue, setLocalValue] = useState(() => String(qty));

  useEffect(() => {
    setLocalValue(String(qty));
  }, [linha.id, qty]);

  const commit = () => {
    const parsed = Number(String(localValue).replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setLocalValue(String(qty));
      return;
    }
    onQuantidadeLinhaChange?.(linha, parsed);
  };

  return (
    <div className="flex items-center justify-end gap-0.5 min-w-[76px]" onClick={(e) => e.stopPropagation()}>
      <Input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            e.currentTarget.blur();
          }
        }}
        className="h-8 w-14 px-1 text-right text-[11px] tabular-nums"
      />
      {unidade ? (
        <span className="text-[9px] text-muted-foreground w-6 truncate">{unidade}</span>
      ) : null}
    </div>
  );
}

export default function SugestaoCompraMobileTable({
  linhas = [],
  selectedItems = {},
  onToggleSelected,
  sugestaoDisplayLinha,
  onQuantidadeLinhaChange,
  renderFornecedorSelect,
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden max-w-full">
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[640px] text-[11px] border-collapse">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground border-b border-border/40">
              <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur-sm w-9 px-1 py-2" />
              <th className="sticky left-9 z-20 bg-muted/95 backdrop-blur-sm text-left px-2 py-2 min-w-[128px] font-medium">
                Produto
              </th>
              <th className="text-center px-1.5 py-2 w-10 font-medium">AB</th>
              <th className="text-right px-1.5 py-2 min-w-[56px] font-medium">Est.</th>
              <th className="text-right px-1.5 py-2 min-w-[56px] font-medium">Méd.</th>
              <th className="text-right px-1.5 py-2 min-w-[56px] font-medium">P.fut.</th>
              <th className="text-right px-2 py-2 min-w-[88px] font-medium">Qtd</th>
              <th className="text-left px-2 py-2 min-w-[108px] font-medium">Forn.</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => {
              const sugestao = linha.sugestao;
              const produto = linha.produto;
              const selecionado = !!selectedItems[linha.id];
              const estoqueBase = sugestao?.estoque_atual ?? produto?.estoque_atual ?? 0;
              const estoqueTexto = formatSugestaoQuantidadeVitrine(produto, estoqueBase) || '—';
              const media30d = sugestao?.media_30d_texto || '—';
              const pontoFuturo = sugestaoProjecaoEstoque30dTexto(sugestao);
              const projNeg = sugestaoProjecaoEstoque30dNegativa(sugestao);
              const abcd = getLinhaAbcdLetter(linha);
              const disp = sugestaoDisplayLinha?.(linha);

              return (
                <tr
                  key={linha.id}
                  className={cn(
                    'border-b border-border/30',
                    selecionado && 'bg-teal-50/60 dark:bg-teal-950/25',
                  )}
                  onClick={() => onToggleSelected?.(linha.id, !selecionado)}
                >
                  <td
                    className="sticky left-0 z-10 bg-inherit px-1 py-2 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selecionado}
                      onCheckedChange={(c) => onToggleSelected?.(linha.id, !!c)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="sticky left-9 z-10 bg-inherit px-2 py-2 align-top max-w-[180px]">
                    <div className="font-medium text-foreground/90 uppercase leading-tight line-clamp-2">
                      {linha.label}
                    </div>
                    {linha.tipo === 'grupo' ? (
                      <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] text-muted-foreground">
                        <Layers className="w-3 h-3" />
                        {linha.skus?.length ?? 0}
                      </span>
                    ) : produto?.codigo_interno ? (
                      <div className="text-[9px] font-mono text-muted-foreground truncate mt-0.5">
                        {produto.codigo_interno}
                      </div>
                    ) : null}
                  </td>
                  <td className="text-center px-1 py-2 align-top">
                    <AbcdBadge letter={abcd} />
                  </td>
                  <td className="text-right px-1.5 py-2 tabular-nums text-muted-foreground align-top whitespace-nowrap">
                    {estoqueTexto}
                  </td>
                  <td className="text-right px-1.5 py-2 tabular-nums text-muted-foreground align-top whitespace-nowrap">
                    {media30d}
                  </td>
                  <td
                    className={cn(
                      'text-right px-1.5 py-2 tabular-nums align-top whitespace-nowrap',
                      projNeg ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-muted-foreground',
                    )}
                  >
                    {pontoFuturo}
                  </td>
                  <td className="px-1 py-2 align-top" onClick={(e) => e.stopPropagation()}>
                    <QtdCell
                      linha={linha}
                      disp={disp}
                      onQuantidadeLinhaChange={onQuantidadeLinhaChange}
                    />
                  </td>
                  <td className="px-1 py-2 align-top min-w-[108px]" onClick={(e) => e.stopPropagation()}>
                    {renderFornecedorSelect?.(linha)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
