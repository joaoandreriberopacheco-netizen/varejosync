import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Anchor,
  Link2,
  Ship,
  Banknote,
  MapPin,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildFluvialEvents } from '@/components/logistica-sandbox/fluvialDataUtils';

function montarTextoBusca(ev) {
  const emb = ev.embarques_relacionados || [];
  const extras = emb.flatMap((e) =>
    [e.codigo, e.fornecedor_nome, e.pedido_compra_id, e.numero_pedido, e.observacao].filter(Boolean)
  );
  return [
    ev.codigo,
    ev.embarcacao_nome,
    ev.status,
    ev.transportadora_nome,
    ev.rota_nome,
    ev.data_chegada_destino_formatada,
    ev.data_saida_manaus_formatada,
    ev.data_chegada_manaus_formatada,
    ev.data_retorno_origem_formatada,
    extras.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** Linha do tempo compacta: perspectiva chegada em Tabatinga + datas Manaus */
function TimelineViagemFluvial({ ev }) {
  const emb = ev.embarques_relacionados || [];
  const steps = [
    {
      key: 'manaus',
      label: 'Manaus',
      sub: 'Chegada',
      data: ev.data_chegada_manaus_formatada || '—',
    },
    {
      key: 'saida',
      label: 'Manaus',
      sub: 'Saída',
      data: ev.data_saida_manaus_formatada || '—',
    },
    {
      key: 'tab',
      label: 'Tabatinga',
      sub: 'Chegada (ETA)',
      data: ev.data_chegada_destino_formatada || '—',
      highlight: true,
    },
  ];

  const temEmb = (ev.total_embarques_relacionados || 0) > 0;
  const temFrete = Boolean(ev.tem_conta_frete);

  return (
    <div className="mt-3 space-y-2">
      <div className="relative flex gap-1">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 ? (
              <div
                className={`mx-0.5 mt-5 h-px min-w-[12px] flex-1 ${s.highlight ? 'bg-emerald-400/80 dark:bg-emerald-500/70' : 'bg-gray-200 dark:bg-gray-600'}`}
              />
            ) : null}
            <div
              className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-center ${
                s.highlight
                  ? 'bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:ring-emerald-800'
                  : 'bg-gray-50 dark:bg-gray-800/80'
              }`}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${s.highlight ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {s.sub}
              </p>
              <p className={`truncate text-[11px] font-medium ${s.highlight ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-700 dark:text-gray-200'}`}>
                {s.label}
              </p>
              <p className={`mt-0.5 text-xs tabular-nums ${s.highlight ? 'font-semibold text-emerald-800 dark:text-emerald-200' : 'text-gray-600 dark:text-gray-300'}`}>
                {s.data}
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2 text-[11px] dark:border-gray-700">
        <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <Ship className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span>
            {ev.total_embarques_relacionados || 0} embarque(s)
            {temEmb ? (
              <span className="text-gray-500 dark:text-gray-500">
                {' '}
                · {ev.total_embarques_ativos || 0} ativos · {ev.total_embarques_concluidos || 0} concl.
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400"> · nenhum vínculo</span>
            )}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <Banknote className="h-3.5 w-3.5 shrink-0 opacity-70" />
          {temFrete ? (
            <span>
              Frete {ev.lancamento_financeiro_status === 'Pago' ? 'pago' : 'conta vinculada'}
              {ev.lancamento_financeiro_valor != null ? (
                <span className="tabular-nums">
                  {' '}
                  ·{' '}
                  {Number(ev.lancamento_financeiro_valor).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-amber-700 dark:text-amber-400">Frete sem conta</span>
          )}
        </span>
      </div>

      {(ev.resumo_fornecedores?.length > 0 || emb.length > 0) && temEmb ? (
        <div className="rounded-lg bg-gray-50/90 px-2 py-1.5 text-[10px] leading-snug text-gray-600 dark:bg-gray-800/60 dark:text-gray-400">
          <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
            <Link2 className="h-3 w-3" /> Vínculos
          </span>
          <span className="mt-0.5 block">
            {(ev.resumo_fornecedores || [])
              .slice(0, 4)
              .map((r) => r.fornecedor_nome)
              .filter(Boolean)
              .join(' · ') || `${emb.length} processo(s) de embarque`}
            {(ev.resumo_fornecedores || []).length > 4 ? '…' : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function BuscarEventoLogisticoParaAnexo({ onSelecionar, onVoltar, uploadando }) {
  const [query, setQuery] = useState('');
  const [eventosEnriquecidos, setEventosEnriquecidos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const inputBuscaRef = useRef(null);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [todos, embs, lancs] = await Promise.all([
        base44.entities.EventosLogisticos.list('-created_date', 200),
        base44.entities.Embarque.list('-created_date', 1000).catch(() => []),
        base44.entities.LancamentoFinanceiro.filter(
          { referencia_tipo: 'EventosLogisticos' },
          '-created_date',
          800
        ).catch(() => []),
      ]);
      const built = buildFluvialEvents({
        eventosLogisticos: todos || [],
        embarques: embs || [],
        lancamentosFinanceiros: lancs || [],
      });
      setEventosEnriquecidos(built);
    } catch (e) {
      console.error(e);
      setErro(e?.message || 'Não foi possível carregar as viagens.');
      setEventosEnriquecidos([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  /** Foco na barra ao abrir o painel — “busca ativada”. */
  useEffect(() => {
    const id = window.setTimeout(() => {
      inputBuscaRef.current?.focus({ preventScroll: false });
    }, 100);
    return () => window.clearTimeout(id);
  }, []);

  const eventosFiltrados = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return eventosEnriquecidos;
    return eventosEnriquecidos.filter((ev) => montarTextoBusca(ev).includes(q));
  }, [eventosEnriquecidos, query]);

  const handleSearchChange = (e) => {
    setQuery(e.target.value);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 px-5 pb-6 pt-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Viagem / frete fluvial</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <MapPin className="h-3 w-3 shrink-0" />
            Linha do tempo com ETA em Tabatinga e vínculos (embarques / frete)
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputBuscaRef}
          autoComplete="off"
          autoFocus
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={handleSearchChange}
          placeholder="Código, barco, datas, fornecedor, pedido…"
          className="w-full rounded-2xl border border-transparent bg-white py-3 pl-10 pr-4 text-sm text-gray-800 shadow-sm outline-none ring-2 ring-gray-200/80 placeholder:text-gray-400 focus:border-primary/30 focus:ring-primary/35 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700 dark:focus:ring-primary/40"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
        {erro && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {erro}
          </p>
        )}
        {carregando ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            {query.trim() ? 'Nenhuma viagem corresponde à busca' : 'Nenhuma viagem encontrada'}
          </p>
        ) : (
          eventosFiltrados.map((ev) => (
            <button
              type="button"
              key={ev.id}
              onClick={() => setSelecionado(ev)}
              className={`flex w-full flex-col rounded-2xl px-4 py-3 text-left text-sm shadow-sm transition-colors ${
                selecionado?.id === ev.id
                  ? 'bg-gray-900 text-white ring-2 ring-gray-900 dark:bg-white dark:text-gray-900 dark:ring-white'
                  : 'bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Anchor className="mt-0.5 h-4 w-4 flex-none opacity-70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{ev.codigo || ev.id}</p>
                  <p className="mt-0.5 truncate text-xs opacity-80">{ev.embarcacao_nome || '—'}</p>
                </div>
              </div>
              <TimelineViagemFluvial ev={ev} />
            </button>
          ))
        )}
      </div>

      {selecionado && (
        <button
          type="button"
          onClick={() => onSelecionar(selecionado)}
          disabled={uploadando}
          className="mt-auto flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 text-sm font-semibold text-white dark:bg-white dark:text-gray-900"
        >
          {uploadando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" /> Anexar à viagem
            </>
          )}
        </button>
      )}
    </div>
  );
}
