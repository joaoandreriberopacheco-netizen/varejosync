import React, { useState } from 'react';
import SugestaoCompra from '@/components/compras/SugestaoCompra';

export default function SugestoesCompraPage() {
  const [stats, setStats] = useState({ total: 0, selected: 0, catalogo: 0, totalAtivos: 0, elegiveis: 0, semMetas: 0 });

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 font-din-1451 bg-background pb-[var(--p38-scroll-pad-below-nav)] md:pb-6">
      <div className="pb-3 mb-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-xl font-medium text-foreground font-din-1451">Sugestões de Compra</h1>
          <p className="text-sm leading-normal text-foreground/85">
            {stats.total} sugestão(ões) para reposição
            {stats.selected > 0 ? ` · ${stats.selected} selecionada(s)` : ''}
            {stats.totalAtivos > 0 && stats.total === 0
              ? ` · ${stats.totalAtivos} ativos no catálogo`
              : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Média 90d (dias com estoque) · ponto = m × 1,5 × lead time · qtd = lead time × m
          </p>
        </div>
      </div>

      <SugestaoCompra onStatsChange={setStats} />
    </div>
  );
}
