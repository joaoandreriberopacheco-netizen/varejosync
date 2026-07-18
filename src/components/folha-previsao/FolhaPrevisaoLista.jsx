import React from 'react';
import { FinanceiroGrupo } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { calcularTotaisGrupo, agruparCompetenciasPorCentroCusto } from '@/lib/folhaPrevisaoCalculos';
import FolhaPrevisaoRow from './FolhaPrevisaoRow';

const CENTRO_LABEL_CLASS =
  'text-sm font-semibold normal-case tracking-normal text-foreground print:text-black';

function ListaLinhas({ items, modelosMap, onOpen }) {
  return (
    <>
      {items.map((c, i) => (
        <FolhaPrevisaoRow
          key={c.id}
          competencia={c}
          modelo={modelosMap[c.colaborador_id]}
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
      labelClassName={CENTRO_LABEL_CLASS}
      receitas={totais.proventos}
      despesas={totais.descontos}
      liquido={totais.liquido}
      card={false}
      defaultOpen
    >
      <div className="pl-1 sm:pl-2">
        <ListaLinhas items={items} modelosMap={modelosMap} onOpen={onOpen} />
      </div>
    </FinanceiroGrupo>
  );
}

export default function FolhaPrevisaoLista({
  competencias = [],
  modelosMap,
  centrosRegistrados = [],
  onOpen,
}) {
  const gruposCentro = agruparCompetenciasPorCentroCusto(competencias, modelosMap, centrosRegistrados);

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
