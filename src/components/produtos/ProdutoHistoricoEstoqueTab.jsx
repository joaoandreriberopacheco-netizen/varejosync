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
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  calcularExtratoComSaldo,
  deltaQuantidadeMovimento,
  movimentacaoPassaFiltros,
  textoReferenciaTipo,
} from '@/components/produtos/produtoHistoricoEstoque';
import { formatEstoqueApresentacao, normalizeAlternativeUnits } from '@/lib/productUnits';

/** Larguras + posições left (px) para colunas sticky alinhadas */
const STICKY_COL = {
  dataW: 124,
  docW: 132,
  saldoW: 88,
  docLeft: 124,
  saldoLeft: 124 + 132,
};

function formatQtd(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

export default function ProdutoHistoricoEstoqueTab({
  movimentacoes = [],
  estoqueAtual = 0,
  produto = null,
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

  const estoqueAuxiliar = useMemo(() => formatEstoqueApresentacao(produto), [produto]);
  const fatorAuxiliar = useMemo(() => {
    if (!estoqueAuxiliar?.sigla) return null;
    const alt = normalizeAlternativeUnits(produto).find((u) => u.unidade === estoqueAuxiliar.sigla);
    const fator = Number(alt?.fator_conversao) || 0;
    return fator > 0 ? fator : null;
  }, [produto, estoqueAuxiliar]);

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
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Estoque (sistema)
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 font-glacial text-xl font-semibold tabular-nums text-foreground dark:text-gray-100">
              <Wallet className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {formatQtd(estoqueAtual)}
            </p>
            {estoqueAuxiliar && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                ~{formatQtd(estoqueAuxiliar.quantidade)} {estoqueAuxiliar.sigla}{estoqueAuxiliar.rotulo ? ` (${estoqueAuxiliar.rotulo})` : ''}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-white px-3 py-2.5 shadow-sm dark:bg-[#151a26]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Movimentos
            </p>
            <p className="mt-0.5 font-glacial text-xl font-semibold tabular-nums text-foreground dark:text-gray-100">
              {linhasParaExibir.length}
              <span className="text-xs font-normal text-muted-foreground">
                {' '}
                / {movimentacoes.length}
              </span>
            </p>
          </div>
          <div className="col-span-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm sm:col-span-1 dark:bg-[#151a26]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Saldo antes (est.)
            </p>
            <p className="mt-0.5 font-glacial text-xl font-semibold tabular-nums text-foreground dark:text-gray-100">
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
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Documento, cliente, origem…"
            className="h-11 rounded-2xl border-0 bg-gray-100 pl-9 pr-3 text-sm shadow-inner dark:bg-[#151a26] dark:text-gray-100"
          />
          {busca ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-muted-foreground"
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
            <DrawerTitle className="font-glacial text-foreground dark:text-gray-100">Filtros do extrato</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto">
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
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
              <Label className="text-xs text-muted-foreground">Origem (referência)</Label>
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
                <Label className="text-xs text-muted-foreground">De</Label>
                <Input
                  type="date"
                  value={dataIni}
                  onChange={(e) => setDataIni(e.target.value)}
                  className="mt-1 h-12 rounded-2xl border-0 bg-gray-100 dark:bg-[#151a26]"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Até</Label>
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : linhasParaExibir.length === 0 ? (
        <div className="flex min-h-[12rem] flex-1 flex-col justify-center rounded-[28px] bg-muted/40 py-14 text-center dark:bg-[#151a26]">
          <History className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-muted-foreground" />
          <p className="text-sm font-medium text-foreground/90">
            {movimentacoes.length === 0 ? 'Nenhuma movimentação registrada' : 'Nenhum resultado com estes filtros'}
          </p>
          {movimentacoes.length > 0 ? (
            <Button type="button" variant="link" className="mt-2 text-xs" onClick={() => { setBusca(''); limparFiltros(); }}>
              Redefinir filtros
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/40/90 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f1218]">
          <p className="shrink-0 border-b border-border/40 bg-muted/40 px-3 py-2 text-[10px] leading-snug text-muted-foreground dark:border-white/5 dark:bg-[#1a1f2e] dark:text-muted-foreground">
            Colunas fixas: data, documento e saldo. Deslize para a direita para ver origem, valores e responsável.
          </p>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-max min-w-[920px] border-collapse text-left text-[11px] sm:text-xs">
              <TableHeader className="sticky top-0 z-30 bg-gray-100 shadow-sm dark:bg-[#252a38] [&_tr]:border-border/40 dark:[&_tr]:border-gray-700">
                <TableRow className="border-b hover:bg-transparent">
                  <TableHead
                    className={`sticky top-0 z-[45] h-10 whitespace-nowrap border-b bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90`}
                    style={{ left: 0, minWidth: STICKY_COL.dataW, width: STICKY_COL.dataW }}
                  >
                    Data
                  </TableHead>
                  <TableHead
                    className="sticky top-0 z-[45] h-10 whitespace-nowrap border-b bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90"
                    style={{ left: STICKY_COL.docLeft, minWidth: STICKY_COL.docW, width: STICKY_COL.docW }}
                  >
                    Documento
                  </TableHead>
                  <TableHead
                    className="sticky top-0 z-[45] h-10 border-b border-r border-border/40 bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-[4px_0_12px_-4px_rgba(0,0,0,0.2)] dark:border-gray-600 dark:bg-[#252a38] dark:text-foreground/90 dark:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]"
                    style={{ left: STICKY_COL.saldoLeft, minWidth: STICKY_COL.saldoW, width: STICKY_COL.saldoW }}
                  >
                    Saldo após
                  </TableHead>
                  <TableHead className="h-10 min-w-[5.5rem] whitespace-nowrap border-b bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90">
                    Origem
                  </TableHead>
                  <TableHead className="h-10 min-w-[7rem] border-b bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90">
                    Cliente / terceiro
                  </TableHead>
                  <TableHead className="h-10 min-w-[3.25rem] border-b bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90">
                    Tipo
                  </TableHead>
                  <TableHead className="h-10 min-w-[4rem] border-b bg-gray-100 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90">
                    Movimento
                  </TableHead>
                  <TableHead className="h-10 min-w-[4.5rem] border-b bg-gray-100 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90">
                    P. un.
                  </TableHead>
                  <TableHead className="h-10 min-w-[4.5rem] border-b bg-gray-100 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90">
                    Total R$
                  </TableHead>
                  <TableHead className="h-10 min-w-[6rem] border-b bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90">
                    Responsável
                  </TableHead>
                  <TableHead className="h-10 min-w-[3.25rem] border-b bg-gray-100 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90">
                    Qtd
                  </TableHead>
                  <TableHead className="h-10 min-w-[7rem] border-b bg-gray-100 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-[#252a38] dark:text-foreground/90">
                    Qtd (show)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasParaExibir.map(({ mov, saldoApos }, idx) => {
                  const isEntrada = mov.tipo === 'Entrada';
                  const delta = deltaQuantidadeMovimento(mov);
                  const total = (mov.quantidade || 0) * (mov.custo_unitario || 0);
                  const documento = mov.referencia_numero || mov.documento_referencia || mov.referencia_id || '—';
                  const clienteNome = mov.cliente_nome || mov.terceiro_nome || mov.referencia_cliente_nome || '—';
                  const origem = textoReferenciaTipo(mov);
                  const rowKey = mov.id != null ? mov.id : `mov-${idx}`;
                  const stickyBg =
                    'bg-white group-hover:bg-muted/40 dark:bg-[#151a26] dark:group-hover:bg-[#1c2230]';

                  return (
                    <TableRow key={rowKey} className="group border-border/40">
                      <TableCell
                        className={`sticky z-20 whitespace-nowrap border-b border-border/40 px-2 py-2 tabular-nums text-foreground/90 dark:border-border/40 dark:text-foreground ${stickyBg}`}
                        style={{ left: 0, minWidth: STICKY_COL.dataW, width: STICKY_COL.dataW }}
                      >
                        {mov.created_date
                          ? `${format(new Date(mov.created_date), 'dd/MM/yy')} ${format(new Date(mov.created_date), 'HH:mm')}`
                          : '—'}
                      </TableCell>
                      <TableCell
                        className={`sticky z-20 max-w-[132px] truncate border-b border-border/40 px-2 py-2 font-medium text-foreground dark:border-border/40 dark:text-gray-100 ${stickyBg}`}
                        style={{ left: STICKY_COL.docLeft, minWidth: STICKY_COL.docW, width: STICKY_COL.docW }}
                        title={String(documento)}
                      >
                        {documento}
                      </TableCell>
                      <TableCell
                        className={`sticky z-20 border-b border-r border-border/40 px-2 py-2 text-right font-glacial text-sm font-bold tabular-nums text-foreground shadow-[4px_0_12px_-4px_rgba(0,0,0,0.12)] dark:border-border/40 dark:text-white dark:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.45)] ${stickyBg}`}
                        style={{ left: STICKY_COL.saldoLeft, minWidth: STICKY_COL.saldoW, width: STICKY_COL.saldoW }}
                      >
                        {saldoApos != null ? formatQtd(saldoApos) : '—'}
                      </TableCell>
                      <TableCell className="border-b border-border/40 px-2 py-2 dark:border-border/40">
                        <Badge
                          className={`max-w-[8rem] truncate rounded-full border-0 text-[9px] ${
                            isEntrada
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/35 dark:text-red-200'
                          }`}
                          title={origem}
                        >
                          {origem}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="max-w-[10rem] truncate border-b border-border/40 px-2 py-2 text-muted-foreground dark:border-border/40 dark:text-foreground/90"
                        title={clienteNome}
                      >
                        {clienteNome}
                      </TableCell>
                      <TableCell className="whitespace-nowrap border-b border-border/40 px-2 py-2 text-foreground/90 dark:border-border/40 dark:text-foreground">
                        {mov.tipo}
                      </TableCell>
                      <TableCell
                        className={`border-b border-border/40 px-2 py-2 text-right font-semibold tabular-nums dark:border-border/40 ${
                          isEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-300'
                        }`}
                      >
                        {delta >= 0 ? '+' : ''}
                        {formatQtd(delta)}
                      </TableCell>
                      <TableCell className="border-b border-border/40 px-2 py-2 text-right tabular-nums text-foreground/90 dark:border-border/40 dark:text-foreground">
                        {mov.custo_unitario > 0
                          ? `R$ ${Number(mov.custo_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </TableCell>
                      <TableCell
                        className={`border-b border-border/40 px-2 py-2 text-right tabular-nums dark:border-border/40 ${
                          isEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-300'
                        }`}
                      >
                        {total > 0 ? `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </TableCell>
                      <TableCell className="max-w-[7rem] truncate border-b border-border/40 px-2 py-2 text-foreground/90 dark:border-border/40 dark:text-foreground/90">
                        {mov.usuario_responsavel || '—'}
                      </TableCell>
                      <TableCell className="border-b border-border/40 px-2 py-2 text-right tabular-nums text-gray-800 dark:border-border/40 dark:text-foreground">
                        {formatQtd(mov.quantidade)}
                      </TableCell>
                      <TableCell className="border-b border-border/40 px-2 py-2 text-right tabular-nums text-foreground/90 dark:border-border/40 dark:text-foreground/90">
                        {estoqueAuxiliar && fatorAuxiliar
                          ? `${formatQtd((Number(mov.quantidade) || 0) / fatorAuxiliar)} ${estoqueAuxiliar.sigla}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
