import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, RefreshCw, Calendar, Repeat, Sparkles, FileText, Search, SlidersHorizontal, X } from 'lucide-react';
import AgefinAtualizacaoDialog from './AgefinAtualizacaoDialog';
import { lancamentoEntraNoAtualizadorBoletos, tagsOrigemBoleto } from '@/lib/agefinLancamentosRecorrencia';
import AgefinConsultaOrganizer from '@/components/agefin/AgefinConsultaOrganizer';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { dataHoje } from '@/components/utils/dateUtils';

const FREQ_LABEL = {
  Semanal: 'Semanal',
  Mensal: 'Mensal',
  Bimestral: 'Bimestral',
  Trimestral: 'Trimestral',
  Semestral: 'Semestral',
  Anual: 'Anual',
  Parcelado: 'Parcelado',
};

function grupoDomId(key) {
  return `agefin-boleto-grupo-${String(key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function FilterSection({ label, icon: Icon, options, value, onChange }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`rounded-full px-3 py-2 text-xs font-medium transition-all md:text-sm ${
                active
                  ? 'bg-primary/15 text-foreground ring-1 ring-primary/40 dark:bg-muted dark:ring-primary/45'
                  : 'bg-gray-100 text-muted-foreground shadow-sm dark:bg-card dark:text-muted-foreground dark:ring-1 dark:ring-border'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AgefinAtualizador({ onRefresh }) {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterOrigem, setFilterOrigem] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterOpen, setFilterOpen] = useState(false);
  const [groupBy, setGroupBy] = useState('mes');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadLancamentos();
  }, []);

  const loadLancamentos = async () => {
    try {
      setLoading(true);
      const [comFlag, resto] = await Promise.all([
        base44.entities.LancamentoFinanceiro.filter({ is_recorrente: true }, '-data_vencimento', 400),
        base44.entities.LancamentoFinanceiro.list('-data_vencimento', 400),
      ]);
      const todos = [...(comFlag || []), ...(resto || [])];
      const vistos = new Set();
      const unicos = todos.filter((l) => {
        if (vistos.has(l.id)) return false;
        vistos.add(l.id);
        return true;
      });

      const filtrados = unicos.filter(lancamentoEntraNoAtualizadorBoletos);
      /* Mais antigo primeiro — alinha ao padrão do atualizador de recorrentes */
      filtrados.sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));
      setLancamentos(filtrados);
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const todayKey = dataHoje();

  const filtradosBusca = useMemo(() => {
    let list = lancamentos;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          (l.descricao || '').toLowerCase().includes(q) ||
          (l.terceiro_nome || '').toLowerCase().includes(q) ||
          (l.data_vencimento || '').includes(q)
      );
    }
    if (filterOrigem === 'pdf') {
      list = list.filter((l) => tagsOrigemBoleto(l.tags) === 'pdf');
    } else if (filterOrigem === 'auto') {
      list = list.filter((l) => tagsOrigemBoleto(l.tags) === 'auto');
    } else if (filterOrigem === 'outro') {
      list = list.filter((l) => !tagsOrigemBoleto(l.tags));
    }
    if (filterStatus === 'aberto') {
      list = list.filter((l) => l.status === 'Em Aberto');
    } else if (filterStatus === 'vencido') {
      list = list.filter((l) => l.status === 'Vencido' || (l.status !== 'Pago' && l.data_vencimento && l.data_vencimento < todayKey));
    } else if (filterStatus === 'pago') {
      list = list.filter((l) => l.status === 'Pago');
    }
    return list;
  }, [lancamentos, search, filterOrigem, filterStatus, todayKey]);

  const grupos = useMemo(() => {
    const metaFor = (l) => {
      if (groupBy === 'mes') {
        const mk = (l.data_vencimento || '').slice(0, 7) || 'sem-mes';
        return { key: `m:${mk}`, label: mk === 'sem-mes' ? 'Sem mês' : mk, orderValue: mk };
      }
      if (groupBy === 'grupo') {
        const gid = l.grupo_lancamento_id || 'sem-grupo';
        const label = gid === 'sem-grupo' ? 'Sem grupo' : (l.descricao || 'Série').slice(0, 40);
        return { key: `g:${gid}`, label, orderValue: String(gid) };
      }
      if (groupBy === 'favorecido') {
        const nome = (l.terceiro_nome || '').trim() || 'Sem favorecido';
        return { key: `f:${nome}`, label: nome, orderValue: nome.toLowerCase() };
      }
      const o = tagsOrigemBoleto(l.tags);
      const label = o === 'pdf' ? 'PDF importado' : o === 'auto' ? 'Automático' : 'Outro / manual';
      const order = o === 'pdf' ? 0 : o === 'auto' ? 1 : 2;
      return { key: `o:${o || 'x'}`, label, orderValue: String(order) };
    };

    const map = {};
    filtradosBusca.forEach((l) => {
      const m = metaFor(l);
      if (!map[m.key]) map[m.key] = { key: m.key, label: m.label, orderValue: m.orderValue, items: [] };
      map[m.key].items.push(l);
    });

    const compareGroups = (a, b) => {
      if (groupBy === 'origem') {
        const ia = Number(a.orderValue);
        const ib = Number(b.orderValue);
        return sortOrder === 'asc' ? ia - ib : ib - ia;
      }
      const cmp = String(a.orderValue).localeCompare(String(b.orderValue), 'pt-BR', { sensitivity: 'base' });
      return sortOrder === 'asc' ? cmp : -cmp;
    };

    return Object.values(map)
      .sort(compareGroups)
      .map((g) => ({
        ...g,
        items: [...g.items].sort((a, b) => {
          const c = (a.data_vencimento || '').localeCompare(b.data_vencimento || '');
          if (c !== 0) return sortOrder === 'asc' ? c : -c;
          return (a.descricao || '').localeCompare(b.descricao || '', 'pt-BR', { sensitivity: 'base' });
        }),
      }));
  }, [filtradosBusca, groupBy, sortOrder]);

  const hasActiveFilters = filterOrigem !== 'todos' || filterStatus !== 'todos';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200 rounded-full animate-spin" />
      </div>
    );
  }

  if (lancamentos.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        <Repeat className="w-8 h-8 mx-auto mb-3 opacity-30" />
        <p className="mb-2">
          Nenhum lançamento com tag <strong className="text-muted-foreground">conta_pagar</strong> ou com{' '}
          <strong className="text-muted-foreground">recorrência</strong> encontrado.
        </p>
        <p className="text-xs max-w-sm mx-auto">
          Inclui contas pontuais e séries recorrentes. A sincronização mensal das parcelas continua ao abrir o fluxo de caixa (Contas abertas / recorrentes).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[22px] bg-[#EEF1F4] p-2.5 dark:bg-muted/40">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-white px-3 dark:bg-card dark:ring-1 dark:ring-border">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground dark:text-muted-foreground" />
            <input
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Descrição, favorecido, data…"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground dark:text-foreground dark:placeholder:text-muted-foreground"
            />
            {search ? (
              <button type="button" onClick={() => setSearch('')} className="shrink-0">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ) : null}
          </div>
          <AgefinConsultaOrganizer
            variant="boleto"
            groupBy={groupBy}
            sortOrder={sortOrder}
            onGroupByChange={setGroupBy}
            onSortOrderToggle={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
          />
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-card dark:ring-1 dark:ring-border"
          >
            <SlidersHorizontal className="h-4 w-4 text-foreground" />
            {hasActiveFilters ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                ·
              </span>
            ) : null}
          </button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted-foreground dark:text-muted-foreground">
          {filtradosBusca.length} de {lancamentos.length} lançamento{filtradosBusca.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <DrawerContent className="rounded-t-[28px] border-0 bg-white px-4 pb-6 dark:bg-card">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="font-glacial text-foreground dark:text-foreground">Filtros</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto">
            <FilterSection
              label="Origem"
              icon={Sparkles}
              value={filterOrigem}
              onChange={setFilterOrigem}
              options={[
                { id: 'todos', label: 'Todas' },
                { id: 'pdf', label: 'PDF importado' },
                { id: 'auto', label: 'Automático' },
                { id: 'outro', label: 'Outro / manual' },
              ]}
            />
            <FilterSection
              label="Situação"
              icon={Calendar}
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { id: 'todos', label: 'Todas' },
                { id: 'aberto', label: 'Em aberto' },
                { id: 'vencido', label: 'Vencido' },
                { id: 'pago', label: 'Pago' },
              ]}
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFilterOrigem('todos');
                  setFilterStatus('todos');
                }}
                className="h-11 flex-1 rounded-2xl bg-gray-100 text-sm text-muted-foreground dark:bg-muted dark:text-muted-foreground"
              >
                Redefinir
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="h-11 flex-1 rounded-2xl bg-primary text-sm font-medium text-primary-foreground"
              >
                Aplicar
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {filtradosBusca.length === 0 ? (
        <div className="rounded-[24px] bg-white py-10 text-center text-sm text-muted-foreground shadow-sm dark:bg-card dark:ring-1 dark:ring-border dark:text-muted-foreground">
          Nenhum resultado com os filtros e a pesquisa atuais.
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((grupo) => (
            <section key={grupo.key} id={grupoDomId(grupo.key)} className="scroll-mt-20 space-y-2">
              <div className="flex items-baseline justify-between gap-2 px-0.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-muted-foreground">{grupo.label}</h3>
                <span className="text-[11px] text-muted-foreground">{grupo.items.length}</span>
              </div>
              <div className="space-y-2">
                {grupo.items.map((l) => {
                  const origem = tagsOrigemBoleto(l.tags);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelected(l)}
                      className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left shadow-sm transition-all hover:shadow-md dark:bg-background"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{l.descricao}</p>
                          {origem === 'pdf' && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                              <FileText className="h-3 w-3" /> PDF
                            </span>
                          )}
                          {origem === 'auto' && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                              <Sparkles className="h-3 w-3" /> Auto
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {l.data_vencimento}
                          {l.frequencia_recorrencia && (
                            <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-muted-foreground dark:bg-muted dark:text-muted-foreground">
                              {FREQ_LABEL[l.frequencia_recorrencia] || l.frequencia_recorrencia}
                            </span>
                          )}
                          {l.terceiro_nome && <span className="ml-1">· {l.terceiro_nome}</span>}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-foreground/90">
                          R$ {(l.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span
                          className={`text-xs ${
                            l.status === 'Em Aberto'
                              ? 'text-amber-500'
                              : l.status === 'Vencido'
                                ? 'text-red-500'
                                : l.status === 'Pago'
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                          }`}
                        >
                          {l.status}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {selected && (
        <AgefinAtualizacaoDialog
          open={!!selected}
          lancamento={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            setSelected(null);
            loadLancamentos();
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
