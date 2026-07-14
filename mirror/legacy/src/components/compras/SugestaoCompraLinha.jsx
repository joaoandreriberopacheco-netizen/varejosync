import React from 'react';
import { Truck } from 'lucide-react';
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

function rowAccent(produto, selecionado, sugestao) {
  if (selecionado) return 'info';
  const atual = produto.estoque_atual || 0;
  const ponto = sugestao?.ponto_pedido ?? produto.estoque_minimo ?? 0;
  if (atual <= 0) return 'danger';
  if (atual < ponto) return 'warning';
  return 'muted';
}

export default function SugestaoCompraLinha({
  produto,
  sugestao,
  disp,
  selecionado,
  onToggleSelecionado,
  fornecedorSelect,
  striped,
}) {
  const pendente = produto.quantidade_pendente > 0;
  const m = sugestao?.media_dia ?? 0;
  const ponto = sugestao?.ponto_pedido ?? 0;
  const lead = sugestao?.lead_time_dias ?? 0;

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(rowAccent(produto, selecionado, sugestao))}
      className={LINE_CLASS}
      title={produto.nome}
      subtitle={
        <>
          Estoque {produto.estoque_atual || 0}
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
          <P38StatusLabel
            tone={(produto.estoque_atual || 0) < ponto ? 'warning' : 'success'}
          >
            Repor
          </P38StatusLabel>
          {pendente ? (
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3 shrink-0" aria-hidden />
              {produto.quantidade_pendente} em trânsito
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
