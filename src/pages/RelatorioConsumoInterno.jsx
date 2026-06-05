import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Printer,
  RefreshCw,
  Search,
  MapPin,
  UserRound,
  Package,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';
import {
  FILTRO_TEMPORAL_LABELS,
  AGRUPAMENTO_LABELS,
  MODO_LABELS,
  formatCurrency,
  getDateRange,
  filterConsumos,
  groupConsumos,
  describeFiltrosAplicados,
  buildPrintHtml,
  agregarProdutosDoGrupo,
} from '@/lib/relatorioConsumoInterno';
import RelatorioConsumoInternoMobile from '@/components/consumo-interno/RelatorioConsumoInternoMobile';
import { cn } from '@/components/utils';
import { brandSurface } from '@/lib/brandSurfaces';
import { p38Mobile, P38MobileKpiGrid } from '@/lib/p38MobileSurfaces';
import { p38Table } from '@/lib/p38TableSurfaces';
import { p38Accent } from '@/lib/p38ThemeSurfaces';

function PeriodFilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wide transition-colors whitespace-nowrap',
        active ? 'bg-primary text-primary-foreground' : p38Mobile.filterChip
      )}
    >
      {children}
    </button>
  );
}

function GrupoResumidoCard({ grupo, agrupamento }) {
  const itensAgrupados = useMemo(() => agregarProdutosDoGrupo(grupo, agrupamento), [grupo, agrupamento]);

  return (
    <div className={cn('relative rounded-[24px] px-4 py-3.5', brandSurface.card)}>
      <div className={cn('absolute left-0 top-3 bottom-3 w-[3px] rounded-sm', p38Table.panelAccentBar)} aria-hidden />
      <div className="pl-3">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold uppercase tracking-wide text-foreground">{grupo.label}</p>
            {grupo.registros != null && (
              <p className="text-xs text-muted-foreground">
                {grupo.registros} registro{grupo.registros !== 1 ? 's' : ''}
                {grupo.itens != null ? ` · ${grupo.itens} item(ns)` : ''}
              </p>
            )}
          </div>
          <p className={cn('text-lg font-semibold tabular-nums shrink-0', p38Accent.success.text)}>
            {formatCurrency(grupo.total)}
          </p>
        </div>
        {itensAgrupados.length > 0 && (
          <div className="space-y-1 border-t border-border/40 pt-3 dark:border-white/10">
            {itensAgrupados.map((it) => (
              <div key={it.nome} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{it.nome}</span>
                <span className="shrink-0 text-muted-foreground">
                  {it.qtd} {it.unidade}
                </span>
                <span className={cn('shrink-0 font-medium tabular-nums', p38Accent.success.text)}>
                  {formatCurrency(it.subtotal)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GrupoCompletoCard({ grupo }) {
  return (
    <div className={cn('space-y-3 rounded-[24px] p-4', brandSurface.card)}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold uppercase tracking-wide text-foreground">{grupo.label}</p>
        <p className={cn('text-lg font-semibold tabular-nums shrink-0', p38Accent.success.text)}>
          {formatCurrency(grupo.total)}
        </p>
      </div>
      {(grupo.consumos || []).map((c) => {
        const quando = c.data_confirmacao || c.created_date;
        return (
          <div key={c.id} className={cn('rounded-2xl px-3 py-2.5', p38Mobile.detailPanel)}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{c.numero}</p>
              <p className={cn('text-sm font-semibold tabular-nums', p38Accent.success.text)}>
                {formatCurrency(c.valor_total)}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {c.destinacao}
              </span>
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3 w-3" />
                {c.responsavel_recebimento}
              </span>
              {quando && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(quando), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {(c.itens || []).map((it, idx) => (
                <div key={idx} className="flex justify-between gap-2 text-xs">
                  <span className="text-foreground">{it.produto_nome}</span>
                  <span className="text-muted-foreground">
                    {it.quantidade} {it.unidade_medida}
                  </span>
                  <span className="tabular-nums">{formatCurrency(it.subtotal)}</span>
                </div>
              ))}
            </div>
            {c.observacoes && (
              <p className="mt-2 text-xs italic text-muted-foreground">Obs: {c.observacoes}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RelatorioConsumoInternoPage() {
  const [consumos, setConsumos] = useState([]);
  const [destinacoes, setDestinacoes] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTemporal, setFiltroTemporal] = useState('30d');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [destinacaoFiltro, setDestinacaoFiltro] = useState('__todos__');
  const [responsavelFiltro, setResponsavelFiltro] = useState('__todos__');
  const [agrupamento, setAgrupamento] = useState('destinacao');
  const [modo, setModo] = useState('resumido');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [consumosData, destData, respData, empresaData] = await Promise.all([
        base44.entities.ConsumoInterno.list('-created_date'),
        base44.entities.DestinacaoConsumoInterno.list(),
        base44.entities.ResponsavelConsumoInterno.list(),
        base44.entities.DadosEmpresa.list(),
      ]);
      setConsumos(consumosData || []);
      setDestinacoes(destData || []);
      setResponsaveis(respData || []);
      setEmpresa(empresaData?.[0] || null);
    } catch (err) {
      console.error('Erro ao carregar relatório de consumo interno', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const range = useMemo(
    () => getDateRange(filtroTemporal, dataInicio, dataFim),
    [filtroTemporal, dataInicio, dataFim]
  );

  const consumosFiltrados = useMemo(
    () =>
      filterConsumos(consumos, {
        range,
        search,
        destinacao: destinacaoFiltro,
        responsavel: responsavelFiltro,
      }),
    [consumos, range, search, destinacaoFiltro, responsavelFiltro]
  );

  const grupos = useMemo(
    () => groupConsumos(consumosFiltrados, agrupamento),
    [consumosFiltrados, agrupamento]
  );

  const totais = useMemo(() => {
    const valor = consumosFiltrados.reduce((s, c) => s + (c.valor_total || 0), 0);
    const itens = consumosFiltrados.reduce(
      (s, c) =>
        s +
        (c.quantidade_total_itens ||
          (c.itens || []).reduce((a, it) => a + (it.quantidade || 0), 0)),
      0
    );
    return { valor, registros: consumosFiltrados.length, itens };
  }, [consumosFiltrados]);

  const filtrosTexto = useMemo(
    () =>
      describeFiltrosAplicados({
        filtroTemporal,
        dataInicio,
        dataFim,
        range,
        search,
        destinacao: destinacaoFiltro,
        responsavel: responsavelFiltro,
        agrupamento,
        modo,
      }),
    [
      filtroTemporal,
      dataInicio,
      dataFim,
      range,
      search,
      destinacaoFiltro,
      responsavelFiltro,
      agrupamento,
      modo,
    ]
  );

  const destinacoesUnicas = useMemo(() => {
    const nomes = new Set();
    destinacoes.forEach((d) => d.nome && nomes.add(d.nome));
    consumos.forEach((c) => c.destinacao && nomes.add(c.destinacao));
    return Array.from(nomes).sort((a, b) => a.localeCompare(b));
  }, [destinacoes, consumos]);

  const responsaveisUnicos = useMemo(() => {
    const nomes = new Set();
    responsaveis.forEach((r) => r.nome && nomes.add(r.nome));
    consumos.forEach((c) => c.responsavel_recebimento && nomes.add(c.responsavel_recebimento));
    return Array.from(nomes).sort((a, b) => a.localeCompare(b));
  }, [responsaveis, consumos]);

  const handlePrint = async () => {
    const html = buildPrintHtml({
      grupos,
      agrupamento,
      modo,
      filtrosTexto,
      totais,
      empresaNome: empresa?.nome_fantasia || empresa?.razao_social || '',
    });
    try {
      await openPrintWindowOrShareHtml(
        html,
        `consumo-interno-relatorio-${Date.now()}.html`,
        'Relatório de Consumo Interno'
      );
    } catch {
      /* popup bloqueado */
    }
  };

  const mobileProps = {
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
    onPrint: handlePrint,
  };

  const kpiItems = [
    { label: 'Valor total', value: formatCurrency(totais.valor), accent: true },
    { label: 'Registros', value: String(totais.registros) },
    { label: 'Itens (qtd)', value: String(totais.itens) },
    { label: 'Grupos', value: String(grupos.length), accent: grupos.length > 0 },
  ];

  return (
    <>
      <RelatorioConsumoInternoMobile {...mobileProps} />

      <div className={cn('hidden min-h-screen md:block md:p-6 font-din-1451', brandSurface.pageScreen)}>
        <div className="mx-auto max-w-6xl space-y-5 pb-12">
          <div className={cn('rounded-[28px] p-5', brandSurface.card)}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-2xl" asChild>
                  <Link to="/ConsumoInterno" title="Voltar ao consumo interno">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Relatório</p>
                  <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Consumo Interno</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Consulta com agrupamento e impressão dos filtros aplicados.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadData}
                  className={cn('rounded-2xl border border-border/40 p-3 transition-colors hover:bg-primary/10', brandSurface.card)}
                  style={{ minWidth: 48, minHeight: 48 }}
                  aria-label="Atualizar"
                >
                  <RefreshCw className={cn('h-5 w-5 text-muted-foreground', loading && 'animate-spin')} />
                </button>
                <Button
                  onClick={handlePrint}
                  disabled={loading || consumosFiltrados.length === 0}
                  className="h-12 gap-2 rounded-2xl px-4"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>

          <P38MobileKpiGrid items={kpiItems} columns={4} className="px-1" />

          <div className={cn('space-y-4 rounded-[28px] p-5', brandSurface.card)}>
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground">Período</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(FILTRO_TEMPORAL_LABELS).map(([key, label]) => (
                <PeriodFilterChip
                  key={key}
                  active={filtroTemporal === key}
                  onClick={() => setFiltroTemporal(key)}
                >
                  {label}
                </PeriodFilterChip>
              ))}
            </div>
            {filtroTemporal === 'personalizado' && (
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Data início</label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className={cn(p38Mobile.searchInput, 'h-10 w-40')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Data fim</label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className={cn(p38Mobile.searchInput, 'h-10 w-40')}
                  />
                </div>
              </div>
            )}
          </div>

          <div className={cn('space-y-4 rounded-[28px] p-5', brandSurface.card)}>
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground">Filtros e visualização</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Destinação</label>
                <Select value={destinacaoFiltro} onValueChange={setDestinacaoFiltro}>
                  <SelectTrigger className={cn(p38Mobile.searchInput, 'h-10')}>
                    <SelectValue placeholder="Todas" />
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
                  <SelectTrigger className={cn(p38Mobile.searchInput, 'h-10')}>
                    <SelectValue placeholder="Todos" />
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
                  <SelectTrigger className={cn(p38Mobile.searchInput, 'h-10')}>
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
                  <SelectTrigger className={cn(p38Mobile.searchInput, 'h-10')}>
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
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar número, destinação, produto…"
                className={cn(p38Mobile.searchInput, 'h-11 pl-9')}
              />
            </div>
          </div>

          <div className={cn('rounded-2xl border border-dashed border-border/60 px-4 py-3', p38Mobile.detailPanel)}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Filtros aplicados (aparecem na impressão)
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-sm text-foreground">
              {filtrosTexto.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className={cn('h-5 w-5', brandSurface.accent)} />
              <p className="text-lg font-semibold text-foreground">
                {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} · {MODO_LABELS[modo]}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
              </div>
            ) : consumosFiltrados.length === 0 ? (
              <div className={cn('rounded-[24px] px-4 py-12 text-center text-sm text-muted-foreground', brandSurface.card)}>
                Nenhum consumo encontrado com os filtros atuais.
              </div>
            ) : modo === 'resumido' || agrupamento === 'produto' ? (
              <div className="space-y-3">
                {grupos.map((grupo) => (
                  <GrupoResumidoCard key={grupo.key} grupo={grupo} agrupamento={agrupamento} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {grupos.map((grupo) => (
                  <GrupoCompletoCard key={grupo.key} grupo={grupo} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
