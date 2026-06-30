import React from 'react';
import { Layers, Truck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  P38MobileLine,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';

const LINE_CLASS =
  'w-full text-left max-md:!py-3.5 max-md:min-h-[58px] [&>div:last-child]:max-w-[42%] sm:[&>div:last-child]:max-w-[38%] [&>div:first-child]:min-w-0';

function fmtNum(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return v < 10 ? v.toFixed(2).replace(/\.?0+$/, '') : Math.round(v * 10) / 10;
}

function rowAccent(linha, selecionado) {
  if (selecionado) return 'info';
  const atual = linha.sugestao?.estoque_atual ?? linha.produto?.estoque_atual ?? 0;
  const ponto = linha.sugestao?.ponto_pedido ?? 0;
  if (atual <= 0) return 'danger';
  if (atual < ponto) return 'warning';
  return 'muted';
}

export default function SugestaoCompraLinhaGrupo({
  linha,
  disp,
  selecionado,
  onToggleSelecionado,
  fornecedorSelect,
  striped,
}) {
  const sugestao = linha.sugestao;
  const pendente = linha.quantidade_pendente > 0;
  const m = sugestao?.media_dia ?? 0;
  const ponto = sugestao?.ponto_pedido ?? 0;
  const lead = sugestao?.lead_time_dias ?? 0;
  const qtdSkus = linha.skus?.length ?? 1;
  const isGrupo = linha.tipo === 'grupo';

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(rowAccent(linha, selecionado))}
      className={LINE_CLASS}
      title={linha.label}
      subtitle={
        <>
          {isGrupo ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Layers className="h-3 w-3 shrink-0" aria-hidden />
              {qtdSkus} modelo(s)
              <span className="text-muted-foreground/70"> · </span>
            </span>
          ) : null}
          Estoque {fmtNum(sugestao?.estoque_atual ?? 0)}
          <span className="text-muted-foreground/70"> · </span>
          pedido {fmtNum(ponto)}
          {m > 0 ? (
            <>
              <span className="text-muted-foreground/70"> · </span>
              m {fmtNum(m)}/dia
              {lead > 0 ? (
                <>
                  <span className="text-muted-foreground/70"> · </span>
                  LT {lead}d
                </>
              ) : null}
            </>
          ) : null}
        </>
      }
      meta={
        <>
          <P38StatusLabel tone={(sugestao?.estoque_atual ?? 0) < ponto ? 'warning' : 'success'}>
            {isGrupo ? 'Família' : 'Repor'}
          </P38StatusLabel>
          {pendente ? (
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3 shrink-0" aria-hidden />
              {linha.quantidade_pendente} em trânsito
            </span>
          ) : null}
          {isGrupo ? (
            <span className="text-[10px] text-muted-foreground/80 line-clamp-2">
              {linha.skus
                .slice(0, 3)
                .map((p) => p.campo_hierarquico_5 || p.marca || p.nome?.split(' ').pop())
                .filter(Boolean)
                .join(' · ')}
              {qtdSkus > 3 ? ` +${qtdSkus - 3}` : ''}
            </span>
          ) : null}
          <div className="w-full basis-full mt-1.5" onClick={(e) => e.stopPropagation()}>
            {fornecedorSelect}
          </div>
        </>
      }
      value={disp.quantidade}
      valueSub={disp.unidade}
      trailing={
        <Checkbox
          checked={selecionado}
          onCheckedChange={onToggleSelecionado}
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
      }
    />
  );
}
