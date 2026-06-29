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

function rowAccent(produto, selecionado) {
  if (selecionado) return 'info';
  const atual = produto.estoque_atual || 0;
  const minimo = produto.estoque_minimo || 0;
  if (atual <= 0) return 'danger';
  if (atual < minimo) return 'warning';
  return 'muted';
}

export default function SugestaoCompraLinha({
  produto,
  disp,
  selecionado,
  onToggleSelecionado,
  fornecedorSelect,
  striped,
}) {
  const pendente = produto.quantidade_pendente > 0;
  const ideal = produto.estoque_ideal || produto.estoque_maximo || 0;

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(rowAccent(produto, selecionado))}
      className={LINE_CLASS}
      title={produto.nome}
      subtitle={
        <>
          Estoque {produto.estoque_atual || 0}
          <span className="text-muted-foreground/70"> / </span>
          mín {produto.estoque_minimo || 0}
          {ideal > 0 ? (
            <>
              <span className="text-muted-foreground/70"> · </span>
              ideal {ideal}
            </>
          ) : null}
        </>
      }
      meta={
        <>
          <P38StatusLabel
            tone={(produto.estoque_atual || 0) <= (produto.estoque_minimo || 0) ? 'warning' : 'success'}
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
