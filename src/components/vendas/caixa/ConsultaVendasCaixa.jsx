import React, { useMemo, useState } from 'react';
import { Package2, Receipt } from 'lucide-react';
import { P38MobileLine, P38MobileLineList } from '@/components/ui/p38-mobile-line';
import { p38Table } from '@/lib/p38TableSurfaces';
import CaixaValorDisplay, { formatCaixaR } from '@/components/vendas/caixa/CaixaValorDisplay';
import { caixaTypo } from '@/lib/caixaP38Theme';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import { formatarDataHora } from '@/components/utils/dateUtils';

function parseNumeroComprovante(numero) {
  const digits = String(numero || '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function aggregateByProduto(vendas) {
  const map = new Map();
  (vendas || []).forEach((venda) => {
    (venda.itens || []).forEach((item) => {
      const key = item.produto_id || item.produto_nome || 'sem-id';
      const qtd = Number(item.quantidade) || 0;
      const total = Number(item.total) || roundToTwoDecimals((Number(item.preco_unitario_praticado) || 0) * qtd);
      const prev = map.get(key) || {
        key,
        nome: item.produto_nome || 'Produto',
        unidade: item.unidade_medida || 'UN',
        quantidade: 0,
        total: 0,
      };
      prev.quantidade += qtd;
      prev.total = roundToTwoDecimals(prev.total + total);
      map.set(key, prev);
    });
  });
  return [...map.values()].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
}

function sortByComprovante(vendas) {
  return [...(vendas || [])].sort((a, b) => {
    const na = parseNumeroComprovante(a.numero);
    const nb = parseNumeroComprovante(b.numero);
    if (na !== nb) return na - nb;
    return String(a.numero || '').localeCompare(String(b.numero || ''), 'pt-BR');
  });
}

export default function ConsultaVendasCaixa({ vendasFinalizadas = [], onVerDetalhes }) {
  const [modo, setModo] = useState('produto');

  const produtosAgregados = useMemo(() => aggregateByProduto(vendasFinalizadas), [vendasFinalizadas]);
  const vendasOrdenadas = useMemo(() => sortByComprovante(vendasFinalizadas), [vendasFinalizadas]);

  const totalGeral = useMemo(
    () => roundToTwoDecimals(vendasFinalizadas.reduce((acc, v) => acc + (Number(v.valor_total) || 0), 0)),
    [vendasFinalizadas]
  );

  if (vendasFinalizadas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Receipt className="w-10 h-10 text-muted-foreground mb-3" />
        <p className={caixaTypo.meta}>Nenhuma venda finalizada no turno</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className={caixaTypo.labelSm}>Consulta do turno</p>
          <CaixaValorDisplay valor={totalGeral} tone="success" size="lg" />
          <p className={`${caixaTypo.meta} mt-1`}>
            {vendasFinalizadas.length} comprovante{vendasFinalizadas.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex rounded-2xl bg-muted/50 p-1 gap-1">
          <button
            type="button"
            onClick={() => setModo('produto')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl ${caixaTypo.tab} transition-colors ${modo === 'produto' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            Por produto
          </button>
          <button
            type="button"
            onClick={() => setModo('comprovante')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl ${caixaTypo.tab} transition-colors ${modo === 'comprovante' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            Por comprovante
          </button>
        </div>
      </div>

      {modo === 'produto' ? (
        <P38MobileLineList className="rounded-lg">
          {produtosAgregados.map((p, index) => (
            <P38MobileLine
              key={p.key}
              thinAccent
              striped={index % 2 === 1}
              accent="success"
              title={p.nome}
              subtitle={`${p.quantidade.toLocaleString('pt-BR')} ${p.unidade}`}
              value={<CaixaValorDisplay valor={p.total} tone="success" size="sm" />}
              leading={<Package2 className="w-4 h-4 text-muted-foreground shrink-0" />}
            />
          ))}
        </P38MobileLineList>
      ) : (
        <div className="space-y-3">
          {vendasOrdenadas.map((venda) => (
            <div key={venda.id} className="bg-card rounded-2xl shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => onVerDetalhes?.(venda)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className={`${p38Table.mobileLineTitle} truncate`}>{venda.numero}</p>
                  <p className={`${p38Table.mobileLineSubtitle} truncate`}>
                    {venda.cliente_nome || 'Avulso'}
                    {venda.created_date ? ` · ${formatarDataHora(venda.created_date).split(' ')[1] || ''}` : ''}
                  </p>
                </div>
                <CaixaValorDisplay valor={venda.valor_total} tone="success" size="sm" />
              </button>
              <P38MobileLineList className="rounded-none border-0">
                {(venda.itens || []).map((item, idx) => (
                  <P38MobileLine
                    key={`${venda.id}-${idx}`}
                    thinAccent
                    striped={idx % 2 === 1}
                    accent="muted"
                    title={item.produto_nome}
                    subtitle={`${Number(item.quantidade) || 0} ${item.unidade_medida || 'UN'} · ${formatCaixaR(item.preco_unitario_praticado)}`}
                    value={formatCaixaR(item.total || (Number(item.preco_unitario_praticado) || 0) * (Number(item.quantidade) || 0))}
                  />
                ))}
              </P38MobileLineList>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
