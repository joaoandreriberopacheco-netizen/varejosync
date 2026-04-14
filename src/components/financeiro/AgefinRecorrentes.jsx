import React, { useState, useMemo, useCallback } from 'react';
import AgefinConsultaOrganizer from '@/components/agefin/AgefinConsultaOrganizer';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Repeat2,
  FileText,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  X,
  Wallet,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dataHoje } from '@/components/utils/dateUtils';
import { TAG_LF_BOLETO_PDF, TAG_LF_GERADO_AUTO, tagsOrigemBoleto } from '@/lib/agefinLancamentosRecorrencia';
import { getMonthKey, getContaDoMes, useRecorrentesBoletoData } from '@/hooks/useRecorrentesBoletoData';
import AgefinImportador from '@/components/agefin/AgefinImportador';
import { format } from 'date-fns';

function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function parseValorBusca(raw) {
  const s = String(raw || '')
    .trim()
    .replace(/r\$\s*/gi, '')
    .replace(/\s/g, '');
  if (!s || !/\d/.test(s)) return null;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function cardMatchesSearch({ recorrente, contaMes }, qRaw) {
  const q = qRaw.trim().toLowerCase();
  if (!q) return true;

  const text =
    `${recorrente.nome_despesa || ''} ${recorrente.terceiro_nome || ''} ${contaMes?.descricao || ''}`.toLowerCase();
  if (text.includes(q)) return true;

  const dv = contaMes?.data_vencimento;
  if (dv) {
    const br = format(new Date(`${String(dv).slice(0, 10)}T12:00:00`), 'dd/MM/yyyy').toLowerCase();
    const iso = String(dv).slice(0, 10).toLowerCase();
    if (br.includes(q) || iso.includes(q)) return true;
  }

  const nQ = parseValorBusca(qRaw);
  if (nQ != null) {
    const v = Number(recorrente.valor_previsto) || 0;
    if (Math.abs(v - nQ) < 0.009) return true;
    const formatted = v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (formatted.replace(/\s/g, '').includes(qRaw.replace(/\s/g, ''))) return true;
  }

  return false;
}

function FilterSection({ label, icon: Icon, options, value, onChange }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-muted-foreground">
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
                  : 'bg-gray-100 text-gray-600 shadow-sm dark:bg-card dark:text-muted-foreground dark:ring-1 dark:ring-border'
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

function AgefinCard({ recorrente, contaMes, onOpen }) {
  const hasBoleto = Boolean(contaMes?.forma_pagamento_tipo === 'Boleto' || contaMes?.forma_pagamento === 'Boleto');
  const isPaid = contaMes?.status === 'Pago';
  const todayKey = dataHoje();
  const isOverdue = !isPaid && contaMes?.data_vencimento && contaMes.data_vencimento < todayKey;
  const boletoVencido = hasBoleto && isOverdue;
  const atualizadoPdf = tagsOrigemBoleto(contaMes?.tags) === 'pdf';

  const ringContorno = isPaid
    ? 'ring-2 ring-[#5c6b3a] dark:ring-[#8a9a5c]'
    : atualizadoPdf
      ? 'ring-2 ring-lime-200 dark:ring-lime-400/50'
      : 'dark:ring-1 dark:ring-border';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen();
      }}
      className={`w-full cursor-pointer rounded-[28px] bg-white p-1 text-left shadow-sm dark:bg-card ${ringContorno}`}
    >
      <div className="space-y-2.5 rounded-[24px] bg-gray-50/95 px-3.5 py-3 dark:bg-muted/35">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            {(isPaid || isOverdue) && (
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  isPaid
                    ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)] dark:bg-emerald-300 dark:shadow-[0_0_0_3px_rgba(110,231,183,0.12)]'
                    : 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.18)] dark:bg-red-400 dark:shadow-[0_0_0_3px_rgba(248,113,113,0.16)]'
                }`}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[15px] font-semibold leading-5 text-gray-900 dark:text-foreground">{recorrente.nome_despesa}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-muted-foreground">{recorrente.terceiro_nome || 'Sem beneficiário'}</p>
                </div>
                <div className="shrink-0 pl-2 text-right">
                  <p className="text-[11px] text-gray-400 dark:text-muted-foreground">Previsto</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-foreground">{formatCurrency(recorrente.valor_previsto)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 dark:text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm dark:bg-card">
              <Repeat2 className="h-3 w-3" />
              {recorrente.frequencia}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm dark:bg-card">
              <Calendar className="h-3 w-3" />
              Dia {recorrente.dia_vencimento}
            </span>
          </div>

          <div className="relative shrink-0">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-[16px] bg-white shadow-sm dark:bg-card ${
                !isPaid && hasBoleto && boletoVencido ? 'ring-2 ring-red-400 dark:ring-red-400/75' : ''
              }`}
            >
              <FileText className="h-5 w-5 text-gray-500 dark:text-muted-foreground" />
            </div>
            {hasBoleto && (
              <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white shadow-sm dark:bg-card">
                <CheckCircle2 className={`h-3.5 w-3.5 ${isPaid ? 'text-emerald-500 dark:text-emerald-200' : 'text-gray-500 dark:text-muted-foreground'}`} />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgefinRecorrentes() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [importAlvo, setImportAlvo] = useState(null);
  const { recorrentes, contas, loading, reload } = useRecorrentesBoletoData();
  const [filterPagamento, setFilterPagamento] = useState('todos');
  const [filterPrazo, setFilterPrazo] = useState('todos');
  const [filterOrigem, setFilterOrigem] = useState('todos');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [groupBy, setGroupBy] = useState('nome');
  const [sortOrder, setSortOrder] = useState('asc');

  const monthKey = getMonthKey(currentMonth);

  const filteredCards = useMemo(() => {
    const todayKey = dataHoje();
    const tags = (c) => (Array.isArray(c?.tags) ? c.tags : []);

    const cards = recorrentes
      .map((recorrente) => {
        const contaMes = getContaDoMes(contas, recorrente, monthKey);
        return { recorrente, contaMes };
      })
      .filter((item) => item.contaMes && item.recorrente);

    let out = cards;

    if (filterPagamento === 'pagas') {
      out = out.filter((x) => x.contaMes?.status === 'Pago');
    } else if (filterPagamento === 'em_aberto') {
      out = out.filter((x) => x.contaMes?.status !== 'Pago');
    }

    if (filterPrazo === 'vencidas') {
      out = out.filter((x) => {
        const p = x.contaMes?.status === 'Pago';
        const o = !p && x.contaMes?.data_vencimento && x.contaMes.data_vencimento < todayKey;
        return o;
      });
    } else if (filterPrazo === 'em_dia') {
      out = out.filter((x) => {
        const p = x.contaMes?.status === 'Pago';
        const o = !p && x.contaMes?.data_vencimento && x.contaMes.data_vencimento < todayKey;
        return p || !o;
      });
    }

    if (filterOrigem === 'atualizadas') {
      out = out.filter((x) => tags(x.contaMes).includes(TAG_LF_BOLETO_PDF));
    } else if (filterOrigem === 'automaticas') {
      out = out.filter((x) => {
        const t = tags(x.contaMes);
        return t.includes(TAG_LF_GERADO_AUTO) && !t.includes(TAG_LF_BOLETO_PDF);
      });
    }

    if (search.trim()) {
      out = out.filter((item) => cardMatchesSearch(item, search));
    }

    return out;
  }, [recorrentes, contas, monthKey, filterPagamento, filterPrazo, filterOrigem, search]);

  const gruposCards = useMemo(() => {
    const todayKey = dataHoje();
    const metaFor = (item) => {
      const { recorrente, contaMes } = item;
      if (groupBy === 'nome') {
        const nome = (recorrente.nome_despesa || '').trim() || 'Sem nome';
        return { key: `n:${nome}`, label: nome, orderValue: nome.toLowerCase() };
      }
      if (groupBy === 'dia') {
        const d = String(recorrente.dia_vencimento ?? '');
        return { key: `d:${d}`, label: `Dia ${d || '—'}`, orderValue: d.padStart(2, '0') };
      }
      if (groupBy === 'situacao') {
        const pago = contaMes?.status === 'Pago';
        const venc = !pago && contaMes?.data_vencimento && contaMes.data_vencimento < todayKey;
        const order = pago ? '0' : venc ? '1' : '2';
        const label = pago ? 'Pagas' : venc ? 'Vencidas' : 'Em aberto';
        return { key: `s:${order}`, label, orderValue: order };
      }
      const nomeFallback = (recorrente.nome_despesa || '').trim() || 'Sem nome';
      return { key: `n:${nomeFallback}`, label: nomeFallback, orderValue: nomeFallback.toLowerCase() };
    };

    const map = {};
    filteredCards.forEach((item) => {
      const m = metaFor(item);
      if (!map[m.key]) map[m.key] = { key: m.key, label: m.label, orderValue: m.orderValue, items: [] };
      map[m.key].items.push(item);
    });

    const compareGroups = (a, b) => {
      if (groupBy === 'situacao') {
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
          const da = (a.contaMes?.data_vencimento || '').slice(0, 10);
          const db = (b.contaMes?.data_vencimento || '').slice(0, 10);
          const c = da.localeCompare(db);
          if (c !== 0) return sortOrder === 'asc' ? c : -c;
          return (a.recorrente.nome_despesa || '').localeCompare(b.recorrente.nome_despesa || '', 'pt-BR', { sensitivity: 'base' });
        }),
      }));
  }, [filteredCards, groupBy, sortOrder]);

  const hasActiveFilters =
    filterPagamento !== 'todos' || filterPrazo !== 'todos' || filterOrigem !== 'todos';

  const currentMonthText = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const limparBuscaFiltros = () => {
    setSearch('');
    setFilterPagamento('todos');
    setFilterPrazo('todos');
    setFilterOrigem('todos');
  };

  const abrirAtualizacao = useCallback((recorrente, contaMes) => {
    if (!contaMes?.id) return;
    setImportAlvo({ recorrente, contaMes });
  }, []);

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-[28px] bg-white p-4 shadow-sm dark:bg-card dark:ring-1 dark:ring-border">
        <div className="mb-3 rounded-2xl bg-gray-50 px-3 py-2 dark:bg-muted/40">
          <p className="text-[11px] leading-4 text-gray-500 dark:text-muted-foreground">
            Toque num cartão para importar o PDF do boleto, rever dados e guardar; em seguida volta à lista para a conta seguinte. Contorno verde-lima = boleto já atualizado por PDF; verde-oliva = pago.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full p-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 text-center">
            <p className="text-sm font-semibold capitalize text-gray-900 dark:text-foreground">{currentMonthText}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-muted-foreground">Atualize os boletos recorrentes do período</p>
          </div>
          <Button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full p-0"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="rounded-[24px] bg-[#EEF1F4] p-2.5 dark:bg-muted/40">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-white px-3 dark:bg-card dark:ring-1 dark:ring-border">
            <Search className="h-4 w-4 shrink-0 text-gray-400 dark:text-muted-foreground" />
            <input autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, valor, vencimento…"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500 dark:text-foreground dark:placeholder:text-muted-foreground"
            />
            {search ? (
              <button type="button" onClick={() => setSearch('')} className="shrink-0">
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            ) : null}
          </div>
          <AgefinConsultaOrganizer
            variant="recorrentes"
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
            <SlidersHorizontal className="h-4 w-4 text-gray-800 dark:text-foreground" />
            {hasActiveFilters ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                ·
              </span>
            ) : null}
          </button>
        </div>
        <div className="flex items-center justify-between px-1 pt-2">
          <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
            {filteredCards.length} conta{filteredCards.length !== 1 ? 's' : ''}
          </p>
          {(hasActiveFilters || search) && (
            <button type="button" onClick={limparBuscaFiltros} className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-muted-foreground">
              <X className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>
      </div>

      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <DrawerContent className="rounded-t-[28px] border-0 bg-white px-4 pb-6 dark:bg-card">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="font-glacial text-gray-900 dark:text-foreground">Filtros</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto">
            <FilterSection
              label="Pagamento"
              icon={Wallet}
              value={filterPagamento}
              onChange={setFilterPagamento}
              options={[
                { id: 'todos', label: 'Todas' },
                { id: 'pagas', label: 'Pagas' },
                { id: 'em_aberto', label: 'Em aberto' },
              ]}
            />
            <FilterSection
              label="Prazo"
              icon={CalendarClock}
              value={filterPrazo}
              onChange={setFilterPrazo}
              options={[
                { id: 'todos', label: 'Todas' },
                { id: 'vencidas', label: 'Vencidas' },
                { id: 'em_dia', label: 'Em dia' },
              ]}
            />
            <FilterSection
              label="Origem do lançamento"
              icon={Sparkles}
              value={filterOrigem}
              onChange={setFilterOrigem}
              options={[
                { id: 'todos', label: 'Todas' },
                { id: 'atualizadas', label: 'Atualizadas (PDF)' },
                { id: 'automaticas', label: 'Automáticas' },
              ]}
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFilterPagamento('todos');
                  setFilterPrazo('todos');
                  setFilterOrigem('todos');
                }}
                className="h-11 flex-1 rounded-2xl bg-gray-100 text-sm text-gray-600 dark:bg-muted dark:text-muted-foreground"
              >
                Redefinir
              </button>
              <button type="button" onClick={() => setFilterOpen(false)} className="h-11 flex-1 rounded-2xl bg-primary text-sm font-medium text-primary-foreground">
                Aplicar
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200" />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="rounded-[28px] bg-white py-12 text-center shadow-sm dark:bg-card dark:ring-1 dark:ring-border">
          <Repeat2 className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-muted-foreground" />
          <p className="mb-1 font-medium text-gray-800 dark:text-foreground">Nenhuma conta recorrente nesta visão</p>
          <p className="text-sm text-gray-500 dark:text-muted-foreground">Altere o mês, a busca ou os filtros para ver outras contas.</p>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl space-y-6 md:max-w-4xl">
          {gruposCards.map((grupo) => (
            <section key={grupo.key} className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2 px-0.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-muted-foreground">{grupo.label}</h3>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">{grupo.items.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {grupo.items.map(({ recorrente, contaMes }) => (
                  <AgefinCard
                    key={`${recorrente.grupo_lancamento_id}-${monthKey}-${grupo.key}`}
                    recorrente={recorrente}
                    contaMes={contaMes}
                    onOpen={() => abrirAtualizacao(recorrente, contaMes)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={Boolean(importAlvo)} onOpenChange={(open) => !open && setImportAlvo(null)}>
        <DialogContent className="flex h-[100dvh] min-h-0 w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-white/95 p-0 shadow-xl backdrop-blur-xl dark:bg-slate-900/95 md:h-auto md:max-h-[92vh] md:w-[min(42rem,calc(100vw-2rem))] md:max-w-2xl md:rounded-3xl">
          <DialogHeader className="shrink-0 border-b border-gray-100 px-5 pb-3 pt-5 dark:border-gray-800">
            <DialogTitle className="text-gray-900 dark:text-white">
              {importAlvo ? `Atualizar boleto · ${importAlvo.recorrente?.nome_despesa || 'Recorrente'}` : 'Atualizar boleto'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none">
            {importAlvo?.contaMes?.id ? (
              <AgefinImportador
                key={importAlvo.contaMes.id}
                modoAtualizacao
                fluxoLoopAtualizadorRecorrente
                contaPrevistaId={importAlvo.contaMes.referencia_id || undefined}
                lancamentoFinanceiroId={importAlvo.contaMes.id}
                dadosContaExistente={{
                  descricao: importAlvo.recorrente?.nome_despesa || importAlvo.contaMes.descricao || '',
                  terceiro_nome: importAlvo.recorrente?.terceiro_nome || importAlvo.contaMes.terceiro_nome || '',
                  conta_financeira_id: importAlvo.contaMes.conta_financeira_id || undefined,
                }}
                onSuccess={(_, meta) => {
                  if (meta?.close) {
                    setImportAlvo(null);
                    reload();
                  }
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
