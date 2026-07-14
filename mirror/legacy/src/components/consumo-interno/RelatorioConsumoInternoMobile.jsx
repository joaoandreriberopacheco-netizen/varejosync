import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Printer,
  Search,
  SlidersHorizontal,
  X,
  Package,
  Calendar,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { P38MobileLine, P38MobileLineList } from '@/components/ui/p38-mobile-line';
import { cn } from '@/components/utils';
import { brandSurface } from '@/lib/brandSurfaces';
import { p38Mobile, P38MobileKpiGrid } from '@/lib/p38MobileSurfaces';
import { p38Table } from '@/lib/p38TableSurfaces';
import { p38Accent } from '@/lib/p38ThemeSurfaces';
import {
  FILTRO_TEMPORAL_LABELS,
  AGRUPAMENTO_LABELS,
  MODO_LABELS,
  formatCurrency,
  agregarProdutosDoGrupo,
} from '@/lib/relatorioConsumoInterno';

function PeriodChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wide whitespace-nowrap transition-colors',
        active ? 'bg-primary text-primary-foreground' : p38Mobile.filterChip
      )}
    >
      {children}
    </button>
  );
}

function ConsumoMobileReportHeader({ filtrosTexto, empresaNome }) {
  const filtrosDesc = filtrosTexto.join(' · ');
  return (
    <div className={cn('relative mx-0 mt-0 overflow-hidden rounded-lg border', p38Mobile.panel)}>
      <div className={cn('absolute left-3 top-4 bottom-4 w-[3px] rounded-sm', p38Table.panelAccentBar)} aria-hidden />
      <div className="pl-7 pr-3 py-3">
        <p className="text-base font-semibold uppercase tracking-wide leading-tight text-foreground">
          Consumo interno
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Relatório · mobile
        </p>
        {empresaNome ? (
          <p className="mt-1 text-xs text-muted-foreground">{empresaNome}</p>
        ) : null}
        <p className="mt-2 line-clamp-3 text-[11px] leading-snug text-muted-foreground">{filtrosDesc}</p>
        <p className="mt-2 text-right text-[9px] tabular-nums text-muted-foreground">
          Gerado {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </p>
      </div>
    </div>
  );
}

function GrupoHeaderMobile({ grupo }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/40 px-1 py-2 dark:border-white/10">
      <p className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground line-clamp-2">
        {grupo.label}
      </p>
      <div className="shrink-0 text-right">
        <p className={cn('text-sm font-semibold tabular-nums', p38Accent.success.text)}>
          {formatCurrency(grupo.total)}
        </p>
        {grupo.registros != null && (
          <p className="text-[10px] text-muted-foreground">
            {grupo.registros} reg. · {grupo.itens} it.
          </p>
        )}
      </div>
    </div>
  );
}

function GrupoResumidoMobile({ grupo, agrupamento }) {
  const produtos = useMemo(() => agregarProdutosDoGrupo(grupo, agrupamento), [grupo, agrupamento]);

  return (
    <section className="space-y-0">
      <GrupoHeaderMobile grupo={grupo} />
      <P38MobileLineList className="rounded-lg border border-border/40 dark:border-white/10">
        {produtos.map((it, index) => (
          <P38MobileLine
            key={it.nome}
            thinAccent
            striped={index % 2 === 1}
            accent="success"
            title={it.nome}
            subtitle={`${it.qtd} ${it.unidade}`.trim()}
            value={<span className={p38Accent.success.text}>{formatCurrency(it.subtotal)}</span>}
          />
        ))}
      </P38MobileLineList>
    </section>
  );
}

function GrupoCompletoMobile({ grupo }) {
  return (
    <section className="space-y-0">
      <GrupoHeaderMobile grupo={grupo} />
      <P38MobileLineList className="rounded-lg border border-border/40 dark:border-white/10">
        {(grupo.consumos || []).map((c, index) => {
          const quando = c.data_confirmacao || c.created_date;
          const subtitulo = [c.destinacao, c.responsavel_recebimento].filter(Boolean).join(' · ');
          return (
            <P38MobileLine
              key={c.id}
              thinAccent
              striped={index % 2 === 1}
              accent="success"
              title={c.numero}
              subtitle={subtitulo}
              meta={
                <>
                  {quando && (
                    <span className="inline-flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(quando), 'dd/MM HH:mm', { locale: ptBR })}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5">
                    <Package className="h-3 w-3" />
                    {c.quantidade_total_itens ?? (c.itens?.length || 0)} it.
                  </span>
                </>
              }
              value={<span className={p38Accent.success.text}>{formatCurrency(c.valor_total)}</span>}
            />
          );
        })}
      </P38MobileLineList>
    </section>
  );
}

export function countRelatorioConsumoFiltrosAtivos({
  filtroTemporal,
  destinacaoFiltro,
  responsavelFiltro,
  search,
  agrupamento,
  modo,
}) {
  let n = 0;
  if (filtroTemporal !== '30d') n += 1;
  if (destinacaoFiltro !== '__todos__') n += 1;
  if (responsavelFiltro !== '__todos__') n += 1;
  if (search?.trim()) n += 1;
  if (agrupamento !== 'destinacao') n += 1;
  if (modo !== 'resumido') n += 1;
  return n;
}

export default function RelatorioConsumoInternoMobile({
  loading,
  empresa,
  totais,
  grupos,
  filtrosTexto,
  consumosFiltrados,
  filtroTemporal,
  setFiltroTemporal,
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  destinacaoFiltro,
  setDestinacaoFiltro,
  responsavelFiltro,
  setResponsavelFiltro,
  agrupamento,
  setAgrupamento,
  modo,
  setModo,
  search,
  setSearch,
  destinacoesUnicas,
  responsaveisUnicos,
  onPrint,
}) {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const activeFilterCount = countRelatorioConsumoFiltrosAtivos({
    filtroTemporal,
    destinacaoFiltro,
    responsavelFiltro,
    search,
    agrupamento,
    modo,
  });

  const kpiItems = [
    { label: 'Valor total', value: formatCurrency(totais.valor), accent: true },
    { label: 'Registros', value: String(totais.registros) },
    { label: 'Itens (qtd)', value: String(totais.itens) },
    { label: 'Grupos', value: String(grupos.length), accent: grupos.length > 0 },
  ];

  return (
    <div className={cn('font-din-1451 flex min-h-[100dvh] flex-col overflow-hidden md:hidden', brandSurface.pageScreen)}>
      <div className="z-10 flex-none border-b border-border/40 bg-background">
        <div className="space-y-2 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Link
                to="/ConsumoInterno"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-muted"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5 text-foreground/90" />
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-foreground">Consumo interno</h1>
                <p className="truncate text-[11px] text-muted-foreground">
                  {MODO_LABELS[modo]} · {AGRUPAMENTO_LABELS[agrupamento]}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onPrint}
              disabled={loading || consumosFiltrados.length === 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-muted disabled:opacity-40"
              title="Imprimir"
            >
              <Printer className="h-4 w-4 text-foreground/90" />
            </button>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className={cn(p38Mobile.searchInput, 'h-10 rounded-xl pl-9')}
              />
            </div>
            <Drawer open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    activeFilterCount > 0 ? 'bg-primary/15 text-primary' : 'bg-muted dark:bg-[#26262e]'
                  )}
                  title="Filtros"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </DrawerTrigger>
              <DrawerContent className="rounded-t-[28px] border-0 bg-card px-4 pb-8">
                <DrawerHeader className="px-0 text-left">
                  <DrawerTitle className="text-foreground">Filtros do relatório</DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground">
                    Período, destinação, agrupamento e modo de visualização.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="max-h-[70vh] space-y-5 overflow-y-auto pb-2">
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Período</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(FILTRO_TEMPORAL_LABELS).map(([key, label]) => (
                        <PeriodChip
                          key={key}
                          active={filtroTemporal === key}
                          onClick={() => setFiltroTemporal(key)}
                        >
                          {label}
                        </PeriodChip>
                      ))}
                    </div>
                    {filtroTemporal === 'personalizado' && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Início</label>
                          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={p38Mobile.searchInput} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Fim</label>
                          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={p38Mobile.searchInput} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Destinação</label>
                      <Select value={destinacaoFiltro} onValueChange={setDestinacaoFiltro}>
                        <SelectTrigger className={cn(p38Mobile.searchInput, 'h-11')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__todos__">Todas</SelectItem>
                          {destinacoesUnicas.map((nome) => (
                            <SelectItem key={nome} value={nome}>
                              {nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Responsável</label>
                      <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
                        <SelectTrigger className={cn(p38Mobile.searchInput, 'h-11')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__todos__">Todos</SelectItem>
                          {responsaveisUnicos.map((nome) => (
                            <SelectItem key={nome} value={nome}>
                              {nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Agrupar por</label>
                      <Select value={agrupamento} onValueChange={setAgrupamento}>
                        <SelectTrigger className={cn(p38Mobile.searchInput, 'h-11')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(AGRUPAMENTO_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Modo</label>
                      <Select value={modo} onValueChange={setModo}>
                        <SelectTrigger className={cn(p38Mobile.searchInput, 'h-11')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MODO_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFiltroTemporal('30d');
                  setDestinacaoFiltro('__todos__');
                  setResponsavelFiltro('__todos__');
                  setSearch('');
                  setAgrupamento('destinacao');
                  setModo('resumido');
                  setDataInicio('');
                  setDataFim('');
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"
                title="Limpar filtros"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <P38MobileKpiGrid items={kpiItems} className="pb-1" />
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 pb-[var(--p38-scroll-pad-below-nav,5rem)]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="space-y-4 py-3">
          <ConsumoMobileReportHeader
            filtrosTexto={filtrosTexto}
            empresaNome={empresa?.nome_fantasia || empresa?.razao_social || ''}
          />

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
            </div>
          ) : consumosFiltrados.length === 0 ? (
            <div className={cn('rounded-lg px-4 py-12 text-center text-sm text-muted-foreground', p38Mobile.detailPanel)}>
              Nenhum consumo encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="space-y-5">
              {grupos.map((grupo) =>
                modo === 'completo' && agrupamento !== 'produto' ? (
                  <GrupoCompletoMobile key={grupo.key} grupo={grupo} />
                ) : (
                  <GrupoResumidoMobile key={grupo.key} grupo={grupo} agrupamento={agrupamento} />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
