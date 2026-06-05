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
} from '@/lib/relatorioConsumoInterno';
import { P38MobileLine, P38MobileLineList } from '@/components/ui/p38-mobile-line';

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-background text-white dark:bg-card dark:text-foreground'
          : 'bg-card text-muted-foreground shadow-sm dark:bg-muted dark:text-foreground/90'
      }`}
    >
      {children}
    </button>
  );
}

function GrupoResumidoCard({ grupo, agrupamento }) {
  const itensAgrupados = useMemo(() => {
    if (agrupamento === 'produto') {
      return [{ nome: grupo.label, qtd: grupo.qtd, unidade: grupo.unidade, subtotal: grupo.total }];
    }
    const map = {};
    (grupo.consumos || []).forEach((c) => {
      (c.itens || []).forEach((it) => {
        const nome = it.produto_nome || 'Sem nome';
        if (!map[nome]) map[nome] = { qtd: 0, subtotal: 0, unidade: it.unidade_medida || '' };
        map[nome].qtd += it.quantidade || 0;
        map[nome].subtotal += it.subtotal || 0;
      });
    });
    return Object.entries(map)
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.subtotal - a.subtotal);
  }, [grupo, agrupamento]);

  return (
    <div className="rounded-[24px] bg-card p-4 shadow-sm dark:bg-muted">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{grupo.label}</p>
          {grupo.registros != null && (
            <p className="text-xs text-muted-foreground">
              {grupo.registros} registro{grupo.registros !== 1 ? 's' : ''}
              {grupo.itens != null ? ` · ${grupo.itens} item(ns)` : ''}
            </p>
          )}
        </div>
        <p className="text-lg font-semibold text-foreground shrink-0">{formatCurrency(grupo.total)}</p>
      </div>
      {itensAgrupados.length > 0 && (
        <div className="space-y-1 border-t border-border/40 pt-3">
          {itensAgrupados.map((it) => (
            <div key={it.nome} className="flex items-center justify-between text-sm gap-2">
              <span className="text-foreground truncate">{it.nome}</span>
              <span className="text-muted-foreground shrink-0">
                {it.qtd} {it.unidade}
              </span>
              <span className="font-medium shrink-0">{formatCurrency(it.subtotal)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GrupoCompletoCard({ grupo }) {
  return (
    <div className="rounded-[24px] bg-card p-4 shadow-sm dark:bg-muted space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-foreground">{grupo.label}</p>
        <p className="text-lg font-semibold text-foreground shrink-0">{formatCurrency(grupo.total)}</p>
      </div>
      {(grupo.consumos || []).map((c) => {
        const quando = c.data_confirmacao || c.created_date;
        return (
          <div key={c.id} className="rounded-2xl bg-muted/40 px-3 py-2.5 dark:bg-background">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-foreground">{c.numero}</p>
              <p className="text-sm font-semibold">{formatCurrency(c.valor_total)}</p>
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
                <div key={idx} className="flex justify-between text-xs gap-2">
                  <span>{it.produto_nome}</span>
                  <span className="text-muted-foreground">
                    {it.quantidade} {it.unidade_medida}
                  </span>
                  <span>{formatCurrency(it.subtotal)}</span>
                </div>
              ))}
            </div>
            {c.observacoes && (
              <p className="mt-2 text-xs text-muted-foreground italic">Obs: {c.observacoes}</p>
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

  return (
    <div className="min-h-screen bg-muted/40 p-4 dark:bg-background md:p-6">
      <div className="mx-auto max-w-6xl space-y-5 pb-24">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-2xl" asChild>
              <Link to="/ConsumoInterno" title="Voltar ao consumo interno">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <p className="text-2xl font-semibold text-foreground">Relatório — Consumo Interno</p>
              <p className="text-sm text-muted-foreground">
                Consulta com agrupamento e impressão dos filtros aplicados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="rounded-[24px] bg-card p-3 shadow-sm transition-colors hover:bg-muted/50"
              style={{ minWidth: 48, minHeight: 48 }}
              aria-label="Atualizar"
            >
              <RefreshCw className={`h-5 w-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Button
              onClick={handlePrint}
              disabled={loading || consumosFiltrados.length === 0}
              className="h-12 rounded-2xl gap-2 px-4"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[24px] bg-card px-4 py-3 shadow-sm dark:bg-muted">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor total</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(totais.valor)}</p>
          </div>
          <div className="rounded-[24px] bg-card px-4 py-3 shadow-sm dark:bg-muted">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Registros</p>
            <p className="text-lg font-semibold text-foreground">{totais.registros}</p>
          </div>
          <div className="rounded-[24px] bg-card px-4 py-3 shadow-sm dark:bg-muted">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Itens (qtd)</p>
            <p className="text-lg font-semibold text-foreground">{totais.itens}</p>
          </div>
        </div>

        {/* Filtros período */}
        <div className="rounded-[30px] bg-card p-5 shadow-sm dark:bg-muted space-y-4">
          <p className="text-sm font-semibold text-foreground">Período</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FILTRO_TEMPORAL_LABELS).map(([key, label]) => (
              <FilterChip
                key={key}
                active={filtroTemporal === key}
                onClick={() => setFiltroTemporal(key)}
              >
                {label}
              </FilterChip>
            ))}
          </div>
          {filtroTemporal === 'personalizado' && (
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data início</label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-10 rounded-2xl w-40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data fim</label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="h-10 rounded-2xl w-40"
                />
              </div>
            </div>
          )}
        </div>

        {/* Filtros avançados */}
        <div className="rounded-[30px] bg-card p-5 shadow-sm dark:bg-muted space-y-4">
          <p className="text-sm font-semibold text-foreground">Filtros e visualização</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Destinação</label>
              <Select value={destinacaoFiltro} onValueChange={setDestinacaoFiltro}>
                <SelectTrigger className="h-10 rounded-2xl">
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
              <label className="text-xs text-muted-foreground mb-1 block">Responsável</label>
              <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
                <SelectTrigger className="h-10 rounded-2xl">
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
              <label className="text-xs text-muted-foreground mb-1 block">Agrupar por</label>
              <Select value={agrupamento} onValueChange={setAgrupamento}>
                <SelectTrigger className="h-10 rounded-2xl">
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
              <label className="text-xs text-muted-foreground mb-1 block">Modo</label>
              <Select value={modo} onValueChange={setModo}>
                <SelectTrigger className="h-10 rounded-2xl">
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
              className="h-10 rounded-2xl border-0 bg-muted pl-9 shadow-sm dark:bg-background"
            />
          </div>
        </div>

        {/* Resumo filtros (espelho da impressão) */}
        <div className="rounded-[24px] border border-dashed border-border/60 bg-card/60 px-4 py-3 dark:bg-muted/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Filtros aplicados (aparecem na impressão)
          </p>
          <ul className="text-sm text-foreground space-y-0.5 list-disc pl-4">
            {filtrosTexto.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        {/* Resultados */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <p className="text-lg font-semibold text-foreground">
              {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} · {MODO_LABELS[modo]}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
            </div>
          ) : consumosFiltrados.length === 0 ? (
            <div className="rounded-[24px] bg-card px-4 py-12 text-center text-sm text-muted-foreground shadow-sm">
              Nenhum consumo encontrado com os filtros atuais.
            </div>
          ) : modo === 'resumido' ? (
            <div className="space-y-3">
              {grupos.map((grupo) => (
                <GrupoResumidoCard key={grupo.key} grupo={grupo} agrupamento={agrupamento} />
              ))}
            </div>
          ) : agrupamento === 'produto' ? (
            <P38MobileLineList>
              {grupos.map((grupo, index) => (
                <P38MobileLine
                  key={grupo.key}
                  striped={index % 2 === 1}
                  accent="muted"
                  title={grupo.label}
                  meta={
                    <span className="inline-flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {grupo.qtd} {grupo.unidade}
                    </span>
                  }
                  value={formatCurrency(grupo.total)}
                />
              ))}
            </P38MobileLineList>
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
  );
}
