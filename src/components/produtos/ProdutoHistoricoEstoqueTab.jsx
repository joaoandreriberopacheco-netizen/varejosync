import React, { useMemo, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  History,
  Loader2,
  ArrowUp,
  ArrowDown,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  calcularExtratoComSaldo,
  deltaQuantidadeMovimento,
  movimentacaoPassaFiltros,
  textoReferenciaTipo,
} from '@/components/produtos/produtoHistoricoEstoque';

function formatQtd(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

export default function ProdutoHistoricoEstoqueTab({
  movimentacoes = [],
  estoqueAtual = 0,
  loading = false,
  onRefresh,
}) {
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [refTipo, setRefTipo] = useState('todos');
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [ordem, setOrdem] = useState('desc');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const filtros = useMemo(
    () => ({ busca, tipoFiltro, refTipo, dataIni, dataFim }),
    [busca, tipoFiltro, refTipo, dataIni, dataFim]
  );

  const extrato = useMemo(
    () => calcularExtratoComSaldo(movimentacoes, estoqueAtual),
    [movimentacoes, estoqueAtual]
  );

  const tiposRefUnicos = useMemo(() => {
    const s = new Set();
    (movimentacoes || []).forEach((m) => {
      const t = m?.referencia_tipo;
      if (t && String(t).trim()) s.add(String(t).trim());
    });
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [movimentacoes]);

  const linhasParaExibir = useMemo(() => {
    const pass = extrato.linhas.filter(({ mov }) => movimentacaoPassaFiltros(mov, filtros));
    pass.sort((a, b) => {
      const ta = new Date(a.mov?.created_date || 0).getTime();
      const tb = new Date(b.mov?.created_date || 0).getTime();
      const cmp = ta - tb;
      return ordem === 'asc' ? cmp : -cmp;
    });
    return pass;
  }, [extrato.linhas, filtros, ordem]);

  const temFiltrosExtras =
    tipoFiltro !== 'todos' || refTipo !== 'todos' || Boolean(dataIni) || Boolean(dataFim);

  const limparFiltros = useCallback(() => {
    setTipoFiltro('todos');
    setRefTipo('todos');
    setDataIni('');
    setDataFim('');
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {/* Resumo PDV — mobile first */}
      <div className="shrink-0 rounded-[24px] bg-[#f0f2f5] p-3 shadow-sm dark:bg-[#1a1f2e]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-white px-3 py-2.5 shadow-sm dark:bg-[#151a26]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Estoque (sistema)
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 font-glacial text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              <Wallet className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {formatQtd(estoqueAtual)}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-3 py-2.5 shadow-sm dark:bg-[#151a26]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Movimentos
            </p>
            <p className="mt-0.5 font-glacial text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {linhasParaExibir.length}
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                {' '}
                / {movimentacoes.length}
              </span>
            </p>
          </div>
          <div className="col-span-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm sm:col-span-1 dark:bg-[#151a26]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Saldo antes (est.)
            </p>
            <p className="mt-0.5 font-glacial text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {formatQtd(extrato.saldoInicial)}
            </p>
          </div>
        </div>
        {Math.abs(extrato.divergencia) > 0.0001 && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Atenção: a soma das movimentações não fecha exatamente com o estoque atual. Pode haver
            ajustes manuais ou registros antigos fora do histórico.
          </p>
        )}
      </div>

      {/* Barra busca + ações */}
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Documento, cliente, origem…"
            className="h-11 rounded-2xl border-0 bg-gray-100 pl-9 pr-3 text-sm shadow-inner dark:bg-[#151a26] dark:text-gray-100"
          />
          {busca ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-2xl border-0 bg-gray-100 px-3 font-medium shadow-sm dark:bg-[#151a26] sm:flex-initial"
            onClick={() => setOrdem((o) => (o === 'asc' ? 'desc' : 'asc'))}
          >
            {ordem === 'asc' ? <ArrowUp className="mr-1.5 h-4 w-4" /> : <ArrowDown className="mr-1.5 h-4 w-4" />}
            {ordem === 'asc' ? 'Antigo' : 'Recente'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="relative h-11 flex-1 rounded-2xl border-0 bg-gray-100 px-3 font-medium shadow-sm dark:bg-[#151a26] sm:flex-initial"
            onClick={() => setFiltrosAbertos(true)}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Filtros
            {temFiltrosExtras ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                ·
              </span>
            ) : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-2xl border-0 bg-gray-100 px-3 shadow-sm dark:bg-[#151a26]"
            onClick={() => onRefresh?.()}
            disabled={loading}
            aria-label="Atualizar extrato"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Drawer open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
        <DrawerContent className="rounded-t-[24px] border-0 bg-white px-4 pb-8 dark:bg-[#0f1218]">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="font-glacial text-gray-900 dark:text-gray-100">Filtros do extrato</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto">
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400">Tipo</Label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger className="mt-1 h-12 rounded-2xl border-0 bg-gray-100 dark:bg-[#151a26]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Entrada e saída</SelectItem>
                  <SelectItem value="Entrada">Somente entrada</SelectItem>
                  <SelectItem value="Saída">Somente saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400">Origem (referência)</Label>
              <Select value={refTipo} onValueChange={setRefTipo}>
                <SelectTrigger className="mt-1 h-12 rounded-2xl border-0 bg-gray-100 dark:bg-[#151a26]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {tiposRefUnicos.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400">De</Label>
                <Input
                  type="date"
                  value={dataIni}
                  onChange={(e) => setDataIni(e.target.value)}
                  className="mt-1 h-12 rounded-2xl border-0 bg-gray-100 dark:bg-[#151a26]"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400">Até</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="mt-1 h-12 rounded-2xl border-0 bg-gray-100 dark:bg-[#151a26]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 rounded-2xl border-0 bg-gray-100 dark:bg-[#252a38]"
                onClick={limparFiltros}
              >
                Limpar
              </Button>
              <Button type="button" className="h-12 flex-1 rounded-2xl" onClick={() => setFiltrosAbertos(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {loading ? (
        <div className="flex min-h-[12rem] flex-1 items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : linhasParaExibir.length === 0 ? (
        <div className="flex min-h-[12rem] flex-1 flex-col justify-center rounded-[28px] bg-gray-50 py-14 text-center dark:bg-[#151a26]">
          <History className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {movimentacoes.length === 0 ? 'Nenhuma movimentação registrada' : 'Nenhum resultado com estes filtros'}
          </p>
          {movimentacoes.length > 0 ? (
            <Button type="button" variant="link" className="mt-2 text-xs" onClick={() => { setBusca(''); limparFiltros(); }}>
              Redefinir filtros
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pb-4 [-webkit-overflow-scrolling:touch]">
          {linhasParaExibir.map(({ mov, saldoApos }, idx) => {
            const isEntrada = mov.tipo === 'Entrada';
            const delta = deltaQuantidadeMovimento(mov);
            const total = (mov.quantidade || 0) * (mov.custo_unitario || 0);
            const documento = mov.referencia_numero || mov.documento_referencia || mov.referencia_id || '—';
            const clienteNome = mov.cliente_nome || mov.terceiro_nome || mov.referencia_cliente_nome || '—';
            const origem = textoReferenciaTipo(mov);

            return (
              <div
                key={mov.id != null ? mov.id : `mov-${idx}`}
                className="overflow-hidden rounded-[22px] bg-[#f8fafc] shadow-sm dark:bg-[#151a26]"
              >
                <div className="flex gap-3 border-b border-gray-200/70 px-3 py-3 dark:border-white/5 sm:px-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={`rounded-full border-0 text-[10px] ${
                          isEntrada
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/35 dark:text-red-200'
                        }`}
                      >
                        {origem}
                      </Badge>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {mov.created_date
                          ? `${format(new Date(mov.created_date), 'dd/MM/yyyy')} · ${format(new Date(mov.created_date), 'HH:mm')}`
                          : '—'}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{documento}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{clienteNome}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`font-glacial text-lg font-bold tabular-nums ${
                        isEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-300'
                      }`}
                    >
                      {delta >= 0 ? '+' : ''}
                      {formatQtd(delta)}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">movimento</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 bg-white/60 px-3 py-2.5 dark:bg-black/20 sm:px-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Saldo após
                    </p>
                    <p className="font-glacial text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                      {saldoApos != null ? formatQtd(saldoApos) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Tipo</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{mov.tipo}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 px-3 py-3 text-xs dark:border-white/5 sm:grid-cols-4 sm:px-4">
                  <div>
                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Preço un.</p>
                    <p className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">
                      {mov.custo_unitario > 0
                        ? `R$ ${Number(mov.custo_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Total R$</p>
                    <p
                      className={`font-semibold tabular-nums ${
                        isEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-300'
                      }`}
                    >
                      {total > 0 ? `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Responsável
                    </p>
                    <p className="truncate font-semibold text-gray-800 dark:text-gray-200">
                      {mov.usuario_responsavel || '—'}
                    </p>
                  </div>
                  <div className="min-w-0 sm:text-right">
                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Qtd</p>
                    <p className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">
                      {formatQtd(mov.quantidade)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
