import React from 'react';
import { FinanceiroGrupo } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { calcularTotaisGrupo, agruparCompetenciasPorCentroCusto } from '@/lib/agefinPrevisaoCalculos';
import AgefinPrevisaoRow from './AgefinPrevisaoRow';

function ListaLinhas({ items, modelosMap, onOpen }) {
  return (
    <>
      {items.map((c, i) => (
        <AgefinPrevisaoRow
          key={c.id}
          competencia={c}
          modelo={modelosMap[c.serie_id]}
          onClick={onOpen}
          striped={i % 2 === 1}
        />
      ))}
    </>
  );
}

function SecaoCentroCusto({ label, items, modelosMap, onOpen }) {
  if (!items?.length) return null;
  const totais = calcularTotaisGrupo(items, modelosMap);

  return (
    <FinanceiroGrupo
      label={`${label} (${items.length})`}
      labelClassName="text-[10px] font-medium normal-case tracking-normal text-muted-foreground"
      receitas={0}
      despesas={totais.total}
      liquido={-totais.total}
      card={false}
      defaultOpen
    >
      <div className="pl-1 sm:pl-2">
        <ListaLinhas items={items} modelosMap={modelosMap} onOpen={onOpen} />
      </div>
    </FinanceiroGrupo>
  );
}

export default function AgefinPrevisaoLista({
  competencias = [],
  modelosMap,
  agruparPorCentro = false,
  centrosRegistrados = [],
  onOpen,
}) {
  if (agruparPorCentro) {
    const gruposCentro = agruparCompetenciasPorCentroCusto(competencias, centrosRegistrados);
    return (
      <div className="min-w-0 w-full max-w-full space-y-2 overflow-x-hidden pb-2 md:pb-0">
        {gruposCentro.map((grupo) => (
          <SecaoCentroCusto
            key={grupo.chave}
            label={grupo.label}
            items={grupo.items}
            modelosMap={modelosMap}
            onOpen={onOpen}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full overflow-x-hidden rounded-xl border border-border/50">
      <ListaLinhas items={competencias} modelosMap={modelosMap} onOpen={onOpen} />
    </div>
  );
}
