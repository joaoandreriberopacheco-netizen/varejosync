import React from 'react';
import { FinanceiroGrupo } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';
import { calcularTotaisGrupo, agruparCompetenciasPorCentroCusto } from '@/lib/folhaPrevisaoCalculos';
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

function SecaoCentroCusto({ label, items, modelosMap, onOpen }) {
  if (!items?.length) return null;
  const totais = calcularTotaisGrupo(items, modelosMap);

  return (
    <FinanceiroGrupo
      label={`${label} (${items.length})`}
      labelClassName="text-[10px] font-medium normal-case tracking-normal text-muted-foreground"
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

function SecaoGrupo({ label, items, modelosMap, onOpen, agruparPorCentro, centrosRegistrados }) {
  if (!items?.length) return null;
  const totais = calcularTotaisGrupo(items, modelosMap);

  const conteudo = agruparPorCentro ? (
    <div className="space-y-1 pl-0.5 sm:pl-1">
      {agruparCompetenciasPorCentroCusto(items, modelosMap, centrosRegistrados).map((grupo) => (
        <SecaoCentroCusto
          key={grupo.chave}
          label={grupo.label}
          items={grupo.items}
          modelosMap={modelosMap}
          onOpen={onOpen}
        />
      ))}
    </div>
  ) : (
    <ListaLinhas items={items} modelosMap={modelosMap} onOpen={onOpen} />
  );

  return (
    <FinanceiroGrupo
      label={`${label} (${items.length})`}
      receitas={totais.proventos}
      despesas={totais.descontos}
      liquido={totais.liquido}
      card={false}
    >
      {conteudo}
    </FinanceiroGrupo>
  );
}

export default function FolhaPrevisaoLista({
  competencias = [],
  grupos,
  modelosMap,
  filtroVinculo,
  agruparPorCentro = false,
  centrosRegistrados = [],
  onOpen,
}) {
  if (agruparPorCentro && filtroVinculo !== 'todos') {
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

  if (filtroVinculo === 'todos' && grupos) {
    return (
      <div className="min-w-0 w-full max-w-full space-y-2 overflow-x-hidden pb-2 md:pb-0">
        <SecaoGrupo
          label="Funcionários"
          items={grupos.funcionarios}
          modelosMap={modelosMap}
          onOpen={onOpen}
          agruparPorCentro={agruparPorCentro}
          centrosRegistrados={centrosRegistrados}
        />
        <SecaoGrupo
          label="Sócios"
          items={grupos.socios}
          modelosMap={modelosMap}
          onOpen={onOpen}
          agruparPorCentro={agruparPorCentro}
          centrosRegistrados={centrosRegistrados}
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
