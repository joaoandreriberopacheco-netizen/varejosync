import React from 'react';
import { FinanceiroGrupo } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';
import { calcularTotaisGrupo } from '@/lib/folhaPrevisaoCalculos';
import FolhaPrevisaoRow from './FolhaPrevisaoRow';

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

function SecaoGrupo({ label, items, modelosMap, onOpen }) {
  if (!items?.length) return null;
  const totais = calcularTotaisGrupo(items, modelosMap);

  return (
    <FinanceiroGrupo
      label={`${label} (${items.length})`}
      receitas={totais.proventos}
      despesas={totais.descontos}
      liquido={totais.liquido}
      card={false}
    >
      <ListaLinhas items={items} modelosMap={modelosMap} onOpen={onOpen} />
    </FinanceiroGrupo>
  );
}

export default function FolhaPrevisaoLista({
  competencias = [],
  grupos,
  modelosMap,
  filtroVinculo,
  onOpen,
}) {
  if (filtroVinculo === 'todos' && grupos) {
    return (
      <div className="min-w-0 w-full max-w-full space-y-2 overflow-x-hidden pb-2 md:pb-0">
        <SecaoGrupo
          label="Funcionários"
          items={grupos.funcionarios}
          modelosMap={modelosMap}
          onOpen={onOpen}
        />
        <SecaoGrupo
          label="Sócios"
          items={grupos.socios}
          modelosMap={modelosMap}
          onOpen={onOpen}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full overflow-x-hidden pb-2 md:pb-0">
      <P38MobileLineList className="block md:!block rounded-lg">
        <ListaLinhas items={competencias} modelosMap={modelosMap} onOpen={onOpen} />
      </P38MobileLineList>
    </div>
  );
}
